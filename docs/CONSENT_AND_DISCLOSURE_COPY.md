# P1-05 — Consent, AI-disclosure and data-sharing copy

_Prepared by the legal/compliance agent, 2026-07-31. Companion to `docs/LEGAL_TRUST_MEMO.md`._

> **Standing caveat.** I am not a lawyer and this is not legal advice. Every line of copy below
> is a **drafting starting point that a licensed Nigerian lawyer (NDPA/NDPR-competent, ideally
> with consumer-protection experience) must review before it is published or relied on.** Where I
> use words like "consent," "share," or "we do not," treat them as hypotheses for counsel to
> confirm — not settled positions.

> **This document changes no application file.** It is copy for a frontend implementer to apply
> later. Nothing here authorises wiring the contact-agency send, changing `DEMO_MODE`, or
> altering any behaviour. Copy only.

---

## 0. How to read this document

There are two consent moments in scope and, for the first one, **two mutually exclusive variants**
because a founder decision is outstanding.

| | Moment | File | Status |
|---|---|---|---|
| §2 | Contact-agency flow — **Variant A, demo-honest** | `app/property.html` | **Primary deliverable. Ready for counsel review, then implementation.** |
| §3 | Contact-agency flow — **Variant B, real transmission** | `app/property.html` | **CONTINGENT — NOT APPROVED FOR USE.** Blocked on a founder decision *and* on four unmet prerequisites listed in §3.0. Do not ship. |
| §4 | Toju first-visit greeting + AI disclosure | `app/toju.html` | Ready for counsel review, then implementation. Variant-independent — applies either way. |
| §5 | Truthfulness / disclosure gap register | app-wide | Findings, not copy. Several are higher priority than the copy itself. |

**Exactly one of Variant A or Variant B may exist in the product at a time.** Shipping A while the
send is live understates what happens. Shipping B while the send is fake is a false statement to
the user about their own personal data — materially worse than the current toast, because it is
more specific and more credible.

---

## 1. House style (derived from the established standard)

The proximity opt-in in `app/notify.js` (rendered into `.prox-card`, styled in `app/app.css`
lines 130-154) is the register to match. Its comment block states the rule:

> _"Location is the most sensitive permission we ask for, so the control says plainly what it
> does, what it will not do, and how to stop it."_
> _"Deliberately plain about what it does and what it cannot do — location is not something to
> opt someone into with a cheerful half-truth."_

Rules extracted from it, which all copy below follows:

1. **Three parts, in order: what it does / what it will not do / how to stop it.** The negative
   space is load-bearing — the "will not" is the part that earns the consent.
