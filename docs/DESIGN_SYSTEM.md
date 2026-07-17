# Synapse Design System — Canonical Tokens, Divergence Audit, A11y Fixes

_Author: ui-designer · 2026-07-17 · Direction decided by Dr. David 2026-07-17 (see AGENT_BRIEF.md): warm off-white + terracotta + glassmorphism. Supersedes both the "white/calm-premium" and "dark charcoal/emerald" directions._

**Status:** Direction spec, ready for frontend-developer. Do not implement by copy-pasting page-local styles — implement by extending `app/app.css` `:root` with the tokens below, then replacing hardcoded values per the inventory in §2.

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
- **F6. Agency nav rail + panes:** should be `role="tablist"`/`tab`/`tabpanel` with `aria-selected` and Left/Right roving tabindex; the Ask-Toju drawer needs `aria-expanded` on its trigger, focus moved into the drawer on open, `Esc` to close, focus returned to trigger.
- **F7. Sub-12px functional text.** 11–11.5px buttons/chips (`font: 600 11.5px`, `700 11px` etc., widespread in agency/browse) — raise functional text to 12px minimum (`--fs-label`); tracked-caps eyebrows exempt.
- **F8. Landmarks & skip link.** Verify every page has exactly one `<h1>`, `<main>` around content, `<nav>` on the appbar, and add a skip-to-content link (glass appbar + long agency rail make keyboard traversal expensive).
- **F9. Toju chat log:** message container needs `role="log"` + `aria-live="polite"` so Toju's replies are announced; the typing indicator should be `aria-hidden`. (Hand to the agent currently in toju.html.)
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
