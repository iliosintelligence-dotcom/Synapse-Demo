/* Swipe between the two landing pages. Customers (/buyers) is on the left, agencies (/) on the right: swipe right on / goes to
   /buyers, swipe left on /buyers goes to /. Only the hero (first screen) is the swipe area. Needs swipe-nav.js (SynSwipe).
   Spec: web/docs/PRD-swipe-navigation.md and web/docs/swipe-navigation-design.md. Phone only. */
(function () {
  var S = window.SynSwipe;
  if (!S || !S.enabled()) return;
  var path = location.pathname.replace(/\/+$/, '').replace(/\.html$/, '');
  var me = path === '/buyers' ? 'customers' : (path === '' || path === '/index') ? 'agencies' : null;
  if (!me) return;
  var other = me === 'customers' ? 'agencies' : 'customers';
  var URLS = { customers: '/buyers', agencies: '/' };
  var NAMES = { customers: 'Customers', agencies: 'Agencies' };
  var goDir = me === 'agencies' ? 'right' : 'left';          // the finger direction that leads to the neighbour
  var hero = document.querySelector('main > .hero');
  var reduce = S.reducedMotion();
  var root = document.documentElement;
  if (!hero) return;

  /* ── arriving: focus goes to the main heading after a hop ─────────────── */
  try {
    var last = JSON.parse(sessionStorage.getItem(S.lastKey) || 'null');
    if (last && last.to === me && Date.now() - last.t < 5000) {
      var h1 = hero.querySelector('h1');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.setAttribute('data-syn-focus', ''); h1.focus({ preventScroll: true }); }
    }
  } catch (e) { /* no storage: focus stays where the browser puts it */ }

  /* ── hop ─────────────────────────────────────────────────────────────── */
  var prefetched = false;
  function prefetch() {
    if (prefetched) return; prefetched = true;
    var l = document.createElement('link'); l.rel = 'prefetch'; l.href = URLS[other]; l.as = 'document';
    document.head.appendChild(l);
  }
  function go(method) {
    S.markHintSeen('landing');
    S.hop('landing', goDir, me, other, method);
    location.href = URLS[other];
  }

  /* ── follow the finger (transform only) ──────────────────────────────── */
  function offset(px, snap) {
    if (snap) { hero.classList.add('syn-snap'); }
    hero.style.transform = px ? 'translate3d(' + px + 'px,0,0)' : '';
  }
  function clearOffset() {
    hero.classList.remove('syn-snap', 'syn-peek-move');
    hero.style.transform = ''; hero.style.willChange = '';
  }
  var drag = false;
  S.attach(hero, {
    canGo: function (dir) { return dir === goDir; },
    onFirstTouch: prefetch,
    onOwned: function () {
      dismiss('used');
      if (!reduce) hero.style.willChange = 'transform';
    },
    onMove: function (dx) {
      if (reduce) return;
      drag = true;
      hero.classList.remove('syn-snap');
      offset(Math.max(-48, Math.min(48, dx * 0.35)));
    },
    onCancel: function () {
      if (reduce || !drag) { clearOffset(); return; }
      drag = false;
      offset(0, true);
      setTimeout(clearOffset, 220);
    },
    onCommit: function () { clearOffset(); go('swipe'); }
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { clearOffset(); } });

  /* Buttons that do the same hop: count them. The links themselves are untouched. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var to;
    try {
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin) return;
      var p = u.pathname.replace(/\/+$/, '').replace(/\.html$/, '');
      to = p === '/buyers' ? 'customers' : (p === '' || p === '/index') ? 'agencies' : null;
    } catch (x) { return; }
    if (to !== other || u.hash || u.search) return;
    S.markHintSeen('landing');
    S.hop('landing', goDir, me, other, 'button');
  }, true);

  /* ── two dots: real links, the accessible version of the swipe ───────── */
  var dots = document.createElement('div');
  dots.className = 'syn-dots';
  dots.setAttribute('role', 'navigation');
  dots.setAttribute('aria-label', 'Switch between the customers and agencies pages');
  ['customers', 'agencies'].forEach(function (k, i) {
    var a = document.createElement('a');
    a.href = URLS[k];
    a.setAttribute('aria-label', NAMES[k] + ', page ' + (i + 1) + ' of 2');
    if (k === me) a.setAttribute('aria-current', 'page');
    dots.appendChild(a);
  });
  var cap = document.createElement('span');
  cap.className = 'syn-dots-cap';
  cap.setAttribute('aria-hidden', 'true');
  dots.appendChild(cap);
  document.body.appendChild(dots);

  /* Hide the dots rather than shrink the 24px gap above them when the first screen is too short. */
  var fits = true;
  function layout() {
    var dt = dots.getBoundingClientRect().top + window.scrollY;
    fits = true;
    ['.hero-cta', '.ask', '.ask-foot'].forEach(function (sel) {
      var el = hero.querySelector(sel);
      if (!el) return;
      var r = el.getBoundingClientRect();
      var bottom = r.bottom + window.scrollY, topY = r.top + window.scrollY;
      if (bottom > dt - 24 && topY < dt + 26) fits = false;
    });
    dots.hidden = !fits;
  }
  layout();
  window.addEventListener('load', function () { layout(); setTimeout(layout, 600); });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 200); });

  /* ── first-time hint ─────────────────────────────────────────────────── */
  var hint = null;
  function dismiss(reason) {
    if (!hint) { if (reason === 'used') S.markHintSeen('landing'); return; }
    var h = hint; hint = null;
    clearTimeout(h.t1); clearTimeout(h.t2); clearTimeout(h.t3); clearTimeout(h.t4);
    document.removeEventListener('click', h.tap, true);
    if (h.strip) h.strip.remove();
    clearOffset();                                   // dismisses instantly, no animation
    cap.classList.remove('on'); cap.textContent = '';
    S.markHintSeen('landing');
    S.track('swipe_hint_dismissed', { surface: 'landing', reason: reason });
  }
  function showHint() {
    if (S.hintSeen('landing') || document.hidden || window.scrollY > window.innerHeight * 0.4) return;
    if (document.querySelector('.syn-consent')) return;   // the cookie dialog sits over the hint: wait for a later visit, do not mark seen
    var h = hint = {};
    var r = hero.getBoundingClientRect();
    var top = Math.max(0, r.top), bottom = Math.min(window.innerHeight, r.bottom);
    var side = me === 'agencies' ? 'l' : 'r';        // the neighbour is on the left of /, on the right of /buyers
    if (!reduce && bottom > top) {
      var st = document.createElement('div');
      st.className = 'syn-peek ' + side; st.setAttribute('aria-hidden', 'true');
      st.style.top = top + 'px'; st.style.height = (bottom - top) + 'px';
      var d = side === 'l' ? 'M9 2L4 7L9 12' : 'M5 2L10 7L5 12';
      st.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="' + d
        + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      document.body.appendChild(st); h.strip = st;
      hero.classList.add('syn-peek-move');
      requestAnimationFrame(function () { hero.style.transform = 'translate3d(' + (side === 'l' ? 32 : -32) + 'px,0,0)'; });
      h.t1 = setTimeout(function () { if (hint === h) hero.style.transform = ''; }, 500 + 1200);   // peek out after the hold
      h.t3 = setTimeout(function () { if (hint === h && h.strip) { h.strip.remove(); h.strip = null; } }, 500 + 1200 + 500);
    }
    if (fits) {
      cap.textContent = me === 'agencies' ? 'Looking to buy? Swipe right.' : 'Are you an agency? Swipe left.';
      h.t2 = setTimeout(function () { cap.classList.add('on'); }, reduce ? 0 : 800);
    }
    h.tap = function () { dismiss('tap'); };
    document.addEventListener('click', h.tap, true);
    h.t4 = setTimeout(function () { dismiss('timeout'); }, 4000);
    S.track('swipe_hint_shown', { surface: 'landing' });
  }
  function arm() { setTimeout(showHint, 600); }
  if (document.readyState === 'complete') arm(); else window.addEventListener('load', arm);
})();

