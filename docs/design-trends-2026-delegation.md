# 2026 Design Trends — Delegation Plan

**Source:** `docs/design-trends-2026-implementation.md` (Proposal, 31 July 2026)
**Status:** Delegation-ready · **Owner:** PM · **Date:** 31 July 2026

This document turns the source plan into discrete, independently assignable work items with
owners, dependencies and acceptance mapping. It is not a re-litigation of the plan's design
direction — that stands. It is the execution layer.

Two logistical facts that govern everything below:

- **The static app is THE product.** All frontend work lands in
  `index.html`, `agencies.html`, `app/*.html`, `landing.css`, `app/app.css`,
  `app/motion.css`, `app/motion.js`, `app/matches-shared.js`, `app/icons.js`, `app/notify.js`.
- **Tayo's runtime is in a different repo.** The doctrine (system prompt) and response shape
  live in `../synapse-platform/supabase/functions/toju-demo/index.ts` — a sibling repo, not
  this one. Any `toju-ai` or `backend-developer` item touches that file and requires an edge
  function redeploy. Frontend agents must not be told to "just change the prompt."

---

## 0. Corrections to the source plan (READ FIRST)

The source plan was written after a codebase audit, but six of its claims are wrong or
incomplete against the code as it actually stands today. These corrections change scope,
ownership and sequencing — several of them shrink the work, one of them adds a blocker the
plan didn't see. **Do not brief any agent from the source plan alone; brief from this list
plus the work breakdown.**

### C-1 — "Why this match" is already shipped end-to-end. §2.2 is half-done.

The plan says surfacing match reasoning needs "a rendering change in `app/toju.html` + a small
prompt/response-shape addition in the toju-demo edge function." Both already exist.

- The edge function's second pass already asks for and returns a per-match reason, and already
  merges it onto each match object before responding:
  `matches = matches.map((m) => ({ ...m, why: whys[m.id] ?? null }))`
  (`../synapse-platform/supabase/functions/toju-demo/index.ts`), returned via
  `json({ reply, showMatches, matches, suggestions })`.
- The in-chat card already renders it (`app/toju.html`):
  `const why = m.why ? '<div class="watch reason"><b>Recommended —</b> ' + esc(m.why) + '</div>' : '';`
- The canvas/browse card already renders it too (`app/matches-shared.js`, `.why` block, styled
  at `app/toju.html` `.listing .why`).

**What this changes:** no backend response-shape work is needed for §2.2, and no new frontend
rendering. The real remaining gaps are (a) the `why` line is free-form advisor prose, not the
structured criteria-echo the plan specs ("3 beds · within your ₦80m ceiling · 10 min from VI as
you asked") — that is a **doctrine** change, and (b) the **"Not right?" override affordance does
not exist at all** — that is the genuine new build. Backend drops off the Phase 1 critical path.

### C-2 — BLOCKER: the contact-agency flow does not actually send anything.

`app/property.html` `#contactBtn` runs a `setTimeout(..., 650)` and then asserts to the user:

> "Your request has been sent to the agent — they'll reach out on WhatsApp shortly."

**Be precise about what is and isn't fake here, so the fix isn't scoped wider than it needs to
be.** The auth gate is *real and correct*: unauthenticated users are genuinely routed to
`signin.html?reason=contact&next=…` with a working return path, and the single-flight guard
against double-taps is real. **Only the send is fake** — `proceed()` is a 650ms `setTimeout`
followed by a definitive claim that a request reached an agent. There is a real `create-lead`
edge function in the platform repo that is simply never called from here.

The plan's §1.2 spec builds a consent sheet — "this shares your name and this conversation's
requirements" — **on top of that stub**. Shipping precise data-sharing copy over a `setTimeout`
is a trust and legal exposure, not a design improvement.

**What this changes:** Phase 1's contact-preview work is blocked on a decision by Eden (see
**E-1**), and the legal copy item cannot be finalised until that decision lands. This is the
single biggest thing the source plan missed.

### C-3 — The 12s Tayo timeout in §2.4 is wrong for this runtime. Keeping 25s.

The plan calls for a "hard timeout at 12s." The code uses 25s
(`setTimeout(() => ctrl.abort('timeout'), 25000)` in `app/toju.html`), and correctly so: Tayo is
a **two-pass** system — one Anthropic call to reason and shape criteria, a second to ground the
matches and write the per-match `why`. Twelve seconds would routinely abort successful requests
and manufacture `.tj-error` surfaces on healthy traffic. That is a trust regression dressed as a
speed improvement.

**Decision (PM):** keep the 25s hard timeout. Implement the staged narration at 2.5s / 6s / 12s
as specified — narration is what actually fixes the perceived-speed problem the 12s cap was
reaching for. *Principle: Speed and Transparency are served by honest staging, not by aborting
work that is about to succeed.*

### C-4 — Streaming (§2.4) is not available and should not be attempted now.

The plan hedges "if the edge function supports streaming." It does not, and the architecture
actively prevents it: pass 1 returns **strict JSON** (`{reply, showMatches, suggestions, criteria}`)
that is parsed and repaired server-side (there is even a `salvageWhys` recovery path for truncated
JSON), then pass 2 rewrites the reply. You cannot stream a payload you must fully parse before you
know what it says.

**Decision (PM):** streaming is out of scope for Phases 1–3. Staged narration replaces it. A
text-first re-architecture is a real option but it is a backend redesign, not a design-trend item —
logged as **E-2** for Eden.

### C-5 — A live trust bug: every match card navigates to the same hardcoded listing.

`app/toju.html` builds each match card as `'<a class="pcard" href="property.html">'` — no listing
id. `app/property.html` confirms it with an in-file comment: *"This demo page represents one
listing; a real app passes the id in the URL"* and a hardcoded `PROP = { id: 'lekki-ph1-3bed', ... }`.

