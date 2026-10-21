/* FIRST RUN, FOR A CUSTOMER. Shown once, the first time the Home page opens on a device: four short screens that each show one thing
   the app does, then one question (what are you looking for) that sets Home's first tab. Skip is on every screen. Nothing is sent
   anywhere; the only thing kept is a flag that it was seen and the chosen tab, on this device. */
(function () {
  'use strict';
  var DONE = 'synapse_onboarded_v1', DEAL = 'synapse_home_deal';
  if (!document.documentElement.classList.contains('syn-app') && !window.matchMedia('(max-width: 1024px)').matches) return; // a phone screen
  try { if (localStorage.getItem(DONE) === '1') return; } catch (e) { /* private window: show it, it just returns next visit */ }

  var SLIDES = [
    { icon: 'chat', title: 'Tell Tayo what you want', text: 'Ask in English, Pidgin, Yoruba, Igbo or Hausa. Tayo looks through live homes and tells you which ones fit and what to check.' },
    { icon: 'home', title: 'Browse and save homes', text: 'Look around when you like. Save the ones you love, compare them, and see what has been verified.' },
    { icon: 'boards', title: 'Build a dream board', text: 'Collect photos and places that feel right. Tayo reads your board and finds homes that match it.' },
    { icon: 'user', title: 'Meet the agency, your way', text: 'When one home stands out, Tayo introduces you and shows you where your introduction stands.' }
  ];
  var CHOICES = [['rent', 'Rent a home'], ['buy', 'Buy a home or land'], ['invest', 'Invest'], ['shortlet', 'Short stay']];

  var step = 0, total = SLIDES.length + 1, pick = null, box = null;
  function done() {
    try { localStorage.setItem(DONE, '1'); if (pick) localStorage.setItem(DEAL, pick); } catch (e) { /* it simply shows again */ }
    if (box) { box.remove(); box = null; }
    if (pick) { var t = document.querySelector('.hm-tab[data-deal="' + pick + '"]'); if (t) t.click(); }
  }
  function dots() {
    var s = '';
    for (var i = 0; i < total; i++) s += '<i class="' + (i === step ? 'on' : '') + '"></i>';
    return '<div class="ob-dots" aria-hidden="true">' + s + '</div>';
  }
  function render() {
    var last = step === total - 1, body;
    if (!last) {
      var s = SLIDES[step];
      body = '<div class="ob-ic"><span data-icon="' + s.icon + '" aria-hidden="true"></span></div><h2>' + s.title + '</h2><p>' + s.text + '</p>';
    } else {
      body = '<h2>What are you looking for first?</h2><p>You can change this any time.</p><div class="ob-ch">'
        + CHOICES.map(function (c) { return '<button type="button" class="ob-c' + (pick === c[0] ? ' on' : '') + '" data-pick="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
    }
    box.innerHTML = '<div class="ob-card"><button type="button" class="ob-skip" data-skip>Skip</button>' + body + dots()
      + '<button type="button" class="ob-next" data-next' + (last && !pick ? ' disabled' : '') + '>' + (last ? 'Take me home' : 'Next') + '</button></div>';
    if (window.SynIcons && SynIcons.paint) { try { SynIcons.paint(box); } catch (e) { /* the circle shows without its glyph */ } }
    var f = box.querySelector('[data-next]'); if (f && !f.disabled) f.focus();
  }

  var css = document.createElement('style');
  css.textContent = '.ob{position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.5)}'
    + '.ob-card{position:relative;width:min(420px,100%);box-sizing:border-box;padding:56px 24px 24px;border-radius:30px;background:var(--surface,#fff);color:var(--ink,#15120F);text-align:center;display:grid;gap:14px;justify-items:center}'
    + 'html[data-theme="dark"] .ob-card{background:#16181C;color:#fff}'
    + '.ob-skip{position:absolute;top:14px;right:16px;border:0;background:none;color:inherit;opacity:.6;font:600 14px system-ui,sans-serif;cursor:pointer;padding:8px}'
    + '.ob-ic{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;background:rgba(128,128,128,.14)}'
    + '.ob-ic [data-icon]{width:38px;height:38px}'
    + '.ob-card h2{margin:4px 0 0;font-size:26px;line-height:1.15;letter-spacing:-.01em}'
    + '.ob-card p{margin:0;font-size:15.5px;line-height:1.5;opacity:.75;max-width:34ch}'
    + '.ob-dots{display:flex;gap:6px;margin:6px 0}.ob-dots i{width:7px;height:7px;border-radius:50%;background:rgba(128,128,128,.35)}.ob-dots i.on{width:20px;border-radius:4px;background:currentColor}'
    + '.ob-next{width:100%;min-height:52px;border:0;border-radius:999px;font:700 16px system-ui,sans-serif;background:#15120F;color:#fff;cursor:pointer}'
    + 'html[data-theme="dark"] .ob-next{background:#fff;color:#000}.ob-next[disabled]{opacity:.35;cursor:default}'
    + '.ob-ch{display:grid;gap:8px;width:100%}.ob-c{min-height:50px;border:0;border-radius:16px;font:600 16px system-ui,sans-serif;background:rgba(128,128,128,.14);color:inherit;cursor:pointer}.ob-c.on{background:#FBE7A6;color:#15120F}';
  document.head.appendChild(css);

  box = document.createElement('div');
  box.className = 'ob'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Welcome to Synapse');
  box.addEventListener('click', function (e) {
    if (e.target.closest('[data-skip]')) { pick = null; done(); return; }
    var p = e.target.closest('[data-pick]'); if (p) { pick = p.getAttribute('data-pick'); render(); return; }
    if (e.target.closest('[data-next]')) { if (step === total - 1) done(); else { step++; render(); } }
  });
  document.addEventListener('keydown', function (e) { if (box && e.key === 'Escape') { pick = null; done(); } });
  document.body.appendChild(box);
  render();
})();
