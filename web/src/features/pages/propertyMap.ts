/* eslint-disable */
// @ts-nocheck
/* The property page's map engine: the map beside the listing (MapLibre, through SynMapRender), what is nearby (the stored survey,
   else OpenStreetMap), routes and commutes, the cost slip and the neighbourhood read. Was the page's inline script
   (legacy/property/inline-4.js, with the names it read in engine-globals.js); moved as it was, and run at the same point (last in
   PropertyBody's list). It gets the listing from React's `syn:property` event. */
export function run() {
  /* What the engine reads from the page: the listing's id, the public Supabase values, escaping and title-type labels. */
  const PROP_ID = new URLSearchParams(window.location.search).get('id') || '';
  const SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
  const ANON_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
  const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const TITLE_LABEL = { c_of_o: 'Certificate of Occupancy', governors_consent: 'Governor’s Consent',
    registered_deed: 'Registered Deed', excision: 'Excision', gazette: 'Gazette', allocation: 'Allocation' };


  /* Reactive map canvas, mirrors the swipe deck. Each card maps to a view:
     what's nearby (schools/gyms/restaurants/churches/mosques), commute/traffic by
     time of day, route to the listing agency, cost breakdown, legal & documents. */
  (function () {
    if (!window.SynMapRender || !document.getElementById('pvMap')) return;

    /* This module used to hardcode one Lekki flat's surroundings: seven named
       schools/gyms/restaurants with invented walking times, two commute
       destinations with invented ETAs, and a named agency with a rating and a
       deal count. Rendered against any other listing, an Ibadan flat, say -
       every one of those was a false statement about a real place.

       "Nearby" now queries OpenStreetMap's live Overpass API for whatever is
       actually around the listing's real coordinates, real amenities, real
       names, real distances. Clicking one asks OSRM's public routing API for
       a real walking route and a real duration, not a guessed one. Both are
       free, keyless, public APIs; both can be slow or briefly unavailable,
       so every call has a timeout and an honest failure message, we would
       rather say "couldn't reach it, try again" than show a stale or
       invented answer. */
    var PROP = null;                 // [lat, lng] from the listing
    var POI = [];                    // filled from the stored survey, or by fetchAmenities()
    /* Which source POI currently holds. The stored Google survey always wins:
       both lookups are started in the same handler, the Overpass one first, so
       without this the slower-but-emptier answer arrives second and overwrites
       the better one. On Ologuneru that meant fourteen real places were
       replaced by OpenStreetMap's nothing, seconds after they appeared. */
    var poiSource = null;            // 'stored' | 'osm'
    var poiState = 'idle';           // idle | loading | loaded | error
    var poiFetchedFor = null;        // property id already fetched, so tab-switching doesn't refetch
    var routeLine = null;            // the one active "connect to this amenity" route, if any
    var poiMarkers = [];             // tracked so renderPOI() can clear its own markers without wiping the home pin
    // Icons by name, not emoji: emoji render inconsistently (and sometimes in
    // full colour) across OS, clashing with the app's single stroke-icon
    // language everywhere else. SynIcons (icons.js) draws these to match.
    var META = {
      school: { i: 'school', col: '#2f6dbd', lbl: 'Schools' },
      gym: { i: 'gym', col: '#8a5cd6', lbl: 'Gyms' },
      restaurant: { i: 'restaurant', col: '#c98b3a', lbl: 'Restaurants' },
      church: { i: 'church', col: '#3f9c6d', lbl: 'Churches' },
      mosque: { i: 'mosque', col: '#2e7d4f', lbl: 'Mosques' },
      bus_stop: { i: 'bus', col: '#1d7a8c', lbl: 'Bus stops' },
      hospital: { i: 'hospital', col: '#c94040', lbl: 'Hospitals' },
      supermarket: { i: 'cart', col: '#a8742b', lbl: 'Supermarkets' },
      /* The stored Google survey uses its own category names, and META was
         written for OpenStreetMap's. When the map switched to the stored
         source, every Google-only category -- pharmacy, bank, market,
         university, transit, park -- hit `META[t].col` on an undefined and
         threw mid-render: the markers were already drawn, so the map filtered
         correctly while the panel beside it silently kept the previous tab's
         text. Anything missing here is now a real gap in the legend, not a
         crash. */
      pharmacy: { i: 'pharmacy', col: '#b3506b', lbl: 'Pharmacies' },
      market: { i: 'cart', col: '#a8742b', lbl: 'Markets & malls' },
      bank: { i: 'bank', col: '#5a6b7a', lbl: 'Banks' },
      university: { i: 'school', col: '#2f6dbd', lbl: 'Universities' },
      transit: { i: 'bus', col: '#1d7a8c', lbl: 'Transport' },
      park: { i: 'tree', col: '#3f9c6d', lbl: 'Parks' },
      cafe: { i: 'restaurant', col: '#c98b3a', lbl: 'Cafes' },
      /* Neither sits in a tab, so they show only under Nearby -- but a petrol
         station and a police post are things buyers here actually ask about,
         and a named legend beats a grey 'Other' pin. */
      fuel: { i: 'fuel', col: '#7a6a3f', lbl: 'Petrol stations' },
      police: { i: 'police', col: '#4a5b8c', lbl: 'Police' },
      other: { i: 'cart', col: '#6B6B70', lbl: 'Other' },
    };
    /* Never index META directly again: an unknown category must degrade to a
       grey pin, not take the whole panel down with it. */
    function metaFor(t) {
      return META[t] || { i: 'cart', col: '#6B6B70', lbl: (String(t || 'Other')).replace(/_/g, ' ') };
    }
    function poiSvg(name, size) { return window.SynIcons ? SynIcons.svg(name, { size: size }) : ''; }

    /* ── real amenities: OpenStreetMap Overpass API ──────────────────────── */
    /* Overpass is free and public, which also means it is regularly overloaded:
       the main instance answered 504 on the first real test of this page, and
       a cold query for a Nigerian city can take 30s+. One endpoint with a 15s
       timeout therefore failed most of the time, and the honest failure
       message was the thing users would mostly see.

       So: mirrors, tried in order, with a timeout that matches how slow this
       service genuinely is. kumi.systems is the usual community mirror and is
       markedly more reliable than the main instance. */
    var OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
    /* Fastest first, and only mirrors confirmed to answer a browser. Measured
       from this page rather than taken from a mirror list:
         overpass.osm.ch          819ms  ok
         overpass-api.de         2166ms  ok
         overpass.kumi.systems   8327ms  CORS
         overpass.private.coffee 7018ms  CORS

       kumi.systems was first in this list and sends no Access-Control-Allow-
       Origin header, so every visitor paid its full timeout before the working
       mirror was even tried -- 25 seconds of nothing on the nearby panel. It
       is out for the same reason overpass.osm.jp is: a server that cannot
       answer a browser is not a fallback, it is a delay. */
    /* ORDER REVERSED, and speed is not the reason.

       overpass.osm.ch is a REGIONAL instance. It answers a Nigerian query in
       819ms with HTTP 200, a valid Overpass envelope, and zero elements --
       because its database does not contain Nigeria. Measured directly: the
       same query returns 0 there and 19 from overpass-api.de. Being first and
       fastest, it answered every request this product ever made, successfully
       and emptily, and the fallback below never fired because nothing had
       failed. Ranking these by latency was measuring the wrong thing.

       overpass-api.de is the main instance and carries the planet, so it goes
       first now. osm.ch stays as a fallback: for a European listing it is a
       fine answer and genuinely faster. */
    var OVERPASS_MIRRORS = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
      // overpass.osm.jp was here and is not usable from a browser: it serves a
      // certificate for the wrong common name, so Chrome refuses the request
      // before it is even sent (ERR_CERT_COMMON_NAME_INVALID).
      // overpass.kumi.systems and overpass.private.coffee: no CORS headers.
    ];

    /* Tries each mirror until one answers. Resolves with parsed JSON, rejects
       only when every mirror has failed. */
    function overpassFetch(query, perTryMs) {
      var body = 'data=' + encodeURIComponent(query);
      var i = 0;
      function attempt() {
        if (i >= OVERPASS_MIRRORS.length) return Promise.reject(new Error('all overpass mirrors failed'));
        var url = OVERPASS_MIRRORS[i++];
        return fetchWithTimeout(url, { method: 'POST', body: body }, perTryMs || 15000)
          .then(function (r) { if (!r.ok) throw new Error('overpass ' + r.status); return r.json(); })
          .then(function (d) {
            /* An empty result from a regional mirror is indistinguishable from
               "there is genuinely nothing here" unless we try another one. A
               real void is rare -- every home has SOMETHING within 3 km -- so
               treat it as this mirror not covering the area and let the next
               one answer. If they all come back empty, the last empty result
               stands and the panel says so honestly. */
            if (d && Array.isArray(d.elements) && d.elements.length === 0
                && i < OVERPASS_MIRRORS.length) {
              return attempt();
            }
            return d;
          })
          .catch(function () { return attempt(); });
      }
      return attempt();
    }
    /* ── what we ask OpenStreetMap for ─────────────────────────────────
       Three things were wrong with the version this replaces, and together
       they are why the map looked empty beside tabs promising detail.

       1. `node` only. A school, hospital, market or mall is normally drawn in
          OSM as a building outline -- a WAY -- not a point. Measured around
          the Agbowo listing: the same tags returned 5 elements as `node` and
          9 as `nwr`. Nearly half of everything was invisible because of the
          word at the start of each line. `out center` gives a way or relation
          a single point to pin.

       2. Categories the UI advertises that nothing ever asked for. The tabs
          offer Schools, Health, Shops and Transport, and POI_FILTERS looks
          for university, pharmacy, market, shopping mall, bank, bus station
          and park -- none of which appeared in the query, so on this path
          those tabs could only ever be empty. Within 2 km of that same
          listing they are worth 29 real places, including the ten mapped
          features of the University of Ibadan next door.

       3. Radii set for a dense European suburb. Bus stops were fetched within
          600 m, which found none; there are 21 within 5 km. Widened per
          category, because a hospital 2.5 km away is still the hospital you
          would use and a cafe 2.5 km away is not.

       Still genuinely missing, and not fixable here: bus ROUTES and motor
       parks. Zero route relations and zero amenity=bus_station exist around
       Ibadan in OSM. Informal transport is not mapped, so we do not draw it. */
    var OVERPASS_QUERY_TPL = '[out:json][timeout:25];('
      + 'nwr["amenity"="school"](around:1500,{lat},{lng});'
      + 'nwr["amenity"~"^(university|college)$"](around:2500,{lat},{lng});'
      + 'nwr["leisure"="fitness_centre"](around:1500,{lat},{lng});'
      + 'nwr["amenity"="gym"](around:1500,{lat},{lng});'
      + 'nwr["amenity"="restaurant"](around:1200,{lat},{lng});'
      + 'nwr["amenity"="cafe"](around:1200,{lat},{lng});'
      + 'nwr["amenity"="place_of_worship"](around:1500,{lat},{lng});'
      + 'nwr["highway"="bus_stop"](around:1500,{lat},{lng});'
      + 'nwr["amenity"="bus_station"](around:3000,{lat},{lng});'
      + 'nwr["public_transport"~"^(station|platform)$"](around:1500,{lat},{lng});'
      + 'nwr["amenity"="hospital"](around:3000,{lat},{lng});'
      + 'nwr["amenity"~"^(clinic|doctors)$"](around:1500,{lat},{lng});'
      + 'nwr["amenity"="pharmacy"](around:1500,{lat},{lng});'
      + 'nwr["shop"="supermarket"](around:1500,{lat},{lng});'
      + 'nwr["amenity"="marketplace"](around:2500,{lat},{lng});'
      + 'nwr["shop"~"^(mall|department_store)$"](around:3000,{lat},{lng});'
      + 'nwr["amenity"="bank"](around:1500,{lat},{lng});'
      + 'nwr["leisure"="park"](around:2000,{lat},{lng});'
      + 'nwr["amenity"="fuel"](around:1500,{lat},{lng});'
      + 'nwr["amenity"="police"](around:2500,{lat},{lng});'
      + ');out center 250;';
    var AMENITY_LABEL = { school: 'School', university: 'University', gym: 'Gym',
      restaurant: 'Restaurant', cafe: 'Cafe', bus_stop: 'Bus stop', transit: 'Transport',
      hospital: 'Hospital', pharmacy: 'Pharmacy', supermarket: 'Supermarket',
      market: 'Market', bank: 'Bank', park: 'Park', fuel: 'Petrol station',
      police: 'Police station', church: 'Church', mosque: 'Mosque' };

    function haversineM(a, b) {
      var R = 6371000, toRad = function (d) { return d * Math.PI / 180; };
      var dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
      var s = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }
    function formatDist(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km'; }

    /* ── how long that actually takes ──────────────────────────────────────
       Derived from distance rather than taken from the router, because the
       router cannot be trusted for either number here.

       WALKING: the public OSRM demo only has the car profile loaded, and
       answers a /foot/ request with car routing instead of refusing it.
       Measured on three pairs from this address: foot and driving returned
       identical distances and durations, at 70.4, 55.9 and 62.9 km/h. So a
       "walking" time from that engine is a driving time wearing a different
       label. 4.8 km/h is an ordinary adult pace on a pavement.

       DRIVING: the same profile reads OSM maxspeed tags and models no
       congestion at all, which is how it arrives at 55-70 km/h averages. A
       range between 16 and 26 km/h is the honest shape for a Nigerian urban
       journey -- the low end is a bad hour, the high end a clear one. A point
       estimate would invite somebody to plan a viewing around a number that
       has never been measured.

       Both are labelled estimates wherever they are shown. The DISTANCE is
       still OSRM's and still worth having: it follows the road network rather
       than a straight line, which is the part the engine genuinely knows. */
    var WALK_KMH = 4.8;
    var DRIVE_KMH_FAST = 26, DRIVE_KMH_SLOW = 16;
    function walkMins(m) { return Math.max(1, Math.round((m / 1000) / WALK_KMH * 60)); }
    function driveMins(m) {
      var km = m / 1000;
      return {
        lo: Math.max(1, Math.round(km / DRIVE_KMH_FAST * 60)),
        hi: Math.max(2, Math.round(km / DRIVE_KMH_SLOW * 60)),
      };
    }
    function driveText(m) {
      var r = driveMins(m);
      return r.lo === r.hi ? ('about ' + r.lo + ' min') : (r.lo + '\u2013' + r.hi + ' min');
    }

    /* Emits the SAME vocabulary the stored Google survey uses -- university,
       pharmacy, bank, market, transit, park -- because META and POI_FILTERS
       were written against that vocabulary and the two sources have to be
       interchangeable. A type invented here would pin correctly and then be
       missing from every tab and from the legend. */
    function elementToType(tags) {
      var a = tags.amenity;
      if (a === 'school') return 'school';
      if (a === 'university' || a === 'college') return 'university';
      if (tags.leisure === 'fitness_centre' || a === 'gym') return 'gym';
      if (a === 'restaurant') return 'restaurant';
      if (a === 'cafe') return 'cafe';
      if (a === 'place_of_worship' && tags.religion === 'muslim') return 'mosque';
      if (a === 'place_of_worship') return 'church';   // unlabelled religion reads as church
      // Before the generic public_transport test: a bus stop carries both.
      if (tags.highway === 'bus_stop') return 'bus_stop';
      if (a === 'bus_station' || tags.public_transport) return 'transit';
      if (a === 'hospital' || a === 'clinic' || a === 'doctors') return 'hospital';
      if (a === 'pharmacy') return 'pharmacy';
      if (tags.shop === 'supermarket') return 'supermarket';
      if (a === 'marketplace' || tags.shop === 'mall' || tags.shop === 'department_store') return 'market';
      if (a === 'bank') return 'bank';
      if (tags.leisure === 'park') return 'park';
      if (a === 'fuel') return 'fuel';
      if (a === 'police') return 'police';
      return null;
    }
    function fetchWithTimeout(url, opts, ms) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, ms);
      opts = opts || {};
      opts.signal = ctrl.signal;
      return fetch(url, opts).finally(function () { clearTimeout(timer); });
    }
    /* -- Commute intelligence (the card panel) --------------------------
       Lives here, not beside the other card sections, because it needs
       PROP, OVERPASS_URL, haversineM, formatDist and fetchWithTimeout --
       all of which are defined in this script block. Named ...Panel to
       stay clear of renderCommute() below, which draws the map overlay.

       ORIGINALLY (-- 10 --) -----------------------------------------
       WAS: a hardcoded array of Lagos destinations -- Lagos Island, Victoria
       Island, "Lekki Phase 1 gate 6 min", MMIA -- with invented minutes, shown
       identically on every listing. Every property in this database is in
       Ibadan, roughly 130km from Lekki, so the panel confidently told buyers a
       two-hour drive was a six-minute one, and told them the same thing
       whatever they were looking at.

       NOW: destinations are real places found near THIS property via
       OpenStreetMap, and the times are real driving durations from OSRM. Both
       are free and need no API key. If either is unavailable we say so and
       show distance alone -- a straight-line distance is a fact, an unrouted
       "minutes" figure would just be the old bug in a new coat. */
    var CMT_DESTS = null;          // [{name, type, c:[lat,lng], dm, sec|null}]
    var cmtState = 'idle';         // idle | loading | ready | failed
    var cmtFetchedFor = null;
    var customPlaces = JSON.parse(localStorage.getItem('synapse_places_' + PROP_ID) || '[]');

    function fmtMin(m) {
      if (m == null) return null;
      return m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : Math.round(m) + ' min';
    }

    /* The places people actually commute to, at city scale. Deliberately not
       the corner-shop set already shown under "Nearby": a hospital you might
       drive to is a different question from a cafe you can walk to. */
    var CMT_QUERY_TPL = '[out:json][timeout:20];('
      + 'node["amenity"="university"](around:14000,{lat},{lng});'
      + 'node["amenity"="hospital"](around:12000,{lat},{lng});'
      + 'node["amenity"="marketplace"](around:12000,{lat},{lng});'
      + 'node["shop"="mall"](around:14000,{lat},{lng});'
      + 'node["amenity"="bus_station"](around:14000,{lat},{lng});'
      + 'node["aeroway"="aerodrome"](around:40000,{lat},{lng});'
      + ');out body 60;';

    function cmtType(tags) {
      if (tags.amenity === 'university') return 'University';
      if (tags.amenity === 'hospital') return 'Hospital';
      if (tags.amenity === 'marketplace') return 'Market';
      if (tags.shop === 'mall') return 'Shopping mall';
      if (tags.amenity === 'bus_station') return 'Bus station';
      if (tags.aeroway === 'aerodrome') return 'Airport';
      return null;
    }

    /* One OSRM table call gives durations from the property to every
       destination at once, rather than N round trips. */
    function routeDurations(origin, dests) {
      var coords = [origin[1] + ',' + origin[0]]
        .concat(dests.map(function (d) { return d.c[1] + ',' + d.c[0]; })).join(';');
      var url = 'https://router.project-osrm.org/table/v1/driving/' + coords
        + '?sources=0&annotations=duration';
      return fetchWithTimeout(url, {}, 12000)
        .then(function (r) { if (!r.ok) throw new Error('osrm ' + r.status); return r.json(); })
        .then(function (d) {
          var row = d && d.durations && d.durations[0];
          if (!row) throw new Error('no durations');
          dests.forEach(function (dest, i) {
            var sec = row[i + 1];
            dest.sec = (typeof sec === 'number' && isFinite(sec)) ? sec : null;
          });
          return dests;
        });
    }

    /* Overpass is free, public and regularly overloaded -- on the first real
       test of this page every mirror answered 504. A live call on every page
       load therefore means the feature is down whenever Overpass is, which is
       often. So a successful lookup is kept: the places near a house do not
       move, and a month-old answer is a great deal better than none.

       Only successes are cached. A failure must never be written, or one bad
       afternoon would be remembered as "no destinations here". */
    var CMT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
    function cmtCacheKey(id) { return 'synapse_commute_' + id; }
    function cmtCacheRead(id) {
      try {
        var raw = localStorage.getItem(cmtCacheKey(id));
        if (!raw) return null;
        var o = JSON.parse(raw);
        if (!o || !o.at || (Date.now() - o.at) > CMT_TTL_MS) return null;
        return Array.isArray(o.d) ? o.d : null;
      } catch (e) { return null; }
    }
    function cmtCacheWrite(id, dests) {
      try { localStorage.setItem(cmtCacheKey(id), JSON.stringify({ at: Date.now(), d: dests })); } catch (e) {}
    }

    function fetchCommutePanel(propId, lat, lng) {
      if (cmtFetchedFor === propId) return;
      cmtFetchedFor = propId;

      var cached = propId && cmtCacheRead(propId);
      if (cached && cached.length) {
        CMT_DESTS = cached;
        cmtState = 'ready';
        renderCommutePanel();
        paintAround();
        return;
      }

      cmtState = 'loading';
      renderCommutePanel();

      var q = CMT_QUERY_TPL.split('{lat}').join(lat).split('{lng}').join(lng);
      overpassFetch(q, 15000)
        .then(function (data) {
          var seen = {};
          var out = (data.elements || []).reduce(function (acc, el) {
            var t = cmtType(el.tags || {});
            var nm = el.tags && el.tags.name;
            // An unnamed node is useless here: "Hospital, 14 min" tells you nothing.
            if (!t || !nm || el.lat == null || el.lon == null) return acc;
            if (seen[t]) return acc;          // one of each kind, the nearest
            seen[t] = true;
            acc.push({ name: nm, type: t, c: [el.lat, el.lon], dm: haversineM([lat, lng], [el.lat, el.lon]), sec: null });
            return acc;
          }, []);
          out.sort(function (a, b) { return a.dm - b.dm; });
          CMT_DESTS = out.slice(0, 5);
          if (!CMT_DESTS.length) { cmtState = 'ready'; renderCommutePanel(); return; }
          var settle = function () {
            cmtState = 'ready';
            if (propId) cmtCacheWrite(propId, CMT_DESTS);
            renderCommutePanel();
            /* The nearby card falls back to these when nothing is mapped within
               walking distance, so it has to be told they have arrived. */
            paintAround();
          };
          return routeDurations([lat, lng], CMT_DESTS).then(settle).catch(settle);  // distances still stand
        })
        .catch(function () { cmtState = 'failed'; renderCommutePanel(); });
    }

    /* Which departure the buttons are showing. Midday is the default because it
       is the closest thing to "normally", and because a page that opens on the
       worst hour of the day is arguing rather than informing. */
    var cmtSlot = 'midday';
    var CMT_SLOT_FIELD = {
      morning: 'drive_seconds_morning',
      midday: 'drive_seconds_midday',
      evening: 'drive_seconds_evening',
    };

    /* The measurement for the chosen hour, or the free-flow one if that hour
       was never measured. Returns which it used, so the panel can say so
       instead of passing one off as the other. */
    function cmtSecondsFor(d) {
      var field = CMT_SLOT_FIELD[cmtSlot];
      if (d[field] != null) return { sec: d[field], measured: true };
      if (d.drive_seconds != null) return { sec: d.drive_seconds, measured: false };
      return { sec: null, measured: false };
    }

    (function wireTod() {
      var tod = document.getElementById('tod');
      if (!tod) return;
      tod.addEventListener('click', function (e) {
        var b = e.target.closest('[data-slot]');
        if (!b) return;
        cmtSlot = b.dataset.slot;
        tod.querySelectorAll('[data-slot]').forEach(function (x) {
          x.classList.toggle('on', x === b);
        });
        renderCommutePanel();
      });
    })();

    function renderCommutePanel() {
      var host = document.getElementById('commute');
      var src = document.getElementById('commuteSrc');
      if (!host) return;

      var parts = [];
      if (cmtState === 'loading') {
        parts.push('<span class="c pending">Looking up real places and drive times…</span>');
      } else if (cmtState === 'failed') {
        parts.push('<span class="c">Couldn’t reach the maps service just now</span>');
      } else if (CMT_DESTS && CMT_DESTS.length) {
        CMT_DESTS.forEach(function (d) {
          var pick = cmtSecondsFor(d);
          /* A measured per-hour figure from property_places is still the best
             answer when it exists. Otherwise the distance carries it: the
             road distance where OSRM gave us one, the straight line where it
             did not, and a driving range worked out from that rather than the
             engine's free-flow guess. The old code read pick.sec while the
             router wrote d.sec, so every routed duration was computed and
             then silently dropped -- these chips have been showing bare
             distances ever since. */
          var t = pick.sec != null ? fmtMin(Math.round(pick.sec / 60)) : null;
          var metres = (d.route_m != null ? d.route_m : d.dm);
          parts.push('<span class="c">' + esc(d.name) + ' <b>'
            + (t ? t : formatDist(metres)) + '</b>'
            + (t ? '' : ' <span class="cmt-est">' + driveText(metres) + ' drive</span>')
            // An hour we did not measure is marked, not quietly substituted.
            + (t && !pick.measured ? '<i class="cmt-ff" title="Free-flow time; this hour was not measured">~</i>' : '')
            + '</span>');
        });
      } else if (cmtState === 'ready') {
        parts.push('<span class="c">No major destinations mapped near this address yet</span>');
      }

      // The buyer's own places. They typed the minutes, so they are theirs to
      // trust -- but they are labelled as theirs, not presented as measured.
      customPlaces.forEach(function (c, i) {
        parts.push('<span class="c">' + esc(c.place) + ' <b>' + fmtMin(c.min) + '</b> · yours'
          + ' <button class="cmt-rm" data-i="' + i + '" aria-label="Remove">×</button></span>');
      });
      parts.push('<button class="addplace" id="addPlace">+ add a place</button>');
      host.innerHTML = parts.join('');

      if (src) {
        var routed = (CMT_DESTS || []).some(function (d) { return d.sec != null; });
        /* This said "Places and drive times from Google Maps, measured from
           this address." Nothing here has ever called Google -- places come
           from OpenStreetMap via Overpass and routes from OSRM -- and at the
           moment it rendered there were usually no drive times at all, because
           the routed seconds were being dropped by a field-name mismatch. It
           named the wrong source, for numbers that were not there, and called
           straight lines measured. */
        src.textContent = cmtState === 'ready' && CMT_DESTS && CMT_DESTS.length
          ? (routed
              ? 'Places from OpenStreetMap, distances along the road network via OSRM. '
                + 'Driving times are estimated from distance at Nigerian urban speeds, not live traffic.'
              : 'Places from OpenStreetMap. Routing was unavailable, so these are straight-line '
                + 'distances and the times estimated from them are rougher still.')
          : '';
      }

      var add = document.getElementById('addPlace');
      if (add) add.addEventListener('click', function () {
        var place = prompt('Somewhere you go often (work, church, gym)?'); if (!place) return;
        var mins = parseInt(prompt('Roughly how many minutes away, at normal traffic?', '20'), 10);
        if (!place.trim() || isNaN(mins)) return;
        customPlaces.push({ place: place.trim().slice(0, 40), min: mins });
        localStorage.setItem('synapse_places_' + PROP_ID, JSON.stringify(customPlaces));
        renderCommutePanel();
      });
      host.querySelectorAll('.cmt-rm').forEach(function (b) {
        b.addEventListener('click', function () {
          customPlaces.splice(Number(b.dataset.i), 1);
          localStorage.setItem('synapse_places_' + PROP_ID, JSON.stringify(customPlaces));
          renderCommutePanel();
        });
      });
    }
    renderCommutePanel();

    /* ── the neighbourhood card, painted from this listing ──────────────────
       Three separate questions, kept separate because we can answer them to
       very different standards:

         WHERE IS IT     -- the listing's own address. Always known.
         HOW IS THE AREA -- scores from the neighbourhood record, and ONLY when
                            the listing is actually attached to one. Most are
                            not, and inventing bars is what this section used to
                            do. A coordinate that was never verified is flagged
                            rather than quietly drawn as fact.
         WHAT IS NEARBY  -- real named places from OpenStreetMap with real
                            straight-line distances from this property.

       A missing answer is printed as a missing answer. */
    /* THE SIX SCORE BARS ARE GONE, AND THEY WERE NEVER MEASUREMENTS.
       Safety, Family life, Walkability, Power reliability, Internet and Flood
       risk read off `neighbourhoods`, and every one of those columns is
       seed_rand output from twin_seed.sql. A buyer saw 'Safety 64' rendered as
       a filled bar with a number beside it -- the visual language of a
       measurement -- about the street they were thinking of moving to.

       This is the Lekki Phase 1 bug wearing better clothes. That version put
       one hardcoded neighbourhood's numbers on every listing in the country;
       this one puts a different random number on each area, which is harder
       to notice and no more true.

       Two other surfaces had already worked this out and stopped: the social
       composer removed the power line rather than publish it under an
       agency's name, and toju-demo selects neighbourhoods(name) and nothing
       else because 'scores 64 on safety' is a random number wearing a
       sentence. The page a buyer actually reads was the last one still
       printing them.

       Nothing replaces them, because something real already had: the card on
       the map lists what is actually around this address, by category, with
       measured distances. A fabricated score above fourteen real places was
       not adding information -- it was outranking it. */

    /* Kept as a named function so the three cases are visible side by side
       rather than buried in a ternary inside a ternary. */
    function haveplaces_text(havePlaces, nb) {
      if (havePlaces) return '';                       // the card below says it better
      if (nb) return 'We hold no scored data for this area yet.';
      return 'We have not mapped what is around this address yet.';
    }

    /* ── what it really costs, from the listing ─────────────────────────────
       Only what the agency actually recorded. A cost we have not been given is
       omitted, not estimated: an invented "power & utilities" line repeated on
       every property is indistinguishable, to a buyer, from one we looked up.

       Rent and sale are genuinely different questions, so they render
       differently rather than being forced through one template. */
    function paintCosts(p) {
      var rowsEl = document.getElementById('costRows');
      var noteEl = document.getElementById('costNote');
      if (!rowsEl) return;

      var cur = p.currency || 'NGN';
      var money = function (n) {
        if (n == null) return null;
        try {
          return new Intl.NumberFormat(undefined, {
            style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0,
          }).format(Number(n));
        } catch (e) { return String(n); }
      };

      var isRent = p.listing_type === 'rent';
      var per = p.price_period === 'per_year' ? '/yr'
              : p.price_period === 'per_month' ? '/mo' : '';
      var rows = [];

      if (p.price != null) {
        rows.push(['' + (isRent ? 'Rent' : 'Price'), money(p.price) + per]);
      }
      if (p.service_charge != null) {
        rows.push(['Service charge', money(p.service_charge) + (isRent ? '/yr' : '')]);
      }
      if (p.move_in_cost != null) {
        rows.push(['Move-in cost (one-off)', money(p.move_in_cost)]);
      }
      /* Zero is an answer worth printing. An agency that charges no legal fee
         is advertising, and money(0) would render a currency-formatted nothing
         where a word reads better. A null is not a zero and never reaches
         here -- it is named in the note below instead. */
      var fee = function (n) { return Number(n) === 0 ? 'None' : money(n); };
      if (p.agency_fee != null) {
        rows.push(['Agency fee (one-off)', fee(p.agency_fee)]);
      }
      if (p.legal_fee != null) {
        rows.push(['Legal fee (one-off)', fee(p.legal_fee)]);
      }

      /* A first-year total only where every part of it is known. Adding up two
         of three numbers and calling it a total is worse than not showing one,
         and that holds harder now there are five parts rather than three: a
         total that quietly omitted the agency fee would be wrong in exactly
         the direction that costs somebody money. */
      /* The rent for a YEAR (Greptile): monthly rent was added once, so the
         total understated the year. Nightly rent has no honest year. */
      var yearRent = p.price == null ? null
        : p.price_period === 'per_month' ? Number(p.price) * 12
        : p.price_period === 'per_night' ? null : Number(p.price);
      var parts = [yearRent, p.service_charge, p.move_in_cost, p.agency_fee, p.legal_fee];
      if (isRent && parts.every(function (v) { return v != null; })) {
        var first = parts.reduce(function (a, v) { return a + Number(v); }, 0);
        rows.push(['First year, all in', money(first), true]);
      }

      if (!rows.length) {
        rowsEl.innerHTML = '';
        if (noteEl) noteEl.textContent = 'This listing does not state its costs yet. Ask the agency what is payable beyond the headline price.';
        return;
      }

      /* THE COST AS A RECEIPT (idea: dqnamo's Receipt Printer). The same figures
         the card always showed, laid out as the slip you would get at a till:
         what you pay every year, what you pay once, and a bottom line. Nothing
         here is worked out that was not already: the only total is the rent
         first-year total above, and it still appears only when every part of it
         is known. Where there is no honest total, the bottom line is the
         headline price, and a cost the agency did not state is printed on the
         slip as "not stated" rather than being left out or guessed. */
      var hasTotal = rows.some(function (r) { return r[2]; });
      var line = function (label, val, cls) {
        return '<div class="cr-row' + (cls ? ' ' + cls : '') + '"><span>' + esc(label) + '</span><i aria-hidden="true"></i><b>' + esc(val) + '</b></div>';
      };
      var stated = function (label, v, val) { return v == null ? line(label, 'not stated', 'no') : line(label, val); };
      var priceLabel = isRent ? 'Rent' : 'Price';
      var priceRow = p.price != null ? (priceLabel + ' ' + money(p.price) + per) : null;
      var every = '', once = '';
      if (hasTotal && p.price != null) every += line(priceLabel, money(p.price) + per);
      every += stated('Service charge', p.service_charge, p.service_charge == null ? '' : money(p.service_charge) + (isRent ? '/yr' : ''));
      once += stated('Move-in cost', p.move_in_cost, p.move_in_cost == null ? '' : money(p.move_in_cost));
      once += stated('Agency fee', p.agency_fee, p.agency_fee == null ? '' : fee(p.agency_fee));
      once += stated('Legal fee', p.legal_fee, p.legal_fee == null ? '' : fee(p.legal_fee));
      var totalRow = null;
      rows.forEach(function (r) { if (r[2]) totalRow = r; });
      var bottomLabel = hasTotal ? 'First year, all in' : priceLabel;
      var bottomVal = hasTotal ? totalRow[1] : (p.price != null ? money(p.price) + per : '');
      var paper = '<div class="cr-paper" role="group" aria-label="What this home costs">'
        + '<div class="cr-head"><span class="cr-brand">SYNAPSE</span><span>COST SLIP</span></div>'
        + '<div class="cr-rule"></div>'
        + (every ? '<div class="cr-sec">' + (isRent ? 'EVERY YEAR' : 'RECURRING') + '</div>' + every : '')
        + '<div class="cr-sec">ONCE</div>' + once
        + '<div class="cr-rule dash"></div>'
        + (bottomVal ? '<div class="cr-total"><span>' + esc(bottomLabel.toUpperCase()) + '</span><b>' + esc(bottomVal) + '</b></div>' : '')
        + '<div class="cr-fine">FIGURES AS STATED BY THE AGENCY</div>'
        + '<div class="cr-bar" aria-hidden="true"></div>'
        + '</div>';
      rowsEl.innerHTML = paper;
      /* It prints when you reach it. A card two swipes away would otherwise
         finish its animation before anyone saw it. If the page cannot say when
         it is on screen, it just shows. */
      var sheet = rowsEl.querySelector('.cr-paper');
      if (sheet && 'IntersectionObserver' in window && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        sheet.classList.add('wait');
        var io = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { sheet.classList.add('in'); io.disconnect(); if (window.Scramble) Scramble.numbers(sheet, '.cr-row b, .cr-total b'); }
        }, { threshold: 0.35 });
        io.observe(sheet);
        setTimeout(function () { if (!sheet.classList.contains('in')) { sheet.classList.add('in'); io.disconnect(); if (window.Scramble) Scramble.numbers(sheet, '.cr-row b, .cr-total b'); } }, 4000);
      }

      if (noteEl) {
        /* Names precisely what is missing. The old note ended "any agency
           fee are separate and not shown here" -- true at the time, because
           there was no column for one, but it amounted to telling the buyer to
           go and ask. There is a column now, so the card either shows the fee
           or says plainly that this agency has not stated it. */
        /* What was not stated is printed on the slip itself now, so the note
           only carries what no slip line can: what is outside these figures. */
        noteEl.textContent = 'Utilities and power are separate and not shown here.';
      }
    }

    function paintNeighbourhood(p) {
      var nb = p && p.neighbourhoods;
      if (Array.isArray(nb)) nb = nb[0];

      var title = document.getElementById('nbTitle');
      var addrEl = document.getElementById('nbAddr');
      var scoresEl = document.getElementById('nbScores');
      var noteEl = document.getElementById('nbNote');
      if (!title || !scoresEl) return;

      var area = p.neighbourhood || (nb && nb.name) || p.city || '';
      title.textContent = area ? ('Around ' + area) : 'Around this property';

      /* The address, because "which property is this actually about?" was
         exactly the question the hardcoded heading got wrong. */
      var addr = [p.address, p.neighbourhood, p.city, p.state].filter(function (x) {
        return x && String(x).trim();
      });
      // De-duplicate: "Bodija, Bodija, Ibadan" reads as a bug.
      var seenA = {}, addrParts = [];
      addr.forEach(function (x) {
        var k = String(x).trim().toLowerCase();
        if (seenA[k]) return; seenA[k] = 1; addrParts.push(String(x).trim());
      });
      if (addrEl) addrEl.textContent = addrParts.join(' · ');

      {
        scoresEl.innerHTML = '';
        if (noteEl) {
          /* "Not linked to a surveyed neighbourhood" was an apology for a gap
             that no longer exists. Nobody has to survey anything: what is
             around this address is measured from the map, and the card below
             lists it by category with distances. Saying we lack area scores,
             directly above fourteen real places, told the reader we knew less
             than we do.

             So: nothing at all when we have places -- they answer the
             question. A short line only when we genuinely have neither. */
          var haveplaces = (placesState === 'ready' && PLACES && PLACES.length)
            || placesState === 'loading';
          noteEl.className = 'nb-empty';
          noteEl.textContent = haveplaces_text(haveplaces, nb);
        }
      }
      /* The note used to carry price_trend, avg_rent_3bed and rental_demand
         underneath the bars. Same table, same seed_rand, same problem -- a
         "typical 3-bed rent" nobody surveyed is worse than no figure at all,
         because a buyer will price a negotiation against it. Gone with the
         bars. */
    }

    /* ── what is nearby, from the database ──────────────────────────────────
       The surroundings are computed server-side by the property-intelligence
       function (Google Places + Distance Matrix) and stored in property_places,
       one row per real place near this specific listing. The page only reads
       them. That is the difference between intelligence and page text: the
       answer exists whether or not anyone is looking at it, it is the same for
       every visitor, it survives the provider being down, and it can be counted
       over instead of asserted.

       A house in Benin City gets Benin City's places because the fetch is
       driven by that property's own coordinates.

       Until GOOGLE_MAPS_API_KEY is set there will be no stored rows, so this
       falls back to a live OpenStreetMap lookup rather than showing an empty
       section -- and says which source it used, because silently mixing two
       providers under one heading is its own small dishonesty. */
    var PLACES = null;          // rows from property_places
    var placesState = 'idle';   // idle | loading | ready | empty

    var PLACE_LABEL = {
      school: 'School', hospital: 'Hospital', pharmacy: 'Pharmacy',
      supermarket: 'Supermarket', market: 'Shopping', bank: 'Bank',
      university: 'University', transit: 'Transport', park: 'Park',
    };

    /* One request per property per page, at most. A second call would be
       refused by the function anyway, but there is no reason to make it. */
    var surveyAsked = {};
    function requestSurvey(propId) {
      if (!propId || surveyAsked[propId]) return;
      surveyAsked[propId] = true;
      fetch(SUPABASE_URL + '/rest/v1/rpc/request_enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
        body: JSON.stringify({ p_property_id: propId }),
      }).catch(function () { /* the page is already correct without it */ });
    }

    function fetchStoredPlaces(propId) {
      if (!propId) { placesState = 'empty'; paintAround(); return; }
      placesState = 'loading';
      paintAround();
      fetch(SUPABASE_URL + '/rest/v1/rpc/property_surroundings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
        /* This number has been wrong three times, always in the same
           direction. 12 cut the university and a mall off the end. 60 was
           comfortable only while a survey WAS 14 places. A survey is now the
           whole neighbourhood -- 508 around the Agbowo flat -- so ask for all
           of it and let the tabs decide what is drawn. The function caps at
           1500 (migration 0080), which is the real ceiling. */
        body: JSON.stringify({ p_property_id: propId, p_limit: 1000 }),
      })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          if (Array.isArray(rows) && rows.length) {
            PLACES = rows;
            placesState = 'ready';
            /* The map uses the same rows. Marked 'loaded' so fetchAmenities()
               does not then overwrite a Google survey with a thinner Overpass
               one. */
            // The neighbourhood note asks whether we have places; now we do.
            if (window.__pvListing) paintNeighbourhood(window.__pvListing);
            POI = poiFromStored(rows);
            if (POI.length) {
              poiState = 'loaded';
              poiSource = 'stored';
              poiFetchedFor = propId;
              if (typeof setView === 'function') setView(state.view || 'poi');
            }
            paintAround();
          } else {
            placesState = 'empty';   // nothing surveyed yet; POI fallback fills in
            paintAround();
            /* ASK FOR THE SURVEY, DO NOT WAIT FOR IT.
               Nothing is stored for this home, so Overpass is about to answer
               and the reader gets their list either way. This queues the
               proper survey for the NEXT visitor.

               Deliberately fire-and-forget, and deliberately not awaited: the
               Google pass takes tens of seconds and costs money, and making
               the person who happened to arrive first pay for it in waiting
               would be the wrong half of the trade. They get the fast answer;
               the next person gets the good one.

               The server decides whether anything actually happens --
               request_enrichment refuses a home that is already surveyed,
               already queued, or deliberately held. This is a request, not a
               command, which is why its answer is ignored. */
            requestSurvey(propId);
          }
        })
        .catch(function () { placesState = 'empty'; paintAround(); });
    }

    function fmtDrive(sec) {
      if (sec == null) return null;
      var m = Math.round(sec / 60);
      return m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + ' min';
    }

    /* ── AREA RELEVANCE: a structured object, then prose from it ────────────
       The page used to carry a hardcoded paragraph -- "4 schools, 2 hospitals
       and 3 supermarkets within 10 minutes" -- printed identically under every
       listing in the database. This replaces it with something that cannot say
       anything it has not measured.

       Two deliberate choices:

       1. A CONTEXT OBJECT FIRST, prose second. Everything below reads from one
          object built per (property, source) pair, so what is rendered and what
          was measured cannot drift apart. It is logged in full for the first
          few loads so the two can be compared by eye.

       2. NO LLM. A template that interpolates measured numbers is incapable of
          inventing a hospital; a model asked to describe the same numbers is
          merely unlikely to. Given this page previously asserted a six-minute
          drive to a gate 130km away, "incapable" is worth more than "unlikely".
          The context object is already the right shape to hand to a model later
          if a richer narrative is wanted -- that is a prompt away, and the
          honesty constraint would then have to be stated in a system prompt
          rather than guaranteed by construction. */

    var AREA_WALK_M = 1200;          // a walk, not a drive
    var areaLogged = 0;

    /* ── the viewer's own anchors ───────────────────────────────────────────
       Their workplace, school, gym -- geocoded once at save time by the
       save-place function and read here. Empty for a signed-out visitor, and
       empty for a signed-in one who has not told Tayo anything yet, which is
       the common case and is treated as ordinary rather than as an error.

       A place whose geocode failed is never returned by my_places(), so
       nothing below can measure a distance to a coordinate we do not believe. */
    var MY_PLACES = null;
    var myPlacesState = 'idle';        // idle | loading | ready | none

    var KIND_LABEL = {
      workplace: 'work', school: 'school', gym: 'gym',
      worship: 'church or mosque', family: 'family', other: 'there',
    };

    function fetchMyPlaces() {
      if (!window.SynAuth || !SynAuth.client) { myPlacesState = 'none'; return Promise.resolve(); }
      /* my_places() is behind RLS, so a signed-out visitor gets a 401. That was
         always caught and treated as "no places", which is right -- but the
         browser still logged a failed request on every load, and a console with
         a routine 401 in it is a console people stop reading. Wait for auth to
         settle and only ask when there is somebody to ask about. */
      myPlacesState = 'loading';
      return SynAuth.ready()
        .then(function () {
          if (!SynAuth.user()) { myPlacesState = 'none'; return null; }
          return SynAuth.client();
        })
        .then(function (c) {
          if (!c) return { data: [] };
          return c.rpc('my_places');
        })
        .then(function (r) {
          var rows = (r && r.data) || [];
          MY_PLACES = rows.filter(function (x) { return x.lat != null && x.lon != null; });
          myPlacesState = MY_PLACES.length ? 'ready' : 'none';
        })
        .catch(function () { myPlacesState = 'none'; });   // signed out, or RPC unavailable
    }

    function buildAreaContext(listing, places, source) {
      var lat = listing && listing.latitude, lon = listing && listing.longitude;
      var ctx = {
        propertyId: listing && listing.id,
        title: (listing && listing.title) || '',
        address: [listing && listing.address, listing && listing.city].filter(Boolean).join(', '),
        hasCoords: lat != null && lon != null,
        coords: (lat != null && lon != null) ? [Number(lat), Number(lon)] : null,
        source: source || null,
        byCategory: {},
        counts: {},
        nearest: null,
        walkable: [],
        total: 0,
      };
      (places || []).forEach(function (x) {
        var cat = x.category || x.t;
        if (!cat) return;
        var row = {
          name: x.name || x.n,
          category: cat,
          distance_m: (x.distance_m != null ? x.distance_m : x.dm),
          drive_seconds: (x.drive_seconds != null ? x.drive_seconds : null),
        };
        if (!row.name || row.distance_m == null) return;
        (ctx.byCategory[cat] = ctx.byCategory[cat] || []).push(row);
        ctx.total++;
        if (row.distance_m <= AREA_WALK_M) ctx.walkable.push(row);
        if (!ctx.nearest || row.distance_m < ctx.nearest.distance_m) ctx.nearest = row;
      });
      Object.keys(ctx.byCategory).forEach(function (c) {
        ctx.byCategory[c].sort(function (a, b) { return a.distance_m - b.distance_m; });
        ctx.counts[c] = ctx.byCategory[c].length;
      });

      /* The viewer's own anchors, measured from THIS property. Straight-line
         only: we hold coordinates for their places but no routing budget per
         viewer, so the narrative says "away" and never "drive", which would be
         a claim we have not measured. */
      ctx.mine = [];
      if (ctx.hasCoords && MY_PLACES && MY_PLACES.length) {
        MY_PLACES.forEach(function (m) {
          ctx.mine.push({
            kind: m.kind,
            label: m.label,
            distance_m: haversineM(ctx.coords, [Number(m.lat), Number(m.lon)]),
            confidence: m.geocode_confidence || 'approximate',
          });
        });
        ctx.mine.sort(function (a, b) { return a.distance_m - b.distance_m; });
      }
      return ctx;
    }

    /* Prose assembled only from fields present on the context object. Every
       branch is guarded: a category with nothing found produces no clause, not
       an empty one, and nothing here can name a place that is not in `places`. */
    function areaNarrative(ctx) {
      if (!ctx.hasCoords) {
        return 'This listing has no map coordinates on file, so we cannot measure '
             + 'what is around it. We would rather say that than describe somewhere else.';
      }
      if (!ctx.total) return '';

      var bits = [];
      var named = {};                  // a place is worth naming once
      var label = function (c) { return (PLACE_LABEL[c] || c).toLowerCase(); };
      var dist = function (r) {
        if (r.drive_seconds != null) return fmtDrive(r.drive_seconds) + ' drive';
        return formatDist(r.distance_m) + ' away';
      };

      if (ctx.nearest) {
        named[ctx.nearest.name] = 1;
        bits.push('The closest thing to this address is ' + esc(ctx.nearest.name)
          + ' (' + label(ctx.nearest.category) + '), ' + dist(ctx.nearest) + '.');
      }

      /* Health and schooling are the two people ask about first. A single
         entry already named as the nearest overall is skipped -- saying
         "the closest thing is X… the nearest school is X… one of them, X"
         reads as a stutter, which is what the first draft of this did. */
      ['hospital', 'school'].forEach(function (c) {
        var list = ctx.byCategory[c];
        if (!list || !list.length) return;
        var n = list.length;
        if (n === 1) {
          if (named[list[0].name]) return;
          named[list[0].name] = 1;
          bits.push('The nearest ' + label(c) + ' is ' + esc(list[0].name) + ', ' + dist(list[0]) + '.');
          return;
        }
        // More than one: the count is news even if the closest was already named.
        if (named[list[0].name]) {
          bits.push(n + ' ' + label(c) + 's are mapped nearby.');
        } else {
          named[list[0].name] = 1;
          bits.push(n + ' ' + label(c) + 's are mapped nearby, the closest being '
            + esc(list[0].name) + ' at ' + dist(list[0]) + '.');
        }
      });

      /* Always name the walkable place, even at the cost of repeating it.
         The first attempt said "That one is close enough to walk to", which
         pointed at whatever the previous sentence happened to mention -- for
         one listing that was a hospital 5.8km away, so a pronoun turned a
         drive into a walk. A repeated name is untidy; an ambiguous one is
         wrong, and this panel exists because wrong was the old default. */
      if (ctx.walkable.length) {
        var w = ctx.walkable[0];
        bits.push(ctx.walkable.length === 1
          ? esc(w.name) + ' is close enough to walk to.'
          : (ctx.walkable.length + ' of them are within a walk, the nearest being '
             + esc(w.name) + '.'));
      }

      /* What it means for THIS viewer. Placed after the area facts because a
         person reads "what is here" before "what is it to me". An approximate
         geocode is hedged in words rather than quietly rounded, because the
         difference between a pinned office and a guessed one is exactly the
         difference the number depends on. */
      if (ctx.mine && ctx.mine.length) {
        ctx.mine.slice(0, 3).forEach(function (m) {
          var where = KIND_LABEL[m.kind] || m.kind;
          var d = formatDist(m.distance_m);
          bits.push(m.confidence === 'exact'
            ? ('Your ' + where + ' (' + esc(m.label) + ') is about ' + d + ' from here, in a straight line.')
            : ('Your ' + where + ' (' + esc(m.label) + ') looks to be roughly ' + d
               + ' away, we could not pin that address exactly, so treat it as a rough guide.'));
        });
      }

      var missing = ['hospital', 'school', 'market', 'supermarket', 'pharmacy']
        .filter(function (c) { return !ctx.byCategory[c]; });
      if (missing.length >= 3) {
        bits.push('Little else is mapped around here yet, which usually means the '
          + 'area is under-recorded rather than empty.');
      }
      /* Nothing of theirs to measure against. Ask once, plainly, rather than
         inventing a "perfect for families" line -- and only when there is
         already something real on screen to attach the invitation to. */
      if ((!ctx.mine || !ctx.mine.length) && ctx.total && myPlacesState === 'none') {
        bits.push('Tell Tayo where you work or train and this will say how far each of those is from here.');
      }
      return bits.join(' ');
    }
    /* Builds the context, logs it while we are still checking this works, and
       returns the paragraph. Returns '' when there is nothing true to say, so
       the caller renders the list alone rather than an empty flourish. */
    function areaBlock(listing, places, source) {
      var ctx = buildAreaContext(listing || {}, places, source);
      if (areaLogged < 3) {
        areaLogged++;
        try {
          console.log('[area context] ' + (ctx.title || ctx.propertyId), JSON.parse(JSON.stringify(ctx)));
        } catch (e) { /* logging must never break a page */ }
      }
      var text = areaNarrative(ctx);
      return text ? '<p class="nb-note area-note">' + text + '</p>' : '';
    }

    function paintAround() {
      if (window.paintIntel) paintIntel();
      var host = document.getElementById('nbAround');
      if (!host) return;
      var K = '<div class="nba-k">What is nearby</div>';

      // 1. the stored survey, which is the real answer
      if (placesState === 'ready' && PLACES && PLACES.length) {
        /* Grouped tiles rather than a flat list under a paragraph. Fourteen
           rows of name/type/distance is a table pretending to be prose: it
           reads as homework. What someone actually wants is "is there a school
           near, and how near" -- so each category answers that in one glance,
           with the count and the nearest, and the rest behind it. */
        var groups = {};
        PLACES.forEach(function (x) {
          var c = x.category || 'other';
          (groups[c] = groups[c] || []).push(x);
        });
        var order = ['school', 'hospital', 'pharmacy', 'supermarket', 'market',
                     'transit', 'university', 'bank', 'park'];
        var keys = Object.keys(groups).sort(function (a, b) {
          var ia = order.indexOf(a), ib = order.indexOf(b);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        });

        host.innerHTML = K + '<div class="nba-rows">'
          + keys.map(function (c) {
              var list = groups[c].slice().sort(function (a, b) {
                return (a.distance_m || 0) - (b.distance_m || 0);
              });
              var m = metaFor(c);
              var rows = list.map(function (x) {
                var drive = fmtDrive(x.drive_seconds);
                return '<div class="pl"><span class="nm">' + esc(x.name) + '</span>'
                  + '<span class="ds">'
                  + (drive ? drive : (x.distance_m != null ? formatDist(x.distance_m) : ''))
                  + '</span></div>';
              }).join('');
              return '<div class="nba-cr" data-cat="' + esc(c) + '">'
                + '<button class="nba-crh" type="button" aria-expanded="false">'
                + '<span class="dot" style="background:' + m.col + '">' + poiSvg(m.i, 13) + '</span>'
                + '<span class="lb">' + esc(m.lbl) + '</span>'
                + '<span class="n">' + list.length + '</span>'
                + '<span class="chv" aria-hidden="true">›</span>'
                + '</button>'
                + '<div class="nba-crb">' + rows + '</div>'
                + '</div>';
            }).join('')
          + '</div><p class="cmt-src">From Google Maps, measured from this address.</p>';

        /* Open one, and only one: eight open at once is the flat list this was
           meant to replace. */
        host.querySelectorAll('.nba-crh').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var row = btn.parentElement;
            var wasOpen = row.classList.contains('open');
            host.querySelectorAll('.nba-cr.open').forEach(function (r) {
              r.classList.remove('open');
              r.querySelector('.nba-crh').setAttribute('aria-expanded', 'false');
            });
            if (!wasOpen) {
              row.classList.add('open');
              btn.setAttribute('aria-expanded', 'true');
            }
          });
        });
        return;
      }

      if (placesState === 'loading') {
        host.innerHTML = K + '<p class="nb-empty">Looking up what is around this address…</p>';
        return;
      }

      // 2. nothing stored yet: live OpenStreetMap, clearly labelled as such
      if (poiState === 'loading') {
        host.innerHTML = K + '<p class="nb-empty">Looking up what is around this address…</p>';
        return;
      }
      /* Nothing within walking distance is common outside a city centre, and it
         is not the same as nothing nearby. The amenity lookup searches 600m to
         2km; around 13 Aafin Iyanu, Ologuneru that returns exactly zero
         elements -- verified directly against Overpass -- while the commute
         lookup at 12-14km returns a hospital, two markets and a mall.

         So when the close-in search is empty we fall back to the destinations
         the commute panel already fetched, rather than reporting nothing while
         holding real data. No extra request; the distances shown are the true
         ones, so a 6km market reads as 6km. */
      if ((!POI || !POI.length) && cmtState === 'ready' && CMT_DESTS && CMT_DESTS.length) {
        var wide = CMT_DESTS.map(function (d) {
          return { name: d.name, category: d.type, distance_m: d.dm, drive_seconds: d.sec };
        });
        host.innerHTML = K + areaBlock(window.__pvListing, wide, 'openstreetmap')
          + '<div class="nba-list">'
          + wide.map(function (x) {
              var t = x.drive_seconds != null ? fmtDrive(x.drive_seconds) : formatDist(x.distance_m);
              return '<div class="nba-row"><span class="nba-n">' + esc(x.name) + '</span>'
                + '<span class="nba-t">' + esc(x.category) + '</span>'
                + '<span class="nba-d">' + t + '</span></div>';
            }).join('')
          + '</div><p class="cmt-src">Nothing is mapped within walking distance of this address, '
          + 'so these are the nearest places further out. From OpenStreetMap.</p>';
        return;
      }

      if (!POI || !POI.length) {
        /* 'error' is the value fetchAmenities actually sets; this read 'failed',
           which is never assigned, so an outage fell through to the "nothing
           here" wording. And "we have not surveyed this address" was wrong in
           the other direction -- we did look, the map simply has nothing there. */
        host.innerHTML = K + '<p class="nb-empty">' + (poiState === 'error'
            ? 'We could not reach the map service just now, so we cannot show what is nearby.'
            : 'OpenStreetMap has nothing mapped around this address yet. That usually means the area is under-recorded rather than empty.') + '</p>';
        return;
      }
      var seen = {}, rows = [];
      POI.forEach(function (x) {
        if (seen[x.t] || rows.length >= 8) return;
        seen[x.t] = 1;
        rows.push(x);
      });
      host.innerHTML = K + areaBlock(window.__pvListing, rows, 'openstreetmap')
        + '<div class="nba-list">'
        + rows.map(function (x) {
            return '<div class="nba-row"><span class="nba-n">' + esc(x.n) + '</span>'
              + '<span class="nba-t">' + esc(AMENITY_LABEL[x.t] || x.t) + '</span>'
              + '<span class="nba-d">' + formatDist(x.dm) + '</span></div>';
          }).join('')
        + '</div><p class="cmt-src">Places from OpenStreetMap, straight-line distance from this address. '
        + 'This listing has not been surveyed with Google yet.</p>';
    }

    /* ── the map's pins come from the stored survey first ───────────────────
       The map fetched its own pins from Overpass while the card beneath it read
       the stored Google places. On an address OpenStreetMap has not mapped --
       Ologuneru, for one -- that meant the map showed nothing at all while the
       card listed fourteen places, from the same page, about the same house.

       One source, preferred in the order we trust it: the stored survey if the
       property has one, Overpass only as a fallback for listings not yet
       enriched. POI keeps its existing shape ({c, t, n, d, dm}) so every
       renderer downstream is untouched. */
    function poiFromStored(rows) {
      return (rows || [])
        .filter(function (r) { return r.lat != null && r.lon != null; })
        .map(function (r) {
          return {
            c: [Number(r.lat), Number(r.lon)],
            t: String(r.category || 'other'),
            n: r.name,
            dm: r.distance_m,
            // Prefer a measured drive time; fall back to the distance we know.
            d: r.drive_text || (r.drive_seconds != null
                 ? Math.round(r.drive_seconds / 60) + ' min'
                 : formatDist(r.distance_m)),
          };
        });
    }

    function fetchAmenities(propId, lat, lng) {
      if (poiFetchedFor === propId) return; // already have it (or are getting it)
      poiFetchedFor = propId;
      poiState = 'loading';
      if (state.view === 'poi') renderPOI();
      var q = OVERPASS_QUERY_TPL.split('{lat}').join(lat).split('{lng}').join(lng);
      overpassFetch(q, 15000)
        .then(function (data) {
          // The stored survey got here first, and is the better answer.
          if (poiSource === 'stored') return;
          var seen = {};
          POI = (data.elements || []).reduce(function (out, el) {
            var t = elementToType(el.tags || {});
            if (!t) return out;
            /* A node has lat/lon; a way or relation has `center` instead,
               which is what `out center` is for. Reading only lat/lon is what
               discarded every building-shaped school and hospital. */
            var la = el.lat != null ? el.lat : (el.center && el.center.lat);
            var lo = el.lon != null ? el.lon : (el.center && el.center.lon);
            if (la == null || lo == null) return out;
            var key = t + ':' + la.toFixed(5) + ':' + lo.toFixed(5);
            if (seen[key]) return out; seen[key] = true;
            var c = [la, lo];
            out.push({ c: c, t: t, n: (el.tags && el.tags.name) || AMENITY_LABEL[t] || 'Place', dm: haversineM(PROP, c) });
            return out;
          }, []);
          POI.sort(function (a, b) { return a.dm - b.dm; });
          /* 60 was set when the query returned a handful. Now that every
             advertised category is actually asked for, the nearest 60 could
             be all restaurants and leave Health and Transport empty while
             real hospitals sat just outside the cut. */
          POI = POI.slice(0, 120);
          POI.forEach(function (p) { p.d = formatDist(p.dm); });
          poiState = 'loaded';
          /* AFTER the state flips, not before. Painting first meant
             paintAround() read poiState as 'loading' and rendered "Looking up
             what is around this address…", then was never called again -- so
             the list was fetched, parsed, sorted, and never shown. */
          paintAround();
          if (state.view === 'poi') renderPOI();
        })
        .catch(function () {
          if (poiSource === 'stored') return;   // nothing to fall back to; we already have better
          poiState = 'error';
          paintAround();     // the card must say it failed, not sit on "looking up"
          if (state.view === 'poi') renderPOI();
        });
    }

    /* ── "connect to this amenity": a real walking route via OSRM ────────── */
    /* driving, not foot. The demo server has only the car profile and
       silently answers /foot/ with car routing, so asking for foot bought a
       misleading label and nothing else. We now ask for what it has, use the
       road distance it returns, and work the times out ourselves. */
    var OSRM_URL = 'https://router.project-osrm.org/route/v1/driving/';
    /* One button, written by both the routed and the failed-routing branch.
       It used to carry id="pvPoiBack" in each, which read as a duplicate id
       even though only ever one is in the document. Scoped to the overlay by
       class instead, so there is one definition and no id to collide. */
    function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

    var DEST = [];                   // no invented commutes
    var CONGEST = { morning: { lbl: 'Morning', color: '#d9534f', etas: [] }, midday: { lbl: 'Midday', color: '#e0a83b', etas: [] }, evening: { lbl: 'Evening', color: '#d9534f', etas: [] } };
    var AGENCY = null;               // filled from the listing's agency
    /* CARD_VIEWS moved next to the deck as CARD_VIEW_ORDER and is stamped
       onto each card as data-view, see the deck setup. */

    var NO_DATA = '<div class="pvo-k">Neighbourhood detail</div>'
      + '<p style="font-size:12.5px;line-height:1.55;color:var(--ink-muted);margin:6px 0 0">'
      + 'We don’t have verified amenity or commute data for this listing yet, so there is nothing to show here. '
      + 'We would rather show you nothing than another property’s neighbourhood.</p>';

    /* Pinch and double-tap zoom are Leaflet defaults and were already on --
       the container carries leaflet-touch-zoom -- but with only
       scrollWheelZoom named, the options read as if zooming were switched off.
       Named explicitly so nobody turns them off by accident. The wheel stays
       off deliberately: a map that eats the page scroll is worse than one you
       press + on. */
    /* THE LAST LEAFLET MAP IN THE APP, NOW ON THE SHARED RENDERER.
       browse, Tayo and the portal moved to SynMapRender; this one stayed on
       Leaflet and raster tiles, so the page a buyer looks at longest was the
       one map still rendered in somebody else's colours. It also drew its
       nearby pins in a different colour per category, which is the one thing
       the monochrome direction rules out.

       Everything below talks to the facade. MapLibre is not referenced on
       this page at all -- markers, lines and fitting are verbs on the
       renderer, added for exactly this port.

       ASYNC, WHERE LEAFLET WAS NOT. The style and the library are fetched, so
       nothing can be drawn in the same tick the page runs. whenMap() queues
       the drawing until the map exists and then replays it in order, which
       matters because setView() clears the overlay before repopulating it. */
    var MAPR = SynMapRender.create('pvMap', { center: [8.6753, 9.0820], zoom: 6 });
    var MAP_READY = false, mapQueue = [];
    function whenMap(fn) { if (MAP_READY) fn(); else mapQueue.push(fn); }
    MAPR.ready().then(function () {
      MAP_READY = true;
      var q = mapQueue.splice(0);
      q.forEach(function (f) { try { f(); } catch (e) { /* one bad draw must not stop the rest */ } });
    }).catch(function (e) {
      if (window.console) console.warn('property map failed to start:', e && e.message);
    });

    /* Leaflet is lat,lng. MapLibre is lng,lat. Every coordinate on this page
       was written for Leaflet, so it flips here and nowhere else -- a swapped
       pair does not throw, it silently puts Ibadan in the Atlantic. */
    function xy(c) { return [Number(c[1]), Number(c[0])]; }
    /* Voyager, not Positron ('light_all'). Positron is a deliberately blank
       canvas -- almost no POI labels, no business names, roads barely
       distinguished -- which is right for a heatmap and wrong for a buyer
       asking "what is around this house?". The pin was in the correct place
       on a map that showed nothing near it. Voyager keeps the light styling
       but carries the labels.

       That was CARTO's Voyager, and it is gone -- see below. OSM's standard
       tiles carry the same labelled detail this needs, which is the property
       that mattered in the choice above. */
    /* CARTO NOW WATERMARKS ITS KEYLESS TILES.
       Nothing here broke -- the provider changed terms. basemaps.cartocdn.com
       still answers 200 with a real PNG, and that PNG has "API KEY REQUIRED /
       carto.com/basemaps/apikey" printed diagonally across it. Every map in
       the product was serving that to buyers and agencies alike.

       OSM's standard tiles are the keyless replacement that works today, and
       they carry the labels this map needs. Attribution is not decoration
       here: ODbL requires it and the tile policy requires it.

       READ THIS BEFORE REAL TRAFFIC. The OSMF tile policy covers modest use
       and explicitly does not cover heavy or commercial consumption. This is
       the right fix for a product that is not live yet; it is not the right
       fix for one that is. That account is MapTiler now, and the URL and the
       attribution both live in app/map-tiles.js -- one place for both maps,
       with OSM still there as the fallback if the key is missing or the
       tiles stop answering. */
    /* One tile source for the whole app -- see app/map-tiles.js. This page
       has its own map rather than the shared one, so it was a second place
       the URL and the attribution had to be kept in step, and they were only
       in step by luck. */
    /* detail: this map's whole job is what surrounds one house. */
    function homeHtml() { return '<div class="pv-home-pin">' + poiSvg('home', 16) + '</div>'; }
    /* MONOCHROME, like the rest of the map. These pins used to carry a
       different background colour per category, which read as a legend on a
       map that has no other colour in it. The glyph already says which kind
       of place it is -- that is what poiSvg draws -- so the colour was doing
       no work the shape was not already doing, and it was the last thing on
       this page arguing with the design. */
    function poiHtml(t) {
      var m = metaFor(t);
      return '<div class="pv-poi-pin pv-poi-mono">' + poiSvg(m.i, 13) + '</div>';
    }
    var overlay = document.getElementById('pvcOverlay');
    var state = { view: 'poi', time: 'midday' };
    var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* maxZoom is the whole point of the options object. A listing with no
       amenity data fits to a single point -- the home itself -- and a bounds
       of zero size sends fitBounds straight to the layer's maxZoom, which is
       20. That is close enough to read building outlines and nothing else:
       no street names, no context, no way to tell where you are. 16 is the
       tightest zoom that still shows the surrounding streets. It only ever
       bites on a degenerate or very small bounds; a spread of real POIs
       zooms out past it on its own. */
    function fit(pts) {
      whenMap(function () {
        setTimeout(function () {
          MAPR.resize();
          if (pts && pts.length) {
            MAPR.fitPoints(pts.map(xy),
              { maxZoom: 16, padding: fitPad(), duration: REDUCE ? 0 : 600 });
          }
        }, 60);
      });
    }

    /* FIT AROUND THE CARD, NOT UNDER IT.
       On a desktop the card floats over the bottom-left of the map, so fitting
       to the raw canvas puts the nearest results -- the very ones the list is
       sorted to put first -- behind the thing that listed them.

       Measured rather than assumed: the card is 300px at one breakpoint and a
       percentage at another, and on a phone it is not over the map at all.
       Reading its computed position is the only way to be right in all three,
       and it is also how this stays free on a phone -- position:static means
       the card is below the map and no padding is owed. */
    function fitPad() {
      var pad = { top: 56, bottom: 56, left: 56, right: 56 };
      var wrap = document.querySelector('.pvc-map-wrap');
      if (!overlay || !wrap) return pad;
      /* NOT offsetParent. A position:fixed element always reports null there,
         so the phone's popup -- the one card that most needs compensating for,
         because it covers the bottom half of a full-screen map -- was the one
         case this silently skipped. Ask whether it is displayed instead. */
      var cs = getComputedStyle(overlay);
      if (cs.display === 'none' || cs.position === 'static') return pad;
      var o = overlay.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      if (!o.width || !w.width || !o.height) return pad;

      /* Which edge it hugs decides which padding it earns, and it can only
         earn one: taking its width off the left AND its height off the bottom
         leaves a sliver to fit into, and fitBounds given no room returns
         something useless. A card spanning most of the width is a bottom
         sheet; anything narrower is a side card. */
      if (o.width > w.width * 0.7) {
        pad.bottom = Math.max(56, Math.min(w.height * 0.55, (w.bottom - o.top) + 14));
      } else {
        pad.left = Math.max(56, Math.min(w.width * 0.55, (o.right - w.left) + 14));
      }
      return pad;
    }

    /* BRING THE MAP TO THE PRESS.
       On a phone the card is under the map rather than on it, so pressing
       'School' reveals fifty-five pins on something that may be entirely off
       screen. The map comes up to meet the answer.

       Only when it needs to. If two thirds of the map is already visible the
       page stays exactly where the reader put it -- which means tapping a pin
       ON the map never scrolls anything, because the map is plainly in view
       already, and only a press in the list below moves the page. */
    function revealMap() {
      if (!window.matchMedia('(max-width: 1024px)').matches) return;
      /* The phone map is a fixed, full-screen sheet now: it is either the
         whole screen or not shown, so there is never a part of it to scroll
         into view. This only still means something on a tablet width where
         the map is in the flow. */
      if (document.body.classList.contains('pv-map-open')) return;
      var wrap = document.querySelector('.pvc-map-wrap');
      if (!wrap) return;
      var r = wrap.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var seen = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (!r.height || seen >= r.height * 0.66) return;
      wrap.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
    }

    /* POI_FILTERS lived here: which pin kinds each of the six tabs showed.
       The tabs are gone and the card lists the real categories directly, so a
       hand-maintained mapping from tab name to category names -- which had to
       cover both the Google words and the OpenStreetMap ones, and silently
       showed nothing when they disagreed -- is no longer a thing that can be
       wrong. */

    /* ── THE MAP PANEL: NOTHING UNTIL YOU ASK ──────────────────────────
       This used to open with every mapped place pinned at once -- schools,
       restaurants, banks, churches, hundreds of them -- and six tabs above it
       to filter them down. The map was at its most cluttered the moment you
       arrived, and the first thing you had to do was reduce it.

       So it starts with the house and nothing else. The card lists what is
       around, by kind and count, and each row is the button that reveals it.
       Ask for pharmacies and you get pharmacies. Ask for a particular
       pharmacy and you get the walk to it.

       Three states, one card:
         cats    the kinds of place nearby, with counts   (no pins)
         places  one kind, pinned, listed nearest first   (home turns orange)
         detail  one place: the route, the distance, the walking time
    */
    var PANEL = { mode: 'cats', cat: null, poi: null };
    var COMMUTE_KEY = '__commute';
    var PHONE_MQ = window.matchMedia('(max-width: 1024px)');

    /* ── A FOURTH STATE: NOT SHOWN AT ALL ───────────────────────────────
       On a phone the map is the whole screen, so a card sitting on 44% of it
       from the moment you arrive is the same mistake the old six-tab header
       made -- the map at its most covered before you have asked anything.

       So the phone map opens clean and tapping the map walks all the way
       back out: a place returns to its category, a category to the list, and
       the list to nothing. The gesture needs a floor, and 'nothing' is the
       honest one; the pill beside the taskbar brings it back.

       Desktop keeps the list as its floor. The card there is the map's only
       control and there is no pill to restore it, so hiding it would strand
       you on a map you cannot ask anything about. */
    function markCardOn(on) {
      document.body.classList.toggle('pv-card-on', !!on);
    }

    function hideCard() {
      PANEL = { mode: 'off', cat: null, poi: null };
      clearPois();
      drawHome(false);
      overlay.className = 'pvc-overlay idle';
      overlay.innerHTML = '';
      markCardOn(false);
      fit([PROP]);
    }

    function clearPois() {
      poiMarkers.forEach(function (m) { m.remove(); });
      poiMarkers = [];
      if (routeLine) { MAPR.removeLine(routeLine); routeLine = null; }
      if (MAPR.removeImageOverlay) MAPR.removeImageOverlay('pv-flood');
    }

    /* The home pin is redrawn rather than restyled because it is a DOM marker
       and the class lives on markup the renderer owns. Cheap: it is one node. */
    var homeMarker = null;
    function drawHome(active) {
      whenMap(function () {
        if (homeMarker) { homeMarker.remove(); homeMarker = null; }
        if (!PROP) return;
        var L2 = window.__pvListing || {};
        homeMarker = MAPR.marker(PROP[1], PROP[0],
          '<div class="pv-home-pin' + (active ? ' pv-home-on' : '') + '">' + poiSvg('home', 16) + '</div>',
          { popupHtml: '<b>This home</b>' + (L2.title ? '<br>' + escHtml(L2.title) : '') });
      });
    }

    function catCounts() {
      var counts = {};
      POI.forEach(function (p) { counts[p.t] = (counts[p.t] || 0) + 1; });
      return counts;
    }

    /* ── state 1: what kinds of place are around ─────────────────────── */
    function showCats() {
      PANEL = { mode: 'cats', cat: null, poi: null };
      clearPois();
      drawHome(false);
      overlay.className = 'pvc-overlay';
      markCardOn(true);

      if (!PROP) { overlay.innerHTML = NO_DATA; return; }
      if (poiState === 'loading') {
        overlay.innerHTML = '<div class="pvo-k">What\'s around this home</div>'
          + '<p style="font-size:12.5px;color:var(--ink-muted);margin:6px 0 0">' + (window.SynLoad ? SynLoad.line('signal', 'Looking up real nearby places') : 'Looking up real nearby places\u2026') + '</p>';
        fit([PROP]); return;
      }
      if (poiState === 'error') {
        overlay.innerHTML = '<div class="pvo-k">What\'s around this home</div>'
          + '<p style="font-size:12.5px;line-height:1.55;color:var(--ink-muted);margin:6px 0 0">Couldn\u2019t reach the map data provider just now. '
          + '<button id="pvPoiRetry" style="background:none;border:none;padding:0;color:var(--brand);text-decoration:underline;cursor:pointer;font:inherit">Try again</button></p>';
        fit([PROP]);
        var retry = document.getElementById('pvPoiRetry');
        if (retry) retry.addEventListener('click', function () { poiFetchedFor = null; fetchAmenities(propIdForFetch(), PROP[0], PROP[1]); });
        return;
      }

      /* The nearest one of each kind, not just how many: "58 markets" says nothing about a home,
         "nearest market 350 m" does. Closest kinds first; the catch-all 'other' is not a place
         anyone is asking about, so it is not offered. */
      var counts = catCounts();
      var nearest = {};
      POI.forEach(function (p) {
        var d = p.dm != null ? Number(p.dm) : haversineM(PROP, p.c);
        if (isFinite(d) && (nearest[p.t] == null || d < nearest[p.t])) nearest[p.t] = d;
      });
      var keys = Object.keys(counts).filter(function (t) { return t !== 'other'; })
        .sort(function (a, b) { return (nearest[a] == null ? 1e9 : nearest[a]) - (nearest[b] == null ? 1e9 : nearest[b]); });
      var rows = keys.map(function (t) {
        var m = metaFor(t);
        return '<button class="pvo-row" data-cat="' + escHtml(t) + '" type="button">'
          + '<span class="ic">' + poiSvg(m.i, '.8em') + '</span>'
          + '<span class="lb">' + escHtml(AMENITY_LABEL[t] || m.lbl) + '</span>'
          + '<span class="n">' + (nearest[t] != null ? formatDist(nearest[t]) + ' · ' : '') + counts[t] + '</span></button>';
      });
      /* Commute sits in the same list as everything else. It used to be a tab
         of its own, which made it feel like a different mode of the map when
         it is just another question about the same house. */
      if (DEST.length) {
        rows.unshift('<button class="pvo-row" data-cat="' + COMMUTE_KEY + '" type="button">'
          + '<span class="ic">' + poiSvg('commute', '.8em') + '</span>'
          + '<span class="lb">Commute</span>'
          + '<span class="n">' + DEST.length + '</span></button>');
      }
      rows.unshift('<button class="pvo-row" data-cat="__flood" type="button"><span class="ic">' + poiSvg('waves', '.8em') + '</span><span class="lb">Flood map</span><span class="n">View</span></button>');
      if (!rows.length) { overlay.innerHTML = NO_DATA; fit([PROP]); return; }

      overlay.innerHTML = '<div class="pvo-k">What\'s around this home</div>'
        + '<div class="pvo-rows">' + rows.join('') + '</div>';
      fit([PROP]);
      /* Flood exposure is stored per listing (property_flood) but not shown on this card: Eden, 2026-10-11.
         loadFlood() and floodHtml() are kept for when it has a place of its own. */
    }

    /* ── PROPERTY INTELLIGENCE + the flood map ─────────────────────────────────────────────
       Flood data: JRC / Copernicus GloFAS river flood model, read per listing by property-flood and
       stored in property_flood. A RIVER model (no drainage or coastal flooding), which the legend and
       tooltips say; the card shows a 1-10 score so a buyer can compare homes at a glance. */
    var FLOOD = { state: 'idle', row: null };
    var FN_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co', FN_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
    function fnHeaders() { return { apikey: FN_KEY, Authorization: 'Bearer ' + FN_KEY, 'Content-Type': 'application/json' }; }
    function loadFlood() {
      var id = propIdForFetch();
      if (FLOOD.state !== 'idle' || !id) return;
      FLOOD.state = 'loading';
      fetch(FN_URL + '/rest/v1/property_flood?property_id=eq.' + encodeURIComponent(id) + '&select=*', { headers: fnHeaders() })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          if (rows && rows[0] && (rows[0].measured || rows[0].covered === false)) return rows[0];
          return fetch(FN_URL + '/functions/v1/property-flood', { method: 'POST', headers: fnHeaders(), body: JSON.stringify({ property_id: id }) })
            .then(function (r) { return r.ok ? r.json() : null; });
        })
        .then(function (row) { FLOOD.row = row && row.property_id ? row : null; FLOOD.state = 'done'; })
        .catch(function () { FLOOD.state = 'done'; })
        .then(function () { paintIntel(); });
    }
    /* 1 (lowest) to 10. Inside the 10-year zone is the worst; inside the 100-year zone scales with depth;
       outside it, how close the nearest modelled flood water is. */
    function floodScore(r) {
      if (!r || r.covered === false) return null;
      if (r.in_zone_10) return 9;
      if (r.in_zone_100) { var d = Number(r.depth_100_m) || 0; return d >= 2 ? 8 : d >= 1 ? 7 : 6; }
      var n = r.nearest_flood_m;
      if (n == null) return 1;
      return n <= 300 ? 4 : n <= 1000 ? 3 : 2;
    }
    function paintIntel() {
      var host = document.getElementById('piRows'), p = window.__pvListing;
      if (!host || !p) return;
      loadFlood();
      var ic = function (n) { return poiSvg(n, '1.4em'); };
      var am = (Array.isArray(p.amenities) ? p.amenities : []).map(String);
      var has = function (re) { return am.filter(function (a) { return re.test(a); }); };
      var rows = [];
      var chip = function (t, tone) { return '<span class="pi-chip ' + tone + '">' + t + '</span>'; };
      var row = function (icon, k, v, sub, extra) {
        return '<div class="pi-row"><span class="pi-ic">' + ic(icon) + '</span><div class="pi-tx"><div class="pi-k">' + k + '</div><div class="pi-v">' + v + '</div>'
          + (sub ? '<div class="pi-s">' + sub + '</div>' : '') + (extra || '') + '</div></div>';
      };

      /* electricity */
      var BH = { A: '20+', B: '16+', C: '12+', D: '8+', E: '4+' };
      var bandTone = { A: 'ok', B: 'ok', C: 'mid', D: 'bad', E: 'bad' };
      var power = has(/generator|inverter|solar|24\s*\/?\s*7\s*power/i), meter = has(/prepaid|meter/i);
      var backup = power.length ? power.map(escHtml).join(', ') : '';
      rows.push(row('bolt', 'Electricity',
        p.electricity_band && BH[p.electricity_band]
          ? 'Band ' + escHtml(p.electricity_band) + ' \u00b7 ' + BH[p.electricity_band] + ' hours a day' + chip(bandTone[p.electricity_band] === 'ok' ? 'Reliable' : bandTone[p.electricity_band] === 'mid' ? 'Fair' : 'Limited', bandTone[p.electricity_band])
          : 'Band not stated' + chip('Ask the agency', 'na'),
        [backup, meter.length ? 'Prepaid meter' : ''].filter(Boolean).join(' \u00b7 ')));

      /* flood */
      var sc = floodScore(FLOOD.row), fr = FLOOD.row, tone = sc == null ? 'na' : sc <= 3 ? 'ok' : sc <= 6 ? 'mid' : 'bad';
      var word = sc == null ? '' : sc <= 3 ? 'Low' : sc <= 6 ? 'Moderate' : 'High';
      var fsub = FLOOD.state !== 'done' ? ''
        : sc == null ? 'Not assessed for this location.'
        : fr.in_zone_100 ? 'Inside the modelled 100-year river flood zone, up to ' + Number(fr.depth_100_m).toFixed(1) + ' m deep' + (fr.in_zone_10 ? ', and flooded in a 10-year event too' : '') + '.'
        : fr.nearest_flood_m != null && fr.nearest_flood_m > 0 ? 'Modelled river flood water about ' + (fr.nearest_flood_m >= 1000 ? (fr.nearest_flood_m / 1000).toFixed(1) + ' km' : Math.round(fr.nearest_flood_m / 10) * 10 + ' m') + ' away.'
        : 'No modelled river flooding within 3.5 km.';
      var fbtn = sc == null ? '' : '<button type="button" class="pi-btn" data-pi-flood>' + ic('waves') + ' View flood map</button>';
      rows.push('<div class="pi-row"><span class="pi-score ' + tone + '" title="River flood risk, 1 (lowest) to 10. Source: JRC / Copernicus GloFAS flood model. Covers rivers, not drainage or coastal flooding.">' + (sc == null ? '\u2013' : sc) + '</span>'
        + '<div class="pi-tx"><div class="pi-k">Flood risk</div><div class="pi-v">' + (sc == null ? 'Not assessed' : sc + ' out of 10' + chip(word, tone)) + '</div>'
        + '<div class="pi-s">' + (FLOOD.state !== 'done' ? (window.SynLoad ? SynLoad.line('signal', 'Checking the flood model') : 'Checking the flood model\u2026') : escHtml(fsub)) + '</div>' + fbtn + '</div></div>');

      /* water */
      var water = has(/borehole|water\s*(storage|supply|tank|treatment|well)|\bwell\b|tank/i);
      if (water.length) rows.push(row('water', 'Water', water.map(escHtml).join(', '), ''));

      /* security */
      var sec = has(/secur|gated|fenc|cctv|guard|gatehouse/i);
      if (sec.length) rows.push(row('shield', 'Security', sec.map(escHtml).join(', '), ''));

      /* title */
      rows.push(row('legal', 'Title', p.title_type && TITLE_LABEL[p.title_type] ? escHtml(TITLE_LABEL[p.title_type]) : 'Not stated' + chip('Ask for the document', 'na'), ''));

      /* build & age */
      var COND = { brand_new: 'Brand new', excellent: 'Excellent condition', good: 'Good condition', fair: 'Fair condition', needs_work: 'Needs work' };
      var built = [];
      if (p.year_built) built.push('Built ' + escHtml(p.year_built));
      if (p.property_condition && COND[p.property_condition]) built.push(COND[p.property_condition]);
      if (p.build_stage && p.build_stage !== 'completed') built.push({ under_construction: 'Under construction', not_started: 'Not started' }[p.build_stage] + (p.build_progress_pct != null ? ' (' + p.build_progress_pct + '%)' : ''));
      if (built.length) rows.push(row('home', 'Building', built.join(' \u00b7 '), ''));

      /* nearest essentials, once the places are loaded */
      if (POI && POI.length && PROP) {
        var near = {};
        POI.forEach(function (q) { var d = q.dm != null ? Number(q.dm) : haversineM(PROP, q.c); if (isFinite(d) && (near[q.t] == null || d < near[q.t])) near[q.t] = d; });
        var pick = [['hospital', 'Hospital'], ['school', 'School'], ['transit', 'Transport'], ['market', 'Market']].filter(function (x) { return near[x[0]] != null; })
          .map(function (x) { return x[1] + ' ' + formatDist(near[x[0]]); });
        if (pick.length) rows.push(row('pin', 'Nearest', pick.join(' \u00b7 '), ''));
      }
      host.innerHTML = rows.join('');
    }
    window.paintIntel = paintIntel;

    var BACK_BTN = '<button class="pvo-back" type="button" data-back aria-label="Back to all nearby"><span class="pvo-back-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></span><span>All nearby</span></button>';
    function showFlood() {
      PANEL = { mode: 'flood', cat: null, poi: null };
      clearPois();
      drawHome(true);
      markCardOn(true);
      overlay.className = 'pvc-overlay';
      overlay.innerHTML = BACK_BTN + '<div class="pvo-k">Flood map</div>'
        + '<div class="pvo-leg" id="pvFloodLeg"><span>' + (window.SynLoad ? SynLoad.line('signal', 'Loading the flood map') : 'Loading the flood map\u2026') + '</span></div>';
      fit([PROP]);
      revealMap();
      fetch(FN_URL + '/functions/v1/property-flood', { method: 'POST', headers: fnHeaders(), body: JSON.stringify({ property_id: propIdForFetch(), grid: true }) })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (g) {
          var leg = document.getElementById('pvFloodLeg');
          if (PANEL.mode !== 'flood' || !leg) return;
          if (!g || !g.depth_b64) { leg.innerHTML = '<span>The flood map is not available for this location.</span>'; return; }
          var bin = atob(g.depth_b64), cv = document.createElement('canvas'); cv.width = g.cols; cv.height = g.rows;
          var cx = cv.getContext('2d'), im = cx.createImageData(g.cols, g.rows), n = 0;
          for (var i = 0; i < bin.length; i++) {
            var d = bin.charCodeAt(i) * 0.05; if (!d) continue; n++;
            var c = d < 0.5 ? [140, 200, 255, 150] : d < 1.5 ? [70, 150, 235, 175] : d < 3 ? [30, 100, 215, 195] : [12, 50, 160, 215];
            im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = c[3];
          }
          cx.putImageData(im, 0, 0);
          /* 90 m model cells drawn as hard squares look like blocks floating on the map. Scale up and
             soften the edges so water reads as water, then lay it on with smooth resampling. */
          var big = document.createElement('canvas'); big.width = g.cols * 4; big.height = g.rows * 4;
          var bx = big.getContext('2d'); bx.imageSmoothingEnabled = true; bx.filter = 'blur(1.6px)';
          bx.drawImage(cv, 0, 0, big.width, big.height);
          whenMap(function () { MAPR.imageOverlay('pv-flood', big.toDataURL('image/png'), g.bbox, { opacity: 0.95, smooth: true }); });
          whenMap(function () { MAPR.fitPoints([xy(PROP)], { maxZoom: 14.5, padding: fitPad(), duration: REDUCE ? 0 : 500 }); });
          leg.innerHTML = n
            ? '<span><i style="background:#8CC8FF"></i>Under 0.5 m</span><span><i style="background:#4696EB"></i>0.5 to 1.5 m</span><span><i style="background:#1E64D7"></i>1.5 to 3 m</span><span><i style="background:#0C32A0"></i>Over 3 m</span>'
              + '<small>Modelled river flood, 1-in-100-year, within 3.5 km. JRC / Copernicus GloFAS.</small>'
            : '<span>No modelled river flooding within 3.5 km of this home.</span><small>JRC / Copernicus GloFAS river flood model.</small>';
        })
        .catch(function () { var leg = document.getElementById('pvFloodLeg'); if (leg) leg.innerHTML = '<span>The flood map could not load. Try again in a moment.</span>'; });
    }
    /* the intelligence card's "View flood map": open the map (a sheet on a phone, beside the page on a desktop), then switch it to flood */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-pi-flood]')) return;
      var phone = window.matchMedia('(max-width: 1024px)').matches, btn = document.getElementById('pvmMapBtn');
      if (phone) { if (!document.body.classList.contains('pv-map-open') && btn) btn.click(); }
      else { var cv = document.querySelector('.pv-canvas'); if (cv) cv.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      whenMap(function () { setTimeout(showFlood, 350); });
    });

    /* ── state 2: one kind, pinned ───────────────────────────────────── */
    function placesOf(t) {
      return POI.filter(function (p) { return p.t === t; });
    }

    function showCat(t) {
      if (t === COMMUTE_KEY) return showCommute();
      if (t === '__flood') return showFlood();
      PANEL = { mode: 'places', cat: t, poi: null };
      clearPois();
      drawHome(true);
      markCardOn(true);

      var list = placesOf(t);
      var m = metaFor(t);
      var pts = [PROP];
      /* Same cap as before and for the same measured reason: DOM markers cost
         a frame each, and sixty of one kind is already more than anyone reads.
         Within a single category it almost never bites. */
      list.slice(0, 60).forEach(function (poi, i) {
        whenMap(function () {
          poiMarkers.push(MAPR.marker(poi.c[1], poi.c[0], poiHtml(poi.t), {
            anchor: 'center',
            onClick: function () { showPlace(poi); },
          }));
        });
        if (i < 18) pts.push(poi.c);
      });

      overlay.className = 'pvc-overlay';
      overlay.innerHTML = '<button class="pvo-back" type="button" data-back aria-label="Back to all nearby"><span class="pvo-back-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></span><span>All nearby</span></button>'
        + '<div class="pvo-k">' + escHtml(AMENITY_LABEL[t] || m.lbl) + ' \u00b7 ' + list.length + '</div>'
        + '<div class="pvo-rows">'
        + list.slice(0, 60).map(function (poi, i) {
          return '<button class="pvo-row" data-poi="' + i + '" type="button">'
            + '<span class="lb">' + escHtml(poi.n) + '</span>'
            + '<span class="n">' + escHtml(poi.d) + '</span></button>';
        }).join('')
        + '</div>';
      fit(pts);
      revealMap();
    }

    function showCommute() {
      PANEL = { mode: 'places', cat: COMMUTE_KEY, poi: null };
      clearPois();
      drawHome(true);
      markCardOn(true);
      var cg = CONGEST[state.time], pts = [PROP];
      DEST.forEach(function (d, i) {
        whenMap(function () {
          poiMarkers.push(MAPR.marker(d.c[1], d.c[0],
            '<div class="pv-poi-pin pv-poi-mono">' + poiSvg('pin', 13) + '</div>', { anchor: 'center' }));
          /* Congestion keeps its colour: it is the one thing on this map where
             colour carries information no shape can. */
          poiMarkers.push({ remove: (function () {
            var id = MAPR.line([[PROP[1], PROP[0]], [d.c[1], d.c[0]]], { color: cg.color, width: 5, opacity: 0.75 });
            return function () { MAPR.removeLine(id); };
          }()) });
        });
        pts.push(d.c);
      });
      var toggle = ['morning', 'midday', 'evening'].map(function (k) {
        return '<button data-time="' + k + '" class="' + (k === state.time ? 'on' : '') + '">' + CONGEST[k].lbl + '</button>';
      }).join('');
      var etas = DEST.map(function (d, i) { return '<div class="pvo-eta">' + escHtml(d.n) + ' <b>' + cg.etas[i] + '</b></div>'; }).join('');
      overlay.className = 'pvc-overlay';
      overlay.innerHTML = '<button class="pvo-back" type="button" data-back aria-label="Back to all nearby"><span class="pvo-back-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></span><span>All nearby</span></button>'
        + '<div class="pvo-k">Traffic to key areas</div><div class="pv-time">' + toggle + '</div>' + etas
        + '<p style="font-size:12px;color:var(--ink-dim);margin-top:8px">Congestion-adjusted drive time. Red = heavy, amber = moderate.</p>';
      fit(pts);
      revealMap();
    }

    /* ── state 3: one place, with the walk to it ─────────────────────── */
    function showPlace(poi) {
      PANEL.mode = 'detail'; PANEL.poi = poi;
      markCardOn(true);
      if (routeLine) { MAPR.removeLine(routeLine); routeLine = null; }
      overlay.className = 'pvc-overlay';

      var head = '<button class="pvo-back" type="button" data-back-cat><span class="pvo-back-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></span><span>'
        + escHtml(AMENITY_LABEL[poi.t] || metaFor(poi.t).lbl) + '</span></button>'
        + '<div class="pvo-name">' + escHtml(poi.n) + '</div>'
        + '<div class="pvo-sub">' + escHtml(AMENITY_LABEL[poi.t] || metaFor(poi.t).lbl)
        + ' \u00b7 ' + escHtml(poi.d) + ' away in a straight line</div>';
      overlay.innerHTML = head
        + '<p style="font-size:12.5px;color:var(--ink-muted);margin:6px 0 0">Working out the walking route\u2026</p>';

      /* Before the route lands, not after: OSRM takes a moment and the map
         should already be in front of you when the line is drawn on it. */
      revealMap();

      var coords = PROP[1] + ',' + PROP[0] + ';' + poi.c[1] + ',' + poi.c[0];
      fetchWithTimeout(OSRM_URL + coords + '?overview=full&geometries=geojson', {}, 9000)
        .then(function (r) { if (!r.ok) throw new Error('osrm ' + r.status); return r.json(); })
        .then(function (data) {
          var route = data.routes && data.routes[0];
          if (!route) throw new Error('no route');
          /* OSRM returns lng,lat already -- the one place on this page that
             needs no flip. */
          whenMap(function () {
            routeLine = MAPR.line(route.geometry.coordinates,
              { color: '#FF8A2D', width: 4, opacity: 0.95 });
          });
          /* The DURATION from this engine is discarded. It is a car time
             whatever profile was asked for -- the demo server has only the
             car profile and answers /foot/ with driving -- so it was
             reporting 9 minutes for 9.66 km and calling it walking. The
             distance is kept, because that part is real: it follows the road
             network instead of cutting across a straight line. */
          var km = route.distance / 1000;
          var walk = walkMins(route.distance);
          /* Three figures, each with its own label (Eden: "not readable" --
             the sentence was laid out as a spaced flex row and split into
             columns mid-phrase). */
          var dr = driveMins(route.distance);
          overlay.innerHTML = head
            + '<div class="pvo-stats">'
            +   '<div class="pvo-stat"><b>' + km.toFixed(1) + ' km</b><span>by road</span></div>'
            +   '<div class="pvo-stat"><b>' + walk + ' min</b><span>on foot</span></div>'
            +   '<div class="pvo-stat"><b>' + (dr.lo === dr.hi ? dr.lo : dr.lo + '\u2013' + dr.hi) + ' min</b><span>driving</span></div>'
            + '</div>'
            + '<p class="pvo-note">Times are estimated from distance, not live traffic.</p>';
          fit([PROP, poi.c]);
        })
        .catch(function () {
          overlay.innerHTML = head
            + '<p style="font-size:12.5px;color:var(--ink-muted);margin:6px 0 0">Couldn\u2019t reach the routing service just now \u2014 straight-line distance is <b>'
            + escHtml(poi.d) + '</b>.</p>';
        });
    }

    /* One listener for the whole card: its contents are replaced wholesale on
       every state change, so per-render listeners would leak. */
    overlay.addEventListener('click', function (e) {
      var cat = e.target.closest('[data-cat]');
      if (cat) { showCat(cat.dataset.cat); return; }
      var back = e.target.closest('[data-back]');
      if (back) { showCats(); return; }
      var backCat = e.target.closest('[data-back-cat]');
      if (backCat) { showCat(PANEL.cat); return; }
      var row = e.target.closest('[data-poi]');
      if (row && PANEL.cat && PANEL.cat !== COMMUTE_KEY) {
        var list = placesOf(PANEL.cat);
        var poi = list[Number(row.dataset.poi)];
        if (poi) showPlace(poi);
        return;
      }
      var t = e.target.closest('[data-time]');
      if (t) { state.time = t.dataset.time; showCommute(); }
    });

    /* TAP THE MAP TO COME BACK.
       Asked for directly: look at a school, tap the map, you are back at the
       list of schools. It is the gesture people already use to dismiss things,
       and it means the back button in the card is a convenience rather than
       the only way out.

       One step at a time, not straight to the top: from a place you land back
       on its own kind, from a kind you land back on all of them. Tapping the
       map while already at the top does nothing, because there is nowhere
       further back to go and a map that reacts to every tap feels twitchy. */
    whenMap(function () {
      MAPR.onBackgroundClick(function () {
        if (PANEL.mode === 'detail') showCat(PANEL.cat);
        else if (PANEL.mode === 'places') showCats();
        /* The last step, and only where there is a way back in. */
        else if (PANEL.mode === 'cats' && PHONE_MQ.matches) hideCard();
      });
    });

    var backPill = document.getElementById('pvmBackPill');
    if (backPill) backPill.addEventListener('click', function () {
      if (PANEL.mode === 'detail') { showCat(PANEL.cat); return; }
      if (PANEL.mode === 'places') { showCats(); return; }
      if (PANEL.mode === 'cats' && document.body.classList.contains('pv-card-on')) { hideCard(); return; }
      var out = document.getElementById('pvmBack');      // closes the map
      if (out) out.click();
    });

    var nearBtn = document.getElementById('pvmNear');
    if (nearBtn) nearBtn.addEventListener('click', function () { showCats(); });

    /* The phone map opens on a map, not on a list. Called by the sheet rather
       than at load, because the desktop map has no open event and must keep
       its card from the start. */
    window.__pvMapOpened = function () { if (PHONE_MQ.matches) hideCard(); };

    /* Kept as the name the rest of the page already calls. Everything that
       used to switch tabs now just returns to the list of kinds. */
    function setView() { showCats(); }
    function renderPOI() { showCats(); }
    /* Takes the card element, not an index: the deck can hide or reveal cards,
       and an index into a fixed array cannot survive that. */
    window.__pvView = function (card) {
      setView((card && card.dataset && card.dataset.view) || 'poi');
    };

    /* The map waits for the listing. Without coordinates it stays on a national
       view with an honest panel rather than pinning a home somewhere it isn't. */
    function propIdForFetch() { return (window.__pvListing && window.__pvListing.id) || null; }
    document.addEventListener('syn:property', function (e) {
      var p = e.detail || {};
      window.__pvListing = p;
      paintNeighbourhood(p);
      paintCosts(p);
      if (window.paintIntel) paintIntel();
      // Their anchors first, so the very first paint can already include them
      // rather than flashing an area-only paragraph and then rewriting it.
      fetchMyPlaces().then(function () { paintAround(); });
      fetchStoredPlaces(p.id || null);
      /* The listing travels as an id, not as a typed-out question. The
         chat looks it up and pins it to the conversation, so every question
         after it is about this home without the buyer restating which one. */
      var replyBtn = document.getElementById('replyBtn');
      if (replyBtn && p.id) {
        replyBtn.href = 'toju.html?reply=' + encodeURIComponent(p.id);
      }
      /* Placed, or honest about not being. */
      var unpl = document.getElementById('pvcUnplaced');
      if (unpl) {
        var placed = p.latitude != null && p.longitude != null;
        unpl.hidden = placed;
        if (!placed) {
          /* escHtml, not esc: `esc` is a const in an earlier script block and
             is not in scope here. */
          var nb = p.neighbourhoods && (Array.isArray(p.neighbourhoods)
            ? p.neighbourhoods[0] : p.neighbourhoods);
          /* Agencies routinely type the area, city and state into the address
             line, so appending them again reads "Agbowo, Oyo, Ibadan, Oyo".
             Same de-duplication the header line does. */
          var base = String(p.address || '');
          var addr = [base].concat([p.neighbourhood || (nb && nb.name), p.city, p.state].filter(Boolean)
            .filter(function (part) {
              return base.toLowerCase().indexOf(String(part).toLowerCase()) === -1;
            })).filter(Boolean).join(', ');
          unpl.innerHTML = '<b>We have not placed this home on the map</b>'
            + '<p>The agency gave an address but no map position, so we are not '
            + 'going to pin it somewhere approximate and let you plan around it.</p>'
            + (addr ? '<div class="addr">' + escHtml(addr) + '</div>' : '');
        }
      }
      /* Rent is set by the agency. Sales are where a number is a question.
         Hides the offer BLOCK now that costs and negotiation share a card --
         hiding the card would take the cost breakdown with it, which is the
         part a renter needs most. This also quietly fixes a counting bug: the
         old line hid a whole deck card without calling __pvDeckChanged(), so
         every rental drew one dot more than it had cards. */
      var negBlock = document.getElementById('negBlock');
      if (negBlock && String(p.listing_type || '').toLowerCase() === 'rent') {
        negBlock.hidden = true;
      }
      if (p.latitude != null && p.longitude != null) {
        PROP = [Number(p.latitude), Number(p.longitude)];
        whenMap(function () { MAPR.flyTo(PROP[1], PROP[0], 14); });
        fetchAmenities(p.id || null, PROP[0], PROP[1]);
        // Commute needs the same coordinates, and they only exist here.
        fetchCommutePanel(p.id || null, PROP[0], PROP[1]);
        paintAround();
      }
      var ag = p.agencies && (Array.isArray(p.agencies) ? p.agencies[0] : p.agencies);
      if (ag && ag.name) AGENCY = { n: ag.name, sub: ag.verification_tier ? (ag.verification_tier + ' tier') : '' };
      setView(state.view || 'poi');
    });
    setView('poi');

    /* ── mobile map sheet ────────────────────────────────────────────────
       On a phone the canvas is a full-screen sheet rather than a hidden
       panel. Leaflet measures its container on init, and this one starts
       off-screen with no usable size, so the map must be re-measured the
       first time the sheet is actually shown or it renders as grey tiles. */
    (function () {
      var canvas = document.querySelector('.pv-canvas');
      var openBtn = document.getElementById('pvmMapBtn');
      var closeBtn = document.getElementById('pvmClose');
      if (!canvas || !openBtn) return;

      /* Locking <body> was not enough: on this page the scrolling element is
         <html>, so the listing kept scrolling underneath the open sheet and
         closing it landed you somewhere else entirely. Pin the document at its
         current offset and put it back on close -- position:fixed alone would
         jump to the top, which is the same bug wearing a different hat. */
      /* ── THE MAP SHEET ────────────────────────────────────────────────
         On a phone the map is fixed and full-bleed, so opening it is a state
         rather than a scroll: body.pv-map-open. On a desktop the map is
         beside the listing and always visible, so the button is not there at
         all and none of this runs.

         MapLibre measures its container when it is created. This one is
         display:none until the first open, so it measures zero and paints a
         grey rectangle -- resize() after the sheet is actually on screen is
         what makes the first open work at all. */
      var PHONE = window.matchMedia('(max-width: 1024px)');
      var scrollY = 0;

      function openMap() {
        scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.classList.add('pv-map-open');
        /* The listing keeps scrolling behind a fixed sheet otherwise, and you
           come back out somewhere else entirely. The scrolling element on this
           page is <html>, so pin that and put it back on close -- overflow
           alone on <body> does nothing here. */
        document.documentElement.style.overflow = 'hidden';
        whenMap(function () { setTimeout(function () { MAPR.resize(); }, 60); });
        if (typeof window.__pvMapOpened === 'function') window.__pvMapOpened();
      }

      function closeMap() {
        document.body.classList.remove('pv-map-open');
        document.documentElement.style.overflow = '';
        window.scrollTo(0, scrollY);
      }

      openBtn.addEventListener('click', function () {
        if (!PHONE.matches) {
          canvas.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
          return;
        }
        if (document.body.classList.contains('pv-map-open')) closeMap();
        else openMap();
      });

      /* Back means one thing at a time: out of the map if the map is up,
         off the page if it is not. Anything else makes the taskbar's Back
         throw away the map you just opened AND the listing behind it. */
      var backBtn = document.getElementById('pvmBack');
      if (backBtn) backBtn.addEventListener('click', function () {
        if (document.body.classList.contains('pv-map-open')) { closeMap(); return; }
        if (history.length > 1) history.back(); else location.href = 'browse.html';
      });
      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('pv-map-open')) closeMap();
      });
      /* Rotating to a desktop width with the sheet open would leave the body
         locked against a map that is no longer covering anything. */
      var onWidth = function () { if (!PHONE.matches) closeMap(); };
      if (PHONE.addEventListener) PHONE.addEventListener('change', onWidth);
      else if (PHONE.addListener) PHONE.addListener(onWidth);
      if (closeBtn) closeBtn.remove();

      /* Leaflet sizes itself once, against whatever the container measured at
         init. Inline, that happens while the map is still below the fold and
         mid-layout, so it has to be re-measured -- once after layout settles,
         and again whenever the container changes size (rotation, the address
         bar sliding away, a card above it growing). Without this the tiles
         are laid out for the wrong box and the map looks torn. */
      var settle = function () { whenMap(function () { MAPR.resize(); }); };
      window.addEventListener('load', function () { setTimeout(settle, 120); });
      setTimeout(settle, 400);
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function () { settle(); });
        ro.observe(canvas);
      } else {
        window.addEventListener('resize', settle);
        window.addEventListener('orientationchange', function () { setTimeout(settle, 250); });
      }
    })();
  })();
}
