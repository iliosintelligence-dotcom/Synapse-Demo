# Property Page Trust Moments — Design Spec (P1-04)

**Scope:** `app/property.html` only. Two moments: (A) the contact-agency preview sheet, (B) the verification narrative.
**Status:** Spec only. No code in this task. Implementation goes to frontend-developer.
**System of record for styles:** `app/app.css` (tokens, `.card` glass, `.prox-card`, `.chip-pass`, focus ring), `app/motion.css` (durations/easings).

**Two things this spec deliberately does NOT contain:**
1. **Consent wording.** Legal is drafting it in parallel. Every place it belongs is a labelled slot (`[LEGAL-1]` … `[LEGAL-4]`) with reserved layout so the drop-in cannot reflow the design.
2. **Any claim that data reaches an agency.** Whether the send transmits for real or is labelled a demonstration is an open founder decision. The sheet is specified to work either way (§A9). Nothing here is approval to make the send real. The current implementation is a stub that transmits nothing; this spec does not change that.

---

## 0. Design rationale (why a sheet, why a narrative)

Fraud anxiety in a Nigerian property purchase concentrates at two points on this page: *the moment my details leave my hands* and *the moment I decide whether "Verified" means anything*. Both are answered with the same pattern — **show the reasoning before asking for the trust**:

- The contact CTA today fires immediately (`#contactBtn` → auth check → toast). An instant, irreversible-feeling send at the highest-stakes moment on the page is exactly backwards. The sheet inserts one calm screen that shows *who receives it, exactly what will be sent, and what to expect back* — before anything happens.
- The trust chip today asserts ("✓ Title verified"). A badge asserts; a sentence explains. Part B extends it into a `<details>` ledger. **Amended per §B0:** the live DB holds only pass/fail flags — no verifier, date, or document records exist yet — so the ledger's default rendering is *definitional* (what each check covers and does not cover), with the full evidence narrative (by whom, when, documents sighted) specified as a dormant layer that activates per-field when real records exist.

Patterns being **extended, not invented** (name them so drift is catchable):
- `.card` frosted glass (app.css:80–87) — the sheet surface.
- `.prox-card` consent anatomy (app.css:130–154, markup in `notify.js` `paint()`) — three-part structure: *what it does / what it won't do / how to stop*. Mirrored for the consent block, §A5.
- `.chip` / `.chip-pass` / `.chip-pending` (app.css:272–279) — verification status, unchanged.
- `.more-checks` `<details>` chevron recipe (property.html inline styles, lines 40–46) — the disclosure affordance for Part B.
- `.lbl` uppercase section label, `#synToast`, global `:focus-visible` ring (app.css:223–233), motion tokens `--m-micro`/`--m-standard`/`--m-ease`.

---

## 1. Tokens and fixed values used throughout

From `app/app.css` `:root` — reuse, do not redeclare:

| Token | Value | Used for |
|---|---|---|
| `--ink` | `#1e1e1e` | primary text |
| `--ink-muted` | `rgba(54,54,54,0.62)` | body/secondary |
| `--ink-dim` | `rgba(54,54,54,0.42)` | metadata, timestamps |
| `--border` | `rgba(20,20,20,0.10)` | internal hairlines |
| `--success` | `#2e7d4f` | pass states only |
| `--radius` | `10px` | inner blocks |
| `--m-standard` / `--m-ease` | `180ms` / `cubic-bezier(0.3,0,0.2,1)` | sheet enter/exit, cross-fade |
| focus ring | `0 0 0 2px var(--ring-offset), 0 0 0 4px var(--ring)` | guaranteed by the global `:where(...):focus-visible` rule — do not override |

**Glass recipe** (the `.card` values, verbatim — this IS the frosted language):
```
background: linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.55));
backdrop-filter: blur(24px) saturate(1.5);
border: 1px solid rgba(255,255,255,0.75);
box-shadow: 0 16px 40px rgba(20,26,38,0.09), inset 0 1px 0 rgba(255,255,255,0.9);
```
The sheet uses exactly this, with one deviation: elevation shadow `0 24px 64px rgba(20,26,38,0.18)` (it floats above a scrim, not on the page plane). Everything else identical.

