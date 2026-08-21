# Engagement & Retention — Scoping and Triage

**Status:** Scoped · **Date:** 1 Aug 2026 · **Source:** Eden's 50-item list (items 12, 23, 37, 40, 45, 46 absent)

## 0. Eden's constraint, promoted to acceptance criterion

> "Your brand promise is anti-manipulation — nothing stale, no fake urgency. The moment a countdown
> or '3 people viewed' is fabricated, you're the WhatsApp market you're replacing.
> Addictive-because-genuinely-useful is the only version of this that compounds for Synapse."

**Every item on this list is tested against one question before it is built: if the data behind
this is absent or thin, does the interface say something untrue?** If yes, the item does not ship
in that form — it ships in the honest form named in §3, or it does not ship.

This is not a footnote because the failure mode is already documented in this codebase three times:
a contact flow that claims to send and doesn't (C-2), escrow guarantees in agency ad copy the terms
deny, and roughly 200 lines of invented agency data removed this session — including verification
counts derived from a hash of the listing title. A retention mechanic built on invented data is the
same defect with a growth loop attached to it.

---

## 1. Ranking: E-8 and R-00's P0/P1 outrank this entire list. I agree.

Stated plainly because I was asked to disagree if I did.

The verification claim is **live to users and in breach of our published terms** — `terms.html:59`
promises re-confirmation "at least every 14 days or it is removed," and 0 of 560 verified listings
fell inside that window before the purge. `verified_at` exists but every value is backfilled from
`created_at`, which R-00 prohibited inferring; it attests to when a flag was written, not to an
inspection.

Three reasons this outranks engagement work, in increasing order of importance:

1. **Retention multiplies exposure.** Every mechanic on this list exists to bring users back to a
   claim we cannot currently evidence. Succeeding at retention before fixing it means more people
   relying on it, more often.
2. **Four of these items consume verification data directly** — 17 (re-confirmation countdown),
   42 (trust-score leaderboard), 47 (daily pick), 8 (verified-listing count). They cannot be built
   honestly on top of an unresolved verification claim; 17 in particular would put the breach in a
   countdown chip on every card.
3. **It is the product's central promise.** Success on this product is "did we reduce uncertainty."
   A trust platform whose trust signal cannot survive scrutiny has no engagement problem worth
   solving yet.

**Where I qualify the agreement:** the Tier A items in §2 consume no verification data and make no
claims. Blocking them buys nothing, and they are owned by frontend while E-8 is owned by backend and
legal — different capacity. They run in parallel. Everything that touches a trust claim waits.

---

## 2. Triage

### Tier A — ready now: pure UI on data that already exists, no claim risk

| # | Item | Why it is safe |
|---|---|---|
| 13 | Hide compare UI until 2+ saves | Saves are local and real; removes a cold-open "0 selected" that reads as broken |
| 18 | Skeleton-load cards with stagger | Guardrail: only while a request is genuinely in flight, never as a content placeholder |
| 19 | Save animates + running saved counter | Counter is a true count of local saves. §6.1 of the design plan already specs the pulse |
| 22 | Recently-viewed rail | Local view history — true by construction |
| 24 | Sort/filter state persists | Local |
| 26 | Inline photo swipe on cards | Photos already on the listing record |
| 20 | Map toggle | Leaflet + `drawMatchMap` already exist |
| 33 | Hero chat input drops into Toju pre-sent | Pure handoff; makes no claim |
| 34 | Carousel auto-advance + deep-link panels | Deep-link targets must exist; pause-on-scroll required |
| 38 | Sticky CTA bar after first scroll | Makes no claim |

**Spawned this turn:** 13, 18, 19, 22, 24 as one bundle. 20, 26, 33, 34, 38 are second-wave Tier A.

### Tier B — blocked on data or schema we do not have

