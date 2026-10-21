/* The phone menu of the landing pages (the hamburger at the right of the bar). Opens a panel under the bar with the For agencies /
   For customers switch, the page's links, Sign in, the main button and the light/dark switch. Below 720px only; the desktop bar is
   untouched. The light/dark switch here presses the bar's own switch, so the choice is made and remembered by the same code. */
(function () {
  var burger = document.getElementById('navBurger');
  var sheet = document.getElementById('navSheet');
  if (!burger || !sheet) return;
  var root = document.documentElement;

  function set(open) {
    sheet.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.classList.toggle('nav-open', open);
  }
  burger.addEventListener('click', function () { set(sheet.hidden); });
  // a tap on the dimmed page, or on any link, closes it
  sheet.addEventListener('click', function (e) { if (e.target === sheet || (e.target.closest && e.target.closest('a'))) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { set(false); burger.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 720 && !sheet.hidden) set(false); });

  var mode = document.getElementById('sheetMode');
  var bar = document.getElementById('modeBtn');
  if (mode && bar) {
    var label = function () { mode.textContent = root.getAttribute('data-theme') === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; };
    mode.addEventListener('click', function () { bar.click(); label(); });
    label();
    if (window.MutationObserver) new MutationObserver(label).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
})();