So Tayo can give a buyer a perfectly reasoned "why this match" line, and tapping it opens a
different property. Phase 1's entire thesis is *visible reasoning builds trust*. Reasoning that
leads to the wrong home destroys more trust than no reasoning at all.

**Decision (PM):** this is pulled **into Phase 1** as a trust fix, not left as tech debt. It is
the precondition for AC1b meaning anything. Scope it tightly: pass and read a listing id, fall
back to current behaviour when absent. It is explicitly **not** a dynamic-listing rebuild against
the DB.

### C-2 and C-5 are deliberate demo scaffolding, not accidental defects.

Both are self-documented in the code — `app/property.html:487` carries the comment *"This demo
page represents one listing; a real app passes the id in the URL,"* and the contact stub sits
under a comment block explaining the auth-gate reasoning. Someone built these knowingly, as
scaffolding for a demonstration.

That reframes the question entirely. It is **not** "did we ship a bug." It is: **is this demo
being shown to people who believe it is real?** A stub that a founder clicks through in a private
walkthrough is a reasonable shortcut. The same stub in front of a prospective buyer, an agency, or
an investor is the interface asserting something untrue — which is the one thing the mission's
Trust and Transparency principles do not survive. Who currently sees this build, and in what
context, is the actual input Eden needs to supply. See **E-1**.

### C-6 — Two smaller factual corrections.

- **The tint guardrail is already being violated in code.** `app/toju.html` has
  `.pcard .watch b { color: #b0521f; }` and `.listing .why b { color: #b0521f; }` — burnt orange
  used as **text**, which the brand rule forbids (tint = pips, hairlines, progress, map pings only).
  It is on the "Recommended —" label of the very reasoning line Phase 1 is promoting. **Decision
  (PM):** resolve to ink-bold during the Phase 2 calm pass; `ui-designer` confirms the substitute
  weight/colour. Flagged now so nobody "matches the existing pattern" and spreads it.
- **The dark-mode/emerald design tension appears already resolved in code.** `landing.css` is
  monochrome ink on paper-grey with the `--tint` correctly fenced
  (`--tint-ink: rgba(var(--tint), 0.85); /* pips + pings ONLY, never text */`), and the crystal
  system is light. The only dark surface is one deliberate band (`#proximity .s-band.dark`). The
  glassmorphism/dark-mode conflict I was asked to watch for **is not present in the current code** —
  but Eden should confirm this is settled rather than an accident (**E-6**).

### C-7 — §1.3's verification narrative specifies data that does not exist.

The plan's headline example for the verification disclosure reads:

> "✓ Verified — Synapse confirmed this listing with Adewale Properties on 14 July. Documents
> sighted: C of O."

**Neither the date nor the verifier exists anywhere in the data model.** Confirmed by direct query
of the live database (project `bhrhejpekmhbhwryjhgk`):

- `properties` has **no verification timestamp column at all** — only `verification_status` (enum)
  and `verification_nodes` (jsonb).
- `verification_nodes` is populated on all 560 verified listings, but each entry is only
  `{name, status}` × 7 — a pass/fail flag with no date, no verifier identity, no evidence reference.
- `property_verifications`, `property_verification_history` and `property_verification_checks`
  are **all zero rows**.

So the plan's own flagship trust example is invented data — the same failure mode this corrections
section already catalogues twice (C-2's false send, and the escrow claims in agency ad copy). It
is logged here as a peer of those, not as a footnote.

**Three consequences:**

1. **`terms.html:59` promises verification status "as of the date shown."** There is no date to
   show, for any of the 560. The promise cannot currently be kept.
2. **It also promises re-confirmation "at least every 14 days or it is removed."** With no
   verification timestamp this cannot be recorded, evidenced or enforced, and the history table
   that would prove it is empty. The 14-day rule is currently implemented against `listed_at` — a
   *listing* date, not a verification date, because the correct column does not exist. This is
   also why Tayo's new greeting will say "104 verified listings" while the browse banner says
   560: both are honest reads of different filters, and the discrepancy is visible to any user who
   looks at both pages.
3. **Legal's T-8 is confirmed at the data layer.** Stored check names (Title, Survey, Structure,
   Flood, Legal, Area, Financial) do not match the seven named in `terms.html:59` (title
   documentation, ground survey, structural assessment, flood risk, ownership documentation, legal
   review, media accuracy).

**What this changes:** P1-11 (verification narrative) cannot be built as specified and is now
blocked on a data-model and policy decision, not on design. P1-04's spec was correct to render
"by whom + when" from real fields with line-level omission and to forbid invented verifier names —
but with current data *every* row omits both, so omission is the only case, not the edge case.
`ui-designer` has been sent this correction and asked to recommend what the disclosure should do
when it has only seven undated flags.

**C-7 RESOLUTION — accepted (PM decision).** `ui-designer` returned an answer rather than
deferring, and I am adopting it: ship the disclosure as a **definitional** layer, not an evidential
one. Two authored sentences per check type — what this check covers, what it does not cover — which
are true with nothing but a pass/fail flag, because they *define what a pass means* instead of
narrating an event that was never recorded. The trigger is renamed from "How we know →" to
"What these checks mean →", and there is a hard rule of **zero empty evidence slots**: no
"Verified by: —", no date-pending scaffolding, and no absence-admission sentence.

I specifically endorse the argument against holding the disclosure back. The failure I was worried
about — a panel that promises explanation and delivers nothing — comes from promising *provenance*.
Remove the promise and the panel becomes honest and useful at current data. This also serves
Transparency better than a bare badge: it tells a buyer the limits of what we checked, which is
information the badge actively hides. Spec: `docs/PROPERTY_TRUST_MOMENTS_SPEC.md` §B0.