**Burnt-orange `--tint`** (`199, 106, 26`, defined in `landing.css` only — `app.css` has no tint token; if used, the implementer declares it locally scoped to the component, not in `:root`):
- Permitted roles on this page: **pips, hairlines, progress/freshness bars** only (§B6).
- Never text, never a glow, never a wash above `0.03` alpha, never on buttons or chips.
- Part A uses **zero** tint. The contact moment stays fully monochrome — orange near a send button reads as warning or excitement, both wrong here.

**New values fixed by this spec** (the only additions to the vocabulary):

| Name | Value | Rationale |
|---|---|---|
| Scrim | `rgba(21,23,26,0.32)` + `backdrop-filter: blur(6px)` | matches the hero counter's ink `rgba(21,23,26,…)`; blur quiets the busy map behind |
| Sheet radius, desktop | `14px` | largest surface on the page gets the largest radius; sits inside the existing 12–15px overlay range (`.pvc-overlay` 12, `.glance` 14, `.sim a` 15) |
| Sheet radius, mobile | `16px 16px 0 0` | bottom sheet |
| Sheet padding | `24px` | matches `.summary` padding |
| Block gap inside sheet | `16px` | matches `.section` rhythm |
| Confirmation mark circle | `40px`, `rgba(20,20,20,0.06)` fill, ink `✓` glyph at 18px | quiet, monochrome — deliberately NOT green (§A8) |

---

## A. Contact-agency preview sheet

### A1. Trigger and flow change

`#contactBtn` ("Contact agent", `.cta-dock`) no longer performs any action directly. It opens the sheet. The existing single-flight guard (`contactBusy`) moves to the sheet's primary action. The existing behaviour *after* the flow completes is retained: the dock button becomes disabled `✓ Request sent`.

**Auth ordering (spec decision):** the sheet opens for *everyone*, signed in or not. Previewing what would be sent costs nothing and is itself the trust move. The auth gate (`SynAuth.ready()` → `signin.html?reason=contact&next=…`) fires from the sheet's **primary action**, not from opening the sheet. Signed-out users see the same sheet with the payload rows in their "pending" state (§A4) and the primary action labelled to make the extra step honest — e.g. a secondary line under the button: *"You'll create an account first — that's when these details get filled in."* (This sentence is product copy, not the legal consent slot; fine to ship.)

### A2. Container, geometry, layering

- **Desktop (>900px, map visible):** centered dialog. Width `min(440px, calc(100vw - 48px))` — same content width discipline as `.pdp`'s 460px column and `#synToast`'s 440px. `max-height: 82vh`, internal scroll on the middle region only (header and action bar stay pinned). Radius 14px.
- **Mobile (≤900px, the breakpoint where `.pv-canvas` hides):** bottom sheet. Full width, radius `16px 16px 0 0`, `max-height: 88dvh`, bottom padding `calc(24px + env(safe-area-inset-bottom))`. Grabber: `36×4px`, `rgba(0,0,0,0.16)`, radius 100px, centered, `10px` from top.
- **Layering:** scrim above everything including `.appbar` (z-index ≥ 300; Leaflet panes run to ~200, toast is 200 — put scrim at 400, sheet 401, and keep `#synToast` visible above if fired: bump toast usage inside this flow is not needed, §A8 uses no toast).
- Native `<dialog>` element preferred (free top-layer + Esc + inert background); if not, `role="dialog" aria-modal="true"` + `inert` on `.pv-split` and `.appbar`.

### A3. Anatomy, top to bottom

Vertical order (16px gaps between blocks; 24px padding all round):

