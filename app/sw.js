/* ─────────────────────────────────────────────────────────────────────────────
   Synapse service worker — push delivery + notification routing

   WHAT THIS CAN AND CANNOT DO (please read before promising otherwise):
   ✓ Show a notification when the TAB is closed. The worker outlives the page.
   ✓ Route a tap to the right screen, focusing an existing tab if one is open.
   ✗ Track location in the background. There is no web geofencing API — the
     Geofencing API was removed from Chrome in 2018, and watchPosition() stops
     the moment the page is unloaded. A notification can only arrive here if a
     SERVER decided to send it.

   So the architecture is: the server owns the geofence (proximity_candidates()
   in Postgres), and something reports the device's position to it. On the web
   that reporting only happens while a page is open. For true "walk past a house
   with the app fully closed", the native app reports position in the
   background — and it pushes into this exact same pipeline. Nothing here
   changes when that lands.
   ───────────────────────────────────────────────────────────────────────── */

var VERSION = 'syn-sw-v1';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

/* ── incoming push ─────────────────────────────────────────────────────────
   The payload is written by the server so the worker stays dumb: it renders
   what it is given and never decides who should have been notified. */
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }

  var title = data.title || 'Synapse';
  var opts = {
    body: data.body || '',
    tag: data.tag || (data.kind || 'syn') + ':' + (data.propertyId || Date.now()),
    renotify: false,                       // a re-send must not buzz twice
    data: { route: data.route || '/app/toju.html', kind: data.kind || null,
            propertyId: data.propertyId || null },
    badge: '/app/motion/badge.png',
    icon: '/app/motion/icon.png',
    requireInteraction: data.kind === 'proximity_match',   // they are walking; give them a beat
    actions: data.kind === 'proximity_match'
      ? [{ action: 'view', title: 'See the home' }, { action: 'mute', title: 'Not now' }]
      : [],
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

/* ── tap → the right screen ────────────────────────────────────────────────
   Every notification carries its own route (set server-side), so this stays a
   single generic handler instead of a pile of per-type conditionals. */
self.addEventListener('notificationclick', function (event) {
  var n = event.notification;
  n.close();
  if (event.action === 'mute') {
    // Best-effort: tell the app to pause this watch. Fire-and-forget by design;
    // the authoritative mute happens in-app.
    event.waitUntil(broadcast({ type: 'syn:mute-proximity' }));
    return;
  }
  var route = (n.data && n.data.route) || '/app/toju.html';
  event.waitUntil(openRoute(route, n.data || {}));
});

function openRoute(route, data) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(function (list) {
      // Prefer focusing a tab that is already open — do not pile up windows.
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if ('focus' in c) {
          c.postMessage({ type: 'syn:navigate', route: route, data: data });
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(route);
    });
}

function broadcast(msg) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(function (list) { list.forEach(function (c) { c.postMessage(msg); }); });
}
