# Synapse Design System — Canonical Tokens, Divergence Audit, A11y Fixes

> ⚠️ **SUPERSEDED 2026-07-19 — do not build off this document.**
> Everything below describes the retired **warm off-white + terracotta +
> EB Garamond/Lato + glassmorphism** direction. Dr. David pivoted the entire
> app to **full monochrome, crypt.ee-style** — `#f5f5f5` background, `#363636`
> ink, `#121212` near-black accents, **no terracotta anywhere**, single
> typeface **Josefin Sans** app-wide. The canonical spec now lives in
> [`AGENT_BRIEF.md`](./AGENT_BRIEF.md) under "Brand" and "Typography".
>
> This file is kept for history only (the a11y *methodology* in §5–§6 is
> still sound and worth skimming if you're auditing contrast on the current
> palette — just re-run the ratios against the new tokens, don't reuse the
> numbers). Everything terracotta/EB-Garamond-specific below is dead.

_Author: ui-designer · 2026-07-17 · Direction decided by Dr. David 2026-07-17 (see AGENT_BRIEF.md): warm off-white + terracotta + glassmorphism. Supersedes both the "white/calm-premium" and "dark charcoal/emerald" directions. **Itself superseded 2026-07-19 — see banner above.**_

**Status:** Retired. Do not implement anything from this document — see AGENT_BRIEF.md for the current canonical tokens.

---

## 1. Canonical token set

Single source of truth. Proposal: these live in `app/app.css` (loaded by all five app pages) and are mirrored in `index.html`'s `:root` under the **same names** (index currently uses `--text*`; app uses `--ink*` — standardize on `--ink*` everywhere, keep `--text*` as one-line aliases in index during transition).

### 1.1 Color — backgrounds & surfaces

```css
--bg:        #f7efe7;                    /* warm off-white — page base, everywhere */
--bg-1:      #f2e7db;                    /* deeper warm wash — section alternation, gradients */
--surface:   #ffffff;                    /* opaque card interior when glass is unaffordable */
--glass:     rgba(255,255,255,0.72);     /* flat translucent surface (appbars, rails) */
```

### 1.2 Color — terracotta scale

```css
--brand:       #FF7B2C;  /* bright terracotta. DECORATIVE ONLY on --bg: glows,
                            gradients, fills behind dark ink. 2.3:1 on #f7efe7 —
                            never use as text or as fill under white text. */
--brand-dim:   #E86B1A;  /* hover step for --brand fills */
--brand-deep:  #C2552B;  /* deep terracotta. Large text (≥24px / ≥19px bold) on --bg;
                            button fill under white text (4.55:1 with #fff). */
--brand-text:  #A64420;  /* NEW. Terracotta for body-size text on --bg — 5.3:1, AA.
                            Replaces ad-hoc #b0521f / #c2410c. */
--brand-glow:  rgba(255,123,44,0.15);
--brand-tint:  rgba(255,123,44,0.08);    /* active-nav / chip backgrounds */
--brand-grad:  linear-gradient(135deg, #FF7B2C, #C2552B);  /* THE brand gradient —
                            currently hand-typed ~8× in agency.html alone */
```

### 1.3 Color — text (ink)

```css
--ink:       #15171a;                    /* primary text — 15.4:1 on --bg */
--ink-muted: rgba(21,23,26,0.66);        /* secondary text — ≈5.4:1, AA.
                                            RAISED from current 0.55 (3.75:1, fails AA). */
--ink-dim:   rgba(21,23,26,0.45);        /* tertiary/decorative ONLY (≈3:1) — never for
                                            information a user must read. Raised from 0.35. */
--ink-inverse: #ffffff;                  /* text on --brand-deep fills and photos-with-scrim */
```

### 1.4 Color — borders

```css
--border:        rgba(15,18,24,0.08);    /* hairlines on warm bg */
--border-strong: rgba(15,18,24,0.22);    /* input borders, must meet 3:1 non-text where
                                            the border is the only affordance */
--border-glass:  rgba(255,255,255,0.80); /* luminous rim on glass cards */
```

### 1.5 Color — states

```css
--success:      #276b44;   /* 5.6:1 on --bg. Darkened from #2e7d4f (4.4:1 borderline). */
--success-tint: rgba(46,125,79,0.10);
--warn:         #7a5410;   /* 6.0:1. Replaces #a8742b (3.6:1, fails) and #9c7a1e/#8a6a18. */
--warn-tint:    rgba(176,125,43,0.12);
--danger:       #a52a1d;   /* rejected/expired states; 6.2:1 */
--info:         #3b6ea5;   /* 4.7:1 — AA at body size, keep */
--focus:        #C2552B;   /* focus ring color, 4.0:1 vs --bg (passes 3:1 non-text) */
```

Third-party channel colors (Instagram/Facebook/WhatsApp/TikTok hexes in agency.html) are exempt from the scale but must sit on white/neutral chips, never carry text.

### 1.6 Typography (CANONICAL — locked by Dr. David 2026-07-17, supersedes everything below the old three-face model)

**Two families only: EB Garamond (display) + Lato (everything else).** Restaglick, Bromolek, Fraunces and Inter are **removed entirely** — delete every `@font-face` block, every reference to `Synapse/fonts/`, and every occurrence of those names in font stacks. Both families load from Google Fonts (see §1.6.4). The local-font licensing concern in `docs/LEGAL_TRUST_MEMO.md` is now moot.

#### 1.6.1 Token mapping (same variable names — implementation is a pure value swap)

```css
--f-serif:  'EB Garamond', Georgia, serif;    /* headings, display, prices, big numbers */
--f-sans:   'Lato', system-ui, sans-serif;    /* body, UI, labels — ALL running text */
--f-accent: 'Lato', system-ui, sans-serif;    /* all-caps eyebrows/kickers/chips. Same family
                                                 as --f-sans on purpose: "accent" is a RECIPE
                                                 (uppercase + tracking, §1.6.5), not a face. */
```