1. **Grabber** (mobile only) / **Close** button `✕` — 36×36px circular hit target, top-right, `rgba(0,0,0,0.04)` fill, ink glyph. Always present on desktop.
2. **Title row.** Title: `Before this is sent` — 18px / 600 / `--ink` (matches `.summary .ttl` scale). No subtitle; the sheet's content is the explanation.
3. **Recipient block** (§A4a).
4. **"What will be sent" block** (§A4b).
5. **Consent block — legal slots** (§A5).
6. **Response-expectation row** (§A6).
7. **Action bar** (§A7): primary + quiet decline + provenance slot.

No other content. No cross-sell, no "similar homes", no urgency device of any kind.

### A4. Content blocks

**a) Recipient — who receives this.**
Label (`.lbl` recipe: 11px / 600 / +0.12em / uppercase / `--brand`): `GOING TO`.
Row reuses the existing `.agency` layout verbatim: 50px logo circle, name 14.5px/600, meta line 12.5px `--ink-dim` (`Gold Verified · 4.6 ★ · 60 transactions`), and the verification chip — **`.chip-pass`, unchanged**: `✓ Verified agency`. If the agency's verification narrative (Part B ledger) exists, the chip is a link that closes the sheet and scrolls the deck to the "What we checked" card — one system, not two.

**b) Payload — exactly what will be sent.**
Label: `WHAT THEY RECEIVE`. This block is **always fully visible — never truncated, never behind a disclosure.** Hiding any part of the payload defeats the sheet's purpose; density is managed by typography, not by hiding (see Tensions, §D).

Rendered as literal field rows, not prose — a table reads as a receipt, and receipts are trusted:

| Row | Left (12px / 600 / `--ink-dim`, uppercase +0.06em) | Right (13.5px / 500 / `--ink`, right-aligned) |
|---|---|---|
| 1 | NAME | from account |
| 2 | CONTACT | phone/WhatsApp or email from account |
| 3 | PROPERTY | `3-Bed Apartment, Lekki Phase 1 · ₦165M` (title + price only — no budget, no search history) |
| 4 | YOUR MESSAGE | optional, §below |
| — | *(closing line, 12.5px `--ink-dim`, full width)* | `Nothing else. Not your budget, not your other saved homes, not your Toju conversations.` |

Row height 40px min; 1px `--border` hairline between rows; no zebra striping. The closing line is the `.prox-card` "what it won't do" instinct applied to data — it is product copy and shippable, distinct from the legal slots.

**Signed-out state:** rows 1–2 show `Added after you sign in` in `--ink-dim` italic (the `.prox-note` recipe). Never show placeholder fake data.

**Optional message:** row 4 expands to a textarea using the existing `.vnotes` recipe (13.5px, `rgba(255,255,255,0.6)` fill, `min-height 64px`), placeholder `Anything you want them to know — viewing times, questions… (optional)`. Pre-fill from the negotiation draft **only** if the user generated one on this page, with a one-line note `From your negotiation draft — edit freely` (12px `--ink-dim`).

### A5. Consent block — the legal slots

