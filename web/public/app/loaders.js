/* SynLoad: the loader set (loaders.css) as one small helper.
     SynLoad.html('dots')                       -> markup for a loader of that kind
     SynLoad.html('ring', 'lg')                 -> bigger ('sm' and 'lg')
     SynLoad.line('ring', 'Reading your text')  -> "[ring] Reading your text", for a status line
     var done = SynLoad.busy(button, 'ring', 'Sending')   // the button shows the loader and its words, and is disabled
     done();                                               // puts the button back exactly as it was
   Every loader carries role="status" and an accessible name, so a screen reader hears that something is happening. */
(function () {
  'use strict';
  var KIDS = {
    ring: '', arc: '', pulse: '', ball: '', download: '', mail: '', search: '', hourglass: '',
    dots: '<i></i><i></i><i></i>', clock: '<i></i><i></i>', signal: '<i></i><i></i><i></i><i></i>'
  };
  function html(kind, size, label) {
    if (!(kind in KIDS)) kind = 'ring';
    return '<span class="sl sl-' + kind + (size ? ' sl-' + size : '') + '" role="status" aria-label="' + (label || 'Loading') + '">' + KIDS[kind] + '</span>';
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function line(kind, text) { return '<span class="sl-line">' + html(kind, '', text) + '<span>' + esc(text) + '</span></span>'; }
  function busy(btn, kind, text) {
    if (!btn) return function () {};
    var was = { html: btn.innerHTML, disabled: btn.disabled };
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = line(kind || 'ring', text || 'Working');
    return function () { btn.innerHTML = was.html; btn.disabled = was.disabled; btn.removeAttribute('aria-busy'); };
  }
  window.SynLoad = { html: html, line: line, busy: busy };

  /* EVERY BUSY BUTTON, WITHOUT EDITING EACH ONE. The app already says what it is doing on the button itself
     ("Uploading…", "Sending…", "Reading your description…") in dozens of places. When a button is disabled and its words
     end in an ellipsis, it gets the loader that matches the verb: uploads drop into a tray, sends post a letter, reading
     and thinking use the arc, lookups use the signal bars, loading uses dots, everything else the ring. */
  var VERB = [[/upload|import|download/i, 'download'], [/send|submit|invit|deliver/i, 'mail'], [/read|think|generat|writ|rewrit|draft/i, 'arc'],
    [/look|check|search|find|locat/i, 'signal'], [/load|fetch|open/i, 'dots'], [/pay|wait|confirm|verif/i, 'clock']];
  function decorate(b) {
    if (!b || b.nodeType !== 1 || b.tagName !== 'BUTTON' || !b.disabled || b.querySelector('.sl')) return;
    var t = (b.textContent || '').trim();
    if (!t || t.length > 60 || !/(\u2026|\.\.\.)$/.test(t)) return;
    var kind = 'ring';
    for (var i = 0; i < VERB.length; i++) if (VERB[i][0].test(t)) { kind = VERB[i][1]; break; }
    var span = document.createElement('span');
    span.innerHTML = html(kind, 'sm', t.replace(/\u2026|\.\.\./, ''));
    var sl = span.firstChild; sl.style.marginRight = '.55em';
    b.insertBefore(sl, b.firstChild);
  }
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === 'BUTTON') decorate(root);
    var bs = root.querySelectorAll ? root.querySelectorAll('button:disabled') : [];
    for (var i = 0; i < bs.length; i++) decorate(bs[i]);
  }
  /* buttons that are already busy when the page is built */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(document.body); });
  else scan(document.body);
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i], t = m.target;
        if (m.type === 'attributes') decorate(t);
        else if (m.type === 'characterData') decorate(t.parentElement && t.parentElement.closest('button'));
        else { decorate(t.closest && t.closest('button')); for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]); }
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled'] });
  }
})();
