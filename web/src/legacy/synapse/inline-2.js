
(function () {
  'use strict';
  var SB_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
  var SB_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var PL = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn', x: 'X', telegram: 'Telegram', youtube: 'YouTube' };
  var GLYPH = { instagram: '◎', facebook: 'f', tiktok: '♪', linkedin: 'in', x: 'X', telegram: '➤', youtube: '▶' };
  var STUDIO_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'linkedin', 'x', 'youtube'];
  /* Where to make the account, and the one thing people get wrong. */
  var MAKE = {
    instagram: { url: 'https://www.instagram.com/accounts/emailsignup/', tip: 'Switch it to a Professional (Business) account in Settings, and link it to a Facebook Page. Instagram will not take scheduled posts otherwise.', what: 'photo and video posts' },
    facebook: { url: 'https://www.facebook.com/pages/create', tip: 'Make a Page, not a personal profile. Posts go to the Page.', what: 'Page posts' },
    tiktok: { url: 'https://www.tiktok.com/signup', tip: 'Use an email Synapse owns, so the account does not belong to one person.', what: 'video posts' },
    linkedin: { url: 'https://www.linkedin.com/company/setup/new/', tip: 'Create a Company Page. Posts go to the Page, not a person.', what: 'company posts' },
    x: { url: 'https://x.com/i/flow/signup', tip: 'Use an email Synapse owns. X keeps posts to about 280 characters.', what: 'short posts' },
    youtube: { url: 'https://www.youtube.com/create_channel', tip: 'Create a channel under a Google account Synapse owns. YouTube here takes vertical videos up to 3 minutes (MP4 or MOV), posted from Create. It cannot post homes by itself or share agencies\u2019 posts.', what: 'videos (Shorts)' }
  };
  /* What to click inside TryPost, per network. Written from TryPost's own guides: the names of the buttons are theirs. */
  var STEPS = {
    instagram: ['Open <b>Accounts</b> in TryPost\u2019s left menu.', 'On the <b>Instagram</b> card press <b>Connect</b>.', 'Choose <b>Instagram (Facebook Business)</b> if it is a Business or Creator account linked to a Facebook Page (the usual case). Choose plain <b>Instagram</b> only for a personal account.', 'Approve it on Facebook, and pick the Facebook Page if it asks.'],
    facebook: ['Open <b>Accounts</b> in TryPost\u2019s left menu.', 'On the <b>Facebook</b> card press <b>Connect</b>.', 'Approve it on Facebook, then <b>pick the Page</b> (not your personal profile) when it asks.'],
    tiktok: ['Open <b>Accounts</b> in TryPost\u2019s left menu.', 'On the <b>TikTok</b> card press <b>Connect</b>.', 'Log in to the TikTok account and approve.'],
    linkedin: ['Open <b>Accounts</b> in TryPost\u2019s left menu.', 'On the <b>LinkedIn</b> card press <b>Connect</b> and approve.', 'On the next screen <b>choose the company page</b>, not your personal profile.'],
    x: ['Open <b>Accounts</b> in TryPost\u2019s left menu.', 'On the <b>X</b> card press <b>Connect</b>.', 'Approve it on X, signed in as the account you want.'],
    youtube: ['Open <b>Accounts</b> in TryPost\u2019s left menu.', 'On the <b>YouTube</b> card press <b>Connect</b>.', 'Choose the <b>Google account that owns the channel</b>: the channel is decided by which account you pick. Then approve.']
  };
  var VIDEO_RE = /\.(mp4|mov)(\?|#|$)/i;
  var S = { role: null, overview: null, picked: {}, media: [], when: 'now', loaded: {}, tab: 'home', posts: null, activity: null, name: '', link: '' };
  var toastT;

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3800);
  }
  function badge(platform, size, avatar) {
    var p = PL[platform] ? platform : 'x';
    return '<span class="pf ' + (size || '') + ' pf-' + p + '">' + (avatar ? '<img alt="" src="' + esc(avatar) + '" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + esc(GLYPH[p] || '?') + '</span>';
  }
  function token() {
    return SynAuth.client().then(function (c) { return c.auth.getSession(); })
      .then(function (r) { return r && r.data && r.data.session && r.data.session.access_token; });
  }
  /* One door to the function. Resolves the JSON; rejects with a sentence. */
  function api(action, body) {
    return token().then(function (tok) {
      if (!tok) throw new Error('Please sign in again.');
      return fetch(SB_URL + '/functions/v1/synapse-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + tok },
        body: JSON.stringify(Object.assign({ action: action }, body || {}))
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d && d.error ? d.error : 'Something went wrong. Try again.');
        return d;
      });
    });
  }
  function when(ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }

  /* ── the door ─────────────────────────────────────────────────────── */
  function start() {
    SynAuth.ready().then(function (u) {
      if (!u) { location.replace('signin.html?next=' + encodeURIComponent('synapse.html')); return; }
      /* The name they gave when they joined (the join page asks for it); the email only as a last resort. */
      var full = String((u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '').trim();
      $('who').textContent = full ? full + ' · ' + (u.email || '') : (u.email || '');
      S.name = (full || String(u.email || '').split('@')[0].replace(/[._-]+/g, ' ')).split(' ')[0].replace(/^./, function (c) { return c.toUpperCase(); });
      return api('me').then(function (d) {
        S.role = d.role;
        $('gate').hidden = true; $('app').hidden = false;
        if (d.can_manage || d.role === 'platform_admin') $('teamTab').hidden = false;
        return loadOverview().then(function () { loadPosts(); loadActivity(); loadHomes(); });
      }).catch(function () {
        /* Signed in, but not on the team. Say which sign-in this is, so the right address can be added. */
        $('gate').innerHTML = 'You are signed in as <b>' + esc(u.email || 'this account') + '</b>, which is not on the Synapse team. '
          + 'Ask an admin to add this email, or sign in with another one.<div style="margin-top:18px"><button class="btn" id="gateOut" type="button">Sign out</button></div>';
        $('gateOut').addEventListener('click', function () { SynAuth.signOut().then(function () { location.href = 'signin.html?next=synapse.html'; }); });
      });
    }).catch(function () { $('gate').textContent = 'There is nothing here.'; });
  }

  /* ── navigation ───────────────────────────────────────────────────── */
  var TABS = ['home', 'channels', 'compose', 'auto', 'activity', 'guide', 'team'];
  function show(tab) {
    S.tab = tab;
    document.querySelectorAll('.nb').forEach(function (b) { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    TABS.forEach(function (t) { $('p-' + t).hidden = t !== tab; });
    if (tab === 'compose') { loadPosts(); }
    if (tab === 'activity' || tab === 'home') loadActivity();
    if (tab === 'team') loadStaff();
    renderAll();
    window.scrollTo(0, 0);
  }
  $('nav').addEventListener('click', function (e) { var b = e.target.closest('.nb'); if (b) show(b.dataset.tab); });
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]'); if (g) { show(g.dataset.go); return; }
    if (e.target.closest('[data-addchan]')) { openWizard(); }
  });
  $('out').addEventListener('click', signOut); $('outM').addEventListener('click', signOut);
  function signOut() { SynAuth.signOut().then(function () { location.href = 'signin.html'; }); }

  /* ── overview, shared by every page ───────────────────────────────── */
  var EMPTY = { channels: [], legacy: [], twins_enabled: false, live_listings: 0 };
  function loadOverview() {
    return api('overview').then(function (o) { S.overview = o; S.loadFailed = false; renderAll(); })
      .catch(function (e) {
        toast(e.message);
        if (!S.overview) {
          S.overview = EMPTY; S.loadFailed = true; renderAll();
          $('chanList').insertAdjacentHTML('afterbegin', '<div class="card"><b>The studio could not load.</b> <button class="btn sm" type="button" data-retry>Try again</button></div>');
        }
      });
  }
  function renderAll() { if (S.overview) { renderHome(); renderChannels(); renderLegacy(); renderPicks(); renderAuto(); renderPreview(); } }

  function sw(on, attrs, label) {
    return '<button type="button" class="sw" role="switch" aria-label="' + esc(label) + '" aria-checked="' + (on ? 'true' : 'false') + '" ' + attrs + '></button>';
  }
  function num(label, field, id, val, min, max) {
    return '<div><label class="f">' + label + '</label><input type="number" data-f="' + field + '" data-id="' + esc(id) + '" value="' + esc(val) + '" min="' + min + '" max="' + max + '"></div>';
  }

  /* ── home ─────────────────────────────────────────────────────────── */
  function renderHome() {
    var o = S.overview, ch = o.channels || [], legacy = (o.legacy || []).filter(function (l) { return l.is_active; });
    var live = ch.filter(function (c) { return c.is_active; });
    var auto = live.filter(function (c) { return c.autopilot; });
    var mirror = live.filter(function (c) { return c.mirror; });
    var today = ch.reduce(function (a, c) { return a + (Number(c.posts_today) || 0); }, 0);
    var queued = (S.posts || []).filter(function (p) { return p.status === 'scheduled'; }).length;
    var hr = new Date().getHours();
    var greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    $('heroTitle').textContent = greet + (S.name ? ', ' + S.name : '') + '.';

    var steps = [
      { done: ch.length > 0, t: 'Connect a social account', s: 'Add Instagram, Facebook, TikTok, LinkedIn or X. We walk you through it.', btn: 'Add a channel', act: 'add' },
      { done: auto.length > 0, t: 'Let a channel post homes by itself', s: 'Turn on Autopilot and it posts the newest live listings on a schedule.', btn: 'Choose channels', act: 'channels' },
      { done: !!o.twins_enabled && mirror.length > 0, t: 'Share what agencies post', s: 'Turn on mirroring, then choose which channels receive agencies’ posts.', btn: 'Set up sharing', act: 'auto' },
      { done: (S.posts || []).length > 0, t: 'Write your first post', s: 'An announcement, a tip or a campaign, with a live preview.', btn: 'Create a post', act: 'compose' }
    ];
    var left = steps.filter(function (x) { return !x.done; });
    var next = left[0];
    $('heroText').textContent = next ? 'Next up: ' + next.t.charAt(0).toLowerCase() + next.t.slice(1) + '.' : 'Everything is set up. Synapse is posting on its own; you can still write a post any time.';
    $('heroBtns').innerHTML = (next ? '<button class="btn orange big" type="button" data-step="' + next.act + '">' + esc(next.btn) + '</button>' : '')
      + '<button class="btn big" type="button" data-step="compose" style="background:transparent;color:#F5F2EE;border-color:rgba(255,255,255,.3)">Create a post</button>';
    $('stats').innerHTML = [
      [ch.length + (legacy.length ? legacy.length : 0), 'channels connected'], [auto.length, 'on autopilot'], [today, 'posted today'], [queued, 'scheduled'], [o.live_listings || 0, 'live listings']
    ].map(function (x) { return '<div class="stat"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('');
    $('stepsLede').textContent = left.length ? left.length + ' of 4 to go.' : 'All done.';
    $('steps').innerHTML = steps.map(function (x, i) {
      return '<div class="step' + (x.done ? ' done' : '') + '"><span class="dot">' + (x.done ? '✓' : (i + 1)) + '</span><div class="grow"><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></div>'
        + (x.done ? '' : '<button class="btn sm" type="button" data-step="' + x.act + '">' + esc(x.btn) + '</button>') + '</div>';
    }).join('');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]'); if (!b) return;
    if (b.dataset.step === 'add') openWizard(); else show(b.dataset.step);
  });

  /* ── what each channel takes ─────────────────────────────────────────
     The studio, not the agent, decides which Synapse page a listing goes to. A
     channel takes a listing when it matches ALL of its rules; a rule left blank
     matches anything. Agents only ever choose their own accounts. */
  var ROUTE_KINDS = [['sale', 'For sale'], ['rent', 'For rent'], ['shared', 'Shared room'], ['land', 'Land'], ['shortlet', 'Short-let'], ['offplan', 'Off-plan'], ['commercial', 'Commercial']];
  function moneyWord(n) { n = Number(n); if (!n) return ''; return n >= 1e9 ? +(n / 1e9).toFixed(2) + 'bn' : n >= 1e6 ? +(n / 1e6).toFixed(2) + 'm' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n); }
  /* "3m", "500k", "2.5 million", "₦4,000,000" -> whole naira; blank -> null; anything else -> undefined. */
  function readMoney(v) {
    var t = String(v == null ? '' : v).toLowerCase().replace(/[₦,\s]/g, '').replace(/naira|ngn/g, '');
    if (!t) return null;
    var m = t.match(/^(\d+(?:\.\d+)?)(k|thousand|m|mn|million|b|bn|billion)?$/);
    if (!m) return undefined;
    var mult = { k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 }[m[2]] || 1;
    return Math.round(Number(m[1]) * mult);
  }
  function ruleText(c) {
    var parts = [];
    var k = (c.route_kinds || []).map(function (x) { var f = ROUTE_KINDS.filter(function (r) { return r[0] === x; })[0]; return f ? f[1] : x; });
    if (k.length) parts.push(k.join(' or '));
    var lo = c.route_min_beds, hi = c.route_max_beds;
    if (lo != null || hi != null) parts.push(lo != null && lo === hi ? lo + '-bedroom' : (lo != null ? lo : 0) + (hi != null ? '\u2013' + hi : '+') + ' bedrooms');
    if (c.route_min_price || c.route_max_price) parts.push((c.route_min_price ? '\u20A6' + moneyWord(c.route_min_price) : '') + (c.route_min_price && c.route_max_price ? ' to ' : c.route_max_price ? 'up to ' : ' and up') + (c.route_max_price ? '\u20A6' + moneyWord(c.route_max_price) : ''));
    if ((c.route_areas || []).length) parts.push(c.route_areas.join(', '));
    parts.push(c.city ? c.city : 'every city');
    return parts.join(' \u00b7 ');
  }
  function routeBox(c, open) {
    var id = esc(c.id), kinds = c.route_kinds || [];
    var any = !kinds.length && c.route_min_beds == null && c.route_max_beds == null && !c.route_min_price && !c.route_max_price && !(c.route_areas || []).length;
    return '<details class="pace route" data-rid="' + id + '" data-id="' + id + '"' + ((open['r' + c.id] || !any) ? ' open' : '') + '><summary>What this page takes: <b style="color:var(--ink)">' + esc(any ? (c.city ? c.city + ', every kind of listing' : 'every listing') : ruleText(c)) + '</b></summary>'
      + '<p class="muted small" style="margin:2px 0 12px">Agencies\u2019 posts and autopilot go to this page only when the listing matches everything below. Leave a box empty to take anything.</p>'
      + '<label class="f">Kind of listing</label><div class="picks">' + ROUTE_KINDS.map(function (r) {
          return '<button type="button" class="pick plain" data-rk="' + r[0] + '" data-id="' + id + '" aria-pressed="' + (kinds.indexOf(r[0]) > -1 ? 'true' : 'false') + '">' + r[1] + '</button>'; }).join('') + '</div>'
      + '<div class="pace-grid" style="margin-top:14px">'
      + '<div><label class="f">Fewest bedrooms</label><input type="number" min="0" max="20" data-f="route_min_beds" data-id="' + id + '" value="' + esc(c.route_min_beds == null ? '' : c.route_min_beds) + '" placeholder="any"></div>'
      + '<div><label class="f">Most bedrooms</label><input type="number" min="0" max="20" data-f="route_max_beds" data-id="' + id + '" value="' + esc(c.route_max_beds == null ? '' : c.route_max_beds) + '" placeholder="any"></div>'
      + '<div><label class="f">Lowest price</label><input type="text" data-f="route_min_price" data-id="' + id + '" value="' + esc(moneyWord(c.route_min_price)) + '" placeholder="e.g. 3m"></div>'
      + '<div><label class="f">Highest price</label><input type="text" data-f="route_max_price" data-id="' + id + '" value="' + esc(moneyWord(c.route_max_price)) + '" placeholder="e.g. 50m"></div>'
      + '</div><div style="margin-top:12px"><label class="f">Areas <span class="muted">(optional, separate with commas)</span></label><input type="text" data-f="route_areas" data-id="' + id + '" value="' + esc((c.route_areas || []).join(', ')) + '" placeholder="e.g. Bodija, Agodi" maxlength="200"></div>'
      + '<p class="small" style="margin-top:12px"><b>' + esc(c.reach == null ? '' : c.reach) + '</b> <span class="muted">of ' + esc((S.overview || {}).live_listings || 0) + ' live listings match these rules right now.</span></p>'
      + (kinds.length || c.route_min_beds != null || c.route_max_beds != null || c.route_min_price || c.route_max_price || (c.route_areas || []).length
        ? '<button class="btn sm" type="button" data-clearroute="' + id + '">Take everything again</button>' : '')
      + '</details>';
  }

  /* ── channels ─────────────────────────────────────────────────────── */
  function renderChannels() {
    var box = $('chanList'), a = document.activeElement;
    if (a && box.contains(a) && a.matches('input')) { S.pendingRender = true; return; }
    var open = {};
    box.querySelectorAll('details.pace[open]').forEach(function (d) { open[(d.classList.contains('route') ? 'r' : 'p') + d.dataset.id] = true; });
    var list = S.overview.channels || [];
    box.innerHTML = list.map(function (c) {
      var id = esc(c.id);
      var name = c.label || c.handle || PL[c.platform] || 'account';
      var gap = Math.round((c.min_gap_minutes || 0) / 6) / 10;
      var yt = c.platform === 'youtube';
      return '<div class="card chan">'
        + '<div class="chan-head">' + badge(c.platform, 'lg') + '<div class="grow"><div class="chan-name">' + esc(name) + '</div>'
        + '<div class="muted small">' + esc(PL[c.platform] || c.platform) + (c.handle ? ' · ' + esc(c.handle) : '') + '</div>'
        + '<div class="tags"><span class="pill ' + (c.is_active ? 'ok' : '') + '">' + (c.is_active ? 'On' : 'Off') + '</span>'
        + (c.autopilot ? '<span class="pill hot">Autopilot</span>' : '') + (c.mirror ? '<span class="pill hot">Agency posts</span>' : '')
        + '<span class="pill">' + (c.city ? esc(c.city) : 'Every city') + '</span>'
        + ((c.route_kinds || []).length || c.route_min_beds != null || c.route_max_beds != null || c.route_min_price || c.route_max_price || (c.route_areas || []).length ? '<span class="pill hot">Sorted</span>' : '') + '</div></div></div>'
        + '<div class="chan-body">'
        + '<div class="opt"><div class="grow"><b>Switched on</b><small>Off keeps the account here but posts nothing to it.</small></div>' + sw(c.is_active, 'data-id="' + id + '" data-k="is_active"', 'Switched on: ' + name) + '</div>'
        + (yt ? '<p class="muted small" style="margin:4px 0 10px">Videos only. Post to this channel from Create; it cannot post homes by itself or share agencies\u2019 posts.</p>' : ('<div class="opt"><div class="grow"><b>Post homes by itself</b><small>Autopilot: one live listing at a time. ' + esc(c.posts_today) + ' so far today.</small></div>' + sw(c.autopilot, 'data-id="' + id + '" data-k="autopilot"', 'Autopilot: ' + name) + '</div>'         + '<div class="opt"><div class="grow"><b>Share agencies’ posts</b><small>Also posts what agencies publish, if the listing matches what this page takes (needs sharing on in Automation).</small></div>' + sw(c.mirror, 'data-id="' + id + '" data-k="mirror"', 'Share agencies’ posts: ' + name) + '</div>'))
        + (yt ? '' : routeBox(c, open))
        + '<details class="pace" data-id="' + id + '"' + (open['p' + c.id] ? ' open' : '') + '><summary>Name, city and pacing</summary><div class="pace-grid">'
        + '<div><label class="f">Name</label><input type="text" data-f="label" data-id="' + id + '" value="' + esc(c.label || '') + '" maxlength="80"></div>'
        + '<div><label class="f">City (blank = every city)</label><input type="text" data-f="city" data-id="' + id + '" value="' + esc(c.city || '') + '" maxlength="60"></div>'
        + num('Posts a day', 'daily_cap', c.id, c.daily_cap, 1, 24)
        + num('Hours between posts', 'gap_hours', c.id, gap, 0.5, 24)
        + num('Starts at (hour, Lagos)', 'window_start', c.id, c.window_start, 0, 23)
        + num('Stops at (hour, Lagos)', 'window_end', c.id, c.window_end, 1, 24)
        + num('Repeat a home after (days)', 'repost_days', c.id, c.repost_days, 1, 365)
        + '</div><div style="margin-top:14px"><button class="btn sm danger" data-remove="' + id + '" type="button">Remove this account</button></div></details>'
        + '</div></div>';
    }).join('') + '<button type="button" class="card addcard" data-addchan><span class="plus"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>' + (list.length ? 'Add another channel' : 'Add your first channel') + '</button>';
  }
  $('chanList').addEventListener('click', function (e) {
    if (e.target.closest('[data-retry]')) { S.overview = null; loadOverview(); return; }
    var rk = e.target.closest('[data-rk]');
    if (rk) {
      var ch = (S.overview.channels || []).filter(function (x) { return x.id === rk.dataset.id; })[0]; if (!ch) return;
      var cur = (ch.route_kinds || []).slice(), at = cur.indexOf(rk.dataset.rk);
      if (at > -1) cur.splice(at, 1); else cur.push(rk.dataset.rk);
      rk.setAttribute('aria-pressed', String(at === -1));
      api('channel_update', { id: ch.id, route_kinds: cur }).then(function () { return loadOverview(); }).catch(function (er) { toast(er.message); loadOverview(); });
      return;
    }
    var cr = e.target.closest('[data-clearroute]');
    if (cr) {
      api('channel_update', { id: cr.dataset.clearroute, route_kinds: [], route_min_beds: null, route_max_beds: null, route_min_price: null, route_max_price: null, route_areas: [] })
        .then(function () { toast('This page takes everything again.'); return loadOverview(); }).catch(function (er) { toast(er.message); });
      return;
    }
    var s = e.target.closest('.sw');
    if (s) {
      var on = s.getAttribute('aria-checked') !== 'true';
      s.setAttribute('aria-checked', String(on));
      var patch = { id: s.dataset.id }; patch[s.dataset.k] = on;
      api('channel_update', patch).then(loadOverview).catch(function (er) { toast(er.message); loadOverview(); });
      return;
    }
    var rm = e.target.closest('[data-remove]');
    if (rm && window.confirm('Remove this account from the studio? Its past posts stay in the record.')) {
      api('channel_remove', { id: rm.dataset.remove }).then(function (d) { toast(d.kept ? 'Switched off. Its history is kept.' : 'Removed.'); return loadOverview(); })
        .catch(function (er) { toast(er.message); });
    }
  });
  $('chanList').addEventListener('focusout', function () {
    setTimeout(function () {
      var a = document.activeElement;
      if (S.pendingRender && !($('chanList').contains(a) && a.matches('input'))) { S.pendingRender = false; renderChannels(); }
    }, 0);
  });
  $('chanList').addEventListener('change', function (e) {
    var i = e.target.closest('[data-f]'); if (!i) return;
    var f = i.dataset.f, v = i.value, patch = { id: i.dataset.id };
    if (f === 'gap_hours') { patch.min_gap_minutes = Math.round(Number(v) * 60); }
    else if (f === 'label' || f === 'city') { patch[f] = v; }
    else if (f === 'route_min_beds' || f === 'route_max_beds') { patch[f] = v === '' ? null : Number(v); }
    else if (f === 'route_min_price' || f === 'route_max_price') {
      var money = readMoney(v);
      if (money === undefined) { toast('Write a price like 3m, 500k or 2500000.'); loadOverview(); return; }
      patch[f] = money;
    }
    else if (f === 'route_areas') { patch[f] = v; }
    else { patch[f] = Number(v); }
    api('channel_update', patch).then(function () { toast('Saved.'); return loadOverview(); }).catch(function (er) { toast(er.message); loadOverview(); });
  });

  function renderLegacy() {
    var l = S.overview.legacy || [];
    $('legacyCard').hidden = !l.length;
    $('legacyList').innerHTML = l.map(function (x) {
      return '<div class="opt">' + badge(x.platform, 'sm') + '<div class="grow"><b>' + esc(x.handle || PL[x.platform]) + '</b><small>' + esc(PL[x.platform] || x.platform) + '</small></div>'
        + sw(x.is_active, 'data-leg="' + esc(x.id) + '"', 'Developer account: ' + (x.handle || PL[x.platform])) + '</div>';
    }).join('');
  }
  $('legacyList').addEventListener('click', function (e) {
    var s = e.target.closest('[data-leg]'); if (!s) return;
    var on = s.getAttribute('aria-checked') !== 'true'; s.setAttribute('aria-checked', String(on));
    api('legacy_toggle', { id: s.dataset.leg, is_active: on }).then(loadOverview).catch(function (er) { toast(er.message); loadOverview(); });
  });

  /* ── the add-a-channel guide ─────────────────────────────────────────
     Making the account is on the network; connecting it is in TryPost, which
     holds the permission to post; naming what it is for is here. Three steps,
     and the page says which one you are on. */
  var W = { step: 1, platform: null, accounts: null, chosen: null, purpose: { own: true, auto: false, mirror: false } };
  function openWizard() { W = { step: 1, platform: null, accounts: null, chosen: null, purpose: { own: true, auto: false, mirror: false } }; $('veil').hidden = false; document.body.style.overflow = 'hidden'; drawWizard(); }
  var watchT = null;
  function stopWatch() { if (watchT) { clearInterval(watchT); watchT = null; } }
  function closeWizard() { stopWatch(); $('veil').hidden = true; document.body.style.overflow = ''; }
  /* Step 2: ask TryPost every few seconds. The first answer also fills in what the workspace already holds, so the
     person can tell whether they are in the right one; the first new account of this network moves things on. */
  function seenLine() {
    var el = $('wzSeen'); if (!el) return;
    var a = W.accounts || [];
    el.innerHTML = a.length
      ? 'The workspace Synapse reads already holds: <b>' + a.slice(0, 6).map(function (x) { return esc(x.name || x.username || PL[x.platform]) + ' (' + esc(PL[x.platform] || x.platform) + ')'; }).join(', ') + (a.length > 6 ? ' and ' + (a.length - 6) + ' more' : '') + '</b>. If TryPost shows different accounts, you are in another workspace: switch.'
      : 'The workspace Synapse reads has no accounts yet. Whatever you connect first will appear here.';
  }
  function startWatch() {
    stopWatch(); var n = 0;
    var tick = function () {
      if ($('veil').hidden || W.step !== 2) { stopWatch(); return; }
      if (++n > 150) { stopWatch(); var w = $('wzWait'); if (w) w.textContent = 'Still nothing. Press \u201cI\u2019ve connected it, check now\u201d when you are done.'; return; }
      api('trypost_accounts').then(function (d) {
        if (W.step !== 2) return;
        W.accounts = d.accounts || []; seenLine();
        var fresh = W.accounts.filter(function (a) { return a.platform === W.platform && !a.added && a.supported && (!a.status || a.status === 'connected'); });
        if (fresh.length) { stopWatch(); toast('Found your ' + PL[W.platform] + ' account.'); W.step = 3; drawWizard(); }
      }).catch(function () { /* the next tick tries again */ });
    };
    tick(); watchT = setInterval(tick, 5000);
  }
  $('veil').addEventListener('click', function (e) { if (e.target === $('veil')) closeWizard(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('veil').hidden) closeWizard(); });
  function drawWizard() {
    var bars = $('wzProg').children; for (var i = 0; i < bars.length; i++) bars[i].className = i < W.step ? 'on' : '';
    stopWatch();
    var h = '';
    if (W.step === 1) {
      h = '<h2 class="h" id="wzTitle" style="font-size:25px">Which network?</h2><p class="lede">Pick the one you want to add. Already have the account? You will connect it in step 2.</p>'
        + '<div class="tiles" style="margin-top:18px">' + STUDIO_PLATFORMS.map(function (p) {
          return '<button type="button" class="tile" data-plat="' + p + '">' + badge(p, 'lg') + '<span>' + PL[p] + '</span><small>' + esc(MAKE[p].what) + '</small></button>';
        }).join('') + '</div>'
        + '<div class="row" style="margin-top:20px"><span class="spacer"></span><button class="btn" type="button" data-wzclose>Cancel</button></div>';
    } else if (W.step === 2) {
      var m = MAKE[W.platform];
      h = '<div class="row" style="gap:14px">' + badge(W.platform, 'lg') + '<div class="grow"><h2 class="h" id="wzTitle" style="font-size:25px">Connect ' + esc(PL[W.platform]) + '</h2><p class="muted small">You connect it inside TryPost. Keep this window open: it notices by itself when you are done.</p></div></div>'
        + '<div class="stack" style="margin-top:18px">'
        + '<div class="gstep"><span class="dot">1</span><div class="grow"><b>Open TryPost</b>'
        + '<p class="muted small" style="margin:4px 0 8px">It opens in a new tab. Sign in if it asks. <b>Check the workspace first:</b> accounts live inside a workspace, and Synapse reads the one shown below. Click the workspace name at the top of TryPost\u2019s left menu and make sure it is the one that holds these accounts.</p>'
        + '<div class="callout" id="wzSeen" style="margin-bottom:10px">Looking at what is already there\u2026</div>'
        + '<a class="btn sm primary" href="https://app.trypost.it" target="_blank" rel="noopener">Open TryPost \u2197</a></div></div>'
        + '<div class="gstep"><span class="dot">2</span><div class="grow"><b>Connect your ' + esc(PL[W.platform]) + ' account</b>'
        + '<ol class="steps-l" style="margin:8px 0 0">' + (STEPS[W.platform] || []).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>'
        + '<p class="muted small" style="margin-top:8px">Connected the wrong one? Sign out of ' + esc(PL[W.platform]) + ' in your browser first, then connect again.</p></div></div>'
        + '<div class="gstep"><span class="dot">3</span><div class="grow"><b>Wait here</b><p class="muted small" style="margin:4px 0 0" id="wzWait"><span class="wz-dot"></span> Waiting for your ' + esc(PL[W.platform]) + ' account to appear\u2026 this page checks every few seconds.</p></div></div>'
        + '<details class="pace"><summary>You do not have a ' + esc(PL[W.platform]) + ' account yet?</summary><div class="callout" style="margin:8px 0 10px">' + esc(m.tip) + '</div>'
        + '<a class="btn sm" href="' + esc(m.url) + '" target="_blank" rel="noopener">Create a ' + esc(PL[W.platform]) + ' account \u2197</a></details>'
        + '</div>'
        + '<div class="row" style="margin-top:22px"><button class="btn" type="button" data-wzback>Back</button><span class="spacer"></span><button class="btn orange big" type="button" id="wzFind">I\u2019ve connected it, check now</button></div>';
    } else {
      var list = (W.accounts || []).filter(function (a) { return a.platform === W.platform; });
      h = '<h2 class="h" id="wzTitle" style="font-size:25px">Choose the account</h2>'
        + '<div style="margin-top:12px">' + (list.length ? list.map(function (x) {
          var can = x.supported && !x.added && (!x.status || x.status === 'connected');
          var on = W.chosen === x.id;
          return '<div class="acct">' + badge(x.platform, '', x.avatar)
            + '<div class="grow"><b>' + esc(x.name || x.username || x.id) + '</b><div class="muted small">' + (x.username ? '@' + esc(String(x.username).replace(/^@/, '')) : esc(PL[x.platform])) + '</div></div>'
            + (x.added ? '<span class="pill ok">Already added</span>' : x.status && x.status !== 'connected' ? '<span class="pill bad">Reconnect in TryPost</span>'
              : can ? '<button class="btn sm ' + (on ? 'orange' : '') + '" type="button" data-pick="' + esc(x.id) + '" data-name="' + esc(x.name || x.username) + '">' + (on ? 'Chosen ✓' : 'Choose') + '</button>' : '<span class="pill">Not supported yet</span>') + '</div>';
        }).join('') : '<div class="callout"><b>TryPost does not show a ' + esc(PL[W.platform]) + ' account yet.</b> The usual reasons, most likely first:<ol class="steps-l" style="margin:8px 0 0"><li>It was connected in a <b>different TryPost workspace</b>. Click the workspace name at the top of TryPost\u2019s left menu and switch to the one that holds Synapse\u2019s other accounts, then connect it there.</li><li>The connection was not finished. Go back to TryPost and approve it all the way to the end.</li>' + (W.platform === 'instagram' ? '<li>For a Business or Creator account, use <b>Instagram (Facebook Business)</b>, not plain Instagram.</li>' : '') + '</ol><p style="margin-top:8px">Then press <b>Look again</b>.</p></div>') + '</div>'
        + (W.chosen ? '<div class="stack" style="margin-top:18px"><b>What is it for?</b>'
          + '<div class="opt"><div class="grow"><b>Our own posts</b><small>Announcements and campaigns you write in Create.</small></div>' + sw(W.purpose.own, 'data-pur="own"', 'Our own posts') + '</div>'
          + (W.platform === 'youtube' ? '' : '<div class="opt"><div class="grow"><b>Post homes by itself</b><small>Autopilot: the newest live listings, on a schedule.</small></div>' + sw(W.purpose.auto, 'data-pur="auto"', 'Autopilot') + '</div>'
          + '<div class="opt"><div class="grow"><b>Share agencies’ posts</b><small>Also posts what agencies publish, credited to them.</small></div>' + sw(W.purpose.mirror, 'data-pur="mirror"', 'Share agencies posts') + '</div>')
          + '<div><label class="f" for="wzCity">City <span class="muted">(blank = every city)</span></label><input type="text" id="wzCity" maxlength="60" placeholder="e.g. Ibadan"></div></div>' : '')
        + '<div class="row" style="margin-top:22px"><button class="btn" type="button" data-wzback>Back</button><button class="btn" type="button" id="wzFind">Look again</button><span class="spacer"></span>'
        + '<button class="btn orange big" type="button" id="wzAdd"' + (W.chosen ? '' : ' disabled') + '>Add this channel</button></div>';
    }
    $('wz').innerHTML = h;
    var f = $('wz').querySelector('button, a'); if (f && W.step === 1) f.focus();
    if (W.step === 2) { seenLine(); startWatch(); }
  }
  $('wz').addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-wzclose]')) { closeWizard(); return; }
    if (t.closest('[data-wzback]')) { W.step = Math.max(1, W.step - 1); if (W.step < 3) W.chosen = null; drawWizard(); return; }
    var pl = t.closest('[data-plat]'); if (pl) { W.platform = pl.dataset.plat; W.step = 2; drawWizard(); return; }
    if (t.closest('#wzFind')) { findAccounts(t.closest('#wzFind')); return; }
    var pk = t.closest('[data-pick]'); if (pk) { W.chosen = pk.dataset.pick; W.name = pk.dataset.name; drawWizard(); return; }
    var pu = t.closest('[data-pur]'); if (pu) { var k = pu.dataset.pur; W.purpose[k] = !W.purpose[k]; var c = $('wzCity') ? $('wzCity').value : ''; drawWizard(); if ($('wzCity')) $('wzCity').value = c; return; }
    if (t.closest('#wzAdd')) { addChannel(t.closest('#wzAdd')); }
  });
  function findAccounts(b) {
    var label = b.textContent; b.disabled = true; b.textContent = 'Asking TryPost…';
    api('trypost_accounts').then(function (d) {
      W.accounts = d.accounts || []; W.step = 3; drawWizard();
    }).catch(function (er) { toast(er.message); b.disabled = false; b.textContent = label; });
  }
  function addChannel(b) {
    var x = (W.accounts || []).filter(function (a) { return a.id === W.chosen; })[0]; if (!x) return;
    var city = $('wzCity') ? $('wzCity').value.trim() : '';
    b.disabled = true; b.textContent = 'Adding…';
    api('channel_add', { trypost_account_id: x.id, platform: x.platform, label: x.name || x.username, handle: x.username, city: city })
      .then(function (d) {
        var patch = { id: d.id };
        if (W.purpose.auto) patch.autopilot = true;
        if (W.purpose.mirror) patch.mirror = true;
        return (patch.autopilot || patch.mirror ? api('channel_update', patch) : Promise.resolve()).then(function () { return d; });
      })
      .then(function () {
        closeWizard(); toast('Added. ' + (W.purpose.mirror && !(S.overview && S.overview.twins_enabled) ? 'Sharing agencies’ posts is still switched off in Automation.' : 'It is ready.'));
        return loadOverview().then(function () { show('channels'); });
      })
      .catch(function (er) { b.disabled = false; b.textContent = 'Add this channel'; toast(er.message); });
  }

  /* ── create ───────────────────────────────────────────────────────── */
  function postable() {
    return ((S.overview || EMPTY).channels || []).filter(function (c) { return c.is_active && c.trypost_account_id && STUDIO_PLATFORMS.indexOf(c.platform) > -1; });
  }
  function renderPicks() {
    var list = postable();
    /* A channel switched off or removed is no longer a choice, and must not stay selected out of sight. */
    var ok = {}; list.forEach(function (c) { ok[c.id] = true; });
    Object.keys(S.picked).forEach(function (k) { if (!ok[k]) delete S.picked[k]; });
    $('picks').innerHTML = list.length ? list.map(function (c) {
      return '<button type="button" class="pick" data-ch="' + esc(c.id) + '" data-pl="' + esc(c.platform) + '" aria-pressed="' + (S.picked[c.id] ? 'true' : 'false') + '">' + badge(c.platform, 'sm') + esc(c.label || PL[c.platform]) + '</button>';
    }).join('') : '<button type="button" class="btn orange" data-addchan>Add a channel first</button>';
    $('picksNote').textContent = list.length ? (Object.keys(S.picked).some(function (k) { return S.picked[k]; }) ? '' : 'Tap the accounts that should get this post.') : '';
    count();
  }
  $('picks').addEventListener('click', function (e) {
    var b = e.target.closest('.pick'); if (!b) return;
    S.picked[b.dataset.ch] = !S.picked[b.dataset.ch];
    b.setAttribute('aria-pressed', String(!!S.picked[b.dataset.ch])); count(); renderPreview();
    $('picksNote').textContent = '';
  });
  function pickedPlatforms() {
    return postable().filter(function (c) { return S.picked[c.id]; }).map(function (c) { return c.platform; });
  }
  function count() {
    var n = $('caption').value.length, ps = pickedPlatforms(), msg = n + ' characters';
    if (ps.indexOf('x') > -1) msg += ' · X keeps about 280, so it will be shortened there';
    $('count').textContent = msg;
  }
  $('caption').addEventListener('input', function () { count(); renderPreview(); });
  function renderPreview() {
    var first = postable().filter(function (c) { return S.picked[c.id]; })[0] || postable()[0];
    var pf = first ? first.platform : 'instagram';
    $('pvBadge').className = 'pf sm pf-' + (PL[pf] ? pf : 'x'); $('pvBadge').textContent = GLYPH[pf] || 'S';
    $('pvName').textContent = first ? (first.label || first.handle || PL[pf]) : 'Your channel';
    $('pvSub').textContent = first ? PL[pf] : 'Preview';
    var cap = $('caption').value.trim();
    $('pvCap').textContent = cap || 'Your caption shows here.'; $('pvCap').className = 'ph-cap' + (cap ? '' : ' none');
    $('pvImg').innerHTML = S.media.length ? S.media.slice(0, 4).map(function (u) { return VIDEO_RE.test(u) ? '<video src="' + esc(u) + '#t=0.1" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>' : '<img alt="" src="' + esc(u) + '">'; }).join('') : 'Pictures show here';
    $('pvImg').style.gridTemplateColumns = S.media.length > 1 ? 'repeat(' + Math.min(S.media.length, 2) + ', 1fr)' : '';
  }

  /* Captions: from what the post is about, written by the AI in Synapse's voice. */
  function suggest() {
    var b = $('suggest'), brief = $('brief').value.trim();
    if (!brief) { toast('Say what the post is about first, or pick a home.'); $('brief').focus(); return Promise.resolve(); }
    b.disabled = true; b.textContent = 'Writing…';
    var ps = pickedPlatforms();
    return api('suggest_caption', { brief: brief, platform: ps[0] || '' }).then(function (d) {
      S.suggs = d.options || [];
      $('suggs').innerHTML = S.suggs.map(function (o, i) { return '<button type="button" class="sugg" data-i="' + i + '">' + esc(o) + '</button>'; }).join('');
      if (S.suggs.length) toast('Pick the one you like. You can edit it after.');
    }).catch(function (e) { toast(e.message); }).then(function () { b.disabled = false; b.textContent = '✨ Write captions'; });
  }
  $('suggest').addEventListener('click', suggest);
  $('suggs').addEventListener('click', function (e) {
    var b = e.target.closest('.sugg'); if (!b) return;
    var cap = S.suggs[Number(b.dataset.i)] || '';
    /* A post about a real home carries its link, so a tap lands on that home. */
    if (S.link && cap.indexOf(S.link) < 0) cap += '\n\n' + S.link;
    $('caption').value = cap; count(); renderPreview(); $('caption').focus();
  });

  /* Real homes to post about: live listings, with their photos. */
  function money(p, per) { var n = Number(p); if (!isFinite(n) || n <= 0) return ''; return '₦' + n.toLocaleString('en-NG') + (per ? '/' + String(per).replace(/ly$/, '').replace(/^per[ _]?/, '') : ''); }
  function loadHomes() {
    var q = SB_URL + '/rest/v1/properties?select=id,title,city,area_name,price,price_period,bedrooms,listing_type,property_media(url,display_order,media_type)'
      + '&status=eq.live&is_active=eq.true&deleted_at=is.null&order=created_at.desc&limit=14';
    fetch(q, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }).then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      S.homes = (Array.isArray(rows) ? rows : []).map(function (p) {
        var pics = (p.property_media || []).filter(function (m) { return m && m.url && (!m.media_type || /image|photo/i.test(m.media_type)); })
          .sort(function (a, b) { return (a.display_order || 0) - (b.display_order || 0); }).map(function (m) { return m.url; });
        return { id: p.id, title: p.title, city: p.city, area: p.area_name, price: p.price, per: p.price_period, beds: p.bedrooms, type: p.listing_type, pics: pics };
      }).filter(function (h) { return h.pics.length; });
      $('homes').innerHTML = S.homes.length ? S.homes.map(function (h, i) {
        return '<button type="button" class="home" data-h="' + i + '"><div class="ph" style="background-image:url(\'' + esc(h.pics[0]) + '\')"></div><div class="t"><b>' + esc(h.title) + '</b>'
          + '<span class="muted">' + esc([h.area, h.city].filter(Boolean).join(', ')) + '</span><br><span>' + esc(money(h.price, h.type === 'rent' ? h.per : '')) + '</span></div></button>';
      }).join('') : '<div class="empty">No live homes with photos right now.</div>';
    }).catch(function () { $('homes').innerHTML = '<div class="empty">Could not load homes.</div>'; });
  }
  $('homes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-h]'); if (!b) return;
    var h = (S.homes || [])[Number(b.dataset.h)]; if (!h) return;
    S.media = h.pics.slice(0, 3); renderThumbs();
    S.link = 'https://www.synapsecore.dev/app/property.html?id=' + encodeURIComponent(h.id);
    var where = [h.area, h.city].filter(Boolean).join(', ');
    $('brief').value = (h.type === 'rent' ? 'A home to rent' : 'A home for sale') + ': ' + h.title + (where ? ' in ' + where : '') + (h.beds ? ', ' + h.beds + ' bedroom' + (h.beds === 1 ? '' : 's') : '') + (money(h.price, h.type === 'rent' ? h.per : '') ? ', ' + money(h.price, h.type === 'rent' ? h.per : '') : '') + '. Checked on Synapse.';
    toast('Photos added. Writing captions…');
    suggest();
  });

  /* pictures: your own uploads, or the ones taken from a home */
  function renderThumbs() {
    $('thumbs').innerHTML = S.media.map(function (u, i) { return '<div class="thumb">' + (VIDEO_RE.test(u) ? '<video src="' + esc(u) + '#t=0.1" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>' : '<img alt="" src="' + esc(u) + '">') + '<button type="button" data-rm="' + i + '" aria-label="Remove">×</button></div>'; }).join('')
      + (S.media.length < 10 ? '<button type="button" class="drop" id="addPic"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>Add</span></button>' : '');
    renderPreview();
  }
  $('thumbs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (b) { S.media.splice(Number(b.dataset.rm), 1); renderThumbs(); return; }
    if (e.target.closest('#addPic')) $('pic').click();
  });
  $('pic').addEventListener('change', function () {
    var files = [].slice.call($('pic').files || []).slice(0, 10 - S.media.length);
    if (!files.length) return;
    S.uploading = (S.uploading || 0) + 1;
    $('send').disabled = true;
    var add = $('addPic'); if (add) { add.disabled = true; add.lastChild.textContent = 'Uploading…'; }
    SynAuth.client().then(function (c) {
      return files.reduce(function (p, f) {
        return p.then(function () {
          var isVid = /^video\/(mp4|quicktime)$/.test(f.type);
          if (!isVid && !/^image\/(jpeg|png|webp)$/.test(f.type)) { toast('Use JPG, PNG or WEBP pictures, or an MP4 or MOV video.'); return; }
          if (!isVid && f.size > 8 * 1024 * 1024) { toast(f.name + ' is over 8MB.'); return; }
          if (isVid && f.size > 50 * 1024 * 1024) { toast(f.name + ' is over 50MB. Compress it or trim it, then add it again.'); return; }
          var ext = isVid ? (f.type === 'video/quicktime' ? 'mov' : 'mp4') : f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
          var d = new Date(), path = d.getUTCFullYear() + '/' + (d.getUTCMonth() + 1) + '/' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())) + '.' + ext;
          return c.storage.from('synapse-media').upload(path, f, { contentType: f.type, cacheControl: '31536000', upsert: false }).then(function (r) {
            if (r.error) { toast('Could not upload ' + f.name + '.'); return; }
            S.media.push(c.storage.from('synapse-media').getPublicUrl(path).data.publicUrl);
          });
        });
      }, Promise.resolve());
    }).catch(function () { toast('Upload failed. Try again.'); })
      .then(function () {
        S.uploading = Math.max(0, (S.uploading || 1) - 1);
        $('pic').value = ''; renderThumbs();
        if (!S.uploading && !S.sending) $('send').disabled = false;
      });
  });

  /* ── when: now, one time, or several ─────────────────────────────── */
  S.times = [''];
  function setWhen(w) {
    S.when = w;
    ['now', 'later', 'many'].forEach(function (k) { $('when' + k.charAt(0).toUpperCase() + k.slice(1)).setAttribute('aria-pressed', String(w === k)); });
    $('atWrap').hidden = w !== 'later'; $('manyWrap').hidden = w !== 'many';
    $('sendMore').hidden = w === 'now';
    $('send').textContent = w === 'now' ? 'Post' : w === 'many' ? 'Schedule all' : 'Schedule';
    if (w === 'many') renderTimes();
  }
  /* A datetime-local value in this device's clock, from a Date. */
  function localStamp(d) {
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes());
  }
  function renderTimes() {
    if (!S.times.length) S.times = [''];
    $('manyList').innerHTML = S.times.map(function (t, i) {
      return '<div class="row" style="gap:8px"><span class="dot" style="width:26px;height:26px;font-size:12px">' + (i + 1) + '</span>'
        + '<input type="datetime-local" class="grow" data-ti="' + i + '" value="' + esc(t) + '" aria-label="Time ' + (i + 1) + '">'
        + (S.times.length > 1 ? '<button class="btn sm" type="button" data-tdel="' + i + '" aria-label="Remove time ' + (i + 1) + '">×</button>' : '') + '</div>';
    }).join('');
    var n = S.times.filter(Boolean).length, a = Object.keys(S.picked).filter(function (k) { return S.picked[k]; }).length;
    $('manySummary').innerHTML = n ? '<b>' + n * Math.max(a, 1) + '</b> <span class="muted">post' + (n * Math.max(a, 1) === 1 ? '' : 's') + ' will be scheduled (' + n + ' time' + (n === 1 ? '' : 's') + (a ? ' \u00d7 ' + a + ' account' + (a === 1 ? '' : 's') : '') + ').</span>' : '<span class="muted">Add at least one time.</span>';
  }
  $('manyList').addEventListener('input', function (e) { var i = e.target.closest('[data-ti]'); if (i) { S.times[Number(i.dataset.ti)] = i.value; renderTimes(); var again = $('manyList').querySelector('[data-ti="' + i.dataset.ti + '"]'); if (again) again.focus(); } });
  $('manyList').addEventListener('click', function (e) { var d = e.target.closest('[data-tdel]'); if (d) { S.times.splice(Number(d.dataset.tdel), 1); renderTimes(); } });
  $('addTime').addEventListener('click', function () {
    /* The new row starts a day after the last one, at the same hour: the usual next thing. */
    var last = S.times.filter(Boolean).slice(-1)[0], nxt = '';
    if (last) { var d = new Date(last); d.setDate(d.getDate() + 1); nxt = localStamp(d); }
    if (S.times.length === 1 && !S.times[0]) S.times[0] = nxt; else S.times.push(nxt);
    renderTimes();
  });
  $('repeatBtn').addEventListener('click', function () {
    $('repeatBox').hidden = !$('repeatBox').hidden;
    if (!$('repeatBox').hidden && !$('rpStart').value) { var d = new Date(Date.now() + 3600e3); d.setMinutes(0, 0, 0); $('rpStart').value = localStamp(d); }
  });
  $('rpFill').addEventListener('click', function () {
    var start = $('rpStart').value; if (!start) { toast('Choose the first time.'); return; }
    var every = Number($('rpEvery').value), count = Math.max(2, Math.min(30, Math.round(Number($('rpCount').value) || 7))), out = [], d = new Date(start);
    for (var i = 0; i < count; i++) { out.push(localStamp(d)); d = new Date(d.getTime()); d.setDate(d.getDate() + every); }
    S.times = out; $('repeatBox').hidden = true; renderTimes();
  });
  $('whenNow').addEventListener('click', function () { setWhen('now'); });
  $('whenLater').addEventListener('click', function () { setWhen('later'); });
  $('whenMany').addEventListener('click', function () { setWhen('many'); });

  /* Send. "Schedule and write another" keeps the accounts and the times, and clears only the post itself, so a week of
     posts can be set up one after another without choosing the same things again. */
  function submit(another) {
    if (S.uploading) { toast('Wait for the pictures to finish uploading.'); return; }
    var avail = {}; postable().forEach(function (c) { avail[c.id] = true; });
    var ids = Object.keys(S.picked).filter(function (k) { return S.picked[k] && avail[k]; });
    if (!ids.length) { toast('Tap the accounts that should get this post.'); return; }
    var chosen = postable().filter(function (c) { return ids.indexOf(c.id) > -1; });
    var wantsVideo = chosen.some(function (c) { return c.platform === 'youtube'; });
    var hasVid = S.media.some(function (u) { return VIDEO_RE.test(u); });
    if (wantsVideo && !(S.media.length === 1 && hasVid)) { toast('YouTube takes one video and nothing else. Add the video and remove any pictures, or untick YouTube.'); return; }
    if (hasVid && chosen.some(function (c) { return c.platform !== 'youtube'; })) { toast('Only YouTube takes a video from here. Untick the other accounts, or remove the video.'); return; }
    var body = { caption: $('caption').value, media_urls: S.media, channel_ids: ids };
    if (S.when === 'later') {
      if (!$('at').value) { toast('Pick a date and time, or choose Now.'); return; }
      body.scheduled_at = new Date($('at').value).toISOString();
    } else if (S.when === 'many') {
      var ts = S.times.filter(Boolean).map(function (t) { return new Date(t); });
      if (!ts.length) { toast('Add at least one time.'); return; }
      if (ts.some(function (d) { return d.getTime() < Date.now() - 60000; })) { toast('One of the times has already passed. Change it, or remove it.'); return; }
      body.scheduled_times = ts.map(function (d) { return d.toISOString(); });
    }
    S.sending = true; var b = another ? $('sendMore') : $('send'), label = b.textContent; b.disabled = true; b.textContent = 'Sending…';
    api('compose', body).then(function (d) {
      toast(S.when === 'many' ? 'Scheduled ' + d.count + ' post' + (d.count === 1 ? '' : 's') + '.' : S.when === 'later' ? 'Scheduled for ' + when(d.at) + '.' : 'On its way.');
      $('caption').value = ''; S.media = []; S.link = ''; $('brief').value = ''; renderThumbs(); $('suggs').innerHTML = '';
      if (!another) { S.picked = {}; if (S.when === 'many') { S.times = ['']; renderTimes(); } }
      else { $('at').value = ''; if ($('caption')) $('caption').focus(); }
      renderPicks(); renderPreview();
      return loadPosts();
    }).catch(function (e) { toast(e.message); }).then(function () { S.sending = false; b.disabled = !!S.uploading; b.textContent = label; });
  }
  $('send').addEventListener('click', function () { submit(false); });
  $('sendMore').addEventListener('click', function () { submit(true); });
  $('picks').addEventListener('click', function () { if (S.when === 'many') renderTimes(); });

  function statusPill(s) {
    if (s === 'live') return '<span class="pill ok">Live</span>';
    if (s === 'sent') return '<span class="pill warn">Sent, not live yet</span>';
    if (s === 'failed') return '<span class="pill bad">Failed</span>';
    if (s === 'cancelled') return '<span class="pill">Stopped</span>';
    if (s === 'publishing') return '<span class="pill warn">Sending</span>';
    return '<span class="pill hot">Scheduled</span>';
  }
  function dayLabel(ts) {
    try {
      var d = new Date(ts), now = new Date();
      var key = function (x) { return x.toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' }); };
      var tom = new Date(now.getTime() + 86400e3);
      if (key(d) === key(now)) return 'Today';
      if (key(d) === key(tom)) return 'Tomorrow';
      return d.toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'short' });
    } catch (e) { return ''; }
  }
  function loadPosts() {
    return api('posts').then(function (d) {
      var p = d.posts || []; S.posts = p;
      /* Waiting posts first, soonest first, grouped by day; then what has gone out, newest first. */
      var waiting = p.filter(function (x) { return x.status === 'scheduled'; }).sort(function (a, b) { return new Date(a.scheduled_at) - new Date(b.scheduled_at); });
      var done = p.filter(function (x) { return x.status !== 'scheduled'; });
      var batches = {}; waiting.forEach(function (x) { batches[x.group_id] = (batches[x.group_id] || 0) + 1; });
      var row = function (x) {
        var ch = x.channel || {};
        return '<div class="item"><div class="item-top">' + badge(x.platform, 'sm') + '<b>' + esc(ch.label || ch.handle || PL[x.platform]) + '</b>'
          + statusPill(x.status) + '<span class="muted small">' + esc(when(x.published_at || x.scheduled_at)) + '</span><span class="spacer"></span>'
          + (x.status === 'scheduled' ? '<button class="btn sm" data-cancel="' + esc(x.id) + '" type="button">Stop</button>' : '') + '</div>'
          + '<div class="item-text">' + esc(String(x.caption || '').slice(0, 220)) + '</div>'
          + (x.failure_reason ? '<div class="small" style="color:var(--bad)">' + esc(x.failure_reason) + '</div>' : '') + '</div>';
      };
      var html = '', lastDay = '', shownBatch = {};
      waiting.forEach(function (x) {
        var dl = dayLabel(x.scheduled_at);
        if (dl !== lastDay) { html += '<div class="k" style="margin:18px 0 2px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)">' + esc(dl) + '</div>'; lastDay = dl; }
        html += row(x);
        if (batches[x.group_id] > 1 && !shownBatch[x.group_id]) shownBatch[x.group_id] = 1;
      });
      var big = Object.keys(batches).filter(function (g) { return batches[g] > 1; });
      if (big.length) html = '<div class="row" style="margin-bottom:6px">' + big.map(function (g) { return '<button class="btn sm danger" type="button" data-stopbatch="' + esc(g) + '">Stop all ' + batches[g] + ' in one batch</button>'; }).join('') + '</div>' + html;
      if (done.length) html += '<div class="k" style="margin:22px 0 2px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)">Recent</div>' + done.map(row).join('');
      $('postList').innerHTML = html || '<div class="empty">Nothing yet. Your first post will show here.</div>';
      renderHome();
    }).catch(function (e) { $('postList').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
  }
  $('postList').addEventListener('click', function (e) {
    var sb = e.target.closest('[data-stopbatch]');
    if (sb) {
      if (!window.confirm('Stop every post in this batch that has not gone out yet?')) return;
      sb.disabled = true;
      api('post_cancel', { group_id: sb.dataset.stopbatch }).then(function (r) { toast('Stopped ' + (r.stopped || 'them') + '.'); loadPosts(); }).catch(function (er) { toast(er.message); loadPosts(); });
      return;
    }
    var b = e.target.closest('[data-cancel]'); if (!b) return; b.disabled = true;
    api('post_cancel', { id: b.dataset.cancel }).then(function () { toast('Stopped.'); loadPosts(); }).catch(function (er) { toast(er.message); loadPosts(); });
  });

  /* ── automation ───────────────────────────────────────────────────── */
  function renderAuto() {
    var o = S.overview, ch = o.channels || [];
    var auto = ch.filter(function (c) { return c.is_active && c.autopilot; });
    var mir = ch.filter(function (c) { return c.is_active && c.mirror; }).length + (o.legacy || []).filter(function (l) { return l.is_active; }).length;
    $('autoSummary').textContent = auto.length
      ? auto.length + ' channel' + (auto.length === 1 ? '' : 's') + ' on autopilot, drawing on ' + o.live_listings + ' live listing' + (o.live_listings === 1 ? '' : 's') + '.'
      : 'No channel is on autopilot yet.';
    $('twinSw').setAttribute('aria-checked', String(!!o.twins_enabled)); $('twinSw').disabled = !!S.loadFailed;
    $('mirrorSummary').textContent = o.twins_enabled
      ? mir + ' channel' + (mir === 1 ? '' : 's') + ' will receive the next agency post.'
      : (S.loadFailed ? 'The setting could not be loaded. Reload to see it.' : 'Off. Agencies’ posts stay on their own accounts.');
  }
  $('twinSw').addEventListener('click', function () {
    var on = $('twinSw').getAttribute('aria-checked') !== 'true';
    if (on && !window.confirm('Switch on sharing? Every post an agency makes will also go out on the channels set to receive it.')) return;
    $('twinSw').setAttribute('aria-checked', String(on));
    api('settings_set', { twins_enabled: on }).then(function () { toast(on ? 'Sharing is on.' : 'Sharing is off.'); return loadOverview(); })
      .catch(function (e) { toast(e.message); loadOverview(); });
  });

  /* ── activity ─────────────────────────────────────────────────────── */
  var KIND = { autopilot: 'Autopilot', mirrored: 'Shared from an agency', studio: 'Studio post' };
  function actRow(x) {
    var st = x.status === 'published' || x.delivery === 'live' || x.status === 'live' ? 'live' : x.status;
    return '<div class="item"><div class="item-top">' + badge(x.platform, 'sm') + '<b>' + esc(x.channel || PL[x.platform]) + '</b><span class="pill">' + esc(KIND[x.kind] || x.kind) + '</span>'
      + statusPill(st === 'published' ? 'live' : st) + '<span class="muted small">' + esc(when(x.at)) + '</span></div>'
      + '<div class="item-text">' + esc(String(x.text || '').slice(0, 200)) + '</div>'
      + (x.failure ? '<div class="small" style="color:var(--bad)">' + esc(x.failure) + '</div>' : '') + '</div>';
  }
  function loadActivity() {
    api('activity').then(function (d) {
      var a = Array.isArray(d) ? d : []; S.activity = a;
      $('actList').innerHTML = a.length ? a.slice(0, 60).map(actRow).join('') : '<div class="empty">Nothing has posted yet.</div>';
      $('homeAct').innerHTML = a.length ? a.slice(0, 4).map(actRow).join('') : '<div class="empty">Nothing has posted yet. Once a channel is on, its posts show here.</div>';
    }).catch(function (e) { $('actList').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; $('homeAct').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
  }

  /* ── team ─────────────────────────────────────────────────────────── */
  function loadStaff() {
    api('staff_list').then(function (d) {
      var s = d.staff || [];
      $('staffList').innerHTML = s.length ? s.map(function (x) {
        return '<div class="opt"><div class="grow"><b>' + esc(x.email || 'Unknown') + '</b><small>' + (x.role === 'admin' ? 'Admin' : 'Social media manager')
          + ' · ' + (x.joined ? 'Joined' : 'Invitation not opened yet') + '</small></div>'
          + (x.joined ? '' : '<button class="btn sm" data-linkstaff="' + esc(x.profile_id) + '" type="button">Copy link</button>')
          + '<button class="btn sm danger" data-rmstaff="' + esc(x.profile_id) + '" type="button">Remove</button></div>';
      }).join('') : '<div class="empty">Only founders so far.</div>';
    }).catch(function (e) { $('staffList').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
  }
  /* Show a join link for the admin to pass on, with a Copy button. */
  function showLink(email, link, why) {
    var r = $('inviteRes');
    r.hidden = false;
    r.innerHTML = '<div class="card" style="box-shadow:none"><b>Send them this link</b>'
      + '<p class="muted small" style="margin-top:6px">' + (why ? esc(why) + ' ' : '') + 'Copy the link and send it to ' + esc(email) + ' yourself, by WhatsApp or email. It works once.</p>'
      + '<div class="row" style="margin-top:12px"><input type="text" readonly id="linkBox" class="grow" value="' + esc(link) + '" aria-label="Invitation link">'
      + '<button class="btn sm primary" id="linkCopy" type="button">Copy</button></div></div>';
    $('linkCopy').addEventListener('click', function () { copyLink(link, $('linkCopy')); });
  }
  function copyLink(link, btn) {
    var done = function () { toast('Link copied.'); if (btn) { var w = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = w; }, 1600); } };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(link).then(done, function () { window.prompt('Copy this link:', link); }); }
    else { window.prompt('Copy this link:', link); }
  }
  $('mAdd').addEventListener('click', function () {
    var b = $('mAdd'), email = $('mEmail').value.trim(); b.disabled = true; b.textContent = 'Sending…';
    $('inviteRes').hidden = true;
    api('staff_invite', { email: email, role: $('mRole').value }).then(function (d) {
      if (d.status === 'emailed') { toast('Invitation sent to ' + email + '.'); $('inviteRes').hidden = false; $('inviteRes').innerHTML = '<p class="small" style="color:var(--ok)">Invitation sent to <b>' + esc(email) + '</b>. The email has a link that brings them here to create their account.</p>'; }
      else if (d.status === 'existing') { toast('They already have an account.'); $('inviteRes').hidden = false; $('inviteRes').innerHTML = '<p class="small" style="color:var(--ok)"><b>' + esc(email) + '</b> already has a Synapse account and now has studio access. They sign in as usual.</p>'; }
      else if (d.link) { showLink(email, d.link, d.status === 'link' ? 'The email could not be sent (' + (d.reason || 'no reason given') + ').' : ''); }
      $('mEmail').value = ''; loadStaff();
    }).catch(function (e) { toast(e.message); }).then(function () { b.disabled = false; b.textContent = 'Send invitation'; });
  });
  $('staffList').addEventListener('click', function (e) {
    var lk = e.target.closest('[data-linkstaff]');
    if (lk) {
      lk.disabled = true;
      api('staff_link', { profile_id: lk.dataset.linkstaff }).then(function (d) { copyLink(d.link, null); }).catch(function (er) { toast(er.message); }).then(function () { lk.disabled = false; });
      return;
    }
    var b = e.target.closest('[data-rmstaff]'); if (!b || !window.confirm('Remove their access to the studio?')) return;
    api('staff_remove', { profile_id: b.dataset.rmstaff }).then(function () { toast('Removed.'); loadStaff(); }).catch(function (er) { toast(er.message); });
  });

  renderThumbs();
  if (window.SynAuth && SynAuth.ready) start(); else $('gate').textContent = 'There is nothing here.';
})();
