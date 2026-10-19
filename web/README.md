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
  components/          shared UI used by more than one feature (AgencyLogo)
  lib/                 shared logic with no UI: supabase.ts, format.ts (naira, money, dates, CAC label), brand.ts (validation of agency input), media.ts (photo order, covers), saved.ts (saved homes, live across tabs), money.ts (price in the listing's own currency), routes.ts (where each page lives: one line to change when a page moves), types.ts
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
| Property page | `app/property.html` | migrated in part: `/property/?id=`. Done: photos and viewer, overview, Tayo's take, deal and cost slip, listed by (agency and agent), what we checked, similar homes, save, share, contact, channel attribution, exact address for introduced buyers. Still on the old page: map and nearby, flood and property-intelligence rows, commute, viewing booking, the opening-offer block |
| Browse | `app/browse.html` | migrated in part: `/browse/`. Done: the live feed (verified, other, shared slices), Tayo's matches for the visitor, search (including "under 150m"), deal filters, sort, verified-only, saved homes, compare with Tayo's verdict, recently viewed, new since your last visit, empty and error states. Still on the old page: the map view and "search this area" |
| Tayo chat, Sign in, Dream Home | `app/*.html` | not started |
| Agency portal | `app/agency.html` (20k lines) | not started; to be split by feature |

The links in migrated pages that point at old pages (`/app/toju.html`, `/app/property.html`) stay as they are until those pages move.
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
