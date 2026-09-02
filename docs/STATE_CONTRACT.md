# Synapse consumer app — shared state contract

_Scope: the static prototype in `Synapse/` (localhost:3000). Last updated 2026-07-17._

## 1. Tayo match payload → card item (browse.html ⇄ toju.html canvas)

The Tayo canvas in `app/toju.html` is an **exact live preview** of the Your-matches
page (`app/browse.html`). Both render from the same code in **`app/matches-shared.js`**
(`window.SynMatches`):

- `shapeTojuMatch(m, i)` — the ONLY place a Tayo API match becomes a card item.
- `listingCardHtml(l, i, {saves, picked, compare})` — the ONLY `.listing` card markup.
  `compare: true` adds the compare checkbox (a browse-page tool; the canvas omits it —
  on the canvas you refine by telling Tayo).
- `drawMatchMap(state, elId, items)` — the Leaflet price-pin map (same tiles, pins,
  popups, fit behavior on both pages).
- `naira`, `esc`, `verifyChip`, `coords`, `IMG_POOL` — shared helpers.

Card **markup** lives in `matches-shared.js`; card **CSS** (`.listing`, `.price-pin`,
`.chip-*`, `.grid`) is duplicated in the `<style>` of both pages — keep those blocks
in sync if you touch one.

### Tayo API match (`toju-demo` edge fn, actions `chat` / `matches`)
```jsonc
{
  "id": "uuid",              // DB property id (may be absent in old sessions)
  "title": "3-Bed Terrace, Ikate",
  "city": "Lagos",
  "price": 148000000,        // numeric naira
  "listingType": "sale" | "rent",
  "bedrooms": 3,
  "trustScore": 91,          // 0–100
  "fitScore": 94,            // 0–100 (optional)
  "why": "…",                // advisor's reason (optional)
  "whatToWatch": "…",        // optional; "No major synthetic flags" means none
  "summary": "…",            // optional fallback text
  "yieldPct": 7.1,           // optional
  "neighbourhood": { "name": "Ikate", "flood": 22, "power": 68 },  // optional
  "room": {                  // ONLY for shared living
    "totalRooms": 4, "housematesIn": 2, "genderPreference": "any",
    "ensuite": true, "billsIncluded": true, "vibe": "quiet"
  }
}
```

### Shaped card item (output of `shapeTojuMatch`, also the shape browse builds for
its browse-all / demo rows)
```jsonc
{
  "id": "uuid | r<i>",       // fallback 'r'+index when the API sent no id
  "img": null,               // null → renderer uses IMG_POOL[i % 5]
  "kind": "sale" | "rent" | "shared",
  "per": false,              // true → price renders with /yr
  "vstatus": "verified" | "unverified" | "in_progress",  // Tayo matches: always verified
  "deal": "For sale" | "For rent" | "Shared room",       // chip when match is null
  "priceN": 148000000,
  "ttl": "…", "loc": "…",
  "score": 91,               // trust
  "match": 94,               // fit %; defaults to 80 when API omits fitScore
  "flood": 22, "power": 68, "yield": 7.1,   // nullable; used by 4-way compare
  "why": "<b>Why:</b> …"     // pre-escaped HTML; falls back to Watch:/summary
}
```

## 2. localStorage keys (the whole consumer contract)

| Key | Written by | Read by | Shape |
|---|---|---|---|
| `toju_visitor_v1` | toju.html | toju.html, browse.html | uuid string → server memory (`demo_chat_sessions`); rotated on "New chat" |
| `toju_chat_v1` | toju.html | toju.html | `[{role, content, matches?[]}]` — assistant turns carry the raw Tayo matches; the canvas rebuilds from these |
| `synapse_saved` | browse.html, toju.html canvas | both + dream.html (watchlist count) | `["propertyId", …]` — the ♥ set, shared so a save on either page shows on the other |
| `synapse_dream_boards_v1` | dream.html | dream.html | `{ boards: [{id, name, vibe[], images:[{u, c}]}], activeId }` |
| `synapse_moodboard_v1` | dream.html (mirror of the active board) | toju.html | `{ name, vibe[], images:[{u, c}] }` |

## 3. Dream Board → Tayo loop

- `dream.html` mirrors the **active board** into `synapse_moodboard_v1` on every
  mutation: open, rename (each keystroke), vibe add/remove, pin/unpin (palette,
  URL, tile remove). Deleting the active board **clears** the mirror; boot
  re-mirrors the last-active board.
- `toju.html` reads `synapse_moodboard_v1` on **every** chat send and prepends a
  hidden user message starting with `[Background from my Dream Home mood board`
  (board name + vibes + de-duped pin captions). This message is never rendered —
  anything with that prefix is filtered from local render and server restores.

## 4. Invariants

- Tayo only recommends verified homes → shaped Tayo matches are `vstatus: "verified"`.
- `property.html` stays a 460px swipe-card deck (do not full-width it).
- No build step: `matches-shared.js` is a plain script; load it **before** the
  page's inline script (after Leaflet).
