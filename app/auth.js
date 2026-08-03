/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — authentication
   A thin wrapper over Supabase Auth (GoTrue) so every page speaks to sessions
   the same way. Loads @supabase/supabase-js from CDN and exposes window.SynAuth.

   SECURITY NOTES (deliberate, please keep):
   · The publishable key below is PUBLIC by design — it identifies the project
     and carries no privileges of its own. All real authorisation lives in
     Postgres RLS. Never put a service-role key in this file or any client file.
   · Sessions are held by supabase-js in localStorage and auto-refreshed. We do
     NOT hand-roll token storage, and we never read the JWT to make trust
     decisions — the server re-verifies on every request.
   · `requireAuth()` is a UX gate, not a security boundary. It stops an
     unauthenticated person seeing a screen; it does not protect data. Data
     protection is RLS. Treat any client check as advisory.
   · Redirect targets are validated against same-origin before use so a crafted
     ?next= cannot bounce a freshly-signed-in user to an attacker's page.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
  var PUBLISHABLE_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

  var clientPromise = null;
  var cachedUser = null;      // last known user; refreshed by onAuthStateChange
  var readyResolvers = [];
  var isReady = false;

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-syn-supabase]');
      if (existing) { existing.addEventListener('load', function () { resolve(window.supabase); }); existing.addEventListener('error', reject); return; }
      var s = document.createElement('script');
      s.src = CDN; s.async = true; s.setAttribute('data-syn-supabase', '');
      s.onload = function () { resolve(window.supabase); };
      s.onerror = function () { reject(new Error('auth-sdk-unreachable')); };
      document.head.appendChild(s);
    });
  }

  function client() {
    if (clientPromise) return clientPromise;
    clientPromise = loadSdk().then(function (sb) {
      var c = sb.createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,   // handles the email-confirmation callback
          storageKey: 'synapse_auth_v1',
          flowType: 'pkce',           // PKCE — no token ever rides in a URL fragment
        },
      });
      c.auth.onAuthStateChange(function (_evt, session) {
        cachedUser = session ? session.user : null;
        document.dispatchEvent(new CustomEvent('syn:auth', { detail: { user: cachedUser } }));
        paintAll();
      });
      return c;
    });
    return clientPromise;
  }

  /* ── session ─────────────────────────────────────────────────────────── */
  function getUser() {
    return client().then(function (c) { return c.auth.getUser(); })
      .then(function (r) { cachedUser = (r && r.data && r.data.user) || null; return cachedUser; })
      .catch(function () { return null; });
  }
  function ready() {
    if (isReady) return Promise.resolve(cachedUser);
    return getUser().then(function (u) {
      isReady = true;
      readyResolvers.forEach(function (fn) { fn(u); });
      readyResolvers = [];
      return u;
    });
  }
  // The app only cares about two sides (customer / agency), but the database
  // trigger that provisions public.profiles on signup (handle_new_user) casts
  // raw_user_meta_data->>'role' to a real Postgres enum: consumer, agent,
  // agency_admin, agency_owner, platform_admin — NOT the literal strings
  // 'customer'/'agency' this file used to send. Sending an invalid value
  // aborts the trigger's transaction and 500s the whole signup (confirmed via
  // Supabase's own auth logs: every signup was failing this way). Fixed by
  // sending real enum values and classifying the full vocabulary here, so the
  // rest of the app keeps its simple two-sided model without knowing this
  // enum exists.
  var AGENCY_DB_ROLES = ['agency_owner', 'agency_admin', 'agent', 'platform_admin'];
  function roleOf(u) {
    if (!u) return null;
    var m = u.user_metadata || {};
    return AGENCY_DB_ROLES.indexOf(m.role) > -1 ? 'agency' : 'customer';
  }

  /* ── redirect safety ──────────────────────────────────────────────────── */
  // Only ever navigate to a same-origin path. Anything absolute, protocol-
  // relative or cross-origin is discarded rather than "cleaned" — rejecting is
  // safer than trying to sanitise a hostile URL.
  function safeNext(raw, fallback) {
    fallback = fallback || 'toju.html';
    if (!raw) return fallback;
    try {
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.indexOf('//') === 0) return fallback;
      var u = new URL(raw, window.location.href);
      if (u.origin !== window.location.origin) return fallback;
      return u.pathname + u.search + u.hash;
    } catch (e) { return fallback; }
  }

  /* ── actions ─────────────────────────────────────────────────────────── */
  function signUp(email, password, opts) {
    opts = opts || {};
    return client().then(function (c) {
      // 'consumer' / 'agency_owner': real handle_new_user enum values — see
      // the note above roleOf(). A self-serve agency signup is treated as
      // that agency's owner, and the DB trigger provisions the agencies row
      // + owner membership atomically with the profile (migration 0039) —
      // the client deliberately does NOT sequence any of that, so closing
      // the tab can never leave an account half-provisioned.
      var meta = {
        role: opts.role === 'agency' ? 'agency_owner' : 'consumer',
        full_name: opts.name || null,
      };
      // The agency's display name, typed by the person signing up. Only the
      // trigger reads this; it is never invented on their behalf.
      if (opts.role === 'agency' && opts.agencyName) meta.agency_name = opts.agencyName;
      return c.auth.signUp({
        email: email,
        password: password,
        options: {
          data: meta,
          emailRedirectTo: window.location.origin + window.location.pathname,
        },
      });
    });
  }
  function signIn(email, password) {
    return client().then(function (c) { return c.auth.signInWithPassword({ email: email, password: password }); });
  }
  function signOut() {
    return client().then(function (c) { return c.auth.signOut(); })
      .then(function () { cachedUser = null; paintAll(); });
  }
  function resetPassword(email) {
    return client().then(function (c) {
      return c.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/app/signin.html' });
    });
  }

  /* ── gate ────────────────────────────────────────────────────────────── */
  // UX gate only. Sends the visitor to sign-in and remembers where they were.
  function requireAuth(opts) {
    opts = opts || {};
    return ready().then(function (u) {
      if (u && (!opts.role || roleOf(u) === opts.role)) return u;
      var here = window.location.pathname + window.location.search;
      var q = '?next=' + encodeURIComponent(here);
      if (opts.role) q += '&role=' + encodeURIComponent(opts.role);
      if (opts.reason) q += '&reason=' + encodeURIComponent(opts.reason);
      window.location.href = 'signin.html' + q;
      return null;
    });
  }

  /* ── header paint ────────────────────────────────────────────────────── */
  // Any page can drop <span data-auth-slot></span> in its appbar and get a
  // correct signed-in / signed-out control with no per-page wiring.
  function paintAll() {
    document.querySelectorAll('[data-auth-slot]').forEach(function (slot) {
      if (cachedUser) {
        var name = (cachedUser.user_metadata && cachedUser.user_metadata.full_name) || cachedUser.email || 'Account';
        var initials = String(name).trim().slice(0, 2).toUpperCase();
        slot.innerHTML = '<span class="auth-chip" title="' + esc(name) + '">'
          + '<span class="auth-av">' + esc(initials) + '</span>'
          + '<button type="button" class="auth-out">Sign out</button></span>';
        var out = slot.querySelector('.auth-out');
        if (out) out.addEventListener('click', function () {
          signOut().then(function () { window.location.reload(); });
        });
      } else {
        slot.innerHTML = '<a class="auth-in" href="signin.html">Sign in</a>';
      }
    });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  window.SynAuth = {
    client: client, ready: ready, user: function () { return cachedUser; },
    getUser: getUser, roleOf: roleOf, safeNext: safeNext,
    signUp: signUp, signIn: signIn, signOut: signOut, resetPassword: resetPassword,
    requireAuth: requireAuth, paint: paintAll,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { ready().then(paintAll); });
  } else { ready().then(paintAll); }
})();
