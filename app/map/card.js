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
      '.syn-mcard{position:absolute;z-index:6;left:10px;right:10px;bottom:10px;',
      '  max-width:390px;margin:0 auto;background:#fff;border:1px solid #E7E7E3;',
      '  border-radius:18px;box-shadow:0 18px 44px rgba(20,20,18,.16);',
      '  display:none;overflow:hidden;font-family:var(--f-sans,system-ui,sans-serif);}',
      '.syn-mcard.on{display:block;}',
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
      '.syn-mcard-x{position:absolute;top:8px;right:8px;width:28px;height:28px;border:0;',
      '  background:rgba(255,255,255,.92);border-radius:50%;cursor:pointer;font-size:16px;',
      '  line-height:1;color:#55554F;}',
      '.syn-mcard-nav{display:flex;align-items:center;justify-content:space-between;',
      '  padding:0 12px 10px;font-size:11.5px;color:#8A8A84;}',
      '.syn-mcard-nav button{border:1px solid #E4E4E0;background:#fff;border-radius:8px;',
      '  width:34px;height:30px;cursor:pointer;font-size:15px;color:#33332F;}',
      '.syn-mcard-nav button[disabled]{opacity:.35;cursor:default;}',
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
      + '<div class="syn-mcard-cta">'
      + '<a class="pri" data-open href="#">See this home</a>'
      + '<a data-ask href="#">Ask Tayo</a>'
      + '</div>';
    host.appendChild(el);

    var q = function (s) { return el.querySelector(s); };
    var set = null, idx = 0;

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
        var hiddenByCard = pt.y > box.height - (el.offsetHeight + 24);
        var offScreen = pt.x < 0 || pt.y < 0 || pt.x > box.width || pt.y < 0;
        if (hiddenByCard || offScreen) {
          m.easeTo({ center: [rec.lng, rec.lat], offset: [0, -(el.offsetHeight / 2)], duration: 420 });
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
