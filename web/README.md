# Synapse web (Next.js)

The Synapse front end, being rebuilt in Next.js (App Router, TypeScript) beside the current static site in `../app/*.html`.
The aim is a code base a new developer can open and find things in. Background and numbers: `synapse-platform/docs/TECHNICAL_REVIEW_2026-10-19.md`.

## Run it

```bash
cp .env.example .env.local     # the two values are public by design
npm install
npm run dev                    # http://localhost:3000
npm run build                  # static export into out/
npm run lint
```

The build is a **static export** (`output: 'export'`). There is no Node server: all server logic lives in Supabase (Postgres with
row-level security, auth, edge functions in `synapse-platform/supabase/functions`). That is what lets Capacitor wrap `out/` for iOS and Android.

## Layout

```
src/
  app/                 routes only: thin pages that read the URL and render a feature
    agency/page.tsx    /agency/?id=<uuid>
    property/page.tsx  /property/?id=<uuid>
  features/            one folder per product area; owns its queries, components and styles
    agency-profile/    queries.ts (Supabase reads) · AgencyProfile.tsx (UI) · AgencyProfile.module.css
    browse/            queries.ts · shape.ts (feed row or Tayo match to one card shape) · filter.ts (search, filters, sort: pure) · local.ts (device storage) · ListingCard · CompareSheet · BrowsePage
    property/          queries.ts · types.ts · labels.ts (coded values in words) · PropertyPage.tsx composes Gallery, Overview, CostsCard, ListedBy, WhatWeChecked, SimilarHomes
  components/          shared UI used by more than one feature (AgencyLogo; map/ = the Synapse map: recoloured Stadia style, pins, image overlay)
  lib/                 shared logic with no UI: supabase.ts, format.ts (naira, money, dates, CAC label), brand.ts (validation of agency input), auth.ts (session; shares the static site's sign-in), media.ts (photo order, covers), saved.ts (saved homes, live across tabs), money.ts (price in the listing's own currency), routes.ts (where each page lives: one line to change when a page moves), types.ts
```

Conventions
- A page in `app/` does no data work; it hands the id to a feature component.
- Supabase is read only in a feature's `queries.ts`, never inside a component.
- Anything typed by an agency (colour, logo, website) goes through `lib/brand.ts` before it is used.
- Colours, spacing and fonts come from the tokens in `app/globals.css`; light and dark are both defined there.
- Routes take an id as a query parameter (`?id=`) so the static export needs no list of ids at build time.
- Never put a service-role key under `web/`. The publishable key is public; Postgres policies do the authorising.

## Migration status

| Page | Old file | Status |
|---|---|---|
| Agency page | `app/agency-profile.html` | migrated: `/agency/?id=` |
| Property page | `app/property.html` | migrated: `/property/?id=`. Photos and viewer, overview, Tayo's take, deal and cost slip, opening offer, property intelligence with the flood score, the map with nearby places and the flood map, commute times (stored survey with measured drive times, else OpenStreetMap and OSRM estimates, plus the buyer's own places), viewing booking, listed by, what we checked, similar homes, save, share, contact, channel attribution, exact address for introduced buyers |
| Browse | `app/browse.html` | migrated except "search this area": `/browse/`. Done: the live feed, Tayo's matches, search, deal filters, sort, verified-only, saved homes, compare with Tayo's verdict, recently viewed, new since your last visit, the map view with price pins, empty and error states. Still on the old page: "search this area" on the map |
| Tayo chat, Sign in, Dream Home | `app/*.html` | not started |
| Agency portal | `app/agency.html` (20k lines) | not started; to be split by feature |

Links between pages go through `src/lib/routes.ts`. Property, Browse and Agency now point at the Next pages; Tayo chat and sign-in still point at `/app/*.html` until they move. The static `app/property.html`, `app/browse.html` and `app/agency-profile.html` are kept until the Next versions have been live and checked.
A page is removed from `../app` only after its replacement passes the same Playwright check.

## Mobile (Capacitor)

`capacitor.config.ts` points at `out/` (`appId: dev.synapsecore.app`). Core and CLI are installed; the iOS and Android platforms
are not added yet (they need Xcode and Android Studio). When ready:

```bash
npm run build
npm i @capacitor/ios @capacitor/android
npx cap add ios && npx cap add android
npx cap sync
npx cap open ios        # or android
```

Before submitting to the stores: an Apple Developer and a Google Play account in ILIOS Digital's name, privacy labels, an in-app
account deletion flow (Apple requires it), the in-app browser plugin for the Meta and TikTok sign-in redirects, and a decision on
Paystack (hosted page or native SDK).

## The map

`components/map/SynapseMap.tsx` wraps MapLibre. The style is Stadia's vector style recoloured to the Synapse "white matter" look
(`style.ts`). Stadia authorises browsers **by domain**: register every domain the app is served from (production, previews,
`localhost` ports you test on) in the Stadia dashboard, or tiles return 401. MapLibre's web worker is copied into `public/maplibre/`
by `scripts/copy-maplibre-worker.mjs` before `dev` and `build`.

## Signing in

Sign-in itself is still the static page (`/app/signin.html`). The Supabase client uses the same storage key and PKCE flow as the
static site, so a buyer signed in there is signed in here (viewing booking depends on it). That page moves with the sign-in migration.
