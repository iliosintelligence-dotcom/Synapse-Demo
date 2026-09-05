/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — where map tiles come from.

   ONE place, because there are two maps: the shared one in matches-shared.js
   (browse, Tayo, the agency portal) and property.html's own. They were both
   pointing at tile.openstreetmap.org, and the OSMF tile policy covers modest
   use and explicitly does not cover commercial traffic. That was the right
   call for a product with no users and the wrong one for a product with any.

   ── PASTE YOUR KEY BELOW ──────────────────────────────────────────────────
   MapTiler keys are public by design: the browser has to send one with every
   tile request, so it is visible in this file and in the network tab, and
   this repository is public. That is normal and fine, but ONLY once the key
   is restricted, so do this before you commit one:

     MapTiler Cloud → Keys → your key → Origins (allowed HTTP referrers)
       https://synapsecore.dev/*
       https://www.synapsecore.dev/*
       http://localhost:3000/*

   Without that restriction anyone can lift the key out of this file and spend
   your quota. With it, a stolen key is worthless off your domains.

   Leave KEY empty and everything still works: the map falls back to
   OpenStreetMap, which is what it did before. Nothing here can leave a reader
   staring at a grey rectangle.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  /* MapTiler asks for both credits, and it is a licence condition rather than
     a courtesy -- the tiles are theirs and the data underneath is OSM's. */
  var MT_ATTR = '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> '
              + '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>';

  var SynTiles = {
    /** Paste the MapTiler key here. Empty = OpenStreetMap, as before. */
    KEY: '',

    /** Whichever style your MapTiler plan offers. streets-v2 is the usual one;
     *  if tiles 404, check the style name in MapTiler Cloud → Maps. */
    STYLE: 'streets-v2',

    /** Attach the right tile layer to a Leaflet map. Returns the layer. */
    add: function (map) {
      var L = window.L;
      if (!L || !map) return null;

      var key = String(this.KEY || '').trim();
      if (!key) return this._osm(map);

      /* MapTiler serves 512px tiles; Leaflet assumes 256, so the pair
         tileSize + zoomOffset is what keeps labels the right size instead of
         doubled. Their own Leaflet example uses exactly this. */
      var layer = L.tileLayer(
        'https://api.maptiler.com/maps/' + encodeURIComponent(this.STYLE)
          + '/{z}/{x}/{y}.png?key=' + encodeURIComponent(key),
        {
          tileSize: 512,
          zoomOffset: -1,
          minZoom: 1,
          maxZoom: 19,
          crossOrigin: true,
          attribution: MT_ATTR,
        }
      );

      var self = this, swapped = false;
      function fallBack(why) {
        if (swapped) return;
        swapped = true;
        try { map.removeLayer(layer); } catch (e) {}
        // eslint-disable-next-line no-console
        console.warn('MapTiler tiles unavailable (' + why + ') — using OpenStreetMap. '
          + 'Check the key, its allowed origins, and the style name.');
        self._osm(map);
      }

      /* A rejected key does NOT look like a failure to the browser. MapTiler
         answers 403 with content-type image/png -- a picture that says the key
         is bad -- so the tile LOADS. Measured: four tileload events, zero
         tileerror, no broken images. A tileerror handler would never have
         fired, and the map would have sat there tiled with an error graphic
         looking deliberate.

         So the status code has to be read, which means asking for one tile
         with fetch rather than trusting the <img>. One extra request, once
         per map, for the difference between a working map and a wall of
         "invalid key". */
      var probe = 'https://api.maptiler.com/maps/' + encodeURIComponent(this.STYLE)
        + '/1/1/1.png?key=' + encodeURIComponent(key);
      try {
        fetch(probe, { method: 'GET', cache: 'force-cache' })
          .then(function (r) { if (!r.ok) fallBack('HTTP ' + r.status); })
          .catch(function () { /* offline or blocked: tileerror below covers it */ });
      } catch (e) { /* no fetch: leave it to tileerror */ }

      /* Still worth keeping for the case the probe cannot catch -- the host
         being unreachable, where nothing loads at all. */
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
