/* eslint-disable */
// @ts-nocheck
/* Was public/app/map/style-synapse.js, a script of its own fetched by every page that used it. It is part of the app's code now:
   AfterHydration calls run() at the same point in the page's script order as the file used to load, so it behaves as before. */
export function run() {
/* ─────────────────────────────────────────────────────────────────────────────
   SYNAPSE MAP STYLE, white matter.

   THE BRIEF, LITERALLY: "make the map black and white like neurons in white
   matter, and change the shape and designs of things like schools." So: a
   near-white ground, the road network drawn as fine dark tracts the way
   myelinated axons read against white matter, every colour stripped out, and
   POIs redrawn as distinct geometric marks rather than the pictogram soup a
   general-purpose basemap ships with.

   WHY THIS FILE EXISTS AT ALL, AND WHY THE OLD MAP COULD NOT DO IT
   The app has been serving Stadia RASTER tiles (PNG images) through Leaflet.
   A PNG is a photograph of somebody else's design decisions: you cannot change
   its colour, you cannot change which places it shows, and you cannot change
   what a school looks like on it. Every visual instruction above is impossible
   on raster and routine on vector.

   Stadia's vector style is 53 layers over an OpenMapTiles source. We fetch
   THEIR style and transform it rather than hand-authoring one, for two
   reasons: their layer ordering and zoom ranges are the product of a lot of
   cartographic work we would otherwise be redoing badly, and when they fix or
   extend it we inherit that instead of drifting.

   THE MAP IS ALREADY COMPLETE, WHICH WAS THE OTHER HALF OF THE BRIEF.
   "Users might come to the application without looking for a house." They get
   a full map: every school, hospital, market and bus stop in OpenStreetMap is
   already inside these tiles, worldwide. Alidade Smooth simply declines to
   draw most of them -- `icon-image` is null on its POI layers and its filters
   admit only universities, hospitals and parks. The data was always there and
   was not being rendered. We turn it on, on our terms.

   NOTHING HERE KNOWS ABOUT PROPERTIES. This file styles the world; the
   property layer is added by the renderer on top. Keeping that seam clean is
   what lets the base map be useful to someone who never searches for a home.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* The ramp. Not a naive desaturation -- averaging the channels of a pale
     green park and a pale blue water gives two greys a few points apart, which
     reads as a muddy smudge rather than as a decision. Each surface is
     assigned its own value so the hierarchy is deliberate:

       paper      the ground everything sits on
       tract      the roads -- the darkest thing on the map, and the reason it
                  reads as white matter rather than as a blank page
       vessel     water, a touch darker than paper so coastline is legible
       tissue     parks, landcover: barely there
       ink        labels and our own marks */
  var C = {
    paper:      '#FCFCFB',
    tissue:     '#F4F4F2',
    building:   '#EFEFEC',
    vessel:     '#E6E7E4',
    tractFar:   '#B8B8B4',   /* minor roads, low zoom */
    tract:      '#8A8A86',   /* secondary */
    tractMajor: '#3A3A38',   /* motorway/trunk: the myelinated ones */
    rail:       '#C9C9C5',
    boundary:   '#D8D8D4',
    /* LABELS ARE INK, NOT GREY.
       These were one soft grey (#6E6E6A) for everything that was not a
       country or a city. On paper that clears AA against the near-white
       ground -- about 4.9:1 -- and on the map it still read as faint,
       because map labels are 10-11px, frequently sit over a building fill
       rather than over clean paper, and are surrounded by a white halo that
       eats into the stroke. A number that passes in the abstract can still
       be hard to read in place.

       So there is a hierarchy now instead of one value, and its darkest step
       is genuinely dark. A white-ground map with black linework should have
       black lettering; pale grey type was the one thing on this map still
       arguing with the design. */
    ink:        '#141412',   /* areas, suburbs, towns -- what you navigate by */
    label:      '#33332F',   /* street names, POI names */
    inkSoft:    '#5E5E59',   /* water, and anything deliberately recessive */
    halo:       '#FFFFFF',
  };

  /* Which source-layer a MapLibre layer draws from is a far better signal than
     its id, because ids are Stadia's naming and source-layers are the
     OpenMapTiles schema -- stable, documented, and the same across every
     vendor built on it. That is what makes this transform survive a restyle
     upstream, and what would let it work against a different vector host. */
  function recolour(layer) {
    var src = layer['source-layer'] || '';
    var id = layer.id || '';
    var t = layer.type;
    var paint = Object.assign({}, layer.paint || {});

    if (t === 'background') paint['background-color'] = C.paper;

    if (t === 'fill') {
      if (src === 'water' || src === 'waterway') paint['fill-color'] = C.vessel;
      else if (src === 'building') paint['fill-color'] = C.building;
      else if (src === 'park' || src === 'landcover' || src === 'landuse') paint['fill-color'] = C.tissue;
      else paint['fill-color'] = C.tissue;
      delete paint['fill-outline-color'];
    }

    if (t === 'line') {
      if (src === 'waterway') paint['line-color'] = C.vessel;
      else if (src === 'boundary') { paint['line-color'] = C.boundary; paint['line-dasharray'] = [2, 2]; }
      else if (/rail/.test(id)) paint['line-color'] = C.rail;
      /* The road hierarchy carries the whole design. Motorways and trunk roads
         are near-black; everything else recedes toward the paper. That spread
         is what makes the network read as structure instead of as texture. */
      else if (/motorway|trunk|highway_major/.test(id)) paint['line-color'] = C.tractMajor;
      else if (/primary|secondary/.test(id)) paint['line-color'] = C.tract;
      else paint['line-color'] = C.tractFar;
      /* Casings are the pale outline that separates a road from its
         neighbours on a colourful map. On a white one they just fatten the
         line and blur the network, so they go. */
      if (/casing/.test(id)) paint['line-color'] = C.paper;
    }

    if (t === 'symbol') {
      /* Place names are the thing a person actually navigates by -- "Bodija",
         "Agbowo", "Jericho" -- so every one of them is ink, not just the
         country and city tiers the original test caught. Water keeps the
         recessive grey deliberately: a lagoon label competing with a street
         name is the wrong way round. */
      paint['text-color'] =
        /^place[_-]/.test(id) ? C.ink
        : (src === 'water_name' || src === 'waterway') ? C.inkSoft
        : C.label;
      paint['text-halo-color'] = C.halo;
      /* Wider than before. The halo is what lets a label survive crossing a
         building fill or a road casing, and 1.4 was leaving the descenders
         to fight for themselves. */
      paint['text-halo-width'] = 1.7;
      paint['text-halo-blur'] = 0.3;
      delete paint['icon-color'];
    }

    layer.paint = paint;
    return layer;
  }

  /* ── OUR MARKS ──────────────────────────────────────────────────────────
     Drawn in a canvas at runtime and registered with map.addImage(), rather
     than shipped as a sprite sheet. Two reasons: a sprite is a build step and
     an asset to keep in sync, and more importantly these are parametric --
     one function, a shape per category, so adding "gym" later is three lines
     and not a trip through a design tool.

     Each is a distinct SILHOUETTE, not a pictogram. At 14px on a phone a
     drawing of a stethoscope and a drawing of a shopping trolley are the same
     grey blob; a cross and a circle are not. Shape does the work that detail
     cannot at this size, which is the whole reason the default POI icons were
     not worth turning on as they came. */
  var MARKS = {
    hospital:    'cross',
    pharmacy:    'crossOutline',
    school:      'triangle',
    university:  'diamond',
    supermarket: 'dot',
    market:      'dot',
    bank:        'bars',
    transit:     'rounded',
    park:        'leaf',
    restaurant:  'ring',
    cafe:        'ring',
    fuel:        'drop',
    police:      'shield',
  };

  /* PICTOGRAMS, NOT SHAPES (Eden, 2026-10-11: "there are icons that don't mean anything, plus
     circles, triangles ... get proper things to represent the structures"). The earlier marks were
     abstract silhouettes (a cross, a triangle, a dot), which read as nothing. Each place now gets a
     coloured badge carrying a drawing of what it is: a cap for a school, a cross in a square for a
     hospital, a bus, a cart, a bank building, a pump, a pill, a tree. The drawings are the same
     ones the rest of the app uses (icons.js), copied here as plain SVG so the map does not depend on
     load order. Places of worship are not drawn from the tiles: they cannot tell a church from a
     mosque, and a wrong symbol on a mosque is worse than none; the surveyed places on a home's own
     map do tell them apart. */
  var GLYPH = {
    school:   '<path d="M12 3l10 5-10 5L2 8z"/><path d="M6 10.3V15c0 1.4 2.9 2.7 6 2.7s6-1.3 6-2.7v-4.7"/><path d="M22 8v6.5"/>',
    hospital: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M12 8v8M8 12h8"/>',
    pharmacy: '<rect x="4.5" y="9" width="15" height="6.5" rx="3.25" transform="rotate(-40 12 12.25)"/><path d="m9.6 7.9 4.8 7.2"/>',
    cart:     '<circle cx="9" cy="20.5" r="1.3"/><circle cx="18" cy="20.5" r="1.3"/><path d="M2.5 3.5h2.3l2.6 12.3a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6l1.4-7.3H6.2"/>',
    bank:     '<path d="M3 9.5 12 4l9 5.5"/><path d="M4.5 9.5h15"/><path d="M6 12v6M10 12v6M14 12v6M18 12v6"/><path d="M3.5 20.5h17"/>',
    bus:      '<rect x="3.5" y="4" width="17" height="13" rx="2.5"/><path d="M3.5 11.5h17"/><circle cx="7.5" cy="19.5" r="1.5"/><circle cx="16.5" cy="19.5" r="1.5"/><path d="M7 7.5h3M14 7.5h3"/>',
    tree:     '<path d="M12 21v-6"/><path d="M12 15c-3.6 0-6-2.3-6-5.2 0-1.3.6-2.4 1.5-3.2C7.5 4.6 9.5 3 12 3s4.5 1.6 4.5 3.6c.9.8 1.5 1.9 1.5 3.2 0 2.9-2.4 5.2-6 5.2z"/><path d="M8.5 21h7"/>',
    food:     '<path d="M7.5 2.5v6.3a2 2 0 1 0 4 0V2.5M9.5 8.8v12.7"/><path d="M16 2.5c-1.4 0-2.3 1.9-2.3 4.2S14.6 11 16 11s2.3-2 2.3-4.3S17.4 2.5 16 2.5zM16 11v10.5"/>',
    cup:      '<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v2M11 3v2"/>',
    fuel:     '<path d="M5 20.5V4.5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 14 4.5v16"/><path d="M3.5 20.5h12"/><path d="M5 9h9"/><path d="M14 8h2.2a1.8 1.8 0 0 1 1.8 1.8v6a1.5 1.5 0 0 0 3 0V9l-2.5-2.5"/>',
    police:   '<path d="M12 2.8 4.5 5.5v6c0 4.6 3 7.9 7.5 9.7 4.5-1.8 7.5-5.1 7.5-9.7v-6z"/><path d="m12 8.2 1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z"/>'
  };
  var MARK_STYLE = {
    hospital: { g: 'hospital', c: '#C94040' }, pharmacy: { g: 'pharmacy', c: '#B3506B' },
    school: { g: 'school', c: '#2F6DBD' }, university: { g: 'school', c: '#2F6DBD' },
    supermarket: { g: 'cart', c: '#A8742B' }, market: { g: 'cart', c: '#A8742B' },
    bank: { g: 'bank', c: '#5A6B7A' }, transit: { g: 'bus', c: '#1D7A8C' },
    park: { g: 'tree', c: '#3F9C6D' }, restaurant: { g: 'food', c: '#C98B3A' },
    cafe: { g: 'cup', c: '#C98B3A' }, fuel: { g: 'fuel', c: '#7A6A3F' }, police: { g: 'police', c: '#4A5B8C' }
  };
  var GLYPH_IMG = {}, MARK_MAPS = [];
  function preloadGlyphs() {
    if (typeof Image === 'undefined') return;
    Object.keys(MARK_STYLE).forEach(function (kind) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#fff" '
        + 'stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' + GLYPH[MARK_STYLE[kind].g] + '</svg>';
      var img = new Image();
      img.onload = function () {
        GLYPH_IMG[kind] = img;
        /* A map that registered a plain disc before the drawing was ready gets the finished badge. */
        MARK_MAPS.forEach(function (m) {
          try { if (m.hasImage('syn-' + kind)) m.updateImage('syn-' + kind, drawMark(kind, 40)); } catch (e) { /* style swapping */ }
        });
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  preloadGlyphs();

  function drawMark(kind, px) {
    var s = px || 40;
    var cv = document.createElement('canvas');
    cv.width = s; cv.height = s;
    var x = cv.getContext('2d');
    var st = MARK_STYLE[kind] || { c: '#6B6B70' }, m = s / 2;
    /* a soft shadow, a white ring so the badge survives a dark trunk road, then the colour */
    x.shadowColor = 'rgba(20,20,18,0.28)'; x.shadowBlur = s * 0.08; x.shadowOffsetY = s * 0.03;
    x.fillStyle = '#FFFFFF';
    x.beginPath(); x.arc(m, m, s * 0.46, 0, Math.PI * 2); x.fill();
    x.shadowColor = 'transparent';
    x.fillStyle = st.c;
    x.beginPath(); x.arc(m, m, s * 0.39, 0, Math.PI * 2); x.fill();
    var g = GLYPH_IMG[kind];
    if (g) { var gs = s * 0.58; x.drawImage(g, m - gs / 2, m - gs / 2, gs, gs); }
    return x.getImageData(0, 0, s, s);
  }

  /* The POI layer Stadia ships draws almost nothing: icon-image is null and
     the filter admits universities, hospitals and parks only. This replaces it
     with one layer per mark, filtered on the OpenMapTiles `subclass`, so a
     school and a hospital are different shapes rather than two identical
     labels. Zoom gating is deliberate -- everything at once is noise, so the
     things you navigate by (hospitals, transit, schools) appear first and the
     everyday ones arrive as you close in. */
  var POI_MIN_ZOOM = {
    hospital: 12, transit: 12, university: 12, school: 13,
    supermarket: 14, market: 14, bank: 15, pharmacy: 15,
    park: 13, restaurant: 15.5, cafe: 15.5, fuel: 15,
    place_of_worship: 15, police: 14,
  };

  /* OpenMapTiles subclass values that mean the same thing to a person looking
     for somewhere to live. Kept explicit: the schema has hundreds of subclass
     values and guessing which ones matter is how a map ends up showing
     nightclubs and no pharmacies. */
  var SUBCLASS = {
    hospital: ['hospital', 'clinic', 'doctors'],
    pharmacy: ['pharmacy'],
    school: ['school', 'kindergarten'],
    university: ['university', 'college'],
    supermarket: ['supermarket', 'grocery', 'convenience'],
    market: ['marketplace'],
    bank: ['bank', 'atm'],
    transit: ['bus_station', 'bus_stop', 'railway_station', 'station'],
    park: ['park', 'garden', 'playground'],
    restaurant: ['restaurant', 'fast_food'],
    cafe: ['cafe'],
    fuel: ['fuel'],
    place_of_worship: ['place_of_worship'],
    police: ['police'],
  };

  function poiLayers() {
    return Object.keys(MARKS).map(function (kind) {
      return {
        id: 'syn-poi-' + kind,
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'poi',
        minzoom: POI_MIN_ZOOM[kind] || 14,
        filter: ['all', ['==', '$type', 'Point'], ['in', 'subclass'].concat(SUBCLASS[kind] || [kind])],
        layout: {
          'icon-image': 'syn-' + kind,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 16, 1.1, 18, 1.3],
          'icon-allow-overlap': false,
          'icon-padding': 6,
          /* Names arrive late. A label per POI at z13 is a wall of text; by
             z16 you are choosing between two specific places and the name is
             the whole point. */
          'text-field': ['step', ['zoom'], '', 16, ['coalesce', ['get', 'name:latin'], ['get', 'name'], '']],
          'text-font': ['Stadia Regular'],
          'text-size': 10.5,
          'text-anchor': 'top',
          'text-offset': [0, 0.9],
          'text-optional': true,
          'text-max-width': 8,
        },
        paint: {
          'text-color': C.label,
          'text-halo-color': C.halo,
          'text-halo-width': 1.7,
          'text-halo-blur': 0.3,
        },
      };
    });
  }

  /** Fetch Stadia's vector style and return it as ours. */
  /* ONE RETRY, because the common failure here is not "Stadia is down".
     It is a phone that changed cell on the way to the fetch, a laptop coming
     back from sleep, a hotel portal that has not let go yet -- all of which
     fail instantly and succeed instantly on a second ask a moment later. The
     whole map hangs off this one request: without it there is no basemap, no
     property pins, and no click handling, so it is worth asking twice before
     giving up. Two attempts, not a ladder -- if the second fails the caller
     shows its own honest failure rather than leaving the reader watching a
     blank box get no better. */
  function fetchStyle(url, tries) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('style ' + r.status);
      return r.json();
    }).catch(function (e) {
      if (tries <= 1) throw e;
      return new Promise(function (res) { setTimeout(res, 400); })
        .then(function () { return fetchStyle(url, tries - 1); });
    });
  }

  function load(styleName) {
    var name = styleName || 'alidade_smooth';
    return fetchStyle('https://tiles.stadiamaps.com/styles/' + encodeURIComponent(name) + '.json', 2)
      .then(function (style) {
        style.layers = (style.layers || [])
          /* Their POI and park-label layers are replaced wholesale by ours
             below; leaving them in means two competing sets of labels for the
             same places. */
          .filter(function (l) { return !/^poi_/.test(l.id || ''); })
          .map(recolour)
          .concat(poiLayers());
        return style;
      });
  }

  /** Register the marks. Must run after the style loads and again after any
   *  setStyle, because images do not survive a style swap. */
  function addMarks(map) {
    Object.keys(MARKS).forEach(function (kind) {
      var id = 'syn-' + kind;
      if (map.hasImage && map.hasImage(id)) return;
      try { map.addImage(id, drawMark(kind, 40), { pixelRatio: 2 }); } catch (e) { /* already there */ }
    });

  }

  /** THE SAFETY NET, and it has to be wired at CONSTRUCTION, not after
   *  'load'.
   *
   *  The POI layers are part of the STYLE, so the renderer holds layers
   *  pointing at 'syn-transit' the moment the style parses -- which is before
   *  addMarks() can possibly have run, because addMarks waits for 'load'. If a
   *  frame is drawn in that gap MapLibre asks for the image, finds nothing,
   *  and logs "Image syn-transit could not be loaded". Registering the handler
   *  after 'load' is therefore too late to stop the very warning it exists to
   *  stop -- which is exactly what happened on the first attempt at this fix.
   *
   *  It also covers the case addMarks's own comment admits to: images do not
   *  survive setStyle, so a style swap no longer depends on somebody
   *  remembering to call addMarks again.
   *
   *  Once per map, and only ever for ids we own. */
  function wireMissingMarks(map) {
    if (!map || map.__synMarksWired) return;
    map.__synMarksWired = true;
    MARK_MAPS.push(map);

    /* ONE SHOT WAS THE WHOLE PROBLEM. addMarks() was called once, from the
       'load' handler, and every one of its addImage() calls threw because the
       style was not ready yet -- then the bare catch swallowed all fourteen.
       The map spent the session with no marks at all and one console warning
       to show for it, which is precisely the failure a silent catch buys you.

       'styledata' fires whenever style data lands, including after a setStyle,
       so registering here means the marks are put back at every moment they
       CAN be registered rather than at one moment we hoped they could. It is
       idempotent -- addMarks skips what is already present -- so firing
       several times costs a hasImage check each. */
    map.on('styledata', function () { addMarks(map); });

    map.on('styleimagemissing', function (e) {
      var id = e && e.id;
      if (!id || id.indexOf('syn-') !== 0) return;
      var kind = id.slice(4);
      if (!MARKS[kind] || (map.hasImage && map.hasImage(id))) return;
      try { map.addImage(id, drawMark(kind, 40), { pixelRatio: 2 }); } catch (err) { /* raced us to it */ }
    });
  }

  window.SynMapStyle = { load: load, addMarks: addMarks, wireMissingMarks: wireMissingMarks,
                         COLOURS: C, MARKS: MARKS };
})();

}
