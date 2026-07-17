# Synapse — Legal & Trust-Infrastructure Memo

_Last updated 2026-07-17. Prepared by the legal/compliance agent as a **strategic-partner advisory**, not legal advice._

> **Standing caveat (applies to every line below).** I am not a lawyer and this is not legal advice. Everything here — including the ready-to-paste copy — is a **starting point that a licensed Nigerian lawyer (NDPA/NDPR-competent, and ideally with real-estate and consumer-protection experience) must review and sign off before anything is published or relied on.** I over-flag on purpose. Where I say "warrant," "consent," or "liability," treat it as a drafting hypothesis for counsel to confirm, not a settled legal position.

---

## 0. How to read this memo — the two gates

Everything is sorted into two priority gates. Do not let this memo gate the demo — none of Gate 1 blocks the current no-login prototype from running. Gate 1 is what must be true **before real buyers (real people typing real personal circumstances to Toju) arrive**, even without accounts. Gate 2 is what must be true **before Synapse takes money from agencies or lets agencies transact through the platform.**

| Gate | Trigger | Items |
|------|---------|-------|
| **Gate 1 — before any public buyer traffic** | The moment a link goes out to real members of the public (soft launch, waitlist demo, press, ads) | Privacy notice for demo capture (§1A); AI disclosure + verified/unverified labels live in the UI (§2); verification-warranty language published wherever a "Verified" badge appears (§3); no marketing claim that promises price/return/safety outcomes (§6); font license resolved if the public page renders Restaglick/Bromolek (§4) |
| **Gate 2 — before agency monetization** | First paid agency subscription, or first agency transacting/negotiating through Synapse | Full ToS + consumer-protection terms; full NDPA consent + DPCO/audit posture for accounts (§1B); agency agreement + verification SLA (§5); dispute resolution; escrow/FlexPay financial-services review (§7) |

---

## 1. Data privacy (NDPA / NDPR) for buyer conversation data

**Legal frame.** The controlling law is now the **Nigeria Data Protection Act 2023 (NDPA)**, administered by the **Nigeria Data Protection Commission (NDPC)**; the older **NDPR 2019** and its Implementation Framework still supply operational detail. Synapse is a **data controller**. Toju conversations routinely capture personal data and often **sensitive-adjacent** data — household composition, children, income/affordability, work location, daily movement patterns. That is a richer profile than a typical property search and raises the stakes.

### What Synapse actually captures today
- **`demo_chat_sessions`** (Supabase, server-side): conversation text, extracted criteria (budget, city, household, work, lifestyle), and matches — keyed by a **`visitorId` UUID**. Even with no name/email, this is **personal data** under NDPA: it is information relating to an identifiable person, and the free-text conversation can contain direct identifiers the user volunteers (name, phone, exact address, employer).
- **`synapse_moodboard_v1`** (browser `localStorage`): Dream Board pins and saved homes. Stays on-device, but Toju **reads it server-side on every chat call**, so once transmitted it is processing under Synapse's control.
- No account, no login, no consent flow exists yet (auth deferred).

### 1A. What the **no-login demo** needs now (Gate 1)
You do not need an account system to owe data-protection duties — you owe them the moment you process a real person's data. Minimum viable posture:

