/* ─────────────────────────────────────────────────────────────────────────────
   SYNAPSE MAP STYLE — white matter.

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
    place_of_worship: 'arch',
    police:      'shield',
  };

  function drawMark(kind, px) {
    var s = px || 22;
    var cv = document.createElement('canvas');
    cv.width = s; cv.height = s;
    var x = cv.getContext('2d');
    var m = s / 2, r = s * 0.30;

    /* A white disc under every mark. The road network is the darkest thing on
       this map by design, and a dark glyph dropped straight onto a trunk road
       disappears into it. */
    x.fillStyle = 'rgba(255,255,255,0.92)';
    x.beginPath(); x.arc(m, m, s * 0.44, 0, Math.PI * 2); x.fill();

    x.strokeStyle = C.ink; x.fillStyle = C.ink;
    x.lineWidth = Math.max(1.4, s * 0.085);
    x.lineJoin = 'round'; x.lineCap = 'round';

    switch (kind) {
      case 'cross':
        x.beginPath();
        x.moveTo(m, m - r); x.lineTo(m, m + r);
        x.moveTo(m - r, m); x.lineTo(m + r, m);
        x.stroke(); break;
      case 'crossOutline':
        x.lineWidth = Math.max(1.1, s * 0.06);
        x.beginPath();
        x.moveTo(m, m - r); x.lineTo(m, m + r);
        x.moveTo(m - r, m); x.lineTo(m + r, m);
        x.stroke(); break;
      case 'triangle':
        x.beginPath();
        x.moveTo(m, m - r); x.lineTo(m + r, m + r * 0.8); x.lineTo(m - r, m + r * 0.8);
        x.closePath(); x.fill(); break;
      case 'diamond':
        x.beginPath();
        x.moveTo(m, m - r); x.lineTo(m + r, m); x.lineTo(m, m + r); x.lineTo(m - r, m);
        x.closePath(); x.fill(); break;
      case 'dot':
        x.beginPath(); x.arc(m, m, r * 0.72, 0, Math.PI * 2); x.fill(); break;
      case 'ring':
        x.beginPath(); x.arc(m, m, r * 0.66, 0, Math.PI * 2); x.stroke(); break;
      case 'bars':
        x.lineWidth = Math.max(1.2, s * 0.07);
        [-r * 0.55, 0, r * 0.55].forEach(function (dx) {
          x.beginPath(); x.moveTo(m + dx, m - r * 0.7); x.lineTo(m + dx, m + r * 0.7); x.stroke();
        }); break;
      case 'rounded':
        x.beginPath();
        if (x.roundRect) x.roundRect(m - r * 0.8, m - r * 0.8, r * 1.6, r * 1.6, r * 0.4);
        else x.rect(m - r * 0.8, m - r * 0.8, r * 1.6, r * 1.6);
        x.stroke(); break;
      case 'leaf':
        x.beginPath();
        x.ellipse(m, m, r * 0.55, r * 0.85, Math.PI / 4, 0, Math.PI * 2);
        x.stroke(); break;
      case 'drop':
        x.beginPath();
        x.moveTo(m, m - r); x.quadraticCurveTo(m + r * 0.9, m + r * 0.2, m, m + r);
        x.quadraticCurveTo(m - r * 0.9, m + r * 0.2, m, m - r);
        x.fill(); break;
      case 'arch':
        x.beginPath();
        x.arc(m, m + r * 0.2, r * 0.7, Math.PI, 0);
        x.stroke(); break;
      case 'shield':
        x.beginPath();
        x.moveTo(m, m - r); x.lineTo(m + r * 0.75, m - r * 0.35);
        x.lineTo(m, m + r); x.lineTo(m - r * 0.75, m - r * 0.35);
        x.closePath(); x.stroke(); break;
      default:
        x.beginPath(); x.arc(m, m, r * 0.5, 0, Math.PI * 2); x.stroke();
    }
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
          'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.55, 16, 0.8, 18, 1],
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
  function load(styleName) {
    var name = styleName || 'alidade_smooth';
    return fetch('https://tiles.stadiamaps.com/styles/' + encodeURIComponent(name) + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error('style ' + r.status);
        return r.json();
      })
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
      try { map.addImage(id, drawMark(MARKS[kind], 22), { pixelRatio: 2 }); } catch (e) { /* already there */ }
    });
  }

  window.SynMapStyle = { load: load, addMarks: addMarks, COLOURS: C, MARKS: MARKS };
})();
