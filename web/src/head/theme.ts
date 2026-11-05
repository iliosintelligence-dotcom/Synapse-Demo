/* ── Light or dark, by the clock (2026-10-02) ───────────────────────────────
   Loaded in <head> before anything paints, so a dark page never flashes white
   first. It stamps <html data-theme="light|dark">; the theme files do the rest.

   Eden: every page switches by the time of day -- dark at 7pm, light at 7am,
   Nigeria time -- not only the landing pages. Lagos is UTC+1 all year (no
   daylight saving), so the hour is worked out from UTC and the two switches
   never drift with the visitor's own clock or settings.

   The moon/sun button in the app bar still works, but a choice made with it
   holds only until the next 7am/7pm switch (syn_theme_pick: {t, until}); then
   the clock takes over again. The landing pages read and write the same key,
   so one choice carries across the site. A page left open turns over on the
   minute. The old permanent choice (syn_theme) is dropped once, or it would
   pin somebody to one mode forever. Storage can be blocked (private windows,
   some in-app browsers): then it simply follows the clock. */
(function () {
  'use strict';
  const KEY = 'syn_theme_pick';
  const root = document.documentElement;

  function lagosHour(now: Date) { return (now.getUTCHours() + 1) % 24; }
  function byClock(): SynMode {
    const h = lagosHour(new Date());
    return (h >= 19 || h < 7) ? 'dark' : 'light';
  }
  /* 07:00 and 19:00 in Lagos are 06:00 and 18:00 UTC. */
  function nextSwitch() {
    const now = new Date();
    const d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const times = [d + 6 * 3600e3, d + 18 * 3600e3, d + 30 * 3600e3];
    for (let i = 0; i < times.length; i++) if (times[i] > now.getTime()) return times[i];
    return d + 30 * 3600e3;
  }

  try { localStorage.removeItem('syn_theme'); } catch (e) {}

  function picked(): SynMode | '' {
    try {
      const p = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (p && (p.t === 'dark' || p.t === 'light') && p.until > Date.now()) return p.t;
      if (p) localStorage.removeItem(KEY);
    } catch (e) {}
    return '';
  }
  function current(): SynMode { return picked() || byClock(); }
  function apply() {
    const t = current();
    if (root.getAttribute('data-theme') !== t) root.setAttribute('data-theme', t);
    paint();
  }

  const ICON: Record<SynMode, string> = {
    /* moon: shown in light mode, "switch to dark" */
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
      + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    /* sun: shown in dark mode, "switch to light" */
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
      + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4'
      + 'M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  };

  let btn: HTMLButtonElement | null = null;
  function paint() {
    if (!btn) return;
    const next: SynMode = current() === 'dark' ? 'light' : 'dark';
    btn.innerHTML = ICON[next];
    btn.setAttribute('aria-label', next === 'dark' ? 'Switch to dark mode' : 'Switch to light mode');
    btn.title = btn.getAttribute('aria-label')!;
  }

  function set(mode: SynMode) {
    try {
      if (mode === byClock()) localStorage.removeItem(KEY);   // back in step with the clock
      else localStorage.setItem(KEY, JSON.stringify({ t: mode, until: nextSwitch() }));
    } catch (e) { /* follows the clock instead */ }
    apply();
  }

  /* The button sits at the start of the app bar's right-hand group: after the
     spacer when there is one, otherwise at the end. */
  function mount() {
    const bar = document.querySelector('.appbar');
    if (!bar || bar.querySelector('.syn-theme-btn')) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'syn-theme-btn';
    btn.addEventListener('click', function () { set(current() === 'dark' ? 'light' : 'dark'); });
    const spacer = bar.querySelector('.spacer');
    if (spacer && spacer.nextSibling) bar.insertBefore(btn, spacer.nextSibling);
    else bar.appendChild(btn);
    paint();
  }

  apply();
  setInterval(apply, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) apply(); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(); });
  /* A BAR REACT DREW WAITS FOR REACT (2026-10-24). On a page whose markup is React's own, adding the button before React has
     taken the page over makes React find something it did not draw (error #418). Then the button goes in once the page's React
     layer says it is ready (syn:react-ready), or after four seconds if it never does. Inside the protected old markup
     (#syn-legacy), or on a page without React, it goes in as before. */
  function reactOwned(bar: Element) {
    return !!document.querySelector('script[src*="/_next/static/"]') && !(bar.closest && bar.closest('#syn-legacy'))
      && !(window.SynReact && window.SynReact.ready);
  }
  function mountSoon() {
    const bar = document.querySelector('.appbar');
    if (bar && reactOwned(bar)) { window.addEventListener('syn:react-ready', mount, { once: true }); setTimeout(mount, 4000); return; }
    mount();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountSoon);
  else mountSoon();

  window.SynTheme = { get: current, set: set, byClock: byClock };
})();