| Token | Stack | Role | Rules |
|---|---|---|---|
| `--f-serif` | `'EB Garamond', Georgia, serif` | Display, H1–H3, prices, big numbers | weight 400–600 (EB Garamond has **no 300** — old `font-weight: 300` heading rules become **500** with the size bumps below). Never body text. |
| `--f-sans` | `'Lato', system-ui, sans-serif` | Body, UI, buttons, labels | 300/400/700 (Lato has no 500/600 — old `600` rules become **700**) |
| `--f-accent` | `'Lato', system-ui, sans-serif` | All-caps eyebrows/kickers/chips only | recipe in §1.6.5. Never running text. Kept as a separate token so the accent role stays greppable and app.css gains parity with index.html — **app.css must ADD `--f-accent`** (it currently has only the two-role model). |

#### 1.6.2 Type scale (tuned for Garamond + Lato)

EB Garamond's x-height runs ~10–15% smaller than Fraunces at equal px, so **every serif size below is bumped ~8–12% over the outgoing value** — do not reuse the old numbers. Lato also sets slightly small, hence body moves 14.5px → 15px.

| Role | Family / weight | Size | Line-height | Letter-spacing |
|---|---|---|---|---|
| Display / hero (index) | `--f-serif` 500 | `clamp(42px, 5vw, 70px)` (replaces `clamp(38px, 4.6vw, 64px)`) | 1.06 | −0.01em |
| Display-2 / section heads (index `.ag-h2`, section h2s) | `--f-serif` 500 | `clamp(33px, 4vw, 48px)` (all landing serif clamps: multiply old min/max by ~1.1) | 1.12 | −0.01em |
| H1 (app page titles: `.h1`, `.db-h1`, `.tj-title`) | `--f-serif` 500 | 37px (replaces 34px) | 1.12 | −0.01em |
| H2 | `--f-serif` 500 | 26px (replaces 24px) | 1.2 | −0.005em |
| H3 / card titles | `--f-serif` 600 | 20px | 1.3 | 0 |
| Body | `--f-sans` (Lato) 400 | 15px (replaces 14.5px) | 1.6 | 0 |
| Small / caption | `--f-sans` 400 (500-emphasis → 700) | 13px | 1.45 | 0 |
| Label (min functional size, a11y F7) | `--f-sans` 700 | 12px | 1.2 | +0.01em |
| Eyebrow / kicker / chip | `--f-accent` 700, tracked caps | 11.5px (chips may sit at 11px) | 1.2 | +0.14em (§1.6.5) |
| Price | `--f-serif` 600 + `font-variant-numeric: lining-nums` | 30px (23px in compact cards; replaces 27/21px) | 1.1 | 0 |
| Big number / stat | `--f-serif` 500 (600 below 40px) + `lining-nums` | `.ag-statbig .n`: `clamp(64px, 11vw, 112px)`; `.ag-bignum`: 48px | 1.0 | −0.01em |

**Serif weight migration rule (mechanical):** old serif `300` → `500`; old serif `400` → `500` at heading sizes, `600` at price/stat sizes. Garamond at 400 on a warm background reads wispy at UI scale; 500 is the workhorse.

**Numerals rule:** every element showing ₦ prices, percentages, or stats in `--f-serif` gets `font-variant-numeric: lining-nums;` (belt-and-braces: `font-feature-settings: "lnum" 1;`) so Garamond's oldstyle figures never introduce descending digits into prices. Where digits must column-align (tables, comparison grids), use **Lato 700** instead — do not rely on Garamond tabular figures.

#### 1.6.3 Weights to load (minimum set)

- **EB Garamond:** 400, 500, 600 + **400 italic** (quotes/testimonials). Nothing heavier — 700/800 get muddy at display sizes.
- **Lato:** 300 (large light subheads only), 400 (body), 700 (labels, buttons, emphasis, accent recipe).

