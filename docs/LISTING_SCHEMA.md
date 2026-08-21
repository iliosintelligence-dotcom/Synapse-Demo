# Listing form → `properties` schema mapping

The agency Listings form (`app/agency.html` → `listingForm()`) captures the full property
dataset Toju needs to match. Today the portal is a **demo on localStorage** (`synapse_agency_listings_v3`);
actual DB persistence is a **backend task gated on the auth decision** (see [AGENT_BRIEF](AGENT_BRIEF.md)).
The form is shaped so the future insert is a clean mapping — see `toPropertyRow(item)` in agency.html.

Schema source of truth: `synapse-platform/supabase/migrations/0002_schema.sql` (`properties`, `property_media`).

## Field → column

| Form field | id | Required | Type / enum | → `properties` column |
|---|---|---|---|---|
| Title | `lfTitle` | ✅ (≥6 chars) | text | `title` |
| Property type | `lfType` | ✅ | apartment·house·duplex·terrace·penthouse·bungalow·land·commercial | `property_type` |
| Listing type | `lfListing` | ✅ | sale·rent·shortlet | `listing_type` |
| Description | `lfDesc` | ✅ (≥30 chars) | text | `description` |
| Address | `lfAddr` | ✅ | text | `address` |
| City | `lfCity` | ✅ | text (city-is-law for Toju) | `city` |
| State | `lfState` | ✅ | text (default Lagos) | `state` |
| Country | `lfCountry` | ✅ | text (default Nigeria) | `country` |
| Neighbourhood | `lfHood` | ⭘ recommended | text | (enrichment join key; not a direct column) |
| Latitude | `lfLat` | ⭘ (both-or-neither with lng) | double | `latitude` → builds `location` geography |
| Longitude | `lfLng` | ⭘ | double | `longitude` |
| Bedrooms | `lfBeds` | ✅ (optional for land/commercial) | int 0–20 | `bedrooms` |
| Bathrooms | `lfBaths` | ⭘ | int 0–20 | `bathrooms` |
| Area (sqm) | `lfArea` | ⭘ | numeric | `area_sqm` |
| Amenities | `lfAmen` | ⭘ | comma-list → text[] | `amenities` |
| Price (₦) | `lfPrice` | ✅ | **absolute naira** numeric | `price` |
| Price period | `lfPeriod` | ✅ | total·per_year·per_month·per_night | `price_period` |
| Move-in cost | `lfMoveIn` | ⭘ | numeric | `move_in_cost` |
| Service charge | `lfService` | ⭘ | numeric | `service_charge` |
| Title document | `lfTitleType` | ⭘ recommended | c_of_o·governors_consent·registered_deed·excision·gazette·allocation | `title_type` |
| Gross yield % | `lfYield` | ⭘ | numeric 0–100 | `yield_pct` |
| Listing active | `lfActive` | ✅ (default on) | boolean | `is_active` |
| Primary image URL | `lfImg` | ✅ (http…) | url | → `property_media` (display_order 0, is_primary) |

`agency_id` is **not** a form field — it comes from the auth context (JWT) server-side.

## Two product decisions (confirmed by Dr. David, 2026-07-18)

1. **Verification is system-owned, not agency-entered.** The form no longer lets an agency self-set
   "Verified." New listings enter as `verification_status = 'unverified'` ("in the 7-check queue"); the
   field is **read-only** on edit. Agencies keep an **Active / Inactive** toggle (`is_active`) to take a
   listing down. Backend RLS must make `verification_status` / `trust_score` / `verification_nodes`
   writable only by the verification service, never the agency.
2. **Price is absolute naira.** `properties.price` stores the true figure (so rent `/yr` and shortlet
   `/night` are exact). The legacy display key `pr` (millions) is **derived** (`Math.round(price/1e6)`)
   only for the Overview/Marketing panes that still read it.

## Demo-store shape & derivation

`LISTINGS_DATA` items now carry the full schema fields **plus** legacy display keys kept in sync by
`deriveLegacy(item)`: `t = title`, `pr = round(price/1e6)`, `img = media[0].url`,
`st = !is_active ? 'inactive' : verification_status==='verified' ? 'verified' : 'pending'`.
Legacy `{t,pr,st,leads,days,img}` items (incl. the seed defaults and any `v2` blob) are upgraded once by
`migrateListing()` (idempotent). Storage key bumped `v2 → v3`.

## Backend hand-off (blocked on auth)

`toPropertyRow(item)` returns `{ row, media[] }` ready for `insert into properties` + `insert into
property_media`. When auth un-holds, the backend agent wires the real insert/update + RLS against this
exact contract. Nothing else in the form needs to change.