Mirror the `.prox-card` anatomy **exactly** (flex row: 32px pin circle · text column · no button — consent action is the sheet's primary button). Same paint: `15px 17px` padding, `--border` 1px, glass gradient, radius `--radius`.

Text column, three slots matching prox-card's three-part covenant:

- `<b>` 14px/700 → **[LEGAL-1: what happens when you send]**
- `<span>` 13px/1.6 `--ink-muted` → **[LEGAL-2: what will not happen / what is not shared]**
- `.prox-note` 12px `--ink-dim` italic → **[LEGAL-3: how to withdraw / stop contact]**

**Reserved layout so legal's copy can't break the design:** text column `min-height: 96px`; slots sized for LEGAL-1 ≤ 60 chars, LEGAL-2 ≤ 220 chars, LEGAL-3 ≤ 120 chars — pass these limits to legal with the request. If legal requires an explicit tick, a checkbox slots between LEGAL-2 and LEGAL-3 (`accent-color: #121212`, matching `.vcheck input`; label = **[LEGAL-4]**, ≤ 90 chars) and the primary button is disabled until ticked. Reserve the 28px row for it either way; collapse if unused.

**Do not write interim placeholder consent copy into the build.** If the sheet ships before legal lands, the block renders with visibly-labelled slot text (`[Consent wording — legal review in progress]`) — an honest gap, not a guessed sentence.

### A6. Response-time expectation

One quiet row, only when real data exists for this agency:
`Typically replies within 3 hours` — 12.5px `--ink-muted`, left-aligned, preceded by a 7px ink pip (`rgba(20,20,20,0.35)`). Source line beneath, 11.5px `--ink-dim`: `Based on their last 30 enquiries on Synapse.`

**No data → the row does not render.** Never a fabricated estimate, never "usually fast". An absent promise is calmer than a broken one. (Monochrome pip here — tint is not used anywhere in the sheet.)

### A7. Action bar

Pinned to sheet bottom, 16px above the padding edge, above `env(safe-area-inset-bottom)` on mobile.

- **Primary:** `.btn .btn-primary .btn-block` (existing recipe: ink fill, radius 100px, 13px/22px padding). Label comes from **one JS constant** so it flips with the founder's send decision (§A9); design accommodates 10–24 characters. Busy state: existing `data-busy` + label change; single-flight guard lives here.
- **Secondary:** `Not yet` — text-style `.btn-ghost`, full width, directly beneath, 8px gap. Deliberately not framed as failure; closing the sheet is a legitimate outcome and must cost nothing.
- **Provenance line — [SLOT-PROV]:** one line, 11.5px `--ink-dim`, centered, directly under the buttons. Reserved for whichever sentence the send decision produces (demonstration label, or the real transmission/consent-adjacent statement). Reserve one line ≤ 90 chars; renders empty-height-collapsed until the decision lands. **No copy in this slot may be written before that decision** (§A9).

### A8. Post-send confirmation — deliberately quiet

On success, the sheet's content **cross-fades in place** (opacity only, `--m-standard` / `--m-ease`; no slide, no scale, no spring easing) to:

1. The 40px quiet mark: ink `✓` in a `rgba(20,20,20,0.06)` circle. **Not green** — green is this system's *verification* colour and must not be diluted into generic success; and not celebratory — the user has just taken the scariest step on the page, and the correct emotional register is "handled", not "hooray".
2. Headline, 16px/600 `--ink` → **[SLOT-CONF-1]** — one sentence, ≤ 60 chars, dependent on the send decision. Must state what happened without asserting delivery to the agency until that is decided and true.
3. What-happens-next line, 13px `--ink-muted` → **[SLOT-CONF-2]**, ≤ 140 chars, same dependency.
4. Single `Done` button, `.btn-ghost`, full width.

**Explicitly banned:** confetti, particles, bounce/spring easing, scale-up animation, auto-dismiss (the user closes it; a confirmation that vanishes on its own re-creates the doubt it exists to settle), any additional CTA (no "browse more homes"), and the toast (`#synToast` is transient; this moment needs a stable acknowledgment the user dismisses themselves).

After `Done`: sheet closes, focus returns to the dock button, which shows the existing disabled `✓ Request sent` state.

**Failure state:** sheet stays open, everything intact; an `.inline-err` sentence (existing recipe, `#7a271a`, names the cause, never blames the user) appears above the primary button, which re-enables. Follow the existing negotiation-error convention of stating plainly that **nothing left the device** — that sentence is accurate under the stub and under a failed real send alike.

### A9. Working either way — the unresolved send

The founder has not decided whether the send transmits for real or is labelled a demonstration. The sheet is engineered so the decision flips **copy constants only, zero layout**:

| Decision-dependent | Where | Constraint |
|---|---|---|
| Primary button label | §A7 | 10–24 chars |
| Provenance line | [SLOT-PROV] | ≤ 90 chars, one line |
| Confirmation headline | [SLOT-CONF-1] | ≤ 60 chars |
| Confirmation next-step line | [SLOT-CONF-2] | ≤ 140 chars |

Until resolved, **no copy anywhere in the sheet or its confirmation may assert that details reached, or will reach, an agency** — including reusing the current toast sentence ("sent to the agent — they'll reach out on WhatsApp"), which over-asserts under the stub and should not be carried into the sheet. Nothing in this spec is approval to wire a real send; the flow's underlying behaviour is out of scope for the implementer of this spec.

### A10. Focus order, keyboard, motion

**Focus order (pre-send):**
1. Dialog container itself receives initial focus (`tabindex="-1"`) → screen reader announces the accessible name (`aria-labelledby` = title).
2. Close `✕` → 3. agency chip link (if linked) → 4. message textarea → 5. consent checkbox ([LEGAL-4], if present) → 6. primary button → 7. `Not yet` → wraps to 2 (focus trap; free with `<dialog>`).

**Post-send:** focus moves to the confirmation headline container (`tabindex="-1"`, `aria-live="polite"` on the confirmation region so the swap is announced) → `Done`.

**Keyboard dismissal:** `Esc` closes at any point, pre- or post-send — nothing is at risk once sent, and pre-send nothing has happened. Scrim click likewise closes. On close, focus returns to `#contactBtn` (or the dock's sent-state button). **Conflict note for the implementer:** the page's global `keydown` listener maps ArrowLeft/ArrowRight to deck navigation; it must not act while the dialog is open.

**Motion:** enter = translateY(16px)→0 + fade, `--m-standard` / `--m-ease` (mobile: translateY(100%) with the same duration cap — distance may be larger but time is not); exit = reverse at `--m-micro`–`--m-standard`; scrim fades `--m-standard`. `prefers-reduced-motion`: opacity-only for all of it, and the confirmation cross-fade shortens to ~100ms. No spring easing anywhere in this component.

---

## B. Verification narrative — from badge to explanation

### B0. Data reality — amendment (2026-07-31, after product-manager DB query)

The first draft of this Part assumed per-check evidence (verifier, date, documents) existed and omission was the edge case. **The live database says otherwise:** `properties` has no verification timestamp column — only a status enum and a `verification_nodes` JSONB of `{name, status}` pairs. The tables that would hold verification history (`property_verifications`, `property_verification_history`, `property_verification_checks`) are zero rows across all 560 verified listings. **Omission is not the fallback; it is the only case.** Every section below is amended to treat the no-date, no-verifier state as the DEFAULT rendering.

**The design question:** what should a disclosure do when it holds only seven pass/fail flags? Two honest options:

- **(a) Definitional narrative.** The panel explains *what each check actually covers and does not cover* — per-check-type editorial content, true regardless of listing, requiring no data we don't have. "Title verified" is jargon to most buyers; defining it is a real explanation, undated.
- **(b) Hold the disclosure entirely** until the data model can carry evidence, on the grounds that a panel promising explanation and delivering nothing damages trust more than a plain badge.

**Recommendation: (a), with one renaming.** The failure mode (b) guards against — a panel that opens and explains nothing — is real, but it is caused by *promising provenance*, not by disclosure itself. So: the trigger must not promise provenance (`How we know →` is now wrong — it becomes `What these checks mean →`), and the panel must contain **zero empty evidence slots** — no "Verified by: —", no "date pending", no scaffolding for absent records. What remains is genuinely useful today: a buyer who doesn't know what a Certificate of Occupancy check covers gets a plain answer, and the stated-limits line ("what this does not cover") survives intact — it was always editorial, never data. A badge asserts; a definition explains; evidence, when it exists, will prove. We ship the first two now.

The evidence layer (by whom / when / documents sighted) is retained in this spec as a **dormant enhancement** (§B3b): its layout is fixed now so that when the schema is populated, fields light up per-row with no redesign — and per the standing constraint, **no copy anywhere may assert when or by whom a check occurred until a real record backs it.** No absence-admission sentence either ("records not yet published") — every phrasing we tried either implies a claim we can't back or points at a gap without resolving it; silence plus definitions is the honest floor.

The schema work needed to activate §B3b is listed in §C and should be raised with whoever owns `docs/LISTING_SCHEMA.md`.

### B1. Placement

Two touchpoints, one source of truth:

1. **Overview card** (`.summary`): the line `Verified · Property Confidence 94` stays exactly as is — it is the headline, not the narrative. Beneath its `6 of 7 checks passed` sub-line, add one quiet link-style disclosure trigger: `What these checks mean →` (13px / 600, `--brand`, the `.more-checks summary` recipe). **Not** `How we know →` — that label promises provenance the data cannot show today (§B0); the trigger may be renamed only when the evidence layer (§B3b) is live. Activating it navigates the deck to the "What we checked" card (`goCard()` already exists) — it does not open an inline panel; one narrative lives in one place.
2. **"What we checked" card**: this is where the narrative lives. The current chip grid (`.nodes`) is replaced by a **verification ledger** — a stacked list of `<details>` rows, one per check.

### B2. The ledger row — closed state

Each check is a `<details class="v-ledger">` whose `<summary>` is a full-width row:

- Left: status chip, **existing `.chip-pass` / `.chip-pending` verbatim** (`✓ Title verified`, `◷ Financial — still checking`). The chip itself is not restyled — the badge is kept and *extended*, per the brief.
- Middle: nothing (whitespace is the calm).
- Right, **default (today's data):** the `.more-checks` chevron only (7px, 1.6px strokes, rotates 45°→-135° on open, `.25s cubic-bezier(.22,1,.36,1)`, `prefers-reduced-motion: none`). No date — `verification_nodes` carries `{name, status}` and nothing else (§B0), and an empty date column or dash would advertise the gap.
- Right, **when the evidence layer is live (§B3b):** verification date precedes the chevron, 12px `--ink-dim`, tabular — `12 Jun 2026` (pending rows: `since 3 Jul`). Renders per-row, only from a real record.

Row: min-height 44px (touch target), padding `10px 2px`, 1px `--border` hairline between rows, no fill — the rows sit on the card's glass, no card-within-card. `summary::-webkit-details-marker` hidden, per the existing recipe. Native `<details>/<summary>` gives Enter/Space toggle and correct semantics for free; the global focus ring covers `summary` already (it is in the `:where()` list).

Order: passed checks first in the current display order, pending last — anxiety reads top-down, and an early `◷` reads as a warning rather than an honest in-progress.

### B3. The ledger row — open state

Expanded content is indented to align with the chip text (padding `6px 2px 14px 4px`). Per §B0 it has two layers: the **definitional layer ships now and is the default**, the **evidence layer is dormant** until the schema carries real records.

**a) Definitional layer — DEFAULT, renders for every row today.** Two sentences of per-check-type editorial content (written once per check type, not per listing — it is authored copy about what the check *is*, not data about what happened, so it is honest with only a pass/fail flag):

1. **What this check covers** — one sentence, 13px / 1.65 / `--ink-muted`. Definitional phrasing, present tense, no dates, no actors. Template: *"This check confirms the ownership papers match the seller and this plot at the state land registry."* It defines what a pass means — it does not narrate an event. Plain declarative, no marketing adjectives.
2. **What this does not cover** — one sentence, 12px / `--ink-dim`, italic (the `.prox-note` recipe). E.g. *"Paperwork only — not the physical state of the building; that's what the viewing checklist is for."* Stated limits are the strongest trust signal in the set.

Pending rows use the same two lines with covers-phrasing adjusted to *"This check will confirm…"*. Never "almost done", never a percentage, never "since {date}" (no date exists).

**Hard rule carried from §B0:** the definitional layer contains no verifier, no date, no document list, and **no empty slots or placeholders for them.** A panel that opens and shows dashes is worse than the bare badge.

**b) Evidence layer — DORMANT. Renders per-field, per-row, only when a real record exists in the (currently empty) verification tables.** Layout fixed now so activation needs no redesign; inserted between a) items 1 and 2:

