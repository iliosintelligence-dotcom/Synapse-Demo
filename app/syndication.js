/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — campaign generation & social syndication
   An Omneky-style engine: take ONE verified property, fan it into many creative
   variants, validate each against the real constraints of each platform, then
   push them through a publish queue.

   Exposes window.SynSyndicate.

   WHERE THE TOKENS LIVE (important):
   Social access tokens NEVER appear in this file or any client file. Publishing
   is delegated to a server-side endpoint (`social-publish` edge function) that
   reads them from Supabase secrets. This module can therefore run in two modes:
     · 'dry'  — generate, validate and queue; render exactly what WOULD be sent.
     · 'live' — same pipeline, but the queue POSTs to the publish endpoint.
   Dry is the default and is honest about being a rehearsal: nothing it does
   touches a real account. Live requires the endpoint to exist AND the operator
   to opt in per run, because publishing is irreversible and public.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── Platform specs — real limits, not decoration ───────────────────────
     These are what make a variant valid or not. Getting them wrong is how you
     end up with a truncated caption or a rejected upload at 2am. */
  var PLATFORMS = {
    instagram: {
      label: 'Instagram', short: 'IG', colour: '#DD2A7B',
      captionMax: 2200, hashtagMax: 30, ratios: ['1:1', '4:5', '9:16'],
      media: ['image', 'video'], videoMaxSec: 90,
      firstLineMatters: true,          // the feed truncates after ~125 chars
      previewChars: 125,
    },
    tiktok: {
      label: 'TikTok', short: 'TT', colour: '#161616',
      captionMax: 2200, hashtagMax: 30, ratios: ['9:16'],
      media: ['video'], videoMaxSec: 180,
      firstLineMatters: true, previewChars: 100,
    },
    youtube: {
      label: 'YouTube Shorts', short: 'YT', colour: '#FF0000',
      captionMax: 5000, titleMax: 100, hashtagMax: 15, ratios: ['9:16'],
      media: ['video'], videoMaxSec: 60,   // Shorts hard limit
      needsTitle: true, firstLineMatters: false, previewChars: 100,
    },
    facebook: {
      label: 'Facebook', short: 'f', colour: '#1877F2',
      captionMax: 63206, hashtagMax: 10, ratios: ['1:1', '4:5', '16:9'],
      media: ['image', 'video'], videoMaxSec: 240,
      firstLineMatters: true, previewChars: 250,
    },
    whatsapp: {
      label: 'WhatsApp Status', short: 'WA', colour: '#25D366',
      captionMax: 700, hashtagMax: 0, ratios: ['9:16'],
      media: ['image', 'video'], videoMaxSec: 60,
      firstLineMatters: false, previewChars: 700,
    },
  };

  /* ── Creative angles ────────────────────────────────────────────────────
     Omneky's core idea is that you do not write one ad, you write the same
     offer many ways and let performance decide. Each angle is a genuinely
     different persuasive strategy, not a reworded sentence. */
  var ANGLES = [
    {
      id: 'trust', name: 'Verified-first',
      why: 'Leads on the seven checks. Strongest for cold audiences who have been burned by ghost listings.',
      requiresVerified: true,   // its entire premise is that the checks passed
      hook: function (p) { return 'Somebody stood in this ' + p.kind + ' and checked it.'; },
      body: function (p) {
        return 'Title, structure, flood risk, legal status, ownership — seven checks, all passed, re-confirmed within the last 14 days.\n\n'
          + p.bedrooms + '-bed ' + p.kind + ' in ' + p.area + '. ' + p.priceLine + '.';
      },
      cta: 'See exactly what we checked →',
    },
    {
      id: 'value', name: 'Price context',
      why: 'Anchors the number against the corridor. Best for comparison shoppers already browsing.',
      hook: function (p) { return p.priceLine + ' in ' + p.area + '. Here is what that actually gets you.'; },
      body: function (p) {
        return p.bedrooms + ' bedrooms, ' + p.kind + ', ' + p.area + '.\n\n'
          + (p.verified ? 'Verified this month. ' : '')
          + 'Power reliability in this corridor sits around ' + p.power + '%.';
      },
      cta: 'Ask Toju if it fits your budget →',
    },
    {
      id: 'life', name: 'Lifestyle',
      why: 'Sells the mornings, not the square metres. Works on warm audiences and retargeting.',
      hook: function (p) { return 'Mornings in ' + p.area + ' hit differently.'; },
      body: function (p) {
        return 'A ' + p.bedrooms + '-bed ' + p.kind + ' with room for the life you actually live.\n\n'
          + p.priceLine + (p.verified ? '. Verified, and still available.' : '. Still available.');
      },
      cta: 'Take a look →',
    },
    {
      id: 'scarcity', name: 'Freshness',
      why: 'Uses the 14-day rule as honest urgency — the listing really does expire.',
      hook: function (p) {
        return p.daysLeft == null
          ? 'This one disappears in 14 days if it is not re-confirmed.'
          : 'This one disappears in ' + p.daysLeft + ' day' + (p.daysLeft === 1 ? '' : 's') + ' if it is not re-confirmed.';
      },
      body: function (p) {
        return 'That is the rule on Synapse: no listing outlives its proof.\n\n'
          + p.bedrooms + '-bed ' + p.kind + ', ' + p.area + '. ' + p.priceLine + '.';
      },
      cta: 'See it while it is live →',
    },
    {
      id: 'question', name: 'Direct question',
      why: 'Opens a conversation instead of making a claim. Highest comment rate, good for reach.',
      hook: function (p) { return 'Would you take ' + p.area + ' at ' + p.priceShort + '?'; },
      body: function (p) {
        return p.bedrooms + '-bed ' + p.kind + '.'
          + (p.verified ? ' Verified, checked on the ground, live right now.' : ' Live right now.') + '\n\n'
          + 'Honest answers only.';
      },
      cta: 'Tell Toju what you think →',
    },
  ];


  /* ── patterns ───────────────────────────────────────────────────────────
     The angles above are the fallback. The real catalogue is rows in
     content_templates, which carry text rather than functions, so an agency
     can write its own. A pattern is plain prose with two constructs:

       {area}                     substitute
       {verified?yes|no}          pick a branch on a truthy field

     The conditional is not decoration. "Verified this month." must never
     appear on an unverified listing, and half the seeded angles turn on
     exactly that -- a substitution-only language would have quietly changed
     what this product claims about a property.

     UNKNOWN TOKENS THROW. The alternative is a buyer reading "{bedroms}" in a
     caption on Instagram, which is unrecoverable and looks like nobody is
     home. Failing here means the variant is dropped and the agency is told. */
  var TOKENS = {
    /* Everything shape() produces that is safe to print, plus two derived
       forms the seeded angles need. Adding a token is adding a line here. */
    title:      function (p) { return p.title; },
    kind:       function (p) { return p.kind; },
    area:       function (p) { return p.area; },
    city:       function (p) { return p.city; },
    bedrooms:   function (p) { return p.bedrooms; },
    price:      function (p) { return p.price; },
    priceShort: function (p) { return p.priceShort; },
    priceLine:  function (p) { return p.priceLine; },
    trust:      function (p) { return p.trust; },
    power:      function (p) { return p.power; },
    flood:      function (p) { return p.flood; },
    verified:   function (p) { return p.verified; },
    /* "3 days" / "1 day" / "14 days" when nothing is known. The plural and the
       null case lived inside the old scarcity angle; a pattern cannot express
       them, so they belong here where every template gets them right. */
    days: function (p) {
      if (p.daysLeft == null) return '14 days';
      return p.daysLeft + (p.daysLeft === 1 ? ' day' : ' days');
    },
    daysLeft: function (p) { return p.daysLeft; },
  };

  function tokenRaw(name, p) {
    if (!Object.prototype.hasOwnProperty.call(TOKENS, name)) {
      throw new Error('Unknown token {' + name + '}');
    }
    return TOKENS[name](p);
  }

  function tokenValue(name, p) {
    var v = tokenRaw(name, p);
    return v == null ? '' : String(v);
  }

  /* A CONDITIONAL MUST TEST THE VALUE, NOT ITS PRINTED FORM.
     This read tokenValue() first, which stringifies -- and String(false) is
     "false", which is truthy. Every {verified?...|...} therefore took the yes
     branch, so an UNVERIFIED listing was captioned "Verified this month." That
     is a false claim about a property, published under the agency's own name,
     produced by the one part of the system whose job is to refuse exactly
     that. Caught by diffing rendered output against the hardcoded angles on a
     verified and an unverified listing; the verified case passed and would
     have shipped it. */
  function tokenTruthy(name, p) {
    var v = tokenRaw(name, p);
    if (v == null || v === false) return false;
    if (v === 0) return false;
    return String(v).trim() !== '';
  }

  /** Renders one pattern against a shaped listing. Throws on an unknown token. */
  function renderPattern(pattern, p) {
    return String(pattern == null ? '' : pattern).replace(
      /\{([a-zA-Z]+)(\?([^|}]*)\|([^}]*))?\}/g,
      function (_all, name, hasBranch, yes, no) {
        if (hasBranch) {
          /* Presence of the token is still checked on the branch form: a
             conditional on a field that does not exist is a silent always-no. */
          return tokenTruthy(name, p) ? yes : no;
        }
        return tokenValue(name, p);
      },
    );
  }

  /** Every token a pattern uses, for validation before anything is saved. */
  function patternTokens(pattern) {
    var out = [], m, re = /\{([a-zA-Z]+)(\?[^}]*)?\}/g;
    while ((m = re.exec(String(pattern || '')))) if (out.indexOf(m[1]) === -1) out.push(m[1]);
    return out;
  }

  /** Which tokens in a pattern we cannot resolve. Empty means it is safe. */
  function unknownTokens(pattern) {
    return patternTokens(pattern).filter(function (t) {
      return !Object.prototype.hasOwnProperty.call(TOKENS, t);
    });
  }

  /**
   * Turns a content_templates row into the shape buildVariant already expects,
   * so the rest of the pipeline -- validation, media, sign-off, hashtags --
   * does not know or care that angles stopped being code.
   */
  function angleFromTemplate(row) {
    return {
      id: row.id,
      templateId: row.id,
      angleKey: row.angle_key || 'custom',
      name: row.name,
      why: row.why || '',
      requiresVerified: !!row.requires_verified,
      platforms: Array.isArray(row.platforms) ? row.platforms : [],
      isSeed: !row.agency_id,
      hook: function (p) { return renderPattern(row.hook_pattern, p); },
      body: function (p) { return renderPattern(row.body_pattern, p); },
      cta: row.cta || '',
    };
  }

  /* The catalogue in use. Starts as the built-ins so a page that never loads
     templates -- or loads them and fails -- behaves exactly as it did before. */
  /* The built-ins are their own key -- 'trust' is both the id and the kind,
     which is what made the uuid switch silent in the first place. */
  ANGLES.forEach(function (a) { a.angleKey = a.id; a.templateId = null; });

  var activeAngles = ANGLES;

  /**
   * Installs the rows as the catalogue. A row whose pattern uses a token we
   * cannot resolve is REFUSED, not repaired: it would render braces to a
   * buyer. Returns what was taken and what was not, so the caller can say so.
   */
  function setTemplates(rows) {
    if (!rows || !rows.length) { activeAngles = ANGLES; return { used: 0, rejected: [] }; }
    var good = [], rejected = [];
    rows.forEach(function (r) {
      var bad = unknownTokens(r.hook_pattern).concat(unknownTokens(r.body_pattern));
      if (bad.length) { rejected.push({ name: r.name, tokens: bad }); return; }
      good.push(angleFromTemplate(r));
    });
    activeAngles = good.length ? good : ANGLES;
    return { used: good.length, rejected: rejected };
  }

  /* ── Stock media pool ───────────────────────────────────────────────────
     Placeholder creative so a campaign can be built and reviewed before a
     photographer has been anywhere near the property. Each entry declares the
     ratios it can be cropped to, so platform validation is meaningful. */
  var STOCK = [
    { id: 'st-int-1', kind: 'image', label: 'Bright interior',   ratios: ['1:1', '4:5', '9:16', '16:9'], src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=75' },
    { id: 'st-ext-1', kind: 'image', label: 'Modern facade',     ratios: ['1:1', '4:5', '16:9'],         src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=75' },
    { id: 'st-liv-1', kind: 'image', label: 'Living room',       ratios: ['1:1', '4:5', '9:16', '16:9'], src: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=75' },
    { id: 'st-kit-1', kind: 'image', label: 'Kitchen',           ratios: ['1:1', '4:5', '9:16'],         src: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=900&q=75' },
    { id: 'st-vid-1', kind: 'video', label: 'Walkthrough (0:28)', ratios: ['9:16'], seconds: 28, poster: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=75' },
    { id: 'st-vid-2', kind: 'video', label: 'Street approach (0:41)', ratios: ['9:16', '1:1'], seconds: 41, poster: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=75' },
    { id: 'st-vid-3', kind: 'video', label: 'Full tour (1:35)',  ratios: ['9:16', '16:9'], seconds: 95, poster: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=900&q=75' },
  ];

  /* ── helpers ───────────────────────────────────────────────────────────── */
  function naira(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return '₦' + (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + 'B';
    if (n >= 1e6) return '₦' + Math.round(n / 1e6) + 'M';
    return '₦' + n.toLocaleString();
  }
  function shape(row) {
    var rent = row.listing_type === 'rent';
    // Verification is a claim about this specific listing, so copy has to read
    // it from the row rather than assume it. An agency uploading a listing gets
    // `unverified` and cannot change that (RLS + trigger), so any angle that
    // asserts the seven checks would be publishing something untrue on the
    // agency's own account.
    var verified = row.verification_status === 'verified';
    var expires = row.expires_at ? new Date(row.expires_at) : null;
    return {
      id: row.id,
      title: row.title,
      verified: verified,
      expiresAt: row.expires_at || null,
      daysLeft: expires ? Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 864e5)) : null,
      area: row.neighbourhood ? String(row.neighbourhood).replace(/\s*\(.*\)$/, '') : row.city,
      city: row.city,
      kind: row.property_type || 'home',
      bedrooms: row.bedrooms,
      price: Number(row.price) || 0,
      priceShort: naira(row.price) + (rent ? '/yr' : ''),
      priceLine: naira(row.price) + (rent ? ' a year' : ''),
      rent: rent,
      trust: row.trust_score,
      power: row.power_reliability == null ? 70 : row.power_reliability,
      flood: row.flood_risk,
    };
  }
  /* ── brand kit ───────────────────────────────────────────────────────────
     Normalises the agency's `agencies` row into the pieces this module can
     actually use. Two honest categories:

       CONCRETE (name, tagline, handle, colours, logo, typeface) — applied
       deterministically here: sign-off, mention, and the values the UI paints
       creatives with.

       VOICE (free prose describing how they want to sound) — a template cannot
       honour it. It is carried on the campaign so the AI composer can use it,
       and is deliberately NOT used to fake tone in the fixed angle copy. */
  function brandBits(brand) {
    brand = brand || {};
    var social = brand.social || {};
    var handle = String(social.instagram || '').trim().replace(/^@+/, '');
    return {
      name: String(brand.name || '').trim(),
      tagline: String(brand.tagline || '').trim(),
      handle: handle,
      website: String(social.website || '').trim(),
      voice: String(brand.brand_voice || '').trim(),
      color: brand.brand_color || null,
      colorAlt: brand.brand_color_secondary || null,
      logo: brand.logo_url || null,
      logoDark: brand.logo_dark_url || null,
      font: brand.brand_font || null,
      isSet: !!(String(brand.name || '').trim() || brand.logo_url || brand.brand_color),
    };
  }

  /* The agency signs its own posts. Nothing is invented: a field the agency
     left blank simply does not appear. */
  function signOff(b) {
    if (!b || !b.name) return '';
    return '\n\n— ' + b.name + (b.tagline ? ' · ' + b.tagline : '');
  }

  function hashtagsFor(p, platform, b) {
    var spec = PLATFORMS[platform];
    if (!spec.hashtagMax) return [];
    var base = ['#' + String(p.area).replace(/[^a-z0-9]/gi, ''), '#LagosRealEstate',
                '#' + (p.rent ? 'LagosRent' : 'LagosProperty')];
    // The agency's own tag leads when it has one — this is their post.
    if (b && b.handle) base.unshift('#' + b.handle.replace(/[^a-z0-9]/gi, ''));
    if (p.verified) base.push('#VerifiedListing');   // only when it actually is
    base.push('#Synapse');
    return base.slice(0, Math.min(spec.hashtagMax, 5));
  }

  /* ── generation ────────────────────────────────────────────────────────── */
  // One property + one platform + one angle → one variant.
  function buildVariant(prop, platform, angle, media, b) {
    var spec = PLATFORMS[platform];
    var p = prop;
    var hook = angle.hook(p);
    var body = angle.body(p);
    var tags = hashtagsFor(p, platform, b);
    // WhatsApp Status takes no hashtags, so the sign-off is the only branding
    // that survives there — which is exactly where it matters most.
    var caption = hook + '\n\n' + body + '\n\n' + angle.cta
      + signOff(b)
      + (tags.length ? '\n\n' + tags.join(' ') : '');

    return {
      id: platform + '_' + angle.id + '_' + (media ? media.id : 'none'),
      platform: platform,
      angle: angle.id,
      /* The KIND of angle, stable across the move from code to data. angle.id
         used to be this; as a template row it is a uuid, and anything keying
         off it (the archive's narrative_angle, for one) silently stopped
         matching. Carried explicitly now so it cannot drift again. */
      angleKey: angle.angleKey || angle.id,
      templateId: angle.templateId || null,
      angleName: angle.name,
      angleWhy: angle.why,
      propertyId: p.id,
      title: spec.needsTitle ? (p.bedrooms + '-Bed ' + p.kind + ' in ' + p.area + ' · ' + p.priceShort).slice(0, spec.titleMax) : null,
      hook: hook,
      caption: caption,
      hashtags: tags,
      media: media,
      ratio: media ? (media.ratios.filter(function (r) { return spec.ratios.indexOf(r) > -1; })[0] || media.ratios[0]) : null,
      status: 'draft',
    };
  }

  // Pick media that genuinely suits the platform (a 95s clip is not a Short).
  function mediaFor(platform) {
    var spec = PLATFORMS[platform];
    return STOCK.filter(function (m) {
      if (spec.media.indexOf(m.kind) === -1) return false;
      if (m.kind === 'video' && spec.videoMaxSec && m.seconds > spec.videoMaxSec) return false;
      return m.ratios.some(function (r) { return spec.ratios.indexOf(r) > -1; });
    });
  }

  function generate(propertyRow, opts) {
    opts = opts || {};
    var b = brandBits(opts.brand);
    var p = shape(propertyRow);
    var platforms = opts.platforms && opts.platforms.length ? opts.platforms : Object.keys(PLATFORMS);
    /* activeAngles, not ANGLES: the catalogue is rows once setTemplates has
       run, and the built-ins only when it has not. */
    var angles = opts.angles && opts.angles.length
      ? activeAngles.filter(function (a) { return opts.angles.indexOf(a.id) > -1; })
      : activeAngles;

    /* An angle whose premise is the verification cannot run on a listing that
       has not been verified. Dropping it is deliberate: the alternative is
       generating a claim the agency would publish under its own name, and the
       agency cannot self-certify (RLS + trigger), so this is not a state it can
       simply switch off. The skipped list is returned so the UI can say why. */
    var skipped = [];
    if (!p.verified) {
      angles = angles.filter(function (a) {
        if (!a.requiresVerified) return true;
        skipped.push({ id: a.id, name: a.name, reason: 'needs a verified listing' });
        return false;
      });
    }

    var variants = [];
    platforms.forEach(function (pl) {
      if (!PLATFORMS[pl]) return;
      var pool = mediaFor(pl);
      angles.forEach(function (a, i) {
        /* A template may name the platforms it is for. Empty means all, which
           is what every seeded angle says and what an agency gets by default. */
        if (a.platforms && a.platforms.length && a.platforms.indexOf(pl) === -1) return;
        var media = pool.length ? pool[i % pool.length] : null;
        var v = buildVariant(p, pl, a, media, b);
        v.issues = validate(v);
        variants.push(v);
      });
    });
    return {
      id: 'cmp_' + Date.now().toString(36),
      property: p,
      objective: opts.objective || 'reach',
      createdAt: new Date().toISOString(),
      variants: variants,
      skipped: skipped,
      // Carried so the UI can paint creatives in the agency's colours and the
      // AI composer can be told how they want to sound.
      brand: b,
    };
  }

  /* ── validation ────────────────────────────────────────────────────────── */
  // Returns human-readable problems. Empty array means publishable.
  function validate(v) {
    var spec = PLATFORMS[v.platform];
    var out = [];
    if (!spec) return ['Unknown platform.'];
    if (v.caption.length > spec.captionMax)
      out.push('Caption is ' + v.caption.length + ' characters — ' + spec.label + ' allows ' + spec.captionMax + '.');
    if (spec.hashtagMax === 0 && v.hashtags.length)
      out.push(spec.label + ' does not use hashtags.');
    if (v.hashtags.length > spec.hashtagMax)
      out.push(v.hashtags.length + ' hashtags — ' + spec.label + ' allows ' + spec.hashtagMax + '.');
    if (spec.needsTitle && !v.title) out.push(spec.label + ' needs a title.');
    if (spec.needsTitle && v.title && v.title.length > spec.titleMax)
      out.push('Title is over ' + spec.titleMax + ' characters.');
    if (!v.media) out.push('No creative attached.');
    if (v.media) {
      if (spec.media.indexOf(v.media.kind) === -1)
        out.push(spec.label + ' does not accept ' + v.media.kind + '.');
      if (v.media.kind === 'video' && spec.videoMaxSec && v.media.seconds > spec.videoMaxSec)
        out.push('Video is ' + v.media.seconds + 's — ' + spec.label + ' caps at ' + spec.videoMaxSec + 's.');
      if (v.ratio && spec.ratios.indexOf(v.ratio) === -1)
        out.push(v.ratio + ' does not fit ' + spec.label + ' (' + spec.ratios.join(', ') + ').');
    }
    return out;
  }

  /* ── publish queue ─────────────────────────────────────────────────────
     A small state machine with the properties that matter when something is
     talking to five external APIs:
       · idempotency key per variant, so a retry cannot double-post
       · bounded concurrency, so we do not open 25 sockets at once
       · per-item status, so a partial failure is visible rather than silent
       · dry mode by default — nothing leaves the browser unless asked */
  function createQueue(opts) {
    opts = opts || {};
    var mode = opts.mode === 'live' ? 'live' : 'dry';
    var endpoint = opts.endpoint || null;
    var concurrency = Math.max(1, Math.min(4, opts.concurrency || 2));
    var items = [], listeners = [], running = 0, stopped = false;

    function emit() { listeners.forEach(function (fn) { fn(items.slice(), summary()); }); }
    function summary() {
      var s = { total: items.length, queued: 0, sending: 0, published: 0, failed: 0, skipped: 0 };
      items.forEach(function (i) { s[i.status] = (s[i.status] || 0) + 1; });
      return s;
    }

    function add(variants) {
      variants.forEach(function (v) {
        items.push({
          key: v.id + '_' + (v.propertyId || '').slice(0, 8),   // idempotency key
          variant: v,
          status: v.issues && v.issues.length ? 'skipped' : 'queued',
          reason: v.issues && v.issues.length ? v.issues[0] : null,
          attempts: 0, at: null,
        });
      });
      emit();
    }

    function sendOne(item) {
      item.status = 'sending'; item.attempts++; emit();
      if (mode === 'dry' || !endpoint) {
        // Rehearsal: render the exact payload, touch nothing.
        return new Promise(function (r) { setTimeout(r, 220 + Math.random() * 260); })
          .then(function () {
            item.status = 'published';
            item.at = new Date().toISOString();
            item.dry = true;
            emit();
          });
      }
      // Live: the endpoint holds the tokens; we never see them.
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.key },
        body: JSON.stringify({ platform: item.variant.platform, payload: payloadFor(item.variant) }),
      }).then(function (r) {
        if (!r.ok) throw new Error('publish failed (' + r.status + ')');
        return r.json().catch(function () { return {}; });
      }).then(function (d) {
        item.status = 'published'; item.at = new Date().toISOString(); item.remoteId = d && d.id; emit();
      }).catch(function (e) {
        item.status = 'failed'; item.reason = e.message || 'Publish failed.'; emit();
      });
    }

    function pump() {
      if (stopped) return Promise.resolve(summary());
      var next = items.filter(function (i) { return i.status === 'queued'; });
      if (!next.length && running === 0) return Promise.resolve(summary());
      var slots = [];
      while (running < concurrency && next.length) {
        var item = next.shift();
        running++;
        slots.push(sendOne(item).then(function () { running--; }));
      }
      if (!slots.length) return new Promise(function (r) { setTimeout(r, 60); }).then(pump);
      return Promise.all(slots).then(pump);
    }

    return {
      add: add,
      run: function () { stopped = false; return pump(); },
      stop: function () { stopped = true; },
      items: function () { return items.slice(); },
      summary: summary,
      onChange: function (fn) { listeners.push(fn); },
      mode: function () { return mode; },
    };
  }

  // Exactly what would be sent to each platform's API.
  /* The tracked link. A post that cannot be traced to a lead is just posting,
     so every variant carries the channel it went out on and the post it came
     from. The property page reads these and records a touch; when that visitor
     becomes a lead, the touches collapse into first/last-touch attribution.
     Nothing here identifies a person -- the visitor id is an anonymous uuid
     the browser already holds. */
  function trackedLink(v, opts) {
    opts = opts || {};
    var base = (opts.origin || '') + 'app/property.html?id=' + encodeURIComponent(v.propertyId);
    var ch = CHANNEL_FOR[v.platform];
    if (ch) base += '&ch=' + encodeURIComponent(ch);
    if (opts.postId) base += '&post=' + encodeURIComponent(opts.postId);
    return base;
  }

  /* syndication.js platform names -> the attribution_channel enum. Anything
     absent has no enum value, so its links simply carry no channel rather than
     guessing at one. */
  var CHANNEL_FOR = {
    instagram: 'instagram',
    tiktok: 'tiktok',
    facebook: 'facebook',
    whatsapp: 'whatsapp_campaign',
  };

  function payloadFor(v, opts) {
    var base = { caption: v.caption, hashtags: v.hashtags, ratio: v.ratio,
                 media: v.media ? { id: v.media.id, kind: v.media.kind, src: v.media.src || v.media.poster } : null,
                 propertyId: v.propertyId,
                 link: trackedLink(v, opts) };
    if (v.platform === 'youtube') base.title = v.title;
    return base;
  }

  window.SynSyndicate = {
    PLATFORMS: PLATFORMS, ANGLES: ANGLES, STOCK: STOCK,
    shape: shape, generate: generate, validate: validate,
    setTemplates: setTemplates, renderPattern: renderPattern,
    unknownTokens: unknownTokens, tokenNames: function () { return Object.keys(TOKENS); },
    brandBits: brandBits, signOff: signOff,
    createQueue: createQueue, payloadFor: payloadFor, naira: naira,
    trackedLink: trackedLink, CHANNEL_FOR: CHANNEL_FOR,
  };
})();
