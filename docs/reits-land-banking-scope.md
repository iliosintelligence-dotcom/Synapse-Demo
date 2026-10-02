# REITs & Land Banking — Scoping and Delegation

**Status:** Scoped, legal-gated · **Date:** 31 July 2026 · **Decided by:** Eden

## The decision, as given

Build REITs and land banking as **a browse category in the app** — new asset types alongside
sale and rent, with filtering and card treatment — **and extend Tayo's advisory scope** to cover
them. Synapse will **list real offerings from partners**, not merely explain the instruments.

That last clause is the one that changes everything downstream. Explaining an asset class is
content. Listing real offerings makes Synapse a **distribution channel for SEC-regulated
securities in Nigeria**, and — depending on structure — potentially a promoter of collective
investment schemes. The build is not primarily a UI problem.

---

## 0. R-00 VERDICT — legal recommends against this workstream in its current shape

Memo: `docs/R-00-regulatory-constraints-investment-offerings.md`. Not against the category —
against the specific combination Eden scoped. **"List real offerings from partners" + "extend
Tayo's advisory scope" = regulated securities distribution plus regulated robo-advisory, and
neither is curable by disclaimer.** This escalates to Eden; I am not overriding it.

The findings that change the decision:

1. **Tayo's existing loop is already the regulated activity.** Nigeria's SEC has *Rules on Digital
   (Robo) Advisory Services* (Aug 2021), and the regulated process they describe — elicit
   circumstances, analyse algorithmically, recommend — is precisely what Tayo already does.
   Pointing that loop at securities is not a doctrine extension; it is entry into a licensed
   activity. Legal also warns that **doctrine text is not a compliance control** for a boundary
   with criminal consequences behind it.
2. **Registration is probably required.** ISA 2025 registration is functional, not entity-based;
   "we're just a listing platform" is not a carve-out. Closest fit is the Digital Sub-Broker
   category. Which one applies depends on six product facts we have not fixed.
3. **Unregistered CIS: never listable.** Promoter/advertiser liability under ISA 2025 is criminal
   (≥₦20m, up to 10 years, s.196 sealing and forfeiture) and reaches directors. Nigerian
   land-banking products are *deliberately* structured not to look like CIS, so a presumptive-CIS
   screen is required.
4. **"Verified" near an investment offering materially increases exposure** — because
   `terms.html:59` defines Verified as a seven-point check *including ground survey and structural
   assessment*. Applying it to a REIT means our own ToS asserts we surveyed the ground of a
   security. And **proximity contaminates**: site-wide "every listing is verified" claims must be
   scoped to homes *before* any investment card exists anywhere.
5. **Three advertising regimes, all currently missed** — SEC, ARCON pre-exposure vetting (a **live
   gap on existing marketing right now**, independent of this workstream), and FCCPA.
6. **No commission in v1** — it is the classic distribution hallmark, and paid placement
   contradicts a live published promise at `terms.html:75` ("not for sale… never on payment").

### My §1.3 calls, as ruled

- **(a) Typed verification — ratified**, with a prerequisite: scope the published definition at
  `terms.html:59` and all site-wide claims to homes before anything else ships.
- **(b) REIT passthrough — ratified as direction, but my wording was wrong.** "Relayed not
  performed" is a much weaker distinction in law than in copy, and registration is not approval,
  so the passthrough risks manufacturing a *more* dangerous badge. Corrections: source from the
  Commission's register directly, retain the snapshot, re-check with auto-hide on lapse, carry an
  explicit "registration is not approval" negation in the same block, and **never render it as a
  chip** — a chip is a badge and a badge is an endorsement. It must be a dated attributed sentence
  in body copy. Absence of the passthrough is a **bar to listing**, not a lower tier.
- **(c) Land check — ratified structurally, my naming instinct overruled.** Call it a **Title
  Report**; no tick, shield, or "verified" in any inflection; and render **not-confirmed rows at
  equal prominence**. Showing the negatives is what makes it defensible and is the real
  differentiator.
- **(d) Default-unverified — partially overruled.** Right as rendering, wrong as policy: for
  REITs/CIS there is no unverified tier, and for land, no title file means refuse. Absence of a
  check is a bar, not a label. "Unverified" is also the wrong word once we have said we do not
  verify — it implies verification is coming.

### Two things legal caught that this doc missed

- **A fourth land-fraud pattern:** the guaranteed-buyback product — which is the CIS wrapper, and
  the most dangerous of the four.
