/* ── The keyboard is part of the screen, and iOS never says so ─────────────
   Reported from Instagram's in-app browser: with the keyboard up, the chat
   composer is off the bottom of the screen -- you cannot see what you are
   typing.

   The page was written against the wrong viewport. There are two:

     LAYOUT viewport   what CSS lengths resolve against. window.innerHeight,
                       100vh, and -- this is the trap -- 100dvh.
     VISUAL viewport   what the person can actually see right now.
                       window.visualViewport.

   On Android Chrome the keyboard shrinks the LAYOUT viewport, so a flex column
   at 100dvh shortens and the composer at its end gets pushed up. That is what
   the comment in toju.html means by "the keyboard pushes it instead of
   covering it", and on Android it is true.

   iOS does not do this. In Safari and in every WKWebView embedded in another
   app -- Instagram's, Facebook's, everything people arrive through from a bio
   link -- the keyboard shrinks ONLY the visual viewport. The layout viewport
   keeps its full height, 100dvh keeps resolving to the whole screen, the flex
   column never shortens, and its last child sits calmly underneath the
   keyboard. dvh does not help: the `d` is for the URL bar appearing and
   disappearing, not for the keyboard.

   So the height comes from visualViewport instead, as --vvh, and the app shell
   uses it. The difference between the two viewports IS the keyboard, published
   as --kb for anything that needs to clear it.

   Degrades to nothing: with no visualViewport the CSS fallback (100dvh) is
   exactly the behaviour this replaces, which is correct everywhere except the
   case this file exists for.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var vv = window.visualViewport;
  if (!vv) return;

  var root = document.documentElement;
  var raf = 0;
  var wasOpen = false;

  function apply() {
    raf = 0;

    var h = Math.round(vv.height);

    /* window.innerHeight is the LAYOUT viewport, which iOS does not shrink for
       the keyboard. offsetTop is how far the visual viewport has been pushed
       down inside it. What is left over is the keyboard. */
    var inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));

    root.style.setProperty('--vvh', h + 'px');
    root.style.setProperty('--kb', inset + 'px');

    /* 80px rather than 0. The URL bar collapsing moves these numbers too, and
       a 44px strip of browser chrome is not a keyboard -- treating it as one
       would flip the class on every scroll. No keyboard is shorter than this
       on any phone. */
    var open = inset > 80;
    if (open !== wasOpen) {
      wasOpen = open;
      root.classList.toggle('kb-open', open);
      try {
        root.dispatchEvent(new CustomEvent('syn:keyboard', {
          detail: { open: open, inset: inset, height: h },
        }));
      } catch (e) { /* CustomEvent constructor, very old browsers */ }
    }

    /* iOS sometimes scrolls the layout viewport to reveal the focused field
       even when the document cannot scroll, which leaves the top of a
       full-height shell above the screen. Nothing on these pages scrolls the
       window -- the transcript has its own scroller -- so this is only ever
       undoing something we did not ask for. */
    if (open && window.scrollY !== 0) window.scrollTo(0, 0);
  }

  function sync() { if (!raf) raf = requestAnimationFrame(apply); }

  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
  window.addEventListener('orientationchange', function () { setTimeout(sync, 250); });

  /* iOS reports the new geometry LATE -- several frames after focusin, and
     sometimes after its own scroll-into-view has already run. One measurement
     on focus is reliably the measurement from before the keyboard existed, so
     it is taken again as things settle. */
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!t || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')) return;
    sync();
    setTimeout(sync, 120);
    setTimeout(sync, 320);
    setTimeout(sync, 600);
  });

  document.addEventListener('focusout', function () {
    sync();
    setTimeout(sync, 120);
    setTimeout(sync, 350);
  });

  apply();
}());
