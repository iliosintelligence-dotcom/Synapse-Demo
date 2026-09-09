/* ─────────────────────────────────────────────────────────────────────────────
   SynMapRender — THE ONLY FILE THAT KNOWS MAPLIBRE EXISTS.

   The brief asked that the rendering provider be replaceable without
   rebuilding Synapse's search and intelligence. That is a real constraint and
   it is met by a boring discipline rather than a clever abstraction: every
   MapLibre symbol in the app appears between here and the end of this file.
   Search, spatial intelligence, Toju and the card layer talk to the verbs
   below -- fit(), setProperties(), onViewport() -- and none of them can tell
   what is drawing.

   The old map failed this test in an instructive way. It was Leaflet, and
   `L.marker`, `L.divIcon` and `L.latLngBounds` were spread across
   matches-shared.js, property.html, browse.html and agency.html, so the
   provider was not a dependency, it was an ingredient. Changing it meant
   touching four files that have nothing to do with maps.

   WHY MAPLIBRE AND NOT LEAFLET
   Not preference. Stadia's own SDK path is vector, and four things in the
   brief are only reachable there:
     · a black-and-white map        raster PNGs cannot be recoloured
     · redesigned POI shapes        raster PNGs cannot be re-iconed
     · clustering + collision       Leaflet needs a plugin; this is built in
     · staying responsive on a phone  GPU rendering, not CPU canvas
   The gesture handling and the credit collapse from the old map-tiles.js are
   carried over below, because those were right and are not Leaflet-specific.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/';

  function loadLib() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    if (loadLib._p) return loadLib._p;
    loadLib._p = new Promise(function (resolve, reject) {
      var css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = CDN + 'maplibre-gl.min.css';
      document.head.appendChild(css);
      var s = document.createElement('script');
      s.src = CDN + 'maplibre-gl.min.js';
      s.onload = function () { resolve(window.maplibregl); };
      s.onerror = function () { reject(new Error('MapLibre failed to load')); };
      document.head.appendChild(s);
    });
    return loadLib._p;
  }

  var SRC = 'syn-properties';

  function Renderer(el, opts) {
    this.el = typeof el === 'string' ? document.getElementById(el) : el;
    this.opts = opts || {};
    this.map = null;
    this._handlers = { viewport: [], select: [], cluster: [] };
    this._sel = null;
    this._props = { type: 'FeatureCollection', features: [] };
    this._overlay = { markers: [], lines: [], seq: 0 };
  }

  Renderer.prototype.ready = function () {
    var self = this;
    if (this._ready) return this._ready;
    this._ready = loadLib()
      .then(function (gl) { return window.SynMapStyle.load(self.opts.style).then(function (st) { return [gl, st]; }); })
      .then(function (pair) {
        var gl = pair[0], style = pair[1];
        self.map = new gl.Map({
          container: self.el,
          style: style,
          center: self.opts.center || [3.4, 6.45],   // Lagos, until told otherwise
          zoom: self.opts.zoom == null ? 11 : self.opts.zoom,
          /* A CEILING ON ZOOM. MapLibre's default is 22, which is roughly a
             metre across -- past the point where the vector tiles have
             anything left to say, so the reward for pinching further is a
             bigger drawing of the same building and the loss of every
             landmark that told you where you were.

             18 still resolves individual buildings and the house's own
             footprint, which is as close as any question on this map needs.
             fit() and fitPoints() cap themselves at 16 separately; this is
             the floor under a person's own pinching. */
          maxZoom: self.opts.maxZoom == null ? 18 : self.opts.maxZoom,
          attributionControl: false,
          /* A map you cannot tilt is one less thing to get wrong by accident
             on a phone, and the design is a flat plan drawing. */
          pitchWithRotate: false,
          dragRotate: false,
          touchPitch: false,
        });
        self.map.touchZoomRotate.disableRotation();
        return new Promise(function (res) { self.map.on('load', function () { res(); }); });
      })
      .then(function () {
        window.SynMapStyle.addMarks(self.map);
        self._addPropertyLayers();
        self._gestures();
        self._credit();
        self._wire();
        return self;
      });
    return this._ready;
  };

  /* ── the property layer ────────────────────────────────────────────────
     One GeoJSON source with clustering on. MapLibre does the clustering on a
     worker thread, which is the difference between a map that stays smooth at
     four thousand pins and one that does not -- and it was the single largest
     thing missing from the Leaflet build, where every pin was a DOM node. */
  Renderer.prototype._addPropertyLayers = function () {
    var map = this.map, C = window.SynMapStyle.COLOURS;
    if (map.getSource(SRC)) return;

    map.addSource(SRC, {
      type: 'geojson',
      data: this._props,
      cluster: true,
      clusterRadius: 52,
      clusterMaxZoom: 15,
    });

    map.addLayer({
      id: 'syn-cluster', type: 'circle', source: SRC, filter: ['has', 'point_count'],
      paint: {
        'circle-color': C.ink,
        'circle-radius': ['step', ['get', 'point_count'], 17, 10, 21, 50, 26],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#fff',
      },
    });
    map.addLayer({
      id: 'syn-cluster-count', type: 'symbol', source: SRC, filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Stadia Semibold'], 'text-size': 12.5,
      },
      paint: { 'text-color': '#fff' },
    });

    /* THE MARKER IS A PIN, NOT A FLOATING NUMBER.
       A price rendered as bare text sits on the map like a label on a street,
       and nothing about it says "press me" -- which is exactly how it read.
       So above z13 each home is a proper pill with a pointer tail: a thing
       with an edge, a shadow of a border, and an obvious tap target that
       lands on the building rather than beside it.

       Still stepped by zoom, because the amount you want to read changes with
       what you are deciding. A dot while you are choosing an AREA (a hundred
       pills is a wall), the price once you are choosing a STREET, price and
       beds once you are choosing a HOME. */
    this._addPillImages();

    map.addLayer({
      id: 'syn-prop-dot', type: 'circle', source: SRC,
      filter: ['all', ['!', ['has', 'point_count']], ['<', ['zoom'], 13]],
      paint: {
        'circle-color': C.ink,
        'circle-radius': ['case', ['==', ['get', 'sel'], true], 7, 5],
        'circle-stroke-width': 2, 'circle-stroke-color': '#fff',
      },
    });

    /* icon-text-fit is what makes one 64px drawing serve "₦350k/yr" and
       "₦179.2m / 3 bed" alike: the pill is a STRETCHABLE image, so MapLibre
       grows its middle to whatever the label needs and leaves the rounded
       ends and the tail untouched.

       Selection rides in the SOURCE (`sel`) rather than in feature-state.
       feature-state would be cheaper, and it is what the dot above uses for
       its radius -- but it is not readable from `layout` properties, and
       swapping the pill IMAGE on selection is a layout change. Re-serialising
       a few hundred features costs about a millisecond and buys a selected
       marker that actually looks different. */
    map.addLayer({
      id: 'syn-prop-pin', type: 'symbol', source: SRC,
      filter: ['all', ['!', ['has', 'point_count']], ['>=', ['zoom'], 13]],
      layout: {
        'icon-image': ['case', ['==', ['get', 'sel'], true], 'syn-pill-on', 'syn-pill'],
        'icon-text-fit': 'both',
        /* Bottom padding clears the tail so the text stays in the body. */
        'icon-text-fit-padding': [3, 8, 11, 8],
        'icon-anchor': 'bottom',
        'text-anchor': 'bottom',
        /* Lifts the text off the tail so it is optically centred in the body
           rather than in the whole drawing. */
        'text-offset': [0, -0.55],
        'text-field': ['step', ['zoom'],
          ['get', 'price'],
          15.5, ['concat', ['get', 'price'], '\n', ['get', 'beds']]],
        'text-font': ['Stadia Semibold'],
        'text-size': 11.5,
        'text-line-height': 1.15,
        'text-justify': 'center',
        'text-padding': 2,
        /* A selected home must never be the one the collision engine drops --
           the card on screen would then point at nothing. sort-key is the
           lever for that: lower sorts first, and whatever is placed first
           wins its space.

           It has to be sort-key rather than allow-overlap, which is what this
           tried at first. icon-allow-overlap and text-allow-overlap are NOT
           data-driven in MapLibre -- they take a constant or a zoom
           expression and nothing else -- so a ['case', ['get','sel'], ...]
           made the whole layer spec invalid and addLayer rejected it. The
           layer simply never existed, no exception reached the console, and
           the map looked like it had merely failed to draw any pins. */
        'symbol-sort-key': ['case', ['==', ['get', 'sel'], true], 0, 1],
      },
      paint: {
        'text-color': ['case', ['==', ['get', 'sel'], true], '#FFFFFF', C.ink],
      },
    });
  };

  /* Two drawings: resting and selected. Drawn at 2x and declared pixelRatio 2
     so they are crisp on a phone. The stretch metadata is in BITMAP pixels,
     which is why every number here is double what it looks like on screen. */
  Renderer.prototype._addPillImages = function () {
    var map = this.map, C = window.SynMapStyle.COLOURS;
    var W = 128, BODY = 56, H = 76, R = 16, TAIL = 12;

    function pill(fill, stroke, shadow) {
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var x = cv.getContext('2d');
      x.clearRect(0, 0, W, H);

      x.beginPath();
      x.moveTo(R, 0);
      x.arcTo(W, 0, W, BODY, R); x.arcTo(W, BODY, 0, BODY, R);
      // the tail, cut into the bottom edge
      x.lineTo(W / 2 + TAIL, BODY);
      x.lineTo(W / 2, H);
      x.lineTo(W / 2 - TAIL, BODY);
      x.arcTo(0, BODY, 0, 0, R); x.arcTo(0, 0, W, 0, R);
      x.closePath();

      if (shadow) {
        x.shadowColor = 'rgba(18,18,18,0.22)';
        x.shadowBlur = 10; x.shadowOffsetY = 3;
      }
      x.fillStyle = fill; x.fill();
      x.shadowColor = 'transparent';
      x.lineWidth = 3; x.strokeStyle = stroke; x.stroke();
      return x.getImageData(0, 0, W, H);
    }

    var opts = {
      pixelRatio: 2,
      /* Only the middle of the body may stretch: the rounded ends keep their
         radius and the tail stays centred and the same size. */
      stretchX: [[R * 2, W - R * 2]],
      stretchY: [[R + 4, BODY - 8]],
      content: [18, 8, W - 18, BODY - 6],
    };
    if (!map.hasImage('syn-pill')) {
      map.addImage('syn-pill', pill('#FFFFFF', 'rgba(20,20,18,0.55)', true), opts);
    }
    if (!map.hasImage('syn-pill-on')) {
      map.addImage('syn-pill-on', pill(C.ink, C.ink, true), opts);
    }
  };

  Renderer.prototype._wire = function () {
    var self = this, map = this.map;

    /* Debounced, and on moveend rather than move. A viewport query per frame
       is how a map fetches four hundred times during one flick. */
    var t = null;
    map.on('moveend', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var b = map.getBounds();
        var vp = {
          west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth(),
          zoom: map.getZoom(),
          centre: [map.getCenter().lng, map.getCenter().lat],
        };
        self._handlers.viewport.forEach(function (fn) { fn(vp); });
      }, 220);
    });

    ['syn-prop-dot', 'syn-prop-pin'].forEach(function (id) {
      map.on('click', id, function (e) {
        var f = e.features && e.features[0];
        if (f) self._handlers.select.forEach(function (fn) { fn(f.properties.id, f.properties); });
      });
      map.on('mouseenter', id, function () { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', id, function () { map.getCanvas().style.cursor = ''; });
    });

    /* ── TAP A CLUSTER, LAND IN THAT AREA WITH ITS HOMES ON SCREEN ────────
       Two things were wrong with the first version.

       It called getClusterExpansionZoom with a NODE-STYLE CALLBACK. MapLibre
       4 returns a promise, so the callback was never invoked and clicking a
       cluster did nothing at all -- silently, because a promise nobody awaits
       reports nothing.

       And expansion zoom is the wrong answer even when it works: it zooms
       just far enough to split the cluster in two, which usually leaves you
       looking at two smaller circles. What you actually want from tapping
       "68" is to be IN that area with those 68 homes in front of you. So this
       asks the cluster for its members and frames them.

       maxZoom is capped so a cluster whose members sit almost on top of each
       other does not slam to street level; the floor of 14.2 is just past
       clusterMaxZoom, which guarantees the pins have broken apart into
       individual prices by the time the camera stops. */
    function frameCluster(clusterId, fallbackCentre) {
      var src = map.getSource(SRC);
      var leaves = src.getClusterLeaves(clusterId, 10000, 0);
      /* Promise in MapLibre 4, callback in 3 and earlier. Support both so an
         SDK bump does not silently break the interaction again. */
      if (leaves && typeof leaves.then === 'function') {
        leaves.then(function (fs) { fitLeaves(fs, fallbackCentre); })
              .catch(function () { map.easeTo({ center: fallbackCentre, zoom: map.getZoom() + 2, duration: 450 }); });
      } else {
        src.getClusterLeaves(clusterId, 10000, 0, function (err, fs) {
          if (err) map.easeTo({ center: fallbackCentre, zoom: map.getZoom() + 2, duration: 450 });
          else fitLeaves(fs, fallbackCentre);
        });
      }
    }

    function fitLeaves(fs, fallbackCentre) {
      if (!fs || !fs.length) {
        map.easeTo({ center: fallbackCentre, zoom: map.getZoom() + 2, duration: 450 });
        return;
      }
      var lo = [180, 90], hi = [-180, -90];
      fs.forEach(function (f) {
        var c = f.geometry.coordinates;
        lo[0] = Math.min(lo[0], c[0]); lo[1] = Math.min(lo[1], c[1]);
        hi[0] = Math.max(hi[0], c[0]); hi[1] = Math.max(hi[1], c[1]);
      });
      map.fitBounds([lo, hi], {
        padding: { top: 70, bottom: 90, left: 50, right: 50 },
        maxZoom: 16.5, duration: 700,
      });
      /* Below clusterMaxZoom the members would just re-cluster and the tap
         would look like it did nothing. */
      map.once('moveend', function () {
        if (map.getZoom() < 14.2) map.easeTo({ zoom: 14.2, duration: 250 });
      });
      self._handlers.cluster.forEach(function (fn) {
        fn(fs.map(function (f) { return f.properties.id; }));
      });
    }

    map.on('click', 'syn-cluster', function (e) {
      var f = map.queryRenderedFeatures(e.point, { layers: ['syn-cluster'] })[0];
      if (!f) return;
      frameCluster(f.properties.cluster_id, f.geometry.coordinates);
    });
    /* A circle with a number in it has to look pressable, or nobody presses
       it. The count layer sits on top of the circle and swallows the hover,
       so both need the cursor. */
    ['syn-cluster', 'syn-cluster-count'].forEach(function (id) {
      map.on('mouseenter', id, function () { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', id, function () { map.getCanvas().style.cursor = ''; });
      if (id === 'syn-cluster-count') {
        map.on('click', id, function (e) {
          var hit = map.queryRenderedFeatures(e.point, { layers: ['syn-cluster'] })[0];
          if (hit) frameCluster(hit.properties.cluster_id, hit.geometry.coordinates);
        });
      }
    });
  };

  /* ── the public verbs ──────────────────────────────────────────────────
     Everything above is MapLibre. Everything below is the contract the rest
     of the app is allowed to use. */

  /** properties: [{ id, lat, lng, price, beds, verified, score }] */
  Renderer.prototype.setProperties = function (list) {
    this._props = {
      type: 'FeatureCollection',
      features: (list || []).filter(function (p) {
        return typeof p.lat === 'number' && typeof p.lng === 'number';
      }).map(function (p) {
        return {
          type: 'Feature',
          id: p.id,
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: {
            id: p.id, price: p.price || '', beds: p.beds || '',
            verified: !!p.verified, score: p.score == null ? null : p.score,
            sel: false,
            /* Carried so a card can be opened straight from the marker the
               user pressed, with no second lookup and no second request. */
            title: p.title || '', loc: p.loc || '', img: p.img || '',
            href: p.href || '',
          },
        };
      }),
    };
    var src = this.map && this.map.getSource(SRC);
    if (src) src.setData(this._props);
    return this;
  };

  /** Highlight one home, and return the record so a caller can open a card
   *  without holding its own copy of the list. */
  Renderer.prototype.select = function (id) {
    if (!this.map) return null;
    this._sel = id;
    var found = null;
    this._props.features.forEach(function (f) {
      var on = f.properties.id === id;
      f.properties.sel = on;
      if (on) found = f;
    });
    var src = this.map.getSource(SRC);
    if (src) src.setData(this._props);
    return found ? {
      id: found.properties.id,
      lng: found.geometry.coordinates[0],
      lat: found.geometry.coordinates[1],
      props: found.properties,
    } : null;
  };

  Renderer.prototype.clearSelection = function () { return this.select(null); };

  Renderer.prototype.flyTo = function (lng, lat, zoom) {
    if (this.map) this.map.flyTo({ center: [lng, lat], zoom: zoom || 15, duration: 700 });
    return this;
  };

  Renderer.prototype.fit = function (list, pad) {
    if (!this.map || !list || !list.length) return this;
    var lo = [180, 90], hi = [-180, -90];
    list.forEach(function (p) {
      lo[0] = Math.min(lo[0], p.lng); lo[1] = Math.min(lo[1], p.lat);
      hi[0] = Math.max(hi[0], p.lng); hi[1] = Math.max(hi[1], p.lat);
    });
    if (lo[0] === hi[0] && lo[1] === hi[1]) return this.flyTo(lo[0], lo[1], 15);
    this.map.fitBounds([lo, hi], { padding: pad || 64, duration: 600, maxZoom: 16 });
    return this;
  };

  /** The box currently on screen, in the same shape onViewport reports. Needed
   *  because "search this area" is a decision taken at click time, not at the
   *  moment the map last stopped moving. */
  Renderer.prototype.viewport = function () {
    if (!this.map) return null;
    var b = this.map.getBounds();
    return {
      west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth(),
      zoom: this.map.getZoom(),
      centre: [this.map.getCenter().lng, this.map.getCenter().lat],
    };
  };

  /* ── OVERLAY PRIMITIVES ────────────────────────────────────────────────
     property.html draws things the matches map never needed: a home pin, a
     pin per nearby place, and lines for walking routes and commutes. Rather
     than let that page import MapLibre and break the one rule this file
     exists to keep, the facade grows the two primitives it actually needs.

     Markers are real DOM elements, not symbol layers. That is the right call
     here and the wrong one for five hundred listings: a DOM node per marker
     costs layout and does not cluster, which is exactly why the property
     layer above is a GeoJSON source instead. This map shows a dozen places
     around one house, where DOM markers keep the existing pin markup and CSS
     working untouched.

     EVERYTHING IS lng,lat. Leaflet took lat,lng and this page was written
     against Leaflet, so every call site has to flip. That is the single most
     likely thing to go silently wrong in the port -- a swapped pair does not
     throw, it just puts Ibadan in the Atlantic. */
  Renderer.prototype.marker = function (lng, lat, html, opts) {
    var gl = window.maplibregl, o = opts || {};
    var elm = document.createElement('div');
    elm.innerHTML = html;
    elm.style.cursor = o.onClick ? 'pointer' : '';
    if (o.onClick) elm.addEventListener('click', function (e) { e.stopPropagation(); o.onClick(); });
    var mk = new gl.Marker({ element: elm, anchor: o.anchor || 'bottom' })
      .setLngLat([lng, lat]);
    /* Parity with the bindPopup() this replaces. Kept because dropping it
       would be a quiet narrowing: some of these pins carry the only label the
       place has. */
    if (o.popupHtml) {
      mk.setPopup(new gl.Popup({ offset: 18, closeButton: false }).setHTML(o.popupHtml));
    }
    mk.addTo(this.map);
    this._overlay.markers.push(mk);
    return mk;
  };

  Renderer.prototype.line = function (lngLats, opts) {
    var o = opts || {}, map = this.map;
    var id = 'syn-ov-line-' + (this._overlay.seq++);
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: lngLats } },
    });
    map.addLayer({
      id: id, type: 'line', source: id,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': o.color || window.SynMapStyle.COLOURS.ink,
        'line-width': o.width || 4,
        'line-opacity': o.opacity == null ? 0.85 : o.opacity,
        'line-dasharray': o.dash || [1, 0],
      },
    });
    this._overlay.lines.push(id);
    return id;
  };

  /** One line, by the id line() returned. The walking route is drawn and
   *  erased on its own, without disturbing the pins around it. */
  Renderer.prototype.removeLine = function (id) {
    if (!id || !this.map) return this;
    if (this.map.getLayer(id)) this.map.removeLayer(id);
    if (this.map.getSource(id)) this.map.removeSource(id);
    this._overlay.lines = this._overlay.lines.filter(function (x) { return x !== id; });
    return this;
  };

  /** Remove everything added through marker() and line(). The equivalent of
   *  the layerGroup.clearLayers() this replaces. */
  Renderer.prototype.clearOverlay = function () {
    var map = this.map;
    this._overlay.markers.forEach(function (m) { m.remove(); });
    this._overlay.markers = [];
    this._overlay.lines.forEach(function (id) {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });
    this._overlay.lines = [];
    return this;
  };

  /** fit() takes listing records; this takes bare [lng,lat] pairs, which is
   *  what an overlay has. maxZoom matters: a single point fits to the source's
   *  maximum, which is close enough to read roof outlines and nothing else. */
  Renderer.prototype.fitPoints = function (lngLats, opts) {
    var o = opts || {};
    if (!this.map || !lngLats || !lngLats.length) return this;
    var lo = [180, 90], hi = [-180, -90];
    lngLats.forEach(function (c) {
      lo[0] = Math.min(lo[0], c[0]); lo[1] = Math.min(lo[1], c[1]);
      hi[0] = Math.max(hi[0], c[0]); hi[1] = Math.max(hi[1], c[1]);
    });
    if (lo[0] === hi[0] && lo[1] === hi[1]) {
      this.map.easeTo({ center: lo, zoom: o.maxZoom || 16, duration: o.duration || 500 });
      return this;
    }
    this.map.fitBounds([lo, hi], {
      padding: o.padding || 56,
      maxZoom: o.maxZoom || 16,
      duration: o.duration == null ? 600 : o.duration,
    });
    return this;
  };

  /** A tap on the map itself -- not on a marker, not on a pin, not on a
   *  cluster. The natural "never mind" gesture: you looked at a thing, you
   *  tap the space around it, you are back where you were. DOM markers stop
   *  their own clicks, and the layer handlers below run first for pins and
   *  clusters, so this only fires on genuinely empty map. */
  Renderer.prototype.onBackgroundClick = function (fn) {
    var map = this.map;
    map.on('click', function (e) {
      var hits = map.queryRenderedFeatures(e.point, {
        layers: ['syn-cluster', 'syn-prop-pin', 'syn-prop-dot'].filter(function (id) {
          return map.getLayer(id);
        }),
      });
      if (!hits.length) fn(e);
    });
    return this;
  };

  Renderer.prototype.onViewport = function (fn) { this._handlers.viewport.push(fn); return this; };
  Renderer.prototype.onSelect = function (fn) { this._handlers.select.push(fn); return this; };
  /** Fires with the ids inside a cluster the user just opened, so a caller
   *  can show that area's homes as a swipeable set rather than making them
   *  hunt for each pin. */
  Renderer.prototype.onCluster = function (fn) { this._handlers.cluster.push(fn); return this; };
  Renderer.prototype.resize = function () { if (this.map) this.map.resize(); return this; };

  /* ── carried over from the Leaflet build, because they were right ──────
     One finger scrolls the PAGE, two fingers move the map. Leaflet needed a
     capture-phase fight to achieve this; MapLibre exposes it directly, but the
     reasoning is unchanged: a map that eats the page scroll is a hole in the
     page, and every phone user has already learnt the two-finger convention
     from Google Maps. */
  Renderer.prototype._gestures = function () {
    if (!('ontouchstart' in window)) return;
    this.map.dragPan.disable();
    var map = this.map, el = this.map.getContainer();
    el.style.touchAction = 'pan-y';

    var hint = document.createElement('div');
    hint.className = 'syn-gesture-hint';
    hint.textContent = 'Use two fingers to move the map';
    el.appendChild(hint);
    var timer = null;

    el.addEventListener('touchstart', function (e) {
      if (e.touches.length >= 2) { map.dragPan.enable(); hint.classList.remove('on'); }
      else map.dragPan.disable();
    }, { passive: true, capture: true });
    el.addEventListener('touchmove', function (e) {
      if (e.touches.length < 2) {
        hint.classList.add('on');
        clearTimeout(timer);
        timer = setTimeout(function () { hint.classList.remove('on'); }, 1400);
      }
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) map.dragPan.disable();
    }, { passive: true, capture: true });
  };

  /* The credit is a licence condition, not a courtesy: OSM's data is ODbL and
     Stadia's terms require theirs. What is NOT required is that it eat a strip
     of every map on a phone, so it collapses to an ⓘ and opens on tap. */
  Renderer.prototype._credit = function () {
    var gl = window.maplibregl;
    /* NO customAttribution. MapLibre APPENDS it to whatever the style's
       sources already declare, and the openmaptiles source declares Stadia,
       OpenMapTiles and OpenStreetMap itself -- so passing our own printed
       every credit twice. The licences are satisfied by the source's string;
       adding a second copy was not more compliant, just wrong. */
    this.map.addControl(new gl.AttributionControl({ compact: true }), 'bottom-right');
  };

  window.SynMapRender = {
    create: function (el, opts) {
      var r = new Renderer(el, opts);
      /* A registry, because a map is unusually hard to inspect after the
         fact: the instance is closed over by whatever page created it, and
         nothing in the DOM points back at it. Two lines here is the
         difference between diagnosing a broken interaction in one step and
         guessing at it. */
      window.SynMapRender.instances.push(r);
      return r;
    },
    instances: [],
  };
})();
