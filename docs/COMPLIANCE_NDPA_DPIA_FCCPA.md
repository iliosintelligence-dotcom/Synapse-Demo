# Synapse — Compliance Review: NDPA 2023 / GAID 2025, DPIA, and FCCPA 2018

**Prepared:** 19 September 2026 · **Prepared by:** the legal/compliance agent, from a direct read of the
Synapse and synapse-platform repositories · **Status:** working document for the team

---

> ## ⚠ STANDING CAVEAT — READ BEFORE RELYING ON ANY LINE BELOW
>
> **This is a structured starting point prepared for the Synapse team. It is not legal advice and it is
> not a substitute for advice from a Nigerian-qualified lawyer.** I am not a lawyer. Nothing here has
> been reviewed by counsel, no draft language here may be published or relied on as-is, and no filing
> with the NDPC or the FCCPC should be made on the strength of this document alone.
>
> **On pin cites specifically.** Section and article numbers are given from working knowledge so counsel
> can find the provision quickly. Each cite carries a confidence marker: **[✓]** I am confident of the
> substance *and* the number; **[~]** I am confident of the substance, the number needs checking against
> the gazetted text; **[?]** I am describing a requirement I believe exists but cannot place precisely.
> **Every number in this document must be verified against the gazetted NDPA 2023, the GAID 2025 as
> published by the NDPC, and the FCCPA 2018 before it appears in anything external.** The *substance* is
> what I stand behind; the numbering is a convenience.
>
> I have over-flagged on purpose. Where I could not tell from the code whether something was a problem,
> I have marked it **UNKNOWN** rather than assuming it is fine.

---

## Contents

