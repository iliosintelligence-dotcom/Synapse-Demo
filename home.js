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
