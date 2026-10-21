
    const SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
    const ANON_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
    const VISITOR = localStorage.getItem('toju_visitor_v1');
    // card markup, shaper, map and helpers shared with the Tayo canvas -
    // matches-shared.js + docs/STATE_CONTRACT.md
    const { naira, esc } = window.SynMatches;

    // Start empty on purpose: we never show sample homes as if they were real
    // inventory. The page opens in a loading state and only ever renders
    // listings that actually came back from the server.
    let items = [];
    let loadState = 'loading';   // loading | ready | failed
    let saves = SynMatches.readSaves();
    // another tab hearted something, repaint from storage, do not drift
    SynMatches.onSavesChanged(function (s) { saves = s; render(); });
    let picked = new Set();
    let searchQ = '';
    let dealFilter = 'all'; // all | sale | rent | shared
    let verifiedOnly = false;
    let shownItems = [];
    /* "Search this area" (Greptile, full review): the map's results replaced
       its pins and nothing else, so the map and the list showed different
       homes. The ids it found now filter the list too, until cleared. */
    let areaIds = null;
    // declared before the first render(): render() and renderEmptyState() read it
    let hasSessionView = false;

    function matchesDeal(l) {
      if (dealFilter === 'all') return true;
      return (l.cats || [l.kind || 'sale']).includes(dealFilter);
    }
    function matchesVerify(l) {
      return !verifiedOnly || l.vstatus === 'verified';
    }
    function sortItems() {
      const s = document.getElementById('sortSel').value;
      /* Without match scores (every listing here, until Tayo scores them)
         "Best match" compared equals and ranked nothing (Greptile). It falls
         back to newest first, which is also how the feed was fetched. */
      const scored = items.some((l) => typeof l.match === 'number');
      const newest = (a, b) => String(b.listedAt || '').localeCompare(String(a.listedAt || ''));
      items.sort((a, b) => s === 'price' ? a.priceN - b.priceN : s === 'trust' ? (b.score || 0) - (a.score || 0)
        : scored ? (b.match || 0) - (a.match || 0) : newest(a, b));
    }

    // keyword search across title, area/city, deal, and price (e.g. "under 150m", "3-bed")
    function matchesSearch(l) {
      if (!searchQ) return true;
      const hay = (l.ttl + ' ' + l.loc + ' ' + (l.deal || '') + ' ' + naira(l.priceN)).toLowerCase();
      return searchQ.split(/\s+/).every((term) => {
        if (!term) return true;
        const under = term.match(/^(?:under|below|<)?₦?(\d+)m?$/);
        if (under && /\d/.test(term)) {
          const cap = parseInt(under[1], 10) * (term.includes('m') || parseInt(under[1],10) < 10000 ? 1e6 : 1);
          if (/^(under|below|<)/.test(searchQ) || searchQ.includes('under') || searchQ.includes('below')) return l.priceN <= cap;
        }
        return hay.includes(term);
      });
    }

    /* ── "New since your last visit" (item 14) ────────────────────────────
       The baseline is read ONCE at load and the clock is reset immediately, so
       the comparison is always "since the previous visit", not "since a moment
       ago", which is what you get if you reset it on every render and the
       section quietly empties while you are looking at it.

       Honesty rules:
       · A first visit has no baseline, so nothing is claimed. The section stays
         hidden rather than declaring everything new.
       · Only `listed_at` counts. A listing that existed before and was merely
         re-listed is not new to this person, so re-listing cannot manufacture
         novelty, which is exactly the fake-freshness the product exists to
         replace.
       · No "0 new" state. Nothing new means no section. */
    const VISIT_KEY = 'synapse_last_visit';
    const lastVisitAt = (function () {
      let prev = null;
      try {
        const raw = localStorage.getItem(VISIT_KEY);
        const t = raw ? Date.parse(raw) : NaN;
        if (Number.isFinite(t)) prev = t;
        localStorage.setItem(VISIT_KEY, new Date().toISOString());
      } catch (e) { /* private mode: no baseline, so no claim */ }
      return prev;
    })();

    function renderFreshSince(compareOn) {
      const wrap = document.getElementById('freshSince');
      const grid = document.getElementById('freshGrid');
      if (!wrap || !grid) return;
      if (!lastVisitAt) { wrap.hidden = true; return; }   // first visit, claim nothing

      const fresh = shownItems.filter((l) => {
        const t = l.listedAt ? Date.parse(l.listedAt) : NaN;
        return Number.isFinite(t) && t > lastVisitAt;
      });
      if (!fresh.length) { wrap.hidden = true; grid.innerHTML = ''; return; }

      document.getElementById('freshSinceN').textContent =
        fresh.length === 1 ? '1 home' : fresh.length + ' homes';
      grid.innerHTML = fresh.map((l, i) =>
        SynMatches.listingCardHtml(l, i, { saves, picked, compare: compareOn })).join('');
      wrap.hidden = false;
    }

    function render() {
      const grid = document.getElementById('grid');
      // HARD RULE: skeletons only while the listings request is genuinely in
      // flight. loadState flips to ready/failed the moment it settles, and the
      // next render paints real cards or the honest empty state, a skeleton
      // never stands in for content that does not exist.
      if (loadState === 'loading' && !hasSessionView && items.length === 0) {
        renderSkeletons(grid);
        updateSavedNav();   // the counter is real data, it shouldn't wait for listings
        return;
      }
      grid.removeAttribute('aria-busy');
      setGridStatus('');
      sortItems();
      // Compare is a shortlist tool, it appears once a shortlist exists.
      // Before two homes are ♥'d, the checkboxes and the bar are just noise.
      const compareOn = saves.size >= 2;
      if (!compareOn && picked.size) picked.clear();
      shownItems = items.filter((l) => matchesSearch(l) && matchesDeal(l) && matchesVerify(l)
        && (!areaIds || areaIds.has(l.id)));
      grid.innerHTML = (areaIds
        ? '<div class="area-note" style="grid-column:1/-1;display:flex;gap:10px;align-items:center;font-size:13px;color:var(--ink-muted)">'
          + 'Showing the homes in the map area. <button type="button" class="btn btn-ghost" data-area-clear style="min-height:34px;padding:0 12px">Show everywhere</button></div>'
        : '')
        + shownItems.map((l, i) =>
        SynMatches.listingCardHtml(l, i, { saves, picked, compare: compareOn })).join('');
      renderFreshSince(compareOn);
      renderEmptyState();
      if (window.synMotion) synMotion.refresh();
      drawMap();
      updateBar();
      updateSavedNav();
    }

    function setGridStatus(msg) {
      const s = document.getElementById('gridStatus');
      if (s && s.textContent !== msg) s.textContent = msg;
    }

    /* Staggered placeholder cards for the in-flight request. Idempotent: while
       loading, re-renders (typing in search, toggling filters) keep the same
       skeletons rather than restarting the stagger. */
    function renderSkeletons(grid) {
      const empty = document.querySelector('.empty');
      if (empty) empty.hidden = true;
      if (grid.getAttribute('aria-busy') === 'true') return; // already up
      grid.setAttribute('aria-busy', 'true');
      setGridStatus('Finding homes…');
      grid.innerHTML = Array.from({ length: 6 }, (_, i) =>
        '<div class="sk-card" aria-hidden="true" style="--sk-i:' + i + '">'
        + '<div class="sk-b" style="width:42%"></div>'
        + '<div class="sk-b sk-big" style="width:58%"></div>'
        + '<div class="sk-b" style="width:84%"></div>'
        + '<div class="sk-b" style="width:36%"></div>'
        + '<div class="sk-img"></div>'
        + '</div>').join('');
    }

    /* The empty area speaks for whichever of three situations is true. It is
       never filled with sample homes, an empty result is shown as empty. */
    function renderEmptyState() {
      const box = document.querySelector('.empty');
      if (!box) return;
      if (shownItems.length) { box.hidden = true; return; }
      box.hidden = false;

      // While the request is in flight the grid shows skeletons instead (render()
      // returns early), unless a real Tayo session already answered with an
      // empty match list, in which case the honest "nothing fit" copy below is
      // the truth and must not be replaced by shimmer.
      if (loadState === 'loading' && !hasSessionView) {
        box.innerHTML = '<div class="empty-ttl">Finding homes…</div>'
          + '<p class="empty-sub">Checking every verified listing across Nigeria.</p>';
        return;
      }
      if (loadState === 'failed') {
        // an empty map of Nigeria is just noise when there's nothing to plot
        const m = document.getElementById('map'); if (m) m.style.display = 'none';
        setMobileCount('Couldn’t load homes');
        box.innerHTML = '<div class="empty-ttl">Nothing to show right now</div>'
          + '<p class="empty-sub">' + (navigator.onLine
              ? 'We couldn’t reach our listings, nothing was found. This is on our side, not yours.'
              : 'You’re offline, so nothing could be found. Reconnect and try again.') + '</p>'
          + '<div class="empty-acts">'
          + '<button class="btn btn-primary" type="button" id="retryLoad">Try again</button>'
          + '<a class="btn btn-ghost" href="toju.html">Ask Tayo instead</a></div>';
        const r = document.getElementById('retryLoad');
        if (r) r.addEventListener('click', () => location.reload());
        return;
      }
      // loaded fine, genuinely nothing matched this brief/filters
      box.innerHTML = '<div class="empty-ttl">No homes fit this exact brief yet</div>'
        + '<p class="empty-sub">That usually just means the brief is a little tight. Try one of these:</p>'
        + '<div class="empty-acts">'
        + '<a class="btn btn-ghost" href="toju.html?ask=' + encodeURIComponent('Widen my budget a little and show me what opens up') + '">Widen the budget</a>'
        + '<a class="btn btn-ghost" href="toju.html?ask=' + encodeURIComponent('Show me good homes in nearby areas too') + '">Try a nearby area</a>'
        + '<a class="btn btn-primary" href="toju.html?ask=' + encodeURIComponent('Help me find homes similar to what I asked for') + '">Ask Tayo to help</a></div>';
    }

    const mapState = {}; // persistent {map, layer} for SynMatches.drawMatchMap
    function drawMap() {
      /* Browse is the only map that opts into area search. Tayo's map shows
         the homes Tayo picked and the portal's shows one agency's own stock --
         on either, "search this area" would replace a curated set with every
         listing in the viewport. */
      SynMatches.drawMatchMap(mapState, 'map',
        shownItems.length || searchQ ? shownItems : items,
        { areaSearch: true, sb: { url: SUPABASE_URL, anon: ANON_KEY },
          onAreaResults: (rows) => { areaIds = new Set((rows || []).map((r) => r.id)); render(); } });
    }
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-area-clear]')) return;
      areaIds = null; render();
    });

    /* ── List ⇄ Map (item 20) ────────────────────────────────────────────
       Both views render the same filtered set, so switching never changes
       which homes you are looking at, only how. The toolbar stays in map
       view because filtering is the point of a map.

       Leaflet caches its container size, so a map whose box just changed
       renders into the old dimensions, grey tiles, pins in the wrong place.
       invalidateSize() after the height transition is what keeps it honest. */
    let viewMode = 'list';
    function setView(mode, opts) {
      viewMode = mode === 'map' ? 'map' : 'list';
      document.body.classList.toggle('view-map', viewMode === 'map');
      document.querySelectorAll('.vseg').forEach((b) => {
        const on = b.dataset.view === viewMode;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      // re-measure after the height animation, and once more on settle
      const nudge = () => { if (mapState.map) mapState.map.invalidateSize(); };
      requestAnimationFrame(nudge);
      setTimeout(nudge, 320);
      if (!opts || !opts.silent) writePrefs();
    }
    document.querySelector('.viewseg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (b) setView(b.dataset.view);
    });

    /* The mobile Map chip drives the same setView as the desktop segment -
       one source of truth for the view, two ways in. */
    (function () {
      const chip = document.getElementById('bmMap');
      if (!chip) return;
      chip.addEventListener('click', () => {
        const toMap = !document.body.classList.contains('view-map');
        setView(toMap ? 'map' : 'list');
        chip.setAttribute('aria-pressed', String(toMap));
      });
    })();

    function updateBar() {
      const bar = document.getElementById('cmpbar');
      document.getElementById('cmpCount').textContent = picked.size;
      bar.classList.toggle('on', picked.size >= 2);
    }

    /* One handler, both grids. The "new since your last visit" section renders
       the same cards, so saving, comparing and opening a home must behave
       identically there, a card that looks live but does nothing is worse than
       no section at all. Fully delegated, so it works wherever it is attached. */
    function onGridClick(e) {
      const sv = e.target.closest('[data-save]');
      if (sv) {
        const id = sv.getAttribute('data-save');
        const wasSaved = saves.has(id);
        saves = SynMatches.toggleSave(id);   // re-reads storage; no lost updates
        render();
        if (!wasSaved) {
          // design-system confirmation: one scale pulse on the freshly painted
          // heart (render() replaced the node, so tag the new one)
          const heart = document.querySelector('[data-save="' + id + '"]');
          if (heart) heart.classList.add('pop');
          toast('Saved, your ♥ homes stay on this device.');
        } else {
          toast('Removed from your saved homes.');
        }
        return;
      }
      const cb = e.target.closest('[data-cmp]');
      if (cb) {
        const id = cb.getAttribute('data-cmp');
        picked.has(id) ? picked.delete(id) : picked.add(id);
        if (picked.size > 4) { picked.delete(id); cb.checked = false; }
        render(); return;
      }
      // A click on the "compare" label text fires here first, then the label
      // re-dispatches a click on its checkbox (handled above). Swallow the
      // label click so it can't fall through and navigate the card.
      if (e.target.closest('.cmpbox')) return;
      const card = e.target.closest('.listing');
      if (card) {
        const id = card.getAttribute('data-id');
        // record the visit locally BEFORE navigating, this is the only writer
        // of the recently-viewed history, so the rail can only ever show homes
        // this device really opened
        const viewed = shownItems.find((l) => l.id === id) || items.find((l) => l.id === id);
        if (viewed) SynMatches.recordView(viewed);
        /* The title is a real link now, and a link navigates itself, including
           cmd/ctrl-click, which fires a click event AND opens a new tab. Falling
           through to location.href would send this tab to the listing at the
           same moment the new one opened. The visit is still recorded above,
           because it happened either way. */
        if (e.target.closest('a[href]')) return;
        location.href = SynMatches.propertyHref(id);
      }
    }
    document.getElementById('grid').addEventListener('click', onGridClick);
    document.getElementById('freshGrid').addEventListener('click', onGridClick);

    document.getElementById('sortSel').addEventListener('change', () => { writePrefs(); render(); });

    // lightweight feedback toast, same voice + surface as property.html (#synToast in app.css)
    function toast(msg, kind) {
      let t = document.getElementById('synToast');
      if (!t) { t = document.createElement('div'); t.id = 'synToast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
      t.className = kind === 'error' ? 'err' : '';
      t.textContent = msg;
      requestAnimationFrame(() => t.classList.add('show'));
      clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3600);
    }

    // ── saved counter in the appbar, a true count of the shared save store,
    //    hidden entirely at zero (an empty counter is noise, not information) ──
    let lastSavedCount = null;
    function updateSavedNav() {
      const el = document.getElementById('navSaved');
      if (!el) return;
      const n = saves.size;
      el.hidden = n === 0;
      document.getElementById('navSavedN').textContent = n;
      document.getElementById('navSavedSr').textContent = ' saved home' + (n === 1 ? '' : 's');
      // the mobile bar mirrors this rather than tracking saves itself
      // the taskbar's Dream boards row mirrors this rather than tracking saves itself
      if (window.CustNav) window.CustNav.setCount('dream.html', n);
      if (lastSavedCount !== null && n !== lastSavedCount && n > 0) {
        el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      }
      lastSavedCount = n;
    }

    // ── recently viewed rail, reads only the local view history; with no
    //    history the section stays [hidden] (never placeholder cards) ──
    function renderRecent() {
      const rail = document.getElementById('recentRail');
      const views = SynMatches.readViews();
      rail.hidden = views.length === 0;
      if (!views.length) return;
      document.getElementById('recentTrack').innerHTML = views.map((v) =>
        '<a class="rc" href="' + SynMatches.propertyHref(v.id) + '">'
        + '<span class="rc-price">' + naira(v.priceN) + (v.per ? '<i>/yr</i>' : '') + '</span>'
        + '<span class="rc-ttl">' + esc(v.ttl) + '</span>'
        + '<span class="rc-loc">' + esc(v.loc) + '</span></a>').join('');
    }
    renderRecent();
    // back-button (bfcache) returns should include the home just viewed
    window.addEventListener('pageshow', (e) => { if (e.persisted) renderRecent(); });

    // keyword search
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    searchInput.addEventListener('input', () => {
      searchQ = searchInput.value.trim().toLowerCase();
      searchClear.hidden = !searchQ;
      render();
    });
    searchClear.addEventListener('click', () => { searchInput.value = ''; searchQ = ''; searchClear.hidden = true; render(); searchInput.focus(); });

    // quick deal-type filters (Buy / Rent / Shared living), click again to clear
    document.getElementById('dealFilter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-deal]'); if (!b) return;
      const d = b.getAttribute('data-deal');
      dealFilter = (dealFilter === d) ? 'all' : d;
      document.querySelectorAll('#dealFilter button').forEach((x) => x.classList.toggle('on', x.getAttribute('data-deal') === dealFilter));
      writePrefs();
      render();
    });

    // "Verified only", the customer's choice to hide unverified/in-progress homes
    const verifyToggle = document.getElementById('verifyToggle');
    verifyToggle.addEventListener('click', () => {
      verifiedOnly = !verifiedOnly;
      verifyToggle.classList.toggle('on', verifiedOnly);
      verifyToggle.querySelector('.box').textContent = verifiedOnly ? '✓' : '';
      writePrefs();
      render();
    });

    /* ── sort + filter state persists across sessions (this device only) ──
       Stores the user's own choices, nothing else; restored before the first
       render so the page opens the way they left it. */
    const PREFS_KEY = 'synapse_browse_prefs';
    function writePrefs() {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({
          sort: document.getElementById('sortSel').value,
          deal: dealFilter,
          verifiedOnly: verifiedOnly,
          view: viewMode,
        }));
      } catch (e) {}
    }
    function restorePrefs() {
      let p; try { p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { p = {}; }
      const sel = document.getElementById('sortSel');
      if (p.sort && [...sel.options].some((o) => o.value === p.sort)) sel.value = p.sort;
      if (['sale', 'rent', 'shared', 'land', 'offplan', 'invest', 'shortlet'].includes(p.deal)) {
        dealFilter = p.deal;
        document.querySelectorAll('#dealFilter button').forEach((x) => x.classList.toggle('on', x.getAttribute('data-deal') === dealFilter));
      }
      if (p.verifiedOnly === true) {
        verifiedOnly = true;
        verifyToggle.classList.add('on');
        verifyToggle.querySelector('.box').textContent = '✓';
      }
      if (p.view === 'map') setView('map', { silent: true });
    }
    restorePrefs();

    // ── compare overlay ──
    function best(vals, dir) { const v = dir === 'min' ? Math.min(...vals) : Math.max(...vals); return v; }
    document.getElementById('cmpGo').addEventListener('click', () => {
      const sel = items.filter((l) => picked.has(l.id));
      const rows = [
        ['Price', sel.map((l) => l.priceN), (v, b) => `<span class="${v === b ? 'best' : ''}">${naira(v)}</span>`, 'min'],
        ...(sel.some((l) => typeof l.match === 'number')
          ? [['Match', sel.map((l) => l.match), (v, b) => typeof v !== 'number' ? '\u2014' : `<span class="${v === b ? 'best' : ''}">${v}%</span>`, 'max']]
          : []),
        ['Property confidence', sel.map((l) => l.score), (v, b) => `<span class="${v === b ? 'best' : ''}">${v}</span>`, 'max'],
        /* FLOOD RISK AND POWER RELIABILITY ARE GONE FROM THE COMPARISON.
           Both read off `neighbourhoods`, and both columns are seed_rand
           output from twin_seed.sql. This table is the single worst place in
           the product to print an invented number: it exists so somebody can
           put two homes side by side and choose, and it was rendering
           "Flood risk 64/100 ⚠" -- a warning triangle, a denominator, a
           winner highlighted in green -- off a random number. Somebody was
           going to rule out a house on it. */
        ['Gross yield', sel.map((l) => l.yield ?? '-'), (v, b) => typeof v !== 'number' ? '-' : `<span class="${v === b ? 'best' : ''}">${v}%</span>`, 'max'],
      ];
      let html = '<table class="cmptable"><tr><th></th>' + sel.map((l) => `<th>${esc(l.ttl)}</th>`).join('') + '</tr>';
      rows.forEach(([label, vals, fmt, dir]) => {
        const nums = vals.filter((v) => typeof v === 'number');
        const b = nums.length ? best(nums, dir) : null;
        html += `<tr><td class="h">${label}</td>` + vals.map((v) => `<td>${fmt(v, b)}</td>`).join('') + '</tr>';
      });
      html += '</table>';
      html += '<div style="margin-top:16px;display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">'
        + '<button id="verdictBtn" class="btn btn-primary" style="padding:10px 18px;font-size:13px">Ask Tayo: which is better for me?</button>'
        + '<div id="verdictBox" style="flex:1;min-width:240px;font-size:13.5px;line-height:1.6;color:var(--ink-muted)"></div></div>';
      document.getElementById('cmpTable').innerHTML = html;
      openCompare();

      document.getElementById('verdictBtn').addEventListener('click', async () => {
        const box = document.getElementById('verdictBox');
        box.innerHTML = '<i>Tayo is weighing them against your brief…</i>';
        try {
          const r = await fetch(SUPABASE_URL + '/functions/v1/toju-demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
            body: JSON.stringify({
              action: 'compare', visitorId: VISITOR,
              /* flood/power removed here too: handing them to the advisor
                 just moves the invention into a sentence. */
              items: sel.map((l) => ({ id: l.id, title: l.ttl, price: l.priceN, deal: l.per ? 'rent' : 'sale', trustScore: l.score, yieldPct: l.yield ?? null, area: l.loc })),
            }),
          });
          const d = await r.json();
          box.innerHTML = d.verdict ? '<b style="color:var(--ink)">Tayo:</b> ' + esc(d.verdict) : 'Hmm, I could not reach Tayo, try again.';
        } catch (e) { box.textContent = 'Connection hiccup, try again.'; }
      });
    });
    /* The compare sheet covers the screen, and the listing behind it was still
       scrolling -- so dismissing it put you somewhere you never navigated to.
       Locking <body> alone does not do it here: the scrolling element is
       <html>. Pin the offset and restore it, rather than letting the page
       silently move while it is hidden. */
    let cmpLockedAt = 0;
    function openCompare() {
      cmpLockedAt = window.scrollY || document.documentElement.scrollTop || 0;
      document.getElementById('cmpwrap').classList.add('on');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
    function closeCompare() {
      document.getElementById('cmpwrap').classList.remove('on');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      window.scrollTo(0, cmpLockedAt);
    }

    document.getElementById('cmpClose').addEventListener('click', closeCompare);
    document.getElementById('cmpVeil').addEventListener('click', closeCompare);
    // a full-screen sheet should be dismissible without hunting for the X
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('cmpwrap').classList.contains('on')) closeCompare();
    });

    /* The mobile row replaces the summary card, so anything that writes the
       summary has to write this too, the matched view updated only the card
       and left the row stuck on "Loading homes…". */
    function setMobileCount(html) {
      const el = document.getElementById('bmCount');
      if (el) el.innerHTML = html;
    }

    function setMatchedHeadings() {
      document.getElementById('pageTitle').textContent = 'Your matches';
    }

    // ── default: EVERY live home in the dataset (browse-all) ──
    // Verified AND unverified show, each clearly labelled; Tayo only recommends
    // verified. Refines into "Your matches" after a real conversation.
    render();
    // Pull a balanced set so all three quick filters (Buy / Rent / Shared) have
    // homes: whole-home sale+rent by trust, plus a slice of shared rooms.
    const BROWSE_BASE = SUPABASE_URL + '/rest/v1/properties?select=id,title,city,state,listing_type,price_period,property_type,verification_status,price,bedrooms,bathrooms,area_sqm,trust_score,expires_at,listed_at,currency,latitude,longitude,area_name,deal_structure,build_stage,handover_date,build_progress_pct,payment_plan,deposit_pct,instalment_months,units_available,plot_count,plot_size_sqm,min_investment,property_media(url,display_order,media_type),neighbourhoods(name),agencies(name,logo_url,brand_color,brand_font,cac_number,cac_certificate_on_file)'
      + '&status=eq.live&is_active=is.true';
    const BROWSE_HDR = { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY };
    // Freshest-first (not trust-first) so the feed spans many neighbourhoods
    // instead of clustering the prime Lagos areas at the top. Users re-rank
    // with the sort dropdown.
    Promise.all([
      /* A failed request is a failure, not an empty shop (Greptile): a 4xx/5xx
         or a non-list answer used to read as "no homes fit". */
      ...['&property_type=neq.shared&verification_status=eq.verified&order=listed_at.desc&limit=800',
          '&property_type=neq.shared&verification_status=neq.verified&order=listed_at.desc&limit=300',
          '&property_type=eq.shared&order=listed_at.desc&limit=200'].map((q) =>
        fetch(BROWSE_BASE + q, { headers: BROWSE_HDR }).then((r) => r.json().catch(() => null).then((d) => {
          if (!r.ok || !Array.isArray(d)) throw new Error('listings ' + r.status);
          return d;
        }))),
    ]).then(([verifiedRows, unvRows, sharedRows]) => {
      const rows = [...verifiedRows, ...unvRows, ...sharedRows];
      loadState = 'ready';
      if (hasSessionView) return;
      if (rows.length === 0) { render(); return; }   // truly nothing live, say so
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
      items = rows.map((p, i) => ({
        /* The listing's own first photo. This query did not ask for
           property_media at all, so img was always null and the card renderer
           fell back to a pool of stock flats -- every home in Browse wore a
           photograph of a different building. */
        id: p.id,
        img: coverOf(p.property_media),
        kind: p.property_type === 'shared' ? 'shared' : p.listing_type === 'rent' ? 'rent' : 'sale',
        /* Every shelf this listing belongs on: a plot of land for sale is
           both "Buy" and "Land"; an off-plan flat is "Buy" and "Off-plan". */
        cats: (function () {
          const c = [p.property_type === 'shared' ? 'shared' : p.listing_type === 'rent' ? 'rent' : 'sale'];
          if (p.property_type === 'land') c.push('land');
          if (p.listing_type === 'shortlet' || p.deal_structure === 'shortlet') c.push('shortlet');
          if (p.deal_structure === 'off_plan' || p.build_stage === 'under_construction' || p.build_stage === 'not_started') c.push('offplan');
          if (['joint_venture', 'development_financing', 'off_plan'].includes(p.deal_structure) || Number(p.min_investment) > 0) c.push('invest');
          return c;
        })(),
        dealInfo: {
          isLand: p.property_type === 'land', deal: p.deal_structure, stage: p.build_stage, handover: p.handover_date,
          progress: p.build_progress_pct, plan: p.payment_plan, deposit: p.deposit_pct, months: p.instalment_months,
          units: p.units_available, plots: p.plot_count, plotSize: p.plot_size_sqm, minInv: p.min_investment,
        },
        per: p.listing_type === 'rent',
        /* The listing's own period (Greptile): monthly rent said "/yr". */
        perLabel: ({ per_year: '/yr', per_month: '/mo', per_night: '/night' })[p.price_period] || '',
        vstatus: p.verification_status,
        // Drives the expiry chip. Real and enforced: the row disappears from
        // this very query once it passes (properties_select_public).
        expiresAt: p.expires_at || null,
        listedAt: p.listed_at || null,   // "new since your last visit"
        currency: p.currency || null,    // price formats in the listing's own currency
        deal: p.property_type === 'shared' ? 'Shared room' : p.listing_type === 'shortlet' ? 'Short-let'
          : p.listing_type === 'rent' ? 'For rent' : 'For sale',
        priceN: Number(p.price) || 0,
        /* The Area the agency typed, then the linked zone, then the city. It
           is also what the search box matches, so "Agbowo" now finds it. */
        ttl: p.title, loc: (p.area_name && p.area_name.trim() && p.area_name.trim().length <= 40 && !/\n/.test(p.area_name.trim())) ? (p.area_name.trim() + ', ' + p.city)
          : (p.neighbourhoods && p.neighbourhoods.name) ? p.neighbourhoods.name : (p.city + ', ' + (p.state || '')),
        score: p.trust_score, match: null,
        /* Who listed it, as they designed themselves on their Brand page --
           drawn by listingCardHtml, which checks every field before using it. */
        agency: (function (a) {
          a = Array.isArray(a) ? a[0] : a;
          return a && a.name ? { name: a.name, logo: a.logo_url, color: a.brand_color, font: a.brand_font, cac: a.cac_number, cacDoc: !!a.cac_certificate_on_file } : null;
        })(p.agencies),
        // Where the pin goes. `loc` above is the label; these are the place.
        lat: p.latitude == null ? null : Number(p.latitude),
        lng: p.longitude == null ? null : Number(p.longitude),
        /* "independently verified" is not repeated here: the chip at the top
           of the card already says Verified, and the score line below said it
           a third time. One card, one statement of a fact. The unverified copy
           below DOES stay long, because there it is carrying something the
           chip cannot -- what unverified actually means and what to do next. */
        /* Was "<b>3 beds</b> · ask Tayo if it fits your life" on every verified
           card, the same sentence under every home, telling you nothing about
           the one you are looking at. The card's job while you scan is to say
           what this home IS, so it carries the facts: beds, baths, floor area.
           Each part is dropped rather than guessed when the column is empty.

           The unverified line keeps its prompt, because there the chip says
           "Not verified" and cannot say what to do about it. */
        why: (function () {
          const bits = [];
          if (p.bedrooms) bits.push('<b>' + p.bedrooms + ' bed' + (p.bedrooms > 1 ? 's' : '') + '</b>');
          if (p.bathrooms) bits.push(p.bathrooms + ' bath' + (p.bathrooms > 1 ? 's' : ''));
          if (p.area_sqm) bits.push(Math.round(Number(p.area_sqm)) + ' m²');
          const facts = bits.join(' · ');
          return p.verification_status === 'verified'
            ? facts
            : (facts ? facts + ' · ' : '') + 'Tayo can run the 7 checks before you commit';
        })(),
      }));
      const vCount = rows.filter((p) => p.verification_status === 'verified').length;
      setMobileCount('<b>' + rows.length + '</b> live · <b>' + vCount + '</b> verified');
      render();
    }).catch(() => {
      // Nothing came back: show nothing. The empty state explains why, and
      // no sample homes are ever passed off as live inventory.
      if (hasSessionView) return;
      loadState = 'failed'; items = []; render();
    });
    window.addEventListener('online', () => { if (loadState === 'failed') location.reload(); });

    // ── real matches from this visitor's Tayo session ──
    if (VISITOR) {
      fetch(SUPABASE_URL + '/functions/v1/toju-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
        body: JSON.stringify({ action: 'matches', visitorId: VISITOR }),
      }).then((r) => r.json()).then((d) => {
        // A real session exists but nothing matched: show the honest empty
        // state, never fall back to other homes silently.
        if (d.criteria && (!Array.isArray(d.matches) || d.matches.length === 0)) {
          hasSessionView = true;
          items = []; picked = new Set();
          setMatchedHeadings();
          setMobileCount('Nothing fits your brief yet');
          document.getElementById('map').style.display = 'none';
          render();
          return;
        }
        if (!Array.isArray(d.matches) || d.matches.length === 0) return;
        hasSessionView = true;
        setMatchedHeadings();
        // SAME shaper the Tayo canvas uses, the canvas is an exact preview of this page
        items = d.matches.map(SynMatches.shapeTojuMatch);
        picked = new Set();
        setMobileCount('<b>' + items.length + '</b> match your brief');
        render();
      }).catch(() => {});
    }
  