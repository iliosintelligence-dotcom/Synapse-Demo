# Backlog

Things decided and deferred, with enough of the reasoning to pick them up cold.
An item here has been agreed as worth doing — it is not an idea list.

---

## Open work — checked against the live database, 2026-09-25

The sections further down carry the reasoning. This is the list. Numbers are
from a query run tonight, not from memory.

### 1. Blocked on Eden, not on code

| | Unblocks |
|---|---|
| **Meta App Review → Live mode.** THE gate for real agencies. While the app is in Development Mode, Meta itself refuses the Connect dialog to anybody without a role on the app — no agency should ever have to be given one. `platform-review-pack.md` was written 3 Sep and covers **2 of the 11** permissions the code now requests. | Any agency connecting at all |
| **Facebook Connect rehearsal**, signed in as a test agency account. Until review passes, that account must be added under App roles → **Testers** by the app owner — a rehearsal-only step, not part of the agency's flow, which is otherwise identical. | Everything in section 2 |
| `TELEGRAM_BOT_TOKEN` via @BotFather | Telegram posting, and the founder signup alerts |
| Founder Telegram chat id → `platform_settings.founder_telegram_chat_id` | Signup / arrival alerts |
| `pages_messaging` on configuration 2272646810190199, then **Advanced Access** | Comment-to-DM replies, and any agency other than ourselves |
| Instagram product + `META_IG_APP_ID` / `META_IG_APP_SECRET` | Instagram for agencies with no Facebook Page. Lowest priority. |

### 2. Built, never run against a real account

`social_accounts` has **never held a row**. All of this is written, deployed and
type-checked, and none of it has touched Meta: publishing to an agency's own
Page and Instagram, the metrics sweep, comment ingest, comment replies, the
multi-account picker, reading the Page's action button, Stories, and branded
photographs going out. **Expect the first real connection to find something.**

### 3. Approved, not built

From `MARKETING_PAGE_FEATURE_MENU.md` — everything except A3 was approved, under
the rule that the Marketing page must stay assimilable.

- **A1** best time to post — held until there is real traffic (~100 clicks today, mostly crawlers)
- **B1** unified inbox · **B3** recurring re-post · **B4** queue and time slots · **B5** bulk scheduling · **B6** media library
- **C1** calendar performance overlay · **C3** listing → enquiry trail · **C4** export · **C5** arrivals → registrations for agencies
- **D1** approval workflow · **D2** comments on drafts · **D3** per-agent leaderboard
- Agency-wide view of stale branded photos (`media_brand_stale()` exists; no screen)

### 4. Broken or unfinished from before

| | Live state |
|---|---|
| WhatsApp agent handoffs | **2 queued, 0 ever sent** — Twilio delivery has never worked |
| Listing verification | **0 of 3 active listings verified** — so the Verified badge, on cards and on branded photos, shows nowhere |
| Comment notifications | Comments now land on the pipeline card with their text; nothing raises a bell notification |
| Electricity bands on the map | See below |

### 5. Compliance

- Privacy and terms rewrite — blocked on 19 `[DECISION]` markers and 9 lawyer-only clauses (`POLICY_COPY_DRAFT.md`)
- R-06 retention — the tables added this week purge themselves; **every older table still grows for ever**
- Deleting the `auth.users` row is still a manual step, so full erasure is not self-serve
- AGPL review — deferred by decision ("leave the lawyer for now")

### 6. Commercial

- Paywall **off**; `subscription_payments` has **never held a row**; Leader has no self-serve purchase
- Passkeys and login IDs — considered, not started (below)

---

## Electricity bands on the map

**Agreed 2026-09-18. Deferred by the user: "we can maybe work on that later."**

**Shipped already:** a listing states its own band. `properties.electricity_band`
(`electricity_band_kind` enum, `A`–`E`), a select in the listing pane, and a key
fact on the property card that prints the hours as well as the letter —
`Band A · 20+ hrs/day`.

**Still to do:** the band belongs to the **feeder**, not the building, so it is
properly a property of the *area*. The map should be able to show which band a
neighbourhood is on, and a listing should be able to inherit it.

### Why it matters