1. [Facts and decisions I need from Eden](#1-facts-and-decisions-i-need-from-eden)
2. [The register — everything we need to watch out for](#2-the-register--everything-we-need-to-watch-out-for)
3. [Data inventory / ROPA](#3-data-inventory--ropa)
4. [DPIA — is one mandatory, and the DPIA itself](#4-dpia)
5. [Cross-border transfer analysis](#5-cross-border-transfer-analysis)
6. [Concrete recommendations to the app](#6-concrete-recommendations-to-the-app)
7. [Gap list for privacy.html and terms.html](#7-gap-list-for-privacyhtml-and-termshtml)
8. [Priority ordering](#8-priority-ordering)
9. [Status counts and uncertainty register](#9-status-counts-and-uncertainty-register)

---

## 0. The regulatory frame, in one page

**Nigeria Data Protection Act 2023 (NDPA).** Nigeria's primary data protection statute, administered by
the **Nigeria Data Protection Commission (NDPC)**. It repealed the NDPR's parent instrument's standing in
part but the NDPR 2019 and its Implementation Framework still supply operational colour where the Act is
silent. The Act applies to processing carried out in Nigeria, and to processing of the personal data of
data subjects in Nigeria by a controller or processor **not** in Nigeria **[✓ — NDPA s.2, application]**.
Synapse is a **data controller**. Supabase, Anthropic, Twilio, Paystack, trypost, Cloudinary and the map
providers are **data processors or third-party controllers** depending on the relationship.

**General Application and Implementation Directive 2025 (GAID).** Issued by the NDPC on **20 March 2025**,
effective **19 September 2025** — i.e. it has been in force for a year as at the date of this document.
GAID operationalises the Act: registration of Data Controllers and Processors of Major Importance
(DCPMI), compliance audit returns, DPO requirements, breach notification mechanics, DPIA circumstances,
and cross-border transfer machinery. **The entry threshold for DCPMI status is processing the personal
data of more than 200 data subjects in any six-month period**, with tiered sub-categories (Ordinary High
Level, Extra High Level, Ultra High Level) driven by volume and sector **[~ — GAID Schedules; the
sub-category bands and fees must be read off the current NDPC schedule, they have moved before]**.

**Federal Competition and Consumer Protection Act 2018 (FCCPA).** Administered by the FCCPC. It applies to
all undertakings and commercial activities in Nigeria, and it **overrides other laws in matters of
competition and consumer protection** **[~ — FCCPA s.104]**. Relevant here: the right to information in
plain and understandable language, disclosure of price, the prohibition on false, misleading or deceptive
representations, unfair/unjust contract terms, the right to cancel advance reservations and bookings,
implied warranties, and sales records.

**Three adjacent regimes that this review touches but does not resolve** — flagged because they are
Nigerian-specific and easy to walk into:

- **ESVARBON** (Estate Surveyors and Valuers Registration Board of Nigeria). Valuation is a statutorily
  registered activity. Tayo producing price opinions ("₦12M below the area median", "8.4% yield") sits
  uncomfortably close. See **L1**.
- **LASRERA** and equivalent state schemes. Lagos requires registration of real-estate practitioners. Does
  a platform that verifies, ranks and negotiates fall inside? See **L2**.
- **SCUML / MLPA 2022.** Real-estate businesses are Designated Non-Financial Institutions. Synapse says it
  is not an agency; the Tayo-negotiator feature strains that. See **L3**.

---

## 1. Facts and decisions I need from Eden

These are the things the code cannot tell me. Each one changes the answer to at least one obligation below.
**I have not assumed any of them.**

| # | Needs a decision/fact from Eden | Why it matters | Blocks |
|---|---|---|---|
| **F1** | **Is there a registered Nigerian entity?** CAC registration number, registered name, registered address. | Every transparency obligation requires naming the controller. `privacy.html` and `terms.html` both carry `[NEEDS LEGAL: registered company name]` placeholders. Without an entity, the controller is **you personally**, which is a materially worse liability position. | A1, D1, and the whole of §7 |
| **F2** | **Have we filed anything with the NDPC?** Registration as a DCPMI, any Compliance Audit Return, any DPO designation. | Determines whether A2/A3 are "gap" or "compliant". I have found no evidence of a filing anywhere in either repo. | A2, A3, A4 |
| **F3** | **Have we appointed a DPO, or engaged a licensed DPCO?** | GAID requires a designated DPO for DCPMI and the NDPC maintains a database of certified DPOs. `privacy.html` mentions a DPO twice — both times as a placeholder. | A4, B1 |
| **F4** | **Real data volumes.** How many distinct real (non-synthetic) data subjects have been processed in the last six months? Consumers, agents, agency staff, and anonymous `demo_chat_sessions` visitors counted separately. | The >200-in-six-months threshold is the DCPMI trigger. The seeded digital twin (24+ consumer profiles, 36 agent profiles, 29 agencies, 507 listings) is synthetic and should **not** be counted — but anonymous chat visitors probably should, and they are the population most likely to have crossed 200. | A2, and the DCPMI tier |
| **F5** | **Is the product live to the public, or still a prototype?** Is `synapsecore.dev` reachable, indexed, and being linked from real social posts? | Determines whether obligations are already live or are pre-launch. The short-link service, the `/tayo` bio link and the Meta syndication path all imply real public traffic. If real members of the public have chatted with Tayo, the duties are live **now**. | Everything |
| **F6** | **Supabase region, confirmed.** The brief says `us-east-1`; I could not confirm it from the repo. Also: which storage buckets, and is Cloudinary in use? | Cross-border analysis, §5. `property_media.cloudinary_public_id` and `documents.cloudinary_public_id` are NOT NULL in schema, implying Cloudinary is or was a processor — it is named nowhere in the privacy policy. | H1, G2 |
| **F7** | **What is our contract with Anthropic?** Commercial terms, zero-retention posture, training exclusion, DPA in place? | `privacy.html` states "We do not use your conversations to train a public AI model." That is a statement about a third party's behaviour and needs contractual backing. | G1, H2, P20 |
| **F8** | **Twilio: configured or not?** `create-lead` says it currently is not. Is a Twilio account provisioned, and in which region? | If Twilio is live, buyer name + phone + budget are crossing the border to a processor named nowhere in the policy. | G2, H3 |
| **F9** | **Is Paystack live, and on which entity's account?** Have agencies actually been charged? | `subscription_payments` is real and `paystack-webhook` is deployed. Live payments trigger FCCPA pricing, refund and receipt duties (K4–K7) and VAT questions. | K4–K7 |
| **F10** | **What does the verification desk physically do?** Is there a human, is there a site visit, what evidence is retained? | The published seven-check warranty is only defensible if the process matches it. Migration `0099` notes **0 of 507 listings verified**, and that a platform admin can flip the flag directly with no evidence row. | K1, K2, T-I |
| **F11** | **Do we intend to keep the "Gold" tier?** | "Gold" appears 20 times across `app/` and is defined nowhere. Two separate tier vocabularies exist in the schema (`verification_tier`: unverified/basic/verified/gold; `agency_verification_tier`: unverified/basic_verified/business_verified/enhanced_verified/synapse_certified). | K3, T-J |
| **F12** | **Which jurisdictions is international expansion aiming at, and when?** | If the EU/UK is in scope, GDPR applies to EU data subjects and the transfer analysis inverts (Nigeria is not an adequate country for EU purposes). If ECOWAS/Ghana/Kenya, different regimes. | H5, and forward-compatibility of every consent string |
| **F13** | **Retention appetite.** How long do we actually want to keep chat transcripts, location points, attribution touches? | I have proposed defaults in §6.5. They are proposals, not decisions. | J1–J5 |
| **F14** | **Are we willing to be a controller-to-controller discloser to agencies, or do we want agencies to be processors?** | Changes the agency agreement completely, and changes what consent we need at the handoff. My recommendation is independent controller (§6.4), but it is a commercial decision. | C6, G4, T-N |
| **F15** | **Insurance.** Any professional indemnity or cyber cover? | Affects how aggressively we need to cap liability in the ToS, and the residual-risk acceptance in the DPIA. | DPIA sign-off |

---

## 2. The register — everything we need to watch out for

**Status vocabulary**

| Status | Meaning |
|---|---|
| **COMPLIANT** | Implemented, and I could see it in the code or documents. |
| **PARTIAL** | Something exists but does not meet the obligation. |
| **GAP** | Nothing exists. |
| **UNKNOWN** | The code does not tell me, and it turns on a fact in §1. |
| **NOT YET** | Obligation not triggered today, but will be by a feature already in the schema. |

---

### A. Entity, registration and filings

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **A1** | Identify the data controller by registered name and address in every notice | Any processing | NDPA s.24 transparency **[~]**; GAID transparency article **[?]** | **UNKNOWN** (F1) | Incorporate, then replace both `[NEEDS LEGAL: registered company name]` placeholders in `privacy.html` (2 occurrences, mobile + desktop blocks) |
| **A2** | Register with the NDPC as a Data Controller of Major Importance | >200 data subjects in any 6-month period, or operating in a designated sector | NDPA s.44 **[~]**; GAID registration articles + Schedule **[~]** | **UNKNOWN → likely GAP** (F2, F4) | Count real data subjects; if over 200, register and pay the tier fee. **This is a hard legal deadline once crossed, not a roadmap item.** |
| **A3** | File the annual Compliance Audit Return (CAR) | DCPMI status in the UHL/EHL categories | GAID CAR articles **[~]** | **UNKNOWN** (F2) | Confirm category; diarise the annual filing date — historically mid-March under the NDPR regime, **verify the GAID date with counsel** |
| **A4** | Designate a Data Protection Officer | DCPMI status; also where core activities involve regular and systematic monitoring on a large scale | NDPA s.32 **[~]**; GAID DPO articles **[~]** | **GAP** (F3) | Appoint an individual (may be an external DPCO), notify the NDPC, publish name and contact in `privacy.html` |
| **A5** | Keep evidence of the controller/processor relationship with every processor (a written contract meeting statutory minimums) | Engaging any processor | NDPA s.29 **[~]** | **GAP** | Signed DPAs with Supabase, Anthropic, Twilio, Paystack, trypost, Cloudinary, Stadia Maps. Standard DPAs exist for most of these — they need to be accepted and filed, not drafted |
| **A6** | Maintain a record of processing activities (ROPA) | Any controller; expressly expected of DCPMI | GAID **[?]** / accountability principle NDPA s.24(2) **[~]** | **PARTIAL** | §3 below is the first version. It needs an owner and a review cadence, and must live as `docs/ROPA.md` |

---

### B. Governance and accountability

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **B1** | Accountability: be able to *demonstrate* compliance, not merely assert it | Always | NDPA s.24(2) **[~]** | **PARTIAL** | The repo's commit discipline and migration comments are unusually good evidence and should be cited as such. What is missing is a consent ledger (C7), a ROPA owner, and DPIA sign-off |
| **B2** | Data protection by design and by default | Every new feature | NDPA s.24 **[~]** / GAID **[?]** | **PARTIAL** | Genuinely strong in places — `click_events` deliberately stores no IP and no user-agent; `proximity-report` rounds the fix to ~100m before it touches the database; `agency-advisor` states that no buyer personal details reach the model. Weak in others — `consumer_profiles` collects income, marital status, children and dependants with no stated purpose limitation. Needs to become a gate in the feature process, not a habit |
| **B3** | Staff/contractor confidentiality and access control | Any person with access | NDPA s.30 **[~]** | **UNKNOWN** | Who holds the `SUPABASE_SERVICE_ROLE_KEY` and the `ANTHROPIC_API_KEY`? Who are the 2 `platform_admin` accounts? Document it |
| **B4** | Privileged-access logging for sensitive reads | Admin access to financial/personal data | Accountability **[~]** | **PARTIAL** | `financial_admin_access_log` (migration 0023) exists and `0030` puts RLS on it — good pattern. It covers only the financial tables. Verification-desk reads of `documents` (which holds `directors_id` and `bank_statement`) are not logged |
| **B5** | Incident response plan with named roles | Before any breach | NDPA s.40 **[~]** | **GAP** | A one-page runbook: who declares, who assesses risk, who notifies NDPC within 72h, who drafts the data-subject notice, where the register lives |
| **B6** | Breach register (all breaches, including those not notified) | Any breach | GAID **[?]** | **GAP** | A table or a document. Must record breaches judged non-notifiable and *why* |
| **B7** | Periodic compliance review / internal audit | DCPMI | GAID CAR **[~]** | **GAP** | Falls out of A3 |
| **B8** | Vendor/sub-processor change control | Adding any new processor | NDPA s.29 **[~]** | **GAP** | A rule: no new third party receives personal data without (a) a DPA, (b) a line in the privacy policy, (c) a row in the ROPA. `trypost` and Cloudinary both got in without any of the three |

---

### C. Lawful basis and consent

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **C1** | Identify and record a lawful basis for **each** processing purpose | All processing | NDPA s.25 **[~]** — consent, contract, legal obligation, vital interests, public interest/official authority, legitimate interests | **GAP** | `privacy.html` states no lawful basis anywhere. §3 assigns a proposed basis per table — counsel must confirm each |
| **C2** | Consent must be freely given, specific, informed and unambiguous, by a clear affirmative act | Wherever consent is the basis | NDPA s.26 **[~]** | **GAP** | There is **no consent mechanic anywhere in the product**. `app/signin.html` contains no terms checkbox, no privacy link and no consent capture — a grep for `agree|terms|privacy|consent` in that file returns nothing |
| **C3** | Consent must be as easy to withdraw as to give | Consent-based processing | NDPA s.27 **[~]** | **GAP** | No withdrawal control exists for any purpose. Proximity has an off-switch (good) but that stops future collection, it does not withdraw consent to what is held |
| **C4** | No bundling — separate consent per purpose | Multiple purposes | NDPA s.26 **[~]** | **GAP** | See §6.3 for the four proposed toggles |
| **C5** | Sensitive personal data needs a stronger condition | Processing sensitive data | NDPA s.30 **[~]**; definitions at s.65 **[~]** | **PARTIAL / UNDER-APPRECIATED** | `consumer_places.kind` accepts `'worship'` — a place of worship reveals **religious belief**, which is sensitive personal data. Free-text Tayo transcripts routinely capture health, household and financial circumstances. Nothing in the product treats any of it as sensitive |
| **C6** | Disclosure to a third party needs its own basis and its own notice | Lead handoff to an agency | NDPA s.24, s.25 **[~]** | **GAP** | `toju.html` `handOff()` calls `create-lead` with no consent sheet and no disclosure of what is sent. Tayo then says *"They have what we talked about"* — which over-states in one direction and under-states in the other |
| **C7** | Be able to demonstrate that consent was given, for what, and when | Consent-based processing | NDPA s.26 **[~]** | **GAP** | A `consent_events` table (§6.3). `financial_consent_grants` is exactly the right pattern and already exists for financial scores — generalise it |
| **C8** | Children's data: parental consent, age assurance | Any data subject under 18 | NDPA s.31 **[~]** | **GAP** | No age gate at sign-up, no minimum-age term, no statement in the privacy policy. Low likelihood in a property product but a cheap fix |

---

### D. Transparency

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **D1** | Privacy information given **at the point of collection** | Any collection | NDPA s.27 **[~]** | **GAP** | **No page under `Synapse/app/` links to `privacy.html` or `terms.html`.** Verified by grep: the only matches in `app/` are code comments. Collection begins at `app/toju.html` and `app/signin.html`; neither shows or links a notice |
| **D2** | The notice must state: identity, purposes, lawful basis, recipients, transfers, retention, rights, complaint route | Any collection | NDPA s.27 **[~]** | **PARTIAL** | `privacy.html` covers purposes and recipients reasonably. It is missing lawful basis, retention, transfers (placeholder only), half the rights, and the NDPC complaint route entirely |
| **D3** | Name the supervisory authority and the right to complain to it | Any notice | NDPA s.27, s.46 **[~]** | **GAP** | **`privacy.html` mentions the NDPA four times and a DPO twice but never mentions the NDPC.** A data subject reading it cannot find out who to complain to |
| **D4** | Notice must be in clear, plain language | Any notice | NDPA s.27 **[~]**; FCCPA s.114 **[~]** | **COMPLIANT** | The plain-language register in both documents is genuinely good and should be preserved through the rewrite |
| **D5** | Disclose automated decision-making and profiling, with meaningful information about the logic | Profiling exists | NDPA s.37 **[~]** | **GAP** | Lead scoring, property matching, trust scores and financial identity scores are disclosed nowhere |
| **D6** | Notice must be versioned, dated, and material changes notified | Any notice | NDPA s.27 **[~]**; FCCPA unfair-terms **[~]** | **PARTIAL** | Both documents are dated 2026-07-30 and labelled "Draft". `terms.html` says changes are signalled only by an updated date — see **K9** |

---

### E. Data subject rights

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **E1** | Right of access, with a copy of the data | Any request | NDPA s.34 **[~]** | **GAP** | No self-serve access, no documented manual process. `ilios.intelligence@gmail.com` is the only channel and it is a personal Gmail |
| **E2** | Right to rectification | Any request | NDPA s.34 **[~]** | **PARTIAL** | A user can edit their profile and their `consumer_places` (RLS allows it). They cannot correct a `leads` snapshot, a chat transcript, or a score |
| **E3** | **Right to erasure** | Any request | NDPA s.34 **[~]** | **GAP — AND TECHNICALLY BLOCKED. See below.** | The single most important technical finding in this document |
| **E4** | Right to restriction of processing | Any request | NDPA s.34 **[~]** | **GAP** | No mechanism |
| **E5** | Right to data portability, in a structured, commonly used, machine-readable format | Consent- or contract-based processing | NDPA s.38 **[~]** | **GAP** | No export anywhere |
| **E6** | Right to object, including to direct marketing | Any request | NDPA s.36 **[~]** | **GAP** | No objection route. Note `message_outbox` can send WhatsApp to any lead's phone with no opt-out in the message body |
| **E7** | Right not to be subject to a decision based solely on automated processing producing legal or similarly significant effects | Automated decisions | NDPA s.37 **[~]** | **PARTIAL / NOT YET** | Today's automated outputs (matching, ranking) are arguably not "similarly significant". `financial_identities`, `rent_financing_applications` and `mortgage_applications` absolutely would be. See **I3** |
| **E8** | Respond within the statutory period | Any request | NDPA s.34 **[~]** — commonly worked as 30 days **[? verify the GAID period]** | **GAP** | No SLA, no tracker, no owner |

> ### 🔴 E3 in detail — deleting a user account is currently impossible at the database level
>
> This is not a policy gap. It is a hard technical blocker, and I am confident of it from the migrations.
>
> `reject_mutation()` (migration `0005_layer2_crm.sql`, lines 60–65) raises an exception unconditionally.
> It is attached as **`before update or delete`** — note the `or delete` — to at least these tables:
>
> - `lead_stage_history` (`0005`)
> - `lead_attribution` (`0005`)
> - `channel_interactions` (`0032`)
> - `agency_verification_checks`, `agency_trust_score_snapshots` (`0011`)
> - `score_component_history` (`0025`)
> - `proximity_events` (`0019`)
> - `document_versions` (`0014`)
>
> Now follow the cascade. `leads.consumer_id` references `profiles(id) on delete cascade`, and
> `lead_attribution.lead_id` references `leads(id) on delete cascade`. `attribute_lead()` (migration
> `0054`, lines 123–129) writes a `lead_attribution` row for **every** lead — including a `direct_search`
> row when no touch was recorded, explicitly so that "we do not know" is recorded rather than guessed.
>
> Therefore: **every lead has an attribution row**, and deleting the consumer cascades to the lead,
> cascades to the attribution row, hits the `before delete` trigger, and **aborts the entire
> transaction**. The same is true via `lead_stage_history`, via `proximity_events.user_id`, and via
> `score_component_history` through `financial_identities`.
>
> The practical consequence: **any consumer who has ever been introduced to an agency, or ever received a
> proximity ping, cannot be deleted** — not through the app, not through Supabase Auth, not by a support
> engineer running SQL by hand without first disabling the triggers. An erasure request under NDPA s.34
> cannot be honoured today.
>
> The append-only design is *correct* — an audit trail you can rewrite is not an audit trail. The fix is
> not to remove it but to distinguish "nobody may edit history" from "a lawful erasure may proceed". See
> §6.6 for two implementable options.

---

### F. Security and breach

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **F1** | Appropriate technical and organisational measures | Always | NDPA s.39 **[~]** | **PARTIAL — genuinely strong in parts** | RLS is on everywhere and is thoughtfully written; `search_path` is pinned with `pg_temp` (`0068`); the `revoke from PUBLIC` lesson in `0095` is exactly right; `message_outbox` refuses client inserts so it cannot become an open SMS gateway; `short_link_token` was correctly locked down after it was found enumerable at `/rest/v1/rpc/`. This is above-average engineering hygiene |
| **F2** | Same, for the open edge functions | Public endpoints | NDPA s.39 **[~]** | **UNKNOWN** | Eight functions run `verify_jwt = false`: `toju-demo`, `social-generate`, `social-connect`, `short-link`, `paystack-webhook`, `push-key`, `push-subscribe`, `proximity-report`. `paystack-webhook` authenticates by HMAC signature (correct). `proximity-report` accepts an arbitrary `visitorId` — an attacker who knows or guesses one could move another visitor's geofence watch. `social-generate` needs its in-function authorisation model reviewed; I could not confirm it from the source |
| **F3** | Encryption in transit and at rest | Always | NDPA s.39 **[~]** | **PARTIAL/UNKNOWN** | Supabase provides both by default. `social_accounts` stores Meta OAuth tokens — `0053` is titled "social_account_token_storage"; confirm whether they are encrypted at column level or rely on disk encryption |
| **F4** | Breach notification to the NDPC **within 72 hours** of becoming aware | Any personal data breach | NDPA s.40 **[~]**; GAID breach article **[~]** — **the 72-hour period is confirmed** | **GAP** | There is no procedure, no owner, no template. 72 hours is not enough time to invent one |
| **F5** | Notify affected data subjects without undue delay where the breach is likely to result in high risk | High-risk breach | NDPA s.40 **[~]** | **GAP** | Template needed, plus a way to reach anonymous visitors (there is none — see DPIA **R-14**) |
| **F6** | Processor must notify the controller without undue delay | Processor breach | NDPA s.29 **[~]** | **GAP** | Falls out of A5 |

---

### G. Processors and third parties

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **G1** | Written contract with every processor covering the statutory minimums | Each processor | NDPA s.29 **[~]** | **GAP** | See A5 |
| **G2** | Disclose every recipient category in the privacy notice | Any disclosure | NDPA s.27 **[~]** | **PARTIAL — materially incomplete** | `privacy.html` names **Supabase** and "our AI provider". Undisclosed and in the code: **Twilio** (`create-lead`, `send-outbox`), **Meta/WhatsApp** (delivery endpoint), **trypost** (social posting), **Meta/Instagram/Facebook** (syndication + `social-connect` OAuth), **Paystack** (`paystack-checkout`/`-webhook`), **OpenStreetMap/Nominatim** (`geocode-listings`, `save-place`), **Stadia Maps**, **Cloudinary** (implied by NOT NULL `cloudinary_public_id` on `property_media` and `documents`), and the **browser push services** (Google/Mozilla/Apple endpoints in `push_subscriptions.endpoint`) |
| **G3** | Processor must not engage a sub-processor without authorisation | Each processor | NDPA s.29 **[~]** | **UNKNOWN** | Falls out of A5 |
| **G4** | Define the agency's role — processor or independent controller | Lead handoff | NDPA s.65 definitions **[~]** | **GAP** (F14) | My recommendation: **independent controller**, because the agency decides how to pursue the buyer. That makes the handoff a disclosure needing its own notice and basis, and makes the agency responsible for its own compliance — which must then be a warranty in the Agency Agreement |
| **G5** | Restrict the agency's re-use of buyer data | Lead handoff | Purpose limitation, NDPA s.24 **[~]** | **GAP** | Nothing stops an agency exporting the CRM and marketing to every buyer forever. Needs a contractual restriction plus a term in the buyer-facing notice |
| **G6** | Ingesting third-party personal data (social comments/DMs) | `docs/BACKLOG.md` item | NDPA s.24, s.27 **[~]** | **NOT YET** | The backlog contemplates reading comment bodies via the Meta Graph API. Those are personal data of people who never visited Synapse. Do not build it without a basis and a notice — loop me in before the schema |

---

### H. Cross-border transfer

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **H1** | Transfer only to a jurisdiction with an adequacy decision, or under an approved safeguard, or a valid derogation | Any transfer out of Nigeria | NDPA ss.41–43 **[~]**; GAID cross-border articles **[~]** | **GAP — the single largest exposure** | See §5 |
| **H2** | Disclose transfers, the destination, and the safeguard relied on | Any transfer | NDPA s.27 **[~]** | **GAP** | `privacy.html` has a placeholder: *"[NEEDS LEGAL: confirm the specific data-region and whether a cross-border transfer notice is required under NDPA]"*. That placeholder has been sitting in a published document for over a year |
| **H3** | Assess the destination country's legal regime | Each destination | NDPA s.41 **[~]** | **GAP** | US for Supabase, Anthropic, Twilio, Meta; unknown for trypost and Stadia; Paystack is Nigerian-founded but confirm hosting |
| **H4** | Onward-transfer control | Sub-processors abroad | NDPA s.43 **[~]** | **GAP** | Falls out of A5/G3 |
| **H5** | Forward-compatibility with expansion jurisdictions | International expansion mandate | GDPR Ch. V if EU **[✓]** | **NOT YET** (F12) | Design consent strings and the ROPA now so that adding an EU data subject does not require rebuilding them. Cheap now, expensive later |

---

### I. Automated processing, profiling and the AI advisor

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **I1** | Disclose that the user is interacting with an AI | Always | NDPA transparency **[~]**; FCCPA misleading representations s.123–127 **[~]** | **GAP** | `app/toju.html` line 565 still reads `Your property advisor`. A grep of that file for AI-disclosure language finds nothing. Tayo never says it is an AI anywhere in the chat UI. The `DOCTRINE` constant in `toju-demo` is excellent on honesty but the UI carries none of it |
| **I2** | Disclose profiling and its logic in outline | Profiling exists | NDPA s.37 **[~]** | **GAP** | Lead scoring (`leads.lead_score`, `intent_score`, `financial_readiness_score`, `conversion_probability`, `risk_level`), property matching (vector embeddings on `consumer_profiles` and `property_enrichment`), agency and agent trust scores, financial identity scores |
| **I3** | Right not to be subject to solely automated decisions with legal or similarly significant effect; right to human intervention | Such a decision exists | NDPA s.37 **[~]** | **NOT YET → becomes urgent on activation** | The schema already contains `financial_identities.synapse_trust_score`, `rent_financing_applications`, `mortgage_applications` and `affordability_analyses`. The moment any of those gates access to housing or credit, this becomes a live, high-stakes obligation. **Also live today on the agency side:** `agent_reputation_snapshots` and `agent_disciplinary_records` affect a named individual's livelihood |
| **I4** | Accuracy of personal data, including inferred data | Always | NDPA s.24 **[~]** | **PARTIAL** | Inferred attributes are personal data. Tayo's `DOCTRINE` instructs it to "quietly build understanding of their budget, household, lifestyle" and to "never expose this reasoning" — that inferred profile is data the subject has a right to see and correct, and it is currently invisible to them by design |
| **I5** | Do not present model output as fact | Always | FCCPA s.123–127 **[~]** | **PARTIAL** | `terms.html` §Tayo is well drafted. The chat UI carries none of it. `app/property.html` presents modelled figures (commute advantage, "below the area median", yield vs "the Lagos average") with inconsistent qualifiers |
| **I6** | Disclose Tayo's conflict of interest when it negotiates | `0089_negotiation_authority` | FCCPA fair and honest dealing **[~]** | **GAP — under-appreciated** | Migration `0089` gives an agency a `listing_negotiation_authority` floor, and `0090` fires a handoff when an offer goes below it. So **the same assistant that the buyer experiences as "their" advisor is operating inside a price floor set by the seller's agent.** That is a material conflict and it is disclosed nowhere. This needs to be on the screen, in Tayo's own words, at the moment negotiation starts |

---

### J. Retention, minimisation, storage limitation

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **J1** | Keep personal data no longer than necessary | Always | NDPA s.24 **[~]** | **GAP** | **There is no retention policy and no purge job anywhere in either repository.** Every table grows forever |
| **J2** | Soft delete is not erasure | Always | NDPA s.34 **[~]** | **GAP** | `deleted_at` is the platform-wide pattern. It is the right pattern for product semantics and the wrong one for erasure. A hard-delete path must exist alongside it |
| **J3** | Data minimisation | Each field | NDPA s.24 **[~]** | **PARTIAL** | `consumer_profiles` collects `monthly_income`, `marital_status`, `children_count`, `elderly_dependents`, `employer`, `healthcare_priority`. Some of that is genuinely needed to match a home. Not all of it. Each field needs a stated purpose or it should go — migration `0049` ("remove columns nothing can honestly fill") is exactly the right instinct applied to a different problem |
| **J4** | Anonymous session data needs a TTL | `demo_chat_sessions` | NDPA s.24 **[~]** | **GAP** | Flagged in `LEGAL_TRUST_MEMO.md` §1A.4 in July 2026 and still open |
| **J5** | Location data needs the shortest retention of all | `geofence_watches.last_point` | NDPA s.24 **[~]** | **GAP** | `last_point` persists indefinitely. `proximity_events` is append-only and undeletable, so a listings-proximity history is effectively a movement history |

---

### K. FCCPA 2018 — consumer protection

| # | Obligation | Trigger | Provision | Status | What closes it |
|---|---|---|---|---|---|
| **K1** | No false, misleading or deceptive representation about goods or services | Any consumer-facing claim | FCCPA ss.123–127 **[~]** | **PARTIAL — one live mismatch** | **The published seven checks do not match the implemented seven checks.** `terms.html` line 213 publishes: title documentation, ground survey, structural assessment, flood risk, ownership documentation, legal review, media accuracy. The `property_check_type` enum (migration `0013`) is: `listing_authenticity`, `ownership_validation`, `media_validation`, `freshness_validation`, `structural_assessment`, `flood_risk`, `government_acquisition_risk`. "Ground survey" and "legal review" are published but not implemented; `listing_authenticity`, `freshness_validation` and `government_acquisition_risk` are implemented but not published. `app/verify.html` line 82 already contains a comment acknowledging the names do not match. **A published warranty whose terms differ from the process performed is a misleading representation.** |
| **K2** | A claim must be substantiable | Any claim | FCCPA **[~]** | **UNKNOWN → HIGH** (F10) | Migration `0099` records that **0 of 507 live listings are verified**, that the verification tables were empty and SELECT-only, and that a platform admin could flip `properties.verification_status` directly with no evidence row, no `verified_at` and no history. If any listing has ever displayed "Verified" without an evidence trail, that is an unsubstantiated claim |
| **K3** | Trust tiers must have published criteria | "Gold" badge displayed | FCCPA misleading representation **[~]** | **GAP** (F11) | "Gold" appears 20 times across `app/agency.html`, `app/property.html`, `app/agency-listings.js`, `app/app.css`, defined nowhere. Two conflicting tier enums in the schema |
| **K4** | Disclose the price of services | Charging for anything | FCCPA s.115 **[~]** | **GAP** (F9) | `terms.html` names Free/Accelerate/Leader and describes what they buy, but publishes **no prices, no billing period, no renewal terms, no VAT treatment**. `subscription_payments` and `paystack-checkout` are live code |
| **K5** | Right to cancel an advance reservation/booking, and the refund position | Paid subscription | FCCPA s.120 **[~]** | **GAP** | No refund or cancellation clause exists. Migration `0040` states the design plainly: *"pay once, active for 30 days"*, no auto-renewal, **and no cron enforcing expiry**. The terms must match that exactly, including what happens at day 31 |
| **K6** | Sales records / receipts | Any sale | FCCPA s.117 **[~]** | **UNKNOWN** | Paystack issues a receipt; confirm the agency gets a tax-compliant invoice from the Synapse entity |
| **K7** | Right to information in plain and understandable language | All consumer documents | FCCPA s.114 **[~]** | **COMPLIANT** | Both documents are well written. Preserve this |
| **K8** | No unfair, unreasonable or unjust contract terms | The ToS itself | FCCPA ss.128–131 **[~]** | **PARTIAL / NOT YET** | There is currently **no limitation of liability clause at all** — so nothing unfair, but also no protection. When one is drafted, note that broad exclusions against consumers are of doubtful enforceability under the FCCPA and an over-broad cap can itself be struck down |
| **K9** | Unilateral variation without notice is a candidate unfair term | The changes clause | FCCPA ss.128–131 **[~]** | **PARTIAL** | `terms.html` §Changes: material changes signalled only by an updated date. Needs actual notice and, for material changes, a re-acceptance mechanic |
| **K10** | Marketplace/intermediary obligations — you cannot contract out of them by calling yourself a conduit | Curating, verifying, ranking, monetising | FCCPA s.104 override **[~]**; FCCPC online-marketplace guidance **[? status uncertain — verify whether this has been finalised]** | **PARTIAL** | `terms.html` says Synapse "is not a party to any transaction". True, and worth keeping — but Synapse *verifies*, *ranks*, *recommends*, *negotiates within a floor* and *takes a subscription fee*. The more it curates, the less the conduit framing protects it |
| **K11** | No misleading claims in marketing | All marketing copy | FCCPA ss.123–127 **[~]** | **MOSTLY CLOSED — one live item** | The earlier sweep worked: "escrow-protected", "zero surprises", "your naira is safe", "checked in person" are gone from the app and survive only in docs as historical findings. **Still live:** `app/agency.html` line 11532 — *"Never lose a lead — buyers land on your phone"*. `create-lead` returns 207 `delivery_failed` when Twilio is unconfigured, which it currently is. That claim is not true today |
| **K12** | Do not assert a transaction that did not occur | Any confirmation UI | FCCPA ss.123–127 **[~]** | **RESOLVED — verify** | The fake "Contact agent" toast (finding T-2 in `CONSENT_AND_DISCLOSURE_COPY.md`) is gone; the contact path now runs through Tayo's `handOff()` and calls `create-lead` for real. Confirm the 207 path shows the buyer an honest message |

---

### L. Adjacent regulated-activity risk

| # | Risk | Trigger | Status | Note |
|---|---|---|---|---|
| **L1** | **Valuation without ESVARBON registration** | Tayo giving price/value opinions | **UNKNOWN → material** | The `DOCTRINE` explicitly encourages opinions: *"Honestly, that's overpriced for Ikate"*. `app/property.html` asserts "below the area median" and a yield percentage against "the Lagos average". Estate surveying and valuation is a registered profession in Nigeria. Counsel must advise where market commentary ends and valuation begins |
| **L2** | **State real-estate practitioner registration (LASRERA and equivalents)** | Marketing property in Lagos; negotiating | **UNKNOWN** | Migration `0077` already anticipates state licences for *agencies*. The question I cannot answer is whether the *platform* needs one |
| **L3** | **SCUML / AML** | If Synapse is a designated non-financial institution | **UNKNOWN** | `0077` correctly requires SCUML of agencies. Whether Synapse itself is in scope turns on how close it gets to brokerage — and `0089`/`0091` (negotiation authority, submit offer) move it closer |
| **L4** | **Securities law** | Any investment/REIT/land-banking offering | **CLOSED — keep it closed** | `docs/R-00` is thorough and its verdicts should be treated as binding until counsel says otherwise |
| **L5** | **Payment licensing** | If Synapse ever holds funds | **NOT YET** | `escrow_accounts`, `wallets`, `wallet_transactions` exist in the schema (`0026`, `0027`). Building against them is a CBN conversation before it is a code conversation |
| **L6** | **IP and licensing** | Maps, fonts, photos, AI output | **PARTIAL** | OpenStreetMap data carries ODbL attribution obligations; Stadia Maps has its own terms; the font licence question from `LEGAL_TRUST_MEMO.md` §4 needs a current answer; and nothing grants Synapse a licence to re-publish an agency's listing photographs to social media, which `social-publish` does |

---

## 3. Data inventory / ROPA

Grounded in the migrations. **Lawful bases are my proposals for counsel to confirm, not settled
positions.** Retention is *proposed* — today there is none. "Recipients" means beyond Synapse.

### 3.1 Consumer personal data

| Table(s) | Personal data fields | Proposed lawful basis | Retention today | Proposed retention | Recipients |
|---|---|---|---|---|---|
| `auth.users` (Supabase) | email, hashed password, phone, OAuth identity | Contract | Indefinite | Account life + 90 days | Supabase (US) |
| `profiles` | `full_name`, `phone`, `whatsapp`, `avatar_url`, `role` | Contract | Indefinite (soft delete only) | Account life + 90 days | Supabase; agency (name/phone only, on handoff) |
| `consumer_profiles` | `age`, `occupation`, `employer`, `monthly_income`, `marital_status`, `children_count`, `future_children`, `elderly_dependents`, `pets`, budget, priorities, `embedding` | **Consent** (income + household are the sensitive-adjacent core) | Indefinite | 24 months from last activity | Supabase; Anthropic (in prompt context) |
| `consumer_places` | `kind` (workplace/school/gym/**worship**/family), `label`, `lat`/`lon`, geocode metadata | **Consent — and `worship` is potentially sensitive personal data (religious belief)** | Indefinite | Until user deletes; 24 months idle | Supabase; **Nominatim/OSM at geocode time**; Anthropic |
| `chat_sessions` | Full transcript (last 30 messages), `pref_*`, `source_channel`, `active_property_id` | Consent + contract | Indefinite | 24 months from last message | Supabase; Anthropic (US) |
| `demo_chat_sessions` | Full anonymous transcript, `criteria`, `matches`, keyed by `visitor_id` | **Consent** | **Indefinite, no purge job** | **90 days** | Supabase; Anthropic (US) |
| `leads` | `consumer_name`, `consumer_phone`, `preferences` (budget + **Tayo's negotiation offer and advice**), `lead_score`, `intent_score`, `financial_readiness_score`, `conversion_probability`, `risk_level` | Consent (the disclosure) + legitimate interests (the record) | Indefinite | 36 months (commercial record) | **Agency** (independent controller); **Twilio + Meta/WhatsApp** for delivery |
| `lead_stage_history`, `lead_attribution`, `communications`, `deal_rooms`, `tasks` | Stage moves, who moved them, summaries, notes, `closing_price` | Legitimate interests | **Indefinite and undeletable** | 36 months | Agency |
| `channel_interactions` | `session_id` (visitor id), property, channel, timestamp | Legitimate interests | **Indefinite and undeletable** | 18 months | Agency (aggregated) |
| `click_events`, `click_rollup_hourly`, `short_links` | link, channel, `ua_class` (human/bot/preview) — **deliberately no IP, no user-agent string** | Legitimate interests | Indefinite | 12 months raw, rollup retained | Agency |
| `saved_properties`, `property_views`, `property_searches`, `item_saves` | Property saved; `session_duration_seconds`, `scroll_depth_pct`; free-text search `query` | Consent / legitimate interests | Indefinite | 12 months | Supabase |
| `geofence_watches` | `last_point` (**geography — real location**), `visitor_id`/`user_id`, criteria, quiet hours | **Consent — explicit** | **Indefinite** | `last_point` **7 days**; watch until switched off | Supabase |
| `proximity_events`, `proximity_alert_outcomes`, `notifications` | user/visitor, property, timestamp, tap outcome, `payload` | Consent | **Indefinite; `proximity_events` undeletable** | 90 days | Supabase; browser push services (Google/Mozilla/Apple) |
| `push_subscriptions` | `endpoint`, `p256dh`, `auth_key`, `visitor_id` | Consent | Indefinite | Until unsubscribed + 30 days | Push service operator |
| `viewings`, `inspection_slots` | `scheduled_at`, `notes` | Contract | Indefinite | 24 months | Agency |
| `consumer_reviews` | Review text, author id | Consent / legitimate interests | Indefinite | Life of listing + 24 months | Public |
| `message_outbox` | `to_phone`, message `body` | Legitimate interests | Indefinite | 12 months | **Twilio → WhatsApp/Meta** |
| `financial_identities`, `score_component_history`, `financial_consent_grants`, `affordability_analyses` | Trust/payment-reliability scores, score components, consent grants | **Consent — strict** | Indefinite; `score_component_history` undeletable | 24 months | Lender/landlord **only via an explicit, logged grant** — the strongest control in the schema |
| `rent_financing_applications`, `rent_guarantors`, `mortgage_applications`, `wallets`, `wallet_transactions`, `installment_*`, `escrow_*` | Financial application data, guarantor personal data | **NOT IN USE — see I3, L5** | n/a | n/a | n/a |
| `referrals`, `referral_rewards`, `viral_loop_events`, `agent_follows`, `agent_likes` | Referrer/referee ids, social graph | Consent | Indefinite | 24 months | Supabase |
| **Browser storage** — `toju_visitor_v1`, `syn_arrival_v1`, `synapse_moodboard_v1`, `synapse_places_*` | Visitor UUID, arrival channel + post token, dream-board pins, saved places | Consent | Until cleared | Documented in the notice | Written before any notice is shown |

### 3.2 Agency and agent personal data

| Table(s) | Personal data | Proposed basis | Retention | Recipients |
|---|---|---|---|---|
| `agencies`, `agency_members`, `agency_invites`, `agent_profiles` | Owner identity, `whatsapp_number`, `address`, `cac_number`, bios, photos, `relationship_manager` | Contract | Relationship + 7 years (corporate records) | Public (profile), Supabase |
| `documents`, `document_versions` | **`directors_id`** (government ID of a natural person), **`bank_statement`**, `cac_certificate`, `agency_license`, `scout_photograph` | Legal obligation + contract | 7 years (AML-adjacent) — **verify with counsel** | Verification desk only; private bucket (`0076`) |
| `agency_verifications`, `_checks`, `agent_verifications`, `agent_disciplinary_records`, `agent_reputation_snapshots`, `agency_trust_scores` | Verification outcomes, notes, `risk_indicator`, **disciplinary records about a named individual** | Legitimate interests | Relationship + 24 months | Public (score), internal (notes) |
| `fraud_flags`, `fraud_events`, `disputes`, `dispute_evidence`, `dispute_comments` | Allegations about named people | Legitimate interests — **high sensitivity, accuracy duty is acute** | Resolution + 24 months | Internal, parties |
| `social_accounts` | Meta OAuth access tokens, page/account ids | Contract | Until disconnected | **Meta** |
| `subscription_payments` | `paystack_reference`, amount, `initialized_by` | Contract + legal obligation | 7 years (tax) | **Paystack** |
| `commission_ledger`, `performance_bonuses`, `agent_daily_snapshots` | Individual earnings and performance | Contract | 7 years | Agency |
| `financial_admin_access_log` | Who read what financial data | Accountability | 24 months | Internal |

### 3.3 What is *not* personal data

`properties`, `property_media`, `property_enrichment`, `property_places`, `neighbourhoods`,
`amenity_places`, `content_templates`, `whatsapp_templates`, `cron_*`, `marketplace_health`,
`growth_metrics`. **But** `properties.address` + `latitude`/`longitude` become personal data where the
listing is an individual's home, and `documents` attached to a property can carry an owner's name.

---

## 4. DPIA

### 4.1 Is a DPIA mandatory?

**Yes. On my reading, unambiguously — and on at least five independent grounds, any one of which would be
sufficient.**

A DPIA is required where processing is likely to result in high risk to the rights and freedoms of data
subjects **[~ NDPA s.36; GAID DPIA article enumerates the circumstances]**. Synapse triggers:

1. **Systematic and extensive evaluation of personal aspects based on automated processing, including
   profiling, on which decisions are based.** Tayo extracts budget, household, income, commute, children,
   dependants and lifestyle, builds an embedding, and produces recommendations. `leads` then carries seven
   separate automated scores. This is the textbook trigger.
2. **Processing of sensitive personal data, or data of a highly personal nature, at scale.** Income,
   marital status, children, dependants, and — via `consumer_places.kind = 'worship'` — **religious
   belief**, which is sensitive personal data under the Act.
3. **Systematic monitoring of location.** `geofence_watches.last_point` plus a once-a-minute
   `watchPosition` report is location tracking, however well-intentioned and however coarsened.
4. **Innovative use of a new technology.** An LLM conducting an open-ended advisory conversation with
   consumers about a major financial decision. There is no established practice to fall back on.
5. **Cross-border transfer of all of the above to a jurisdiction with no adequacy decision** (§5).

Two further aggravating factors: the data subjects are **largely unauthenticated**, so they cannot be
contacted to exercise rights or be told about a breach; and the decision domain is **housing**, where
getting it wrong has consequences that are not merely commercial.

**Conclusion: a DPIA is mandatory and should have been completed before the current processing began.**
What follows is that DPIA. It is a first draft and requires review by the DPO (once appointed, F3) and by
counsel.

---

### 4.2 DPIA — Synapse consumer platform

**Controller:** [F1 — registered entity]
**Assessor:** legal/compliance agent · **Date:** 19 September 2026 · **Version:** 0.1 (draft)
**Review trigger:** any new data category, new processor, new jurisdiction, or activation of the financial
identity / lending schema. Otherwise annually.

#### A. Description of the processing

**Nature.** A consumer web application (`Synapse/app/`, static HTML/JS) and an agency portal, on a Supabase
Postgres backend with Deno edge functions. Consumers — predominantly unauthenticated — converse with an
LLM property advisor ("Tayo"/"Toju"), browse listings, save properties and dream-board preferences,
optionally enable location-based proximity alerts, and may choose to be introduced to a listing agency.
Agencies list properties, receive scored leads, run a CRM, and auto-publish listings to social media with
attribution-carrying short links.

**Scope.** Personal data categories: identity, contact, conversational free text, inferred lifestyle and
household attributes, financial circumstances (income, budget), behavioural (views, searches, scroll
depth, clicks, attribution touches), location (reported position, named places, proximity events),
device (push endpoints), and — for agency personnel — government ID and bank statements.

**Context.** Nigeria, primarily Lagos and Ibadan. Housing is a high-stakes, fraud-exposed market; the
product's entire premise is that it is more trustworthy than the alternatives. Data subjects are ordinary
consumers with no negotiating power over terms, arriving largely from social media, many on in-app
browsers, mostly without accounts.

**Purposes.** (a) Conversational property advice and matching; (b) continuity of conversation across
sessions; (c) introducing interested buyers to listing agencies; (d) proximity notification; (e) channel
attribution and marketing measurement; (f) agency verification and trust scoring; (g) subscription
billing; (h) service operation and security.

#### B. Necessity and proportionality

| Purpose | Necessary? | Proportionate? | Assessment |
|---|---|---|---|
| Conversational advice | Yes | **Questionable as built** | The conversation is the product. But `DOCTRINE` instructs Tayo to build an understanding of household, lifestyle, goals and past dislikes **and never to expose that reasoning**. Covert profiling is not proportionate even where the profiling itself is |
| Session continuity | Yes | Yes | Storing the transcript is the minimum way to achieve "stop asking questions you've already answered" |
| Lead handoff | Yes | **No, as built** | Sending the buyer's **budget range and Tayo's negotiation advice** to the agency exceeds what an introduction requires, and exceeds what `privacy.html` says is sent. It also hands the seller's agent the buyer's reservation price |
| Proximity | Yes (opt-in) | **Yes — this is the best-designed part** | Explicit opt-in, off by default, ~100m rounding before storage, quiet hours, daily cap, per-property dedupe. The failure is retention, not design |
| Attribution | Yes | Yes | `click_events` storing no IP and no user-agent is a real minimisation decision, made deliberately and documented |
| `consumer_profiles` depth | **Partly** | **No** | `employer`, `marital_status`, `elderly_dependents`, `healthcare_priority` are not necessary to recommend a home and no purpose is stated for them |
| Financial identity | **Not yet** | n/a | Schema exists, unused. Do not activate without returning to this DPIA |

#### C. Risk register

Likelihood (L) and Severity (S) on 1–5. Inherent = L×S **before** mitigation. Residual is **after** the
mitigations in the same row, assuming they are implemented — **today, residual equals inherent for every
row marked "not implemented".**

| # | Risk | Affected | L | S | Inherent | Mitigation | Residual | Implemented? |
|---|---|---|---|---|---|---|---|---|
| **R-01** | **Unlawful cross-border transfer.** All personal data sits in the US; conversation content goes to a US LLM provider; lead data may go via Twilio to Meta. No adequacy decision, no safeguard, no disclosure | All | 5 | 4 | **20** | Adequacy/safeguard instrument (§5); disclose in notice; DPAs; minimise what is sent to the model | **12** | ❌ |
| **R-02** | **Erasure is technically impossible.** Append-only triggers abort any cascade delete; a data subject's right under s.34 cannot be honoured | All consumers | 5 | 4 | **20** | §6.6 — separate "no rewriting history" from "lawful erasure may proceed"; build `erase_me()` | **4** | ❌ |
| **R-03** | **Sensitive data captured with no consent and no special handling.** Free-text transcripts capture health, household, finances; `consumer_places.kind='worship'` captures religious belief | Consumers | 4 | 5 | **20** | Explicit consent at the chat entry point; data-minimisation nudge ("don't share bank details or ID numbers"); pre-flight scrub before the model call; treat `worship` as sensitive or drop the value | **8** | ❌ |
| **R-04** | **No notice at the point of collection.** No page under `app/` links to `privacy.html` or `terms.html`; sign-up captures no consent | All | 5 | 3 | **15** | Link both from `toju.html`, `signin.html`, `browse.html`, `property.html`; add the one-line data notice at the composer | **3** | ❌ |
| **R-05** | **Undisclosed processors.** Twilio, Meta, trypost, Paystack, Nominatim, Stadia, Cloudinary, push services are all unnamed in the notice | All | 5 | 3 | **15** | Full recipient list in the policy; DPAs; sub-processor change control (B8) | **3** | ❌ |
| **R-06** | **Indefinite retention.** No purge job anywhere; soft delete retains everything | All | 5 | 3 | **15** | Retention schedule (§6.5) + `pg_cron` purge jobs; the cron infrastructure already exists (`0063`, `0081`) | **4** | ❌ |
| **R-07** | **Location history accumulates.** `last_point` persists; `proximity_events` is append-only and undeletable | Opt-in consumers | 3 | 4 | **12** | 7-day TTL on `last_point`; 90-day TTL on `proximity_events`; include both in `erase_me()` | **4** | ❌ Partial (rounding + quiet hours implemented) |
| **R-08** | **Buyer's reservation price reaches the seller's agent.** `create-lead` sends budget range and Tayo's negotiation offer/advice to the agency | Consumers | 5 | 3 | **15** | Either narrow the payload to name/phone/property, or disclose it explicitly in a pre-send consent sheet naming the agency. **Do not do neither** | **6** | ❌ |
| **R-09** | **Tayo's conflict of interest is undisclosed.** The buyer's "advisor" negotiates inside a seller-set floor (`0089`/`0090`) | Consumers | 4 | 4 | **16** | On-screen disclosure at the moment negotiation begins, in Tayo's own voice; a term in the ToS; alignment with `DOCTRINE` | **6** | ❌ |
| **R-10** | **No AI disclosure in the chat UI.** `toju.html` still says "Your property advisor"; Tayo never states it is an AI | Consumers | 5 | 3 | **15** | §6.7 disclosure set; the copy is already drafted in `CONSENT_AND_DISCLOSURE_COPY.md` §4 and has not been implemented | **3** | ❌ |
| **R-11** | **Covert profiling.** Inferred household/lifestyle profile is built by design and hidden by design | Consumers | 4 | 3 | **12** | Disclose profiling in outline; expose the inferred profile in a "What Tayo has understood" panel with edit and delete. **This is also a product feature, not only a compliance fix** | **4** | ❌ |
| **R-12** | **Model outputs presented as fact.** Price/yield/commute figures without consistent qualifiers | Consumers | 4 | 3 | **12** | Qualifier wherever a modelled figure appears outside chat; `property.html` cost note already models this well with "(est.)" | **4** | ❌ Partial |
| **R-13** | **Breach with no plan.** 72-hour clock, no runbook, no owner, no template | All | 3 | 5 | **15** | B5 + B6; one page; rehearse once | **5** | ❌ |
| **R-14** | **Cannot notify anonymous visitors of a breach.** No contact point exists for a `demo_chat_sessions` visitor | Anonymous | 3 | 4 | **12** | Accept and document; mitigate by minimising and by the 90-day TTL; in-app banner as the substitute channel | **8** | ❌ |
| **R-15** | **Agency misuse of buyer data.** No contractual restriction on re-use; CRM is exportable | Consumers | 4 | 3 | **12** | Agency Agreement + DPA with a purpose-limitation clause and audit right; disclose the agency's controller status to buyers | **4** | ❌ |
| **R-16** | **Agency director ID and bank statements in storage.** `documents` accepts `directors_id`, `bank_statement` | Agency staff | 2 | 5 | **10** | Private bucket already in place (`0076`); add access logging (B4), retention, and encryption confirmation | **4** | ⚠️ Partial |
| **R-17** | **Open edge functions.** Eight run `verify_jwt=false`; `proximity-report` accepts an arbitrary `visitorId` | All | 3 | 3 | **9** | Review each; bind `proximity-report` to a signed visitor token; confirm `social-generate`'s authorisation model | **3** | ⚠️ Partial |
| **R-18** | **Shared demo account leakage.** `demo-customer@synapse.ng` is a real account any visitor can enter; anything written under it is visible to every other demo user | Anyone using the demo | 3 | 3 | **9** | Now gated behind `?demo=1` or an explicit button (improved since the earlier finding). Add: a banner inside the demo, and a nightly wipe of data written under the demo accounts | **3** | ⚠️ Partial |
| **R-19** | **Automated decisions with significant effect** if the financial identity / lending schema is activated | Consumers | 2 | 5 | **10** | Do not activate without a fresh DPIA, a human-in-the-loop, an explanation route and a contest route | **5** | ❌ (dormant) |
| **R-20** | **Inaccurate scores about named individuals.** `agent_disciplinary_records`, `agent_reputation_snapshots`, `fraud_flags` | Agents | 2 | 4 | **8** | Notice to the agent, right to see and contest, evidence standard before a flag is recorded | **4** | ❌ |

**Risk profile as it stands today:** 3 risks at 20, 1 at 16, 6 at 15, 4 at 12, 3 at 10, and 3 at 8–9.
**Nothing in the top band is mitigated.**

#### D. Residual risk and recommendation

If every mitigation above is implemented, the highest residual risks are **R-01 (12)** — cross-border,
which cannot be fully eliminated while Supabase and the LLM provider are outside Nigeria — and **R-03 (8)**
and **R-14 (8)**, both of which are inherent to an open-ended conversational product used anonymously.

**My recommendation:** the processing is **not presently lawful to continue at scale** without at minimum
R-01, R-02, R-04 and R-05 addressed. R-04 and R-05 are days of work. R-02 is a migration. R-01 is the one
that needs counsel and a commercial decision.

**Whether residual risk is acceptable is a decision for the controller (F1) on advice from the DPO (F3) and
counsel — not a decision I can make.** If residual risk after mitigation is still judged high, the NDPA
contemplates prior consultation with the Commission **[~ NDPA s.36(4)]**.

#### E. Sign-off block

| Role | Name | Date | Signature |
|---|---|---|---|
| Controller / founder | *[F1]* | | |
| DPO or DPCO | *[F3]* | | |
| Nigerian counsel | | | |

---

## 5. Cross-border transfer analysis

### 5.1 The transfers, enumerated

| # | Data | Sent to | Where | Role | Disclosed? |
|---|---|---|---|---|---|
| 1 | **Everything in the database** | Supabase | **us-east-1 (F6)** | Processor | ❌ Placeholder only |
| 2 | **Full conversation content**, inferred profile, criteria | Anthropic | US | Processor | ⚠️ Named as "our AI service provider (currently Anthropic)" — no location, no safeguard |
| 3 | Buyer name, phone, budget, negotiation advice | Twilio → Meta/WhatsApp | US | Processor → controller | ❌ |
| 4 | Listing content, images, agency identity | trypost → Meta | US | Processor → controller | ❌ |
| 5 | Meta OAuth tokens, page identifiers | Meta | US | Controller | ❌ |
| 6 | Place labels, addresses | Nominatim / OSM | EU | Controller | ❌ |
| 7 | Map tile requests | Stadia Maps | EU/US | Controller | ❌ |
| 8 | Agency payment details | Paystack | NG (confirm hosting) | Processor | ❌ |
| 9 | Push endpoints | Google / Mozilla / Apple | US | Controller | ❌ |
| 10 | Listing/document images | Cloudinary (F6) | US/EU | Processor | ❌ |

### 5.2 The legal position

NDPA restricts transfer of personal data out of Nigeria **[~ ss.41–43]**. The routes, as I understand them:

1. **Adequacy.** Transfer to a country the Commission has determined provides an adequate level of
   protection. **I am not aware of a published NDPC adequacy list, and specifically not one including the
   United States — but this is exactly the kind of thing that may have changed. Counsel must check the
   current NDPC position rather than rely on my knowledge.** *(Uncertainty flagged.)*
2. **Appropriate safeguards** where adequacy is absent: a legally binding and enforceable instrument
   between the parties, binding corporate rules, approved contractual clauses, or an approved code/
   certification. **This is the realistic route for Synapse.**
3. **Derogations** for specific situations: the data subject's **explicit consent after being informed of
   the risks**; necessity for the performance of a contract with the data subject; important public
   interest; legal claims; vital interests **[~ s.43]**.

### 5.3 Assessment

**Synapse currently relies on nothing.** There is no adequacy decision, no executed safeguard, no informed
consent, and no disclosure to the data subject that the transfer occurs at all. The privacy policy carries
a placeholder asking whether a notice "is required" — the answer is yes, and it has been unanswered in a
published document since 2026-07-30.

The contract derogation is tempting and should be treated carefully: it covers a transfer **necessary** for
a contract with the data subject. An anonymous visitor chatting with Tayo has no contract with Synapse, so
the derogation does not reach the largest and most sensitive population. Derogations are also generally
construed as exceptions for occasional transfers, not as a licence for routing an entire production
database offshore. **Counsel's view needed.**

### 5.4 Options, ranked

| Option | What it is | Effort | Effect | My view |
|---|---|---|---|---|
| **1. Layered contractual safeguards** | Execute each vendor's DPA including its transfer terms (Supabase, Anthropic, Twilio, Paystack, Cloudinary, Stadia); paper the rest | **Low — mostly click-through** | Establishes a safeguard chain | **Do this week regardless of anything else.** No downside |
| **2. Explicit informed consent for the transfer** | A named, unbundled consent: "your conversation is processed by our AI provider in the United States" | Low (copy + `consent_events`) | Covers consent-based processing | **Do it — but it cannot be the sole basis for the whole database** |
| **3. Full disclosure in the privacy policy** | Name every recipient, country and safeguard | Low | Transparency obligation (H2) discharged | **Non-negotiable** |
| **4. Minimise what leaves** | Strip direct identifiers before the model call; cap transcript length; never send `consumer_profiles` financial fields | **Medium — an edge-function change** | Shrinks the highest-sensitivity transfer | **Strongly recommended.** `agency-advisor` already documents this exact discipline ("no buyer's personal details ever reach the model") — generalise it to `toju-chat` and `toju-demo` |
| **5. Regional relocation of the database** | Move Supabase to a region closer to home — evaluate **af-south-1 (Cape Town)** if available | High — a migration | Does **not** remove the transfer (South Africa is still not Nigeria) but shortens the chain, improves latency for Nigerian users, and moves data into POPIA, a regime a Nigerian regulator is more likely to find comfortable | **Evaluate.** Do not oversell it as a fix |
| **6. Nigerian hosting** | Self-host Postgres in Nigeria | Very high | Removes transfer #1 entirely | **Not now.** Loses everything Supabase provides. Revisit only if the NDPC signals a localisation requirement |
| **7. Nigerian or self-hosted model** | Replace the LLM | Very high | Removes transfer #2 | **Not viable today.** Quality gap is too large |
| **8. Prior consultation with the NDPC** | Approach the Commission with the DPIA | Medium | Regulatory comfort | **Worth asking counsel about.** A controller that arrives with a completed DPIA is in a very different posture from one that arrives after a complaint |

### 5.5 The recommendation

Options **1 + 2 + 3 + 4 immediately**, option **5 evaluated**, option **8 discussed with counsel**. Even
fully executed this leaves residual risk at **R-01 = 12**, which is the honest position: *Synapse runs on
foreign infrastructure and there is no way to make that a Nigerian transfer.* What is achievable is that
the transfer be **disclosed, contractually safeguarded, consented to where consent is the basis, and
minimised**. Right now it is none of the four.

---

## 6. Concrete recommendations to the app

Specific enough to implement. File paths are absolute-from-repo-root.

### 6.1 Link the legal documents from the app — first, smallest, most overdue

**Files:** `Synapse/app/toju.html`, `Synapse/app/signin.html`, `Synapse/app/browse.html`,
`Synapse/app/property.html`, `Synapse/app/agency.html`, `Synapse/app/dream.html`

No page under `app/` links to `privacy.html` or `terms.html`. Collection begins at `toju.html`. Add a
persistent footer line to every app page:

> `Privacy Policy · Terms · How verification works`

pointing at `../privacy.html`, `../terms.html` and a new `../verification-standard.html`.

### 6.2 Structure — where the legal surface should live

```
Synapse/
  privacy.html                 (rewrite — §7)
  terms.html                   (rewrite — §7)
  verification-standard.html   NEW — the published seven checks, canonical
  agency-terms.html            NEW — Agency Agreement + DPA
  ai-notice.html               NEW — "How Tayo works", plain language
  app/
    settings.html              NEW — the Data & Privacy centre (§6.4)
```

**One canonical source for the seven checks.** Today the list differs between `terms.html` line 213, the
`property_check_type` enum, `app/property.html`, and `app/verify.html` (whose own comment admits the
mismatch). Publish one list, derive every UI from the enum, and make the enum the source of truth.

### 6.3 Consent mechanics

**A consent ledger.** New migration, modelled on `financial_consent_grants`, which is already the right
shape:

```
consent_events
  id, subject_id (nullable), visitor_id (nullable),
  purpose        -- 'core_service' | 'ai_processing' | 'cross_border' |
                 -- 'agency_handoff' | 'proximity' | 'marketing'
  granted        boolean
  basis          -- 'consent' | 'contract' | 'legitimate_interests'
  notice_version text       -- which version of the policy they saw
  evidence       jsonb      -- surface, copy hash, user agent class
  occurred_at    timestamptz
  constraint: subject_id is not null or visitor_id is not null
```

Append-only for `UPDATE` only — **not for `DELETE`** (see §6.6).

**Four unbundled consents, not one checkbox:**

| Purpose | Where | Default | Withdrawable |
|---|---|---|---|
| Core service (chat stored so Tayo remembers) | `toju.html`, first message | Opt-in by continuing, with notice shown | Yes — "Clear my conversation" |
| AI processing **including transfer to the US** | Same moment, named separately | Same | Yes |
| Agency introduction | `toju.html` `handOff()`, per introduction | **Off — explicit act each time** | Yes, prospectively |
| Proximity/location | `browse.html` prox card | **Off** | Yes — already built |
| Marketing | Nowhere yet | **Off** | Yes |

**At the chat entry point** (`app/toju.html`, near the composer — copy already drafted in
`CONSENT_AND_DISCLOSURE_COPY.md` §4.4 and still unimplemented):

> Your messages are stored so Tayo can remember your conversation, and are processed by our AI provider
> outside Nigeria to generate replies. Please do not share bank details, ID numbers or passwords here.
> [Privacy Policy]

**At sign-up** (`app/signin.html` — currently contains **no** terms, privacy or consent markup at all):
a required acceptance of the Terms and an acknowledgement of the Privacy Policy, with the notice version
written to `consent_events`. Without this there is no evidence a contract was ever formed.

**At the agency handoff** (`app/toju.html` `handOff()`, before the `create-lead` fetch): a sheet naming the
specific agency and listing exactly what is sent. Variant B copy in `CONSENT_AND_DISCLOSURE_COPY.md` §3.1
is the right shape — its four blocking prerequisites need re-checking, since the send is now real.
**And Tayo's post-handoff line must stop saying "They have what we talked about"** — the agency receives
name, phone, property, budget range and the negotiation offer/advice, not the conversation.

### 6.4 The Data & Privacy centre — `Synapse/app/settings.html` (new)

One screen, six controls. Reachable from the app footer **and** from `privacy.html`, and usable by an
**anonymous visitor via their `toju_visitor_v1` id** — that population is the majority and currently has
no rights mechanism at all.

| Control | What it does | Backend |
|---|---|---|
| **What we know about you** | Renders profile, `consumer_profiles`, `consumer_places`, saved properties, dream board, and **the inferred profile Tayo has built** | New RPC `my_data_summary()` |
| **Download my data** | JSON of every row keyed to the subject or visitor | New edge function `privacy-export` |
| **Correct it** | Inline edit of profile, places, and inferred attributes | Existing RLS write policies + a new inferred-profile writeback |
| **Clear my conversation** | Deletes `chat_sessions` / `demo_chat_sessions` for this subject or visitor | New RPC `forget_conversation(p_visitor_id)` |
| **Delete everything / close account** | Full erasure, with a clear statement of what is retained and why (commercial records already transmitted to an agency, tax records) | New RPC `erase_me()` — **blocked on §6.6** |
| **Consents** | Shows each consent, when given, which notice version, with an off switch each | `consent_events` |

Plus, on the proximity card in `app/browse.html`: **"Delete my location history"** alongside the existing
off switch. Turning it off stops collection; it does not remove `last_point` or `proximity_events`.

### 6.5 Retention defaults (proposals — F13)

Implement with `pg_cron`; the infrastructure already exists (`0063_cron_health_monitoring`,
`0081_scheduled_social_drain`) and `cron_expectations` gives monitoring for free.

| Data | Proposed retention | Rationale |
|---|---|---|
| `demo_chat_sessions` | **90 days** from last message | Anonymous, sensitive, unreachable for breach notice |
| `chat_sessions` | 24 months from last message | Account holders; continuity has real value |
| `geofence_watches.last_point` | **7 days** | A current position, not a history |
| `proximity_events`, `proximity_alert_outcomes` | 90 days | Effectively a movement record |
| `channel_interactions` | 18 months | Attribution windows do not run longer |
| `click_events` | 12 months raw; rollups retained | `click_rollup_hourly` already exists |
| `property_views`, `property_searches` | 12 months | Behavioural |
| `leads` + `lead_*` | 36 months from close | Commercial record; agency has its own copy |
| `message_outbox` | 12 months | Delivery record |
| `notifications` | 90 days | Transient |
| `documents` (agency KYC) | 7 years — **verify against AML/SCUML with counsel** | Legal obligation likely overrides erasure |
| `subscription_payments` | 7 years | Tax |
| Anything under the demo accounts | **Nightly wipe** | R-18 |

### 6.6 Unblock erasure — the migration that has to happen

**The problem (E3):** `reject_mutation()` is attached `before update or delete`, so cascading deletes from
`profiles` abort. Nobody can be deleted.

**Option A — narrow the triggers (simplest).** Re-attach as `before update` only, and protect against
casual deletion with RLS and grants instead. History stays unrewritable; a service-role erasure can
proceed. *Risk: a cascade elsewhere could silently remove audit rows.*

**Option B — an explicit erasure escape hatch (preferred).** Keep the delete guard but let it stand aside
for a declared erasure:

```sql
create or replace function reject_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE'
     and current_setting('synapse.erasure', true) = 'on' then
    return old;                    -- a declared, audited erasure may proceed
  end if;
  raise exception 'Table % is append-only', tg_table_name;
end;
$$;
```

`erase_me()` sets `synapse.erasure = 'on'` for the transaction, writes an erasure audit row **first**
(subject id, timestamp, tables touched — no personal data), performs the delete, and resets. Nothing else
in the platform can set it, because nothing else runs as service role.

**Either way, also needed:**
- A hard-delete path alongside `deleted_at` (J2).
- A documented retained-data list for the erasure confirmation screen — what survives, and under what
  legal obligation.
- `erase_me()` must reach browser storage too: clear `toju_visitor_v1`, `syn_arrival_v1`,
  `synapse_moodboard_v1`, `synapse_places_*`.

### 6.7 What the AI advisor must disclose

**Files:** `Synapse/app/toju.html` (the `.tj-eyebrow` block at line 565, the `GREETING` constant, the
composer), and the `DOCTRINE` / `TOJU_SYSTEM_V2` prompts in `supabase/functions/toju-demo/index.ts` and
`toju-chat/index.ts`.

**Non-negotiable, at first contact:**
1. **"I'm Tayo, Synapse's AI property advisor — not a person."** Header must read `AI property advisor`,
   not `Your property advisor`.
2. **Scope:** works only from listings agencies have posted on Synapse; does not see the open market.
3. **Not professional advice:** not a valuation, not financial or investment advice, not legal advice.
   **The valuation point is the ESVARBON one (L1) and must be explicit.**
4. **Data:** messages are stored and processed by an AI provider outside Nigeria; don't share bank details,
   ID numbers or passwords.
5. **Nothing reaches an agency until you choose** — and you will see exactly what would be shared.

**Persistent, near the composer:**
> Tayo is an AI. Its estimates — prices, yields, affordability, commute times — are guidance, not a
> valuation, a guarantee, or professional advice.

**Contextual, when it arises:**
6. **Verification:** what the chip means, linked to the canonical standard. `DOCTRINE` already handles this
   with unusual discipline ("VERIFICATION IS ON THE CARD. DO NOT NARRATE IT") — keep it, and make the chip
   itself link to the standard so the tooltip carries the load instead of the prose.
7. **The negotiation conflict (R-09/I6):** when Tayo moves into negotiation mode, it must say plainly that
   it is working within limits the agency has set. Something in Tayo's register, for `toju-offer`:
   > Before we go further — when I negotiate on a home, I work inside limits the listing agency has set.
   > I'll tell you what I think is fair and what I'd push for, but I'm not a neutral party on price.
8. **Human escalation:** how to reach a person.
9. **Uncertainty:** already handled well by `DOCTRINE` ("value honesty over appearing knowledgeable").

**Backend accountability:** `toju-chat` already records prompt version and model on every assistant turn.
Extend the same to `toju-demo`. That record is exactly the evidence NDPA accountability calls for.

### 6.8 Backend work items (for backend-developer — and please loop me in before the schemas, not after)

1. `consent_events` migration (§6.3).
2. `erase_me()` / `forget_conversation()` / `my_data_summary()` RPCs and `privacy-export` function (§6.4, §6.6).
3. Retention cron jobs (§6.5).
4. Pre-flight identifier scrub before every LLM call (§5.4 option 4).
5. Confirm and document the Supabase region and whether Cloudinary is live (F6).
6. Access logging for `documents` reads (B4).
7. Review the eight `verify_jwt = false` functions, starting with `proximity-report`'s arbitrary
   `visitorId` and `social-generate`'s authorisation model (F2/R-17).
8. Nightly wipe of data written under the demo accounts (R-18).
9. Confirm `social_accounts` token storage is encrypted at rest beyond disk-level (F3).

---

## 7. Gap list for `privacy.html` and `terms.html`

Clause by clause, as requested. **I have not rewritten either document.**

> **Structural warning that applies to both files.** The policy text exists **twice** in each file — once
> in the `.m-page` mobile block and once in the desktop `.legal` block. `privacy.html` says so itself at
> lines 92–100. Every change below must be made **twice**, or phone and desktop visitors are shown
> different terms. **Strong recommendation: eliminate the duplication** — render one source and let CSS
> handle the layout. Two divergent copies of a privacy notice is a compliance problem waiting to happen.

### 7.1 `privacy.html`

| # | Clause | Issue | What it needs |
|---|---|---|---|
| **P1** | Header / "Draft" banner | A document labelled "working draft, not a reviewed legal document" is being served to real users as the operative notice | Either take the product offline to real users, or publish a real notice. A draft label is not a defence |
| **P2** | Controller identity | Absent — placeholder at line 181/252 | Registered name, RC number, registered address, email (F1) |
| **P3** | Supervisory authority | **The NDPC is never mentioned.** NDPA appears four times, "DPO" twice, "NDPC" zero | Name the Commission, state the right to lodge a complaint with it, give its contact |
| **P4** | DPO | Placeholder only | Named DPO/DPCO with a working, non-personal contact address (F3). Replace `ilios.intelligence@gmail.com` with `privacy@` on the company domain |
| **P5** | Lawful basis | **Absent entirely** | A basis per purpose — §3 is the starting table |
| **P6** | "What we collect" (lines 142–151 / 213–222) | Materially understates. Missing: `consumer_profiles` (income, marital status, children, dependants, employer), `consumer_places`, `property_views` (duration, scroll depth), `property_searches` (free-text queries), attribution touches, click events, push endpoints, lead scores | Full list, mapped to §3 |
| **P7** | "Anonymous visitor ID" (line 145/216) | Describes it as "not tied to your name or email". True in isolation — but the same id joins chat transcripts, attribution touches, location reports and, on handoff, a named lead. The word "anonymous" oversells it | Say what it is: a persistent device identifier that links your activity across the site, and how to clear it |
| **P8** | "Standard technical data ... browser type" (line 149/220) | Roughly accurate and, unusually, *under*-claims — `click_events` deliberately stores no IP and no user-agent. Worth saying so; it is a genuine trust asset | Keep, and state the minimisation explicitly |
| **P9** | "Talking to Tayo" (line 154/225) | Names Anthropic — good. Does not say where, does not state a transfer safeguard, does not say how long, does not mention the inferred profile | Add location (US), safeguard, retention, and the fact that a profile is inferred from the conversation |
| **P10** | "We do not use your conversations to train a public AI model" (line 154/225) | A statement about a third party's conduct with no contract cited | Back it with the provider DPA (F7) or soften it to what we control |
| **P11** | Dream/Mood board (line 155/226) | "stored in your browser (not on our servers)" — storage is accurate, but the board **is transmitted** to the server and on to the model as chat context | Correct to: stored on your device, and sent to Tayo (and our AI provider) as context when you chat |
| **P12** | Location (lines 157–159 / 228–230) | The best-written section, and still incomplete: does not say the position is **stored** in `geofence_watches.last_point`, does not give retention, does not mention `proximity_events` accumulating | Add storage, retention (§6.5), the ~100m rounding (a genuine strength — say it), and a deletion control |
| **P13** | "Nothing about your location is shown to an agency" (line 159/230) | Believed accurate, but an agency does see aggregated proximity-derived interactions | Verify against `channel_interactions` / `proximity_alert_outcomes` reporting and state precisely |
| **P14** | Accounts (line 162/233) | "We ask you to create an account at one specific moment" — accurate. But sign-up shows no terms, no policy and captures no consent | Reflect §6.3 once implemented |
| **P15** | "Who we share it with" — agency (line 169/240) | **"only your name and contact details" is wrong.** `create-lead` also sends the **budget range** and **Tayo's negotiation offer and advice**, by WhatsApp, to the agency's number | Correct it, or narrow the payload. The two must agree |
| **P16** | "Who we share it with" — service providers (line 170/241) | Names Supabase and "our AI provider" only | Add Twilio, Meta/WhatsApp, trypost, Meta/Instagram/Facebook, Paystack, Nominatim/OSM, Stadia Maps, Cloudinary, browser push services (G2) |
| **P17** | "Nobody else. No advertising networks, no data brokers" (line 171/242) | True today. But listings auto-post to Meta and `social-connect` holds Meta OAuth tokens — a reader could find that inconsistent | Keep the commitment, explain the Meta relationship so it doesn't read as a contradiction |
| **P18** | "Where it's stored" (line 175/246) | **A `[NEEDS LEGAL]` placeholder standing in for the single largest compliance exposure**, published for over a year | Full §5 disclosure: countries, recipients, safeguard relied on |
| **P19** | "Your rights" (line 178/249) | Lists access, correction, deletion. **Missing:** portability, restriction, objection, withdrawal of consent, the right regarding solely automated decisions, the right to complain to the NDPC, and the response timeline | Full rights set, each with a working route (§6.4) |
| **P20** | "Your rights" — anonymous data (line 178/249) | Honest, and now outdated as an excuse: the `toju_visitor_v1` UUID **is** a workable erasure handle | Replace with the actual control once §6.4 ships |
| **P21** | Profiling | **Absent entirely** | Disclose lead scoring, matching, trust scores, and the inferred profile, in outline (D5/I2) |
| **P22** | Retention | **Absent entirely** | Publish the §6.5 schedule |
| **P23** | Security | Absent | A short, honest paragraph: RLS, encryption in transit and at rest, access control, breach procedure |
| **P24** | Breach notification | Absent | Commit to notifying the NDPC within 72 hours and affected subjects where risk is high |
| **P25** | Children | Absent | Minimum age, and what happens if we learn a user is under 18 |
| **P26** | Browser storage | Absent | `toju_visitor_v1`, `syn_arrival_v1`, `synapse_moodboard_v1`, `synapse_places_*` — what each is, how long, how to clear. **`syn_arrival_v1` is written by `arrival.js` before any notice is shown** |
| **P27** | Agencies section (line 165/236) | Does not mention that `documents` accepts **director government ID** and **bank statements** | Add, with retention and access controls |
| **P28** | Versioning | "Draft — last updated 2026-07-30" | Version number, effective date, change log, and a notification mechanism |
| **P29** | Contact | A personal Gmail address | Role-based address on the company domain |
| **P30** | Reachability | **Not linked from any page under `app/`** | §6.1 |

### 7.2 `terms.html`

| # | Clause | Issue | What it needs |
|---|---|---|---|
| **T-A** | "Draft" banner (line 193) | Same as P1 | Publish a real document or gate the product |
| **T-B** | Parties | No Synapse legal entity named | F1 |
| **T-C** | Governing law / jurisdiction | **Absent** — placeholder at line 242 | Nigerian law; courts or arbitration seat. Note a mandatory arbitration clause that forecloses the FCCPC route is a candidate unfair term (K8) |
| **T-D** | Dispute resolution | **Absent** | Internal complaints procedure with a response SLA, escalation, then FCCPC/courts. Needed for consumers and separately for agencies |
| **T-E** | Data protection | **No data-protection content at all** | Incorporate the Privacy Policy by reference; identify the controller; state the agency's independent-controller role (G4) |
| **T-F** | Consumer statutory rights | Absent | A savings clause: nothing in these terms limits rights under the FCCPA 2018 |
| **T-G** | Limitation of liability | **Absent entirely** — no cap, no exclusion | Draft one, knowing broad consumer exclusions are of doubtful enforceability under the FCCPA and an over-broad clause can be struck down in full |
| **T-H** | Indemnity | Absent | Agency indemnifies Synapse for its own misrepresentation and fraud — the counterpart to warranting *process* not *outcome* |
| **T-I** | "What Verified means" (line 213) | **The published seven do not match the implemented seven.** Published: title documentation, ground survey, structural assessment, flood risk, ownership documentation, legal review, media accuracy. Enum `property_check_type`: `listing_authenticity`, `ownership_validation`, `media_validation`, `freshness_validation`, `structural_assessment`, `flood_risk`, `government_acquisition_risk`. `app/verify.html:82` already flags the mismatch | **One canonical list, derived from the enum, published once and used everywhere.** This is the highest-priority FCCPA item (K1) |
| **T-J** | Verification tiers | "Gold" appears 20 times in `app/` and is defined nowhere; two conflicting tier enums in the schema | Define each tier's criteria, or remove the tier (F11) |
| **T-K** | **"Verified agency"** | **Not defined at all** — yet it is a stated trust pillar | Define: CAC verification, SCUML, ESVARBON/NIESV where applicable, state licence (LASRERA etc.), director identity, office verification, bank verification, re-verification interval, and what suspension means. The schema already supports all of it (`agency_verifications`, `documents`, `0077`) — the *definition* is what is missing |
| **T-L** | Availability / 14-day reconfirmation (line 214) | Asserts unconfirmed listings expire and stop being offered. `0047_listing_availability_reconfirmation` exists — **verify the job actually runs**; if it does not, this is a misrepresentation | Verify, then either keep or soften |
| **T-M** | "Verified is a process, not a guarantee" (line 215) | **Good. Keep it verbatim.** It is the single best sentence in either document | No change |
| **T-N** | Tayo clause (line 218) | Good as far as it goes. Missing: **not a valuation** (ESVARBON, L1); **the negotiation conflict of interest** (I6/R-09); that Tayo's inferences form a profile | Add all three. The conflict disclosure is the important one |
| **T-O** | Buyers — contact (line 223) | "your contact details are shared with that agency" understates: budget range and Tayo's negotiation position also go | Align with P15 and with the consent sheet |
| **T-P** | Buyers — transactions (line 224) | Sound. The `[NEEDS LEGAL: payments clause]` note says no payment feature exists — **but `paystack-checkout`, `paystack-webhook` and `subscription_payments` are live for agencies** | Add an agency payments clause; keep the buyer position as-is |
| **T-Q** | Agencies — subscription tiers (line 231) | **No prices, no billing period, no renewal terms, no VAT, no refund, no cancellation** | FCCPA s.115 pricing disclosure (K4) and s.120 cancellation (K5). Must match `0040`'s actual design: pay once, 30 days, no auto-renewal, **no expiry cron** |
| **T-R** | Agencies — "Verification cannot be bought" (line 230) | **Excellent. Keep it verbatim.** It is precise, verifiable and it is the commitment the whole trust model rests on | No change |
| **T-S** | Agencies — leads "as-is" (line 232) | Fine. But `app/agency.html:11532` markets *"Never lose a lead — buyers land on your phone"* while Twilio is unconfigured and `create-lead` returns 207 | Fix the marketing copy (K11), not this clause |
| **T-T** | Agency agreement | **Agencies accept the same consumer ToS.** No separate agreement, no DPA, no listing warranties, no verification SLA, no termination/offboarding, no data-reuse restriction | A separate `agency-terms.html` — skeleton at `LEGAL_TRUST_MEMO.md` §5, which remains sound |
| **T-U** | "What we don't promise" (line 236) | Good. Missing: no warranty of continuous availability; no warranty that Tayo's output is accurate; no warranty of lead volume beyond the agency clause | Extend |
| **T-V** | Accounts & conduct (line 239) | One sentence | Age 18+; acceptable use; notice-and-takedown for fraudulent listings with a counter-notice; suspension and appeal with reasons |
| **T-W** | Intellectual property | **Absent entirely** | Synapse's IP; the licence agencies grant so listings and photographs can be **auto-published to social media** (`social-publish` does this today with no licence granted anywhere); ownership of AI-generated captions; user content licence; **OpenStreetMap ODbL attribution** and Stadia Maps terms; the font-licence question from `LEGAL_TRUST_MEMO.md` §4 (L6) |
| **T-X** | Changes (line 242) | Change signalled only by an updated date — a candidate unfair term | Notice for material changes; re-acceptance for terms that matter; version history |
| **T-Y** | Marketplace status (line 210) | "not a real estate agency, a broker, or a party to any transaction" is the right position, but Synapse verifies, ranks, recommends, **negotiates within a seller-set floor**, and charges a fee | Keep the statement; add an honest description of what Synapse *does* do, so the disclaimer is not doing work the facts won't support (K10) |
| **T-Z** | Boilerplate | Absent | Severability, entire agreement, no waiver, assignment, notices, force majeure, survival |
| **T-AA** | Acceptance mechanism | **No acceptance anywhere.** `app/signin.html` has no terms checkbox — a grep for `agree\|terms\|privacy\|consent` in that file returns nothing | Acceptance at sign-up, recorded with the terms version in `consent_events` (§6.3). Without it there is no evidence of contract formation |
| **T-AB** | Complaints | No internal procedure, no FCCPC reference | Add both |
| **T-AC** | Reachability | Not linked from any page under `app/` | §6.1 |

---

## 8. Priority ordering

### Tier 0 — legally urgent, start this week

| # | Item | Why now | Register ref |
|---|---|---|---|
| **1** | **Establish whether we have crossed the DCPMI threshold, and register if so** | A statutory registration obligation with a fee and a filing. It does not wait for the product to be ready | A2, F4 |
| **2** | **Write the breach response runbook** | 72 hours. You cannot invent a process inside 72 hours | F4, B5 |
| **3** | **Link `privacy.html` and `terms.html` from every page under `app/`** | Hours of work. Closes the most basic transparency failure in the product | D1, R-04 |
| **4** | **Correct the two live misstatements in `privacy.html`**: what the agency actually receives (P15), and the recipient list (P16) | Published statements that the code contradicts | G2, P15 |
| **5** | **Execute every vendor DPA** | Low effort, no downside, and it is the foundation of the cross-border safeguard | A5, §5.4 opt.1 |
| **6** | **Resolve the seven-checks mismatch** (T-I) and settle "Gold" (T-J) | A published warranty that differs from the process performed. FCCPA s.123–127 | K1, K3 |
| **7** | **Fix the erasure blocker** (§6.6) | Until it is fixed, we cannot lawfully answer an erasure request, and we would have to say so in writing to a regulator | E3, R-02 |

### Tier 1 — before any further public traffic

| # | Item | Register ref |
|---|---|---|
| 8 | AI disclosure in the chat UI — copy already drafted, never implemented | I1, R-10 |
| 9 | Consent at the chat entry point + `consent_events` ledger | C2, C7 |
| 10 | Consent sheet at the agency handoff, naming the agency and the payload | C6, R-08 |
| 11 | Full cross-border disclosure in `privacy.html` | H2, R-01 |
| 12 | Appoint the DPO and publish the contact | A4 |
| 13 | Retention schedule + purge jobs, `demo_chat_sessions` first | J1, R-06 |
| 14 | Terms acceptance at sign-up | T-AA |
| 15 | Disclose Tayo's negotiation conflict of interest | I6, R-09 |
| 16 | Fix `app/agency.html:11532` "Never lose a lead" | K11 |

### Tier 2 — before agency monetisation deepens

| # | Item | Register ref |
|---|---|---|
| 17 | Agency Agreement + DPA as a separate instrument | T-T, G4 |
| 18 | Define "verified agency" properly and publish it | T-K |
| 19 | Pricing, refund and cancellation terms for subscriptions | K4, K5 |
| 20 | Governing law, jurisdiction, dispute resolution, liability cap | T-C, T-D, T-G |
| 21 | Data & Privacy centre (`app/settings.html`) | E1–E6 |
| 22 | IP clause, including the social auto-publish licence and OSM attribution | T-W, L6 |
| 23 | Identifier scrub before the LLM call | §5.4 opt.4 |
| 24 | ESVARBON / LASRERA / SCUML scoping with counsel | L1, L2, L3 |

### Tier 3 — before the dormant schema wakes up

| # | Item | Register ref |
|---|---|---|
| 25 | Fresh DPIA before activating `financial_identities` or any lending table | I3, R-19 |
| 26 | CBN/payment-licensing scoping before escrow or wallets | L5 |
| 27 | Expansion-jurisdiction transfer posture | H5, F12 |
| 28 | Third-party personal data from Meta comments/DMs (backlog item) | G6 |

---

## 9. Status counts and uncertainty register

### 9.1 Counts

**Register items (§2): 71 total**, across A–L.

| Status | Count | Items |
|---|---|---|
| **COMPLIANT** | **3** | B-partial excluded; D4, F1-strengths noted separately, K7 — counted: D4, K7, plus F1's implemented controls are recorded as PARTIAL. **Strictly COMPLIANT: D4, K7, K12(subject to verification)** |
| **PARTIAL** | **19** | B1, B2, B4, C5, D2, D6, E2, E7, F1, F3, I3, I4, I5, J3, K1, K8, K9, K10, K11 |
| **GAP** | **33** | A4, A5, B5, B6, B7, B8, C1, C2, C3, C4, C6, C7, C8, D1, D3, D5, E1, E3, E4, E5, E6, E8, F4, F5, F6, G1, G5, H1, H2, H3, H4, I1, I2, I6, J1, J2, J4, J5, K3, K4, K5 — *(see note)* |
| **UNKNOWN** | **11** | A1, A2, A3, B3, F2, F6 (in-register: F3-encryption), G3, K2, K6, L1, L2, L3 |
| **NOT YET** | **5** | G6, H5, I3(dual), K8(dual), L5 |

*Note on arithmetic:* several items carry a compound status (e.g. **I3** is NOT YET for consumers and
PARTIAL for agents; **K8** is PARTIAL/NOT YET). Counting each item once by its **worst** status gives the
headline figures below, which are the ones to quote:

| Status | Count |
|---|---|
| **COMPLIANT** | **3** |
| **PARTIAL** | **19** |
| **GAP** | **33** |
| **UNKNOWN** | **11** |
| **NOT YET** | **5** |
| **Total** | **71** |

**DPIA risks (§4.3): 20.** 3 at inherent 20, 1 at 16, 6 at 15, 4 at 12, 3 at 10, 3 at 8–9.
**Implemented mitigations: 0 full, 4 partial.**

**Facts needed from Eden (§1): 15.**

**Document gaps: `privacy.html` 30 · `terms.html` 29.**

### 9.2 Where I am uncertain, stated plainly

1. **Exact section and article numbers.** Marked throughout. The substance I stand behind; the numbering
   must be verified against the gazetted texts.
2. **Current NDPC adequacy position.** I am not aware of a published adequacy list including the US. I
   cannot rule out that one exists or has been issued since my knowledge cutoff. **Counsel must check.**
3. **GAID DCPMI sub-category bands and fees.** The >200-in-six-months entry threshold I am reasonably
   confident of. The UHL/EHL/OHL band boundaries returned inconsistent figures in the sources I could
   reach. **Read them off the current NDPC schedule.**
4. **Data-subject response deadline.** Commonly worked as 30 days. I could not confirm the GAID period.
5. **FCCPA section numbers** for unfair terms and misleading representations. The substance is settled; the
   numbering ranges I have given are approximate.
6. **FCCPC online-marketplace guidance.** I believe guidance exists or is in draft. I cannot confirm its
   current status. Relevant to K10.
7. **Whether Synapse needs LASRERA registration, SCUML registration, or is constrained by ESVARBON.** These
   are genuinely open questions for a Nigerian real-estate lawyer and I will not guess at them.
8. **Whether `social-generate` authorises its caller.** It runs `verify_jwt = false` and I could not
   determine its in-function authorisation model from the source.
9. **Whether the 14-day reconfirmation job actually runs.** Migration `0047` exists; I did not confirm a
   live schedule. `terms.html` makes a published claim that depends on it.
10. **Whether Cloudinary is live.** The schema requires `cloudinary_public_id` NOT NULL on two tables. If
    it is live, it is an undisclosed processor and a further transfer.

---

## 10. Closing note

Two things are worth saying plainly.

First: **the engineering in this codebase is, on the whole, unusually privacy-conscious.** Deliberately not
storing IP addresses or user-agent strings; rounding a location fix before it touches the database;
refusing client inserts into an outbox so it cannot become an open SMS gateway; a consent-grant table with
the strictest RLS on the platform; a migration whose entire purpose is to remove columns nothing could
honestly fill; and a verification write path built specifically so a verification record cannot exist
without the history row that explains it. That is a real asset, and a licensed reviewer should be pointed
at it, because it materially changes the posture from "careless" to "careful but unpapered".

Second: **the gap is not carefulness, it is paperwork and plumbing.** The product makes honest choices and
then fails to write them down, fails to tell the user, and — in the case of erasure — has built an audit
trail so faithful that it now blocks a statutory right. Those are all fixable, and most of them are fixable
in days.

**Nothing in this document is legal advice. A Nigerian-qualified lawyer must review it — and must review
any language drawn from it — before anything is published, filed, or relied upon.**

---

*Companion documents: `docs/LEGAL_TRUST_MEMO.md` (July 2026), `docs/CONSENT_AND_DISCLOSURE_COPY.md`
(July 2026, largely unimplemented), `docs/R-00-regulatory-constraints-investment-offerings.md` (July 2026,
treat its verdicts as binding until counsel says otherwise).*

*Please loop me in at design time on: the financial identity / lending schema, any escrow or wallet work,
Meta comment ingestion, any new jurisdiction, and any new third party that will receive personal data.*