- **By whom · when** — one line, 12px / `--ink-dim`: `{verifier-name} · {verifier-role} · {date}` e.g. `Adeyemi & Co. · independent legal counsel · 12 Jun 2026`. Independent verifiers named as such.
- **Documents sighted** — sub-list, one row per document, 12.5px `--ink`: leading `✓` in `--success` (or `◷` in the `.chip-pending` amber `#a8742b`) + document name, 6px row gap. Same nouns as the map canvas's Legal overlay.

A guessed verifier name or date is the exact fraud pattern this feature exists to counter; **no copy may assert when or by whom a check occurred until a record backs it.** The map canvas's Legal overlay currently hardcodes a document list for this demo listing — when this ledger ships, that overlay must draw from the same source or drop the list, so the page never shows evidence in one panel that another says doesn't exist.

**Open/close motion:** content reveal at 250ms (`--m-expanded`) `--m-ease`, opacity + a ≤8px translateY; `prefers-reduced-motion`: instant. Multiple rows may be open at once — do not auto-close siblings (comparing two checks side by side is a legitimate anxious-buyer behaviour).

### B4. Card header and framing

The card keeps its `.lbl` header `What we checked · 6 of 7 passed` and the existing Lottie mount. The `See all 7 checks` split (`.more-checks` with a hidden second grid) is retained as the outer tier: first tier shows the four checks buyers ask about first (title, legal, flood, financial), the remaining three sit behind the existing `See all 7 checks` summary — progressive disclosure now has two levels: *which checks* (existing) and *what each check means* (new). The chevron affordance is identical at both levels, so the pattern teaches itself.