The evidence layer (by whom, when, documents, re-verified) is demoted to a dormant enhancement with
layout fixed now, activating per-field per-row only when real records exist. **P1-11 is therefore
unblocked and buildable**; only the evidence layer waits on E-8.

**Adjacent catch, now owned.** The property page's map-canvas **Legal overlay hardcodes a documents
list** for the demo listing. When the ledger ships, one panel would show documentary evidence while
another says no such record exists — the same class of self-contradiction as escrow-versus-terms,
but on a single screen. Folded into P1-11 rather than left unowned: same screen, same ship, must
draw from the same source or drop the list.

**Who writes the definitional sentences: legal, not frontend (P1-12).** Each sentence is a scoped
claim about what Synapse does and does not check, and the stored check names already fail to match
the seven published at `terms.html:59` (T-8). Handing that to an implementer would quietly create
new trust claims in markup. It is sequenced behind R-00's addendum, because if legal rules the
homes chip must be softened or the terms rewritten, these sentences change with it.

It also undercuts my own §1.3 position in the REITs scope doc. I argued the homes chip means "we
surveyed the ground" and should be frozen while new asset classes get their own vocabulary. What it
means *evidentially* is: seven booleans are true, set at an unknown time, by an unknown party, with
no record retained. Whether that supports the chip currently shown on 560 live listings is now a
question for legal (**R-00**), and it has been escalated there as potentially more urgent than the
REIT questions — it affects listings live to users today, versus a category not yet built.

---

## 0b. Wave 1 outcomes — record corrections

Wave 1 (P1-01, P1-03, P1-04, P1-05) completed. Two agent reports overstated what was achieved,
verified in a browser rather than from agent self-report. The corrected record:

**AC1b is NOT met. The deep-link fix does not fix the user-visible bug.**
P1-03's plumbing is correct — a real card now navigates to `property.html?id=095832dd-…` and the
id resolves. But `app/property.html` still renders the demo scaffold, so a user who clicks
"4-Bed Terrace, Lekki Phase 1, ₦10M/yr, for rent" still lands on "3-Bed Apartment, Lekki Phase 1,
₦165M, for sale". The id is a **prerequisite** for the fix, not the fix. The symptom — Tayo
reasoning about one home and opening another — is untouched. A follow-up item to render the
listing the id points to is required before AC1b can be claimed.

**A gap P1-03 missed, since fixed.** `PROP_ID` in `app/property.html` — a separate constant
driving the save/favourite button — remained hardcoded. With deep-linking live, hearting any
listing would have saved it as the Lekki flat. Now derived from the URL with the same fallback.

**Escrow and verification-claim takedown: approved by Eden and landed.** Two notes for the record:
- Legal's T-9 was partly wrong. The "checked in person" claim is *supported* — `terms.html:59`'s
  seven-point check includes a ground survey and structural assessment. The real defect was
  absolutism: "you will only ever be shown" conflicts with browse showing 629 homes of which 560
  are verified. Now scoped to Tayo, which does filter to verified only.
- The escrow issue was worse than reported. The strings sat in `app/agency.html`'s `HEADLINES`
  generator — i.e. ad copy Synapse *suggests to agencies*. The platform was handing agencies false
  advertising to run at customers. Removed.

**P1-02 landed (code), but AC1a is NOT met — the function is not deployed.**
Handler-region writes succeeded and are esbuild-clean: criteria passthrough done, so the advisor
pass now sees `minBedrooms` and `city` and the criteria-echo `why` can be accurate rather than
lucky; live count done via a shared `verifiedFreshConds()` helper used by both `fetchMatches` and
the new `countVerifiedListings()`, so the greeting can never claim more homes than the matcher can
show; `restore` now returns `verifiedListingCount` additively. One caveat flagged by the agent:
`fetchMatches` also inner-joins `property_enrichment`, so the count can slightly overstate if
enrichment coverage slips.

**The deployed function is stale.** Live probes show it predates both the toju-ai doctrine change
and these handler edits — old prose `why` format, ~120-word replies, no `verifiedListingCount`. All
Phase 1 Tayo work is uncommitted and undeployed. **None of it is live.** AC1a is recorded as not
met and blocked on deployment. See **E-7**.

**E-1 remains undecided.** Nothing about the contact flow is approved; it stays fenced.

---

## 1. Work breakdown

**Owner key:** `UI` = ui-designer · `FE` = frontend-developer · `TJ` = toju-ai ·
`BE` = backend-developer · `LG` = legal
**Size:** S ≈ one focused session · M ≈ 2–3 · L ≈ 4+ or externally gated
**AC** maps to the source doc §8 acceptance statements, labelled:

| AC | Phase | Statement |
|---|---|---|
| AC1a | 1 | A first-time visitor can state what Tayo can and can't do after the greeting |
| AC1b | 1 | Every match card shows its reasoning |
| AC1c | 1 | The contact flow shows recipient + payload + expectation before anything sends |
| AC2a | 2 | Zero "Loading…"/"Oops" strings remain |
| AC2b | 2 | Every waiting state names what's happening |
| AC2c | 2 | Every destructive/committing action states its consequence |
| AC3a | 3 | Landing scrolls with visible wayfinding on a mid-range Android at 60fps |
| AC3b | 3 | Tayo stays ≤3 painting backdrop-filters per viewport |
| AC3c | 3 | No-backdrop-filter browsers get readable solids |
| AC4a | 4 | All four empty states use in-family illustrations that read at 200px |
| AC4b | 4 | Tayo has a distinct hand-drawn identity |
| AC4c | 4 | The style sheet exists so the next asset needs no re-litigation |

### Phase 1 — Trust & Tayo transparency