#### 1.6.4 Google Fonts load (paste in every page `<head>`, exact strings)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
```

Applies to: `index.html`, `app/toju.html`, `app/browse.html`, `app/property.html`, `app/dream.html`, `app/agency.html` (app pages that only load `app.css` still need the `<link>` — CSS custom properties don't fetch fonts).

#### 1.6.5 All-caps accent recipe (replaces Bromolek)

```css
.eyebrow, .kicker, .ag-kicker, .chip-label {
  font-family: var(--f-accent);   /* = Lato */
  font-weight: 700;               /* Bromolek read heavy at 400; Lato needs 700 to hold
                                     its own against Garamond's texture at this size */
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: .14em;          /* outgoing Bromolek tracked .18em; Lato's caps are
                                     wider-set, so .14em restores the same optical measure.
                                     Do not exceed .16em with Lato. */
  line-height: 1.2;
  color: var(--brand-text);       /* or --ink-muted; never --brand (a11y F1) */
}
```

### 1.7 Spacing

4px base grid. Named steps (match observed values, snap strays to these):

```
--sp-1: 4px   --sp-2: 8px   --sp-3: 12px  --sp-4: 16px
--sp-5: 22px  --sp-6: 28px  --sp-7: 34px  --sp-8: 48px  --sp-9: 80px
```

Page gutter: `28px 34px` (`.wrap`). Card interior: 22px. Chip/pill padding: 8px 14px.

### 1.8 Radius

```css
--radius:     22px;   /* cards */
--radius-sm:  14px;   /* nested cards, media */
--radius-xs:  11px;   /* inputs, textareas — replaces stray 10/11/12px */
--radius-pill: 100px; /* buttons, chips, nav items */
```

### 1.9 Shadow & glass

Two materials only:

**A. Warm frost (canonical app glass)** — this is the toju.html recipe; promote it to `app.css .card` (whose current shadow `rgba(20,26,38,0.09)` is a cool grey-blue that reads slightly clinical against the warm bg):

```css
--glass-fill:   linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,251,246,0.42));
--glass-blur:   blur(26px) saturate(1.5);
--glass-rim:    1px solid var(--border-glass);
--shadow-card:  0 18px 44px rgba(122,62,22,0.13), inset 0 1px 0 rgba(255,255,255,0.9);
--shadow-float: 0 16px 38px rgba(194,85,43,0.30);  /* CTA buttons; agency uses 0.42 — too heavy, cap at 0.30 */
```

**B. Crystal (marketing-only)** — index.html's `--crystal-*` set (dark-tinted rims, chroma fringes). Keep it scoped to index.html; do not import into app pages. It is the "cinematic" register of the same brand, acceptable divergence.

Glass rules: max two stacked blur layers per viewport region (perf); glass never stacks on glass more than once; anything with body text on glass needs the fill's top stop ≥ 0.66 white so contrast math above holds.

### 1.10 Motion

Keep `app/motion.css` tokens as-is (`--m-micro` 100ms / `--m-standard` 180ms / `--m-expanded` 250ms, eases). index.html's `--ease: cubic-bezier(0.22,1,0.36,1)` should alias to `--m-ease-spring` semantics; not worth breaking.

---

## 2. Component / page divergence inventory

Confirmed by grep: **no dark-charcoal, emerald, or mono-price remnants exist anywhere** — the old landing look is fully retired. Divergence today is (a) fonts, (b) hardcoded hexes that should be tokens, (c) token-name drift between index.html and app.css.

### 2.1 `app/app.css` (shared — fix here first, everything inherits)
- Fonts: swap `--f-serif` → `'EB Garamond', Georgia, serif` and `--f-sans` → `'Lato', system-ui, sans-serif`; **ADD `--f-accent: 'Lato', system-ui, sans-serif`** (parity with index.html's three-token model). No `@font-face` blocks — fonts come from the Google Fonts `<link>` in each page head (§1.6.4). Apply the serif weight/size migration rule (§1.6.2): `.h1` 34px/300 → 37px/500.
- Missing tokens: `--brand-deep`, `--brand-text`, `--brand-grad`, `--border-strong`, `--warn`, `--danger`, `--info`, `--focus`, `--radius-xs`, glass/shadow tokens.
- `.card` shadow is the cool-grey variant → warm frost (§1.9A).
- `--ink-muted`/`--ink-dim` alpha bump (§1.3).
- No global focus-visible rule (see a11y F2).

### 2.2 `index.html` (landing)
- Fonts: **migrate** — delete the Restaglick/Bromolek `@font-face` blocks, swap the three `--f-*` token values per §1.6.1, add the Google Fonts `<link>` (§1.6.4), then apply the serif migration: every `font-weight: 300` serif rule → 500, landing serif clamps × ~1.1 (§1.6.2 rows 1–2), `.ag-kicker`/eyebrow tracking .18em → .14em at Lato 700 (§1.6.5). `Synapse/fonts/` files are dead — remove references.
- Token-name drift: `--text/--text-muted/--text-dim` vs app's `--ink*`; `--crystal-*` material is index-only (accepted, §1.9B).
- `--brand` (#FF7B2C) used as text color in several places (`.ag-kicker`, `.ag-bignum`, `.ag-statbig .n`, testimonial quote) — 2.3:1, see a11y F1. Big numerals can keep terracotta by switching to `--brand-deep`; 12.5px kickers must use `--brand-text`.
- No focus styles at all.

### 2.3 `app/toju.html` (do not edit — another agent active; hand notes to them)
- ~12 hardcoded `#C2552B`, plus `#b0521f`, `#8b8b8b`, `#a8742b` → `--brand-deep` / `--brand-text` / `--ink-dim` / `--warn`.
- `body { background: #f7efe7 }` → `var(--bg)`.
- `.tj-title` 40px serif — snap to `--fs-h1` (34px) or document as intentional hero exception.
- Glass recipe here is the canonical one — lift into app.css rather than deleting.
- Chat input `outline: none` with no replacement (a11y F2).

