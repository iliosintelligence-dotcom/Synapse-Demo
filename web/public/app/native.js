/* THE SYNAPSE APP ONLY (Capacitor). Does nothing in an ordinary browser.
 *
 * A photo field (<input type="file" accept="image/*">) opens the phone's plain file picker inside the app, which has no camera in
 * it: an agency adding a listing could only choose photos that already existed. So in the app a tap on such a field first asks
 * "Take a photo" or "Choose from your photos". Choosing from photos is the normal file field, untouched (it handles several photos
 * at once). Taking a photo opens the camera, and the picture goes into the same field as if it had been chosen, so the page that
 * owns the field notices nothing different.
 *
 * Fields that are not for photos (spreadsheets, documents, video) are left alone.
 */
(function () {
  var C = window.Capacitor;
  if (!(C && C.isNativePlatform && C.isNativePlatform())) return;
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
