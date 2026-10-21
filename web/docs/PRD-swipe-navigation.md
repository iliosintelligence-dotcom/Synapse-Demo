# PRD: Swipe navigation on mobile

Status: scoped 2026-10-21, branch `mobile-swipe` (uncommitted). Owner: product. Applies to the mobile web site and the Capacitor app (which loads the same live site, so one implementation ships to both with no store release).

## Goal

On a phone, moving between things should be a swipe, not a hunt for a button. Principles served: Speed (remove steps), Human-first (thumb-friendly), Trust (a gesture never surprises, never loses the buyer's place).

Success is not "swipes happened". It is: buyers see more homes per visit (property-to-property), the customer/agency landing switch is found by the right audience, and accidental swipes stay rare (see Analytics).

## What already exists (do not rebuild)

Read from the code; these already swipe and stay as they are:

- Property hero photos: `web/src/legacy/property/inline-3.js` (`swipeHero`, lightbox swipe with follow-the-finger, ArrowLeft/Right on the stage).
- Property card deck (`#deck`, native scroll-snap, `scroll-snap-stop: always`) and `sealEnds()`, which cancels a horizontal drag at either end so Safari's back-swipe does not fire.
- Horizontal carousels with native scroll-snap on the landing pages: `.rl-track`, `.pr-grid`, `.hf-track` (`web/public/home.css`), `.car-track`, `.m-hero-chips` (`landing.css`, `landing-mobile.css`).

So the work is the missing hops: between pages, and between homes.

## Scope: what gets swipe

| # | Surface | Gesture | Decision |
|---|---------|---------|----------|
| 1 | Landing: agencies (`/`) <-> customers (`/buyers`) | Swipe on the first screen (hero) | IN, phase 1. Customers is left, agencies is right: swipe right on `/` goes to `/buyers`; swipe left on `/buyers` goes to `/`. Buyer-first order, matching the roadmap. |
| 2 | Property page: next / previous home | Swipe on the title/price band under the photo | IN, phase 2. Only when the buyer arrived from Your matches or Tayo (list order is recorded when they tap a card; absent list means no gesture and no hint). The photo keeps owning horizontal swipe for photos. |
| 3 | Customer pages: Tayo / Your matches / Dream Home | Swipe on the floating nav pill (`public/app/cust-nav.js`) | IN, phase 2. Order from `PAGES` in cust-nav.js: Tayo, Your matches, Dream boards. |
| 4 | Your matches / Dream Home whole-page swipe | Swipe on empty page background | LATER, phase 3, only if analytics show pill swipe is used and no conflict reports. |
| 5 | Tayo (chat) body | none | OUT. Selection, scrolling transcript, property-card carousels and the composer all fight a page swipe. The pill is the only Tayo swipe. |
| 6 | Landing: section to section | none | OUT. No vertical or horizontal section snapping. Forced snap breaks reading long sections and the pinned "reality" section (`.rl-pinned`), and strands people mid-thought. Native scroll stays. |
| 7 | Agency portal, studio, verification, sign-in, legal pages | none | OUT. Dense, form-heavy, and agency-side is not ahead of buyer trust. |

## Gesture rules (one shared module)

One small helper, `web/public/app/swipe-nav.js` (global `SynSwipe`), used by every surface so behavior is identical:

- Commit when horizontal travel is at least 64px (or at least 40px at velocity above 0.5px/ms), horizontal is at least 1.8 times vertical, and the touch lasted under 700ms. Axis is decided in the first 10px, like `swipeHero`.
- Dead edge: ignore touches starting within 28px of the left or right screen edge. That belongs to iOS back-swipe and Android gesture-back, in the browser and in the Capacitor app. We never `preventDefault` near the edge.
- Ignore the whole gesture if it starts inside: any horizontally scrollable element (`overflow-x: auto|scroll`), `.maplibregl-map` and any map canvas, `input`, `textarea`, `select`, `[contenteditable]`, anything marked `data-noswipe`, the photo stage and lightbox, `#deck`, `.thumbs`, `.sim`, `.pvc-tabs`, and the landing carousels listed above. Check by walking up from the touch target.
- Ignore if there is a non-empty text selection (`getSelection().toString()`), after a long press (over 400ms without movement), on multi-touch, and on `touchcancel`. Text selection must always win.
- Passive listeners everywhere. `preventDefault` only once the gesture is committed horizontal AND we own it (never on scrollable or edge starts).
- Page-to-page hops are full page loads (each page is its own root layout, see `web/PAGES.md`). Use cross-document View Transitions (`@view-transition { navigation: auto }`) with a slide, fall back to an instant navigation. Prefetch the neighbour page on first touch.
- The buyer's place is kept: `seam.js` already stores per-page scroll in sessionStorage; do not break it.

## Accessibility

- Every swipe has a visible, labeled button or link that does the same thing. Nothing is gesture-only. Existing buttons (deck prev/next, lightbox prev/next, cust-nav pill links, the nav link between the landing pages) stay exactly as they are.
- Keyboard: ArrowLeft/ArrowRight on the focused hop target where it makes sense (property title band, pill); no global arrow-key page navigation, which would hijack screen-reader and input use.
- `prefers-reduced-motion: reduce`: no slide, no peek, no follow-the-finger translate; the hop is an instant navigation (or a short cross-fade at most). Hints become static text.
- Screen readers: swipe is not announced as a gesture; the controls are. When a hop lands, focus goes to the page's main heading and the new page title is announced as usual. Property hop announces "Home 3 of 8" via an `aria-live=polite` region.
- Touch targets and one-handed reach unchanged (44px minimum).

## Discoverability

- Never rely on the gesture being guessed. First time only per device (`localStorage` key `syn_swipe_hint_v1`): a single slow edge-peek of the neighbouring page (landing), or a "3 of 8, swipe for the next home" chip (property). Dismisses on first swipe, tap, or after 4 seconds, and never shows again once used.
- Persistent, quiet cues: a small two-dot position indicator on the landing hero ("Customers / Agencies"), and the "n of N" chip on the property band.
- Mobile only (`pointer: coarse` and width under 820px). Desktop gets none of it.

## Analytics

Existing stack is GA4 through `gtag` with consent denied by default and granted via `consent.js` (`syn_consent_v1`). Use it; no new vendor, no new storage, no personal data, no listing owner data. Events fire only through `gtag`, so denied consent means no events.

- `swipe_nav` with `surface` (landing | property | cust_nav), `direction` (left | right), `from`, `to`, `method` (swipe | button).
- `swipe_hint_shown`, `swipe_hint_dismissed` (`reason`: used | tap | timeout).
- `swipe_reversed`: a hop followed by the opposite hop within 3 seconds. This is our accidental-swipe signal.

Questions these answer: share of hops by swipe vs button; homes viewed per session before and after; reversal rate (target under 8 percent, if higher we raise the threshold); landing switch rate by audience.

## Capacitor app

Same code, same site. Additional rules: respect `--syn-native-left` and `--syn-native-right` insets when computing the dead edge (use the larger of 28px and the inset). Do not change `capacitor.config.ts` or native projects in this work. Open item for a native check on real devices (below).

## Phasing

1. Phase 1 (smallest useful): `swipe-nav.js` + landing agencies/customers swipe + hint + analytics events + reduced-motion path. One page pair, lowest risk, proves the helper.
2. Phase 2: property next/previous home (needs the list-order record from Your matches and Tayo cards) + cust-nav pill swipe.
3. Phase 3 (gated on data): whole-page swipe on Your matches and Dream Home.

## Not doing

Vertical section snapping on landing; any gesture on Tayo's chat body, maps, or the agency side; desktop swipe; new analytics vendor; changes to the native projects.

## Acceptance (phase 1 and 2)

- Swiping a carousel, panning a map, dragging a photo, selecting text, or using the system back-swipe from the screen edge never changes page.
- Every hop also works by its button and by keyboard where specified.
- With reduced motion on, no movement animation occurs.
- Existing parity tests (`web/tests/parity`) and `npm run build` still pass; landing pixels are unchanged at rest.
- Events appear in GA4 only when consent is granted.

## Open decisions for Eden

1. Landing order: customers on the left and agencies on the right (recommended), or the reverse?
2. Confirm no section snapping on the landing (recommended: none).
3. Property next/previous lives on the title/price band, not the photo. Accept that photo swipe stays photos-only?
4. Phase 3 whole-page swipe: wait for data (recommended) or skip entirely?
5. Native check: someone needs to try the dead-edge behavior on a real iPhone and a real Android with gesture navigation before phase 2 ships.
