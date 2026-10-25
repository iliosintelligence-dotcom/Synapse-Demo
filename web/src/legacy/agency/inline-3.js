
    // Channel attribution (Phase B), every lead carries a source→tap→Tayo→lead chain.
    const CH = {
      instagram: { label: 'Instagram', color: '#DD2A7B', short: 'IG' },
      tiktok:    { label: 'TikTok',    color: '#161616', short: 'TT' },
      facebook:  { label: 'Facebook',  color: '#1877F2', short: 'f' },
      youtube:   { label: 'YouTube',   color: '#FF0000', short: 'YT' },
      whatsapp:  { label: 'WhatsApp',  color: '#25D366', short: 'WA' },
      x:         { label: 'X',         color: '#161616', short: 'X'  },
      telegram:  { label: 'Telegram',  color: '#229ED9', short: 'TG' },
      proximity: { label: 'Proximity', color: '#121212', short: '◎' },
      direct:    { label: 'Direct app',color: '#8a8f98', short: '·' },
      /* The database's attribution_channel enum has ten values and this map
         had seven, four of which did not overlap. Every lookup here is
         `CH[channel].color` with no guard, so the first genuinely attributed
         lead -- a Tayo recommendation, a referral -- would have thrown while
         rendering the table. These are the missing ones. */
      tayo:      { label: 'Tayo',      color: '#5B4B8A', short: 'T' },
      referral:  { label: 'Referral',  color: '#0F7B6C', short: 'R' },
      web:       { label: 'Website',   color: '#4A6FA5', short: 'W' },
      organic:   { label: 'Search',    color: '#6E6142', short: 'S' },
    };

    /* attribution_channel (database) → the keys above (UI). Kept explicit
       rather than clever: the two vocabularies are set by different concerns
       and will drift, and a missing entry should be obvious here rather than
       becoming `undefined` three call sites away. Anything unrecognised
       resolves to 'direct', which is what the fallback always meant. */
    const ATTR_CHANNEL = {
      instagram: 'instagram', tiktok: 'tiktok', facebook: 'facebook',
      whatsapp_campaign: 'whatsapp', proximity_alert: 'proximity',
      ai_recommendation: 'tayo', referral: 'referral',
      website: 'web', organic: 'organic', direct_search: 'direct',
      telegram: 'telegram',
    };
    const uiChannel = (c) => ATTR_CHANNEL[c] || 'direct';
    /* A channel's badge content. The platforms get their own logo; proximity
       and the direct app are ours and have no mark, so they keep the glyph
       they always had rather than rendering an empty badge. Size is passed by
       the caller because these badges run 16px to 22px and a logo scaled by
       the parent's font-size would not sit right in any of them. */
    const chMark = (c, px) => {
      const m = (window.SynIcons && SynIcons.brand) ? SynIcons.brand(c, { size: px }) : '';
      return m || esc2(CH[c].short);
    };

    // Demo leads removed: each referenced a property that does not exist.
    // Leads arrive from real buyer activity against real listings, and are
    // loaded from the `leads` table by loadLeads() below. `let`, not `const`:
    // the array is replaced wholesale when the fetch lands.
    let leads = [];
    const chnBadge = c => `<span class="chn" style="background:${CH[c].color}" title="Attributed to ${CH[c].label}">${chMark(c, 12)}</span>`;

    /* ══ CRM ══ The pane is React (src/features/agency/CrmPane.tsx). The rows are loaded and mapped here because the
       negotiator, the roster and the overview read the same array; the pane reads them through these. */
    const CRM = { loaded: false, error: null };
    window.SynLeads = function () { return leads; };
    window.SynCrmState = function () { return CRM; };
    window.SynCH = CH;
    window.SynChMark = chMark;
    window.SynNaira = function (n) { return nairaShort(n); };
    // ── attribution breakdown bar, moved into the Ask-Tayo side panel
    // (PANEL.crm below); only rendered while that panel is open, hence the
    // null check rather than assuming the element is on the page. ──
    function renderBrk(){
      const el = document.getElementById('brk'); if (!el) return;
      const counts = {};
      leads.forEach(l => { const c = l.attr.channel; counts[c] = (counts[c]||0)+1; });
      const order = Object.keys(CH).filter(c => counts[c]).sort((a,b)=>counts[b]-counts[a]);
      el.innerHTML = leads.length
        ? `<div class="hd"><span class="l">Where your leads come from</span><span class="l" style="letter-spacing:0">${leads.length} leads attributed</span></div>
         <div class="chips">${order.map(c => `<span class="c2">${chnBadge(c)} ${CH[c].label} <b>${counts[c]}</b></span>`).join('')}</div>
         <div class="barline">${order.map(c => `<span style="background:${CH[c].color};width:${counts[c]/leads.length*100}%" title="${CH[c].label}: ${counts[c]}"></span>`).join('')}</div>`
        : '<p class="muted" style="font-size:13px;margin:0">No leads yet, attribution fills in once one arrives.</p>';
    }
    function renderCrm(){ renderBrk(); window.dispatchEvent(new CustomEvent('syn:crm')); if (typeof refreshTojuPanel === 'function') refreshTojuPanel('crm'); }
    renderCrm();

    /* ============ real leads ============
       The CRM used to render a hard-coded array. It now reads the `leads`
       table - the same rows create-lead writes when a buyer taps "Contact
       agent" - and maps the database shape onto the shape this table renders.

       The mapping is deliberately conservative: where the database has no
       answer (no lead score, no recommended action), the UI says so rather
       than inventing a number that would read as a judgement we made. */
    const DB_STAGE = {
      new: 'New',
      contacted: 'Contacted', qualified: 'Contacted',
      viewing_scheduled: 'Viewing', viewing_completed: 'Viewing',
      negotiating: 'Negotiation', commitment: 'Negotiation',
      closed: 'Won',
    };
    // lead_source -> attribution channel. Anything not from a social surface is
    // the app itself; CH has no key for search/referral, and inventing one
    // would misattribute the lead.
    const DB_CHANNEL = {
      social_instagram: 'instagram', social_tiktok: 'tiktok', social_facebook: 'facebook',
    };
    /* What the drawer's chain is drawn from.

       `touches` is what the database actually recorded, oldest first. The
       channel shown on the table row is the LAST touch -- the one that
       produced the lead -- which is the standard the "where your leads come
       from" report needs to be counting.

       When there is no attribution row at all (a lead created before this
       was fixed, or one whose attribution genuinely failed) this falls back
       to the lead's own source and says so, rather than silently showing
       'Direct app' as though that were a finding. */
    function buildAttr(r) {
      const rows = Array.isArray(r.lead_attribution) ? r.lead_attribution.slice() : [];
      rows.sort((a, b) => new Date(a.occurred_at || 0) - new Date(b.occurred_at || 0));
      if (!rows.length) {
        return {
          channel: DB_CHANNEL[r.source] || 'direct',
          touches: [],
          unattributed: true,
        };
      }
      const last = rows[rows.length - 1];
      return {
        channel: uiChannel(last.channel),
        touches: rows.map((t) => ({
          channel: uiChannel(t.channel),
          at: t.occurred_at || null,
          first: !!t.is_first_touch,
          last: !!t.is_last_touch,
          campaign: t.campaign_id || null,
        })),
        unattributed: false,
      };
    }

    const DEFAULT_NBA = {
      New: 'Call within the hour', Contacted: 'Qualify the budget',
      Viewing: 'Confirm the viewing', Negotiation: 'Send the offer', Won: 'Close the paperwork',
    };
    function agoLabel(iso){
      if (!iso) return '-';
      const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
      if (mins < 60) return mins + 'm';
      if (mins < 1440) return Math.round(mins / 60) + 'h';
      return Math.round(mins / 1440) + 'd';
    }
    /* Everything below ten million used to collapse to a whole number of
       millions, which did not just lose precision -- it overstated. A 800,000
       listing displayed as one million, a figure it is not, and on the handoff
       card an ask of 1.45M and an agreed 1.32M both read the same, so a
       successful negotiation looked like no negotiation at all.

       Nigerian rentals live in exactly that range, so this is the common case
       rather than the edge. A decimal where it carries meaning, thousands
       below a million, and no rounding across the unit. */
    const nairaShort = n => {
      if (n == null) return '-';
      const v = Number(n);
      if (!isFinite(v)) return '-';
      if (v >= 1e9) return '\u20a6' + +(v / 1e9).toFixed(1) + 'B';
      if (v >= 1e6) return '\u20a6' + +(v / 1e6).toFixed(v % 1e6 ? 1 : 0) + 'M';
      if (v >= 1e3) return '\u20a6' + Math.round(v / 1e3) + 'k';
      return '\u20a6' + Math.round(v);
    };
    function mapLead(r){
      const prop = r.properties || {};
      const stage = DB_STAGE[r.current_stage] || 'New';
      const stamp = r.last_activity_at || r.created_at;
      const mins = stamp ? (Date.now() - new Date(stamp).getTime()) / 60000 : Infinity;
      // Temperature from real recency, not from a score we do not have.
      const temp = stage === 'Won' ? 'won'
        : mins < 2880 ? 'hot' : mins < 10080 ? 'warm' : mins < 43200 ? 'cold' : 'dormant';
      return {
        id: r.id,
        nm: r.consumer_name || 'Unnamed buyer',
        ph: r.consumer_phone || '',
        price: r.budget_max != null ? nairaShort(r.budget_max)
             : prop.price != null ? nairaShort(prop.price) : '-',
        pr: [prop.title, prop.city].filter(Boolean).join(' \u00b7 ') || 'Listing unavailable',
        stage,
        dbStage: r.current_stage,   // the real value; `stage` is the folded label
        t: agoLabel(stamp),
        score: r.lead_score == null ? null : Math.round(Number(r.lead_score)),
        temp,
        failed: r.delivery_status === 'delivery_failed',
        /* Why it failed, so the badge can say. Without this the CRM showed a
           red "Failed" on every lead with nothing to explain it. */
        failReason: r.delivery_error || null,
        agentId: r.assigned_agent_id || null,
        nba: { do: r.next_action_recommendation || DEFAULT_NBA[stage] },
        attr: buildAttr(r),
        /* What Tayo settled with the buyer before they made contact, when they
           ran the negotiator. Absent on leads that did not. */
        neg: (r.preferences && r.preferences.negotiation) || null,
        rawSource: r.source,
        // what the home is listed at, distinct from `price` above, which is the
        // buyer's budget whenever one is known
        listPrice: prop.price != null ? prop.price : null,
        // which listing the lead is about, for the per-listing funnel
        propertyId: r.property_id || null,
      };
    }
    /* The agency's own people, fetched once. Both the Assign menu and the lead
       drawer need them: without a name to show, assigning a lead would look
       like it did nothing at all. */
    let ROSTER = null;
    const ROSTER_BY_ID = {};
    function loadRoster(){
      if (ROSTER) return Promise.resolve(ROSTER);
      if (!window.SynListings || !SynListings.roster) return Promise.resolve([]);
      return SynListings.roster().then((people) => {
        ROSTER = people;
        people.forEach((m) => { ROSTER_BY_ID[m.id] = m.name; });
        return people;
      }).catch((err) => { console.error('roster failed', err); return []; });
    }

    function loadLeads(){
      if (!window.SynListings || !SynListings.leads) {
        CRM.loaded = true; CRM.error = 'the data layer did not load'; renderCrm(); bootDone('leads'); return;
      }
      SynListings.leads().then(rows => {
        leads = rows.map(mapLead);
        CRM.loaded = true; CRM.error = null;
        renderCrm();
        // the negotiator pane reads the same rows, no second fetch
        buildHandoffs(leads); renderHandoffs();
        /* Whichever of the two requests lands second completes the picture:
           the roster supplies the people, the leads supply their workload. */
        renderAgents();
        bootDone('leads');
      }).catch(err => {
        CRM.loaded = true;
        CRM.error = (err && err.message) || 'please refresh';
        leads = [];
        renderCrm();
        console.error('leads load failed', err);
        bootDone('leads');
      });
    }
    loadLeads();
    window.SynLoadRoster = loadRoster;
    loadRoster().then(() => { if (leads.length) renderCrm(); });

    /* The CRM pane recounts its outbox notice on arrival (goToPane calls this by name). */
    window.paintOutboxWaiting = function () { window.dispatchEvent(new CustomEvent('syn:outbox-waiting')); };

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

    // ── content pipeline (Phase A) ──
    const IMG = {
      lekki: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&q=60',
      osapa: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200&q=60',
      ikate: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&q=60',
      vi:    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=200&q=60',
    };
    const PSTAGES = [
      { id: 'uploaded', label: 'Listing uploaded', who: 'Auto-generation triggers' },
      { id: 'generating', label: 'Content generating', who: 'GPT-4o, no action needed' },
      { id: 'approval', label: 'Draft', who: 'You review before publishing' },
      { id: 'scheduled', label: 'Scheduled', who: 'Auto-publishes at best time' },
      { id: 'published', label: 'Published', who: 'Live \u2014 click-throughs counted' },
      /* WAS 'Underperforming', 'Tayo suggests a boost'.
         Nothing ever put a card in it. buildPosts() emitted four stages and
         this was not one of them, so the only way in was dragging a card --
         which wrote an in-memory metrics object nothing read and rendered a
         blank warning card, because its body printed p.rsn and nothing ever
         set p.rsn. A column promising a boost nobody offers, that fills only
         by accident.

         It is fed by two real conditions now: a post that failed with nothing
         else carrying it, and a post that went live and nobody clicked. Both
         have an action attached. */
      { id: 'attention', label: 'Needs attention', who: 'Failed, or live and unclicked' },
    ];
    /* The board is React (src/features/agency/PipelinePane.tsx); it reads the columns and the posts through these. */
    window.SynPStages = PSTAGES;
    /* ── THE PIPELINE, FROM THE DATABASE ───────────────────────────────
       `posts` was declared here as [] and never assigned by anything, so every
       column was permanently empty and the demo posts that used to fill it had
       been deleted. That is why generating captions appeared to work and then
       Approve and Publish did nothing: there was no post to act on, and the
       stage a card sat in lived only in this array until the tab closed.

       It is now built from three real sources, and every action writes back:
         uploaded  - listings with nothing generated and nothing queued
         approval  - generated_content rows still at status 'draft'
         scheduled - social_posts at 'scheduled'
         published - social_posts at 'published'
       'generating' stays a client-side moment while the composer runs; it has
       no database state because nothing is persisted until a caption exists. */
    let posts = [];
    window.SynPosts = function () { return posts; };
    window.SynPipe = function () { return PIPE; };
    const PIPE = { loaded: false, error: null, drafts: [], social: [], stats: {}, comments: {} };

    /* content_type is per-format; a platform can have more than one (a post and
       a reel are both Instagram). Scheduling only cares about the platform. */
    const PLAT_OF_CT = {
      instagram_post: 'instagram', instagram_reel: 'instagram',
      tiktok_script: 'tiktok', youtube_short: 'youtube',
      facebook_post: 'facebook', whatsapp_message: 'whatsapp',
      linkedin_post: 'linkedin', x_post: 'x', telegram_post: 'telegram',
    };

    /** "Today 5:00 PM" near at hand, a real date further out. */
    function fmtWhen(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const t = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
      const now = new Date(), tom = new Date(); tom.setDate(now.getDate() + 1);
      if (d.toDateString() === now.toDateString()) return 'Today ' + t;
      if (d.toDateString() === tom.toDateString()) return 'Tomorrow ' + t;
      return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + t;
    }
    const listingById = (id) => (LISTINGS_DATA || []).find(l => l.id === id) || null;
    const listingTitle = (l) => (l && (l.title || l.t)) || 'This listing';

    /* Same rule the composer's link rows use: /s/:token is rewritten to the
       edge function by vercel.json, so on any real deployment the short link
       lives on whatever host is already serving this page -- which keeps
       preview deployments working and never hands somebody a link to an origin
       they are not on. Only localhost has no such rewrite, so only localhost
       falls back to the canonical host. */
    function shortLinkUrl(tok) {
      const o = location.origin;
      return (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|$)/i.test(o)
        ? 'https://www.synapsecore.dev' : o) + '/s/' + tok;
    }

    function buildPosts() {
      const out = [];
      /* IN FLIGHT, NOT EVER TOUCHED -- and the difference is why this column
         was empty.

         The rule was "a listing waits here until it has ANY caption or post",
         so a listing disqualified itself the first time anything was written
         about it and never came back. One post in September and the listing is
         gone from the board for good. An agency whose listings have all been
         posted once sees an empty first column permanently, with nothing
         telling it that any of them are due again -- which is the opposite of
         what a pipeline is for.

         What actually belongs here is a listing with nothing IN FLIGHT: no
         caption awaiting review, nothing queued to go out. Published history
         does not disqualify it, because a home that went out three weeks ago
         is exactly a home that should go out again.

         'publishing' counts as in flight; 'published' and 'failed' do not. A
         failed post is not work in progress -- it is work that stopped, and it
         has its own column. */
      /* KEPT IN THE FIRST COLUMN EVEN WHILE A POST IS IN FLIGHT (Eden, 2026-10-11): "keep a
         copy of the same listing under Listing uploaded, in case the agent wants to quickly
         make another post". So a listing is never taken out of this column; the card only
         says how many posts of it are in progress. */
      const IN_FLIGHT = { draft: 1, scheduled: 1, publishing: 1 };
      const busy = {};
      PIPE.drafts.forEach(d => { if (d.property_id) busy[d.property_id] = (busy[d.property_id] || 0) + 1; });
      PIPE.social.forEach(r => {
        if (r.property_id && IN_FLIGHT[r.status] && !(r.leg === 'synapse' && r.twin_of)) busy[r.property_id] = (busy[r.property_id] || 0) + 1;
      });

      /* What this listing has already had, so the card can say "ready for its
         next post" rather than pretending nothing was ever written. Counting
         only what reached a platform -- a draft somebody discarded is not
         history. */
      const postedBefore = {};
      PIPE.social.forEach(r => {
        if (!r.property_id || r.status !== 'published') return;
        const at = r.published_at || r.scheduled_at;
        const cur = postedBefore[r.property_id];
        postedBefore[r.property_id] = {
          n: (cur ? cur.n : 0) + 1,
          last: (!cur || (at && at > cur.last)) ? at : cur.last,
        };
      });

      (LISTINGS_DATA || []).forEach(l => {
        if (!l.id) return;
        const hist = postedBefore[l.id] || null;
        out.push({ id: 'l:' + l.id, propertyId: l.id, stage: 'uploaded',
          listing: listingTitle(l), price: priceLabel(l), img: l.img,
          channels: [], caption: '', scheduledAt: null, when: '', reach: 0,
          postedCount: hist ? hist.n : 0, inflight: busy[l.id] || 0,
          lastPostedAt: hist ? hist.last : null });
      });
      PIPE.drafts.forEach(d => {
        const l = listingById(d.property_id);
        const plat = PLAT_OF_CT[d.content_type];
        const chans = plat ? [plat] : [];
        out.push({ id: 'c:' + d.id, contentId: d.id, propertyId: d.property_id,
          stage: 'approval', listing: listingTitle(l), price: l ? priceLabel(l) : '',
          img: l ? l.img : '', channels: chans, caption: d.generated_text || '',
          scheduledAt: null, when: '', reach: estReach(chans) });
      });
      /* A SYNAPSE TWIN IS NOT A CARD IN THE AGENCY'S PIPELINE.
         Every post now queues one twin per Synapse channel, and they carry the
         same agency_id -- so the moment amplification went live, scheduling one
         Instagram post filled this column with four cards, three of which the
         agency did not make and cannot edit. Two real posts came back behind
         twelve twins, pushed under the "see more" fold, which reads exactly
         like scheduling did nothing.

         They are folded into the post they came from instead: same information,
         one card, and the column counts what the agency actually did. */
      const twinsBySource = {};
      const twinClaimed = {};
      PIPE.social.forEach(r => {
        if (r.leg !== 'synapse' || !r.twin_of) return;
        (twinsBySource[r.twin_of] = twinsBySource[r.twin_of] || []).push(r);
        twinClaimed[r.id] = 1;
      });

      /* The one real number in here. Our own redirect counts these, so they
         exist with no platform connected, no Graph token and no app review --
         which is exactly what the Published card used to deny by saying
         "metrics arrive once a channel is connected". human_click_count is
         the honest one; click_count includes the preview crawlers that fetch
         every link the moment it is posted. */
      /* social_post_stats() is the authority where it has an answer: it counts
         distinct sessions for visits and joins leads through the token, which
         the embedded short_links row cannot do. The embed stays as the
         fallback for the moment between the posts landing and the stats
         landing, and for the case where the stats call failed. */
      const statOf = (id) => (PIPE.stats && PIPE.stats[id]) || null;

      /* ENGAGEMENT, WHICH IS NOT THE SAME AS CLICKS. Clicks are ours -- our
         redirect counts them, so they exist with nothing connected. These come
         from the platform via trypost and only exist after the sweep has asked.

         NULL is carried rather than flattened to zero, and the difference
         matters on the card: a post nobody commented on and a post we have not
         been able to ask about both render as "0 comments" otherwise, and those
         want opposite reactions from whoever is reading. */
      const engageOf = (r) => ({
        likes: (r && typeof r.likes === 'number') ? r.likes : null,
        comments: (r && typeof r.comments === 'number') ? r.comments : null,
        at: (r && r.metrics_at) || null,
      });

      /* Across the post and its twins. One listing went out on several
         accounts; the agency wants to know how the LISTING did. null + 3 is 3,
         not null -- a platform that cannot report must not erase one that can. */
      const engageAcross = (r, twins) => {
        const all = [engageOf(r)].concat((twins || []).map(engageOf));
        const add = (k) => all.reduce(
          (a, e) => (e[k] == null ? a : (a == null ? e[k] : a + e[k])), null);
        return {
          likes: add('likes'),
          comments: add('comments'),
          at: all.reduce((a, e) => (!a || (e.at && e.at > a)) ? (e.at || a) : a, null),
        };
      };

      const clicksOf = (r) => {
        const st = statOf(r && r.id);
        if (st) {
          return { human: st.clicks || 0, total: st.clicks_raw || 0,
                   last: st.last_click || null, token: st.token || '',
                   visits: st.visits || 0, leads: st.leads || 0 };
        }
        const ls = r && r.short_links;
        const rows = Array.isArray(ls) ? ls : (ls ? [ls] : []);
        return rows.reduce((a, x) => ({
          human: a.human + (x.human_click_count || 0),
          total: a.total + (x.click_count || 0),
          last: (!a.last || (x.last_clicked_at && x.last_clicked_at > a.last))
            ? (x.last_clicked_at || a.last) : a.last,
          token: a.token || x.token || '',
          visits: a.visits, leads: a.leads,
        }), { human: 0, total: 0, last: null, token: '', visits: 0, leads: 0 });
      };

      const LIVE = { published: 1 };
      /* SENT, NOT LIVE. A post that goes through TryPost is 'published' once
         TryPost accepts it, and TryPost then posts it from its own queue --
         which has taken hours on Instagram. Until the delivery check hears
         that it is actually up, payload.delivery is 'pending' and the card
         says so instead of claiming it is live. */
      const waiting = (x) => !!(x && LIVE[x.status] && x.payload && x.payload.delivery === 'pending');
      const DAY2 = 48 * 60 * 60 * 1000;

      /* WHAT STAGE A POST IS REALLY IN, which was one ternary:
           r.status === 'published' ? 'published' : 'scheduled'
         social_post_status has five values. That line put draft, scheduled,
         publishing AND failed into the Scheduled column, so a post that had
         already failed sat there wearing a clock icon, looking like it was
         about to go out, forever. Two of them are sitting there right now,
         both saying "No account is connected to this agency" in a
         failure_reason the card never read.

         And a post is not alone. Every agency post queues a Synapse twin per
         channel, and the twins publish independently -- so the agency's own
         Facebook post can fail for want of a connected account while the
         listing goes live on three Synapse channels and collects clicks. The
         family reached a platform; saying "scheduled" is false in both
         directions. */
      function stageFor(r, twins) {
        /* The agency's own post failed: that is what the card is about, even
           if Synapse's copy went out (Greptile) -- it stays where its reason
           and its retry are shown. */
        if (r.status === 'failed') return 'attention';
        const mineLive = !!LIVE[r.status];
        const anyTwinLive = twins.some(t => LIVE[t.status]);
        if (!mineLive && !anyTwinLive) {
          return r.status === 'failed' ? 'attention' : 'scheduled';
        }
        /* Handed over but not up anywhere yet: it stays in Published with a
           "not live yet" line, and is never judged on clicks -- nobody can tap
           a post that is not there. */
        if (!(mineLive && !waiting(r)) && !twins.some(t => LIVE[t.status] && !waiting(t))) {
          return 'published';
        }
        /* Live. The only thing that can pull it back out is nobody clicking:
           two days up, a link that anyone could have tapped, and not one human
           did. That is a real underperformance signal measured on our own
           data, rather than a column somebody drags cards into. */
        const c = clicksOf(r);
        const twinClicks = twins.reduce((a, t) => a + clicksOf(t).human, 0);
        const at = new Date(r.published_at
          || (twins.find(t => LIVE[t.status]) || {}).published_at || 0).getTime();
        const old = at && (Date.now() - at) > DAY2;
        /* NO LINK MEANS NO VERDICT. Posts made before queue_social_post started
           minting links carry no token, so their click count is zero and always
           will be -- flagging them would be calling a post a failure for a
           measurement we never took. Unmeasurable is not the same as unclicked,
           and the difference matters most on the oldest posts, which are
           exactly the ones without a link. */
        const measurable = !!c.token || twins.some(t => clicksOf(t).token);
        if (old && measurable && (c.human + twinClicks) === 0) return 'attention';
        return 'published';
      }

      PIPE.social.forEach(r => {
        /* A twin is folded into the post it came from rather than given a card
           of its own -- otherwise one Instagram post fills the column with
           four cards, three of which the agency did not make and cannot edit.
           But a twin whose source is missing was being skipped ENTIRELY: the
           first post that ever reached Instagram has twin_of null, so it was
           invisible in the pipeline while being the only thing that had ever
           gone out. An orphan gets to be its own card. */
        if (r.leg === 'synapse' && twinClaimed[r.id]) return;
        const isOrphanTwin = r.leg === 'synapse';

        const l = listingById(r.property_id);
        const chans = r.platform ? [r.platform] : [];
        const twins = twinsBySource[r.id] || [];
        const stage = stageFor(r, twins);
        const c = clicksOf(r);
        const twinLive = twins.filter(t => LIVE[t.status]);
        const twinClicks = twins.reduce((a, t) => a + clicksOf(t).human, 0);

        out.push({ id: 'p:' + r.id, postId: r.id, contentId: r.content_id,
          propertyId: r.property_id, stage,
          listing: listingTitle(l), price: l ? priceLabel(l) : '',
          img: l ? l.img : '', channels: chans, caption: r.caption || '',
          scheduledAt: r.scheduled_at,
          publishedAt: r.published_at || (twinLive[0] || {}).published_at || null,
          status: r.status,
          failure: r.failure_reason || '',
          /* Whether the agency's OWN account carried it, which is a different
             question from whether it went out at all. */
          mineLive: !!LIVE[r.status] && !waiting(r),
          waitMine: waiting(r),
          waitAmp: twinLive.filter(waiting).map(t => t.platform),
          sentWhen: fmtWhen((r.payload && r.payload.sent_at) || r.published_at
            || ((twinLive.find(waiting) || {}).payload || {}).sent_at || null),
          isSynapseOnly: isOrphanTwin || (!LIVE[r.status] && twinLive.length > 0),
          /* What Synapse is doing with it, carried on the card rather than
             beside it. Without this the amplification is invisible to the
             agency it is being given to. */
          amp: twins.map(t => t.platform),
          ampLive: twinLive.filter(t => !waiting(t)).map(t => t.platform),
          /* The family by id. Engagement is fetched per post and the twins are
             separate posts on trypost exactly as they are here, so the panel
             has to ask about all of them -- the platform numbers for "Synapse
             put this on Instagram" live on the twin, not on this row. */
          familyIds: [r.id].concat(twinLive.map(t => t.id)),
          engage: engageAcross(r, twins),
          /* ACROSS THE FAMILY, like the engagement above it. One listing goes
             out on the agency's account and on Synapse's; a comment on either
             is a comment about this listing, and the agent answering it does
             not care which row it hangs off. */
          comments: [r.id].concat(twinLive.map(t => t.id))
            .reduce((all, id) => all.concat((PIPE.comments || {})[id] || []), []),
          clicks: c.human + twinClicks,
          clicksRaw: c.total + twins.reduce((a, t) => a + clicksOf(t).total, 0),
          /* The family's totals. A twin is the same listing on a Synapse
             channel, so a visit it produced is a visit this post produced --
             counting only the agency's own leg would report the amplification
             as worthless precisely when it is doing the work. */
          visits: c.visits + twins.reduce((a, t) => a + clicksOf(t).visits, 0),
          leads: c.leads + twins.reduce((a, t) => a + clicksOf(t).leads, 0),
          lastClick: c.last,
          token: c.token,
          when: fmtWhen(r.published_at || (twinLive[0] || {}).published_at || r.scheduled_at),
          /* A TikTok sent with post_mode MEDIA_UPLOAD sits in the agent's
             TikTok inbox until they finish it there. */
          inbox: r.platform === 'tiktok' && !!LIVE[r.status]
            && !!(r.payload && r.payload.delivered === 'inbox'),
          reach: estReach(chans) });
      });
      /* PER-COLUMN ORDER, because the two columns want opposite things.
         Scheduled answers "what goes out next", so soonest first. Published
         answers "what just went out", so NEWEST first -- and it was inheriting
         the scheduled ordering (scheduled_at ascending, straight from the
         query), which buried the post you made a minute ago at the bottom of
         the column behind everything older, under a "see more".

         Ranked by stage first so this is a proper total order rather than a
         comparator that returns 0 for pairs from different columns -- that
         breaks transitivity and is only accidentally stable. */
      const STAGE_RANK = { uploaded: 0, generating: 1, approval: 2, scheduled: 3, published: 4, attention: 5 };
      const when = (p) => new Date(p.publishedAt || p.scheduledAt || 0).getTime();
      out.sort((a, b) => {
        const ra = STAGE_RANK[a.stage] === undefined ? 9 : STAGE_RANK[a.stage];
        const rb = STAGE_RANK[b.stage] === undefined ? 9 : STAGE_RANK[b.stage];
        if (ra !== rb) return ra - rb;
        return a.stage === 'published' ? when(b) - when(a) : when(a) - when(b);
      });
      posts = out;
    }

    function repaintSocial() {
      if (typeof renderPipeline === 'function') renderPipeline();
      if (typeof renderBento === 'function') renderBento();
      if (typeof renderCalendar === 'function') renderCalendar();
    }

    function loadPipeline() {
      if (!window.SynListings || !SynListings.listSocialPosts) {
        PIPE.loaded = true; PIPE.error = 'the data layer did not load';
        buildPosts(); repaintSocial(); return;
      }
      Promise.all([
        SynListings.listPendingContent ? SynListings.listPendingContent() : Promise.resolve([]),
        SynListings.listSocialPosts(),
        /* Resolves to {} rather than rejecting. The funnel is the nicest thing
           on these cards and the least important: a post that went out is
           still a post that went out, and losing the whole pipeline because a
           stats query failed would be the tail wagging the dog. */
        SynListings.socialPostStats
          ? SynListings.socialPostStats().catch((e) => { console.error('stats', e); return {}; })
          : Promise.resolve({}),
        /* Same fail-soft rule as the stats above, and for a stronger reason:
           this table is new, so a portal deployed ahead of its migration
           would otherwise lose the entire pipeline to a 404 on a feature
           nobody has used yet. */
        SynListings.listSocialComments
          ? SynListings.listSocialComments().catch((e) => { console.error('comments', e); return []; })
          : Promise.resolve([]),
      ]).then(([drafts, social, stats, comments]) => {
        PIPE.drafts = drafts || []; PIPE.social = social || [];
        PIPE.stats = stats || {};
        /* Grouped by the post they were written under, once, rather than
           filtering the whole list again for every card on the board. */
        PIPE.comments = (comments || []).reduce((m, c) => {
          (m[c.social_post_id] = m[c.social_post_id] || []).push(c);
          return m;
        }, {});
        PIPE.loaded = true; PIPE.error = null;
      }).catch((err) => {
        PIPE.loaded = true;
        PIPE.error = (err && err.message) || 'could not be loaded';
        console.error('pipeline load failed', err);
      }).then(() => { buildPosts(); repaintSocial(); });
    }

    /* THE QUEUE MOVES AFTER WE STOP LOOKING.
       loadPipeline() runs once when an action finishes, and at that moment the
       row is still 'scheduled'. drain_social_queue picks it up within the
       minute, publishes it, and nothing tells this tab -- so the card sits in
       Scheduled until somebody reloads, which is exactly the "I have to reload
       the page" complaint. The repaint was never broken; it only ever ran once,
       before the interesting thing happened.

       A few refreshes on a decaying schedule rather than a permanent poll. The
       window that matters is the minute or two after an action; a tab left open
       on this pane all afternoon should not keep asking, and a hidden tab
       should not ask at all. */
    let pipeWatchers = [];
    function watchPipeline() {
      pipeWatchers.forEach(clearTimeout);
      pipeWatchers = [4000, 12000, 30000, 70000].map((ms) => setTimeout(() => {
        if (document.hidden) return;
        const pane = document.getElementById('pane-social');
        if (pane && !pane.classList.contains('on')) return;
        loadPipeline();
      }, ms));
    }

    const fmt = n => n >= 1000 ? (n/1000).toFixed(n>=10000?0:1)+'k' : ''+n;
    const CHR = { instagram: 3200, tiktok: 8600, youtube: 4200, facebook: 1500, whatsapp: 900 };
    const estReach = ch => ch.reduce((s,c) => s + (CHR[c]||0), 0);

    const sReduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function countUp(el, to, dur) {
      dur = dur || 700;
      if (sReduce()) { el.textContent = fmt(to); return; }
      const start = performance.now();
      const tick = t => { const k = Math.min(1, (t - start) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(to * e)); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      setTimeout(() => { el.textContent = fmt(to); }, dur + 140); // guarantee the final value even if rAF is throttled
    }
    /* ── THE BOARD AND THE CALENDAR are React (src/features/agency/PipelinePane.tsx): the cards, the columns, select-several,
       drag between stages and hold-to-confirm. The names stay because repaintSocial and the composer call them. */
    function renderPipeline() { window.dispatchEvent(new CustomEvent('syn:pipeline')); }
    function renderCalendar() { window.dispatchEvent(new CustomEvent('syn:pipeline')); }
    // ── bento overview strip ──
    function renderBento(){
      const el = document.getElementById('socialBento'); if (!el) return;
      const reach = posts.filter(p => p.stage === 'published').reduce((s, p) => s + (p.reach || 0), 0);
      const approvals = posts.filter(p => p.stage === 'approval').length;
      const chOrder = ['instagram','tiktok','youtube','facebook','whatsapp'];
      const togs = [...document.querySelectorAll('.channels .tog')];
      const chState = chOrder.map((c, i) => ({ c, on: togs[i] ? !togs[i].classList.contains('off') : true }));
      const conn = chState.filter(s => s.on).length;
      const ti = (new Date().getDay() + 6) % 7, days = ['M','T','W','T','F','S','S'];
      const perDay = [0,0,0,0,0,0,0];
      const bDay = [];
      for (let i = 0; i < 7; i++) { const dt = new Date(); dt.setDate(dt.getDate() - ti + i); bDay.push(dt.toDateString()); }
      posts.forEach(p => {
        const iso = p.publishedAt || p.scheduledAt;
        if (!iso) return;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return;
        const di = bDay.indexOf(d.toDateString());
        if (di > -1) perDay[di]++;
      });
      el.innerHTML =
        `<button class="s-tile" aria-label="Reach this week ${fmt(reach)} across connected channels"><div class="k">Reach this week</div><div class="v" data-count="${reach}">0</div><div class="cap">across connected channels</div><div class="cbar"><i style="width:${Math.min(100, reach / 80000 * 100)}%"></i></div></button>
         <div class="s-tile"><div class="k">Connected channels</div><div class="v">${conn}<span style="font-size:18px;color:var(--ink-dim)">/${chOrder.length}</span></div><div class="chdots">${chState.map(s => `<span class="cd ${s.on ? '' : 'off'}" style="background:${CH[s.c].color}">${chMark(s.c, 10)}</span>`).join('')}</div></div>
         <div class="s-tile"><div class="k">This week</div><div class="s-mini">${days.map((d, i) => `<div class="d ${i === ti ? 'today' : ''}"><div class="lbl">${d}</div><div class="cell">${'<span class="pd"></span>'.repeat(Math.min(3, perDay[i]))}</div></div>`).join('')}</div></div>
         <button class="s-tile" data-sv-jump="approval" aria-label="${approvals} drafts to review"><div class="k">Drafts</div><div class="v">${approvals}</div>${approvals ? '<span class="rvw">Review now</span>' : '<div class="cap">all caught up ✦</div>'}</button>`;
      const rc = el.querySelector('[data-count]'); if (rc) countUp(rc, +rc.dataset.count);
    }
    /* ── MY PROFILE is React (src/features/agency/ProfileDrawer.tsx), in a drawer of its own beside this one. The name stays:
       the invite welcome and the Agents page call it. */
    function openMyProfile(opts) { window.dispatchEvent(new CustomEvent('syn:my-profile', { detail: opts || {} })); }
    window.openMyProfile = openMyProfile;

    /* ── THE SCHEDULER is React (src/features/agency/Scheduler.tsx). The name stays: the board, the calendar and the composer
       open it. mode is 'approve', 'reschedule' or 'duplicate'. */
    function openScheduler(p, mode) { window.dispatchEvent(new CustomEvent('syn:schedule', { detail: { p: p, mode: mode } })); }

    // ── THE PROPERTY PREVIEW is React (src/features/agency/PropPreview.tsx); the names stay for the board and the calendar.
    function openPropPreview(post) { if (post) window.dispatchEvent(new CustomEvent('syn:prop-preview', { detail: post })); }
    function closePropPreview() { window.dispatchEvent(new CustomEvent('syn:prop-preview-close')); }

    /* A caption awaiting approval is edited where it is reviewed. The edit is
       written to the draft itself, so what is approved is what was read. */
    function openBoardCaption(pid) {
      const p = posts.find((x) => x.id === pid);
      if (!p || !p.contentId) return;
      const ch = (p.channels && p.channels[0]) || 'instagram';
      const L = fullListing(p.propertyId);
      openCaptionEditor({
        ch: ch, text: p.caption || '', property: L, listing: L, title: p.listing,
        onSave: (text) => SynListings.updateContentText(p.contentId, text).then(() => {
          const row = PIPE.drafts.find((d) => d.id === p.contentId);
          if (row) row.generated_text = text;
          buildPosts(); renderPipeline();
          toast('Caption saved');
        }),
      });
    }
    /* TAKE CARDS OFF THE BOARD WITHOUT REBUILDING IT. Out of the arrays the board is built from (so a redraw cannot bring them
       back before the write lands), then one redraw that keeps the view. The confirming reload is debounced: clearing twenty
       drafts is twenty clicks, not twenty round trips and twenty redraws. */
    var pipeTimer = null;
    function pipeSoon() { clearTimeout(pipeTimer); pipeTimer = setTimeout(loadPipeline, 2500); }
    function pipeDrop(list) {
      const posts_ = new Set(list.map((x) => x.postId).filter(Boolean));
      const drafts_ = new Set(list.map((x) => x.contentId).filter(Boolean));
      const ids = new Set(list.map((x) => x.id));
      PIPE.social = (PIPE.social || []).filter((r) => !posts_.has(r.id));
      PIPE.drafts = (PIPE.drafts || []).filter((r) => !drafts_.has(r.id));
      posts = posts.filter((x) => !ids.has(x.id));
      repaintSocial();
    }

    // bento "needs approval" jumps to the approval column, bento now lives
    // in the Ask-Tayo panel (PANEL.social.after, below), so it only exists
    // in the DOM while that panel is open; this is wired there instead.
    function jumpToApproval(e) {
      const b = e.target.closest('[data-sv-jump]'); if (!b) return;
      document.querySelector('#socialView [data-sv="pipeline"]').click();
      document.getElementById('pipeline').scrollIntoView({ behavior: sReduce() ? 'auto' : 'smooth', block: 'nearest' });
    }
    renderBento();

    // ── listings, editable, with the freshness rule ──
    // Every listing must be re-listed before it expires or it stops showing to
    // buyers (matches Tayo's freshness filter). `days` = days since (re)listed.
    /* How long a listing stays up depends on the deal (Eden, 2026-10-24): rentals 21 days, short-lets a week, sales --
       houses, land, investments -- three months. The database decides it (listing_fresh_days, used by reconfirm_listing
       and on insert); this copy is only for the labels and for rows that have no expires_at yet. */
    const LISTING_LIFE = { rent: 21, shortlet: 7, sale: 90 };
    const LIFE_LABEL = { 7: 'a week', 21: '21 days', 90: '3 months' };
    function freshDays(l) { return LISTING_LIFE[l && l.listing_type] || 21; }
    function lifeLabel(l) { const d = freshDays(l); return LIFE_LABEL[d] || d + ' days'; }
    /* The database is the ONLY source of listings. There is no seed set and no
       fabricated inventory: an agency sees exactly the properties it has
       uploaded through this page, and nothing else. The key is bumped to v5 so
       any browser still holding the old demo listings in localStorage drops
       them rather than resurrecting properties that were deleted. */
    const L_KEY = 'synapse_agency_listings_v5';

    /* ── an unsaved new listing ─────────────────────────────────────────
       A listing is ten minutes of typing and photographs, and one reload,
       a dropped connection or a closed tab threw all of it away. The form
       now keeps what it has as it goes, and New listing picks it back up.

       In THIS browser, deliberately. A half-written listing is not a
       listing: the table behind the portal requires the fields that make one
       complete, and a row that fails them is not something to put on the
       server where buyers' searches run. One draft at a time -- the new
       listing in progress -- which is the one there is to lose. */
    const DRAFT_KEY = 'synapse_listing_draft_v1';
    /* ME is declared further down and filled in after sign-in; read before
       then it is either not yet declared or null, and both mean "unknown". */
    function draftOwner() { try { return ME || null; } catch (e) { return null; } }
    function readListingDraft() {
      let v = null;
      try { v = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (e) { return null; }
      if (!v || typeof v !== 'object' || !v.data || typeof v.data !== 'object') return null;
      /* A shared office computer: somebody else's half-written listing is
         not yours to open. A draft written before sign-in resolved carries no
         owner and is offered to whoever is here. */
      const me = draftOwner();
      if (v.owner && me && v.owner !== me) return null;
      return v;
    }
    function writeListingDraft(data, floor) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          owner: draftOwner(), at: Date.now(), data: data, floor: floor || null }));
        return true;
      } catch (e) { return false; }   // storage full or blocked: the form still works
    }
    function clearListingDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
    function draftAgo(at) {
      const mins = Math.max(0, Math.round((Date.now() - Number(at || 0)) / 60000));
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + ' min ago';
      if (mins < 1440) return Math.round(mins / 60) + ' h ago';
      return new Date(Number(at)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    /* Which form is current. The draft listeners belong to one render of the
       form, and the drawer is shared -- a lead or another listing may be in it
       by the time a timer fires. */
    let LISTING_FORM_SEQ = 0;
    let LISTING_DRAFT_FLUSH = null;

    /* ══ DRAFTS ON THE SERVER (Eden, 2026-10-11) ═══════════════════════════════════════
       "Save drafts or incomplete listings if the agent exits before it completes." The one
       draft above is the browser's own and stays as a fast, offline copy. This adds the real
       thing: any number of drafts, saved to the agency's private listing_drafts table, so a
       listing started on a phone is there on the laptop. A draft is not a property (buyers
       never see it); it becomes one only when the wizard is finished and the normal create
       runs, with all its checks. Saves are queued one at a time so a slow connection can
       never create two rows for one draft. ═══════════════════════════════════════════════ */
    const SD = { list: [], cur: null, loaded: false, timer: null, chain: Promise.resolve() };
    function sdClient() {
      if (!window.SynAuth || !window.SynListings || !SynListings.agencyId) return Promise.reject(new Error('offline'));
      return SynAuth.client().then((c) => SynListings.agencyId().then((aid) => ({ c: c, aid: aid })));
    }
    function sdLoad() {
      return sdClient().then((x) => x.c.from('listing_drafts').select('id,title,step,data,floor,updated_at').order('updated_at', { ascending: false }).limit(30))
        .then((r) => { if (r.error) throw r.error; SD.list = r.data || []; SD.loaded = true; if (typeof renderListings === 'function') renderListings(); })
        .catch(() => {});
    }
    function sdSaveNow(data, floor, step) {
      SD.chain = SD.chain.then(() => sdClient().then((x) => {
        if (!x.aid) return null;
        const row = { data: data, floor: floor || null, step: step || 1 };
        const cols = 'id,title,step,data,floor,updated_at';
        return SD.cur
          ? x.c.from('listing_drafts').update(row).eq('id', SD.cur).select(cols).single()
          : x.c.from('listing_drafts').insert(Object.assign({ agency_id: x.aid }, row)).select(cols).single();
      }).then((r) => {
        if (!r || r.error || !r.data) return;
        const first = !SD.list.some((d) => d.id === r.data.id);
        SD.cur = r.data.id;
        const i = SD.list.findIndex((d) => d.id === r.data.id);
        if (i >= 0) SD.list[i] = r.data; else SD.list.unshift(r.data);
        if (first && typeof renderListings === 'function') renderListings();
      }).catch(() => {}));
      return SD.chain;
    }
    function sdQueue(data, floor, step, immediate) {
      clearTimeout(SD.timer);
      if (immediate) return sdSaveNow(data, floor, step);
      SD.timer = setTimeout(() => sdSaveNow(data, floor, step), 2200);
    }
    function sdDelete(id) {
      if (!id) return Promise.resolve();
      SD.list = SD.list.filter((d) => d.id !== id);
      if (SD.cur === id) SD.cur = null;
      return sdClient().then((x) => x.c.from('listing_drafts').delete().eq('id', id)).catch(() => {}).then(() => { if (typeof renderListings === 'function') renderListings(); });
    }
    setTimeout(sdLoad, 2600);
    /* "+ Add a listing" in the landing page footer arrives as agency.html?add=1: open the wizard. */
    try {
      if (new URLSearchParams(location.search).get('add') === '1') {
        history.replaceState(null, '', location.pathname + location.hash);
        setTimeout(() => { if (typeof listingForm === 'function') listingForm({ st: 'pending' }, -1); }, 3200);
      }
    } catch (e) {}
    /* A reload or a closed tab gives no warning beyond these two, and the
       debounce may be holding the last few keystrokes. */
    window.addEventListener('pagehide', () => { if (LISTING_DRAFT_FLUSH) LISTING_DRAFT_FLUSH(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && LISTING_DRAFT_FLUSH) LISTING_DRAFT_FLUSH();
    });
    const L_DEFAULT = [];
    // enum option sets mirror the `properties` schema (supabase/migrations/0002_schema.sql)
    const PROP_TYPES = ['apartment','house','duplex','terrace','penthouse','bungalow','land','commercial','shared'];
    const DEAL_STRUCTURES = ['outright','rent','shortlet','lease','off_plan','joint_venture','development_financing','rent_to_own'];
    const DEAL_STRUCTURE_LABEL = { outright: 'Outright sale', rent: 'Rent (yearly)', shortlet: 'Short-let', lease: 'Long lease',
      off_plan: 'Off-plan (buy before it is built)', joint_venture: 'Joint venture (landowner + developer)',
      development_financing: 'Development financing (investors fund a build)', rent_to_own: 'Rent to own' };
    /* listing_type, which everything older reads, follows the deal. */
    const DEAL_TO_LISTING = { outright: 'sale', rent: 'rent', shortlet: 'shortlet', lease: 'rent', off_plan: 'sale',
      joint_venture: 'sale', development_financing: 'sale', rent_to_own: 'sale' };
    const LISTING_TYPES = ['sale','rent','shortlet'];
    const PRICE_PERIODS = ['total','per_year','per_month','per_night'];
    const TITLE_TYPES = ['c_of_o','governors_consent','registered_deed','excision','gazette','allocation'];
    const TYPE_LABEL = { apartment:'Apartment', house:'House', duplex:'Duplex', terrace:'Terrace', penthouse:'Penthouse', bungalow:'Bungalow', land:'Land', commercial:'Commercial', shared:'Room / self-contain' };
    window.SynTypeLabel = TYPE_LABEL;
    const DEAL_LABEL = { sale:'For sale', rent:'For rent', shortlet:'Short-let' };
    const PERIOD_LABEL = { total:'Total price', per_year:'Per year', per_month:'Per month', per_night:'Per night' };
    const PERIOD_SUFFIX = { total:'', per_year:'/yr', per_month:'/mo', per_night:'/night' };
    const TITLE_LABEL = { c_of_o:'Certificate of Occupancy (C of O)', governors_consent:'Governor’s Consent', registered_deed:'Registered Deed', excision:'Excision', gazette:'Gazette', allocation:'Allocation' };

    // migrate a legacy {t,pr,st,leads,days,img} item to the full property schema shape (idempotent)
    function migrateListing(l) {
      if (l && l.title) return l; // already migrated
      const t = l.t || '', tl = t.toLowerCase(), parts = t.split(',').map(s => s.trim());
      const bedM = t.match(/(\d+)\s*-?\s*bed/i);
      const ptype = tl.includes('duplex') ? 'duplex' : tl.includes('terrace') ? 'terrace' : tl.includes('penthouse') ? 'penthouse'
        : tl.includes('bungalow') ? 'bungalow' : (tl.includes('flat') || tl.includes('apartment')) ? 'apartment'
        : (tl.includes('detached') || tl.includes('house')) ? 'house'
        : /\bland\b/.test(tl) ? 'land' : (tl.includes('shop') || tl.includes('office')) ? 'commercial' : 'apartment';
      const hood = parts.length > 1 ? parts[parts.length - 1] : '';
      return Object.assign({
        title: t, description: t ? ('Verified ' + t + '.') : '',
        property_type: ptype, listing_type: 'sale',
        price: (l.pr || 0) * 1e6, price_period: 'total', move_in_cost: null, service_charge: null,
        address: hood || 'Lagos', city: 'Lagos', state: 'Lagos', country: 'Nigeria',
        neighbourhood: hood, latitude: null, longitude: null,
        bedrooms: bedM ? +bedM[1] : null, bathrooms: null, area_sqm: null, amenities: [],
        title_type: null, yield_pct: null,
        verification_status: l.st === 'verified' ? 'verified' : 'unverified',
        is_active: l.st !== 'inactive',
        // Demo-seed shim only (called at the LISTINGS_DATA map below, never
        // on a database row). Still not a place to invent a photograph.
        media: l.img ? [{ url: l.img, is_primary: true, display_order: 0 }] : [],
      }, l);
    }
    // keep the legacy/display keys the cards + Overview + Marketing read in sync with schema fields
    function deriveLegacy(l) {
      l.t = l.title;
      l.pr = Math.round((l.price || 0) / 1e6);
      // No stock fallback. A listing with no photo has no photo, and
      // photoHtml() renders that honestly. IMG.lekki here meant every
      // pictureless home in Overview, Listings and Marketing wore a
      // stranger's building.
      l.img = listingCover(l.media) || l.img || null;
      l.st = !l.is_active ? 'inactive' : (l.verification_status === 'verified' ? 'verified' : 'pending');
      return l;
    }
    // a blank listing template (all required fields empty for the create form)
    function blankListing() {
      return { title:'', description:'', property_type:'apartment', listing_type:'sale', price:'', price_period:'total',
        move_in_cost:'', service_charge:'', agency_fee:'', legal_fee:'',
        address:'', city:'', state:'Lagos', country:'Nigeria', neighbourhood:'',
        latitude:'', longitude:'', bedrooms:'', bathrooms:'', toilets:'', parking_spaces:'',
        area_sqm:'', year_built:'', furnished:'', property_condition:'', electricity_band:'',
        amenities:[], title_type:'', yield_pct:'',
        deal_structure:'outright', build_stage:'completed', units_available:1, payment_plan:'outright',
        verification_status:'unverified', is_active:true, media:[{ url:'', is_primary:true, display_order:0 }], leads:0, days:0 };
    }

    /* ── one way to draw a listing photo ───────────────────────────────────
       deriveLegacy() used to fall back to IMG.lekki, an Unsplash flat, so a
       listing with no photo of its own was displayed wearing a photograph of a
       different building -- indistinguishable, to an agency or a buyer, from a
       real picture of the property. That fallback is gone; this renders the
       absence instead.

       Two ways to have no photo, both handled: no URL at all (the wrapper is
       empty, :not(:has(img)) styles it), and a URL that does not load -- the
       onerror drops the broken <img> and tags the wrapper, which is the same
       trick matches-shared.js uses on the consumer side.

       `small` suppresses the "No photo yet" pill on thumbnails under ~64px,
       where it cannot be read; the hatch still reads as "nothing here". */
    /* Shared by photoHtml, the logo preview and the insight rows. It used to
       exist only inside brandPage() further down this file, so every caller
       above threw ReferenceError: esc2 is not defined.

       That threw exactly where it did the most damage. photoHtml only reaches
       this line when a listing HAS a photo, so an agency with no listings saw
       a page that worked, and an agency with listings saw renderOverview()
       die mid-map -- the pane kept whatever it had painted last, which was
       the "No listings yet" empty state, and everything queued after the
       render never ran. A portal that looked frozen, on the accounts that had
       something to show. */
    function esc2(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function photoHtml(url, opts) {
      opts = opts || {};
      const cls = 'lph' + (opts.small ? ' lph-sm' : '') + (opts.cls ? ' ' + opts.cls : '');
      const u = typeof url === 'string' ? url.trim() : '';
      if (!u) return `<div class="${cls}"></div>`;
      return `<div class="${cls}"><img src="${esc2(u)}" alt="" loading="lazy"`
        + ` onerror="this.closest('.lph').classList.add('no-photo');this.remove()"></div>`;
    }

    // map a listing item → a `properties` insert row + property_media[] (backend contract; see docs/LISTING_SCHEMA.md)
    function toPropertyRow(l) {
      return {
        row: {
          agency_id: null, // set server-side from the auth context (JWT)
          title: l.title, description: l.description, property_type: l.property_type, listing_type: l.listing_type,
          price: l.price, price_period: l.price_period, move_in_cost: l.move_in_cost, service_charge: l.service_charge,
          agency_fee: l.agency_fee, legal_fee: l.legal_fee,
          bedrooms: l.bedrooms, bathrooms: l.bathrooms, toilets: l.toilets,
          area_sqm: l.area_sqm, parking_spaces: l.parking_spaces, year_built: l.year_built,
          furnished: l.furnished, property_condition: l.property_condition,
          electricity_band: l.electricity_band,
          address: l.address, city: l.city, state: l.state, country: l.country, latitude: l.latitude, longitude: l.longitude,
          amenities: l.amenities || [], title_type: l.title_type, yield_pct: l.yield_pct,
          deal_structure: l.deal_structure, build_stage: l.build_stage, handover_date: l.handover_date,
          build_progress_pct: l.build_progress_pct, payment_plan: l.payment_plan, deposit_pct: l.deposit_pct,
          instalment_months: l.instalment_months, units_available: l.units_available, plot_count: l.plot_count,
          plot_size_sqm: l.plot_size_sqm, min_investment: l.min_investment, investment_term_months: l.investment_term_months,
          stated_return_pct: l.stated_return_pct,
          verification_status: l.verification_status, is_active: l.is_active, // verification is system-owned, not agency-writable
        },
        media: (l.media || []).map((m, i) => ({ url: m.url, is_primary: i === 0, display_order: i })),
      };
    }
    /* localStorage is a cache of what the database returned for THIS agency,
       never a source of truth and never a seed. The old `…_v2` fallback was
       removed deliberately: reading it back resurrected demo listings that had
       been deleted, so a property the agency never uploaded reappeared. Empty
       is the correct starting state, hydrateListings() fills it from the
       database, and an agency with no uploads sees none. */
    /* NOT SEEDED FROM localStorage ANY MORE (Eden, 2026-10-07). The saved copy was painted first and the database
       answer replaced it a moment later, so an agency saw listings from two weeks ago (some since deleted) flash and
       then "correct themselves". Nothing is shown from a copy now: the portal waits behind its opening screen (see
       bootDone) until the database has answered, then paints once, with what is true. */
    let LISTINGS_DATA = [];
    window.SynListingsData = function () { return LISTINGS_DATA; };
    /* The opening screen (#syn-load) used to lift on a timer, whether or not anything had loaded. Now it lifts when the
       two things the first screen is made of (the listings and the leads) have answered, or after 7 seconds so a slow
       connection is never held hostage. Whichever lands, the portal paints once. */
    function bootDone(part) {
      /* on window, and a function declaration, so loadLeads() further up can call it before this line has run */
      const BOOT = window.__BOOT || (window.__BOOT = { listings: false, leads: false, done: false });
      if (part && part !== 'timeout') BOOT[part] = true;
      if (BOOT.done || (!(BOOT.listings && BOOT.leads) && part !== 'timeout')) return;
      BOOT.done = true;
      const v = document.getElementById('syn-load');
      if (v) { v.classList.add('go'); setTimeout(() => { v.style.display = 'none'; }, 600); }
    }
    setTimeout(() => bootDone('timeout'), 7000);
    /* Every mutation announces itself. Other panes (syndication, marketing,
       proximity) derive their property options from LISTINGS_DATA rather than
       querying separately, so "the properties this agency has listed" has one
       definition portal-wide and the panes cannot drift apart. */
    const announceListings = () => document.dispatchEvent(new CustomEvent('syn:listings'));
    const saveListings = () => { localStorage.setItem(L_KEY, JSON.stringify(LISTINGS_DATA)); announceListings(); };
    const ST_LABEL = { verified: 'Verified', pending: 'Pending review', inactive: 'Inactive' };
    /* WAS nairaM(l.pr), AND l.pr IS THE PRICE ROUNDED TO MILLIONS.
       Every rental under a million therefore displayed as "₦0M" -- and rent is
       most of what a Nigerian agency lists. A ₦450,000 flat showed a price of
       zero, on the card, to the agency that had just typed 450000.

       nairaShort already handles the whole range and is used elsewhere on this
       page; the card simply never reached for it. l.pr is left alone because
       other code still reads it, but nothing should format money from it. */
    const nairaFull = v => '₦' + (Number(v) || 0).toLocaleString('en-NG');
    const priceLabel = l => nairaShort(l.price) + (PERIOD_SUFFIX[l.price_period] || '');

    // Per-pane snapshot stats now live in the Ask-Tayo panel, not on the pages.
    const STATS = {};

    function toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('on');
      clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2600);
    }
    function freshness(l) {
      /* Derive from expires_at when the row has one. This used to assume
         "listed_at + 14 days", while Tayo gates buyers on expires_at -- two
         independent clocks that happened to agree only because the seed set
         both. If they ever drift, the agency sees "10 days left" on a listing
         buyers can no longer be shown. */
      const left = l.expires_at
        ? Math.ceil((new Date(l.expires_at).getTime() - Date.now()) / 864e5)
        : freshDays(l) - l.days;
      /* `left` is returned as well as the flags because notiItems asked for
         it and it was never there -- see the note on the expiring reminder. */
      if (left <= 0) return { cls: 'dead', label: 'Expired · hidden from buyers', left: left, expired: true, warn: false };
      if (left <= 3) return { cls: 'warn', label: 'Expires in ' + left + (left === 1 ? ' day' : ' days'), left: left, expired: false, warn: true };
      return { cls: 'ok', label: left + ' days left', left: left, expired: false, warn: false };
    }
    /* A listing's cover is its first PHOTO, never a video's URL in an <img>
       (Eden, 2026-10-02); a video-only listing gets a still of its video. */
    function listingCover(media) {
      const isV = (m) => !!m && (m.media_type === 'video'
        || ((window.SynListings && SynListings.isVideoUrl) ? SynListings.isVideoUrl(m.url) : /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(m.url || ''))));
      const s = (Array.isArray(media) ? media : []).filter((m) => m && m.url);
      const photo = s.find((m) => !isV(m));
      if (photo) return photo.url;
      const u = s.length ? String(s[0].url) : '';
      return /res\.cloudinary\.com\/.+\/video\/upload\//.test(u)
        ? u.replace('/video/upload/', '/video/upload/so_0/').replace(/\.(mp4|mov|m4v|qt|webm|3gp)(\?.*)?$/i, '.jpg')
        : null;
    }

    const WZ_TOTAL = 6;
    /* The fast lane (Eden, 2026-10-11): an agency with nothing yet is offered one box, not a form. */
    document.addEventListener('click', (e) => {
      if (e.target.closest('#fastGo')) {
        const t = (document.getElementById('fastText').value || '').trim();
        if (t.length < 20) { toast('Paste the listing text first, or start from a blank form.'); return; }
        listingForm({ st: 'pending' }, -1, { id: null, data: { description: t }, floor: null, step: 1, updated_at: new Date().toISOString() });
        setTimeout(() => { const b = document.getElementById('lfFill'); if (b) b.click(); }, 450);
        return;
      }
      if (e.target.closest('#fastBlank')) { try { localStorage.setItem('syn_fast_off', '1'); } catch (x) {} paintFast(); listingForm({ st: 'pending' }, -1); return; }
    });
    function paintFast() {
      const c = document.getElementById('fastCard'), n = document.getElementById('nextCard'); if (!c) return;
      try {
      const empty = typeof LISTINGS_DATA !== 'undefined' && LISTINGS_DATA.length === 0 && SD.list.length === 0 && !readListingDraft();
      let gone = false; try { gone = localStorage.getItem('syn_fast_off') === '1'; } catch (e) {}
      c.hidden = !(empty && !gone && dbBacked);
      if (!c.hidden && n) n.hidden = true;
      } catch (e) { /* page still starting */ }
    }
    /* THE GRID IS React (src/features/agency/ListingsPane.tsx): the cards, the drafts, the menus, Re-list and Re-list all, the
       CAC gate and the toolbar. The name stays: every listing change calls it. */
    function renderListings() {
      paintFast();
      const exp = LISTINGS_DATA.filter(l => freshness(l).expired).length;
      STATS.listings = [
        [LISTINGS_DATA.length, 'Total'],
        [LISTINGS_DATA.filter(l => l.st === 'verified').length, 'Verified'],
        [LISTINGS_DATA.filter(l => l.st === 'pending').length, 'Pending'],
        [exp, 'Expired, re-list'],
      ].map(s => `<div class="card stat"><div class="v">${s[0]}</div><div class="l">${s[1]}</div></div>`).join('');
      if (typeof refreshTojuPanel === 'function') refreshTojuPanel('listings');
      window.dispatchEvent(new CustomEvent('syn:lgrid'));
    }

    /* ═══ THE LISTING FORM AND THE NEW-LISTING WIZARD are React (src/features/agency/ListingForm.tsx), in a drawer of their own.
       The name stays: the grid, the overview, the fast lane and ?add=1 call it. l: the listing (or { st: 'pending' } for a new
       one), idx: its index in LISTINGS_DATA (-1 for new), sd: a server draft to open. */
    function listingForm(l, idx, sd) { window.dispatchEvent(new CustomEvent('syn:listing-form', { detail: { l: l, idx: idx, sd: sd } })); }

    /* Find a listing by id rather than by index: the Overview and the Listings
       pane sort and filter independently, so a position in one is meaningless
       in the other. Falls back to scrolling the card into view if the form is
       not available for it. */
    function openListingById(id) {
      const i = LISTINGS_DATA.findIndex((x) => x.id === id);
      if (i < 0) return;
      const card = document.querySelector('#lgrid [data-edit="' + i + '"]');
      if (card) card.scrollIntoView({ block: 'center' });
      listingForm({ ...LISTINGS_DATA[i] }, i);
    }

    /* What the React grid reads. */
    window.SynFreshness = freshness;
    window.SynFreshDays = freshDays;
    window.SynLifeLabel = lifeLabel;
    window.SynListingCover = listingCover;
    window.SynSaveListings = () => saveListings();
    window.SynDbBacked = () => dbBacked;
    window.SynDrafts = { local: readListingDraft, sd: () => SD, clear: clearListingDraft, del: sdDelete, ago: draftAgo, total: WZ_TOTAL };
    /* What the listing form reads and writes. */
    window.SynLF = {
      SD: () => SD, listings: () => LISTINGS_DATA, dbBacked: () => dbBacked, blankListing: blankListing, deriveLegacy: deriveLegacy,
      saveListings: () => saveListings(), renderListings: () => renderListings(), announce: () => announceListings(),
      readDraft: readListingDraft, writeDraft: writeListingDraft, clearDraft: clearListingDraft, draftAgo: draftAgo,
      sdQueue: sdQueue, sdDelete: sdDelete, setFlush: (fn) => { LISTING_DRAFT_FLUSH = fn || null; },
      C: { PROP_TYPES, TYPE_LABEL, DEAL_STRUCTURES, DEAL_STRUCTURE_LABEL, DEAL_TO_LISTING, LISTING_TYPES, DEAL_LABEL, PRICE_PERIODS,
           PERIOD_LABEL, TITLE_TYPES, TITLE_LABEL },
    };
    renderListings();

    /* ── database hydration ───────────────────────────────────────────────
       Listings used to live in localStorage only, so nothing an agency
       created ever reached the database, Tayo and browse could not see it.
       When the visitor is signed in as a member of an agency, the database
       becomes the source of truth and replaces the local copy. When they are
       not, the local demo data stands so the dashboard still demonstrates.

       `dbBacked` gates every write below. It exists so the UI never claims a
       save persisted when it only touched this browser, the failure mode
       this whole change was made to remove. */
    let dbBacked = false;
    function fromDbRow(p) {
      const l = deriveLegacy(Object.assign({}, p));
      l.days = p.listed_at ? Math.max(0, Math.floor((Date.now() - new Date(p.listed_at).getTime()) / 864e5)) : 0;
      l.expires_at = p.expires_at || null;
      l.availability_confirmed_at = p.availability_confirmed_at || null;
      l.leads = l.leads || 0;
      return l;
    }
    function hydrateListings() {
      if (!window.SynListings) { bootDone('listings'); return; }
      SynListings.available().then((ok) => {
        if (!ok) { bootDone('listings'); return null; }
        return SynListings.list().then((rows) => {
          dbBacked = true;
          LISTINGS_DATA = rows.map(fromDbRow);
          renderListings();
          /* Overview reads the same LISTINGS_DATA but had already rendered
             before this fetch resolved, so it kept its "No listings yet"
             empty state while the Listings grid showed five. The agency's
             first screen said they had nothing. Anything reading this array
             has to be repainted here, not just the grid that triggered it. */
          if (typeof renderOverview === 'function') renderOverview();
          announceListings();
          bootDone('listings');
        });
      }).catch((e) => { console.warn('listings: could not load -', (e && e.message) || e); bootDone('listings'); });
    }
    /* Start as soon as the page is parsed, not at window load: load waits for every image and font, which is time the
       agency spends looking at the opening screen for nothing. */
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hydrateListings);
    else hydrateListings();

    /* ── MARKETING is React (src/features/agency/MarketingPane.tsx): the findings, the leaderboard, the campaigns and the New
       campaign drawer. It hands the campaigns back through window.SynCampaigns() and calls mkStats() when they change. */
    function mkStats() {
      /* THREE OF THESE FOUR TILES REPORTED THINGS NOTHING MEASURES.
         Ad spend, cost per lead and best-creative CTR were read from
         CAMPAIGNS[].spend and .ctr -- columns no code path ever writes. They
         rendered as "₦0k", "-" and "0.0%", which does not read as "not
         built"; it reads as "measured, and the answer is zero". An agency
         would reasonably conclude its campaigns were reaching nobody.

         What is left is counted from rows that exist. Ad spend and CTR come
         back the day something actually records them. */
      const live = (window.SynCampaigns ? window.SynCampaigns() : []).filter(c => c.live).length;
      const listings = (typeof LISTINGS_DATA !== 'undefined' && Array.isArray(LISTINGS_DATA))
        ? LISTINGS_DATA : [];
      const marketable = listings.filter(l => l.is_active !== false && l.status === 'live').length;
      STATS.marketing = [
        [live, 'Active campaigns'],
        [marketable, marketable === 1 ? 'Listing you can market' : 'Listings you can market'],
      ].map(s => `<div class="card stat"><div class="v">${s[0]}</div><div class="l">${s[1]}</div></div>`).join('');
      if (typeof refreshTojuPanel === 'function') refreshTojuPanel('marketing');
    }
    /* mkStats runs once at init, before the listings fetch has landed, so the
       listing tile read 0 on a page that had one. Recount whenever the
       Listings pane republishes -- the same event the campaign picker uses. */
    /* EVERYTHING THAT READS LISTINGS_DATA REPAINTS HERE.
       Saving a listing called renderListings() and nothing else, so the grid
       updated and Overview -- the pane the portal opens on -- kept whatever it
       had rendered at load. An agency added a property, looked at its own
       dashboard, saw no change, and reloaded to find out whether the save had
       worked. The hydrate path already repainted both; the save path had a
       shorter copy of that list, which is how the two drifted.

       Announcing once and letting each pane subscribe means the next pane that
       reads this array cannot be forgotten in a third place. */
    document.addEventListener('syn:listings', function () {
      if (typeof mkStats === 'function') mkStats();
      if (typeof renderOverview === 'function') renderOverview();
      if (typeof renderListings === 'function') renderListings();
      /* A new listing is a new card in "Listing uploaded", so the pipeline is
         part of what a listing change means. */
      if (typeof buildPosts === 'function') { buildPosts(); repaintSocial(); }
    });
    /* Nothing called this. The pipeline is read once on load and again after
       anything writes to it. */
    if (typeof loadPipeline === 'function') loadPipeline();
    /* ── channel insight, from attribution ──────────────────────────────────
       WAS three hardcoded claims dressed as measurements: "+41% creatives with
       the Verified badge earn 41% higher CTR", "3.1x video outperforms photo on
       TikTok", "+27% headlines with a monthly figure". No CTR exists anywhere
       in this product -- every social post so far is a dry run -- so those
       numbers were not stale or approximate, they were invented, and they sat
       on the panel an agency would use to decide where to spend.

       What IS real is attribution: lead_attribution records which channel a
       lead came from. This counts leads by last-touch channel and says nothing
       at all until there are some. */
    var INSIGHTS = [];

    function renderInsights() {
      var host = document.getElementById('insights');
      if (!host) return;
      if (!INSIGHTS.length) {
        host.innerHTML = '<div class="insight insight-empty"><span class="tx">'
          + 'Once leads arrive we will show which channel actually produced them. '
          + 'Nothing here is estimated, so it stays empty until there is something to count.'
          + '</span></div>';
        return;
      }
      host.innerHTML = INSIGHTS.map(function (i, k) {
        return '<div class="insight"><span class="pct">' + esc2(i.pct) + '</span>'
          + '<span class="tx">' + i.tx + '</span></div>';
      }).join('');
    }

    /* Counts real attributed leads per channel. RLS scopes lead_channel_mix()
       to the caller's own agency. */
    function loadInsights() {
      if (!window.SynAuth || !SynAuth.client) { renderInsights(); return; }
      SynAuth.client()
        .then(function (c) { return c.rpc('lead_channel_mix'); })
        .then(function (r) {
          var rows = (r && r.data) || [];
          var total = rows.reduce(function (n, x) { return n + Number(x.leads || 0); }, 0);
          INSIGHTS = !total ? [] : rows.slice(0, 3).map(function (x) {
            var n = Number(x.leads || 0);
            return {
              pct: Math.round((n / total) * 100) + '%',
              tx: '<b>' + esc2(String(x.channel).replace(/_/g, ' ')) + '</b> brought '
                  + n + ' of your ' + total + ' attributed lead' + (total === 1 ? '' : 's') + '.',
            };
          });
          renderInsights();
        })
        .catch(function () { INSIGHTS = []; renderInsights(); });
    }

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

    /* ── Campaign generator ────────────────────────────────────────────────
       Pulls real verified listings from the database, fans each into every
       angle × platform, and shows what passed validation before anything can
       be queued. Publishing runs in rehearsal mode, see syndication.js for
       why tokens never live in the client. */
    (function () {
      var sel = document.getElementById('cmpProp');
      var go  = document.getElementById('cmpGo');
      var out = document.getElementById('cmpOut');
      if (!sel || !go || !window.SynSyndicate) return;
      var S = window.SynSyndicate, rows = [], campaign = null, running = false;

      /* THE CHANNELS THIS CAMPAIGN IS FOR. Kept on this device. With nothing chosen yet it starts from the accounts the
         agency has actually connected, else Instagram and Facebook, so nobody pays for six captions to post on two. */
      var PICK_KEY = 'syn_cmp_chans_v1';
      var CMP_PLATS = Object.keys(S.PLATFORMS);
      var pickSel = null;
      try {
        var saved = JSON.parse(localStorage.getItem(PICK_KEY) || 'null');
        if (Array.isArray(saved)) {
          saved = saved.filter(function (x) { return CMP_PLATS.indexOf(x) > -1; });
          if (saved.length) pickSel = saved;
        }
      } catch (e) { pickSel = null; }
      function pickedPlats() {
        if (pickSel && pickSel.length) return pickSel.slice();
        var live = [];
        try {
          live = CMP_PLATS.filter(function (pl) { var a = connectedTo(pl); return a && !expired(a); });
        } catch (e) { live = []; }
        if (live.length) return live;
        return ['instagram', 'facebook'].filter(function (pl) { return CMP_PLATS.indexOf(pl) > -1; });
      }
      function paintPick() {
        var box = document.getElementById('cmpPick');
        if (!box) return;
        var on = pickedPlats();
        box.innerHTML = CMP_PLATS.map(function (pl) {
          var spec = S.PLATFORMS[pl];
          return '<button type="button" data-pick="' + pl + '" aria-pressed="' + (on.indexOf(pl) > -1) + '">' + esc(spec.label || pl) + '</button>';
        }).join('');
      }
      document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('#cmpPick [data-pick]');
        if (!b) return;
        var pl = b.getAttribute('data-pick'), on = pickedPlats();
        on = on.indexOf(pl) > -1 ? on.filter(function (x) { return x !== pl; }) : on.concat(pl);
        if (!on.length) { toastOrAlert('Pick at least one channel.'); return; }
        pickSel = on;
        try { localStorage.setItem(PICK_KEY, JSON.stringify(on)); } catch (err) { /* stays for this visit */ }
        paintPick();
      });
      setTimeout(paintPick, 0);

      /* SINGLE SOURCE: the Listings pane.
         This picker used to fetch /rest/v1/properties with the anon key, which
         RLS answers with the PUBLIC policy, every live listing on the platform,
         from every agency. An agency could therefore build and queue a campaign
         for a property it does not represent. It now reads the same
         LISTINGS_DATA the Listings pane owns, so "what I have listed" has one
         definition across the whole portal and cannot drift.

         Verification is still not a filter, an agency may market a listing it
         has just put up. syndication.js decides what may honestly be CLAIMED
         about an unverified home (it drops the verified-first angle and the
         #VerifiedListing tag), which is the right place for that judgement. */
      /* Local escaper. The page's other `esc` is declared INSIDE listingForm(),
         so it is not in scope here, the previous version of this block called
         it from inside a .then(), where the ReferenceError was swallowed by the
         .catch() and surfaced as a misleading "could not load listings". Define
         it here rather than reach for a helper that only looks global. */
      function esc(s) {
        return String(s == null ? '' : s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      /* ── connected channels ────────────────────────────────────────────
         Publishing has three separate failure modes and they are not
         interchangeable: no account connected, no adapter written, or the
         provider refused. The strip reports the first; social-publish reports
         the other two in its own words. Nothing here ever sees a token --
         social-connect puts it in Vault and this page only ever learns that a
         row exists. */
      /* Six dots, because a token is six base62 characters. Shown without the
         scheme so it reads as a note rather than as an address someone could
         try to type -- and defined once, here, so no render can be tempted to
         build one out of a real token. */
      var LINK_PREVIEW = 'synapsecore.dev/s/\u2022\u2022\u2022\u2022\u2022\u2022';

      var CONNECTABLE = { instagram: 'Instagram', facebook: 'Facebook', telegram: 'Telegram', tiktok: 'TikTok' };
      /* Telegram has no OAuth for posting. A bot is added as an administrator
         of a channel and may then post there, so this row is a field rather
         than a button -- there is nowhere to send anybody. */
      var TG_BOT = '@SynapseListingsBot';
      var SOON = {
        linkedin: ['LinkedIn', 'not built yet'],
        x: ['X (your X posts go out on Synapse\u2019s X for now)', 'not built yet'],
      };
      var accounts = [];
      /* True once the account list has actually been read. An empty list
         from a failed fetch is not "no channels", and must not trigger the
         getting-started ask. */
      var accountsKnown = false;
      /* Which platforms this PROJECT can connect at all -- our setup, not the
         agency's. Empty means "not asked yet or the ask failed", and every
         platform renders as it always did: a status endpoint having a bad
         minute must not strip working buttons out of the portal. */
      var ready = null;

      function platformReady(pl) {
        if (!ready) return true;                  // unknown: behave as before
        return !ready[pl] || ready[pl].ready !== false;
      }

      function loadConnectStatus() {
        return fetch(SB_URL + '/functions/v1/social-connect?action=status', {
          headers: { apikey: SB_KEY },
        })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) {
            ready = (j && j.platforms) || null;
            /* The handle of the bot actually holding our token, so the
               instruction names the account Telegram will check for. */
            var b = ready && ready.telegram && ready.telegram.bot;
            if (typeof b === 'string' && /^@[A-Za-z0-9_]{5,32}$/.test(b)) TG_BOT = b;
          })
          .catch(function () { ready = null; });
      }

      function token() {
        if (!window.SynAuth) return Promise.resolve(null);
        return SynAuth.client().then(function (c) { return c.auth.getSession(); })
          .then(function (r) {
            return (r && r.data && r.data.session && r.data.session.access_token) || null;
          })
          .catch(function () { return null; });
      }

      function loadChannels() {
        var box = document.getElementById('cmpChannels');
        if (!box) return Promise.resolve();
        /* The status first, so the strip is drawn once and correctly. Drawing
           it twice -- buttons, then buttons removed a moment later -- is worse
           than drawing it late. */
        return loadConnectStatus()
          .then(function () { return loadReplySettings(); })
          .then(function () { return token(); }).then(function (t) {
          if (!t) { accounts = []; accountsKnown = false; window.SOCIAL_ACCOUNTS = []; publishConnected(); renderChannels(); return; }
          return fetch(SB_URL + '/rest/v1/social_accounts'
              + '?select=id,platform,platform_username,is_active,token_expires_at,connected_at'
              + ',page_cta_type,page_cta_url'
              + '&is_active=eq.true&deleted_at=is.null', {
              headers: { apikey: SB_KEY, Authorization: 'Bearer ' + t },
            })
            .then(function (r) { accountsKnown = r.ok; return r.ok ? r.json() : []; })
            .then(function (rowsIn) {
              accounts = rowsIn || [];
              /* Published for the scheduler, which is outside this IIFE and
                 must not fetch the same rows again -- two copies of the same
                 list drift, and the one that drifts is always the one deciding
                 where a post goes. */
              window.SOCIAL_ACCOUNTS = accounts;
              publishConnected(); renderChannels();
            })
            .catch(function () { accounts = []; accountsKnown = false; window.SOCIAL_ACCOUNTS = []; publishConnected(); renderChannels(); });
        });
      }

      /* WHICH PLATFORMS THIS AGENCY CAN ACTUALLY POST AS.
         `accounts` is private to this IIFE and the scheduler sheet lives in
         another scope entirely, so the sheet had no way to know -- which is
         why it cheerfully queued posts that were guaranteed to fail. Published
         as a plain array of platform names rather than the rows: the sheet
         needs the answer, not the credentials. */
      /* USABLE, not merely present -- the same test liveCount() applies, and
         they have to agree. An expired token is a row, not a channel: the
         strip already greys it out and asks for a reconnect, but this used to
         publish it as connected anyway. So the one agency most likely to be
         caught out -- one that DID connect, months ago, and whose token has
         since lapsed -- was the one Post now had nothing to say to. It would
         report no problem, queue the post, and let the publisher discover the
         dead token afterwards, which is the exact silence this array exists to
         break. */
      function publishConnected() {
        window.SYN_CONNECTED = accounts
          .filter(function (a) { return a && a.platform && !expired(a); })
          .map(function (a) { return a.platform; });
        /* Published separately because the two states need different words
           and a different fix. "Never connected" is solved by OAuth; "the
           token lapsed" is solved by reconnecting an account that is already
           listed on the strip, and telling that agency to "connect your
           Instagram" sends them looking for something they can already see. */
        window.SYN_EXPIRED = accounts
          .filter(function (a) { return a && a.platform && expired(a); })
          .map(function (a) { return a.platform; });
      }

      /* Kept: liveCount() and the publish-readiness checks ask "is there one
         at all", which is still a fair question with several. */
      function connectedTo(platform) {
        for (var i = 0; i < accounts.length; i++) {
          if (accounts[i].platform === platform) return accounts[i];
        }
        return null;
      }

      /* All of them, oldest first -- the same order social-publish uses to
         choose the default when a post names no account, so the first one
         listed here IS the one an unnamed post goes to. A different order in
         the UI than in the publisher would make this screen quietly wrong
         about where things go. */
      function accountsOn(platform) {
        return accounts.filter(function (a) { return a.platform === platform; })
          .sort(function (x, y) {
            return String(x.connected_at || '').localeCompare(String(y.connected_at || ''));
          });
      }

      function expired(a) {
        return !!(a && a.token_expires_at && new Date(a.token_expires_at) < new Date());
      }

      /** Usable connections only. An expired token is a row, not a channel. */
      function liveCount() {
        return Object.keys(CONNECTABLE).filter(function (pl) {
          var a = connectedTo(pl);
          return a && !expired(a);
        }).length;
      }

      /* Publishing is every agent's job; connecting the account is not. The
         role is stamped on <body> by applyRole() after its round trip, so this
         reads the same source the nav does rather than asking again. Unknown
         role -> treated as an agent, which is the least privileged thing we
         know about. */
      /* ANY MEMBER, changed 2026-09-25. It was owner/admin because a Meta
         token speaks for the whole agency -- true while there was one account
         per platform. An agency can now hold several and a post names which
         one it goes to, so an agent connecting the account they already run is
         not a claim to speak for anybody. social-connect enforces the same
         three roles server-side; this only decides whether the button is
         drawn. */
      function canConnect() {
        var r = document.body.dataset.role;
        return r === 'agent' || r === 'agency_owner' || r === 'agency_admin';
      }

      /* The logos live in SynIcons.BRAND, not the data-icon set -- hydrate()
         only walks [data-icon] and would leave these empty. brand() returns
         the markup, so it goes straight into the string. */
      function mark(pl) {
        return (window.SynIcons && SynIcons.brand) ? SynIcons.brand(pl, { size: 16 }) : '';
      }

      /* ── the strip: what is connected, and a way to add ───────────────────
         It used to draw every platform as a row -- connected or not, ready or
         not -- so the three channels an agency actually has were lost among
         six it does not. Now it shows what IS connected, and "Add channel"
         opens the choice only when somebody wants to make it.

         The add panel is drawn into its own box (#chAdd) and redrawn on its
         own. renderChannels also draws the comment-reply settings below it,
         and redrawing those every time Telegram is polled would wipe
         whatever an owner was typing there. */
      var ADD = { open: false, pick: '' };
      /* linked: undefined = not asked yet, null = not linked, object = linked.
         code/exp/st: the "/connect CODE" this person was given, when it runs
         out, and what the server last said about it (waiting, working,
         connected, error, expired). */
      /* The Pages Facebook shared, waiting for this agency to say which are
         its own (social-connect action=facebook-pick). id is the stash. */
      var FBP = { id: '', data: null, chosen: {}, busy: false, note: '' };
      var TGS = { linked: undefined, note: '', busy: '', poll: null, until: 0, sig: '',
                  code: '', exp: 0, st: '', channel: '', deleted: true, linkWait: false };

      function renderChannels() {
        var box = document.getElementById('cmpChannels');
        if (!box) return;
        var html = '<div class="cmp-ch-hd">Channels</div><div class="cmp-ch-row">';
        var any = false;

        /* EVERY ACCOUNT, not the first one found -- a second Instagram account
           invisible here is indistinguishable from absent. */
        Object.keys(CONNECTABLE).forEach(function (pl) {
          accountsOn(pl).forEach(function (a) {
            any = true;
            /* A token with an expiry in the past is worse than no token: the
               publish attempt fails at the provider, which reads as our bug. */
            var stale = expired(a);
            html += '<div class="cmp-ch' + (stale ? '' : ' on') + '">'
              + '<span class="cmp-ch-nm"><span class="cmp-ch-ic">' + mark(pl) + '</span>'
              + esc(CONNECTABLE[pl]) + '</span>'
              + '<span class="cmp-ch-at">'
                + esc(stale ? 'session expired'
                    /* Telegram stores its own label: the @name, or the title
                       of a channel that has none. */
                    : pl === 'telegram' ? (a.platform_username || 'channel')
                    : '@' + (a.platform_username || 'connected'))
              + '</span>'
              + '<button class="cmp-ch-btn" data-disconnect="' + esc(a.id) + '">'
              + (stale ? 'Reconnect' : 'Disconnect') + '</button>'
              + '</div>';
          });
        });
        if (!any) {
          html += '<div class="ch-empty" title="Until a channel is connected, anything scheduled here is a rehearsal.">No channels connected</div>';
        }
        html += '</div>';
        if (canConnect()) html += '<div class="ch-add" id="chAdd"></div>';
        else if (!any) html += '<div class="ch-empty">Sign in as a member of this agency to add a channel.</div>';

        html += replyHtml();
        box.innerHTML = html;
        wireReply();
        renderAdd();
        if (typeof paintPick === 'function') paintPick();
        publishTasks();
      }

      function renderAdd() {
        var el = document.getElementById('chAdd');
        if (!el) return;
        if (!ADD.open) {
          el.innerHTML = '<button type="button" class="ch-add-btn" data-ch-add aria-expanded="false">'
            + '<span aria-hidden="true">+</span> Add channel</button>';
          return;
        }
        var h = '<div class="ch-add-panel" role="group" aria-label="Add a channel">'
          + '<div class="ch-add-top"><span>Add a channel</span>'
          + '<button type="button" class="ch-add-x" data-ch-close aria-label="Close">×</button></div>'
          + '<div class="ch-pick-row">';
        Object.keys(CONNECTABLE).forEach(function (pl) {
          /* OURS TO FIX, SO NOT THEIR BUTTON: a platform Synapse has not
             finished setting up is shown, and said to be unavailable, rather
             than offered and then refused. */
          /* Instagram's own login is not set up, but an Instagram linked to
             a Facebook Page comes through the Facebook connection -- so the
             tile works whenever Facebook does, and says how. */
          var ok = platformReady(pl) || (pl === 'instagram' && platformReady('facebook'));
          h += '<button type="button" class="ch-pick' + (ADD.pick === pl ? ' on' : '') + '"'
            + ' data-ch-pick="' + pl + '" aria-pressed="' + (ADD.pick === pl) + '"' + (ok ? '' : ' disabled') + '>'
            + '<span class="cmp-ch-ic">' + mark(pl) + '</span>' + esc(CONNECTABLE[pl])
            + (ok ? '' : ' <em>not available yet</em>') + '</button>';
        });
        h += '</div><div class="ch-soon">Coming later: '
          + Object.keys(SOON).map(function (k) { return esc(SOON[k][0]); }).join(' · ') + '</div>';
        if (ADD.pick === 'facebook' || ADD.pick === 'instagram') h += metaStepHtml(ADD.pick);
        else if (ADD.pick === 'tiktok') h += tiktokStepHtml();
        else if (ADD.pick === 'telegram') h += tgStepHtml();
        h += '</div>';
        /* Focus survives a redraw: the Telegram panel is repainted as the
           code's status changes, and a keyboard user should not be thrown
           back to the top of the page. */
        var had = document.activeElement && el.contains(document.activeElement) ? document.activeElement : null;
        var hadKey = had ? ['data-ch-pick', 'data-tg-copy', 'data-tg-new', 'data-tg-link', 'data-ch-close', 'data-tg-again', 'data-fbp', 'data-fbp-go']
          .filter(function (a) { return had.hasAttribute(a); }).map(function (a) {
            return '[' + a + (had.getAttribute(a) ? '="' + had.getAttribute(a) + '"' : '') + ']';
          })[0] : '';
        el.innerHTML = h;
        if (hadKey) { var back = el.querySelector(hadKey); if (back) back.focus(); }
      }

      /* ── WHICH PAGES ARE THIS AGENCY'S (2026-09-28) ─────────────────────
         Facebook's answer is not a decision about this agency. It shares
         whatever Pages the account allowed Synapse before, and on a second
         connect it skips its own list -- so connecting as Greenlight quietly
         attached Iteriba's Page again. Now nothing is connected until the
         person ticks it here. A Page whose name shares a word with the
         agency's is ticked for them; nothing else is. */
      function fbPickHtml() {
        var h = '<div class="ch-step">';
        if (!FBP.data) {
          if (FBP.note) {
            return h + '<div class="cmp-setup-why" role="status">' + esc(FBP.note) + '</div>'
              + '<div><button type="button" class="cmp-ch-btn primary" data-connect="facebook">Connect Facebook again</button></div></div>';
          }
          return h + '<div class="ch-tg-wait">Loading the Pages Facebook shared…</div></div>';
        }
        var d = FBP.data, pages = d.pages || [];
        var who = d.agency ? esc(d.agency) + '’s' : 'this agency’s';
        h += '<div class="cmp-ch-note"><b>Which of these are ' + who + '?</b> Facebook shared '
          + pages.length + ' Page' + (pages.length === 1 ? '' : 's') + '. Tick only ' + who
          + '; anything left unticked is not connected.</div><div class="ch-tg-list">';
        pages.forEach(function (pg) {
          var elsewhere = pg.connected && pg.connected !== 'here';
          h += '<label class="ch-tg-item fbp-item' + (elsewhere ? ' dim' : '') + '">'
            + '<input type="checkbox" data-fbp="' + esc(pg.id) + '"'
            + (FBP.chosen[pg.id] ? ' checked' : '') + (elsewhere || FBP.busy ? ' disabled' : '') + '>'
            + '<span class="cmp-ch-ic">' + mark('facebook') + '</span>'
            + '<span class="ch-tg-nm">' + esc(pg.name || pg.id)
            /* Said when absent too: a Page connecting without its Instagram
               was silent, and read as "Instagram is not posting". */
            + (pg.instagram ? ' <i>+ Instagram ' + esc(pg.instagram) + '</i>'
                : ' <i>· no Instagram came with it</i>') + '</span>'
            + (pg.connected ? '<span class="cmp-ch-at">' + (pg.connected === 'here' ? 'already here'
                : 'on ' + esc(pg.connected)) + '</span>' : '')
            + '</label>';
        });
        var n = Object.keys(FBP.chosen).filter(function (k) { return FBP.chosen[k]; }).length;
        h += '</div><div class="ch-tg-acts">'
          + '<button type="button" class="cmp-ch-btn primary" data-fbp-go' + (n && !FBP.busy ? '>' : ' disabled>')
          + (FBP.busy ? 'Connecting…' : n ? 'Connect ' + n + ' Page' + (n === 1 ? '' : 's') : 'Tick a Page')
          + '</button><button type="button" class="cmp-ch-btn" data-ch-close>Cancel</button></div>'
          + '<details class="fbp-help"><summary>The Page you want is not here?</summary>'
          + '<div class="cmp-ch-note">Facebook only shares the Pages you allowed Synapse before, and on a '
          + 'second connect it skips asking. To choose afresh: on Facebook, Settings &amp; privacy → Settings → '
          + '<b>Business integrations</b> → remove Synapse. Then Add channel → Facebook here, and tick every Page '
          + 'you run. You still choose which are this agency’s on this screen.</div></details>'
          + '<div class="cmp-setup-why" role="status" aria-live="polite">' + esc(FBP.note || '') + '</div>';
        return h + '</div>';
      }

      function fbpLoad() {
        FBP.data = null; FBP.note = ''; FBP.chosen = {};
        renderAdd();
        tgApi('facebook-pick&pick=' + encodeURIComponent(FBP.id)).then(function (j) {
          FBP.data = j;
          /* Tick a Page that shares a word with the agency's name -- the
             distinctive word, not "real" or "estate". */
          var COMMON = ['real', 'estate', 'estates', 'property', 'properties', 'homes', 'realty',
            'limited', 'agency', 'group', 'the', 'and'];
          var words = String(j.agency || '').toLowerCase().split(/[^a-z0-9]+/)
            .filter(function (w) { return w.length >= 3 && COMMON.indexOf(w) === -1; });
          (j.pages || []).forEach(function (pg) {
            if (pg.connected && pg.connected !== 'here') return;
            var nm = String(pg.name || '').toLowerCase();
            if (words.some(function (w) { return nm.indexOf(w) > -1; })) FBP.chosen[pg.id] = true;
          });
        }).catch(function (e) {
          FBP.data = null;
          FBP.note = e.message || 'Could not load the Pages Facebook shared.';
        }).then(renderAdd);
      }

      function fbpConnect() {
        var ids = Object.keys(FBP.chosen).filter(function (k) { return FBP.chosen[k]; });
        if (!ids.length || FBP.busy) return;
        FBP.busy = true; FBP.note = '';
        renderAdd();
        tgApi('facebook-pick', { method: 'POST', body: JSON.stringify({ pick: FBP.id, page_ids: ids }) })
          .then(function (j) {
            /* Names the agency, so a Page attached to the wrong one is
               obvious the moment it happens. */
            var gotIg = (j.connected || []).some(function (c) { return /^Instagram /.test(c); });
            toastOrAlert('Connected ' + (j.connected || []).join(', ') + ' to ' + (j.agency || 'this agency')
              + ((j.problems || []).length ? '. Not saved: ' + j.problems.join('; ') : '.')
              + (gotIg ? '' : ' No Instagram came with it: Add channel → Instagram says how to link one.'));
            FBP = { id: '', data: null, chosen: {}, busy: false, note: '' };
            ADD.open = false; ADD.pick = '';
            return loadChannels();
          })
          .catch(function (e) {
            FBP.busy = false;
            FBP.note = e.message || 'Could not connect those Pages.';
            renderAdd();
          });
      }

      /* WHOSE ACCOUNT, said before the redirect and not after the mistake.
         Facebook offers the Pages of whoever is signed into facebook.com in
         this browser; connect as the company and the dialog reports success
         for an account that is not the agency's. Nothing downstream can
         detect that, so it is said here, where the button is. */
      function metaStepHtml(pl) {
        if (FBP.id) return fbPickHtml();
        /* INSTAGRAM THROUGH FACEBOOK. "Instagram is not available" was true
           of Instagram's own login and false of the thing agencies actually
           need: the Facebook connection returns the Page AND the Instagram
           professional account linked to it, in one dialog. */
        if (pl === 'instagram' && !platformReady('instagram')) {
          return '<div class="ch-step">'
            + '<div class="cmp-ch-note"><b>Instagram connects through Facebook.</b> Your Instagram has to be '
            + 'a professional account linked to this agency’s Facebook Page (on Facebook: your Page → '
            + 'Settings → Linked accounts). In the Facebook window, tick the Page <b>and</b> its Instagram '
            + 'account: both are connected together.</div>'
            + '<div class="cmp-ch-note">Sign in with the Facebook account that administers the Page.</div>'
            + '<div><button class="cmp-ch-btn primary" data-connect="facebook">Continue to Facebook →</button></div>'
            + appNotActiveHtml() + '</div>';
        }
        return '<div class="ch-step">'
          + '<div class="cmp-ch-note">You will be sent to ' + esc(CONNECTABLE[pl]) + ' to sign in. '
          + 'Use the account that administers <b>this agency’s</b> page, '
          + 'you are only ever offered the pages that account manages.</div>'
          + '<div><button class="cmp-ch-btn primary" data-connect="' + pl + '">Continue to '
          + esc(CONNECTABLE[pl]) + ' →</button></div>'
          + (pl === 'facebook' ? appNotActiveHtml() : '') + '</div>';
      }

      /* "APP NOT ACTIVE" IS FACEBOOK'S PAGE, NOT OURS. Nothing comes back
         from it -- no redirect, no record in social_connect_failures -- so
         this is the only place it can be explained. While Synapse's Meta app
         is in Development mode, only Facebook accounts with a role on the app
         may log in through it, and everyone else gets that page: an agency
         before App Review, or the owner signed in on a phone as another
         profile (the Facebook app's profile is the one used, and a Page
         profile switched into counts as another profile). */
      function appNotActiveHtml() {
        return '<details class="fbp-help"><summary>Facebook says “App not active”?</summary>'
          + '<div class="cmp-ch-note">Synapse’s Facebook app is not open to everyone yet, so for now only '
          + 'Facebook accounts Synapse has added can connect. Check which Facebook profile you are signed in '
          + 'as: on a phone it is the profile in the Facebook app, and if you have switched into your Page’s '
          + 'profile, switch back to your own. If it is the right account, ask Synapse to add it.</div></details>';
      }

      /* TIKTOK SENDS TO THE INBOX. A post arrives in the agent's TikTok app
         as a draft to finish -- they add a sound, which decides most of a
         TikTok's reach -- so the agent should know that before they connect,
         not discover it on the first post. */
      function tiktokStepHtml() {
        return '<div class="ch-step">'
          + '<div class="cmp-ch-note">You will be sent to TikTok to sign in. Use the TikTok '
          + 'account you post listings from.</div>'
          /* WHICH ACCOUNT, BEFORE AND NOT AFTER. TikTok authorises whoever
             is already signed in -- on tiktok.com in this browser, or in the
             app on a phone -- and does not stop to ask. Connecting the wrong
             one looks exactly like success until the first draft lands in
             somebody else's inbox. */
          + '<div class="cmp-ch-note ch-tt-who"><b>Check which account first.</b> TikTok connects whichever '
          + 'account is signed in to TikTok in this browser (or in the TikTok app, on a phone) without asking. '
          + '<a href="https://www.tiktok.com/" target="_blank" rel="noopener">Open TikTok ↗</a> and look at the '
          + 'profile picture; if it is not the listings account, switch there first, then come back.</div>'
          + '<div class="cmp-ch-note">Posts arrive in that account’s <b>TikTok inbox</b> as drafts: '
          + 'open TikTok, add a sound, and post. The sound is most of what decides how far a TikTok goes.</div>'
          + '<div><button class="cmp-ch-btn primary" data-connect="tiktok">Continue to TikTok →</button></div></div>';
      }

      /* TELEGRAM IN TWO STEPS: add the bot, post a code. Posting in a channel
         needs the right to post there, so a code that arrives FROM a channel
         is the proof the channel is theirs -- no Telegram account to link
         first and no list to wait for. TryPost's method; it replaced a
         link-then-add-then-pick flow on 2026-09-27, after the comparison
         showed ours was the slowest of the three. The bot deletes the code
         post, which is the only thing its Delete right is for.

         Linking a Telegram account is still offered, lower down and
         optional: bots cannot post Stories, so a Story kit is sent privately
         to whoever connected the channel, and that needs to know who they
         are on Telegram. */
      function tgMinsLeft() {
        return TGS.exp ? Math.max(0, Math.ceil((TGS.exp - Date.now()) / 60000)) : 0;
      }

      function tgStepHtml() {
        var bot = TG_BOT.replace(/^@/, '');
        var h = '<div class="ch-step ch-tg">';

        if (TGS.st === 'connected') {
          h += '<div class="ch-tg-s ok">✓ Connected <b>' + esc(TGS.channel || 'your channel') + '</b></div>';
          if (!TGS.deleted) {
            h += '<div class="ch-tg-s"><span>The bot could not delete the <code>/connect</code> post. '
              + 'Delete it from the channel yourself, so your followers do not see it.</span></div>';
          }
          h += '<div class="ch-tg-acts"><button type="button" class="cmp-ch-btn primary" data-ch-close>Done</button>'
            + '<button type="button" class="cmp-ch-btn" data-tg-again>Connect another channel</button></div>';
        } else {
          h += '<div class="ch-tg-s"><span><b>1. Add the bot to your channel.</b> Telegram opens and asks which '
            + 'channel. <b>Post Messages</b> and <b>Delete Messages</b> are already ticked; Delete is only used '
            + 'to remove the code you post in step 2.</span>'
            + '<div><a class="cmp-ch-btn cmp-tg-add" target="_blank" rel="noopener" href="https://t.me/'
            + encodeURIComponent(bot) + '?startchannel&amp;admin=post_messages+delete_messages">Add '
            + esc(TG_BOT) + ' ↗</a></div></div>';

          h += '<div class="ch-tg-s"><span><b>2. Post this in the channel.</b> As an ordinary post in the '
            + 'channel itself, not in a chat with the bot. It connects the channel and disappears.</span>';
          var lapsed = TGS.st === 'expired' || TGS.st === 'unknown'
            || (TGS.code && (TGS.st === 'waiting' || TGS.st === 'error') && Date.now() > TGS.exp);
          if (TGS.busy === 'code' || (!TGS.code && !TGS.note)) {
            h += '<div class="ch-tg-wait">Getting your code…</div>';
          } else if (lapsed) {
            h += '<div class="ch-tg-wait">That code has expired. '
              + '<button type="button" class="lf-linkbtn" data-tg-new>Get a new one</button></div>';
          } else if (TGS.code) {
            h += '<div class="ch-tg-code"><code class="ch-tg-cmd" id="tgCmd">/connect ' + esc(TGS.code) + '</code>'
              + '<button type="button" class="cmp-ch-btn" data-tg-copy>Copy</button></div>'
              + '<div class="ch-tg-wait">'
              + (TGS.st === 'working' ? 'Got it. Connecting…'
                : TGS.st === 'error' ? 'Fix that, then post the same code again.'
                : 'Watching for it · expires in ' + tgMinsLeft() + ' min')
              + ' · <button type="button" class="lf-linkbtn" data-tg-new>New code</button></div>';
          } else {
            h += '<div><button type="button" class="cmp-ch-btn" data-tg-new>Try again</button></div>';
          }
          h += '</div>';
        }

        /* Story kits: offered once the channel part is on screen, and only
           while this person is not linked. */
        if (TGS.linked === null) {
          h += '<div class="ch-tg-s ch-tg-opt"><span><b>Optional: Story kits.</b> Bots cannot post Telegram '
            + 'Stories, so after each post we can send you the photo and link to share as a Story in a tap. '
            + 'Link your Telegram to get them.</span>'
            + '<div><button type="button" class="cmp-ch-btn" data-tg-link'
            + (TGS.busy === 'link' ? ' disabled>Opening…' : '>Link Telegram ↗') + '</button>'
            + (TGS.linkWait ? ' <span class="ch-tg-wait">Press Start in Telegram, then come back.</span>' : '')
            + '</div></div>';
        } else if (TGS.linked) {
          var who = TGS.linked.telegram_username ? '@' + TGS.linked.telegram_username
            : (TGS.linked.first_name || 'your Telegram account');
          h += '<div class="ch-tg-s ch-tg-opt ok">✓ Story kits come to you on Telegram as <b>' + esc(who) + '</b></div>';
        }

        /* The server's own words: they name what went wrong. */
        h += '<div class="cmp-setup-why" role="status" aria-live="polite">' + esc(TGS.note || '') + '</div>';
        return h + '</div>';
      }

      function tgApi(action, opts) {
        return token().then(function (t) {
          if (!t) throw new Error('Sign in again to connect a channel.');
          return fetch(SB_URL + '/functions/v1/social-connect?action=' + action, Object.assign({
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
          }, opts || {}));
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (!r.ok) {
              var e = new Error(j.error || ('Telegram step failed (' + r.status + ').'));
              e.body = j; throw e;
            }
            return j;
          });
        });
      }

      function tgBot(j) {
        if (j && typeof j.bot === 'string' && /^@[A-Za-z0-9_]{5,32}$/.test(j.bot)) TG_BOT = j.bot;
      }

      /* Redrawn only when something changed, so a three-second poll does not
         flicker the panel or move anything under a pointer. The minutes left
         are part of it, so the countdown moves once a minute. */
      function tgPaint() {
        var sig = JSON.stringify([TGS.linked, TGS.note, TGS.busy, TGS.code, TGS.st, TGS.channel,
          TGS.deleted, TGS.linkWait, TG_BOT, tgMinsLeft()]);
        if (sig === TGS.sig) return;
        TGS.sig = sig;
        if (ADD.open && ADD.pick === 'telegram') renderAdd();
      }

      function tgNewCode() {
        TGS.busy = 'code'; TGS.note = ''; TGS.st = ''; TGS.code = ''; TGS.channel = '';
        tgPaint();
        return tgApi('telegram-code', { method: 'POST', body: '{}' }).then(function (j) {
          TGS.code = j.code || '';
          TGS.exp = Date.now() + (j.expires_in || 900) * 1000;
          TGS.st = 'waiting';
          tgBot(j);
          tgWatch(true);
        }).catch(function (e) {
          TGS.note = e.message || 'Could not get a code just now.';
        }).then(function () { TGS.busy = ''; tgPaint(); });
      }

      /* Has the code been posted, and what came of it. Only asked while
         there is something to wait for. */
      function tgCheck() {
        var code = TGS.code;
        if (!code || !(TGS.st === 'waiting' || TGS.st === 'working' || TGS.st === 'error')) {
          tgPaint(); return Promise.resolve();
        }
        return tgApi('telegram-code-status?code=' + encodeURIComponent(code)).then(function (j) {
          if (code !== TGS.code) return;              // a new code was issued meanwhile
          TGS.st = j.status || 'waiting';
          TGS.note = j.status === 'error' ? (j.error || 'That did not work.') : '';
          if (j.status === 'connected') {
            TGS.channel = j.channel || '';
            TGS.deleted = j.code_post_deleted !== false;
            TGS.code = '';
            tgWatch(false);
            return loadChannels();
          }
        }).catch(function () { /* a missed poll is retried in three seconds */ }).then(tgPaint);
      }

      function tgLinkState() {
        return tgApi('telegram-link').then(function (j) {
          TGS.linked = j.linked || null;
          if (TGS.linked) TGS.linkWait = false;
          tgBot(j);
        }).catch(function () {
          if (TGS.linked === undefined) TGS.linked = null;
        }).then(tgPaint);
      }

      /* WATCHED WHILE OPEN. The code is posted in another app, so the panel
         asks every few seconds while it is open and visible, and the moment
         the tab regains focus. It stops when the code runs out. */
      function tgWatch(on) {
        clearInterval(TGS.poll); TGS.poll = null;
        if (!on) return;
        TGS.until = Math.max(Date.now() + 60000, (TGS.exp || 0) + 10000);
        TGS.poll = setInterval(function () {
          if (!ADD.open || ADD.pick !== 'telegram' || Date.now() > TGS.until) { tgWatch(false); tgPaint(); return; }
          if (document.visibilityState !== 'visible') return;
          tgCheck();
          if (TGS.linkWait) tgLinkState();
        }, 3000);
      }
      window.addEventListener('focus', function () {
        if (!ADD.open || ADD.pick !== 'telegram') return;
        tgCheck();
        if (TGS.linkWait) tgLinkState();
      });

      /* Opening Telegram's pick: a fresh code unless the last one is still
         good, and the link state once, for the Story-kit line. */
      function tgOpen() {
        TGS.sig = '';
        if (TGS.st === 'connected') { TGS.st = ''; TGS.channel = ''; }
        if (TGS.linked === undefined) tgLinkState();
        if (!TGS.code || Date.now() > TGS.exp - 60000) { tgNewCode(); return; }
        tgWatch(true); tgCheck();
      }

      function tgLinkStart() {
        /* Opened now, inside the click, and pointed at Telegram once the
           server answers: a window opened after an await is a popup, and
           phones block those. */
        var w = null;
        try { w = window.open('', '_blank'); } catch (e) { w = null; }
        TGS.busy = 'link'; tgPaint();
        tgApi('telegram-link-start', { method: 'POST', body: '{}' }).then(function (j) {
          if (w && !w.closed) w.location.href = j.url; else window.location.href = j.url;
          TGS.linkWait = true;
          if (!TGS.poll) tgWatch(true);
        }).catch(function (e) {
          if (w && !w.closed) w.close();
          TGS.note = e.message || 'Could not start the link.';
        }).then(function () { TGS.busy = ''; tgPaint(); });
      }

      /* clipboard.writeText is missing on insecure origins and refused in some
         in-app browsers; the fallback selects the command so a long-press or
         Ctrl+C still works. */
      function tgCopy(btn) {
        var text = '/connect ' + TGS.code;
        var said = function (w) { btn.textContent = w; setTimeout(function () { btn.textContent = 'Copy'; }, 2200); };
        var selectIt = function () {
          try {
            var r = document.createRange(); r.selectNodeContents(document.getElementById('tgCmd'));
            var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
            said('Selected');
          } catch (err) { said('Select it'); }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { said('Copied'); }, selectIt);
        } else selectIt();
      }

      /* Somewhere else on the page (the "connect your channels" pop-up) can
         send somebody straight here: Social studio, the add panel open. */
      function openAddChannel(pl) {
        if (typeof goToPane === 'function') goToPane('social');
        ADD.open = true;
        if (pl && CONNECTABLE[pl]) { ADD.pick = pl; }
        renderAdd();
        if (ADD.pick === 'telegram') tgOpen();
        setTimeout(function () {
          var el = document.getElementById('chAdd');
          if (!el) return;
          if (el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          var b = el.querySelector('.ch-pick:not([disabled])');
          if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
        }, 380);
      }
      window.openAddChannel = openAddChannel;

      document.addEventListener('change', function (e) {
        var box = e.target && e.target.closest && e.target.closest('input[data-fbp]');
        if (!box) return;
        FBP.chosen[box.getAttribute('data-fbp')] = box.checked;
        renderAdd();
      });

      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('[data-ch-add]')) { ADD.open = true; renderAdd(); return; }
        if (t.closest('[data-fbp-go]')) { fbpConnect(); return; }
        if (t.closest('[data-ch-close]')) {
          ADD.open = false; ADD.pick = ''; tgWatch(false);
          FBP = { id: '', data: null, chosen: {}, busy: false, note: '' };
          if (TGS.st === 'connected') { TGS.st = ''; TGS.channel = ''; }
          renderAdd(); return;
        }
        var p = t.closest('[data-ch-pick]');
        if (p) {
          if (p.disabled) return;
          ADD.pick = p.dataset.chPick;
          renderAdd();
          if (ADD.pick === 'telegram') tgOpen(); else tgWatch(false);
          return;
        }
        if (t.closest('[data-tg-link]')) { tgLinkStart(); return; }
        if (t.closest('[data-tg-new]')) { tgNewCode(); return; }
        if (t.closest('[data-tg-again]')) { tgNewCode(); return; }
        var cp = t.closest('[data-tg-copy]');
        if (cp) tgCopy(cp);
      });

      /* ── answering a comment with the link ───────────────────────────────
         Instagram captions never linkify, so a listing posted there ends at a
         dead end. Meta allows ONE private message to somebody who commented,
         and it may carry a link -- the only route off an Instagram caption
         there is.

         It sends in the agency's name to somebody who has never used Synapse,
         so it is off until an owner or admin says otherwise, and the exact
         message is on screen before it can ever go anywhere. */
      var replyCfg = null;
      /* Open while the decision is being made, shut once it has been. Kept
         out of replyCfg because it is about this screen, not about the
         agency's settings -- reloading the settings must not reopen a box
         somebody just closed. */
      var replyOpen = false;

      function canSetReplies() {
        var r = document.body.dataset.role;
        return r === 'agency_owner' || r === 'agency_admin';
      }

      function loadReplySettings() {
        if (!window.SynListings || !SynListings.getReplySettings) return Promise.resolve();
        return SynListings.getReplySettings()
          .then(function (row) { replyCfg = row || { enabled: false, keyword: 'PRICE', message: '' }; })
          /* A failed read must not remove the channel strip around it. */
          .catch(function () { replyCfg = null; });
      }

      /* The two things the server adds, shown here rather than discovered in
         somebody's inbox: the link when the template leaves {{link}} out, and
         the automated notice when the wording does not already say so. */
      function replyPreview(msg) {
        var link = 'synapsecore.dev/s/\u2026';
        var text = String(msg || '').replace(/\{\{\s*link\s*\}\}/g, link);
        if (text.indexOf(link) === -1) text = text.trim() + '\n\n' + link;
        if (!/automat|bot\b|auto-?reply/i.test(text)) {
          text += '\n\n(Automated reply \u2014 say anything here and a real person will see it.)';
        }
        return text;
      }

      function replyHtml() {
        if (!replyCfg || !canSetReplies()) return '';
        var on = !!replyCfg.enabled;
        var kw = replyCfg.keyword || 'PRICE';
        var msg = replyCfg.message || '';

        /* SAVED MEANS A ROW CAME BACK, not that the fields hold values.
           Somebody who deliberately saved the defaults has made the decision
           and gets the same one line as anybody else. */
        var saved = !!replyCfg.agency_id;
        if (saved && !replyOpen) {
          /* Off is SAID, not implied by absence. A collapsed row silent about
             being off reads as on, and this is the control that messages
             strangers -- the one place here where assuming the more active
             state is the wrong way to be wrong. */
          return '<div class="cmp-setup cmp-reply cmp-reply-shut">'
            + '<div class="cmp-reply-sum">'
            +   '<span class="cmp-reply-dot' + (on ? ' on' : '') + '"></span>'
            +   '<span>' + (on
                  ? 'Answering comments that say <b>' + esc(kw) + '</b> with the listing link'
                  : 'Comment replies are <b>off</b>')
            +   '</span>'
            + '</div>'
            + '<button class="cmp-ch-btn" id="rpEdit">Edit</button>'
            + '</div>';
        }

        return '<div class="cmp-setup cmp-reply">'
          + '<div class="cmp-setup-hd">Answer comments with the link</div>'
          + '<p class="cmp-ch-note">Instagram captions cannot be tapped. When somebody '
          + 'comments <b>' + esc(kw) + '</b> on one of your posts, Synapse sends them '
          + 'one direct message with the link to that exact home. '
          + '<b>The comment is the permission</b> \u2014 so the caption has to ask for it, '
          + 'and nobody else is messaged.</p>'
          + '<label class="cmp-reply-row"><input type="checkbox" id="rpOn"' + (on ? ' checked' : '') + '> '
          + '<span>Send the link when somebody comments the word below</span></label>'
          + '<div class="cmp-setup-row"><label for="rpKw">Word</label>'
          + '<input id="rpKw" class="cmp-reply-kw" value="' + esc(kw) + '" maxlength="24"></div>'
          + '<label class="cmp-reply-lbl" for="rpMsg">Message</label>'
          + '<textarea id="rpMsg" class="cmp-reply-msg" rows="3">' + esc(msg) + '</textarea>'
          + '<div class="cmp-reply-prev" id="rpPrev"></div>'
          + '<div class="cmp-setup-row"><button class="cmp-ch-btn primary" id="rpSave">Save</button>'
          + '<span class="cmp-setup-why" id="rpNote"></span></div>'
          + '</div>';
      }

      function wireReply() {
        var edit = document.getElementById('rpEdit');
        if (edit) {
          edit.addEventListener('click', function () { replyOpen = true; renderChannels(); });
          return;
        }
        var msg = document.getElementById('rpMsg');
        var prev = document.getElementById('rpPrev');
        if (!msg || !prev) return;
        var paint = function () { prev.textContent = replyPreview(msg.value); };
        paint();
        msg.addEventListener('input', paint);

        document.getElementById('rpSave').addEventListener('click', function () {
          var btn = this, note = document.getElementById('rpNote');
          var kw = (document.getElementById('rpKw').value || '').trim();
          if (!kw) { note.textContent = 'Give it a word to listen for.'; return; }
          btn.disabled = true; note.textContent = 'Saving\u2026';
          SynListings.saveReplySettings({
            enabled: document.getElementById('rpOn').checked,
            keyword: kw,
            message: msg.value,
          }).then(function () {
            note.textContent = 'Saved';
            return loadReplySettings();
          }).then(function () {
            btn.disabled = false;
            /* Shut on the way out of a successful save -- which is the moment
               the decision stops being one. A failed save leaves it open, so
               nobody loses what they typed to a collapse. */
            replyOpen = false;
            renderChannels();
          }).catch(function (err) {
            btn.disabled = false;
            note.textContent = (err && err.message) || 'Could not save that'; planGate(err && err.message);
          });
        });
      }

      /* Must match bio_slug() in 0106 exactly: strip a leading @, lowercase,
         and replace every run of anything outside [a-z0-9._-] with a hyphen.
         A slug computed differently here points at a /go/ page that does not
         resolve, which is a broken link in somebody's Instagram bio -- the
         single worst place in this product for one. */
      function bioSlug(handle) {
        return String(handle || '').replace(/^\s*@/, '').trim().toLowerCase()
          .replace(/[^a-z0-9._-]+/g, '-');
      }

      /* ── what is still outstanding, and only they can do ────────────────
         A connection is reported as finished when steps remain that are
         outside anything we can reach. They used to sit on the strip as a
         standing checklist; they are handed to the task pop-ups now (see
         "Things only a person can do"), which arrive once and live in the bell
         until marked done. */
      function publishTasks() {
        if (typeof setTasks !== 'function') return;
        var tasks = [];

        accounts.forEach(function (ac) {
          if (!ac.is_active) return;
          var slug = bioSlug(ac.platform_username);
          /* Telegram stores its own label -- an @name, or a title. */
          var who = ac.platform === 'telegram'
            ? (ac.platform_username || 'your channel')
            : (ac.platform_username ? '@' + ac.platform_username : CONNECTABLE[ac.platform] || ac.platform);
          var goUrl = slug ? 'https://synapsecore.dev/go/' + slug : '';

          /* THE BIO LINK. On Telegram, straight into a new chat with Tayo --
             the posts there carry their own button, so the description is for
             somebody browsing the channel, and the useful thing is a
             conversation. On Instagram, where captions cannot link, the page
             of this account's homes is how a reader finds the one they saw. */
          if (ac.platform === 'telegram') {
            tasks.push({
              id: 'bio:' + ac.id + ':tayo',
              title: 'Put this link in ' + who + '\u2019s description',
              body: 'Anyone browsing the channel can tap straight into a new chat with Tayo, '
                + 'which asks which home caught their eye.',
              copies: [{ text: 'https://synapsecore.dev/tayo/telegram' }],
              where: 'Telegram \u2192 your channel \u2192 Edit \u2192 Description',
            });
          } else if (slug) {
            tasks.push({
              id: 'bio:' + ac.id + ':' + slug,
              title: 'Put this link in ' + who + '\u2019s bio',
              body: 'It lists the homes this account has posted, newest first, and each one opens '
                + 'the right listing \u2014 so the posts have somewhere to send people.',
              copies: [{ text: goUrl }],
              where: ac.platform === 'instagram'
                ? 'Instagram \u2192 Edit profile \u2192 Links'
                : 'Facebook \u2192 your Page \u2192 Edit details \u2192 Website',
            });
          }

          /* THE PAGE BUTTON. Read at connect time; null means we could not
             look, and then this says nothing at all. */
          if (ac.platform !== 'facebook' || !ac.page_cta_type) return;
          var fix = 'Meta Business Suite \u2192 your Page \u2192 Edit action button';

          if (ac.page_cta_type === 'NONE') {
            tasks.push({
              id: 'cta:' + ac.id + ':NONE',
              title: 'Give ' + who + ' an action button',
              body: 'This Page has none. One that points at your listings puts a tappable route '
                + 'under every post, in the spot Facebook makes most prominent.',
              copies: goUrl ? [{ text: goUrl }] : [], where: fix,
            });
            return;
          }

          /* NO WEB ADDRESS means a call, a WhatsApp thread or a Messenger
             window -- the buyer arrives with no listing attached and the
             enquiry belongs to nothing. */
          if (!ac.page_cta_url) {
            tasks.push({
              id: 'cta:' + ac.id + ':' + ac.page_cta_type,
              title: 'Point ' + who + '\u2019s Page button at your listings',
              body: 'It is set to ' + esc(String(ac.page_cta_type).toLowerCase().replace(/_/g, ' '))
                + ', so it sends people to a message or a call. Facebook puts it under every post, '
                + 'above your caption link, so most people tap it \u2014 and it arrives with no listing '
                + 'attached. Keep the phone number on the Page; anyone who wants to call still can.',
              copies: goUrl ? [{ text: goUrl }] : [], where: fix,
            });
            return;
          }

          if (ac.page_cta_url.indexOf('synapsecore.dev') === -1) {
            tasks.push({
              id: 'cta:' + ac.id + ':url:' + ac.page_cta_url,
              title: who + '\u2019s Page button goes somewhere else',
              body: 'It opens <code>' + esc(ac.page_cta_url) + '</code>. That is fine if it is meant to; '
                + 'pointing it at your Synapse listings means the taps are counted against the homes '
                + 'they were about.',
              copies: goUrl ? [{ text: goUrl }] : [], where: fix,
            });
          }
        });

        /* GETTING SET UP. An agency that has just signed up has nowhere for
           a post to go, and nothing on the page says so until they open
           Social studio. This asks once, straight after the brand checklist
           (the brand is what Tayo writes the captions from, so it comes
           first, and two getting-started asks at once is one too many). It
           stays in the bell until a channel is connected, and then it is no
           longer true, so it goes. */
        if (accountsKnown && !accounts.length && canConnect() && window.SYN_BRAND_ONBOARDING === false) {
          var ready = Object.keys(CONNECTABLE).filter(platformReady).map(function (k) { return CONNECTABLE[k]; });
          if (ready.length) {
            tasks.push({
              id: 'onboard:channels',
              eye: 'Getting set up',
              title: 'Connect your social channels',
              body: 'Synapse writes the captions and posts your listings to your own '
                + esc(ready.length > 1 ? ready.slice(0, -1).join(', ') + ' or ' + ready[ready.length - 1] : ready[0])
                + ', and every enquiry that comes back is counted against the home it was about. '
                + 'Connect the accounts you already post from.',
              where: 'Social studio → Channels → Add channel',
              action: { label: 'Add a channel', run: function () { openAddChannel(); } },
            });
          }
        }

        setTasks('channels', tasks);
      }
      document.addEventListener('syn:brand-onboard', function () { publishTasks(); });

      /* Re-render once the role is known. Without this the strip is whatever
         it guessed before applyRole's round trip came back -- see the comment
         at the dispatch. */
      document.addEventListener('syn:role', function () { renderChannels(); });

      document.addEventListener('click', function (e) {
        /* clipboard.writeText is unavailable on insecure origins and can be
           refused outright, and a Copy button that silently does nothing is
           worse than none -- the link is visible either way, so the fallback
           is to say "select it yourself" rather than to pretend. */
        var cp = e.target.closest && e.target.closest('[data-copy]');
        if (cp) {
          e.preventDefault();
          var text = cp.dataset.copy, was = cp.textContent;
          var done = function (ok) {
            cp.textContent = ok ? 'Copied' : 'Select it above';
            setTimeout(function () { cp.textContent = was; }, 1800);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { done(true); },
                                                     function () { done(false); });
          } else { done(false); }
          return;
        }
        var c = e.target.closest && e.target.closest('[data-connect]');
        if (c) { e.preventDefault(); startConnect(c.dataset.connect, c); return; }
        var d = e.target.closest && e.target.closest('[data-disconnect]');
        if (d) { e.preventDefault(); disconnect(d.dataset.disconnect, d); }
      });

      function startConnect(platform, btn) {
        if (!CONNECTABLE[platform]) return;
        var was = btn.textContent;
        btn.disabled = true; btn.textContent = 'Opening…';
        token().then(function (t) {
          if (!t) throw new Error('Sign in again to connect an account.');
          return fetch(SB_URL + '/functions/v1/social-connect?action=start&platform='
              + encodeURIComponent(platform), {
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + t },
          }).then(function (r) {
            return r.json().then(function (j) {
              if (!r.ok) throw new Error(j.error || ('Could not start the connection (' + r.status + ').'));
              return j;
            });
          });
        }).then(function (j) {
          if (!j.url) throw new Error('The connect flow returned no URL.');
          /* Full navigation, not a popup: the OAuth callback comes back as a
             302 to this portal, and a popup that a blocker kills leaves the
             agency staring at a button that did nothing. */
          window.location.href = j.url;
        }).catch(function (err) {
          btn.disabled = false; btn.textContent = was;
          toastOrAlert(err.message || 'Could not open the connection.');
        });
      }

      function disconnect(id, btn) {
        var was = btn.textContent;
        btn.disabled = true; btn.textContent = 'Working…';
        token().then(function (t) {
          if (!t) throw new Error('Sign in again.');
          return fetch(SB_URL + '/rest/v1/rpc/disconnect_social_account', {
            method: 'POST',
            headers: {
              apikey: SB_KEY, Authorization: 'Bearer ' + t,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_account_id: id }),
          });
        }).then(function (r) {
          if (!r.ok) throw new Error('Could not disconnect (' + r.status + ').');
          return loadChannels();
        }).then(function () {
          if (campaign) render();
        }).catch(function (err) {
          btn.disabled = false; btn.textContent = was;
          toastOrAlert(err.message || 'Could not disconnect.');
        });
      }

      function toastOrAlert(msg) {
        if (typeof toast === 'function') toast(msg); else alert(msg);
      }

      /* WHAT TO DO NEXT, IN FULL (2026-10-02). social-connect's detail is
         cut at 180 characters on its way here, and on 2 Oct the "no Page"
         message arrived as its first half -- the half about our Meta
         configuration -- with the part saying what to do cut off. The
         function now sends a fixed `reason` beside the detail, and the steps
         live here, where there is room for them. Every reason is a Facebook
         one; the function sends none for other platforms. */
      var FB_RESET = 'On Facebook, go to Settings & privacy → Settings → Business integrations '
        + '(search Settings for “Business integrations” if you can’t see it), find Synapse and remove it.';
      var CONNECT_HELP = {
        no_pages: {
          what: 'Facebook connected, but no Page came with it, so nothing was connected.',
          steps: [
            'Press Connect Facebook again. In Facebook’s window, tick every Page you post from, '
              + 'and its Instagram account, then continue.',
            'If Facebook shows no list of Pages and only offers “Continue as …”, it is reusing an earlier '
              + 'choice. If the window has a link to edit that choice, use it; otherwise: ' + FB_RESET
              + ' Then come back and connect again.',
            'You need full control of the Page on Facebook.'],
          retry: true },
        stale_pages: {
          what: 'Facebook is still pointing Synapse at Pages that no longer exist (most likely deleted), '
            + 'and it skipped asking about your current ones.',
          steps: [FB_RESET,
            'Come back here and press Connect Facebook again.',
            'In Facebook’s window, tick your current Pages and their Instagram accounts, then continue.'],
          retry: true },
        no_token: {
          what: 'Facebook named your Pages but gave Synapse no permission to post to them.',
          steps: ['Press Connect Facebook again and leave every permission switched on in Facebook’s window.',
            'You need full control of the Page on Facebook; partial access is not enough to post.'],
          retry: true },
        missing_permission: {
          what: 'Facebook did not give Synapse the permission it needs to list your Pages.',
          steps: ['This is set in Synapse’s own Facebook app, not on your side. Send the message below to Synapse.'],
          retry: false },
        pages_unreadable: {
          what: 'Facebook would not tell Synapse which Pages you run.',
          steps: ['Press Connect Facebook again.',
            'If it happens again, send the message below to Synapse.'],
          retry: true },
        unknown: {
          what: 'Facebook shared no Page, and Synapse could not tell why.',
          steps: ['Press Connect Facebook again.',
            'If it happens again, send the message below to Synapse.'],
          retry: true },
        user_denied: {
          what: 'Facebook’s window was closed or Cancel was pressed, so nothing was connected.',
          steps: ['Press Connect Facebook again and continue through Facebook’s window to the end.'],
          retry: true }
      };

      /* The portal returns from OAuth with ?connected= or ?connect_error= on
         the URL. Read it once, tell the agency what happened, and strip it --
         a reload should not replay a stale outcome. */
      (function readConnectResult() {
        var q = new URLSearchParams(location.search);
        var outcome = q.get('connected');
        if (!outcome) return;
        var detail = q.get('detail') || '';
        var reason = q.get('reason') || '';
        q.delete('connected'); q.delete('detail'); q.delete('reason');
        history.replaceState({}, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
        /* WHEREVER THE CONNECTION CAME FROM, THE AGENCY LANDS IN THE SOCIAL STUDIO (Eden, 2026-10-19: it went back to the Branding
           page on desktop). After start-up, not during it: goToPane reads a const declared further down. */
        setTimeout(function () { try { if (typeof goToPane === 'function') goToPane('social'); } catch (e) { /* stay put */ } }, 0);
        /* A function deployed before `reason` existed still says "shared no
           Page" in words; recognise those, so the steps arrive whichever of
           the portal and the function goes live first. */
        if (!reason && outcome === 'error' && /shared no Page/i.test(detail)) reason = 'no_pages';
        /* Facebook shared some Pages; this agency now says which are its own. */
        if (outcome === 'choose' && /^[0-9a-f-]{36}$/i.test(detail)) {
          FBP = { id: detail, data: null, chosen: {}, busy: false, note: '' };
          ADD.open = true; ADD.pick = 'facebook';
          /* AFTER START-UP, NOT DURING IT. This runs while the page's script
             is still executing, and goToPane reads `tpanel`, a const declared
             further down -- calling it here threw, and the throw stopped the
             rest of the portal from starting: no chooser, no channel list.
             That is how "Greenlight did not connect" happened on 28 Sept with
             the Page sitting in the stash, waiting for a tick. */
          setTimeout(function () {
            try { if (typeof goToPane === 'function') goToPane('social'); } catch (e) { /* stay put */ }
          }, 0);
          fbpLoad();
          return;
        }
        var msg = outcome === 'cancelled'
          ? 'Connection cancelled' + (detail ? ': ' + detail : '.')
          : outcome === 'error'
            ? 'Could not connect' + (detail ? ': ' + detail : '.')
            : outcome === 'tiktok'
              /* Not "real from now on": a TikTok post is a draft until the
                 agent finishes it in the app. */
              ? 'TikTok connected' + (detail ? ' as ' + detail : '')
                + '. Posts will arrive in that account’s TikTok inbox to finish and post.'
              : (CONNECTABLE[outcome] || outcome) + ' connected'
                + (detail ? ' as ' + detail : '') + '. Posts to it are real from now on.';

        /* A FAILURE STAYS ON SCREEN. Success is fine as a toast -- you can
           see the result in the channel strip either way. A failure is the
           opposite: Meta's reason arrives once, in a query parameter this
           function has already stripped from the URL, and four seconds
           later the only record of why the connection failed is gone. It is
           also the sentence somebody needs to paste to whoever can fix it,
           so it has to be selectable rather than merely visible. */
        if (outcome === 'error' || outcome === 'cancelled') {
          var bar = document.createElement('div');
          bar.className = 'connect-err';
          bar.setAttribute('role', 'alert');
          bar.innerHTML = '<div class="ce-msg"></div>'
            + '<button type="button" class="ce-x" aria-label="Dismiss">&#10005;</button>';
          var help = Object.prototype.hasOwnProperty.call(CONNECT_HELP, reason) ? CONNECT_HELP[reason] : null;
          var box = bar.querySelector('.ce-msg');
          if (!help) {
            box.textContent = msg;   // Meta's words, unescaped by us
          } else {
            /* Built from text nodes: the steps are ours, but the detail
               underneath came in on the URL and is never treated as markup.
               The button is the ordinary [data-connect] control, handled by
               the document-wide click listener like the one in the panel. */
            var what = document.createElement('span');
            what.className = 'ce-what'; what.textContent = help.what;
            var ol = document.createElement('ol');
            ol.className = 'ce-steps';
            help.steps.forEach(function (s) {
              var li = document.createElement('li'); li.textContent = s; ol.appendChild(li);
            });
            box.appendChild(what); box.appendChild(ol);
            if (detail) {
              var said = document.createElement('div');
              said.className = 'ce-said'; said.textContent = 'Details: ' + detail;
              box.appendChild(said);
            }
            if (help.retry) {
              var acts = document.createElement('div');
              acts.className = 'ce-acts';
              acts.innerHTML = '<button type="button" class="cmp-ch-btn primary" data-connect="facebook">'
                + 'Connect Facebook again</button>';
              box.appendChild(acts);
            }
          }
          bar.querySelector('.ce-x').addEventListener('click', function () { bar.remove(); });
          document.body.appendChild(bar);
          return;
        }
        setTimeout(function () { toastOrAlert(msg); }, 400);
      })();

      /* ── the live path ─────────────────────────────────────────────────
         A rehearsal runs entirely in the browser. A real send does not: every
         variant becomes a durable row first (queue_social_post), and only then
         is the queue drained. Written-then-sent, so a provider outage costs the
         attempt and never the intent -- the same order message_outbox uses. */
      /* SYNAPSE'S OWN CHANNELS, so this tab can tell "nothing will go out"
         apart from "YOUR accounts are not connected, but ours are".
         synapse_channels is service-role only -- the trypost account ids are
         not the portal's business -- so this goes through a function that
         returns the platform and handle and nothing else. Loaded once. */
      var SYN_CHANS = null;
      function synChannels() {
        if (SYN_CHANS) return Promise.resolve(SYN_CHANS);
        return token().then(function (t) {
          if (!t) return [];
          return fetch(SB_URL + '/rest/v1/rpc/synapse_channel_list', {
            method: 'POST',
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + t,
                       'Content-Type': 'application/json' },
            body: '{}',
          }).then(function (r) { return r.ok ? r.json() : []; });
        }).then(function (rows) {
          SYN_CHANS = new Set((rows || []).map(function (r) { return r.platform; }));
          return SYN_CHANS;
        }).catch(function () {
          /* Not knowing is not the same as none, but it has to resolve to
             something. An empty set means this falls back to exactly the old
             behaviour -- publish only what the agency has connected -- which
             is the safe direction to fail in: it never promises amplification
             that might not happen. */
          SYN_CHANS = new Set();
          return SYN_CHANS;
        });
      }

      function publishLive() {
        if (running || !campaign) return;
        synChannels().then(publishLiveWith);
      }

      /* THE GATE USED TO ASK ONLY "is one of YOUR accounts connected", which
         was the whole story until Synapse started amplifying. With nothing
         connected it refused outright -- "connect Instagram or Facebook
         first" -- while our own channels sat ready and waiting, so the free
         amplification an agency is promised could not happen until they had
         done the very thing it exists to work without. Reported as the send
         button not working. */
      function publishLiveWith(syn) {
        if (running || !campaign) return;
        var wanted = pickedPlats();
        var ready = campaign.variants.filter(function (v) {
          if (v.issues.length) return false;
          if (wanted.indexOf(v.platform) < 0) return false;   // never a channel that was not picked
          var mine = CONNECTABLE[v.platform] && connectedTo(v.platform)
            && !expired(connectedTo(v.platform));
          return mine || syn.has(v.platform);
        });
        if (!ready.length) {
          toastOrAlert(syn.size
            ? 'Nothing to publish yet, every channel here still has something to fix.'
            : 'Nothing to publish: connect Instagram or Facebook first.');
          return;
        }
        /* The confirm has to describe where these actually land, because with
           nothing connected they land somewhere the operator did not choose
           and would not otherwise expect. */
        if (!confirm('Publish ' + ready.length + ' post' + (ready.length === 1 ? '' : 's')
            + ' for real?'
            + (syn.size
                ? ' They go to your own connected accounts where you have them, and to'
                  + ' Synapse\u2019s channels either way.'
                : ' They go to your connected accounts.')
            + ' This is public and cannot be undone from here.')) return;

        running = true;
        var btn = document.getElementById('cmpLive');
        var bar = document.getElementById('cmpBar');
        var stat = document.getElementById('cmpStat');
        btn.disabled = true; btn.textContent = 'Queueing…';
        bar.style.width = '8%';
        /* Last run's links go before this run's start. Leaving them up would
           show links for posts that are not the ones now going out. */
        var linkBox = document.getElementById('cmpLinks');
        if (linkBox) linkBox.innerHTML = '';

        /* The uuid queue_social_post returns, kept. It is the only handle on
           the row a short link hangs off, and it used to be thrown away --
           which is why the link a post carries could not be shown anywhere. */
        var queuedPosts = [];

        token().then(function (t) {
          if (!t) throw new Error('Sign in again to publish.');
          var head = {
            apikey: SB_KEY, Authorization: 'Bearer ' + t,
            'Content-Type': 'application/json',
          };
          var queued = 0;
          /* Sequential on purpose. queue_social_post is one insert; the reason
             not to fan out is that a partial failure halfway through a parallel
             batch leaves an unknown number of rows queued, and the agency
             cannot tell what is about to go out. */
          return ready.reduce(function (chain, v) {
            return chain.then(function () {
              return fetch(SB_URL + '/rest/v1/rpc/queue_social_post', {
                method: 'POST', headers: head,
                body: JSON.stringify({
                  p_property_id: campaign.property && campaign.property.id,
                  p_platform: v.platform,
                  p_caption: v.caption,
                  /* Omitted on purpose -- see the scheduler. The listing's
                     gallery beats this variant's single hero image: a buyer
                     scrolling a carousel of the actual home learns more than
                     they do from one angle of it. */
                  p_media_urls: null,
                  p_dry_run: false,
                }),
              }).then(function (r) {
                if (!r.ok) return r.text().then(function (tx) { throw new Error(tx.slice(0, 160)); });
                queued++;
                bar.style.width = (8 + Math.round((queued / ready.length) * 52)) + '%';
                stat.textContent = queued + ' of ' + ready.length + ' queued';
                /* The body is the new post's id -- the RPC returns uuid, and
                   PostgREST hands a scalar back as JSON. Read tolerantly and
                   never fatally: a body that is not a uuid costs this post
                   its link, and must not also cost the publish of a row that
                   is already written and about to go out. */
                return r.text().then(function (tx) {
                  var id = tx;
                  try { id = JSON.parse(tx); } catch (err) { /* not JSON; use it raw */ }
                  if (typeof id === 'string' && UUID_RE.test(id.trim())) {
                    queuedPosts.push({ id: id.trim(), platform: v.platform });
                  }
                }).catch(function () { /* the link is a bonus; the post is the work */ });
              });
            });
          }, Promise.resolve()).then(function () {
            /* Before the send, not after it. The links exist the moment the
               rows do, so showing them here means a provider outage costs the
               attempt without also costing the operator the link they have to
               paste by hand. A failure to read them is said out loud rather
               than swallowed, and never stops the publish. */
            return loadShortLinks(head, queuedPosts)
              .then(function (links) { showLinks(links, null); })
              .catch(function (err) {
                showLinks([], 'Could not load the tracked links ('
                  + ((err && err.message) ? String(err.message).slice(0, 80) : 'network') + ').');
              });
          }).then(function () {
            btn.textContent = 'Publishing…';
            return fetch(SB_URL + '/functions/v1/social-publish', {
              method: 'POST', headers: head,
              body: JSON.stringify({ live: true, limit: Math.min(50, ready.length) }),
            }).then(function (r) {
              return r.json().then(function (j) {
                if (!r.ok) throw new Error(j.error || ('Publish failed (' + r.status + ').'));
                return j;
              });
            });
          });
        }).then(function (sum) {
          running = false;
          btn.disabled = false; btn.textContent = 'Publish for real';
          bar.style.width = '100%';
          stat.textContent = sum.published + ' published'
            + (sum.failed ? ' · ' + sum.failed + ' failed' : '');
          showResults(sum);
        }).catch(function (err) {
          running = false;
          btn.disabled = false; btn.textContent = 'Publish for real';
          bar.style.width = '0%';
          stat.textContent = '';
          toastOrAlert(err.message || 'Could not publish.');
        });
      }

      /* ── the link, which is the point ────────────────────────────
         queue_social_post mints one short link per post and appends it to the
         caption. On Facebook that is enough, because a caption link is
         tappable there. On Instagram and TikTok it is not: the link in the
         caption is dead text, so the operator has to put it in their bio or a
         link sticker BY HAND -- and a link they cannot find in the portal
         cannot be pasted anywhere. These rows are that link, one per queued
         post, shown and copyable.

         Read back from short_links rather than parsed out of the caption we
         just sent: the table is the record, RLS already scopes it to this
         agency, and a caption is free text whose shape nothing guarantees. */
      var SHORT_HOST = 'https://www.synapsecore.dev';
      var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      /* vercel.json rewrites /s/:token to the edge function, so on any real
         deployment the short link lives on whatever host is already serving
         this page -- which keeps preview deployments working and never hands
         someone a link to an origin they are not on. Only localhost has no
         such rewrite, so only localhost falls back to the canonical host: the
         same rule auth.js applies to links that leave the browser. */
      function shortUrl(tok) {
        var o = location.origin;
        return (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|$)/i.test(o)
          ? SHORT_HOST : o) + '/s/' + tok;
      }

      /* One round trip for the whole batch, keyed on the post ids the RPC
         handed back. Returns the queue's order, not the database's: these are
         read against the posts the operator has just watched go out. */
      function loadShortLinks(head, posts) {
        var ids = posts.map(function (p) { return p.id; });
        if (!ids.length) return Promise.resolve([]);
        return fetch(SB_URL + '/rest/v1/short_links'
            + '?select=social_post_id,token'
            + '&social_post_id=in.(' + ids.join(',') + ')', { headers: head })
          .then(function (r) {
            if (!r.ok) return r.text().then(function (tx) { throw new Error(tx.slice(0, 160)); });
            return r.json();
          })
          .then(function (rowsIn) {
            var tokenFor = {};
            (rowsIn || []).forEach(function (row) { tokenFor[row.social_post_id] = row.token; });
            return posts.map(function (p) {
              return {
                platform: p.platform,
                url: tokenFor[p.id] ? shortUrl(tokenFor[p.id]) : '',
              };
            });
          });
      }

      /* THE TRACKED LINKS, as a pop-up. They were a block left under the
         campaign after publishing -- read once and then in the way. Shown once
         per publish, with a Copy on each, and gone when dismissed: they are
         about that moment, not a standing state, so the bell does not keep
         them. */
      function showLinks(links, problem) {
        var box = document.getElementById('cmpLinks');
        if (box) box.innerHTML = '';
        if (problem) {
          toast(problem + ' The posts are queued either way.');
          return;
        }
        var have = (links || []).filter(function (l) { return l.url; });
        var missing = (links || []).length - have.length;
        if (!have.length) {
          if (missing) toast('These posts came back without a tracked link. They still publish; their clicks cannot be traced.');
          return;
        }
        if (typeof showTasks !== 'function') return;
        showTasks([{
          id: 'links:' + Date.now(), once: true,
          title: have.length === 1 ? 'Your post\u2019s tracked link' : 'Your posts\u2019 tracked links',
          body: 'Each link records which channel a visitor came from, which is how a lead gets '
            + 'credited. Instagram and TikTok do not make caption links tappable \u2014 paste it into '
            + 'your bio or a Story link sticker.'
            + (missing ? ' ' + missing + ' of these posts came back without a link; they still '
              + 'publish, but their clicks cannot be traced.' : ''),
          copies: have.map(function (l) { return { label: CH_LABEL[l.platform] || l.platform, text: l.url }; }),
        }]);
      }

      /* Per-post outcomes, in the provider's own words. A failure that says
         "The account is not a professional account" is actionable; "failed" is
         not, and this is exactly where an agency goes looking. */
      function showResults(sum) {
        var box = document.getElementById('cmpResults');
        if (!box) return;
        var list = (sum.results || []);
        if (!list.length) { box.innerHTML = ''; return; }
        box.innerHTML = '<div class="cmp-res-hd">' + list.length + ' post'
          + (list.length === 1 ? '' : 's') + ' dispatched</div>'
          + list.map(function (r) {
              var good = r.status === 'published';
              return '<div class="cmp-res' + (good ? ' ok' : ' no') + '">'
                + '<span class="cmp-res-pl">' + esc(r.platform) + '</span>'
                + '<span class="cmp-res-st">' + esc(good ? (r.dryRun ? 'rehearsal' : 'published') : r.status) + '</span>'
                + '<span class="cmp-res-tx">' + esc(good ? (r.postId || '') : (r.error || '')) + '</span>'
                + '</div>';
            }).join('');
      }


      function ownListings() {
        // guarded exactly like the social pane does: this block runs in a later
        // script than the declaration, so tolerate it not existing yet.
        return (typeof LISTINGS_DATA !== 'undefined' && Array.isArray(LISTINGS_DATA)) ? LISTINGS_DATA : [];
      }

      /* The agency's brand, loaded once and handed to every generation so the
         copy signs itself, tags the agency's own handle, and the creatives are
         painted in their colours. Null until it resolves; generation still
         works unbranded rather than blocking on it. Hung off window: the social
         studio's own post composer (a separate IIFE further down) needs the
         same brand and would otherwise have no way to reach this scope's var. */
      window.BRAND = null;
      if (window.SynListings && SynListings.loadBrand) {
        SynListings.loadBrand().then(function (b) { window.BRAND = b || null; }).catch(function () {});
      }

      function buildPicker() {
        rows = ownListings()
          .filter(function (l) { return l.is_active !== false; })
          .map(function (l) {
            return {
              id: l.id, title: l.title || l.t, city: l.city,
              listing_type: l.listing_type, property_type: l.property_type,
              price: l.price, bedrooms: l.bedrooms, trust_score: l.trust_score,
              verification_status: l.verification_status, expires_at: l.expires_at,
              neighbourhood: l.neighbourhood || l.city,
              flood_risk: l.flood_risk, power_reliability: l.power_reliability,
            };
          });
        /* A DEAD BUTTON HAS TO LOOK DEAD.
           Generate's first line is `if (running || !rows.length) return`, so
           with nothing in the picker it was a fully-styled primary button that
           did nothing at all when pressed, and said nothing about why. The
           select underneath explained it, which is not where anybody looks
           after pressing a button. */
        go.disabled = !rows.length;
        go.style.opacity = rows.length ? '' : '.5';
        go.title = rows.length ? '' : 'Add a listing under Listings first';
        if (!rows.length) {
          sel.innerHTML = '<option value="">No active listings yet, add one under Listings first</option>';
          return;
        }
        sel.innerHTML = rows.map(function (r, i) {
          return '<option value="' + i + '">' + esc(r.title) + ' · ' + S.naira(r.price)
            + (r.listing_type === 'rent' ? '/yr' : '')
            + (r.verification_status === 'verified' ? '' : ' · not yet verified') + '</option>';
        }).join('');
      }

      buildPicker();
      // Listings change (hydrate from the database, create, edit, delete,
      // re-list) republishes this list so the two panes can never disagree.
      document.addEventListener('syn:listings', buildPicker);


      /* ── what was generated for this listing before ────────────────────
         Reads back what saveGeneration files. Loaded when the picker changes
         and again after a generation, so the list is never one press behind
         what the agency just did. */
      var PLAT_OF = {
        instagram_post: 'Instagram', instagram_reel: 'Instagram',
        tiktok_script: 'TikTok', youtube_short: 'YouTube',
        facebook_post: 'Facebook', whatsapp_message: 'WhatsApp',
        linkedin_post: 'LinkedIn', brochure_copy: 'Brochure', email_body: 'Email',
        x_post: 'X', telegram_post: 'Telegram',
      };

      function whenAgo(iso) {
        var t = new Date(iso).getTime();
        if (!t) return '';
        var mins = Math.round((Date.now() - t) / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + ' min ago';
        var hrs = Math.round(mins / 60);
        if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
        var days = Math.round(hrs / 24);
        if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
        return new Date(iso).toLocaleDateString();
      }

      function loadPast(propertyId) {
        var box = document.getElementById('cmpPast');
        if (!box) return;
        if (!propertyId || !window.SynListings || !SynListings.listGenerations) {
          box.innerHTML = ''; return;
        }
        SynListings.listGenerations(propertyId).then(function (rows) {
          if (!rows.length) { box.innerHTML = ''; return; }
          box.innerHTML =
            '<div class="cmp-past-h"><span class="k">Earlier versions</span>'
            + '<span class="n">' + rows.length + ' kept for this listing</span></div>'
            + '<div class="cmp-past-list">'
            + rows.map(function (r) {
                var long = String(r.generated_text || '').length > 190;
                return '<div class="cmp-old">'
                  + '<div class="cmp-old-top"><span class="pl">'
                  + esc(PLAT_OF[r.content_type] || r.content_type) + '</span>'
                  + '<span class="ang">' + esc(r.narrative_angle) + '</span>'
                  + '<span>' + esc(whenAgo(r.created_at)) + '</span></div>'
                  + '<div class="cmp-old-tx">' + esc(r.generated_text) + '</div>'
                  + (long ? '<button type="button" class="cmp-old-more">Show all</button>' : '')
                  + '</div>';
              }).join('')
            + '</div>';
        }).catch(function (err) {
          console.error('could not read earlier versions', err);
          box.innerHTML = '<div class="cmp-past-h"><span class="k">Earlier versions</span>'
            + '<span class="n">Could not load them \u2014 refresh to try again.</span></div>';
        });
      }

      document.getElementById('cmpPast').addEventListener('click', function (e) {
        var b = e.target.closest('.cmp-old-more');
        if (!b) return;
        var card = b.closest('.cmp-old');
        var open = card.classList.toggle('open');
        b.textContent = open ? 'Show less' : 'Show all';
      });

      /* Picking a different listing changes which archive is being looked at. */
      sel.addEventListener('change', function () {
        var row = rows[+sel.value || 0];
        loadPast(row && row.id);
      });

      /* THE TEMPLATE EDITOR WAS HERE, and the pattern engine it authored for.

         It existed to let an agency write "{priceLine} in {area}" and have it
         filled per listing -- which is a real idea, and the wrong one once the
         button beside it started calling a model. A pattern can substitute
         values into a sentence somebody already wrote; it cannot notice that
         this listing has a service charge worth leading on, or that the
         honest thing to say about an unverified home is that it is unverified.
         Generate produces different copy every press now, and a template
         produces the same sentence forever, which is the complaint that
         started this.

         So it is gone rather than improved: the editor, its live preview, the
         token chips, save-as-template, the brand-page gallery, and the
         {token} engine underneath them in syndication.js.

         content_templates is NOT dropped. The five seeded rows and anything an
         agency wrote are still there, and a deleted table is the one mistake
         that cannot be walked back. Nothing reads it any more. */

      loadChannels();      /* Whatever the picker starts on. Without this the archive only appears
         after you change listing, which reads as it being empty. */
      document.addEventListener('syn:listings', function () {
        var row = rows[+sel.value || 0];
        if (row) loadPast(row.id);
      });

      /* Closing throws away the VIEW, never the work. Every generation is
         filed by saveGeneration the moment it is made, so what disappears
         here is on screen only -- it is still in Earlier versions below, and
         the comment on that save says why: the common next action is 'close
         this and come back'. */
      function dismiss() {
        campaign = null;
        out.hidden = true;
        out.innerHTML = '';
        if (go && go.scrollIntoView) go.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }

      /* Escape is what people already press to get out of something. */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !out.hidden) dismiss();
      });

      /* MINIMISED STAYS MINIMISED. Somebody who has finished generating for
         the day wants the pipeline at the top of the pane, and having to
         collapse this card on every visit would be a worse version of the
         same complaint. Per-browser, not per-account: it is a view
         preference, not data. */
      (function minimise() {
        var panel = document.getElementById('cmpGenPanel');
        var btn = document.getElementById('cmpMin');
        if (!panel || !btn) return;
        var KEY = 'syn_cmp_collapsed';
        function set(on) {
          panel.classList.toggle('collapsed', on);
          btn.setAttribute('aria-expanded', String(!on));
          btn.querySelector('.lbl').textContent = on ? 'Open' : 'Minimise';
          btn.setAttribute('aria-label', on ? 'Open the campaign generator' : 'Minimise the campaign generator');
        }
        var saved = false;
        try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
        set(saved);
        btn.addEventListener('click', function () {
          var on = !panel.classList.contains('collapsed');
          set(on);
          try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
        });
        /* Generating is a reason to be open. Pressing Generate from a
           collapsed card would otherwise put the result somewhere invisible. */
        var g = document.getElementById('cmpGo');
        if (g) g.addEventListener('click', function () {
          if (panel.classList.contains('collapsed')) {
            set(false);
            try { localStorage.setItem(KEY, '0'); } catch (e) {}
          }
        });
      })();

      go.addEventListener('click', function () {
        /* Every one of these used to be a silent return. A press that produces
           neither output nor an explanation is indistinguishable from a broken
           button, and that is what was reported. */
        if (running) { toastOrAlert('Still working on the last one \u2014 one moment.'); return; }
        if (!rows.length) { toastOrAlert('No active listings yet \u2014 add one under Listings first.'); return; }
        var row = rows[+sel.value || 0];
        if (!row) { toastOrAlert('Pick a listing first.'); sel.focus(); return; }

        /* THIS BUTTON NOW CALLS THE MODEL.
           It used to call S.generate(), which renders TEMPLATES: same listing
           in, same words out, every single time. Pressing Generate twice gave
           the same campaign twice and reloading gave it again, because there
           is no model and no randomness anywhere in that path. Reported as
           "it's just repeating the same things, it's not connected to any AI"
           -- which was exactly right. It never was.

           social-generate has been writing the composer's captions all along:
           a real call, one distinct angle dealt per channel, and a standing
           refusal to invent a fact the listing does not contain. The campaign
           panel simply was not using it. usedAngles goes with the request so a
           second press moves to different subjects instead of re-rolling the
           same ones.

           Everything after this is unchanged -- platform limits, the media
           pairing, the ready/needs-attention counts, queueing -- because
           aiCampaign returns the shape render() already knows. */
        var was = go.innerHTML;
        running = true;
        go.disabled = true;
        go.innerHTML = '<span class="spin2"></span>Writing\u2026';

        /* The SESSION token, not the anon key. social-generate now resolves
           the caller to an agency and checks whether their plan includes AI
           captions -- with the anon key it cannot tell who is asking, and it
           was also answering anyone who found the URL. */
        token().then(function (t) {
        return fetch(SB_URL + '/functions/v1/social-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SB_KEY,
                     Authorization: 'Bearer ' + (t || SB_KEY) },
          body: JSON.stringify({
            /* Same again: `row` here is buildPicker's thirteen-field
               projection, which has no charges, no amenities and no title
               type. */
            property: fullListing(row && row.id) || row,
            channels: pickedPlats(),
            usedAngles: (typeof anglesUsedFor === 'function' ? anglesUsedFor(row.id) : []),
            brand: window.BRAND ? {
              name: window.BRAND.name || null,
              tagline: window.BRAND.tagline || null,
              voice: window.BRAND.brand_voice || null,
              handle: (window.BRAND.social && window.BRAND.social.instagram) || null,
            } : null,
          }),
        }).then(function (r) {
          return r.json().catch(function () { return {}; });
        }).then(function (d) {
          if (!d || d.error || !d.captions) {
            throw new Error((d && d.error) || 'The writer did not return anything usable.');
          }
          campaign = S.aiCampaign(row, d, { brand: window.BRAND });
          var wanted = pickedPlats();
          campaign.variants = campaign.variants.filter(function (v) { return wanted.indexOf(v.platform) > -1; });
          if (!campaign.variants.length) throw new Error('Nothing came back for those channels.');
          /* Spent, so the next press starts somewhere else. */
          if (typeof rememberAngles === 'function') {
            rememberAngles(row.id, Object.keys(d.angles || {}).map(function (k) { return d.angles[k]; }));
          }
          render();
          archive(row);
        }).catch(function (err) {
          console.error('generate failed', err);
          toastOrAlert((err && err.message) || 'Could not write those just now.');
        }).then(function () {
          running = false; go.disabled = false; go.innerHTML = was;
        });
        });   /* closes token().then -- the fetch chain is returned from it */
      });

      /* Filing what was just written. Split out of the handler so the success
         path above reads as one sequence; the behaviour is unchanged. */
      function archive(row) {

        /* Keep it. Generating used to leave nothing behind -- these captions
           lived in the tab and died with it. Saved before the agency decides
           anything, because the decision is often "close this and come back",
           and that used to be the one action that destroyed the work.

           Deliberately not awaited: the screen is already correct, and a save
           that is still in flight must not hold up reading it. A failure is
           reported quietly -- it costs the archive, never what is on screen. */
        if (window.SynListings && SynListings.saveGeneration) {
          SynListings.saveGeneration(row.id, campaign.variants)
            .then(function (res) {
              /* Report zero too. A silent nothing is how the uuid regression
                 hid: twenty captions generated, none kept, and the line that
                 should have said so simply did not appear. */
              if (res && res.saved) markSaved(res.saved);
              else markSaved(0, 'nothing could be filed');
              loadPast(row.id);          // the list must include what just happened
              /* Those rows are the review queue. Without this the captions are
                 filed and the pipeline still says nothing is awaiting review
                 until the page is reloaded -- which is exactly the "I clicked
                 approve and nothing happened" report. */
              if (typeof loadPipeline === 'function') loadPipeline();
            })
            .catch(function (err) {
              console.error('could not archive this generation', err);
              markSaved(0, (err && err.message) || 'not saved');
            });
        }
      }

      function render() {
        var ok = campaign.variants.filter(function (v) { return !v.issues.length; });
        var bad = campaign.variants.length - ok.length;
        // Count the angles actually used, not the catalogue, an unverified
        // listing legitimately generates fewer, and saying "5 angles" over four
        // of them is the small kind of untrue this product cannot afford.
        var used = {};
        campaign.variants.forEach(function (v) { used[v.angle || (v.angleId || '')] = 1; });
        var angleCount = Object.keys(used).length || campaign.variants.length;
        var skipped = campaign.skipped || [];
        // Creatives carry the agency's identity, not Synapse's. Falls back to
        // the app's own ink when no brand colour has been set, never a
        // stand-in colour pretending to be theirs.
        var B = campaign.brand || {};
        var brandBar = B.isSet
          ? '<div class="cmp-brandbar" style="border-left-color:' + esc(B.color || '#121212') + '">'
            + (B.logo ? '<img src="' + esc(B.logo) + '" alt="" onerror="this.remove()">' : '')
            + '<span class="bb-nm"' + (B.font ? ' style="font-family:' + esc(B.font) + '"' : '') + '>'
            + esc(B.name || 'Your agency') + '</span>'
            + (B.tagline ? '<span class="bb-tag">' + esc(B.tagline) + '</span>' : '')
            + (B.colorAlt ? '<span class="bb-dot" style="background:' + esc(B.colorAlt) + '"></span>' : '')
            + '<span class="bb-note">Every caption below signs off as you</span>'
            + '</div>'
          : '<div class="cmp-brandbar plain"><span class="bb-note">No brand set, '
            + 'these post unsigned. Add your name, colours and voice under <b>Team → Brand</b>.</span></div>';
        /* A WAY OUT, AND IT STAYS ON SCREEN.
           Generating replaced this panel with several screens of cards and
           left no way back: no cancel, no close, nothing to press but the
           thing that made more of it. And because the output is long, a
           control at the bottom would be a control you have to scroll to
           find. So the bar sticks to the top of the output -- however far
           down the cards you are, the exit is in the same place.

           It also names what you are looking at. Six platform sections with
           no heading gave no clue which listing they belonged to, which
           matters when the picker above is still showing something else. */
        var sumHtml = brandBar + '<div class="cmp-sum">'
          + '<span><b>' + campaign.variants.length + '</b> drafts</span>'
          + '<span><b>' + angleCount + '</b> angles</span>'
          + '<span class="g"><b>' + ok.length + '</b> ready</span>'
          + (bad ? '<span class="r"><b>' + bad + '</b> to fix</span>' : '')
          + '</div>'
          + (skipped.length
            ? '<div class="muted" style="font-size:12.5px;margin:-4px 0 12px">'
              + skipped.map(function (s) { return esc(s.name); }).join(', ')
              + (skipped.length === 1 ? ' is' : ' are') + ' unavailable until this listing is verified, '
              + 'those angles claim the seven checks passed.</div>'
            : '');

        /* ONE CHANNEL AT A TIME.
           Five platforms times six angles is thirty cards, and they were
           stacked in a single column under each other -- so the answer to
           "what did it write for Instagram" was somewhere in a page and a
           half of scrolling, and comparing two channels meant remembering
           the first one. Nobody posts to five channels in one sitting; they
           work through one, then the next.

           So the platforms become tabs in the sticky bar. Same cards, same
           order, one channel visible. The tab carries its own count and
           flags how many of its drafts need attention, so nothing hides
           behind a tab you have not opened. */
        var platHtml = '', tabs = '', firstPlat = null;
        Object.keys(S.PLATFORMS).forEach(function (pl) {
          var spec = S.PLATFORMS[pl];
          var vs = campaign.variants.filter(function (v) { return v.platform === pl; });
          if (!vs.length) return;
          if (!firstPlat) firstPlat = pl;
          var nBad = vs.filter(function (v) { return v.issues.length; }).length;
          tabs += '<button type="button" class="cmp-tab" data-plat="' + pl + '">'
            + '<span class="ic">'
            + ((window.SynIcons && SynIcons.brand && SynIcons.brand(pl, { size: 14 })) || esc(spec.short))
            + '</span>' + esc(spec.label)
            + '<span class="n">' + vs.length + '</span>'
            + (nBad ? '<span class="bad" title="' + nBad + ' need attention">' + nBad + '</span>' : '')
            + '</button>';
          platHtml += '<div class="cmp-plat" data-plat="' + pl + '" hidden><div class="cmp-grid">'
            + vs.map(function (v) {
                var bodyOnly = v.caption.split('\n\n').slice(1).join('\n\n');
                return '<div class="cmp-card v2' + (v.issues.length ? ' bad' : '') + '" title="' + esc(v.angleWhy) + '">'
                  + '<div class="cv2-top"><span class="cv2-angle">' + esc(v.angleName) + '</span>'
                  + (v.issues.length
                      ? '<span class="cv2-st no" title="' + esc(v.issues.join(' \u00b7 ')) + '"><i></i>Fix</span>'
                      : '<span class="cv2-st ok"><i></i>Ready</span>') + '</div>'
                  + '<div class="cmp-hook">' + esc(v.hook) + '</div>'
                  + '<div class="cmp-body">' + esc(bodyOnly) + '</div>'
                  /* PREVIEW ONLY. NEVER PAYLOAD. The caption that goes out is not the caption above:
                     queue_social_post appends a tracked short link to it server-side. That is now one small chip
                     (the full sentence is its tooltip) instead of a paragraph on every card; it is drawn here, from
                     a constant, and never written back onto the variant, so it cannot reach a real account. */
                  + '<div class="cv2-foot">'
                  + '<span class="cv2-chip" title="A tracked synapsecore.dev short link is added to this caption when it is queued">'
                  + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/></svg>'
                  + '<span class="sr-only">A tracked synapsecore.dev short link is added when it is queued. </span>' + esc(LINK_PREVIEW) + '</span>'
                  + '<span class="cv2-chip">' + (v.media ? esc(v.media.label) + (v.ratio ? ' \u00b7 ' + esc(v.ratio) : '') : 'No picture') + '</span>'
                  + '</div>'
                  + (v.issues.length ? '<div class="cv2-why">' + esc(v.issues[0]) + '</div>' : '')
                  + '</div>';
              }).join('')
            + '</div></div>';
        });

        var html = '<div class="cmp-out-hd">'
          + '<div class="cmp-out-top">'
          + '<div class="cmp-out-ttl">' + esc((campaign.property && campaign.property.title) || 'This listing')
          + '<span>' + campaign.variants.length + ' drafts</span></div>'
          + '<button type="button" class="cmp-out-x" id="cmpDismiss">Close</button>'
          + '</div>'
          + (tabs ? '<div class="cmp-tabs" role="tablist">' + tabs + '</div>' : '')
          + '</div>'
          + sumHtml
          + platHtml;

        /* Two buttons, never one that changes meaning. A rehearsal and a real
           send are different acts, and a single button whose behaviour depends
           on state elsewhere on the page is how someone publishes by accident. */
        var live = liveCount();
        var sendable = campaign.variants.filter(function (v) {
          return !v.issues.length && CONNECTABLE[v.platform] && connectedTo(v.platform)
            && !expired(connectedTo(v.platform));
        }).length;

        html += '<div class="cmp-run">'
          + '<button class="btn" id="cmpRun" style="padding:11px 18px;font-size:13.5px">Rehearse (' + ok.length + ')</button>'
          + (live
              ? '<button class="btn btn-primary" id="cmpLive" style="padding:11px 18px;font-size:13.5px"'
                + (sendable ? '' : ' disabled') + '>Publish for real'
                + (sendable ? ' (' + sendable + ')' : '') + '</button>'
              : '')
          + '<div class="cmp-bar"><i id="cmpBar"></i></div>'
          + '<span id="cmpStat" style="font-size:12.5px;color:var(--ink-muted);min-width:120px"></span>'
          + '</div>'
          + '<div id="cmpLinks"></div>'
          + '<div id="cmpResults"></div>'
          + (live
              ? '<p class="cmp-note"><b>' + live + ' channel' + (live === 1 ? '' : 's') + ' connected.</b> '
                + '<b>Publish for real</b> writes each post to the queue and then sends it, it is public and cannot be undone from here. '
                + '<b>Rehearse</b> runs the same validation and shows what would go, without touching an account.'
                + (sendable ? '' : ' Nothing in this campaign targets a connected channel yet.')
                + '</p>'
              : '<p class="cmp-note"><b>Rehearsal only.</b> No account is connected, so this validates and shows exactly what would be sent without touching a real one. '
                + 'Connect Instagram or Facebook above to publish for real. Tokens live in Supabase Vault, never in this page.</p>');

        html += '<div class="cmp-saved" id="cmpSaved"></div>';

        out.hidden = false;
        out.innerHTML = html;
        document.getElementById('cmpDismiss').addEventListener('click', dismiss);

        /* Delegated, because the strip is rebuilt on every generation. */
        var tabBar = out.querySelector('.cmp-tabs');
        function showPlat(pl) {
          out.querySelectorAll('.cmp-plat').forEach(function (p) {
            p.hidden = p.getAttribute('data-plat') !== pl;
          });
          out.querySelectorAll('.cmp-tab').forEach(function (t) {
            var on = t.getAttribute('data-plat') === pl;
            t.classList.toggle('on', on);
            t.setAttribute('aria-selected', String(on));
          });
        }
        if (tabBar) {
          tabBar.addEventListener('click', function (e) {
            var t = e.target.closest('.cmp-tab');
            if (t) showPlat(t.getAttribute('data-plat'));
          });
          if (firstPlat) showPlat(firstPlat);
        }

        document.getElementById('cmpRun').addEventListener('click', run);
        var liveBtn = document.getElementById('cmpLive');
        if (liveBtn) liveBtn.addEventListener('click', publishLive);
      }

      /* Says what happened to the work, once, without a toast the agency has
         to catch. Silence would be worse: "did that save?" is exactly the
         question this feature exists to answer. */
      function markSaved(n, problem) {
        var el = document.getElementById('cmpSaved');
        if (!el) return;
        el.className = 'cmp-saved' + (problem ? ' bad' : '');
        el.textContent = problem
          ? 'Kept on screen only \u2014 ' + problem
          : n + ' version' + (n === 1 ? '' : 's') + ' saved to this listing.';
      }

      function run() {
        if (running || !campaign) return;
        running = true;
        var btn = document.getElementById('cmpRun');
        var bar = document.getElementById('cmpBar');
        var stat = document.getElementById('cmpStat');
        btn.disabled = true; btn.textContent = 'Rehearsing…';

        var q = S.createQueue({ mode: 'dry', concurrency: 3 });
        q.add(campaign.variants);
        q.onChange(function (items, sum) {
          var done = sum.published + sum.failed + sum.skipped;
          bar.style.width = Math.round((done / Math.max(1, sum.total)) * 100) + '%';
          stat.textContent = sum.published + ' sent · ' + sum.skipped + ' skipped'
            + (sum.failed ? ' · ' + sum.failed + ' failed' : '');
        });
        q.run().then(function (sum) {
          running = false;
          btn.disabled = false;
          btn.textContent = 'Rehearse again';
          stat.textContent = sum.published + ' would publish · ' + sum.skipped + ' skipped'
            + (sum.failed ? ' · ' + sum.failed + ' failed' : '');
        });
      }
    })();

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
  