### 2.4 `app/browse.html` (do not edit — another agent active)
- Hardcoded `#C2552B` ×6, `#b0521f` ×2, `#8b8b8b`, `#a8742b` → tokens.
- `.price-pin`: white 11px text on `var(--brand)` — 2.6:1 **worst contrast failure in the app** (a11y F1). Fix: pin fill `--brand-deep` (#fff on it = 4.55:1) and 12px.
- `.cmpbar button`: white on `--brand` → `--brand-deep` fill.
- Search input / selects `outline: none`.

### 2.5 `app/property.html`
- Stays a 460px swipe-card deck (constraint honored — no layout changes proposed).
- Hardcoded `#C2552B` ×7, `#2e7d4f`/`#4fb87e` verification greens → `--success` (+ keep `#4fb87e` only as decorative ring stroke, not text).
- Arrow-key deck nav exists (good); needs visible affordance + SR announcement (a11y F5).

### 2.6 `app/dream.html` (do not edit — another agent active)
- Hardcoded `#C2552B` ×5 → tokens; "✓ pinned" overlay `rgba(194,85,43,0.75)` → keep, text is 11px 700 white on terracotta ≈4.3:1 at that alpha over photos — bump overlay alpha to 0.85.
- `.board-title` rename input: `outline: none`, focus = dashed bottom border only — insufficient (a11y F2).

### 2.7 `app/agency.html`
- Heaviest drift: brand gradient hand-typed ~8× (`lines 26, 289, 309, 318, 436, 447, 1445…`) → `--brand-grad`; `#C2552B` ×~8, `#b0521f`, `#a8742b` ×3, `#8a6a18`, `#7a5410`, `#c2410c` (a stray Tailwind orange-700 — remove), `#17191d`/`#161616` tooltip darks → one `--tooltip-bg: #17191d` token.
- CTA shadow `rgba(194,85,43,0.42)` exceeds the 0.30 cap.
- Denser info design is correct for agency (per product philosophy: shared language, different density) — the divergence to fix is values, not density.
- Form inputs `outline: none` throughout; focus = faint border-color shift only.

### 2.8 Shared components to extract (currently re-implemented per page)
Pill button, glass card, trust chip (pass/pending/gold), price display, search input, section eyebrow+h2 pair, tooltip. All exist ≥3× with small mutations — freeze their spec to §1 values so drift becomes visible in diffs.

---

## 3. Accessibility findings (prioritized)

### P1 — contrast & focus (blocks AA, cheap to fix)

- **F1. Terracotta text contrast.** `#FF7B2C` on `#f7efe7` = **2.3:1** — fails even large-text (3:1). Used as text in index.html kickers/big-nums and via `var(--brand)` color rules across app pages (prices, KPIs, eyebrows). Fix: text ≥24px → `--brand-deep` (4.0:1, passes large-text AA); text <24px → `--brand-text` #A64420 (5.3:1). `--brand` remains fills/glows/gradients only.
- **F2. White-on-bright-terracotta fills.** #fff on #FF7B2C = **2.6:1**: `.price-pin`, `.cmpbar button`, `.btn-primary`, agency `.act`/CTA buttons. Fix: solid fills → `--brand-deep` under white text (4.55:1); the `--brand-grad` gradient is acceptable for large CTAs only if text sits ≥50% toward the #C2552B end — safer: give gradient CTAs a `--brand-deep` 55%→100% variant (`linear-gradient(135deg,#E86B1A,#C2552B)`).
- **F3. No visible focus anywhere.** `outline: none` on every input across toju/browse/dream/agency/property; buttons/links rely on default (often invisible on glass). Fix, global in app.css and index.html:
  ```css
  :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 4px; }
  ```
  and delete every `outline: none` that lacks a replacement. Border-color-only focus (`rgba(255,123,44,0.4)`) fails 1.4.11 non-text contrast.
- **F4. Muted ink.** `--ink-muted` at 0.55 = 3.75:1 (fails body AA); `--ink-dim` 0.35 ≈ 2.5:1; stray `#8b8b8b` ≈ 3.0:1; `#a8742b` warn = 3.6:1; `#2e7d4f` success = 4.4:1 borderline. Fix via token values in §1.3/1.5 — one edit in app.css corrects most of the app.

### P2 — keyboard & semantics

- **F5. Property swipe deck:** ArrowLeft/Right handler exists on `document`, but cards aren't focusable and card changes aren't announced. Add `tabindex="0"` + `role="group"` + `aria-roledescription="carousel"` on the deck, `aria-live="polite"` label "Card 2 of 5 — Neighbourhood", and visible prev/next buttons (also serves mouse users; the deck currently implies swipe-only).
- **F6. Agency nav rail + panes:** should be `role="tablist"`/`tab`/`tabpanel` with `aria-selected` and Left/Right roving tabindex; the Ask-Tayo drawer needs `aria-expanded` on its trigger, focus moved into the drawer on open, `Esc` to close, focus returned to trigger.
- **F7. Sub-12px functional text.** 11–11.5px buttons/chips (`font: 600 11.5px`, `700 11px` etc., widespread in agency/browse) — raise functional text to 12px minimum (`--fs-label`); tracked-caps eyebrows exempt.
- **F8. Landmarks & skip link.** Verify every page has exactly one `<h1>`, `<main>` around content, `<nav>` on the appbar, and add a skip-to-content link (glass appbar + long agency rail make keyboard traversal expensive).
- **F9. Tayo chat log:** message container needs `role="log"` + `aria-live="polite"` so Tayo's replies are announced; the typing indicator should be `aria-hidden`. (Hand to the agent currently in toju.html.)
- **F10. Leaflet maps (toju canvas, browse):** ensure map containers aren't keyboard traps; give markers/popups accessible names (property title + price), and provide the list view as the canonical accessible path (it already exists — just don't hide it at mobile widths).

### P3 — robustness