2. **No exclamation marks.** None appear in the prox card. None appear here.
3. **No reassurance that outruns the facts.** The prox card volunteers its own limitation ("a
   browser cannot check your location once the tab is gone") rather than hiding it. Copy here
   volunteers limitations the same way.
4. **Second person, present tense, short sentences.** "You choose the areas, and you can switch
   it off any time" — not "users may configure their preferences."
5. **Concrete quantities over adjectives.** "at most a few a day, never between 9:30pm and 8am" —
   not "we won't spam you."
6. **The control states its own off-switch in the same breath as its on-switch.**

Additionally, for the contact flow specifically: **name the third party.** "an agency" is weaker
than "Prestige Realty Ltd." The user is consenting to a disclosure to a specific named company,
and the copy should show that company's name.

---

## 2. VARIANT A — contact-agency flow, demo-honest (PRIMARY)

**Applies to:** `app/property.html`, the `#contactBtn` control and its handler's user-visible
strings (currently the toast at the 650ms `setTimeout`).

**Premise:** the button transmits nothing. The auth gate in front of it is real. Copy must be true
of that exact state.

### 2.1 Consent sheet — shown on tap, before anything else

Structure mirrors `.prox-card`: a heading, a what-it-does body, a what-it-will-not-do body, a note
carrying the honest limit, and a single action.

> **Contacting Prestige Realty Ltd.**
>
> In the finished product, this is the point where your details leave Synapse. Prestige Realty
> Ltd. would receive your name, your phone number, the home you are asking about, and the budget
> range you gave Toju — enough for them to call you back about this specific home.
>
> They would not receive your conversation with Toju, your saved homes, your Dream Board, your
> location, or your email address. No other agency would receive anything.
>
> **This is a prototype, so none of that happens yet.** Nothing is sent, no agency is contacted,
> and no one will call you. You are looking at how the step will work, not using it.

**Primary action label:** `See what happens next`
**Secondary action label:** `Close`

_Drafting note for the implementer: the "would receive" list is not decorative — it is the exact
payload `create-lead` assembles (`consumer_name`, `consumer_phone`, property title/price/city,
and `preferences.budget_min`/`budget_max` from the latest chat session). If that payload changes,
this list must change with it. See §5, finding **T-4**: the currently published privacy policy
describes a narrower disclosure than the code performs._

### 2.2 Confirmation state — replaces the current toast

The current string — _"Your request has been sent to the agent — they'll reach out on WhatsApp
shortly."_ — is false in three separate ways: nothing was sent, no agent was contacted, and no one
will reach out. Replace with:

> **Nothing was sent.** This is a prototype of the contact step — Prestige Realty Ltd. has not
> been contacted and has not received your details. In the finished product this is where the
> agency would get your name, phone number and the home you asked about.

**Button label after tap:** `Prototype — nothing sent`
(Not `✓ Request sent`. The tick mark asserts completion of a thing that did not happen, and reads
as a receipt.)

### 2.3 Button label, before tap

Current label `Contact agent` is acceptable under Variant A **only if** the sheet in §2.1 fires
before anything else, because the label promises an action the product does not perform. Safer:

> `Contact agent — prototype`

or, if the founder prefers the button to read clean, keep `Contact agent` and make the §2.1 sheet
mandatory and non-skippable. **Do not ship a bare `Contact agent` button with no sheet.** That
combination is the current state and it is the problem.

### 2.4 The auth-unavailable path

The handler currently falls through to the fake send when `window.SynAuth` is missing or
`ready()` rejects — a deliberate, defensible choice under Variant A (nothing is transmitted, so
falling through leaks nothing). Under Variant B that fall-through becomes a live send by an
unidentified user and must be removed. Flagged again in §3.0.

### 2.5 Persistent line for the property page footer

> Synapse does not pass your details to any agency until you choose to contact one, and this
> prototype does not pass them at all.

---

## 3. VARIANT B — contact-agency flow, real transmission

# ⛔ CONTINGENT DRAFT — NOT APPROVED FOR USE

**Do not implement this section.** It exists so the founder can see what honest copy for a live
send looks like when weighing the decision. It becomes usable only after (a) the founder decides
to wire the real send, (b) all four prerequisites in §3.0 are met, and (c) Nigerian counsel
reviews it. Publishing this copy while the send is fake would be a specific, credible false
statement about the handling of a user's personal data — a worse position than today's vague one.

### 3.0 Prerequisites that are NOT met today

Each of these makes the Variant B copy untrue as of this writing.

| # | Prerequisite | Current state |
|---|---|---|
| B-1 | **A phone number is collected from the buyer.** | `app/signin.html` collects name, email, password only. `create-lead` reads `profiles.phone`, finds null, and sends the agency `*Phone:* (in app)` — pointing at an in-app messaging channel that does not exist. The agency would have no way to reach the buyer, while the UI promises a WhatsApp callback. |
| B-2 | **A way for the user to stop replies exists.** | There is none. No withdrawal control, no "stop contacting me", no lead-revocation path. Copy cannot describe a stop mechanism that is not built, and the third part of the house structure ("how to stop") cannot be honestly written without one. |
| B-3 | **The privacy policy discloses the delivery chain.** | `privacy.html` §"Who we share it with" names Supabase and the AI provider. `create-lead` also transmits buyer name, phone and budget through **Twilio** (US) to **WhatsApp/Meta**. Two undisclosed sub-processors and a cross-border transfer. |
| B-4 | **The privacy policy discloses what is actually shared.** | `privacy.html` says an agency receives "only your name and contact details." `create-lead` also sends the buyer's **budget range** from their Toju session. Financial information about the user, disclosed to a third party, contradicted by the published policy. |

Also required before Variant B: remove the auth fall-through in §2.4, and confirm with counsel
whether a lead handoff needs its own unbundled consent under NDPA rather than riding on account
creation.

### 3.1 Consent sheet (contingent)

> **Contacting Prestige Realty Ltd.**
>
> Prestige Realty Ltd. will receive your name, your phone number, the home you are asking about,
> and the budget range you gave Toju. They will contact you on WhatsApp about this home.
>
> They will not receive your conversation with Toju, your saved homes, your Dream Board, your
> location, or your email address. No other agency receives anything, and Synapse does not pass
> your details on again.
>
> To stop hearing from them, reply STOP to their WhatsApp message, or email
> [privacy@synapse.ng] and we will withdraw your details from that agency. Once a message has
> reached them, we cannot unsend it.

**Primary action:** `Share my details with Prestige Realty Ltd.`
**Secondary action:** `Not now`

_The last sentence is deliberate. "We cannot unsend it" is the kind of limitation the prox card
volunteers about itself, and it is the truth about a WhatsApp handoff._

### 3.2 Confirmation (contingent)

> **Sent to Prestige Realty Ltd.** They have your name, phone number and the home you asked
> about, and they typically reply on WhatsApp. Synapse does not control how quickly they respond.
> To stop hearing from them, email [privacy@synapse.ng].

### 3.3 Failure state (contingent)

`create-lead` can return 207 — lead saved, WhatsApp delivery failed. The UI must not report
success in that case:

> **We saved your request, but could not deliver it to Prestige Realty Ltd. just now.** They have
> not received your details yet. We will retry, and you can email [privacy@synapse.ng] to cancel
> the request entirely.

_Note the existing negotiation-panel error copy already models this well — it ends "Nothing was
sent to the agency." (`app/property.html` line 529). That sentence is honest and should be kept._

---

## 4. Toju's first-visit greeting and AI disclosure

**Applies to:** `app/toju.html` — the `GREETING` constant (line ~681), the `.tj-eyebrow` /
`.tj-trust` header block (lines ~261-263), and the composer area.

### 4.0 What is wrong with the current state

The greeting reads: _"Good afternoon. I'm Toju — your consultant at Synapse. Tell me what you're
looking for and I'll find verified homes that fit. No forms, no endless scrolling."_

Three problems. **Toju never says it is an AI** anywhere in the chat UI. **"Consultant"** is the
wrong word — in a property and money context it implies a human professional, and it sits closer
to regulated advice than "advisor" does. And the page header says "Your property advisor" with no
AI qualifier. `terms.html` §Toju already commits to "Toju is an AI advisor... not financial,
investment, or legal advice" — the chat UI simply does not carry it, and **no page under `app/`
links to `terms.html` or `privacy.html` at all** (see §5, finding **T-1**).

### 4.1 Greeting — replacement for the `GREETING` constant

> Hello. I'm Toju, Synapse's AI property advisor — not a person. I work from Synapse's verified
> listings, so I recommend homes that have passed our checks rather than anything I find. Tell me
> what you are looking for.
>
> Nothing you tell me reaches an agency. That only happens if you choose to contact one, and you
> will see exactly what would be shared before it is.

_Two paragraphs, deliberately. The first is the AI disclosure and the grounding claim; the second
is the data-sharing assurance the brief asks for. Neither overstates: "recommend homes that have
passed our checks" is a process claim, matching the warranty framing in `terms.html` and
`LEGAL_TRUST_MEMO.md` §3._

**Drop "Good afternoon."** It is hardcoded and is wrong most of the day (§5, finding **T-6**). If
a time-aware greeting is wanted, compute it; otherwise "Hello" is always true.

### 4.2 Header block

Replace `.tj-eyebrow` "Your property advisor" with:

> `AI property advisor`

Replace `.tj-trust` "Verified homes only. No need to sign up." with:

> `Verified listings only. No account needed. Guidance, not financial or legal advice.`

### 4.3 Persistent line near the composer

> Toju is an AI. Its estimates — prices, yields, affordability, commute times — are guidance, not
> a valuation, a guarantee, or professional advice. Confirm anything that affects your money with
> a qualified professional.

### 4.4 One-line data notice at the chat entry point

Required for NDPA transparency at the point of capture, and currently absent entirely.

> Your messages are stored so Toju can remember your conversation, and are processed by our AI
> provider to generate replies. Please do not share bank details, ID numbers or passwords here.
> [Privacy Policy]

_The second sentence is data minimisation doing real work: it reduces how much sensitive material
lands in `demo_chat_sessions` in the first place. The `[Privacy Policy]` link must point at
`../privacy.html` — that link does not exist anywhere in the app today._

### 4.5 Boundary line for Toju itself (hand to toju-ai)

For when a user pushes for a guarantee. Consistent with the existing `DOCTRINE`:

> I will not promise you a return or tell you a price is certain — that would not be honest. I can
> show you the numbers I have and what to check. For the final call on returns, title or a
> mortgage, you want a lawyer, a surveyor or a licensed adviser.

---

## 5. Truthfulness and disclosure gap register

Ordered by severity. Findings, not copy — several of these outrank the copy in priority.

### T-1 — No page in the app links to the privacy policy or terms. **High.**
`privacy.html` and `terms.html` are linked only from `index.html` (line 440) and `agencies.html`
(line 341) footers. No file under `app/` links to either — including `app/toju.html`, where
personal data capture begins, and `app/signin.html`, where accounts are created. Account creation
therefore happens with no presented terms and no privacy notice. Under NDPA, transparency is owed
at the point of capture. **Fix: link both from the Toju composer, the sign-in form, and the
contact sheet.**

### T-2 — The contact button asserts a transmission that does not occur. **High.**
`app/property.html` line 464: _"Your request has been sent to the agent — they'll reach out on
WhatsApp shortly."_ Nothing is sent; `create-lead` is never called; the 650ms delay simulates
latency. The button then displays `✓ Request sent`. Three false assertions, one of them about the
user's own personal data, plus a false receipt. This is the finding that prompted this task —
§2 is the fix under the demo reading. **Consumer-protection exposure (FCCPA) if shown to the
public in this state.**

### T-3 — A user who believes their details were sent may stop looking. **High, and downstream of T-2.**
Worth separating from T-2 because the harm is not abstract. A buyer who believes an agency has
their number waits for a call that will never come, and may stop pursuing a home they wanted.
That is detriment caused by the interface, not merely an inaccuracy.

### T-4 — The privacy policy understates what `create-lead` shares. **High (activates on wiring).**
`privacy.html` line 82 says an agency receives "only your name and contact details." The function
also sends the buyer's **budget range** (`preferences.budget_min` / `budget_max`, read from their
Toju session). Financial information about the user, transmitted to a third party, contradicting
the published policy. Fix the policy or narrow the payload — the two must agree before the send
goes live.

