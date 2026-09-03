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
    'bus':        '<rect x="3.5" y="4" width="17" height="13" rx="2.5"/><path d="M3.5 11.5h17"/><circle cx="7.5" cy="19.5" r="1.5"/><circle cx="16.5" cy="19.5" r="1.5"/><path d="M7 7.5h3M14 7.5h3"/>',
    'hospital':   '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M12 8v8M8 12h8"/>',
    'cart':       '<circle cx="9" cy="20.5" r="1.3"/><circle cx="18" cy="20.5" r="1.3"/><path d="M2.5 3.5h2.3l2.6 12.3a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6l1.4-7.3H6.2"/>',
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
    // toolbar verbs — added so the portal's toolbars stop standing in glyphs
    // (▤ ▦ ↕ ⚙ ⇪ ▽ ⋯ ✆) for icons
    'sort':       '<path d="M7 4.5v15M7 4.5L4.2 7.6M7 4.5l2.8 3.1"/><path d="M17 19.5v-15M17 19.5l-2.8-3.1M17 19.5l2.8-3.1"/>',
    'filter':     '<path d="M3.5 5.5h17l-6.6 7.6v5.4l-3.8 1.9v-7.3z"/>',
    'export':     '<path d="M12 3.5v11M12 3.5L8.6 7M12 3.5L15.4 7"/><path d="M4.5 14.5V18a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3.5"/>',
    'calendar':   '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/>',
    'more':       '<circle cx="5" cy="12" r="1.15"/><circle cx="12" cy="12" r="1.15"/><circle cx="19" cy="12" r="1.15"/>',
    'phone':      '<path d="M6.4 3.5h3.1l1.5 3.9-2 1.5a12.2 12.2 0 0 0 6.1 6.1l1.5-2 3.9 1.5v3.1a2 2 0 0 1-2.2 2A17.2 17.2 0 0 1 4.4 5.7a2 2 0 0 1 2-2.2z"/>',
    'check':      '<path d="M4 12l5 5L20 6"/>',
    'close':      '<path d="M6 6l12 12M18 6L6 18"/>',
    // "we do not know yet" -- the honest third state beside check and close.
    // Drawn as a mark, not a letter, so it keeps the stroke language when a
    // glyph would fall back to whatever question mark the system font has.
    'question':   '<path d="M9.1 9.2a3 3 0 1 1 3.9 2.9c-.7.3-1 .9-1 1.7v.7"/><path d="M12 17.6h.01"/>',
  };

  /* ── platform marks ───────────────────────────────────────────────────
     These are the platforms' own logos, and they are deliberately NOT in
     PATHS above: that set is one stroke language we control, and a brand mark
     is a fixed filled shape we do not get to restyle. Keeping them apart stops
     someone "harmonising" Instagram's glyph into a 1.75 stroke and shipping a
     logo its owner would not recognise.

     They replaced two-letter chips (IG / TT / f / WA). A letter in a coloured
     circle is a placeholder that reads as unfinished, and worse, it makes the
     agency do the lookup: on a queued post showing four channels at 21px, the
     logo is recognised instantly and "YT" has to be read. Drawn on 24x24 and
     filled with currentColor, so they take the badge's colour like any glyph. */
  var BRAND = {
    'instagram': '<path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56-.79.3-1.46.72-2.13 1.38A5.9 5.9 0 0 0 .63 4.14c-.3.77-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.77.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.77.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.77-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0z"/><path d="M12 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="18.41" cy="5.59" r="1.44"/>',
    'facebook':  '<path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>',
    'whatsapp':  '<path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.22-3.74.99 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/>',
    'tiktok':    '<path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.76.12v-3.2a5.9 5.9 0 0 0-.76-.05A5.72 5.72 0 0 0 4.14 15.3a5.72 5.72 0 0 0 5.72 5.7 5.72 5.72 0 0 0 5.72-5.7V9.01a7.35 7.35 0 0 0 4.28 1.37V7.3a4.28 4.28 0 0 1-3.26-1.48z"/>',
    'youtube':   '<path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/>',
    'x':         '<path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.25 6.93zM17.6 20.64h2.04L6.49 3.24H4.3z"/>',
    'linkedin':  '<path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.47-.9 1.63-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/>',
  };

  /** A platform's own logo, filled with currentColor. Returns '' for anything
   *  that is not a platform (proximity, direct app) so the caller can fall
   *  back to whatever it used before rather than render an empty box. */
  function brand(name, opts) {
    var inner = BRAND[name];
    if (!inner) return '';
    var o = opts || {};
    var sz = o.size ? ' style="width:' + o.size + 'px;height:' + o.size + 'px"' : '';
    return '<svg class="syn-b' + (o.cls ? ' ' + o.cls : '') + '"' + sz
      + ' viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">' + inner + '</svg>';
  }

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

  window.SynIcons = { svg: svg, brand: brand, hydrate: hydrate,
    has: function (n) { return !!PATHS[n]; },
    hasBrand: function (n) { return !!BRAND[n]; } };

  function init() { hydrate(document); decorateNav(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
