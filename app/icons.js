/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — unified icon set
   One stroke-based line-icon language across every page, so an icon reads its
   function even without a label. Feather-style: 24×24 grid, 1.75 stroke, round
   caps/joins, no fill, inherits currentColor + sizes to 1em (font-size driven).

   Use it two ways:
     · Markup   <span data-icon="pin"></span>         (hydrated on load)
     · JS       SynIcons.svg('pin', { cls:'x', size:18 })

   Add an icon by adding its inner paths to PATHS — never inline a one-off SVG
   again, so the whole app stays one visual system.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // inner markup only (paths/shapes); wrapper <svg> is added by render()
  var PATHS = {
    // trust & status
    'verified':   '<path d="M12 3l7 3v5c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    'pending':    '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>',
    'unverified': '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>',
    'shield':     '<path d="M12 3l7 3v5c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6l7-3z"/>',
    // navigation / structure
    'home':       '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    'chat':       '<path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/>',
    'grid':       '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    'boards':     '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
    // canvas / property facets
    'pin':        '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    // neighbourhood amenity categories — map pins, same stroke language as
    // everything else, so a pin reads its category without relying on emoji
    // (which render inconsistently, and sometimes in full colour, across OS).
    'school':     '<path d="M12 3l10 5-10 5L2 8z"/><path d="M6 10.3V15c0 1.4 2.9 2.7 6 2.7s6-1.3 6-2.7v-4.7"/><path d="M22 8v6.5"/>',
    'gym':        '<path d="M2.5 12h1.8M19.7 12h1.8"/><rect x="4.3" y="9" width="2" height="6" rx="1"/><rect x="17.7" y="9" width="2" height="6" rx="1"/><path d="M6.3 12h11.4"/><rect x="7.8" y="7" width="2" height="10" rx="1"/><rect x="14.2" y="7" width="2" height="10" rx="1"/>',
    'restaurant': '<path d="M7.5 2.5v6.3a2 2 0 1 0 4 0V2.5M9.5 8.8v12.7"/><path d="M16 2.5c-1.4 0-2.3 1.9-2.3 4.2S14.6 11 16 11s2.3-2 2.3-4.3S17.4 2.5 16 2.5zM16 11v10.5"/>',
    'church':     '<path d="M12 2.2v3M10.3 3.7h3.4"/><path d="M4.5 21.5V12a7.5 7.5 0 0 1 15 0v9.5"/><path d="M4.5 21.5h15"/><path d="M9.5 21.5v-6h5v6"/>',
    'mosque':     '<path d="M4 21.5v-7a8 8 0 0 1 16 0v7"/><path d="M2.5 21.5h19"/><path d="M12 6V3.3"/><path d="M10.4 2.7a1.9 1.9 0 1 0 2.4 2.4 2.4 2.4 0 1 1-2.4-2.4z"/>',
    'commute':    '<path d="M5 16l1-5.5A2 2 0 0 1 8 9h8a2 2 0 0 1 2 1.5L19 16"/><path d="M4 16h16v3h-2v-1H6v1H4z"/><circle cx="7.5" cy="17.5" r="0"/><path d="M7 13h10"/>',
    'agency':     '<path d="M4 21V6l8-3 8 3v15"/><path d="M4 21h16"/><path d="M9 21v-4h6v4"/><path d="M8 8h1M8 11h1M15 8h1M15 11h1"/>',
    'costs':      '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2a3 3 0 0 0-2.5-1.2c-1.7 0-3 1-3 2.5S10.3 15 12 15s3 1 3 2.5-1.3 2.5-3 2.5a3 3 0 0 1-2.5-1.2M12 6.5v11"/>',
    'legal':      '<path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4"/><path d="M10 12h5M10 15.5h5"/>',
    // actions & tools
    'spark':      '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    'heart':      '<path d="M12 20s-7-4.5-9.2-9A4.6 4.6 0 0 1 12 6.5 4.6 4.6 0 0 1 21.2 11c-2.2 4.5-9.2 9-9.2 9z"/>',
    'search':     '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    'sliders':    '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M18 18h2"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="18" r="2"/>',
    'negotiate':  '<path d="M3 12l4-4 5 2 4-4 5 4"/><path d="M8 12l3 3 2-2"/><path d="M3 12v6h18v-6"/>',
    'bell':       '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    'edit':       '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    'trash':      '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    'plus':       '<path d="M12 5v14M5 12h14"/>',
    'history':    '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
    // agency portal
    'user':       '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>',
    'users':      '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M17.5 14.2c2 .8 3.5 2.9 3.5 5.8"/>',
    'share':      '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="5.5" r="2.5"/><circle cx="17" cy="18.5" r="2.5"/><path d="M8.3 10.8l6.4-4M8.3 13.2l6.4 4"/>',
    'chart':      '<path d="M4 20v-6M9 20V8M14 20v-9M19 20V5"/><path d="M3 20h18"/>',
    'card':       '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    'arrow-right':'<path d="M4 12h16M14 6l6 6-6 6"/>',
    'check':      '<path d="M4 12l5 5L20 6"/>',
    'close':      '<path d="M6 6l12 12M18 6L6 18"/>',
  };

  function svg(name, opts) {
    var o = opts || {};
    var inner = PATHS[name] || '';
    var cls = 'syn-i' + (o.cls ? ' ' + o.cls : '');
    var sz = o.size ? ' style="width:' + o.size + 'px;height:' + o.size + 'px"' : '';
    return '<svg class="' + cls + '"' + sz + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" '
      + 'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      if (el.__icond) return;
      var name = el.getAttribute('data-icon');
      if (!PATHS[name]) return;
      el.innerHTML = svg(name, { size: el.getAttribute('data-size') ? +el.getAttribute('data-size') : 0 });
      el.classList.add('has-icon');
      el.__icond = true;
    });
  }

  // appbar nav: every destination gets its function icon automatically, so
  // navigation reads even before the words do (and stays consistent per page)
  var NAV_ICON = { 'toju': 'chat', 'browse': 'grid', 'dream': 'boards', 'agency': 'agency', 'index': 'home' };
  function decorateNav(root) {
    (root || document).querySelectorAll('.appbar nav a[href]').forEach(function (a) {
      if (a.__icond || a.querySelector('svg')) return;
      var page = (a.getAttribute('href').split('/').pop() || '').replace('.html', '');
      var name = NAV_ICON[page];
      if (!name) return;
      a.insertAdjacentHTML('afterbegin', svg(name, { cls: 'nav-i' }) + ' ');
      a.__icond = true;
    });
  }

  window.SynIcons = { svg: svg, hydrate: hydrate, has: function (n) { return !!PATHS[n]; } };

  function init() { hydrate(document); decorateNav(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