- **A registry search does not reliably catch prior unregistered double sales**, so we must say so
  rather than imply coverage. Legal did identify a genuine narrow opportunity here: cross-checking
  every parcel ever listed on Synapse catches double-selling within our own inventory — a true
  claim nobody else makes.

### The alternative v1 legal proposes

Education, a **"check it yourself on the SEC register" tool**, a fraud-pattern explainer, Tayo
confined to explanation-only with a refusal boundary, and a waitlist. No registration, no partner
risk, no contact with the verification brand. It makes Synapse the place people go to *avoid being
defrauded* — which is a stronger version of our actual proposition than a thin listing directory,
and it sits inside the existing flywheel rather than jumping ahead of it.

**Needs licensed counsel (two lawyers, not one):** registration category, Zone B carve-out
viability, CIS characterisation calibration, fee structures, and LASRERA registration — which
legal flagged as a live open question for Lagos platforms rather than approximating.

### Outstanding against R-00

An urgent mid-flight escalation about the live verification data did **not** make it into the memo,
and it undermines a load-bearing assumption in it: §8(b) proposes mirroring "the 14-day homes
discipline" and §5 treats the 560 verified homes as a sound asset to protect from contagion. Per
**C-7** in the delegation doc, that discipline does not evidentially exist. R-00 has been resumed
to answer whether the existing homes chip is supportable at all, and whether its contagion argument
inverts. **Treat R-00 as incomplete until that returns.**

---

## 1. Three constraints that govern this workstream

### 1.1 Legal is a blocking input, not a parallel track

Nothing about schema, surfaces, or Tayo's behaviour may be committed before legal answers. This
is a reversal of the usual pattern where legal reviews a proposal — here legal defines the
envelope the proposal must fit inside. Backend must not design tables, frontend must not design
surfaces, and toju-ai must not extend the doctrine until **R-00** lands.

### 1.2 No invented offerings, ever

This session has already found two cases of the interface asserting something untrue: a contact
flow that claims to send and doesn't, and escrow guarantees in agency ad copy that the terms
explicitly deny. The same failure mode applied to a land-banking scheme is not an embarrassment,
it is the worst thing this platform could ship.

**Rule, non-negotiable:** seed, demo or sample data must never name a real issuer, a real scheme,
or carry a plausible-looking registration number. If sample data is required it must be
*unmistakably* sample — fictional names that could not be mistaken for a real fund, no registration
numbers in a real-looking format, and a persistent visual marker that survives screenshotting.
A screenshot of a fake land scheme on a trust platform is indistinguishable from fraud.

### 1.3 Verification is the hard question, not the UI

Synapse's entire proposition is verification. The seven-point check (`terms.html:59` — including
ground survey and structural assessment) was designed for **physical homes**. It does not transfer:

- A **REIT unit** has no building to survey. What matters is whether the issuer is SEC-registered,
  whether the trustee is real, whether returns are audited, and whether the offering is open.
- An **undeveloped land parcel** has no structure to assess. What matters is whether title exists
  and is clean, whether the land sits under government acquisition or has been excised, whether
  the seller actually holds the title, and whether the same plot has been sold before. Nigerian
  land-banking fraud is overwhelmingly these four things.

**If `verification_status = verified` means "we surveyed the ground" on one card and "the issuer
filed with the SEC" on the next, the chip stops meaning anything on either — including on the 560
verified homes already carrying it.** That is a net loss of trust across the whole product, paid
for by a new category.

**My call as PM, for legal and Eden to confirm (R-01):**

1. **Verification becomes typed, never bare.** The existing `verification_status` semantics stay
   frozen for physical homes. New asset classes get their own vocabulary and their own chip label.
   No new asset type may render the homes chip.
2. **For REITs, Synapse should not claim to "verify" a security at all.** We are not an auditor.
   The honest and defensible position is a **factual passthrough** — "SEC-registered as at
   [date], per the Commission's public register" — sourced and dated, presented as a fact we
   relayed rather than a check we performed. This is a materially safer posture than extending our
   verification brand over instruments we cannot audit.
3. **For land, the check is title-centric and should be named as such** — a distinct check whose
   points are title, acquisition/excision status, seller-holds-title, and prior-sale search.
4. **Default state for any new asset type is unverified, rendered distinctly** — not as a
   pending-looking variant of the homes chip.

Items 2 and 3 are the ones most likely to be argued with on commercial grounds. I am recording
them as decisions rather than options so the argument happens explicitly.

