# R-00 — Regulatory Constraints: REITs, Land Banking and Investment Offerings

**Status:** Blocking gate — returned · **Date:** 31 July 2026 · **Owner:** legal/compliance agent
**Jurisdiction:** Nigeria (federal securities law + Lagos State land law)
**Blocks:** R-01 … R-09 · **Read with:** `docs/reits-land-banking-scope.md`, `docs/LEGAL_TRUST_MEMO.md`, `terms.html`, `privacy.html`

---

> **STANDING CAVEAT — read before anything else.** I am not a lawyer and this is not legal
> advice. This memo defines a risk envelope and produces draft language. It is a briefing
> instrument for instructing counsel, not a substitute for counsel. **Several conclusions below
> require a licensed Nigerian securities lawyer and a Nigerian real-estate lawyer before any
> line of code is written against them.** Where the answer turns on facts we have not fixed, I
> say so rather than approximate. I over-flag deliberately: on this workstream the cost of a
> false "that's fine" is a criminal exposure and the loss of the one asset the company has.

---

## 0. Bottom line up front

**I recommend against this workstream in its current shape.** Not against the ambition —
against the specific combination the scope doc describes.

The three clauses that break it, in order of severity:

1. **"List real offerings from partners."** In Nigeria this is regulated distribution of
   securities. It is not content and no disclaimer converts it back into content. It requires
   registration with the SEC in some capacity, or operating under a registered operator that
   accepts regulatory responsibility for us. Either way it is a licence question, a capital
   question and a several-month question — not a schema question.
2. **"Extend Toju's advisory scope."** Nigeria has an express robo-advisory regime. It has
   already decided that algorithmic advice is advice. Toju's existing architecture — extract
   the user's budget, household and circumstances, then surface matches — *is* the
   profile-then-recommend loop that regime regulates. Pointing that loop at investment
   offerings does not extend Toju's doctrine; it moves Toju into a licensed activity.
3. **Land banking specifically.** The three fraud patterns the scope doc names are correct, and
   there is a fourth it misses (the guaranteed-buyback wrapper) that is the most dangerous of
   all because it converts a land listing into an unregistered collective investment scheme,
   with criminal liability attaching to promoters — which would include us.

**What I can green-light today, with no registration and no counsel gate:** education about the
asset classes, with no specific offerings, no partner listings, no fee, and Toju hard-blocked
from personalisation. Plus one genuinely on-brand feature: a tool that teaches a user to check a
scheme *themselves* on the Commission's public register. That is differentiated, it is honest,
it carries near-zero regulatory load, and it builds the demand evidence that would justify a
licence application later. Detail at §10.

### Capability verdict table

| Capability | Verdict | Why |
|---|---|---|
| Explain REITs / land banking as asset classes (generic, symmetric, non-personalised) | **GREEN** | Editorial content. Not regulated. |
| "How to check a scheme on the SEC register yourself" tool | **GREEN** | Teaches verification instead of asserting it. Strongest available posture. |
| Glossary, risk explainers, fraud-pattern education | **GREEN** | Consumer-protective, on-brand. |
| Toju answers "what is a REIT / what is excision?" | **GREEN** | Zone A, §3. |
| Display a specific live third-party REIT offering | **RED without counsel + likely registration** | §1. Regulated distribution. |
| Display a land-banking product with pooled money or promised return | **RED — hard stop** | §2. Presumptively an unregistered CIS. Criminal exposure. |
| Display an individual land parcel for sale (no return promise) | **AMBER — heavy preconditions** | §7. Buildable, but only against a documented title file including a lawyer's opinion. |
| Take a fee/commission on any investment listing | **RED for v1** | §6. Converts an uncertain regulatory position into a near-certain one. Also contradicts `terms.html:75`. |
| Toju filters / compares / ranks / recommends specific offerings | **RED** | §3. Robo-advisory. Licensed activity. |
| Toju forecasts, annualises or projects any return | **RED — permanent** | §3. Not curable by registration in our shape. |
| Any "Verified" chip, tick or shield on an investment card | **RED — permanent** | §5. Single most dangerous word in the workstream. |
| Sample/demo investment offerings in the product | **RED — recommend none at all** | §9. |

---

## 1. Intermediary status — does listing third-party REIT offerings regulate us?

**Answer: almost certainly yes, and the label we choose for ourselves is irrelevant.**

### The legal frame

The **Investments and Securities Act 2025 (ISA 2025)**, signed March 2025, replaced ISA 2007 and
substantially widened both the definition of regulated activity and the SEC's enforcement reach.
Units in a REIT are securities. A REIT itself must be registered with the SEC, constituted by a
trust deed with a licensed trustee. Persons who carry on business as intermediaries in securities
must be registered with the Commission as capital market operators — registration in Nigeria is
**functional and activity-based**, not entity-based. There is no "we're just a website" carve-out.

### The test that actually applies

The question a regulator asks is not *what do you call yourself* but *what do you do between the
investor and the issuer*. Two poles:

- **Pole A (unregulated):** general editorial content about an asset class. No specific offerings,
  no routing, no remuneration from issuers.
- **Pole B (regulated):** presenting specific live offerings to identified retail users, with
  filtering, an interest/contact/apply flow, and payment from the issuer. That is distribution.