| # | Item | Missing | Honest version |
|---|---|---|---|
| 16 | Price-drop badge | **No price history table.** Schema work, not UI work | None until schema exists. Do not derive from anything |
| 15 | Match percentage on every card | No real scoring function. Landing's "Lifestyle match 91%" is a marketing mock | **Use the criteria-echo `why` line we already built.** A true sentence beats a fabricated number |
| 29 | Board match-strength meter | Same — no scoring basis | Show what was pinned and what it maps to; no % |
| 42 | Verification leaderboard | Trust scores across a real agency population; we have one demo agency | Do not build at current scale |
| 47 | Toju's daily pick, "gone tomorrow" | Curation mechanism, and **the DB has one property** | Defer. "Gone tomorrow" may never be said unless it genuinely expires |
| 14 | New since your last visit | Last-visit is local (fine); needs inventory | Safe to build; will render empty until inventory returns, which is correct |
| 49 | Journey tracker | "Viewing booked" and "Negotiating" have **no source** — the contact flow is E-1-fenced and sends nothing | Only render stages backed by real state |
| 48 | Notifications on real events | Only expiry is real today; price-drop has no source | Ship expiry only |
| 31 | Weekly digest | Matching + delivery infra + inventory | Defer |
| 50 | Instrumentation | **Privacy/consent question before a technical one** | Needs legal + a privacy-policy update before any event is collected |

### Tier C — blocked on the undeployed edge function or an Eden decision

Items 1, 5, 6, 7, 8, 9, 10, 21, 28 all touch Toju's function, which is written but **uncommitted
and undeployed** (E-7). None are spawnable.

- **1 (streaming) is architecturally impossible as built** — correction C-4. Pass 1 returns strict
  JSON that must be fully parsed (there is a `salvageWhys` repair path) before pass 2 rewrites it.
  **Substitute already exists and is already written into the doctrine:** staged narration at 2.5s
  ("Checking this against our verified listings…") and 6s ("Still with you…"). Item 8 is that
  substitute. Streaming needs a re-architecture decision from Eden, not a ticket.
- **6 folds into 8.** A counter that ticks independently of real progress is a fabricated
  animation. If it ticks, it ticks against actual candidates examined.
- **7 (❤️/👎 with Toju adapting) is P1-07** — the "Not right?" override already scoped. Same
  mechanic, better framing in Eden's version. Merged; do not build twice.
- 44 (Google/WhatsApp OTP) needs an auth-provider decision from Eden and a privacy review.
- 25 (gate second watch-area behind sign-up) is a monetization gate; the flywheel puts buyer trust
  ahead of it. Deferred, not rejected.

### Tier D — already done, already decided against, or conflicting

| # | Status |
|---|---|
| 2 | **Largely built.** Contextual suggestions are returned every turn with a non-empty guarantee and a fallback. The improved version is undeployed, not unbuilt |
| 3 | **Largely built.** Visitor memory, server-side restore and a history drawer exist. The gap is only the visible "Toju remembers your search" affordance |
| 4 | Mic input already exists in the composer. Gap is transcription quality, not the control |
| 11 | **Already decided against for web** — design plan §6.4: the Vibration API is unreliable and permission-noisy. Applies to the React Native app only |
| 21 | **Conflicts with a standing decision.** "Never unsolicited popups on browse/property pages" is an explicit rejection in the design plan. Infinite scroll is fine; Toju interjecting into it is not |
| 27 | Acceptable **only** as clearly-curated inspiration content, never as listings. Empty stays neutral — no sad-face framing |

---

## 3. False-statement register

Every item that would assert something untrue if built against current data. **This is the section
to read before writing any of these tickets.**

