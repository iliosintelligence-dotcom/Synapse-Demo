/* eslint-disable */
// @ts-nocheck
/* The agency portal's data: the leads (with their channel attribution and the roster), the social pipeline (drafts, posts,
   their clicks and comments) and the listings (with their drafts, freshness and the opening screen), loaded from the database
   and kept here for every pane to read. Was the top third of the portal's page script (legacy/agency/inline-3.js); moved
   as it was, in the same order, and run at the same point in the page (AgencyBody's list, just before what is left of that
   script). The panes are React and read it through window (SynLeads, SynPosts, SynPipe, SynListingsData and the rest). */
export function run() {
    const w = window;
    /* The rest of the portal (portalShell.js) and the panes still call these by name, as when they sat in that file. */
    w.renderCrm = renderCrm;
    w.buildAttr = buildAttr;
    w.agoLabel = agoLabel;
    w.mapLead = mapLead;
    w.loadRoster = loadRoster;
    w.loadLeads = loadLeads;
    w.fmtWhen = fmtWhen;
    w.shortLinkUrl = shortLinkUrl;
    w.buildPosts = buildPosts;
    w.repaintSocial = repaintSocial;
    w.loadPipeline = loadPipeline;
    w.watchPipeline = watchPipeline;
    w.countUp = countUp;
    w.renderPipeline = renderPipeline;
    w.renderCalendar = renderCalendar;
    w.openMyProfile = openMyProfile;
    w.openScheduler = openScheduler;
    w.openPropPreview = openPropPreview;
    w.closePropPreview = closePropPreview;
    w.openBoardCaption = openBoardCaption;
    w.pipeSoon = pipeSoon;
    w.pipeDrop = pipeDrop;
    w.freshDays = freshDays;
    w.lifeLabel = lifeLabel;
    w.draftOwner = draftOwner;
    w.readListingDraft = readListingDraft;
    w.writeListingDraft = writeListingDraft;
    w.clearListingDraft = clearListingDraft;
    w.draftAgo = draftAgo;
    w.sdClient = sdClient;
    w.sdLoad = sdLoad;
    w.sdSaveNow = sdSaveNow;
    w.sdQueue = sdQueue;
    w.sdDelete = sdDelete;
    w.migrateListing = migrateListing;
    w.deriveLegacy = deriveLegacy;
    w.blankListing = blankListing;
    w.esc2 = esc2;
    w.photoHtml = photoHtml;
    w.toPropertyRow = toPropertyRow;
    w.bootDone = bootDone;
    w.freshness = freshness;
    w.listingCover = listingCover;
    w.paintFast = paintFast;
    w.renderListings = renderListings;
    w.listingForm = listingForm;
    w.openListingById = openListingById;
    w.fromDbRow = fromDbRow;
    w.hydrateListings = hydrateListings;
    w.mkStats = mkStats;
    Object.defineProperty(w, 'CH', { get: () => CH, configurable: true });
    Object.defineProperty(w, 'ATTR_CHANNEL', { get: () => ATTR_CHANNEL, configurable: true });
    Object.defineProperty(w, 'uiChannel', { get: () => uiChannel, configurable: true });
    Object.defineProperty(w, 'chMark', { get: () => chMark, configurable: true });
    Object.defineProperty(w, 'chnBadge', { get: () => chnBadge, configurable: true });
    Object.defineProperty(w, 'CRM', { get: () => CRM, configurable: true });
    Object.defineProperty(w, 'DB_STAGE', { get: () => DB_STAGE, configurable: true });
    Object.defineProperty(w, 'DB_CHANNEL', { get: () => DB_CHANNEL, configurable: true });
    Object.defineProperty(w, 'DEFAULT_NBA', { get: () => DEFAULT_NBA, configurable: true });
    Object.defineProperty(w, 'nairaShort', { get: () => nairaShort, configurable: true });
    Object.defineProperty(w, 'ROSTER_BY_ID', { get: () => ROSTER_BY_ID, configurable: true });
    Object.defineProperty(w, 'IMG', { get: () => IMG, configurable: true });
    Object.defineProperty(w, 'PSTAGES', { get: () => PSTAGES, configurable: true });
    Object.defineProperty(w, 'PIPE', { get: () => PIPE, configurable: true });
    Object.defineProperty(w, 'PLAT_OF_CT', { get: () => PLAT_OF_CT, configurable: true });
    Object.defineProperty(w, 'listingById', { get: () => listingById, configurable: true });
    Object.defineProperty(w, 'listingTitle', { get: () => listingTitle, configurable: true });
    Object.defineProperty(w, 'fmt', { get: () => fmt, configurable: true });
    Object.defineProperty(w, 'CHR', { get: () => CHR, configurable: true });
    Object.defineProperty(w, 'estReach', { get: () => estReach, configurable: true });
    Object.defineProperty(w, 'sReduce', { get: () => sReduce, configurable: true });
    Object.defineProperty(w, 'LISTING_LIFE', { get: () => LISTING_LIFE, configurable: true });
    Object.defineProperty(w, 'LIFE_LABEL', { get: () => LIFE_LABEL, configurable: true });
    Object.defineProperty(w, 'L_KEY', { get: () => L_KEY, configurable: true });
    Object.defineProperty(w, 'DRAFT_KEY', { get: () => DRAFT_KEY, configurable: true });
    Object.defineProperty(w, 'SD', { get: () => SD, configurable: true });
    Object.defineProperty(w, 'L_DEFAULT', { get: () => L_DEFAULT, configurable: true });
    Object.defineProperty(w, 'PROP_TYPES', { get: () => PROP_TYPES, configurable: true });
    Object.defineProperty(w, 'DEAL_STRUCTURES', { get: () => DEAL_STRUCTURES, configurable: true });
    Object.defineProperty(w, 'DEAL_STRUCTURE_LABEL', { get: () => DEAL_STRUCTURE_LABEL, configurable: true });
    Object.defineProperty(w, 'DEAL_TO_LISTING', { get: () => DEAL_TO_LISTING, configurable: true });
    Object.defineProperty(w, 'LISTING_TYPES', { get: () => LISTING_TYPES, configurable: true });
    Object.defineProperty(w, 'PRICE_PERIODS', { get: () => PRICE_PERIODS, configurable: true });
    Object.defineProperty(w, 'TITLE_TYPES', { get: () => TITLE_TYPES, configurable: true });
    Object.defineProperty(w, 'TYPE_LABEL', { get: () => TYPE_LABEL, configurable: true });
    Object.defineProperty(w, 'DEAL_LABEL', { get: () => DEAL_LABEL, configurable: true });
    Object.defineProperty(w, 'PERIOD_LABEL', { get: () => PERIOD_LABEL, configurable: true });
    Object.defineProperty(w, 'PERIOD_SUFFIX', { get: () => PERIOD_SUFFIX, configurable: true });
    Object.defineProperty(w, 'TITLE_LABEL', { get: () => TITLE_LABEL, configurable: true });
    Object.defineProperty(w, 'announceListings', { get: () => announceListings, configurable: true });
    Object.defineProperty(w, 'saveListings', { get: () => saveListings, configurable: true });
    Object.defineProperty(w, 'ST_LABEL', { get: () => ST_LABEL, configurable: true });
    Object.defineProperty(w, 'nairaFull', { get: () => nairaFull, configurable: true });
    Object.defineProperty(w, 'priceLabel', { get: () => priceLabel, configurable: true });
    Object.defineProperty(w, 'WZ_TOTAL', { get: () => WZ_TOTAL, configurable: true });
    Object.defineProperty(w, 'leads', { get: () => leads, set: (v) => { leads = v; }, configurable: true });
    Object.defineProperty(w, 'ROSTER', { get: () => ROSTER, set: (v) => { ROSTER = v; }, configurable: true });
    Object.defineProperty(w, 'posts', { get: () => posts, set: (v) => { posts = v; }, configurable: true });
    Object.defineProperty(w, 'pipeWatchers', { get: () => pipeWatchers, set: (v) => { pipeWatchers = v; }, configurable: true });
    Object.defineProperty(w, 'pipeTimer', { get: () => pipeTimer, set: (v) => { pipeTimer = v; }, configurable: true });
    Object.defineProperty(w, 'LISTING_FORM_SEQ', { get: () => LISTING_FORM_SEQ, set: (v) => { LISTING_FORM_SEQ = v; }, configurable: true });
    Object.defineProperty(w, 'LISTING_DRAFT_FLUSH', { get: () => LISTING_DRAFT_FLUSH, set: (v) => { LISTING_DRAFT_FLUSH = v; }, configurable: true });
    Object.defineProperty(w, 'LISTINGS_DATA', { get: () => LISTINGS_DATA, set: (v) => { LISTINGS_DATA = v; }, configurable: true });
    Object.defineProperty(w, 'dbBacked', { get: () => dbBacked, set: (v) => { dbBacked = v; }, configurable: true });


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
    /* Where the leads come from is drawn in the Ask-Tayo panel (AdvisorBodies.tsx, LeadSources). */
    function renderCrm(){ window.dispatchEvent(new CustomEvent('syn:crm')); if (typeof refreshTojuPanel === 'function') refreshTojuPanel('crm'); }
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
      closed: 'Won', lost: 'Lost',
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
        /* The agent's own next step: when (next_action_at), and whether the
           words above are theirs or the stage default. createdAt is what the
           first-reply clock runs from while a lead is still New. */
        nextAt: r.next_action_at || null,
        nbaOwn: !!r.next_action_recommendation,
        createdAt: r.created_at || null,
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
    /* The "This week" bento is drawn in the Ask-Tayo panel (AdvisorBodies.tsx, Bento). */
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

    /* Per-pane snapshot stats are counted by the Ask-Tayo panel itself (AdvisorBodies.tsx, Snapshot). */

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
    /* The marketing snapshot (active campaigns, listings you can market) is counted by the Ask-Tayo panel; this only asks it to
       count again, for the pane on screen. */
    function mkStats() {
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
    /* Which channel produced the leads (lead_channel_mix) is the Ask-Tayo panel's Creative insights (AdvisorBodies.tsx). */
}