### T-5 — Twilio and WhatsApp/Meta are undisclosed sub-processors and a cross-border transfer. **High (activates on wiring).**
`privacy.html` names Supabase and the AI provider. `create-lead` routes buyer name, phone and
budget through Twilio (US) into WhatsApp/Meta. Both are processors handling Nigerian personal
data outside Nigeria. NDPA cross-border transfer rules apply, and the policy's existing
`[NEEDS LEGAL: cross-border]` placeholder does not cover them because they are not named at all.

### T-6 — "Good afternoon" is hardcoded. **Low, but it is a false statement on first contact.**
`app/toju.html` line ~681. Wrong for most of the day. Trivial individually; it sits in the very
first sentence a user reads, which is where credibility is set. §4.1 removes it.

### T-7 — Demo sign-in authenticates every user into one shared account. **High, data protection.**
`app/signin.html` `DEMO_MODE = true` signs everyone into the fixed `demo-customer@synapse.ng`
(or `demo-agency@synapse.ng`) account regardless of input. The mode is disclosed — _"Prototype
mode — any email and password gets you in."_ — which is good and should be kept. But two problems
remain: the button says **"Creating your account…"** when no account is created, and every user
shares one identity, so anything written server-side under that account (saved homes, leads,
notification subscriptions) is visible to every other user of the prototype. **This is a personal
data exposure, not just a copy issue.** If any real person's details are ever entered, they land
in a pot everyone can read. Recommend: change the button string to "Opening the prototype…", and
ask backend-developer whether any user-entered data persists under the shared account.

