# Agency brand-kit onboarding — design spec (P-A2)

Status: spec only. No code in this document is shipped; markup fragments exist to make
layout unambiguous for frontend-developer.

Decision honoured (founder, closed): the brand kit is collected **during onboarding at
registration**, not left as a settings page. Registration provisioning now creates the
`agencies` row and owner membership, so every step below has a real row to write to.

North star: the agency owner is impatient, on a phone, and one taxing screen away from
abandoning. Every step must be answerable from memory in under ten seconds or be
skippable in one tap.

---

## 1. Where the flow lives

- **Entry point A (primary):** immediately after agency signup. `signin.html` already
  redirects a new agency to `agency.html?welcome=agency`. On that parameter, the portal
  chrome (sidebar, appbar nav) does **not** render; the onboarding sequence renders
  full-screen instead. The agency never sees the portal behind a modal — there is no
  portal to be curious about yet, and a scrim-over-dashboard invites dismissal.
- **Entry point B (return):** the existing `#brandOnboard` checklist card on the Brand
  pane (Team → Brand). It stays. It is the re-entry surface, not a second copy of the
  wizard — see §6.
- **Exit:** finishing or skipping the last step lands on the portal Home pane. The
  `welcome` parameter is consumed; refresh does not restart the wizard.

Layout container (all steps):

- Single `.card`, max-width **440px** (matches the existing `.phone` constraint),
  horizontally centred, top margin **max(48px, 12vh)** on desktop.
- Below **480px** viewport width: card goes full-bleed — `border-radius: 0`, no side
  margin, `min-height: 100dvh` column with the primary button pinned in normal flow at
  the bottom of the content (not position:fixed — keyboards on Android fight fixed
  footers).
