/* eslint-disable */
// @ts-nocheck
/* What the agency portal needs between its panes: who you are in the agency (the role, an invite link, the welcome after
   joining), the toast and the paywall prompt it can turn into, the to-do registry behind the task card and the bell, Paystack
   checkout and its return, the paywall and referral reads, the dynamic button, the magnetic drop zone and the verified stamp,
   and the names the panes call each other by (goToPane, openComposer, renderNoti and the rest, which fire events React
   answers). Was the last of the portal's page script (legacy/agency/inline-3.js); moved as it was, and run at the same point
   in the page, straight after portalData.js. */
export function run() {
    const w = window;
    /* portalData, the panes and the shared scripts call these by name, as when they sat in the page's own script. */
    w.closeLead = closeLead;
    w.toggleRm = toggleRm;
    w.loadAgents = loadAgents;
    w.renderAgents = renderAgents;
    w.openInvite = openInvite;
    w.applyRole = applyRole;
    w.loadVerification = loadVerification;
    w.loadTours = loadTours;
    w.buildHandoffs = buildHandoffs;
    w.renderHandoffs = renderHandoffs;
    w.fullListing = fullListing;
    w.vStamp = vStamp;
    w.rebuildPostListings = rebuildPostListings;
    w.taskMarks = taskMarks;
    w.taskMark = taskMark;
    w.openTasks = openTasks;
    w.findTask = findTask;
    w.setTasks = setTasks;
    w.showTasks = showTasks;
    w.openComposer = openComposer;
    w.closeComposer = closeComposer;
    w.openCaptionEditor = openCaptionEditor;
    Object.defineProperty(w, 'toast', { get: () => toast, set: (v) => { toast = v; }, configurable: true });
    w.authToken = authToken;
    w.showFreeAccess = showFreeAccess;
    w.startCheckout = startCheckout;
    w.refreshCurrentPlan = refreshCurrentPlan;
    w.openBilling = openBilling;
    w.loadBilling = loadBilling;
    w.blRender = blRender;
    w.planGate = planGate;
    w.loadPaywallInfo = loadPaywallInfo;
    w.paintReferral = paintReferral;
    w.claimPendingReferral = claimPendingReferral;
    w.toggleSetup = toggleSetup;
    w.openToju = openToju;
    w.closeToju = closeToju;
    w.refreshTojuPanel = refreshTojuPanel;
    w.renderOverview = renderOverview;
    w.renderNoti = renderNoti;
    w.toggleNoti = toggleNoti;
    w.goToPane = goToPane;
    Object.defineProperty(w, 'scrim', { get: () => scrim, configurable: true });
    Object.defineProperty(w, 'first', { get: () => first, configurable: true });
    Object.defineProperty(w, 'SB_URL', { get: () => SB_URL, configurable: true });
    Object.defineProperty(w, 'SB_KEY', { get: () => SB_KEY, configurable: true });
    Object.defineProperty(w, 'Dyn', { get: () => Dyn, configurable: true });
    Object.defineProperty(w, 'CTA_TOASTS', { get: () => CTA_TOASTS, configurable: true });
    Object.defineProperty(w, 'FREE_30_DAYS', { get: () => FREE_30_DAYS, configurable: true });
    Object.defineProperty(w, 'BL_TIER_NAME', { get: () => BL_TIER_NAME, configurable: true });
    Object.defineProperty(w, 'BL_ADDON_INFO', { get: () => BL_ADDON_INFO, configurable: true });
    Object.defineProperty(w, 'PLAN_GATE_RX', { get: () => PLAN_GATE_RX, configurable: true });
    Object.defineProperty(w, 'ME', { get: () => ME, set: (v) => { ME = v; }, configurable: true });
    Object.defineProperty(w, 'HANDOFFS', { get: () => HANDOFFS, set: (v) => { HANDOFFS = v; }, configurable: true });
    Object.defineProperty(w, 'POST_LISTINGS', { get: () => POST_LISTINGS, set: (v) => { POST_LISTINGS = v; }, configurable: true });
    Object.defineProperty(w, 'TASKS', { get: () => TASKS, set: (v) => { TASKS = v; }, configurable: true });
    Object.defineProperty(w, 'TASK_DONE_KEY', { get: () => TASK_DONE_KEY, set: (v) => { TASK_DONE_KEY = v; }, configurable: true });


    // ── the scrim, shared by the drawers (the profile, the listing form, the React side drawer) ──
    const scrim = document.getElementById('scrim');
    function closeLead(){ scrim.classList.remove('on'); window.dispatchEvent(new Event('syn:drawer-close')); }   // each drawer closes on this
    scrim.addEventListener('click', closeLead);

    /* Contact Synapse is React (src/features/agency/ContactSynapse.tsx). The name stays: the bell, the pricing cards and
       closeAgencyPopups call it. A pricing card passes the plan's name, and the panel then leads with an email about it. */
    function toggleRm(open, plan) { window.dispatchEvent(new CustomEvent('syn:rm-toggle', { detail: { open: open, plan: plan || null } })); }

    /* The Ask-Tayo panel's snapshot tiles and charts are React: src/features/agency/AdvisorBodies.tsx. */

    /* ── agents ── The roster, its cards and drawers are React (src/features/agency/AgentsPane.tsx). It counts each agent's open
       leads off the rows loaded here (window.SynLeads) and names lead holders from ROSTER_BY_ID (window.SynRosterName).
       loadAgents(), renderAgents() and openInvite() survive as names; ProfileDrawer, the setup ring and the lead load call them. */
    window.SynRosterName = function (id) { return ROSTER_BY_ID[id]; };
    function loadAgents() { window.dispatchEvent(new CustomEvent('syn:agents-load')); }
    function renderAgents() { window.dispatchEvent(new CustomEvent('syn:agents-render')); }
    function openInvite() { window.dispatchEvent(new CustomEvent('syn:invite')); }
    const first = n => String(n || '').split(' ')[0];

    /* Your own profile id, which drafts are owned by (draftOwner). Resolved once, best-effort. */
    let ME = null;
    if (window.SynAuth && SynAuth.client) {
      SynAuth.client().then((c) => c.auth.getSession()).then((r) => {
        ME = (r && r.data && r.data.session && r.data.session.user && r.data.session.user.id) || null;
      }).catch(() => {});
    }

    /* The team read in the Ask-Tayo panel (the floor, closed deals, response rate) is AdvisorBodies.tsx. */

    /* Straight after the join reload: open the profile once, as a welcome
       rather than a chore. Cleared first, so a refresh later never reopens it. */
    (function welcomeAfterJoin() {
      let just = null;
      try { just = sessionStorage.getItem('syn-just-joined'); sessionStorage.removeItem('syn-just-joined'); } catch (e) {}
      if (!just) return;
      setTimeout(() => { if (typeof openMyProfile === 'function') openMyProfile({ welcome: true }); }, 900);
    })();

    /* Arriving on an invite link. requireAuth has already sent an unauthenticated
       visitor to sign in and back, so by here there is a session, the function
       still checks that the invite belongs to THIS account's email address, so a
       forwarded link cannot let the wrong person in. */
    (function acceptInviteFromLink() {
      const token = new URLSearchParams(location.search).get('invite');
      if (!token || !window.SynListings || !SynListings.acceptInvite) return;
      SynListings.acceptInvite(token)
        .then((res) => {
          const clean = location.pathname;
          if (res.ok) {
            toast('You have joined ' + (res.agency_name || 'the agency') + '.');
            history.replaceState({}, '', clean);
            /* THE MOMENT THIS WAS MISSING. Accepting an invite reloaded the
               portal and left the new agent as a name on a card -- no face, no
               bio, no areas, nothing a colleague or a buyer could use. The
               reload still happens, because the whole portal is keyed to an
               agency this account did not belong to a second ago; the profile
               opens on the far side of it, once. The flag is the handoff. */
            try { sessionStorage.setItem('syn-just-joined', '1'); } catch (err) {}
            setTimeout(() => location.reload(), 1200);
            return;
          }
          const why = {
            sign_in: 'Sign in first, then open the invite link again.',
            wrong_account: 'That invite was sent to a different email address.',
            invalid_or_expired: 'That invite has expired or has already been used.',
            no_email: 'This account has no email address on it.',
          }[res.reason] || 'That invite could not be used.';
          toast(why);
          history.replaceState({}, '', clean);
        })
        .catch(() => toast('That invite could not be checked just now.'));
    })();

    /* ══ WHO YOU ARE IN THIS AGENCY ═══════════════════════════════════════
       Three roles, and until now the portal knew about none of them. myRole()
       has been in the data layer the whole time and nothing ever called it,
       so an agent invited to work leads opened the same ten panes as the
       person who owns the company -- Brand, Subscription, the team roster,
       all of it. Row-level security stopped most of the writes, which is why
       this was never a breach, but a control that is shown and then refuses
       is worse than one that was never offered: it reads as a broken product
       rather than a boundary.

         agency_owner  everything, and only they touch billing
         agency_admin  runs the agency day to day. Brand is their pane -- it
                       is the company's face and the thing they are actually
                       responsible for. Not billing: money stays with the one
                       person who signed up for it.
         agent         works listings, leads, tours, social and their own
                       profile. Their profile is their pane: it is what a
                       buyer reads before deciding whether to call them.

                       SOCIAL IS THEIRS TOO. An agent who lists a home is the
                       person who knows how to sell it, and routing every post
                       about it through an admin makes the admin a bottleneck
                       on the one activity the product exists to speed up. An
                       approval step was considered and deliberately dropped:
                       it would mean listings go live and their marketing sits
                       in a queue. What an agent CANNOT do is connect the
                       account -- see below -- because that is a credential
                       for the whole agency rather than an act of selling.

       Which panes each role opens, and hiding the rest, is React's now (ROLE_PANES in src/features/agency/PortalNav.tsx). This is
       the second lock, never the only one: the database policies are what actually stop an agent writing the brand. */
    function applyRole(role) {
      /* An unknown role is treated as the least privileged thing we know
         about rather than the most. A null role means the lookup failed or
         this account is not a member -- neither is a reason to open the
         company's books. */
      document.body.dataset.role = role || 'unknown';
      /* ANNOUNCE IT. The role arrives from its own round trip, and anything
         that renders off it is racing this line rather than following it.
         The social channel strip lost that race: it renders when the accounts
         fetch resolves, read an unstamped data-role, decided the viewer was
         an agent, and printed "an owner or admin connects this" -- to the
         owner. It never re-rendered, so an agency owner had no way to connect
         Instagram or Facebook at all.

         An event rather than a call, because applyRole should not have to
         know who cares. Whichever chain finishes first, the other is correct
         by the end. */
      document.dispatchEvent(new CustomEvent('syn:role', { detail: role || null }));
      /* What the role may not open is hidden by PortalNav.tsx on that event. */
    }

    (function loadRole() {
      if (!window.SynListings || !SynListings.myRole) { applyRole(null); return; }
      SynListings.myRole()
        .then(applyRole)
        .catch((err) => { console.error('myRole failed', err); applyRole(null); });
    })();

    /* ══ VERIFICATION ═══════════════════════════════════════════════════
       The checklist an agency works through to be verified, and the only
       place its legal documents are collected.

       Everything shown here is derived by verificationStatus() from the
       documents table -- no separate progress counter to fall out of step
       with what was actually uploaded. The four states (missing, pending,
       verified, expired) are worth distinguishing because they call for
       different things from the reader: upload it, wait, nothing, replace it.

       is_verified is never settable from this page. Supplying the papers is
       the agency's half and checking them is ours; an agency that could mark
       its own CAC certificate verified would make the badge worthless. */
    /* The page is React (src/features/agency/VerificationPane.tsx); goToPane still calls loadVerification by name. */
    function loadVerification() { window.dispatchEvent(new CustomEvent('syn:verification-load')); }

    /* The nav entry is a link, not a pane: the editor is a drawer, so there is
       nothing to switch to and switching would lose whatever pane you were on. */
    (function wireProfileNav() {
      const nav = document.getElementById('navMyProfile');
      if (nav) nav.addEventListener('click', (e) => { e.preventDefault(); openMyProfile(); });
    })();

    /* ── tours ────────────────────────────────────────────────────────────
       Upcoming group inspections. The agency confirms a slot it has already
       pre-cleared, accept or adjust, not open-ended scheduling, and can see
       exactly who is coming before the day.

       Headcount is deliberately split into "booked" and "confirmed": someone
       who has not answered the reconfirmation is not a body at the door, and
       the whole point of reconfirming is that the agent learns that in advance
       rather than standing outside a house waiting. */
    /* The page is React (src/features/agency/ToursPane.tsx); goToPane still calls loadTours by name. */
    function loadTours() { window.dispatchEvent(new CustomEvent('syn:tours-load')); }


    // ── verification queue (7-node progress) ──
    // Verification lives on the listing cards (verified/pending badge + freshness),
    // so there is no standalone Verification pane.

    // ── AI business advisor (overview), prescriptive, not just dashboards ──
    /* The ADVISOR array and renderAdvisor() lived here: three fixed questions
       -- "Why are sales down this month?", "Where should I focus today?",
       "Which listings are underperforming?" -- rendered as buttons with
       pre-written answers, identical for every agency forever.

       They are gone rather than reworded. The panel now carries live,
       stage-aware suggestions and a composer above the fold of the text box,
       and two competing question lists in one panel -- one dead, one live,
       with the dead one on top -- is worse than either alone. */
    // advisor now lives in the Ask-Tayo panel; it renders when the panel opens.

    // ── Tayo Negotiator (Phase C) ──
    // Negotiation authority: the floor is an encrypted, engine-only field.
    // Negotiation authority (per-property floors) was removed with the
    // property grid it rendered into, see #pane-negotiator.

    // Handoff summaries, Tayo pre-negotiated, ready to close.
    // Tayo-negotiated handoffs. Empty until Tayo actually negotiates a real
    // lead on a real listing, this held five invented buyers with invented
    // transcripts, offers and agreed prices for properties that never existed.
    /* Real ones only. This array held five invented buyers with invented
       transcripts for properties that never existed, and was emptied for that
       reason, but it was then left with no data path at all, so the pane
       could never show anything however much the agency did.

       It fills from leads now. A lead carries preferences.negotiation when the
       buyer ran Tayo's negotiator before making contact, which is exactly the
       condition this pane describes: Tayo qualified them and worked out a
       price. No negotiation, no card. */
    /* The pane is React (src/features/agency/NegotiatorPane.tsx). Which leads are handoffs is worked out here, beside the lead
       list; renderHandoffs() tells the pane to read them again. */
    let HANDOFFS = [];
    function buildHandoffs(rows) {
      HANDOFFS = (rows || [])
        .filter(function (l) { return l.neg && l.neg.offer != null; })
        .map(function (l) {
          const listed = l.listPrice != null ? nairaShort(l.listPrice) : l.price;
          return {
            id: l.id,
            agentId: l.agentId,
            buyer: l.nm,
            prop: (l.pr || '').split(' · ')[0],
            source: ({ toju_chat: 'Tayo', contact_button: 'Contact button', browse: 'Browse' })[l.rawSource] || 'Direct',
            price: listed,
            agreed: nairaShort(l.neg.offer),
            rating: l.temp === 'Hot' ? 'High intent' : l.temp === 'Warm' ? 'Worth a call' : 'Early',
            rec: l.neg.advice || '',
            draft: l.neg.draft || '',
            signals: [l.stage, l.score != null ? l.score + '/100' : null].filter(Boolean),
          };
        });
    }
    window.SynHandoffs = function () { return HANDOFFS; };
    function renderHandoffs() { window.dispatchEvent(new CustomEvent('syn:handoffs')); }


    // ── social composer: New post → AI captions (edge fn) → schedule ──
    const SB_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
    const SB_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
    window.SynSB = { url: SB_URL, key: SB_KEY };
    /* The social composer posts about YOUR listings. This was four invented
       Lagos properties with invented trust scores, so an agency could compose
       and schedule a post about a home it does not have. Derived from
       LISTINGS_DATA and rebuilt whenever listings change. */
    /* THE WHOLE ROW, FOR THE GENERATOR ONLY.
       Both send paths were handing social-generate a PROJECTION rather than a
       listing. POST_LISTINGS carries ten fields and the campaign picker's rows
       carry thirteen, and neither includes description, amenities,
       service_charge, move_in_cost, bathrooms, address or title_type.

       Those are exactly the fields the rewrite depends on. Without them the
       itemised Other Charges block cannot appear, the Title line on a sale
       cannot appear, and the amenity angle has nothing to name -- so the
       generator was still receiving the same thin data that produced the
       repetition in the first place, while the prompt asked it for a spec
       sheet it had no specs for.

       It went unnoticed because every test fed the function a hand-written
       full row. The function was right; the caller was starving it.

       Looked up by id rather than widening the projections: they exist to
       render the composer and the picker, half a dozen places read their exact
       shape, and the generator is the only consumer that wants all fifty
       columns. */
    function fullListing(id) {
      const L = (typeof LISTINGS_DATA !== 'undefined' && Array.isArray(LISTINGS_DATA))
        ? LISTINGS_DATA : [];
      return L.find((x) => x && x.id === id) || null;
    }

    /* THE DYNAMIC BUTTON (idea: dqnamo's "Dynamic Button" in The Kitchen).
       A button that says "Save", then "Saving...", then "Saved" used to swap its
       text in one frame and jump in width. This changes the label with a short
       crossfade and glides the button from its old width to its new one, so the
       eye follows the change instead of catching up with it. Buttons that are
       full width already (a phone's pinned Save) just get the crossfade, since
       their width does not move. Reduced motion: the text changes, nothing
       animates. The label is markup WE write (icons, "Saving..."), never
       user text; pass anything typed by a person through esc2() first. */
    const Dyn = (function () {
      const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const SPIN = '<span class="dyn-spin" aria-hidden="true"></span>';
      const TICK = '<svg class="dyn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';
      function glide(btn, w0) {
        if (!btn || !btn.isConnected || reduce() || !(w0 > 0)) return;
        btn.style.transition = 'none'; btn.style.width = '';
        const w1 = btn.getBoundingClientRect().width;
        if (Math.abs(w1 - w0) < 1.5) return;
        btn.style.width = w0 + 'px'; btn.style.overflow = 'hidden';
        void btn.offsetWidth;
        const done = () => { btn.style.transition = ''; btn.style.width = ''; btn.style.overflow = ''; btn.removeEventListener('transitionend', onEnd); };
        const onEnd = (e) => { if (e.target === btn && e.propertyName === 'width') done(); };
        /* Start the glide on a frame that has actually been drawn. A heavy
           re-render can hold the page for a few hundred milliseconds, and a
           transition begun before that is already over when the first frame
           arrives: the button would jump, which is what this exists to avoid. */
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!btn.isConnected) return;
          btn.style.transition = 'width .3s cubic-bezier(.2,.8,.2,1)'; btn.style.width = w1 + 'px';
          btn.addEventListener('transitionend', onEnd); setTimeout(done, 420);
        }));
        setTimeout(done, 1200);   /* never leave a button pinned to a width */
      }
      function set(btn, html) {
        if (!btn || btn.dataset.dynHtml === html) return;
        const w0 = btn.getBoundingClientRect().width;
        btn.dataset.dynHtml = html;
        btn.innerHTML = '<span class="dyn-l">' + html + '</span>';
        glide(btn, w0);
      }
      /* Put a label back without animating (a dialog that reopens). */
      function reset(btn, html) { if (btn) { btn.dataset.dynHtml = html; btn.innerHTML = '<span class="dyn-l still">' + html + '</span>'; } }
      return { set, reset, glide, SPIN, TICK };
    })();

    /* THE MAGNETIC DROP ZONE, page-wide half. While a file is being dragged
       anywhere over the page and the listing form's drop zone exists, the zone
       wakes, leans toward the pointer as it gets close, and snaps when it is
       near. A drop within a small margin counts as a drop ON the zone, so a
       shaky hand still lands. Only files are touched (dataTransfer.types has
       'Files'); a dragged piece of text or a pipeline card is none of its
       business. With no zone on screen this does nothing at all. */
    (function magneticDrop() {
      const NEAR = 28, REACH = 300, PULL = 16;
      const zone = () => document.getElementById('lfDz');
      const hasFiles = (e) => !!(e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1);
      const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      let scrolled = false;
      function reset() {
        scrolled = false;
        const z = zone(); if (!z) return;
        z.classList.remove('awake', 'hot');
        z.style.removeProperty('--mx'); z.style.removeProperty('--my'); z.style.removeProperty('--ms');
      }
      document.addEventListener('dragenter', (e) => {
        const z = zone(); if (!z || !hasFiles(e)) return;
        z.classList.add('awake');
        if (!scrolled) {
          scrolled = true;
          const r = z.getBoundingClientRect();
          if (r.bottom < 40 || r.top > window.innerHeight - 40) z.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
        }
      });
      document.addEventListener('dragover', (e) => {
        const z = zone(); if (!z || !hasFiles(e)) return;
        e.preventDefault();                       /* or the browser opens the file in this tab */
        const r = z.getBoundingClientRect();
        const ex = Math.max(r.left - e.clientX, 0, e.clientX - r.right), ey = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
        const d = Math.hypot(ex, ey), hot = d <= NEAR;
        z.classList.add('awake'); z.classList.toggle('hot', hot);
        e.dataTransfer.dropEffect = hot ? 'copy' : 'none';
        if (calm()) return;
        const t = hot ? 1 : Math.max(0, 1 - d / REACH);
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy, dist = Math.hypot(dx, dy) || 1;
        const shift = t * t * PULL * (hot ? 0.5 : 1);
        z.style.setProperty('--mx', (dx / dist * shift).toFixed(1) + 'px');
        z.style.setProperty('--my', (dy / dist * shift).toFixed(1) + 'px');
        z.style.setProperty('--ms', (1 + t * 0.035).toFixed(3));
      });
      document.addEventListener('dragleave', (e) => { if (e.relatedTarget === null) reset(); });
      document.addEventListener('drop', (e) => {
        const z = zone(); if (!z || !hasFiles(e)) return;
        e.preventDefault();
        const hot = z.classList.contains('hot'), files = e.dataTransfer.files;
        reset();
        if (hot && z.__take) {
          z.classList.remove('land'); void z.offsetWidth; z.classList.add('land');
          setTimeout(() => z.classList.remove('land'), 520);
          z.__take(files);
        }
      });
      window.addEventListener('dragend', reset);
    })();

    /* THE VERIFIED STAMP (idea: dqnamo's "Stamp" in The Kitchen). "Verified" was a
       green word on a photo; it is the one claim Synapse makes that nobody else
       can, so it gets to look like something that was applied by hand: a
       perforated postage stamp, a shield, a postmark half-printed over the edge.
       Drawn only from a listing's own verification_status, never from anything a
       caller can type, and the words stay as text (and a tooltip) for readers
       who cannot see the picture. kind: 'ok' | 'review'. size: 'sm' for tiles. */
    function vStamp(kind, size, label) {
      const ok = kind !== 'review';
      const word = ok ? 'Verified' : 'In review';
      const ico = ok
        ? '<path d="M12 3 4.5 6v5.5c0 4.4 3 8 7.5 9.5 4.5-1.5 7.5-5.1 7.5-9.5V6z"/><path d="m8.6 12 2.4 2.4 4.4-4.8"/>'
        : '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>';
      return '<span class="vst ' + (ok ? 'ok' : 'rv') + (size === 'sm' ? ' sm' : '') + '" title="' + (ok ? 'Verified by Synapse: all seven checks passed' : 'Synapse is checking this listing') + '">'
        + '<span class="vst-in"><svg viewBox="0 0 24 24" aria-hidden="true">' + ico + '</svg>'
        + '<b>' + word.toUpperCase() + '</b><i>' + (label || 'SYNAPSE') + '</i></span>'
        + '<span class="vst-pm" aria-hidden="true"></span><span class="sr-only">' + word + '. </span></span>';
    }

    let POST_LISTINGS = [];
    function rebuildPostListings() {
      const L = (typeof LISTINGS_DATA !== 'undefined' && Array.isArray(LISTINGS_DATA)) ? LISTINGS_DATA : [];
      POST_LISTINGS = L.filter(l => l.is_active !== false).map(l => ({
        id: l.id,
        title: l.title || l.t || '(untitled)',
        price: Number(l.price) || 0,
        city: l.city || '',
        area: l.neighbourhood || l.city || '',
        bedrooms: l.bedrooms,
        listingType: l.listing_type || 'sale',
        trustScore: l.trust_score,
        verification_status: l.verification_status,
        img: listingCover(l.media) || l.img || '',
      }));
    }
    rebuildPostListings();
    document.addEventListener('syn:listings', rebuildPostListings);
    window.SynPostListings = function () { return POST_LISTINGS; };

    /* ═══ Things only a person can do, as pop-ups, not fixtures ═══════════
       Eden: "things that need you to copy and paste, don't have them fixed on
       the page. Let them come as a pop-up ... Don't have it permanently on the
       page. Do this for every single page that has this sort of thing."

       A standing checklist is furniture: read once, then scrolled past for
       ever. A task that arrives when it becomes true, says exactly what to
       paste where, and leaves when it is done gets read. Each one stays in the
       bell under "To do" until it is marked done, so closing the card never
       loses it.

       Done is remembered on this device. Later hides it until the next visit;
       it pops up again then, because it is still not done. A source (the
       channels strip, a publish) hands over its whole current list each time
       it knows its state, so a task that stops being true simply disappears.

       `var`, not `let`: sources call in from IIFEs above and below, and a
       call that arrived before this line ran must find an object, not a
       temporal-dead-zone error. */
    var TASKS = { bySource: {}, shown: {}, popped: {} };
    var TASK_DONE_KEY = 'syn_tasks_done_v1', TASK_LATER_KEY = 'syn_tasks_later_v1';

    function taskMarks(kind) {
      try {
        var store = kind === 'done' ? localStorage : sessionStorage;
        return JSON.parse(store.getItem(kind === 'done' ? TASK_DONE_KEY : TASK_LATER_KEY)) || {};
      } catch (e) { return {}; }
    }
    function taskMark(kind, id) {
      var m = taskMarks(kind); m[id] = Date.now();
      try {
        (kind === 'done' ? localStorage : sessionStorage)
          .setItem(kind === 'done' ? TASK_DONE_KEY : TASK_LATER_KEY, JSON.stringify(m));
      } catch (e) { /* storage blocked: the card still closes */ }
    }
    /* Everything outstanding, for the bell. One-off tasks (a publish's links)
       are popped but never listed: they are about a moment, not a state. */
    function openTasks() {
      var done = taskMarks('done'), out = [];
      Object.keys(TASKS.bySource).forEach(function (k) {
        (TASKS.bySource[k] || []).forEach(function (t) { if (!t.once && !done[t.id]) out.push(t); });
      });
      return out;
    }
    function findTask(id) {
      var all = [];
      Object.keys(TASKS.bySource).forEach(function (k) { all = all.concat(TASKS.bySource[k] || []); });
      return all.find(function (t) { return t.id === id; }) || TASKS.shown[id] || null;
    }

    function setTasks(source, list) {
      TASKS.bySource[source] = list || [];
      var done = taskMarks('done'), later = taskMarks('later');
      var fresh = TASKS.bySource[source].filter(function (t) {
        return !done[t.id] && !later[t.id] && !TASKS.popped[t.id];
      });
      if (typeof renderNoti === 'function') { try { renderNoti(); } catch (e) { /* bell not ready yet */ } }
      if (fresh.length) showTasks(fresh);
    }

    /* The card is React (src/features/agency/TaskCard.tsx): it joins an open card rather than replacing it, and marks a task
       done or later through taskMark() above, so the bell and the card agree. */
    function showTasks(list) {
      if (!list || !list.length) return;
      list.forEach(function (t) { TASKS.popped[t.id] = true; TASKS.shown[t.id] = t; });
      window.dispatchEvent(new CustomEvent('syn:tasks-show', { detail: list }));
    }

    /* The campaign generator and the social channels (connect, Add channel, comment replies, the connect result) are React:
       src/features/agency/CampaignGenerator.tsx and SocialChannels.tsx. */

    /* ═══ THE COMPOSER is React (src/features/agency/PostComposer.tsx), with its hashtag chips and the full-size caption editor.
       The names stay: the listings grid, the marketing digest, the pipeline cards and the board's own caption edit call them.
       which: a listing id (or an index into POST_LISTINGS, for the taskbar's "+"). */
    function openComposer(which) { window.dispatchEvent(new CustomEvent('syn:composer', { detail: which })); }
    function closeComposer() { window.dispatchEvent(new CustomEvent('syn:composer-close')); }
    /* o: { ch, text, property?, listing?, title?, onSave(text) -> maybe a promise } */
    function openCaptionEditor(o) { window.dispatchEvent(new CustomEvent('syn:caption-editor', { detail: o })); }

    // toast + wire the remaining action buttons so every CTA responds
    function toast(msg){
      let t = document.getElementById('toast');
      if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
      t.textContent = msg; t.classList.add('on');
      clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2800);
    }
    const CTA_TOASTS = {
      '+ New listing': 'Listing upload, add photos and the 7-node verification kicks off automatically.',
      '+ New campaign': 'Campaign builder, target Tayo briefs by area, budget and intent.',
      'Current plan': 'You’re on Free, free forever. Upgrade any time.',
      'See how it works': 'A 2-minute tour of the agency portal is on the way.',
    };
    document.querySelectorAll('button').forEach((b) => {
      const msg = CTA_TOASTS[b.textContent.trim()];
      if (msg && !b.dataset.wired) { b.dataset.wired = '1'; b.addEventListener('click', () => toast(msg)); }
    });

    document.getElementById('newPostBtn').addEventListener('click', () => openComposer());

    /* The Subscription pane (plans, usage, referral card) is React: src/features/agency/SubscriptionPane.tsx. */

    // ── real checkout: Paystack, hosted redirect ──
    // No Paystack key ever touches this page, the client only ever talks to
    // the paystack-checkout edge function, which holds the secret key and
    // does the real work. See synapse-platform/supabase/functions/paystack-*.
    /* Resolves to null rather than throwing, on every path. It is called
       from three places now, each inside a try or a .catch that would turn a
       throw into a sentence about the network -- and a missing session is a
       thing the caller can handle well (the endpoint answers "Sign in to
       generate captions") while an exception is a thing it can only guess at. */
    function authToken() {
      if (!window.SynAuth) return Promise.resolve(null);
      return SynAuth.client().then((c) => c.auth.getSession())
        .then((r) => (r && r.data && r.data.session && r.data.session.access_token) || null)
        .catch(() => null);
    }
    /* what: 'accelerator' (a month of it, the old call), or
       { plan, period } or { addon }. The function prices it, never the page. */
    /* FOR NOW, NOBODY PAYS (Eden, 2026-10-16: "when users want to pay any tier, tell them they have free 30 days access to
       the highest tier"). Pressing Pay on any plan or add-on shows this instead of opening Paystack. It is true because the
       paywall is off (platform_settings paywall_enabled): every agency already has everything, which is the highest plan.
       To bring payments back, set FREE_30_DAYS to false and the original checkout below runs again. */
    const FREE_30_DAYS = true;
    function showFreeAccess() { window.dispatchEvent(new CustomEvent('syn:free-access')); }   // the prompt is React (SubscriptionPane.tsx)
    function startCheckout(what, btn) {
      if (FREE_30_DAYS) { showFreeAccess(); return; }
      const req = typeof what === 'string' ? { plan: what, period: 'monthly' } : what;
      const label = btn ? btn.textContent : '';
      /* The plan picker stays usable while Paystack opens, so on failure the
         button is rebuilt from the current choice rather than restored to
         the label it had when it was pressed. */
      const done = () => {
        if (!btn) return;
        btn.disabled = false;
        /* The label was changed to "Opening Paystack" by hand, so the cached one
           is stale: clear it, or the rebuild thinks nothing changed. */
        if (btn.hasAttribute('data-bl-pay')) blRender();
        else btn.textContent = label;
      };
      if (btn) { btn.disabled = true; btn.textContent = 'Opening Paystack\u2026'; }
      authToken().then((token) => {
        if (!token) {
          /* With the hash, so paying from the Subscription pane returns you
             to the Subscription pane rather than to Overview. */
          const here = window.location.pathname + window.location.search + window.location.hash;
          window.location.href = 'signin.html?role=agency&reason=agency&next=' + encodeURIComponent(here);
          return;
        }
        /* Names the agency being paid for: someone in two agencies must
           never be charged against the wrong one (Greptile). */
        return (window.SynListings && SynListings.agencyId ? SynListings.agencyId().catch(() => null) : Promise.resolve(null))
          .then((aid) => fetch(SB_URL + '/functions/v1/paystack-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + token },
          body: JSON.stringify(Object.assign({ action: 'init' }, aid ? { agencyId: aid } : {}, req)),
        }))
          .then((r) => r.json().catch(() => ({})).then((d) => ({ ok: r.ok, d })))
          .then(({ ok, d }) => {
            if (!ok || !d.authorization_url) { done(); toast(d.error || 'Could not start checkout. Please try again.'); return; }
            window.location.href = d.authorization_url;
          })
          .catch(() => { done(); toast('Network hiccup starting checkout. Please try again.'); });
      });
    }
    // Paystack redirects back here as ?reference=..., that query param is
    // an untrusted browser redirect (spoofable), used only as a lookup key.
    // The real answer always comes from asking our own edge function, which
    // re-verifies with Paystack directly rather than trusting anything in
    // the URL.
    (function checkoutReturn() {
      const ref = new URLSearchParams(location.search).get('reference');
      if (!ref) return;
      history.replaceState(null, '', location.pathname);
      authToken().then((token) => {
        if (!token) return;
        return fetch(SB_URL + '/functions/v1/paystack-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + token },
          body: JSON.stringify({ action: 'verify', reference: ref }),
        }).then((r) => r.json()).then((d) => {
          if (d.ok) {
            const what = d.kind === 'addon'
              ? ((BL_ADDON_INFO[d.addon] || {}).name || 'Your add-on') + ' is paid.'
              : (BL_TIER_NAME[d.tier] || 'Your plan') + ' is live on your account.';
            toast(what);
            refreshCurrentPlan();
          } else {
            toast('Still processing. This updates by itself once Paystack confirms it.');
          }
          goToPane('billing');
        });
      }).catch(() => {});
    })();

    // The plan actually on the agency's record: the Subscription pane (React) reads it again.
    function refreshCurrentPlan() { window.dispatchEvent(new CustomEvent('syn:plan-refresh')); }

    /* ══ BILLING ══════════════════════════════════════════════════════════
       Eden, 2026-10-02: "build a billing page with our design elements and
       put the add-ons as well". What the agency is on, paying for a month or
       a year, add-ons, and every payment.

       Every price shown here comes from agency_billing(), which reads the
       same billing_prices() the checkout charges, so the page cannot show
       one number and charge another. The annual offer is per agency: those
       that joined before it closes (1 December 2026) keep two months free.

       Owner only, like Subscription: ROLE_PANES leaves it out for admins and
       agents, and the checkout refuses anyone but an owner or admin. */
    /* The page is React (src/features/agency/BillingPane.tsx). The names stay: goToPane calls loadBilling, the pricing cards and
       the paywall prompt call openBilling, and startCheckout asks for the pay button's label back with blRender. The checkout's
       return toast still names plans and add-ons from these two. */
    const BL_TIER_NAME = { free: 'Free', accelerator: 'Accelerate', market_leader: 'Leader', enterprise: 'Enterprise' };
    const BL_ADDON_INFO = {
      listing_pack:         { name: 'Extra Listing Pack',   ico: 'agency', desc: '+25 active listings for a month, added the moment you pay.' },
      social_boost:         { name: 'Social Reach Boost',   ico: 'share',  desc: 'Paid reach behind one listing on social. Never affects Tayo’s ranking.' },
      verification_credits: { name: 'Verification Credits', ico: 'shield', desc: 'Your next listings go to the front of the verification desk.' },
      campaign_boost:       { name: 'Campaign Boost',       ico: 'chart',  desc: 'Extra reach behind a marketing campaign that’s working.' },
      ai_credits:           { name: 'AI Marketing Credits', ico: 'spark',  desc: 'AI captions aren’t metered yet, so there is nothing to top up. On sale when they are.' },
    };
    function openBilling(planId) {
      if (planId) window.dispatchEvent(new CustomEvent('syn:billing-plan', { detail: planId }));
      goToPane('billing');
    }
    function loadBilling() { window.dispatchEvent(new CustomEvent('syn:billing-load')); }
    function blRender() { window.dispatchEvent(new CustomEvent('syn:billing-render')); }

    /* ══ THE PAYWALL'S FACE (2026-10-03) ═════════════════════════════════
       When a plan limit refuses something, the database says so in a
       sentence ("Your free plan includes 20 active listings..."). That used
       to arrive as a toast or a red note. Now it opens a prompt that says
       what happened and offers the way through: plans, or a listing pack.
       Only the owner pays, so others are told to ask their owner. */
    const PLAN_GATE_RX = /plan includes \d+ (active listings|team seats)|on the Accelerate plan and above/i;
    function planGate(msg) {
      msg = String(msg || '');
      if (!PLAN_GATE_RX.test(msg)) return false;
      window.dispatchEvent(new CustomEvent('syn:plan-gate', { detail: msg }));   // the prompt is React (SubscriptionPane.tsx)
      return true;
    }
    (function hookToasts() {
      const base = toast;
      toast = function (msg) { if (planGate(msg)) return; return base.apply(this, arguments); };
    })();

    /* What the paywall says about THIS agency: on or not, enforced or still
       in its free period, and until when. Read once at start; drives the
       notification above. */
    function loadPaywallInfo() {
      if (!window.SynAuth || !window.SynListings || !SynListings.agencyId) return;
      SynAuth.client().then((c) => SynListings.agencyId().then((aid) => aid ? c.rpc('agency_plan_usage', { p_agency_id: aid }) : null))
        .then((r) => {
          if (!r || r.error || !r.data) return;
          window.SYN_PAYWALL = r.data;
          if (typeof renderNoti === 'function') { try { renderNoti(); } catch (e) {} }
        }).catch(() => {});
      /* Referrals: every 5 agents you refer = a month free. */
      SynAuth.client().then((c) => SynListings.agencyId().then((aid) => aid ? c.rpc('referral_overview', { p_agency: aid }) : null))
        .then((r) => {
          if (!r || r.error || !r.data) return;
          window.SYN_REFERRAL = r.data; paintReferral();
          if (typeof renderNoti === 'function') { try { renderNoti(); } catch (e) {} }
        }).catch(() => {});
    }
    function paintReferral() { window.dispatchEvent(new CustomEvent('syn:referral')); }   // the card is React (SubscriptionPane.tsx)
    /* A visitor who arrived through someone's link claims it once they have an
       agency. The database decides whether it counts; this only passes the code
       on and then forgets it, unless the answer is "not yet" (no agency yet) or
       the network failed. */
    function claimPendingReferral() {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem('syn_ref') || 'null'); } catch (e) { return; }
      if (!raw || !raw.c || (Date.now() - (raw.t || 0)) > 30 * 864e5) { try { localStorage.removeItem('syn_ref'); } catch (e) {} return; }
      if (!window.SynAuth) return;
      SynAuth.client().then((c) => c.rpc('referral_claim', { p_code: raw.c })).then((r) => {
        if (!r || r.error) return;
        const why = r.data && r.data.reason;
        if (why !== 'no_agency') { try { localStorage.removeItem('syn_ref'); } catch (e) {} }
      }).catch(() => {});
    }
    setTimeout(claimPendingReferral, 4000);

    /* ══ THE SETUP ANCHOR: the ring and its list are React (src/features/agency/SetupRing.tsx). What it needs from here: whether any lead has been
       moved past New (the portal's own lead list knows), and the name toggleSetup, which closeAgencyPopups calls. */
    window.SynLeadsAnswered = function () { return typeof leads !== 'undefined' && Array.isArray(leads) && leads.some((l) => l.stage && l.stage !== 'New'); };
    function toggleSetup(open) { window.dispatchEvent(new CustomEvent('syn:setup-toggle', { detail: open })); }
    setTimeout(loadPaywallInfo, 2500);
    /* Kept fresh (Greptile): a portal left open past the free date must not
       go on saying it is free. */
    setInterval(loadPaywallInfo, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') loadPaywallInfo(); });

    /* The persistent Ask-Tayo panel is React (src/features/agency/AdvisorPanel.tsx), and what it says on each pane is
       AdvisorBodies.tsx, counted from what the portal has loaded. */
    function openToju() { window.dispatchEvent(new CustomEvent('syn:advisor-open')); }
    function closeToju() { window.dispatchEvent(new CustomEvent('syn:advisor-close')); }
    // keep the open panel's snapshot fresh when listings/marketing stats change
    function refreshTojuPanel(pane) { window.dispatchEvent(new CustomEvent('syn:advisor-refresh', { detail: pane })); }

    /* Which suggested questions the advisor offers follows where the agency actually IS. Read from what the portal already knows,
       so the chips are right the instant the panel opens; the server recomputes the same thing before it answers. */
    window.SynAdvisorStage = function () {
      const listings = (typeof LISTINGS_DATA !== 'undefined' && Array.isArray(LISTINGS_DATA))
        ? LISTINGS_DATA : [];
      const brand = window.BRAND || null;
      const brandThin = !brand || !(brand.name || '').trim() || !(brand.logo_url || '').trim();
      /* `leads` is the portal's own array, replaced wholesale when the fetch
         lands, so this reads whatever the CRM currently has. */
      const leadCount = (typeof leads !== 'undefined' && Array.isArray(leads)) ? leads.length : 0;
      if (!listings.length) return brandThin ? 'new' : 'no-listings';
      if (!leadCount) return 'no-leads';
      return 'running';
    };

    /* ═══ OVERVIEW is React (src/features/agency/OverviewPane.tsx): the list, the map, the tabbed detail and the phone sheet.
       The name stays: the listings load and every listing change call it. */
    function renderOverview() { window.dispatchEvent(new CustomEvent('syn:overview')); }

    /* ═══ Notification bell, the single home for every alert AND reminder ═══ */
    /* ═══ THE BELL is React (src/features/agency/Bell.tsx), with what its items are: it reads the listings, leads, posts and
       tasks through the window API above. */
    /* Both names are called around the page (and toggleNoti by the account menu); the bell answers them. */
    function renderNoti() { document.dispatchEvent(new Event('syn:noti-refresh')); }
    function toggleNoti(open) { window.dispatchEvent(new CustomEvent('syn:noti-toggle', { detail: open })); }

    renderNoti();
    renderOverview();

    /* ═══ GETTING AROUND is React (src/features/agency/PortalNav.tsx): the rail, the panes, Back and Forward, the expanding
       side rail, the pane in the hash and the phone taskbar. The name stays: the bell, the billing and social code call it. */
    function goToPane(pane) { window.dispatchEvent(new CustomEvent('syn:goto', { detail: pane })); }

    /* ═══ Brand page ═══ is React: src/features/agency/BrandPage.tsx. */

    // simple toggles in social studio
}
