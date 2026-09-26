/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — shared match module
   Single source of truth for everything the "Your matches" page (browse.html)
   and the Tayo canvas (toju.html) render from a Tayo match payload:
     · shapeTojuMatch()  — Tayo API match  →  card item (one shape, both pages)
     · listingCardHtml() — the .listing card markup (identical on both pages)
     · drawMatchMap()    — the vector map (see app/map/render.js)
     · naira / esc / verifyChip / coords / IMG_POOL — shared helpers
   Full data contract: docs/STATE_CONTRACT.md. Plain script (no build step);
   exposes window.SynMatches. Keep page-level CSS for .listing/.price-pin in
   sync between browse.html and toju.html — markup lives here, styles there.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── who listed it, as they designed themselves ─────────────────────────
     An agency sets a logo, a colour and a typeface on its Brand page, and a
     buyer never saw any of it: the card named no agency at all. This is the
     one place the card draws that identity, so browse and Tayo cannot drift.

     Everything here is the agency's own input, so it is checked rather than
     trusted: a colour must be a hex, a logo an http(s) URL, a typeface a
     plain family name. Anything else is left out and the default stands. */
  const WEB_SAFE_FONT = /^(arial|helvetica|georgia|times|times new roman|verdana|tahoma|trebuchet ms|courier new|garamond)$/i;
  const FONTS_ASKED = new Set();
  /* The typeface as a font-family stack, fetched from Google Fonts on first
     use. A family Google does not have simply fails to load and the fallback
     draws, which is the right failure for a name somebody typed. */
  function brandFontStack(name) {
    const n = String(name || '').trim().replace(/\s+/g, ' ');
    if (!/^[A-Za-z0-9][A-Za-z0-9 ]{1,39}$/.test(n)) return '';
    if (!WEB_SAFE_FONT.test(n) && !FONTS_ASKED.has(n) && document.head) {
      FONTS_ASKED.add(n);
      const lk = document.createElement('link');
      lk.rel = 'stylesheet';
      lk.href = 'https://fonts.googleapis.com/css2?family=' + n.replace(/ /g, '+') + '&display=swap';
      document.head.appendChild(lk);
    }
    return "'" + n + "', ";
  }
  function brandHex(c) {
    const v = String(c || '').trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : '';
  }
  /* White or near-black, whichever reads on the agency's colour: a pale
     brand colour with white initials is a blank square. */
  function inkOn(hex) {
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const lin = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return (0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]) > 0.4 ? '#1C1C1E' : '#fff';
  }
  function httpUrl(u) {
    const v = String(u || '').trim();
    return /^https?:\/\//i.test(v) ? v : '';
  }
  function agencyCss() {
    if (document.getElementById('syn-agy-css')) return;
    const s = document.createElement('style');
    s.id = 'syn-agy-css';
    s.textContent =
      '.listing .agy{display:flex;align-items:center;gap:8px;min-width:0;margin-top:10px;padding-top:9px;'
      + 'border-top:1px solid rgba(255,255,255,0.7);}'
      + '.listing .agy-mark{position:relative;width:28px;height:28px;flex:none;border-radius:7px;overflow:hidden;'
      + 'display:inline-flex;align-items:center;justify-content:center;background:rgba(54,54,54,0.12);'
      + 'color:#363636;font:700 12px/1 var(--f-sans,sans-serif);}'
      /* The logo sits over the initial and is removed if it will not load,
         which uncovers the initial rather than leaving a broken image. */
      + '.listing .agy-mark img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;'
      + 'opacity:0;transition:opacity .2s;}'
      /* Shown once it has loaded: a large logo arriving slowly otherwise
         reads as an empty white square where the initial was. */
      + '.listing .agy-mark img.on{opacity:1;}'
      + '.listing .agy-nm{min-width:0;font-size:12.5px;font-weight:600;color:var(--ink,#1C1C1E);'
      + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}';
    document.head.appendChild(s);
  }
  /* `a` is { name, logo, color, font }. Nothing is drawn without a name. */
  function agencyRowHtml(a) {
    if (!a || !a.name) return '';
    agencyCss();
    const col = brandHex(a.color), logo = httpUrl(a.logo), font = brandFontStack(a.font);
    const ini = String(a.name).trim().charAt(0).toUpperCase();
    return '<div class="agy" title="Listed by ' + esc(a.name) + '">'
      + '<span class="agy-mark"' + (col ? ' style="background:' + col + ';color:' + inkOn(col) + '"' : '') + '>'
      +   '<span aria-hidden="true">' + esc(ini) + '</span>'
      +   (logo ? '<img src="' + esc(logo) + '" alt="" loading="lazy" onload="this.classList.add(\'on\')" onerror="this.remove()">' : '')
      + '</span>'
      + '<span class="agy-nm"' + (font ? ' style="font-family:' + esc(font) + 'var(--f-sans,sans-serif)"' : '') + '>'
      +   esc(a.name) + '</span></div>';
  }

  /* ── Money, in whatever the listing is priced in ────────────────────────
     This was naira(): it hardcoded ₦ and the ₦-scale shorthand, so a London or
     Nairobi listing would have rendered as naira. Prices now format from the
     listing's own ISO 4217 currency (properties.currency).

     Abbreviation is deliberately currency-aware. "₦165M" reads naturally where
     a home costs hundreds of millions; "£0.4M" does not. So we only abbreviate
     once the number is genuinely long, and otherwise let Intl produce the
     conventional form for that currency — including where the symbol goes,
     which differs by locale and is the sort of thing that quietly marks a
     product as foreign. */
  const CURRENCY_FALLBACK = 'NGN';

  function money(n, currency) {
    n = Number(n) || 0;
    const code = /^[A-Za-z]{3}$/.test(currency || '') ? String(currency).toUpperCase() : CURRENCY_FALLBACK;
    /* narrowSymbol is what turns NGN into ₦. Without it Intl prints the ISO
       code for any currency the viewer's locale does not consider local — so a
       Nigerian on a phone set to en-GB, which is most of them, was reading
       "NGN 3.2M" on every card while the rest of the app said ₦. It stays
       currency-aware: £, $ and R still come out right, and a currency with no
       narrow symbol (KES) still falls back to its code rather than guessing.
       Guarded because Safari below 14.1 throws on the option itself. */
    const fmt = (value, opts) => {
      const base = Object.assign({
        style: 'currency', currency: code, maximumFractionDigits: 0,
      }, opts);
      try {
        return new Intl.NumberFormat(undefined,
          Object.assign({ currencyDisplay: 'narrowSymbol' }, base)).format(value);
      } catch (e) { /* fall through to the plain form */ }
      try {
        return new Intl.NumberFormat(undefined, base).format(value);
      } catch (e) {
        return code + ' ' + Math.round(value).toLocaleString();   // unknown code: never crash a price
      }
    };
    // Abbreviate only when the plain form gets unwieldy (7+ digits).
    if (Math.abs(n) >= 1e9) return fmt(n / 1e9, { maximumFractionDigits: 1 }) + 'B';
    if (Math.abs(n) >= 1e6) return fmt(n / 1e6, { maximumFractionDigits: n % 1e6 === 0 ? 0 : 1 }) + 'M';
    return fmt(n);
  }

  /* Kept so existing call sites keep working while the app is converted market
     by market. New code should call money(amount, listing.currency). */
  const naira = (n) => money(n, CURRENCY_FALLBACK);

  // deterministic photo pool — cards without a real image cycle through these
  /* Retained only because it is still exported on window.SynMatches and other
     pages may reference it. The card renderer no longer uses it: see
     listingCardHtml. Do not reintroduce it as a fallback for a missing photo. */
  const IMG_POOL = [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&q=70',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&q=70',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=500&q=70',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&q=70',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=70',
  ];

  /* ── where a pin goes ────────────────────────────────────────
     This used to be the whole answer, and its own comment said it should not
     be. Listings carry latitude/longitude and always did -- nothing selected
     them, so nothing could use them. Every home in the product is in Ibadan
     and this table has no Bodija, no Jericho, no Akobo, so the area name
     matched nothing and every pin landed on Lagos, four hundred miles away.

     The table stays as a fallback and nothing more: a listing that genuinely
     has no coordinates still appears near its city rather than vanishing from
     a map its own card is sitting next to. */
  const GEO = {
    'ikate': [6.437, 3.522], 'lekki phase 1': [6.447, 3.47], 'lekki': [6.45, 3.5],
    'victoria island': [6.428, 3.421], 'osapa': [6.443, 3.49], 'sangotedo': [6.468, 3.628],
    'surulere': [6.5, 3.35], 'ajah': [6.468, 3.57], 'epe': [6.585, 3.983], 'yaba': [6.507, 3.371],
    'ikoyi': [6.452, 3.435], 'ikeja': [6.601, 3.351], 'magodo': [6.617, 3.38],
    'lagos': [6.52, 3.38], 'abuja': [9.06, 7.49], 'port harcourt': [4.82, 7.03],
    'ibadan': [7.38, 3.94], 'calabar': [4.97, 8.34], 'enugu': [6.45, 7.54],
  };
  function coords(l, i) {
    // The listing's own position, whenever it has one.
    const la = Number(l && l.lat), lo = Number(l && l.lng);
    if (isFinite(la) && isFinite(lo) && (la !== 0 || lo !== 0)) return [la, lo];

    /* No coordinates on the row. Guess from the area name, and spread the
       guesses slightly so several unplaced listings in one city do not stack
       into one pin -- they are near the centre, which is all we know. */
    const where = String((l && l.loc) || '').toLowerCase();
    const k = Object.keys(GEO).find((key) => where.includes(key));
    const base = k ? GEO[k] : GEO['lagos'];
    return [base[0] + (i % 3) * 0.004, base[1] + (i % 2) * 0.004];
  }

  // Deep link to the property page. Every card tap must carry the listing id —
  // a bare property.html opens the wrong (demo) property. encodeURIComponent
  // output is also safe inside a double-quoted HTML attribute.
  function propertyHref(id) {
    return id ? 'property.html?id=' + encodeURIComponent(id) : 'property.html';
  }

  // clear verification badge on every card so buyers know exactly what's checked
  // (unified line icons via SynIcons when loaded; text-glyph fallback otherwise)
  function icon(name, fallback) {
    return (window.SynIcons && SynIcons.has(name)) ? SynIcons.svg(name) : fallback;
  }
  function verifyChip(v) {
    if (v === 'unverified') return '<span class="chip chip-unv">' + icon('unverified', '◌') + ' Not verified</span>';
    if (v === 'in_progress') return '<span class="chip chip-prog">' + icon('pending', '◷') + ' Still checking</span>';
    return '<span class="chip chip-pass">' + icon('verified', '✓') + ' Verified</span>';
  }

  // Tayo API match (toju-demo `chat` / `matches` actions) → the card item both
  // pages render. ONE shape — if you need a new field, add it here, not inline.
  function shapeTojuMatch(m, i) {
    return {
      id: m.id || 'r' + i,
      /* THE LISTING'S OWN PHOTOGRAPH. This was hardcoded null with the note
         "renderer falls back to IMG_POOL", and that fallback is gone — it
         dressed a real home in a stock flat, which a buyer cannot tell from a
         real photo of the place they are about to enquire about. So the cards
         went blank instead, while the agency's 21 uploaded photos sat in
         property_media untouched, because the server had never been asked for
         them either. Both ends are fixed; null here now means the listing
         genuinely has no picture, and the card says so. */
      img: (typeof m.img === 'string' && m.img.trim()) ? m.img.trim() : null,
      kind: m.room != null ? 'shared' : m.listingType === 'rent' ? 'rent' : 'sale',
      per: m.listingType === 'rent',
      // Tayo shows every matching home and labels each one. This MUST come from
      // the row — hardcoding 'verified' here would stamp the badge on listings
      // nobody has checked, which is the single worst thing this UI could do.
      vstatus: m.verificationStatus || (m.verified ? 'verified' : 'unverified'),
      // { name, logo, color, font } from the agency's Brand page, or null.
      agency: m.agencyBrand || null,
      deal: m.room != null ? 'Shared room' : m.listingType === 'rent' ? 'For rent' : 'For sale',
      priceN: Number(m.price) || 0,
      ttl: m.title || '',
      loc: (m.neighbourhood && m.neighbourhood.name) ? m.neighbourhood.name : (m.city || ''),
      // The map needs a position, not a place name. `loc` is what the card
      // prints; these two are where the pin goes.
      lat: m.latitude == null ? null : Number(m.latitude),
      lng: m.longitude == null ? null : Number(m.longitude),
      // `|| 0` meant a verified home with no trust_score rendered a ring of
      // 0 -- "we checked it and it scored nothing", which is worse than
      // silence. trust_score is currently NULL on every listing.
      score: m.trustScore == null || m.trustScore === '' ? null : Number(m.trustScore),
      // No match percentage, by decision. The server no longer emits a score:
      // the only producer read an archetype column from an empty table, so it
      // was always 0, and this line used to turn that into "80% match". A
      // percentage implies a model weighed something. Nothing did.
      match: null,
      flood: m.neighbourhood ? m.neighbourhood.flood : null,
      power: m.neighbourhood ? m.neighbourhood.power : null,
      yield: m.yieldPct,
      why: m.why ? '<b>Recommended —</b> ' + esc(m.why)
        : (m.whatToWatch && m.whatToWatch !== 'No major synthetic flags'
          ? '<b>Worth checking —</b> ' + esc(m.whatToWatch) : esc(m.summary || '')),
    };
  }

  // One .listing card. opts:
  //   saves   — Set of saved ids (localStorage `synapse_saved`)
  //   compare — include the compare checkbox (browse-only tool; the canvas
  //             deliberately omits it — on the canvas you just tell Tayo)
  //   picked  — Set of ids ticked for compare
  /* Expiry chip — real scarcity, not manufactured.
     It says "expires", never "re-confirmation due": `expires_at` is the
     listing's own visibility window, and a re-confirmation claim would assert a
     verification re-check that nothing performs. The date is enforced, not
     decorative — properties_select_public hides the row past it and Tayo's
     matcher uses the same clock — so a buyer acting on this chip is acting on
     something true. Shown only inside the last 3 days; a fortnight-long
     countdown is just pressure. */
  function expiryChip(l) {
    if (!l || !l.expiresAt) return '';
    const ms = new Date(l.expiresAt).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return '';
    const days = Math.ceil(ms / 864e5);
    if (days > 3) return '';
    const label = days === 1 ? 'Expires tomorrow' : 'Expires in ' + days + ' days';
    return `<span class="expiry" title="Listings come down after 14 days unless the agency re-lists them">${label}</span>`;
  }

  function listingCardHtml(l, i, opts) {
    const o = opts || {};
    const saves = o.saves || new Set();
    const picked = o.picked || new Set();
    /* No stock fallback. IMG_POOL cycled five Unsplash flats whenever a
       listing had no photo of its own, so a home with no picture was shown
       wearing a photograph of a different building -- indistinguishable, to a
       buyer, from a real photo of the place they were about to enquire about.
       An honest empty state is worth more than a pretty wrong one. */
    const img = typeof l.img === 'string' && l.img.trim() ? l.img.trim() : null;
    const matchChip = l.match
      ? `<span class="match">${l.match}% match</span>`
      : `<span class="match" style="color:var(--ink-muted);background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.08)">${esc(l.deal || '')}</span>`;
    // No stopPropagation here: it used to swallow the click before the page's
    // delegated grid handler ever saw it, so ticking compare never registered.
    // The browse handler now guards navigation on .cmpbox instead.
    const cmpBox = o.compare
      ? `<label class="cmpbox"><input type="checkbox" data-cmp="${l.id}" ${picked.has(l.id) ? 'checked' : ''}/>compare</label>`
      : '';
    const isVerified = (l.vstatus || 'verified') === 'verified';
    /* One rule: this line appears only when there is a score to show.
       It used to restate verification status in every case, which made each
       card say the same thing three times -- the chip at the top, the why-line
       in the middle, and this row at the bottom. The chip carries the status
       and the why-line carries what it means and what to do about it; neither
       of them can carry a number, so a number is the one thing this row is
       for. */
    const score = (isVerified && l.score != null)
      ? `<div class="score" title="How much of our verification this home has passed"><span class="ring">${l.score}</span> Property Confidence</div>`
      : '';
    return `
      <div class="card listing${picked.has(l.id) ? ' cmp' : ''}" data-id="${l.id}">
        <div class="body">
          <div class="tags">
            ${verifyChip(l.vstatus)}
            ${matchChip}
            ${expiryChip(l)}
            ${cmpBox}
          </div>
          <div class="price">${money(l.priceN, l.currency)}${l.per ? '<span style="font-size:13px;color:var(--ink-muted)">/yr</span>' : ''}</div>
          <!-- A real link, not a div. The card carried its id in data-id and
               opened from a click handler, so the only thing a keyboard could
               reach inside a listing was the Save button: you could save a home
               you had no way to open. An anchor also restores middle-click and
               open-in-new-tab, which a handler silently swallows. The card-wide
               click handler still works for everyone else. -->
          <div class="ttl"><a class="ttl-a" href="${propertyHref(l.id)}">${esc(l.ttl)}</a></div>
          <div class="loc">${esc(l.loc)}</div>
          ${l.why ? `<div class="why">${l.why}</div>` : ''}
          ${score}
          ${agencyRowHtml(l.agency)}
        </div>
        <div class="img">
          ${img
            ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.closest('.img').classList.add('no-photo');this.remove()" />`
            : ''}
          <button type="button" class="save${saves.has(l.id) ? ' on' : ''}" data-save="${l.id}"
                  aria-pressed="${saves.has(l.id)}"
                  aria-label="${saves.has(l.id) ? 'Remove' : 'Save'} ${esc(l.ttl)}">${icon('heart', saves.has(l.id) ? '♥' : '♡')}</button>
        </div>
      </div>`;
  }

  // Leaflet price-pin map. `st` is a persistent {map, layer} state object owned
  // by the page; pass the same object every call. Safe when the container was
  // display:none a moment ago (canvas morph) — it re-measures before fitting.
  /* ── THE MATCHES MAP ───────────────────────────────────────────────────
     Same signature it has always had -- drawMatchMap(state, elementId, items)
     -- so browse, Tayo and the agency portal call it exactly as before and
     none of them had to change. What is underneath is entirely different.

     It was Leaflet drawing divIcon price pills on raster tiles. Now it is
     SynMapRender: Stadia vector, clustered on a worker, monochrome, with a
     card instead of a popup. The reason the swap is three lines of call-site
     churn rather than three files of it is that the provider now lives behind
     one facade, which is the whole argument for having built it that way.

     ASYNCHRONOUS NOW, WHICH THE OLD ONE WAS NOT. MapLibre and the style are
     fetched, so the first call cannot paint synchronously. Items handed over
     before the map is ready are held in st.pending and drawn on ready, so a
     caller that renders results the moment they arrive does not silently lose
     the first set -- which is exactly what every one of these three callers
     does. */
  /* The state a map is left in when its style never arrived. Deliberately
     plain -- no icon, no colour, the same paper the map itself would have
     been -- because this is a hiccup to recover from, not an error page. The
     button is the point: the cause is almost always a connection that dropped
     for a moment, so the fix is to ask again, and the reader should not have
     to reload the whole portal to do it.

     Rebuilt through drawMatchMap with a cleared state, so a retry takes the
     same path as the first attempt and can fail into this box again. */
  /* Shipped with the component rather than pasted into every page that embeds
     a map -- browse, Tayo, property and the portal would otherwise each need
     their own copy, and the fourth one would be the one that got forgotten.
     Injected once, on first failure, so a session that never breaks never
     pays for it. Tokens with literal fallbacks: this has to render on pages
     that do not define the portal's variables. */
  function mapFailCss() {
    if (document.getElementById('syn-mapfail-css')) return;
    var s = document.createElement('style');
    s.id = 'syn-mapfail-css';
    s.textContent =
      '.syn-mapfail{display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'gap:12px;height:100%;min-height:160px;padding:24px;text-align:center;'
      + 'background:var(--paper,#FCFCFB);border-radius:inherit;}'
      + '.syn-mapfail p{margin:0;font-size:13.5px;color:var(--ink-muted,#5E5E59);}'
      + '.syn-mapfail-retry{font:inherit;font-size:13px;font-weight:600;cursor:pointer;'
      + 'padding:9px 18px;border-radius:999px;border:1px solid var(--border,#E2E2DE);'
      + 'background:var(--surface,#FFF);color:var(--ink,#141412);'
      + 'transition:background .15s ease,border-color .15s ease,transform .15s ease;}'
      + '.syn-mapfail-retry:hover{background:var(--paper,#F4F4F2);border-color:var(--ink-dim,#8A8A86);}'
      + '.syn-mapfail-retry:active{transform:scale(.97);}'
      + '.syn-mapfail-retry:focus-visible{outline:2px solid var(--ink,#141412);outline-offset:2px;}'
      + '@media (prefers-reduced-motion:reduce){.syn-mapfail-retry{transition:none;}'
      + '.syn-mapfail-retry:active{transform:none;}}';
    document.head.appendChild(s);
  }

  function mapFailed(host, st, list) {
    if (!host) return;
    mapFailCss();
    host.innerHTML =
      '<div class="syn-mapfail" role="status">'
      + '<p>The map could not load.</p>'
      + '<button type="button" class="syn-mapfail-retry">Try again</button>'
      + '</div>';
    var btn = host.querySelector('.syn-mapfail-retry');
    if (!btn) return;
    btn.addEventListener('click', function () {
      /* Tear the dead one down first. A renderer whose style never arrived may
         still hold a GL context and a slot in SynMapRender.instances, and a
         reader who taps Try again four times should not leak four of them. */
      try { if (st.r && st.r.map && st.r.map.remove) st.r.map.remove(); } catch (err) { /* already gone */ }
      if (window.SynMapRender && SynMapRender.instances) {
        var at = SynMapRender.instances.indexOf(st.r);
        if (at >= 0) SynMapRender.instances.splice(at, 1);
      }
      host.innerHTML = '';
      /* Every handle on the dead renderer goes, or ready() hands back the
         same rejected promise it cached and the retry appears to do nothing. */
      st.r = null; st.card = null; st.ready = false; st.sig = null;
      drawMatchMap(st, host.id, list || st.pending || [], st.opts || {});
    });
  }

  function drawMatchMap(st, elId, items, opts) {
    if (!window.SynMapRender || !window.SynMapStyle) return st;
    var list = (items || []).map(function (l, i) {
      var c = coords(l, i);
      return {
        id: l.id,
        lat: c[0], lng: c[1],
        price: money(l.priceN, l.currency),
        beds: bedLabel(l),
        verified: (l.vstatus || '') === 'verified',
        title: l.ttl || l.title || '',
        loc: l.loc || l.city || '',
        img: l.img || '',
      };
    }).filter(function (p) { return isFinite(p.lat) && isFinite(p.lng); });

    if (!st.r) {
      var host = document.getElementById(elId);
      if (!host) return st;
      /* The card is positioned against this element, so it has to establish a
         containing block. Pages style these boxes differently and not all of
         them set position. */
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

      st.r = SynMapRender.create(elId, { zoom: 12 });
      st.pending = list;
      st.opts = opts || {};
      st.r.ready().then(function () {
        st.card = SynMapCard.attach(st.r, host, {
          /* WHERE A CARD GOES IS THE PAGE'S QUESTION, not this file's. Three
             pages draw this map and two of them are the buyer's app, so
             hardcoding these handed the agency portal the buyer's
             destinations -- its own map opened the consumer listing page and
             offered to start a chat with Tayo about a home the agency is
             selling.

             Defaults unchanged, so browse and Tayo's canvas behave exactly as
             they did. `'ask' in opts` rather than a truthiness test: null is
             a real answer -- "no button at all" -- and a falsy check would
             read it as "not specified" and hand back the buyer's chat. */
          href: typeof st.opts.href === 'function'
            ? st.opts.href
            : function (id) { return propertyHref(id); },
          ask: ('ask' in st.opts)
            ? st.opts.ask
            : function (id) { return 'toju.html?reply=' + encodeURIComponent(id); },
          /* Without this the card cannot ask what is near a home. Absent, the
             Nearby block simply does not render -- it degrades to the card it
             was, rather than to a broken one. */
          sb: st.opts.sb || null,
        });
        /* AREA SEARCH IS OPT-IN, and only browse opts in.
           Tayo's map shows the homes Tayo chose and the portal's map shows one
           agency's own listings -- on either of those, "search this area"
           would quietly replace a curated set with every listing in the
           viewport, including other agencies'. Same component, different
           question being asked. */
        if (st.opts.areaSearch && window.SynMapQuery) {
          if (st.opts.sb) SynMapQuery.setConfig(st.opts.sb);
          SynMapQuery.attachSearchArea(st.r, function (rows) {
            /* Straight to the renderer, not through paint(): these rows came
               from the map, so re-framing the camera onto them would undo the
               pan that asked for them. */
            st.r.setProperties(rows);
            st.sig = rows.map(function (p) { return p.id; }).sort().join(',');
            if (st.opts.onAreaResults) st.opts.onAreaResults(rows);
          }, st.opts.filters);
        }
        st.ready = true;
        paint(st, st.pending || []);
      }).catch(function (e) {
        if (window.console) console.warn('map failed to start:', e && e.message);
        /* AND SAY IT ON THE PAGE, not only in a console nobody has open.
           The whole map hangs off one style fetch; when it fails the reader
           gets an empty white rectangle where a map should be, with no way to
           tell whether it is broken, still loading, or simply has no homes in
           it. A console warning is a note to us. This is the note to them --
           and it offers the one action that actually helps, because the usual
           cause is a connection that dropped for a second. */
        mapFailed(host, st, list);
      });
      return st;
    }

    if (!st.ready) { st.pending = list; return st; }
    paint(st, list);
    return st;
  }

  /* FRAME ON A NEW RESULT SET, NEVER ON A REPAINT.
     This used to fit() on every call. These pages re-render the map whenever
     anything nearby changes -- a save toggled, a filter chip, a re-sort -- and
     each of those calls handed over the same listings again, so the camera
     snapped back to the whole city. Open a cluster to look at 45 homes in
     Jericho and the next repaint threw you back out, which read as the tap not
     having worked at all.

     So the fit is keyed to WHICH homes are on the map, not to the fact that
     something called us. Same ids, same set, leave the camera where the user
     put it. */
  /* HOW MANY BEDROOMS, ACROSS THREE DIFFERENT ITEM SHAPES.
     browse, Tayo and the agency portal each shape their listings a little
     differently before handing them over, and the bedroom count is the field
     they disagree about most -- the first version read l.beds and l.bedrooms,
     got neither from browse, and every card on the map said "0 bed" under a
     title that read "2 bedroom terrace".

     So it tries the fields, and then falls back to the title, which every
     caller does supply and which starts with the number in all of them. A
     count is dropped entirely rather than shown as zero: "0 bed" is a claim
     about the property, and a wrong one. */
  function bedLabel(l) {
    var n = [l.beds, l.bedrooms, l.bd, l.bedroom].find(function (v) {
      return typeof v === 'number' || (typeof v === 'string' && v !== '' && isFinite(v));
    });
    if (n == null) {
      var m = String(l.ttl || l.title || '').match(/(\d+)\s*(?:bed|bedroom)/i);
      if (m) n = Number(m[1]);
    }
    n = Number(n);
    return isFinite(n) && n > 0 ? n + ' bed' : '';
  }

  function paint(st, list) {
    var sig = list.map(function (p) { return p.id; }).sort().join(',');
    st.r.setProperties(list);
    /* RESIZE BEFORE FITTING, which is the whole bug. fitBounds solves for the
       viewport it can see at the time, and this called it BEFORE resize() told
       MapLibre the container's real size — so the camera was framed for one
       box and then shown in another. With a single pin nobody notices, because
       flyTo centres it regardless. With two it is obvious: one sits centred
       and the other hangs off toward an edge, which is exactly how it was
       reported.

       It shows up here rather than everywhere because these maps are painted
       while the pane they live in is still settling — the sheet is opening, the
       column is still laying out — so the size at fit time is genuinely stale.
       Resizing first costs one extra layout read and makes the fit correct. */
    st.r.resize();
    /* Padding has to fit inside what it is padding. 56px a side needs 112px of
       height before a single pin can be placed, and these containers are 300px
       and shrink on a phone; when the padding crowds out the viewport
       fitBounds either throws or returns a nonsense zoom. Ask for 56, take
       what the box can actually spare. */
    if (list.length && sig !== st.sig) st.r.fit(list, fitPad(st.r, 56));
    st.sig = sig;
  }

  /** The largest padding this container can take without swallowing itself. */
  function fitPad(renderer, want) {
    var el = renderer && renderer.map && renderer.map.getContainer && renderer.map.getContainer();
    if (!el) return want;
    var w = el.clientWidth || 0, h = el.clientHeight || 0;
    if (!w || !h) return 0;                       // not laid out yet: no padding is safe
    return Math.max(0, Math.min(want, Math.floor(Math.min(w, h) / 2) - 24));
  }

  /* ── Saved homes — race-safe across tabs ────────────────────────────────
     Every page used to read `synapse_saved` into a Set at load and then write
     the whole Set back on each toggle. With two tabs open that is a lost-update
     race: tab B saves a home, tab A (holding a stale Set) saves a different one
     and wipes B's. Both users see hearts silently un-heart themselves.

     Fix: never write from a stale snapshot. Re-read at the moment of the
     change, apply the single delta, write back — and listen to `storage` so
     other tabs repaint instead of drifting. */
  const SAVES_KEY = 'synapse_saved';
  function readSaves() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVES_KEY) || '[]');
      return new Set(Array.isArray(raw) ? raw : []);
    } catch (e) { return new Set(); }
  }
  function toggleSave(id) {
    const now = readSaves();               // re-read: the source of truth is storage
    if (now.has(id)) now.delete(id); else now.add(id);
    try { localStorage.setItem(SAVES_KEY, JSON.stringify([...now])); } catch (e) {}
    return now;
  }
  // Fires when ANOTHER tab changes saves, so this tab can repaint from truth.
  function onSavesChanged(fn) {
    window.addEventListener('storage', (e) => {
      if (e.key === SAVES_KEY) fn(readSaves());
    });
  }

  /* ── Recently viewed — device-local history ─────────────────────────────
     A small snapshot of each listing the user actually opened, newest first,
     capped. Only ever written at the moment of a real card tap, so the rail
     can never show a home the user hasn't seen. Same race-safe discipline as
     saves: re-read at the moment of the write, apply one delta, write back. */
  const VIEWS_KEY = 'synapse_recent_views';
  const VIEWS_CAP = 8;
  function readViews() {
    try {
      const raw = JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((v) => v && v.id) : [];
    } catch (e) { return []; }
  }
  function recordView(l) {
    if (!l || !l.id) return readViews();
    const now = readViews().filter((v) => v.id !== l.id);
    now.unshift({ id: l.id, ttl: l.ttl || '', loc: l.loc || '', priceN: Number(l.priceN) || 0, per: !!l.per, at: Date.now() });
    const capped = now.slice(0, VIEWS_CAP);
    try { localStorage.setItem(VIEWS_KEY, JSON.stringify(capped)); } catch (e) {}
    return capped;
  }


  /* ── focus that does not summon a keyboard ────────────────────────────────
     Opening a panel used to focus its input, which on a phone throws the
     keyboard up over the thing you just opened. You came to read the
     conversation; instead half the screen is a keyboard and the messages and
     the composer are both behind it.

     The distinction is who asked. Focus in response to a tap -- you pressed
     Rename, you pressed the clear button, a code was just sent to you -- is
     the user asking to type, and those keep their focus() calls. Focus because
     a panel appeared is the interface deciding for them, and that is the one
     this replaces.

     A fine pointer keeps the old behaviour: on a desktop, opening a compose
     box and finding the cursor already in it costs nothing and saves a click. */
  function focusUnlessTouch(el) {
    if (!el) return;
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
    } catch (e) { /* no matchMedia: fall through and focus, as before */ }
    el.focus();
  }

  window.SynMatches = { focusUnlessTouch, esc, money, naira, IMG_POOL, GEO, coords, propertyHref, verifyChip, shapeTojuMatch, listingCardHtml, drawMatchMap,
    agencyRowHtml, brandFontStack, brandHex, inkOn,
    readSaves, toggleSave, onSavesChanged, SAVES_KEY, readViews, recordView, VIEWS_KEY };
})();
