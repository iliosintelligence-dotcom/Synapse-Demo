# Policy copy — draft for `privacy.html` and `terms.html`

**Prepared:** 19 September 2026 · **By:** the legal/compliance agent · **Status:** draft copy, not markup

> **Standing caveat.** I am not a lawyer and this is not legal advice. This is drafting copy prepared so
> that a Nigerian-qualified lawyer has something concrete to review, amend and sign off. **None of it may
> be published before that review.** §0.3 lists the clauses I think a lawyer must look at *specifically*,
> over and above reading the whole thing.

---

## 0. How to use this file

### 0.1 What this is

Ready-to-paste prose, in the order the sections should appear. No HTML — the markup and the
mobile/desktop duplication are yours. Under each heading is a short note saying which §7 gaps from
`COMPLIANCE_NDPA_DPIA_FCCPA.md` it closes.

**Everything here is written against the code as it stands**, plus the erasure migration
`20260919100000_erasure_becomes_possible.sql`. Where I could not say something true, I have not said it.

### 0.2 The `[DECISION: …]` markers

Every marker is resolvable by picking one of the stated options. **No marker invents a figure.** There are
**19** of them. They are listed with their options at §3 so you can work through them in one pass.

### 0.3 Do not publish these specific clauses without a lawyer looking at them by name

Beyond the general "a lawyer must review all of it":

1. **Everything about erasure** (Privacy §11, §12). It describes a statutory right and a route to use it.
   If the route does not work, or works differently from the description, that is a false statement about
   a person's legal rights. **See §4 — the function currently throws.**
2. **The cross-border transfer section** (Privacy §9). It names the safeguard we rely on. Naming the wrong
   one is worse than naming none, because it asserts a legal position we may not hold.
3. **The retention table** (Privacy §10). Publishing a period creates a commitment. A period we do not
   enforce is a misrepresentation.
4. **"Verification cannot be bought"** (Terms §5). It is a strong, checkable promise. Keep it only if it is
   operationally true forever, including under commercial pressure later.
5. **The seven checks** (Terms §4). This is the published warranty. Every word is load-bearing and it must
   match what the verification desk physically does — which I still cannot confirm (F10).
6. **The limitation of liability** (Terms §14). Over-broad consumer exclusions are of doubtful
   enforceability under the FCCPA and a clause drafted too wide can be struck out entirely. **This one I
   have deliberately left as a marker rather than drafting it — a cap is a legal judgement, not a copy
   decision.**
7. **Anything about what an agency may keep after you ask us to erase you** (Privacy §11). Your migration
   comment is right that s.34 is not absolute and there is a real answer on both sides.
8. **"We do not use your conversations to train a model"** (Privacy §6). A statement about a third party's
   conduct. It needs the Anthropic contract behind it (F7).
9. **The children/age clauses** (Privacy §14, Terms §12). Getting the age of consent position wrong in
   Nigeria is not a small error.

---

# PART ONE — PRIVACY POLICY

*Section order as it should appear. Headings are the words to use.*

---

## 1. Privacy Policy

*Header block. Closes P1, P28.*

> **Privacy Policy**
>
> Version 1.0 · Effective [DECISION: effective date — options: (a) date of publication, (b) a stated date
> at least 7 days after publication so existing users get notice first. I recommend (b).]
>
> This replaces the draft policy dated 30 July 2026.
>
> This policy explains what Synapse collects, why, where it goes, how long we keep it, and what you can do
> about it. It describes what the product actually does today. Where we are still building something, we
> say so rather than describing it as finished.

---

## 2. Who we are

*Closes P2, P4, P29.*

> Synapse is operated by [DECISION: registered entity — options: (a) the registered company name, RC
> number and registered address once incorporated; (b) if not yet incorporated, Eden David trading as
> Synapse, with a service address. **Option (b) means you are personally the data controller.** This
> sentence cannot be published with a blank.].
>
> We are the data controller for the personal data described here. That means we decide what is collected
> and why, and we answer for it.
>
> **Our data protection contact:** [DECISION: DPO — options: (a) a named Data Protection Officer or
> licensed Data Protection Compliance Organisation, with their name and address; (b) if no DPO is required
> or appointed yet, a named privacy contact, with the sentence "we have not appointed a Data Protection
> Officer" stated plainly. Do not leave this as a placeholder — an unanswered DPO line reads worse than an
> honest "not yet".]
>
> Write to us at [DECISION: privacy contact address — options: (a) privacy@<company domain> once the
> domain exists; (b) an existing address. It should be a role address, not a personal one. The current
> policy publishes a personal Gmail address.].

---

## 3. Your rights, and where to complain

*Deliberately near the top, not buried at the end. Closes P3, P19.*

> Under the Nigeria Data Protection Act 2023 you have rights over your personal data. You can:
>
> - **See it.** Ask for a copy of what we hold about you.
> - **Correct it.** Tell us something is wrong and we will fix it.
> - **Delete it.** Ask us to erase you. Section 11 explains exactly how, and what survives.
> - **Take it with you.** Ask for your data in a file you can read and re-use.
> - **Pause it.** Ask us to stop using your data while we sort out a dispute about it.
> - **Object.** Tell us to stop a particular use. If we are relying on our own legitimate interests, we
>   stop unless we have a stronger reason, and we will tell you what it is.
> - **Change your mind.** Where you gave consent, you can take it back. Taking it back is as easy as
>   giving it, and it does not undo what we lawfully did before.
> - **Not be decided about by a machine alone**, where that decision would have a legal or similarly
>   serious effect on you. Section 8 explains what Tayo does and does not decide.
>
> Ask us for any of these at [privacy contact]. We will respond within [DECISION: response period —
> options: (a) 30 days, the period generally worked to in practice; (b) a shorter self-imposed period such
> as 14 days. Counsel should confirm the period the NDPC expects before we publish a number.].
>
> **If you are not satisfied**, you can complain to the **Nigeria Data Protection Commission (NDPC)**, the
> regulator that supervises us. You do not need our permission and you do not need to come to us first.
> [DECISION: NDPC contact details — options: (a) publish the NDPC's current website and address; (b)
> reference by name only. I recommend (a), but the details must be checked as current on the day of
> publication.]