- Card padding: **24px 22px** (mobile), **28px 26px** (≥480px).
- Background: page `--bg` (#f5f5f5). No imagery, no illustration. The Synapse load
  splash (`#syn-load`) runs as normal; nothing else animates on entry except the
  standard step transition (§5).

## 2. Step count and order

**Four screens. One question each. Two of them skippable.**

| # | Screen | Fields | Skippable? |
|---|--------|--------|------------|
| 0 | Registration (exists, unchanged) | email, password, agency name | No — already shipped |
| 1 | Where you work | city, WhatsApp number | **No** |
| 2 | Your look | primary colour, secondary colour, logo URL | **Yes** (whole step) |
| 3 | Your sign-off | tagline, voice | **Yes** (whole step) |
| — | Done | summary of what was actually set | n/a |

Order rationale: step 1 is pure recall (nobody has to look anything up), so it builds
momentum and captures the two operationally critical values before any skip is offered.
Steps 2 and 3 are composition/lookup tasks and come after, each with a visible skip.
The wizard never mixes a required field and an optional field on the same screen — a
screen is either "answer this" or "this helps, skip if you like," so the user never has
to parse per-field asterisks.

### Step 0 — Registration (context, not new work)

Unchanged. `auAgencyName` already rides signup metadata into provisioning, which names
the agency. **The wizard therefore never re-asks the agency name.** Step 1's header
greets with the real stored name (read from the `agencies` row — never a placeholder).

### Step 1 — Where you work (required)

Copy (exact):

- Eyebrow: `GETTING SET UP` — `.eyebrow` recipe (11.5px / 700 / +0.14em caps, `--brand-text`).
- Heading: **"Where do buyers find you?"** — `.h1` at reduced scale: **26px / 1.15**
  (37px is a desktop pane scale; on a 360px phone it wraps badly).
- Support line, 13.5px `--ink-muted`, margin-top 6px: "Leads from your listings go to
  this WhatsApp number. You can change both any time under Team → Brand."

Fields (in order, `.field` pattern — label 12px/700 `--ink-muted`, 6px below-label gap,
14px between fields):

1. **City** — text input, `autocomplete="address-level2"`, max **40 chars**,
   placeholder `City where you operate`. Free text; no dropdown of invented cities.
2. **WhatsApp number** — `type="tel"`, `inputmode="tel"`, max **20 chars**,
   placeholder `+234…`. Validation: accepts `+` followed by 10–15 digits after
   normalising spaces/dashes; a leading `0` local format is auto-prefixed to `+234` on
   blur and the normalised value is shown in the field (never silently rewritten on
   submit). Error state uses `.inline-err` (12.5px, #7a271a), message: "That doesn't
   look like a full number — include the country code, e.g. +234."

Input metrics: padding **12px 14px**, radius **11px**, border `--border-strong`
(rgba(15,18,24,0.16)), background rgba(255,255,255,0.8), font 15px (never below 16px
*computed* on iOS — set `font-size: 16px` under 480px to prevent zoom-on-focus).

Button row (20px above-gap): single `.btn .btn-primary .btn-block`, label
**"Continue"**. No skip on this screen. Button disabled until both fields are
non-empty; disabled state is the shared `.55` opacity rule.

Writes on Continue: `city`, `whatsapp_number`.

### Step 2 — Your look (skippable)

- Heading: **"Add your look"** (26px).
- Support line: "Tayo paints your ad creatives in these colours and stamps your logo on
  them. Without them, creatives go out in plain ink."

Fields:

1. **Primary colour** and **Secondary colour** — side by side in the existing
   `.brand-swatches` grid (2 columns, 12px gap; `input[type=color]` 40px tall, radius
   8px). **Critical honesty rule:** the pickers render in an *unset* state — swatch
   area shows a diagonal-hairline "no colour" texture (1px `--border` lines), not a
   default colour. A colour is only written to the row if the agency actually opens the
   picker and confirms. The current Brand pane behaviour of defaulting the inputs to
   `#121212` / `#c76a1a` must **not** carry into onboarding: an untouched default that
   gets saved becomes a fabricated brand colour, and the fabrication standard here is
   absolute. (Implementation note: a plain `<input type=color>` cannot be valueless —
   spec is a swatch button that opens the native picker on tap and holds a real
   "unset" state until first confirmation.)
2. **Logo URL** — `type="url"`, placeholder `https://…`, max **300 chars**. Helper
   text (12px `--ink-dim`, below field): "A link to your logo image — PNG or SVG on a
   transparent or white background works best, at least 200px wide." Constraints
   enforced softly: must be https; on blur, attempt to load it into the live preview;
   if it 404s or isn't an image, show `.inline-err`: "We couldn't load an image from
   that link." The dark-background logo variant is **not** asked here — it stays a
   Brand-pane refinement.

Live preview: the existing `.brand-preview` component (radius 12px, 16px 18px padding,
min-height 64px, `aria-live="polite"`), pinned below the fields with 14px gap. It
renders only what has actually been entered this session plus the stored agency name:
initials mark on `--ink` background when no colour is set, no accent chip when no
secondary colour, no image when no logo. It must never render specimen content.

Buttons (20px above-gap, two-row stack, 10px gap):

- `.btn .btn-primary .btn-block` — **"Continue"** (enabled always; saves whatever was
  entered, including nothing).
- `.btn .btn-ghost .btn-block` — **"Skip for now"**. Same tap target size as the
  primary (never a small text link on mobile). Skips save nothing from this screen.

Writes on Continue: `brand_color`, `brand_color_secondary`, `logo_url` — only keys the
user actually set; untouched fields are not written at all (no nulling of values a
teammate may set later, no defaults).

### Step 3 — Your sign-off (skippable)

- Heading: **"How should Tayo sign off?"**
- Support line: "Captions end with your name and tagline, and Tayo writes replies in
  your voice. Specific beats polished — 'warm and plain-spoken, never salesy' beats
  'professional'."

Fields:

1. **Tagline** — text input, max **80 chars**, placeholder
   `One line — what you want to be known for`. Character counter appears only past 64
   chars (80%): 12px `--ink-dim`, right-aligned under the field, format `72/80`.
2. **Voice** — `textarea`, 3 rows, max **400 chars**, placeholder
   `Describe the voice you want in your own words`. Counter past 320 chars. No preset
   voice chips, no example voices: a menu of adjectives we authored is one tap away
   from an invented voice, and the codebase already holds the line that an absent voice
   must not become an invented one.

Buttons: identical pattern to step 2 — **"Finish"** (primary) and **"Skip for now"**
(ghost).

Writes on Finish: `tagline`, `brand_voice` — again only if non-empty.

### Done screen

- Heading: **"You're in."** Support line: "Everything below can be changed any time
  under Team → Brand."
- Body: the `.brand-preview` component showing the real saved state — and only that.
  An agency that skipped everything sees: initials mark in ink, their real agency
  name, and a quiet line (13px `--ink-muted`): "No look or sign-off yet — your posts
  will go out unsigned until you add them." This sentence is the honest version of
  done; it is not an error state and uses no warning colour.
- Below the preview, the three-item derived checklist (`.bo-steps` pattern — see §5)
  reflecting actual completion.
- Single button: `.btn-primary .btn-block` — **"Go to your dashboard"** → portal Home.
- **No confetti, no celebration animation.** Calm means arrival, not applause.

Nothing on this screen — or anywhere in the wizard — states or implies a verification
status, trust level, or ranking. The word "verified" does not appear in onboarding
copy. Completion of the brand kit is framed only as output quality ("signed posts"),
never as standing.

## 3. Required versus skippable — the call

**Required: city and WhatsApp number (step 1). Skippable: everything visual and
tonal (steps 2 and 3). Agency name is required but already captured at registration,
so onboarding's marginal required ask is exactly two fields.**

Reasoning, field by field:

- **Agency name — required, zero-cost.** Collected at signup where it is unavoidable
  (it names the workspace). Re-asking it in onboarding would be the wizard's first
  question being one the user already answered — the fastest way to teach them the
  flow wastes their time.
- **WhatsApp number — required.** The judgement call of this spec. It is the single
  highest-leverage field: it is where leads land, it is the CTA on generated content,
  and without it the portal's core promise (marketing that produces contactable
  buyers) is structurally broken, not merely unbranded. Against the abandonment risk:
  every Nigerian agency owner knows this number by heart and can type it in under five
  seconds on the device it belongs to. It is recall, not composition. A field with
  near-zero answer cost and near-total downstream value is the one place "required" is
  cheap.
- **City — required.** Same recall test (one word), and it anchors proximity features
  and content geography. Bundled with WhatsApp so the entire mandatory surface of
  onboarding is one screen.
- **Colours — skippable.** One tap to answer, but only if the owner *knows* their
  brand colour; many small agencies don't have one yet, and forcing a choice
  manufactures a fake brand value — the exact failure the fabrication rule exists to
  prevent. Degradation when skipped is graceful and legible (ink creatives).
- **Logo — skippable, and cannot honestly be required.** There is no upload path in
  the product today; the field takes a *hosted URL*. Requiring it demands the owner
  has a logo, hosted, with the link retrievable on a phone mid-signup. That is an
  abandonment machine. (See §8 — an upload path would change this calculus to
  "skippable but first-nudged," never required.)
- **Tagline — skippable.** Composition under time pressure produces throwaway
  taglines that then get stamped on every caption. Better absent than bad; absence is
  handled cleanly (name-only sign-off).
- **Voice — skippable.** The highest-thought field in the kit. Asking for a
  considered paragraph from an impatient thumb is how you get "professional and
  reliable" saved forever. The Brand pane, revisited at leisure, is where voice gets
  written well.
- **About / specialties / Instagram / website / dark logo — not in onboarding at
  all.** They exist on the Brand pane and stay there. Onboarding is not a compressed
  copy of the settings page; it is the minimum viable identity plus two well-framed
  invitations.

## 4. Progress indication

- **Pips, not a bar.** Three pips (steps 1–3; the done screen shows none), centred
  above the eyebrow, 16px below the top edge of the card.
- Pip metrics: **6px** diameter, **10px** gap. Current step: `--tint`. Completed:
  `--tint` at 100% but 4px (visually receded). Upcoming: 6px ring, 1px `--border`,
  no fill.
- **Token note — new, and deliberately caged:** `--tint: #c76a1a` (the burnt orange
  already present as the secondary-colour default in the Brand pane). It does not
  exist in `app.css` yet; introducing it is part of this spec. It is permitted on:
  progress pips, 1px hairlines, and progress-bar fills. It is **never** used for
  text, backgrounds/washes, glows, shadows, icons, or focus rings. Frontend should
  add a comment to that effect where the token is defined, so drift is catchable in
  review.
- Each pip carries `aria-hidden="true"`; the accessible progress lives on the card:
  `aria-label="Step 2 of 3 — Your look"` on the step's heading region, and the
  heading is focused (programmatically, `tabindex="-1"`) on step change so screen
  readers announce progress without a live region.
- **"Done" is derived, not declared.** The definition of a complete brand kit is the
  existing `STEPS` derivation on the Brand pane — named + (logo or colour) + voice —
  computed from the saved row, never from a "visited the wizard" flag. Finishing the
  wizard with skips therefore does *not* mark the kit done; it marks the wizard done.
  The checklist persists wherever items are genuinely missing (§6).

## 5. Step transitions and component reuse

- Transition between steps: outgoing content fades to 0 over **120ms**, incoming
  fades in with a **6px** upward translate over **200ms**, easing
  `cubic-bezier(.22,1,.36,1)` (the codebase's standard curve). Card height animates
  via a max-height/grid trick or FLIP — no layout jump. Under
  `prefers-reduced-motion: reduce`: instant swap, no translate.
- Reused patterns (extend, do not reinvent): `.card` glass surface, `.eyebrow`,
  `.field` label/input stack, `.brand-swatches`, `.brand-preview`, `.bo-steps`
  checklist, `.btn` family, `.inline-err`, `#synToast`. New patterns introduced by
  this spec, named for drift-spotting: **onboarding pips** (§4) and the **unset
  colour swatch** (§2, step 2). Nothing else new.
- Focus visibility: every control in the wizard is covered by the global
  `:focus-visible` ring rule in `app.css` (box-shadow ring, `--ring` /
  `--ring-offset`). The unset-colour swatch button and the skip buttons must remain
  plain `<button>` elements so they inherit it; no `outline: none` anywhere in wizard
  styles. Tab order per screen: fields top-to-bottom, then primary, then skip.
- Back navigation: a quiet "Back" text button (13px, `--ink-muted`, top-left of card
  content, 44px min tap target) on steps 2–3. Browser back also steps back (history
  entries per step) rather than exiting to signin.

## 6. The skip-and-return path

What skipping actually produces, and how the agency finds its way back — specified as
one loop:

**a) Output without a brand kit (the consequence).** Already partially shipped;
formalised here as the contract:

- Captions end unsigned — no name-and-tagline sign-off block is fabricated.
- Hashtag sets omit the leading agency handle.
- Creatives render in the app's own ink palette (#121212 on white). Never a stand-in
  colour presented as theirs.
- The campaign composer shows the existing `.cmp-brandbar.plain` strip. Its copy is
  the discovery mechanism, upgraded from the current bold-text mention to a real
  link: "No brand set — these post unsigned. **Add your name, colours and voice**"
  where the bold phrase is an `<a>` that navigates directly to the Brand pane
  (`data-pane="brand"`), 13px, underlined on hover, ink-coloured. This is the
  moment of maximum motivation — the agency is looking at unsigned output right
  where branding would have appeared — so the strip is the primary re-entry prompt,
  not a nag elsewhere.

**b) The standing re-entry surface.** The existing `#brandOnboard` checklist card on
the Brand pane, unchanged in mechanism: shown whenever any derived step is genuinely
missing, dismissible via "Skip for now" (localStorage), resurfaced on
`welcome=agency`. Checklist rows use the shipped `.bo-steps` pattern; ticks stay in
`--success` green (an existing pattern — do not restyle to `--tint`).