### T-8 — The seven checks are named three different ways. **Medium.**
`terms.html` line 59 publishes: title documentation, ground survey, structural assessment, flood
risk, ownership documentation, legal review, media accuracy. `app/property.html` lines 296-308
displays: Title, Legal review, Flood risk, Financial (pending), Ground survey, Structure,
Neighbourhood — introducing "Financial" and "Neighbourhood", dropping "ownership documentation"
and "media accuracy". `LEGAL_TRUST_MEMO.md` §3A cites a third list. **A published warranty whose
terms change between pages is not defensible.** One canonical list, used everywhere.

### T-9 — "Checked in person" is an absolute claim the verification process may not support. **Medium.**
`index.html` line 70: _"You will only ever be shown homes someone has checked in person — and
confirmed still available in the last 14 days."_ "Only ever" plus "in person" is an unconditional
promise of physical inspection. `LEGAL_TRUST_MEMO.md` §3B frames verification as "a documentary
and process check". If in-person inspection is not literally part of every verification, this is a
misrepresentation on the landing page. Confirm with the verification desk; if not literal, reword
to what actually happens.

### T-10 — "Gold Verified" remains an undefined tier. **Medium.**
`app/property.html` lines 318, 636; `app/agency.html` lines 1063, 1073, 1100; `agencies.html`
line 266. Already flagged in `LEGAL_TRUST_MEMO.md` §3D and still unresolved. `terms.html` defines
"Verified" but says nothing about "Gold". An undefined trust tier attached to a named agency is a
claim with no substance behind it. Define the criteria or drop the tier.

