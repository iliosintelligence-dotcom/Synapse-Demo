# Backlog

Things decided and deferred, with enough of the reasoning to pick them up cold.
An item here has been agreed as worth doing — it is not an idea list.

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
