/* ─────────────────────────────────────────────────────────────────────────
   Synapse seam (runtime) — the half of the shared-element morph that CSS
   cannot express.

   seam.css claims the RECEIVING end of the photo morph, because that one is
   unambiguous: property.html has exactly one hero image, so it can be named
   in a stylesheet and left alone.

   The SENDING end cannot be. A browse page holds twenty listing cards, and
   `view-transition-name` must be unique in a document -- name all twenty and
   the transition does not degrade, it ABORTS, taking the page cross-fade with
   it. So the name has to be applied to exactly one element, at the moment the
   person commits to it, and taken off again afterwards.

   That is all this file does. It is deliberately tiny: everything else about
   the seam is declarative.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var NAME = 'syn-photo';
  var tagged = null;
  /* Kept apart from `tagged` on purpose. clear() runs on pagehide and so does
     remember(), and listeners fire in registration order -- clear() is first,
     so anything reading `tagged` at that point finds null. This is a plain
     memory of the last listing opened and nothing clears it. */
  var openedId = null;

  /* Off again as soon as the page is shown, which covers both routes back:
     a fresh load (nothing is tagged anyway) and the back-forward cache, where
     the DOM is restored exactly as it was left -- tag included. Leaving it on
     would mean the next forward navigation had a stale name already claimed,
     and the transition after that would be the one that broke. */
  function clear() {
    if (tagged) { tagged.style.viewTransitionName = ''; tagged = null; }
  }
  window.addEventListener('pageshow', clear);
  window.addEventListener('pagehide', clear);

  function tag(el) {
    if (!el) return;
    clear();
    el.style.viewTransitionName = NAME;
    tagged = el;
  }

  /* The photo for a link, when there is one.

     A listing card is `.card.listing` with its photo in `.img > img`, and the
     anchor that opens it is the title. So the anchor is not the thing that
     should morph -- the card's photo is -- and we walk up to the card to find
     it. A card with no photo (an honest empty state, since we refuse to show
     stock images for homes that have none) simply has nothing to morph, and
     falls back to the page cross-fade. */
  function photoFor(a) {
    var card = a.closest('.card.listing, .syn-mcard, [data-id]');
    if (!card) return null;
    return card.querySelector('.img img, .syn-mcard-img, img');
  }

  /* Capture, so this runs before any page's own click handling -- several
     pages navigate from a delegated handler on the grid rather than letting
     the anchor do it, and by the time those have run the navigation is
     already under way. */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;

    /* Same document only. An external link or a new tab is not a seam --
       there is no incoming page here to morph into. */
    if (a.target && a.target !== '_self') return;
    var href = a.getAttribute('href') || '';
    if (!/property\.html/.test(href)) return;

    /* Recorded whether or not there is a photo to morph. Which home you
       opened is what "where I was" means on the way back, and most listings
       have no photo at all -- tying the two together would have meant the
       majority of journeys falling back to a pixel offset. */
    var card = a.closest('[data-id]');
    openedId = card ? (card.getAttribute('data-id') || null) : null;

    tag(photoFor(a));
  }, true);

  /* ── COMING BACK TO WHERE YOU WERE ──────────────────────────────────────
     The other half of "one place": a back that does not throw away your
     position. card.js already carries the complaint in its own header --
     "every back threw away the viewport, the zoom and the sense of where you
     were" -- and it is still true of the page underneath it.

     The browser does restore scroll on back/forward, and on an ordinary page
     that is enough. It is not enough here, because browse and Tayo render
     their listings from a fetch: at the moment the browser restores, the grid
     is empty and the document is one screen tall, so restoring to 1400px
     clamps to the bottom of nothing and you land at the top.

     So we wait for the content instead of a fixed delay, and we prefer the
     CARD to the pixel. An offset is a guess about a layout that may have
     re-rendered at a different height; "the home you opened" is the thing
     the person actually means by where they were. The offset is the fallback
     for when that card is gone.

     sessionStorage, not local: this is per-tab and it should not outlive the
     visit. */
  var SCROLL_KEY = 'syn_seam_scroll';
  var here = function () { return location.pathname + location.search; };

  function readMap() {
    try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }

  function remember() {
    try {
      var m = readMap();
      var keys = Object.keys(m);
      /* A visit does not need more than the last handful of screens, and an
         unbounded map in sessionStorage is a slow leak nobody goes looking
         for. */
      if (keys.length > 10) delete m[keys[0]];
      m[here()] = {
        y: window.scrollY || document.documentElement.scrollTop || 0,
        id: openedId,
        at: Date.now(),
      };
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify(m));
    } catch (e) {}
  }

  function restore() {
    var saved = readMap()[here()];
    if (!saved || (!saved.y && !saved.id)) return;
    /* Only take over when the browser has not already got it right -- but
       "not at the top" is not the same as "right". Chrome restores scroll
       against the document as it stands at that instant, and on a page whose
       listings arrive from a fetch that document is short, so it lands
       somewhere plausible and wrong. Bailing on any non-zero offset handed
       those pages back to a guess. The test is distance from the target. */
    if (saved.y && Math.abs((window.scrollY || 0) - saved.y) < 60) return;

    var deadline = Date.now() + 2000;
    var tries = 0;
    (function attempt() {
      tries++;
      var card = saved.id && document.querySelector('[data-id="' + CSS.escape(saved.id) + '"]');
      if (card) {
        card.scrollIntoView({ block: 'center', behavior: 'auto' });
        return;
      }
      /* The document has to be tall enough for the offset to mean anything;
         until the fetch lands, it is not. */
      if (saved.y && document.documentElement.scrollHeight > saved.y + window.innerHeight * 0.5) {
        window.scrollTo(0, saved.y);
        /* Content can keep arriving after the first paint, so hold the
           position for a couple more frames rather than declaring victory. */
        if (tries < 3) requestAnimationFrame(attempt);
        return;
      }
      if (Date.now() < deadline) requestAnimationFrame(attempt);
    }());
  }

  /* ── DO NOT SCROLL THROUGH A TRANSITION ─────────────────────────────
     Scrolling while the incoming transition is animating interrupts it: the
     browser abandons the animation and rejects viewTransition.finished with
     an AbortError, which surfaces as an unhandled rejection in the console.
     So the restore had to be bought at the cost of the fade it was supposed
     to be part of.

     pagereveal hands us the running transition on the new document, so we can
     simply wait for it. The scroll then lands after the fade instead of
     through it, and the rejection is caught rather than thrown -- a skipped
     transition is a legitimate outcome (a duplicate name, a slow snapshot, a
     user who navigated again), not an error anyone can act on. */
  var afterTransition = null;
  window.addEventListener('pagereveal', function (e) {
    if (e && e.viewTransition) {
      afterTransition = e.viewTransition.finished.catch(function () {});
    }
  });
  /* A cross-document transition has two halves and either can reject: the
     outgoing document sees it on pageswap, the incoming one on pagereveal.
     Catching only the arrival left the departure's rejection unhandled, which
     is why a single navigation produced TWO console errors rather than one.
     Skipping is a normal outcome -- a slow snapshot, a second navigation, a
     name that turned out not to be unique -- and not something a user or a
     developer can act on, so it is caught rather than logged. */
  window.addEventListener('pageswap', function (e) {
    if (e && e.viewTransition) e.viewTransition.finished.catch(function () {});
  });

  function restoreWhenSettled() {
    if (afterTransition) afterTransition.then(restore);
    else restore();
  }

  window.addEventListener('pagehide', remember);
  /* Not 'load': the fetch has not landed there either, and waiting for load
     just delays the first attempt. The loop above is what handles arrival. */
  window.addEventListener('pageshow', function (e) {
    /* A bfcache restore already has both the DOM and the scroll position, and
       stepping on it would be the one case where we make things worse. */
    if (e.persisted) return;
    restoreWhenSettled();
  });
  if (document.readyState !== 'loading') restoreWhenSettled();
  else document.addEventListener('DOMContentLoaded', restoreWhenSettled);

  /* Pages that open a property from their own handler rather than an anchor
     -- the map card's "See this home", the browse grid's card-wide click --
     can say so directly instead of being guessed at. */
  window.SynSeam = { tagPhoto: tag, clear: clear, remember: remember };
})();