| ID | Work | Files | Owner | Depends on | Size | AC |
|---|---|---|---|---|---|---|
| **P1-01** | Single consolidated doctrine pass: capability-transparency greeting text, restructure the per-match `why` into a criteria-echo, enforce the two-beat/≤50-word message shape, and the repeated-failure escape-hatch framing | `../synapse-platform/supabase/functions/toju-demo/index.ts` (system prompts only) | TJ | — | M | AC1a, AC1b |
| **P1-02** | Return a live verified-listing count on the `restore` action so the greeting never hardcodes "120"; confirm the `why` passthrough survives the P1-01 prompt change (regression check on `salvageWhys`) | same file (handler, not prompts) | BE | — | S | AC1a |
| **P1-03** | Trust-hygiene bundle: deep-link match cards to the correct listing (`property.html?id=`), read the id in `property.html`, add `aria-live="polite"` to `.convo-scroll`, add the `@supports not (backdrop-filter)` solid-fill fallback | `app/toju.html`, `app/matches-shared.js`, `app/property.html`, `app/app.css` | FE | — | M | AC1b, AC3c |
| **P1-04** | Design spec (no code): contact-agency preview sheet + verification-narrative disclosure on the property page — layout, glass recipe reuse, the `<details>` pattern, focus order, mobile sheet behaviour | writes spec into `docs/`; references `app/app.css` `.card`/`.prox-card`, `app/property.html` | UI | — | M | AC1c |
| **P1-05** | Consent, AI-disclosure and data-sharing copy for the contact flow and the capability greeting: what is shared, with whom, what is not shared, how to stop, and the disclosure that Tayo is an AI system | copy deliverable in `docs/`; consumed by P1-08, P1-01 | LG | E-1 decision | M | AC1c, AC1a |
| **P1-06** | Render the one-time capability greeting, keyed in the existing `toju_visitor_v1` visitor-memory store; returning visitors get the short welcome-back path | `app/toju.html` | FE | P1-01, P1-02 | S | AC1a |
| **P1-07** | "Not right?" override affordance on each match card — quiet link that feeds a structured rejection back into the conversation | `app/toju.html`, `app/matches-shared.js` | FE | P1-01 (rejection phrasing), UI sign-off | M | AC1b |
| **P1-08** | Build the contact-agency preview sheet: recipient + verification chip + payload + response-time expectation + reversibility line + quiet post-send confirmation | `app/property.html`, `app/app.css` | FE | P1-04, P1-05, P1-09 | M | AC1c |
| **P1-09** | Make the contact action real: call `create-lead` from the property page, or gate the flow behind an explicit demo label — per the E-1 decision | `../synapse-platform/supabase/functions/create-lead/`, `app/property.html` | BE | **E-1 (Eden)** | M | AC1c |
| **P1-10** | Staged waiting narration in the typing indicator at 2.5s / 6s / 12s; keep the 25s hard timeout (see C-3) | `app/toju.html` | FE | P1-01 (stage wording) | S | AC1a, AC2b |
| **P1-11** | Verification disclosure as a **definitional** layer (revised — see C-7 resolution): what each check covers and does not cover, true from a pass/fail flag alone. Trigger renamed "What these checks mean →". Zero empty evidence slots. **Bundles the map-canvas Legal-overlay fix** (see below) — same screen, same ship | `app/property.html` | FE | P1-04, **P1-12** | M | AC1c |
| **P1-12** | Author the ~14 definitional sentences (two per check type: covers / does not cover), reconciling the seven stored check names with the seven published at `terms.html:59` | LG | **R-00 addendum** | M | AC1c |
| **P1-13** | Verify `agency.medianResponseHours` exists and is populated before P1-08's response-time row is assumed to render | BE | — | S | AC1c |

### Phase 2 — Emotional microcopy & calm pass

| ID | Work | Files | Owner | Depends on | Size | AC |
|---|---|---|---|---|---|---|
| **P2-01** | Write the tone system as an enforceable rule set (errors / waiting / empty / consent / never-list) as the reference every later copy edit is checked against | `docs/` | UI + LG (joint) | P1-05 | S | AC2a |
| **P2-02** | Tone audit and copy pass across all static pages — remove every "Loading…", "Oops", exclamation, fake-urgency and guilt-framed decline | `index.html`, `agencies.html`, `app/browse.html`, `app/dream.html`, `app/property.html`, `app/signin.html`, `app/notify.js` | FE | P2-01 | L | AC2a, AC2b, AC2c |
| **P2-03** | Resolve the tint-as-text violation (C-6) wherever it appears | `app/toju.html`, `app/matches-shared.js` | FE | UI ruling in P2-01 | S | — (guardrail) |
| **P2-04** | Area price-context line under the property price ("within the typical range for 3-bed flats in Lekki Phase 1") | `../synapse-platform/supabase/functions/toju-demo/index.ts` or a small median endpoint | BE | — | M | AC2c |
| **P2-05** | Render the price-context line | `app/property.html` | FE | P2-04 | S | AC2c |
| **P2-06** | Empty-state copy pass (pre-illustration) across browse / toju / dream, using the "name what would fill it" rule | `app/browse.html`, `app/dream.html`, `app/toju.html` | FE | P2-01 | S | AC2a |
| **P2-07** | Rage-click orientation hint via the existing `#synToast`, throttled once per session per zone | `app/motion.js` | FE | P2-01 | S | AC2b |
| **P2-08** | Repeated-Tayo-failure escape hatch: after 2 consecutive `.tj-error` events, offer the browse-with-current-filters exit instead of a third silent retry | `app/toju.html` | FE | P1-01 (framing) | S | AC2b |
| **P2-09** | Consent formula applied to notifications, matching the `.prox-card` does/won't/stop structure | `app/notify.js` | FE | P1-05, P2-01 | S | AC2c |
| **P2-10** | State-change confirmations: save-to-favourites heart pulse + toast, filter-apply count crossfade, send-from-composer origin shift, stagger cap | `app/motion.css`, `app/browse.html`, `app/toju.html`, `app/matches-shared.js` | FE | UI sign-off (P3-01) | M | AC2c |