---

## 2. Roadmap tension, flagged not resolved

The onboarding roadmap lists **investment recommendations** under "future capabilities — not yet
in scope, don't build prematurely," and sequences the flywheel as: exceptional buyer experience →
agency value → richer data → better Tayo. This workstream pulls a future capability forward, ahead
of Phase 1 buyer-trust work that is still open (AC1b is not met; E-1 is undecided).

Eden has made the call and I am not relitigating it. But two things follow, and I am acting on them:

- The Phase 1 trust items do **not** pause for this. A platform that recommends land investments
  while its own contact button lies is not a platform anyone should invest through.
- The verification-semantics decision (R-01) is the point where this workstream can actively
  *damage* the buyer experience the flywheel depends on. It gets decided before anything is built.

---

## 3. Work breakdown

`LG` legal · `BE` backend-developer · `FE` frontend-developer · `UI` ui-designer · `TJ` toju-ai · `PM` me

| ID | Work | Owner | Depends on | Size | Status |
|---|---|---|---|---|---|
| **R-00** | Regulatory constraints memo — what Synapse may lawfully do as a listing channel for REITs and land offerings in Nigeria | LG | — | L | **LAUNCHED — blocking gate** |
| **R-01** | Verification semantics per asset class; ratify or amend the four PM calls in §1.3 | PM + LG + UI | R-00 | M | Blocked |
| **R-02** | Sample-data policy: the concrete rule for what fictional offerings may look like, and the marker that makes them unmistakable | PM + LG | R-00 | S | Blocked |
| **R-03** | Partner/issuer onboarding and due-diligence process — what we check before any real offering is listed, who signs off, what we retain | LG + PM | R-00 | L | Blocked |
| **R-04** | Data model: asset types, per-class verification fields, issuer records, offering lifecycle | BE | R-00, R-01 | L | Blocked |
| **R-05** | Risk-disclosure and AI-disclosure copy for investment surfaces and for Tayo | LG | R-00 | M | Blocked |
| **R-06** | Browse category design spec: asset-type filtering, per-class card treatment, distinct verification chips | UI | R-01, R-05 | M | Blocked |
| **R-07** | Tayo advisory scope: what Tayo may explain, filter, compare — and the hard line at suitability advice, return forecasting and recommendation | TJ | R-00, R-05 | M | Blocked |
| **R-08** | Browse implementation: asset types, filters, cards | FE | R-04, R-06 | L | Blocked |
| **R-09** | Tayo doctrine extension | TJ | R-07 | M | Blocked |

Everything except R-00 is blocked. That is the intended shape of this workstream, not a bottleneck
to route around.

---

## 4. What legal must answer (R-00 scope)

The questions that determine whether this is buildable at all:

1. **Intermediary status.** Does listing third-party REIT offerings make Synapse a regulated
   intermediary, agent or distributor under Nigerian SEC rules? Is registration required?
2. **Collective investment schemes.** Many Nigerian land-banking products are structured as
   collective investment schemes, which carry their own SEC registration requirement. Can Synapse
   list one that is unregistered? Must we verify registration before listing?
3. **Tayo and investment advice.** Does an AI that filters, compares or recommends investment
   offerings to a specific user constitute regulated investment advice or suitability advice? This
   determines R-07 entirely.
4. **Promotion and advertising.** What risk warnings, disclaimers and approvals attach to
   displaying an investment offering? Who must approve the wording?
5. **Liability.** If a listed scheme defrauds a Synapse user, what is our exposure — and does
   using the word "verified" anywhere near it increase that exposure?
6. **Commission.** May Synapse take a fee or commission on these listings, and does taking one
   change our regulatory status?
7. **Land-specific.** What must be true about title before we may list a parcel, and what may we
   state about acquisition/excision status?

---

## 5. Sequencing

```
R-00 (legal)  ──►  R-01 verification semantics  ──►  R-04 schema  ──►  R-08 browse build
     │                    │                              ▲
     ├──► R-02 sample-data policy ─────────────────────┘
     ├──► R-03 partner due diligence
     └──► R-05 risk copy ──► R-06 design spec ──► R-08
                          └─► R-07 Tayo scope ──► R-09
```

**Critical path:** R-00 → R-01 → R-04 → R-08. Legal sits at the head of it, which is the point.

**Nothing in this workstream is buildable until R-00 returns.** No offerings work should be
reported as ready, scheduled, or estimated before then.
