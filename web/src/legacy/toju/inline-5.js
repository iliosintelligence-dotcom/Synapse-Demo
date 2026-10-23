
    const SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
    const ANON_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';

    const convo = document.getElementById('convo');
    const input = document.getElementById('tjInput');
    const sendBtn = document.getElementById('tjSend');
    let busy = false;
    const STORE = 'toju_chat_v1';
    const PINKEY = 'toju_pins_v1';   // pinned replies; defined here because saved chats render before the pin code below
    // stable anonymous visitor id -> server-side memory (continue anywhere this id exists)
    const VKEY = 'toju_visitor_v1';
    let VISITOR = localStorage.getItem(VKEY);
    if (!VISITOR) { VISITOR = crypto.randomUUID(); try { localStorage.setItem(VKEY, VISITOR); } catch (e) {} }
    const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } };
    const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (e) {} };
    let saved = loadSaved();

    /* ARRIVING FROM A POST OR A BIO LINK STARTS A NEW CONVERSATION.
       Tayo reopened whatever this browser last said to it, so somebody who
       tapped a Telegram bio link to ask about a home they had just seen landed
       in the middle of an old, unrelated thread. An arrival is a new question:
       it gets a clean chat, and a first line that asks what caught their eye.

       The old thread is not lost -- it is set aside here and filed in chat
       history once history is available below, exactly as New chat files it.
       arrival.js has already read the channel from this URL (it runs in the
       head), so the parameters are taken off it now: a reload must not start
       yet another conversation. */
    const ARRIVAL = (function () {
      const q = new URLSearchParams(location.search);
      const via = q.get('via');
      const names = { telegram: 'Telegram', instagram: 'Instagram', facebook: 'Facebook',
                      tiktok: 'TikTok', x: 'X', whatsapp: 'WhatsApp', whatsapp_campaign: 'WhatsApp' };
      /* new=site: arriving from Synapse's own landing page. Eden: anything
         asked from the landing page starts a fresh chat -- showing Tayo on
         somebody else's laptop opened that laptop's last conversation. The
         old thread is filed in History, as for any arrival, but the greeting
         is the ordinary one: this visitor did not come from a post. */
      const fromSite = q.get('new') === 'site';
      const fresh = q.get('new') === '1' || fromSite || via === 'bio';
      const from = names[String(q.get('ch') || '').toLowerCase()] || '';
      if (fresh) {
        ['new', 'via', 'ch'].forEach((k) => q.delete(k));
        const rest = q.toString();
        try { history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) {}
      }
      return { fresh, from, social: fresh && !fromSite };
    })();
    let SET_ASIDE = null;
    if (ARRIVAL.fresh) {
      if (saved.some((m) => m.role === 'user')) {
        SET_ASIDE = { visitorId: VISITOR, messages: saved };
        VISITOR = crypto.randomUUID(); try { localStorage.setItem(VKEY, VISITOR); } catch (e) {}
      }
      saved = []; persist();
    }

    // shared with browse.html, see matches-shared.js + docs/STATE_CONTRACT.md
    const { esc, naira } = window.SynMatches;
    const convoScroll = document.querySelector('.convo-scroll');
    const scrollDown = () => {
      // scroll the chat pane on desktop; the window on mobile (canvas hidden)
      if (convoScroll && convoScroll.clientHeight < convoScroll.scrollHeight && getComputedStyle(convoScroll).overflowY !== 'visible') {
        convoScroll.scrollTo({ top: convoScroll.scrollHeight, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    };

    /* ── right-side MATCHES CANVAS, a live preview of the Your-matches page.
       Cards, map and layout mirror browse.html EXACTLY (keep in sync with that
       page). No toolbar: whatever the user wants changed, they tell Tayo. The
       page opens as a centered chat and morphs to 25/75 when matches land. ── */
    const cvGrid = document.getElementById('cvGrid');
    const cvCount = document.getElementById('cvCount');
    let canvasMatches = [];
    const cvKeys = new Set();
    const keyOf = (m) => (m.title || '') + '|' + (m.price || '');
    function collect(matches) {
      if (!Array.isArray(matches)) return;
      matches.forEach((m) => { const k = keyOf(m); if (!cvKeys.has(k)) { cvKeys.add(k); canvasMatches.unshift(m); } });
    }

    // browse.html parity: shaper, card markup and map all come from
    // matches-shared.js, the canvas renders the SAME card browse.html does
    // (compare checkboxes are a browse-only tool; here you just tell Tayo).
    let cvSaves = SynMatches.readSaves();
    SynMatches.onSavesChanged(function (s) { cvSaves = s; renderCanvas(); });
    const cvMapState = {}; // persistent {map, layer} for SynMatches.drawMatchMap

    function renderCanvas() {
      const items = canvasMatches.map(SynMatches.shapeTojuMatch);
      cvCount.textContent = items.length;
      /* On a phone this used to be a strip under the header reading "N matches
         ready · See all →". The taskbar already lists Your matches and already
         carries a count badge, so the strip was a second copy of a row that is
         always one tap away -- and it sat between the header and the first
         thing Tayo said. */
      if (window.CustNav) window.CustNav.setCount('browse.html', items.length);
      document.body.classList.toggle('has-canvas', items.length > 0);
      if (items.length === 0) { cvGrid.innerHTML = ''; return; }
      cvGrid.innerHTML = items.map((l, i) => SynMatches.listingCardHtml(l, i, { saves: cvSaves })).join('');
      SynMatches.drawMatchMap(cvMapState, 'cvMap', items,
        /* No areaSearch: this map shows the homes Tayo picked, and replacing
           them with everything in the viewport would discard the reasoning. */
        { sb: { url: SUPABASE_URL, anon: ANON_KEY } });
      if (window.synMotion) synMotion.refresh();
    }
    cvGrid.addEventListener('click', (e) => {
      const sv = e.target.closest('[data-save]');
      if (sv) {
        const id = sv.getAttribute('data-save');
        cvSaves = SynMatches.toggleSave(id);   // re-reads storage; no lost updates
        renderCanvas(); return;
      }
      const card = e.target.closest('.listing');
      if (card) window.location.href = SynMatches.propertyHref(card.getAttribute('data-id'));
    });
    function rebuildCanvas() {
      canvasMatches = []; cvKeys.clear();
      saved.forEach((m) => { if (m.role === 'assistant') collect(m.matches); });
      /* The home they arrived about is not in the transcript -- nothing Tayo
         said put it there -- so a rebuild would drop it. It belongs on the
         canvas for as long as the conversation is about it. */
      if (REPLY_MATCH) collect([REPLY_MATCH]);
      renderCanvas();
    }


    function matchesHtml(matches) {
      if (!Array.isArray(matches) || matches.length === 0) return '';
      const cards = matches.map((m, idx) => {
        const why = m.why ? '<div class="watch reason"><b>Recommended -</b> ' + esc(m.why) + '</div>' : '';
        const room = m.room ? '<div class="watch">' +
          (m.room.totalRooms - m.room.housematesIn) + ' of ' + m.room.totalRooms + ' rooms free · ' +
          (m.room.genderPreference === 'any' ? 'any gender' : m.room.genderPreference + '-only') +
          (m.room.ensuite ? ' · ensuite' : '') + (m.room.billsIncluded ? ' · bills incl.' : '') +
          (m.room.vibe ? ' · ' + esc(m.room.vibe) : '') + '</div>' : '';
        const watch = m.whatToWatch && m.whatToWatch !== 'No major synthetic flags'
          ? '<div class="watch"><b>Worth checking -</b> ' + esc(m.whatToWatch) + '</div>' : '';
        const yld = (m.yieldPct != null && m.yieldPct > 0) ? ' · ' + m.yieldPct + '% yield' : '';
        void yld; void why; void room; void watch;
        return SynMatches.listingCardHtml(SynMatches.shapeTojuMatch(m, idx), idx, { bare: true });
      }).join('');
      const n = matches.length;
      /* A DECK, NOT A LIST (Eden, 2026-10-22: "swipe to see the next one, the card in front goes to the back"). One card is in front;
         the others peek out behind it. Swipe it away (or use the arrows) and the next one takes its place. View all is a real button. */
      const slots = cards.split('<div class="card listing hc').slice(1).map((c, k) => '<div class="hc-slot" data-orig="' + k + '"><div class="card listing hc' + c + '</div>').join('');
      return '<div class="matches-h"><span class="mh-rule" aria-hidden="true"></span><span class="lbl">HOMES WORTH A LOOK</span>'
        + '<span class="cnt">' + n + '</span></div>'
        + '<div class="hc-deck" data-deck data-n="' + n + '" role="group" aria-roledescription="carousel" aria-label="Homes Tayo found">' + slots + '</div>'
        + (n > 1 ? '<div class="hc-deck-bar"><button type="button" class="hc-deck-btn" data-deck-prev aria-label="Previous home">\u2039</button>'
          + '<span class="hc-deck-count" data-deck-count aria-live="polite">1 / ' + n + '</span>'
          + '<button type="button" class="hc-deck-btn" data-deck-next aria-label="Next home">\u203a</button></div>' : '')
        + '<a class="hc-viewall" href="browse.html">View all ' + n + (n === 1 ? ' home' : ' homes') + '</a>';
    }

    // tiny, safe markdown → HTML (escape first, then bold/italic/code/lists/paras)
    function md(t) {
      let s = esc(String(t == null ? '' : t));
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
      const lines = s.split(/\n/);
      let html = '', inUl = false, inOl = false;
      const close = () => { if (inUl) { html += '</ul>'; inUl = false; } if (inOl) { html += '</ol>'; inOl = false; } };
      lines.forEach((line) => {
        const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/);
        if (ul) { if (!inUl) { close(); html += '<ul>'; inUl = true; } html += '<li>' + ul[1] + '</li>'; }
        else if (ol) { if (!inOl) { close(); html += '<ol>'; inOl = true; } html += '<li>' + ol[1] + '</li>'; }
        else { close(); if (line.trim()) html += '<p>' + line + '</p>'; }
      });
      close();
      return html || '<p>' + s + '</p>';
    }
    /* PAST PRICES, AS A TABLE (Eden, 2026-10-02). Tayo never forecasts; asked
       whether prices will rise, it shows how they HAVE moved, with sources. */
    function priceHistoryHtml(ph) {
      if (!ph || !Array.isArray(ph.rows) || !ph.rows.length) return '';
      const rows = ph.rows.map((r) => '<tr><td>' + esc(r.period) + '</td><td>' + esc(r.typical) + '</td><td>' + esc(r.change || '') + '</td></tr>').join('');
      /* Only https links become links (Greptile audit): escaping HTML does not
         make a javascript: URL safe. */
      const src = (ph.sources || []).filter((x) => x && /^https:\/\/[^\s"'<>]+$/i.test(String(x.url || '')))
        .map((x) => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener nofollow">' + esc(x.title) + '</a>').join(' · ');
      return '<div class="ph-card">'
        + '<div class="ph-k">Past prices · ' + esc(ph.area) + (ph.unit ? ' · ' + esc(ph.unit) : '') + '</div>'
        + '<div class="ph-scroll"><table class="ph-t"><thead><tr><th>When</th><th>Typical price</th><th>Change</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        + (ph.summary ? '<p class="ph-sum">' + esc(ph.summary) + '</p>' : '')
        + (src ? '<p class="ph-src">Sources: ' + src + '</p>' : '')
        + '</div>';
    }
    /* WHAT WAS CHECKED (Eden, 2026-10-03: it did not seem as though Tayo was
       looking at the database). The server reports what it read; this says it,
       above the homes, in plain words. */
    function checkedHtml(sr) {
      if (!sr || typeof sr !== 'object') return '';
      const n = Number(sr.live) || 0, f = Number(sr.found) || 0;
      const where = sr.where ? ' in ' + esc(sr.where) : '';
      return '<div class="tj-checked">Checked our live listings' + where + ': '
        + (n === 0 ? 'none there' : n + ' live' + (sr.kinds ? ' (' + esc(sr.kinds) + ')' : ''))
        + (f ? ' · ' + f + ' shown below' : '') + '</div>';
    }
    /* PROGRESSIVE DISCLOSURE: the answer is short; the steps and caveats that
       matter sit one tap away rather than being dropped. */
    function moreHtml(more) {
      if (!more) return '';
      return '<button type="button" class="tj-more" aria-expanded="false">More</button>'
        + '<div class="tj-more-body" hidden>' + md(more) + '</div>';
    }
    const slimMatch = (m) => ({ id: m.id, title: m.title, price: m.price, city: m.city, listingType: m.listingType,
      pricePeriod: m.pricePeriod, bedrooms: m.bedrooms, deal: m.deal || null, verificationStatus: m.verificationStatus || null });
    const TJ_ICO = {
      share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
      pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
      up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
      down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>',
    };
    const FBKEY = 'toju_fb_v1';
    function loadFb() { try { return JSON.parse(localStorage.getItem(FBKEY)) || {}; } catch (e) { return {}; } }
    function saveFb(m) { try { localStorage.setItem(FBKEY, JSON.stringify(m)); } catch (e) {} }
    function ib(act, label, pressed) {
      return '<button type="button" class="tj-ib" data-act="' + act + '" aria-label="' + label + '" title="' + label + '"'
        + (pressed === undefined ? '' : ' aria-pressed="' + pressed + '"') + '>' + TJ_ICO[act] + '</button>';
    }
    /* A closed question gets its answers as buttons. Tayo's own suggested
       replies are used when the question is one they answer; otherwise the
       common closed questions are recognised. An open question gets none. */
    function quickAnswers(text, sugg) {
      const t = String(text || '').replace(/\s+/g, ' ').trim();
      const m = t.match(/([^.!?]*\?)\s*$/);
      if (!m) return [];
      const q = m[1].trim(), ql = q.toLowerCase();
      /* Open questions (a city, a reason, a budget in their own words) have no short
         list of answers; buttons would be guesses. Only a choice offered in the
         question itself ("rent or buy?") or a yes/no is closed. */
      const openQ = /^(why|what|which|where|when|who|whom|whose|how|tell me|describe)\b/.test(ql)
        && !/ or /.test(ql) && !/^how many (bed|bedroom|bath|toilet)/.test(ql);
      if (openQ) return [];
      const good = (Array.isArray(sugg) ? sugg : []).map((x) => String(x || '').trim())
        /* An answer, not an action: "Alert me" is a different thing to tap. */
        .filter((x) => x && x.length <= 40 && !/\?$/.test(x) && !/^alert me/i.test(x));
      if (good.length >= 2 && good.length <= 6) return good;
      if (/how many (bed|bedroom)/.test(ql)) return ['1 bedroom', '2 bedrooms', '3 bedrooms', '4 bedrooms', '5+ bedrooms'];
      if (/how many (bath|toilet)/.test(ql)) return ['1 bathroom', '2 bathrooms', '3 bathrooms', '4+ bathrooms'];
      if (/\b(rent|renting)\b/.test(ql) && /\b(buy|buying|purchase)\b/.test(ql) && / or /.test(ql)) return ['Rent', 'Buy'];
      if (/^(do|does|did|are|is|am|would|will|can|could|should|have|has|shall|was|were)\b/.test(ql) && !/ or /.test(ql)) return ['Yes', 'No'];
      return [];
    }
    function quickHtml(text, extra) {
      return ''; // no suggestion buttons under the replies (Eden, 2026-10-23); kept as a function so callers are unchanged
      if (!extra || !extra.live) return '';
      const opts = quickAnswers(text, extra.suggestions).slice(0, 6);
      if (!opts.length) return '';
      return '<div class="tj-quick" role="group" aria-label="Quick answers">'
        + opts.map((o) => '<button type="button" data-quick="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>';
    }
    function zynFor(r) { return window.Zyn ? Zyn.img(Zyn.forReply(r), 58) : 'T'; }
    function tojuMsg(text, matches, priceHistory, extra) {
      extra = extra || {};
      const el = document.createElement('div');
      el.className = 'msg toju m-enter';
      el._payload = { text: String(text || ''), more: extra.more || null, matches: (Array.isArray(matches) ? matches : []).slice(0, 6).map(slimMatch), at: Date.now() };
      el._payload.id = pinId(el._payload);
      el.innerHTML = '<div class="av av-toju">' + zynFor({ text: text, matches: matches, searched: extra.searched, priceHistory: priceHistory }) + '</div><div class="col"><div class="sender">Tayo</div><div class="bubble">' + md(text) + moreHtml(extra.more) + '</div>' + quickHtml(text, extra)
        + priceHistoryHtml(priceHistory) + checkedHtml(extra.searched) + matchesHtml(matches)
        + '<div class="tj-acts" role="group" aria-label="Reply actions">'
        + ib('share', 'Share')
        + ib('pin', isPinned(el._payload.id) ? 'Unpin' : 'Pin', isPinned(el._payload.id))
        + ib('up', 'Good reply', loadFb()[el._payload.id] === 'up')
        + ib('down', 'Poor reply', loadFb()[el._payload.id] === 'down')
        + '</div></div>';
      convo.appendChild(el); scrollDown();
    }
    function userMsg(text) {
      const el = document.createElement('div');
      el.className = 'msg user m-enter';
      el.innerHTML = '<div class="col"><div class="bubble">' + esc(text) + '</div></div><div class="av av-user">A</div>';
      convo.appendChild(el); scrollDown();
    }
    /* Staged waiting narration. A two-pass grounded answer takes real seconds,
       and an undifferentiated "thinking…" makes every one of them feel like a
       hang. These say what is actually happening, in Tayo's voice, at the two
       moments a person starts to doubt the page.

       The wording is the doctrine's, not invented here, and it is deliberately
       non-specific about counts, Tayo never claims to be "checking 214
       listings" unless it is. Cleared by remove(), so a fast reply never shows
       a stage at all. */
    const TYPING_STAGES = [
      { at: 2500, text: 'Checking this against our verified listings…' },
      { at: 6000, text: 'Still with you, I’d rather get this right than fast.' },
    ];

    function typing() {
      const el = document.createElement('div');
      el.className = 'msg toju typing m-enter';
      el.innerHTML = '<div class="av av-toju">' + (window.Zyn ? Zyn.img('typing', 58) : 'T') + '</div><div class="col"><div class="sender">Tayo</div>'
        + '<div class="bubble"><span class="sl sl-dots" role="status" aria-label="Tayo is typing"><i></i><i></i><i></i></span>'
        + '<span class="tj-stage" style="color:var(--ink-muted);font-style:italic">thinking…</span></div></div>';
      convo.appendChild(el);

      // aria-live so a screen-reader user hears the wait explained too, rather
      // than silence followed by a wall of text.
      const stage = el.querySelector('.tj-stage');
      stage.setAttribute('aria-live', 'polite');
      const timers = TYPING_STAGES.map((s) => setTimeout(() => {
        stage.textContent = s.text;
        scrollDown();
      }, s.at));

      // Callers do `t.remove()`; override it so the timers cannot fire into a
      // detached node after the answer has already arrived.
      const nativeRemove = el.remove.bind(el);
      el.remove = () => { timers.forEach(clearTimeout); nativeRemove(); };

      scrollDown(); return el;
    }

    // ── Dream Home board → Tayo's knowledge ──
    // Tayo reads the visitor's mood board (title, vibe chips, pinned image
    // captions) and folds it into every conversation as silent context. The
    // message is sent to the model but never rendered in the chat.
    const DREAM_CTX_PREFIX = '[Background from my Dream Home mood board';
    // The dream context is sent to the model but must never surface in the UI:
    // the server persists it, so restored threads carry it, filter everywhere.
    const isDreamCtx = (m) => m && m.role === 'user' && typeof m.content === 'string' && m.content.startsWith(DREAM_CTX_PREFIX);
    /* ── the listing this conversation is about ───────────────────────────
       Arrives as ?reply=<id> from the listing page. Looked up here rather
       than passed in the URL as text: a title and a price in a query string
       are a thing a buyer can edit, and Tayo would then be answering about a
       home at a price nobody is asking.

       Kept for the whole conversation, and remembered across a reload,
       because it is the subject rather than one message's quote. */
    const REPLY_KEY = 'toju_reply_v1';
    let REPLY_TO = null;
    /* ASKING ABOUT AN AGENCY (Eden, 2026-10-19): from "Ask Tayo about their homes" on an agency's page (?agency=<id>). While it
       is set, and no single home is attached, Tayo answers from what Synapse holds about that agency. Kept for the tab so a
       reload does not drop the subject, and dropped when a home is attached. */
    let AGENCY_ID = null;
    try {
      const ap = new URLSearchParams(location.search).get('agency');
      if (ap && /^[0-9a-f-]{36}$/i.test(ap)) { AGENCY_ID = ap; sessionStorage.setItem('syn_agency_ctx', ap); }
      else AGENCY_ID = sessionStorage.getItem('syn_agency_ctx');
    } catch (e) { /* storage blocked: the page still works for this visit */ }
    /* 'discuss' = they pressed Discuss with an agent (Tayo negotiates and hands over); 'info' = they came back to a home
       from a social post or campaign (the card, and answers). Kept across a reload with the listing. */
    const MODE_KEY = 'toju_reply_mode_v1';
    let REPLY_MODE = (function () { try { return localStorage.getItem(MODE_KEY) || 'discuss'; } catch (e) { return 'discuss'; } })();
    const setMode = (m) => { REPLY_MODE = m; try { localStorage.setItem(MODE_KEY, m); } catch (e) {} };

    function loadReply() {
      try { return JSON.parse(localStorage.getItem(REPLY_KEY)) || null; } catch (e) { return null; }
    }
    function saveReply(r) {
      try {
        if (r) localStorage.setItem(REPLY_KEY, JSON.stringify(r));
        else localStorage.removeItem(REPLY_KEY);
      } catch (e) { /* private mode: the chip still works for this page view */ }
    }

    function priceLine(p) {
      const n = Number(p.price) || 0;
      const suffix = p.price_period === 'per_year' ? '/yr'
        : p.price_period === 'per_month' ? '/mo'
        : p.price_period === 'per_night' ? '/night' : '';
      let money;
      try {
        money = new Intl.NumberFormat(undefined, {
          style: 'currency', currency: (p.currency || 'NGN'),
          currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0,
        }).format(n);
      } catch (e) { money = (p.currency || 'NGN') + ' ' + n.toLocaleString(); }
      return money + suffix;
    }

    function renderReply() {
      const box = document.getElementById('tjReply');
      if (!box) return;
      if (!REPLY_TO) { box.hidden = true; box.innerHTML = ''; return; }
      const r = REPLY_TO;
      const rent = String(r.listing_type || '').toLowerCase() === 'rent';
      box.innerHTML =
        '<div class="tjr-main">'
        + '<span class="tjr-k">Replying about</span>'
        + '<span class="tjr-t">' + esc(r.title || 'this home') + '</span>'
        + '<span class="tjr-s">' + esc(priceLine(r))
        + (r.city ? ' \u00b7 ' + esc(r.city) : '')
        + (rent ? ' \u00b7 rent is set by the agency' : '') + '</span>'
        + '</div>'
        + '<button class="tjr-go" id="tjHandoff" type="button"' + hoAttrs() + '>'
        + hoLabel() + '</button>'
        + '<button class="tjr-x" id="tjReplyX" type="button" aria-label="Stop replying about this home">\u00d7</button>';
      box.hidden = false;

      document.getElementById('tjReplyX').addEventListener('click', () => {
        REPLY_TO = null; saveReply(null); renderReply();
      });
      document.getElementById('tjHandoff').addEventListener('click', handOff);
    }

    /* WHEN THE INTRODUCTION BECOMES AVAILABLE
       Not immediately. The reason the listing page no longer has a Contact
       agent button is that an untouched enquiry is worth nothing to an agent;
       offering the same thing one screen later, before a word has been said,
       would only move it. Two turns is a low bar and a real one -- it means
       the buyer asked something and read an answer.

       The bracketed context notes are excluded from the count. They are
       written by this page, not by the person, and letting them count would
       unlock the introduction before the buyer had said anything at all. */
    let HANDED = false;
    const userTurns = () => saved.filter((m) => m.role === 'user'
      && !String(m.content || '').startsWith('[')).length;
    function hoAttrs() {
      if (HANDED) return ' disabled title="Already introduced"';
      return userTurns() >= 2 ? ''
        : ' disabled title="Ask Tayo about this home first"';
    }
    function hoLabel() { return HANDED ? 'Introduced' : 'Introduce me'; }

    /* THE INTRODUCTION TICKET (idea: dqnamo's Ticket). The sentence "Done, I have
       introduced you" is easy to scroll past and hard to point at later. This is
       the same fact as something you can hold: the home, the date, a reference
       taken from the lead's own id, and whether the agent was messaged or the
       enquiry was only saved. It states what create-lead actually returned and
       nothing more: delivery_status 'delivered' says sent; anything else says
       saved, because that is all we know then. */
    function introTicket(p, d) {
      if (!p || !d || !d.lead_id) return;
      const ref = String(d.lead_id).replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
      const when = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const sent = d.delivery_status === 'delivered';
      let img = ''; try { img = coverOf(p.property_media) || ''; } catch (e) { img = ''; }
      const where = [priceLine(p), p.city].filter(Boolean).join(' \u00b7 ');
      const el = document.createElement('div');
      el.className = 'tkt-wrap';
      el.innerHTML = '<div class="tkt" data-tkt role="group" aria-label="Introduction ticket"><div class="tkt-body">'
        + '<div class="tkt-main">'
        + '<div class="tkt-kicker"><span>INTRODUCTION</span><span>' + esc(when) + '</span></div>'
        + '<div class="tkt-hero">' + (img ? '<span class="tkt-ph"><img src="' + esc(img) + '" alt=""></span>' : '')
        + '<div class="tkt-t">' + esc(p.title || 'This home') + '<small>' + esc(where) + '</small></div></div>'
        + '<div class="tkt-grid"><div><i>From</i><b>You, via Tayo</b></div><div><i>To</i><b>The agent</b></div><div><i>Status</i><b>' + (sent ? 'Sent' : 'Saved') + '</b></div></div>'
        + '</div>'
        + '<div class="tkt-stub"><div class="tkt-ref"><i>Reference</i><b>' + esc(ref) + '</b></div><div class="tkt-bar" aria-hidden="true"></div></div>'
        + '</div></div>'
        + '<p class="tkt-note">' + (sent
          ? 'The agent has been messaged with what we talked about. Quote this reference if you call them.'
          : 'The agency has your brief and will see it on their side. Quote this reference if you call them.') + '</p>';
      convo.appendChild(el); scrollDown();
    }
    /* Depth that follows the pointer (or a finger dragged across the ticket). */
    document.addEventListener('pointermove', (e) => {
      const t = e.target.closest && e.target.closest('[data-tkt]'); if (!t) return;
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = t.getBoundingClientRect(); if (!r.width) return;
      const x = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1)), y = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
      t.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg'); t.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
      t.style.setProperty('--px', x.toFixed(3)); t.style.setProperty('--py', y.toFixed(3));
      t.style.setProperty('--gx', ((x + 1) * 50).toFixed(1) + '%'); t.style.setProperty('--gy', ((y + 1) * 50).toFixed(1) + '%');
    });
    document.addEventListener('pointerout', (e) => {
      const t = e.target.closest && e.target.closest('[data-tkt]'); if (!t || t.contains(e.relatedTarget)) return;
      ['--rx', '--ry', '--px', '--py'].forEach((k) => t.style.setProperty(k, k === '--rx' || k === '--ry' ? '0deg' : '0'));
      t.style.setProperty('--gx', '50%'); t.style.setProperty('--gy', '30%');
    });

    /* The introduction. The same create-lead call the listing page used to
       make -- the lead is written before any WhatsApp is attempted, so a
       messaging outage costs the message and never the enquiry -- but reached
       from here, after a conversation, which is the entire point. */
    async function handOff() {
      if (!REPLY_TO || HANDED || HO_BUSY) return;
      const btn = document.getElementById('tjHandoff');
      HO_BUSY = true;
      if (btn) { btn.disabled = true; btn.textContent = 'Preparing\u2026'; }
      const reset = () => { HO_BUSY = false; if (btn) { btn.disabled = false; btn.textContent = 'Introduce me'; } };
      try {
        if (!window.SynAuth) throw new Error('Sign-in is unavailable right now.');
        const who = await SynAuth.ready();
        if (!who) {
          // Handing a name and number to an agency is the thing worth an
          // account. Browsing and talking to Tayo stay anonymous.
          const here = location.pathname + location.search;
          location.href = 'signin.html?reason=contact&next=' + encodeURIComponent(here);
          return;
        }
        /* 1. Tayo writes the summary and the message to the agent, from what was actually said. */
        const t = typing();
        const hres = await fetch(SUPABASE_URL + '/functions/v1/toju-demo', {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
          body: JSON.stringify({ action: 'handover', visitorId: VISITOR, listingId: REPLY_TO.id,
            messages: saved.slice(-16).map((m) => ({ role: m.role, content: m.content })) }),
        });
        const H = await hres.json().catch(() => ({}));
        t.remove();
        if (!hres.ok || !H.message) throw new Error((H && H.error) || 'I could not put the summary together just now.');
        /* 2. The viewing times the agent has open (the agent's own calendar, through the same function the listing page uses). */
        let slots = [];
        try {
          const c = await SynAuth.client();
          const r = await c.rpc('open_inspection_slots', { p_property_id: REPLY_TO.id, p_days: 14 });
          slots = (r && r.data) || [];
        } catch (e) { slots = []; }
        renderHandover(H, slots);
      } catch (e) {
        tojuMsg((e && e.message) || 'I could not make that introduction just now.');
        reset();
      }
    }
    let HO_BUSY = false;

    const slotLabel = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    /* The card: what the agent will read, the times they have free, and one button. Nothing is sent until it is pressed. */
    function renderHandover(H, slots) {
      const sm = H.summary || {};
      const row = (k, v) => v ? '<li><b>' + esc(k) + '</b>' + esc(v) + '</li>' : '';
      const qs = Array.isArray(sm.questions) && sm.questions.length ? sm.questions.join(' \u00b7 ') : '';
      const cs = Array.isArray(sm.concerns) && sm.concerns.length ? sm.concerns.join(' \u00b7 ') : '';
      const offer = H.openingOffer ? 'Opening at \u20a6' + Number(H.openingOffer).toLocaleString('en-NG') : '';
      const el = document.createElement('div');
      el.className = 'ho-card'; el.id = 'hoCard';
      const picks = (slots || []).slice(0, 6);
      el.innerHTML = '<div class="ho-k">Handover to the agent</div><div class="ho-t">' + esc((H.home && H.home.title) || REPLY_TO.title || 'This home') + '</div>'
        + '<ul class="ho-sum">'
        + row('Wants', sm.wants) + row('Budget', sm.budget) + row('Paying', sm.financing) + row('Timeline', sm.timeline) + row('Household', sm.household)
        + row('Where it stands', [sm.position, offer].filter(Boolean).join('. ')) + row('Asked', qs) + row('Worried about', cs) + row('Next step', sm.nextStep)
        + '</ul>'
        + '<div class="ho-k">The message Tayo will send</div><div class="ho-msg">' + esc(H.message) + '</div>'
        + '<div class="ho-k">' + (picks.length ? 'Pick a viewing time the agent has free' : 'Viewing') + '</div>'
        + (picks.length
          ? '<div class="ho-slots" role="group" aria-label="Viewing times">' + picks.map((p) => '<button type="button" class="ho-slot" data-slot="' + esc(p.starts_at) + '">' + esc(slotLabel(p.starts_at)) + '</button>').join('') + '</div>'
          : '<p class="ho-note">The agent has not set viewing times for this home yet. They will propose one.</p>')
        + '<div class="ho-k">How the agent can reach you</div>'
        + '<p class="ho-note" style="margin:2px 0 0">Your email goes with this. Add a phone number or a social media handle if you would like the agent to reach you there. Both are optional.</p>'
        + '<div class="ho-contact">'
        + '<input id="hoPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" placeholder="Phone or WhatsApp number (optional)" aria-label="Phone or WhatsApp number, optional">'
        + '<input id="hoHandle" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80" placeholder="Instagram or TikTok handle (optional)" aria-label="Instagram or TikTok handle, optional">'
        + '</div>'
        + '<div class="ho-row"><button type="button" class="btn btn-primary" id="hoSend">Send to the agent</button><button type="button" class="btn btn-ghost" id="hoCancel">Not yet</button></div>'
        + '<p class="ho-note">The agent gets this by WhatsApp and email. Nothing is sent until you press the button.</p>';
      convo.appendChild(el); scrollDown();
      let chosen = null;
      el.addEventListener('click', (e) => {
        const b = e.target.closest('.ho-slot');
        if (b) { chosen = (chosen === b.dataset.slot) ? null : b.dataset.slot; el.querySelectorAll('.ho-slot').forEach((x) => x.classList.toggle('on', x.dataset.slot === chosen)); return; }
        if (e.target.closest('#hoCancel')) { el.remove(); HO_BUSY = false; const bt = document.getElementById('tjHandoff'); if (bt) { bt.disabled = false; bt.textContent = 'Introduce me'; } return; }
        if (e.target.closest('#hoSend')) sendHandover(H, chosen, el);
      });
    }

    async function sendHandover(H, slot, card) {
      const send = card.querySelector('#hoSend'); if (send) { send.disabled = true; send.textContent = 'Sending\u2026'; }
      try {
        const c = await SynAuth.client();
        const sess = await c.auth.getSession();
        const tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
        if (!tok) throw new Error('Please sign in again to be introduced.');
        /* The two optional contact fields are saved BEFORE the lead is written: create-lead copies the profile's phone onto the
           lead, and the agent reads the handle from the profile. One that does not look right stops the introduction here with a
           clear line, rather than being dropped without a word. */
        const phoneIn = card.querySelector('#hoPhone'), handleIn = card.querySelector('#hoHandle');
        const ph = phoneIn ? phoneIn.value.trim() : '', hd = handleIn ? handleIn.value.trim() : '';
        if (ph) {
          const r1 = await c.rpc('set_my_phone', { p_phone: ph });
          if (r1.error) throw new Error('That phone number does not look complete. Check it, or leave it blank.');
        }
        if (hd) {
          const r2 = await c.rpc('set_my_social_handle', { p_handle: hd });
          if (r2.error) throw new Error('That does not look like a social media handle. Check it, or leave it blank.');
        }
        const sm = H.summary || {};
        const res = await fetch(SUPABASE_URL + '/functions/v1/create-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + tok },
          body: JSON.stringify({
            property_id: REPLY_TO.id, source: 'toju_chat', session_id: VISITOR || null,
            negotiation: { offer: H.openingOffer || null, advice: String(sm.position || '').slice(0, 1000), draft: H.message, summary: sm },
            slot: slot || undefined,
          }),
        });
        const d = await res.json().catch(() => ({}));
        // 207: the lead is saved and the WhatsApp did not go out. Still an introduction, and the agency sees it flagged.
        if (!(res.ok || res.status === 207) || !d.lead_id) throw new Error((d && d.error) || 'That introduction did not go through.');
        try { if (VISITOR) c.rpc('attribute_lead', { p_lead_id: d.lead_id, p_session_id: VISITOR }).catch(() => {}); } catch (e) { /* the lead stands */ }
        HANDED = true; HO_BUSY = false; renderReply();
        setTimeout(refreshHandoff, 1500);
        card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        /* Say exactly what happened, and no more. */
        const by = d.delivery_status === 'delivered' ? (d.email === 'sent' ? 'on WhatsApp and by email' : 'on WhatsApp')
          : d.email === 'sent' ? 'by email' : null;
        const v = d.viewing;
        const viewing = v ? (v.ok ? ' Your viewing is requested for ' + slotLabel(v.startsAt) + '; the agent confirms it.' : ' I could not book that viewing slot, so the agent will propose a time.') : '';
        tojuMsg('Done. I have introduced you to the agent for ' + (REPLY_TO.title || 'this home') + (by ? ' and sent them the summary ' + by + '.' : '. The summary is saved on their side and they will see it in their portal.') + viewing
          + ' You will not be starting again.');
        try { introTicket(REPLY_TO, d); } catch (e) { /* a keepsake; the introduction stands without it */ }
      } catch (e) {
        if (send) { send.disabled = false; send.textContent = 'Send to the agent'; }
        tojuMsg((e && e.message) || 'I could not make that introduction just now.');
      }
    }

    /* The listing the visitor arrived about, kept in the shape the canvas
       speaks so it can be re-seeded after a rebuild. */
    let REPLY_MATCH = null;

    /* A properties row as a Tayo match. Same field names the API emits, so
       shapeTojuMatch needs no special case and the card is identical to every
       other card on the canvas -- which is the point: a home you asked about
       should not look like a different kind of object from a home Tayo found. */
/* THE COVER IS A PHOTO (Eden, 2026-10-02): a listing whose first upload
       was a video showed a blank card, because the video's URL went into an
       <img>. The first photo in display order is the cover; a video-only
       listing gets a still from its video; nothing else gets a stock image. */
    const coverIsVideo = (m) => !!m && (m.media_type === 'video'
      || /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(m.url || '')));
    const coverFrame = (u) => /res\.cloudinary\.com\/.+\/video\/upload\//.test(String(u || ''))
      ? String(u).replace('/video/upload/', '/video/upload/so_0/').replace(/\.(mp4|mov|m4v|qt|webm|3gp)(\?.*)?$/i, '.jpg')
      : null;
    const coverOf = (media) => {
      const s = (Array.isArray(media) ? media : []).filter((m) => m && m.url)
        .slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      const photo = s.find((m) => !coverIsVideo(m));
      return photo ? photo.url : (s.length ? coverFrame(s[0].url) : null);
    };
    function replyMatch(p) {
      return {
        id: p.id,
        img: coverOf(p.property_media),
        title: p.title,
        price: p.price,
        listingType: p.listing_type,
        city: p.city,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        areaSqm: p.area_sqm,
        latitude: p.latitude,
        longitude: p.longitude,
        verificationStatus: p.verification_status,
        trustScore: p.trust_score,
      };
    }

    async function attachReply(id) {
      AGENCY_ID = null; try { sessionStorage.removeItem("syn_agency_ctx"); } catch (e) {}
      try {
        const r = await fetch(SUPABASE_URL + '/rest/v1/properties?id=eq.'
          + encodeURIComponent(id)
          /* The extra columns are what turns a quote line into a card: the
             photograph, where the pin goes, and whether it has been checked.
             Without them the canvas had nothing worth drawing, which is why
             arriving from a listing showed no listing. */
          + '&select=id,title,price,price_period,currency,listing_type,city,bedrooms,'
          + 'bathrooms,area_sqm,latitude,longitude,verification_status,trust_score,'
          + 'property_media(url,display_order,media_type)',
          { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } });
        const rows = await r.json().catch(() => []);
        const p = Array.isArray(rows) ? rows[0] : null;
        if (!p) return null;                  // gone or unpublished: no quote
        REPLY_TO = p; saveReply(p); renderReply();
        REPLY_MATCH = replyMatch(p);
        collect([REPLY_MATCH]);
        renderCanvas();
        return p;
      } catch (e) { return null; }            // the chat still works without it
    }

    /* What Tayo is told. Same shape as the dream-board note below, which is
       the pattern this function already understands: a bracketed aside the
       model reads as context and does not repeat back.

       The rent/sale split is the point. A landlord sets a rent and it is the
       rent, so Tayo answering "shall I get that down for you" on a rental
       teaches a buyer to haggle over something nobody will move on. On a
       sale, a number is a fair question -- inside the price the agency set,
       never below it, and Tayo cannot agree a figure in any case. */
    function replyContext() {
      if (!REPLY_TO) return null;
      const r = REPLY_TO;
      const rent = String(r.listing_type || '').toLowerCase() === 'rent';
      let t = '[The buyer is replying about one specific listing, so answer about THIS home '
        + 'unless they clearly change the subject: "' + (r.title || 'a listing') + '"'
        + (r.city ? ' in ' + r.city : '')
        + ', ' + priceLine(r)
        + (r.bedrooms ? ', ' + r.bedrooms + ' bed' : '') + '. ';
      t += rent
        ? 'This is a RENTAL: the rent is set by the agency and is not negotiable. Do not '
          + 'invite an offer or suggest a lower figure. Answer what they ask, tell them '
          + 'what to check before paying, and when they are genuinely interested say you '
          + 'will introduce them to the agent.'
        : 'This is a SALE: a number is a fair question. Stay within the asking price the '
          + 'agency set and never suggest going below it, and be clear you can carry an '
          + 'offer but only the agency can accept one.';
      return t + ' Never claim the home is verified unless told it is.]';
    }

    function dreamContext() {
      try {
        const b = JSON.parse(localStorage.getItem('synapse_moodboard_v1'));
        if (!b) return null;
        const clean = (a) => Array.isArray(a) ? [...new Set(a.filter(Boolean))] : [];
        const vibes = clean(b.vibe);
        // categorised signals (new boards). Fall back to raw captions for older boards.
        const areas = clean(b.areas);
        const housing = clean(b.housing);
        const lifestyle = clean(b.lifestyle);
        const aesthetic = clean(b.aesthetic);
        const caps = clean(Array.isArray(b.images) ? b.images.map((i) => i && i.c) : []);
        const hasCat = areas.length || housing.length || lifestyle.length || aesthetic.length;
        if (!vibes.length && !caps.length && !hasCat) return null;
        let s = '[Background from my Dream Home ' + (b.mode || 'dream') + ' board, use it to shape what you recommend without repeating it back: ';
        s += 'board "' + (b.name || 'My dream home') + '"';
        if (vibes.length) s += ' · the vibe I love: ' + vibes.join(', ');
        if (housing.length) s += ' · home types I want: ' + housing.join(', ');
        if (areas.length) s += ' · neighbourhoods/settings that feel right: ' + areas.join(', ');
        if (lifestyle.length) s += ' · lifestyle I want: ' + lifestyle.join(', ');
        if (aesthetic.length) s += ' · interior aesthetic: ' + aesthetic.join(', ');
        if (!hasCat && caps.length) s += ' · spaces I keep pinning: ' + caps.join(', ');
        return s + '. Weight neighbourhood and home-type signals for what you surface; treat aesthetic/vibe as tone, not a hard filter.]';
      } catch (e) { return null; }
    }

    /* If reply is still the model's JSON envelope, lift its fields up onto
       the response object in place. Mutates `data` so every downstream reader
       (reply, matches, suggestions) sees the unwrapped values. Tolerates a
       ```json fence, and leaves anything it cannot parse untouched. */
    /* Keys that only ever appear in the control envelope. Used to recognise a
       tail of JSON that the model appended AFTER its prose -- the case that
       put `{"showMatches": false, "criteria": {...` on screen in front of a
       buyer, because the unwrapper below only ever looked at replies that
       STARTED with a brace. Matching on these rather than on any `{` keeps a
       sentence that legitimately contains one intact. */
    const ENVELOPE_KEYS = /"(showMatches|criteria|suggestions|matches)"\s*:/;

    /* Prose first, envelope appended. Cut at the brace that opens the tail and
       keep what the buyer was actually being told. If that tail happens to
       parse and carries matches or suggestions, they are lifted out too rather
       than thrown away with it. */
    function splitTrailingEnvelope(data) {
      const text = data.reply;
      let i = -1;
      /* The LAST brace that opens something envelope-shaped: an earlier one
         may belong to the sentence. */
      for (let at = text.indexOf('{'); at !== -1; at = text.indexOf('{', at + 1)) {
        if (ENVELOPE_KEYS.test(text.slice(at, at + 400))) i = at;
      }
      if (i <= 0) return false;

      const prose = text.slice(0, i).trim();
      if (!prose) return false;               // nothing left to say: leave it alone

      const tail = text.slice(i);
      data.reply = prose;
      try {
        const inner = JSON.parse(tail);
        if (!Array.isArray(data.matches) || !data.matches.length) {
          if (Array.isArray(inner.matches)) data.matches = inner.matches;
        }
        if (!Array.isArray(data.suggestions) || !data.suggestions.length) {
          if (Array.isArray(inner.suggestions)) data.suggestions = inner.suggestions;
        }
      } catch (e) {
        /* Truncated tails are common and are exactly why this leaked. The
           prose is already saved; the rest is not worth salvaging. */
      }
      return true;
    }

    function unwrapEnvelope(data) {
      if (typeof data.reply !== 'string') return;
      let raw = data.reply.trim();
      if (!raw.startsWith('{') && !raw.startsWith('```')) {
        /* Not envelope-first -- but it may still be prose with an envelope
           welded onto the end. */
        if (ENVELOPE_KEYS.test(raw)) splitTrailingEnvelope(data);
        return;
      }
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      if (!raw.startsWith('{')) return;
      let inner;
      try {
        inner = JSON.parse(raw);
      } catch (e) {
        /* Envelopes arrive truncated or with a malformed tail often enough
           that a strict parse is not sufficient, that is exactly the case
           that was leaking JSON to the screen. Salvage just the reply string,
           which is the only part the reader actually needs. */
        const m = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        let said = '';
        if (m) {
          try { said = JSON.parse('"' + m[1] + '"'); } catch (e2) { said = ''; }
        }
        /* Nothing readable inside it: empty, so ask() shows its error and
           never the envelope itself (Greptile audit). */
        data.reply = said;
        return;
      }
      if (!inner || typeof inner.reply !== 'string') { data.reply = ''; return; }
      data.reply = inner.reply;
      if (!Array.isArray(data.matches) || !data.matches.length) {
        if (Array.isArray(inner.matches)) data.matches = inner.matches;
      }
      if (!Array.isArray(data.suggestions) || !data.suggestions.length) {
        if (Array.isArray(inner.suggestions)) data.suggestions = inner.suggestions;
      }
    }

    /* LIVE CONTEXT. What this device knows about what the buyer is doing, sent with every message so Tayo does not start from nothing:
       where they are (the app or the website), the home they last opened and the post it came from, the homes they looked at lately
       and the ones they saved, and the hour on their clock. Only ids and a few closed words leave the phone; the server reads the
       homes from the database by id and ignores anything it does not recognise (toju-demo/live-context.ts). No location, no name,
       nothing typed. */
    function liveContext() {
      const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const c = {
        v: 1, where: 'tayo',
        surface: document.documentElement.classList.contains('syn-app') ? 'app' : 'web',
        tzOffsetMin: -new Date().getTimezoneOffset(),
        language: String(navigator.language || '').slice(0, 12),
      };
      try {
        if (window.SynMatches) {
          const saved = Array.from(SynMatches.readSaves()).filter((x) => typeof x === 'string' && UUID.test(x)).slice(-8);
          const recent = SynMatches.readViews().map((v) => v && v.id).filter((x) => typeof x === 'string' && UUID.test(x)).slice(0, 8);
          if (saved.length) c.saved = saved;
          if (recent.length) c.recent = recent;
        }
      } catch (e) { /* no saves is fine */ }
      try {
        const lh = JSON.parse(localStorage.getItem('syn_last_home') || 'null');
        if (lh && typeof lh.id === 'string' && UUID.test(lh.id)) {
          c.lastHome = { id: lh.id, ch: String(lh.ch || '').slice(0, 20), ageMin: lh.ts ? Math.max(0, Math.round((Date.now() - Number(lh.ts)) / 60000)) : null };
        }
      } catch (e) { /* none */ }
      return c;
    }

    async function ask() {
      clearError();
      const t = typing();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort('timeout'), 50000);   // a price-history search can take ~30s
      try {
        if (!navigator.onLine) throw Object.assign(new Error('offline'), { kind: 'offline' });
        const outgoing = saved.slice(-14).map((m) => ({ role: m.role, content: m.content }));
        const dream = dreamContext();
        if (dream) outgoing.unshift({ role: 'user', content: dream });
        /* After the dream board, so the listing is the nearer context: the
           board shapes taste, this is the actual question. */
        const reply = replyContext();
        if (reply) outgoing.push({ role: 'user', content: reply });
        const res = await fetch(SUPABASE_URL + '/functions/v1/toju-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
          body: JSON.stringify({ visitorId: VISITOR, messages: outgoing, context: liveContext(), listingId: (REPLY_TO && REPLY_TO.id) || undefined, agencyId: (!REPLY_TO && AGENCY_ID) || undefined, mode: REPLY_TO ? REPLY_MODE : undefined }),
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        clearTimeout(timer); t.remove();
        if (!res.ok) throw Object.assign(new Error('http ' + res.status), { kind: res.status === 429 ? 'busy' : 'server' });
        if (data.error || !data.reply) throw Object.assign(new Error('empty reply'), { kind: 'server' });
        /* Guard: the function normally parses the model's JSON envelope and
           returns its fields at the top level, but when that parse fails it
           passes the raw text straight through, and the user gets a screenful
           of {"reply": …} on the main product surface. Seen intermittently in
           testing. Unwrap it here so a server-side parse miss can never surface
           as raw JSON; the real fix belongs in the toju-demo function. */
        unwrapEnvelope(data);
        // show the canvas whenever the function returns matches (not only when it
        // sets showMatches) so asking "show me what you found" always renders them.
        const matches = Array.isArray(data.matches) ? data.matches : [];
        const priceHistory = data.priceHistory && Array.isArray(data.priceHistory.rows) ? data.priceHistory : null;
        const extra = { more: typeof data.more === 'string' && data.more.trim() ? data.more.trim() : null, searched: data.searched || null, live: true, suggestions: data.suggestions };
        saved.push({ role: 'assistant', content: data.reply, matches, priceHistory, more: extra.more, searched: extra.searched });
        persist();
        tojuMsg(data.reply, matches, priceHistory, extra);
        collect(matches); renderCanvas();
        /* The row under the box repeats the closed-question buttons in the reply,
           so a live reply leaves it empty: nothing is offered unless Tayo asked
           something with a short answer, and then the answers sit in the reply. */
        renderSuggest(null, true);
        renderReply();   // the introduction unlocks once there is a conversation
        /* A price was agreed: open the viewing card straight away (the agent's open times, then the introduction), so the
           buyer is never left hunting for a button. Signed-out buyers keep the button, which sends them to sign in. */
        if (data.offerViewing && REPLY_TO && !HANDED) {
          setTimeout(async () => {
            try { if (window.SynAuth && await SynAuth.ready()) handOff(); }
            catch (e) { /* the button is still there */ }
          }, 900);
        }
      } catch (e) {
        clearTimeout(timer); t.remove();
        const kind = e && e.kind ? e.kind
          : (e && e.name === 'AbortError') ? 'timeout'
          : !navigator.onLine ? 'offline' : 'network';
        showError(kind);
      }
      busy = false; scrollDown();
    }

    /* ── error states ──────────────────────────────────────────────────────
       An error is NOT a Tayo message: it never enters the saved thread and
       never speaks in Tayo's voice (he didn't say it, the connection failed).
       It's a system notice that names the real cause, says what happens to the
       user's question, and offers the one action that fixes it. */
    const ERRORS = {
      offline:  { icon: 'unverified', ttl: "You're offline",
                  msg: 'Your question is saved. I’ll answer as soon as you’re back online.', auto: true },
      timeout:  { icon: 'pending', ttl: 'That took too long',
                  msg: 'The connection is slow right now. Your question is still here, try again?' },
      busy:     { icon: 'pending', ttl: 'A lot of people are asking at once',
                  msg: 'Give it a few seconds and try again, your question is saved.' },
      server:   { icon: 'unverified', ttl: 'I couldn’t reach my advisor service',
                  msg: 'This is on our side, not yours. Your question is saved, try again in a moment.' },
      network:  { icon: 'unverified', ttl: 'Couldn’t connect',
                  msg: 'Check your connection and try again, your question is saved.' },
    };
    let errEl = null;
    function clearError() { if (errEl) { errEl.remove(); errEl = null; } }
    function showError(kind) {
      const e = ERRORS[kind] || ERRORS.network;
      const ic = (window.SynIcons && SynIcons.has(e.icon)) ? SynIcons.svg(e.icon) : '!';
      errEl = document.createElement('div');
      errEl.className = 'tj-error m-enter';
      errEl.setAttribute('role', 'alert');
      errEl.innerHTML = '<div class="ei">' + ic + '</div><div class="et">'
        + '<div class="eh">' + esc(e.ttl) + '</div><div class="em">' + esc(e.msg) + '</div>'
        + (e.auto ? '<div class="ew">Waiting for your connection…</div>'
                  : '<button class="er" type="button">Try again</button>')
        + '</div>';
      const btn = errEl.querySelector('.er');
      if (btn) btn.addEventListener('click', retry);
      convo.appendChild(errEl); scrollDown();
    }
    function retry() {
      if (busy) return;
      clearError();
      busy = true;
      ask();   // the user's message is already in `saved`, just re-ask
    }
    // came back online with a question still unanswered → answer it, no tap needed
    window.addEventListener('online', () => {
      const last = saved[saved.length - 1];
      if (errEl && last && last.role === 'user') retry();
      else clearError();
    });
    window.addEventListener('offline', () => { if (!busy) { clearError(); showError('offline'); } });

    function send(text) {
      const v = (text != null ? text : input.value).trim();
      if (!v || busy) return;
      busy = true; input.value = '';
      saved.push({ role: 'user', content: v });
      persist();
      userMsg(v);
      ask();
    }

    // suggestions are DYNAMIC, Tayo sends tap-to-answer options for the
    // question it just asked ("Married with kids", "Just me", …)
    const suggestEl = document.getElementById('tjSuggest');
    /* `let`, because the grounded set replaces this once inventory has been
       read. As a const captured at load it held the STATIC markup forever, so
       Tayo offering its own dynamic options and then falling back -- which is
       what New chat does -- put the placeholder suggestions back, naming a
       city we may have nothing in. The fallback has to be the good set, not
       the one that shipped in the HTML. */
    let DEFAULT_SUGGEST = suggestEl.innerHTML;
    function setDefaultSuggest(html) { DEFAULT_SUGGEST = html; }
    function renderSuggest(list, blank) {
      if (blank) {
        suggestEl.innerHTML = '';
      } else if (Array.isArray(list) && list.length) {
        suggestEl.innerHTML = list.map((s) =>
          '<button data-send="' + esc(s) + '">' + esc(s) + '</button>').join('');
      } else {
        suggestEl.innerHTML = DEFAULT_SUGGEST;
      }
    }
    suggestEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-send]'); if (b) send(b.getAttribute('data-send'));
    });
    sendBtn.addEventListener('click', () => send());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } });

    /* ───────── voice typing (Web Speech API) ───────── */
    const micBtn = document.getElementById('tjMic');
    const hintEl = document.getElementById('tjHint');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const inIframe = window.self !== window.top;
    let recog = null, listening = false, hintTimer = null;

    /* Tap Zyn and he zooms in and does something. */
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.av-toju'); if (!a || !window.Zyn) return;
      Zyn.emote(a.querySelector('img'));
    });
    function hint(msg) {
      hintEl.textContent = msg; hintEl.hidden = false;
      clearTimeout(hintTimer); hintTimer = setTimeout(() => { hintEl.hidden = true; }, 5000);
    }
    function stopMicUI() { listening = false; micBtn.classList.remove('listening'); input.placeholder = "Tell Tayo what you're looking for…"; }
    function startMic() {
      recog = new SR();
      // en-NG is rejected by many Chrome builds ("language-not-supported"); en-US
      // is universally supported and handles Nigerian-accented English fine.
      try { recog.lang = (navigator.language && /^en/i.test(navigator.language)) ? navigator.language : 'en-US'; } catch (e) { recog.lang = 'en-US'; }
      recog.interimResults = true; recog.continuous = true;
      const base = input.value.trim() ? input.value.trim() + ' ' : '';
      recog.onresult = (e) => {
        let txt = '';
        for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
        input.value = base + txt;
      };
      // exhaustive: no error path is silent (the old code dropped every case but 3)
      recog.onerror = (e) => {
        stopMicUI();
        switch (e.error) {
          case 'not-allowed': case 'service-not-allowed':
            hint(inIframe
              ? 'Open this page in its own browser tab to use voice, it’s blocked inside the embedded preview.'
              : 'Microphone is blocked. Click the 🔒 icon in the address bar → Allow, then tap the mic again.'); break;
          case 'no-speech': hint('Didn’t catch that, tap the mic and speak.'); break;
          case 'audio-capture': hint('No microphone found, check it’s connected, then try again.'); break;
          case 'network': hint('Voice needs a connection, check your network and try again.'); break;
          case 'aborted': break; // user stopped it, no message needed
          case 'language-not-supported':
            if (recog.lang !== 'en-US') { recog.lang = 'en-US'; try { recog.start(); listening = true; micBtn.classList.add('listening'); return; } catch (e2) {} }
            hint('Voice isn’t available in your browser here, try Chrome or Edge.'); break;
          default: hint('Voice hit a snag, tap the mic to try again.');
        }
      };
      recog.onend = () => stopMicUI();
      try { recog.start(); listening = true; micBtn.classList.add('listening'); input.placeholder = 'Listening… speak now'; input.focus(); }
      catch (err) { stopMicUI(); hint('Couldn’t start voice, tap the mic to try again.'); }
    }
    async function toggleMic() {
      if (!SR) { hint('Voice typing needs Chrome or Edge on this device.'); return; }
      if (!window.isSecureContext) { hint('Voice needs a secure page, open the app on localhost or https, not a raw IP address.'); return; }
      if (listening) { try { recog && recog.stop(); } catch (e) {} stopMicUI(); return; }
      // Ask for mic permission the reliable way (getUserMedia shows the prompt);
      // SpeechRecognition alone often throws "not-allowed" without ever asking.
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop()); // we only needed the grant
        } catch (err) {
          stopMicUI();
          const n = err && err.name;
          if (n === 'NotAllowedError' || n === 'SecurityError') {
            hint(inIframe
              ? 'Open this page in its own browser tab to use voice, the embedded preview blocks the mic.'
              : 'Mic access is blocked for this site. Click the 🔒 (or camera) icon in the address bar → set Microphone to Allow → then tap the mic again.');
          } else if (n === 'NotFoundError' || n === 'DevicesNotFoundError') {
            hint('No microphone found on this device.');
          } else {
            hint('Couldn’t reach the mic, check your browser’s microphone permissions and try again.');
          }
          return;
        }
      }
      startMic();
    }
    micBtn.addEventListener('click', toggleMic);

    // restore the saved conversation so people continue where they left off:
    // local copy renders instantly, then the server copy (visitor id) wins.
    /* First-visit greeting. Mirrors FIRST_VISIT_GREETING in the toju-demo edge
       function, see the placeholder contract documented above that constant.
       `{{LISTING_COUNT}}` sits immediately before "the homes" so the substituted
       value carries its own trailing text; an unknown count degrades to "the
       homes agencies have listed with us", which still reads correctly.

       Never hardcode a number here: a stale count is a trust bug. The count
       arrives with the restore response and the greeting is rewritten in place.

       It deliberately does not promise everything is verified, Tayo shows both
       and says which is which. The old copy ("verified homes that fit", with a
       hardcoded "Good afternoon" that was wrong most of the day) promised the
       opposite of what Tayo now does. */
    /* The count substitutes as "the 6 " rather than "6 of ". The old form
       read "a home from 6 of the homes agencies have listed", ungrammatical,
       and "6 of the homes" claims a subset when it is in fact all of them.
       The token carries its own article so the sentence still stands when no
       count is available. */
    const GREETING_TEMPLATE =
      "I'm Tayo. I'll find you a home from {{LISTING_COUNT}}homes agencies have listed with us.\n\n"
      + "What's prompting the move?";
    const greetingWith = (n) =>
      GREETING_TEMPLATE.replace('{{LISTING_COUNT}}',
        Number.isFinite(n) && n > 0 ? 'the ' + n.toLocaleString() + ' ' : 'the ');
    const GREETING = greetingWith(null);
    /* For somebody who arrived from a post: they already have a home in mind,
       so the first question is which one, not what is prompting the move. */
    const arrivalGreeting = (from) =>
      "I'm Tayo, Synapse's property advisor. "
      + (from ? 'Did a home on our ' + from + ' catch your eye?' : 'Did one of our posts catch your eye?')
      + ' Tell me which one, the area or the price is enough, or tell me what you’re looking for.';
    const FIRST_GREETING = ARRIVAL.social ? arrivalGreeting(ARRIVAL.from) : GREETING;

    /* ── suggestions, from what is actually listed ──────────────────────────
       A suggested brief has to be answerable, or the opening move of the whole
       product is a dead end. These are built from live inventory: the city we
       actually have most homes in, a real neighbourhood, and a ceiling above a
       real asking price. If the read fails the static three stay, because they
       name no place and cannot be contradicted. */
    (function groundSuggestions() {
      var box = document.getElementById('tjSuggest');
      if (!box) return;

      /* Only columns that exist. The first attempt asked for `neighbourhood`,
         which is `neighbourhood_id` here -- PostgREST answered 400 and the
         chips silently stayed static, which is the failure mode this whole fix
         is about. The join to neighbourhoods is not used either: every row's
         FK is null, so an area chip would have nothing behind it. */
      fetch(SUPABASE_URL + '/rest/v1/properties'
            + '?select=city,bedrooms,price,listing_type'
            + '&status=eq.live&is_active=eq.true&limit=200',
            { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          if (!rows || !rows.length) return;

          /* Most-listed city, so the suggestion points at the thickest part of
             the inventory rather than a one-off. */
          var byCity = {};
          rows.forEach(function (r) { if (r.city) byCity[r.city] = (byCity[r.city] || 0) + 1; });
          var city = Object.keys(byCity).sort(function (a, b) { return byCity[b] - byCity[a]; })[0];
          if (!city) return;

          var inCity = rows.filter(function (r) { return r.city === city && r.price > 0; });
          if (!inCity.length) return;

          /* The smallest size actually listed, and a ceiling ABOVE the cheapest
             home at that size. A suggestion that excludes everything is the bug
             being fixed, not a stricter version of it. */
          var beds = inCity.map(function (r) { return r.bedrooms; })
                           .filter(function (b) { return b > 0; })
                           .sort(function (a, b) { return a - b; })[0];
          var sized = beds ? inCity.filter(function (r) { return r.bedrooms === beds; }) : inCity;
          var cheapest = Math.min.apply(null, sized.map(function (r) { return r.price; }));

          var ceiling = cheapest >= 1e6
            ? Math.ceil(cheapest / 1e6 / 5) * 5 + 'M'
            : Math.ceil(cheapest / 1e5) * 100 + 'k';

          var chips = [];
          if (beds) chips.push(beds + '-bed in ' + city + ' under ₦' + ceiling);
          else chips.push('What is available in ' + city + '?');
          chips.push('What can I afford on ₦250,000 a month?');
          chips.push('What should I check before paying?');

          var html = chips.map(function (q) {
            var safe = String(q).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
            return '<button data-send="' + safe + '">' + safe + '</button>';
          }).join('');
          box.innerHTML = html;
          /* And make it the fallback, so New chat and every "no dynamic
             suggestions this turn" comes back to these rather than to the
             placeholder markup. */
          if (typeof setDefaultSuggest === 'function') setDefaultSuggest(html);
        })
        .catch(function () { /* the static three are already correct */ });
    })();

    function render() {
      convo.innerHTML = '';
      saved.forEach((m) => { if (isDreamCtx(m)) return; (m.role === 'user' ? userMsg(m.content) : tojuMsg(m.content, Array.isArray(m.matches) ? m.matches : [], m.priceHistory || null, { more: m.more || null, searched: m.searched || null })); });
      rebuildCanvas();
    }
    // scrub any hidden context that leaked into storage before the filter existed
    if (saved.some(isDreamCtx)) { saved = saved.filter((m) => !isDreamCtx(m)); persist(); }
    if (saved.length === 0) { saved = [{ role: 'assistant', content: FIRST_GREETING }]; persist(); }
    render();
    // Server restore, strictly a fallback for continuing on another device.
    // Guard rails: drop hidden dream-context messages, ignore the response if
    // the visitor rotated (New chat) meanwhile, and never let a server copy
    // (which has no per-message matches) clobber an equally long local thread.
    const restoreFor = VISITOR;
    fetch(SUPABASE_URL + '/functions/v1/toju-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
      body: JSON.stringify({ action: 'restore', visitorId: VISITOR }),
    }).then((r) => r.json()).then((d) => {
      if (VISITOR !== restoreFor) return;
      const msgs = (Array.isArray(d.messages) ? d.messages : []).filter((m) => !isDreamCtx(m));
      if (msgs.length > saved.length) {
        saved = msgs; persist(); render(); rebuildCanvas();
      }

      // Live inventory count → the greeting's placeholder. Only rewrites the
      // greeting while it is still the ONLY thing said; once a conversation has
      // started, editing Tayo's first line under the user would be dishonest.
      /* Only the generic greeting carries a count; an arrival's greeting
         asks a different question and is left as it is. */
      if (Number.isFinite(d.listingCount) && saved.length === 1 && saved[0].role === 'assistant'
          && saved[0].content === GREETING) {
        saved[0].content = greetingWith(d.listingCount);
        persist(); render();
      }

      // Item 3, make the memory visible. Tayo already remembered; nothing said
      // so, which is the whole point of the feature: the reason to come back
      // here instead of scrolling Instagram again is that it kept your thread.
      showMemoryNote(d.criteria, msgs);
    }).catch(() => {});

    /* A quiet line above the conversation on return, stating what Tayo actually
       still holds. Rendered ONLY from real restored state, the brief the user
       themselves gave, never a generic "welcome back". If there is no brief and
       no prior exchange, nothing appears. */
    function showMemoryNote(criteria, msgs) {
      const hasThread = Array.isArray(msgs) && msgs.some((m) => m.role === 'user');
      const brief = criteria && typeof criteria.brief === 'string' ? criteria.brief.trim() : '';
      if (!hasThread && !brief) return;
      if (document.getElementById('tjMemory')) return;

      const el = document.createElement('div');
      el.id = 'tjMemory';
      el.className = 'tj-memory';
      el.innerHTML = '<span class="tj-mem-k">Tayo remembers your search</span>'
        + (brief ? '<span class="tj-mem-b">' + esc(brief) + '</span>' : '')
        + '<button type="button" class="tj-mem-x" aria-label="Dismiss">×</button>';
      convo.parentNode.insertBefore(el, convo);
      el.querySelector('.tj-mem-x').addEventListener('click', () => el.remove());
    }

    /* Shortening a scroller does not move its scrollTop, so when the
       keyboard opens the message you were reading slides up behind the
       composer at the moment you start replying to it. Re-pin to the bottom,
       but only if you were already there -- somebody who has scrolled back
       through the conversation to check something is not asking to be thrown
       to the end because they tapped the box. */
    document.documentElement.addEventListener('syn:keyboard', function (e) {
      if (!e.detail || !e.detail.open) return;
      var sc = document.querySelector('.convo-scroll');
      if (!sc) return;
      var nearBottom = (sc.scrollHeight - sc.scrollTop - sc.clientHeight) < 220;
      if (nearBottom) requestAnimationFrame(function () { sc.scrollTop = sc.scrollHeight; });
    });

    // deep link from a listing: ?ask=... pre-fills the composer
    /* Deep link from a listing or the landing hero: ?ask=…
       It used to only pre-fill the composer, leaving the visitor to press send
       on their own words, a pointless second step. It now sends, so someone who
       typed their brief on the landing page lands mid-conversation rather than
       staring at their own sentence. The URL is cleaned afterwards so a reload
       doesn't re-ask the same thing. */
    /* ?reply=<listing id> from the listing page. Restored from storage
       otherwise, so a reload does not drop the subject mid-conversation. */
    const replyParam = new URLSearchParams(location.search).get('reply');
    const askBeforeStrip = new URLSearchParams(location.search).get('ask');
    const homeParam = new URLSearchParams(location.search).get('home');
    if (replyParam) {
      setMode('discuss');
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      /* TAYO SPEAKS FIRST. Attaching the listing and then waiting made the
         visitor open a conversation about a home they had just been reading --
         the context was carried across and never used.

         Sent as a visible message rather than hidden priming because it is a
         truthful account of what "Discuss with an agent" meant, and because
         replyContext() already instructs the model to answer about THIS
         listing, so what comes back is grounded in the row rather than
         invented. Skipped when ?ask= is also present: that carries the
         visitor's own words and they outrank a generic opener. */
      const alsoAsking = askBeforeStrip;
      attachReply(replyParam).then((p) => {
        if (p && !alsoAsking) send('Tell me about this home.');
      });
    } else if (homeParam) {
      /* FROM A SOCIAL POST OR CAMPAIGN: the property card, and answers about it. */
      setMode('info');
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      attachReply(homeParam).then((p) => { if (p && !askBeforeStrip) send('Tell me about this home.'); });
    } else {
      REPLY_TO = loadReply();
      renderReply();
      /* COMING BACK TO THE APP after meeting a home on social: nothing said yet here, a home remembered from a recent
         visit that came through a channel. Put its card up and let them ask. */
      try {
        const lh = JSON.parse(localStorage.getItem('syn_last_home') || 'null');
        const fresh = lh && lh.id && lh.ch && (Date.now() - Number(lh.ts || 0)) < 14 * 864e5;
        if (fresh && !REPLY_TO && !askBeforeStrip && !(saved && saved.length) && !JSON.parse(localStorage.getItem('toju_sessions_v1') || '[]').length) {
          setMode('info');
          attachReply(lh.id).then((p) => { if (p) send('Tell me about this home.'); });
        }
      } catch (e) { /* storage blocked: the chat simply opens as usual */ }
    }

    const askParam = new URLSearchParams(location.search).get('ask');
    if (askParam) {
      const q = askParam.slice(0, 300).trim();
      input.value = q;
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      if (q) { setTimeout(() => send(), 60); } else { SynMatches.focusUnlessTouch(input); scrollDown(); }
    }


    /* ── chat history: every conversation is kept, with the homes it surfaced.
       A session archives on "New chat" (or when you open an older one) and can
       be picked back up: its visitorId comes back too, so Tayo's server-side
       memory continues where that conversation left off. ── */
    const SESS = 'toju_sessions_v1';
    const loadSessions = () => { try { return JSON.parse(localStorage.getItem(SESS)) || []; } catch (e) { return []; } };
    const saveSessions = (s) => { try { localStorage.setItem(SESS, JSON.stringify(s.slice(0, 30))); } catch (e) {} };
    function archiveThread(visitorId, messages) {
      if (!messages.some((m) => m.role === 'user')) return; // nothing worth keeping
      const first = messages.find((m) => m.role === 'user');
      const sessions = loadSessions().filter((s) => s.visitorId !== visitorId);
      sessions.unshift({
        id: crypto.randomUUID(), visitorId: visitorId, endedAt: Date.now(),
        title: String(first.content).slice(0, 80),
        homes: messages.reduce((n, m) => n + (Array.isArray(m.matches) ? m.matches.length : 0), 0),
        messages: messages,
      });
      saveSessions(sessions);
    }
    function archiveCurrent() { archiveThread(VISITOR, saved); }
    // The thread an arrival set aside, filed now that history exists.
    if (SET_ASIDE) { archiveThread(SET_ASIDE.visitorId, SET_ASIDE.messages); SET_ASIDE = null; }

    /* ── PIN AND SHARE (Eden, 2026-10-03) ─────────────────────────────────
       A pin keeps a Tayo reply, and the homes under it, in this browser.
       Sharing sends the words and a link to each home through the phone's own
       share sheet; where there is none, it copies them. Nothing is uploaded. */
    function loadPins() { try { return JSON.parse(localStorage.getItem(PINKEY)) || []; } catch (e) { return []; } }
    function savePins(p) { try { localStorage.setItem(PINKEY, JSON.stringify(p.slice(0, 100))); } catch (e) {} }
    function pinId(pl) {
      const src = String(pl.text || '') + '|' + (pl.matches || []).map((m) => m.id).join(',');
      let h = 5381; for (let i = 0; i < src.length; i++) h = ((h << 5) + h + src.charCodeAt(i)) | 0;
      return 'p' + (h >>> 0).toString(36);
    }
    function isPinned(id) { return loadPins().some((x) => x.id === id); }
    function absLink(id) { return new URL(SynMatches.propertyHref(id), location.href).href; }
    function shareText(pl) {
      const homes = (pl.matches || []).map((m) => '\u2022 ' + (m.title || 'Listing') + (Number(m.price) > 0 ? ' \u00B7 ' + naira(m.price) : '') + '\n  ' + absLink(m.id));
      return 'Tayo, Synapse\'s property advisor:\n\n' + pl.text + (pl.more ? '\n\n' + pl.more : '')
        + (homes.length ? '\n\n' + homes.join('\n') : '') + '\n\n' + location.origin + '/app/toju.html?new=site';
    }
    function flashTip(btn, word) {
      btn.dataset.tip = word; btn.classList.add('tip');
      clearTimeout(btn._tipT); btn._tipT = setTimeout(() => btn.classList.remove('tip'), 1600);
    }
    function setPin(b, on) {
      b.setAttribute('aria-pressed', String(on));
      const label = on ? 'Unpin' : 'Pin';
      b.setAttribute('aria-label', label); b.title = label;
      flashTip(b, on ? 'Pinned' : 'Unpinned');
    }
    /* Thumbs: one rating per reply, tapping it again takes it back. Kept on
       this device for the pressed state, and sent to the team so ratings
       teach something. The visitor's own words are never sent. */
    function rate(b, pl) {
      const want = b.dataset.act;
      const map = loadFb();
      const clearing = map[pl.id] === want;
      if (clearing) delete map[pl.id]; else map[pl.id] = want;
      saveFb(map);
      const row = b.closest('.tj-acts');
      row.querySelectorAll('[data-act="up"],[data-act="down"]').forEach((x) => x.setAttribute('aria-pressed', String(map[pl.id] === x.dataset.act)));
      flashTip(b, clearing ? 'Removed' : 'Thanks');
      if (clearing) return;
      try {
        fetch(SUPABASE_URL + '/rest/v1/rpc/record_toju_feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
          body: JSON.stringify({ p_reply_id: String(pl.id), p_rating: want, p_excerpt: String(pl.text || '').slice(0, 300) }),
          keepalive: true,
        }).catch(() => {});
      } catch (e) {}
    }
    function shareOut(text, btn) {
      const was = btn.textContent;
      const done = (w) => {
        if (btn.classList.contains('tj-ib')) { flashTip(btn, w); return; }
        btn.textContent = w; setTimeout(() => { btn.textContent = was; }, 1800);
      };
      if (navigator.share) {
        navigator.share({ title: 'Tayo on Synapse', text }).catch((e) => { if (e && e.name !== 'AbortError') done('Could not share'); });
        return;
      }
      const copy = () => { try {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta); if (ok) done('Copied'); else window.prompt('Copy this to share it:', text); } catch (e) { window.prompt('Copy this to share it:', text); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => done('Copied'), copy); else copy();
    }
    /* ── the deck of homes ── */
    function deckLayout(deck) {
      const slots = [...deck.querySelectorAll('.hc-slot')];
      slots.forEach((s) => { s.style.setProperty('--d', s.dataset.pos); s.classList.toggle('front', s.dataset.pos === '0'); s.removeAttribute('inert'); if (s.dataset.pos !== '0') s.setAttribute('inert', ''); });
      const front = slots.find((s) => s.dataset.pos === '0');
      const c = deck.parentNode.querySelector('[data-deck-count]');
      if (front && c) c.textContent = (Number(front.dataset.orig) + 1) + ' / ' + slots.length;
    }
    function deckInit(deck) {
      if (deck.dataset.ready) return;
      deck.dataset.ready = '1';
      deck.querySelectorAll('.hc-slot').forEach((s) => { s.dataset.pos = s.dataset.orig; });
      deckLayout(deck);
    }
    function deckGo(deck, dir) {
      const slots = [...deck.querySelectorAll('.hc-slot')];
      if (slots.length < 2 || deck.dataset.busy) return;
      const front = slots.find((s) => s.dataset.pos === '0');
      deck.dataset.busy = '1';
      const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const done = () => {
        const n = slots.length;
        slots.forEach((s) => { s.dataset.pos = String(s === front ? n - 1 : Number(s.dataset.pos) - 1); });
        front.classList.remove('flying'); front.style.transform = ''; front.style.opacity = '';
        deckLayout(deck); delete deck.dataset.busy;
      };
      if (reduced) { done(); return; }
      front.classList.add('flying');
      front.style.transform = 'translateX(' + (dir * 130) + '%) rotate(' + (dir * 14) + 'deg)';
      front.style.opacity = '0';
      setTimeout(done, 240);
    }
    /* the arrow back: the card at the very back comes forward again */
    function deckBack(deck) {
      const slots = [...deck.querySelectorAll('.hc-slot')];
      if (slots.length < 2 || deck.dataset.busy) return;
      const n = slots.length;
      slots.forEach((s) => { s.dataset.pos = String(s.dataset.pos === String(n - 1) ? 0 : Number(s.dataset.pos) + 1); });
      deckLayout(deck);
    }
    let dk = null;
    convo.addEventListener('pointerdown', (e) => {
      const slot = e.target.closest('.hc-slot.front'); if (!slot) return;
      const deck = slot.parentNode; if (!deck.matches('[data-deck]') || deck.dataset.busy || deck.querySelectorAll('.hc-slot').length < 2) return;
      dk = { deck, slot, x: e.clientX, y: e.clientY, dx: 0, t: Date.now(), drag: false, id: e.pointerId };
    });
    convo.addEventListener('pointermove', (e) => {
      if (!dk || e.pointerId !== dk.id) return;
      const dx = e.clientX - dk.x, dy = e.clientY - dk.y;
      if (!dk.drag) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { dk = null; return; }   // a scroll, not a swipe
        if (Math.abs(dx) < 8) return;
        dk.drag = true; dk.slot.classList.add('dragging');
        try { dk.slot.setPointerCapture(e.pointerId); } catch (x) { /* the drag still follows the pointer */ }
      }
      dk.dx = dx;
      dk.slot.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 22) + 'deg)';
    });
    function deckEnd(e) {
      if (!dk || e.pointerId !== dk.id) return;
      const d = dk; dk = null;
      if (!d.drag) return;
      d.slot.classList.remove('dragging');
      d.deck.dataset.dragged = '1'; setTimeout(() => { delete d.deck.dataset.dragged; }, 60);   // the click that follows a drag is not a tap
      const fast = Math.abs(d.dx) / Math.max(1, Date.now() - d.t) > 0.5;
      if (Math.abs(d.dx) > 70 || (fast && Math.abs(d.dx) > 30)) deckGo(d.deck, d.dx > 0 ? 1 : -1);
      else d.slot.style.transform = '';
    }
    convo.addEventListener('pointerup', deckEnd);
    convo.addEventListener('pointercancel', deckEnd);
    new MutationObserver(() => convo.querySelectorAll('[data-deck]:not([data-ready])').forEach(deckInit)).observe(convo, { childList: true, subtree: true });
    convo.addEventListener('click', (e) => {
      const nb = e.target.closest('[data-deck-next],[data-deck-prev]');
      if (nb) { const deck = nb.parentNode.previousElementSibling; if (deck && deck.matches('[data-deck]')) { if (nb.hasAttribute('data-deck-next')) deckGo(deck, -1); else deckBack(deck); } return; }
      const dd = e.target.closest('[data-deck]'); if (dd && dd.dataset.dragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    convo.addEventListener('click', (e) => {
      const hc = e.target.closest('.hc[data-id]');
      if (hc && hc.closest('.hc-slot:not(.front)')) return;
      if (hc && !e.target.closest('a, button')) { window.location.href = SynMatches.propertyHref(hc.dataset.id); return; }
      const qb = e.target.closest('.tj-quick [data-quick]');
      if (qb) { if (busy) return; const v = qb.dataset.quick; qb.parentElement.remove(); send(v); return; }
      const more = e.target.closest('.tj-more');
      if (more) {
        const body = more.nextElementSibling; const open = body.hidden;
        body.hidden = !open; more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'Less' : 'More';
        return;
      }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const msg = b.closest('.msg'); const pl = msg && msg._payload; if (!pl) return;
      if (b.dataset.act === 'share') { shareOut(shareText(pl), b); return; }
      if (b.dataset.act === 'up' || b.dataset.act === 'down') { rate(b, pl); return; }
      let pins = loadPins();
      if (pins.some((x) => x.id === pl.id)) { pins = pins.filter((x) => x.id !== pl.id); setPin(b, false); }
      else { pins.unshift(pl); setPin(b, true); }
      savePins(pins);
    });
    const pinPanel = document.getElementById('tjPinPanel');
    const pinList = document.getElementById('tjPinList');
    function renderPins() {
      const pins = loadPins();
      if (!pins.length) { pinList.innerHTML = '<div class="hist-empty">Nothing pinned yet.<br>Tap the pin under any reply from Tayo to keep it, and the homes with it, here.</div>'; return; }
      pinList.innerHTML = '<button class="hist-row" data-pin-share-all type="button"><div class="mid"><div class="t">Share everything pinned</div><div class="d">' + pins.length + ' pinned</div></div></button>'
        + pins.map((x) => '<div class="hist-row pin-row" data-pin="' + esc(x.id) + '"><div class="mid"><div class="t">' + esc(String(x.text).slice(0, 110)) + (String(x.text).length > 110 ? '\u2026' : '') + '</div>'
          + '<div class="d">' + histDate(x.at) + (x.matches && x.matches.length ? ' \u00B7 ' + x.matches.length + ' home' + (x.matches.length === 1 ? '' : 's') : '') + '</div>'
          + (x.matches || []).slice(0, 4).map((m) => '<a class="pin-home" href="' + esc(SynMatches.propertyHref(m.id)) + '">' + esc(m.title || 'Listing') + '</a>').join('')
          + '</div><span class="pin-acts"><button type="button" data-pin-share="' + esc(x.id) + '">Share</button><button type="button" data-pin-del="' + esc(x.id) + '">Unpin</button></span></div>').join('');
    }
    function closePins() { pinPanel.hidden = true; }
    document.getElementById('tjPins').addEventListener('click', () => { if (pinPanel.hidden) { histPanel.hidden = true; memPanel.hidden = true; renderPins(); pinPanel.hidden = false; } else closePins(); });
    document.getElementById('tjPinClose').addEventListener('click', closePins);
    pinList.addEventListener('click', (e) => {
      const pins = loadPins();
      const del = e.target.closest('[data-pin-del]');
      if (del) { savePins(pins.filter((x) => x.id !== del.dataset.pinDel)); renderPins(); return; }
      const sh = e.target.closest('[data-pin-share]');
      if (sh) { const pl = pins.find((x) => x.id === sh.dataset.pinShare); if (pl) shareOut(shareText(pl), sh); return; }
      const all = e.target.closest('[data-pin-share-all]');
      if (all) shareOut(pins.map(shareText).join('\n\n\u2014\n\n'), all);
    });

    /* WHERE YOUR INTRODUCTION IS. A signed-in buyer who has been introduced to an agency sees, here, whether the agency has it,
       whether an agent holds it, and whether one has taken over the conversation. Only the agency's name is ever shown. A visitor
       who is not signed in, or has no introduction, sees nothing at all. */
    const hoStatus = document.getElementById('tjHandoffStatus');
    const HO_STEPS = [['sent', 'Sent to'], ['with_agent', 'With an agent at'], ['taken_over', 'An agent has taken over at']];
    function renderHandoff(rows) {
      if (!rows.length) { hoStatus.hidden = true; hoStatus.innerHTML = ''; return; }
      hoStatus.innerHTML = rows.slice(0, 2).map((r) => {
        const at = Math.max(0, HO_STEPS.findIndex((s) => s[0] === r.stage));
        return '<div class="tj-ho-row"><div class="tj-ho-t">' + esc(HO_STEPS[at][1]) + ' ' + esc(r.agency) + ' <span>· ' + esc(r.listing) + '</span></div>'
          + '<div class="tj-ho-bar" aria-hidden="true">' + HO_STEPS.map((s, i) => '<i class="' + (i <= at ? 'on' : '') + '"></i>').join('') + '</div></div>';
      }).join('');
      hoStatus.hidden = false;
    }
    function refreshHandoff() {
      if (!window.SynAuth) return;
      SynAuth.client().then((c) => c.auth.getSession().then((s) => {
        if (!(s && s.data && s.data.session)) { renderHandoff([]); return null; }
        return c.rpc('my_handoff_status');
      })).then((r) => { if (r) renderHandoff(!r.error && Array.isArray(r.data) ? r.data : []); }).catch(() => {});
    }
    refreshHandoff();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshHandoff(); });

    /* What Tayo remembers: the facts kept about this visitor, each one deletable. The server owns the list; the page only shows it. */
    const memPanel = document.getElementById('tjMemPanel');
    const memList = document.getElementById('tjMemList');
    function memCall(body) {
      return fetch(SUPABASE_URL + '/functions/v1/toju-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
        body: JSON.stringify(Object.assign({ visitorId: VISITOR }, body)),
      }).then((r) => r.json());
    }
    function renderMem(facts) {
      if (!facts.length) { memList.innerHTML = '<div class="hist-empty">Tayo is not holding anything about you yet.<br>What you tell it about where, how much and who it is for will show up here, and you can delete any of it.</div>'; return; }
      memList.innerHTML = facts.map((f) => '<div class="hist-row pin-row"><div class="mid"><div class="d">' + esc(f.label) + '</div><div class="t">' + esc(f.value) + '</div></div>'
        + '<span class="pin-acts"><button type="button" data-mem-del="' + esc(f.key) + '">Forget</button></span></div>').join('')
        + '<button class="hist-row" data-mem-all type="button"><div class="mid"><div class="t">Forget everything</div><div class="d">Tayo starts from nothing next time</div></div></button>';
    }
    function loadMem() {
      memList.innerHTML = '<div class="hist-empty">One moment…</div>';
      memCall({ action: 'memory' }).then((d) => renderMem(Array.isArray(d.facts) ? d.facts : []))
        .catch(() => { memList.innerHTML = '<div class="hist-empty">Could not load this just now. Try again in a moment.</div>'; });
    }
    function closeMem() { memPanel.hidden = true; }
    document.getElementById('tjMem').addEventListener('click', () => {
      if (!memPanel.hidden) { closeMem(); return; }
      histPanel.hidden = true; pinPanel.hidden = true; loadMem(); memPanel.hidden = false;
    });
    document.getElementById('tjMemClose').addEventListener('click', closeMem);
    memList.addEventListener('click', (e) => {
      const one = e.target.closest('[data-mem-del]');
      const all = e.target.closest('[data-mem-all]');
      if (!one && !all) return;
      if (all && !window.confirm('Forget everything Tayo knows about you?')) return;
      memCall({ action: 'forget', keys: all ? 'all' : [one.dataset.memDel] }).then((d) => renderMem(Array.isArray(d.facts) ? d.facts : [])).catch(() => {});
    });

    const histPanel = document.getElementById('tjHistPanel');
    const histList = document.getElementById('tjHistList');
    function histDate(ts) {
      const d = new Date(ts), now = new Date();
      const days = Math.floor((now - d) / 864e5);
      const when = days === 0 ? 'Today' : days === 1 ? 'Yesterday'
        : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
      return when + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    function renderHist() {
      const sessions = loadSessions();
      if (!sessions.length) {
        histList.innerHTML = '<div class="hist-empty">No past conversations yet.<br>When you start a new chat, the old one is saved here, with every home Tayo recommended.</div>';
        return;
      }
      histList.innerHTML = sessions.map((s) => {
        const n = (s.messages || []).filter((m) => m.role === 'user').length;
        return '<button class="hist-row" data-open="' + s.id + '">'
          + '<div class="mid"><div class="t">' + esc(s.title || 'Conversation') + '</div>'
          + '<div class="d">' + histDate(s.endedAt) + ' · ' + n + ' message' + (n === 1 ? '' : 's') + '</div></div>'
          + (s.homes ? '<span class="homes">' + s.homes + ' home' + (s.homes === 1 ? '' : 's') + '</span>' : '')
          + '<span class="del" data-del="' + s.id + '" role="button" aria-label="Delete conversation" title="Delete">' + SynIcons.svg('trash') + '</span>'
          + '</button>';
      }).join('');
    }
    function openHist() { renderHist(); histPanel.hidden = false; }
    function closeHist() { histPanel.hidden = true; }
    document.getElementById('tjHist').addEventListener('click', () => histPanel.hidden ? openHist() : closeHist());
    document.getElementById('tjHistClose').addEventListener('click', closeHist);
    histList.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { e.stopPropagation(); saveSessions(loadSessions().filter((s) => s.id !== del.dataset.del)); renderHist(); return; }
      const row = e.target.closest('[data-open]');
      if (!row) return;
      const s = loadSessions().find((x) => x.id === row.dataset.open);
      if (!s) return;
      archiveCurrent();                                           // keep today's thread
      saveSessions(loadSessions().filter((x) => x.id !== s.id));  // it's live again
      VISITOR = s.visitorId || crypto.randomUUID();
      try { localStorage.setItem(VKEY, VISITOR); } catch (e2) {}
      saved = Array.isArray(s.messages) ? s.messages : [];
      if (!saved.length) saved = [{ role: 'assistant', content: GREETING }];
      persist(); render(); closeHist();
    });

    // new chat, archive the old thread, then a fresh visitor id so the
    // server thread starts clean too
    function newChat() {
      archiveCurrent();
      localStorage.removeItem(STORE);
      VISITOR = crypto.randomUUID(); try { localStorage.setItem(VKEY, VISITOR); } catch (e) {}
      saved = [{ role: 'assistant', content: GREETING }]; persist(); convo.innerHTML = ''; tojuMsg(GREETING);
      rebuildCanvas();
      renderSuggest(null);
    }
    const nc = document.getElementById('tjNew');
    if (nc) nc.addEventListener('click', newChat);

    /* ── change background (signed-in only) ─────────────────────────────── */
    (function () {
      const KEY = 'toju_bg_v1';
      const root = document.documentElement;
      const panel = document.getElementById('tjBgPanel');
      const body = document.getElementById('tjBgBody');
      let me = null;
      const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
      const apply = (mode) => { if (mode === 'tint' || mode === 'pattern') root.setAttribute('data-tjbg', mode); else root.removeAttribute('data-tjbg'); };
      /* A saved choice belongs to whoever made it. Signed out, or someone
         else, gets the photograph. */
      Promise.resolve(window.SynAuth && SynAuth.ready ? SynAuth.ready() : null).then((u) => {
        me = u && u.id ? u.id : null;
        const s = read();
        apply(me && s && s.uid === me ? s.mode : 'photo');
      }).catch(() => { apply('photo'); });

      let opener = null;
      const close = () => { panel.hidden = true; if (opener && opener.focus) opener.focus(); opener = null; };
      function open() {
        opener = document.activeElement;
        const cur = root.getAttribute('data-tjbg') || 'photo';
        if (!me) {
          const here = location.pathname + location.search;
          body.innerHTML = '<p class="tj-bgp-s">Create a free account to choose your own background: the warm colour, the interior photograph or a quiet pattern. Each has a light and a dark version.</p>'
            + '<div class="tj-bgp-foot"><button type="button" class="tj-bgp-x" data-bgx>Not now</button>'
            + '<a class="tj-bgp-go" href="signin.html?next=' + encodeURIComponent(here) + '">Create an account</a></div>';
        } else {
          const opt = (m, label) => '<button type="button" class="tj-bgp-opt" data-bgm="' + m + '" aria-pressed="' + (cur === m) + '"><span class="tj-sw ' + m + '"></span>' + label + '</button>';
          body.innerHTML = '<p class="tj-bgp-s">Pick what sits behind the chat. It follows light and dark mode.</p>'
            + '<div class="tj-bgp-opts">' + opt('tint', 'Colour') + opt('photo', 'Photo') + opt('pattern', 'Pattern') + '</div>'
            + '<div class="tj-bgp-foot"><button type="button" class="tj-bgp-x" data-bgx>Done</button></div>';
        }
        panel.hidden = false;
        const first = body.querySelector('button, a'); if (first) first.focus();
      }
      body.addEventListener('click', (e) => {
        if (e.target.closest('[data-bgx]')) { close(); return; }
        const o = e.target.closest('[data-bgm]'); if (!o || !me) return;
        const mode = o.dataset.bgm;
        apply(mode);
        try { localStorage.setItem(KEY, JSON.stringify({ uid: me, mode: mode })); } catch (err) {}
        body.querySelectorAll('[data-bgm]').forEach((x) => x.setAttribute('aria-pressed', String(x === o)));
      });
      panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
      document.addEventListener('keydown', (e) => {
        if (panel.hidden) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key !== 'Tab') return;
        /* Keep Tab inside the dialog. */
        const f = [...panel.querySelectorAll('button, a[href]')].filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      });
      ['tjBg', 'tjmBg'].forEach((id) => { const b = document.getElementById(id); if (b) b.addEventListener('click', open); });
    })();

    /* Mobile bar: forwards to the real controls rather than owning its own
       copy of the logic, so history and new-chat can never drift apart
       between the two layouts. */
    (function () {
      var mh = document.getElementById('tjmHist');
      var mn = document.getElementById('tjmNew');
      if (mh) mh.addEventListener('click', function () {
        histPanel.hidden ? openHist() : closeHist();
      });
      if (mn) mn.addEventListener('click', newChat);
      /* the corner menu: past conversations, pinned, what Tayo remembers, background */
      var more = document.getElementById('tjmMore'), menu = document.getElementById('tjmMenu');
      if (more && menu) {
        var shut = function () { menu.hidden = true; more.setAttribute('aria-expanded', 'false'); };
        more.addEventListener('click', function (e) { e.stopPropagation(); var open = menu.hidden; menu.hidden = !open; more.setAttribute('aria-expanded', String(open)); });
        menu.addEventListener('click', function (e) { if (e.target.closest('button')) shut(); });
        document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('#tjmMenu')) shut(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
      }
      [['tjmPins', 'tjPins'], ['tjmMem', 'tjMem']].forEach(function (pair) {
        var m = document.getElementById(pair[0]), d = document.getElementById(pair[1]);
        if (m && d) m.addEventListener('click', function () { d.click(); });
      });
    })();
  