### Phase 3 — Scroll & glass modernization

| ID | Work | Files | Owner | Depends on | Size | AC |
|---|---|---|---|---|---|---|
| **P3-01** | Motion & glass spec: specular `--light-angle` behaviour, `.pcard` hover refraction values, adaptive-intensity tier definition, the written timing law and glass-scope comment blocks | spec in `docs/`; targets `app/motion.css`, `app/app.css` | UI | — | M | AC3a, AC3b |
| **P3-02** | CSS scroll-driven reveals behind `@supports (animation-timeline: view())`, with the IntersectionObserver path kept as fallback and `motion.js` skipping `.in` when supported | `app/motion.css`, `app/motion.js` | FE | P3-01 | M | AC3a |
| **P3-03** | Landing reading-progress hairline (`animation-timeline: scroll()`, `scaleX`) — the sanctioned tint use | `index.html`, `landing.css` | FE | P3-01 | S | AC3a |
| **P3-04** | Section wayfinding rail (4–5 `--tint-ink` pips, current section observed) | `index.html`, `landing.css`, `app/motion.js` | FE | P3-01, P3-03 | M | AC3a |
| **P3-05** | One sticky chapter reveal on the "how it works" section — exactly one per page, no scroll-jacking | `index.html`, `landing.css` | FE | P3-01 | M | AC3a |
| **P3-06** | Appbar hardening in the existing `.scrolled` state (blur 20→28px, stronger bottom hairline) | `app/app.css`, `landing.css` | FE | P3-01 | S | AC3a |
| **P3-07** | Liquid-glass pass: scroll-responsive specular edge on `.card`, hover refraction on `.pcard` | `app/app.css`, `app/motion.js` | FE | P3-01 | M | AC3a |
| **P3-08** | Backdrop-filter budget fix on the Tayo page — swap blurred fills for pre-baked solids on off-screen bubbles, `content-visibility: auto` on `.msg`, hold to ≤3 painting surfaces | `app/toju.html`, `app/app.css` | FE | P3-01 | M | AC3b |
| **P3-09** | Adaptive intensity tier: `html.familiar` after 5 visits, shorter reveal distance/stagger/splash | `app/motion.css`, `app/motion.js` | FE | P3-01 | S | AC3a |
| **P3-10** | Mobile spec for the Tayo two-pane canvas below 720px (bottom sheet, grabber, chat reachable) + `env(safe-area-inset-bottom)` on the composer | UI spec → `app/toju.html` | UI → FE | P3-01 | M | AC3a |
| **P3-11** | Performance verification on a real mid-range Android over throttled 3G: 60fps landing scroll, ≤3 painting blurs, no LCP regression | all | FE | P3-02..P3-09, **E-3 (Eden)** | M | AC3a, AC3b |

### Phase 4 — Illustration identity (parallel track)

| ID | Work | Files | Owner | Depends on | Size | AC |
|---|---|---|---|---|---|---|
| **P4-01** | "Lagos, drawn by hand" style sheet: line weight, wobble tolerance, the one-accent rule, subject-matter guidance, do/don't examples — the artefact that stops every future asset being re-argued | `docs/` | UI | — | M | AC4c |
| **P4-02** | Four empty-state illustrations as inline SVG (no saved homes, no matches, no conversations, offline), ≤12KB each | `app/browse.html`, `app/toju.html`, `app/dream.html` | UI → FE | P4-01, P2-06, **E-4 (Eden)** | M | AC4a |
| **P4-03** | Tayo identity mark — a distinct hand-drawn face/sigil replacing the `✦` in `.av-toju` | `app/toju.html`, `app/app.css` | UI → FE | P4-01, **E-4** | M | AC4b |
| **P4-04** | Three landing narrative spots ("describe it" / "Tayo finds it" / "agency verified") + diaspora slide art | `index.html`, `landing.css` | UI → FE | P4-01, **E-4** | L | AC4c |
| **P4-05** | Verification explainer spot on the property page (C-of-O / documents moment) | `app/property.html` | UI → FE | P4-01, P1-11, **E-4** | M | AC4c |
| **P4-06** | Two Lottie loops (Tayo "thinking", landing hero accent) mounted on the existing `[data-lottie]` infra — last, and only after the static set is in family | `app/motion/`, `app/toju.html`, `index.html` | UI → FE | P4-02, P4-03, **E-4** | M | AC4b |

---

## 2. Owner assignment

### Why each agent owns what

**`toju-ai` — P1-01 only, and it is deliberately one item.**
Everything the plan wants from Tayo's behaviour (§2.1 greeting, §2.2 reasoning structure, §2.3
message shape, §1.5 recovery framing) is an edit to the **same user-authored system prompt** in
one file. Splitting these into four items would put four agents into the same prompt with
conflicting edits and no way to reconcile tone. One agent, one pass, one coherent doctrine.
`toju-ai` also owns the *wording* of the staged narration (P1-10) and the escape hatch (P2-08),
handing strings to frontend rather than editing the pages.

**`frontend-developer` — all hands-on implementation in the static app.**
Every `app/*.html`, `landing.css`, `app/*.css`, `app/*.js` change. Frontend never invents design
values or user-facing consent copy; it consumes specs from `ui-designer` and strings from
`toju-ai` / `legal`. The one exception is trust-hygiene bugs (P1-03) where the correct behaviour
is not a matter of taste.

**`ui-designer` — specs before code, plus illustration art direction.**
Owns P1-04, P3-01, P3-10 (spec half), P4-01 and the art direction on P4-02..P4-06. The rule:
`ui-designer` produces a written spec with concrete values; `frontend-developer` implements it.
No agent both decides and builds a visual system.