---

## 4. Using Synapse without an account

*Closes P7, P26. The visitor-ID honesty fix.*

> You do not need an account to browse homes or to talk to Tayo. Most people who use Synapse never make
> one.
>
> That does not mean we know nothing about you. When you first arrive, your browser stores a random
> identifier for you. It is not your name and it is not your email, and we did not get it from anywhere —
> your own browser generates it. But it is **persistent**, and it is how several parts of Synapse
> recognise the same person across pages and across visits. It ties together your conversation with Tayo,
> the homes you look at, where you arrived from, and — if you switch proximity alerts on — your reported
> position.
>
> So we would rather not call it anonymous. It is **unnamed**, which is not the same thing.
>
> Your browser stores four things for us:
>
> | What | Name | What it is for |
> |---|---|---|
> | Your visitor ID | `toju_visitor_v1` | Lets Tayo continue your conversation on this device |
> | How you arrived | `syn_arrival_v1` | Remembers that you came from, say, an Instagram post, so the agency whose post it was gets the credit |
> | Your Dream Board | `synapse_moodboard_v1` | The images and tags you pin |
> | Places you have saved | `synapse_places_…` | Somewhere to measure a commute from |
>
> You can clear all four at any time by clearing your browser's site data for Synapse. That ends the link
> on this device. Section 11 explains what it does and does not remove from our side.
>
> **We should be straight about one thing:** `syn_arrival_v1` is written the moment you land, before you
> have read anything. It records which social platform sent you and nothing else. We are describing it
> here rather than pretending the first thing you see is a choice.

---

## 5. What we collect

*Closes P6. Replaces the current five-bullet list, which understated.*

> **When you talk to Tayo**
> Your messages, and what Tayo works out from them. That includes the things you would expect — which city,
> what budget, how many bedrooms, rent or buy, when you want to move — and the things you mention along
> the way, like your commute, your household, whether you have children, or what you do for work. Tayo
> keeps this so it does not ask you the same question twice.
>
> **Places you name**
> If you tell Tayo where you work, where your children go to school, or anywhere else you go often, we
> save the name you used and look up its coordinates so a home can be measured against it. You can see and
> delete these.
>
> **What you do on the site**
> Homes you save, homes you open, searches you run, and what you pin to a Dream Board. For homes you open
> we record how long the page was in front of you and how far down it you got.
>
> **How you arrived**
> If you came from a link we posted, or from a social platform, we record which one. Section 7 explains
> why.
>
> **Your location — only if you switch it on**
> Section 6.
>
> **If you make an account**
> Your email address, a password you choose, your name, and your phone number if you give one. We never
> see your password: it is handled by Supabase Auth and we only ever receive a token.
>
> **If you are an agency**
> Your listings and photographs, your leads, your team, and the documents we ask for to verify you —
> including your CAC certificate, your practice registrations, and **a director's identity document and,
> where we ask for it, a bank statement.** These sit in a private store that only the verification desk
> can open.
>
> **Ordinary technical information**
> Enough to keep the site working and to tell a person from a bot.
>
> **One thing we deliberately do not collect.** When you tap one of our short links, we record that the
> link was tapped, which channel it came from, and whether the tap looked like a person, a bot, or a link
> preview. **We do not store your IP address and we do not store your browser's user-agent string.** We
> could. We decided the click count was worth having and the fingerprint was not.
>
> We do not buy data about you from anybody. We do not sell yours. We do not share it with advertising
> networks or data brokers.

---

## 6. Location and proximity alerts

*Closes P12, P13. Keeps the best-written section and fixes what it left out.*