1. **Transparency / privacy notice at the point of capture.** A short, plain-language notice visible before or at the first Toju message and linked persistently. NDPA requires that people know who is processing their data, why, on what lawful basis, how long, and their rights — even anonymously. Draft copy in §1C.
2. **Lawful basis.** For the demo, the cleanest basis is **consent** for the conversational capture plus **legitimate interest** for operating/improving the service. Because the data can get sensitive (household, finances), lean on **explicit, unbundled consent** framing rather than buried terms. A one-line "By chatting you agree to our Privacy Notice" checkbox/acknowledgement is the low-friction option — counsel to confirm it clears NDPA's consent bar.
3. **Purpose limitation + no silent secondary use.** Do not use demo conversations to train models, seed marketing, or share with agencies **unless** the notice says so and consent covers it. Right now the safe default is: operate the demo only.
4. **Retention + deletion path.** Define a retention window for `demo_chat_sessions` (suggest 30–90 days for demo data) and a way to honour a deletion request. Because there is no login, offer a **"clear my conversation / forget me" control** tied to the `visitorId` and document that the UUID is the handle for erasure requests.
5. **Data-subject rights channel.** A working contact (email is fine) for access/erasure/objection requests, named in the notice.
6. **Security + locality.** Confirm the Supabase region and whether data leaves Nigeria; NDPA restricts cross-border transfer without adequacy/safeguards. **This intersects the backend's international-expansion mandate — flag now:** the moment data is processed or replicated outside Nigeria, cross-border transfer rules (NDPA + destination-country law, e.g. GDPR if EU) apply. Do not assume Nigeria-only rules stay sufficient.
7. **Backend coordination (do this before schemas harden).** Ask backend-developer to confirm: (a) is `visitorId` ever linked to an IP, device fingerprint, or later account? — if yes the whole session becomes more identifiable; (b) is there a TTL / purge job on `demo_chat_sessions`?; (c) is conversation text ever logged to third parties (Anthropic API calls send conversation content to a US processor — that is a **cross-border transfer and a sub-processor** that must be disclosed).

> **Anthropic sub-processor flag (important).** Toju sends conversation content to Claude (Anthropic, US). That is both a cross-border transfer and third-party processing. The privacy notice must disclose "we use third-party AI providers to power Toju," and a Data Processing Agreement posture should be confirmed with counsel. This is easy to miss because it is invisible in the UI.

### 1B. What changes when **accounts** arrive (Gate 2)
- **Formal consent capture** at signup: granular, unbundled, withdrawable; separate toggles for (a) core service, (b) product improvement/model use, (c) marketing, (d) sharing leads with agencies.
- **Full Privacy Policy** (not just a notice) covering profiles, conversation history, saved boards, payment data, and agency lead-sharing.
- **Payment data** (FlexPay / installments / escrow) is higher-sensitivity and may pull in CBN / financial-services rules as well as PCI-DSS-style handling — **do not store card/bank data in app tables**; use a licensed processor. Flag to backend before payment schemas are designed.
- **NDPA compliance operations:** likely need to register/file with NDPC, appoint a **Data Protection Officer / engage a licensed DPCO** for the annual audit if processing thresholds are met, and run a **DPIA** because profiling + location + finances is high-risk processing.
- **Lead-sharing consent:** the moment a buyer's conversation becomes a "lead" handed to an agency, that is a disclosure to a third party and needs its own consent + a controller/processor agreement with the agency.

### 1C. Ready-to-use — demo privacy notice (short form)

> **DRAFT — requires Nigerian counsel review before publishing.**

> **Your privacy, in plain terms.** When you chat with Toju, Synapse stores your conversation and the preferences you share (like budget, location and household) so Toju can find and remember your matches. We keep this to run and improve Synapse — we don't sell it. Toju is powered in part by third-party AI providers, so your messages are processed to generate replies. You can ask us to show or delete your data at any time at [privacy@synapse…]. By continuing, you agree to this and to our [Privacy Notice]. See the full notice for how long we keep data and your rights under the Nigeria Data Protection Act.

One-line acknowledgement (for the chat entry point):

> _By chatting with Toju you agree to our [Privacy Notice]. Please don't share full bank details, ID numbers or passwords in the chat._

(The second sentence is a cheap, high-value data-minimisation nudge — it reduces how much sensitive data lands in `demo_chat_sessions` in the first place.)

---

## 2. AI disclosure for Toju + verified/unverified labels

**Why this is Gate 1, not cosmetic.** Toju is positioned as an "advisor," speaks warmly and confidently, and gives price context, yield figures and neighbourhood claims. Under consumer-protection and emerging AI-transparency norms, users must (a) know Toju is an AI, and (b) not reasonably read Toju's output as a **guarantee** or as **regulated financial/legal/real-estate advice**. The good news: Toju's own **doctrine already says this** ("no financial, investment or legal guarantees — point people to professional verification"; "if something cannot be verified, say so"). The disclosure copy below simply makes the doctrine visible and legally load-bearing in the UI. It aligns with, and does not contradict, the doctrine.

### 2A. Ready-to-use — Toju AI disclosure

> **DRAFT — requires Nigerian counsel review.** Align verbatim with the `DOCTRINE` constant in `toju-demo`.