**`backend-developer` — the sibling repo only.**
P1-02 (live count + `why` regression check), P1-09 (real lead send), P2-04 (area medians).
Per **C-1**, backend is *not* on the Phase 1 critical path for match reasoning — that work is
already done.

**`legal` — strategic, early, not a review gate at the end.**
P1-05 is a **first-wave** item precisely so the consent and AI-disclosure copy shapes the sheet
rather than being pasted into it. `legal` also co-owns P2-01 (the consent clause of the tone
system) and must see **E-1** before finalising anything, since the copy's truthfulness depends on
whether the send is real.

### Design-spec → implementation pairs (sequence, never parallel)

These five are the common two-agent pattern. The second agent must not start until the first
delivers:

| Spec (UI) | → | Implementation (FE) |
|---|---|---|
| P1-04 contact sheet + verification narrative | → | P1-08, P1-11 |
| P3-01 motion & glass spec | → | P3-02 … P3-09 (all of them) |
| P3-10 mobile canvas spec | → | P3-10 implementation |
| P4-01 illustration style sheet | → | P4-02 … P4-06 |
| P2-01 tone system (UI + LG joint) | → | P2-02, P2-03, P2-06, P2-09 |

One three-agent chain exists: **E-1 (Eden) → P1-09 (BE) + P1-05 (LG) → P1-08 (FE)**. It is the
critical path.

---

## 3. Sequencing

### Wave 1 — starts immediately, fully parallel, zero cross-blocking

| Item | Owner |
|---|---|
| P1-01 Tayo doctrine pass | toju-ai |
| P1-02 Live listing count + `why` regression check | backend-developer |
| P1-03 Trust-hygiene bundle (deep-link, aria-live, glass fallback) | frontend-developer |
| P1-04 Contact-sheet + verification-narrative design spec | ui-designer |
| P1-05 Consent / AI-disclosure copy (draft now, finalise post-E-1) | legal |

Five items, five agents, no shared files. `toju-ai` and `backend-developer` both touch
`toju-demo/index.ts` but in disjoint regions — prompts vs. handler — so brief both to stay in
their half and land P1-01 first if a merge is needed.

**Escalate E-1 through E-4 to Eden at the same moment Wave 1 launches.** E-1 gates Wave 2.

### Wave 2 — unlocked by Wave 1

- P1-06 greeting render ← P1-01 + P1-02
- P1-07 "Not right?" override ← P1-01
- P1-10 staged narration ← P1-01
- P1-11 verification narrative ← P1-04
- P1-09 real lead send ← **E-1**
- P2-01 tone system ← P1-05

### Wave 3 — Phase 1 close-out and Phase 2 open

- P1-08 contact preview sheet ← P1-04 + P1-05 + P1-09 **(critical path terminus)**
- P2-02 tone copy pass, P2-03 tint fix, P2-06 empty-state copy, P2-07 rage-click,
  P2-08 escape hatch, P2-09 notification consent ← P2-01
- P2-04 area medians (backend, can start any time; no dependency)

### Wave 4 — Phase 3, gated on one spec

P3-01 must land before anything else in Phase 3. After it, P3-02 … P3-09 are near-fully
parallel; P3-11 (device verification) closes the phase and is itself gated on **E-3**.

### Parallel track — Phase 4, from day one

P4-01 (style sheet) has no dependencies and can run alongside Wave 1 if `ui-designer` has
capacity. Everything downstream of it is gated on **E-4** (art production budget), so the style
sheet is worth producing early even if the assets wait.

### Critical path (explicit)

```
E-1 (Eden: is the contact send real?)
   → P1-09 (BE: wire create-lead, or gate as demo)
   → P1-08 (FE: contact preview sheet)
   → AC1c
```

with two mandatory feeders that must land before P1-08 starts:

```
P1-04 (UI: sheet spec) ─┐
                        ├→ P1-08
P1-05 (LG: consent copy)┘
```

**This path is the longest in Phase 1 and it starts with a decision no agent can make.** Every
day E-1 sits undecided is a day added to Phase 1. Nothing else in Phase 1 is on it — AC1a and
AC1b both complete through shorter chains (P1-01 → P1-06 and P1-01 → P1-07).

---

## 4. Cross-cutting risks and open decisions

### Decisions that need Eden

**E-1 — Is the contact-agency send real, or is it demo? (BLOCKS THE CRITICAL PATH)**
Per **C-2**, `#contactBtn` fakes the send with a `setTimeout` and then tells the user their
request has been sent. Three options, and I recommend the first:
1. **Wire `create-lead` for real** (backend work, unblocks the honest version of the sheet).
2. Keep the stub but make the sheet say plainly it is a demonstration and nothing is transmitted.
3. Remove the contact CTA until the backend is ready.
Option 2 is acceptable short-term; the current state — a confident false claim — is not, on
either the Trust or Transparency principle. **This is the one decision that should be made today.**

**E-2 — Do we re-architect Tayo's edge function for streaming?**
Per **C-4**, streaming is impossible against the current strict-JSON two-pass design. Making it
possible means a text-first pass with side-channel structure — a meaningful backend redesign with
regression risk to the grounding and the `why` line. My recommendation: **no, not now.** Staged
narration (P1-10) captures most of the perceived-speed benefit for a fraction of the risk.
Revisit after Phase 3.

**E-3 — Is there a real mid-range Android device available for testing?**
The plan's performance budget is written against "Lagos's median device, not a MacBook," and
AC3a/AC3b are literally unverifiable without one. Chrome DevTools throttling approximates CPU but
not GPU compositing, which is exactly what `backdrop-filter` cost lives in. Need either a physical
mid-range Android, a BrowserStack/LambdaTest budget, or an explicit decision to accept emulated
results as sufficient. **Phase 3 cannot be signed off without this.**

