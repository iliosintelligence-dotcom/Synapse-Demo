/* SAVE, SHARE, CONTACT: one tap each, on every property card and on the property page
   (Eden, 2026-10-11). This file is the SHARE half. On a phone it opens the phone's own share
   sheet (WhatsApp, Telegram, Messages, Save to Drive, Save to Files, Copy...). On a computer,
   which has no such sheet, it shows a small one of its own with the same choices.
   Anything on a page marked data-share="<listing id>" works, with optional data-title,
   data-price and data-place; the link shared is always the listing's own page. */
(function () {
  'use strict';
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  function linkFor(id) {
    var base = location.origin && location.origin !== 'null' ? location.origin : 'https://www.synapsecore.dev';
    return base + '/app/property.html?id=' + encodeURIComponent(id);
  }
  function toast(msg) {
    var t = document.getElementById('synToast');
    if (!t) { t = document.createElement('div'); t.id = 'synToast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.textContent = msg; t.className = ''; requestAnimationFrame(function () { t.classList.add('show'); });
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { toast('Link copied. Paste it anywhere.'); }, function () { toast('Could not copy. Long-press the link to copy it.'); });
    var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Link copied. Paste it anywhere.'); } catch (e) { toast('Could not copy.'); }
    document.body.removeChild(ta); return Promise.resolve();
  }
  function saveFile(o, url, text) {
    /* A tiny shortcut file the person can keep in Files or Drive, which opens the home when tapped. */
    var html = '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' + esc(url) + '"><title>' + esc(o.title) + '</title><p><a href="' + esc(url) + '">' + esc(text) + '</a></p>';
    var blob = new Blob([html], { type: 'text/html' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (String(o.title || 'home').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'home') + '.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('Saved as a shortcut file.');
  }
  function close() { var s = document.getElementById('synShareSheet'); if (s) s.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function sheet(o, url, text) {
    close();
    var q = encodeURIComponent(text + ' ' + url), u = encodeURIComponent(url), t = encodeURIComponent(text);
    var opts = [
      ['wa', 'WhatsApp', 'https://wa.me/?text=' + q],
      ['tg', 'Telegram', 'https://t.me/share/url?url=' + u + '&text=' + t],
      ['fb', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + u],
      ['x', 'X', 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u],
      ['mail', 'Email', 'mailto:?subject=' + encodeURIComponent(o.title || 'A home on Synapse') + '&body=' + q]
    ];
    var el = document.createElement('div'); el.id = 'synShareSheet'; el.className = 'sh-scrim'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Share this home');
    el.innerHTML = '<div class="sh-sheet"><div class="sh-head"><b>Share this home</b><button type="button" class="sh-x" data-sh-close aria-label="Close">\u00d7</button></div>'
      + '<div class="sh-link"><input readonly value="' + esc(url) + '" aria-label="Link"><button type="button" class="btn btn-primary" data-sh-copy>Copy link</button></div>'
      + '<div class="sh-grid">' + opts.map(function (x) { return '<a class="sh-opt" target="_blank" rel="noopener noreferrer" href="' + esc(x[2]) + '">' + esc(x[1]) + '</a>'; }).join('')
      + '<button type="button" class="sh-opt" data-sh-file>Save to a file</button></div></div>';
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.closest('[data-sh-close]')) { close(); return; }
      if (e.target.closest('[data-sh-copy]')) { copy(url); return; }
      if (e.target.closest('[data-sh-file]')) { saveFile(o, url, text); return; }
      if (e.target.closest('a.sh-opt')) setTimeout(close, 200);
    });
    document.body.appendChild(el); document.addEventListener('keydown', onKey);
    var inp = el.querySelector('input'); if (inp) { inp.focus(); inp.select(); }
  }
  function share(o) {
    o = o || {};
    if (!o.id && !o.url) return;
    var url = o.url || linkFor(o.id);
    var title = String(o.title || 'A home on Synapse');
    var text = [title, o.price, o.place].filter(Boolean).join(' \u00b7 ');
    if (navigator.share) {
      navigator.share({ title: title + ' \u2014 Synapse', text: text, url: url }).catch(function (err) { if (err && err.name !== 'AbortError') sheet(o, url, text); });
      return;
    }
    sheet(o, url, text);
  }
  /* Capture phase: a card is one big tap target, and this must win over the card's own
     "open the home" handler without it also firing. */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-share]');
    if (b) { e.preventDefault(); e.stopPropagation(); share({ id: b.getAttribute('data-share'), title: b.getAttribute('data-title'), price: b.getAttribute('data-price'), place: b.getAttribute('data-place') }); return; }
    var c = e.target.closest && e.target.closest('[data-contact]');
    if (c) e.stopPropagation();      /* let the link go to Tayo; just do not also open the home */
  }, true);
  window.SynShare = { open: share, link: linkFor };
})();
