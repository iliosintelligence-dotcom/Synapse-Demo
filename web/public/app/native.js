/* THE SYNAPSE APP ONLY (Capacitor). Does nothing in an ordinary browser. Loaded by every page.
 *
 * 1. Keeps each page's top bar and logo below the camera cut-out and the status bar while the page's background runs behind them,
 *    colours the status-bar icons to suit the page, and opens site links in the app.
 * 2. A photo field (<input type="file" accept="image/*">) opened only the phone's plain file picker, which has no camera in it, so in
 *    the app a tap on one first asks "Take a photo" or "Choose from your photos". Choosing is the normal field, untouched (it takes
 *    several photos at once). Taking a photo opens the camera and puts the picture into the same field as if it had been chosen, so
 *    the page that owns the field notices nothing different. Fields that are not for photos (spreadsheets, documents, video) are
 *    left alone.
 */
(function () {
  var C = window.Capacitor;
  if (!(C && C.isNativePlatform && C.isNativePlatform())) return;
  var root = document.documentElement;

  /* ── 1 · Under the camera ──────────────────────────────────────────────────
     The app draws edge to edge: the page's background runs behind the status bar and the camera cut-out, which is what it should.
     What must not go there is anything a person reads or taps, so each page's top bar takes the cut-out's height as extra padding
     (env(safe-area-inset-top) is that height; it is 0 in an ordinary browser, and a page that already handled it needs no rule
     here: Tayo, Your matches, Dream boards, sign-in, the legal pages). */
  root.classList.add('syn-app');
  // MainActivity has normally set --syn-native-* already (before the page painted); ask again in case its start script could not run.
  var NI = window.SynInsets;
  if (NI) {
    try {
      root.style.setProperty('--syn-native-top', NI.top() + 'px');
      root.style.setProperty('--syn-native-bottom', NI.bottom() + 'px');
      root.style.setProperty('--syn-native-left', NI.left() + 'px');
      root.style.setProperty('--syn-native-right', NI.right() + 'px');
    } catch (x) { /* the page falls back to env() below */ }
  }
  var st = document.createElement('style');
  st.textContent = ':root.syn-app{--syn-top:var(--syn-native-top,env(safe-area-inset-top,0px));--syn-bottom:var(--syn-native-bottom,env(safe-area-inset-bottom,0px))}'
    + '.syn-app .nav{padding-top:var(--syn-top)}'                                 // landing page, customers page
    + '.syn-app .appbar{padding-top:calc(14px + var(--syn-top))}'                 // the shared bar: portal, verification desk
    + '.syn-app .wrap:has(>.brandbar){padding-top:calc(26px + var(--syn-top))}'   // a homes-we-just-posted link
    + '.syn-app .yd-wrap{padding-top:calc(28px + var(--syn-top))}'                // your data
    + '.syn-app .hero .actions{top:calc(12px + var(--syn-top))}';                 // a property's photo: save and share
  (document.head || root).appendChild(st);

  /* The clock, battery and signal icons are drawn over the page: light on a dark page, dark on a light one. The site's own
     light and dark (set by the visitor's clock or their choice, not the phone's setting) decides, and is followed when it changes. */
  var SB = C.Plugins && C.Plugins.SystemBars;
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(getComputedStyle(document.body || root).backgroundColor || '');
    if (m && (m[4] === undefined || +m[4] > 0.5)) return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) < 128;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function paintBars() { if (SB && SB.setStyle) SB.setStyle({ style: isDark() ? 'DARK' : 'LIGHT' }).catch(function () {}); }
  paintBars();
  if (window.MutationObserver) new MutationObserver(paintBars).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* A link to the site (a /s/<token> short link from a post, an emailed link) opens in the app on the page it names. */
  var AppPlugin = C.Plugins && C.Plugins.App;
  if (AppPlugin && AppPlugin.addListener) {
    AppPlugin.addListener('appUrlOpen', function (e) {
      try {
        var u = new URL(e.url);
        if (u.hostname === 'www.synapsecore.dev' || u.hostname === 'synapsecore.dev') window.location.href = u.pathname + u.search + u.hash;
      } catch (x) { /* not a link we understand */ }
    });
  }

  /* ── 2 · A camera for photo fields ────────────────────────────────────────── */
  var Camera = C.Plugins && C.Plugins.Camera;
  if (!Camera) return;

  var bypass = false, open = null;

  function wantsPhoto(el) {
    if (!el || el.tagName !== 'INPUT' || el.type !== 'file') return false;
    var a = String(el.getAttribute('accept') || '').toLowerCase();
    return /image\//.test(a) && !/video\//.test(a);
  }

  function toFile(base64, format) {
    var bin = atob(base64), n = bin.length, bytes = new Uint8Array(n);
    for (var i = 0; i < n; i++) bytes[i] = bin.charCodeAt(i);
    var type = 'image/' + (format === 'jpg' ? 'jpeg' : (format || 'jpeg'));
    return new File([bytes], 'photo-' + Date.now() + '.' + (format === 'jpeg' || !format ? 'jpg' : format), { type: type });
  }

  function takePhoto(input) {
    return Camera.getPhoto({ source: 'CAMERA', resultType: 'base64', quality: 82, width: 2400, correctOrientation: true, saveToGallery: false })
      .then(function (p) {
        if (!p || !p.base64String) return;
        var dt = new DataTransfer();
        dt.items.add(toFile(p.base64String, p.format));
        input.files = dt.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })
      .catch(function () { /* cancelled, or permission refused: Android has already said so */ });
  }

  function close() { if (open) { open.remove(); open = null; } }

  function ask(input) {
    close();
    var box = document.createElement('div');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Add a photo');
    box.className = 'syn-pick';
    box.innerHTML = '<style>'
      + '.syn-pick{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.45);font:500 17px/1.3 system-ui,-apple-system,Roboto,sans-serif}'
      + '.syn-pick-sheet{width:min(520px,100%);box-sizing:border-box;padding:14px 16px calc(16px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;background:#FAF6F0;color:#15120F;display:grid;gap:10px}'
      + 'html[data-theme="dark"] .syn-pick-sheet{background:#16181C;color:#fff}'
      + '.syn-pick-sheet button{min-height:52px;border:0;border-radius:16px;font:600 17px system-ui,-apple-system,Roboto,sans-serif;cursor:pointer;background:#15120F;color:#fff}'
      + 'html[data-theme="dark"] .syn-pick-sheet button{background:#fff;color:#000}'
      + '.syn-pick-sheet button.alt{background:rgba(128,128,128,.18);color:inherit}'
      + '</style>'
      + '<div class="syn-pick-sheet">'
      + '<button type="button" data-do="camera">Take a photo</button>'
      + '<button type="button" data-do="library" class="alt">Choose from your photos</button>'
      + '<button type="button" data-do="cancel" class="alt">Cancel</button>'
      + '</div>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-do]');
      if (!b) { if (e.target === box) close(); return; }
      var what = b.getAttribute('data-do');
      close();
      if (what === 'camera') takePhoto(input);
      else if (what === 'library') { bypass = true; input.click(); bypass = false; }
    });
    document.body.appendChild(box);
    open = box;
    var first = box.querySelector('button'); if (first && first.focus) first.focus();
  }

  // Capture phase: runs before the browser opens its own picker, including for a field the page clicks from its own script.
  document.addEventListener('click', function (e) {
    if (bypass) return;
    var el = e.target;
    if (!wantsPhoto(el)) return;
    e.preventDefault(); e.stopPropagation();
    // a field that asks for the camera outright (capture) skips the question
    if (el.hasAttribute('capture')) takePhoto(el); else ask(el);
  }, true);

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