**E-4 — Illustration budget: commissioned, or agent-drawn?**
The plan explicitly rejects AI-generated illustration as self-defeating (§4 — the entire point is
the anti-AI-slop signal). That means Phase 4's twelve assets are either commissioned from a human
illustrator or they don't exist. My recommendation is a **split**: the four empty states (P4-02)
are simple enough to be authored as hand-tuned inline SVG in-house without betraying the
direction; the **Tayo identity mark and the landing narrative spots must be commissioned** —
they are the brand's face and the place where "drawn by a person who knows Lagos" either reads or
doesn't. Needs a number and a decision on who.

**E-5 — Does the tone/copy pass (P2-02) have final-copy authority?**
P2-02 touches user-facing strings on every page, including marketing copy on `index.html` and
`agencies.html`. Confirm whether `frontend-developer` may rewrite marketing copy directly, or
whether landing copy changes route past Eden. Default assumption if unanswered: **app copy yes,
landing/marketing copy proposed-not-applied.**

**E-6 — Confirm the design philosophy is settled.**
Per **C-6**, the dark-mode/emerald/glassmorphism direction I was asked to watch for **is not
present in the code** — the landing is monochrome ink on paper-grey with a correctly fenced tint,
matching the calm premium-consumer-tech philosophy. Before Phase 3 and 4 commit further design
work to light monochrome, confirm this is a decision and not an accident. Low urgency, high cost
if wrong.

**E-7 — Who deploys the edge function, and is anyone authorised to? (BLOCKS AC1a)**
All Phase 1 Tayo work — the doctrine pass and the handler changes — is written, esbuild-clean, and
**uncommitted and undeployed**. Live probes confirm the deployed function is stale. None of it is
live, so AC1a cannot be met no matter how good the copy is.

One observation that may make this cheaper than it looks: the `backend-developer` agent type does
have `mcp__supabase__deploy_edge_function` available, so a deploy may be possible without issuing
new credentials. **I have not used it and am not going to without an explicit instruction.**
Deploying to the live project changes Tayo's behaviour for real users on a product whose central
claim is trust, and doing that on my own initiative is exactly the wrong instinct on this codebase
this week. Eden needs to say: deploy via the agent, deploy manually, or hold.

**E-8 — Verification data model: remediate, or change what we publish? (See C-7)**
`terms.html:59` makes two promises — status "as of the date shown" and re-confirmation "at least
every 14 days or it is removed" — that the data model cannot support for any of the 560 verified
listings. Three routes, and this is Eden's call with legal input, not an engineering fix:
1. **Add the data** — verification timestamp, verifier identity, evidence reference, and populate
   the empty history tables. Honest, and unblocks P1-11 and the whole trust narrative, but it is
   real backend work and back-filling 560 rows means someone must actually re-verify them.
2. **Change the published terms** to describe what we actually do and record.
3. **Soften the chip** so it claims only what the data supports.
Doing none of these leaves a live consumer-facing claim we cannot evidence. Legal has been asked
to rank this against the REIT questions; my read is that it outranks them, because it affects 560
listings live to users today versus a category not yet built.

### Risks that agents carry (no Eden decision needed, but brief them)

- **R-1 — Two agents, one file.** `toju-ai` (P1-01, prompts) and `backend-developer` (P1-02,
  handler) both edit `toju-demo/index.ts`. Land P1-01 first; brief each to touch only its region.
- **R-2 — Doctrine change silently breaking the `why` passthrough.** The prompt-to-parser contract
  is tight (`salvageWhys` exists precisely because it has broken before). P1-02 explicitly
  includes a regression check on this, and it should be treated as the item's real purpose.
- **R-3 — Cross-repo deploy.** Every `toju-ai` and `backend-developer` item requires an edge
  function redeploy in a repo the frontend agents never see. Frontend items that depend on new
  response fields (P1-06) must degrade gracefully if the deploy hasn't happened.
- **R-4 — Glass scope creep** is the documented failure mode of this trend. P3-01 must ship the
  written scope rule as a CSS comment block *before* any glass implementation starts.
- **R-5 — Copy regressions in the tone pass.** P2-02 is an L-sized sweep across seven files; it is
  the most likely place to accidentally break a string another script reads by `textContent`.
- **R-6 — `agency.html` is 268KB and out of scope here.** The plan never mentions it. Confirm it
  stays out — it is agency-side, and the flywheel says buyer trust comes first.

---

## 5. Recommended starting point

**Start with P1-01 — the Tayo doctrine pass (`toju-ai`).**

Reasoning:

1. **It is the widest unblock in the plan.** P1-06, P1-07, P1-10 and P2-08 all wait on wording it
   produces. Nothing else in Phase 1 unblocks four downstream items.
2. **It is the only Phase 1 item that changes what a user actually experiences of Tayo**, and
   Tayo is the product. Per **C-1**, the match-reasoning rendering is already built — so the
   quality of the reasoning line is now purely a doctrine question. That means one prompt pass
   converts already-shipped plumbing into a visibly better product, at zero implementation cost.
   That is the highest value-to-effort ratio available anywhere in this plan.
3. **It serves Trust and Transparency directly** — the capability-honesty greeting is the first
   thing a skeptical first-time visitor meets, and AC1a is stated entirely in terms of what that
   visitor can articulate afterwards.
4. **It carries no external dependency.** Unlike the contact path (blocked on E-1), the
   performance work (blocked on E-3) and the illustrations (blocked on E-4), it can start now.

Launch it alongside the rest of Wave 1, and escalate E-1 in the same breath — because P1-01 makes
Phase 1 *good*, but only E-1 makes Phase 1 *finishable*.

---

## 6. Handoff briefs — Wave 1

Each brief below is self-contained and can be pasted directly as the agent's task prompt.

### → `toju-ai` · P1-01 · Tayo doctrine pass