Under NERC's Service-Based Tariff every feeder carries a committed minimum
supply: A ≥ 20 h/day, B ≥ 16, C ≥ 12, D ≥ 8, E ≥ 4. For a Nigerian buyer this
is not trivia — the gap between Band A and Band D is the gap between a
generator being a backup and a generator being the supply, and it moves the
real monthly cost of a home by more than several of the charges the listing
already itemises. Nothing else on the card carries that weight and is this
poorly served by a free-text description.

### What it needs

1. **A band per area.** `neighbourhoods` already exists and listings already
   link to it via `neighbourhood_id`. A nullable band column there is the
   cheap version.
2. **A source.** This is the hard part and the reason it is deferred. Band
   assignments are published per feeder by each disco (IBEDC for Ibadan, EKEDC
   and IKEDC for Lagos), they change on review, and there is no clean national
   dataset. A feeder also does not follow neighbourhood boundaries, so any
   area-level answer is an approximation and has to be labelled as one.
3. **Inheritance, carefully.** A listing with no stated band could *show* the
   area's band, but it must never be **stored** as the listing's own — that
   would turn an approximation into an agency's stated commitment. Same
   distinction the cost breakdown already makes between "not stated" and a
   real zero.
4. **Map rendering.** Band as a choropleth is the obvious treatment and needs
   care: five bands is close to the limit of what a monochrome map can carry
   without turning into a data visualisation, and this map's job is still to
   show where the homes are.

### Risk to weigh first

Publishing an area band we cannot keep current is worse than publishing
nothing: a buyer who chooses a flat because the map said Band A, and finds it
is on Band C, has been misled by us rather than by the agency. Sourcing and
refresh cadence should be settled before any of it renders.

---

## Comment and DM notifications from social

**PARTLY DONE 2026-09-25.** Comment *text* is now fetched by `post-metrics`
into `social_comments` and shown on the pipeline card with a Done button
(90-day retention). What is still missing is a **bell notification** when one
arrives. The history below predates that and is kept for the reasoning.

**Raised twice by the user. Partly blocked on an external dependency.**

**Working today:** likes, comments and shares *counts* land on the pipeline
card via the `post-metrics` sweep, and the notification bell derives items from
real state — listings awaiting verification, expiring, expired, new CRM leads,
and posts awaiting approval.

**Not working:** no notification is raised when somebody comments on a post,
and the comment *text* is never fetched or stored anywhere. A comment left on
Facebook increments a number and does nothing else.

**Why:** trypost, which does the posting, exposes no comment or DM webhooks.
Reading comment bodies means going to the Meta Graph API directly, which needs
the agency's Instagram/Facebook account connected through the existing
Login-for-Business flow — still an outstanding user action — plus the
`instagram_manage_comments` / `pages_read_engagement` permissions.

**Achievable before that lands:** a notification derived from the counts we
already poll — "3 new comments since yesterday on your post about X". It needs
somewhere to keep the previously-seen count so a *change* can be detected;
`post-metrics` currently overwrites. That is a small migration and a compare,
and it would close most of the felt gap without any Meta dependency.

---

## Decided: what an erasure keeps

**Eden, 2026-09-19. Implemented and live.**

> "Keep personal data but not sensitive personal data. You can keep email, you
> can keep login. But the agency would have to provide their agency details and
> their legal documents for verification. Everything else should be anonymous."

`erase_personal_data()` anonymises by default rather than deleting.

**Kept:** `auth.users` (email and login — note `profiles` has no email column
at all, so this was never being deleted), `profiles.id` and `role`, agencies
and their verification documents, and the bare fact of a lead — which home,
which agency, when, what stage.

**Purged:** `consumer_profiles` (income, occupation, age, marital status,
children, future children, elderly dependents, school budget),
`affordability_analyses`, `consumer_places` (including `kind='worship'`, which
is religious belief and sensitive in its own right), `financial_identities`,
`chat_sessions`, `proximity_events`.

**Blanked:** name, phone, WhatsApp and avatar on `profiles`; name, phone,
preferences and budget on `leads`.

### The tension worth revisiting

