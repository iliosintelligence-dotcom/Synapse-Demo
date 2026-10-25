    /* The data above this point (leads, pipeline, listings) is src/features/agency/portalData.js, which runs just before this. */

    // ── the shared drawer ──
    const scrim = document.getElementById('scrim'), drawer = document.getElementById('drawer');
    function closeLead(){ scrim.classList.remove('on'); drawer.classList.remove('on'); const t = document.querySelector('.ctip'); if (t) t.style.opacity = '0';
      window.dispatchEvent(new Event('syn:drawer-close')); }   // the profile drawer is React's and closes with this one
    scrim.addEventListener('click', closeLead);
    /* One listener on the container instead of one per render. The drawer's
       innerHTML is replaced by eleven different templates and each used to
       re-query the close button by id and bind again, eleven copies of the
       same line, and eleven elements sharing one id. The container outlives
       every template, so delegation is the honest shape for this. */
    drawer.addEventListener('click', (e) => { if (e.target.closest('.x')) closeLead(); });

    // creative insights now live in the Ask-Tayo panel (marketing context).
    /* Contact Synapse is React (src/features/agency/ContactSynapse.tsx). The name stays: the bell, the pricing cards and
       closeAgencyPopups call it. A pricing card passes the plan's name, and the panel then leads with an email about it. */
    function toggleRm(open, plan) { window.dispatchEvent(new CustomEvent('syn:rm-toggle', { detail: { open: open, plan: plan || null } })); }

    // ── chart primitives, one brand hue on a muted track; labels wear ink ──
    const C_BRAND = '#121212', C_TRACK = 'rgba(0,0,0,0.06)';
    function sparkSVG(pts, o) {
      o = o || {};
      const w = o.w || 116, h = o.h || 32, pad = 4;
      const min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
      const nx = i => pad + (i / (pts.length - 1)) * (w - pad * 2);
      const ny = v => max === min ? h / 2 : (h - pad) - ((v - min) / (max - min)) * (h - pad * 2);
      const line = pts.map((v, i) => (i ? 'L' : 'M') + nx(i).toFixed(1) + ' ' + ny(v).toFixed(1)).join(' ');
      const area = o.area ? `<path d="${line} L${nx(pts.length - 1).toFixed(1)} ${h - 1} L${nx(0).toFixed(1)} ${h - 1} Z" fill="${C_BRAND}" opacity="0.09"/>` : '';
      const dot = `<circle cx="${nx(pts.length - 1).toFixed(1)}" cy="${ny(pts.length - 1 >= 0 ? pts[pts.length - 1] : 0).toFixed(1)}" r="3" fill="${C_BRAND}"/>`;
      return `<svg class="statspark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-pts="${pts.join(',')}" data-pad="${pad}" aria-hidden="true">${area}<path d="${line}" fill="none" stroke="${C_BRAND}" stroke-width="2" stroke-linecap="round"/>${dot}</svg>`;
    }
    function ringSVG(pct, o) {
      o = o || {};
      const s = o.size || 54, sw = o.sw || 6, r = (s - sw) / 2, c = 2 * Math.PI * r;
      const val = o.label != null ? o.label : Math.round(pct) + '%';
      return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true">
        <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${C_TRACK}" stroke-width="${sw}"/>
        <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${C_BRAND}" stroke-width="${sw}" stroke-linecap="round"
          stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"/>
        <text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="Lato,system-ui,sans-serif" font-size="${o.fs || 12.5}" font-weight="700" fill="#15171a">${val}</text>
      </svg>`;
    }
    function hbarsHTML(rows, unit) {
      const max = Math.max.apply(null, rows.map(r => r[1]));
      return rows.map(r =>
        `<div class="hrow" title="${r[0]}: ${r[1]}${unit || ''}"><span class="hlb">${r[0]}</span><span class="htrack"><i style="width:${max ? (r[1] / max * 100) : 0}%"></i></span><span class="hn">${r[1]}${unit || ''}</span></div>`
      ).join('');
    }
    function statTile(v, l, pts) {
      return `<div class="card stat"><div class="v">${v}</div><div class="l">${l}</div>${pts ? sparkSVG(pts) : ''}</div>`;
    }

    // shared chart tooltip (hover layer for the profile spark)
    const ctip = document.createElement('div'); ctip.className = 'ctip'; document.body.appendChild(ctip);
    /* wireSparkHover lived here: a hover readout for the 8-week sparklines,
       drawing a marker on the line and following the cursor with .ctip. It
       was declared and never called from anywhere in the repo. Removed; the
       sparklines render their trend without it. */
    const WKS = ['7 wks ago', '6 wks ago', '5 wks ago', '4 wks ago', '3 wks ago', '2 wks ago', 'Last week', 'This week'];

    // ── overview + CRM stat tiles (hero number + 8-week trend) ──
    /* Counted from real records. These were fixed numbers with invented 8-week
       sparklines, "₦2.4B sales value" and "128 leads" on an account that has
       neither. Sparklines are omitted entirely: a trend line needs history, and
       inventing the shape of a trend is worse than showing none. */
    const wonLeads = () => leads.filter(l => l.stage === 'Won');
    const salesValue = () => wonLeads().reduce((s, l) => s + (Number(String(l.price || '').replace(/[^\d.]/g, '')) || 0), 0);
    const fmtB = (n) => n >= 1e9 ? '₦' + (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? '₦' + Math.round(n / 1e6) + 'M' : '₦' + n.toLocaleString();

    STATS.overview =
      statTile(leads.filter(l => l.stage !== 'Won').length, 'Active leads', null) +
      statTile(leads.filter(l => l.stage === 'Viewing').length, 'Viewings booked', null) +
      statTile(wonLeads().length, 'Won this quarter', null) +
      statTile(fmtB(salesValue()), 'Sales value', null);
    STATS.crm =
      statTile(leads.length, 'Leads', null) +
      statTile(leads.filter(l => l.stage === 'Viewing').length, 'Viewings', null) +
      `<div class="card stat"><div class="l" style="margin-bottom:6px">Conversion</div><div class="ringwrap">${ringSVG(leads.length ? Math.round((wonLeads().length / leads.length) * 100) : 0, { label: (leads.length ? Math.round((wonLeads().length / leads.length) * 100) : 0) + '%' })}</div></div>` +
      statTile(fmtB(salesValue()), 'Sales', null);

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

    STATS.agents = '';   // rebuilt from real numbers by renderAgentSummary
    /* The KPI strip and the two performance charts live in the Ask-Tayo side panel, drawn from the same roster the Agents
       pane shows. They render into the panel's markup, which only exists while that panel is open, hence the null checks. */
    function renderAgentSummary() {
      /* The read here is about the people actually working the floor: the roster is agents only. */
      const real = (window.SynRoster && window.SynRoster()) || [];
      const rated = real.filter(a => a.rating != null);
      const withRate = real.filter(a => a.responseRate != null);
      const kpis = document.getElementById('agKpis');
      if (kpis) kpis.innerHTML = [
        ['Agents', real.length],
        ['Active leads', real.reduce((s, a) => s + (a.active || 0), 0)],
        /* Career totals, not "this quarter": closed_deals is a lifetime count
           on the profile. Labelling it by a period we do not measure would be
           a claim the data cannot support. */
        ['Closed · career', real.reduce((s, a) => s + (a.closed || 0), 0) || '-'],
        ['Avg rating', rated.length
          ? (rated.reduce((s, a) => s + a.rating, 0) / rated.length).toFixed(1)
          : '-'],
      ].map(k => `<div class="ag-kpi"><div class="l">${k[0]}</div><div class="v">${k[1]}</div></div>`).join('');

      const blank = '<p class="muted" style="font-size:13px;margin:0">No agents yet.</p>';
      const none  = '<p class="muted" style="font-size:13px;margin:0">Not recorded for anyone on this team yet.</p>';
      const closed = document.getElementById('agClosed');
      if (closed) {
        const have = real.filter(a => a.closed != null);
        closed.innerHTML = !real.length ? blank
          : have.length ? hbarsHTML(have.map(a => [first(a.nm), a.closed])) : none;
      }
      /* Response rate is a real column on agent_profiles; average first reply in minutes is recorded nowhere. */
      const reply = document.getElementById('agReply');
      if (reply) {
        reply.innerHTML = !real.length ? blank
          : withRate.length ? hbarsHTML(withRate.map(a => [first(a.nm), a.responseRate]), '%') : none;
      }
      const lbl = document.getElementById('agReplyLbl');
      if (lbl) lbl.textContent = 'Response rate';
    }

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
    const CH_LABEL = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', youtube: 'YouTube', whatsapp: 'WhatsApp', x: 'X', telegram: 'Telegram' };

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

    // ── persistent Ask-Tayo panel (context-aware per pane) ──
    // The AI commentary/summaries live here, not on the main panes. What the
    // panel shows depends on which pane the agency owner is looking at.
    /* The panel itself is React (src/features/agency/AdvisorPanel.tsx); what each pane's body says stays here, beside the numbers
       it is built from. */

    const tpSummary = (k, lines, reco) =>
      `<div class="tp-sec"><div class="tp-k">${k}</div>${lines.map(l => `<div class="tp-line"><span class="d">→</span><span>${l}</span></div>`).join('')}${reco ? `<div class="tp-reco"><b>Tayo’s fix:</b> ${reco}</div>` : ''}</div>`;

    const PANEL = {
      /* No canned body. The snapshot above is real, and everything else worth
         saying here is now a live answer to a question the agency actually
         asked, in the composer below. */
      overview: { title: 'Business advisor', sub: 'Your numbers, and what to do next',
        html: () => '' },
      negotiator: { title: 'How Tayo negotiates', sub: 'The funnel, the rules, the 5 stages',
        html: () => `
          <div class="tp-sec"><div class="tp-k">The rule</div>
            <div class="rule" style="margin:0"><span class="ic">⚖️</span><div class="t"><b>Tayo advises within the range you authorise, it never makes a binding commitment.</b> It can discuss flexibility inside your pre-set floor, but only you close. Every agreement stays legally yours.</div></div>
          </div>
          <div class="tp-sec"><div class="tp-k">Where a lead comes from, and what happens to it</div>
            <ol class="fnl">
              <li><span class="fnl-k">They start anywhere</span>
                <span class="fnl-v">Instagram, WhatsApp, TikTok, Facebook, YouTube, the Synapse app, or walking past the building.</span></li>
              <li class="is-tayo"><span class="fnl-k">Tayo picks it up</span>
                <span class="fnl-v">Qualifies the budget, presents the fit, handles the objections, and negotiates only inside the range you set.</span></li>
              <li class="is-out"><span class="fnl-k">You get a warm one</span>
                <span class="fnl-v">The conversation arrives with it, what they want, what they can pay, what they already asked.</span></li>
            </ol>
          </div>
          <div class="tp-sec"><div class="tp-k">The five stages</div>
            <div class="stepper" style="margin:0"><span class="step5"><b>1</b> Qualify</span><span class="step5"><b>2</b> Present</span><span class="step5"><b>3</b> Handle objections</span><span class="step5"><b>4</b> Negotiate · your range</span><span class="step5"><b>5</b> Handoff</span></div>
          </div>` },
      marketing: { title: 'Creative insights', sub: 'What the AI learned from your ads',
        html: () => `<div class="tp-sec"><div class="tp-k">✦ What’s working</div><div id="insights"></div></div>`,
        /* loadInsights() replaces renderInsights() here: the panel now counts
           real attributed leads rather than rendering a fixed array, so it has
           to fetch before it can draw. The old click handler queued an
           "apply this across your creatives" action against advice that was
           invented; there is no action to offer on a count of your own leads. */
        after: () => { loadInsights(); } },
      crm: { title: 'Pipeline read', sub: 'Tayo’s take on your leads',
        html: () => tpSummary('Where your attention pays off', [
          'Tayo ranks your leads by intent, deal value and how close the SLA is.',
          'No leads yet, this fills in the moment a buyer reaches you.',
        ], 'Connect a channel or share a listing, and the first real lead lands here.')
        + `<div class="tp-sec"><div class="tp-k">Where your leads come from</div><div class="card brk" id="brk"></div></div>`,
        after: () => renderBrk() },
      /* brand, tours and verification had no entry, and
         PANEL[pane] || PANEL.overview meant each of them silently showed the
         OVERVIEW panel -- you opened the advisor on the Brand pane and read a
         summary of your listings instead. agents and subscription already
         have their own further down. */
      brand: { title: 'Your brand', sub: 'What signs off every post and page',
        html: () => tpSummary('What this pane decides', [
          'The name, logo, colour and voice Synapse writes and publishes as.',
          'Anything blank here shows up as a gap on your public page and in every generated post.',
        ], 'Ask below what is still missing from your setup.') },
      tours: { title: 'Viewings', sub: 'Who is coming, and when',
        html: () => tpSummary('What this pane decides', [
          'The availability you publish, the slots buyers book, and who has confirmed.',
          'A booking nobody has reconfirmed is not a body at the door yet.',
        ], 'Ask below which viewings still need chasing.') },
      verification: { title: 'Verification', sub: 'What is on file, and what is outstanding',
        html: () => tpSummary('What this pane decides', [
          'The documents Nigeria requires of an agency: CAC, SCUML, a state licence, a director\u2019s ID.',
          'Verified means specific checks passed on a date. It is never something an agency sets for itself.',
        ], 'Ask below what you still need to send.') },
      listings: { title: 'Inventory read', sub: 'Freshness & what to re-list',
        html: () => tpSummary('Keep your listings live', [
          'A listing expires after it was last confirmed: rentals in 21 days, short-lets in a week, sales in 3 months.',
          'Tayo flags what has expired and what is about to, per listing.',
        ], 'The notification bell carries the same warnings, and takes you straight to the listing.') },
      social: { title: 'Content coach', sub: 'What to post next',
        html: () => tpSummary('Move the needle', [
          'Tayo compares reach, DMs and leads per format and channel.',
          'Nothing has been published yet, so there is no performance to read.',
        ], 'Generate a campaign from one of your listings and publish it, the first numbers land here.')
        + `<div class="tp-sec"><div class="tp-k">Where it posts</div><div class="channels" id="socialChannels">
            <div class="card chan"><div class="ic" style="background:linear-gradient(135deg,#F58529,#DD2A7B)">IG</div><div><div class="nm">Instagram</div><div class="st">Not connected</div></div><div class="tog"></div></div>
            <div class="card chan"><div class="ic" style="background:#000">TT</div><div><div class="nm">TikTok</div><div class="st">Not connected</div></div><div class="tog"></div></div>
            <div class="card chan"><div class="ic" style="background:#FF0000">YT</div><div><div class="nm">YouTube</div><div class="st">Not connected</div></div><div class="tog"></div></div>
            <div class="card chan"><div class="ic" style="background:#1877F2">f</div><div><div class="nm">Facebook</div><div class="st">Not connected</div></div><div class="tog off"></div></div>
            <div class="card chan"><div class="ic" style="background:#25D366">WA</div><div><div class="nm">WhatsApp Status</div><div class="st">+234 803 ··· 42</div></div><div class="tog"></div></div>
           </div></div>`
        + `<div class="tp-sec"><div class="tp-k">This week</div><div class="s-bento" id="socialBento"></div></div>`,
        after: () => {
          document.querySelectorAll('#socialChannels .tog').forEach((t) => t.addEventListener('click', () => { t.classList.toggle('off'); if (typeof renderBento === 'function') renderBento(); }));
          if (typeof renderBento === 'function') renderBento();
          const bento = document.getElementById('socialBento');
          if (bento && typeof jumpToApproval === 'function') bento.addEventListener('click', jumpToApproval);
        } },
      agents: { title: 'Team read', sub: 'Coaching for your agents',
        html: () => tpSummary('Coach the floor', [
          'Tayo reads first-reply times, win rates and stalled leads per agent.',
          'Coaching notes appear once your team has real activity to read.',
        ], 'Invite your agents and route some leads, the read below is built from their actual numbers.')
        // The roster's summary lives here now, beside the cards rather than
        // stacked above them.
        + `<div class="tp-sec"><div class="tp-k">The floor</div><div class="ag-kpis" id="agKpis"></div></div>`
        + `<div class="tp-sec"><div class="tp-k">Closed deals · career</div><div class="hbars" id="agClosed"></div></div>`
        + `<div class="tp-sec"><div class="tp-k" id="agReplyLbl">Response rate</div><div class="hbars" id="agReply"></div></div>`,
        after: () => renderAgentSummary() },
      subscription: { title: 'Plan advisor', sub: 'Is your plan earning its keep?',
        /* "One extra closed sale a month more than covers Accelerate" was a
           claim about this agency's economics that nothing here can know --
           we hold no sale values and no fee. What a plan includes is a fact;
           what it would earn them is not. */
        html: () => tpSummary('What each plan includes', [
          'Free: list, generate campaigns, and rehearse them.',
          'Accelerate: publish for real to your connected channels.',
          'Leader: unlimited listings and syndication.',
        ], 'Ask below what your own numbers would look like on another plan, the answer uses your listings and leads, not an example.') },
    };
    const snapshotHTML = (pane) => STATS[pane]
      ? `<div class="tp-sec"><div class="tp-k">Snapshot</div><div class="tp-stats">${STATS[pane]}</div></div>` : '';
    window.SynAdvisorBody = function (pane) {
      const cfg = PANEL[pane] || PANEL.overview;
      return { title: cfg.title, sub: cfg.sub, html: snapshotHTML(pane) + cfg.html(), after: cfg.after || null };
    };
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
  