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

  const naira = (n) => {
    n = Number(n) || 0;
    if (n >= 1e9) return '₦' + (n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1) + 'B';
    if (n >= 1e6) return '₦' + Math.round(n / 1e6) + 'M';
    return '₦' + n.toLocaleString();
  };

  // deterministic photo pool — cards without a real image cycle through these
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

  // clear verification badge on every card so buyers know exactly what's checked
  function verifyChip(v) {
    if (v === 'unverified') return '<span class="chip chip-unv">◌ Not verified</span>';
    if (v === 'in_progress') return '<span class="chip chip-prog">◷ Verifying…</span>';
    return '<span class="chip chip-pass">✓ Verified</span>';
  }

  // Toju API match (toju-demo `chat` / `matches` actions) → the card item both
  // pages render. ONE shape — if you need a new field, add it here, not inline.
  function shapeTojuMatch(m, i) {
    return {
      id: m.id || 'r' + i,
      img: null, // renderer falls back to IMG_POOL[i % IMG_POOL.length]
      kind: m.room != null ? 'shared' : m.listingType === 'rent' ? 'rent' : 'sale',
      per: m.listingType === 'rent',
      vstatus: 'verified', // Toju only ever recommends verified homes
      deal: m.room != null ? 'Shared room' : m.listingType === 'rent' ? 'For rent' : 'For sale',
      priceN: Number(m.price) || 0,
      ttl: m.title || '',
      loc: (m.neighbourhood && m.neighbourhood.name) ? m.neighbourhood.name : (m.city || ''),
      score: Number(m.trustScore) || 0,
      match: Number(m.fitScore) > 0 ? Math.min(100, Math.round(Number(m.fitScore))) : 80,
      flood: m.neighbourhood ? m.neighbourhood.flood : null,
      power: m.neighbourhood ? m.neighbourhood.power : null,
      yield: m.yieldPct,
      why: m.why ? '<b>Why:</b> ' + esc(m.why)
        : (m.whatToWatch && m.whatToWatch !== 'No major synthetic flags'
          ? '<b>Watch:</b> ' + esc(m.whatToWatch) : esc(m.summary || '')),
    };
  }

  // One .listing card. opts:
  //   saves   — Set of ♥'d ids (localStorage `synapse_saved`)
  //   compare — include the compare checkbox (browse-only tool; the canvas
  //             deliberately omits it — on the canvas you just tell Toju)
  //   picked  — Set of ids ticked for compare
  function listingCardHtml(l, i, opts) {
    const o = opts || {};
    const saves = o.saves || new Set();
    const picked = o.picked || new Set();
    const img = l.img || IMG_POOL[i % IMG_POOL.length];
    const matchChip = l.match
      ? `<span class="match">${l.match}% match</span>`
      : `<span class="match" style="color:var(--ink-muted);background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.08)">${esc(l.deal || '')}</span>`;
    const cmpBox = o.compare
      ? `<label class="cmpbox" onclick="event.stopPropagation()"><input type="checkbox" data-cmp="${l.id}" ${picked.has(l.id) ? 'checked' : ''}/>compare</label>`
      : '';
    const score = (l.vstatus || 'verified') === 'verified'
      ? `<div class="score"><span class="ring">${l.score}</span> Trust score</div>`
      : `<div class="score unv"><span class="ring unv">?</span> ${l.vstatus === 'in_progress' ? 'Verification in progress' : 'Not yet verified — ask Toju to check'}</div>`;
    return `
      <div class="card listing${picked.has(l.id) ? ' cmp' : ''}" data-id="${l.id}">
        <div class="body">
          <div class="tags">
            ${verifyChip(l.vstatus)}
            ${matchChip}
            ${cmpBox}
          </div>
          <div class="price">${naira(l.priceN)}${l.per ? '<span style="font-size:13px;color:var(--ink-muted)">/yr</span>' : ''}</div>
          <div class="ttl">${esc(l.ttl)}</div>
          <div class="loc">${esc(l.loc)}</div>
          ${l.why ? `<div class="why">${l.why}</div>` : ''}
          ${score}
        </div>
        <div class="img">
          <img src="${img}" alt="" />
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
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 18,
      }).addTo(st.map);
      st.layer = L.layerGroup().addTo(st.map);
    }
    st.layer.clearLayers();
    const pts = [];
    items.forEach((l, i) => {
      const c = coords(l.loc, i);
      pts.push(c);
      L.marker(c, { icon: L.divIcon({ className: '', html: `<div class="price-pin">${naira(l.priceN)}</div>`, iconAnchor: [26, 12] }) })
        .addTo(st.layer)
        .bindPopup(`<b>${esc(l.ttl)}</b><br>${l.match ? l.match + '% match · ' : ''}Trust ${l.score}`);
    });
    setTimeout(() => {
      st.map.invalidateSize();
      if (pts.length) st.map.fitBounds(L.latLngBounds(pts).pad(0.35));
    }, 80);
    return st;
  }

  window.SynMatches = { esc, naira, IMG_POOL, GEO, coords, verifyChip, shapeTojuMatch, listingCardHtml, drawMatchMap };
})();
