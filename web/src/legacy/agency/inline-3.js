
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

    // edit / create in the shared drawer
    function listingForm(l, idx, sd) {
      const isNew = idx === -1;
      /* A new listing opens on the one left unsaved, if there is one. `l`
         carries it too because the gallery seeds its photos from l.media. A draft opened from
         the shelf (`sd`) is the server's copy and carries the step it was left on. */
      const draft = isNew
        ? (sd ? { data: sd.data || {}, floor: sd.floor || null, at: Date.parse(sd.updated_at) || Date.now(), step: sd.step } : readListingDraft())
        : null;
      if (isNew) SD.cur = sd ? sd.id : (SD.cur && SD.list.some((d) => d.id === SD.cur) && readListingDraft() ? SD.cur : null);
      let wzStep = (draft && draft.step) || 1;
      if (draft) l = Object.assign({}, l, draft.data);
      const d = isNew ? Object.assign(blankListing(), draft ? draft.data : {}) : l;
      const esc = s => String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const opt = (arr, cur, lbl) => arr.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${lbl[v] || v}</option>`).join('');
      const primary = listingCover(d.media) || '';
      const vLabel = d.verification_status === 'verified' ? '✓ Verified'
        : d.verification_status === 'in_progress' ? '◷ In progress' : 'Unverified · enters the 7-check queue';
      drawer.innerHTML = `
        <button class="x" aria-label="Close">×</button>
        <div style="font-size:19px;font-weight:700">${isNew ? 'New listing' : 'Edit listing'}</div>
        <p class="muted" style="font-size:12px;margin:6px 0 12px">Complete every required field (<b style="color:var(--brand-text)">*</b>) so Tayo can match this property accurately. ${isNew ? 'New listings enter the 7-check verification queue.' : 'Edits must keep the listing complete.'}</p>
        ${draft ? `<div class="lf-restored" role="status"><span>Picking up the listing you had not saved, from ${draftAgo(draft.at)}.</span>
          <button type="button" class="lf-linkbtn" id="lfDraftFresh">Start a blank one</button></div>` : ''}
        <div class="lf">
          <fieldset class="lf-sec"><legend>Basics</legend>
            <div class="field"><label>Title *</label><input id="lfTitle" value="${esc(d.title)}" placeholder="3-Bed Apartment, Lekki Phase 1"><span class="ferr" id="e_title" role="alert"></span></div>
            <div class="row2">
              <div class="field"><label>Property type *</label><select id="lfType">${opt(PROP_TYPES, d.property_type, TYPE_LABEL)}</select></div>
              <div class="field"><label>The deal *</label><select id="lfDeal">${opt(DEAL_STRUCTURES, d.deal_structure || ({ rent: 'rent', shortlet: 'shortlet' })[d.listing_type] || 'outright', DEAL_STRUCTURE_LABEL)}</select>
                <select id="lfListing" hidden aria-hidden="true" tabindex="-1">${opt(LISTING_TYPES, d.listing_type, DEAL_LABEL)}</select></div>
            </div>
            <div class="field"><label>Description *</label><textarea id="lfDesc" rows="3" placeholder="Condition, layout, neighbourhood, what's included…">${esc(d.description)}</textarea><span class="ferr" id="e_desc" role="alert"></span>
              <button type="button" class="lf-fill" id="lfFill">Fill the form from my description</button>
              <span class="lf-hint" id="lfFillNote">Paste or type everything you know, then press this: the price, rooms, units, payment terms and more go into their boxes for you to check.</span></div>
          </fieldset>
          <!-- THE DEAL (Eden, 2026-10-02). What used to live in the
               description -- built or not, instalments, how many units,
               investment terms -- as fields buyers can filter on, cards can
               show and Tayo can reason about. Rows appear for the deal chosen. -->
          <fieldset class="lf-sec" id="lfDealSec"><legend>The deal</legend>
            <div class="row2">
              <div class="field"><label>Units available *</label><input id="lfUnits" type="number" inputmode="numeric" min="1" max="10000" value="${esc(d.units_available || 1)}"><span class="lf-hint">Identical units or plots on this listing.</span><span class="ferr" id="e_units" role="alert"></span></div>
              <div class="field" data-deal-row="stage"><label>Is it built?</label>
                <select id="lfStage">
                  <option value="completed" ${d.build_stage === 'completed' || !d.build_stage ? 'selected' : ''}>Completed, ready now</option>
                  <option value="under_construction" ${d.build_stage === 'under_construction' ? 'selected' : ''}>Under construction</option>
                  <option value="not_started" ${d.build_stage === 'not_started' ? 'selected' : ''}>Not started yet (off-plan)</option>
                </select></div>
            </div>
            <div class="row2" data-deal-row="build">
              <div class="field"><label>Expected handover</label><input id="lfHandover" type="month" value="${esc((d.handover_date || '').slice(0, 7))}"></div>
              <div class="field"><label>Built so far (%)</label><input id="lfProgress" type="number" inputmode="numeric" min="0" max="100" value="${esc(d.build_progress_pct)}" placeholder="40"></div>
            </div>
            <div class="row2" data-deal-row="pay">
              <div class="field"><label>Payment</label>
                <select id="lfPlan">
                  <option value="outright" ${d.payment_plan !== 'instalments' ? 'selected' : ''}>Outright</option>
                  <option value="instalments" ${d.payment_plan === 'instalments' ? 'selected' : ''}>Instalments allowed</option>
                </select></div>
              <div class="field" data-deal-row="inst"><label>Initial deposit (%)</label><input id="lfDeposit" type="number" inputmode="decimal" min="0" max="100" value="${esc(d.deposit_pct)}" placeholder="30"></div>
            </div>
            <div class="row2" data-deal-row="inst">
              <div class="field"><label>Spread over (months)</label><input id="lfMonths" type="number" inputmode="numeric" min="1" max="240" value="${esc(d.instalment_months)}" placeholder="12"></div>
              <div></div>
            </div>
            <div class="row2" data-deal-row="land">
              <div class="field"><label>Number of plots</label><input id="lfPlots" type="number" inputmode="decimal" min="0" step="any" value="${esc(d.plot_count)}" placeholder="1"></div>
              <div class="field"><label>Size of one plot (sqm)</label><input id="lfPlotSize" type="number" inputmode="decimal" min="0" step="any" value="${esc(d.plot_size_sqm)}" placeholder="600"></div>
            </div>
            <div data-deal-row="invest">
              <div class="row2">
                <div class="field"><label>Minimum investment (₦)</label><input id="lfMinInv" type="number" inputmode="numeric" min="0" value="${esc(d.min_investment)}"></div>
                <div class="field"><label>Term (months)</label><input id="lfTerm" type="number" inputmode="numeric" min="1" max="600" value="${esc(d.investment_term_months)}" placeholder="24"></div>
              </div>
              <div class="field"><label>Return you state (% over the term)</label><input id="lfReturn" type="number" inputmode="decimal" min="0" step="any" value="${esc(d.stated_return_pct)}"><span class="lf-hint">Shown to buyers as stated by your agency. Synapse does not forecast returns.</span></div>
            </div>
          </fieldset>
          <fieldset class="lf-sec"><legend>Location</legend>
            <div class="field"><label>Address *</label><input id="lfAddr" value="${esc(d.address)}" placeholder="Street / estate"><span class="ferr" id="e_addr" role="alert"></span></div>
            <!-- State first, because it decides the other two. It is a real
                 select: there are 36 states and the FCT, that list does not
                 change, and anything outside it is a mistake worth refusing.
                 City and area stay inputs with a suggestion list, Nigeria has
                 thousands of towns, and blocking a listing in one we forgot is
                 a worse failure than an inconsistent spelling. -->
            <div class="row2">
              <div class="field"><label>State *</label>
                <select id="lfState"><option value="">- Select a state -</option></select>
                <span class="ferr" id="e_state" role="alert"></span></div>
              <div class="field"><label>City *</label>
                <div class="combo" id="lfCityCombo">
                  <input id="lfCity" value="${esc(d.city)}" autocomplete="off"
                         role="combobox" aria-expanded="false" aria-autocomplete="list"
                         placeholder="Start typing or tap…">
                  <button type="button" class="combo-toggle" tabindex="-1" aria-label="Show cities">▾</button>
                  <div class="combo-list" role="listbox" hidden></div>
                </div>
                <span class="ferr" id="e_city" role="alert"></span></div>
            </div>
            <div class="row2">
              <div class="field"><label>Neighbourhood</label>
                <div class="combo" id="lfHoodCombo">
                  <input id="lfHood" value="${esc(d.neighbourhood)}" autocomplete="off" maxlength="40"
                         role="combobox" aria-expanded="false" aria-autocomplete="list"
                         placeholder="Start typing or tap…">
                  <button type="button" class="combo-toggle" tabindex="-1" aria-label="Show areas">▾</button>
                  <div class="combo-list" role="listbox" hidden></div>
                </div>
                <div class="lf-hint" id="lfHoodHint"></div></div>
              <div class="field"><label>Country *</label><select id="lfCountry"><option ${d.country === 'Nigeria' ? 'selected' : ''}>Nigeria</option></select></div>
            </div>
            <!-- Latitude and longitude were two number fields on the form an
                 agency fills to post its first property. Nobody selling a house
                 knows its coordinates, and the pair was optional, so the honest
                 outcome was that most listings simply had none, no map pin, no
                 proximity matching. They are looked up from the address now and
                 kept here, so the save path below is unchanged. -->
            <input type="hidden" id="lfLat" value="${esc(d.latitude)}">
            <input type="hidden" id="lfLng" value="${esc(d.longitude)}">
            <span class="ferr" id="e_lat" role="alert"></span>
            <p class="lf-hint" id="lfGeoNote">The map pin is found from the address. Tap the map to move it.</p>
            <!-- THE PIN IS REQUIRED (Eden, 2026-10-02: "in Nigeria every
                 property has an address ... let that be a requirement"). The
                 address lookup places it when it can; the agent can always
                 tap or drag it, or use where they are standing. -->
            <div class="lf-pinmap" id="lfPinMap" aria-label="Map: tap to place the listing's pin"></div>
            <button type="button" class="lf-linkbtn" id="lfHere">I'm at the property: use my location</button>
          </fieldset>
          <fieldset class="lf-sec"><legend>Specifications</legend>
            <div class="row2">
              <div class="field"><label id="lbBeds">Bedrooms *</label><input id="lfBeds" type="number" inputmode="numeric" min="0" max="20" value="${esc(d.bedrooms)}" placeholder="3"><span class="ferr" id="e_beds" role="alert"></span></div>
              <div class="field"><label>Bathrooms</label><input id="lfBaths" type="number" inputmode="numeric" min="0" max="20" value="${esc(d.bathrooms)}" placeholder="3"></div>
            </div>
            <div class="row2">
              <div class="field"><label>Toilets</label><input id="lfToilets" type="number" inputmode="numeric" min="0" max="20" value="${esc(d.toilets)}" placeholder="4"></div>
              <div class="field"><label>Parking spaces</label><input id="lfParking" type="number" inputmode="numeric" min="0" max="50" value="${esc(d.parking_spaces)}" placeholder="2"></div>
            </div>
            <div class="field"><label>Area (sqm)</label><input id="lfArea" type="number" inputmode="decimal" min="0" step="any" value="${esc(d.area_sqm)}" placeholder="220"></div>
            <div class="row2">
              <div class="field"><label>Year built</label><input id="lfYear" type="number" inputmode="numeric" min="1900" max="2100" value="${esc(d.year_built)}" placeholder="2021"></div>
              <div class="field"><label>Furnishing</label>
                <select id="lfFurnished">
                  <option value="">Not stated</option>
                  <option value="unfurnished"${d.furnished === 'unfurnished' ? ' selected' : ''}>Unfurnished</option>
                  <option value="semi"${d.furnished === 'semi' ? ' selected' : ''}>Semi-furnished</option>
                  <option value="fully"${d.furnished === 'fully' ? ' selected' : ''}>Fully furnished</option>
                </select></div>
            </div>
            <!-- Bands are a NERC commitment, not an opinion about the
                 area: A is at least 20 hours a day, E at least 4. The hours
                 are in the labels so this is a choice about supply rather
                 than a memory test about letters, and nothing is preselected
                 because guessing one would invent a commitment on a disco's
                 behalf. -->
            <div class="field"><label>Electricity band</label>
              <select id="lfBand">
                <option value="">Not stated</option>
                <option value="A"${d.electricity_band === 'A' ? ' selected' : ''}>Band A &#183; 20+ hrs/day</option>
                <option value="B"${d.electricity_band === 'B' ? ' selected' : ''}>Band B &#183; 16+ hrs/day</option>
                <option value="C"${d.electricity_band === 'C' ? ' selected' : ''}>Band C &#183; 12+ hrs/day</option>
                <option value="D"${d.electricity_band === 'D' ? ' selected' : ''}>Band D &#183; 8+ hrs/day</option>
                <option value="E"${d.electricity_band === 'E' ? ' selected' : ''}>Band E &#183; 4+ hrs/day</option>
              </select></div>
            <div class="field"><label>Condition</label>
              <select id="lfCondition">
                <option value="">Not stated</option>
                <option value="brand_new"${d.property_condition === 'brand_new' ? ' selected' : ''}>Brand new</option>
                <option value="excellent"${d.property_condition === 'excellent' ? ' selected' : ''}>Excellent</option>
                <option value="good"${d.property_condition === 'good' ? ' selected' : ''}>Good</option>
                <option value="fair"${d.property_condition === 'fair' ? ' selected' : ''}>Fair</option>
                <option value="needs_work"${d.property_condition === 'needs_work' ? ' selected' : ''}>Needs work</option>
              </select></div>
            <div class="field amen" id="amenHost">
              <label for="amenIn">Amenities</label>
              <div class="amen-box" id="amenBox">
                <input id="amenIn" class="amen-in" type="text" role="combobox"
                       aria-expanded="false" aria-controls="amenMenu" aria-autocomplete="list"
                       autocomplete="off" placeholder="Search amenities&#8230;">
              </div>
              <div class="amen-menu" id="amenMenu" role="listbox" aria-label="Amenities"></div>
              <!-- The canonical value. The save reads this and splits it, so
                   the write path never learned about any of the above. -->
              <input type="hidden" id="lfAmen" value="${esc((d.amenities || []).join(', '))}">
              <p class="lf-hint">Pick from the list, or type your own and press Enter.</p>
            </div>
          </fieldset>
          <fieldset class="lf-sec"><legend>Pricing</legend>
            <div class="row2">
              <div class="field"><label>Price (₦) *</label><input id="lfPrice" type="number" inputmode="numeric" min="1" value="${esc(d.price)}" placeholder="165000000"><span class="ferr" id="e_price" role="alert"></span><span class="lf-echo" id="priceEcho"></span></div>
              <div class="field"><label>Price period *</label><select id="lfPeriod">${opt(PRICE_PERIODS, d.price_period, PERIOD_LABEL)}</select></div>
            </div>
            <div class="row2">
              <div class="field"><label>Move-in cost (₦)</label><input id="lfMoveIn" type="number" inputmode="numeric" min="0" value="${esc(d.move_in_cost)}" placeholder="optional"></div>
              <div class="field"><label>Service charge (₦/yr)</label><input id="lfService" type="number" inputmode="numeric" min="0" value="${esc(d.service_charge)}" placeholder="optional"></div>
            </div>
            <!-- The two charges a Nigerian tenant is most reliably surprised
                 by, and until now the card had nowhere to show them: its cost
                 note literally ended "any agency fee are separate and not shown
                 here". Commonly 5-10% of the annual rent each.

                 Blank and zero are different answers and are stored that way.
                 Blank means the agency has not said; the card names it as not
                 stated rather than implying there is no fee. Zero means there
                 genuinely is none, and the card says so, which is worth
                 advertising.

                 These stay off social captions by design -- the caption
                 allowlist in social-generate does not carry them. A post is an
                 invitation; a fee schedule belongs where there is room to show
                 what it is attached to. -->
            <div class="row2">
              <div class="field"><label>Agency fee (₦)</label><input id="lfAgencyFee" type="number" inputmode="numeric" min="0" value="${esc(d.agency_fee)}" placeholder="optional"></div>
              <div class="field"><label>Legal fee (₦)</label><input id="lfLegalFee" type="number" inputmode="numeric" min="0" value="${esc(d.legal_fee)}" placeholder="optional"></div>
            </div>
            <p class="lf-hint">Shown to buyers in the cost breakdown on the listing page. Left blank, the listing says the fee has not been stated. Never used in social captions.</p>
          </fieldset>
          <!-- ── what Tayo may agree to ──────────────────────────────────
               Lives with the listing because it is a fact about the listing,
               not about the negotiator. The Negotiator pane says as much.

               Never shown to a buyer and never sent to one: the table has no
               policy a consumer can satisfy, and the only function Tayo calls
               answers yes or no rather than returning the figure. -->
          <fieldset class="lf-sec"><legend>Negotiation</legend>
            <div class="row2">
              <div class="field"><label>Tayo&#39;s floor (₦)</label>
                <input id="lfFloor" type="number" inputmode="numeric" min="1" placeholder="No floor set">
                <span class="ferr" id="e_floor" role="alert"></span></div>
              <div class="field"><label>Negotiation</label>
                <select id="lfFloorActive">
                  <option value="on">Tayo may negotiate down to the floor</option>
                  <option value="off">Tayo may not negotiate this listing</option>
                </select></div>
            </div>
            <p class="muted" style="font-size:11.5px;margin:2px 0 0">
              The lowest Tayo will agree to. An offer under it stops the
              negotiation and messages the assigned agent instead. Buyers never
              see this figure. Only an owner or admin can set it.
            </p>
          </fieldset>
          <fieldset class="lf-sec"><legend>Trust &amp; documents</legend>
            <div class="row2">
              <div class="field"><label>Title document</label><select id="lfTitleType"><option value="">- Select -</option>${opt(TITLE_TYPES, d.title_type || '', TITLE_LABEL)}</select></div>
              <div class="field"><label>Gross yield (%)</label><input id="lfYield" type="number" inputmode="decimal" min="0" max="100" step="any" value="${esc(d.yield_pct)}" placeholder="optional"></div>
            </div>
            <div class="lf-ro"><span class="k">Verification</span><span class="v">${vLabel}</span></div>
            <label class="lf-toggle"><span>Listing active (visible to buyers)</span><span class="sw ${d.is_active ? 'on' : ''}" id="lfActive" role="switch" aria-checked="${d.is_active}" tabindex="0"></span></label>
          </fieldset>
          <fieldset class="lf-sec"><legend>Media</legend>
            <!-- Photograph, not "image URL".
                 This field used to be a URL box and nothing else, so an agency
                 holding a photo on their phone had no way to give it to us.
                 That is how a listing was published with a Google share link
                 as its picture. Choosing a file is the primary path now; the
                 URL box stays for anyone whose photos already live somewhere. -->
            <div class="field">
              <label>Photos of the property *</label>
              <div class="mdz" id="lfDz" role="group" aria-label="Add photos or video">
                <span class="mdz-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/></svg></span>
                <span class="mdz-t">
                  <b class="rest rest-fine">Drag photos or video here</b>
                  <b class="rest rest-touch">Add photos or video</b>
                  <b class="wake">Drop them here</b>
                  <b class="hot-t">Let go to add them</b>
                  <small>JPG, PNG, WebP, MP4 or MOV. As many as you like.</small>
                </span>
                <button type="button" class="btn-ghost" id="lfImgPick">Choose files</button>
              </div>
              <div class="lfimg-row">
                <!-- multiple: buyers judge a home on a gallery, and an agency
                     photographing a flat comes away with a dozen shots, not
                     one. The write path already stored an ordered list; only
                     this input was singular. (No backticks in here -- this
                     markup lives inside a template literal, and one would end
                     the string.) -->
                <!-- mp4 and quicktime and no webm, matching the upload gate
                     and the bucket: Meta will not ingest webm, and a file that
                     uploads fine and fails at Instagram hours later is the
                     worst place to find that out. -->
                <input id="lfImgFile" type="file" multiple
                       accept="image/png,image/jpeg,image/webp,image/avif,video/mp4,video/quicktime" hidden>
                <span class="lfimg-or">or paste a link</span>
              </div>
              <input id="lfImg" value="${esc(primary)}" placeholder="https://… (a direct link to the image itself)">
              <!-- The gallery, in the order buyers will see it. First is the
                   cover, which is why it says so on the tile rather than in a
                   caption nobody reads. -->
              <div class="lf-gal" id="lfGal"></div>
              <div class="lfimg-prev" id="lfImgPrev"></div>
              <span class="ferr" id="e_img" role="alert"></span>
            </div>
          </fieldset>
          <button class="btn btn-primary btn-block" id="lfSave" style="margin-top:6px">${isNew ? 'Create listing' : 'Save changes'}</button>
          ${isNew ? '<p class="lf-draftnote" id="lfDraftNote" aria-live="polite"></p>' : ''}
          ${isNew ? '' : '<button class="btn btn-ghost btn-block" id="lfDel" style="margin-top:8px">Delete listing</button>'}
        </div>`;
      scrim.classList.add('on'); drawer.classList.add('on');
      const g = id => document.getElementById(id);
      // active toggle
      const actSw = g('lfActive');
      const toggleAct = () => { const on = actSw.classList.toggle('on'); actSw.setAttribute('aria-checked', String(on)); };
      actSw.addEventListener('click', toggleAct);
      actSw.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleAct(); } });
      // property type → bedrooms optional for land/commercial
      const syncBeds = () => { const isLand = ['land', 'commercial'].includes(g('lfType').value); g('lbBeds').textContent = isLand ? 'Bedrooms' : 'Bedrooms *'; };
      g('lfType').addEventListener('change', () => { syncBeds(); validate(); });
      syncBeds();
      // listing type → default price period
      g('lfListing').addEventListener('change', function () { g('lfPeriod').value = { sale: 'total', rent: 'per_year', shortlet: 'per_night' }[this.value] || 'total'; });
      wireDealFields();
      wirePinMap();
      wireFillFromDescription();
      // price echo
      /* The echo under the price box said "(₦0M)" for anything under a
         million -- telling an agency its ₦450,000 rent was worth nothing while
         it was still typing. */
      const priceEcho = () => {
        const v = parseFloat(g('lfPrice').value);
        g('priceEcho').textContent = v > 0 ? '= ' + nairaFull(v) + ' (' + nairaShort(v) + ')' : '';
      };
      // validation
      /* The message was written into a span nothing was listening to, and the
         field it belonged to said nothing about being wrong. Same gap the
         sign-in form had: the sentence is on screen, in text, and unreachable
         if you cannot see the screen.

         role="alert" on the span (in the markup) announces it. aria-invalid
         marks the field, and aria-describedby ties the two together so
         tabbing back to a field still in error reads the reason rather than
         just "invalid". ERR_OF is read at call time, not definition time --
         it is declared below this line and only ever consulted once
         validate() runs. Two fields share e_lat, which is why this loops the
         map rather than assuming one field per message. */
      const setErr = (id, msg) => {
        const el = g(id); if (!el) return;
        el.textContent = msg || '';
        el.style.display = msg ? 'block' : 'none';
        Object.keys(ERR_OF).forEach(fid => {
          if (ERR_OF[fid] !== id) return;
          const f = g(fid); if (!f) return;
          if (msg) { f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', id); }
          else { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); }
        });
      };

      /* An empty form should not open shouting. validate() runs on open to work
         out whether the listing can be saved yet, and it used to paint every
         message while it was at it -- so a new agency posting its first
         property met seven red errors before touching a key, for fields it had
         not been given a chance to fill.

         The check still runs; only the telling is held back, until the field
         has been edited or the agency has tried to save. */
      const touched = {};
      let revealAllErrors = false;
      let LAST_CHECKS = {};
      const ERR_OF = {
        lfTitle: 'e_title', lfDesc: 'e_desc', lfAddr: 'e_addr', lfCity: 'e_city',
        lfState: 'e_state', lfPrice: 'e_price', lfBeds: 'e_beds', lfImg: 'e_img',
        lfLat: 'e_lat', lfLng: 'e_lat', lfUnits: 'e_units',
      };
      const setErrGated = (id, msg) => setErr(id, (revealAllErrors || touched[id]) ? msg : '');
      /* Image URL validation.
         This only ever tested /^https?:\/\//, which any link on earth passes.
         A listing was published yesterday whose "image" was
         https://share.google/EiSyLU6CGrkHy9pYw -- a Google share redirect that
         answers 302 text/html. It saved cleanly and then rendered as nothing,
         because it is not an image and never was.

         Two gates. This one is synchronous and rejects the shapes that cannot
         be images; imgProbe() below actually loads the URL, which is the only
         way to be sure. */
      var IMG_SHORTENERS = /^(share\.google|goo\.gl|maps\.app\.goo\.gl|bit\.ly|tinyurl\.com|t\.co|lnkd\.in|rb\.gy)$/i;
      var imgProbeCache = Object.create(null);   // url -> 'ok' | 'bad' | 'pending'

      function imgUrlError(v) {
        if (!v) return 'A direct image link (https://…)';
        var u;
        try { u = new URL(v); } catch (e) { return 'That is not a valid URL'; }
        if (!/^https?:$/.test(u.protocol)) return 'Must start with http:// or https://';
        if (IMG_SHORTENERS.test(u.hostname)) {
          return 'That is a share link, not an image. Open it, right-click the photo, and copy the image address.';
        }
        if (imgProbeCache[v] === 'bad') return 'That link did not load as an image';
        return '';
      }

      /* The real test: can a browser actually decode it as an image? Catches
         404s, HTML pages, PDFs and hotlink blocks alike, without needing to
         know anything about the URL's shape. */
      function imgProbe(v) {
        if (!v || imgProbeCache[v]) return;
        imgProbeCache[v] = 'pending';
        var im = new Image();
        im.onload = function () { imgProbeCache[v] = 'ok'; validate(); };
        im.onerror = function () { imgProbeCache[v] = 'bad'; validate(); };
        im.referrerPolicy = 'no-referrer';
        im.src = v;
      }

      function validate() {
        const isLand = ['land', 'commercial'].includes(g('lfType').value);
        const la = g('lfLat').value.trim(), lo = g('lfLng').value.trim();
        const checks = {
          e_title: g('lfTitle').value.trim().length >= 6 ? '' : 'At least 6 characters',
          e_desc: g('lfDesc').value.trim().length >= 30 ? '' : 'Describe the property (30+ characters)',
          e_addr: g('lfAddr').value.trim() ? '' : 'Required',
          e_city: g('lfCity').value.trim() ? '' : 'Required',
          e_state: g('lfState').value.trim() ? '' : 'Required',
          e_price: parseFloat(g('lfPrice').value) > 0 ? '' : 'Enter a price in naira',
          e_beds: (isLand || (g('lfBeds').value !== '' && +g('lfBeds').value >= 0)) ? '' : 'Required',
          e_img: imgUrlError(g('lfImg').value.trim()),   // set by upload or paste
          e_lat: (la && lo) ? '' : 'Place the pin: tap the map where the property is',
          e_units: (g('lfUnits') && +g('lfUnits').value >= 1) ? '' : 'At least 1',
        };
        let ok = true;
        LAST_CHECKS = checks;
        Object.keys(checks).forEach(k => { setErrGated(k, checks[k]); if (checks[k]) ok = false; });
        /* Left enabled deliberately. A disabled Save with no errors on screen
           is a dead end -- nothing tells you what is missing, and a disabled
           control shows no tooltip on touch. Pressing it reveals every
           outstanding message instead, which is what the toast below already
           assumed could happen. */
        const save = g('lfSave');
        save.disabled = false; save.removeAttribute('aria-disabled');
        save.style.opacity = ok ? '1' : '.75';
        return ok;
      }
      ['lfTitle', 'lfDesc', 'lfAddr', 'lfCity', 'lfState', 'lfPrice', 'lfBeds', 'lfImg'].forEach(id => {
        const mark = () => { if (ERR_OF[id]) touched[ERR_OF[id]] = true; };
        g(id).addEventListener('input', () => { mark(); validate(); if (id === 'lfPrice') priceEcho(); });
        // blur counts too: tabbing through a required field and leaving it
        // empty is a decision, and worth telling them about there and then.
        g(id).addEventListener('blur', () => { mark(); validate(); });
      });
      /* ── the map pin, from the address ─────────────────────────────────
         Nominatim, the same geocoder save-place already uses for a buyer's
         places: free, no key, and asked with the city because "Bodija" alone
         matches in several countries.

         Runs on blur of the address, city or state, one request when they
         have finished typing, not one per keystroke. Failure is silent and
         costs only the pin: coordinates were always optional here, and a
         listing that cannot be geocoded is still a listing. It never blocks
         the save. */
      /* ONE QUESTION WAS THE WRONG QUESTION, AND IT ASKED IT ONCE.
         This sent the address exactly as typed and gave up on a miss. Every
         listing a real agency has ever uploaded came out with no pin -
         invisible on every map, while the 501 seeded ones looked fine because
         the seed wrote coordinates directly. Two for two, silently.

         The reason is in the data, not the agent. Measured against Nominatim:

           "Number 4, Ekiti street, Bodija, Ibadan, Oyo, Nigeria"  no match
           "Ekiti street, Bodija, Ibadan, Nigeria"                 7.41636, 3.90264

         Nigerian OSM holds streets but almost no house numbers, so leading
         "Number 4," guarantees a miss on an address that is otherwise findable.
         And it goes further: "Awolowo Road, Bodija" and "Okeola Agbowo Street"
         both miss even with the number stripped, those streets are not mapped
         at all, while "Bodija, Ibadan" and "Agbowo, Ibadan" both resolve.

         So the ladder ends at the AREA, because the area is the thing Nigerian
         map data actually has. A pin in the right neighbourhood is worth far
         more than no pin: it puts the home in the part of town a buyer is
         choosing between, which is the question this map answers.

         What it must not do is imply a doorstep it does not know. Each rung
         says which one it landed on, so nobody mistakes an area centroid for a
         surveyed address, and the lat/lng fields stay editable for an agency
         that wants to place it exactly. */
      const HOUSE_NO =
        /^\s*(?:(?:no|number|nos|house|flat|plot|suite|apt|apartment|block)\s*\.?\s*)?\d+\s*[a-z]?\s*(?:[,/-]\s*|\s+)/i;

      function geoLadder(addr, hood, city, state) {
        const A = addr.trim(), H = hood.trim(), C = city.trim(), S = state.trim();
        /* The area belongs in the street rungs too, unless the address already
           says it. "Okeola Agbowo Street, Ibadan" asks a bigger question than
           "Okeola Agbowo Street, Agbowo, Ibadan", several cities have a street
           of the same name, and the area is what separates them. Skipped when
           the address already contains it so the query does not read
           "...Bodija, Bodija, Ibadan". */
        const near = (H && A.toLowerCase().indexOf(H.toLowerCase()) < 0) ? [H] : [];
        const tail = [C, S, 'Nigeria'].filter(Boolean);
        const rungs = [];
        if (A) rungs.push({ q: [A].concat(near, tail), how: 'address' });
        const street = A.replace(HOUSE_NO, '').trim();
        /* Only worth a second request when stripping actually changed
           something, and only when what is left still names a street rather
           than a bare number. */
        if (street && street !== A && /[a-z]/i.test(street)) {
          rungs.push({ q: [street].concat(near, tail), how: 'street' });
        }
        if (H) rungs.push({ q: [H].concat(tail), how: 'area' });
        if (C) rungs.push({ q: tail, how: 'city' });
        return rungs;
      }

      const GEO_SAYS = {
        address: () => 'Map pin found from the address.',
        street:  () => 'Map pin found from the street, house numbers are not mapped in Nigeria.',
        area:    (w) => 'That street is not on the map, so the pin sits on ' + w + '. '
                      + 'Good enough to show the area; edit the pin if you need it exact.',
        city:    (w) => 'Pinned to ' + w + ' only. Add the area above to place it closer.',
      };

      let geoKey = '';
      let geoRun = 0;
      function findPin() {
        const addr = g('lfAddr').value.trim();
        const hood = g('lfHood') ? g('lfHood').value.trim() : '';
        const city = g('lfCity').value.trim();
        const state = g('lfState').value.trim();
        if (!addr || !city) return;
        const key = [addr, hood, city, state].join('|').toLowerCase();
        if (key === geoKey) return;              // nothing new to look up
        geoKey = key;

        const note = g('lfGeoNote');
        if (note) note.textContent = 'Finding the map pin…';

        /* Which lookup this is. A slow first rung must never be allowed to
           land after a later edit has already started its own ladder and
           overwrite the newer answer with the older one. */
        const run = ++geoRun;
        const rungs = geoLadder(addr, hood, city, state);

        const ask = (i) => {
          if (run !== geoRun) return Promise.resolve(null);   // superseded
          if (i >= rungs.length) return Promise.resolve(null);
          const r = rungs[i];
          return fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q='
                       + encodeURIComponent(r.q.join(', ')))
            .then((res) => res.ok ? res.json() : [])
            .then((rows) => {
              const hit = Array.isArray(rows) && rows[0];
              if (hit && hit.lat != null && hit.lon != null) return { hit: hit, how: r.how, said: r.q[0] };
              /* Nominatim asks for no more than one request a second and this
                 is a free service we are guests on. The pause is only paid
                 when a rung actually misses. */
              return new Promise((res2) => setTimeout(res2, 1100)).then(() => ask(i + 1));
            })
            .catch(() => new Promise((res2) => setTimeout(res2, 1100)).then(() => ask(i + 1)));
        };

        ask(0).then((found) => {
          if (run !== geoRun) return;            // a newer lookup owns the field
          if (!found) {
            /* A pin the agent placed by hand is kept: the lookup missing the
               street says nothing about where they put it. */
            if (note) note.textContent = (g('lfLat').value && g('lfLng').value)
              ? 'That address is not on the map, so your pin stays where it is.'
              : 'That address is not on the map. Tap the map below where the property is.';
            validate();
            return;
          }
          g('lfLat').value = Number(found.hit.lat).toFixed(6);
          g('lfLng').value = Number(found.hit.lon).toFixed(6);
          if (note) note.textContent = GEO_SAYS[found.how](found.said);
          syncPinMap();
          validate();
        });
      }
      ['lfAddr', 'lfHood', 'lfCity', 'lfState'].forEach(id => {
        const el = g(id);
        if (el) el.addEventListener('blur', findPin);
      });

      /* Probe on blur rather than per keystroke: one request when they have
         finished pasting, not one per character. */
      g('lfImg').addEventListener('blur', () => imgProbe(g('lfImg').value.trim()));

      /* ── choosing a photo ──────────────────────────────────────────────────
         Uploads to the property-photos bucket and puts the resulting public URL
         into the same field a pasted link would fill, so everything downstream
         -- validation, preview, save -- has exactly one thing to read. */
      /* DECLARED OUT HERE, NOT INSIDE THE UPLOADER.
         `let` is block-scoped, so declaring this inside wirePhotoUpload() put
         it out of reach of the save handler below -- which threw
         "photos is not defined" the moment anybody pressed Save changes, and
         the drawer just sat there. The gallery is shared state between the
         uploader that fills it and the save that writes it, so it belongs to
         the form, not to one of its widgets. */
      let photos = [];
      /* The branded copies, keyed by the original url. Declared HERE and
         not inside the uploader for the reason the comment above gives:
         it is shared between the uploader that fills it and the save that
         writes it, so it belongs to the form. */
      let BRANDED = {};

      /* Grouped so the dropdown reads as a checklist of the questions
         buyers actually ask, in the order they ask them. Power and water come
         first on purpose: in Lagos and Ibadan they decide a viewing. */
      const AMENITY_GROUPS = [
        { g: 'Power', items: ['24/7 power', 'Backup generator', 'Solar power',
          'Inverter and batteries', 'Prepaid meter', 'Dedicated transformer'] },
        { g: 'Water', items: ['Borehole', 'Constant water supply',
          'Water treatment plant', 'Overhead tank'] },
        { g: 'Security', items: ['24/7 security', 'Gated estate', 'Security post',
          'CCTV surveillance', 'Electric fence', 'Perimeter fence', 'Intercom',
          'Access control', 'Burglary proof', 'Fire alarm', 'Smoke detectors',
          'Fire extinguisher'] },
        { g: 'Parking and access', items: ['Car park', 'Covered parking',
          'Visitor parking', 'Ample parking space', 'Elevator', 'Wheelchair access',
          'Tarred road access', 'Good drainage', 'Street lights'] },
        { g: 'Inside', items: ['Air conditioning', 'Fitted kitchen',
          'Fitted wardrobes', 'POP ceiling', 'All rooms ensuite', 'Guest toilet',
          'Walk-in closet', 'Store room', 'Laundry room', 'Study or home office',
          'Balcony', 'Terrace', 'Furnished', 'Serviced apartment',
          'Water heater', 'Ceiling fans'] },
        { g: 'Leisure', items: ['Swimming pool', 'Gym', "Children's playground",
          'Garden', 'Lawn', 'Barbecue area', 'Clubhouse', 'Tennis court',
          'Basketball court', 'Cinema room', 'Games room', 'Rooftop terrace',
          'Jacuzzi', 'Sauna', 'Bar'] },
        { g: 'Staff and service', items: ["Boys' quarters (BQ)",
          'Domestic staff quarters', 'Gatehouse', 'Facility management',
          'Estate maintenance', 'Waste disposal', 'Cleaning service', 'Concierge'] },
        { g: 'Connectivity', items: ['Fibre internet', 'WiFi', 'Satellite TV',
          'Cable TV'] },
        { g: 'Setting', items: ['Waterfront', 'Sea view', 'City view',
          'Corner piece', 'Close to main road', 'Pet friendly', 'Newly built'] },
      ];

      /* ── the amenities combobox ──────────────────────────────────────
         Free text fed a FILTER, which is the part that made this worth
         replacing: "24h power", "24hr power" and "24/7 power" are three
         amenities as far as any query is concerned, and nothing was ever
         going to make the people typing them agree. A list makes the common
         ones identical; Enter still accepts anything the list has not got. */
      (function wireAmenities() {
        const host = g('amenHost'); if (!host) return;
        const store = g('lfAmen'), box = g('amenBox');
        const input = g('amenIn'), menu = g('amenMenu');
        if (!store || !box || !input || !menu) return;

        const norm = (v) => String(v || '').trim().toLowerCase();
        /* Seeded from the hidden input, split the same way the save splits it,
           so a listing written before this existed opens as chips. */
        let chosen = store.value.split(/[|,;\n]+/).map((v) => v.trim()).filter(Boolean);
        let hi = -1;

        function sync() {
          store.value = chosen.join(', ');
          box.querySelectorAll('.amen-chip').forEach((n) => n.remove());
          chosen.forEach((a) => {
            const chip = document.createElement('span');
            chip.className = 'amen-chip';
            chip.appendChild(document.createTextNode(a));
            const x = document.createElement('button');
            x.type = 'button';
            x.setAttribute('aria-label', 'Remove ' + a);
            x.textContent = '\u00d7';
            x.addEventListener('click', (e) => {
              e.stopPropagation();
              chosen = chosen.filter((v) => v !== a);
              sync(); paint(); input.focus();
            });
            chip.appendChild(x);
            box.insertBefore(chip, input);
          });
        }

        function add(raw) {
          /* Splits on the save's own separators, so pasting a brochure list
             into the box becomes chips rather than one absurd amenity. */
          String(raw || '').split(/[|,;\n]+/).forEach((piece) => {
            const v = piece.trim().replace(/\s+/g, ' ');
            if (!v) return;
            if (!chosen.some((c) => norm(c) === norm(v))) chosen.push(v);
          });
          input.value = ''; sync(); paint();
        }

        function paint() {
          const q = norm(input.value);
          let html = '';
          AMENITY_GROUPS.forEach((grp) => {
            const hits = grp.items.filter((it) => !q || norm(it).indexOf(q) !== -1);
            if (!hits.length) return;
            html += '<div class="amen-grp">' + esc(grp.g) + '</div>';
            hits.forEach((it) => {
              const on = chosen.some((c) => norm(c) === norm(it));
              html += '<div class="amen-opt" role="option" data-v="' + esc(it)
                + '" aria-selected="' + on + '">' + esc(it) + '</div>';
            });
          });
          if (!html) {
            html = input.value.trim()
              ? '<div class="amen-none">Nothing matches. Press Enter to add \u201c'
                + esc(input.value.trim()) + '\u201d.</div>'
              : '<div class="amen-none">Every amenity is already on this listing.</div>';
          }
          menu.innerHTML = html;
          hi = -1;
        }

        function open() { menu.classList.add('on'); input.setAttribute('aria-expanded', 'true'); paint(); }
        function shut() { menu.classList.remove('on'); input.setAttribute('aria-expanded', 'false'); hi = -1; }
        function opts() { return Array.prototype.slice.call(menu.querySelectorAll('.amen-opt')); }
        function move(d) {
          const list = opts(); if (!list.length) return;
          hi = (hi + d + list.length) % list.length;
          list.forEach((o, k) => o.classList.toggle('hi', k === hi));
          if (list[hi]) list[hi].scrollIntoView({ block: 'nearest' });
        }

        /* Opens on a click as well as on focus. After Escape the input is
           still focused, so a click that only focused it did nothing, and the
           way back was to click away and click in again. */
        box.addEventListener('click', () => { input.focus(); if (!menu.classList.contains('on')) open(); });
        input.addEventListener('focus', () => { box.classList.add('on'); open(); });
        input.addEventListener('input', () => { if (!menu.classList.contains('on')) open(); else paint(); });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!menu.classList.contains('on')) open(); move(1); return; }
          if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); return; }
          if (e.key === 'Escape') { shut(); return; }
          if (e.key === 'Enter') {
            e.preventDefault();
            const list = opts();
            if (hi >= 0 && list[hi]) add(list[hi].dataset.v);
            else if (input.value.trim()) add(input.value);
            return;
          }
          /* Backspace on an empty box removes the last chip -- the behaviour
             every token field has, and the only way to undo a mis-tap without
             reaching for a small \u00d7. */
          if (e.key === 'Backspace' && !input.value && chosen.length) {
            chosen.pop(); sync(); paint();
          }
        });

        menu.addEventListener('mousedown', (e) => {
          /* mousedown, not click: the input would blur first and shut the menu
             out from under the pointer. */
          const o = e.target.closest('.amen-opt'); if (!o) return;
          e.preventDefault();
          const v = o.dataset.v;
          if (chosen.some((c) => norm(c) === norm(v))) chosen = chosen.filter((c) => norm(c) !== norm(v));
          else chosen.push(v);
          input.value = ''; sync(); paint(); input.focus();
        });

        /* THE MENU SHUT AFTER EVERY PICK. Picking repaints the menu, and the
           repaint detaches the option that was clicked -- before this
           listener, which runs later in the same event, got to look at it.
           host.contains() of a detached node is false, so every pick read as
           a click outside, and the list closed under the agent's finger. The
           event's path was recorded at dispatch, while the option was still
           in the menu, so it is the question to ask. */
        document.addEventListener('mousedown', (e) => {
          if (e.composedPath().indexOf(host) !== -1) return;
          box.classList.remove('on'); shut();
        });

        sync();
      })();

      (function wirePhotoUpload() {
        const pick = g('lfImgPick'), fileEl = g('lfImgFile'), prev = g('lfImgPrev'), urlEl = g('lfImg');
        if (!pick || !fileEl || !urlEl) return;

        function showPreview(url, note, isErr) {
          if (!prev) return;
          prev.innerHTML = (url ? `<img src="${esc2(url)}" alt="">` : '')
            + (note ? `<div class="st${isErr ? ' err' : ''}">${esc2(note)}</div>` : '');
        }


      /* A combobox that behaves the same on every phone. Returns a handle so
         the cascade can refill it when the state or city changes.

         Free text is always allowed: the list narrows what you see, it never
         decides what you may enter. Choosing from it is a shortcut, not a
         gate -- which is the whole reason city and area are not selects. */
      function makeCombo(wrapId, onPick) {
        const wrap = g(wrapId);
        if (!wrap) return null;
        const input = wrap.querySelector('input');
        const list = wrap.querySelector('.combo-list');
        const toggle = wrap.querySelector('.combo-toggle');
        let items = [];
        let active = -1;

        const close = () => {
          list.hidden = true; active = -1;
          input.setAttribute('aria-expanded', 'false');
        };

        function paint(filter) {
          const q = String(filter || '').trim().toLowerCase();
          const hits = q ? items.filter((v) => v.toLowerCase().indexOf(q) > -1) : items.slice();
          if (!hits.length) {
            /* Not an error state. Somewhere we have no list for is a place an
               agency may still legitimately be selling a house. */
            list.innerHTML = '<div class="combo-empty">No match, type it in and carry on.</div>';
          } else {
            list.innerHTML = hits.slice(0, 60).map((v, i) => {
              let label = esc(v);
              if (q) {
                const at = v.toLowerCase().indexOf(q);
                label = esc(v.slice(0, at)) + '<mark>' + esc(v.slice(at, at + q.length))
                      + '</mark>' + esc(v.slice(at + q.length));
              }
              return '<button type="button" class="combo-opt" role="option" data-v="'
                + esc(v) + '" data-i="' + i + '">' + label + '</button>';
            }).join('');
          }
          list.hidden = false;
          input.setAttribute('aria-expanded', 'true');
          active = -1;
        }

        function choose(v) {
          input.value = v;
          close();
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          if (onPick) onPick(v);
        }

        input.addEventListener('focus', () => paint(''));      // tap shows everything
        input.addEventListener('input', () => paint(input.value));
        toggle.addEventListener('click', () => {
          if (list.hidden) { input.focus(); paint(''); } else { close(); }
        });

        /* mousedown, not click: blurring the input first would close the list
           and the tap would land on nothing -- the classic dropdown that
           "does not select". */
        list.addEventListener('mousedown', (e) => {
          const b = e.target.closest('.combo-opt');
          if (!b) return;
          e.preventDefault();
          choose(b.dataset.v);
        });

        input.addEventListener('keydown', (e) => {
          if (list.hidden) return;
          const opts = [...list.querySelectorAll('.combo-opt')];
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!opts.length) return;
            active = e.key === 'ArrowDown'
              ? (active + 1) % opts.length
              : (active <= 0 ? opts.length - 1 : active - 1);
            opts.forEach((o, i) => o.classList.toggle('on', i === active));
            opts[active].scrollIntoView({ block: 'nearest' });
          } else if (e.key === 'Enter' && active > -1) {
            e.preventDefault(); choose(opts[active].dataset.v);
          } else if (e.key === 'Escape') { close(); }
        });

        document.addEventListener('mousedown', (e) => {
          if (!wrap.contains(e.target)) close();
        });

        return {
          input: input,
          setItems: (arr) => { items = arr || []; if (!list.hidden) paint(input.value); },
          close: close,
        };
      }

      /* ── state → city → area ───────────────────────────────────────────
         Three free-text boxes meant "Lagos", "lagos" and "Lagos State" were
         three different cities to search, matching and the map, and an agency
         posting its first property typed all three from memory.

         The lists narrow as you go, and choosing a city fills the state in
         when it is still blank, plenty of people think of the town first, and
         being made to answer in our order is the kind of small rudeness that
         makes a form feel like paperwork. */
      (function places() {
        if (!window.SynPlaces) return;                 // form still works unaided
        const stateEl = g('lfState'), cityEl = g('lfCity'), hoodEl = g('lfHood');
        if (!stateEl || !cityEl) return;

        const cityCombo = makeCombo('lfCityCombo');
        const hoodCombo = makeCombo('lfHoodCombo');
        if (!cityCombo || !hoodCombo) return;

        /* Areas we already have listings in, so a city we serve suggests the
           places this agency actually works rather than only our fixed list. */
        function knownAreas(city) {
          const all = (typeof LISTINGS_DATA !== 'undefined' && Array.isArray(LISTINGS_DATA))
            ? LISTINGS_DATA : [];
          return all.filter((l) => (l.city || '') === city)
                    .map((l) => (l.neighbourhood || '').trim())
                    .filter(Boolean);
        }

        stateEl.innerHTML = '<option value="">- Select a state -</option>'
          + SynPlaces.STATES.map((st) =>
              '<option value="' + esc(st) + '">' + esc(st) + '</option>').join('');
        /* Canonicalised, or an existing "Oyo state" listing opens with an
           empty select and is saved back with no state at all. */
        stateEl.value = SynPlaces.canonicalState(d.state || '');

        function fillCities() {
          const st = stateEl.value;
          /* No state chosen yet: offer every city we know rather than nothing,
             so typing the town first still works. */
          cityCombo.setItems(st ? SynPlaces.citiesIn(st) : SynPlaces.allCities());
        }

        function fillAreas() {
          const city = cityEl.value.trim();
          const list = SynPlaces.areasIn(city, knownAreas(city));
          hoodCombo.setItems(list);
          const hint = g('lfHoodHint');
          if (hint) {
            hint.textContent = list.length
              ? list.length + ' areas in ' + city + ', start typing, or enter your own.'
              : (city ? 'Type the area, we have no list for ' + city + ' yet.' : '');
          }
        }

        stateEl.addEventListener('change', () => {
          fillCities();
          /* A city that does not belong to the newly chosen state is now wrong,
             and leaving it there is how a Lagos listing ends up in Oyo. */
          const st = stateEl.value;
          if (st && cityEl.value && SynPlaces.citiesIn(st).indexOf(cityEl.value) === -1
              && SynPlaces.stateOf(cityEl.value)) {
            cityEl.value = '';
            hoodEl.value = '';
          }
          fillAreas();
          validate();
        });

        cityEl.addEventListener('input', () => {
          /* Choosing a city we recognise fills the state in, if it is empty. */
          const st = SynPlaces.stateOf(cityEl.value.trim());
          if (st && !stateEl.value) { stateEl.value = st; fillCities(); }
          fillAreas();
        });
        cityEl.addEventListener('change', fillAreas);

        fillCities();
        fillAreas();
      })();

        pick.addEventListener('click', () => fileEl.click());

        /* ── the gallery ────────────────────────────────────────────────────
           `photos` is the ordered truth for this drawer; #lfImg mirrors the
           first one because validation, the card grid and the campaign picker
           all still read a single cover URL from it. Two representations of
           one thing is a drift risk, so the mirror is written in exactly one
           place -- syncPhotos(). */
        photos = (l.media || []).map(m => m.url).filter(Boolean);
        /* The branded copies, alongside rather than inside `photos`. That
           array is read as a list of strings by the gallery, the reorder, the
           cover-image rule and the save, and turning it into objects to carry
           three extra fields would touch all of them for a nicety. */
        BRANDED = {};
        (l.media || []).forEach((m) => {
          if (m && m.url && m.branded_url) {
            BRANDED[m.url] = { id: m.id,
                               branded_url: m.branded_url,
                               branded_price: m.branded_price,
                               branded_verified: m.branded_verified };
          }
        });
        if (!photos.length && (l.img || '').trim()) photos = [(l.img || '').trim()];
        const galEl = g('lfGal');

        function galNote(msg, bad) {
          let n = galEl.parentElement.querySelector('.lf-galnote');
          if (!n) {
            n = document.createElement('div');
            galEl.insertAdjacentElement('afterend', n);
          }
          n.className = 'lf-galnote' + (bad ? ' bad' : '');
          n.textContent = msg || '';
        }

        /* ── when the price moves, the photographs say so ─────────────────
           The mark is drawn once at upload and the price changes afterwards.
           Recording what was drawn made that detectable; this tells somebody.

           COMPARED HERE, NOT BY THE DATABASE. Both strings come from the same
           naira(), so the comparison is consistent by construction, and
           asking the server would add a round trip to answer a question
           already in hand, plus a second formatter that has to agree with the
           first. */
        function nairaNow() {
          var v = Number((document.getElementById('lfPrice') || {}).value) || 0;
          if (!(v > 0)) return '';
          if (v >= 1000000) return '\u20a6' + (v / 1000000).toFixed(1) + 'm';
          return '\u20a6' + v.toLocaleString('en-NG');
        }

        function staleMarks() {
          var priceNow = nairaNow();
          var verifiedNow = (l && l.verification_status) === 'verified';
          return photos.filter(function (u) {
            var b = BRANDED[u];
            if (!b || !b.branded_url || !b.id) return false;
            return (b.branded_price || '') !== priceNow
                || !!b.branded_verified !== verifiedNow;
          });
        }

        function syncBrandNote() {
          var host = galEl.parentElement;
          var n = host.querySelector('.lf-brandnote');
          var stale = staleMarks();
          /* Only when something has actually drifted, which for most listings
             is never. A permanent panel reporting "all correct" is furniture
             that teaches people to stop reading this area. */
          if (!stale.length) { if (n) n.remove(); return; }
          if (!n) {
            n = document.createElement('div');
            n.className = 'lf-brandnote';
            galEl.insertAdjacentElement('beforebegin', n);
          }
          var was = (BRANDED[stale[0]] || {}).branded_price || 'no price';
          var now = nairaNow() || 'no price';
          n.innerHTML = '<span>'
            + (stale.length === 1 ? 'One photo still shows ' : stale.length + ' photos still show ')
            + '<b>' + esc2(was) + '</b>'
            + (was !== now ? ' \u2014 this listing is now <b>' + esc2(now) + '</b>.' : '.')
            + ' They go out on social as they are.</span>'
            + '<button type="button" class="cmp-ch-btn" id="lfRedraw">Redraw '
            + (stale.length === 1 ? 'it' : 'them') + '</button>';
          n.querySelector('#lfRedraw').addEventListener('click', redrawStale);
        }

        function redrawStale() {
          var btn = document.getElementById('lfRedraw');
          var stale = staleMarks();
          if (!stale.length || !window.SynListings || !SynListings.redrawBrandedMedia) return;
          if (!window.BRAND || !(window.BRAND.logo_url || '').trim()) {
            galNote('Add your logo under Brand first \u2014 there is nothing to draw.', true);
            return;
          }
          btn.disabled = true; btn.textContent = 'Redrawing\u2026';
          var opts = {
            logoUrl: window.BRAND.logo_url,
            price: Number((document.getElementById('lfPrice') || {}).value) || 0,
            verified: (l && l.verification_status) === 'verified',
          };
          var failed = 0;
          /* One at a time. Each fetch, draw and upload is independent, so a
             photograph that fails keeps its old mark and is counted rather
             than taking the others with it. */
          stale.reduce(function (chain, u) {
            return chain.then(function () {
              var b = BRANDED[u];
              return SynListings.redrawBrandedMedia(b.id, u, opts).then(function (res) {
                if (!res) { failed++; return; }
                BRANDED[u] = { id: b.id, branded_url: res.url,
                               branded_price: res.price, branded_verified: res.verified };
              });
            });
          }, Promise.resolve()).then(function () {
            syncBrandNote();
            galNote(failed
              ? (stale.length - failed) + ' redrawn, ' + failed + ' could not be.'
              : 'Redrawn with the current price.', !!failed);
          });
        }

        function syncPhotos() {
          /* display_order 0 is the cover, and #lfImg is that same photo. */
          urlEl.value = photos[0] || '';
          /* An <img> pointed at an mp4 is a broken image, and the onerror
             below would then mark a perfectly good upload "pending". The
             gallery has to draw what the thing actually is. */
          const isVid = (u) => (window.SynListings && SynListings.isVideoUrl)
            ? SynListings.isVideoUrl(u)
            : /\.(mp4|mov|m4v|qt)(\?|#|$)/i.test(String(u || ''));
          syncBrandNote();
          galEl.innerHTML = photos.map((u, i) =>
            `<div class="lf-ph${isVid(u) ? ' is-vid' : ''}" data-i="${i}">`
            + (isVid(u)
                /* muted + playsinline so it previews without ever making
                   noise in an office, and preload=metadata so nine tiles do
                   not pull nine whole videos down to draw a thumbnail. */
                ? `<video src="${esc2(u)}" muted playsinline preload="metadata"`
                  + ` onerror="this.closest('.lf-ph').classList.add('pending')"></video>`
                  + '<span class="vid-badge" aria-hidden="true">▶</span>'
                : `<img src="${esc2(u)}" alt="" loading="lazy"`
                  + ` onerror="this.closest('.lf-ph').classList.add('pending')">`)
            + (i === 0 ? '<span class="cover">Cover</span>'
                       : `<button type="button" class="mv" data-up="${i}" aria-label="Make this the cover">↑</button>`)
            + `<button type="button" class="x" data-rm="${i}" aria-label="Remove">×</button>`
            + '</div>').join('');
          if (photos.length) imgProbeCache[photos[0]] = 'ok';
          validate();
          /* Uploads finish long after the click that started them, so the
             draft hears about the gallery from here rather than from the
             click. */
          galEl.dispatchEvent(new CustomEvent('lf:changed', { bubbles: true }));
        }

        galEl.addEventListener('click', (e) => {
          const up = e.target.closest('[data-up]');
          if (up) {
            /* One press promotes to cover rather than nudging one place. An
               agency picking the cover does not want to press ↑ four times,
               and the order of the rest is preserved. */
            const i = +up.dataset.up;
            photos = [photos[i]].concat(photos.filter((_, n) => n !== i));
            syncPhotos(); galNote('Cover updated.');
            return;
          }
          const rm = e.target.closest('[data-rm]');
          if (rm) {
            const i = +rm.dataset.rm;
            photos = photos.filter((_, n) => n !== i);
            syncPhotos();
            galNote(photos.length ? '' : 'A listing needs at least one photo.', !photos.length);
          }
        });

        /* THE MAGNETIC DROP ZONE (idea: dqnamo's Magnetic Drop Zone). The page-wide
           half lives in magneticDrop() below; this is the part only the form can
           do: take dropped files through the SAME path as the file picker, so
           there is exactly one upload route and one set of checks. */
        const dz = g('lfDz');
        if (dz) {
          const OKT = /^(image\/(png|jpeg|webp|avif)|video\/(mp4|quicktime))$/;
          dz.__take = (list) => {
            const all = Array.prototype.slice.call(list || []);
            const ok = all.filter((f) => OKT.test(f.type));
            if (!ok.length) { galNote('Those are not photos or videos we can use. Try JPG, PNG, WebP, MP4 or MOV.', true); return; }
            try {
              const dt = new DataTransfer(); ok.forEach((f) => dt.items.add(f)); fileEl.files = dt.files;
            } catch (e) { galNote('Drag and drop is not available in this browser. Use Choose files.', true); return; }
            fileEl.dispatchEvent(new Event('change', { bubbles: true }));
          };
          dz.addEventListener('click', (e) => { if (!e.target.closest('button')) fileEl.click(); });
        }

        fileEl.addEventListener('change', () => {
          const files = Array.prototype.slice.call(fileEl.files || []);
          if (!files.length) return;
          if (!window.SynListings || !SynListings.uploadPropertyPhotos) {
            galNote('Uploads are unavailable on this page.', true); return;
          }

          pick.disabled = true;
          const label = files.length === 1 ? 'file' : 'files';
          galNote(`Uploading ${files.length} ${label}…`);

          /* DRAWN WITH WHAT IS ON SCREEN. The price is whatever is in the
             form, which may not be saved yet, and that is the right value:
             it is the price this listing is about to have. Verification is
             not the agency's to type, so it comes from the saved row. */
          const brandOpts = (window.BRAND && (window.BRAND.logo_url || '').trim())
            ? {
              logoUrl: window.BRAND.logo_url,
              price: Number((document.getElementById('lfPrice') || {}).value) || 0,
              /* `l`, the listing this form was opened on. `current` is not
                 in scope here, and verification is not the agency's to
                 type -- unlike the price, it comes from the saved row. */
              verified: (l && l.verification_status) === 'verified',
            }
            : null;

          SynListings.uploadPropertyPhotos(files, (done, total, name) => {
            Dyn.set(pick, done >= total ? 'Finishing…' : `Uploading ${done + 1} of ${total}…`);
            if (name) galNote(`Uploading ${done + 1} of ${total}, ${name}`);
          }, brandOpts)
            .then(({ urls, items, failed }) => {
              (items || []).forEach((it) => {
                if (it && it.branded_url) BRANDED[it.url] = it;
              });
              /* Appended, not replaced: an agency adding three more photos to
                 six has not asked to lose the six. */
              photos = photos.concat(urls);
              syncPhotos();
              if (failed.length && urls.length) {
                galNote(`${urls.length} added. ${failed.length} could not be used: `
                  + failed.map(f => f.name + ' (' + f.reason + ')').join(', '), true);
              } else if (failed.length) {
                galNote('None of those could be used: '
                  + failed.map(f => f.name + ' (' + f.reason + ')').join(', '), true);
              } else {
                galNote(`${urls.length} ${urls.length === 1 ? 'file' : 'files'} added.`);
              }
            })
            .catch((err) => {
              galNote((err && err.message) || 'That upload did not go through.', true);
            })
            .finally(() => {
              pick.disabled = false; Dyn.set(pick, 'Choose files');
              /* Cleared so choosing the same file again still fires change. */
              fileEl.value = '';
            });
        });

        syncPhotos();

        /* A pasted link is another photo, not a replacement for the set. It
           becomes the cover because that is what typing into the cover field
           means, and the rest keep their order behind it. */
        urlEl.addEventListener('change', () => {
          const v = urlEl.value.trim();
          if (!v || photos[0] === v) return;
          if (imgUrlError(v)) return;                 // the blur handler reports it
          photos = [v].concat(photos.filter((u) => u !== v));
          syncPhotos();
          galNote('Link added as the cover.');
        });

        // A pasted link previews too, once it is known to load.
        urlEl.addEventListener('blur', () => {
          const v = urlEl.value.trim();
          if (!v) { showPreview('', ''); return; }
          const err = imgUrlError(v);
          if (err) { showPreview('', err, true); return; }
          showPreview(v, '');
        });

        if (urlEl.value.trim()) showPreview(urlEl.value.trim(), '');
      })();
      priceEcho(); validate();

      /* THE FORM IS THE FAST PATH; THIS IS THE GUARANTEE.
         findPin() above geocodes while the agent types, which is worth having
         because they see the pin land and can correct it. But a form is not a
         guarantee: it only runs when somebody uses this screen, in a browser,
         with the network holding, and an agent who pastes an address and hits
         Save immediately can outrun it. Every listing a real agency had
         uploaded before today was unplaced, and nothing said so.

         So the server is asked to place anything that still has no pin the
         moment it is posted. geocode-listings only ever fills coordinates that
         are NULL, so this can never overwrite a pin the agent set by hand.

         Deliberately not awaited and never fatal: a listing that cannot be
         geocoded is still a listing, and the save has already succeeded by the
         time this runs. When it does land, the row is updated in place so the
         map has the pin without a reload. */
      function ensurePin(id, data) {
        if (!id || !dbBacked) return;
        if (data && data.latitude != null && data.longitude != null) return;
        if (!data || !data.address) return;
        authToken().then((t) => {
          if (!t) return;
          return fetch(SB_URL + '/functions/v1/geocode-listings', {
            method: 'POST',
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id }),
          }).then((r) => (r.ok ? r.json() : null));
        }).then((out) => {
          const hit = out && Array.isArray(out.results) && out.results[0];
          if (!hit || !hit.placed) return;
          const row = (LISTINGS_DATA || []).find((x) => x && x.id === id);
          if (row) { row.latitude = hit.lat; row.longitude = hit.lon; }
          announceListings();
        }).catch(() => { /* the pin is a bonus; the listing is the work */ });
      }

      /* What the form says, in the shape the save writes. Shared by the save
         and the draft, so a restored draft is exactly what Save would have
         sent. */
      /* ── THE DEAL ──────────────────────────────────────────────────────
         Rows that apply to the deal chosen, and nothing else: a rental is
         not asked about instalments, a finished house not about handover. */
      function showDeal(row, on) { document.querySelectorAll('#lfDealSec [data-deal-row="' + row + '"]')
        .forEach((el) => { el.style.display = on ? '' : 'none'; }); }
      function syncDealRows() {
        if (!g('lfDeal')) return;
        const deal = g('lfDeal').value, isLand = g('lfType').value === 'land';
        const rentish = ['rent', 'shortlet', 'lease'].includes(deal);
        if (deal === 'off_plan' && g('lfStage').value === 'completed') g('lfStage').value = 'not_started';
        const st = g('lfStage').value, plan = g('lfPlan').value;
        showDeal('stage', !isLand);
        showDeal('build', !isLand && st !== 'completed');
        g('lfProgress').closest('.field').style.display = st === 'under_construction' ? '' : 'none';
        showDeal('pay', !rentish);
        showDeal('inst', !rentish && plan === 'instalments');
        showDeal('land', isLand);
        showDeal('invest', ['joint_venture', 'development_financing'].includes(deal));
      }
      function wireDealFields() {
        if (!g('lfDeal')) return;
        g('lfDeal').addEventListener('change', () => {
          const lt = DEAL_TO_LISTING[g('lfDeal').value] || 'sale';
          if (g('lfListing').value !== lt) { g('lfListing').value = lt; g('lfListing').dispatchEvent(new Event('change')); }
          syncDealRows();
        });
        ['lfType', 'lfStage', 'lfPlan'].forEach((id) => g(id).addEventListener('change', syncDealRows));
        g('lfUnits').addEventListener('input', () => { touched.e_units = true; validate(); });
        syncDealRows();
      }
      function collectDeal(num) {
        if (!g('lfDeal')) return {};
        const deal = g('lfDeal').value, isLand = g('lfType').value === 'land';
        const rentish = ['rent', 'shortlet', 'lease'].includes(deal);
        const inv = ['joint_venture', 'development_financing'].includes(deal);
        const st = g('lfStage').value, plan = g('lfPlan').value, hand = g('lfHandover').value;
        const int = (id) => (g(id).value === '' ? null : parseInt(g(id).value, 10));
        const inst = !rentish && plan === 'instalments';
        return {
          deal_structure: deal,
          build_stage: isLand ? null : st,
          handover_date: (!isLand && st !== 'completed' && /^\d{4}-\d{2}$/.test(hand)) ? hand + '-01' : null,
          build_progress_pct: (!isLand && st === 'under_construction') ? int('lfProgress') : null,
          payment_plan: rentish ? null : plan,
          deposit_pct: inst ? num(g('lfDeposit').value) : null,
          instalment_months: inst ? int('lfMonths') : null,
          units_available: Math.max(1, parseInt(g('lfUnits').value, 10) || 1),
          plot_count: isLand ? num(g('lfPlots').value) : null,
          plot_size_sqm: isLand ? num(g('lfPlotSize').value) : null,
          min_investment: inv ? num(g('lfMinInv').value) : null,
          investment_term_months: inv ? int('lfTerm') : null,
          stated_return_pct: inv ? num(g('lfReturn').value) : null,
        };
      }

      /* ── THE PIN, BY HAND ──────────────────────────────────────────────
         The address lookup places it when it can. When it cannot -- most
         Nigerian streets are not on the free map -- the agent taps where the
         property is, drags the pin, or uses their phone's location while
         standing there. A live listing cannot be saved without it. */
      var pinMap = null, pinMarker = null;
      function syncPinMap() {
        if (!pinMap) return;
        const la = parseFloat(g('lfLat').value), lo = parseFloat(g('lfLng').value);
        if (!isFinite(la) || !isFinite(lo)) return;
        if (!pinMarker) {
          pinMarker = L.marker([la, lo], { draggable: true }).addTo(pinMap);
          pinMarker.on('dragend', () => { const p = pinMarker.getLatLng(); setPin(p.lat, p.lng, 'moved'); });
        } else {
          pinMarker.setLatLng([la, lo]);
        }
        pinMap.setView([la, lo], Math.max(pinMap.getZoom(), 15));
      }
      function setPin(la, lo, how) {
        g('lfLat').value = Number(la).toFixed(6);
        g('lfLng').value = Number(lo).toFixed(6);
        touched.e_lat = true;
        const note = g('lfGeoNote');
        if (note) note.textContent = how === 'here' ? 'Pinned where you are standing. Drag it if that is not the property.'
          : 'Pin placed. Drag it, or tap the map again, to adjust.';
        syncPinMap();
        validate();
      }
      function wirePinMap() {
        const el = g('lfPinMap');
        if (!el || !window.L) return;
        pinMap = null; pinMarker = null;
        pinMap = L.map(el, { zoomControl: true }).setView([9.06, 7.49], 6);
        if (window.SynTiles && SynTiles.add) SynTiles.add(pinMap);
        else L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(pinMap);
        pinMap.on('click', (e) => setPin(e.latlng.lat, e.latlng.lng, 'tap'));
        setTimeout(() => { if (pinMap) { pinMap.invalidateSize(); syncPinMap(); } }, 350);
        const here = g('lfHere');
        if (here) here.addEventListener('click', () => {
          if (!navigator.geolocation) { toast('This browser cannot share its location. Tap the map instead.'); return; }
          here.textContent = 'Finding you…';
          navigator.geolocation.getCurrentPosition(
            (p) => { here.textContent = 'I’m at the property: use my location'; setPin(p.coords.latitude, p.coords.longitude, 'here'); },
            () => { here.textContent = 'I’m at the property: use my location'; toast('Location not shared. Tap the map where the property is instead.'); },
            { enableHighAccuracy: true, timeout: 12000 });
        });
      }

      /* ── FILL FROM THE DESCRIPTION ─────────────────────────────────────
         Agents write everything in one paragraph. listing-extract reads it
         and returns only what the text states; each filled box is marked so
         the agent checks it before saving. Nothing is saved by this. */
      var FILL_TO = {
        property_type: 'lfType', deal_structure: 'lfDeal', build_stage: 'lfStage', payment_plan: 'lfPlan',
        handover_date: 'lfHandover', build_progress_pct: 'lfProgress', deposit_pct: 'lfDeposit', instalment_months: 'lfMonths',
        units_available: 'lfUnits', price: 'lfPrice', price_period: 'lfPeriod', bedrooms: 'lfBeds', bathrooms: 'lfBaths',
        toilets: 'lfToilets', parking_spaces: 'lfParking', area_sqm: 'lfArea', plot_count: 'lfPlots', plot_size_sqm: 'lfPlotSize',
        title_type: 'lfTitleType', furnished: 'lfFurnished', service_charge: 'lfService', agency_fee: 'lfAgencyFee',
        legal_fee: 'lfLegalFee', min_investment: 'lfMinInv', investment_term_months: 'lfTerm', stated_return_pct: 'lfReturn',
        address: 'lfAddr',
      };
      function wireFillFromDescription() {
        const btn = g('lfFill');
        if (!btn) return;
        btn.addEventListener('click', () => {
          const desc = g('lfDesc').value.trim();
          const note = g('lfFillNote');
          if (desc.length < 20) { toast('Write or paste the description first.'); return; }
          const label = btn.textContent;
          btn.disabled = true; btn.textContent = 'Reading your description…';
          const done = () => { btn.disabled = false; btn.textContent = label; };
          (typeof authToken === 'function' ? authToken() : Promise.resolve(null)).then((token) => {
            if (!token) throw new Error('Sign in again to use this.');
            return fetch(SB_URL + '/functions/v1/listing-extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + token },
              body: JSON.stringify({ title: g('lfTitle').value, description: desc }),
            }).then((r) => r.json().catch(() => ({})).then((d) => ({ ok: r.ok, d })));
          }).then(({ ok, d }) => {
            done();
            if (!ok || !d.fields) throw new Error(d.error || 'Could not read the description just now.');
            const f = d.fields;
            let n = 0;
            Object.keys(FILL_TO).forEach((k) => {
              if (f[k] == null || f[k] === '') return;
              const el = g(FILL_TO[k]);
              if (!el) return;
              if (k === 'address' && el.value.trim()) return;      // never overwrite a typed address
              const v = k === 'handover_date' ? String(f[k]).slice(0, 7) : String(f[k]);
              if (el.tagName === 'SELECT' && ![].some.call(el.options, (o) => o.value === v)) return;
              el.value = v;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              el.classList.add('lf-filled');
              setTimeout(() => el.classList.remove('lf-filled'), 6000);
              n++;
            });
            if (f.address && g('lfAddr').classList.contains('lf-filled')) g('lfAddr').dispatchEvent(new Event('blur'));
            syncDealRows();
            validate();
            /* No title in the text: make a plain one from what was read, e.g. "4-bed Duplex in Bodija, Ibadan". */
            const tEl = g('lfTitle');
            if (tEl && !tEl.value.trim()) {
              const typeEl = g('lfType'), beds = parseInt(g('lfBeds').value, 10);
              const tl = f.property_type && typeEl && typeEl.selectedOptions[0] ? typeEl.selectedOptions[0].textContent.trim() : '';
              const area = String(g('lfAddr').value || '').split(',')[0].replace(/^\s*(?:plot|block|flat|house|no\.?)?\s*\d+[a-z]?\s*/i, '').trim();
              const city = g('lfCity').value.trim();
              const place = [area, city].filter((x, i, arr) => x && arr.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i).join(', ');
              const t = [beds > 0 ? beds + '-bed' : '', tl].filter(Boolean).join(' ') + (place ? ' in ' + place : '');
              if (t.length > 6) {
                tEl.value = t; tEl.dispatchEvent(new Event('input', { bubbles: true })); tEl.classList.add('lf-filled');
                setTimeout(() => tEl.classList.remove('lf-filled'), 6000); n++;
              }
            }
            g('lfDesc').dispatchEvent(new CustomEvent('lf:filled', { bubbles: true }));
            if (note) note.textContent = n
              ? 'Filled ' + n + ' box' + (n > 1 ? 'es' : '') + ' from your description (highlighted). Check them before saving.'
              : 'Nothing in the description could go into a box. Fill them in below.';
          }).catch((err) => { done(); toast(err && err.message ? err.message : 'Could not read the description just now.'); });
        });
      }

      function collectListing() {
        const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
        return {
          title: g('lfTitle').value.trim(), description: g('lfDesc').value.trim(),
          property_type: g('lfType').value, listing_type: g('lfListing').value,
          price: num(g('lfPrice').value), price_period: g('lfPeriod').value,
          move_in_cost: num(g('lfMoveIn').value), service_charge: num(g('lfService').value),
          /* num() returns null for '', which is what keeps "not stated" and
             "no fee" apart all the way to the card. */
          agency_fee: num(g('lfAgencyFee').value), legal_fee: num(g('lfLegalFee').value),
          address: g('lfAddr').value.trim(), city: g('lfCity').value.trim(), state: g('lfState').value.trim(), country: g('lfCountry').value,
          neighbourhood: g('lfHood').value.trim(), latitude: num(g('lfLat').value), longitude: num(g('lfLng').value),
          bedrooms: g('lfBeds').value === '' ? null : parseInt(g('lfBeds').value, 10),
          bathrooms: g('lfBaths').value === '' ? null : parseInt(g('lfBaths').value, 10),
          area_sqm: num(g('lfArea').value),
          toilets: g('lfToilets').value === '' ? null : parseInt(g('lfToilets').value, 10),
          parking_spaces: g('lfParking').value === '' ? null : parseInt(g('lfParking').value, 10),
          year_built: g('lfYear').value === '' ? null : parseInt(g('lfYear').value, 10),
          /* '' is a real answer here -- "not stated" -- and an empty enum
             string is not a value Postgres will take, so it goes as null. */
          furnished: g('lfFurnished').value || null,
          property_condition: g('lfCondition').value || null,
          electricity_band: g('lfBand').value || null,
          // Split on comma, pipe OR newline. People paste amenity lists straight
          // out of a brochure and those use pipes and line breaks at least as
          // often as commas, comma-only silently stored the whole list as ONE
          // amenity, which looks fine in the form and breaks every filter.
          amenities: g('lfAmen').value.split(/[|,\n;]+/).map(s => s.trim()).filter(Boolean),
          title_type: g('lfTitleType').value || null, yield_pct: num(g('lfYield').value),
          ...collectDeal(num),
          is_active: actSw.classList.contains('on'),
          /* Every photo, in gallery order. This sent only the cover, so an
             agency that added eight had seven silently dropped on save --
             writeMedia has always accepted a list. */
          media: photos.map((u, i) => Object.assign(
            { url: u, is_primary: i === 0, display_order: i },
            /* Carried back onto the row it belongs to. A photograph reordered
               or one that arrived before branding existed simply has nothing
               to merge. */
            BRANDED[u] || {})),
        };
      }

      // save
      g('lfSave').addEventListener('click', () => {
        /* Read now, not when the create returns. The drawer is shared, and by
           the time the server answers it may hold a lead or another listing,
           whose floor field is not this one. */
        const floor = readFloor();
        if (floor && floor.error) {
          const fe = g('e_floor');
          if (fe) { fe.textContent = floor.error; fe.style.display = 'block'; }
          g('lfFloor').closest('.field').scrollIntoView({ block: 'center', behavior: 'smooth' });
          toast(floor.error);
          return;
        }
        if (!validate()) {
          revealAllErrors = true; validate();
          const first = document.querySelector('.lf .ferr[style*="block"]');
          if (first) first.closest('.field')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          toast('Fill in the required fields (*) first');
          return;
        }
        const data = collectListing();
        if (isNew) {
          /* The draft steps aside while the create is in flight and comes
             back if it fails -- a refused save must not cost the agent the
             listing they just finished typing. */
          LISTING_DRAFT_FLUSH = null; LISTING_FORM_SEQ++;
          const kept = { data: data, floor: draftFloor() };
          const sdId = SD.cur;
          clearListingDraft();
          const item = deriveLegacy(Object.assign(blankListing(), data, { verification_status: 'unverified', leads: 0, days: 0 }));
          LISTINGS_DATA.unshift(item);
          if (dbBacked) {
            toast('Saving…');
            SynListings.create(data).then((id) => {
              item.id = id;
              if (sdId) sdDelete(sdId);           /* finished: the draft has become a listing */
              toast('Listing created, saved, and unverified until the desk checks it');
              /* The floor needs the listing's id -- it lives in its own table
                 -- so it follows the create rather than riding on it. */
              saveFloor(id, floor);
              ensurePin(id, data);
              /* The row now has its server id; anything keyed by id (the
                 campaign picker, the archive) needs to see that. */
              announceListings();
            }).catch((e) => {
              /* Not a listing, then: take the card back down and put the
                 draft back, so it is one tap from a second attempt. */
              const k = LISTINGS_DATA.indexOf(item);
              if (k >= 0) LISTINGS_DATA.splice(k, 1);
              writeListingDraft(kept.data, kept.floor);
              SD.cur = sdId; sdQueue(kept.data, kept.floor, WZ_TOTAL, true);
              saveListings(); renderListings();
              toast('Not saved to the server: ' + ((e && e.message) || e) + ', kept as a draft in Listings');
            });
          } else {
            toast('Listing created here only, sign in as an agency to save it');
          }
        } else {
          Object.assign(LISTINGS_DATA[idx], data); // verification_status left untouched (system-owned)
          deriveLegacy(LISTINGS_DATA[idx]);
          const id = LISTINGS_DATA[idx].id;
          if (dbBacked && id) {
            /* Said before the request, not after. An edit over a slow
               connection was silent until it finished, which reads as a dead
               button -- the same reason the create branch already did this. */
            toast('Saving…');
            SynListings.update(id, data)
              .then(() => { toast('Listing updated'); announceListings(); ensurePin(id, data); })
              .catch((e) => toast('Not saved to the server: ' + ((e && e.message) || e)));
            saveFloor(id, floor);
          } else {
            toast(dbBacked ? 'Updated here only, this listing has no server record' : 'Listing updated');
          }
        }
        saveListings(); renderListings(); closeLead();
      });
      /* The floor is a separate table with its own permissions, so it is
         read separately rather than riding on the listing row -- and failing
         to read it must not stop the rest of the form working. */
      (function () {
        const fEl = g('lfFloor'), aEl = g('lfFloorActive');
        if (!fEl || isNew || !d.id || !window.SynListings) return;
        SynListings.getNegotiationFloor(d.id).then(function (row) {
          if (!row) return;                      // no floor: the placeholder says so
          fEl.value = row.floor_amount == null ? '' : Number(row.floor_amount);
          if (aEl) aEl.value = row.is_active === false ? 'off' : 'on';
        });
      })();

      /* Its own call and its own message. The floor lives in another table
         with stricter permissions -- an agent can save a listing and still be
         refused the floor -- so folding it into the listing result would
         report one outcome for two different things. A function declaration,
         so the save handler above can reach it. */
      /* Null when the field is absent or blank -- leaving it blank is not
         setting zero. */
      function readFloor() {
        const fEl = g('lfFloor'), aEl = g('lfFloorActive');
        if (!fEl) return null;
        const raw = fEl.value.trim();
        if (raw === '') return null;
        const amount = parseFloat(raw);
        if (!isFinite(amount) || amount <= 0) return { error: 'A floor has to be a positive amount' };
        return { amount: amount, active: !aEl || aEl.value !== 'off' };
      }
      /* The floor as typed, for the draft: raw, because a half-typed amount
         is still what the agent was in the middle of. */
      function draftFloor() {
        const fEl = g('lfFloor'), aEl = g('lfFloorActive');
        return { raw: fEl ? fEl.value.trim() : '', active: aEl ? aEl.value : 'on' };
      }
      const floorEl = g('lfFloor');
      if (floorEl) floorEl.addEventListener('input', () => {
        const fe = g('e_floor'); if (fe) fe.style.display = 'none';
      });

      if (isNew) {
        if (draft && draft.floor) {
          if (floorEl && draft.floor.raw) floorEl.value = draft.floor.raw;
          const fa = g('lfFloorActive');
          if (fa) fa.value = draft.floor.active === 'off' ? 'off' : 'on';
        }
        const fresh = g('lfDraftFresh');
        if (fresh) fresh.addEventListener('click', () => {
          if (!window.confirm('Start a blank listing? The one you had not saved will be discarded.')) return;
          LISTING_DRAFT_FLUSH = null;
          const gone = SD.cur; SD.cur = null; if (gone) sdDelete(gone);
          clearListingDraft(); renderListings();
          listingForm({ st: 'pending' }, -1);
        });

        const seq = ++LISTING_FORM_SEQ;
        const note = g('lfDraftNote');
        let timer = null;
        const snapshot = (immediate) => {
          clearTimeout(timer);
          const saveBtn = g('lfSave');
          if (seq !== LISTING_FORM_SEQ || !saveBtn || !drawer.contains(saveBtn)) return;
          const data = collectListing();
          const fl = draftFloor();
          /* Nothing typed is nothing to keep -- opening the form and closing
             it again must not leave an empty "draft" on the Listings page. */
          const empty = !data.title && !data.description && !data.address
            && data.price == null && !(data.media || []).length && !fl.raw;
          if (empty) return;
          const first = !readListingDraft();
          sdQueue(data, fl, wzStep, immediate === true);
          if (!writeListingDraft(data, fl)) return;
          if (note) note.textContent = 'Kept on this device as you type, close this and it will be here when you come back.';
          if (first) renderListings();
        };
        const soon = () => { clearTimeout(timer); timer = setTimeout(snapshot, 600); };
        const root = drawer.querySelector('.lf');
        if (root) ['input', 'change', 'click', 'lf:changed'].forEach((t) => root.addEventListener(t, soon));
        LISTING_DRAFT_FLUSH = () => snapshot(true);
      } else {
        /* An edit form is open; nothing of a new listing's is at stake. */
        LISTING_FORM_SEQ++; LISTING_DRAFT_FLUSH = null;
      }

      function saveFloor(id, fl) {
        if (!fl || fl.error || !id || !window.SynListings) return;
        const amount = fl.amount, active = fl.active;
        SynListings.setNegotiationFloor(id, amount, active)
          .then(function () {
            toast(active
              ? 'Tayo will not go below ₦' + amount.toLocaleString()
              : 'Tayo will not negotiate this listing');
          })
          .catch(function (e) { toast((e && e.message) || 'The floor was not saved'); });
      }

      const del = g('lfDel');
      if (del) del.addEventListener('click', () => {
        const gone = LISTINGS_DATA[idx];
        LISTINGS_DATA.splice(idx, 1); saveListings(); renderListings(); closeLead();
        if (dbBacked && gone && gone.id) {
          SynListings.remove(gone.id)
            .then(() => toast('Listing deleted'))
            .catch((e) => toast('Removed here, but the server still has it: ' + ((e && e.message) || e)));
        } else { toast('Listing deleted'); }
      });

      /* ══ THE LISTING WIZARD (Eden, 2026-10-11) ══════════════════════════════════════
         "Instead of the side pane, use a form wizard that saves drafts." For a NEW listing the
         long form is walked through in six steps (the home, where, details, price, photos,
         review), 3 to 5 questions at a time, one column, big targets. It is the same form and
         the same fields underneath, so every check, the pin map, the photo upload and "fill
         from my description" work exactly as before; the steps only decide which part is on
         screen. What was typed is saved as a draft after every change and when you leave
         (see sdQueue), and the step you were on is remembered. Each step is checked when you
         press Next, and Review lists anything still missing with a button back to it.
         Editing an existing listing keeps the single side form. ═════════════════════════ */
      if (isNew) (function wizardify() {
        const root = drawer.querySelector('.lf'); if (!root) return;
        const byLegend = {};
        root.querySelectorAll('fieldset.lf-sec').forEach((fs) => { const lg = fs.querySelector('legend'); byLegend[(lg ? lg.textContent : '').trim().toLowerCase()] = fs; });
        const pick = (...names) => names.map((n) => Object.keys(byLegend).find((k) => k.indexOf(n) === 0)).filter(Boolean).map((k) => byLegend[k]);
        const STEPS = [
          { id: 'home', t: 'The home', secs: pick('basics'), errs: ['e_title', 'e_desc'] },
          { id: 'where', t: 'Where', secs: pick('location'), errs: ['e_addr', 'e_city', 'e_state', 'e_lat'] },
          { id: 'details', t: 'Details', secs: pick('the deal', 'specifications'), errs: ['e_units', 'e_beds'] },
          { id: 'price', t: 'Price & terms', secs: pick('pricing', 'negotiation', 'trust'), errs: ['e_price'] },
          { id: 'photos', t: 'Photos', secs: pick('media'), errs: ['e_img'] },
          { id: 'review', t: 'Review', secs: [], errs: [] },
        ];
        const inputOfErr = {}; Object.keys(ERR_OF).forEach((k) => { inputOfErr[ERR_OF[k]] = k; });
        /* wrap each step's fieldsets */
        const pages = STEPS.map((st) => {
          const sec = document.createElement('section'); sec.className = 'wz-step'; sec.dataset.wz = st.id; sec.hidden = true;
          st.secs.forEach((fs) => sec.appendChild(fs));
          return sec;
        });
        const review = pages[pages.length - 1];
        review.innerHTML = '<div id="wzReview"></div>';
        const saveBtn = g('lfSave'), draftNote = g('lfDraftNote');
        review.appendChild(saveBtn); if (draftNote) review.appendChild(draftNote);
        pages.forEach((p) => root.appendChild(p));
        /* The fast lane: the description, with its Fill button, goes FIRST on step one. */
        const home = pages[0];
        const descField = g('lfDesc') && g('lfDesc').closest('.field'), fillBtn = g('lfFill'), fillNote = g('lfFillNote');
        const firstSec = home.querySelector('fieldset');
        if (firstSec && descField) {
          const lead = document.createElement('p'); lead.className = 'wz-fast';
          lead.innerHTML = '<b>Fastest way to start:</b> paste the text you would send on WhatsApp below and press <b>Fill</b>. Synapse reads it and fills the rest for you to check.';
          const anchor = firstSec.querySelector('legend').nextSibling;
          [lead, descField, fillBtn, fillNote].filter(Boolean).forEach((n) => firstSec.insertBefore(n, anchor));
        }
        /* chrome: progress at the top, buttons at the bottom */
        const head = document.createElement('div'); head.className = 'wz-head';
        head.innerHTML = '<div class="wz-k" id="wzK" aria-live="polite"></div><div class="wz-bar" aria-hidden="true"><i id="wzBar"></i></div>'
          + '<ol class="wz-dots">' + STEPS.map((st, i) => '<li><button type="button" data-wz-go="' + i + '" aria-label="Step ' + (i + 1) + ': ' + st.t + '"><b>' + (i + 1) + '</b><span>' + st.t + '</span></button></li>').join('') + '</ol>';
        root.parentNode.insertBefore(head, root);
        const foot = document.createElement('div'); foot.className = 'wz-foot';
        foot.innerHTML = '<button type="button" class="btn btn-ghost" id="wzBack">Back</button><span class="wz-sp"></span>'
          + '<button type="button" class="btn btn-ghost" id="wzKeep">Save draft &amp; close</button><button type="button" class="btn btn-primary" id="wzNext">Next</button>';
        root.parentNode.appendChild(foot);

        const nextBtn = g('wzNext'), backBtn = g('wzBack'), keepBtn = g('wzKeep');
        let at = Math.min(Math.max(wzStep, 1), STEPS.length) - 1;
        const stepErrs = (i) => STEPS[i].errs.filter((e) => LAST_CHECKS[e]);
        function checkStep(i) {
          STEPS[i].errs.forEach((e) => { if (inputOfErr[e]) touched[inputOfErr[e]] = true; });
          validate();
          const bad = stepErrs(i);
          if (bad.length) {
            const el = g(bad[0]); const f = el && el.closest('.field');
            if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center', behavior: 'smooth' });
            toast(LAST_CHECKS[bad[0]] || 'Finish this step first');
            return false;
          }
          return true;
        }
        function renderReview() {
          const d = collectListing(); validate();
          const row = (k, v) => v ? '<div class="wz-row"><span>' + k + '</span><b>' + esc2(String(v)) + '</b></div>' : '';
          const where = [d.address, d.city, d.state].filter(Boolean).join(', ');
          const missing = [];
          STEPS.forEach((st, i) => { st.errs.forEach((e) => { if (LAST_CHECKS[e]) missing.push({ i: i, msg: LAST_CHECKS[e], st: st.t }); }); });
          const photos = (d.media || []).length;
          let html = '<div class="wz-sum">'
            + row('Title', d.title) + row('Type', TYPE_LABEL[d.property_type] || d.property_type) + row('Deal', DEAL_LABEL[d.deal_structure || d.listing_type] || '')
            + row('Where', where) + row('Price', Number(d.price) > 0 ? '\u20a6' + Number(d.price).toLocaleString('en-NG') + (d.price_period && d.price_period !== 'total' ? ' / ' + String(d.price_period).replace('per_', '') : '') : '')
            + row('Bedrooms', d.bedrooms) + row('Photos', photos ? photos + (photos === 1 ? ' photo' : ' photos') : '') + '</div>';
          if (missing.length) {
            html += '<div class="wz-miss" role="alert"><b>Still needed before you can create it</b>' + missing.map((m) => '<button type="button" data-wz-go="' + m.i + '"><span>' + esc2(m.st) + '</span> ' + esc2(m.msg) + '</button>').join('') + '</div>';
          }
          /* No CAC certificate yet: the draft is kept and creating waits for the paper. */
          const G = window.SynLG ? window.SynLG() : null, blocked = !!(G && G.known && !G.ok);
          if (blocked) html += '<div class="wz-miss wz-cac"><b>One more thing: your CAC certificate</b><p>It is not on file yet, so this listing stays a draft. Upload the certificate and come back to publish it.</p>'
            + '<button type="button" data-wz-cac>Upload the certificate</button></div>';
          g('wzReview').innerHTML = html;
          saveBtn.hidden = !!missing.length || blocked;
        }
        function show(i, opts) {
          at = Math.min(Math.max(i, 0), STEPS.length - 1); wzStep = at + 1;
          pages.forEach((p, k) => { p.hidden = k !== at; });
          const last = at === STEPS.length - 1;
          g('wzK').textContent = 'Step ' + (at + 1) + ' of ' + STEPS.length + ' \u00b7 ' + STEPS[at].t;
          g('wzBar').style.width = Math.round((at + 1) / STEPS.length * 100) + '%';
          head.querySelectorAll('[data-wz-go]').forEach((b, k) => { b.classList.toggle('on', k === at); b.classList.toggle('done', k < at); if (k === at) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
          backBtn.hidden = at === 0; nextBtn.hidden = last;
          if (last) renderReview(); else saveBtn.hidden = true;
          if (!opts || !opts.quiet) { drawer.scrollTop = 0; root.dispatchEvent(new Event('lf:changed')); }
          if (!opts || !opts.quiet) { const f = pages[at].querySelector('input:not([type=hidden]):not([type=checkbox]),textarea,select'); if (f && !(window.matchMedia && matchMedia('(max-width:720px)').matches)) f.focus({ preventScroll: true }); }
          if (window.SynIcons && SynIcons.hydrate) SynIcons.hydrate(pages[at]);
        }
        /* After "Fill", land on the first step that still needs something; the rest is already done. */
        root.addEventListener('lf:filled', () => {
          validate();
          const k = STEPS.findIndex((st) => st.errs.some((e) => LAST_CHECKS[e]));
          setTimeout(() => show(k < 0 ? STEPS.length - 1 : k), 900);
        });
        nextBtn.addEventListener('click', () => { if (checkStep(at)) show(at + 1); });
        backBtn.addEventListener('click', () => show(at - 1));
        keepBtn.addEventListener('click', () => { if (LISTING_DRAFT_FLUSH) LISTING_DRAFT_FLUSH(); toast('Draft saved. Find it in Listings.'); closeLead(); });
        drawer.addEventListener('click', (e) => {
          const go = e.target.closest('[data-wz-go]');
          if (go && drawer.contains(go)) {
            const to = +go.dataset.wzGo;
            /* backwards is always free; forwards only once everything before it passes */
            if (to <= at) { show(to); return; }
            for (let k = at; k < to; k++) { if (!checkStep(k)) { show(k); return; } }
            show(to); return;
          }
          if (e.target.closest('[data-wz-cac]')) { if (LISTING_DRAFT_FLUSH) LISTING_DRAFT_FLUSH(); closeLead(); goToPane('verification'); }
        });
        const xb = drawer.querySelector('.x'); if (xb) xb.addEventListener('click', () => { if (LISTING_DRAFT_FLUSH) LISTING_DRAFT_FLUSH(); }, true);
        show(at, { quiet: true });
      })();
    }

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

       Panes are REMOVED, not hidden. buildNav() mirrors the rail into the
       phone sheet by reading it at open time, so a hidden entry would come
       back on mobile; and a pane still in the DOM can be reached by a stale
       hash or by any code that calls goToPane. Gone means gone in both.

       This is the second lock, never the only one. It runs after a round
       trip, so there is a moment on load where the full rail exists -- the
       database policies are what actually stop an agent writing the brand,
       and they were checked before this was written. */
    const ROLE_PANES = {
      agency_owner: null,   /* null = every pane */
      agency_admin: ['overview','crm','negotiator','listings','social','marketing','agents','tours','brand','verification'],
      agent:        ['overview','crm','negotiator','listings','social','tours'],
    };

    function applyRole(role) {
      /* An unknown role is treated as the least privileged thing we know
         about rather than the most. A null role means the lookup failed or
         this account is not a member -- neither is a reason to open the
         company's books. */
      const allowed = Object.prototype.hasOwnProperty.call(ROLE_PANES, role)
        ? ROLE_PANES[role]
        : ROLE_PANES.agent;
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
      if (allowed === null) return;                      // owner: nothing to strip

      const keep = new Set(allowed);
      document.querySelectorAll('#tabs a[data-pane]').forEach((a) => {
        if (!keep.has(a.dataset.pane)) a.remove();
      });
      document.querySelectorAll('.pane[id^="pane-"]').forEach((pane) => {
        if (!keep.has(pane.id.replace('pane-', ''))) pane.remove();
      });
      /* A group header with nothing under it is a heading for an empty room. */
      document.querySelectorAll('#tabs .grp-sec').forEach((sec) => {
        if (!sec.querySelector('a[data-pane]')) sec.remove();
      });
      /* If the pane they were on has just gone, put them somewhere real. */
      if (!document.querySelector('.pane.on') && typeof goToPane === 'function') {
        goToPane('overview');
      }
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

    const escT = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const cmpScrim = document.getElementById('cmpScrim'), cmpModal = document.getElementById('cmpModal');
    let cmp = { li: 0, chans: new Set(), captions: null, hashtags: [], note: '', rec: '', loading: false, err: '' };

    function renderComposer(){
      const dynBefore = ['cmpGen', 'cmpSchedule'].reduce((m, id) => { const e = document.getElementById(id); if (e) m[id] = e.getBoundingClientRect().width; return m; }, {});
      /* X goes out on SYNAPSE'S X account (social-publish SYNAPSE_ACCOUNT_ONLY):
         agencies cannot connect their own yet. Said on the chip, where the
         choice is made, so nobody picks X expecting their own account. The
         post's link is still theirs, so the enquiries are too. */
      const chanChip = (id) => {
        const nm = CH_LABEL[id] + (id === 'x' ? ' (posted on Synapse’s X account; enquiries still come to you)' : '');
        return `<button type="button" class="cmp-chan ${cmp.chans.has(id) ? 'on' : ''}" data-chan="${id}" aria-pressed="${cmp.chans.has(id)}" aria-label="${nm}" title="${nm}">${chnBadge(id)}<span class="cc-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7"/></svg></span></button>`;
      };
      let html = `<div class="cmp-top"><div><h2>New post</h2><p>Pick a listing and where it goes. Synapse writes the captions.</p></div>`
        + `<button class="x" id="cmpX" aria-label="Close">×</button></div>
        <div class="cmp-step"><b>1</b>Listing</div>
        <div class="cmp-listings" role="group" aria-label="Verified listings">${POST_LISTINGS.map((l, i) => `<button class="cmp-lst ${i === cmp.li ? 'on' : ''}" data-li="${i}" aria-pressed="${i === cmp.li}">`
          + `${photoHtml(l.img, { cls: 'cl-ph' })}${l.verification_status === 'verified' ? vStamp('ok', 'sm') : ''}<span class="cl-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7"/></svg></span>`
          + `<span class="cl-txt"><span class="t">${l.title.split(',')[0]}</span><span class="p">${nairaShort(l.price)}</span></span></button>`).join('')}</div>
        <div class="cmp-step"><b>2</b>Channels<span class="cmp-count">${cmp.chans.size ? cmp.chans.size + ' selected' : 'pick at least one'}</span></div>
        <!-- X WAS MISSING FROM THIS LIST AND POSTS WERE GOING OUT ON IT.
             Synapse's own X account twins every listing, so the platform has
             been publishing all along -- with a caption written for Instagram
             and reworded, because no agency was ever offered the chance to
             write one for it. Reported exactly that way: "X is not an option
             but the app is posting to all the connected platforms." -->
        <div class="cmp-chans">${['instagram', 'tiktok', 'youtube', 'facebook', 'whatsapp', 'x', 'telegram'].map(chanChip).join('')}</div>
        `;
      const genBtn = `<button class="btn ${cmp.captions ? 'cmp-again' : 'btn-primary'} cmp-gen" id="cmpGen"${cmp.chans.size === 0 ? ' disabled title="Pick at least one channel"' : ''}>${cmp.loading ? '<span class="spin2"></span>Writing captions…' : '<span data-icon="spark"></span> ' + (cmp.captions ? 'Write again' : 'Generate captions with AI')}</button>`;
      if (!cmp.captions) html += `<div class="cmp-foot">${genBtn}</div>`;
      if (cmp.err) html += `<div class="cmp-err" role="alert">${cmp.err}</div>`;
      if (cmp.captions) {
        html += `<div class="cmp-step"><b>3</b>Captions<span class="cmp-count">tap one to edit</span></div>`;
        Object.keys(cmp.captions).forEach((ch) => {
          /* The textarea stays as the caption's store -- the hashtag chips
             and the send both read it -- but hidden: editing happens in the
             full-size editor, not in a box you scroll three lines at a time. */
          html += `<div class="cap-card"><div class="ch">${chnBadge(ch)} ${CH_LABEL[ch]} ${ch === cmp.rec ? '<span class="rec">✦ recommended</span>' : ''}</div>`
            + `<button type="button" class="cap-open" data-capopen="${ch}" aria-label="Open the ${escT(CH_LABEL[ch] || ch)} caption to edit">`
            + `<span class="cap-prev" data-prev="${ch}">${escT(cmp.captions[ch])}</span>`
            + `<span class="cap-hint">Tap to edit, or ask for it shorter, longer, warmer\u2026</span></button>`
            + `<textarea data-cap="${ch}" hidden>${escT(cmp.captions[ch])}</textarea>`
            + `<div class="cap-warn" data-warn="${ch}">${capWarnHtml(ch, cmp.captions[ch])}</div>${tagRowHtml(ch)}</div>`;
        });
        if (cmp.hashtags.length) html += `<div class="cmp-tags">${cmp.hashtags.map(escT).join('  ')}</div>`;
        if (cmp.note) html += `<div class="cmp-note"><b>Tayo's tip:</b> ${escT(cmp.note)}</div>`;
        html += `<div class="cmp-foot">${genBtn}<button class="btn btn-primary" id="cmpSchedule">Send for approval \u2192</button></div>`;
      }
      cmpModal.innerHTML = html;
      /* Generate becomes "Write again" beside a new "Send for approval": the
         buttons glide from where they were to where they are now. */
      Object.keys(dynBefore).forEach((id) => { const e = document.getElementById(id); if (e) Dyn.glide(e, dynBefore[id]); });
      const send = document.getElementById('cmpSchedule');
      if (send && !dynBefore.cmpSchedule && cmpModal.classList.contains('on')) send.classList.add('dyn-enter');
    }
    /* Takes the listing to open on. The pipeline's "Generate content" button
       sits on a specific card, and opening the composer on whichever listing
       happened to be first would have generated captions for the wrong
       property -- silently, since the composer names the listing only once. */
    /* TAKES AN ID NOW, because the index it used to take was an index into a
       different array. It bounds-checked `li` against LISTINGS_DATA.length and
       then read POST_LISTINGS[li] -- and POST_LISTINGS is FILTERED to active
       listings. One archived listing anywhere above the one you clicked and
       the composer silently opened on a different property: same button, same
       click, wrong home, captions written about it and filed against it.

       An id cannot drift out of step with an array it is not an index into.
       A number is still accepted so the taskbar's "+" keeps working. */
    function openComposer(which){
      let idx = 0;
      if (typeof which === 'string') {
        const found = POST_LISTINGS.findIndex((l) => l.id === which);
        if (found < 0) { toast('That listing is not one you can post about'); return; }
        idx = found;
      } else if (Number.isInteger(which) && which >= 0 && which < POST_LISTINGS.length) {
        idx = which;
      }
      if (!POST_LISTINGS.length) { toast('Add an active listing first'); return; }
      cmp = { li: idx, chans: new Set(), captions: null, hashtags: [], note: '', rec: '', angles: {}, loading: false, err: '' };
      renderComposer(); cmpScrim.classList.add('on'); cmpModal.classList.add('on');
      /* Not awaited: the composer opens now and the chips arrive a beat
         later, re-rendering themselves. Blocking a modal on a list of
         hashtags is the wrong trade in any session where it is slow.
         Re-read each time rather than cached for the page: somebody
         else on the team may have saved a group since this tab loaded. */
      loadTagGroups().then(function () {
        if (cmpModal.classList.contains('on')) renderComposer();
      });
    }
    function closeComposer(){ cmpScrim.classList.remove('on'); cmpModal.classList.remove('on'); }
    /* WHICH ANGLES THIS LISTING HAS ALREADY SPENT.
       social-generate rotates through six subjects -- the space, the area, the
       money, the checks, who it suits, why now -- and only repeats once all
       six are gone. It cannot do that on its own: it is stateless, so without
       being told what came before, every press of Generate starts from the top
       of the rotation and rewrites the same three captions. That was the bug.

       Kept per property, in this browser. localStorage is honestly the wrong
       home for it -- a colleague on another machine starts the rotation over --
       but the alternative is a row per generated-and-discarded draft, and a
       caption nobody scheduled should not leave anything behind in the
       database. Angles from posts that WERE scheduled are merged in below,
       and those are shared, so the shared half of this is the half that
       matters. */
    const ANGLE_KEY = 'synapse_angles_v1';
    function angleStore() {
      try { return JSON.parse(localStorage.getItem(ANGLE_KEY)) || {}; } catch (e) { return {}; }
    }
    function anglesUsedFor(propertyId) {
      const local = angleStore()[propertyId] || [];
      /* Anything already on the schedule for this listing counts as spent too,
         so a second person generating for it does not repeat what is queued. */
      /* Guarded: PIPE is declared in another block on this page, and a
         rotation hint is never worth throwing inside the Generate handler. */
      let scheduled = [];
      try {
        scheduled = (typeof PIPE !== 'undefined' && PIPE.social ? PIPE.social : [])
          .filter((r) => r.property_id === propertyId && r.payload && r.payload.angle)
          .map((r) => r.payload.angle);
      } catch (e) { /* no pipeline loaded in this view */ }
      return [...new Set(local.concat(scheduled))];
    }
    function rememberAngles(propertyId, angles) {
      if (!propertyId || !angles || !angles.length) return;
      try {
        const all = angleStore();
        all[propertyId] = [...new Set((all[propertyId] || []).concat(angles))];
        localStorage.setItem(ANGLE_KEY, JSON.stringify(all));
      } catch (e) { /* private mode: rotation still works for this page view */ }
    }

    async function generateCaptions(){
      if (cmp.chans.size === 0) return;
      cmp.loading = true; cmp.err = ''; renderComposer();
      try {
        const l = POST_LISTINGS[cmp.li];
        /* authToken(), NOT token() -- the same distinction as line 6230, and
           this is the second time it has been got wrong. token() belongs to
           the composer's IIFE, which closes at 11500; we are past it, so
           calling it here threw ReferenceError into the catch below and every
           press reported a network fault for a request that was never sent. */
        const tk = await authToken();
        const res = await fetch(SB_URL + '/functions/v1/social-generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + (tk || SB_KEY) },
          // Voice is the one brand field a fixed template cannot honour, so it
          // goes to the model that can. Sent only when the agency actually
          // wrote one, an absent voice must not become an invented one.
          body: JSON.stringify({
            /* The row, not POST_LISTINGS' projection of it -- see fullListing.
               Falls back to the projection if the listing has gone from
               LISTINGS_DATA, which is the old behaviour rather than a crash. */
            property: fullListing(l && l.id) || l,
            channels: [...cmp.chans],
            // what this listing has already been written about, so Generate
            // moves on to a new angle instead of rewording the last one
            usedAngles: anglesUsedFor(l && l.id),
            brand: window.BRAND ? {
              name: window.BRAND.name || null,
              tagline: window.BRAND.tagline || null,
              voice: window.BRAND.brand_voice || null,
              handle: (window.BRAND.social && window.BRAND.social.instagram) || null,
            } : null,
          }),
        });
        const d = await res.json().catch(() => ({}));
        cmp.loading = false;
        if (!res.ok || d.error || !d.captions || !Object.keys(d.captions).length) {
          /* Say which failure it was. social-generate now distinguishes "the
             reply was cut off" from "unreadable" from a transport fault, and
             flattening all three into one sentence is what let a truncation
             bug sit unnoticed behind "please try again". */
          cmp.err = (d && d.error) || 'Couldn’t generate captions right now, please try again.';
          renderComposer(); return;
        }
        cmp.captions = d.captions; cmp.hashtags = d.hashtags || []; cmp.note = d.note || ''; cmp.rec = d.recommendedChannel || '';
        cmp.angles = d.angles || {};
        rememberAngles(l && l.id, d.anglesUsed || []);
        renderComposer();
        /* The drafts have just been written for you: let them arrive decoded. */
        if (window.Scramble) cmpModal.querySelectorAll('.cap-prev').forEach((el) => Scramble.text(el, el.textContent));
      } catch (e) {
        /* NAMED, not guessed. This catch covers the fetch AND every line of
           setup around it, so "network hiccup" was being reported for a
           ReferenceError in our own code -- which sent the operator to check
           their connection while the bug sat in this function. A TypeError
           from fetch is the only genuine transport fault; anything else is
           ours and should say so and reach the console. */
        cmp.loading = false;
        const transport = e instanceof TypeError;
        cmp.err = transport
          ? 'Network hiccup \u2014 please try again.'
          : 'Something went wrong on our side \u2014 please try again.';
        if (!transport) console.error('generateCaptions', e);
        renderComposer();
      }
    }
    /* WHERE A GENERATED CAPTION GOES, which has been wrong twice.
       First it went nowhere: the button unshifted a card onto an in-memory
       array, so the work looked saved and was gone on the next reload. Then it
       went straight into the SCHEDULE, which is the other extreme -- a caption
       travelled from "the model just wrote this" to "queued to go out" with no
       read, no edit, no second version and no decision in between, and the
       approval column sat empty because nothing ever arrived in it.

       It files drafts now. Each channel keeps its OWN caption -- they are
       genuinely different pieces rather than rewordings, so putting the
       Instagram one on Facebook would be visibly wrong -- and each carries the
       angle it took, which is what stops the next generation repeating a
       subject this listing has already used.

       Scheduling happens afterwards, from the card, once a human has looked. */
    /* ── what a caption is missing ────────────────────────────────────────
       Checked against the listing in front of it, which is the part a generic
       linter cannot do: this one knows the price and the area because the
       property row is right there.

       WARNINGS, NEVER A BLOCK. An agent posting without a price may know
       something the check does not -- "on application" is a real answer in
       this market. A linter that refuses is a linter people route around.

       Only speaks when it knows: the price check runs only where the listing
       has a price, the area check only where it has a neighbourhood. A
       warning derived from a field we do not hold would be the product
       inventing requirements. */
    const CAP_FOLD = { instagram: 125, facebook: 250, x: 200, telegram: 400,
                       tiktok: 120, whatsapp: 300, youtube: 150 };

    function capWarnHtml(ch, text, listing) {
      const t = String(text || '');
      if (!t.trim()) return '';
      /* The composer's listing unless told otherwise: a caption opened from
         a card on the board belongs to that card's listing. */
      const l = POST_LISTINGS[cmp.li];
      const full = listing || fullListing(l && l.id) || l || {};
      const out = [];

      /* The price, in any of the shapes a caption might write it. Digits are
         the reliable signal -- "4.5m", "N4,500,000" and "4500000" are all
         somebody having said the number. */
      if (full.price && !/\d/.test(t)) {
        out.push('No price in this one \u2014 "how much?" is the comment you will get.');
      }

      const area = full.neighbourhood || full.city || '';
      if (area && t.toLowerCase().indexOf(String(area).toLowerCase()) === -1) {
        out.push('Does not name ' + esc2(area) + '. "3 bed, serviced" describes half of Lagos.');
      }

      /* The fold. Measured to the first line break as well as by length,
         because a caption whose opening line runs long is collapsed just the
         same. */
      const fold = CAP_FOLD[ch] || 200;
      if (t.length > fold * 3) {
        out.push('Long \u2014 ' + esc2(CH_LABEL[ch] || ch) + ' hides everything after about '
          + fold + ' characters behind "more".');
      }

      const tags = (t.match(/#[\w\u00c0-\u024f]+/g) || []).length;
      /* Instagram rejects the whole call over thirty rather than trimming, so
         this one is a real failure and not a matter of taste. */
      if (ch === 'instagram' && tags > 30) {
        out.push(tags + ' hashtags \u2014 Instagram refuses a post over 30.');
      }

      const letters = t.replace(/[^A-Za-z]/g, '');
      if (letters.length > 24 && letters === letters.toUpperCase()) {
        out.push('All capitals reads as an advert in a feed of photographs.');
      }

      if (!out.length) return '';
      return out.map((w) => '<span>\u26a0 ' + w + '</span>').join('');
    }

    /* One caption, everywhere it is shown in the composer. */
    function setComposerCaption(ch, text) {
      cmp.captions[ch] = text;
      const box = cmpModal.querySelector('textarea[data-cap="' + ch + '"]');
      if (box) box.value = text;
      const prev = cmpModal.querySelector('[data-prev="' + ch + '"]');
      if (prev) prev.textContent = text;
      const warn = cmpModal.querySelector('[data-warn="' + ch + '"]');
      if (warn) warn.innerHTML = capWarnHtml(ch, text);
    }

    /* The brand block social-generate honours. Only what the agency actually
       filled in -- an absent voice must not become an invented one. */
    function brandPayload() {
      return window.BRAND ? {
        name: window.BRAND.name || null,
        tagline: window.BRAND.tagline || null,
        voice: window.BRAND.brand_voice || null,
        handle: (window.BRAND.social && window.BRAND.social.instagram) || null,
      } : null;
    }

    /* ── the caption editor ───────────────────────────────────────────────
       A caption is a page of text -- the Facebook form alone is a headline,
       a spec list, the charges and a next step -- and it was edited through a
       three-line box you scrolled inside. This is the whole caption at a
       readable size, and a place to ask for it to be changed in words:
       "shorter", "lead with the service charge". The rewrite goes through the
       same writer as the first draft, with the same rules about facts, prices
       and addresses; the request steers it, it does not unlock anything.

       Nothing is kept until Save. A rewrite can be undone, and Cancel leaves
       the caption exactly as it was. */
    let CED = null;
    function openCaptionEditor(o) {
      if (!CED) {
        const el = document.createElement('div');
        el.className = 'ced-scrim';
        el.innerHTML = '<div class="ced" role="dialog" aria-modal="true" aria-labelledby="cedTitle">'
          + '<div class="ced-head"><span id="cedBadge"></span><h3 id="cedTitle">Caption</h3>'
          + '<button type="button" class="ced-x" id="cedX" aria-label="Close">\u00d7</button></div>'
          + '<textarea class="ced-text" id="cedText" spellcheck="true" aria-label="Caption"></textarea>'
          + '<div class="ced-meta"><span id="cedCount" class="ced-count"></span></div>'
          + '<div class="cap-warn" id="cedWarn"></div>'
          + '<div class="ced-ask"><label for="cedAsk" class="sr-only">Ask for a change</label>'
          + '<div class="ced-quick" role="group" aria-label="Quick rewrites">'
          +   '<button type="button" data-ask="Make it shorter.">Shorter</button>'
          +   '<button type="button" data-ask="Make it longer, with more of what the listing actually offers.">Longer</button>'
          +   '<button type="button" data-ask="Make it warmer and more personal.">Warmer</button>'
          +   '<button type="button" data-ask="Make it more formal.">More formal</button>'
          + '</div>'
          + '<div class="ced-askrow"><input id="cedAsk" type="text" autocomplete="off" maxlength="600"'
          +   ' placeholder="Or tell Tayo what to change">'
          +   '<button type="button" class="btn btn-ghost" id="cedGo">Rewrite</button></div>'
          + '<div class="ced-note" id="cedNote" role="status" aria-live="polite"></div></div>'
          + '<div class="ced-foot"><button type="button" class="btn btn-ghost" id="cedUndo" hidden>Undo</button>'
          + '<span class="sp"></span><button type="button" class="btn btn-ghost" id="cedCancel">Cancel</button>'
          + '<button type="button" class="btn btn-primary" id="cedSave">Save caption</button></div></div>';
        document.body.appendChild(el);
        const q = (id) => el.querySelector('#' + id);
        CED = { el: el, text: q('cedText'), count: q('cedCount'), warn: q('cedWarn'), ask: q('cedAsk'),
                go: q('cedGo'), note: q('cedNote'), undo: q('cedUndo'), save: q('cedSave'),
                badge: q('cedBadge'), title: q('cedTitle'), o: null, orig: '', history: [], busy: false };

        const meta = () => {
          const t = CED.text.value, ch = CED.o.ch;
          const fold = CAP_FOLD[ch] || 200;
          /* A number and where the platform cuts it off; the sentence is the tooltip. The bar is the same fact drawn. */
          CED.count.textContent = t.length.toLocaleString() + ' characters \u00b7 cut at ' + fold;
          CED.count.title = (CH_LABEL[ch] || ch) + ' shows about the first ' + fold + ' characters before \u201cmore\u201d.';
          CED.count.style.setProperty('--fill', Math.min(100, Math.round(t.length / Math.max(fold, 1) * 100)) + '%');
          CED.count.classList.toggle('over', t.length > fold);
          CED.warn.innerHTML = capWarnHtml(ch, t, CED.o.listing);
        };
        CED.meta = meta;
        const close = (force) => {
          if (!force && !CED.busy && CED.text.value !== CED.orig
              && !window.confirm('Close without saving? Your changes to this caption will be lost.')) return;
          el.classList.remove('on');
          CED.o = null;
          if (CED.opener && CED.opener.focus) CED.opener.focus();
        };
        CED.close = close;
        ['keydown', 'pointerdown', 'focus'].forEach((ev) => CED.text.addEventListener(ev, () => { if (window.Scramble) Scramble.finish(CED.text); }));
        Dyn.reset(CED.save, 'Save caption'); Dyn.reset(CED.go, 'Rewrite');
        const setBusy = (b) => {
          CED.busy = b;
          Dyn.set(CED.go, b && CED.rewriting ? Dyn.SPIN + 'Writing\u2026' : 'Rewrite');
          CED.text.setAttribute('aria-busy', String(b));
          [CED.go, CED.save, CED.undo].concat([].slice.call(el.querySelectorAll('.ced-quick button')))
            .forEach((x) => { x.disabled = b; });
        };
        CED.setBusy = setBusy;

        async function rewrite(instruction) {
          instruction = String(instruction || '').trim();
          if (!instruction) { CED.ask.focus(); CED.note.className = 'ced-note'; CED.note.textContent = 'Say what to change first, or tap one of the buttons.'; return; }
          if (CED.busy || !CED.o) return;
          const o = CED.o, before = CED.text.value;
          if (!before.trim()) { CED.note.className = 'ced-note err'; CED.note.textContent = 'There is no caption to change yet.'; return; }
          CED.rewriting = true; setBusy(true);
          CED.note.className = 'ced-note'; CED.note.textContent = 'Rewriting\u2026';
          try {
            const tk = await authToken();
            const res = await fetch(SB_URL + '/functions/v1/social-generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + (tk || SB_KEY) },
              body: JSON.stringify({
                property: o.property || { title: o.title || 'Listing' },
                channels: [o.ch],
                brand: brandPayload(),
                revise: { channel: o.ch, caption: before, instruction: instruction },
              }),
            });
            const d = await res.json().catch(() => ({}));
            if (CED.o !== o) return;              // closed or reopened meanwhile
            if (!res.ok || d.error || typeof d.caption !== 'string' || !d.caption.trim()) {
              CED.note.className = 'ced-note err';
              CED.note.textContent = (d && d.error) || 'Could not rewrite it just now \u2014 please try again.';
              return;
            }
            CED.history.push(before);
            /* Decoded into place, then the counter is read from the real text. */
            if (window.Scramble) Scramble.value(CED.text, d.caption, { duration: 900, done: () => { if (CED.o === o) meta(); } });
            else CED.text.value = d.caption;
            CED.undo.hidden = false;
            CED.ask.value = '';
            meta();
            CED.note.className = 'ced-note';
            CED.note.textContent = 'Rewritten.';
          } catch (err) {
            if (CED.o !== o) return;
            CED.note.className = 'ced-note err';
            CED.note.textContent = err instanceof TypeError
              ? 'Network hiccup \u2014 please try again.'
              : 'Something went wrong on our side \u2014 please try again.';
            if (!(err instanceof TypeError)) console.error('caption rewrite', err);
          } finally {
            if (CED.o === o) setBusy(false);
          }
        }

        CED.text.addEventListener('input', meta);
        el.querySelector('.ced-quick').addEventListener('click', (e) => {
          const b = e.target.closest('[data-ask]'); if (b) rewrite(b.dataset.ask);
        });
        CED.go.addEventListener('click', () => rewrite(CED.ask.value));
        CED.ask.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); rewrite(CED.ask.value); } });
        CED.undo.addEventListener('click', () => {
          if (window.Scramble) Scramble.finish(CED.text);
          if (!CED.history.length) return;
          CED.text.value = CED.history.pop();
          CED.undo.hidden = !CED.history.length;
          meta();
          CED.note.className = 'ced-note'; CED.note.textContent = 'Undone.';
        });
        q('cedX').addEventListener('click', () => close(false));
        q('cedCancel').addEventListener('click', () => close(false));
        el.addEventListener('mousedown', (e) => { if (e.target === el) close(false); });
        /* Escape closes the editor and nothing under it: the composer and the
           property preview both listen for Escape on the document. */
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { e.stopPropagation(); close(false); }
        });
        CED.save.addEventListener('click', () => {
          if (window.Scramble) Scramble.finish(CED.text);
          if (!CED.o || CED.busy) return;
          const text = CED.text.value.replace(/\s+$/, '');
          if (!text.trim()) { CED.note.className = 'ced-note err'; CED.note.textContent = 'A caption cannot be empty.'; return; }
          const done = CED.o.onSave(text);
          if (done && typeof done.then === 'function') {
            CED.rewriting = false; setBusy(true); CED.note.className = 'ced-note'; CED.note.textContent = 'Saving\u2026';
            Dyn.set(CED.save, Dyn.SPIN + 'Saving\u2026');
            const o = CED.o;
            done.then(() => {
                if (CED.o !== o) return;
                CED.busy = false; Dyn.set(CED.save, Dyn.TICK + 'Saved'); CED.save.disabled = false; CED.save.classList.add('is-done');
                setTimeout(() => { if (CED.o === o) close(true); }, 420);
              })
              .catch((err) => {
                if (CED.o !== o) return;
                setBusy(false); Dyn.set(CED.save, 'Save caption');
                CED.note.className = 'ced-note err';
                CED.note.textContent = (err && err.message) || 'That caption was not saved.';
              });
          } else {
            close(true);
          }
        });
      }

      if (window.Scramble) Scramble.finish(CED.text);
      CED.o = o;
      CED.opener = document.activeElement;
      CED.orig = String(o.text || '');
      CED.history = [];
      CED.text.value = CED.orig;
      CED.ask.value = '';
      CED.undo.hidden = true; CED.rewriting = false;
      Dyn.reset(CED.save, 'Save caption'); CED.save.classList.remove('is-done');
      CED.note.className = 'ced-note'; CED.note.textContent = '';
      CED.setBusy(false);
      CED.badge.innerHTML = chnBadge(o.ch);
      CED.title.textContent = (CH_LABEL[o.ch] || o.ch) + ' caption';
      CED.meta();
      CED.el.classList.add('on');
      CED.text.focus();
      CED.text.setSelectionRange(0, 0);
      CED.text.scrollTop = 0;
    }

    /* ═══ THE SHARE KIT is React (src/features/agency/ShareKit.tsx), with the WhatsApp Status offer; openShareKit(id) and
       rememberStatusOffer(id) are set on window there. */

    /* ── hashtag groups ───────────────────────────────────────────────────
       Under every caption rather than in one toolbar above them: the captions
       are genuinely different per channel -- different subjects, not retoned
       copies -- so the tags that belong on the Instagram one are not always
       the ones for Facebook.

       Loaded once with the composer and kept; they change rarely and a round
       trip per keystroke would be absurd. */
    let TAG_GROUPS = [];
    function loadTagGroups() {
      if (!window.SynListings || !SynListings.listHashtagGroups) return Promise.resolve();
      return SynListings.listHashtagGroups()
        .then(function (g) { TAG_GROUPS = g || []; })
        /* A failed load costs the chips, not the composer. */
        .catch(function (e) { TAG_GROUPS = []; console.error('hashtag groups', e); });
    }

    function tagRowHtml(ch) {
      const chips = TAG_GROUPS.map((g) =>
        '<button type="button" class="tagchip" data-tag-add="' + esc2(g.id) + '" '
        + 'data-tag-ch="' + esc2(ch) + '" title="' + esc2((g.tags || []).map((t) => '#' + t).join(' ')) + '">'
        + esc2(g.name) + ' <i>' + (g.tags || []).length + '</i></button>').join('');
      return '<div class="tagrow">' + chips
        + '<button type="button" class="tagchip add" data-tag-save="' + esc2(ch) + '">'
        + '\uff0b Save these</button></div>';
    }

    /* Whatever is already in this caption, without the hash, lowercased for
       comparison only. */
    function tagsIn(text) {
      return (String(text || '').match(/#[\w\u00c0-\u024f]+/g) || [])
        .map((t) => t.slice(1));
    }

    document.addEventListener('click', function (e) {
      const add = e.target.closest && e.target.closest('[data-tag-add]');
      if (add) {
        const g = TAG_GROUPS.find((x) => x.id === add.dataset.tagAdd);
        const ch = add.dataset.tagCh;
        const box = cmpModal.querySelector('textarea[data-cap="' + ch + '"]');
        if (!g || !box) return;
        /* SKIPS WHAT IS ALREADY THERE. Tapping twice, or tapping two groups
           that overlap, must not produce #lekki #lekki -- and Instagram reads
           those as one tag, so the agency should not have to notice. */
        const have = tagsIn(box.value).map((t) => t.toLowerCase());
        const fresh = (g.tags || []).filter((t) => have.indexOf(String(t).toLowerCase()) === -1);
        if (!fresh.length) { toast('Already in this caption'); return; }
        /* Through the one setter, so the preview, the store and the caption
           check below (which counts hashtags -- going past thirty shows now,
           not at publish) all move together. */
        setComposerCaption(ch, box.value.replace(/\s+$/, '') + '\n\n'
          + fresh.map((t) => '#' + t).join(' '));
        return;
      }

      const save = e.target.closest && e.target.closest('[data-tag-save]');
      if (save) {
        const ch = save.dataset.tagSave;
        const box = cmpModal.querySelector('textarea[data-cap="' + ch + '"]');
        if (!box) return;
        const tags = tagsIn(box.value);
        if (!tags.length) { toast('No hashtags in this caption to save'); return; }
        /* The group is made FROM the caption already written, which is the
           whole interaction -- nobody opens a settings screen to type
           hashtags. */
        const name = window.prompt('Name this group of ' + tags.length + ' hashtags', '');
        if (!name || !name.trim()) return;
        save.disabled = true;
        SynListings.saveHashtagGroup(name, tags)
          .then(loadTagGroups)
          .then(function () { save.disabled = false; renderComposer(); toast('Saved \u2014 tap it on any caption'); })
          .catch(function (err) {
            save.disabled = false;
            toast((err && err.message) || 'Could not save that group');
          });
      }
    });

    function scheduleFromComposer(){
      const l = POST_LISTINGS[cmp.li];
      cmpModal.querySelectorAll('textarea[data-cap]').forEach((t) => { cmp.captions[t.dataset.cap] = t.value; });
      const chans = [...cmp.chans].filter((c) => cmp.captions[c]);
      if (!chans.length) { toast('Nothing to send yet, generate the captions first'); return; }

      const btn = document.getElementById('cmpSchedule');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      /* Captions land in APPROVAL, not in the schedule. This used to queue
         social_posts straight from the composer, which meant a caption went
         from "the model just wrote this" to "queued to go out" with nothing in
         between -- no read, no edit, no second version, no decision. A
         generated caption is a draft until somebody says otherwise, and the
         approval column is where somebody says otherwise.

         It also skipped the review queue entirely, so the column existed and
         nothing ever arrived in it.

         saveGeneration files one row per channel with the angle it took, which
         is what social-generate reads to avoid rewriting the same subject next
         time. Scheduling happens from the card, once a human has looked. */
      const variants = chans.map((c) => ({
        platform: c,
        caption: cmp.captions[c],
        /* angleKey, not angle: saveGeneration files anything it does not
           recognise as 'custom' rather than guessing, and the composer's
           angles come back keyed by channel. */
        angleKey: (cmp.angles || {})[c],
      }));

      SynListings.saveGeneration(l.id, variants).then((r) => {
        const n = (r && r.saved) || 0;
        if (!n) throw new Error('Nothing could be filed, none of those channels has a content type yet.');
        toast(n + (n === 1 ? ' caption' : ' captions') + ' sent for approval, review them in Draft');
        closeComposer();
        if (typeof loadPipeline === 'function') loadPipeline();
      }).catch((err) => {
        if (btn) { btn.disabled = false; btn.textContent = 'Send for approval →'; }
        toast((err && err.message) || 'Could not send those for approval');
        console.error('saveGeneration failed', err);
      });
    }
    /* Live as it is typed, and only the one box being edited is redrawn --
       re-rendering the composer on every keystroke would move the caret. */
    document.addEventListener('input', function (e) {
      const t = e.target.closest && e.target.closest('textarea[data-cap]');
      if (!t) return;
      const box = t.parentElement && t.parentElement.querySelector('[data-warn]');
      if (box) box.innerHTML = capWarnHtml(t.dataset.cap, t.value);
    });

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

    document.getElementById('newPostBtn').addEventListener('click', openComposer);
    cmpScrim.addEventListener('click', closeComposer);
    cmpModal.addEventListener('click', (e) => {
      if (e.target.closest('#cmpX')) { closeComposer(); return; }
      const lst = e.target.closest('[data-li]'); if (lst) { cmp.li = +lst.dataset.li; renderComposer(); return; }
      const chan = e.target.closest('[data-chan]'); if (chan) { const id = chan.dataset.chan; cmp.chans.has(id) ? cmp.chans.delete(id) : cmp.chans.add(id); renderComposer(); return; }
      if (e.target.closest('#cmpGen')) { generateCaptions(); return; }
      if (e.target.closest('#cmpSchedule')) { scheduleFromComposer(); return; }
      const open = e.target.closest('[data-capopen]');
      if (open) {
        const ch = open.dataset.capopen;
        const l = POST_LISTINGS[cmp.li];
        openCaptionEditor({
          ch: ch, text: cmp.captions[ch] || '',
          property: fullListing(l && l.id) || l,
          onSave: (text) => { setComposerCaption(ch, text); },
        });
      }
    });

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
       it is built from. goToPane still asks whether the panel is open through `tpanel`. */
    const tpanel = document.getElementById('tpanel');

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
    /* Notifications are DERIVED from real state, never authored. The previous
       list named a buyer, a lead SLA and three properties that do not exist, so
       the bell always showed four unread items about nothing. Each item now
       carries a `pane` (and optionally a listing id) so clicking it takes you to
       the thing it is about, which is the only reason to show it at all. */
    /* The bell itself is React (src/features/agency/Bell.tsx): it keeps the list of items already dealt with, draws the panel
       and goes where an item points. What the items are is derived here, beside the state it reads, and handed over through
       window.SynNoti.items(). `key` identifies an item in the handled list, so it keeps the form it always had. */
    function notiKey(n) { return [n.type, n.pane || '', n.task || '', n.title, n.sub].join('|'); }

    function notiItems() {
      const out = [];
      const L = (typeof LISTINGS_DATA !== 'undefined' && Array.isArray(LISTINGS_DATA)) ? LISTINGS_DATA : [];

      const pending = L.filter(l => l.verification_status !== 'verified');
      if (pending.length) {
        out.push({ type: 'verification', tag: 'Verification', icon: 'shield', pane: 'listings',
          title: pending.length + ' listing' + (pending.length === 1 ? '' : 's') + ' awaiting verification',
          sub: pending.length === 1 ? (pending[0].title || pending[0].t) : 'Not yet checked by Synapse',
          group: 'Today' });
      }

      /* This never fired once. The comment here said freshness() returns
         { expired, left }; it returned { cls, label, expired, warn } and no
         `left` at all, so `f.left <= 3` was `undefined <= 3`, which is false
         every time. An agency was therefore never warned BEFORE a listing
         went dark -- only afterwards, by the expired reminder below, when
         buyers had already stopped seeing it. `warn` is the flag that means
         this, and freshness() now returns `left` too. */
      const expiring = L.filter(l => { try { return freshness(l).warn; } catch (e) { return false; } });
      if (expiring.length) {
        out.push({ type: 'reminder', tag: 'Reminder', icon: 'pending', pane: 'listings',
          title: expiring.length + ' listing' + (expiring.length === 1 ? '' : 's') + ' expiring soon',
          sub: 'Re-list to keep ' + (expiring.length === 1 ? 'it' : 'them') + ' visible to buyers',
          group: 'Today' });
      }
      const expired = L.filter(l => { try { return freshness(l).expired; } catch (e) { return false; } });
      if (expired.length) {
        out.push({ type: 'reminder', tag: 'Reminder', icon: 'pending', pane: 'listings',
          title: expired.length + ' listing' + (expired.length === 1 ? '' : 's') + ' expired',
          sub: 'Hidden from buyers until re-listed', group: 'Today' });
      }

      if (typeof leads !== 'undefined' && Array.isArray(leads) && leads.length) {
        const fresh = leads.filter(x => x.stage === 'New');
        if (fresh.length) {
          out.push({ type: 'lead', tag: 'Lead', icon: 'user', pane: 'crm',
            title: fresh.length + ' new lead' + (fresh.length === 1 ? '' : 's'),
            sub: 'Waiting on a first response', group: 'Today' });
        }
      }

      if (typeof posts !== 'undefined' && Array.isArray(posts)) {
        const appr = posts.filter(p => p.stage === 'approval');
        if (appr.length) {
          out.push({ type: 'social', tag: 'Social', icon: 'share', pane: 'social',
            title: appr.length + ' post' + (appr.length === 1 ? '' : 's') + ' awaiting approval',
            sub: 'In the social studio', group: 'Today' });
        }
      }
      /* Things only the agency can do, until marked done. A Telegram channel title is whatever its owner typed: the bell draws
         text, not markup. The key is built from the escaped text, as it was when the bell drew markup. */
      if (typeof openTasks === 'function') {
        openTasks().forEach(t => {
          const n = { type: 'setup', tag: 'Only you', icon: 'pending', pane: '', task: t.id, title: t.title, sub: t.where || 'Tap to see what to do', group: 'To do' };
          out.push(Object.assign(n, { key: notiKey(Object.assign({}, n, { title: esc2(n.title), sub: esc2(n.sub) })) }));
        });
      }
      /* AUTO-REPLY LINKS (Eden, 2026-10-23: a notification and a pop-up, not a big card). Known once the portal's React part has
         read the agency's code (src/features/agency/AutoReplyLinks.tsx); opening it opens the pop-up. */
      if (window.SYN_AUTOREPLY && window.SYN_AUTOREPLY.code) {
        out.push({ type: 'social', tag: 'Auto-replies', icon: 'share', pane: '', action: 'autoreply',
          title: 'Your auto-reply links are ready',
          sub: 'Add one to your WhatsApp, Instagram or Facebook auto-reply', group: 'To do' });
      }
      /* The sixty free days (Eden, 2026-10-03: "notify them about this").
         Shown from the day the paywall switches on until the day it applies. */
      const pw = window.SYN_PAYWALL;
      if (pw && pw.paywall_on && !pw.enforced && pw.free_until && new Date(pw.free_until) > new Date()) {
        const until = new Date(pw.free_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        out.unshift({ type: 'billing', tag: 'Plans', icon: 'card', pane: 'billing',
          title: 'Synapse is free for you until ' + until,
          sub: 'After that, your plan\u2019s limits apply. See what each plan includes.', group: 'Today' });
      }
      /* REFERRALS, in the bell: how far you are toward the next free month. */
      try {
        const rf = window.SYN_REFERRAL;
        if (rf && rf.on) {
          out.unshift({ type: 'billing', tag: 'Referrals', icon: 'users', pane: 'subscription',
            title: rf.into_next ? 'You are ' + rf.into_next + ' of ' + rf.per_reward + ' toward a free month' : 'Refer ' + rf.per_reward + ' agents, get a month free',
            sub: 'Share your link from Plans. An agency counts once it has uploaded ' + rf.listings_required + ' listings.', group: 'Today' });
        }
      } catch (e) {}
      /* GETTING STARTED (Eden, 2026-10-07): a new agency is told what to do first, in the bell, without waiting for an
         email. Only for the first month, only once the listings have answered (so it never claims "none" before it
         knows), and it goes the moment there is a listing. */
      try {
        const me = window.SynAuth && SynAuth.user && SynAuth.user();
        const young = me && me.created_at && (Date.now() - new Date(me.created_at).getTime()) < 30 * 864e5;
        if (young && dbBacked && !L.length) {
          out.unshift({ type: 'setup', tag: 'Getting started', icon: 'plus', pane: 'listings',
            title: 'Add your first listing',
            sub: 'About three minutes: photos, price and a pin on the map. Tayo starts matching it to buyers once it is live.', group: 'Getting started' });
        }
      } catch (e) { /* the bell is never worth an error */ }
      out.forEach(n => { if (!n.key) n.key = notiKey(n); });
      return out;
    }
    window.SynNoti = { items: notiItems };
    /* Both names are called around the page (and toggleNoti by the account menu); the bell answers them. */
    function renderNoti() { document.dispatchEvent(new Event('syn:noti-refresh')); }
    function toggleNoti(open) { window.dispatchEvent(new CustomEvent('syn:noti-toggle', { detail: open })); }

    renderNoti();
    renderOverview();

    /* OPEN WHERE YOU LEFT OFF, NOT ALWAYS OVERVIEW.

       This was forceOverview(): it stripped the hash and forced the Overview
       pane on every load, "ignoring stale hash/state". So reloading while
       reading Engagement reports put you back on Overview, and a link to a
       pane could not survive being followed. Reported as the app taking you
       back to Overview when you belong on the page you were on.

       The hash is now honoured when it names a pane that exists, and Overview
       is what you get when it does not -- which still covers a first visit, a
       junk fragment, and a pane this account may not open. applyRole strips
       panes by role AFTER this runs, so restorePane() re-applies the hash on
       the syn:role event once that is settled. */
    /* ── THE DOCK: back / forward, expand / collapse (2026-09-29) ──────────
       Back and forward walk the panes visited in this portal, like a
       browser's, without adding browser history (the pane lives in the hash
       via replaceState, deliberately -- see rememberPane). `var`, because
       goToPane can be called before this line has run. */
    var NAVH = { list: [], i: -1, moving: false };
    function navHistPaint() {
      var b = document.getElementById('navBack'), f = document.getElementById('navFwd');
      if (b) b.disabled = NAVH.i <= 0;
      if (f) f.disabled = NAVH.i >= NAVH.list.length - 1;
    }
    function navHistRecord(pane) {
      if (NAVH.moving || !pane || NAVH.list[NAVH.i] === pane) return;
      NAVH.list = NAVH.list.slice(0, NAVH.i + 1);
      NAVH.list.push(pane);
      if (NAVH.list.length > 50) NAVH.list.shift();
      NAVH.i = NAVH.list.length - 1;
      navHistPaint();
    }
    function navHistStep(d) {
      var j = NAVH.i + d;
      if (j < 0 || j >= NAVH.list.length) return;
      NAVH.i = j; NAVH.moving = true;
      try { goToPane(NAVH.list[j]); } finally { NAVH.moving = false; }
      navHistPaint();
    }
    (function dock() {
      var back = document.getElementById('navBack'), fwd = document.getElementById('navFwd');
      if (back) back.addEventListener('click', function () { navHistStep(-1); });
      if (fwd) fwd.addEventListener('click', function () { navHistStep(1); });

      var side = document.getElementById('tabs'), tog = document.getElementById('sideToggle');
      var KEY = 'syn_side_open';
      function setOpen(open, save) {
        side.classList.toggle('expanded', open);
        /* The page makes room rather than being covered (Eden: "I want it
           to shift the things in the background"). */
        document.body.classList.toggle('dock-open', open);
        if (tog) {
          tog.setAttribute('aria-expanded', String(open));
          tog.title = open ? 'Collapse the menu' : 'Expand the menu';
          tog.setAttribute('aria-label', tog.title);
        }
        if (save) { try { localStorage.setItem(KEY, open ? '1' : '0'); } catch (e) { /* stays for this visit */ } }
      }
      var saved = false;
      try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
      setOpen(saved, false);
      if (tog) tog.addEventListener('click', function () { setOpen(!side.classList.contains('expanded'), true); });
      /* In the dock the group headers are labels, not fold-up buttons, so
         they leave the tab order there. */
      if (window.matchMedia && window.matchMedia('(min-width: 1025px)').matches) {
        side.querySelectorAll('.grp').forEach(function (g) { g.setAttribute('tabindex', '-1'); });
      }
    })();

    (function openInitialPane() {
      const want = (location.hash || '').replace(/^#/, '');
      const tab = want && document.querySelector('#tabs [data-pane="' + want + '"]');
      const pane = tab ? want : 'overview';
      if (!tab && location.hash) history.replaceState(null, '', location.pathname);
      document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + pane));
      document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.pane === pane));
      const sec = (tab && tab.closest('.grp-sec')) || document.querySelector('.grp-sec[data-sec="main"]');
      if (sec) sec.classList.add('open');
      navHistRecord(pane);
    })();

    /* One way to change pane, used by the sidebar AND by anything else that
       needs to send you somewhere (the notification bell). Keeping this in one
       function is what stops a notification from highlighting a tab without
       actually switching the view, or vice versa. */
    function goToPane(pane) {
      /* The leads notification asked for a pane called 'leads'; the CRM pane
         is 'crm'. An unknown name switched every pane off and left the portal
         blank, so the click looked dead (Eden: "the CRM notifications don't
         take me to the CRM page"). Old names are translated, and a name with
         no pane is ignored rather than blanking the screen. */
      pane = ({ leads: 'crm', lead: 'crm', posts: 'social', post: 'social' })[pane] || pane;
      if (pane && !document.getElementById('pane-' + pane)) return;
      if (pane === 'tours' && typeof loadTours === 'function') loadTours();
      // Recount on arrival -- a message queued in another tab, or one you sent
      // a minute ago, both change what this should say.
      if (pane === 'crm' && window.paintOutboxWaiting) window.paintOutboxWaiting();
      if (pane === 'verification' && typeof loadVerification === 'function') loadVerification();
      if (pane === 'billing' && typeof loadBilling === 'function') loadBilling();
      if (window.syncFilterFab) setTimeout(window.syncFilterFab, 0);
      if (!pane) return;
      /* Going somewhere puts every popup away: the taskbar sheets, the setup list, the bell and the account menu. */
      try { if (window.closeAgencyPopups) window.closeAgencyPopups(); } catch (e) { /* the pane change still happens */ }
      navHistRecord(pane);
      const tab = document.querySelector('#tabs [data-pane="' + pane + '"]');
      document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a === tab));
      document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + pane));
      // reveal the sidebar group holding this tab, so the highlight is visible
      const sec = tab && tab.closest('.grp-sec'); if (sec) sec.classList.add('open');
      if (tpanel.classList.contains('on')) openToju();   // keep the panel in sync
      if (window.synMotion) synMotion.refresh();
      const paneEl = document.getElementById('pane-' + pane);
      /* TO THE TOP, AND AT ONCE (Eden, 2026-10-11: "it takes me to the middle of the screen,
         not the top"). A smooth scroll to the pane's own edge stopped partway as the new pane
         grew, leaving the heading out of sight. Every scroller there is goes to 0. */
      try {
        window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
        const sc = document.querySelector('.content'); if (sc) sc.scrollTop = 0;
        if (paneEl) paneEl.scrollTop = 0;
      } catch (e) {}
      rememberPane(pane);
    }

    /* ── THE PANE SURVIVES A RELOAD ──────────────────────────────────────
       Nothing recorded which pane you were on, and the markup marks Overview
       as the open one, so every reload threw you back to Overview no matter
       where you were working. Reloading while reading Engagement reports and
       landing on Overview is the app losing your place, not navigation.

       replaceState rather than pushState: this makes the pane survive a
       reload and become linkable, without turning every sidebar click into a
       browser-history entry that the Back button then has to walk back
       through. */
    function rememberPane(pane) {
      if (!pane) return;
      try { history.replaceState(null, '', '#' + pane); } catch (e) { /* file:// */ }
    }

    /* Restored only after applyRole has stripped the panes this account may
       not see -- otherwise a stale link would try to open a pane that has
       just been removed from the DOM. An unknown or forbidden pane simply
       leaves you on the default, which is the honest outcome. */
    function restorePane() {
      var want = (location.hash || '').replace(/^#/, '');
      if (!want || !document.querySelector('#tabs [data-pane="' + want + '"]')) return;
      goToPane(want);
    }
    document.addEventListener('syn:role', restorePane);

    /* ══ FLOATING DOCK (mobile) ═══════════════════════════════════════════
       Navigation and creation as two thumb-reachable buttons, taskbar-style.

       The nav menu is generated FROM the rail (#tabs) every time it opens,
       so a pane added to the rail appears here automatically, a hand-copied
       menu would be a second list to remember, and this file has already had
       one bug of exactly that shape.

       The create fan delegates to the button each pane already owns: it is a
       shortcut to existing behaviour, never a parallel implementation that
       could drift from it. */
    (function () {
      const nav = document.getElementById('agdNav');
      const add = document.getElementById('agdAdd');
      const scrim = document.getElementById('agdScrim');
      if (!nav || !add || !scrim) return;
      const filt = document.getElementById('agdFilter');
      const filtSheet = document.getElementById('agdFilterSheet');
      const filtFab = document.getElementById('agdFilterFab');

      const navSheet = document.getElementById('agdNavSheet');
      const addSheet = document.getElementById('agdAddSheet');
      const navFab = document.getElementById('agdNavFab');
      const addFab = document.getElementById('agdAddFab');

      /* Per-pane create actions. `to` is the id of the real control on that
         pane; label/icon are what the fan shows. A pane with nothing to
         create simply offers the portal-wide ones. */
      const CREATE = {
        overview:     [['newListingBtn', 'New listing', 'home']],
        listings:     [['newListingBtn', 'New listing', 'home']],
        crm:          [['crmAdd', 'Add lead', 'user']],
        social:       [['newPostBtn', 'New social post', 'share']],
        marketing:    [['newCampBtn', 'New campaign', 'chart']],
        agents:       [['inviteAgentBtn', 'Invite agent', 'user']],
      };
      /* Offered everywhere, because "add a property" is the job the portal
         exists for and should never be more than two taps away. */
      const ALWAYS = [
        ['newListingBtn', 'New listing', 'home'],
        ['newPostBtn', 'New social post', 'share'],
        ['newCampBtn', 'New campaign', 'chart'],
      ];

      /* ── filters, lent from the pane you are on ────────────────────────
         The controls are MOVED, not copied: a sort dropdown that is a second
         copy of the real one is a sort dropdown that disagrees with it. Each
         is put back exactly where it came from when the sheet closes, so the
         pane is unchanged the moment you are not looking at the sheet. */
      let lent = [];
      function lendFilters() {
        const pane = document.querySelector('.pane.on') || document.querySelector('.pane:not([hidden])');
        if (!pane) return;
        lent = [...pane.querySelectorAll('[data-pane-filters]')].map((el) => {
          const home = { el, parent: el.parentNode, next: el.nextSibling };
          filtSheet.appendChild(el);
          return home;
        });
      }
      function returnFilters() {
        lent.forEach(({ el, parent, next }) => parent.insertBefore(el, next));
        lent = [];
      }
      /* Nothing to filter on Brand, Agents, Subscription or the Negotiator -
         the button goes rather than opening on an empty sheet. */
      function syncFilterFab() {
        const pane = document.querySelector('.pane.on') || document.querySelector('.pane:not([hidden])');
        const has = !!(pane && pane.querySelector('[data-pane-filters]'));
        if (filt) filt.hidden = !has && !lent.length;
      }
      window.syncFilterFab = syncFilterFab;

      const isOpen = (el) => el.classList.contains('open');
      function closeAll() {
        if (lent.length) returnFilters();
        if (filt) filt.classList.remove('open');
        if (filtFab) filtFab.setAttribute('aria-expanded', 'false');
        nav.classList.remove('open'); add.classList.remove('open');
        scrim.classList.remove('on');
        navFab.setAttribute('aria-expanded', 'false');
        addFab.setAttribute('aria-expanded', 'false');
        if (typeof syncTaskbarIcons === 'function') syncTaskbarIcons();
      }
      function open(which) {
        closeAll();
        which.classList.add('open');
        scrim.classList.add('on');
        (which === nav ? navFab : addFab).setAttribute('aria-expanded', 'true');
        syncTaskbarIcons();
      }

      /* Each fab's icon states whether its sheet is open, by travelling to a
         cross and back rather than being swapped underneath you.

         State is read off the DOM every time instead of being tracked here, so
         the icon stays truthful no matter what closed the sheet, the scrim,
         Escape, picking an item, or another fab opening. Guarded throughout:
         with no module loaded this is a no-op and the icons sit still, which is
         exactly what they did before. */
      function syncTaskbarIcons() {
        if (!window.SynMorph) return;
        [[nav, navFab, 'grid'], [filt, filtFab, 'filter'], [add, addFab, 'plus']]
          .forEach(([wrap, fab, rest]) => {
            if (!wrap || !fab) return;
            const host = fab.querySelector('[data-icon]');
            if (!host) return;
            SynMorph.morphTo(host, wrap.classList.contains('open') ? 'close' : rest);
          });
      }
      window.syncTaskbarIcons = syncTaskbarIcons;
      window.closeAgencyPopups = function () {
        closeAll();
        try { if (typeof toggleSetup === 'function') toggleSetup(false); } catch (e) { /* not on this page */ }
        try { if (typeof toggleNoti === 'function') toggleNoti(false); } catch (e) { /* not ready */ }
        try { if (typeof toggleRm === 'function') toggleRm(false); } catch (e) { /* not ready */ }
        window.dispatchEvent(new Event('syn:acct-close'));   // the account menu is React's (AgencyAccount.tsx)
      };
      window.addEventListener('pageshow', () => window.closeAgencyPopups());

      // ── nav menu, mirrored from the rail ──
      function buildNav() {
        const current = (document.querySelector('#tabs a.on') || {}).dataset?.pane;
        let html = '';
        document.querySelectorAll('#tabs .grp-sec').forEach((sec, i) => {
          const name = (sec.querySelector('.grp span') || {}).textContent || 'More';
          const items = [...sec.querySelectorAll('a[data-pane]')].map((a) => {
            const pane = a.dataset.pane;
            const icon = (a.querySelector('[data-icon]') || {}).dataset?.icon || 'dot';
            const label = (a.querySelector('.lbl-x') || {}).textContent || pane;
            return '<button class="agd-item' + (pane === current ? ' on' : '') + '" role="menuitem"'
              + ' data-goto="' + pane + '"><span data-icon="' + icon + '"></span>' + label + '</button>';
          }).join('');
          // the group holding the current pane starts filed out
          const openSec = sec.querySelector('a[data-pane="' + current + '"]') ? ' open' : (i === 0 ? ' open' : '');
          html += '<div class="agd-sec' + openSec + '">'
            + '<button class="agd-grp" type="button"><span>' + name + '</span><span class="chv">›</span></button>'
            + '<div class="agd-items">' + items + '</div></div>';
        });
        /* The agency's own name was repeated at the foot of this sheet. You do
           not need telling whose portal you are in from inside it, it is on
           the pane you came from and in the top bar, and it cost a row of a
           menu whose whole point is getting somewhere. */
        /* the two actions the top bar can no longer fit, a Start menu keeps
           its account controls at the foot, so they belong here anyway */
        html += '<div class="agd-sep"></div>'
          + '<button class="agd-item" role="menuitem" data-nav-site>'
          + '<span data-icon="home"></span>Back to the landing page</button>';
        navSheet.innerHTML = html;
        if (window.SynIcons && SynIcons.hydrate) SynIcons.hydrate(navSheet);
      }

      /* The CRM stage filter used to be moved into the NAV sheet from here,
         which made sense when the nav sheet was the only sheet on the bar. It
         is a filter, and there is a filter button now: #crmFunnel carries
         data-pane-filters like every other pane control, so lendFilters claims
         it and it opens under the funnel icon with the rest of the CRM's.

         Both wanted the same node and the older one ran first, so the stage
         cards sat above the navigation while the filter sheet opened empty.
         One owner now. */

      // ── create fan, per pane ──
      function buildAdd() {
        const pane = (document.querySelector('#tabs a.on') || {}).dataset?.pane || 'overview';
        const wanted = CREATE[pane] || [];
        const seen = new Set(wanted.map((a) => a[0]));
        const rest = ALWAYS.filter((a) => !seen.has(a[0]));
        const rows = [...wanted, ...rest]
          .filter(([id]) => document.getElementById(id))   // never offer a dead action
          .map(([id, label, icon], i) =>
            (i === wanted.length && wanted.length ? '<div class="agd-sep"></div>' : '')
            + '<button class="agd-act" role="menuitem" data-act="' + id + '">'
            + '<span data-icon="' + icon + '"></span>' + label + '</button>')
          .join('');
        addSheet.innerHTML = '<div class="agd-add-hint">Create</div>' + rows;
        if (window.SynIcons && SynIcons.hydrate) SynIcons.hydrate(addSheet);
      }

      navFab.addEventListener('click', () => {
        if (isOpen(nav)) return closeAll();
        buildNav(); open(nav);
      });
      addFab.addEventListener('click', () => {
        if (isOpen(add)) return closeAll();
        buildAdd(); open(add);
      });
      if (filtFab) filtFab.addEventListener('click', () => {
        if (isOpen(filt)) return closeAll();
        closeAll();
        lendFilters();
        filt.classList.add('open');
        scrim.classList.add('on');
        filtFab.setAttribute('aria-expanded', 'true');
        syncTaskbarIcons();
      });
      scrim.addEventListener('click', closeAll);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

      navSheet.addEventListener('click', (e) => {
        const grp = e.target.closest('.agd-grp');
        if (grp) { grp.parentElement.classList.toggle('open'); return; }
        if (e.target.closest('[data-nav-site]')) { window.location.href = '../index.html'; return; }
        const out = e.target.closest('[data-nav-out]');
        if (out) {
          closeAll();
          const real = document.querySelector('[data-auth-slot] .auth-out');
          if (real) real.click();   // auth.js owns sign-out; this only routes to it
          return;
        }
        const item = e.target.closest('[data-goto]');
        if (item) { closeAll(); goToPane(item.dataset.goto); }
      });

      addSheet.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (!act) return;
        closeAll();
        const real = document.getElementById(act.dataset.act);
        if (real) real.click();   // the pane's own control does the work
      });
    })();

    // sidebar tab switching
    document.getElementById('tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-pane]');
      if (!tab) return;
      goToPane(tab.dataset.pane);
    });

    // sidebar group expand/collapse (Supabase-style), headers have no data-pane, so
    // they fall through the tab handler above; this handles the toggle separately.
    document.getElementById('tabs').addEventListener('click', (e) => {
      const g = e.target.closest('.grp'); if (!g) return;
      /* The desktop dock keeps every group open, so nothing moves up or down
         when it expands (THE FLOATING DOCK). */
      if (window.matchMedia && window.matchMedia('(min-width: 1025px)').matches) return;
      const sec = g.closest('.grp-sec'); const open = sec.classList.toggle('open');
      g.setAttribute('aria-expanded', String(open));
    });

    /* ═══ Brand page ═══ is React: src/features/agency/BrandPage.tsx. */

    // simple toggles in social studio
  