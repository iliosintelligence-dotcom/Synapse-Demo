# Getting people from a post to the platform

**Written 2026-09-25**, after a real incident: a Greenlight listing posted to
Facebook sent a buyer into Eden's personal WhatsApp instead of to the listing,
because the Page carried a phone number and the post's link did not get used.

The phone number was then removed from the Page. That fixes the symptom and
costs something real — Eden's own framing, and he is right:

> phone numbers show security, they breed trust

So the goal is not to strip contact details. It is to stop the phone number
being the **destination** and make it something the destination **shows**.

---

## 1. What actually failed

It was not a missing link. On Facebook the caption already carries a full,
tappable, attributed short link — `queue_social_post` mints `/s/<token>` for
every post and `caption_link_tail()` appends the URL for platforms that
linkify. That has been live for weeks.

Three things stacked against it, and only one is about the link existing:

**The link is last.** `queue_social_post` appends it as
`caption || E'\n\n' || tail`, so it sits after the body and after the hashtags.
Facebook collapses a caption after roughly two or three lines behind **"See
more"**. A link below that fold is, for most readers, not on the post at all.

**A bare URL on a photo post has no card.** When the post is a photo or
carousel, Facebook renders no link preview and no button — the URL is grey text
underneath a large photograph. It is the least prominent thing in the post.

**Meta gives the Page's own button the best position.** The Call / WhatsApp
action button is rendered by Facebook directly under the post, high contrast,
thumb height. It was designed to win, and it did.

So the buyer behaved sensibly. They took the most visible route offered, and
the most visible route was a phone number.

---

## 2. The principle

> A phone number is a trust signal, not a destination.

Every route out of a post should land on Synapse, and the landing page should
carry the agency's verified phone and WhatsApp prominently. The buyer who wants
to call still calls. The difference is that we saw the listing they were
looking at, the agency gets the lead attributed, and the conversation starts
with the property on screen rather than in somebody's DMs.

This is also the model the platform already committed to: **WhatsApp is for
agent handoffs, never for buyers** (`docs/` WhatsApp scope). A buyer arriving
in WhatsApp is not a small UX problem, it is the closed path reopening.

---

## 3. The plan

Four phases, ordered by leverage rather than by effort. Phase 2 is the one that
would have prevented the incident.

### Phase 1 — the caption leads with the route

**Small, reversible, this week.**

Move the link above the fold. Not as the literal first characters — a caption
opening with a bare URL reads as spam and gets treated as such by readers — but
as line two, after a one-line hook:

```
3-bed in Lekki Phase 1, ₦4.5m/yr — photos, service charge and what's nearby:
synapsecore.dev/s/2VYusY

<the caption body>
<hashtags>
synapsecore.dev/s/2VYusY
```

The repeat at the end is deliberate and costs nothing: whoever reads to the
bottom is the most motivated reader on the post.

**Where:** `queue_social_post`, which today does `caption || tail`. It becomes
`hook || url || caption || tail` for platforms that linkify. Instagram and
TikTok are untouched — 0112 already established that a hand-typed
case-sensitive token is not a route anybody takes.

**The honest trade-off:** Meta has historically dampened reach on posts
carrying outbound links. I do not know the current size of that effect and
nobody outside Meta does. It is a real risk, it argues for Phases 2 and 3 being
worth more than this one, and it is measurable — we have per-post click and
impression data, so run Phase 1 on half the posts for two weeks and compare.

### Phase 2 — the Page's own button points at Synapse

**This is the fix for what actually happened.**

A Facebook Page's action button is settable through the Graph API
(`/{page-id}/call_to_actions`) and needs `pages_manage_metadata`, which we
already request and already hold on every connected Page.

- Button becomes **"Learn More"** or **"View Listings"** → the agency's
  `/go/<handle>` page
- The phone number **stays on the Page** — trust preserved
- The most prominent control on every post now leads somewhere measured

Offer it in the portal as a switch after connecting, not silently: changing an
agency's Page button is their decision, and one they should be able to reverse.

### Phase 3 — Instagram: comment-to-DM

**The highest-leverage item, and mostly built already.**

Instagram captions never linkify, so the bio link is the only standing route
and it always points at the newest posts rather than the one being read. The
pattern that actually moves people is:

> Comment **PRICE** and I'll send you the link.

- We already read comments as of today — `social_comments`, swept hourly, with
  `instagram_manage_comments` in the configuration
- A private reply DMs the commenter the listing's own `/s/` link, so the
  attribution is per-post and exact
- The caption stays link-free, which sidesteps the Phase 1 reach trade-off
  entirely

**What it needs:** `instagram_manage_messages` added to the Login for Business
configuration, and a rule engine — keyword, matching listing, reply template.
Instagram allows a private reply within **7 days** of the comment, which our
hourly sweep is comfortably inside.

**Worth saying plainly:** this is automated messaging to people who did not
ask, and it is the kind of thing NDPA and the FCCPA care about. The consent is
the comment itself, the reply must be a single message with no follow-ups, and
it must be obvious it is automated. Those constraints belong in the build, not
in a review afterwards.

### Phase 4 — Stories, with a real link sticker

Instagram Stories carry a genuinely tappable link sticker, and Stories are
publishable through the API (`media_type: STORIES`). This is the only fully
tappable Instagram surface there is.

A listing that goes to the feed can go to Stories the same hour with the link
attached. Lower effort than Phase 3, lower ceiling — Stories expire in 24
hours and reach a narrower audience — but it needs no new permission beyond
what publishing already has.

---

## 4. The one operational thing

`/go/<handle>` is live and works (`/go/demo-agency` returns 200 today). It
lists an account's posts newest-first and links each card through its own
`/s/<token>`, so a reader who taps the bio link and picks the home they just
saw is still attributed to that exact post.

**It only works if the handle is actually in the bio.** That is a step a human
takes once per account, and nothing currently asks them to. After a successful
connection the portal should show the agency their `/go/` URL with a copy
button and a plain instruction to paste it into the profile — the connection is
not finished until that is done, and today we report it as finished.

---

## 5. What to measure

We already have `click_events`, `short_links` and channel attribution, so the
before/after is readable without new instrumentation:

| Question | Where |
|---|---|
| Did anybody tap? | `short_links.human_click_count` per post |
| Did they get to the listing? | `social_post_stats().visits` |
| Did it become an enquiry? | `social_post_stats().leads` |
| Which platform earns its posts? | `click_events.channel` |

The number that matters is **leads per post**, not clicks. A link above the
fold that triples taps and produces no enquiries has moved the problem, not
solved it.

---

## 6. Recommendation

Do **Phase 2 first**, then **Phase 3**. Phase 2 removes the trap that caused
the incident, takes no new permission, and cannot hurt reach. Phase 3 is where
Instagram — the platform Nigerian agencies actually live on — stops being a
dead end.

Phase 1 is cheap and worth doing, but it is the one with a downside, and it
should be measured rather than assumed.
