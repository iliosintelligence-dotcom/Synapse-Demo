
    const BKEY = 'synapse_dream_boards_v1';   // all boards
    const MIRROR = 'synapse_moodboard_v1';    // active board — what Tayo reads
    const SAVES = 'synapse_saved';            // ♥'d homes → watchlist count

    const PALETTE = [
      // housing — the building itself
      { u: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=500&q=70', c: 'Modern facade', cat: 'housing' },
      { u: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=70', c: 'Detached duplex', cat: 'housing' },
      { u: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&q=70', c: 'Terrace houses', cat: 'housing' },
      // areas — neighbourhood & setting
      { u: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&q=70', c: 'Leafy estate street', cat: 'area' },
      { u: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=500&q=70', c: 'Waterfront view', cat: 'area' },
      { u: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=500&q=70', c: 'City skyline', cat: 'area' },
      // décor — interiors
      { u: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&q=70', c: 'Open plan', cat: 'decor' },
      { u: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=500&q=70', c: 'Quiet bedroom', cat: 'decor' },
      { u: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=500&q=70', c: 'Kitchen', cat: 'decor' },
      { u: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=500&q=70', c: 'Living room', cat: 'decor' },
      // lifestyle — how you'll live there
      { u: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&q=70', c: 'Lounge', cat: 'lifestyle' },
      { u: 'https://images.unsplash.com/photo-1585128792020-803d29415281?w=500&q=70', c: 'Terrace view', cat: 'lifestyle' },
      { u: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500&q=70', c: 'Poolside', cat: 'lifestyle' },
      // palette — colour, light & material
      { u: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&q=70', c: 'Warm minimal', cat: 'palette' },
      { u: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=500&q=70', c: 'Soft light', cat: 'palette' },
      { u: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&q=70', c: 'Bright & airy', cat: 'palette' },
    ];
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    // ── curation categories (a pin is tagged so Tayo reads it as the right signal) ──
    const CATS = [
      { id: 'housing',   lbl: 'Housing',   dot: '#121212' },
      { id: 'area',      lbl: 'Areas',     dot: '#3f9c6d' },
      { id: 'decor',     lbl: 'Décor',     dot: '#c98b3a' },
      { id: 'lifestyle', lbl: 'Lifestyle', dot: '#8a5cd6' },
      { id: 'palette',   lbl: 'Palette',   dot: '#2f6dbd' },
    ];
    const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));
    function inferCat(c) {
      c = String(c || '').toLowerCase();
      if (/facade|duplex|penthouse|curb|exterior|villa|bungalow|maisonette|block|storey|building/.test(c)) return 'housing';
      if (/lekki|ikoyi|island|ikeja|yaba|estate|street|waterfront|neighbourhood|\barea\b|gated|skyline|corridor|district/.test(c)) return 'area';
      if (/palette|colou?r|texture|material|tone|marble|wood|light|airy|minimal/.test(c)) return 'palette';
      if (/pool|gym|garden|terrace|lounge|workspace|balcony|patio|rooftop|bar|spa/.test(c)) return 'lifestyle';
      return 'decor';
    }
    // the three board modes — one board, a mode switch that reframes it
    const MODES = [
      { id: 'dream',  lbl: 'Dream',  hint: 'Your concrete wishlist — homes & must-haves. This is what Tayo matches you to.',
        /* Same mode, board Tayo cannot see yet. */
        hintUnadopted: 'Your concrete wishlist — homes & must-haves. Keep this board and Tayo starts matching you to it.' },
      { id: 'mood',   lbl: 'Mood',   hint: 'The feeling — palettes, textures and interior vibe.' },
      { id: 'vision', lbl: 'Vision', hint: 'The whole outcome — home, neighbourhood and lifestyle you\'re aiming for.' },
    ];

    // ── starter board — INSPIRATION CONTENT, never listings ──────────────────
    // Guardrail: nothing here may look like inventory. No prices, no addresses,
    // no verification chips, no agency names — just interiors and light to
    // react to. A starter board never mirrors to Tayo (that would be a signal
    // the visitor didn't send); it only becomes theirs via "Keep this board".
    const STARTER_PINS = [
      { u: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=500&q=70', c: 'Warm wood, stone counters', cat: 'decor' },
      { u: 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=500&q=70', c: 'An island for slow Sunday cooking', cat: 'decor' },
      { u: 'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?w=500&q=70', c: 'Deep green cabinetry', cat: 'decor' },
      { u: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=500&q=70', c: 'White and timber, kept simple', cat: 'decor' },
      { u: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=500&q=70', c: 'Clean lines, open shelves', cat: 'decor' },
      { u: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=500&q=70', c: 'Soft morning light', cat: 'palette' },
      { u: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&q=70', c: 'Warm minimal', cat: 'palette' },
      { u: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&q=70', c: 'Bright and airy', cat: 'palette' },
    ];
    const starterBoard = () => ({ id: uid(), name: 'Lagos kitchens we love', starter: true, vibe: [],
      images: STARTER_PINS.map((p) => ({ u: p.u, c: p.c, cat: p.cat })) });

    // ── state: { boards:[{id,name,starter?,vibe[],images:[{u,c,cat}]}], activeId } ──
    let state;
    try { state = JSON.parse(localStorage.getItem(BKEY)); } catch (e) {}
    if (!state || !Array.isArray(state.boards)) {
      // migrate a legacy single mood board, else offer the labelled starter
      // board — never a pre-filled board presented as the visitor's own.
      let legacy = null;
      try { legacy = JSON.parse(localStorage.getItem(MIRROR)); } catch (e) {}
      const first = legacy && (legacy.images || legacy.vibe)
        ? { id: uid(), name: legacy.name || 'My dream home', vibe: legacy.vibe || [], images: legacy.images || [] }
        : starterBoard();
      state = { boards: [first], activeId: null };
    }
    // migrate older boards forward: every board gets a mode, every pin a category
    state.boards.forEach((b) => {
      /* A starter board is décor and light to react to, and it deliberately
         does not mirror to Tayo until adopted. Defaulting it to Dream opened
         it under "your concrete wishlist … this is what Tayo matches you to",
         which described neither what was on it nor what the code does with it.
         Mood is the mode it actually is. */
      if (!b.mode) b.mode = b.starter ? 'mood' : 'dream';
      (b.images || []).forEach((im) => { if (!im.cat) im.cat = inferCat(im.c); });
    });
    const saveState = () => localStorage.setItem(BKEY, JSON.stringify(state));
    const activeBoard = () => state.boards.find((b) => b.id === state.activeId) || null;
    let boardCat = 'all'; // active category filter inside a board

    // mirror the active board into the shape Tayo reads — now split by category
    // so Tayo treats Area pins as a location signal, Housing as a type signal,
    // and Décor/Palette as aesthetic. Keeps name/vibe/images for backward-compat.
    function mirror() {
      const b = activeBoard();
      if (!b) return;
      // A starter board is inspiration we authored, not the visitor's taste.
      // It must never reach Tayo as a signal — leave the mirror untouched
      // (it still holds the last board the visitor actually curated).
      if (b.starter) return;
      const capsOf = (id) => (b.images || []).filter((im) => (im.cat || 'decor') === id).map((im) => im.c).filter(Boolean);
      localStorage.setItem(MIRROR, JSON.stringify({
        name: b.name, mode: b.mode || 'dream', vibe: b.vibe, images: b.images,
        areas: capsOf('area'),
        housing: capsOf('housing'),
        lifestyle: capsOf('lifestyle'),
        aesthetic: capsOf('decor').concat(capsOf('palette')),
      }));
    }
    function savesCount() { try { return (JSON.parse(localStorage.getItem(SAVES)) || []).length; } catch (e) { return 0; } }

    const homeView = document.getElementById('homeView');
    const boardView = document.getElementById('boardView');

    // ═══ BOARDS HOME ═══
    function renderHome() {
      const grid = document.getElementById('boardsGrid');
      const cards = state.boards.map((b) => {
        const imgs = (b.images || []).slice(0, 4);
        const cover = imgs.length
          ? imgs.map((im) => `<img src="${esc(im.u)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`).join('')
          : '<div class="bempty" aria-hidden="true"></div>';
        const meta = b.starter
          ? 'Inspiration — not real listings'
          : `${(b.images || []).length} pin${(b.images || []).length === 1 ? '' : 's'}${b.vibe && b.vibe.length ? ' · ' + b.vibe.length + ' vibes' : ''}`;
        return `<button class="bcard" data-open="${b.id}">
          <div class="bcover">${cover}</div>
          <div class="bname">${esc(b.name || 'Untitled board')}</div>
          <div class="bmeta">${meta}</div>
        </button>`;
      }).join('');
      const n = savesCount();
      const watch = n > 0
        ? `<a class="bcard watch" href="browse.html" style="text-decoration:none;color:inherit">
             <div class="bcover"><div class="wc"><b>${n}</b><span>SAVED HOMES</span></div></div>
             <div class="bname">Saved homes</div><div class="bmeta">Your ♥ watchlist · open Your matches</div></a>`
        : '';
      const add = `<button class="bcard new" data-new><div class="bcover"><span class="plus">+</span></div>
        <div class="bname">Create board</div><div class="bmeta">A fresh idea, kept separate</div></button>`;
      grid.innerHTML = cards + watch + add;

      /* Starter boards are seeded, not made. Counting them as "has boards"
         hides the explanation from someone who has never built one -- which is
         precisely the person it was written for. Only boards they made count. */
      var intro = document.getElementById('dbIntro');
      if (intro) intro.hidden = state.boards.some(function (b) { return !b.starter; });
    }

    document.getElementById('boardsGrid').addEventListener('click', (e) => {
      const open = e.target.closest('[data-open]');
      if (open) { openBoard(open.dataset.open); return; }
      if (e.target.closest('[data-new]')) createBoard();
    });
    document.getElementById('newBoardBtn').addEventListener('click', createBoard);

    function createBoard() {
      const raw = prompt('Name your new board', 'New board');
      if (raw === null) return; // cancelled — don't create an empty board
      const b = { id: uid(), name: raw.trim() || 'New board', vibe: [], images: [] };
      state.boards.push(b); saveState();
      openBoard(b.id);
    }

    /* The mobile bar mirrors whichever view is open and whatever the board
       is called. Routed through one function so a future view cannot forget
       it — the browse page had exactly that bug. */
    function syncMobileBar() {
      if (!window.CustNav) return;
      // Inside a board, back means back to the boards -- leaving the page
      // entirely would skip a level the visitor can see they are inside of.
      var inBoard = !boardView.classList.contains('hidden');
      window.CustNav.setBack(inBoard ? toHome : null);
    }

    // ═══ INSIDE A BOARD ═══
    function openBoard(id) {
      state.activeId = id; boardCat = 'all'; saveState(); mirror();
      homeView.classList.add('hidden'); boardView.classList.remove('hidden');
      window.scrollTo(0, 0);
      prevSig = null; // fresh board — no pip pop on first paint
      renderMode(); renderCatTabs(); renderCatPicker(); renderStarterNote();
      renderBoard(); renderVibe(); renderPalette(); renderSignals(); updateToju();
      syncMobileBar();
      document.getElementById('boardTitle').value = activeBoard().name || '';
    }

    // ── starter-board note — labels the inspiration, offers adoption ──
    function renderStarterNote() {
      const el = document.getElementById('starterNote');
      const b = activeBoard();
      if (!b || !b.starter) { el.classList.add('hidden'); el.innerHTML = ''; return; }
      el.classList.remove('hidden');
      /* The three-line explanation is gone; the action it wrapped is not.
         What it said is still said where it is needed: the board's own card in
         the grid reads "Inspiration — not real listings", so nobody opens this
         thinking these are homes for sale. Repeating it inside the board, in a
         paragraph, was telling someone a second time what they had already
         read on the way in. */
      el.innerHTML = `<div class="t">Nothing here is a Synapse listing.</div>
        <button class="keep" id="keepBtn">Keep this board</button>`;
      document.getElementById('keepBtn').addEventListener('click', () => {
        delete b.starter; saveState(); mirror(); // now it's theirs — Tayo may read it
        /* renderMode() too: the Dream hint is worded off b.starter, so without
           it the board stayed labelled "Keep this board and Tayo starts
           matching you to it" after you had already kept it. */
        renderStarterNote(); renderMode(); renderSignals(); updateToju();
      });
    }

    // ── board signal summary — what the board says, honestly. No score, no
    //    percentage: there is no scoring model, so we only surface the signals
    //    the board actually holds (vibe + categorised pins) and which are thin. ──
    const SIGNALS = [
      { id: 'style',     lbl: 'Style',     tip: 'pin an interior or a palette you love' },
      { id: 'area',      lbl: 'areas',     tip: 'pin a street, skyline or neighbourhood that feels right' },
      { id: 'housing',   lbl: 'housing',   tip: 'pin the kind of building you see yourself in' },
      { id: 'lifestyle', lbl: 'lifestyle', tip: 'pin how you want to live — a pool, a terrace, a workspace' },
    ];
    let prevSig = null; // last rendered counts, so only newly-lit pips animate
    function signalCounts(b) {
      const n = { style: 0, area: 0, housing: 0, lifestyle: 0 };
      (b.images || []).forEach((im) => {
        const c = im.cat || 'decor';
        if (c === 'decor' || c === 'palette') n.style++;
        else if (n[c] !== undefined) n[c]++;
      });
      n.style += (b.vibe || []).length;
      return n;
    }
    const sigWord = (n) => n === 0 ? 'nothing yet' : n < 3 ? 'starting to show' : 'coming through clearly';
    function renderSignals() {
      const el = document.getElementById('signals');
      const b = activeBoard();
      if (!b || b.starter) { el.classList.add('hidden'); prevSig = null; return; }
      el.classList.remove('hidden');
      const n = signalCounts(b);
      document.getElementById('sigRows').innerHTML = SIGNALS.map((s) => {
        const lit = Math.min(n[s.id], 3), was = prevSig ? Math.min(prevSig[s.id], 3) : lit;
        const pips = [0, 1, 2].map((i) =>
          `<i class="sig-pip ${i < lit ? 'fill' : ''} ${i < lit && i >= was ? 'pop' : ''}"></i>`).join('');
        const cap = s.lbl.charAt(0).toUpperCase() + s.lbl.slice(1);
        return `<div class="sig-row"><span class="lbl">${cap}</span>
          <span class="sig-pips" aria-hidden="true">${pips}</span>
          <span class="sig-state">${sigWord(n[s.id])}</span></div>`;
      }).join('');
      // one honest guidance line: strongest signal vs the thinnest one
      const read = document.getElementById('sigRead');
      const total = SIGNALS.reduce((t, s) => t + n[s.id], 0);
      if (total === 0) {
        read.innerHTML = 'Nothing pinned yet — each pin teaches this board something: style, an area, a kind of home, a way of living.';
      } else {
        const sorted = SIGNALS.slice().sort((a, c) => n[c.id] - n[a.id]);
        const strong = sorted[0], weak = sorted[sorted.length - 1];
        if (n[weak.id] === 0) {
          read.innerHTML = `This board says ${n[strong.id] >= 3 ? 'a lot' : 'a little'} about <b>${strong.lbl.toLowerCase()}</b>, nothing yet about <b>${weak.lbl.toLowerCase()}</b> — ${weak.tip}.`;
        } else if (n[weak.id] < 3) {
          read.innerHTML = `Every signal has something. The thinnest is <b>${weak.lbl.toLowerCase()}</b> — ${weak.tip}.`;
        } else {
          read.innerHTML = 'Style, areas, housing and lifestyle all come through clearly. This board is ready for Tayo.';
        }
      }
      prevSig = n;
    }

    // ── mode switch (Dream / Mood / Vision) ──
    function renderMode() {
      const b = activeBoard(); const cur = b.mode || 'dream';
      document.getElementById('modeSwitch').innerHTML = MODES.map((m) =>
        `<button role="tab" class="ms ${m.id === cur ? 'on' : ''}" data-mode="${m.id}" aria-selected="${m.id === cur}">${m.lbl}</button>`).join('');
      /* The Dream hint ends "This is what Tayo matches you to" — true only once
         the board is theirs. mirror() skips starter boards on purpose, so on
         one of those the sentence asserted the opposite of what the code does.
         The starter note directly below already offers Keep this board. */
      const hint = (MODES.find((m) => m.id === cur) || MODES[0]).hint;
      document.getElementById('modeHint').textContent =
        (b.starter && cur === 'dream') ? MODES[0].hintUnadopted : hint;
    }
    document.getElementById('modeSwitch').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mode]'); if (!btn) return;
      const b = activeBoard(); if (!b) return;
      b.mode = btn.dataset.mode; saveState(); mirror(); renderMode(); updateToju();
    });

    // ── category tabs (filter the masonry) ──
    function catCount(id) { return (activeBoard().images || []).filter((im) => (im.cat || 'decor') === id).length; }
    function renderCatTabs() {
      const total = (activeBoard().images || []).length;
      const tab = (id, lbl, dot, n) =>
        `<button role="tab" class="ct ${boardCat === id ? 'on' : ''}" data-cat="${id}" aria-selected="${boardCat === id}">
           ${dot ? `<i style="background:${dot}"></i>` : ''}${lbl}<b>${n}</b></button>`;
      let html = tab('all', 'All', '', total);
      CATS.forEach((c) => { const n = catCount(c.id); if (n) html += tab(c.id, c.lbl, c.dot, n); });
      document.getElementById('catTabs').innerHTML = html;
    }
    document.getElementById('catTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]'); if (!btn) return;
      boardCat = btn.dataset.cat; renderCatTabs(); renderBoard();
    });

    // ── category picker for freshly-pasted URLs ──
    function renderCatPicker() {
      const sel = document.getElementById('urlCat');
      const start = boardCat === 'all' ? 'decor' : boardCat;
      sel.innerHTML = CATS.map((c) => `<option value="${c.id}" ${c.id === start ? 'selected' : ''}>${c.lbl}</option>`).join('');
    }
    function toHome() {
      state.activeId = null; saveState();
      boardView.classList.add('hidden'); homeView.classList.remove('hidden');
      window.scrollTo(0, 0); renderHome(); syncMobileBar();
    }
    document.getElementById('backBtn').addEventListener('click', toHome);

    const boardTitle = document.getElementById('boardTitle');
    boardTitle.addEventListener('input', () => { const b = activeBoard(); if (b) { b.name = boardTitle.value; saveState(); mirror(); syncMobileBar(); } });
    document.getElementById('renameBtn').addEventListener('click', () => { boardTitle.focus(); boardTitle.select(); });
    document.getElementById('deleteBtn').addEventListener('click', () => {
      if (!confirm('Delete this board? Its pins will be removed.')) return;
      state.boards = state.boards.filter((b) => b.id !== state.activeId);
      if (state.boards.length === 0) state.boards.push({ id: uid(), name: 'My dream home', vibe: [], images: [] });
      // the deleted board must stop informing Tayo — clear the mirror until
      // the visitor opens another board (which re-mirrors it)
      try { localStorage.removeItem(MIRROR); } catch (e) {}
      saveState(); toHome();
    });

    const boardEl = document.getElementById('board');
    const vibeEl = document.getElementById('vibe');
    const paletteEl = document.getElementById('palette');
    const hasImg = (u) => activeBoard().images.some((i) => i.u === u);

    function renderBoard() {
      const b = activeBoard();
      if (!b.images.length) {
        boardEl.innerHTML = '<div class="card add-card"><div style="text-align:center;padding:40px 0;color:var(--ink-muted)"><p style="max-width:400px;margin:0 auto;font-size:14.5px">This board is empty. Pin a few images below and it starts to take shape — Tayo does the rest.</p></div></div>';
        return;
      }
      // keep original indices so remove/lookup stays correct under a filter
      const shown = b.images.map((im, i) => ({ im, i })).filter(({ im }) => boardCat === 'all' || (im.cat || 'decor') === boardCat);
      if (!shown.length) {
        boardEl.innerHTML = `<div class="card add-card"><div style="text-align:center;padding:34px 0;color:var(--ink-muted)"><p style="font-size:14px">No <b>${esc((CAT[boardCat] || {}).lbl || '')}</b> pins yet. Pin one below, or switch back to <button class="lnk-all">All</button>.</p></div></div>`;
        const back = boardEl.querySelector('.lnk-all'); if (back) back.onclick = () => { boardCat = 'all'; renderCatTabs(); renderBoard(); };
        return;
      }
      boardEl.innerHTML = '<div class="masonry">' + shown.map(({ im, i }) => {
        const c = CAT[im.cat || 'decor'] || CAT.decor;
        return `<div class="tile">
          <img src="${esc(im.u)}" alt="${esc(im.c || 'pinned image')}" loading="lazy" onerror="this.closest('.tile').remove()" />
          <span class="catdot" style="background:${c.dot}" title="${c.lbl}"></span>
          ${im.c ? `<span class="cap">${esc(im.c)}</span>` : ''}
          <button class="rm" data-i="${i}" title="Remove">×</button>
        </div>`;
      }).join('') + '</div>';
    }
    function renderVibe() {
      const b = activeBoard();
      vibeEl.innerHTML = b.vibe.map((v, i) => `<span class="v">${esc(v)} <button data-i="${i}" title="Remove">×</button></span>`).join('')
        + '<input id="vibeInput" placeholder="+ add a vibe…" />';
      document.getElementById('vibeInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          b.vibe.push(e.target.value.trim()); saveState(); mirror(); renderVibe(); renderSignals(); updateToju();
          document.getElementById('vibeInput').focus();
        }
      });
    }
    function renderPalette() {
      // show inspiration for the active category first (or all when on "All")
      const pool = PALETTE.filter((p) => boardCat === 'all' || (p.cat || 'decor') === boardCat);
      const list = pool.length ? pool : PALETTE;
      paletteEl.innerHTML = list.map((p) => {
        const c = CAT[p.cat || 'decor'] || CAT.decor;
        return `<button class="pal ${hasImg(p.u) ? 'added' : ''}" data-u="${esc(p.u)}" data-c="${esc(p.c)}" data-cat="${p.cat || 'decor'}" title="${esc(p.c)} · ${c.lbl}">
          <img src="${esc(p.u)}" alt="${esc(p.c)}" loading="lazy" />
          <span class="catdot" style="background:${c.dot}"></span>
        </button>`;
      }).join('');
    }
    function updateToju() {
      const b = activeBoard();
      const capsOf = (id) => (b.images || []).filter((im) => (im.cat || 'decor') === id).map((im) => im.c).filter(Boolean);
      const areas = capsOf('area'), housing = capsOf('housing');
      const parts = [];
      if (b.vibe.length) parts.push('vibe: ' + b.vibe.join(', '));
      if (housing.length) parts.push('home type: ' + housing.join(', '));
      if (areas.length) parts.push('areas that feel right: ' + areas.join(', '));
      const q = 'Find me verified homes that match my "' + (b.name || 'dream') + '" board'
        + (parts.length ? ' — ' + parts.join('; ') : '') + '.';
      document.getElementById('tojuBtn').href = 'toju.html?ask=' + encodeURIComponent(q);
    }

    boardEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.rm'); if (!btn) return;
      activeBoard().images.splice(+btn.dataset.i, 1); saveState(); mirror(); renderBoard(); renderCatTabs(); renderPalette(); renderSignals();
    });
    vibeEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-i]'); if (!btn) return;
      activeBoard().vibe.splice(+btn.dataset.i, 1); saveState(); mirror(); renderVibe(); renderSignals(); updateToju();
    });
    paletteEl.addEventListener('click', (e) => {
      const p = e.target.closest('.pal'); if (!p) return;
      const b = activeBoard(), u = p.dataset.u;
      if (hasImg(u)) b.images = b.images.filter((i) => i.u !== u);
      else b.images.push({ u, c: p.dataset.c, cat: p.dataset.cat || 'decor' });
      saveState(); mirror(); renderBoard(); renderCatTabs(); renderPalette(); renderSignals();
    });
    function addUrl() {
      const inp = document.getElementById('urlInput');
      const u = inp.value.trim(); if (!u) return;
      const cat = (document.getElementById('urlCat') || {}).value || 'decor';
      activeBoard().images.push({ u, c: '', cat }); saveState(); mirror();
      inp.value = ''; renderBoard(); renderCatTabs(); renderPalette(); renderSignals();
    }
    document.getElementById('addUrlBtn').addEventListener('click', addUrl);
    document.getElementById('urlInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addUrl(); });

    // ── pin from anywhere (Web Share Target) ─────────────────────────────────
    // The manifest's share_target (GET) lands shares here as ?share_title/
    // share_text/share_url. HONEST SCOPE: the OS share sheet only offers
    // Synapse after the PWA is INSTALLED (Chromium on Android/desktop). In a
    // normal browser tab nothing new appears in the share sheet — this page
    // just also understands those params if a link carries them. We never
    // auto-pin: the shared link is previewed into the pin box for the visitor
    // to confirm, because a share is not yet a decision.
    function firstUrl(s) { const m = String(s || '').match(/https?:\/\/[^\s"'<>]+/); return m ? m[0] : null; }
    function handleShare(qp) {
      const su = firstUrl(qp.get('share_url')) || firstUrl(qp.get('share_text'));
      if (!su) return false;
      const label = (qp.get('share_title') || '').trim().slice(0, 80);
      // land in a board the visitor owns — never the inspiration starter
      let b = activeBoard();
      if (!b || b.starter) b = state.boards.find((x) => !x.starter);
      if (!b) { b = { id: uid(), name: 'My pins', vibe: [], images: [] }; state.boards.push(b); saveState(); }
      openBoard(b.id);
      const note = document.getElementById('shareNote');
      note.classList.remove('hidden');
      note.innerHTML = `<div class="t"><b>Shared to Synapse${label ? ' — “' + esc(label) + '”' : ''}.</b>
          The link is ready below: pick a category and hit <b>Pin it</b> to add it to “${esc(b.name)}”.
          If the link isn't a direct image it may not render as a tile.</div>
        <button class="sn-x" aria-label="Dismiss shared link">×</button>`;
      note.querySelector('.sn-x').addEventListener('click', () => { note.classList.add('hidden'); note.innerHTML = ''; });
      const inp = document.getElementById('urlInput');
      inp.value = su; inp.focus();
      // strip the share params so refresh/back doesn't replay the share
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      return true;
    }

    // make this page installable / share-target capable; same registration
    // notify.js performs lazily, so this is idempotent.
    if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js'); } catch (e) {} }

    // boot — a share lands first, then deep link ?board=<id>, else boards home.
    // Re-mirror the last-active board so synapse_moodboard_v1 (what Tayo
    // reads) is always in step with the boards store, even after edits made
    // in another tab or an interrupted session.
    saveState();
    if (activeBoard()) mirror();
    const qp = new URLSearchParams(location.search);
    if (!handleShare(qp)) {
      const deep = qp.get('board');
      if (deep && state.boards.some((b) => b.id === deep)) openBoard(deep);
      else renderHome();
    }
  