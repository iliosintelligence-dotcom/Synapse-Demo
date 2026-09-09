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

    tag(photoFor(a));
  }, true);

  /* Pages that open a property from their own handler rather than an anchor
     -- the map card's "See this home", the browse grid's card-wide click --
     can say so directly instead of being guessed at. */
  window.SynSeam = { tagPhoto: tag, clear: clear };
})();
