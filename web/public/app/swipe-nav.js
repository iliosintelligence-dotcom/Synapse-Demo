/* SynSwipe: the one shared swipe helper (PRD: web/docs/PRD-swipe-navigation.md, "Gesture rules").
 *
 * Mobile only (pointer: coarse and width under 820px). Everywhere else SynSwipe.enabled() is false and attach() does nothing.
 *
 *   var off = SynSwipe.attach(el, {
 *     canGo:    function (dir) { return true; },            // dir is 'left' or 'right' (the finger's direction)
 *     onMove:   function (dx, owned) {},                    // follow the finger; dx is raw travel in px
 *     onCancel: function () {},                             // released without committing: snap back
 *     onCommit: function (dir) {},                          // committed swipe: navigate
 *     onFirstTouch: function () {},                         // prefetch the neighbour
 *     onOwned:  function () {}                              // the gesture is horizontal and ours (dismiss hints)
 *   });
 *
 * Listeners are all passive and preventDefault is never called: the surface that uses attach() sets `touch-action: pan-y pinch-zoom`
 * on the swipe area in CSS, so the browser itself leaves horizontal drags to us and still scrolls vertically and zooms. Nothing is
 * ever cancelled near the screen edge, which stays with iOS back-swipe and Android gesture-back.
 *
 * Analytics go only through the page's existing gtag (consent is denied by default and granted by the cookie banner (ConsentBanner.tsx), so denied consent
 * means no events). Without gtag every call here is a no-op.
 */