**c) No other nagging.** No badge counts on the Brand nav item, no recurring toasts,
no email drip specified here. Two prompts — one at the point of consequence, one on
the page itself — respect the calm contract. If analytics later show skipped kits
never return, escalate as a separate decision rather than pre-building pressure.

**d) Wizard re-entry.** The full-screen wizard runs only on `welcome=agency`
(first arrival). A returning agency completes the kit through the Brand pane form,
which already covers every field. The wizard is a front door, not a mode.

## 7. Empty and partial states — the normal early cases

Rendered truthfully everywhere the brand surfaces. "Empty states show empty" — no
specimen logos, no sample palettes, no placeholder taglines rendered as if real.

| State (normal, not edge) | Brand preview / portal | Generated output |
|---|---|---|
| Name only (skipped everything) | Initials mark (2 letters, white on `--ink`, 38px, radius 9px) + real name. Line: "No look or sign-off yet — your posts will go out unsigned until you add them." | Unsigned captions; ink creatives; `.cmp-brandbar.plain` with link (§6a) |
| Name + colour, no logo | Initials mark painted in their primary colour; accent chip only if secondary set | Creatives in their colour; captions still unsigned if no tagline/voice; brandbar shows colour hairline + name |
| Name + logo, no colour | Logo at 38px contain-fit on white; initials mark hidden when the image loads (not shown alongside) | Logo stamped; creative palette stays ink |
| Name + tagline, no visuals | Name + tagline text rows, initials mark in ink | Captions sign off name + tagline; creatives ink |
| Logo URL set but unreachable | Image error → mark falls back to initials silently in previews; in the Brand pane only, a `.inline-err` under the field: "We couldn't load an image from that link." | As if no logo |
| Everything set | Full preview | Full signed, painted output (shipped behaviour) |

