/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — where map tiles come from.

   ONE place, because there are two maps: the shared one in matches-shared.js
   (browse, Tayo, the agency portal) and property.html's own. They both used to
   point at tile.openstreetmap.org, and the OSMF tile policy covers modest use
   and explicitly does not cover commercial traffic. Right for a product with
   no users; wrong for one with any.

   ── STADIA MAPS, AND WHY THERE IS NO KEY IN THIS FILE ─────────────────────
   Stadia authenticates browsers by DOMAIN, not by key. You register
   synapsecore.dev once in their dashboard and requests from it are served —
   nothing secret ships in the page, nothing to leak from a public repository,
   nothing to rotate. That is a better arrangement than any key we could hide,
   and it is why this file holds no credentials.

   localhost and 127.0.0.1 are served with no registration at all, so local
   development works out of the box. Measured rather than assumed: a tile
   request carrying Origin http://localhost:3000 returns 200, and one from an
   unregistered production origin returns 401.

   TO GO LIVE, once:
     Stadia dashboard → Manage Properties → Authentication Configuration
       → add domain:  synapsecore.dev
     Add www.synapsecore.dev as well if their matcher does not cover
     subdomains — the site serves from www.

   A key is only needed for server-side or non-browser access. If that ever
   comes up, put it in KEY below and it is appended as api_key. Leave it empty
   for normal use.

   Nothing here can leave a reader looking at a grey rectangle: if Stadia
   refuses, the map falls back to OpenStreetMap and the console says why.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  /* All three credits are a licence condition rather than a courtesy: the
     tiles are Stadia's, the schema is OpenMapTiles', the data is OSM's. */
  var SM_ATTR = '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a>, '
              + '&copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> '
              + '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

  var SynTiles = {
    /** Normally empty: Stadia authenticates this site by domain. Only wanted
     *  for non-browser access. */
    KEY: '',

    /** alidade_smooth is light and low-saturation, chosen because the price
     *  pins are the loud thing on these maps and a colourful base would fight
     *  them. Others: alidade_smooth_dark, outdoors, osm_bright, stamen_toner. */
    STYLE: 'alidade_smooth',

    /** The labelled style, for a map whose whole job is "what is around this
     *  house?". STYLE above is deliberately quiet because the matches map is
     *  covered in price pins and a busy base fights them -- but that reasoning
     *  does not travel. On a single-property map the base IS the content, and
     *  a quiet style leaves a correct pin sitting on an empty page: no
     *  business names, no bus stops, roads barely distinguished. Same mistake
     *  the property page had already been fixed for once, under CARTO's names
     *  (Positron vs Voyager); alidade_smooth is Positron and this is Voyager. */
    STYLE_DETAIL: 'osm_bright',

    /** Attach the right tile layer to a Leaflet map. Returns the layer.
     *  Pass { detail: true } for a map that should carry labels and POIs. */
    add: function (map, opts) {
      var L = window.L;
      if (!L || !map) return null;

      var style = (opts && opts.detail) ? this.STYLE_DETAIL : this.STYLE;
      var key = String(this.KEY || '').trim();
      /* {r} is Stadia's retina placeholder; detectRetina is what fills it with
         "@2x" on a dense screen and leaves it empty otherwise. */
      var url = 'https://tiles.stadiamaps.com/tiles/' + encodeURIComponent(style)
        + '/{z}/{x}/{y}{r}.png' + (key ? '?api_key=' + encodeURIComponent(key) : '');

      var layer = L.tileLayer(url, {
        maxZoom: 20,
        detectRetina: true,
        crossOrigin: true,
        attribution: SM_ATTR,
      });

      var self = this, swapped = false;
      function fallBack(why) {
        if (swapped) return;
        swapped = true;
        try { map.removeLayer(layer); } catch (e) {}
        // eslint-disable-next-line no-console
        console.warn('Stadia tiles unavailable (' + why + ') — using OpenStreetMap. '
          + 'Register this domain under Manage Properties → Authentication Configuration.');
        self._osm(map);
      }

      /* A refused request does NOT look like a failure to the browser. Stadia
         answers 401 with content-type image/png -- a picture saying it was
         refused -- so the tile LOADS and Leaflet fires tileload, never
         tileerror. MapTiler does the same with 403. Measured on both.

         So the status code has to be read, which means asking for one tile
         with fetch rather than trusting the <img>. One extra request per map,
         and it is the difference between a working map and a wall of
         "unauthorised" that looks deliberate. */
      var probe = 'https://tiles.stadiamaps.com/tiles/' + encodeURIComponent(style)
        + '/3/4/3.png' + (key ? '?api_key=' + encodeURIComponent(key) : '');
      try {
        fetch(probe, { method: 'GET', cache: 'force-cache' })
          .then(function (r) { if (!r.ok) fallBack('HTTP ' + r.status); })
          .catch(function () { /* offline or blocked: tileerror below covers it */ });
      } catch (e) { /* no fetch: leave it to tileerror */ }

      /* For what the probe cannot see -- the host unreachable, nothing loading
         at all, which is when tileerror does fire. */
      var fails = 0;
      layer.on('tileerror', function () {
        fails += 1;
        if (fails >= 4) fallBack(fails + ' tile errors');
      });

      layer.addTo(map);
      return layer;
    },

    _osm: function (map) {
      return window.L.tileLayer(OSM_URL, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
    },
  };

  window.SynTiles = SynTiles;
})();