| # | The false statement it would make | Honest version |
|---|---|---|
| **17** | **"Re-confirmation due in 2 days."** `expires_at` is real, but it is a **listing** expiry — it is not evidence that a verification re-confirmation happens, and per E-8 re-confirmation is exactly what we cannot evidence. This is the most dangerous item on the list precisely *because* the data exists and looks like it fits | **"Listing expires in 2 days"** — true against `expires_at`, claims nothing about verification. Requires confirming expiry is actually enforced |
| 15 | A match percentage implies a scoring model we do not have | The criteria-echo `why` line — already built, already true |
| 16 | "Price dropped ₦8M" with no price history is invention | Nothing, until a price-history table exists |
| 47 | "Gone tomorrow" is manufactured scarcity; "hand-chosen" implies curation that does not exist | Defer entirely |
| 42 | A leaderboard over one demo agency is fabricated ranking | Defer |
| 41 | Animating a leads mock ("Toju replying at 2:14am") is **the same pattern as the 200 lines just deleted**, on the marketing page | Label unmistakably as illustration, or animate real aggregates only |
| 9 | "I'll keep watching Lekki for you" promises a watch mechanism and a notification that do not exist | Only say it if a watch record is created and notifications actually fire |
| 5 | "Two new verified 3-beds since Tuesday" must be a real diff | Real diff or no line |
| 35 | Animating "Day 15 — removed" asserts we enforce removal | **Verify expiry is actually enforced before animating it.** If it isn't, this animation is a promise, not a demo |
| 36 | The count-up "7" inherits T-8 — stored check names do not match the seven published in terms | Resolve T-8 first, or animate only 14 and Free |
| 49 | "Viewing booked" with no booking source | Render only stages with real state |
| 6 | A ticker unconnected to real search progress | Tie to actual candidates examined |
| 29 | A strength meter with no scoring basis | Show pins and their mapped signals |

---

## 4. The decided item: brand kit at agency registration

Eden instructed this, so it is committed work. **The real first task is hidden inside it.**

Agency signup currently creates a profile with role `agency_owner` but creates **no `agencies` row
and no `agency_members` row** — the membership had to be inserted by hand this session before
uploads worked at all. Building brand-kit onboarding on top of that writes to a row that does not
exist.

- **P-A1 — Fix agency provisioning** (backend, spawned). Signup must transactionally create the
  agency and the owner membership. This is a live bug: every agency registering today gets a broken
  account.
- **P-A2 — Brand-kit onboarding flow** (ui-designer spec → frontend). Blocked on P-A1.
- **P-A3 — Make the brand kit consume-able.** Noted: the brand kit page shipped this session and
  **nothing reads it** — `syndication.js` does not use brand voice or colours when generating copy.
  A brand kit that changes no output is a form, not a feature. Blocked on P-A1.
- **39** (register vs login buttons) is Tier A UI but depends on P-A1 for the register path to lead
  anywhere, so it sequences behind it.

---

## 5. Sequencing

```
E-8 / R-00 P0-P1 (verification remediation)  ── outranks everything below ──►
                                                                            │
Tier A bundle (13,18,19,22,24) ──► second-wave Tier A (20,26,33,34,38)      │ parallel,
P-A1 provisioning ──► P-A2 brand-kit onboarding ──► P-A3 consumption, 39    │ no claim risk
                                                                            │
E-7 deploy ──► Tier C Toju items (5,6/8,9,10,28) ─────────────────────────┘
E-8 resolved ──► 17 (honest label), 36, 42, 47
Schema work ──► 16 (price history), 15 (if ever)
Legal + privacy ──► 50 instrumentation, 44 auth, 30 shared boards
```

**Critical path to any Toju engagement work: E-7 (deploy).** Nothing in the chat loop moves until
the function is live, and it is the cheapest blocker on the board to clear.

---

## 6. Back to Eden

1. **Item 23 has no entry** but is named in your caveat alongside 16, 17 and 47 — all
   scarcity/urgency mechanics. Rather than guess, what was 23? Items 12, 37, 40, 45 and 46 are also
   absent.
2. **Streaming (1)** — re-architect the function for text-first streaming, or accept staged
   narration as the answer? My recommendation: accept the narration; revisit after Phase 3.
3. **Is listing expiry actually enforced** at `expires_at`, or is the column written but not acted
   on? Items 17, 35 and 48 all depend on the answer, and two of them make public promises about it.
4. **Instrumentation (50)** — "instrument everything from day one" needs a privacy decision before
   a technical one. What are we willing to say we collect, in the privacy policy, in plain words?