Keeping the email means the person remains identifiable to us. Under NDPA s.34
somebody asking to be erased is, in the ordinary case, asking for that too, and
"we kept your login" is not an answer unless another lawful basis covers the
account itself. The policy is a sound default; it is not a complete answer to
every request.

So the function has two modes and the statutory route stays open — `anonymise`
(default) and `full`. `your-data.html` offers the first and says plainly that
anyone who wants the account gone can have it. **What is not yet built is the
route that does it without a human in the loop:** `full` mode deletes the
profile but cannot touch `auth.users`, which needs the Auth admin API from an
edge function. Until that exists, a full erasure is a manual job.

---

## Considering: passkeys and login IDs instead of passwords

**Raised by Eden 2026-09-19. Not started.**

> "I'm also considering using passkeys and login IDs instead of passwords."

Worth taking seriously, and it points the same way as the decision above.

**Why it fits.** A password is a credential we are responsible for — the
current `privacy.html` already notes we hold a hash for people who only ever
wanted to look at houses. Passkeys move that liability to the device: there is
no shared secret to leak, phish or reset, and no password-reset email flow to
maintain. A login ID rather than an email address goes further — it is the one
change that would let somebody hold an account without handing us an
identifier that is also their identity everywhere else.

**What it would touch.** Supabase Auth supports WebAuthn, so this is a
provider-configuration and sign-in-flow change rather than a rebuild. The real
work is in the edges: recovery when the device is lost (the hard part, and the
one that decides whether this helps or strands people), a migration path for
existing password accounts, and whether an agency account — which is a shared
business login in practice — can work on a per-device credential at all.

**Decide before building:** whether login IDs replace email or sit alongside
it. If they replace it, the retention decision above changes shape, because
there would no longer be an email to keep.

---

## Decided: syndication is paid, Greenlight is grandfathered

**Eden, 2026-09-19. Implemented and live.**

The pricing page published hard limits — 20/100/unlimited listings, 2/5/unlimited
seats, syndication and AI captions from Accelerate, proximity on Leader — and
**none of it was enforced**. The only line in the system reading
`subscription_tier` was the proximity ordering in `0098`.

Now enforced in the database (not the portal — a check in `agency.html` is a
suggestion to anyone with an anon key):

- **Listing and seat caps** — `plan_limits()` + triggers on `properties` and
  `agency_members`. Never retroactive; the service role passes; a reactivation
  trigger stops archive/un-archive laundering the cap.
- **Syndication** — gated on `social_posts.leg = 'agency'` only.
  `agency_can(agency, feature)` answers by plan *or* grant.
- **Greenlight** holds an open-ended `syndication` grant in
  `agency_feature_grants`, with the reason recorded.

### The leg distinction is the whole design

`leg = 'agency'` is publishing to the agency's own connected account — the
"Publish once, reach everywhere" sold at ₦75k. `leg = 'synapse'` is our own
channel carrying their listing, which `0103` calls free amplification. Only the
first is gated. Charging for the second would be charging an agency to appear
on our feed.

Worth knowing: **all 52 free-amplification posts are synapse-leg**, and every
agency-leg attempt has failed for want of a connected account. So the
grandfather protects something Greenlight has not yet used — it matters on the
day they connect Meta.

### ~~Open~~ Resolved: AI captions

**Resolved 2026-09-19** — the grant was extended to `ai_captions`, and
then the paywall was switched off entirely (`paywall_enabled = false`)
because no payment has ever been taken. Kept for the reasoning.


`plan_features('accelerator')` includes `ai_captions`, and the pricing page
sells "AI writes and posts for you" from Accelerate. Nothing enforces it, and
`agency_can(greenlight, 'ai_captions')` is **false** — their grant covers
syndication only.

So Greenlight is generating captions on the free plan today, and gating it
would stop that. Three options, and it is a commercial call:

1. **Extend the grant** to `ai_captions` — consistent with grandfathering, and
   one row.
2. **Gate it and tell them** — they are a design partner; an honest "this moves
   to Accelerate on X" may land fine.
3. **Move captions to free** — captions are what make a listing postable at
   all, and a listing nobody can post is worth less to us too.

Enforcement point would be `social-generate`, not a trigger — it is an edge
function, so the check is `agency_can()` before the model call.
