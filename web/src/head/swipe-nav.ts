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

  const COMMIT_PX = 64, FAST_PX = 40, FAST_V = 0.5, RATIO = 1.8, MAX_MS = 700;
  const AXIS_PX = 10, EDGE_PX = 28, LONGPRESS_MS = 400;
  const IGNORE = 'input,textarea,select,[contenteditable],[data-noswipe],.maplibregl-map,.mapboxgl-map,canvas,'
    + '#deck,.thumbs,.sim,.pvc-tabs,.rl-track,.pr-grid,.hf-track,.car-track,.m-hero-chips,#lightbox,.lightbox';
  const LAST_KEY = 'syn_swipe_last', HINT_KEY = 'syn_swipe_hint_v1';

  const mq = window.matchMedia ? {
    coarse: window.matchMedia('(pointer: coarse)'),
    narrow: window.matchMedia('(max-width: 819px)'),
    reduce: window.matchMedia('(prefers-reduced-motion: reduce)')
  } : null;

  function enabled() { return !!(mq && mq.coarse.matches && mq.narrow.matches); }
  function reducedMotion() { return !!(mq && mq.reduce.matches); }

  /* The dead edge is 28px, or the Capacitor inset when that is larger. */
  function edge(side: string) {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--syn-native-' + side));
    return Math.max(EDGE_PX, isNaN(v) ? 0 : v);
  }

  function blocked(target: EventTarget | null, root: Element) {
    let n = (target && (target as Node).nodeType === 1 ? target : target && (target as Node).parentElement) as Element | null;
    for (; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.matches && n.matches(IGNORE)) return true;
      const ox = getComputedStyle(n).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true;
      if (n === root) break;
    }
    return false;
  }

  function hasSelection() {
    try { return !!(window.getSelection && String(window.getSelection()).length); } catch (e) { return false; }
  }

  function attach(el: HTMLElement | null, o: SynSwipeHandlers) {
    if (!el || !enabled()) return function () {};
    let s: { x: number; y: number; t: number; axis: string | null; owned: boolean; dx: number; dy: number; lp?: ReturnType<typeof setTimeout> } | null = null, first = true;

    function reset(cancelled: boolean) {
      if (!s) return;
      clearTimeout(s.lp);
      const was = s; s = null;
      if (cancelled && was.owned && o.onCancel) o.onCancel();
    }

    function start(e: TouchEvent) {
      if (!enabled()) return;
      if (e.touches.length > 1) { reset(true); return; }          // multi-touch: pinch, not swipe
      const t = e.touches[0];
      if (t.clientX < edge('left') || t.clientX > window.innerWidth - edge('right')) { s = null; return; }
      if (blocked(e.target, el!) || hasSelection()) { s = null; return; }
      if (first) { first = false; if (o.onFirstTouch) o.onFirstTouch(); }
      s = { x: t.clientX, y: t.clientY, t: Date.now(), axis: null, owned: false, dx: 0, dy: 0 };
      s.lp = setTimeout(function () { if (s && !s.axis) s = null; }, LONGPRESS_MS); // long press without movement: selection wins
    }

    function move(e: TouchEvent) {
      if (!s) return;
      if (e.touches.length > 1) { reset(true); return; }
      const t = e.touches[0];
      s.dx = t.clientX - s.x; s.dy = t.clientY - s.y;
      if (!s.axis) {
        if (Math.abs(s.dx) < AXIS_PX && Math.abs(s.dy) < AXIS_PX) return;
        clearTimeout(s.lp);
        if (Math.abs(s.dx) <= Math.abs(s.dy) || hasSelection()) { s = null; return; } // vertical (or selecting): not ours
        const dir0: SynSwipeDir = s.dx > 0 ? 'right' : 'left';
        if (o.canGo && !o.canGo(dir0)) { s = null; return; }
        s.axis = 'x'; s.owned = true;
        if (o.onOwned) o.onOwned();
      }
      if (o.onMove) o.onMove(s.dx, true);
    }

    function end() {
      if (!s) return;
      const g = s, dt = Date.now() - g.t, adx = Math.abs(g.dx), ady = Math.abs(g.dy);
      reset(false);
      if (!g.owned) return;
      const fast = adx >= FAST_PX && adx / Math.max(dt, 1) > FAST_V;
      const ok = (adx >= COMMIT_PX || fast) && adx >= RATIO * ady && dt < MAX_MS && !hasSelection();
      const dir: SynSwipeDir = g.dx > 0 ? 'right' : 'left';
      if (ok && (!o.canGo || o.canGo(dir))) { if (o.onCommit) o.onCommit(dir); }
      else if (o.onCancel) o.onCancel();
    }

    const P: AddEventListenerOptions = { passive: true };
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
  function track(name: string, params?: Record<string, unknown>) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) { /* never break the page */ }
  }

  /* A hop followed by the opposite hop within 3s is the accidental-swipe signal. The only thing stored is this one short
     sessionStorage record: surface, from, to, time. No personal data. */
  function hop(surface: string, dir: string, from: string, to: string, method: string) {
    const now = Date.now();
    try {
      const prev = JSON.parse(sessionStorage.getItem(LAST_KEY) || 'null');
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
  function hintSeen(surface: string) { const l = seenList(); return !l || l.indexOf(surface) > -1; }   // storage blocked: never show
  function markHintSeen(surface: string) {
    const l = seenList();
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