> Make one consolidated pass over Tayo's user-authored doctrine (the system prompts in
> `C:\Users\Eden David\OneDrive\Desktop\Business Folder\ILIOS Digital\Synapses\synapse-platform\supabase\functions\toju-demo\index.ts`
> — prompts only, do not touch the request handler or the JSON contract). Four changes: (1) a
> first-visit capability-transparency greeting that states plainly what Tayo knows (Synapse's
> verified listings), what it can do, and what it cannot — never hardcode a listing count, use a
> placeholder the frontend will fill from a live value; (2) restructure the per-match `why` line
> so it echoes the user's own stated criteria as a compact list ("3 beds · within your ₦80m
> ceiling · 10 min from Victoria Island as you asked") rather than free advisor prose, max ~24
> words; (3) enforce two short beats instead of one block — answers over ~50 words split into an
> answer beat and a guidance beat; (4) framing for two recovery moments the frontend will render:
> staged waiting narration at 2.5s and 6s, and an escape-hatch line offered after two consecutive
> failures that points the user to browse directly. Critical constraint: the second pass returns
> strict JSON `{"reply", "why": {matchId: reason}}` and a `salvageWhys` recovery parser depends on
> that exact shape — your prompt changes must not alter the output contract. Deliver the edited
> prompts plus the exact strings for (4) as a separate list for the frontend.

### → `backend-developer` · P1-02 · Live listing count + `why` passthrough regression check

> Two small changes in
> `C:\Users\Eden David\OneDrive\Desktop\Business Folder\ILIOS Digital\Synapses\synapse-platform\supabase\functions\toju-demo\index.ts`
> — handler only, do not edit the system prompts (`toju-ai` is editing those in parallel; land
> after them if there is a conflict). First: return a live count of verified listings on the
> `restore` action response so the frontend greeting can state the real number instead of
> hardcoding "120" — include a null-safe path so the frontend can fall back to count-free copy if
> it is unavailable. Second, and treat this as the item's real purpose: verify that the per-match
> `why` passthrough still works after the doctrine change — the second pass merges reasons onto
> matches via `matches.map((m) => ({ ...m, why: whys[m.id] ?? null }))`, backed by a `salvageWhys`
> parser that exists because this contract has broken before. Confirm `why` is non-null on a real
> multi-match response end to end. Do not add streaming; the two-pass strict-JSON design cannot
> support it and that has been decided.

### → `frontend-developer` · P1-03 · Trust-hygiene bundle

> Four small fixes in the static app at
> `C:\Users\Eden David\OneDrive\Desktop\Business Folder\ILIOS Digital\Synapses\Synapse`. (1) The
> real bug: every Tayo match card links to a bare `property.html` with no listing id
> (`'<a class="pcard" href="property.html">'` in `app/toju.html`, and the same issue via
> `app/matches-shared.js`), so every recommendation opens the same hardcoded Lekki listing —
> pass the match id in the URL and have `app/property.html` read it, replacing the hardcoded
> `PROP` constant where an id is present. (2) Add `aria-live="polite"` to the `.convo-scroll`
> region in `app/toju.html` so appended Tayo messages are announced. (3) Add an
> `@supports not (backdrop-filter: blur(1px))` block in `app/app.css` falling back to solid
> `rgba(255,255,255,0.92)` fills for `.card`, `.appbar`, `.chatbox` and the Tayo bubbles — older
> Android WebViews currently get unreadable transparency. (4) Leave all visual values otherwise
> untouched; this is a correctness pass, not a design pass. Do not change copy, and do not change
> the burnt-orange `#b0521f` text you will see on `.pcard .watch b` — that is a known guardrail
> violation being handled separately.

### → `ui-designer` · P1-04 · Contact sheet + verification narrative spec

> Produce a written design spec (no code) for two anxiety-reduction moments in
> `C:\Users\Eden David\OneDrive\Desktop\Business Folder\ILIOS Digital\Synapses\Synapse\app\property.html`.
> First, the contact-agency preview sheet: a frosted sheet that opens *instead of* sending, showing
> the recipient agency with its verification chip (`.chip-pass` exists), exactly what will be sent,
> and a response-time expectation — plus a quiet post-send confirmation state, explicitly not a
> celebratory one. Reuse the existing `.card` glass recipe and mirror the structure of `.prox-card`
> in `app/app.css`, which is the house style for consent moments (what it does / what it won't do /
> how to stop). Second, the verification narrative: extend the property page's trust chip into a
> `<details>` disclosure that explains what was confirmed, by whom, when, and which documents were
> sighted. Specify layout, spacing, focus order, and mobile behaviour with concrete values.
> Guardrails: monochrome ink palette; the burnt-orange `--tint` never appears as text, as a wash,
> or as a glow — pips, hairlines and progress only. Do not write the consent wording itself; `legal`
> is drafting that in parallel and you should leave slots for it.

### → `legal` · P1-05 · Consent, AI-disclosure and data-sharing copy

> Draft the user-facing copy for the two moments where Synapse either shares a buyer's details or
> speaks as an AI. First, the contact-agency flow in `app/property.html`: what is shared, with
> whom, what is explicitly *not* shared, and how the user stops replies — in the plain register of
> the existing `.prox-card` component in `app/app.css` (does / won't / stop), which is the house
> standard. Second, the AI-disclosure element of Tayo's first-visit greeting: the user should
> understand they are talking to an AI advisor working from Synapse's verified listings, and that
> nothing reaches an agency until they choose it. Two constraints: no exclamation marks, no
> reassurance that outruns the facts. And one open item you must account for — the contact button
> currently *does not send anything*; it fakes a 650ms delay and then tells the user their request
> was sent. Eden is deciding whether we wire the real send or label the flow as a demo, so please
> draft both variants: one for a genuine transmission, one that states honestly that nothing is
> transmitted. Flag anything else you find where the interface asserts something untrue.
