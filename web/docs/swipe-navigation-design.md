# Swipe navigation: gesture and motion design (phase 1 and 2)

Scope, thresholds and surfaces come from `PRD-swipe-navigation.md` and are not reopened here. This file only fixes how it looks and moves. Nothing existing is restyled: every value below is either a token that already exists or an additive rule that applies only to new elements or to a state that exists only during a gesture.

North star: the gesture should feel like the page is a physical thing you nudge, never a surprise. Small travel, no bounce on success, one hint, then quiet.

## 0. Shared tokens (reuse, add nothing)

From `web/public/app/motion.css` (also used by `inline-2.css`):

| Use | Token | Value |
|-----|-------|-------|
| Snap back, small state change | `--m-standard` | 180ms |
| Page hop, arrival, hint | `--m-expanded` | 250ms |
| All decelerating motion | `--m-ease` | cubic-bezier(0.22, 1, 0.36, 1) |
| Peek out and back | `--m-ease-inout` | cubic-bezier(0.77, 0, 0.175, 1) |
| Rubber-band release only | `--m-ease-spring` | cubic-bezier(0.34, 1.4, 0.44, 1) |

`home.css` does not load `motion.css`, so every landing rule writes the fallback inline: `var(--m-expanded, 250ms)`, `var(--m-ease, cubic-bezier(0.22,1,0.36,1))`. No hardcoded ms anywhere else.

Colors come from `home.css` variables on landing (`--bg-2`, `--surface`, `--ink`, `--muted`), which already flip on `data-theme="dark"`. On the property page use the page's own surface and muted-text variables; fallbacks given below are the landing values so the chip matches.

Follow-the-finger rule everywhere: translate = `dx * resistance`, capped, applied with `transform` only (no layout properties), `will-change: transform` set on touchstart and removed on end. Release without commit returns in `--m-standard` with `--m-ease`. Movement never exceeds 56px, so a swipe is a nudge, not a drag of the whole page.

## 1. Landing hero page hop (`/` and `/buyers`)

Spatial model: Customers is left, Agencies is right. Swipe right on `/` brings in Customers from the left. Swipe left on `/buyers` brings in Agencies from the right. The button/link between the pages uses the same direction so button and swipe feel identical.

**While the finger is down** (before commit): hero content (`.hero` wrapper, not the nav) translates `dx * 0.35`, cap 48px, in the direction of the finger. Nothing else moves. Past commit threshold, nothing changes visually; release decides. Not committed: return in 180ms.

**On commit: cross-document View Transition.**

```css
@view-transition { navigation: auto; }   /* mobile + coarse pointer only, wrapped in @media (pointer: coarse) and (max-width: 819px) */

/* direction is stamped on <html> by swipe-nav.js in pageswap / pagereveal:
   html.syn-hop-fwd  = content travels right (going to Customers)
   html.syn-hop-back = content travels left  (going to Agencies) */

::view-transition-group(root) { animation-duration: var(--m-expanded, 250ms); animation-timing-function: var(--m-ease, cubic-bezier(0.22,1,0.36,1)); }

html.syn-hop-fwd::view-transition-old(root)  { animation: syn-out-r var(--m-expanded,250ms) var(--m-ease) both; }
html.syn-hop-fwd::view-transition-new(root)  { animation: syn-in-l  var(--m-expanded,250ms) var(--m-ease) both; }
html.syn-hop-back::view-transition-old(root) { animation: syn-out-l var(--m-expanded,250ms) var(--m-ease) both; }
html.syn-hop-back::view-transition-new(root) { animation: syn-in-r  var(--m-expanded,250ms) var(--m-ease) both; }

@keyframes syn-out-r { to   { transform: translateX(14%);  opacity: 0; } }
@keyframes syn-out-l { to   { transform: translateX(-14%); opacity: 0; } }
@keyframes syn-in-l  { from { transform: translateX(-14%); opacity: 0; } }
@keyframes syn-in-r  { from { transform: translateX(14%);  opacity: 0; } }
```

Why 14% and a fade rather than a full-width slide: a full slide of a long landing page is a lot of motion and shows an unfinished half page. 14% plus opacity reads as direction without drama, and total hop is 250ms (old and new run together, not in sequence). The background (`--bg`) is the same on both pages, so the cross never flashes. Dark: black base on both, same animation, no extra effects.

