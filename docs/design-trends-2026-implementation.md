# Synapse — 2026 Design Trends Implementation Plan

**Status:** Proposal · **Date:** 31 July 2026 · **Scope:** the static app (`index.html`, `agencies.html`, `app/*.html`) — THE product per the consolidation decision.

> **⚠ Corrected 31 July 2026 — read this first.** This plan claimed a codebase audit, but seven
> of its claims did not survive contact with the code and the live database. They are catalogued
> as C-1…C-7 in `design-trends-2026-delegation.md` §0, and the affected sections below carry
> inline corrections. The three that most change the work:
>
> - **§2.2 was already shipped.** The edge function requests, returns and merges per-match
>   reasoning, and both card renderers display it. No backend or rendering work is needed.
> - **§1.3's verification narrative specifies data that does not exist.** There is no verifier
>   identity and no verification date anywhere in the schema. See the correction in §1.3.
> - **§2.4's streaming and 12s timeout are both wrong.** Tayo is a two-pass system whose first
>   pass must be fully parsed before the second runs.
>
> The general lesson, recorded because it caused every one of the seven: sections written from
> assumption about what the code and data contain, rather than from reading them, were wrong at
> roughly the rate you would expect from guessing.

This document turns the six researched trends — emotionally intelligent design, chatbot design, glassmorphism/reflections, illustrations, scroll interactions, and microanimations — into concrete, file-level work for Synapse. Every recommendation is anchored to what already exists in the codebase, so each section has three parts: **where we stand**, **the gap**, and **the spec**. A phased rollout with acceptance criteria closes the document.

---

## 0. Audit: where Synapse already stands

Before adding anything, credit what's built. Synapse is *already* ahead of most of the 2026 trend list — the industry swung toward calm, restrained, trust-first design, and that has been the Synapse direction from the start.

| Trend | Existing foundation | Location |
|---|---|---|
| Emotionally intelligent design | Error copy that "names the cause, never blames the user"; proximity opt-in that states what it does, won't do, and how to stop it; empty states shown as empty, never placeholder | `app/app.css` (`.inline-err`, `.prox-card`), `app/toju.html` (`.tj-error`) |
| Chatbot design | Hybrid input (suggestion pills + free text + mic), typing indicator, error surface visually distinct from Tayo's own bubbles, history drawer, Gemini-canvas split layout | `app/toju.html` |
| Glassmorphism | Two glass languages: "crystal" (optical, prismatic corner catches) on the landing; "frosted" (blur 24–36px, luminous rim, top highlight) in the app | `landing.css` (`.crystal`), `app/app.css` (`.card`), `app/toju.html` |
| Microanimations | Tokenized motion system — three durations (100/180/250ms), two easings, scroll reveal with stagger, press feedback, full `prefers-reduced-motion` stand-down | `app/motion.css`, `app/motion.js` |
| Scroll interactions | IntersectionObserver reveal, scroll-contracting wordmark, Lottie infra with visibility-gated playback | `app/motion.js` |
| Illustrations | Lottie mount points exist (`[data-lottie]`), but no illustration language | `app/motion.js` |

The 2026 gap is **not** "add more effects." It is: (1) emotional calibration at the *specific* high-stakes moments of a property purchase, (2) trust/transparency patterns in Tayo that the research says are now table stakes, (3) one modernization pass on the glass system, (4) an illustration identity — the single biggest missing piece, (5) migrating scroll effects to the now-fully-supported CSS scroll-driven animation API, and (6) a handful of purposeful microanimation additions.

---

## 1. Emotionally intelligent design

**The trend:** interfaces that respond to how the user *feels* — reducing anxiety at high-stakes actions, adapting tone and pacing, replacing visual theatrics with clarifying structure. Strongest adoption is in mortgage/insurance/investment UX. Synapse's domain (the largest purchase of a Lagos buyer's life, in a market with real fraud anxiety) is precisely this category.

### 1.1 Map the emotional journey first

Before styling anything, formalize the five emotional peaks of the Synapse buyer journey. Every spec in this section attaches to one of them:

