/* ─────────────────────────────────────────────────────────────────────────────
   SynMapQuery — asking the database what is on screen.

   Until now every map in this product was handed a list the page had already
   fetched and drew whatever it was given. That is fine at seven listings and
   already wrong at five hundred: the browser downloads a whole city to show
   one neighbourhood, and "search this area" has no server side at all.

   This calls properties_in_view(), which is a bounding-box query against the
   GiST index on properties.location — an index that had existed since the
   schema was written and that nothing had ever used. Measured on the live
   database: 32 rows out of 507 in 1.37ms, Bitmap Index Scan.

   TWO THINGS IT DELIBERATELY DOES NOT DO.

   It does not fetch while you pan. The renderer debounces viewport events, and
   even then this only runs when someone ASKS — the "Search this area" pill.
   A map that refetches on every idle is a map that fights you: results change
   under your thumb while you are still deciding where to look.

   And it never blocks the map. Panning and zooming stay live while a request
   is in flight, which is the one hard performance rule in the brief.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* Keyed by a rounded box, so nudging the map a few metres and asking again
     is free. Five decimal places is about a metre — far finer than anyone
     pans deliberately, and coarse enough to actually hit. */
  var cache = new Map();
  var CACHE_MAX = 40;

  function key(b, f) {
    var r = function (n) { return Number(n).toFixed(5); };
    return [r(b.west), r(b.south), r(b.east), r(b.north),
      f.listingType || '', f.minPrice || '', f.maxPrice || '',
      f.minBeds || '', f.verifiedOnly ? 1 : 0].join('|');
  }

  /* PASSED IN, not sniffed off window.
     The first version read window.SUPABASE_URL. Every page declares that as a
     `const` inside a script block, which is block-scoped and therefore NOT on
     window -- so config() returned null, inView() rejected, and the rejection
     went into a .catch that only logged. The pill said "Searching...", cleared
     itself, and changed nothing. It looked exactly like a working search.

     Callers hand it over explicitly now. The globals stay as a fallback for
     any page that does define them, but nothing depends on that. */
  var CFG = null;
  function setConfig(c) { if (c && c.url && c.anon) CFG = { url: c.url, anon: c.anon }; }
  function config() {
    if (CFG) return CFG;
    var url = window.SUPABASE_URL || window.SB_URL;
    var anon = window.ANON_KEY || window.SB_KEY;
    return (url && anon) ? { url: url, anon: anon } : null;
  }

  /**
   * @param bounds {west,south,east,north}
   * @param filters {listingType,minPrice,maxPrice,minBeds,verifiedOnly,limit}
   * @returns Promise<Array> shaped for SynMapRender.setProperties
   */
  function inView(bounds, filters) {
    var f = filters || {};
    var c = config();
    if (!c) return Promise.reject(new Error('Supabase config not found on this page'));

    var k = key(bounds, f);
    if (cache.has(k)) return Promise.resolve(cache.get(k));

    return fetch(c.url + '/rest/v1/rpc/properties_in_view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.anon,
        Authorization: 'Bearer ' + c.anon,
      },
      body: JSON.stringify({
        p_west: bounds.west, p_south: bounds.south,
        p_east: bounds.east, p_north: bounds.north,
        p_limit: f.limit || 300,
        p_listing_type: f.listingType || null,
        p_min_price: f.minPrice != null ? f.minPrice : null,
        p_max_price: f.maxPrice != null ? f.maxPrice : null,
        p_min_beds: f.minBeds != null ? f.minBeds : null,
        p_verified_only: !!f.verifiedOnly,
      }),
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(t.slice(0, 200)); });
      return res.json();
    }).then(function (rows) {
      var out = (rows || []).map(shape);
      cache.set(k, out);
      /* A Map keeps insertion order, so the oldest key is the first one. */
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
      return out;
    });
  }

  function money(n, period) {
    n = Number(n) || 0;
    var s = n >= 1e9 ? '₦' + trim(n / 1e9) + 'b'
      : n >= 1e6 ? '₦' + trim(n / 1e6) + 'm'
        : n >= 1e3 ? '₦' + Math.round(n / 1e3) + 'k'
          : '₦' + n;
    return s + (period === 'per_year' ? '/yr'
      : period === 'per_month' ? '/mo'
        : period === 'per_night' ? '/night' : '');
  }
  function trim(x) { return String(Math.round(x * 10) / 10).replace(/\.0$/, ''); }

  function shape(p) {
    return {
      id: p.id,
      lat: p.latitude, lng: p.longitude,
      price: money(p.price, p.price_period),
      beds: p.bedrooms > 0 ? p.bedrooms + ' bed' : '',
      verified: p.verification_status === 'verified',
      title: p.title || '',
      loc: p.address || p.city || '',
      img: p.img || '',
    };
  }

  /* ── "SEARCH THIS AREA" ─────────────────────────────────────────────────
     The pill only appears once the map has moved far enough that the results
     on screen are genuinely stale — otherwise it sits there permanently,
     nagging, and stops meaning anything. "Far enough" is measured against the
     box that was last searched: a pan of more than about a third of the view,
     or a zoom step, counts.

     Searching is a decision, not a side effect of looking around. */
  function attachSearchArea(renderer, onResults, filters) {
    var host = renderer.map.getContainer();
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'syn-map-search-area';
    btn.textContent = 'Search this area';
    host.appendChild(btn);
    injectCss();

    /* Seeded with the view the map opens on, NOT left null. Null meant the
       first viewport event counted as "moved" and the pill appeared before the
       user had touched anything -- offering to search the area they were
       already looking at, which is both useless and the exact nagging this
       threshold exists to prevent. */
    var lastSearched = renderer.viewport(), busy = false;

    function moved(vp) {
      if (!lastSearched) return true;
      var l = lastSearched;
      if (Math.abs(vp.zoom - l.zoom) > 0.8) return true;
      var w = Math.abs(l.east - l.west), h = Math.abs(l.north - l.south);
      var dx = Math.abs(((vp.east + vp.west) / 2) - ((l.east + l.west) / 2));
      var dy = Math.abs(((vp.north + vp.south) / 2) - ((l.north + l.south) / 2));
      return dx > w * 0.34 || dy > h * 0.34;
    }

    renderer.onViewport(function (vp) {
      btn.classList.toggle('on', !busy && moved(vp));
    });

    btn.addEventListener('click', function () {
      var vp = renderer.viewport();
      if (!vp) return;
      busy = true;
      btn.classList.remove('on');
      btn.classList.add('busy');
      btn.textContent = 'Searching…';
      inView(vp, filters || {})
        .then(function (rows) { onResults(rows, vp); })
        .catch(function (e) {
          /* Say so on the control the person just pressed. A silent failure
             here is indistinguishable from "there is nothing here", which is
             a different and much more misleading answer. */
          if (window.console) console.warn('area search failed:', e.message);
          btn.textContent = 'Could not search — try again';
          setTimeout(function () { btn.textContent = 'Search this area'; }, 2600);
          throw e;
        })
        .then(function () {
          busy = false;
          btn.classList.remove('busy');
          btn.textContent = 'Search this area';
          lastSearched = vp;
        }, function () {
          /* Failed: leave lastSearched alone so the pill comes back and the
             search can be retried, rather than recording a search that never
             happened. */
          busy = false;
          btn.classList.remove('busy');
          btn.classList.add('on');
        });
    });

    return { el: btn };
  }

  function injectCss() {
    if (document.getElementById('syn-map-area-css')) return;
    var st = document.createElement('style');
    st.id = 'syn-map-area-css';
    st.textContent = [
      '.syn-map-search-area{position:absolute;z-index:5;top:12px;left:50%;',
      '  transform:translate(-50%,-8px);opacity:0;pointer-events:none;',
      '  transition:opacity .18s ease,transform .18s ease;',
      '  background:#141412;color:#fff;border:0;border-radius:100px;',
      '  padding:9px 16px;font:600 12.5px var(--f-sans,system-ui,sans-serif);',
      '  cursor:pointer;box-shadow:0 8px 22px rgba(20,20,18,.28);}',
      '.syn-map-search-area.on{opacity:1;pointer-events:auto;transform:translate(-50%,0);}',
      '.syn-map-search-area.busy{opacity:1;pointer-events:none;transform:translate(-50%,0);}',
      '@media (prefers-reduced-motion: reduce){.syn-map-search-area{transition:none;}}',
    ].join('');
    document.head.appendChild(st);
  }

  window.SynMapQuery = { inView: inView, attachSearchArea: attachSearchArea, shape: shape, setConfig: setConfig };
})();