> Proximity alerts are **off**. Nothing about your location is collected unless you switch them on from
> the browse page.
>
> **When they are on.** While a Synapse page is open, your device reports its position to us at most once
> a minute. Before that position is written to our database it is **rounded to roughly 100 metres.** We
> never store the exact fix your phone produced. A hundred metres is far finer than we need — the smallest
> alert radius is several times that — and far coarser than a trail of where you have been.
>
> **What we do with it.** We compare the rounded point against homes that match what you told Tayo you
> were looking for. If one is close enough, we send a notification. We send at most three a day, never
> between 9:30pm and 8am, and never twice about the same home.
>
> **What we keep.** The most recent rounded point, and a record that we notified you about a particular
> home, so we do not do it again.
> [DECISION: location retention — options: (a) keep the most recent point for 7 days and the notification
> records for 90 days, then delete both automatically; (b) keep the point only while alerts are on and
> delete it the moment they are switched off; (c) some other period. **I recommend (a), or (b) if you can
> build it — (b) is the strongest and easiest to explain.** A period cannot be published until a purge job
> actually runs.]
>
> **What we will not do.** We do not report your location when alerts are off. Switching them off stops
> the reporting immediately. **No agency ever sees where you are.** An agency is told that somebody nearby
> saw their listing; it is never told who, and never where.
>
> **A limit worth knowing.** A browser cannot check your location once the tab is closed. These alerts
> work while you are using Synapse, not in the background.
>
> **Switching off is not the same as deleting.** If you want the position and the notification history
> gone as well, there is a control for that — see Section 11.
> [DECISION: this sentence depends on the "Delete my location history" control being built. If it is not
> in this batch, replace with: "If you want the position and the notification history gone as well, write
> to us at [privacy contact] and we will remove them."]

---

## 7. How we know where you came from

*Closes P6 (attribution), part of P8. Nothing in the current policy covers this at all.*

> Agencies pay us to help them reach buyers. They are entitled to know whether it works.
>
> When you tap a Synapse link in a social post, the link carries a short code. We record that a visitor
> arrived from that post and looked at that home. If you later ask to be introduced to the agency, we
> attach two facts to that introduction: **the channel that first brought you in, and the one you came
> through last.** They are often different, and the difference is the useful part.
>
> The agency sees the channel. It does not see your browsing history, it does not see your conversation
> with Tayo, and it does not see anything about you until you choose to be introduced.
>
> If you arrive without a tracked link, we may infer the channel from the site that referred you —
> Instagram, Facebook, TikTok, X or WhatsApp. If we cannot tell, we record that we do not know rather than
> guessing.

---

## 8. Tayo, and what it is

*Closes P9, P10, P21. The AI disclosure. Written to be blunt.*

> **Tayo is an AI. It is not a person.** Nobody at Synapse reads your conversation as it happens and
> nobody is typing the replies.
>
> **Where your messages go.** To generate a reply, your conversation is sent to our AI model provider,
> **Anthropic**, whose systems are **in the United States**. That is a transfer of your personal data out
> of Nigeria, and Section 9 explains how we handle it. Your messages are also stored by us so Tayo can
> continue where you left off.
>
> [DECISION: training statement — options: (a) if the Anthropic agreement excludes training on our API
> traffic, publish "Your conversations are not used to train Anthropic's models."; (b) if that is not
> contractually confirmed, publish only what we control: "We do not use your conversations to train any
> model of our own, and we do not share them with anyone for that purpose." **Do not publish (a) without
> the contract.** The current policy publishes a version of (a) with nothing behind it.]
>
> **Please do not type bank details, card numbers, BVN, NIN or passwords into the chat.** Tayo never needs
> them, no agency needs them through us, and anything you type is stored.
>
> **Tayo builds a picture of you.** From what you say, it works out things you did not state directly —
> that a long commute matters to you, that you need to be near a particular school, roughly what you can
> afford. That picture is personal data and you are entitled to see it and correct it.
> [DECISION: showing the inferred profile — options: (a) if the "What Tayo has understood" panel ships,
> write "You can see it in your privacy settings and change anything that is wrong."; (b) if it does not
> ship in this batch, write "Ask us at [privacy contact] and we will show you what Tayo has recorded."
> **Option (b) is honest and cheap. Option (a) is better product.**]
>
> **What Tayo decides, and what it does not.** Tayo decides which homes to show you and in what order. It
> does not decide anything about your money, your credit, or whether you may rent or buy a home. If that
> ever changes we will say so here first, and you will have the right to ask a person to look at it
> instead.
>
> **Tayo's advice is guidance.** Its estimates — prices, yields, what a commute will cost you — can be
> wrong. They are not a valuation, not financial advice and not legal advice. The Terms say more about
> this, including one thing you should know about whose side Tayo is on when price comes up.

---

## 9. Where your data goes, and who else sees it

*Closes P16, P17, P18. All ten transfers, in plain language.*

> **Synapse does not run on Nigerian infrastructure.** Our database, our file storage and our AI provider
> are outside the country. We would rather tell you that plainly than leave it in a footnote.
>
> Here is everybody who receives personal data from us, what they get, and where they are.
>
> | Who | What they receive | Where | Why |
> |---|---|---|---|
> | **Supabase** | Everything in our database, our file storage, and sign-in | **United States** | They run the database Synapse is built on |
> | **Anthropic** | Your conversation with Tayo, and what Tayo has worked out from it | **United States** | To generate Tayo's replies |
> | **Twilio** | A buyer's name, phone number, budget range and enquiry, when a lead is sent to an agency | **United States** | It carries the WhatsApp message to the agency |
> | **WhatsApp / Meta** | The same message | **United States** | It delivers it |
> | **trypost** | Listing text and photographs we publish on an agency's behalf | Outside Nigeria [DECISION: trypost's stated location — confirm from their terms and name the country, or write "outside Nigeria" if they do not state one.] | It posts to social platforms for us |
> | **Instagram / Facebook / Meta** | Published listings, and an agency's connected-account tokens | **United States** | Where the posts go |
> | **Paystack** | An agency's payment details and reference | Nigeria [DECISION: confirm Paystack's hosting region — if the processing is outside Nigeria, move this row up and say so.] | To take subscription payments |
> | **OpenStreetMap / Nominatim** | A place name or address we are looking up | Europe | To turn "my office in Dugbe" into a point on a map |
> | **Stadia Maps** | A request for map tiles | Europe / United States | To draw the map |
> | **Your browser's push service** (Google, Mozilla or Apple, depending on your browser) | A notification, and the endpoint your browser gave us | **United States** | To deliver the alert to your device |
>
> We also use **Cloudinary** for images. [DECISION: Cloudinary — options: (a) if it is in use, add a row
> naming what it holds and where; (b) if it is no longer in use, remove this sentence and let us know, so
> the schema columns that require it can be cleaned up.]
>
> **What this means under Nigerian law.** The Nigeria Data Protection Act restricts sending personal data
> out of Nigeria. We rely on [DECISION: transfer basis — options: (a) contractual safeguards with each
> recipient, once every data processing agreement is signed; (b) your explicit consent to the transfer,
> given when you start using Tayo; (c) both, with (a) as the main basis and (b) for the chat specifically.
> **I recommend (c), and it cannot be published until the agreements in (a) are actually executed.** This
> is the single sentence in this whole policy a lawyer must approve word for word.]
>
> **What we do to keep it small.** We do not send your name, your phone number or your email to the AI
> provider. Tayo works from what you type and what it has inferred, not from your account record.
> [DECISION: this sentence describes the identifier-scrubbing control from §6.8 of the compliance review.
> If that scrub does not ship in this batch, **delete this paragraph** — today the conversation is sent as
> typed, so if you have typed your own name into the chat, it goes.]

---

## 10. How long we keep things

*Closes P22. Every figure here is a decision, not a draft.*

