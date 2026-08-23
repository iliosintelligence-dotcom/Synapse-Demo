/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — shared match module
   Single source of truth for everything the "Your matches" page (browse.html)
   and the Toju canvas (toju.html) render from a Toju match payload:
     · shapeTojuMatch()  — Toju API match  →  card item (one shape, both pages)
     · listingCardHtml() — the .listing card markup (identical on both pages)
     · drawMatchMap()    — the Leaflet price-pin map
     · naira / esc / verifyChip / coords / IMG_POOL — shared helpers
   Full data contract: docs/STATE_CONTRACT.md. Plain script (no build step);
   exposes window.SynMatches. Keep page-level CSS for .listing/.price-pin in
   sync between browse.html and toju.html — markup lives here, styles there.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
    const fmt = (value, opts) => {
      try {
        return new Intl.NumberFormat(undefined, Object.assign({
          style: 'currency', currency: code, maximumFractionDigits: 0,
        }, opts)).format(value);
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

  // area → coords (prototype geocoder; real app uses listing lat/lon)
  const GEO = {
    'ikate': [6.437, 3.522], 'lekki phase 1': [6.447, 3.47], 'lekki': [6.45, 3.5],
    'victoria island': [6.428, 3.421], 'osapa': [6.443, 3.49], 'sangotedo': [6.468, 3.628],
    'surulere': [6.5, 3.35], 'ajah': [6.468, 3.57], 'epe': [6.585, 3.983], 'yaba': [6.507, 3.371],
    'ikoyi': [6.452, 3.435], 'ikeja': [6.601, 3.351], 'magodo': [6.617, 3.38],
    'lagos': [6.52, 3.38], 'abuja': [9.06, 7.49], 'port harcourt': [4.82, 7.03],
    'ibadan': [7.38, 3.94], 'calabar': [4.97, 8.34], 'enugu': [6.45, 7.54],
  };
  function coords(loc, i) {
    const k = Object.keys(GEO).find((k) => String(loc).toLowerCase().includes(k));
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

  // Toju API match (toju-demo `chat` / `matches` actions) → the card item both
  // pages render. ONE shape — if you need a new field, add it here, not inline.
  function shapeTojuMatch(m, i) {
    return {
      id: m.id || 'r' + i,
      img: null, // renderer falls back to IMG_POOL[i % IMG_POOL.length]
      kind: m.room != null ? 'shared' : m.listingType === 'rent' ? 'rent' : 'sale',
      per: m.listingType === 'rent',
      // Toju shows every matching home and labels each one. This MUST come from
      // the row — hardcoding 'verified' here would stamp the badge on listings
      // nobody has checked, which is the single worst thing this UI could do.
      vstatus: m.verificationStatus || (m.verified ? 'verified' : 'unverified'),
      deal: m.room != null ? 'Shared room' : m.listingType === 'rent' ? 'For rent' : 'For sale',
      priceN: Number(m.price) || 0,
      ttl: m.title || '',
      loc: (m.neighbourhood && m.neighbourhood.name) ? m.neighbourhood.name : (m.city || ''),
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
  //   saves   — Set of ♥'d ids (localStorage `synapse_saved`)
  //   compare — include the compare checkbox (browse-only tool; the canvas
  //             deliberately omits it — on the canvas you just tell Toju)
  //   picked  — Set of ids ticked for compare
  /* Expiry chip — real scarcity, not manufactured.
     It says "expires", never "re-confirmation due": `expires_at` is the
     listing's own visibility window, and a re-confirmation claim would assert a
     verification re-check that nothing performs. The date is enforced, not
     decorative — properties_select_public hides the row past it and Toju's
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
          <div class="ttl">${esc(l.ttl)}</div>
          <div class="loc">${esc(l.loc)}</div>
          ${l.why ? `<div class="why">${l.why}</div>` : ''}
          ${score}
        </div>
        <div class="img">
          ${img
            ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.closest('.img').classList.add('no-photo');this.remove()" />`
            : ''}
          <div class="save${saves.has(l.id) ? ' on' : ''}" data-save="${l.id}">${saves.has(l.id) ? '♥' : '♡'}</div>
        </div>
      </div>`;
  }

  // Leaflet price-pin map. `st` is a persistent {map, layer} state object owned
  // by the page; pass the same object every call. Safe when the container was
  // display:none a moment ago (canvas morph) — it re-measures before fitting.
  function drawMatchMap(st, elId, items) {
    if (!window.L) return st;
    if (!st.map) {
      st.map = L.map(elId, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 18,
      }).addTo(st.map);
      st.layer = L.layerGroup().addTo(st.map);
    }
    st.layer.clearLayers();
    const pts = [];
    items.forEach((l, i) => {
      const c = coords(l.loc, i);
      pts.push(c);
      // A real map pin: price pill + pointer tail, with a verification dot so
      // the map carries the same trust signal the cards do. iconAnchor sits at
      // the tail tip so the pin points AT the location, not beside it.
      const vcls = (l.vstatus || 'verified') === 'verified' ? ' ok' : '';
      L.marker(c, { icon: L.divIcon({
        className: 'pin-wrap',
        html: `<div class="price-pin${vcls}"><span class="pv">${money(l.priceN, l.currency)}</span></div><span class="pin-tail"></span>`,
        iconSize: [0, 0], iconAnchor: [0, 0],
      }) })
        .addTo(st.layer)
        .bindPopup(`<b>${esc(l.ttl)}</b>${l.match ? '<br>' + l.match + '% match' : ''}${l.score != null ? '<br>Confidence ' + l.score : ''}`);
    });
    setTimeout(() => {
      st.map.invalidateSize();
      if (pts.length) st.map.fitBounds(L.latLngBounds(pts).pad(0.35));
    }, 80);
    return st;
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

  window.SynMatches = { esc, money, naira, IMG_POOL, GEO, coords, propertyHref, verifyChip, shapeTojuMatch, listingCardHtml, drawMatchMap,
    readSaves, toggleSave, onSavesChanged, SAVES_KEY, readViews, recordView, VIEWS_KEY };
})();