Rules of the table: partial is composed, never penalised — no warning chips, no
amber, no "incomplete profile" scoring. The only place absence is *named* is the
done-screen line, the brandbar strip, and the checklist — all in `--ink-muted`
prose, none in warning colour. And absence of a field never invents a stand-in.

## 8. Tensions and open items (for product-manager / Dr. David)

1. **Logo upload.** The strongest brand asset is gated behind "have a hosted URL,"
   which on a phone at signup is effectively "skip." A Supabase-storage upload
   control would materially raise logo completion; if built, move logo to step 2's
   first position, still skippable. Until then the URL field stays and stays
   optional.
2. **Required-WhatsApp is the maximal ask.** If registration analytics show step-1
   drop-off above ~10%, demote city to optional first; WhatsApp last — it is the
   field the product cannot function without.
3. **Colour-input default bug-adjacent behaviour on the Brand pane.** The shipped
   pane initialises the pickers to `#121212`/`#c76a1a`, and `collect()` writes them
   even when untouched, which can save a colour the agency never chose. Onboarding
   must not inherit this (§2 step 2); the pane itself should be brought in line —
   flagged to frontend-developer as a separate small fix, not part of this spec's
   scope.
4. **Email confirmation.** If signup ever moves from instant session to
   confirm-first, the `welcome=agency` hop breaks; the wizard trigger should then
   key off "first authenticated visit with an essentially-empty brand" rather than
   the query param. Derivation logic for that already exists (`isFirstRun`).