> We do not keep personal data forever. [DECISION: the whole of this table. Each row needs a period **and
> a purge job that enforces it.** Options per row are given below. Publishing a period we do not enforce
> is worse than publishing nothing, so if a purge job is not running for a row, take the row out rather
> than softening the wording.]
>
> | What | How long |
> |---|---|
> | Conversations with Tayo, if you have no account | [DECISION: 90 days from your last message is my recommendation] |
> | Conversations with Tayo, if you have an account | [DECISION: 24 months from your last message] |
> | Your account and profile | Until you close it, then [DECISION: 90 days] |
> | Your last reported position | [DECISION: 7 days — or deleted when you switch alerts off, if that is built] |
> | Proximity notification records | [DECISION: 90 days] |
> | Homes you viewed and searches you ran | [DECISION: 12 months] |
> | Where you arrived from | [DECISION: 18 months] |
> | Link taps | [DECISION: 12 months in detail, then counts only] |
> | An enquiry you sent to an agency | [DECISION: 36 months — note the agency keeps its own copy under its own policy] |
> | Agency verification documents, including director ID | [DECISION: this one is not ours to choose freely — anti-money-laundering rules likely set a minimum, commonly seven years. **Counsel must set this figure.**] |
> | Payment records | 7 years, because tax law requires it |
>
> When a period ends, the data is deleted. Some records are kept longer where the law requires it — tax
> records are the clearest example.

---

## 11. Deleting your data

*Closes P20, and part of P19. Written against `erase_personal_data()`. **See §4 of this file — the
function has a defect that must be fixed before this section can be true.***

