/* ── Light or dark (2026-09-29) ──────────────────────────────────────────────
   Loaded in <head>, straight after theme.css and before anything paints, so a
   dark page never flashes white first. It stamps <html data-theme="light|dark">
   and theme.css does the rest.

   The choice: the device's own setting, unless the moon/sun button in the app
   bar has been pressed, which is remembered on this device (syn_theme). A
   device that changes its setting while the page is open is followed, unless
   a choice was made here. Storage can be blocked (private windows, some
   in-app browsers): then it simply follows the device. */
(function () {
  'use strict';
  var KEY = 'syn_theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function chosen() {
    try { var v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : ''; }
    catch (e) { return ''; }
  }
  function current() {
    return chosen() || (mq && mq.matches ? 'dark' : 'light');
  }
  function apply() {
    root.setAttribute('data-theme', current());
    paint();
  }

  var ICON = {
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

  var btn = null;
  function paint() {
    if (!btn) return;
    var next = current() === 'dark' ? 'light' : 'dark';
    btn.innerHTML = ICON[next];
    btn.setAttribute('aria-label', next === 'dark' ? 'Switch to dark mode' : 'Switch to light mode');
    btn.title = btn.getAttribute('aria-label');
  }

  function set(mode) {
    try { localStorage.setItem(KEY, mode); } catch (e) { /* follows the device instead */ }
    apply();
  }

  /* The button sits at the start of the app bar's right-hand group: after the
     spacer when there is one, otherwise at the end. */
  function mount() {
    var bar = document.querySelector('.appbar');
    if (!bar || bar.querySelector('.syn-theme-btn')) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'syn-theme-btn';
    btn.addEventListener('click', function () { set(current() === 'dark' ? 'light' : 'dark'); });
    var spacer = bar.querySelector('.spacer');
    if (spacer && spacer.nextSibling) bar.insertBefore(btn, spacer.nextSibling);
    else bar.appendChild(btn);
    paint();
  }

  apply();
  if (mq) {
    var onChange = function () { if (!chosen()) apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  window.SynTheme = { get: current, set: set };
})();
