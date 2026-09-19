/* ── SynLoader ─────────────────────────────────────────────────────────────
   The bouncing mark, on demand. Markup and behaviour; the motion itself is
   entirely in loader.css.

     SynLoader.show('Finding homes…')   // idempotent, safe to call twice
     SynLoader.hide()

   NOT SHOWN IMMEDIATELY. A loader that appears for 80ms is a flash of
   something the person cannot read and did not need — it makes a fast app
   feel busy. Nothing is drawn until the work has been running long enough to
   be worth remarking on, and if it finishes first nothing is ever drawn at
   all. 260ms is roughly where a wait stops reading as responsiveness.

   AND NOT REMOVED IMMEDIATELY EITHER. Once shown it stays for a minimum, so
   work that lands at 280ms does not produce a single visible frame. A loader
   that blinks is worse than one that lingers.

   The path is relative to app/, where every page that uses this lives.
   ─────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var SHOW_AFTER = 260;   // do not mention a wait nobody noticed
  var MIN_ON     = 420;   // once mentioned, do not blink

  var el = null;
  var pending = 0;        // timer id for the not-yet-shown loader
  var shownAt = 0;
  var hideTimer = 0;

  function build(msg) {
    var wrap = document.createElement('div');
    wrap.className = 'synload';
    wrap.setAttribute('role', 'status');
    /* polite, not assertive: this is progress, and interrupting somebody
       mid-sentence to tell them a page is loading is not help. */
    wrap.setAttribute('aria-live', 'polite');
    wrap.innerHTML =
      /* The shadow lives INSIDE .sb-x and OUTSIDE .sb-y, which is the whole
         trick: it travels sideways with the mark and stays on the floor when
         the mark leaves it. As a sibling of .sb-x it sat still at the centre
         while the mark flew over the top of it. */
      '<div class="synbounce" aria-hidden="true">'
      + '<span class="sb-x">'
      + '<span class="sb-shadow"></span>'
      + '<span class="sb-y"><span class="sb-squash"><span class="sb-tilt">'
      + '<img src="../images/brand/mark-black-on-white-tight.jpg" alt="">'
      + '</span></span></span>'
      + '</span>'
      + '</div>'
      + '<div class="synload-msg"></div>';
    document.body.appendChild(wrap);
    setMsg(wrap, msg);
    return wrap;
  }

  function setMsg(wrap, msg) {
    var m = wrap.querySelector('.synload-msg');
    if (!m) return;
    /* textContent, not innerHTML: callers pass their own strings and one of
       them will eventually contain a listing title. */
    m.textContent = msg || '';
    m.hidden = !msg;
  }

  function show(msg) {
    clearTimeout(hideTimer); hideTimer = 0;

    if (el && el.classList.contains('on')) { setMsg(el, msg); return; }
    if (pending) { return; }          // already waiting to decide

    pending = setTimeout(function () {
      pending = 0;
      if (!el) el = build(msg); else setMsg(el, msg);
      el.classList.add('on');
      shownAt = Date.now();
    }, SHOW_AFTER);
  }

  function hide() {
    /* Finished before we ever drew it: cancel, and the person never learns
       there was a loader. That is the good case. */
    if (pending) { clearTimeout(pending); pending = 0; return; }
    if (!el || !el.classList.contains('on')) return;

    var left = MIN_ON - (Date.now() - shownAt);
    if (left > 0) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { el.classList.remove('on'); }, left);
      return;
    }
    el.classList.remove('on');
  }

  window.SynLoader = { show: show, hide: hide };
}());