> **If you have an account.**
>
> [DECISION: the route — options: (a) if the delete control ships in this batch: "Go to your privacy
> settings and choose Delete everything."; (b) if it does not: "Write to us at [privacy contact] from the
> email address on your account."]
>
> When we erase you, we run a single operation that removes your profile and everything that hangs off it
> — your conversations with Tayo, the places you saved, the homes you saved and viewed, your searches, your
> proximity history, and your enquiries.
>
> We keep one record of the erasure itself: the date, who asked, and how many rows were removed. **That
> record does not contain your name, your email or your account number.** It holds a one-way fingerprint
> of your account ID. If you ever come back and ask "did you actually delete me", we can confirm it. We
> cannot use it to produce a list of people who have asked.
>
> **What we cannot take back.** If you asked to be introduced to an agency, that agency already has your
> details. They received them at the moment you asked, and we cannot reach into their records.
> [DECISION: what happens to the agency's copy — options: (a) we contractually require agencies to honour
> an erasure request passed on by us, and we say so here and pass it on; (b) we tell you to contact the
> agency yourself and we give you their details; (c) we do both. **I recommend (c).** This turns on the
> Agency Agreement, which does not exist yet, and on the legal question your migration comment correctly
> flags — an agency may have its own lawful basis to keep a lead. **Counsel must answer this before this
> paragraph is published.**]
>
> **What survives, and why.** Some records are kept because the law requires it, mainly payment and tax
> records. Where that happens the record is kept for that purpose only and nothing else.
>
> [DECISION: the sign-in record — the erasure function deletes your profile and everything linked to it,
> **but it does not currently delete the sign-in record held by Supabase Auth**, because that needs a
> separate call the database cannot make. Options: (a) build that call in this batch and write "Your
> sign-in record is removed too."; (b) do not build it yet and write, honestly, "Your sign-in record is
> removed separately, by hand, within [x] days of your request." **Option (a) is much better. Option (b)
> is publishable. Saying nothing is not.**]
>
> **If you do not have an account.**
>
> Clearing your browser's site data for Synapse removes your visitor ID, your Dream Board and your saved
> places from your device. Your conversation on our side is held against that visitor ID.
>
> [DECISION: erasure for visitors — this is the population without an account, which is most people using
> Synapse, and **the erasure function does not cover them**: it takes an account ID, and nothing handles
> conversations, arrival records, proximity watches or push subscriptions keyed to a visitor ID. Options:
> (a) build a `forget_visitor()` path in this batch and describe it here — "Tap Clear my conversation, and
> what Tayo holds for this device is deleted."; (b) do not build it, and write: "If you want us to delete
> the conversation held against your visitor ID, write to us at [privacy contact] from any address and
> include the ID — you can find it in your privacy settings." **Option (b) requires the ID to be visible
> somewhere in the UI, which it currently is not.** One of these must be true before this section can
> ship.]

---

## 12. How we protect it

*Closes P23, P24, P27.*

> **What we do.** Every table in our database has row-level access rules, so one person's data cannot be
> read by another person's session even if something else goes wrong. Data is encrypted in transit and at
> rest. Agency verification documents — including identity documents — sit in a private store that is not
> publicly reachable and that only the verification desk can open. The parts of the system that touch
> money or trust can only be written by our own server, never by a browser.
>
> **If something goes wrong.** If personal data is exposed, we will report it to the Nigeria Data
> Protection Commission **within 72 hours** of finding out. If the exposure is likely to put you at real
> risk, we will tell you as well, as quickly as we can.
>
> **One honest limitation.** If you have used Synapse without an account, we have no way to contact you.
> There is no email address attached to a visitor ID. In that situation we would put a notice on the site
> itself. It is one of the reasons we keep unnamed conversations for a short time and hold as little as
> we can.

---

## 13. What we rely on to process your data

*Closes P5. This is the lawful-basis section — currently absent entirely.*

> The law requires us to have a proper reason for each thing we do with your data. Ours are:
>
> | What we do | Our reason |
> |---|---|
> | Show you listings, run the site, keep it secure | Our legitimate interest in operating Synapse |
> | Store your conversation with Tayo and what it infers | **Your consent**, given when you start chatting |
> | Send your conversation to our AI provider | **Your consent** |
> | Your location and proximity alerts | **Your consent**, given when you switch them on |
> | Pass your details to an agency | **Your consent**, given each time you ask to be introduced |
> | Keep a record of an enquiry after it is sent | Our legitimate interest, and the agency's, in having a record of a real transaction |
> | Run your account | Performing our agreement with you |
> | Verify agencies, and keep the evidence | Our legitimate interest in the platform being trustworthy, and our legal obligations |
> | Keep payment and tax records | A legal obligation |
>
> Where we rely on **consent**, you can withdraw it at any time and we stop. Where we rely on **legitimate
> interests**, you can object, and we stop unless we have a compelling reason to continue — which we would
> explain to you.
>
> **Some things you tell Tayo are more sensitive than others.** If you mention your health, your religion,
> or your family circumstances, that is information the law treats with extra care. We do not ask for it
> and we do not need it to find you a home. [DECISION: `consumer_places` accepts a place of worship as a
> category, and a place of worship reveals religious belief. Options: (a) remove `worship` as a category
> and let people record it as "other"; (b) keep it and add an explicit, separate consent when somebody
> saves one. **I recommend (a) — it is one enum value and it removes a sensitive-data problem entirely.**]

---

## 14. Children

*Closes P25.*

> Synapse is for adults. You must be 18 or older to make an account.
>
> We do not knowingly collect data about children. If you believe a child has given us personal data,
> write to [privacy contact] and we will delete it.

---

## 15. Changes to this policy

*Closes P28.*

> We will update this policy as Synapse changes. Every version carries a number and an effective date.
>
> If a change matters to you — a new recipient, a new purpose, a longer retention period — we will tell
> you before it takes effect, [DECISION: notice mechanism — options: (a) by email to account holders and a
> notice on the site for everyone else; (b) a site notice only. I recommend (a).] rather than quietly
> changing the date at the top.

---

# PART TWO — TERMS OF SERVICE

---

## 1. Terms of Service

*Header. Closes T-A, T-B.*

> **Terms of Service**
>
> Version 1.0 · Effective [DECISION: as Privacy §1]
>
> These terms are an agreement between you and [DECISION: as Privacy §2 — the same entity, named the same
> way]. They replace the draft terms dated 30 July 2026.
>
> They apply whether or not you make an account. If you use Synapse, they apply to you.

---

## 2. What Synapse is

*Closes T-Y. Keeps the honest position, adds what we actually do so the disclaimer holds up.*

> Synapse is a place to find a home in Nigeria. We list properties that agencies put on the platform, we
> run checks on some of them, and we give you an AI advisor called Tayo to think it through with.
>
> **Synapse is not an estate agency and not a broker.** We are not a party to any transaction between you
> and an agency or a seller. We do not own the homes, we do not hold your money, and we do not sign
> anything on your behalf.
>
> **But we are not a noticeboard either, and it would be dishonest to pretend otherwise.** We check some
> listings and mark them. We decide which homes Tayo shows you and in what order. We help with price. We
> charge agencies. Those are choices we make and we stand behind them. What we do not do is guarantee the
> outcome of your transaction — that is between you and the other side.

---

## 3. Who can use it

*Closes T-V (age), part of T-AA.*

> You must be 18 or older to make an account or to ask to be introduced to an agency.
>
> When you make an account you accept these terms and confirm you have read the Privacy Policy. We record
> which version you accepted and when.

---

## 4. What "Verified" means

*Closes T-I — **the most important fix in this document.** Written against the seven values in the
`property_check_type` enum, not the four that were published. "Ground survey" and "legal review" are gone,
because we do not run them.*

> When a listing shows a **Verified** mark, it means our verification desk ran seven checks and recorded
> the result. Those checks are:
>
> 1. **Is the listing real?** That the home exists, that it is where the listing says it is, and that the
>    listing describes it rather than something else.
> 2. **Who owns it.** We review the ownership documents the agency provides.
> 3. **The photographs.** That the pictures are of this property, and not a showhouse, a stock image, or a
>    different unit.
> 4. **Is it still available?** That the agency has recently confirmed the home is actually on the market.
> 5. **The structure.** An assessment of the building's condition.
> 6. **Flood risk.** What is known about flooding where it stands.
> 7. **Government acquisition risk.** Whether the land is under or affected by a government acquisition —
>    the thing that turns a clean-looking purchase into a loss.
>
> Where a listing is verified, we show you the date and, where we have recorded them, which individual
> checks passed. Where we have not published the individual results, we say so rather than implying a
> score.
>
> **Many listings on Synapse are not verified, and we show them anyway.** Hiding them would leave you with
> a smaller, tidier catalogue and no idea what you were not being shown. Instead, every listing carries a
> mark saying whether it has been checked. Read it. It is the most useful thing on the card.
>
> **Availability is a separate claim.** A home can be verified and no longer for sale. Each listing carries
> the date the agency last confirmed it is still available, and listings that are not re-confirmed stop
> being offered.
> [DECISION: this last clause depends on the re-confirmation job actually running. Options: (a) confirm it
> runs and keep the sentence; (b) if it does not run, delete the clause — do not publish a promise about
> an expiry that does not happen.]
>
> **Verified is a process, not a guarantee.** It means those checks passed on that date. It does not mean
> we guarantee the condition of the property, its price, its title, or the outcome of your transaction.
> Things change after a check. **Before you pay anybody anything, get your own lawyer to run a title
> search, and go and see the property yourself.** We would rather say that plainly than sell you a feeling
> of safety we cannot deliver.

---

## 5. Verified agencies, and what a badge cannot buy

*Closes T-J and T-K. "Verified agency" is a stated trust pillar and was defined nowhere.*

> An agency shows as verified when we have checked who they are. That means:
>
> - **They are a real registered business.** We check their CAC registration.
> - **We know who is behind it.** We check a director's identity.
> - **They are registered to do this work.** Where the law requires a registration to practise — SCUML for
>   anti-money-laundering, the relevant professional and state registrations for estate practice — we ask
>   for it.
> - **Their office and their bank details are real.**
>
> [DECISION: this is the list the schema supports, but I cannot confirm from the code which of these the
> desk actually performs today. **Publish only the ones that are genuinely run.** Every item published here
> is a claim we must be able to evidence for every verified agency. Options: (a) publish the full list once
> the desk runs all of it; (b) publish the subset that runs today and add to it. **(b) is the honest
> route and it is not embarrassing — a short true list beats a long one that cannot be evidenced.**]
>
> Verification is reviewed [DECISION: re-verification interval — options: (a) annually; (b) whenever a
> document expires; (c) both. Needs an owner and a reminder, or it will not happen.] and can be suspended
> or withdrawn.
>
> **Verification cannot be bought.** There is one standard and it is the same for every agency, whatever
> they pay us. No subscription tier changes the checks we run, the evidence we require, or the answer we
> reach. Tayo ranks homes on how well they fit you, never on what the agency pays.
>
> [DECISION: the word "Gold". It appears in the product in several places and it is defined nowhere, and
> there are two different tier vocabularies in the database. Options: (a) define each tier here, with its
> criteria; (b) **remove the word from the product entirely and keep one word, "Verified".** I recommend
> (b). An undefined trust tier attached to a named business is a claim with nothing behind it.]

---

## 6. Tayo

*Closes T-N. The AI disclosure and — the part that matters — the conflict of interest. Stated plainly, as
asked.*

> **Tayo is an AI advisor.** It is not a person, not an estate surveyor, not a lawyer and not a financial
> adviser.
>
> Tayo's estimates — what a home is worth, what a commute will cost you, what a yield might be, what you
> can afford — are **guidance**. They can be wrong. They are not a valuation, not investment advice and
> not legal advice. For anything that touches your money or your legal position, get a professional.
>
> ### Whose side Tayo is on
>
> This matters and we would rather you heard it from us.
>
> When you are talking about a home, Tayo works for you. It will tell you when it thinks something is
> overpriced, and it is built to say so plainly.
>
> **But when it comes to price on a specific home, Tayo is not a neutral party.** The agency selling that
> home can set a floor — a price it will not go below — and Tayo works inside that floor. It will not
> propose a number underneath it. If your position goes below it, Tayo hands the conversation to the
> agency rather than continuing on its own.
>
> So: Tayo can tell you what it honestly thinks a home is worth, and it can help you make your case. It
> cannot get you a price the seller has already refused, and it will not tell you where the floor is.
> **Treat Tayo's help on price as a well-informed party with an interest, not as your negotiator.** If the
> sums are large, use your own.
>
> [DECISION: how far to go on this. Options: (a) publish as written; (b) soften to "Tayo operates within
> parameters agencies set". **I strongly recommend (a).** (b) is the kind of sentence people feel misled
> by afterwards, and the whole product rests on not being that. The coordinator asked for plain, and this
> is plain.]
>
> ### What Tayo can and cannot see
>
> Tayo works from homes agencies have listed on Synapse. It does not browse other portals, it cannot see
> the open market, and it will tell you so rather than inventing something.

---

## 7. If you are browsing or buying

*Closes T-O, and aligns with Privacy §11.*

> - Browsing and talking to Tayo are free. No account, no obligation.
> - You only need an account at one moment: when you ask to be introduced to an agency.
> - **When you ask for that introduction, here is exactly what the agency receives:** your name, your
>   phone number, the home you asked about, the budget range you gave Tayo, and — if you used Tayo to work
>   out a price — the opening offer Tayo suggested and the reasoning behind it. It reaches them as a
>   message to the agency's own number.
> - **What the agency does not receive:** your conversation with Tayo, your saved homes, your Dream Board,
>   your location, or your email address.
> - You will see this before you send it, and nothing is sent until you choose.
> - **Think about the budget line before you tap.** It is genuinely useful to an agent who wants to find
>   you the right home. It also tells the seller's side what you can afford. We send it because an
>   introduction without it wastes everybody's time, but you should know it goes.
> - Once it is sent we cannot unsend it.
> - Any transaction you enter into is between you and the agency or seller. **Synapse does not process,
>   hold, or guarantee any money in a property transaction. There is no escrow on this platform.**

---

## 8. If you are an agency

*Closes part of T-T and T-S. The full Agency Agreement is a separate document — see §9.*

> - Listings you submit must be accurate, and must be properties you are authorised to market.
> - You are responsible for your listings. If a listing is false or misleading, we will remove it, and we
>   may remove you.
> - You must give us the documents we ask for to verify you and your listings, and keep them current.
> - You must re-confirm your listings are still available when we ask. Listings that go stale stop being
>   shown.
> - Leads are provided as they come. We do not guarantee how many you will get, how good they will be, or
>   whether they will convert.
> - **Buyer data you receive through Synapse is for responding to that buyer about that enquiry.** Not for
>   adding to a marketing list, not for selling on, and not for any other purpose. If a buyer asks us to
>   erase them, you must honour that request when we pass it to you.
>   [DECISION: this last sentence is only enforceable if it is in a signed Agency Agreement. See §9.]
>
> Your full obligations are in the Agency Agreement, which you accept when you join.

---

## 9. The Agency Agreement

*Closes T-T. A pointer, not the agreement — that is a separate drafting job.*

> [DECISION: this section is a placeholder for a document that does not exist yet. Agencies currently
> accept the same terms as consumers, which is not adequate — there are no listing warranties, no
> indemnity, no verification service level, no data-sharing terms and no offboarding. Options: (a) draft
> and publish a separate Agency Agreement before onboarding any further agency; (b) publish these terms
> now with this section removed, and treat the Agency Agreement as the next piece of work. **The skeleton
> is in `LEGAL_TRUST_MEMO.md` §5 and still holds.** I can draft it next.]

---

## 10. What agencies pay

*Closes T-Q, and the FCCPA pricing and cancellation duties (K4, K5).*

> Agencies can use Synapse on a free tier, or pay for a plan with more listings, more seats and more
> marketing tools.
>
> **What a plan costs.** [DECISION: prices. The product names three tiers — Free, Accelerate and Leader —
> and publishes no price for any of them, while payments are live. Options: (a) publish the price of each
> tier here, including VAT treatment; (b) publish a link to a pricing page and keep it current. Either is
> fine; publishing nothing is not, and the law is fairly direct about price disclosure.]
>
> **How billing works.** A plan is paid for once and runs for 30 days. **It does not renew automatically.**
> When the 30 days end, the plan simply stops being extended — we will not charge you again unless you
> choose to pay again.
>
> [DECISION: what actually happens at day 31. The billing code has no job that downgrades an expired
> plan, so today a lapsed plan may keep working until somebody notices. Options: (a) build the downgrade
> and write "when your plan ends, your account returns to the free tier"; (b) do not build it and write
> what is true, which is awkward. **(a), please.** This is a small job and it is the difference between a
> clean sentence and a confusing one.]
>
> **Cancelling and refunds.** [DECISION: the refund position. There is none today. Options: (a) no refunds
> once a 30-day period has started, stated plainly; (b) a pro-rata refund on request; (c) a short
> cooling-off window — for example, a full refund within 48 hours if no paid feature has been used.
> **(c) is the most defensible and the easiest to administer at this size.** Whatever is chosen has to be
> written here, because a consumer-facing service with no stated cancellation position is exposed.]
>
> **Receipts.** You get a receipt for every payment. [DECISION: confirm a tax invoice from the Synapse
> entity is issued, not only a Paystack receipt — this depends on F1.]

---

## 11. Content, photographs and who owns what

*Closes T-W. Currently absent entirely.*

> **Yours stays yours.** Listings, photographs and descriptions an agency uploads remain the agency's.
>
> **What you let us do with it.** By uploading a listing, an agency gives Synapse permission to show it on
> the platform, include it in what Tayo recommends, and — where the agency uses our marketing tools —
> **publish it and its photographs to social media on the agency's behalf.** That permission lasts while
> the listing is live and is limited to running and promoting the listing. It is not a transfer of
> ownership and we will not sell it on.
>
> **What you must not upload.** Photographs you do not have the rights to. Somebody else's listing. Images
> of a different property. This is not a technicality: photographs of a home that is not the home are the
> commonest form of listing fraud, and the media check in Section 4 exists to catch it.
>
> **Ours stays ours.** The Synapse name, the interface and Tayo are ours.
>
> **Maps.** Our maps use data from **OpenStreetMap**, © OpenStreetMap contributors, available under the
> Open Database Licence, and map tiles from **Stadia Maps**. Their terms apply to that data.
>
> **Tayo's writing.** Text Tayo generates for an agency — captions, listing copy — is the agency's to use.
> We do not claim it. But an AI can produce something similar for somebody else, so we cannot promise it
> is unique to you.

---

## 12. Your account and how you behave

*Closes T-V.*

> Keep your password to yourself. You are responsible for what happens under your account.
>
> Do not use Synapse to post fraudulent listings, to misrepresent who you are or what you are entitled to
> sell or let, to get round the verification process, or to harvest other people's data.
>
> **If you see a listing you believe is fraudulent, tell us** at [DECISION: reporting address — a role
> address, e.g. trust@<domain>. It must be monitored, or do not publish it.]. We will look at it. If we
> take a listing down and you think we were wrong, tell us and a person will review it.
>
> We can suspend or close an account that breaks these terms. Except where something is serious enough to
> act immediately, we will tell you why and give you a chance to respond.

---

## 13. What we do not promise

*Closes T-U. Strengthened from the current version.*

> To be direct about the limits of what Synapse does:
>
> - We do not guarantee any property's title, condition or price.
> - We do not guarantee that a transaction will complete.
> - We do not hold or protect funds. There is no escrow on this platform.
> - We do not guarantee that Tayo is right. It is an AI giving guidance, not a professional giving advice.
> - We do not guarantee the site is always available or always free of faults.
> - We do not guarantee the conduct of any agency or seller on the platform. We check who they are; we
>   cannot follow them into a meeting.

---

## 14. If something goes wrong

*Closes T-G. **Deliberately not drafted — see §0.3 item 6.***

> [DECISION: limitation of liability. There is currently **no liability clause at all** in the published
> terms, which means no cap and no exclusion. This needs to be drafted by counsel, not by me, for two
> reasons. First, a cap is a commercial and legal judgement about risk appetite (see F15 — do we carry
> insurance?). Second, under the FCCPA broad exclusions against consumers are of doubtful enforceability,
> and a clause drafted too wide can be struck out entirely, leaving you worse off than a narrow one that
> holds. What I would put in the brief to counsel: we want a cap that is realistic for a company this
> size, an express carve-out for our own fraud and for anything that cannot lawfully be excluded, and a
> different position for agencies (negotiated, commercial) than for consumers (protective).]
>
> Whatever is agreed, this sentence goes with it:
>
> > **Nothing in these terms takes away rights you have under the Federal Competition and Consumer
> > Protection Act 2018 or any other law that protects you as a consumer.**

---

## 15. Complaints and disputes

*Closes T-D, T-AB. Absent entirely today.*

> **Come to us first.** Write to [complaints address]. We will acknowledge within [DECISION: 2 working
> days] and give you an answer within [DECISION: 14 days].
>
> **If we cannot settle it.** You can take a consumer complaint to the **Federal Competition and Consumer
> Protection Commission (FCCPC)**. A complaint about how we handled your personal data goes to the
> **Nigeria Data Protection Commission (NDPC)**. Coming to us first is not a condition of either.
>
> **Governing law.** [DECISION: options — (a) Nigerian law, with the courts of Nigeria having jurisdiction;
> (b) Nigerian law with arbitration in Lagos for agency disputes and the courts for consumer disputes.
> **A blanket arbitration clause covering consumers is a candidate unfair term and I would avoid it.**
> Counsel to settle.]

---

## 16. Changes to these terms

*Closes T-X.*

> We will update these terms as Synapse changes. Every version has a number and an effective date, and old
> versions stay available.
>
> If a change is material — what you pay, what we promise, what happens to your data — we will tell you
> before it takes effect and give you [DECISION: notice period — options: (a) 14 days; (b) 30 days. 30
> days is the safer default.] to decide whether you want to carry on. Changing the date at the top is not
> notice, and we will not treat it as though it were.

---

## 17. The rest

*Closes T-Z.*

> If any part of these terms cannot be enforced, the rest still stands. If we do not enforce something
> straight away, we have not given it up. You may not transfer your rights under these terms to somebody
> else; we may transfer ours if the business is sold, and we will tell you if that happens.
>
> These terms and the Privacy Policy are the whole agreement between us about Synapse.

---

## 18. Contact

> [DECISION: role addresses on the company domain, once it exists. Publishing a personal Gmail address on
> the terms of a commercial platform is a small thing that reads badly and should be fixed with the entity
> (F1).]
>
> - General and terms: [contact]
> - Privacy and your data: [privacy contact]
> - Reporting a listing: [trust contact]

---

# 3. All 19 decision markers, in one place

Work through these in one pass and the copy is publishable (subject to counsel).

| # | Where | Decision | My recommendation |
|---|---|---|---|
| 1 | Privacy §1, Terms §1 | Effective date | A date ≥7 days after publication |
| 2 | Privacy §2, Terms §1 | Registered entity | Incorporate. Option (b) makes Eden personally the controller |
| 3 | Privacy §2 | DPO or named privacy contact | State honestly either way; do not leave blank |
| 4 | Privacy §2 | Privacy contact address | Role address on the company domain |
| 5 | Privacy §3 | Rights response period | 30 days, subject to counsel confirming |
| 6 | Privacy §3 | NDPC contact details | Publish, verified current on the day |
| 7 | Privacy §6 | Location retention | Delete the point when alerts are switched off, if buildable |
| 8 | Privacy §6 | "Delete my location history" control | Build it; otherwise use the email fallback |
| 9 | Privacy §8 | Model-training statement | Only publish the strong version with the contract behind it |
| 10 | Privacy §8 | Showing Tayo's inferred profile | Build the panel; email fallback if not |
| 11 | Privacy §9 | trypost / Paystack / Cloudinary locations | Confirm each and name the country |
| 12 | Privacy §9 | **Cross-border transfer basis** | Contractual safeguards + consent. **Counsel, word for word** |
| 13 | Privacy §9 | Identifier scrubbing before the model call | Build it, or delete the paragraph |
| 14 | Privacy §10 | Every retention period | Pick periods **and** run purge jobs |
| 15 | Privacy §11 | What an agency keeps after erasure | Both: contractual obligation and the agency's details. **Counsel** |
| 16 | Privacy §11 | Deleting the sign-in record | Build the Auth admin call this batch |
| 17 | Privacy §11 | **Erasure for visitors without an account** | Build `forget_visitor()`. Most users are in this group |
| 18 | Privacy §13 | `worship` as a place category | Remove the enum value |
| 19 | Terms §5, §10, §14, §15 | Gold tier, prices, refunds, liability, governing law | Drop "Gold"; publish prices; 48-hour cooling-off; **counsel drafts liability** |

---

# 4. Two defects in `20260919100000_erasure_becomes_possible.sql`

Raising these here because **the erasure copy above cannot be published until they are resolved.** I am
describing a right and a route; if the route does not work, the description is false.

### 4.1 `erase_personal_data()` will throw on every call

Line 138:

```sql
select count(*) into v_prox  from proximity_events where profile_id = p_profile_id;
```

The column on `proximity_events` is **`user_id`**, not `profile_id` — migration `0019_layer5_campaigns_proximity.sql`
line 86 declares `user_id uuid not null references profiles (id) on delete cascade`, and line 93 indexes
`(user_id, occurred_at desc)`. No later migration renames it. The function will raise
`column "profile_id" does not exist` before it reaches the delete, for every subject.

The count runs *before* `set_config`, so it fails early and nothing is deleted — no data loss, but no
erasure either. One-word fix.

### 4.2 Visitors without an account still cannot be erased

`erase_personal_data()` takes a `p_profile_id` and deletes `profiles` plus cascades. That is right for
account holders. It does not reach anything keyed to a **visitor ID**:

- `demo_chat_sessions.visitor_id` — the conversation itself, which is the most sensitive thing we hold
- `channel_interactions.session_id`
- `geofence_watches.visitor_id`
- `push_subscriptions.visitor_id`
- `notifications.visitor_id`

Since you do not need an account to browse or to chat, **this is the majority of our data subjects**, and
the conversation is exactly what they would want erased. A `forget_visitor(p_visitor_id uuid)` companion
would close it. It needs no trigger exemption — none of those tables carries `reject_mutation` except
`channel_interactions`, which your change already handles.

It also needs the visitor ID to be **visible somewhere in the UI**, or a person cannot quote it in a
request. Today it is only in `localStorage` under `toju_visitor_v1`.

### 4.3 One thing I would not change

The `erasure_log` design — a SHA-256 of the subject rather than the id — is the right call, and I have
described it in the copy as a selling point rather than a footnote. A log of erasures that is itself a
list of people who asked to be forgotten would have been a poor trade, and the comment explaining why is
the kind of thing that makes a compliance file defensible.

---

*Draft copy only. A Nigerian-qualified lawyer must review this before any of it is published — and must
look specifically at the nine clauses listed at §0.3.*