**First-run / intro line (shown before or on Toju's first message):**

> Hi, I'm Toju — Synapse's **AI** property advisor. I help you think through renting, buying and neighbourhoods using real, verified listings. I'm not a person, and I'm not a lawyer, financial adviser or estate agent — treat what I say as **guidance to help you decide, not a guarantee or professional advice.** For anything that affects your money or your legal rights, please confirm with a qualified professional before you commit.

**Persistent short label (near the chat input, always visible):**

> Toju is an AI advisor. Guidance only — not financial, legal or property-transaction advice. Not a guarantee.

**Standing footer / "About Toju" expandable:**

> Toju is an artificial-intelligence assistant built by Synapse. Toju's estimates — including prices, yields, affordability, commute times and neighbourhood descriptions — are informational and can be incomplete or wrong. They are **not** valuations, financial advice, investment advice, legal advice, or a promise about any property's condition, title, availability or price. Always verify independently and take professional advice before making a decision. Toju recommends only listings that Synapse has marked verified, but see our Verification Standards for exactly what "verified" does and does not warrant.

**Boundary micro-copy (for Toju to fall back on when a user pushes for a guarantee — hand to toju-ai to bake into prompts):**

> "I can't promise you'll make money on this, and I won't pretend a price or return is certain — that wouldn't be honest. What I can do is show you the numbers I have and what to check. For the final call on [returns / title / mortgage], you'll want [a lawyer / a licensed financial adviser / a surveyor]."

### 2B. Ready-to-use — verified vs unverified listing labels

The product already uses "Verified," "Pending review," and a 7-node badge. Standardise the **words next to the badge** so the badge carries a defined, limited meaning (this is what makes §3's warranty enforceable and honest).

**Verified badge — tap/hover tooltip:**

> **✓ Verified by Synapse.** This listing passed Synapse's 7-point verification (title, structure, flood, legal, ownership, media, freshness) and was re-confirmed within the last 14 days. Verification reduces the risk of ghost or misrepresented listings — it is **not** a guarantee of condition, valuation, or that every detail is current. See Verification Standards.

**Unverified / pending label:**

> **⏳ Not yet verified.** Synapse has **not** completed its checks on this listing. Details may be inaccurate, out of date, or unconfirmed. Toju does not recommend unverified listings — treat anything here with extra caution and verify independently.

**Freshness sub-label (14-day rule):**

> Re-confirmed [N] days ago. Synapse hides listings that aren't re-confirmed within 14 days.

---

## 3. Verification-desk liability framing

This is the crux of the whole product: "no ghost listings" is the promise, and a promise creates a duty. The legal goal is to **warrant the process, not the outcome** — say precisely what Synapse did, and precisely what it did not.

### 3A. What Synapse **warrants** when it marks a listing "Verified"
Anchor the warranty to the **7 nodes that actually run** (`NODES = ['Title','Structure','Flood','Legal','Ownership','Media','Freshness']`). Synapse warrants only that, **at the time of verification and using the information/documents then available**, it:
- reviewed documentation asserting **title** and **ownership** for the listed property;
- performed a **structure** and **media** check so the listing's photos/description correspond to a real, specific property (anti-ghost-listing core);
- ran **flood** and **legal** risk checks against available data;
- confirmed the listing was **re-confirmed fresh within 14 days**.

Frame it as: **"Verified means we did these seven checks and they passed on [date]."** That is a factual, defensible statement.

### 3B. The **limits** of the warranty (must be published, not buried)
Synapse must expressly **not** warrant:
- that the property's **physical condition** matches expectations, or is free of defects;
- the **accuracy of price, valuation, yield or affordability** figures (those are estimates, incl. Toju's);
- that **title/ownership is legally perfect** — Synapse reviews documents provided; it is not a substitute for a buyer's own lawyer conducting title search/perfection at the Land Registry;
- that facts remain true **after** the verification date (things change; hence the 14-day re-confirm, which mitigates but does not eliminate staleness);
- the **conduct of the agency or seller** in the actual transaction (see §5 — the agency, not Synapse, is the counterparty to the deal).

### 3C. Ready-to-use — Verification Standards statement

> **DRAFT — requires Nigerian counsel review.**

> **What "Verified" means on Synapse.** When you see the ✓ Verified badge, it means Synapse's verification desk reviewed the listing against seven checks — title documentation, structure, flood risk, legal status, ownership documentation, media/photo accuracy, and listing freshness — and they passed on the date shown, and the listing was re-confirmed within the last 14 days. Our goal is simple: no ghost listings, and no listings that misrepresent a real property.
>
> **What it does not mean.** Verification is a documentary and process check, not a guarantee. It does not confirm the property's physical condition, does not value the property or guarantee any price, yield or return, and does not replace your own independent legal due diligence (including a formal title search and perfection through your lawyer) or a physical inspection. Synapse relies on documents and data available at the time of the check, and facts can change afterward. Estimates shown by Toju are informational only.
>
> **Your protection.** Always inspect the property, engage your own lawyer to confirm title before paying, and use Synapse's protected payment routes where available. If a verified listing turns out to be materially misrepresented, tell us at [trust@synapse…] — maintaining verification integrity is how Synapse earns your trust.

### 3D. Internal risk flags for counsel
- **Keep verification evidence.** For every "Verified" mark, store which documents were reviewed, by whom, and when. Without an audit trail, the warranty is unprovable and indefensible if challenged.
- **Liability cap + disclaimer belong in ToS**, cross-referenced from the badge tooltip. Counsel to advise enforceability of limitation-of-liability clauses under Nigerian consumer-protection law (FCCPA) — such clauses are not always fully enforceable against consumers.
- **Do not let marketing inflate the badge.** Copy like "zero surprises" or "your naira is safe until every check passes" (already present in agency.html demo captions, lines ~888/1037) **overstates the warranty** and could be read as a guarantee. See §6 — flag these to digital-marketer/social-media-manager.
- **Tiered badges** ("Gold Verified" appears in the portal) need defined criteria per tier, or drop the tiering — an undefined "Gold" is a claim without substance.

---

## 4. Font license note — Restaglick / Bromolek

**Status:** The brand fonts (Restaglick display, Bromolek accent) are, per the brief and `fonts/README.txt`, **licensed marketplace fonts held under demo/personal-use terms only**, and the licensed files are intentionally not committed (the landing page falls back to Fraunces/Inter until licensed files are dropped in).

**Risk:** Shipping a **public, commercial** product (marketing site, app, ads, social creatives) rendering these faces under a personal-use/demo license is a **copyright/licensing infringement risk** — foundries do enforce this, and a webfont deployment additionally needs a **web/embedding license**, which is a separate grant from desktop use.

**Action (Gate 1 if the public build renders these faces):**
1. Purchase a **commercial license** covering the exact uses: **webfont/@font-face embedding**, app UI, and — importantly — **use in exported marketing/ad creatives** (some licenses restrict use in "for-sale" or advertising templates).
2. Confirm the **pageview/traffic tier and domain scope** matches expected launch volume.
3. Keep the license certificate/receipt on file.
4. **Until the commercial license is secured, keep the Fraunces/Inter fallback for anything public-facing.** The demo-only fallback is a clean, compliant default — do not swap in the licensed files on a public URL before the license exists.
5. Confirm whether the specific foundry EULA permits **modifying/subsetting** the font files (common for web optimisation).

This is low-legal-complexity but **non-negotiable before public launch** — font infringement is a frequent, easily-avoided source of demand letters.

---

## 5. Agency agreement — terms to flag now (detail deferred to Gate 2)

Full drafting waits for the agency-monetization phase, but flag the skeleton now so product decisions (verification desk, Toju-negotiator, lead attribution) don't get made in a way that's hard to paper later.

Core terms the agency agreement will need:
1. **Eligibility & KYC of the agency itself.** Real business registration (CAC), and — critically for the trust promise — confirmation the agency is legitimately entitled to list (this is upstream of listing-level verification). "Verified agency" must mean something: registration + identity + track-record checks, not a UI badge.
2. **Listing warranties from the agency to Synapse.** The agency warrants it has the right to market each property, that its documents are genuine, and that details are accurate — with an **indemnity** flowing to Synapse if a listing is fraudulent or misrepresented. This is what lets Synapse warrant *process* (§3) while pushing *substantive* liability to the party that actually knows the truth.
3. **Verification cooperation + SLA.** Agency must supply documents for the 7 checks; define turnaround, re-confirmation duties (the 14-day rule), and consequences of failing/falsifying a check (delisting, suspension, ban).
4. **Toju-as-negotiator authority + the negotiation floor.** Define the agency's authority granted to Toju, that Toju negotiates within an agency-set encrypted floor, and that outcomes are not guaranteed. Clarify Synapse is a facilitator, **not** the seller's agent or a party to the sale.
5. **Fees / commission / subscription.** Payment terms, refunds, what a subscription does and doesn't buy — tie to consumer-protection-clean pricing (no guaranteed-lead claims unless deliverable).
6. **Data-sharing & lead handling.** Controller/processor roles for shared buyer leads, consent chain (see §1B), and restrictions on the agency's re-use of buyer data.
7. **Liability allocation & indemnity.** Agency indemnifies Synapse for its own misrepresentations/conduct; Synapse's liability capped; clear that the property transaction is between buyer and agency/seller.
8. **Dispute resolution.** Governing law (Nigeria), and an escalation/arbitration path (e.g., Lagos arbitration) — plus an internal complaints channel before formal dispute.
9. **Termination & offboarding.** Grounds (fraud, repeated verification failures), and what happens to live listings/leads/data on exit.
10. **Financial-services intersections (escrow / FlexPay).** If Synapse touches funds, this likely triggers CBN/payment-licensing questions — must be scoped with counsel before launch, not after.

---

## 6. Cross-team copy-review flags (Gate 1, ongoing)

For digital-marketer, social-media-manager and toju-ai. I should be looped in on new marketing claims and Toju behaviours early (per mandate), but immediate flags from existing copy:

- **"zero surprises," "your naira is safe until every check passes," "escrow-protected," "Real returns."** These read as **guarantees** and **overstate the verification warranty** (and the returns claims edge toward regulated financial promises). Reword to process/qualified language, e.g. "seven checks before it goes live," "protected payment routes," "independently reviewed yield estimate — not a promise."
- **Yield/return figures in captions** ("8.1% gross yield," "beats the Lagos average") — attach "estimate, not a guarantee; verify independently" and ensure the underlying number is real (per the no-fabricated-stats rule), or they become actionable misrepresentations.
- **"Verified" in ad creatives** — good and encouraged, but the creative should not imply Synapse guarantees the deal; the badge means the 7-check process, nothing more.
- **Any "we guarantee you'll find/save/earn…"** framing — do not ship. It contradicts Toju's doctrine and creates consumer-protection (FCCPA) exposure.

---

## 7. Prioritized action list

**Gate 1 — before any public buyer traffic:**
1. Publish the demo **privacy notice** (§1C) + one-line acknowledgement at Toju's entry point; disclose the Anthropic sub-processor/cross-border transfer.
2. Ship the **Toju AI disclosure** (§2A) and standardise **verified/unverified labels** (§2B) in the UI.
3. Publish the **Verification Standards** statement (§3C) wherever the badge appears, and start keeping a **verification audit trail** (§3D).
4. Confirm **`demo_chat_sessions` retention/purge + a "forget me" path** with backend (§1A.7).
5. Resolve the **font commercial license** or keep the Fraunces/Inter fallback on public builds (§4).
6. Sweep **marketing/Toju copy** for guarantee-style claims (§6).
7. **Get a licensed Nigerian lawyer to review** all published copy above.

**Gate 2 — before agency monetization:**
8. Full **ToS + Privacy Policy** with granular consent, DPIA, NDPC registration/DPO/DPCO posture (§1B).
9. **Agency agreement** + verification SLA + indemnity (§5).
10. **Payment/escrow/FlexPay** financial-services + PCI review with counsel (§1B, §5.10).
11. **Dispute-resolution** framework, both consumer and agency.
12. **Cross-border/expansion** data-transfer posture as the backend's international mandate activates (§1A.6).

---

_End of memo. Reminder: draft language only; a licensed Nigerian lawyer must review before publication or reliance. Loop me in early on new features and new claims — trust is the product, and legal is part of building it._
