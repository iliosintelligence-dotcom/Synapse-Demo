# Synapse — Team Onboarding Brief (shared context for all agents)

_Last updated 2026-07-17. Read this first; it captures the whole project state so you can work without re-deriving it. Verify file:line details against current code before asserting them._

## What Synapse is
Synapse is an **AI-powered real-estate platform for Nigeria**, built around two audiences:
- **Buyers / renters (consumer):** talk to **Toju**, an AI property advisor, who understands their life and surfaces **verified** homes. Trust/verification is the core product promise ("no ghost listings").
- **Agencies / developers (business):** an **Agency Operating System** — CRM, AI social syndication, an AI ad studio, Toju-as-negotiator, listings with a 14-day freshness/re-list rule, verification desk, agents, subscription. Positioned as a **revenue platform**, not "a CRM."

Brand (CANONICAL — decided by Dr. David 2026-07-17, do not re-litigate): **warm off-white `#f7efe7`, terracotta accent `#FF7B2C` / `#C2552B`, glassmorphism**. This supersedes the earlier "white/calm-premium" and "dark charcoal/emerald" directions — anywhere a page still uses those, it should migrate to this. Display font **Restaglick** (licensed — demo/personal-use file only, needs commercial license), accent all-caps **Bromolek**, body **Inter**. Files in `Synapse/fonts/`.

## Repos & architecture (IMPORTANT)
Two sibling git repos under `…/Synapses/`:
1. **`Synapse/`** — the **static clickable prototype IS the product**. Plain HTML/CSS/JS served by `npx serve .` on **localhost:3000**. This is where nearly all UI now lives:
   - `index.html` — landing (audience toggle: For Customers / For Agencies).
   - `app/toju.html` — Toju chat. Opens as a centered chat, then **morphs into a 1:3 "Gemini-canvas"** (chat 25% left, matches canvas 75% right) once Toju returns matches. Canvas cards + Leaflet map are an exact preview of the Your-matches page.
   - `app/browse.html` — "Your matches" / browse (cards + map + filters + 4-way compare).
   - `app/property.html` — property detail as a **phone-style swipe-card deck** (image pinned, info cards swipe left/right). Deliberately a 460px card — do NOT make it full-width.
   - `app/dream.html` — **Dream Boards**: Pinterest-style multiple boards (create/rename/delete), pins, a saved-homes watchlist. Active board mirrors to `synapse_moodboard_v1` which Toju reads.
   - `app/agency.html` — the **entire agency portal** as one tabbed app-shell (nav rail pinned far-left). Panes: Overview, CRM·Leads, Toju Negotiator, Listings, Social studio, Marketing, Agents, Verification, Subscription. A persistent **"Ask Toju" panel** (bottom-right button → right drawer) holds the AI commentary/summaries + a per-pane "Snapshot" of stats, so panes stay focused on core work.
   - `app/app.css`, `app/motion.css`, `app/motion.js` — shared consumer styles + Lottie motion. `images/` holds local photos.
2. **`synapse-platform/`** — Supabase backend + a retired Next dashboard.
   - `supabase/functions/` edge functions: **`toju-demo`** (the live Toju used by the prototype), `toju-chat`, `create-lead`, `analyze-listing`, `admin-actions`, `social-generate`. `supabase/migrations/` (~37).
   - `apps/mobile` — an Expo app (not the current focus). **`apps/dashboard` (Next.js) was RETIRED** — the agency portal now lives entirely in `Synapse/app/agency.html`. Do not build new agency features in Next.

Supabase project id: **`bhrhejpekmhbhwryjhgk`** (Postgres 17, RLS, PostGIS, pgvector, Edge Functions/Deno). Client uses the `sb_publishable_…` key (safe). Service-role/Anthropic keys are server-side; **agents must never handle or print secret keys** — ask the user to set them.

## Toju (the AI advisor) — how it works
- **`toju-demo` edge function, deployed v13.** Two-pass Claude (`claude-opus-4-8`): pass 1 = conversation + criteria extraction; pass 2 = "advisor" rewrite over the REAL matched listings (properties + enrichment + neighbourhoods join, service role) returning a per-match "why". Actions: `chat` (default), `restore`, `matches`, `negotiate`, `compare`. Server memory keyed by a `visitorId` uuid in `demo_chat_sessions`.
- **Advisor doctrine** (`DOCTRINE` constant) is the user-authored system instruction and is **canonical** — preserve it in any prompt edits. Identity: "Nigeria's AI Property Advisor, not a chatbot." Principles: educate before persuade; infer the two meanings of every message; one most-valuable question at a time; recommend few with WHY + trade-offs + price context; verified/unverified transparency; no guarantees; never invent listings/prices.
- Hard rules in the loop: city-is-law, **deal-type wall** (rent/buy/shared never mixed), **14-day freshness** filter, progressive relaxation (size→budget→area-to-city→other city), a "worth-it stretch" of 15% over budget.
- Toju silently reads the visitor's Dream Board (`synapse_moodboard_v1`) as leading context on every chat call.

## Data / digital twin
The DB is seeded with a full ecosystem (hundreds of live properties across many Nigerian neighbourhoods, agencies, enrichment scores — family/young-professional/student/investment fit, flood/power/safety, yield). Seeds are idempotent set-based SQL. The runtime loop is live and verified by curl.

## Product phases (Agency OS plan) & status
- **Phase A — Social syndication:** DONE (content pipeline Kanban, auto-publish sim, guided posting) — demo data.
- **Phase B — Attribution:** DONE (lead chain post→tap→Toju→lead→revenue, channel breakdown) — demo data.
- **Phase C — Toju Negotiator:** DONE (omnichannel funnel, per-listing encrypted negotiation floor, 5-stage handoff summaries + transcripts) — demo; edge fn `negotiate` exists but not wired to a stored floor.
- **Phase D — Proximity runtime:** NOT built (needs mobile + PostGIS `ST_DWithin` + Expo bg location + FCM). Plan doc exists.
- **Phase E — Guidance/competitor benchmarking/best-time AI:** NOT built.
- CRM is "AI-native" (next-best-action, Hot/Warm/Cold, AI summary, relationship graph). Marketing is an Omneky-style AI ad studio. Agents/Overview/CRM are data-first (sparklines/rings/bars, agent profile drawer).

## Hard constraints (do not violate)
- **Auth is on hold** — the user explicitly deferred login/authorization. Do not add auth gating. The portal runs as a no-sign-in demo.
- **The port-3000 static app is the product.** One agency dashboard (agency.html). The Next dashboard is retired.
- **Demo data** is the norm right now (localStorage + demo arrays) except Toju, which is genuinely live against Supabase.
- Never handle/enter secret keys. Never fabricate stats presented as fact (the user has flagged this).
- The property page stays a swipe-card deck.

## What's likely next (backlog — for PM to prioritize/route)
- Wire the agency portal from demo data → real Supabase tables (needs the auth decision).
- Phase C: store the encrypted negotiation floor + wire `negotiate` to it.
- Phase D proximity runtime; Phase E guidance/benchmarking.
- Real social publishing (Meta/TikTok API approval) + WhatsApp Business API — external dependencies.
- Consumer polish: Toju canvas ↔ Your-matches parity, dream-board→Toju loop.
- Design-system consolidation across pages; carry brand fonts into app pages; a11y pass.
- Legal: agency agreements, data privacy (NDPR), AI disclosures, verification liability.
- Go-to-market: positioning for Lagos buyers + agencies; content calendar.

Memory index (Claude's persistent notes) lives outside the repo; this file is the canonical shared brief for subagents.
