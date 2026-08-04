/* ─────────────────────────────────────────────────────────────────────────
   Synapse motion system (web runtime).
   - Mounts Lottie animations on [data-lottie="name"] via lottie-web (CDN).
   - Scroll-reveals cards/sections ([data-reveal], auto-tagged on .card).
   - Adds micro press feedback to tappable elements.
   Mirrors the RN system in packages/ui/src/motion — same JSON files,
   same tokens (see motion.css).
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BASE = (document.currentScript && document.currentScript.getAttribute('data-motion-base')) || 'motion/';

  /* ── lottie-web loader (lazy, one script) ── */
  let lottieReady = null;
  function loadLottie() {
    if (lottieReady) return lottieReady;
    lottieReady = new Promise((resolve, reject) => {
      if (window.lottie) return resolve(window.lottie);
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie_light.min.js';
      s.onload = () => resolve(window.lottie);
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return lottieReady;
  }

  const players = new Map();

  function mount(el) {
    if (players.has(el) || REDUCED) return;
    const name = el.getAttribute('data-lottie');
    if (!name) return;
    players.set(el, true);
    loadLottie().then((lottie) => {
      const anim = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: el.getAttribute('data-loop') !== 'false',
        autoplay: el.getAttribute('data-autoplay') !== 'false',
        path: BASE + name + '.json',
      });
      anim.setSpeed(parseFloat(el.getAttribute('data-speed') || '1'));
      players.set(el, anim);
      // hold last frame for play-once badges
      if (el.getAttribute('data-loop') === 'false' && el.getAttribute('data-hold') !== 'false') {
        anim.addEventListener('complete', () => anim.goToAndStop(anim.totalFrames - 1, true));
      }
    }).catch(() => {});
  }

  /* Only run looping animations while visible — battery + perf rule */
  const lottieIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const p = players.get(e.target);
      if (e.isIntersecting) {
        if (!p) mount(e.target);
        else if (p !== true && p.isPaused) p.play();
      } else if (p && p !== true) {
        p.pause();
      }
    });
  }, { rootMargin: '60px' });

  /* ── scroll reveal ── */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
    });
  }, { threshold: 0.12 });

  function initRoot(root) {
    root.querySelectorAll('[data-lottie]').forEach((el) => lottieIO.observe(el));
    // auto-tag cards + sections for reveal, staggered within their parent
    const autoTargets = root.querySelectorAll('.card:not([data-reveal]), [data-reveal]:not(.in)');
    const counters = new Map();
    autoTargets.forEach((el) => {
      if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
      const parent = el.parentElement;
      const i = (counters.get(parent) || 0);
      counters.set(parent, i + 1);
      el.style.setProperty('--reveal-i', Math.min(i, 6));
      revealIO.observe(el);
    });
    root.querySelectorAll('button, .btn, .f, .wa, .chip, nav a').forEach((el) => el.classList.add('m-press'));
  }

  function api() {
    return {
      mount,
      play: (el) => { const p = players.get(el); if (p && p !== true) { p.goToAndStop(0, true); p.play(); } },
      refresh: () => initRoot(document),
    };
  }

  window.synMotion = api();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initRoot(document));
  } else {
    initRoot(document);
  }
})();

/* crypt.ee-style wordmark: the appbar brand expands at the top of the page and
   contracts once you scroll. Works for window scroll (consumer pages) and the
   agency portal's inner .content scroll container. */
(function () {
  var bar = document.querySelector('.appbar');
  if (!bar) return;
  var upd = function (y) { bar.classList.toggle('scrolled', y > 16); };
  window.addEventListener('scroll', function () { upd(window.scrollY); }, { passive: true });
  var content = document.querySelector('.content');
  if (content) content.addEventListener('scroll', function () { upd(content.scrollTop); }, { passive: true });
  upd(window.scrollY || 0);
})();

/* ── Start-at-top + resize auto-fit ──────────────────────────────────────────
   UX principles: clarity (every reload starts at the top of the page, never a
   restored mid-scroll position) and feedback (when any panel changes size, maps
   and flex canvases re-fit instead of clipping). Page-agnostic — no per-page
   wiring needed; reduced-motion has no bearing here. */
(function () {
  // 1) always land at the top on load/reload, unless the URL deep-links an anchor
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  function toTop() {
    if (location.hash && document.getElementById(location.hash.slice(1))) return;
    window.scrollTo(0, 0);
    var c = document.querySelector('.content'); if (c) c.scrollTop = 0;
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', toTop);
  else toTop();
  window.addEventListener('load', toTop);
  window.addEventListener('pageshow', function (e) { if (e.persisted) toTop(); }); // bfcache restore

  // 2) when any tracked panel resizes, nudge a relayout so Leaflet maps + flex
  //    canvases re-fit. Covers item-level resizes that don't move the window.
  //    Leaflet already re-fits on the native 'resize' event; we also emit a
  //    'syn:relayout' hook pages can listen to. Coalesced to one rAF; the
  //    dispatched relayout never changes the observed boxes, so no loop.
  if (!('ResizeObserver' in window)) return;
  var raf = 0;
  function relayout() {
    raf = 0;
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    document.dispatchEvent(new CustomEvent('syn:relayout'));
  }
  var ro = new ResizeObserver(function () { if (!raf) raf = requestAnimationFrame(relayout); });
  function watch() {
    document.querySelectorAll('.leaflet-container, .pv-canvas, .tj-canvas, .content, .pv-split')
      .forEach(function (el) { try { ro.observe(el); } catch (e) {} });
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', watch);
  else watch();
})();
