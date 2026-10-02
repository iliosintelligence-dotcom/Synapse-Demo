/* The landing pages (index.html, buyers.html): the light/dark switch, the
   clock that turns the page at 7pm and 7am, and the bar's hairline on scroll.
   The first paint's theme is stamped by an inline script in each page's
   <head> (window.SynHome), before this loads. */
/* ── The switch, the clock, and the bar ─────────────────────────────────── */
(function () {
  var d = document.documentElement, btn = document.getElementById('modeBtn');
  var meta = document.querySelector('meta[name="theme-color"]');
  function paint(t) {
    d.setAttribute('data-theme', t);
    if (meta) meta.setAttribute('content', t === 'dark' ? '#000000' : '#FAF6F0');
    if (btn) btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  paint(d.getAttribute('data-theme') || 'light');
  if (btn) btn.addEventListener('click', function () {
    var t = d.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    SynHome.choose(t);
    try { sessionStorage.setItem('syn_home_theme', t); } catch (e) {}
    paint(t);
  });
  /* Left open across 7pm or 7am, the page turns with the clock -- unless the
     reader has chosen, which it then respects. */
  setInterval(function () {
    if (!SynHome.chosen() && d.getAttribute('data-theme') !== SynHome.byClock()) paint(SynHome.byClock());
  }, 60000);

  var nav = document.getElementById('nav');
  function scrolled() { nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', scrolled, { passive: true });
  scrolled();
})();

/* ── The reality row (index.html) ─────────────────────────────────────────
   Eden's reference was Miro's row of cards that slides sideways as you
   scroll down. On a wide screen with motion allowed the section holds still
   under the bar (.rl-pinned, CSS sticky) and the page's scroll position is
   turned into the row's sideways position; the pin is exactly as tall as the
   row is long, so the last card lands and the page moves on. Everywhere else
   it is a swipe row, with arrows either side and a count. */
(function () {
  var sec = document.getElementById('reality');
  if (!sec) return;
  var pin = document.getElementById('rlPin'), stage = document.getElementById('rlStage');
  var rail = document.getElementById('rlRail'), track = document.getElementById('rlTrack');
  var prev = document.getElementById('rlPrev'), next = document.getElementById('rlNext');
  var count = document.getElementById('rlCount');
  var cards = [].slice.call(track.querySelectorAll('.rl-card'));
  var wide = window.matchMedia('(min-width: 961px)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dist = 0, pinned = false, ticking = false;

  function onScroll() {
    if (!pinned) return;
    var r = pin.getBoundingClientRect();
    var span = pin.offsetHeight - stage.offsetHeight;
    var top = parseFloat(window.getComputedStyle(stage).top) || 0;
    var p = span > 0 ? Math.min(1, Math.max(0, (top - r.top) / span)) : 0;
    rail.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px, 0, 0)';
  }

  /* Where the middle of a picture is, so the arrows sit beside it. */
  function measureArt() {
    var art = cards[0] && cards[0].querySelector('.rl-art');
    if (!art) return;
    var mid = art.getBoundingClientRect().top - stage.getBoundingClientRect().top + art.offsetHeight / 2;
    stage.style.setProperty('--art-mid', Math.round(mid) + 'px');
  }

  function index() {
    var best = 0, bestD = Infinity, x0 = cards[0].offsetLeft;
    cards.forEach(function (c, i) {
      var d = Math.abs(c.offsetLeft - x0 - track.scrollLeft);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
  function sync() {
    var i = index();
    count.textContent = (i + 1) + ' / ' + cards.length;
    prev.disabled = i === 0;
    next.disabled = i === cards.length - 1;
  }
  function go(i) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: still.matches ? 'auto' : 'smooth' });
  }

  function layout() {
    pinned = wide.matches && !still.matches;
    sec.classList.toggle('rl-pinned', pinned);
    rail.style.transform = '';
    if (!pinned) { pin.style.height = ''; measureArt(); sync(); return; }
    dist = Math.max(0, rail.scrollWidth - stage.clientWidth);
    pin.style.height = (stage.offsetHeight + dist) + 'px';
    onScroll();
  }

  prev.addEventListener('click', function () { go(index() - 1); });
  next.addEventListener('click', function () { go(index() + 1); });
  var t;
  track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(sync, 60); }, { passive: true });
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; onScroll(); });
  }, { passive: true });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
  [wide, still].forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', layout); else if (m.addListener) m.addListener(layout);
  });
  window.addEventListener('load', layout);   // fonts and images settle widths
  layout();
})();