### T-11 — Agency-facing marketing copy still promises outcomes. **Medium.**
`app/agency.html` line 1751 _"Seven checks, zero surprises"_; line 2141 _"Escrow-protected"_,
_"Your naira is safe until every check passes"_; line 2142 _"Stop renting. Start owning —
safely."_; line 2930 _"Never lose a lead"_. `terms.html` line 81 states plainly that **no escrow
service exists on the platform today.** The product's own terms contradict its marketing copy.
Flagged in `LEGAL_TRUST_MEMO.md` §6 and not yet actioned. For digital-marketer and
social-media-manager.

### T-12 — Toju's property-page "take" presents modelled figures as fact. **Medium.**
`app/property.html` line 228 asserts a 14-minute commute advantage, "₦12M below the area median",
and "8.4% rental yield... beats the Lagos average of 6.1%" with no estimate qualifier. Line 254's
cost note does carry "(est.)" markers and is the better model. Yield and return figures shade
toward regulated financial promotion. Attach the §4.3 qualifier wherever Toju's numbers appear
outside the chat.

### T-13 — Malformed markup in the proximity consent card. **Low, but it is in the trust-critical control.**
`app/notify.js` line 313 emits `<\span>` as the closing tag of the `.prox-note` honest-limit line.
In the JS string `\s` collapses to `s`, so the browser receives a second **opening** `<span>` and
the note never closes. Currently harmless because a `</div>` follows, but the sentence carrying
the card's most important limitation is riding on an unclosed tag. Should be `</span>`.

### T-14 — No erasure or "forget me" path for anonymous visitors. **Medium.**
`privacy.html` line 91 concedes that anonymous conversation data "is not something we can look up
by your name". Correct, but incomplete: the `toju_visitor_v1` UUID **is** a usable handle for
erasure, and no control exists to use it. `LEGAL_TRUST_MEMO.md` §1A.4 already asked for this. A
"clear my conversation" control tied to the visitor ID would close it, plus a retention/purge
window on `demo_chat_sessions` from backend-developer.

---

## 6. Sequencing recommendation

1. **T-1 and T-2 first.** They are the two findings that put false or missing statements in front
   of a real user today. Both are fixable with copy alone plus two links.
2. **T-7's "Creating your account…" string**, and a backend answer on what persists under the
   shared demo account.
3. **§4 Toju disclosure** — the AI disclosure is a Gate 1 item in `LEGAL_TRUST_MEMO.md` and is
   currently entirely absent from the chat surface.
4. **§2 Variant A** once the founder confirms the demo reading.
5. **T-8, T-9, T-10** before any public traffic — they concern the verification promise, which is
   the product's central trust claim.
6. **Variant B, T-4, T-5, and prerequisites B-1 to B-4** only if and when the founder decides to
   wire the send.

---

## 7. Requests back to other agents

- **backend-developer:** does anything user-entered persist under the shared `demo-customer`
  account (T-7)? Is there a retention or purge job on `demo_chat_sessions` (T-14)? If the send is
  wired, confirm the Twilio/Meta processing chain and data region for T-5.
- **toju-ai:** §4.1, §4.3 and §4.5 need to sit consistently with the `DOCTRINE` constant. The word
  "consultant" should leave Toju's self-description in favour of "AI advisor".
- **digital-marketer / social-media-manager:** T-11 and T-9 are yours. The escrow claims in
  particular are contradicted by the platform's own published terms.
- **Everyone:** loop me in on new features at design time, not before launch. T-4 and T-5 exist
  because a data-sharing payload was designed before the privacy policy described it.

---

_Draft language only. A licensed Nigerian lawyer must review before publication or reliance. I
have over-flagged deliberately — where I was unsure whether something was a problem, I listed it._
