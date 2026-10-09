/* SCRAMBLE TEXT (idea: dqnamo's Scramble Text in The Kitchen).
   Text that changes arrives as if being decoded: every character that is not
   yet settled shows a random glyph, and they lock into place from left to
   right with a little jitter, so the eye catches the new words forming rather
   than a block being swapped. Used where something has just been MADE for you
   (a rewritten caption, a fresh set of drafts, a new total), never on text a
   person is typing.

   The final text is always the real text: it is set in full the moment the
   animation ends, on cancel, and immediately for anyone who asked for reduced
   motion. Numbers scramble with digits only, so a price never briefly reads as
   some other price made of symbols. Whitespace and line breaks are kept, so the
   shape of a paragraph does not jump while it resolves. */
(function () {
  'use strict';
  var SYM = '▒▓░#@%&*+=?/\\|<>~^'.split('');
  var DIG = '0123456789'.split('');
  var calm = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var isDigit = function (c) { return c >= '0' && c <= '9'; };
  var ease = function (t) { return 1 - Math.pow(1 - t, 2.2); };

  /* One animation per element at a time; a new one cancels the old one. */
  function run(el, finalText, write, opts) {
    opts = opts || {};
    var chars = Array.from(String(finalText == null ? '' : finalText));
    var n = chars.length;
    if (el.__scr) { cancelAnimationFrame(el.__scr.raf); el.__scr = null; }
    if (!n || calm()) { write(chars.join('')); return; }
    var numeric = opts.numbers === true;
    var dur = opts.duration || Math.min(1200, (numeric ? 380 : 320) + n * (numeric ? 22 : 11));
    var at = chars.map(function (c, i) { return (i / n) * 0.72 + Math.random() * 0.28; });
    var start = performance.now(), frame = 0, glyphs = chars.slice();
    var state = { raf: 0, finish: function () { cancelAnimationFrame(state.raf); if (el.__scr === state) el.__scr = null; write(chars.join('')); if (opts.done) opts.done(); } };
    el.__scr = state;
    function tick(now) {
      if (el.__scr !== state) return;                        /* replaced or cancelled */
      var t = Math.min(1, (now - start) / dur), e = ease(t);
      if (t >= 1) { el.__scr = null; write(chars.join('')); if (opts.done) opts.done(); return; }
      if ((frame++ % 2) === 0) {                             /* glyphs change every other frame: less flicker */
        for (var i = 0; i < n; i++) {
          var c = chars[i];
          if (/\s/.test(c)) glyphs[i] = c;
          else if (numeric) glyphs[i] = isDigit(c) ? pick(DIG) : c;
          else glyphs[i] = pick(SYM);
        }
      }
      var out = '';
      for (var j = 0; j < n; j++) out += (e >= at[j]) ? chars[j] : glyphs[j];
      write(out);
      state.raf = requestAnimationFrame(tick);
    }
    state.raf = requestAnimationFrame(tick);
  }

  /* For ordinary elements. Holds the final size while it runs so a paragraph
     does not reflow every frame. */
  function text(el, finalText, opts) {
    if (!el) return;
    finalText = finalText == null ? el.textContent : finalText;
    el.setAttribute('aria-label', finalText);
    var h = el.offsetHeight, w = el.offsetWidth;
    var prevMin = el.style.minHeight, prevMinW = el.style.minWidth;
    if (h && !(opts && opts.numbers)) el.style.minHeight = h + 'px';
    if (w && opts && opts.numbers) el.style.minWidth = w + 'px';
    var restore = function () { el.style.minHeight = prevMin; el.style.minWidth = prevMinW; el.removeAttribute('aria-label'); };
    run(el, finalText, function (s) { el.textContent = s; }, Object.assign({}, opts, { done: function () { restore(); if (opts && opts.done) opts.done(); } }));
    if (calm()) restore();
  }

  /* Snap to the real text now. Called whenever something is about to READ or
     CHANGE the text (save, undo, typing, closing), so nobody ever works with a
     half-decoded version. */
  function finish(el) { if (el && el.__scr) el.__scr.finish(); }

  /* For <textarea> / <input>. */
  function value(inp, finalText, opts) {
    if (!inp) return;
    run(inp, finalText, function (s) { inp.value = s; }, opts);
  }

  /* Find the figures inside a container and decode them: used on receipts. */
  function numbers(root, selector) {
    if (!root || calm()) return;
    var els = root.querySelectorAll(selector || 'b');
    for (var i = 0; i < els.length; i++) {
      var t = els[i].textContent;
      if (/\d/.test(t)) text(els[i], t, { numbers: true });
    }
  }

  window.Scramble = { text: text, value: value, numbers: numbers, finish: finish };
})();