The scope doc places us at Pole B explicitly and knowingly ("list real offerings from partners,
not merely explain the instruments"). Every intermediate design decision — an "I'm interested"
button, a lead handed to the issuer, a filter we control — pushes us further toward Pole B.

### Which registration

I can identify the plausible categories but **I cannot pick one from the desk, because the answer
depends on facts we have not fixed.** The candidates:

- **Digital Sub-Broker.** The SEC's April 2021 amendments to the SEC Rules and Regulations created
  exactly this category: a sub-broker using a digital platform to engage investors and interact
  with sponsoring brokers. It is the box the retail investment apps sit in. It is the closest
  existing fit for "platform that puts retail users in front of third-party offerings."
- **Investment Adviser (corporate).** If our value-add is selection, comparison or guidance rather
  than pure execution routing.
- **Robo-Adviser** on top of the above, if Toju is involved at all in a personalised way (§3).
- **Operating as the agent of a registered operator** — contractually under a sponsoring
  broker/fund manager whose licence covers the activity and who accepts regulatory responsibility.
  Note this is *not* a free pass: the sub-broker regime itself requires the sub-broker to register.

**The facts counsel needs from us before this can be answered** (fix these first — they are product
decisions, and right now they are undecided, which is why the question is open):

1. Does Synapse ever receive, hold or route investor funds? (If yes, the analysis hardens
   considerably and payment/CBN questions attach too.)
2. Is there an application/subscription flow in-product, or purely an outbound link to the issuer?
3. Do we transmit user details to the issuer, and in what form? A qualified lead is closer to
   intermediation than an anonymous outbound click.
4. Are we paid, by whom, and on what trigger? (See §6 — this is the single most determinative fact.)
5. Do we exercise editorial selection over which offerings appear? Curation is a regulated-looking
   act; an exhaustive, non-selective directory is a different animal from a curated shortlist.
6. Does Synapse author any description of the offering, or only reproduce issuer-approved text?

**COUNSEL REQUIRED — blocking.** A written opinion from a Nigerian securities lawyer on
registration category, against a fixed fact pattern, before R-04 schema work begins. Do not
design tables that presuppose an answer.

---

## 2. Collective investment schemes — may we list an unregistered one?

**Answer: no. Not with a disclaimer, not behind an "unverified" label, not in a closed beta, not
"just for launch". This is the hardest line in the memo.**

### Why it is this absolute

ISA 2025 prohibits the operation of unregistered collective investment schemes and defines CIS
broadly (open- and close-ended, including schemes offered only to qualified investors; foreign
schemes soliciting Nigerian investors must register too). Section 196 empowers the Commission to
enter and seal prohibited schemes — expressly including Ponzi and pyramid arrangements — and to
freeze and forfeit assets. Ponzi schemes are now expressly criminalised: on conviction, a fine of
not less than ₦20 million, imprisonment of up to ten years, or both, plus forfeiture and market
bans.

The exposure that matters to us: **liability attaches to promoters and to persons who advertise
or promote the scheme, not only to the operator.** A platform that displays an unregistered CIS
to retail users, with a trust proposition attached, is squarely in promoter territory. That is
criminal exposure, and in Nigerian practice it reaches directors personally. No terms-of-service
clause disclaims a criminal offence.

### The trap, and it is the whole game

**Most Nigerian land-banking products are structured specifically so they do not look like a CIS.**
The standard wrappers:

- "You are buying a plot — we merely manage it for you."
- Sale with a guaranteed buyback at a stated uplift after a stated period.
- "Fractional" plots, where no individually identified parcel is ever conveyed.
- Pooled development funds dressed as pre-sales.
- Rental/return-share arrangements over undeveloped land.

Whether a given product is a CIS is a **legal characterisation question we are not competent to
make**, and the promoters of these products are professionally good at making it look settled.

**Operating rule — treat as presumptively a CIS, and therefore unlistable until counsel says
otherwise, any product with any of:** pooled investor money; a promised, guaranteed, indicated or
"projected" return; a buyback or exit guarantee; the investor not receiving an individually
identified, separately transferable title; management of the asset by the promoter on the
investor's behalf; or returns dependent on the promoter's performance rather than the asset the
investor owns outright.

### Must we confirm registration before listing?

Yes, and the *manner* of confirmation matters:

- Confirm **at source** — the Commission's own public register — never from the issuer's PDF,
  certificate image, or website. Forged and stale registration evidence is routine.
- Record **who checked, when, and what the register said**, as a retained artefact.
- **Re-check on a schedule** with a hard expiry. Registration lapses, gets suspended, and the SEC
  publishes warnings. A one-time check at onboarding is worthless six months later. I would mirror
  the homes 14-day discipline: re-check monthly, and auto-hide the offering the moment the check
  goes stale, exactly as stale homes listings are removed.
- Registration of the *scheme* is not registration of the *fund manager, trustee or issuing house*
  — check each separately, and check that the specific offering is actually open.

**Also check** the SEC's published lists of unregistered/suspect operators and public warnings as
a negative screen, and re-run it on the same schedule.

---

## 3. Toju and investment advice — the boundary

This is the answer that determines the AI workstream, so I am being maximally concrete.

### The controlling point, first

Nigeria did not leave this to inference. The SEC issued **Rules on Digital (Robo) Advisory
Services (30 August 2021)**. They apply to capital market operators *and* to individuals and
corporates offering digital advisory services in the Nigerian capital market, and require
**registration with the SEC**. The regime carries, among other things: minimum paid-up capital
(₦10 million for the adviser category), a fidelity bond, sponsored individuals with qualifying
post-graduation experience, documented algorithm governance, monitoring and testing, an
obligation to detect bias and to assign risk profiles correctly and consistently, an obligation to
identify inconsistent client responses, an obligation to identify and screen out clients
unsuitable for investing, and mandatory suspension of the service where an algorithm error or bias
is detected.

The regime describes the regulated process directly: *the client answers questions about risk
tolerance, objectives and horizon, inputs an amount, the inputs are analysed algorithmically, and
a portfolio is recommended.*

**Read that description against what Toju already does.** Toju elicits budget, household
composition, work location, lifestyle and affordability; stores it; and returns matches. That is
the same loop. The only thing currently keeping Toju outside the securities perimeter is that the
matches are homes, not securities. Pointing that same loop at investment offerings is not a
doctrine extension — **it is entry into a licensed activity.**

So: **an AI that filters, compares or recommends investment offerings to a specific user is
regulated investment advice in Nigeria.** The medium is irrelevant. "It's just an AI" is an
aggravating fact, not a defence — the rules exist precisely because it is an algorithm.

### The three zones

**ZONE A — permitted, no registration. Generic explanation.**

- What an instrument is, mechanically. How a REIT is structured; what a trustee does; what
  excision means; what a gazette is; what "committed acquisition" means.
- Risks of the asset class, stated at least as prominently as any upside.
- What questions a buyer should ask; what documents to demand; how to check a registration.
- Where to get professional help, and that they should.
- **Test: could this identical paragraph be printed in a newspaper for a general audience with no
  knowledge of who the reader is?** If yes, Zone A.
- **Symmetry requirement:** any Zone A content mentioning returns must give risk equal or greater
  prominence. An "explainer" that is functionally an advertisement is an advertisement (§4).

**ZONE B — grey. Permitted only under registration, or under a counsel-cleared narrow carve-out.
Factual, non-evaluative retrieval about a specific offering.**

- Restating disclosed facts of an offering the user has already named.
- A neutral side-by-side of disclosed attributes in a fixed, non-evaluative order.
- Filtering where **the user** sets the filter and the result set is exhaustive.

Zone B is only defensible if it is mechanical, symmetric, exhaustive within the user's own filter,
never ordered by attractiveness, never labelled "best/top/recommended/right for you", contains no
forward-looking number, and does not resolve the user's decision. **In practice an LLM cannot be
relied on to stay inside Zone B by instruction alone.** See "Doctrine is not a control" below. My
position: do not attempt Zone B without registration and deterministic controls.

**ZONE C — prohibited absent registration. Anything personalised or evaluative.** Any output that:

1. **Personalisation** — depends on anything the user told us about themselves (budget, income,
   savings, household, goals, timeline, risk appetite, dream board, prior conversation).
2. **Selection** — narrows a set in a way *Synapse* chose rather than the user; ranks, scores,
   shortlists, "top picks", "you might also like", ordering by anything other than a neutral key.
3. **Forecast** — contains any forward-looking number: projected return, annualised yield,
   "this could be worth", "in five years", extrapolation from past performance, appreciation rates.
4. **Endorsement** — could be read by a reasonable retail user as "Synapse thinks I should do
   this." Includes tone: enthusiasm, urgency, scarcity, reassurance about safety.
5. **Allocation or timing** — "put some of your deposit into", "now is a good time", "before prices
   rise", "instead of renting".
6. **Cross-asset decision framing** — comparing an investment offering against a home purchase or a
   rental as a decision for this user. This one will feel natural to Toju and it is Zone C.

### The four-trigger operational test — hand this to toju-ai verbatim

Before emitting any investment-adjacent output, **any single trigger = refuse and hand off**:

1. **Personalisation trigger** — does the output depend on anything I know about this user?
2. **Selection trigger** — am I narrowing a set the user did not narrow?
3. **Forecast trigger** — is there a forward-looking number anywhere in this output?
4. **Endorsement trigger** — could this be read as "Synapse thinks you should"?

### Doctrine is not a control

The scope doc's §1.2 already records two cases of the interface asserting something untrue. An
LLM's dominant failure mode is helpfulness under pressure — a user who asks "but which one would
*you* pick?" three times will get an answer. A prompt-level instruction is an excellent product
guideline and an inadequate compliance control for a boundary with criminal and licensing
consequences on the far side.

If this workstream ever proceeds past Zone A, the minimum control set is deterministic, not
textual:

- A separate, explicitly-routed code path for investment intent — not a doctrine branch inside the
  general property conversation.
- Allowlisted response templates for anything offering-specific, rather than free generation.
- An **output classifier** that blocks superlatives, forward-looking numerics, suitability
  language and second-person recommendation before the response reaches the user.
- Full retention and auditability of every investment-adjacent turn (the robo rules effectively
  require this anyway, and it is our only evidence if challenged).
- A kill switch that disables the investment path without a deploy.
- Refusal copy that is warm and useful rather than a wall, so users are not pushed to circumvent
  it. Draft at §8.

**Consequence for the plan: R-07 and R-09 cannot proceed as scoped.** What toju-ai can build now
is the Zone A explainer capability plus the refusal/handoff behaviour — which is real, useful work
and should start.

---

## 4. Promotion and advertising

**Three separate approval regimes apply, and each is routinely missed.**

**(1) SEC.** Advertisements and offer materials for securities fall under Commission control;
issuing, allotting or advertising an offer without required approval carries substantial penalties
(the April 2025 private-companies rules, for example, set penalties of not less than ₦10 million
plus daily accruals, and provide for suspension or withdrawal of the registration of the operators
involved). The practical consequence for our product design is sharp:

> **Synapse does not write its own description of an offering.** Any Synapse-authored prose about a
> specific offering is unapproved advertising material for a security. We may reproduce the
> issuer's approved text verbatim and unedited, attributed and dated — nothing else.

That includes summaries, "what this means in plain English", highlights, tags, and anything Toju
generates about a named offering. Paraphrase is authorship.

**(2) ARCON.** Under the Advertising Regulatory Council of Nigeria Act 2022, advertisements
targeted at Nigerian audiences — **including digital, social and influencer content** — require
pre-exposure vetting and approval by ARCON's Advertising Standards Panel. This binds our marketing
work regardless of the securities question and applies to the campaigns digital-marketer and
social-media-manager are already producing. **This is a live compliance gap on existing marketing,
not just a future one.** I am flagging it out of scope-band because it is cheap to fix and
expensive to be caught on.

**(3) FCCPA / FCCPC.** Misleading representations to consumers, and unfair terms. Note that
limitation-of-liability clauses are not reliably enforceable against consumers in Nigeria, so our
ToS liability cap should not be treated as protection (§5).

### Who must approve wording

In this order, and none of them is us:

1. The **issuer and its registered issuing house / fund manager**, for anything describing the
   offering.
2. The **SEC**, where the offer or the advertisement requires Commission approval.
3. **ARCON**, pre-exposure, for advertising in any medium.
4. **Our Nigerian counsel**, for platform-level risk copy, disclaimers and the ToS changes.

Not the PM, not marketing, not toju-ai, not me.

### Mandatory risk disclosure — DRAFT, requires counsel

> **DRAFT — requires Nigerian securities counsel review before publication. Placeholders in
> brackets are to be completed from the issuer's own approved documents. Do not invent values.**

Persistent block on any investment surface:

> **This is an investment. You can lose money, including all of it.** Synapse is not your financial
> adviser, is not a party to this offering, and does not recommend it. Information here is supplied
> by [ISSUER NAME] and reproduced as provided. Past performance does not indicate future results.
> Returns are not guaranteed by anyone, including Synapse. These units may be difficult or
> impossible to sell quickly. Registration with the Securities and Exchange Commission is not
> approval, endorsement, or any assurance about returns, safety of capital, or the conduct of the
> issuer. Check the offering yourself on the Commission's public register before you commit money,
> and take independent professional advice.

Interstitial, on first entry to the category:

> Before you continue — Synapse shows investment offerings as information, not as recommendations.
> We do not assess whether an investment is right for you, and Toju will not either. Anything you
> see here is the issuer's own material. Take independent advice before you commit money.

Land-specific block: see §7.

---

## 5. Liability — including the "verified" question

### The exposure layers

1. **Securities-law and criminal exposure** for unregistered intermediation, unregistered
   advisory, or promoting an unregistered/prohibited scheme. Regulatory sanction, fines, market
   bans, and under the Ponzi provisions imprisonment. **Not disclaimable, and reaches directors
   personally.** This is the layer that should govern the decision.
2. **Misrepresentation and negligent misstatement.** A platform whose entire proposition is
   verification and trust assumes a duty of care it would not otherwise have. We have *marketed*
   ourselves into a higher standard than a neutral classifieds site.
3. **FCCPA consumer protection.** Misleading representations, unfair terms. Assume our
   liability cap does not hold against a consumer.
4. **Facilitation exposure.** If we channelled victims to a fraud with knowledge or recklessness —
   including "we didn't check because we said we don't check" — EFCC/advance-fee-fraud territory.
   Wilful blindness is not a defence in this space.
5. **Contamination of the existing product.** One fraudulent land scheme surfaced on Synapse
   damages the 560 verified homes, the agency relationships, and the verification brand
   simultaneously. That is the asymmetry: the upside is a new category, the downside is the
   company.

### Does "verified" near an investment offering increase exposure?

**Yes. Unambiguously, materially, and it is the single most dangerous word in this workstream.**
Four independent reasons:

1. **It creates reliance, and reliance is what converts "we hosted a listing" into "we induced the
   transaction."** Everything else in our defence depends on us being a venue, not an inducer.
2. **It imports a published definition that is objectively false here.** `terms.html:59` defines
   "Verified" as a seven-point check *including ground survey and structural assessment*. Applying
   that badge to a REIT unit means our own Terms of Service assert we surveyed the ground of a
   security. That is a misrepresentation on the face of our own documents, and it is trivially
   discoverable by anyone bringing a claim.
3. **In a securities context, a merit-signal from the platform edges toward implied endorsement**,
   which reopens §3 — an unregistered entity signalling that an offering is good.
4. **It destroys the neutral-venue defence** across the whole platform, not just the card it
   appears on.

**Proximity contaminates.** The risk is not only the chip on the investment card. It is also:

- the same browse grid rendering a homes "Verified" chip two cards away;
- any site-wide marketing claim of the form "every listing on Synapse is verified";
- Toju saying "everything I recommend is verified" while investment offerings are in scope;
- the homepage trust section, if it does not scope itself to homes.

**Therefore, before a single investment card exists anywhere in the product, every site-wide
verification claim — in `terms.html`, in marketing copy, in Toju's doctrine, on the landing page —
must be explicitly scoped to homes.** That is a prerequisite, not a follow-up. It is also, note,
work that is worth doing on its own merits.

---

## 6. Commission

**May we take a fee? Technically the question is open. My answer for v1 is: no.**

Taking payment from an issuer for placing its offering in front of investors is the textbook
hallmark of distribution. In substantially every securities regime it is the fact that converts
"publisher" into "intermediary", and it eliminates the editorial-content defence entirely.
Ranked by risk:

- **Worst:** success fees, per-investment fees, percentage of amounts raised, per-converted-lead
  fees. These are transaction-based compensation — the most regulated form there is.
- **Bad:** per-qualified-lead fees.
- **Least bad, still likely regulated:** a flat, fixed, periodic listing or subscription fee with
  no link to transaction volume or outcome, prominently disclosed, with zero influence on ordering
  or surfacing.

### The conflict problem, and a live contradiction in our own Terms

If Synapse is paid by an issuer *and* Toju surfaces or orders offerings, we have unlicensed advice
and conflicted advice at the same time. Worse, `terms.html:75` currently states, as a published
promise to users and agencies:

> Verification status ... is not for sale, and cannot be purchased, expedited by payment, or
> influenced by your subscription tier. Toju's recommendations rank purely on fit to a buyer's
> needs — never on payment.

A paid-placement investment category **contradicts a live published commitment.** If we ever
introduce issuer payments, that clause must change first, publicly, with notice — and changing it
is itself a trust cost worth counting before the revenue is booked.

**Recommendation: no fee of any kind on investment offerings in v1.** It converts an uncertain
regulatory position into a near-certain one, in exchange for revenue we have not sized. If the
category proves demand as a free education surface, monetisation can be designed properly, with
counsel, in a later phase.

---

## 7. Land-specific — what must be true before we may list a parcel

### Framework

Under the **Land Use Act 1978**, all land in a state is vested in the Governor; what is
transacted is a right of occupancy, and a transfer without the **Governor's consent** is at best
inchoate and at worst void. In Lagos the operative artefacts are the Certificate of Occupancy,
Governor's Consent on subsequent transfers, **excision and gazette** for family/community land,
a registered **survey plan**, and **charting** at the Office of the Surveyor-General to establish
acquisition status. Land under **committed acquisition** — reserved for roads, drainage, schools,
public purposes — cannot lawfully be sold to private buyers at all.

### Minimum preconditions to listing a parcel

Each must be evidenced by a document **we hold a copy of and have retained**, not by a seller's
assertion:

1. **Identified parcel** — a registered survey plan with coordinates. The thing being sold must be
   a specific piece of ground, not a marketing polygon on a brochure map.
2. **Charting result** from the Office of the Surveyor-General or a qualified surveyor, stating
   acquisition status: free / committed / gazetted excision / government-acquired. **Committed
   land is an absolute refusal.**
3. **Root of title chain** documented — C of O, Deed of Assignment/Sublease, or excision gazette
   reference — with registered instrument particulars.
4. **Seller identity and authority** — that the seller holds the title, or holds a registered power
   of attorney, or (for family land) is the family head acting with the consent of the principal
   members. Family-land defects are a classic void-transfer route.
5. **Governor's consent status**, stated as a fact: obtained / applied for / not obtained.
6. **Current, dated encumbrance search** at the relevant State Land Registry.
7. **Physical inspection** with geotagged evidence: the parcel exists, is locatable, is accessible,
   and matches the media.
8. **A dated legal opinion on title from a Nigerian legal practitioner, addressed to Synapse or to
   the buyer.** This is the one that actually matters. Items 1–7 are document collection; only a
   lawyer can characterise them. **A document-collection checklist run by non-lawyers is not a
   title check, and calling it one is precisely the failure mode we exist to prevent.**

### What we may and may not state

The governing principle: **never assert as our own conclusion something only the registry or the
government can confirm, and never present a seller-supplied document as an established fact.
Attribute and date everything.**

Permitted forms (structure only — bracketed placeholders to be filled from real documents):

> "Charting report dated [DATE], from [SOURCE], records this parcel as outside government
> acquisition."
> "Excision gazette reference [AS STATED ON THE DOCUMENT], supplied by the seller and sighted by
> Synapse on [DATE]. Synapse has not independently confirmed this at the issuing authority."
> "Governor's consent: not obtained as at [DATE]."
> "Not confirmed: prior unregistered sales. See what this check does not cover."

Forbidden, in any inflection:

> "Free from government acquisition." (unqualified, present tense, as our own assertion)
> "Excised and gazetted." (bare, unattributed, undated)
> "Verified title" · "genuine title" · "100% clean" · "C of O guaranteed" · "no acquisition issues"
> · "government-approved" · "litigation-free" · any tick, shield or green pill.

Sighting a document is not confirming it. Gazettes and survey plans are forged routinely, and the
forgeries are good.

### The fraud patterns, mapped to controls

| Pattern | Control | Honest limit we must publish |
|---|---|---|
| Land under government acquisition | Mandatory charting; refuse committed land; never publish acquisition status without a dated charting document | Charting is as at a date; government designations change |
| Same plot sold repeatedly | Require survey coordinates; cross-check coordinates against **every parcel ever listed on Synapse**; require registry search | **A registry search does not reliably detect prior *unregistered* sales — which is exactly how this fraud works.** We must say this to buyers plainly rather than imply the search covers it |
| No title at all | Refuse to list any parcel whose root of title we do not hold documents for | There is no "unverified" tier that makes this acceptable — see §8(d) |
| **Guaranteed buyback / promised ROI on land** (the pattern the scope doc omits) | Treat under §2 as a presumptive CIS. **Hard stop.** | This is the wrapper that turns a land listing into an unregistered scheme with criminal promoter liability |

The coordinate cross-check in row 2 is worth calling out as a genuine product opportunity: we can
at least detect double-selling *within our own inventory*, which nobody else in this market does,
and we can say exactly that — a narrow, true, verifiable claim, which is the kind Synapse should
be making.

**COUNSEL REQUIRED — flagged, not resolved.** Whether operating a platform that markets land
parcels in Lagos requires registration with the **Lagos State Real Estate Regulatory Authority
(LASRERA)**, and how that interacts with our existing homes business. I believe there is a live
registration requirement touching real-estate practitioners and platforms operating in Lagos, but
I am not confident of its current scope as applied to us, and I am not going to approximate it.
Put it to counsel in the same instruction as §1.

---

## 8. R-01 — ratification of the PM's four calls

### (a) Typed verification; homes semantics frozen; no new asset type renders the homes chip

**RATIFIED, and strengthened.** This is correct and it is the most important call in the scope doc.

Two amendments, both prerequisites rather than follow-ups:

- Typing the field in the database is not sufficient. The **published definition** at
  `terms.html:59` must be scoped to homes *before* any other asset type ships, or the Terms
  themselves make a false claim (§5, reason 2).
- Any **site-wide** verification claim — marketing, landing page, Toju's own self-description —
  must be scoped to homes too. Proximity contaminates (§5).

### (b) REITs: factual passthrough rather than verification

**RATIFIED as to direction — it is the right instinct and materially safer than extending the
verification brand. But it does not solve the problem the way the formulation implies, and it
creates a second problem. Both need fixing before it ships.**

**Problem 1 — "relayed, not performed" is a weaker distinction in law than in copy.** If we
publish a registration status and it is wrong or stale, we made a false statement to a retail
investor who relied on it, in a context we built to be relied upon. Dating it helps — it can be
true as at a date — but it does not discharge us, because we chose to publish it and a regulator
will ask what system kept it accurate. Required, if this ships:

- Source it **from the Commission's public register directly**, never from the issuer.
- Retain who checked, when, and a snapshot of what the register said.
- **A maximum staleness with a hard expiry** — I recommend monthly re-check, auto-hide on lapse,
  mirroring the 14-day homes discipline.
- An immediate takedown path if status changes or the SEC publishes a warning.
- **Never abbreviate it to a chip.** A chip is a badge and a badge is an endorsement. The moment
  "SEC-registered" becomes a green pill beside a name, users read it as Synapse's approval — which
  is exactly what (b) set out to avoid. It must render as a **dated, attributed sentence in body
  copy**, with a link to the register, in the same typographic register as ordinary text. No tick,
  no shield, no colour-coding, no chip shape.

**Problem 2 — this manufactures a new and more dangerous badge.** Registration is not approval.
The SEC registering a scheme does not endorse it, does not warrant returns, and does not vouch for
the manager's integrity. "SEC-registered" as our headline trust signal invites exactly the
inference that gets retail investors hurt, and it is a known fraud vector in its own right. The
passthrough sentence must therefore be **immediately paired with an explicit negation** in the
same visual block, not in a footnote:

> **DRAFT — requires counsel review.** "Registration with the Securities and Exchange Commission
> is a filing status, not approval or endorsement. It is not a view on the offering's merits, a
> guarantee of returns, or protection against loss."

**Problem 3, which (b) does not address and (d) gets wrong:** for a REIT or any CIS there is **no
unregistered tier.** Registered, or not listed (§2). The passthrough is not a confidence label
with a fallback state — its absence is a bar.

### (c) Land: a distinct, title-centric check, named as such

**RATIFIED as to structure. Overruled as to the naming instinct.**

- Yes: distinct check, title-centric, its own vocabulary, never the homes chip.
- **But do not use "verified" in any inflection, and do not use a tick, shield or green pill.**
  Call it a **Title Report** (or Title Check) and render it as a **record**: a date, a source, and
  an itemised list of what was confirmed *and what was not*, with the "not confirmed" rows shown
  at equal prominence.
- Showing the negatives is what makes it legally defensible, and it is also a real product
  differentiator in a market where every seller claims clean title. "Here is what we could not
  confirm" is a stronger trust signal than a tick, and it is the honest one.
- **The check must include the lawyer's opinion (§7 item 8).** Without it we have a checklist, not
  a title check, and naming a checklist a title check is the exact failure mode.

### (d) New asset types default to "unverified", rendered distinctly

**PARTIALLY OVERRULED.** Correct as a *rendering* principle; wrong as a *listing* principle.

- **For REITs/CIS:** there is no unverified state. Registration confirmed or not listed (§2).
- **For land:** a parcel with no documented root of title is not a lower-confidence listing — it is
  a listing we must refuse. **Absence of the check is a bar to listing, not a label.**
- **And "unverified" is the wrong word** for asset classes where we have just said we do not
  verify. It implies verification is pending and will arrive. Use language that describes the
  actual state: "No title report" · "Documents not provided" · "Registration not confirmed —
  this offering is not shown."

### Restated R-01 rule

> Verification is typed and never bare. Homes keep the seven-point check and its chip, and the
> published definition is scoped to homes before anything else ships. REITs get no check and no
> chip — a dated, attributed, expiring passthrough sentence, paired with an explicit
> "registration is not approval," and no passthrough means no listing. Land gets a Title Report:
> dated, itemised, showing what was not confirmed, including a lawyer's opinion, and no title file
> means no listing. No new asset type renders a tick, a shield, or the word "verified."

---

## 9. R-02 preview — sample data

The scope doc's §1.2 rule is right. I will go further:

**Recommendation: build no sample investment offerings at all.** Not fictional ones, not watermarked
ones. Use empty states, an explainer, and a waitlist. The safest sample dataset for a category
whose failure mode is indistinguishable from fraud is none.

If sample data is unavoidable for a demo:

- No registration-number-shaped strings **at all** — not even obviously fake ones. Any
  digit-and-slash pattern will be screenshotted and read as real.
- Names must be unmistakably fictional and self-labelling, e.g. a name that contains the words
  "sample" or "example" as part of the name itself, not appended.
- A persistent visual marker **inside the card bounds** that survives cropping, not a banner above
  the fold.
- No naira figures that look like plausible offering terms.
- **Never on any surface reachable without authentication**, and never in a marketing screenshot.

---

## 10. What to do instead — the buildable v1

A category that is genuinely on-brand, genuinely differentiated, and carries near-zero regulatory
load:

1. **Asset-class education.** What REITs are, how they work, how they are structured in Nigeria,
   what land banking is, what the real risks are. Zone A. Symmetric. No offerings.
2. **A "check it yourself" tool.** Walk a user through verifying a scheme on the Commission's
   public register, and a parcel through charting and a registry search. **We teach verification
   instead of asserting it** — which is a stronger version of the same brand promise, and it is
   the thing no competitor will build because it does not sell anything.
3. **A fraud-pattern explainer** — the three patterns in the scope doc plus the guaranteed-buyback
   wrapper, in plain language, with the questions to ask. This is a consumer-protection asset and
   a marketing asset simultaneously.
4. **Toju Zone A + refusal behaviour.** Toju explains, and declines warmly and usefully when asked
   to recommend. Draft refusal copy:

   > **DRAFT — requires counsel review; align with the Toju doctrine constant.**
   > "I can explain how these work, and I can show you exactly what to check — but I can't tell you
   > which investment to put your money in, or whether one suits your situation. That's regulated
   > advice, and I'm not licensed to give it; anyone who gives it to you casually isn't either.
   > What I can do is walk you through how to check a scheme's registration yourself, and what
   > questions to put to a licensed adviser. Want to start there?"

5. **A waitlist**, which sizes the demand that would justify the licence spend later.

This ships without SEC registration, without partner risk, and without touching the verification
brand — and it is a better first move commercially than a thin listing directory, because it makes
Synapse the place people go to *not get defrauded*, which is the actual proposition.

---

## 11. Gating conditions — before any real offering is listed

All ten, no partial credit:

1. Written opinion from Nigerian securities counsel on registration category, against a fixed fact
   pattern (§1).
2. Registration obtained, **or** a sponsoring-registered-operator arrangement papered with that
   operator accepting regulatory responsibility.
3. R-03 issuer due-diligence process live, with evidence retention and a named human sign-off.
4. SEC-register verification pipeline built, with staleness expiry and auto-hide (§2).
5. No issuer fee, or a counsel-cleared fee structure **and** the `terms.html:75` clause updated
   publicly first (§6).
6. Deterministic Toju controls in place — routing, allowlists, output classifier, logging, kill
   switch — not doctrine alone (§3).
7. ARCON pre-exposure posture established for all marketing (§4).
8. FCCPA-reviewed consumer risk copy published (§4).
9. Incident and takedown runbook, with a defined maximum time-to-removal.
10. Professional-indemnity insurance question raised with a broker — this is now an insurable-risk
    conversation, and the answer to "can we get cover for this" is itself informative.

---

## 12. Sequencing objection, recorded

The `LEGAL_TRUST_MEMO` Gate 1 items are still open: the demo privacy notice, the AI disclosure,
the published verification standard, the Anthropic sub-processor disclosure. The scope doc itself
records two live cases of the interface asserting untrue things.

**Adding a securities-distribution surface on top of an unclosed Gate 1 is the wrong order**, and
the scope doc's own §2 makes the point better than I can: a platform that recommends land
investments while its contact button lies is not a platform anyone should invest through. I am not
relitigating the founder's call on the category. I am recording that the Gate 1 items are now
*more* load-bearing, not less, and should not slip behind this.

---

## 13. Counsel instruction — what to brief, and to whom

**Two lawyers, not one.** A Nigerian **capital-markets/securities** lawyer, and a Nigerian
**real-estate/land** lawyer with Lagos registry practice. Do not use one for both.

**To the securities lawyer:**

1. On the fixed fact pattern (answers to §1's six questions), what SEC registration category does
   Synapse fall into, if any? Is a sponsoring-operator route available and what does it cost us in
   liability?
2. Does Toju's Zone B — mechanical, non-evaluative retrieval about a named offering — sit inside
   or outside the Digital (Robo) Advisory Services rules? Is there a defensible narrow carve-out,
   and what conditions would it need?
3. Confirm the CIS characterisation test we should apply to land products, and confirm that the
   presumptive-CIS screen in §2 is calibrated correctly.
4. Confirm promoter/advertiser liability exposure under ISA 2025 for a platform displaying an
   unregistered scheme, including director-level exposure.
5. What can be reproduced about an offering, and by whom must it be approved?
6. Fee structures: which, if any, do not trigger registration?

**To the land lawyer:**

7. Confirm and complete the §7 precondition list for Lagos, and whether it transfers to other
   states we may expand into.
8. LASRERA registration — does it apply to Synapse as a platform, for homes and for land?
9. Review the permitted/forbidden statement forms in §7, and settle the form of words for
   acquisition and excision status.
10. Confirm the title-opinion requirement and who may give it, and whether Synapse commissioning it
    creates a duty to the buyer.

**To both:** review §8's restated R-01 rule, and confirm that the "factual passthrough" posture is
the right one rather than a distinction without a difference.

---

## 14. Instructions to other agents, pending counsel

- **backend-developer** — do not design R-04 tables. The schema presupposes answers we do not have.
  What you *can* do now is the coordinate cross-check design for §7 row 2, and a generic
  evidence-retention table for verification artefacts, which is needed for homes regardless.
- **frontend-developer / ui-designer** — R-06 is blocked. What is unblocked and urgent: scoping
  every site-wide verification claim to homes (§5, §8a). That is prerequisite work for this
  category and independently correct.
- **toju-ai** — R-07/R-09 as scoped are blocked. What is unblocked: Zone A explainer capability,
  the four-trigger refusal test (§3), and the refusal copy at §10.4. Build the refusal before the
  capability.
- **digital-marketer / social-media-manager** — two live items: (i) ARCON pre-exposure approval
  applies to social and influencer content **now**, not just to this category (§4); (ii) no copy
  may imply Synapse verifies, vets, endorses or recommends any investment, and any "every listing
  is verified" claim must be scoped to homes before an investment surface exists anywhere.
- **PM** — R-01 is answered at §8, with (b) ratified-with-conditions and (d) partially overruled.
  R-02 is previewed at §9 with a recommendation of no sample data at all. R-03 cannot be completed
  until counsel returns on §1 and §2.

---

_End of memo body. Draft language only; a licensed Nigerian lawyer must review before publication
or reliance. The recommendation against the workstream in its current shape is not a
recommendation against the category — §10 is a real product and I would start it this week. It is
a recommendation against being an unregistered distribution channel for securities on a platform
whose only asset is being trusted._

---
---

# APPENDIX A — The homes verification badge is not evidenced

**Added:** 31 July 2026, after delivery of the memo body · **Trigger:** product-manager's direct
query of the live database (project `bhrhejpekmhbhwryjhgk`), reported mid-flight and not
incorporated above.

**Priority: this appendix outranks the entire memo body.** It concerns a claim live to users on
560 listings today, not a category that does not exist yet. If only one thing in this document is
acted on, it is this.

## A.0 What I verified, and what I am taking on trust

I do not have database access in this session and **could not independently run the queries.** I
am relying on the product-manager's reported results. I did corroborate them in-repo: the same
findings are recorded independently at `docs/design-trends-2026-delegation.md:150-189`. Two
independent reports agreeing is good, but both trace to the same query session — **someone should
re-run these against the live database and retain the output** before remediation is scoped, because
every recommendation below depends on them.

Findings taken as established:

- `properties` has **no verification timestamp column**. Only `verification_status` (enum) and
  `verification_nodes` (jsonb).
- `verification_nodes` on all 560 verified rows is `{name, status} × 7` — a pass/fail flag with
  **no date, no verifier identity, no evidence reference**.
- `property_verifications`, `property_verification_history`, `property_verification_checks` —
  **all zero rows**.
- The 14-day rule is implemented against **`listed_at`** — a listing date, not a verification date,
  because the correct column does not exist. Only 104 of 560 fall within 14 days.
- Stored check names (Title, Survey, Structure, Flood, Legal, Area, Financial) **do not match** the
  seven published at `terms.html:59` (title documentation, ground survey, structural assessment,
  flood risk, ownership documentation, legal review, media accuracy).

## A.1 Two further findings, not in the PM's message

### A.1.1 The extension has already shipped in copy — `index.html:235`

This is the most urgent single line in the product:

> "Buy a home outright, put money into land banking, or hold a REIT — same seven checks, same
> 14-day rule, whichever way you invest."

**This is live landing-page copy asserting that the seven-point homes check — which by our own
published definition includes a ground survey and a structural assessment — applies to REITs and
land banking.** Every conclusion in §5 and §8 of the memo body about not extending the verification
brand over instruments we cannot audit is not a forward-looking recommendation. It describes
something that already happened, in marketing, before the category exists, before R-00 was
commissioned, and against zero REIT or land inventory.

It is false in three independent ways at once: there are no REIT or land-banking listings; the
seven checks are not applicable to a security; and per A.0 the seven checks are not evidenced even
for homes. It is also the precise claim that §5 identifies as maximally liability-increasing.

**Recommendation: remove this sentence today.** Not rewrite, not qualify — remove. It is not a
remediation item, it is a correction of an untrue published statement. (I have not edited it: the
deliverable constraint on this task is memo-only, no application files. Someone with the mandate
should action it.)

### A.1.2 `index.html:70` — the in-person claim

> "Toju only ever recommends homes someone has checked in person — and confirmed still available in
> the last 14 days."

"Only ever" plus "in person" is unconditional and, on the A.0 findings, unevidenced. Already
flagged at `docs/CONSENT_AND_DISCLOSURE_COPY.md:340`; re-flagged here because it is the same defect
class and should be remediated in the same pass.

## A.2 The pivotal question I cannot answer — and it changes everything below

**Were the seven checks actually performed on these 560 properties, or is `verification_status`
seeded data?**

This is not a rhetorical question and the answer determines whether this is a documentation problem
or a truthfulness problem:

- **If the checks were genuinely performed** and we merely failed to record when, by whom, and
  against what evidence — this is an **evidential defect**. The badge is probably substantively
  true and indefensible if challenged. Remediation is A.4.
- **If `verification_status = verified` was set by a seeding script** — then the badge is a **false
  statement of fact made to consumers, 560 times, on a live product**, and remediation is not
  "improve the audit trail." It is: stop making the claim, immediately, and treat everything
  downstream as a disclosure incident.

**I have to flag that the available signals point toward the second.** The project memory records
the database as *seeded* ("DB seeded with 120 verified listings", "twin_seed*.sql are idempotent
set-based seeds"), and a genuine verification desk that had run 560 × 7 = 3,920 checks would have
left rows somewhere — the three purpose-built tables for exactly that evidence are empty. Seven
uniform booleans with no metadata is the signature of generated data, not of operational work.

I am not asserting it. I am saying **this must be answered, by a human who knows how those rows
came to exist, before anything else in this appendix is scoped**, and that an honest answer is more
valuable than a convenient one. If they are seeded, the correct posture is that the platform has
been making an untrue trust claim and should say so plainly and fix it — which is survivable now
and is not survivable after a user relies on it in a transaction.

## A.3 Q1 — Does the current evidential state support the "Verified" chip as displayed?

**No. Not as `terms.html:59` defines it.** Separate the two questions, because they have different
answers and different fixes:

**(i) Is the badge substantively true?** Unknown — see A.2. That is itself the problem: we cannot
tell from our own systems whether our own flagship claim is true.

**(ii) Is the published definition deliverable?** **No, and this part is certain.** `terms.html:59`
makes four promises and we can currently keep one and a half:

| Published promise | Deliverable? |
|---|---|
| "passed our seven-point check" | Partially — seven flags exist, but the *named* checks do not match the stored ones, in both directions |
| "title documentation, ground survey, structural assessment, flood risk, ownership documentation, legal review, media accuracy" | **No** — stored set is Title, Survey, Structure, Flood, Legal, Area, Financial. We publish two checks that do not exist in data (ownership documentation, media accuracy) and hold two that are not published (Area, Financial) |
| "as of the date shown" | **No** — there is no date, on any of the 560. There is no column for one |
| "re-confirmed at least every 14 days or it is removed" | **No** — unrecordable, unevidenceable, and unenforceable. The proving table is empty. The implemented rule runs off `listed_at`, and 456 of 560 fall outside it |

A published claim we cannot substantiate from our own records is a claim we lose on, regardless of
whether it happens to be true.

### Minimum that must change, and in what order

The instinct will be to fix the data model first (weeks) or pull the chip (nuclear). Both are
wrong as a *first* move. **Fix the claim first — it is the thing that is false, and it is the only
lever that costs nothing and can move today.**

**Step 0 — today, hours.** Remove `index.html:235` (A.1.1). Answer A.2. These are not sequenced
behind anything.

**Step 1 — this week. Amend the published definition to describe what we can actually evidence.**
Draft below. This is cheap, entirely within our control, and converts a false claim into a true
narrower one. Publish with an updated date.

**Step 2 — this week. Align the chip, tooltip and all marketing to the amended definition**,
including `index.html:70`, `docs/GTM_BUYER_POSITIONING.md`, `docs/CONTENT_CALENDAR.md` and
`app/syndication.js:69` (which repeats the seven-check + 14-day claim in agency-facing social copy
we generate *on agencies' behalf* — meaning we are currently authoring an unevidenced claim for
third parties to publish under their own names, which adds their exposure to ours).

**Step 3 — weeks. The data model.** `verified_at`, `verified_by`, evidence reference, and a real
history table. Then re-verify forward.

> **Explicit prohibition, and I want this on the record: do not backfill verification timestamps.**
> Populating `verified_at` with `listed_at`, with `created_at`, or with any inferred or generated
> date in order to make the published claim retroactively true is **falsification of records**. It
> converts a disclosure problem into a deliberate one, it is the version of this that ends the
> company if it ever surfaces, and it would be discoverable in any dispute. Rows whose verification
> evidence cannot be genuinely reconstructed get **re-verified or downgraded** — never dated.

**Step 4 — policy decision.** What happens to the 560, and specifically the 456 outside the
14-day window, whose evidence cannot be reconstructed. Options in descending honesty: re-verify
them; downgrade to an accurate lower state; hide. This is a founder decision with a real inventory
cost, and it should be made knowing the cost, not avoided by leaving the badge up.

**Step 5 — only then** may a stronger published claim be restored, and only to the extent the
system can then prove it.

### DRAFT replacement for `terms.html:59` — requires counsel review

> **DRAFT. Not for publication without Nigerian counsel review. Written to be narrower than the
> truth rather than wider, and to be amended upward once the evidence system exists. Bracketed
> items must be completed with the real stored check names once A.2 is answered.**

> **What "Verified" means.** A "Verified" listing has been recorded in our system as having passed
> Synapse's seven checks — [STORED CHECK NAMES, EXACTLY AS HELD]. Listings expire from Synapse 14
> days after they are listed unless the agency re-lists them, so what you see is recent.
>
> **What it does not mean, and what we are still building.** Verified is a process record, not a
> guarantee: it does not warrant the property's condition, title, price, or the outcome of any
> transaction. We do not currently display the date on which each check was performed, or the name
> of who performed it — we are building that, and until it is live you should treat the check as a
> record that it passed rather than as evidence of when. Always instruct your own lawyer to conduct
> an independent title search, and inspect the property yourself, before you pay anything.

The second paragraph will read as a commercial step backwards. It is the strongest thing in the
document. "Here is what we cannot yet show you" from a platform whose competitors claim everything
is the most credible sentence Synapse can publish, and it is the same principle as the Title Report
design at §8(c) — showing the not-confirmed rows is what makes the confirmed ones believable.

## A.4 Q2 — Exposure from an unevidenceable published commitment

Consumer, not securities. Layers, in order of realistic bite:

1. **FCCPA / FCCPC — misleading representation.** The claim is specific, verifiable, published, and
   **material to the transaction** — our own positioning says verification is the reason to trust
   listings, so there is no puffery defence available. "Re-confirmed at least every 14 days or it is
   removed" is a factual commitment about our own conduct, and 456 of 560 sit outside the window on
   the only date field that exists. The FCCPC does not need a complainant to act.
2. **The evidential asymmetry, which is the practical exposure.** In any dispute — regulator,
   consumer, or an agency — **the burden of showing the check happened is ours, and the record is
   empty.** We would be unable to defend a claim that is quite possibly true. That is the worst
   posture to be in: exposed to a loss we did not earn.
3. **Misrepresentation / negligent misstatement**, if a user relies on the badge and is harmed.
   Reliance is easy to establish here because we designed the product to induce it.
4. **Agency-facing contractual exposure.** Agencies are told verification is not for sale and the
   14-day rule is enforced (`terms.html:75-76`). If it is not enforced, paying agencies have a
   complaint, and `app/syndication.js:69` means we drafted the unevidenced claim into copy they
   publish under their own names — spreading our defect onto counterparties who did not choose it.
5. **ARCON (§4).** Marketing that repeats an unevidenced claim compounds an existing advertising
   compliance gap.
6. **Reputational, and asymmetric.** "Property platform's verification badge was seeded" is a
   single-sentence story that removes the company's entire proposition. It is not proportionate to
   the underlying wrong, which is why it must be fixed while it is still voluntary.

**One protective observation:** everything above is dramatically cheaper to fix *before* a user
relies on the badge in a real transaction than after. Right now this is a copy amendment and a
schema migration. That window is open and it closes on its own.

## A.5 Q3 — Does the memo body's reasoning change?

**Yes, in three places. The PM is right on the substance, and I am amending accordingly.**

### A.5.1 "Mirror the 14-day homes discipline" — WITHDRAWN

§2 and §8(b) both anchor the REIT registration re-check to "the 14-day homes discipline." **That
cross-reference is withdrawn.** I was pointing at a discipline that exists as published copy, not
as a mechanism. Anchoring a securities-facing control to it would have propagated the defect into
the higher-liability domain — exactly the failure mode the memo warns about elsewhere.

The *substance* of the REIT passthrough spec survives intact and needs no change: source from the
register, retain who checked and when, snapshot the register response, hard expiry, auto-hide on
lapse. That was already specified self-standingly. Only the analogy dies.

**And the direction of the analogy now reverses.** The REIT passthrough spec in §8(b) is a correct
description of what a verification record should look like. **The homes badge should be rebuilt to
that standard**, not the other way round. That is a useful, non-obvious outcome: R-00 has produced
the specification that fixes the pre-existing product.

### A.5.2 The §5 contagion argument — partially inverts, and I accept the PM's framing

I argued that investment offerings would contaminate a sound homes badge. That was wrong about the
premise. Three directions of risk now, all live:

- **Original (still true, unchanged):** proximity contaminates. A homes chip two cards away, and
  the `terms.html:59` definition, still get imported onto an investment card. §5 stands on its own.
- **Inverted (now dominant, and the PM identified it):** the badge cannot survive scrutiny, and the
  proposal is to extend that practice into a domain with **criminal** liability attached. An
  unevidenced verification habit applied to securities is not a trust problem, it is a §2 promoter
  problem. Whatever process produced 560 undated booleans would, applied to a land scheme, produce
  a verified-looking listing for a parcel nobody charted.
- **Third, worse than both, and already true:** per A.1.1 the extension **has already been made in
  marketing copy**, with no offerings, no checks and no legal review. The contagion is not a
  scenario to prevent; it is a live statement to remove.

### A.5.3 §8(a) hardens

§8(a) said: scope the published definition to homes before any new asset type ships. That is now
**necessary but not sufficient**, because the homes definition is not itself deliverable. Revised:

> **Fix the homes definition so it is true. Then scope it to homes. Only then consider a second
> asset class.** Scoping a false claim more narrowly leaves a false claim.

## A.6 Ranking — explicit, as requested

**Yes: the existing homes verification claim needs remediation ahead of anything REIT-related, and
I am placing it above every investment question in this document.** The homes badge is live to
users now; the investment category does not exist. A regulator, a journalist or a plaintiff reaches
the first with no effort and cannot reach the second at all.

| Rank | Item | Owner | Horizon |
|---|---|---|---|
| **P0** | Remove `index.html:235` — the seven-checks/14-day claim extended to REITs and land banking (A.1.1) | FE + PM | Today |
| **P0** | Answer A.2: were the 560 checks performed, or seeded? Retain the answer in writing | Founder / whoever knows | Today |
| **P0** | Re-run the A.0 queries and retain the output as the baseline record | BE | Today |
| **P1** | Amend `terms.html:59` to what we can evidence (A.3 draft) + counsel review | Legal + counsel | This week |
| **P1** | Align chip, tooltip, `index.html:70`, GTM/content docs, `app/syndication.js:69` to the amended definition | FE + marketing | This week |
| **P1** | Resolve the check-name mismatch in both directions | PM + BE | This week |
| **P2** | Data model: `verified_at`, `verified_by`, evidence ref, history table. **No backfilled dates** | BE | Weeks |
| **P2** | Policy on the 560 / the 456: re-verify, downgrade, or hide | Founder | Weeks |
| **P3** | `LEGAL_TRUST_MEMO` Gate 1 items (still open) | Legal | Weeks |
| **P4** | Everything in the memo body — §10 education v1 | — | After P0–P2 |
| **P5** | Anything involving a real investment offering | — | After counsel (§13) |

**If P0 and P1 are not done, P4 and P5 should not start at all.** A platform proposing to list
SEC-regulated securities behind a verification proposition it cannot evidence for its existing
inventory is not a platform that should be adding asset classes. That is a stronger version of the
sequencing objection at §12, and I am upgrading §12 from an objection to a condition.

## A.7 What this does not change

The memo body's securities analysis is unaffected: §1 (intermediary status), §2 (CIS), §3 (Toju and
the robo-advisory regime), §4 (approvals), §6 (commission), §7 (land preconditions) and §13
(counsel brief) all stand as written. The recommendation against the workstream in its current
shape stands, and is now stronger, for an additional and independent reason: **the practice being
extended is not sound in its original domain.**

The one genuinely good thing here: this was found before a user relied on it, and it was found by
querying our own database rather than by being told. Both the correction pattern and the finding
are the system working. The response should match — fix the claim in public, at cost, rather than
narrowing it quietly.

---

_End of Appendix A. Same standing caveat: draft language only, counsel review required before
publication. A.2 is unanswered and everything in A.3 onward is contingent on it._