| Moment | Page | Dominant emotion | Design job |
|---|---|---|---|
| First contact with Tayo | `app/toju.html` | Skepticism ("another chatbot?") | Capability honesty, instant usefulness |
| Seeing matches | `app/toju.html`, `app/browse.html` | Hope + overwhelm | Progressive disclosure, "why this" reasoning |
| Scrutinizing a listing | `app/property.html` | Fraud anxiety | Verification prominence, calm density |
| Contacting an agency | `app/property.html` | Commitment fear | Preview-before-send, reversibility, expectation-setting |
| Waiting for a response | all | Abandonment worry | Status honesty, proactive updates |

### 1.2 Anxiety-reduction at the contact moment (highest priority)

The "contact agency" action is Synapse's conversion event and its scariest click. Spec:

- **Preview before send.** The contact CTA never fires immediately. It opens a frosted sheet (reuse `.card` glass recipe) showing: what will be sent, *to whom* (agency name + verification chip — `.chip-pass` already exists), and *what happens next* ("Adewale Properties typically replies within 4 hours" — the data point exists in agency records; surface it).
- **Reversibility statement.** One line under the confirm button: "This shares your name and this conversation's requirements. Nothing else. You can stop replies anytime." Same plain-spoken register as the existing `.prox-card` copy — that component is the house style for consent moments; clone its structure (`what it does / what it won't do / how to stop`).
- **Post-send state.** Replace the button with a quiet confirmation ("Sent — you'll hear back by ~2pm") rather than a celebratory animation. The research is explicit: at high-stakes moments, calm confirmation beats delight.

### 1.3 Calm density on the property page

`app/property.html` (701 lines) is where fraud anxiety lives. Apply the "calm interfaces" doctrine:

- **One decision per viewport.** Audit the page against this rule: hero + price + verification status in view 1; details view 2; agency + contact view 3. Nothing competes with the verification chip in view 1 — it is the single most emotionally load-bearing element on the page.
- **Verification narrative, not badge.** ~~Extend the trust chip into an expandable line: "✓ Verified — Synapse confirmed this listing with Adewale Properties on 14 July. Documents sighted: C of O."~~
  **CORRECTED (C-7).** That example is fabricated. `verification_nodes` stores only `{name, status}`
  pairs; `property_verifications`, `property_verification_history` and `property_verification_checks`
  are all empty across the 560 verified listings; and no verification timestamp existed until
  `verified_at` was added on 31 July 2026 (backfilled from `created_at`, so it attests to when the
  flag was written, not to an inspection). There is no verifier identity anywhere.
  **What to build instead:** a *definitional* disclosure, per `PROPERTY_TRUST_MOMENTS_SPEC.md` §B0 —
  two authored sentences per check saying what it covers and what it does not, which are true from a
  pass/fail flag alone because they define what a pass means rather than narrating an unrecorded
  event. The trigger must not promise provenance, and no empty evidence slot may render. The
  evidential version stays specced but dormant until records exist (tracked as E-8).
- **Price context, not just price.** Under the EB-styled price, a muted line: "Within the typical range for 3-bed flats in Lekki Phase 1." Reduces the "am I being cheated?" spike. Data comes from the seeded listings DB (120 verified listings — enough for area medians).

### 1.4 Tone system (microcopy spec)

Codify the register the codebase already gestures at into a written rule, applied in a copy pass over all pages:

