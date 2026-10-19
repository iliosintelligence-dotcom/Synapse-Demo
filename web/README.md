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
| Sign in | `app/signin.html` | migrated: `/signin/`. Email and password, phone code, Google, agency sign-up, the one-more-thing agency form, password reset, confirmation resend, demo accounts, consent record, redirect safety. Emailed and Google return links still point at `/app/signin.html` until Supabase's redirect allow-list is updated (see `lib/auth-config.ts`) |
| Tayo chat | `app/toju.html` | migrated: `/tayo/`. Replies with matches, market history and checked-listings line, the matches canvas with map, quick answers, pin/share/rate, history, pinned, background, voice typing, replying about a home, the introduction (handover card, viewing times, ticket), asking about an agency, error and retry, memory note. Not ported: Zyn's fly-out emote (a face change and hop instead), and the "coming back from social" auto-open (dead code in the old page) |
| Dream Home | `app/dream.html` | migrated: `/dream/`. Boards, modes, categories, vibes, signals, palette, pin by link, share target, the starter that never reaches Tayo until kept |
| Agency portal | `app/agency.html` (20k lines) | **nearly all moved**: `/portal/#<pane>`. Here now: the shell (sign-in and role gate, sidebar by role, pane in the address, agency header); every sidebar pane (Overview, CRM, Tayo Negotiator, Listings, Social studio, Marketing, Agents, Tours, Brand, Verification, Subscription, Billing); the listing wizard (`features/portal/listing-form/`); the campaign generator (inside Social studio); the Ask Tayo advisor (`AdvisorPanel.tsx`); the notifications bell (`Bell.tsx`); the setup checklist (`Setup.tsx`, `intent.ts`); My profile (`ProfileDrawer.tsx`) invite acceptance (`InviteGate.tsx`, the link survives sign-in) the phone-number banner (`PhoneBanner.tsx`) and the referral card (`ReferralCard.tsx`, top of Subscription; the code saved on arrival is claimed in the shell). Social accounts connect here too (`ChannelsPanel.tsx`: Facebook/Instagram with the Page chooser, TikTok, Telegram code). The OAuth return still lands on the function's `PORTAL_URL`, so set that to `https://www.synapsecore.dev/portal/` at cutover. The single-post composer moved too (`ComposerPanel.tsx`, `CaptionEditor.tsx`: edit each caption, see what it is missing, ask for changes in words). Saved hashtag sets moved too (`TagRow.tsx`, under every caption). The share kit moved too (`ShareKit.tsx`: Share on a listing card, and Share it too on a published post). Delete agency moved (`DeleteAgency.tsx`: the section at the foot of Subscription; the dialog lives on the shell so an interrupted deletion can be finished after the agency is gone). The bio-link and Facebook Page-button tasks moved (`Tasks.tsx`: a card that arrives when it becomes true, and a "To do" group in the bell). Comment-reply settings (`ReplyCard.tsx`, under Channels, owner and admin only) and Delete agency (`DeleteAgency.tsx`) moved too. Still on the original portal: the automatic WhatsApp Status offer after a post goes out, The default sign-in destination stays `/app/agency.html` until the portal is ready to be the front door (`DEFAULT_AGENCY_DEST`) |

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

`lib/auth-actions.ts` is the only place that talks to Supabase Auth; `features/signin/` is the page. The client uses the same storage
key and PKCE flow as the static site, so someone signed in on either is signed in on both.

**Before the old `app/signin.html` can be deleted:** every link that leaves the site and comes back (confirmation email, reset email,
Google) must be on Supabase's redirect allow-list, which is set in the Supabase dashboard, not in code. Add
`https://synapsecore.dev/signin/` (and preview domains) under Authentication, URL Configuration, then change `AUTH_RETURN_PATH` in
`lib/auth-config.ts` to `/signin/`. Emails already sent still point at the old page, so keep it deployed for a few weeks after.

Tests: `npm test` runs `src/lib/auth-actions.test.ts` (redirect safety, phone numbers, roles), `src/features/signin/signin.test.ts` (password rules, error wording),
`src/features/chat/chat.test.ts` (unwrapping the model's reply, quick answers, context notes) and `src/features/dream/dream.test.ts` (what Tayo reads, the reducer).

## Moving a portal pane

1. Read the pane's markup (`#pane-<id>` in `app/agency.html`) and its script, and the data functions it calls in `app/agency-listings.js`.
2. Port the data calls into `features/portal/data/<area>.ts`, typed, with the rules as pure functions (see `verification.ts`) and a test.
3. Build `features/portal/panes/<Pane>.tsx`; register it in `MIGRATED` in `PortalShell.tsx`. The sidebar drops its ↗ marker by itself.
4. Check it against a real agency account, then delete the pane from `agency.html` only after the Next version has been live and checked.