Fallback when View Transitions are unsupported: instant navigation, no JS animation. Neighbour page is prefetched on first touch.

**Edge-peek hint** (first time only, see section 4 for timing). A flat strip appears on the side of the neighbouring page, 32px wide, full hero height, radius 0 16px 16px 0 (mirrored on the right edge).
- Light: `background: var(--bg-2)` (#F4ECE2), a 14px chevron in `var(--muted)` (#6B6259), centered vertically. No border, no shadow.
- Dark: `background: var(--surface)` (#16181C), chevron `var(--muted)` (#A3A8AE). No hairline. The strip is lighter-black on black, which is the whole separation.
- While the strip shows, hero content translates 32px toward the strip with `--m-ease-inout`. The strip is `position: fixed`, `pointer-events: none`, `aria-hidden="true"`, z-index below the nav.

**Two-dot position indicator.**
- Dot 6px, gap 8px. Active dot is a pill 18px by 6px (radius 3px); inactive is 6px circle. Active/inactive swap animates `width` in `--m-standard`, `--m-ease`.
- Placement: horizontally centered, absolute at the bottom of the first screen (`bottom: 14px`, plus `env(safe-area-inset-bottom)` in the app), so it scrolls away with the hero and never overlays later content. Left dot = Customers, right dot = Agencies.
- Hit area: each dot is an anchor to its page with 44px by 44px padding box (visual stays 6px). This doubles as the accessible button for the swipe. `aria-label="Customers, page 1 of 2"` and `"Agencies, page 2 of 2"`; active has `aria-current="page"`.
- Light: active `var(--ink)` (#15120F), inactive `rgba(21,18,15,0.18)`.
- Dark: active `#E7E9EA`, inactive `rgba(255,255,255,0.22)`.
- Must not collide with the hero CTA or the ask bar. If the first screen is too short for a clear 24px gap above the dots, hide the dots rather than shrink the gap (the nav link still exists).

## 2. Property title band (phase 2)

The photo keeps photo swipe. The hop target is the band holding title and price.

**Chip.** Sits as the first line of the band, left-aligned, above the title, margin-bottom 8px.
- Persistent form: `3 of 8` with a 12px left chevron and 12px right chevron on either side (chevrons are decorative; dimmed to 35% opacity when that direction does not exist, e.g. no left chevron on 1 of 8).
- Hint form (first time only): `3 of 8 · swipe for the next home`. Same chip, text expands in `--m-expanded`, collapses back to `3 of 8` on dismiss.
- Size: height 28px, padding 0 12px, radius 14px, font 13px / 1, weight 500, letter-spacing 0.01em, `font-family` inherited from the page.
- Light: `background: #F4ECE2`, text `#6B6259`.
- Dark: `background: #16181C`, text `#A3A8AE`. No border in either mode.
- The chip is a labeled control group: each chevron is a real 44px button ("Previous home", "Next home"); keyboard ArrowLeft/ArrowRight work when the band is focused. Live region `aria-live="polite"` announces "Home 3 of 8".

**Hop animation.**
- Finger down: band content (chip, title, price) translates `dx * 0.6`, cap 56px.
- Commit: band content exits 24px in the finger direction with opacity to 0 in `--m-standard` (180ms), `--m-ease`; navigation starts at the same moment.
- Arrival (View Transition with `view-transition-name: syn-band` on the band, root set to a plain 180ms cross-fade): the new band enters from 24px on the opposite side with opacity 0 to 1 in `--m-expanded`, `--m-ease`. The new photo cross-fades with the root in 180ms. Photo never slides, so it does not read as photo swipe.
- Direction: swipe left = next home (content leaves left, new one enters from the right); swipe right = previous.

**Rubber-band at list ends.**
- First home swiping right, last home swiping left: translate `dx * 0.25`, cap 28px. No navigation. Release returns in `--m-expanded` with `--m-ease-spring` (the one place overshoot is allowed, because it says "nothing there").
- Chip text swaps for 1600ms to `That's the last one` or `That's the first one`, then returns. Announced via the same live region.
- No haptic, no color change.

## 3. Cust-nav pill (phase 2)

The pill keeps its existing look (interior photo and glass; no `theme.css`, no new colors, no dark restyle). Only motion is added, and only while a finger is on it.

- Follow the finger: pill translates `dx * 0.5`, cap 24px. Vertical position never changes.
- Label crossfade: let `p = min(|dx| / 64, 1)`. The current item's existing active (`aria-current`) treatment is shown at opacity `1 - p`, the neighbour in that direction at opacity `p`, via a `--p` custom property written by `swipe-nav.js`. Reuse the existing active styling; do not introduce a new highlight color. Past `p = 1` it holds.
- Commit: pill returns to 0 in `--m-standard` while the page hops (full-page load, so the new page renders the pill at rest with the new active item; the hop itself uses the section 1 root slide with direction by pill order: Tayo to Your matches is forward/left, back is right).
- Ends of the order (Tayo, Dream boards): rubber-band `dx * 0.2`, cap 12px, release in `--m-standard` with `--m-ease`. No message; the pill is already the explanation.
- Swipe is read on the pill itself only; the pill's links keep their taps.

## 4. First-time hint

Key `syn_swipe_hint_v1`. One hint per device, per surface family: landing shows its hint on the first landing page visited; property shows its own on the first eligible property page. Each is marked seen after the first successful swipe, tap on the hint, or the 4s timeout (matches PRD). Mobile only.

**Landing timing (4s total).**
- 600ms after first paint (after the hero is readable): peek in, 500ms, `--m-ease-inout`.
- Hold 1200ms.
- Peek out, 500ms, `--m-ease-inout`.
- Caption fades in at 300ms into the hold (`--m-standard`), stays until 4s, fades out in `--m-standard`.

**Caption look.** One line, centered, 14px, `var(--muted)`, sitting directly above the dots with 10px gap. No background, no icon. Light #6B6259, dark #A3A8AE.

**Copy (plain, warm, short).**
- `/` (agencies): `Looking to buy? Swipe right.`
- `/buyers` (customers): `Are you an agency? Swipe left.`
- Property chip: `3 of 8 · swipe for the next home`
- Property, when only 1 home in the list: no chip, no hint.

Dismisses instantly (no animation) on any touchstart that becomes a swipe, a tap, or timeout. A dismissed hint never replays in the same session.

## 5. Reduced motion

`@media (prefers-color-scheme...)` is unrelated; this is `@media (prefers-reduced-motion: reduce)`:

| Surface | Reduced-motion behavior |
|---------|-------------------------|
| Landing hop | No follow-the-finger translate. `::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none; }` so the hop is an instant navigation. |
| Edge-peek | Not rendered. The caption appears with no fade, stays until dismiss or 4s. |
| Dots | Active dot swaps with no width transition. |
| Property band | No follow translate. Commit navigates instantly, no slide, no cross-fade. Rubber-band: no translate, no spring; only the `That's the last one` text swap. Chip hint is static text, no expand animation. |
| Cust-nav pill | No offset, no crossfade. Active state flips on arrival. Ends: nothing. |

Reduced-motion users still get the buttons, the dots, the chevrons and the live-region announcements.

## 6. Light and dark summary

| Element | Light | Dark (7pm-7am clock, `data-theme="dark"`) |
|---------|-------|-------------------------------------------|
| Peek strip | `#F4ECE2` (`--bg-2`) | `#16181C` (`--surface`) |
| Peek chevron, caption, chip text | `#6B6259` (`--muted`) | `#A3A8AE` (`--muted`) |
| Chip fill | `#F4ECE2` | `#16181C` |
| Dot active | `#15120F` | `#E7E9EA` |
| Dot inactive | `rgba(21,18,15,0.18)` | `rgba(255,255,255,0.22)` |
| Borders / hairlines | none | none (lighter-black surfaces and spacing only) |
| Shadows | none added | none added |
| Cust-nav pill | unchanged | unchanged |

Dark inherits automatically from the existing variables; the explicit dark hexes above exist only for elements (dots, chip) built outside those variables. The property page chip should read the page's own theme variables if present.

## Drift checklist for review

- No new colors beyond the table above; no gradients; no shadows; no borders.
- No durations outside 180 / 250 ms (peek 500ms and hold 1200ms are hint choreography only, not transitions).
- Spring overshoot only on the property rubber-band release.
- Max on-screen travel 56px while dragging; hop travel 14% (landing) or 24px (property).
- Everything is `transform` and `opacity`, so it stays smooth on mid-range Android phones.