One closing line under the ledger, 11.5px `--ink-dim` — `Last re-verified {date}` — is part of the **dormant evidence layer**: no timestamp column exists (§B0), so **it does not render today**, with no placeholder. When a real re-verification date exists it appears and sets up §B6.

### B5. Keyboard and focus (Part B)

- `<summary>` rows are natively focusable; Tab order = document order (tier-1 rows, `See all 7 checks` summary, tier-2 rows when open).
- Global focus ring applies unmodified.
- The deck's ArrowLeft/ArrowRight page-level listener must ignore key events originating inside an open ledger row's content (it currently listens on `document` — same conflict class as §A10; scope it once, both features benefit).
- Chips inside `<summary>` must not be separately focusable (they are display, not controls).

### B6. The single permitted tint appearance (optional, founder-visible — and dormant with §B3b)

This bar depends on `lastReverifiedDate`, which does not exist in the schema today (§B0); it cannot render until the evidence layer is live. Specified now only so the tint decision is made once. If freshness visualisation is wanted then: a hairline **re-verification bar** under the closing line — the landing page's `.fresh-days` pattern, monochrome page, tint bar. Track `4px` tall, radius 100px, `rgba(199,106,26,0.06)`; fill `rgba(199,106,26,0.16)` proportional to recency of last re-verification. No label on the bar itself; the `Last re-verified` line above it is the label.

