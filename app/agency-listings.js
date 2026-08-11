/* ─────────────────────────────────────────────────────────────────────────
   Synapse — agency listings persistence.

   The agency dashboard kept listings in localStorage only: `toPropertyRow()`
   existed in agency.html and was never called, so a listing an agency created
   never reached the database and neither Toju nor browse could see it. This
   module is the real write path.

   TRUST BOUNDARY (the important part):
   An agency may create and edit its own listings. It may never certify them.
   `verification_status`, `verification_nodes`, `trust_score` and `verified_at`
   are omitted from every write here, and the database refuses them too — the
   RLS insert policy pins verification to 'unverified' on creation and the
   update policy forbids changing it afterwards. A listing an agency creates is
   unverified and stays unverified until the platform says otherwise. Client
   code is not the control; RLS is. This file simply never asks.

   Consequence worth knowing: because Toju only surfaces verified listings, a
   freshly uploaded listing appears in the agency dashboard and in browse, but
   NOT in Toju's recommendations, until it is verified. That is correct, not a
   bug.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* Columns an agency is allowed to write. Anything absent from this list is
     system-owned or derived and is dropped before the request rather than sent
     and rejected — a field silently stripped by RLS is far harder to debug
     than one that was never sent. */
  var WRITABLE = [
    'title', 'description', 'property_type', 'listing_type',
    'price', 'price_period', 'move_in_cost', 'service_charge',
    'address', 'city', 'state', 'country', 'latitude', 'longitude',
    'bedrooms', 'bathrooms', 'area_sqm', 'amenities',
    'title_type', 'yield_pct', 'is_active', 'is_negotiable',
    'toilets', 'parking_spaces', 'floor_level', 'total_floors',
    'year_built', 'furnished', 'property_condition',
  ];

  function client() {
    if (!window.SynAuth) return Promise.reject(new Error('auth-unavailable'));
    return window.SynAuth.client();
  }

  /* ── which agency am I? ──────────────────────────────────────────────────
     Membership is the authority, not a role string on the user. RLS on
     agency_members already restricts this select to rows where profile_id is
     the caller, so an unprivileged read cannot enumerate other agencies. */
  var cachedAgencyId = null;
  function agencyId(force) {
    if (cachedAgencyId && !force) return Promise.resolve(cachedAgencyId);
    return client().then(function (c) {
      return c.from('agency_members').select('agency_id').is('deleted_at', null).limit(1);
    }).then(function (r) {
      if (r.error) throw r.error;
      cachedAgencyId = (r.data && r.data[0] && r.data[0].agency_id) || null;
      return cachedAgencyId;
    });
  }

  /* Keep only writable keys, and drop undefined so PostgREST doesn't try to
     null a column the form simply didn't collect. Empty strings become null:
     the form yields '' for untouched optional fields and '' is not a valid
     numeric or enum. */
  function scrub(data) {
    var out = {};
    WRITABLE.forEach(function (k) {
      if (!(k in data)) return;
      var v = data[k];
      if (v === undefined) return;
      if (v === '') v = null;
      out[k] = v;
    });
    return out;
  }

  /* An agency's own switch controls visibility, so mirror it into `status`.
     `properties_select_public` requires is_active AND status='live', so a row
     left at the 'draft' default would be invisible to buyers and to browse —
     which is exactly the "it saved but nothing happened" failure this module
     exists to remove. */
  function withStatus(row) {
    // Only derive status when the caller actually said something about
    // is_active. Defaulting a partial update to 'live' would silently
    // republish a listing the agency had archived.
    if (!('is_active' in row)) return row;
    row.status = row.is_active === false ? 'draft' : 'live';
    return row;
  }

  /* The 14-day freshness rule, written into the row rather than left implied.
     Until now "14 days" existed only as copy and as a `listed_at` filter in the
     matcher; `expires_at` was never set, so nothing actually expired. Listing
     and re-listing both restart the clock, which is what re-confirmation means. */
  var FRESH_DAYS = 14;
  function freshWindow() {
    var now = new Date();
    return {
      listed_at: now.toISOString(),
      expires_at: new Date(now.getTime() + FRESH_DAYS * 864e5).toISOString(),
    };
  }

  /* ── media ───────────────────────────────────────────────────────────────
     property_media has no is_primary column — order is the primary signal, so
     display_order 0 IS the cover image. Rewriting media as delete-then-insert
     keeps ordering honest without diffing. */
  function writeMedia(c, propertyId, media) {
    var rows = (media || [])
      .map(function (m) { return typeof m === 'string' ? { url: m } : m; })
      .filter(function (m) { return m && m.url; })
      .map(function (m, i) {
        return { property_id: propertyId, url: m.url, media_type: m.media_type || 'image', display_order: i };
      });
    return c.from('property_media').delete().eq('property_id', propertyId).then(function () {
      if (!rows.length) return { data: [], error: null };
      return c.from('property_media').insert(rows);
    });
  }

  /* ── read ────────────────────────────────────────────────────────────────
     Deleted rows are excluded here as well as by RLS: a soft-deleted listing
     should not reappear in the agency's own list. */
  function list() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      /* Scoped by agency_id EXPLICITLY, not left to RLS. Postgres permissive
         policies OR together, and `properties_select_public` matches every
         live listing on the platform — so relying on RLS alone would hand this
         agency every other agency's inventory. RLS is the security floor; the
         query still has to ask the right question. */
      return c1.from('properties')
        .select('*, property_media(url, media_type, display_order)')
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
    }).then(function (r) {
      if (r.error) throw r.error;
      return (r.data || []).map(function (p) {
        p.media = (p.property_media || [])
          .slice()
          .sort(function (a, b) { return a.display_order - b.display_order; });
        delete p.property_media;
        return p;
      });
    });
  }

  /* ── leads ───────────────────────────────────────────────────────────────
     The CRM's data source. Same discipline as list(): scoped by agency_id
     explicitly rather than trusting RLS to be the only filter.

     `lost` leads are excluded because this feeds a live pipeline view whose
     funnel has no column for them — they are not hidden data, they are simply
     not pipeline. Soft-deleted rows are excluded for the same reason as
     listings. The joined property supplies the title and price the agency
     needs to recognise which listing the lead is actually about. */
  function leads() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      return c1.from('leads')
        .select('id, consumer_name, consumer_phone, source, current_stage, lead_score, ' +
                'risk_level, next_action_recommendation, budget_min, budget_max, ' +
                'delivery_status, delivery_error, last_activity_at, created_at, ' +
                'properties(title, price, city)')
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .neq('current_stage', 'lost')
        .order('created_at', { ascending: false })
        .limit(500);
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || [];
    });
  }

  /* Move a lead through the pipeline.

     Scoped by agency_id as well as id: RLS already restricts the row set, but
     an explicit filter means a mistyped id fails as "no rows" rather than
     quietly relying on the policy to be the only thing standing between this
     agency and another one's lead.

     Only pipeline columns are grantable to `authenticated` -- delivery_status,
     source and consumer_phone are deliberately not updatable from the client,
     so the attribution record cannot be rewritten after the fact. */
  var LEAD_STAGES = ['new', 'contacted', 'qualified', 'viewing_scheduled',
                     'viewing_completed', 'negotiating', 'commitment', 'closed', 'lost'];
  function setLeadStage(id, stage) {
    if (LEAD_STAGES.indexOf(stage) < 0) return Promise.reject(new Error('Unknown stage: ' + stage));
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('No agency on this account');
      return c1.from('leads')
        .update({ current_stage: stage, last_activity_at: new Date().toISOString() })
        .eq('id', id)
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .select('id, current_stage')
        .maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      // RLS returning nothing is indistinguishable from a bad id at the wire;
      // either way the write did not happen, so say so rather than reporting
      // success and letting the UI drift from the database.
      if (!r.data) throw new Error('That lead could not be updated');
      return r.data;
    });
  }

  function create(data) {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('no-agency: this account is not a member of any agency');
      var row = withStatus(scrub(data));
      row.agency_id = aid;
      Object.assign(row, freshWindow());   // starts the 14-day clock
      // verification_* and trust_score are deliberately never set here.
      return c1.from('properties').insert(row).select('id').single();
    }).then(function (r) {
      if (r.error) throw r.error;
      var id = r.data.id;
      return writeMedia(c1, id, data.media).then(function () { return id; });
    });
  }

  function update(id, data) {
    var c1;
    return client().then(function (c) {
      c1 = c;
      return c.from('properties').update(withStatus(scrub(data))).eq('id', id).select('id').single();
    }).then(function (r) {
      if (r.error) throw r.error;
      return writeMedia(c1, id, data.media).then(function () { return id; });
    });
  }

  /* Soft delete. There is no DELETE policy on properties by design, so a hard
     delete would simply be refused; marking deleted_at is the supported path
     and keeps leads and viewings that referenced the listing intact. */
  function remove(id) {
    return client().then(function (c) {
      return c.from('properties').update({ deleted_at: new Date().toISOString(), is_active: false, status: 'archived' }).eq('id', id);
    }).then(function (r) {
      if (r.error) throw r.error;
      return true;
    });
  }

  /* Re-listing is what the 14-day freshness rule measures against. */
  function relist(id) {
    return client().then(function (c) {
      return c.from('properties').update(freshWindow()).eq('id', id);
    }).then(function (r) {
      if (r.error) throw r.error;
      return true;
    });
  }

  /* The agency's own record — name and verification tier. The portal used to
     hardcode "Prestige Realty Ltd. · Gold Verified" in its header, so every
     agency saw someone else's name and an unearned trust tier on their own
     dashboard. */
  var cachedAgency = null;
  function agency() {
    if (cachedAgency) return Promise.resolve(cachedAgency);
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return null;
      return c1.from('agencies').select('id,name,verification_tier,subscription_tier').eq('id', aid).limit(1)
        .then(function (r) {
          if (r.error) throw r.error;
          cachedAgency = (r.data && r.data[0]) || null;
          return cachedAgency;
        });
    });
  }

  /* Paints [data-agency-name] / [data-agency-initials] / [data-agency-tier] /
     [data-agency-eyebrow] wherever they appear. Silent when signed out — the
     markup ships with neutral placeholders, never a specimen agency. */
  function paintAgency() {
    return agency().then(function (a) {
      if (!a) return null;
      var tier = a.verification_tier ? String(a.verification_tier) : '';
      /* The label is "<tier> verified" — which reads correctly for gold and
         basic, but the most common tier in the database is literally
         "verified", and that produced "Verified verified" on every page of
         those agencies' portals. When the tier already names the state, say
         it once. */
      var tierWord = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '';
      var tierLabel = !tier ? ''
        : tier.toLowerCase() === 'verified' ? '✦ Verified'
        : '✦ ' + tierWord + ' verified';
      var initials = String(a.name || '?').split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
      document.querySelectorAll('[data-agency-name]').forEach(function (el) { el.textContent = a.name || 'Your agency'; });
      document.querySelectorAll('[data-agency-tier]').forEach(function (el) { el.textContent = tierLabel; });
      document.querySelectorAll('[data-agency-initials]').forEach(function (el) { el.textContent = initials; el.title = a.name || 'Your agency'; });
      document.querySelectorAll('[data-agency-eyebrow]').forEach(function (el) {
        el.textContent = (a.name || 'Your agency') + (tierLabel ? ' · ' + tierLabel.replace('✦ ', '') : '');
      });
      return a;
    }).catch(function () { return null; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { paintAgency(); });
  else paintAgency();

  /* ── brand kit ───────────────────────────────────────────────────────────
     The agency's own identity fields. `verification_tier`, `rating` and
     `closed_deals` are deliberately absent: they are platform-owned and the
     database refuses them anyway (agencies_guard_tier). An agency describes
     itself here; it does not rate itself. */
  var BRAND_FIELDS = [
    'name', 'tagline', 'description', 'specialties',
    'logo_url', 'logo_dark_url', 'brand_color', 'brand_color_secondary', 'brand_font',
    'brand_voice', 'whatsapp_number', 'city', 'social',
  ];

  function loadBrand() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return null;
      return c1.from('agencies').select(BRAND_FIELDS.join(',')).eq('id', aid).limit(1)
        .then(function (r) { if (r.error) throw r.error; return (r.data && r.data[0]) || null; });
    });
  }

  function saveBrand(patch) {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('no-agency: this account is not a member of any agency');
      var row = {};
      BRAND_FIELDS.forEach(function (k) {
        if (!(k in patch)) return;
        var v = patch[k];
        row[k] = v === '' ? null : v;
      });
      return c1.from('agencies').update(row).eq('id', aid).select('id').single();
    }).then(function (r) {
      if (r.error) throw r.error;
      cachedAgency = null;            // name or tier may have changed
      paintAgency();
      return true;
    });
  }

  /* ── Brand assets ────────────────────────────────────────────────────
     Logo files live in the public `brand` bucket at
       brand/<agency_id>/<slot>-<timestamp>.<ext>
     The agency-id folder is what the storage policies check, so a member can
     only ever write inside their own agency's folder.

     The timestamp matters: object storage is cached hard at the CDN, and
     re-uploading to a fixed path (logo-light.png) would keep serving the old
     image after a change. A fresh filename each time sidesteps that
     entirely, and the previous file is deleted so the folder cannot grow
     without bound. */
  var BRAND_BUCKET = 'brand';
  var LOGO_MAX_BYTES = 2 * 1024 * 1024;
  var LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

  function extFor(file) {
    var m = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
    return m[file.type] || 'png';
  }

  /* Upload one logo. `slot` is 'light' or 'dark'. Resolves to the public URL,
     which the caller writes into logo_url / logo_dark_url via saveBrand. */
  function uploadBrandAsset(file, slot) {
    if (!file) return Promise.reject(new Error('No file selected'));
    if (LOGO_TYPES.indexOf(file.type) === -1) {
      return Promise.reject(new Error('Use a PNG, JPG, WEBP or SVG'));
    }
    if (file.size > LOGO_MAX_BYTES) {
      return Promise.reject(new Error('That file is ' + Math.ceil(file.size / 1024 / 1024) + 'MB — keep a logo under 2MB'));
    }
    var c1, aid;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (a) {
      if (!a) throw new Error('no-agency: this account is not a member of any agency');
      aid = a;
      var path = aid + '/logo-' + (slot === 'dark' ? 'dark' : 'light') + '-' + Date.now() + '.' + extFor(file);
      return c1.storage.from(BRAND_BUCKET).upload(path, file, {
        cacheControl: '31536000', upsert: false, contentType: file.type,
      }).then(function (r) {
        if (r.error) throw r.error;
        return c1.storage.from(BRAND_BUCKET).getPublicUrl(path).data.publicUrl;
      });
    });
  }

  /* Remove a previously uploaded file. Best-effort: a logo the agency has
     already replaced must never block saving the new one, so a failure here
     is swallowed rather than surfaced. */
  function removeBrandAsset(url) {
    if (!url) return Promise.resolve(false);
    var marker = '/' + BRAND_BUCKET + '/';
    var i = String(url).indexOf(marker);
    if (i === -1) return Promise.resolve(false);        // not ours (a pasted URL)
    var path = decodeURIComponent(String(url).slice(i + marker.length).split('?')[0]);
    return client()
      .then(function (c) { return c.storage.from(BRAND_BUCKET).remove([path]); })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  window.SynListings = {
    agencyId: agencyId,
    agency: agency,
    paintAgency: paintAgency,
    loadBrand: loadBrand,
    saveBrand: saveBrand,
    uploadBrandAsset: uploadBrandAsset,
    removeBrandAsset: removeBrandAsset,
    list: list,
    leads: leads,
    setLeadStage: setLeadStage,
    LEAD_STAGES: LEAD_STAGES,
    create: create,
    update: update,
    remove: remove,
    relist: relist,
    available: function () {
      return agencyId().then(function (a) { return !!a; }).catch(function () { return false; });
    },
  };
})();