(function () {
  if (window.SynSwipe) return;

  var COMMIT_PX = 64, FAST_PX = 40, FAST_V = 0.5, RATIO = 1.8, MAX_MS = 700;
  var AXIS_PX = 10, EDGE_PX = 28, LONGPRESS_MS = 400;
  var IGNORE = 'input,textarea,select,[contenteditable],[data-noswipe],.maplibregl-map,.mapboxgl-map,canvas,'
    + '#deck,.thumbs,.sim,.pvc-tabs,.rl-track,.pr-grid,.hf-track,.car-track,.m-hero-chips,#lightbox,.lightbox';
  var LAST_KEY = 'syn_swipe_last', HINT_KEY = 'syn_swipe_hint_v1';

  var mq = window.matchMedia ? {
    coarse: window.matchMedia('(pointer: coarse)'),
    narrow: window.matchMedia('(max-width: 819px)'),
    reduce: window.matchMedia('(prefers-reduced-motion: reduce)')
  } : null;

  function enabled() { return !!(mq && mq.coarse.matches && mq.narrow.matches); }
  function reducedMotion() { return !!(mq && mq.reduce.matches); }

  /* The dead edge is 28px, or the Capacitor inset when that is larger. */
  function edge(side) {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--syn-native-' + side));
    return Math.max(EDGE_PX, isNaN(v) ? 0 : v);
  }

  function blocked(target, root) {
    var n = target && target.nodeType === 1 ? target : target && target.parentElement;
    for (; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.matches && n.matches(IGNORE)) return true;
      var ox = getComputedStyle(n).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true;
      if (n === root) break;
    }
    return false;
  }

  function hasSelection() {
    try { return !!(window.getSelection && String(window.getSelection()).length); } catch (e) { return false; }
  }

  function attach(el, o) {
    if (!el || !enabled()) return function () {};
    var s = null, first = true;

    function reset(cancelled) {
      if (!s) return;
      clearTimeout(s.lp);
      var was = s; s = null;
      if (cancelled && was.owned && o.onCancel) o.onCancel();
    }

    function start(e) {
      if (!enabled()) return;
      if (e.touches.length > 1) { reset(true); return; }          // multi-touch: pinch, not swipe
      var t = e.touches[0];
      if (t.clientX < edge('left') || t.clientX > window.innerWidth - edge('right')) { s = null; return; }
      if (blocked(e.target, el) || hasSelection()) { s = null; return; }
      if (first) { first = false; if (o.onFirstTouch) o.onFirstTouch(); }
      s = { x: t.clientX, y: t.clientY, t: Date.now(), axis: null, owned: false, dx: 0, dy: 0 };
      s.lp = setTimeout(function () { if (s && !s.axis) s = null; }, LONGPRESS_MS); // long press without movement: selection wins
    }

    function move(e) {
      if (!s) return;
      if (e.touches.length > 1) { reset(true); return; }
      var t = e.touches[0];
      s.dx = t.clientX - s.x; s.dy = t.clientY - s.y;
      if (!s.axis) {
        if (Math.abs(s.dx) < AXIS_PX && Math.abs(s.dy) < AXIS_PX) return;
        clearTimeout(s.lp);
        if (Math.abs(s.dx) <= Math.abs(s.dy) || hasSelection()) { s = null; return; } // vertical (or selecting): not ours
        var dir0 = s.dx > 0 ? 'right' : 'left';
        if (o.canGo && !o.canGo(dir0)) { s = null; return; }
        s.axis = 'x'; s.owned = true;
        if (o.onOwned) o.onOwned();
      }
      if (o.onMove) o.onMove(s.dx, true);
    }

    function end() {
      if (!s) return;
      var g = s, dt = Date.now() - g.t, adx = Math.abs(g.dx), ady = Math.abs(g.dy);
      reset(false);
      if (!g.owned) return;
      var fast = adx >= FAST_PX && adx / Math.max(dt, 1) > FAST_V;
      var ok = (adx >= COMMIT_PX || fast) && adx >= RATIO * ady && dt < MAX_MS && !hasSelection();
      var dir = g.dx > 0 ? 'right' : 'left';
      if (ok && (!o.canGo || o.canGo(dir))) { if (o.onCommit) o.onCommit(dir); }
      else if (o.onCancel) o.onCancel();
    }

    var P = { passive: true };
    el.addEventListener('touchstart', start, P);
    el.addEventListener('touchmove', move, P);
    el.addEventListener('touchend', end, P);
    el.addEventListener('touchcancel', function () { reset(true); }, P);
    return function () {
      el.removeEventListener('touchstart', start, P);
      el.removeEventListener('touchmove', move, P);
      el.removeEventListener('touchend', end, P);
    };
  }

  /* ── analytics (gtag only; inert when absent) ───────────────────────────── */
  function track(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) { /* never break the page */ }
  }

  /* A hop followed by the opposite hop within 3s is the accidental-swipe signal. The only thing stored is this one short
     sessionStorage record: surface, from, to, time. No personal data. */
  function hop(surface, dir, from, to, method) {
    var now = Date.now();
    try {
      var prev = JSON.parse(sessionStorage.getItem(LAST_KEY) || 'null');
      if (prev && prev.surface === surface && prev.from === to && prev.to === from && now - prev.t < 3000) {
        track('swipe_reversed', { surface: surface, direction: dir, from: from, to: to, method: method });
      }
      sessionStorage.setItem(LAST_KEY, JSON.stringify({ surface: surface, from: from, to: to, t: now }));
    } catch (e) { /* storage blocked: reversal detection simply off */ }
    track('swipe_nav', { surface: surface, direction: dir, from: from, to: to, method: method });
  }

  /* ── first-time hint bookkeeping (one device, one key) ──────────────────── */
  /* One key; the value is a comma list of the surfaces whose hint has been seen ('landing', later 'property'). */
  function seenList() { try { return (localStorage.getItem(HINT_KEY) || '').split(','); } catch (e) { return null; } }
  function hintSeen(surface) { var l = seenList(); return !l || l.indexOf(surface) > -1; }   // storage blocked: never show
  function markHintSeen(surface) {
    var l = seenList();
    if (!l || l.indexOf(surface) > -1) return;
    l.push(surface);
    try { localStorage.setItem(HINT_KEY, l.filter(Boolean).join(',')); } catch (e) { /* ignore */ }
  }

  window.SynSwipe = {
    enabled: enabled, reducedMotion: reducedMotion, attach: attach,
    track: track, hop: hop, hintSeen: hintSeen, markHintSeen: markHintSeen,
    lastKey: LAST_KEY
  };
})();