That is the **only** tint on the entire property page under this spec: a hairline progress bar, per the guardrail (pips / hairlines / progress bars / map pings only; never text, never a wash above 0.03 alpha, never a glow). `--tint: 199, 106, 26` must be declared locally in the component's scope — `app/app.css` deliberately has no tint token in `:root`, and this spec does not add one. If the founder prefers the app fully monochrome, drop the bar and keep the text line; nothing else depends on it.

---

## C. Data contract (amended per §B0 — what exists vs. what unlocks the evidence layer)

For frontend-developer + whoever owns the listing schema (`docs/LISTING_SCHEMA.md`):

**Exists today (sufficient for everything marked DEFAULT in this spec):**

| Field | Used by | Notes |
|---|---|---|
| `properties.verification_status` (enum) | Overview headline | as today |
| `verification_nodes[]{name, status}` (JSONB) | B2 chips, B3a panel selection | the ONLY per-check data in the live DB |
| per-check-type editorial: `coversStatement`, `limitStatement` | B3a | authored copy keyed by check type — content work, not schema work |
| `agency.name`, `agency.tier`, `agency.rating`, `agency.txCount`, `agency.verified` | A4a | chip omitted if unverified — never faked |
| `user.name`, `user.contactChannel` | A4b | "Added after you sign in" state when absent |

