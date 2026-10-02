/* ─────────────────────────────────────────────────────────────────────────────
   COOKIE CONSENT (2026-10-02)

   Google Analytics is the only thing on Synapse that sets a non-essential
   cookie, so it is the only thing this asks about. Nothing is sent to Google
   until the visitor accepts: each page's inline Google tag queues its calls
   but loads gtag.js only when the stored choice is "granted"
   (window.SynGtagLoad). Declining means no script, no cookie, no request.

   The choice is remembered in localStorage (syn_consent_v1). Any element with
   [data-cookie-settings] reopens the banner, so the choice can be changed
   later -- the footers and the privacy policy carry that link.

   Self-contained (its own styles), because it runs on every page: the
   landing pages, the app, sign-in. Follows the page's light/dark theme when
   the page has one; no lines at night, by Eden's rule.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var KEY = 'syn_consent_v1';
  var box = null;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function remember(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  /* Taking consent back has to undo what accepting did: Analytics' cookies
     are cleared on this host and on the parent domain they are written to. */
  function clearGaCookies() {
    var host = location.hostname;
    var domains = ['', host, '.' + host.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^_ga(_|$)/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function choose(v) {
    remember(v);
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: v === 'granted' ? 'granted' : 'denied' });
    }
    if (v === 'granted') {
      if (typeof window.SynGtagLoad === 'function') window.SynGtagLoad();
    } else {
      clearGaCookies();
    }
    hide();
  }

  function css() {
    if (document.getElementById('syn-consent-css')) return;
    var s = document.createElement('style');
    s.id = 'syn-consent-css';
    s.textContent = [
      '.syn-consent{position:fixed;z-index:2147483000;left:20px;bottom:20px;max-width:400px;',
      'box-sizing:border-box;padding:20px 20px 18px;border-radius:18px;',
      'background:#FFFFFF;color:#15120F;font-family:inherit;font-size:15px;line-height:1.5;',
      'box-shadow:0 18px 48px -12px rgba(30,20,10,.35),0 0 0 1px rgba(30,20,10,.06);}',
      '.syn-consent[hidden]{display:none}',
      '.syn-consent p{margin:0}',
      '.syn-consent .sc-t{font-weight:600;font-size:16px;margin-bottom:6px}',
      '.syn-consent .sc-b{color:#5E564E}',
      '.syn-consent .sc-b a{color:inherit;text-decoration:underline;text-underline-offset:3px}',
      '.syn-consent .sc-row{display:flex;gap:10px;margin-top:16px}',
      '.syn-consent button{flex:1;height:44px;border-radius:999px;font:inherit;font-weight:600;font-size:15px;cursor:pointer;border:0}',
      '.syn-consent .sc-yes{background:#15120F;color:#FFFFFF}',
      '.syn-consent .sc-no{background:#F2ECE4;color:#15120F}',
      '.syn-consent button:focus-visible{outline:2px solid #FF8A2D;outline-offset:2px}',
      'html[data-theme="dark"] .syn-consent{background:#16181C;color:#E7E9EA;box-shadow:0 18px 48px -12px rgba(0,0,0,.8)}',
      'html[data-theme="dark"] .syn-consent .sc-b{color:#A2A7AC}',
      'html[data-theme="dark"] .syn-consent .sc-yes{background:#FFFFFF;color:#000000}',
      'html[data-theme="dark"] .syn-consent .sc-no{background:#000000;color:#FFFFFF}',
      '@media (max-width:560px){.syn-consent{left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));max-width:none}}'
    ].join('');
    document.head.appendChild(s);
  }

  function privacyHref() {
    return location.pathname.indexOf('/app/') === 0 ? '/privacy.html#what' : 'privacy.html#what';
  }

  function show() {
    css();
    if (!box) {
      box = document.createElement('div');
      box.className = 'syn-consent';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Cookies');
      box.innerHTML =
        '<p class="sc-t">Can we count your visit?</p>'
        + '<p class="sc-b">We use Google Analytics cookies to see which pages help people find homes. '
        + 'Nothing you type is ever sent. <a href="' + privacyHref() + '">Privacy policy</a></p>'
        + '<div class="sc-row">'
        + '<button type="button" class="sc-no">No thanks</button>'
        + '<button type="button" class="sc-yes">Accept</button>'
        + '</div>';
      box.querySelector('.sc-yes').addEventListener('click', function () { choose('granted'); });
      box.querySelector('.sc-no').addEventListener('click', function () { choose('denied'); });
      document.body.appendChild(box);
    }
    box.hidden = false;
  }
  function hide() { if (box) box.hidden = true; }

  window.SynConsent = { open: show, get: stored };

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (!t) return;
    e.preventDefault();
    show();
    var yes = box && box.querySelector('.sc-yes');
    if (yes) yes.focus();
  });

  function start() {
    var v = stored();
    if (v !== 'granted' && v !== 'denied') show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