- **F11. Imagery:** all 16 `<img>` tags have `alt` (verify they're descriptive, not empty, for property photos). Most listing imagery is CSS `background-image` — JS-built listing cards must carry `aria-label` = "3-bed apartment, Lekki Phase 1, ₦85m, verified".
- **F12. Reduced motion:** `prefers-reduced-motion` exists once in motion.css — extend to Lottie orbs (pause/hide) and the toju chat→canvas morph (crossfade fallback).
- **F13. Glass legibility floor:** enforce the ≥0.66 white top-stop rule (§1.9) wherever body text sits on glass over photography (toju bubbles over the Unsplash bg are the risk case).
- **F14. Emoji/pseudo-content:** `content: '✓ pinned'` in dream.html is CSS-only text — screen readers may skip or mangle it; move state to a real element with `aria-label`.

---

## 4. Hand-off order for frontend-developer

1. app.css: token block (§1) + font value swap / `--f-accent` addition (§1.6.1) + Google Fonts `<link>` on all six pages (§1.6.4) + global `:focus-visible` + `.card`/`.btn-primary` material fixes → most pages improve for free.
2. agency.html + property.html + index.html hex→token sweep (§2.2/2.5/2.7) — safe to edit now.
3. toju.html / browse.html / dream.html sweeps (§2.3/2.4/2.6) — **deferred until the other agent's edits land**; give them F3/F9/F10 notes now so they don't add new `outline: none`.
4. P2/P3 a11y items in file order above.

Sign-off checkpoint: after step 1–2, screenshot pass against §1 values; I review before step 3.

---

## 5. CRM pipeline table (`#pane-crm` redesign, app/agency.html)

_Author: ui-designer · 2026-07-17. Spec only — no edits made to agency.html. Reference layout: SaaS project-management dashboard (toolbar → stats → rich table → bulk bar → pagination), re-expressed in the warm/glass system. Design intent (state this in code comments so it survives handoff): **the pane must read as a process** — a viewer who never opens a row should still see the funnel shape New → Contacted → Viewing → Negotiation → Won and, per lead, the single next action. Everything below serves that; nothing decorative is added._

Uses **only §1 tokens**. No new hexes. Third-party channel colors stay confined to the `CH` map per §1.5. All type per §1.6; all motion per §1.10 (`motion.css`). Everything sits on the 4px grid (§1.7).

### 5.0 Pane structure (top → bottom)

1. Existing eyebrow + `.h1` "CRM" + subtitle — unchanged.
2. Existing `.lead-banner` — unchanged position, but fix its text color: currently `color: var(--brand)` at 13px (fails F1) → `var(--brand-text)`.
3. **Toolbar** (§5.1).
4. **Stats region** (§5.2 + §5.3) — one wrapper `#crmStats`, shown/hidden by the toolbar toggle, default shown. Contains the 4 stat cards row, then the restyled `#brk` attribution strip.
5. **Funnel strip** (§5.7).
6. **Table** (§5.4–5.6) inside one glass card.
7. **Pagination footer** (§5.9) — last row of the same card.
8. **Bulk bar** (§5.8) — floating, appears only on selection.

Vertical rhythm: subtitle → toolbar `28px` (`--sp-6`); toolbar → stats `16px`; stats row → `#brk` `12px`; stats region → funnel strip `16px`; funnel strip → table card `12px` (they read as one unit — the strip is the table's legend).

The existing `#leads` card list and `openLead()` drawer remain the data source and detail view: the table's rows call the same `openLead(i)`. Nothing here requires backend/auth; it re-renders the same `leads[]` array.

### 5.1 Toolbar

One flat glass bar, not a card-among-cards: `background: var(--glass); backdrop-filter: blur(26px) saturate(1.5);` (counts as one of the two blur layers in this viewport region — the table card below uses `--glass-fill` which is the second; do **not** also blur the stat cards, see §5.2), `border: 1px solid var(--border)`, `border-radius: var(--radius-sm)` (14px), padding `8px 12px`, `display:flex; align-items:center; gap: 8px`.

- **Height:** 52px total (36px controls + 8px padding top/bottom).
- **Left group** (gap 8px):
  - **View switcher:** segmented control, one active segment for now labeled `Table view` (build as a 1-segment pattern so `Board view` can be added later without redesign). Track: `background: var(--brand-tint); border-radius: var(--radius-pill); padding: 3px`. Active segment: `background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(122,62,22,0.10); border-radius: var(--radius-pill);` height 30px, padding `0 14px`, Lato 700 12.5px.
  - **Filter** and **Sort** buttons: ghost style — `background: transparent; border: 1px solid var(--border-strong); border-radius: var(--radius-pill);` height 36px, padding `0 14px`, Lato 700 13px `var(--ink)`, leading 16px icon stroked `var(--ink-muted)`. Hover: `background: var(--brand-tint); border-color: var(--border-strong)`. These open native-feeling popovers (spec'd minimally: `--glass-fill` panel, `--radius-sm`, `--shadow-card`, entering `translateY(4px)→0` over `var(--m-standard) var(--m-ease)`); filter facets = Stage, Temp, Channel, Failed-delivery; sort keys = Score, Last activity, Budget, Name.
  - **Show statistics** toggle: label `Show statistics` in Lato 700 12.5px `var(--ink-muted)` + a switch (36×20px track, `--radius-pill`; OFF track `var(--border-strong)`, ON track `var(--brand-deep)` — never `--brand`, F2; thumb 16px `#fff`, travel over `var(--m-micro) var(--m-ease)`). Default **ON**. It is a real `<button role="switch" aria-checked>` controlling `#crmStats` (`aria-controls="crmStats"`). Collapse/expand: height+opacity over `var(--m-expanded) var(--m-ease)`; instant under `prefers-reduced-motion`.
- **Spacer:** `margin-left: auto` on the right group.
- **Right group** (gap 8px):
  - **Export** (secondary): same ghost recipe as Filter/Sort, with a down-tray icon. Demo behavior: serialize `leads[]` to CSV client-side — no backend.
  - **+ Add New** (primary): `background: var(--brand-deep); color: var(--ink-inverse);` (4.55:1 — do not use `--brand` or the raw gradient per F2; if the gradient CTA look is wanted, use the F2-safe variant `linear-gradient(135deg,#E86B1A,#C2552B)`), height 36px, padding `0 16px`, `border-radius: var(--radius-pill)`, Lato 700 13px, shadow `0 8px 20px rgba(194,85,43,0.22)` (under the 0.30 cap). Hover: fill `--brand-dim`→ no — **hover darkens, not brightens** on deep fills: use `filter: brightness(0.94)` or a `#B04A24`-free approach: keep fill, raise shadow to 0.30 cap and `translateY(-1px)` over `var(--m-micro)`. Press: `.m-press` scale. Demo behavior: opens an "Add lead" version of the drawer.

Toolbar wraps (`flex-wrap: wrap; row-gap: 8px`) below ~860px pane width; right group keeps order.

### 5.2 Stat cards (×4)

Row: `display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;` (→ 2×2 below 980px, 1-col below 560px). Reuses the shape of the existing `statTile()` pattern but is a **new named pattern `crm-stat`** (extends `statTile`, doesn't mutate it — Overview keeps its tiles).

Card material — **warm frost lite** (no blur, to respect the two-blur cap; translucency still reads glassy over `--bg`): `background: linear-gradient(135deg, rgba(255,255,255,0.86), rgba(255,251,246,0.66)); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); box-shadow: 0 10px 28px rgba(122,62,22,0.09), inset 0 1px 0 rgba(255,255,255,0.9);` padding `16px 20px`.

Internal stack (top→bottom, 4px gaps):
1. **Label:** Lato 700 12px `var(--ink-muted)`, `letter-spacing: +0.01em` (label row of §1.6.2). Sentence case, not the eyebrow recipe — these are functional labels.
2. **Number:** `var(--f-serif)` 600 34px, `line-height 1.05`, `color: var(--ink)`, `font-variant-numeric: lining-nums; font-feature-settings: "lnum" 1;` (mandatory — ₦ figures, §1.6.2 numerals rule).
3. **Caption row** (flex, gap 8px, align center): delta chip + caption.
   - **Delta chip:** `background: var(--success-tint); color: var(--success);` Lato 700 12px, padding `2px 8px`, `border-radius: var(--radius-pill)`, content `▲ 12%` (glyph + number, so it is not color-only). Negative deltas: `--danger` on `rgba(165,42,29,0.10)` with `▼`. Do not use for the "—" no-change case; show plain `var(--ink-dim)` text `— no change`.
   - **Caption:** `vs last month`, Lato 400 12px `var(--ink-muted)`.

The four cards and their demo values (consistent with `STATS.crm` — never fabricate beyond what the pane already claims, per brief):
| Card | Number | Delta |
|---|---|---|
| Total Leads | 128 | ▲ 12% |
| Pipeline Value | ₦2.4B | ▲ 8% |
| Conversion Rate | 7% | ▲ 1.2 pts |
| Avg First-Response | 8m | ▲ faster ("▲ 2m faster" — improvement is always green regardless of numeric direction; encode meaning, not sign) |

### 5.3 Attribution strip (`#brk` restyle)

Moves **inside** `#crmStats` (so the statistics toggle governs it too — it is a statistic). Same warm-frost-lite material and radius as the stat cards, full row width, padding `14px 20px`. Internal layout unchanged in spirit (header row → chips → barline) with these corrections:

- Header: left label `Where your leads come from` Lato 700 12px `var(--ink-muted)`; right `6 leads attributed` Lato 400 12px `var(--ink-dim)`.
- **Chips:** neutral chips — `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 4px 10px 4px 4px;` containing the channel dot/badge (`CH[c].color`, 18px circle, its `short` glyph in #fff only where that pairing is ≥3:1 — TikTok `#161616` and Facebook `#1877F2` pass; Instagram `#DD2A7B` and WhatsApp `#25D366` do **not**, so their badge renders the glyph as a knockout/omitted and the chip's **text label carries the name**) + `Instagram` Lato 700 12px `var(--ink)` + count `3` Lato 700 12px `var(--ink-muted)`. Channel color never carries text (§1.5 rule); the label always names the channel so color is redundant, not load-bearing (a11y).
- **Barline:** keep the stacked proportional bar, height 8px, `border-radius: var(--radius-pill)`, segments in `CH[c].color`, 2px `var(--bg)` gaps between segments. Each segment `title` + `aria-label` as today.

### 5.4 Table card + header

Container: one card, canonical warm frost (§1.9A): `background: var(--glass-fill); backdrop-filter: var(--glass-blur); border: var(--glass-rim); border-radius: var(--radius); box-shadow: var(--shadow-card);` padding `0` (rows run edge-to-edge; the card's radius clips them — `overflow: hidden` on the card, but the bulk bar and popovers live **outside** it so nothing is clipped).

Semantics (F8-grade, non-negotiable): a real `<table>` — `<caption class="visually-hidden">Leads pipeline</caption>`, `<thead>`, `<tbody>`, `<th scope="col">`. No div-grid.

**Columns** (12-col feel via fixed/flex widths; min table width 920px, horizontal scroll below that with the Lead column NOT sticky — simpler, and the pane rail already constrains width):

| # | Column | Width | Content |
|---|---|---|---|
| 0 | Select | 44px | header = select-all checkbox; rows = per-row checkbox |
| 1 | Lead | flex, min 200px | 28px avatar circle (`initials()`, `background: var(--brand-tint); color: var(--brand-text);` Lato 700 11px) + name Lato 700 13.5px `var(--ink)`; phone beneath, Lato 400 12px `var(--ink-muted)` |
| 2 | Source | 120px | channel chip per §5.3 recipe, compact (dot + label 12px) — uses `l.attr.channel` |
| 3 | Budget | 110px | `l.price` — **Lato 700 13px `var(--ink)`, `lining-nums`** (tables column-align in Lato, not Garamond — §1.6.2 numerals rule), right-aligned |
| 4 | Stage | 130px | stage pill (§5.5) |
| 5 | Last activity | 100px | `l.t`, Lato 400 12.5px `var(--ink-muted)` |
| 6 | Score | 110px | star rating (§5.6) |
| 7 | Status | 96px | temp pill Hot/Warm/Cold/Won (§5.5) + `⚠ Failed` sub-badge when `l.failed` (Lato 700 12px `var(--danger)`, glyph+word, not color-only) |
| 8 | Actions | 88px | `⋯` icon-button (opens the row's quick actions: Call / WhatsApp / the `nba.do` action) + the row itself opens `openLead(i)` |
| 9 | `+` add-column | 44px | header-only affordance: `+` icon-button, `aria-label="Add column"`, `var(--ink-dim)`, hover `var(--brand-text)`; demo: non-functional tooltip "Custom columns — coming soon" (never fake functionality silently) |

**Header row:** height 44px; `background: rgba(255,251,246,0.6)`; `border-bottom: 1px solid var(--border-strong)` (the one emphatic hairline in the table); text Lato 700 12px `var(--ink-muted)`, sentence case, `letter-spacing: +0.01em`. Sortable columns (Lead, Budget, Stage, Last activity, Score) get a caret: unsorted `↕` in `var(--ink-dim)` shown on hover/focus; sorted `↑`/`↓` in `var(--brand-text)` persistent + `aria-sort="ascending|descending"` on the `<th>`. Header cells are `<button>`s inside the `<th>` (full-cell hit area) with `:focus-visible` ring per F3.

**Next-action visibility (the process requirement):** the table alone must show each lead's next step. The Actions `⋯` is not enough — add a second line under the Lead cell? No: keep rows scannable. Instead, the **row's `title`/tooltip and the Stage pill's adjacent micro-text** carry it: under the Stage pill, one line Lato 400 11.5px `var(--ink-muted)` `→ ${l.nba.do}` (e.g. `→ Call Bola`). This is the compressed `nba` — full text stays in the drawer. It is tracked micro-text adjacent to a pill, exempt from the 12px floor the same way eyebrows are? **No — it is functional text: set it at 12px.** (Rule of §3 F7 wins; 11.5px was a drift temptation, flagged and rejected.)

### 5.5 Rows, states, and the pill scales

**Row:** height 56px (two-line Lead cell breathes); `border-bottom: 1px solid var(--border)`; **no zebra** — recommendation is plain + airy: zebra striping adds a second surface rhythm that fights the warm-frost material and adds noise without aiding 56px-row tracking; the hairlines + generous height do the work. Cell padding `0 16px` (first/last cells 0 20px).

Row states:
- **Hover:** `background: var(--brand-tint)` over `var(--m-micro) var(--m-ease)`; cursor pointer (whole row opens `openLead(i)` except interactive children, which `stopPropagation`).
- **Selected:** checkbox checked + `background: var(--brand-tint)` + **`box-shadow: inset 3px 0 0 var(--brand-deep)`** (the terracotta left-border highlight; inset shadow, not `border-left`, so columns don't shift). Row gets `aria-selected="true"`.
- **Focus (keyboard):** the row is reachable — make the Lead-cell name a `<button>`/link that opens the drawer, with the global `:focus-visible` ring (F3). Do not put `tabindex` on `<tr>`.
- **Failed-delivery rows:** no full-row tinting (would read as a fourth pill scale); the Status-cell `⚠ Failed` badge is the signal.

**Stage pills — the ordered funnel scale.** One scale, five steps, designed to read left→right as *progress*: tint density and hue-weight increase toward Won, so even unlabeled the row of pills in a column gestalts into a gradient of advancement. Tokens only:

| Stage | Fill | Text | Border |
|---|---|---|---|
| New | `var(--surface)` | `var(--ink-muted)` | `1px solid var(--border-strong)` |
| Contacted | `rgba(59,110,165,0.10)` (info-tint) | `var(--info)` | none |
| Viewing | `var(--warn-tint)` | `var(--warn)` | none |
| Negotiation | `var(--brand-tint)` | `var(--brand-text)` | none |
| Won | `var(--success-tint)` | `var(--success)` | none |

Rationale: New is deliberately *uncolored* (nothing has happened yet — absence of color = absence of progress); the middle steps warm through info→warn→terracotta (the brand color marks the money moment, negotiation); Won lands on success green, the only green in the scale, terminal and unmistakable. All five text/fill pairs are ≥4.5:1 per §1.5 values; none use `--brand` (F1). Pill recipe: Lato 700 12px, padding `4px 12px`, `border-radius: var(--radius-pill)`, no icon (the funnel strip §5.7 teaches the order; icons would add noise).

**Temp (Hot/Warm/Cold/Won) — secondary signal**, must not compete with Stage: rendered as a **dot + word**, not a filled pill: 8px dot + Lato 700 12px `var(--ink-muted)` label. Dot colors: Hot `var(--brand-deep)`, Warm `var(--warn)`, Cold `var(--ink-dim)`, Won `var(--success)`. Word always present (never color-only).

### 5.6 Score as stars

Map 0–100 → 0–5 stars, half-star resolution: `stars = Math.round(score/10)/2` (92 → 4.5, 78 → 4, 64 → 3). Render 5 star glyphs (inline SVG, 14px, 2px gap): filled `var(--brand-deep)`, half = SVG half-fill (left half `--brand-deep`, right half `var(--border-strong)` outline), empty = `var(--border-strong)` outline. Never `--brand` fills (2.3:1 against bg fails the 3:1 non-text minimum for a meaning-bearing graphic; `--brand-deep` passes at 4.0:1).

A11y: the star row is one element with `role="img"` and `aria-label="Lead score 4.5 out of 5 (92 of 100)"` — individual stars `aria-hidden`. The **numeric 0–100 score keeps living in the drawer** (`openLead` already shows the `.score` chip) — stars compress, drawer retains precision. Optional: numeric value as `title` tooltip on the star row.

### 5.7 Funnel strip (above the table)

The pipeline-shape-at-a-glance element. One horizontal band, height 64px, five segments in a `display:flex; gap: 8px` row, each segment `flex: 1`:

- Segment = mini-card: `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px;` containing: stage label (Lato 700 12px, colored per the Stage-pill *text* color of §5.5 — New's uses `var(--ink-muted)`) over the count (`var(--f-serif)` 600 22px `var(--ink)`, `lining-nums`).
- **Progress cue:** a 3px bottom inner bar (`position:absolute; bottom:0; left:0; height:3px; border-radius: 0 0 3px 3px`) whose width = that stage's share of total leads and whose color = the stage's pill *text* color. So the strip carries both the count and a proportional read.
- Between segments, a `›` separator glyph 12px `var(--ink-dim)` (flex, `align-self:center`) — the arrow literally spells the process direction. Omit after Won.
- Counts derive from `leads[]` at render (`leads.filter(l=>l.stage===s).length`) — never hardcode; demo array yields 2·1·1·1·1.
- **Interaction:** each segment is a `<button aria-pressed>` that filters the table to that stage (click again to clear). Active segment: `border-color: var(--brand-deep); background: var(--brand-tint)`. Focus ring per F3.
- The strip is the table's legend: it teaches the pill order before the eye reaches the rows. It stays visible even when statistics are toggled off (it is process, not statistics).

### 5.8 Floating bulk-action bar

Appears when ≥1 row is selected. `position: sticky; bottom: 20px;` centered (`margin-inline:auto; width: fit-content`), z-index above the table, **outside** the table card's overflow clip.

Material: full glass — `background: var(--glass-fill); backdrop-filter: var(--glass-blur); border: var(--glass-rim); border-radius: var(--radius-pill); box-shadow: var(--shadow-card);` height 52px, padding `0 8px 0 20px`, flex, gap 4px. (This is the moment glass earns its keep — a floating pane hovering over content. It replaces the toolbar's blur budget when visible? No — the toolbar is far offscreen by then in practice, but to be strict: the bar + table card = the two blur layers in-region; acceptable.)

Contents, left→right:
1. Count: `3 Selected` Lato 700 13px `var(--ink)` (`lining-nums` irrelevant — Lato) + a `·` divider `var(--ink-dim)`.
2. Actions as ghost pills (36px, `--radius-pill`, Lato 700 13px `var(--ink)`, hover `var(--brand-tint)`): **Assign**, **Message**, **Delete** (Delete text `var(--danger)`), **⋯** overflow.
3. Close `×` icon-button (32px, `aria-label="Clear selection"`), `var(--ink-muted)`.

Motion: enter `translateY(12px) + opacity 0 → 0/1` over `var(--m-expanded) var(--m-ease-spring)` (the one springy moment — it announces a mode change); exit `var(--m-standard) var(--m-ease)` reversed; reduced-motion = fade only. The bar is `role="toolbar" aria-label="Bulk actions"`; when it appears, do not steal focus — announce via an `aria-live="polite"` region ("3 leads selected").

Demo behavior: Assign/Message open a stub drawer state; Delete removes from the in-memory array with an undo toast (5s, same bar position/material).

### 5.9 Pagination footer

Last strip inside the table card, height 56px, `border-top: 1px solid var(--border)`, padding `0 20px`, flex, `justify-content: space-between`, all text Lato 400 13px `var(--ink-muted)`.

- **Left — page size:** `Showing per page` + a `<select>` styled as a ghost pill (`10 ▾`, options 10/25/50; height 32px, `border: 1px solid var(--border-strong)`, `--radius-xs`, Lato 700 13px `var(--ink)`; labeled `aria-label="Rows per page"`; no `outline:none` — F3).
- **Center — pages:** `<nav aria-label="Pagination">` of number buttons 32×32px, `--radius-xs`, gap 4px: current page `background: var(--brand-deep); color: var(--ink-inverse);` + `aria-current="page"`; others transparent, `var(--ink)`, hover `var(--brand-tint)`. Truncate with `…` (`aria-hidden`) beyond 7 pages: `1 2 3 … 13`. Prev/next chevron buttons at each end, disabled state `var(--ink-dim)` + `aria-disabled`.
- **Right — go to:** `Go to page` + 48px numeric `<input>` (32px tall, `--radius-xs`, `border: 1px solid var(--border-strong)`, `lining-nums`; Enter commits; labeled).

With the 6-lead demo array + STATS.crm's 128 claimed leads: paginate the *rendered* array honestly (1 page of 6 at size 10) — do **not** render fake page numbers implying 128 real rows (no fabricated stats rule). The 128 figure lives in the stat card as the demo-wide claim it already was.

### 5.10 A11y checklist (deltas beyond §3 globals)

- Real `<table>` semantics + `<caption>` (§5.4). All `<th scope="col">`, sort buttons with `aria-sort`.
- Checkboxes: real `<input type="checkbox">` with `aria-label="Select ${l.nm}"`; select-all uses `indeterminate` for partial selection.
- 12px functional-text floor everywhere in this pane — including the `→ next-action` micro-line (§5.4, explicitly rejected 11.5px) and chip counts.
- Every interactive element takes the global `:focus-visible` ring (F3); zero `outline: none` in new CSS.
- Pills/badges/deltas are never color-only: Stage pills carry words; temp = dot+word; delta chips = glyph+number; failed = glyph+word; stars carry `aria-label` with both scales.
- Funnel-strip filter buttons: `aria-pressed`, and the table wrapper gets `aria-live="polite"` row-count announcement on filter ("Showing 1 of 6 leads — Viewing").
- Statistics toggle: `role="switch" aria-checked aria-controls`.
- Bulk bar: `role="toolbar"`, no focus theft, live-region count (§5.8).
- Channel color chips: name always in text (§5.3); low-contrast badge glyphs dropped rather than shipped illegible.

### 5.11 What this section deliberately does NOT change

`.lead-banner` position (text color fix only), the `openLead()` drawer (gains nothing, loses nothing — numeric score stays there), the Ask-Tayo Snapshot stat tiles (`STATS.crm` markup may be retired from the drawer *only if* the PM confirms the pane-level stat cards supersede it — flag, don't decide), other panes, property.html.
