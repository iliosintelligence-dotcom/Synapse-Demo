/* Zyn, Synapse's mascot, for every page that shows the advisor.

   Zyn is a 3D model rendered once per state (images/zyn/zyn-<state>.webp, with true
   transparency), so he sits on any background, light or dark. This file hands a page
   the right picture for what is happening and keeps him moving: each state has its
   own way of moving (see zyn.css), and all of it stops for anyone who has asked their
   device for less motion.

     Zyn.img('happy', 48)            -> '<img ...>' markup for a string template
     Zyn.set(imgEl, 'searching')     -> change the picture on an element already in the page
     Zyn.forReply(reply)             -> which state fits a reply from the advisor
     Zyn.url('home')                 -> the file, for a CSS background

   The state names are the ones on the character sheet: 12 feelings, 12 actions and
   12 reply objects. An unknown name falls back to happy rather than a broken image.
   Zyn has no mouth and no fins: he says it with his eyes and the way he stands. */
(function () {
  'use strict';
  var script = document.currentScript;
  var BASE = ((script && script.src) || '').replace(/\/app\/zyn\.js(\?.*)?$/, '') + '/images/zyn/';
  if (BASE === '/images/zyn/' && script && script.src === '') BASE = '../images/zyn/';

  var IDS = ('happy curious thinking excited helpful winking surprised sleepy confused sorry proud delighted ' +
    'searching listening typing calculating comparing navigating waving loading scheduling calling celebrating saving ' +
    'home price verified nearby documents offer keys headsup nothing alert intro shared').split(' ');
  var MOTION = {};
  'excited celebrating delighted surprised keys waving'.split(' ').forEach(function (s) { MOTION[s] = 'zm-bounce'; });
  'curious confused thinking listening searching comparing navigating winking'.split(' ').forEach(function (s) { MOTION[s] = 'zm-sway'; });
  'sleepy sorry nothing'.split(' ').forEach(function (s) { MOTION[s] = 'zm-slow'; });
  MOTION.loading = 'zm-pulse';

  function known(state) { return IDS.indexOf(state) > -1 ? state : 'happy'; }
  function url(state) { return BASE + 'zyn-' + known(state) + '.webp'; }
  function cls(state, still) { return 'zyn ' + (still ? 'zm-still' : (MOTION[known(state)] || 'zm-bob')) + ' zd' + Math.floor(Math.random() * 6); }

  function img(state, px, o) {
    o = o || {};
    var alt = o.alt ? ' alt="' + String(o.alt).replace(/"/g, '&quot;') + '"' : ' alt="" aria-hidden="true"';
    return '<img class="' + cls(state, o.still) + (o.cls ? ' ' + o.cls : '') + '" src="' + url(state) + '" width="' + px + '" height="' + px + '"' + alt + ' decoding="async" draggable="false">';
  }
  function set(el, state, still) {
    if (!el) return;
    var s = known(state);
    if (el.getAttribute('data-zyn') === s) return;
    el.setAttribute('data-zyn', s);
    el.src = url(s);
    el.className = el.className.replace(/\bzm-\w+\b/g, '').trim() + ' ' + (still ? 'zm-still' : (MOTION[s] || 'zm-bob'));
  }
  function preload(list) {
    (list || ['happy', 'typing', 'searching', 'home', 'nothing', 'waving', 'thinking', 'curious']).forEach(function (s) { var i = new Image(); i.src = url(s); });
  }

  /* Which state fits a reply? Reads what the reply actually carries, never what it hopes to seem:
     the shield (verified) only when a home shown is verified, the empty box only when the search
     really found nothing. r: { text, matches, searched, priceHistory, greeting, failed } */
  function forReply(r) {
    r = r || {};
    var text = String(r.text || '');
    var matches = Array.isArray(r.matches) ? r.matches : [];
    if (r.greeting) return 'waving';
    if (r.failed || /\b(sorry|could not|couldn[’']t|unable to|did not work)\b/i.test(text)) return 'sorry';
    var s = r.searched;
    if (s && Number(s.live) === 0 && !matches.length) return 'nothing';
    if (r.priceHistory && r.priceHistory.rows && r.priceHistory.rows.length) return 'price';
    if (matches.length) {
      return matches.some(function (m) { return m && m.verificationStatus === 'verified'; }) ? 'verified' : 'home';
    }
    if (/\?\s*$/.test(text.trim())) return 'curious';
    if (/\b(alert|notify|let you know)\b/i.test(text)) return 'alert';
    return 'helpful';
  }

  window.Zyn = { img: img, set: set, url: url, forReply: forReply, preload: preload, ids: IDS };
})();
