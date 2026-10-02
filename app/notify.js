/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — notifications & proximity (client)

   Three jobs:
     1. TYPES — one table mapping every notification kind to its copy and the
        screen it opens, for both sides of the marketplace. Routing lives here
        as data, so nothing downstream needs a switch statement.
     2. PUSH — register the service worker, ask permission at a moment that
        makes sense, store the subscription server-side.
     3. PROXIMITY — report position so the SERVER can evaluate the geofence.

   HONEST LIMIT, stated once and repeated in the UI:
   a browser cannot watch your location once the page is closed. There is no
   web geofencing API. While a Synapse tab is open we report position and the
   server evaluates; with the tab closed, pings only continue if the native app
   is installed and reporting in the background. Everything else in this
   pipeline — matching, dedupe, quiet hours, delivery — is identical either way,
   so the native app plugs in without changing any of it.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
  var ANON_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';

  /* ── 1 · Notification types → copy + destination ────────────────────────
     `route` is what the service worker opens and what the in-app centre links
     to. Keep every new kind in this table rather than special-casing it. */
  var TYPES = {
    /* customer side */
    /* PROXIMITY NO LONGER SHOWS ONLY VERIFIED HOMES, so it can no longer say
       "verified" as a constant. It used to read 'A verified home, right where
       you are' whatever arrived, which was survivable only while the matcher
       refused to return anything else. The moment that gate came off, the same
       line became a false claim on a stranger's lock screen, sending them to an
       address on the strength of it.

       `d.verified` is strictly true or false, never truthy: a field that went
       missing because somebody renamed a column has to read as NOT verified.
       The safe default for a claim is refusing to make it.

       "not yet verified" and not "unverified" — the listing is not accused of
       anything, it has simply not been checked yet. Same words property.html
       uses, so the notification and the page it opens agree. */
    proximity_match:    { side: 'customer', icon: 'pin',      route: 'property.html',
                          title: function (d) {
                            return d.verified === true
                              ? 'A verified home, right where you are'
                              : 'A home right where you are';
                          },
                          body: function (d) {
                            return d.title + ' · ' + d.distance + 'm away · '
                              + (d.verified === true ? 'verified by Synapse' : 'not yet verified');
                          } },
    new_match:          { side: 'customer', icon: 'spark',    route: 'browse.html',
                          title: 'Tayo found something new',
                          body: function (d) { return d.count + ' new verified home' + (d.count === 1 ? '' : 's') + ' fit your brief.'; } },
    price_drop:         { side: 'customer', icon: 'costs',    route: 'property.html',
                          title: 'The price moved',
                          body: function (d) { return d.title + ' dropped to ' + d.price + '.'; } },
    expiring_saved:     { side: 'customer', icon: 'pending',  route: 'browse.html',
                          title: 'A saved home is about to disappear',
                          body: function (d) { return d.title + ' has not been re-confirmed — it drops off in ' + d.days + ' days.'; } },
    agent_replied:      { side: 'customer', icon: 'chat',     route: 'property.html',
                          title: 'The agent replied',
                          body: function (d) { return d.agency + ' answered about ' + d.title + '.'; } },
    viewing_confirmed:  { side: 'customer', icon: 'check',    route: 'property.html',
                          title: 'Your viewing is confirmed',
                          body: function (d) { return d.title + ' · ' + d.when + '.'; } },

    /* agency side */
    new_lead:           { side: 'agency', icon: 'users',      route: 'agency.html#crm',
                          title: 'New qualified lead',
                          body: function (d) { return d.name + ' · ' + d.budget + ' · ' + d.area + '.'; } },
    lead_hot:           { side: 'agency', icon: 'negotiate',  route: 'agency.html#crm',
                          title: 'A lead just turned hot',
                          body: function (d) { return d.name + ' asked to view ' + d.title + '.'; } },
    listing_expiring:   { side: 'agency', icon: 'pending',    route: 'agency.html#listings',
                          title: 'A listing needs re-confirming',
                          body: function (d) { return d.title + ' drops off in ' + d.days + ' days unless you confirm it.'; } },
    verification_done:  { side: 'agency', icon: 'verified',   route: 'agency.html#listings',
                          title: 'Verification finished',
                          body: function (d) { return d.title + ' passed ' + d.passed + ' of 7 checks.'; } },
    campaign_published: { side: 'agency', icon: 'share',      route: 'agency.html#social',
                          title: 'Your campaign went out',
                          body: function (d) { return d.count + ' posts published across ' + d.channels + ' channels.'; } },
    proximity_hit:      { side: 'agency', icon: 'pin',        route: 'agency.html#marketing',
                          title: 'Someone walked past your listing',
                          body: function (d) { return d.count + ' nearby buyer' + (d.count === 1 ? '' : 's') + ' saw ' + d.title + '.'; } },
  };

  function render(kind, data) {
    var t = TYPES[kind];
    if (!t) return null;
    /* A title may be a string or a function, because one of them has to change
       with the data: proximity cannot call a home verified until it knows that
       it is. Every other entry stays a plain string and is unaffected. Wrapped
       in the same try/catch as the body — a copy function that throws must
       cost the wording, never the notification. */
    var title = typeof t.title === 'function'
      ? (function () { try { return t.title(data || {}); } catch (e) { return ''; } })()
      : t.title;
    return { kind: kind, side: t.side, icon: t.icon, route: t.route,
             title: title, body: (function () { try { return t.body(data || {}); } catch (e) { return ''; } })() };
  }

  /* ── 2 · Service worker + push ─────────────────────────────────────────── */
  var swReg = null;
  function registerSW() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register('sw.js')
      .then(function (r) { swReg = r; return r; })
      .catch(function () { return null; });
  }

  // Route messages the worker sends back (tap while a tab is already open).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      var m = e.data || {};
      if (m.type === 'syn:navigate' && m.route) window.location.href = m.route;
      if (m.type === 'syn:mute-proximity') setProximity(false);
    });
  }

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function permission() { return ('Notification' in window) ? Notification.permission : 'unsupported'; }

  // Ask ONLY on a real user gesture, and only once they have a reason to say
  // yes. A cold permission prompt on page load is how you get denied forever.
  function askPermission() {
    if (!pushSupported()) return Promise.resolve('unsupported');
    if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
    return Notification.requestPermission();
  }

  function subscribe(opts) {
    opts = opts || {};
    if (!pushSupported()) return Promise.resolve(null);
    return registerSW().then(function (reg) {
      if (!reg || Notification.permission !== 'granted') return null;
      // The VAPID public key is public by definition; it is served by the app,
      // never hard-coded next to a private key.
      return fetch(SUPABASE_URL + '/functions/v1/push-key', {
        headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (k) {
          if (!k || !k.publicKey) return null;   // push not configured yet
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8(k.publicKey),
          });
        })
        .then(function (sub) {
          if (!sub) return null;
          return saveSubscription(sub, opts.side || 'customer');
        })
        .catch(function () { return null; });
    });
  }

  /* Both of these used to POST straight to /rest/v1. Neither table allows an
     anonymous write — the policy is `authenticated` AND user_id = auth.uid() —
     so proximity could never be switched on without an account, which is the
     opposite of the intent. push-subscribe now owns both writes with the
     service role and binds each row to the caller's own identity. */
  function saveSubscription(sub, side) {
    var j = sub.toJSON();
    return callFn('subscribe', {
      side: side,
      subscription: {
        endpoint: j.endpoint,
        p256dh: j.keys && j.keys.p256dh,
        auth: j.keys && j.keys.auth,
      },
    }).then(function () { return sub; });
  }

  function callFn(action, extra) {
    return authHeaders().then(function (h) {
      var payload = { action: action, visitorId: visitorId() };
      for (var k in extra) payload[k] = extra[k];
      return fetch(SUPABASE_URL + '/functions/v1/push-subscribe', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, h),
        body: JSON.stringify(payload),
      });
    });
  }

  function urlB64ToUint8(b64) {
    var pad = '='.repeat((4 - (b64.length % 4)) % 4);
    var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  /* ── 3 · Proximity ─────────────────────────────────────────────────────── */
  var WATCH_KEY = 'synapse_proximity_v1';
  var watchId = null, lastReport = 0;

  function proximityOn() {
    try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '{}').on === true; } catch (e) { return false; }
  }
  function setProximity(on) {
    try {
      var s = JSON.parse(localStorage.getItem(WATCH_KEY) || '{}');
      s.on = !!on;
      localStorage.setItem(WATCH_KEY, JSON.stringify(s));
    } catch (e) {}
    if (on) { startWatching(); } else {
      stopWatching();
      // The row stays behind otherwise, still enabled, and would resume the
      // moment any page reported a position again.
      callFn('disable', {}).catch(function () {});
    }
    document.dispatchEvent(new CustomEvent('syn:proximity', { detail: { on: !!on } }));
  }

  // Explicit opt-in, on a gesture. Location is sensitive: we ask plainly, we
  // never start silently, and turning it off actually stops the watch.
  function enableProximity(criteria) {
    return askPermission().then(function (p) {
      if (p !== 'granted') return { ok: false, reason: p };
      return subscribe({ side: 'customer' }).then(function () {
        return upsertWatch(criteria || {});
      }).then(function () {
        setProximity(true);
        return { ok: true };
      });
    });
  }

  function upsertWatch(c) {
    return callFn('watch', { criteria: c || {} }).catch(function () {});
  }

  // While a page is open we report position; the SERVER decides everything
  // else. Throttled hard — a property search does not need metre-by-metre
  // tracking, and battery matters more than precision here.
  function startWatching() {
    if (watchId != null || !navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(function (pos) {
      var now = Date.now();
      if (now - lastReport < 60000) return;            // at most once a minute
      lastReport = now;
      report(pos.coords.latitude, pos.coords.longitude);
    }, function () { /* denied or unavailable — stay quiet */ },
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 30000 });
  }
  function stopWatching() {
    if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  function report(lat, lon) {
    authHeaders().then(function (h) {
      return fetch(SUPABASE_URL + '/functions/v1/proximity-report', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, h),
        body: JSON.stringify({ lat: lat, lon: lon, visitorId: visitorId() }),
      });
    }).catch(function () { /* offline is fine — the next fix will report */ });
  }

  /* ── helpers ───────────────────────────────────────────────────────────── */
  function visitorId() { try { return localStorage.getItem('toju_visitor_v1'); } catch (e) { return null; } }
  function currentUserId() {
    var u = window.SynAuth && SynAuth.user && SynAuth.user();
    return u ? u.id : null;
  }
  function authHeaders() {
    var base = { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY };
    if (!window.SynAuth || !SynAuth.client) return Promise.resolve(base);
    return SynAuth.client().then(function (c) { return c.auth.getSession(); })
      .then(function (r) {
        var tok = r && r.data && r.data.session && r.data.session.access_token;
        return tok ? { apikey: ANON_KEY, Authorization: 'Bearer ' + tok } : base;
      }).catch(function () { return base; });
  }

  /* ── in-app notification centre ────────────────────────────────────────── */
  function fetchNotifications(side) {
    return authHeaders().then(function (h) {
      var q = '/rest/v1/notifications?select=id,kind,route,payload,read_at,created_at,property_id'
        + '&order=created_at.desc&limit=25' + (side ? '&side=eq.' + side : '');
      return fetch(SUPABASE_URL + q, { headers: h })
        .then(function (r) { return r.ok ? r.json() : []; });
    }).catch(function () { return []; });
  }
  function markRead(id) {
    return authHeaders().then(function (h) {
      return fetch(SUPABASE_URL + '/rest/v1/notifications?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: Object.assign({ 'Content-Type': 'application/json' }, h),
        body: JSON.stringify({ read_at: new Date().toISOString() }),
      });
    }).catch(function () {});
  }

  window.SynNotify = {
    TYPES: TYPES, render: render,
    registerSW: registerSW, pushSupported: pushSupported, permission: permission,
    askPermission: askPermission, subscribe: subscribe,
    enableProximity: enableProximity, setProximity: setProximity, proximityOn: proximityOn,
    fetchNotifications: fetchNotifications, markRead: markRead,
    // true only while a page is open — see the note at the top of this file
    backgroundCapable: function () { return false; },
  };

  /* ── opt-in control ────────────────────────────────────────────────────
     Mounts into <div data-proximity-slot></div>. Deliberately plain about
     what it does and what it cannot do — location is not something to opt
     someone into with a cheerful half-truth. */
  function mountProximity() {
    document.querySelectorAll('[data-proximity-slot]').forEach(function (slot) {
      if (slot.__mounted) return;
      slot.__mounted = true;
      paint(slot);
    });
  }

  function paint(slot) {
    var on = proximityOn();
    var supported = pushSupported() && !!navigator.geolocation;
    var perm = permission();

    if (!supported) {
      slot.innerHTML = '<div class="prox-card"><div class="prox-txt">'
        + '<b>Homes near you</b>'
        + '<span>This browser cannot do location alerts. It works on Chrome for Android, '
        + 'or on iPhone once Synapse is added to your Home Screen.</span>'
        + '</div></div>';
      return;
    }

    /* BLOCKED IS A DEAD END UNLESS WE SAY HOW TO LEAVE IT. Once a browser has
       denied notifications for a site, requestPermission() resolves 'denied'
       immediately and shows nobody a prompt, so the button genuinely cannot do
       anything and is right to be disabled. What was wrong was WHERE the
       explanation lived: a title tooltip, which on a phone has no hover to
       reveal it and is simply unreachable. A tester on Android got a dead
       button reading "Blocked" and nowhere to find out why — which is the
       whole of the failure, since the fix is thirty seconds in site settings.
       It goes in the card now, where a thumb can read it. */
    var blocked = (perm === 'denied' && !on);

    slot.innerHTML = '<div class="prox-card' + (on ? ' on' : '') + '">'
      + '<span class="prox-pin"><i></i></span>'
      + '<div class="prox-txt">'
      + '<b>' + (on ? 'Watching for homes near you'
                    : (blocked ? 'Notifications are switched off for Synapse'
                               : 'Tell me when I walk past one')) + '</b>'
      /* "Verified homes only" was true until proximity started including
         unverified listings and labelling them instead. Leaving it would have
         promised a filter that no longer exists — the same stale claim the
         push templates carried, in the one place a person reads before opting
         in. Say what actually happens: everything near you, each one told
         straight. */
      + '<span>' + (blocked
          ? 'Your browser is blocking them, so we cannot ask again from here.'
          : (on
            ? 'While Synapse is open we check your surroundings against your brief. Every home says whether we have verified it, at most a few a day, never between 9:30pm and 8am.'
            : 'We check homes near you against your brief and tell you plainly whether each one has been verified. You choose the areas, and you can switch it off any time.'))
        + '</span>'
      + (blocked
          ? '<span class="prox-note">To turn it back on: open your browser’s settings for this site '
            + '— in Chrome, tap ⋮ → Site settings → Notifications; on iPhone, Settings → '
            + 'Notifications → Synapse — set it to Allow, then reload this page.</span>'
          : '')
      + (on ? '<span class="prox-note">Walking around with Synapse closed needs the mobile app — a browser cannot check your location once the tab is gone.</span>' : '')
      + '</div>'
      + '<button type="button" class="prox-btn">' + (on ? 'Turn off' : (blocked ? 'Blocked' : 'Turn on')) + '</button>'
      + '</div>';

    var btn = slot.querySelector('.prox-btn');
    if (blocked) { btn.disabled = true; return; }

    btn.addEventListener('click', function () {
      if (proximityOn()) { setProximity(false); paint(slot); return; }
      btn.disabled = true; btn.textContent = 'Asking…';
      enableProximity(readCriteria()).then(function (r) {
        btn.disabled = false;
        if (!r.ok) {
          /* Repaint rather than relabel when the answer was 'denied'. Simply
             writing "Blocked" onto the button reproduced the dead end this
             function was just fixed for: permission() now reads 'denied', so
             paint() draws the card that explains how to undo it. Any other
             failure keeps the button live, because trying again is the right
             next move for a dropped request. */
          if (r.reason === 'denied') { paint(slot); return; }
          btn.textContent = 'Try again';
          return;
        }
        paint(slot);
      });
    });
  }

  /* This used to read a `toju_criteria_v1` localStorage key, under the comment
     "reuse what Tayo already learned rather than asking again". Nothing has
     ever written that key -- grep the repo -- so the parse always produced {}
     and every field came back null. It looked like personalisation and was a
     no-op, which is worse than not having it, because it hid the fact that a
     proximity watch currently carries no brief at all.

     The authoritative criteria live server-side in demo_chat_sessions and come
     back from toju-demo's `restore` action. Until this is wired to that, the
     radius is the only real input, and saying so is the honest version. */
  function readCriteria() {
    /* 500m, matching the column default set when the radius was reconsidered.
       THIS LINE IS WHY THAT DEFAULT DID NOTHING: the client sends a radius on
       every watch, 1200 sat inside the server's 200-5000 clamp, so it was
       taken as a deliberate choice and the default was never consulted. The
       first real watch created after the change came out at 1200m and fired
       for a home 1177m away -- a fifteen-minute walk, announced as "right
       here". A default only defaults for callers who say nothing. */
    return { radiusM: 500 };
  }

  SynNotify.mountProximity = mountProximity;

  // Resume a watch the visitor previously turned on.
  function boot() {
    if (proximityOn()) startWatching();
    registerSW();
    mountProximity();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