1. **Errors:** cause + next step, never blame. (Already the `.inline-err` doctrine — extend it everywhere.)
2. **Waiting:** always a time expectation. Never "Loading…" — "Finding Lekki listings…" (Tayo already does contextual waiting; browse/property should too.)
3. **Empty:** name what would fill it. "No saved homes yet — tap the heart on any listing." Never a sad-face illustration; empty is neutral, not a failure.
4. **Consent:** the three-part `.prox-card` formula (does / won't / stop) for *every* permission or data-sharing ask, including notifications (`app/notify.js`).
5. **Never:** exclamation marks in system copy, "Oops", fake urgency ("Only 2 left!"), guilt-framing on declines ("No thanks, I don't like saving money").

### 1.5 Frustration signals (lightweight, no surveillance)

The trend literature pushes "frustration detection." For Synapse, implement only the two honest, local signals — no tracking, consistent with the privacy posture:

- **Rage-click on a dead zone** (3+ clicks, 600ms, same 24px radius, non-interactive target): surface the existing `#synToast` with an orientation hint, e.g. "Tap a photo to open the listing." Implement in `app/motion.js` as a ~20-line addition; throttle to once per session per zone.
- **Repeated Tayo failure** (2 consecutive `.tj-error` events): change the third response's framing — stop retrying silently, offer the escape hatch: "This isn't working — you can browse listings directly while I recover." Links to `app/browse.html` carrying the current filters. This is the "flow resilience" pattern from the chatbot research, applied at the emotional level.

---

## 2. Chatbot design — Tayo

**The trend:** hybrid input, capability transparency, short messages, visible reasoning ("why this recommendation"), graceful recovery, proactive co-thinking, mobile-first. Tayo already has the strongest foundation in the app; the gaps are transparency and reasoning-display.

### 2.1 Capability transparency (opening moment)

The research is unanimous: state upfront what the bot can and can't do. Spec for the first-visit greeting (before any user input):

> "I'm Tayo. I know Synapse's **verified listings** — currently 120 across Lagos — and I can narrow them to what fits you, explain areas, and connect you to the agency when you're ready. I **can't** see listings outside Synapse, and I never share your details until you choose to contact an agency."

- Rendered as a normal Tayo bubble, followed by the suggestion pills. One-time (keyed in the existing visitor-memory store); returning visitors get the shorter "Welcome back — still looking in Lekki?" which the grounded-Tayo runtime already supports.
- The count ("120") should be live from the DB, not hardcoded — honesty pattern *and* freshness signal.

### 2.2 "Why this match" — visible reasoning on `.pcard`

**CORRECTED (C-1): this is already shipped end-to-end.** The edge function asks for and returns
per-match reasoning and merges it before responding; `app/toju.html` and `app/matches-shared.js`
both already render it. There is no backend response-shape work and no new rendering to do. The
real gaps are narrower: the `why` reads as free prose rather than echoing the user's stated
criteria (a doctrine change, since delivered), and the "Not right?" override genuinely does not
exist. Read the rest of this section as describing those two things only.

Transparent AI is the single most emphasized 2026 pattern. Tayo's two-pass grounded runtime already *has* reasoning — it selects matches against user-stated criteria. Surface it:

- Add one line to each match card: `.pcard .why` — muted, 12px: "3 beds · within your ₦80m ceiling · 10 min from Victoria Island as you asked". Composed from the criteria the runtime matched on (the data exists in the match response; this is a rendering change in `app/toju.html` + a small prompt/response-shape addition in the toju-demo edge function).
- **Override affordance:** a quiet "Not right?" link on each card that feeds structured rejection back into the conversation ("Show me options without the Lekki listings"). This is the "let users override the AI" pattern — and it doubles as training signal for match quality.

### 2.3 Message shape: two short beats, not one block

Enforce the 40-word finding at the prompt level (in the Tayo doctrine / system prompt, which is user-authored per the runtime-loop setup):

- Answers longer than ~50 words split into **two bubbles**: the answer beat, then the guidance beat ("Want me to narrow these to gated estates?"). The `.m-enter` animation already staggers naturally if the second bubble is appended ~400ms after the first.
- Lists of areas/options render as pills or the `.pcard` stack — never as a prose paragraph of comma-separated names.

### 2.4 Streaming and perceived speed

**CORRECTED (C-3, C-4).** Streaming is not possible in the current architecture: pass one returns
strict JSON that must be fully parsed — there is even a `salvageWhys` repair path — before pass two
rewrites it. You cannot stream a payload you must parse first. And a 12s timeout is wrong for a
two-pass system making two model calls; it would abort healthy requests and manufacture the errors
it exists to catch. The existing 25s stands.

- Keep `.typing-dots` and add **stage narration** — at 2.5s "Checking this against our verified
  listings…", at 6s "Still with you — I'd rather get this right than fast." Honest stages beat
  silent dots, and this, not streaming, is what actually solves perceived speed here.
- Timeout stays at **25s** into the `.tj-error` surface (already well designed — visually distinct
  from bubbles, so it never reads as something Tayo said).

### 2.5 Proactive engagement (restrained)

The trend pushes bots as proactive co-thinkers. For Synapse, only two proactive moves — both value-dense, neither naggy:

1. **Dream-board bridge:** if the visitor has dream-board items (`app/dream.html` context is already fed to the runtime), Tayo's greeting references it: "I see coastal and minimal on your board — Ilashe and parts of Ajah lean that way. Want to start there?"
2. **Return-visit delta:** "Since Tuesday, 2 new listings match what you described." Requires only visitor memory (exists) + a match-count diff.

Never: unsolicited popups on browse/property pages, "Are you still there?", or engagement bait.

### 2.6 Mobile

70%+ of chatbot use is mobile. The two-pane canvas (`body.has-canvas`, chat 25% / canvas 75%) has no mobile spec. Define it: below 720px, matches open as a bottom sheet over the chat (reuse the frosted `.chatbox` glass), with a grabber and the chat remaining reachable behind it. The composer's fixed positioning must respect `env(safe-area-inset-bottom)` (currently `padding-bottom: 34px` hardcoded).

---

## 3. Glassmorphism and reflections

**The trend:** glass is back as a *tool*, not a theme — Apple's Liquid Glass direction: light-reactive depth, subtle reflections, physical grounding. Known traps: contrast failure and GPU cost.

Synapse already has two glass dialects. The work is one modernization pass plus guardrails — **not** more glass.

### 3.1 Where glass is allowed (codify the rule)

Write this into the CSS as a comment block, because scope-creep is the documented failure mode of this trend:

> Glass appears only on elements that *float over content*: the appbar, the Tayo chatbox/bubbles, match cards over the photo backdrop, sheets/modals, and the landing's crystal panels. Never on full-page backgrounds, body text containers, or anything containing paragraphs of muted text.

The Tayo page is the ideal glass showcase — frosted panels over property photography is exactly the on-trend use — and it's already built that way. Keep it as the flagship.

### 3.2 Liquid-glass modernization (one pass, three effects)

Upgrade the existing recipes with the light-reactive depth that distinguishes 2026 liquid glass from 2020 frosted glass:

1. **Specular edge that responds to scroll.** The `.card` inset highlight (`inset 0 1px 0 rgba(255,255,255,0.9)`) is static. Add a CSS custom property `--light-angle` updated by a tiny scroll handler (rAF-throttled, in `motion.js`), shifting the highlight's gradient stop ±20%. Cost: one `background-position` change on a pseudo-element — compositor-friendly. Reduced-motion: static, as now.
2. **Hover refraction on `.pcard`.** On hover, the existing lift (`translateY(-1px)`) plus a 1px shift of the backdrop blur's saturation (`saturate(1.6→1.75)`) — reads as light passing through the pane. Two properties, both cheap.
3. **The tint discipline extends to glass.** The burnt-orange `--tint` may appear in glass as at most one warm gradient stop at ≤0.03 alpha (the Tayo shadow `rgba(122,62,22,0.13)` already does this correctly). Never as a visible orange glow.

### 3.3 Guardrails (the trap-avoidance spec)

- **Contrast:** any text on glass must pass 4.5:1 against the *worst-case* backdrop, not the average. For Tayo bubbles over photography, this means the fill floor stays at `rgba(255,255,255,0.66)` or higher — treat that value as a token, not a tweakable. Add a comment marking it load-bearing.
- **Performance budget:** max **3 concurrently-painting `backdrop-filter` surfaces** per viewport. The Tayo page currently can exceed this (appbar + chatbox + hint + N bubbles + N pcards). Fix: bubbles scrolled out of the top of `.convo-scroll` get a class swapping `backdrop-filter` for a pre-baked solid (`content-visibility: auto` on `.msg` also helps). Test on a mid-range Android — Lagos's median device, not a MacBook.
- **Fallback:** `@supports not (backdrop-filter: blur(1px))` → solid `rgba(255,255,255,0.92)` fills. Currently missing; older Android WebViews will otherwise get unreadable transparency.

---

## 4. Illustrations

**The trend:** human-made, imperfect, textured illustration as the anti-AI-slop identity signal; motion illustration; and — the direct hit for Synapse — **regional and identity-focused narratives**. This is Synapse's biggest gap and biggest opportunity: a Lagos-rooted brand with zero illustration is leaving the strongest 2026 differentiator unused.

### 4.1 Direction: "Lagos, drawn by hand"

Commission (or art-direct) a small set in one consistent style:

- **Style spec:** loose hand-drawn linework in near-black (`#121212` — the brand ink), single-weight, on the paper-grey `--bg`. Sparse warm accents only via the `--tint` discipline (one burnt-orange element per illustration, small, never dominant — matches the "silver lining" palette rule exactly). Imperfection deliberate: visible line wobble, no vector-smooth curves. This is precisely the "messy, human, meaningful" direction *and* it slots into the monochrome system without a palette exception.
- **Subject matter:** Lagos specificity — danfo yellow as the one tint accent, Lekki-Ikoyi bridge silhouette, compound gates, mango trees over fences, okada at a junction. Landmarks buyers actually navigate by; the illustrations should feel like the city, not like "African-themed clipart."

### 4.2 Placement map (12 assets, priority order)

| # | Asset | Page / slot | Format |
|---|---|---|---|
| 1–4 | Empty states: no saved homes, no matches yet, no conversations, offline | `browse`, `toju`, `dream` | Inline SVG |
| 5 | Tayo identity mark (distinct from the Synapse wordmark — Tayo should have a *face* or sigil, hand-drawn) | `.av-toju`, greeting | SVG |
| 6–8 | Landing narrative spots: "describe it" / "Tayo finds it" / "agency verified" — the three-step story | `index.html` | SVG |
| 9 | Diaspora slide art (carousel already exists) | `index.html` | SVG |
| 10 | Verification explainer spot (the C-of-O / documents moment) | `property.html` | SVG |
| 11–12 | Two looping motion illustrations: Tayo "thinking" (replaces typing dots' third state), landing hero accent | Lottie via existing `[data-lottie]` infra | Lottie JSON |

Empty states first: they're the cheapest wins, they land exactly where emotional design needs warmth (moments of "nothing"), and they never fight content for attention.

### 4.3 Rules

- SVG inline (styleable via `currentColor`, themeable, no requests); Lottie only for the two loops — the loader, visibility-gating, and reduced-motion stand-down in `motion.js` already handle everything.
- Illustrations never carry information alone (accessibility) and never appear on the property page's transaction path — warmth belongs at the edges of the journey, calm at its center.
- Ship a one-page style sheet (line weight, wobble tolerance, the one-accent rule, do/don't examples) so future assets — including social content from the social-media pipeline — stay in-family.

---

## 5. Scroll interactions (the Webflow-trend layer, implemented natively)

**The trend:** guided scrolling (wayfinding, progress), sticky scroll reveals, scroll-linked animation — now possible in pure CSS since Scroll-Timeline reached full browser support in February 2026. Performance rule: `transform` and `opacity` only.

Synapse is a static-HTML product; everything Webflow demos can be done directly, lighter.

### 5.1 Migrate reveals to CSS scroll-driven animations (progressive enhancement)

The IntersectionObserver reveal in `motion.js` works; keep it as fallback. Add the native version in `motion.css`:

```css
@supports (animation-timeline: view()) {
  [data-reveal] {
    opacity: 0; transform: translateY(14px);
    animation: reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 60%;
    transition: none;
  }
  @keyframes reveal { to { opacity: 1; transform: none; } }
}
```

Reveals become scrubbed-by-scroll (reversible, jank-free, zero JS) where supported. `motion.js` should skip tagging `.in` when the support flag is present. Reduced-motion stand-down carries over unchanged.

### 5.2 Guided scrolling on the landing page

`index.html` is a long narrative (790 lines). Add wayfinding:

- **Reading progress:** a 2px top hairline scaled by scroll progress — this is *the* canonical use of the new API (`animation-timeline: scroll()`, `transform: scaleX()`). And it's the sanctioned home for the tint: a burnt-orange hairline is exactly a "countdown bar" per the palette doctrine.
- **Section wayfinding:** a fixed rail of 4–5 dots (one per landing chapter), current dot filled via `scroll-margin`-anchored `IntersectionObserver` (tiny addition to the existing observer code). Dots are `--tint-ink` pips — again exactly what the palette reserves the tint for.
- **Sticky chapter reveal (one, not five):** the "how it works" three-step section pins its headline while the steps scroll past (`position: sticky` + a `view()` timeline driving step opacity). Restraint rule: **one** pinned section per page; the research warning against scroll-jacking is explicit, and nothing may hijack scroll speed or direction.

### 5.3 The scrolled-appbar pattern, finished

The wordmark already contracts on scroll (`.appbar.scrolled`). Complete the state: in `scrolled`, deepen the appbar blur (`blur(20px)→blur(28px)`) and strengthen its bottom hairline — the bar visibly "hardens" as content slides beneath it. Two declarations on an existing class; pure liquid-glass physicality.

### 5.4 Performance rules (inherit, enforce)

Already implicit in the codebase; make them written law in `motion.css`'s header comment: animate `transform`/`opacity` only; `will-change` never left set on idle elements; every scroll listener passive + rAF-coalesced (the `motion.js` ResizeObserver pattern is the house model).

---

## 6. Microanimations

**The trend:** purposeful only ("clarify, guide, or confirm — or cut it"), 200–500ms, physics easing, reduced-motion as standard, adaptive intensity as the frontier.

The token system is already correct and disciplined. Additions are small and all pass the purpose test:

### 6.1 State-change confirmations (the missing category)

Synapse has press feedback and entrances but few *confirmations*:

- **Save-to-favorites:** heart fills with a single `--m-ease-spring` scale pulse (1→1.25→1, 250ms = `--m-expanded`), plus `#synToast` "Saved — compare anytime from your homes." The pulse is the confirm; the toast is the guide.
- **Filter apply (browse):** result count crossfades old→new number (180ms) instead of snapping — confirms the action *changed something*.
- **Match arrival (Tayo canvas):** `.pcard`s already stagger via `--reveal-i`; cap total sequence at 400ms so five cards never feel slower than one.
- **Send:** the composer's send button does a 100ms press-settle (exists via `.m-press`), and the user bubble departs *from the composer's position* — a 10px translate origin shift in `.m-enter`'s `from` state for user messages. Cheap, and it physically connects "I typed here" to "it went there."

### 6.2 Adaptive intensity (the 2026 frontier pattern, cheaply)

Two-tier, no ML: after 5 visits (counter in the existing visitor-memory localStorage), add `html.familiar` — reveal distances drop 14px→8px, stagger 60ms→40ms, the load splash (`#syn-load`) shortens its veil delay. New visitors get full orientation motion; regulars get a quicker app. ~10 lines of CSS overrides + 3 lines of JS.

### 6.3 Timing law (write it down)

Add to `motion.css`'s header: every duration must be one of the three tokens; anything longer than `--m-expanded` (250ms) is a *transition of place* (sheet, page, canvas morph) and capped at 350ms — the Tayo split-layout morph (`.tj-chat` at 350ms) is the sanctioned maximum, nothing may exceed it.

### 6.4 Haptics (note for the RN app only)

The trend's haptic guidance applies to `packages/ui` (React Native), not the web app. Web vibration API is unreliable and permission-noisy — explicitly out of scope here; mirror the confirm-pulse patterns with `expo-haptics` selection ticks when the RN screens are built.

---

## 7. Cross-cutting requirements

**Accessibility (non-negotiable, from wireframe):**
- Reduced-motion: every new animation joins the existing stand-down blocks. The CSS scroll-driven reveals and progress bar get their own `@media (prefers-reduced-motion: reduce)` overrides (progress bar may remain — it's status, not motion; scrubbed reveals become static).
- Focus: the `:focus-visible` ring guarantee in `app.css` extends to every new interactive element (wayfinding dots, "Not right?" links, sheet grabbers).
- Contrast: worst-case-backdrop testing for all glass text (§3.3); illustrations never sole carriers of meaning (§4.3).
- Tayo: `aria-live="polite"` on the conversation scroll region so streamed/appended messages are announced; suggestion pills reachable by keyboard in DOM order.

**Performance budget (Lagos-median-device rule):** test on mid-range Android over throttled 3G. Hard limits: ≤3 painting backdrop-filters per viewport; no new JS libraries (the CSS scroll API *removes* JS; Lottie stays lazy-loaded); inline SVG illustrations ≤12KB each; LCP on `index.html` must not regress from the illustration additions (they're below the fold or tiny).

**Brand guardrails carried into all six trends:** monochrome ink stays the palette; the `--tint` appears only as pips, hairlines, progress, and the single illustration accent — never text, never washes above 0.03, never glows. EB Garamond/Josefin hierarchy untouched. Empty is neutral. Copy never exclaims.

---

## 8. Phased rollout

**Phase 1 — Trust & Tayo transparency (highest impact, ~1 week of sessions)**
Capability-transparency greeting (§2.1) · "why this match" lines + override link (§2.2) · two-beat message shaping in the doctrine (§2.3) · staged waiting narration + 12s timeout (§2.4) · contact-agency preview sheet (§1.2) · verification narrative on property page (§1.3).
*Accept when:* a first-time visitor can state what Tayo can/can't do after the greeting; every match card shows its reasoning; the contact flow shows recipient + payload + expectation before anything sends.

**Phase 2 — Emotional microcopy & calm pass (~3 sessions)**
Tone-system copy audit across all pages (§1.4) · price-context line (§1.3) · empty-state copy (pre-illustration) (§1.4) · rage-click hint + repeated-failure escape hatch (§1.5) · save/filter/send confirmations (§6.1).
*Accept when:* zero "Loading…"/"Oops" strings remain; every waiting state names what's happening; every destructive/committing action states its consequence.

**Phase 3 — Scroll & glass modernization (~3 sessions)**
CSS scroll-driven reveals + progress hairline + wayfinding dots (§5.1–5.2) · one sticky chapter (§5.2) · appbar hardening (§5.3) · specular scroll edge + hover refraction (§3.2) · backdrop-filter budget fix on Tayo + `@supports` fallback (§3.3) · adaptive intensity tier (§6.2).
*Accept when:* landing scrolls with visible wayfinding on a mid-range Android at 60fps; Tayo stays ≤3 painting blurs; no-backdrop-filter browsers get readable solids.

**Phase 4 — Illustration identity (parallel track — art production, then ~2 sessions integration)**
Style sheet + commission per §4.1 · empty states in (§4.2 #1–4) · Tayo mark (#5) · landing narrative spots (#6–9) · two Lottie loops last (#11–12).
*Accept when:* all four empty states use in-family illustrations that read at 200px; Tayo has a distinct hand-drawn identity; the style sheet exists so the next asset needs no re-litigation.

**Explicitly rejected** (fails the calm/purpose tests): full-page liquid-glass theming · scroll-jacking or horizontal-scroll sections · proactive Tayo popups outside its page · celebration confetti on any action · AI-generated illustration (defeats §4's entire purpose) · dark-pattern urgency mechanics.

---

*Sources: trend research conducted 31 July 2026 — Envato (calm interfaces/transparent AI), Parallel & Fuselab & Groto (chatbot UX patterns), Design Signal & Setproduct (liquid glass), Creative Bloq & Anna Goodson & Craftwork (illustration 2026), Webflow blog & CSS Agency (scroll interactions, GSAP/Scroll-Timeline), Primotech & CreateBytes & Acodez (microinteractions). See the research summary delivered in-session for links.*
