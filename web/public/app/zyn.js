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

  /* Tap Zyn and he does something: he zooms in, shows one of his moods or actions, and settles back.
     Taps while he is mid-emote are ignored, so he never stacks. Reduced motion keeps the change of
     face but drops the zoom and the hops. */
  var EMOTES = [
    { s: 'celebrating', big: 2.6, kf: function (b) { return [
      { transform: 'translateY(0) scale(1) rotate(0)' }, { transform: 'translateY(-6%) scale(' + b + ') rotate(-6deg)', offset: .18 },
      { transform: 'translateY(-16%) scale(' + b * 1.08 + ') rotate(6deg)', offset: .34 }, { transform: 'translateY(0) scale(' + b + ') rotate(-4deg)', offset: .5 },
      { transform: 'translateY(-12%) scale(' + b * 1.05 + ') rotate(4deg)', offset: .66 }, { transform: 'translateY(0) scale(' + b + ') rotate(0)', offset: .82 },
      { transform: 'translateY(0) scale(1) rotate(0)' }]; } },
    { s: 'excited', big: 2.5, kf: function (b) { return [
      { transform: 'scale(1)' }, { transform: 'scale(' + b + ',' + b * .94 + ')', offset: .15 }, { transform: 'translateY(-18%) scale(' + b * .96 + ',' + b * 1.06 + ')', offset: .3 },
      { transform: 'translateY(0) scale(' + b * 1.05 + ',' + b * .95 + ')', offset: .42 }, { transform: 'translateY(-14%) scale(' + b + ')', offset: .56 },
      { transform: 'translateY(0) scale(' + b + ')', offset: .8 }, { transform: 'scale(1)' }]; } },
    { s: 'waving', big: 2.4, kf: function (b) { return [
      { transform: 'scale(1) rotate(0)' }, { transform: 'scale(' + b + ') rotate(0)', offset: .16 }, { transform: 'scale(' + b + ') rotate(-9deg)', offset: .3 },
      { transform: 'scale(' + b + ') rotate(9deg)', offset: .44 }, { transform: 'scale(' + b + ') rotate(-9deg)', offset: .58 }, { transform: 'scale(' + b + ') rotate(0)', offset: .78 },
      { transform: 'scale(1) rotate(0)' }]; } },
    { s: 'delighted', big: 2.6, kf: function (b) { return [
      { transform: 'scale(1) rotate(0)' }, { transform: 'scale(' + b + ') rotate(0)', offset: .18 }, { transform: 'translateY(-14%) scale(' + b * 1.06 + ') rotate(360deg)', offset: .55 },
      { transform: 'scale(' + b + ') rotate(360deg)', offset: .8 }, { transform: 'scale(1) rotate(360deg)' }]; } },
    { s: 'winking', big: 2.4, kf: function (b) { return [
      { transform: 'scale(1) rotate(0)' }, { transform: 'scale(' + b + ') rotate(8deg)', offset: .2 }, { transform: 'scale(' + b * 1.05 + ') rotate(10deg)', offset: .5 },
      { transform: 'scale(' + b + ') rotate(8deg)', offset: .78 }, { transform: 'scale(1) rotate(0)' }]; } }
  ];
  var lastEmote = -1;
  function emote(el) {
    if (!el || el.__emoting) return;
    var i; do { i = Math.floor(Math.random() * EMOTES.length); } while (i === lastEmote && EMOTES.length > 1);
    lastEmote = i;
    var e = EMOTES[i];
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.__emoting = true;
    var was = ((el.getAttribute('src') || '').match(/zyn-([a-z]+)\.webp/) || [0, 'happy'])[1];
    /* Reduced motion: the face changes where he stands, nothing flies. */
    if (calm || !el.animate || !document.body) {
      Zyn.set(el, e.s, true);
      setTimeout(function () { Zyn.set(el, was); el.__emoting = false; }, 1600);
      return;
    }
    /* HE LEAVES THE CHAT TO DO IT. Zooming him in place was clipped by whatever he sat inside (a message row, a
       scrolling column, a header), so the bigger he got the more of him was cut off. A copy of him flies out above
       everything, does his thing at the middle of the screen, and flies back; the one in the chat waits invisible. */
    var r = el.getBoundingClientRect(), vw = window.innerWidth || document.documentElement.clientWidth || 800, vh = window.innerHeight || document.documentElement.clientHeight || 600;
    var S = Math.max(Math.min(300, vw * 0.72, vh * 0.5), r.width * 1.6), k = S / Math.max(r.width, 1);
    var tx = vw / 2 - (r.left + r.width / 2), ty = vh * 0.44 - (r.top + r.height / 2);
    var ghost = document.createElement('img');
    ghost.src = url(e.s); ghost.alt = ''; ghost.setAttribute('aria-hidden', 'true'); ghost.draggable = false;
    ghost.className = 'zyn zm-still';
    ghost.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height +
      'px;margin:0;z-index:2147483000;pointer-events:none;transform-origin:50% 50%;filter:drop-shadow(0 18px 24px rgba(40,40,60,.35)) saturate(1.2)';
    document.body.appendChild(ghost);
    el.style.visibility = 'hidden';
    var there = 'translate(' + tx + 'px,' + ty + 'px)';
    var mid = e.kf(k).slice(1, -1);
    var frames = [{ transform: 'translate(0px,0px) scale(1)', offset: 0 }, { transform: there + ' scale(' + k + ')', offset: 0.2 }];
    mid.forEach(function (f, n) { frames.push({ transform: there + ' ' + f.transform, offset: 0.2 + 0.6 * ((n + 1) / (mid.length + 1)) }); });
    frames.push({ transform: there + ' scale(' + k + ')', offset: 0.8 }, { transform: 'translate(0px,0px) scale(1)', offset: 1 });
    var done = function () { if (ghost.parentNode) ghost.remove(); el.style.visibility = ''; el.__emoting = false; };
    var an = ghost.animate(frames, { duration: 3400, easing: 'cubic-bezier(.34,1.35,.64,1)' });
    an.onfinish = done; an.oncancel = done;
  }

  window.Zyn = { emote: emote, img: img, set: set, url: url, forReply: forReply, preload: preload, ids: IDS };
})();
