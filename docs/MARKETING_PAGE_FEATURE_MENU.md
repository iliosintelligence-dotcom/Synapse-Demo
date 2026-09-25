# What to add to the Marketing page

**Written 2026-09-25.** Eden: *"it doesn't really have features. It just shows
things."* Correct. After today it shows **true** things — real clicks, real
enquiries, real posts — but a page you can only read is a report, not a tool.

This is the menu. Nothing here is built. Pick from it.

---

## What I actually looked at

Being straight about the sources, because two of the four were thin:

| Source | What it gave |
|---|---|
| **GitHub** — [Postiz](https://github.com/gitroomhq/postiz-app), [Mixpost](https://github.com/inovector/mixpost) | The real substance. Two mature open-source Buffer alternatives with published feature lists. |
| **GitHub Marketplace** | **A dead end.** It is developer tooling — CI, code review, security. A search for "social media" returns two irrelevant apps. |
| **Dribbble / Behance** | Image galleries. Useful for *patterns* (what surfaces a dashboard has, how a calendar shows performance) not for feature detail. |

The pattern worth stealing from the design sources: a **calendar that doubles
as a performance view** — the grid shows what is scheduled, a toggle overlays
what each slot earned.

---

## The organising idea

Most of these tools are built for agencies posting *content*. Synapse posts
**listings**, and it already knows things no general tool does: the price, the
area, the photographs, the electricity band, the fees, whether it is verified,
and — since this afternoon — **how many enquiries each post produced**.

So the best features here are not "catch up with Buffer". They are the ones
only this product can build. Those are marked **★**.

---

## The menu

Effort is rough: **S** = a day or less · **M** = a few days · **L** = a week+

### A. Making the next post better

| # | Feature | What it is | Data we already have | Effort |
|---|---|---|---|---|
| **A1** ★ | **Best time to post, from our own clicks** | A heatmap of day × hour built from `click_events` timestamps on *this agency's* posts. Not a generic "post at 6pm" benchmark — the actual behaviour of Nigerian property buyers on these channels. | `click_events.occurred_at`, per token, per channel | **M** |
| **A2** ★ | **Which angle sells** | `social-generate` already rotates six angles (space / location / value / trust / fit / moment) and stores the chosen one in `social_posts.payload`. We measure leads per post. So "trust posts get 3× the enquiries of value posts" is **computable today** and nobody else can compute it. | `payload.angle` + `social_post_stats()` | **S** |
| **A3** | **Templates** | Save a caption shape and reuse it. Mixpost's "customizable post templates" with dynamic variables. | — | **M** |
| **A4** | **Hashtag groups** | Named sets per area or property type — `#LekkiPhase1 #LagosRealEstate` — inserted with one tap instead of retyped. | — | **S** |
| **A5** | **Caption linting** | Warn before posting: no price, no area named, caption longer than the platform shows, more than 30 hashtags, all-caps. | Listing fields | **S** |
| **A6** ★ | **Branded image frames** | Stamp the agency's logo, the price and "Verified" onto the first photo automatically. Agencies do this by hand in Canva today. We have the logo, the price and the verification status. | `agencies`, `properties`, `property_media` | **L** |

### B. Making the page do work, not just show it

| # | Feature | What it is | Data we already have | Effort |
|---|---|---|---|---|
| **B1** ★ | **Unified inbox** | Comments from every connected account in one list, with reply. **Half-built already** — `social_comments` ingests them hourly and the pipeline card shows them. This is the surface that makes them workable: filter, mark done, reply. | `social_comments` | **M** |
| **B2** ★ | **Stale listing nudge** | "Ikoyi penthouse hasn't been posted in 18 days and has had no enquiries." The page tells you what to do next instead of waiting to be read. | `social_posts.published_at`, `properties` | **S** |
| **B3** | **Recurring / evergreen re-post** | A listing that has not sold goes out again on a cadence, with a different angle each time (A2 makes this smart rather than repetitive). Postiz calls these "repeated posts". | Angle rotation exists | **M** |
| **B4** | **Queue and time slots** | Define "Mon/Wed/Fri 6pm" once; new posts fill the next free slot instead of each one being scheduled by hand. Mixpost's queue model. | — | **M** |
| **B5** | **Bulk scheduling** | Select five listings → schedule all → one post each, spread across the queue. | — | **M** |
| **B6** | **Media library** | Browse and reuse every photo the agency has uploaded, across listings. | `property_media` — already there | **S** |

### C. Seeing what happened

| # | Feature | What it is | Data we already have | Effort |
|---|---|---|---|---|
| **C1** | **Calendar with a performance overlay** | The calendar exists. Add a toggle that colours each past slot by enquiries earned — the Dribbble pattern, and it turns a schedule into a record. | `social_post_stats()` | **S** |
| **C2** ★ | **Channel comparison** | Instagram vs Facebook vs Telegram vs Synapse's own channels: taps, listing opens, enquiries, **cost per enquiry = zero everywhere**, so this is a pure "where does effort pay" answer. | `click_events.channel` | **S** |
| **C3** ★ | **Listing → enquiry attribution trail** | Click a post, see the actual people it produced: which lead, which agent, what stage. The join already exists in `lead_attribution.post_id`. | `lead_attribution` | **M** |
| **C4** | **Export** | CSV of posts and performance, for an agency that reports to a principal. | — | **S** |
| **C5** ★ | **Funnel: arrivals → registrations** | `growth_events` shipped this afternoon. An agency-scoped version answers "how many people did our posts bring into Synapse". | `growth_funnel()` | **S** |

### D. Team and process

| # | Feature | What it is | Effort |
|---|---|---|---|
| **D1** | **Approval workflow** | Exists partly — the approval column is there. Make it a real gate with an assigned approver and a notification. | **M** |
| **D2** | **Comments on a draft** | Postiz has team comments on posts. An agency with five agents needs "change the price line" without a WhatsApp thread. | **M** |
| **D3** | **Per-agent leaderboard** | Which agent's posts earn enquiries. We now have `created_by` on every post and real per-post numbers. | **S** |

### E. Deliberately not recommended

Worth saying what I would leave out and why, since a comprehensive list
without exclusions is just a wish list.

| Feature | Why not |
|---|---|
| **AI image / video generation** | Postiz has it. For property it is actively dangerous — a generated image of a home that does not exist is a misrepresentation, and the compliance review already flags listing accuracy. |
| **Social listening / mentions** | Needs paid API tiers on every platform. Nigeria-specific property chatter is mostly in WhatsApp groups we cannot see anyway. |
| **Impressions / reach / CTR** | We cannot measure them. That is what got the old page into trouble. |
| **30+ platform support** | Postiz's headline number. Nigerian agencies use Instagram, Facebook, WhatsApp and increasingly Telegram. The rest is surface area with no users. |
| **Paid ads management** | A different product, a different compliance posture, and there is no budget system here. |

---

## If you want a shortlist

Ranked by value earned per day of work, all of them using data that already
exists:

1. **A2 — Which angle sells.** Nearly free, and it is the single most
   interesting thing this platform could tell an agency. No competitor has the
   data to answer it.
2. **B2 — Stale listing nudge.** Turns the page from a report into something
   that asks for action.
3. **C2 — Channel comparison.** One query. Settles "is Telegram worth it"
   with evidence rather than argument.
4. **B1 — Unified inbox.** The ingest is already running; this is the surface.
5. **A1 — Best time to post.** The most *impressive* one, and genuinely ours —
   but it needs a few weeks of clicks before it can say anything true, so it
   is worth building after there is data to fill it.

**One honest caveat on all of it:** no agency has connected an account yet, and
every feature above gets better the more real posting has happened. A1
especially is worthless until there is traffic. The order above reflects that —
the first three work with 50 posts, the last one wants 500.

Sources: [Postiz](https://github.com/gitroomhq/postiz-app) ·
[Mixpost](https://github.com/inovector/mixpost) ·
[Dribbble social dashboards](https://dribbble.com/tags/social_media_dashboard) ·
[Behance real estate dashboards](https://www.behance.net/search/projects/real%20estate%20dashboard)
