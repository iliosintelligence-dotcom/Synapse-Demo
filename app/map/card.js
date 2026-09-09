/* ─────────────────────────────────────────────────────────────────────────────
   SynMapCard — what happens when you press a home.

   THE INTERACTION THIS REPLACES
   Pressing a price pin used to open a Leaflet popup naming the home, with a
   link out to its own page. So the shape of looking at three homes was:
   map, pin, page, back, map, pin, page, back — and every "back" threw away the
   viewport, the zoom and the sense of where you were.

   This card floats OVER the map instead. The map stays live behind it, the
   camera nudges just enough that the card is not sitting on its own pin, and
   the arrows step through the other homes nearby without closing anything. The
   property page stops being where you are sent and becomes somewhere you
   choose to go.

   It knows nothing about MapLibre. It takes a renderer that exposes select()
   and easeTo-ish behaviour, so it survives the provider being swapped — the
   same discipline render.js follows.

   CSS is injected once rather than living in three page stylesheets, because
   this is used by browse, Tayo and the agency portal and three copies is three
   things to forget. */
(function () {
  'use strict';

  function css() {
    if (document.getElementById('syn-mapcard-css')) return;
    var st = document.createElement('style');
    st.id = 'syn-mapcard-css';
    st.textContent = [
      /* THE CARD STOPS SITTING IN THE MIDDLE OF THE MAP.
         It used to be left:10 right:10 margin:auto -- centred along the
         bottom edge. On the matches map and the one in the chat that is a
         250px-tall strip, so a card tall enough to carry a photo, a price and
         the Nearby block covered the map almost entirely. You pressed a home
         to look at where it is and the answer was hidden by the reply.

         So it moves to one side and stays out of the middle third. RIGHT,
         and always right: expanded, the brief is the bottom-right corner, and
         a card that swapped sides when the map grew would be harder to find
         than one that never moves.

         The bottom-sheet layout below is still the fallback, because a side
         card needs a map wide enough to stand beside -- see place(). */
      '.syn-mcard{position:absolute;z-index:6;left:10px;right:10px;bottom:10px;',
      '  max-width:390px;margin:0 auto;background:#fff;border:1px solid #E7E7E3;',
      '  border-radius:18px;box-shadow:0 18px 44px rgba(20,20,18,.16);',
      /* Capped to the map it floats in. The Nearby block made the card tall
         enough to overflow a short map container, pushing the price and title
         off the top -- the two things the card exists to show. It scrolls
         inside itself now rather than growing past its own frame. */
      '  display:none;overflow-y:auto;overscroll-behavior:contain;',
      '  max-height:calc(100% - 20px);',
      '  font-family:var(--f-sans,system-ui,sans-serif);}',
      '.syn-mcard.on{display:block;}',
      /* Width comes from place(), which sizes it against the map so the
         middle third is never crossed. */
      '.syn-mcard.side{left:auto;right:12px;bottom:12px;margin:0;',
      '  width:var(--syn-mcard-w,320px);max-width:none;max-height:calc(100% - 24px);}',
      /* At a third of a narrow map there is not room for an 82px photo and a
         price side by side, and the price is the one that has to survive. */
      '.syn-mcard.side .syn-mcard-img{width:60px;height:60px;border-radius:10px;}',
      '.syn-mcard.side .syn-mcard-row{gap:9px;padding:11px;}',
      '.syn-mcard-row{display:flex;gap:12px;padding:12px;align-items:flex-start;}',
      '.syn-mcard-img{width:82px;height:82px;flex:none;border-radius:12px;',
      '  background:#F2F2EF center/cover no-repeat;display:flex;align-items:center;',
      '  justify-content:center;font-size:10px;color:#8A8A84;text-align:center;}',
      '.syn-mcard-main{flex:1;min-width:0;}',
      '.syn-mcard-price{font:700 19px/1.15 var(--f-sans,system-ui);color:#141412;}',
      '.syn-mcard-ttl{font-size:13px;color:#33332F;margin-top:3px;overflow:hidden;',
      '  text-overflow:ellipsis;white-space:nowrap;}',
      '.syn-mcard-loc{font-size:12px;color:#6E6E68;margin-top:2px;}',
      '.syn-mcard-chips{display:flex;gap:5px;margin-top:7px;flex-wrap:wrap;}',
      '.syn-mcard-chip{font:600 10.5px var(--f-sans,system-ui);padding:3px 8px;',
      '  border-radius:100px;border:1px solid #E4E4E0;color:#45453F;background:#FAFAF8;}',
      '.syn-mcard-chip.ok{border-color:#C9DFCE;color:#2E6B45;background:#F3F9F5;}',
      '.syn-mcard-chip.no{border-color:#E6DCC9;color:#7A6320;background:#FBF8F1;}',
      '.syn-mcard-cta{display:flex;gap:8px;padding:0 12px 12px;}',
      '.syn-mcard-cta a,.syn-mcard-cta button{flex:1;min-height:42px;border-radius:11px;',
      '  cursor:pointer;font:600 13px var(--f-sans,system-ui);border:1px solid #E0E0DC;',
      '  background:#fff;color:#1B1B18;display:flex;align-items:center;',
      '  justify-content:center;text-decoration:none;}',
      '.syn-mcard-cta .pri{background:#141412;border-color:#141412;color:#fff;}',
      '.syn-mcard-x{position:sticky;float:right;top:8px;right:8px;margin:0 0 -28px;width:28px;height:28px;border:0;',
      '  background:rgba(255,255,255,.92);border-radius:50%;cursor:pointer;font-size:16px;',
      '  line-height:1;color:#55554F;}',
      '.syn-mcard-nav{display:flex;align-items:center;justify-content:space-between;',
      '  padding:0 12px 10px;font-size:11.5px;color:#8A8A84;}',
      '.syn-mcard-nav button{border:1px solid #E4E4E0;background:#fff;border-radius:8px;',
      '  width:34px;height:30px;cursor:pointer;font-size:15px;color:#33332F;}',
      '.syn-mcard-nav button[disabled]{opacity:.35;cursor:default;}',
      '.syn-mcard-near{border-top:1px solid #F0F0EC;padding:10px 12px 0;}',
      '.syn-mcard-near h6{margin:0 0 6px;font:700 10px var(--f-sans,system-ui);',
      '  letter-spacing:.12em;text-transform:uppercase;color:#8A8A84;}',
      '.syn-mcard-near ul{margin:0;padding:0;list-style:none;}',
      '.syn-mcard-near li{display:flex;gap:8px;align-items:baseline;',
      '  font-size:12px;color:#45453F;padding:2px 0;}',
      '.syn-mcard-near .cat{flex:none;width:74px;color:#8A8A84;text-transform:capitalize;}',
      '.syn-mcard-near .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;',
      '  white-space:nowrap;color:#33332F;}',
      '.syn-mcard-near .m{flex:none;font-variant-numeric:tabular-nums;color:#141412;font-weight:600;}',
      '.syn-mcard-near .none{font-size:12px;color:#8A8A84;padding-bottom:2px;}',
    ].join('');
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * @param renderer  a SynMapRender instance (already ready())
   * @param host      the element the map lives in; the card is appended to it
   * @param opts.href function(id) -> the property page url
   * @param opts.ask  function(id) -> a url for "Ask Tayo about this", or null
   */
  function attach(renderer, host, opts) {
    css();
    var o = opts || {};
    var el = document.createElement('div');
    el.className = 'syn-mcard';
    el.innerHTML =
      '<button class="syn-mcard-x" type="button" aria-label="Close">&#215;</button>'
      + '<div class="syn-mcard-row">'
      + '<div class="syn-mcard-img" data-img>no photo</div>'
      + '<div class="syn-mcard-main">'
      + '<div class="syn-mcard-price" data-price></div>'
      + '<div class="syn-mcard-ttl" data-ttl></div>'
      + '<div class="syn-mcard-loc" data-loc></div>'
      + '<div class="syn-mcard-chips" data-chips></div>'
      + '</div></div>'
      + '<div class="syn-mcard-nav" data-nav hidden>'
      + '<button type="button" data-prev>&#8249;</button>'
      + '<span data-count></span>'
      + '<button type="button" data-next>&#8250;</button>'
      + '</div>'
      + '<div class="syn-mcard-near" data-near hidden></div>'
      + '<div class="syn-mcard-cta">'
      + '<a class="pri" data-open href="#">See this home</a>'
      + '<a data-ask href="#">Ask Tayo</a>'
      + '</div>';
    host.appendChild(el);

    var q = function (s) { return el.querySelector(s); };
    var set = null, idx = 0;

    /* ── WHERE THE CARD STANDS ───────────────────────────────────────────
       Measured against the map, not the viewport. The same card is used by
       the matches page (1058px of map), the chat (795px) and the agency
       portal panel, and a viewport media query cannot tell those apart --
       they are all the same browser window.

       The rule is the brief's: the middle third of the map stays completely
       visible. A card pinned right may therefore be at most a third of the
       width, less the gutter it sits in. Where that leaves too little to read
       a price in, there is no side to stand on and the bottom sheet is the
       honest answer -- which is also the phone case. */
    var CARD_MIN = 240, CARD_MAX = 360;

    function place() {
      var w = host.clientWidth || 0;
      var third = Math.floor(w / 3) - 16;
      if (third >= CARD_MIN) {
        el.style.setProperty('--syn-mcard-w', Math.min(CARD_MAX, third) + 'px');
        el.classList.add('side');
      } else {
        el.classList.remove('side');
        el.style.removeProperty('--syn-mcard-w');
      }
    }
    place();
    /* The matches page toggles a map view that changes the container's height
       and width, and a window resize changes both -- so this is re-measured
       rather than decided once at attach time. */
    if (window.ResizeObserver) new ResizeObserver(place).observe(host);
    else window.addEventListener('resize', place);

    /* ── WHAT IS ACTUALLY AROUND THIS HOME ──────────────────────────────
       property_places has been filling up since the enrichment pipeline was
       built and nothing has ever read it: 973 rows, seventeen categories,
       every one carrying a measured distance. This is the first surface that
       shows any of it.

       DISTANCE ONLY, AND ON PURPOSE. The table has drive_seconds columns and
       they are NULL on every row, because the Routes API is not billed. "8
       minutes to Dugbe" would be invented; "Ibadan Central Hospital, 522 m"
       is measured. So the card offers the one it can stand behind.

       Fetched when the card opens rather than with the listings: nobody needs
       the surroundings of five hundred homes, only of the one they pressed.
       Cached per property, because stepping back and forth through a cluster
       would otherwise re-ask for the same rows. */
    var nearCache = {};

    function renderNear(id) {
      var box = q('[data-near]');
      if (!o.sb) { box.hidden = true; return; }

      if (nearCache[id]) { paintNear(box, nearCache[id]); return; }
      box.hidden = false;
      box.innerHTML = '<h6>Nearby</h6><div class="none">Looking\u2026</div>';

      fetch(o.sb.url + '/rest/v1/rpc/property_nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: o.sb.anon, Authorization: 'Bearer ' + o.sb.anon,
        },
        body: JSON.stringify({ p_property_id: id, p_per_category: 1 }),
      })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          nearCache[id] = rows || [];
          /* The card may already have moved on to another home while this was
             in flight -- stepping through a cluster is faster than a request. */
          if (renderNear.current === id) paintNear(box, nearCache[id]);
        })
        .catch(function () {
          nearCache[id] = [];
          if (renderNear.current === id) paintNear(box, []);
        });
    }

    /* Which categories earn the space. A card is not a directory: four rows
       is the most that can be read at a glance, and these are the four that
       decide whether somebody could actually live somewhere. Ordered by what
       the data says is closest, not by this list. */
    var WANTED = ['transit', 'hospital', 'school', 'supermarket', 'market',
      'pharmacy', 'bank', 'university', 'park'];

    function paintNear(box, rows) {
      var pick = (rows || [])
        .filter(function (r) { return WANTED.indexOf(r.category) !== -1; })
        .slice(0, 4);
      if (!pick.length) {
        /* Honest about the gap. A listing whose surroundings have not been
           fetched yet is not a listing with nothing around it, and saying
           nothing at all would let the reader assume the latter. */
        box.innerHTML = '<h6>Nearby</h6>'
          + '<div class="none">Not mapped yet \u2014 this one is still being checked.</div>';
        return;
      }
      box.innerHTML = '<h6>Nearby</h6><ul>' + pick.map(function (r) {
        var m = r.nearest_m >= 1000
          ? (Math.round(r.nearest_m / 100) / 10) + ' km'
          : r.nearest_m + ' m';
        return '<li><span class="cat">' + esc(r.category) + '</span>'
          + '<span class="nm">' + esc(r.nearest_name || '') + '</span>'
          + '<span class="m">' + m + '</span></li>';
      }).join('') + '</ul>';
    }

    /* `how`, not `opts` -- attach()'s own opts is captured as `o` above and a
       second `opts` in here shadows it. It happens to be harmless because
       nothing below reads the outer one directly, which is exactly the kind of
       accident that stops being harmless during the next edit. */
    function show(id, how) {
      var moveCamera = !(how && how.moveCamera === false);
      var rec = renderer.select(id);
      if (!rec) { hide(); return; }
      var p = rec.props;
      q('[data-price]').textContent = p.price || '';
      q('[data-ttl]').textContent = p.title || '';
      q('[data-loc]').textContent = p.loc || '';

      var img = q('[data-img]');
      if (p.img) { img.style.backgroundImage = 'url("' + p.img + '")'; img.textContent = ''; }
      else { img.style.backgroundImage = ''; img.textContent = 'no photo'; }

      /* Verification is the one claim on this card that must never be
         decorative: it is the thing Synapse is for. An unverified home says so
         plainly rather than being left blank and read as verified. */
      var ver = (p.verified === true || p.verified === 'true');
      q('[data-chips]').innerHTML =
        '<span class="syn-mcard-chip">' + esc(p.beds || '—') + '</span>'
        + '<span class="syn-mcard-chip ' + (ver ? 'ok' : 'no') + '">'
        + (ver ? 'Verified' : 'Not verified') + '</span>';

      var nav = q('[data-nav]');
      if (set && set.length > 1) {
        nav.hidden = false;
        q('[data-count]').textContent = (idx + 1) + ' of ' + set.length + ' here';
        q('[data-prev]').disabled = idx === 0;
        q('[data-next]').disabled = idx === set.length - 1;
      } else { nav.hidden = true; }

      q('[data-open]').setAttribute('href', o.href ? o.href(id) : '#');
      var ask = q('[data-ask]');
      if (o.ask) { ask.hidden = false; ask.setAttribute('href', o.ask(id)); }
      else ask.hidden = true;

      renderNear.current = id;
      renderNear(id);

      el.classList.add('on');

      /* THE CAMERA ONLY MOVES WHEN IT HAS TO.
         This used to easeTo on every show(), which broke two things at once.
         Opening a cluster starts a fitBounds to frame its members, and an
         easeTo fired a moment later CANCELS it -- so tapping "68" opened a
         card and left the map exactly where it was, which read as the tap
         having half-worked. And stepping through 68 homes with the arrows
         lurched the map on every press.

         So: move only if the marker is off screen, or low enough that the
         card would be sitting on top of it. Otherwise leave the view alone --
         the user chose it. */
      if (moveCamera && renderer.map) {
        var m = renderer.map;
        var pt = m.project([rec.lng, rec.lat]);
        var box = m.getContainer().getBoundingClientRect();
        var cb = el.getBoundingClientRect();

        /* THE CARD'S ACTUAL RECTANGLE, not an assumption about where it is.
           This used to test `pt.y > height - (cardHeight + 24)` -- true for
           any pin in the bottom band of the map, which was right only while
           the card spanned the full width. Against a card pinned to one third
           of the right it moves the camera for pins that were never covered,
           and the whole point of this block is to leave the view alone when
           it can. */
        var pad = 18;
        var behindCard = pt.x > (cb.left - box.left) - pad
          && pt.x < (cb.right - box.left) + pad
          && pt.y > (cb.top - box.top) - pad
          && pt.y < (cb.bottom - box.top) + pad;

        /* `pt.y < 0` was written twice and `pt.y > box.height` not at all, so
           a pin below the map's bottom edge did not count as off screen. */
        var offScreen = pt.x < 0 || pt.y < 0 || pt.x > box.width || pt.y > box.height;

        if (behindCard || offScreen) {
          /* Put the pin in the part of the map that is still showing. With
             the card on the right that is left of centre; with the bottom
             sheet it is above centre, as before. */
          var off = el.classList.contains('side')
            ? [-(cb.width / 2 + 10), 0]
            : [0, -(el.offsetHeight / 2)];
          m.easeTo({ center: [rec.lng, rec.lat], offset: off, duration: 420 });
        }
      }
    }

    function hide() {
      el.classList.remove('on');
      set = null;
      renderer.clearSelection();
    }

    function step(d) {
      if (!set || !set.length) return;
      idx = Math.max(0, Math.min(set.length - 1, idx + d));
      show(set[idx]);
    }

    q('.syn-mcard-x').addEventListener('click', hide);
    q('[data-prev]').addEventListener('click', function () { step(-1); });
    q('[data-next]').addEventListener('click', function () { step(1); });

    renderer.onSelect(function (id) { set = null; idx = 0; show(id); });
    /* Opening a cluster makes that area's homes the set you can page through,
       which is what turns "68 homes here" from a number into something you can
       actually work through without hunting for each pin. */
    renderer.onCluster(function (ids) {
      set = ids || null; idx = 0;
      /* The renderer is already flying the camera to frame this cluster's
         members; touching it here would cancel that mid-flight. */
      if (set && set.length) show(set[0], { moveCamera: false });
    });

    return { show: show, hide: hide, el: el };
  }

  window.SynMapCard = { attach: attach };
})();