**Does not exist — required to activate the dormant evidence layer (§B3b, B4 closing line, B6 bar). The relevant tables (`property_verifications`, `property_verification_history`, `property_verification_checks`) are zero rows across all 560 verified listings:**

| Field | Would unlock | Until then |
|---|---|---|
| per-check `verifierName`, `verifierRole`, `verifiedDate` | B3b by-whom line, B2 date column | not rendered, no placeholder |
| per-check `documents[]{name,status,date}` | B3b documents list | not rendered; reconcile with the map canvas's hardcoded Legal overlay list |
| per-check `pendingSince` | pending-row "since" phrasing | pending rows show no date |
| `listing.lastReverifiedDate` | B4 closing line, B6 tint bar | not rendered |
| `agency.medianResponseHours`, `agency.responseSampleSize` | A6 response row | row not rendered (status in DB unqueried — verify before assuming it exists) |

---

## D. Tensions hit, and how they were resolved

1. **Calm vs. payload density.** The sheet must carry recipient + payload + consent + expectation + actions — a lot for one calm surface. Resolved by refusing the obvious fix (collapsing the payload behind a disclosure): hiding what will be sent defeats the sheet's purpose. Density is absorbed by the receipt-table typography (12px labels / 13.5px values, 40px rows) and by cutting everything else — no subtitle, no illustration, no cross-sell. The sheet is dense in exactly one block and empty everywhere else; that contrast *is* the calm.
2. **Quiet confirmation vs. reassurance.** A buyer who just released their phone number wants proof it worked; "quiet" must not read as "nothing happened". Resolved with a stable, user-dismissed confirmation (no toast, no auto-dismiss) rather than a louder one.
3. **Green check vs. monochrome confirmation.** Green success on send was rejected — green is reserved as the *verification* colour (`.chip-pass`, `--success`); spending it on generic task-success would dilute the page's most important signal. The confirmation mark is ink.
4. **Tint guardrail vs. app tokens.** The brief permits tint pips/hairlines, but `app.css` is deliberately tintless. Resolved: zero tint in Part A, one optional hairline in Part B (§B6), locally scoped, flagged for the founder to keep or drop. (The standing landing-vs-app aesthetic question is not implicated here — everything above is specified against the app's white system.)
5. **Truthful copy vs. unresolved send.** The existing toast already over-asserts ("sent to the agent — they'll reach out on WhatsApp") for a stub that transmits nothing. All delivery-asserting copy is quarantined into four decision-dependent slots (§A9) with character budgets, so the founder's call flips constants, not layout — and nothing ships that asserts delivery before the decision.

---

## E. Left open, deliberately

- **[LEGAL-1..4]** — consent wording. Owner: legal specialist. Layout reserved (§A5), character budgets communicated.
- **[SLOT-PROV], [SLOT-CONF-1], [SLOT-CONF-2] + primary button label** — depend on the founder's real-send vs. demonstration decision (§A9). No copy authored here.
- **§B6 tint freshness bar** — keep or drop; founder call on whether the app admits any tint. (Dormant either way until the evidence data exists.)
- **Auth-before-preview** — this spec opens the sheet pre-auth (§A1, with rationale). If product prefers the current gate-first order, only §A1 and the A4b signed-out states change; flag to product-manager rather than silently deciding if there is pushback.
- **Evidence-layer schema work** (§C, second table) — populating the empty verification tables is what turns the definitional disclosure into the full narrative. Owner TBD; raise via product-manager against `docs/LISTING_SCHEMA.md`. Design is fixed and waiting (§B3b); no redesign needed on activation.
- **Per-check editorial copy** (`coversStatement` / `limitStatement`, ~7 check types × 2 sentences) — authored once, definitional phrasing only, no dates or actors. Drafts in §B3a; needs a copy pass before ship.

*Implementation hand-off: frontend-developer. Verification copy templates in §B3 are drafts for real data fields — production strings render from data, never from hardcoded examples.*
