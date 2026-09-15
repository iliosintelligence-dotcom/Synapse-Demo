/* orb.js — the thinking orb, for the things that persist.
 *
 * Technique adapted from thinking-orbs by Jakub Antalík (MIT):
 * https://github.com/Jakubantalik/thinking-orbs
 * That project is TypeScript + Vite and installs from npm; this app is plain
 * static files with no build step, so what is borrowed is the APPROACH rather
 * than the package — and the approach is the valuable part:
 *
 *   ARCS ONLY, ON A 2D CANVAS. No ctx.filter, no SVG filters, no WebGL. Those
 *   are the three things that make an orb look different in Safari than in
 *   Chrome, and drop frames on a mid-range Android while doing it. Every pixel
 *   here is a stroked arc, so it is the same everywhere and costs almost
 *   nothing to draw.
 *
 *   SIZES ARE SEPARATE DESIGNS, NOT A SCALE FACTOR. The 58px orb on the
 *   floating button carries more rings and slower motion; the 30px one in a
 *   panel header carries fewer and moves quicker, because at that size a slow
 *   arc reads as a stationary smudge. Scaling one to the other gives you a
 *   blurry version of the wrong design.
 *
 * WHY THIS EXISTS AT ALL. The floating Ask-Tayo button was a charcoal circle
 * with a sparkle glyph and a box-shadow that pulsed on a 2.8s loop. It said
 * "button", every second, identically, whether Tayo was idle or mid-thought.
 * An orb that changes with what the thing is DOING is the difference between
 * decoration and an indicator.
 *
 * States, deliberately only the ones we can honestly show:
 *   'idle'     a slow breath. Tayo is here and waiting.
 *   'thinking' the rings decouple and sweep. A request is genuinely in flight.
 * The reference ships nine. Adding states we never enter would be animation
 * pretending to be status.
 *
 * Exposes window.SynOrb.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ONE LOOP FOR EVERY ORB ON THE PAGE. A requestAnimationFrame per instance
     is how a persistent element quietly costs a phone its battery: two orbs
     mean two loops, each waking the compositor on its own schedule. One loop
     draws all of them and stops dead when there is nothing to draw. */
  var live = [];
  var raf = 0;

  function frame(now) {
    raf = 0;
    var drew = false;
    for (var i = 0; i < live.length; i++) {
      var o = live[i];
      if (o.dead) continue;
      /* Off-screen orbs are not drawn. The FAB is fixed so it is almost always
         visible, but a panel orb scrolled out of view is pure waste. */
      if (!o.visible) continue;
      o.draw(now);
      drew = true;
    }
    if (drew) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  /* A hidden tab keeps rAF alive at a crawl in some browsers and not at all in
     others; either way an orb nobody can see should not be computing. Resuming
     on visibilitychange is what stops it coming back frozen. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
    else kick();
  });

  /* The two designs. Not one design and a multiplier -- see the note above. */
  var PRESETS = {
    lg: { size: 58, rings: 3, dots: 7, ringW: 1.6, dotR: 1.5, breath: 3400, sweep: 1150 },
    sm: { size: 30, rings: 2, dots: 5, ringW: 1.2, dotR: 1.1, breath: 2600, sweep: 820 },
  };

  function Orb(el, opts) {
    opts = opts || {};
    this.el = el;
    this.preset = PRESETS[opts.preset] || PRESETS.lg;
    this.state = opts.state || 'idle';
    this.ink = opts.ink || '#FFFFFF';
    this.accent = opts.accent || '#FF8A2D';
    this.dead = false;
    this.visible = true;

    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.display = 'block';
    c.style.width = this.preset.size + 'px';
    c.style.height = this.preset.size + 'px';
    this.canvas = c;
    this.ctx = c.getContext('2d');
    el.appendChild(c);
    this.resize();

    /* Reduced motion gets ONE frame, not a frozen loop and not nothing: the
       orb is still the thing that says "Tayo", it just stops moving. */
    this.still = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var self = this;
    if (window.IntersectionObserver) {
      this.io = new IntersectionObserver(function (es) {
        self.visible = es[0].isIntersecting;
        if (self.visible) kick();
      });
      this.io.observe(el);
    }

    live.push(this);
    if (this.still) this.draw(0); else kick();
  }

  /* Crisp on a phone. The canvas is sized in device pixels and scaled back
     down in CSS, because a 58px canvas on a 3x screen is 58 real pixels of
     arc stretched over 174 -- which is exactly the soft, cheap look this is
     meant to replace. */
  Orb.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var s = this.preset.size;
    this.canvas.width = Math.round(s * dpr);
    this.canvas.height = Math.round(s * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  Orb.prototype.set = function (state) {
    if (this.state === state) return;
    this.state = state;
    if (this.still) this.draw(0); else kick();
  };

  Orb.prototype.destroy = function () {
    this.dead = true;
    if (this.io) this.io.disconnect();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  Orb.prototype.draw = function (now) {
    var p = this.preset, ctx = this.ctx, s = p.size, c = s / 2;
    var t = this.still ? 0 : now / 1000;
    ctx.clearRect(0, 0, s, s);
    ctx.lineCap = 'round';

    var thinking = this.state === 'thinking';
    /* The breath. One shared phase in idle so the rings move as one object;
       in thinking each ring gets its own rate and the object comes apart,
       which is what reads as effort rather than as waiting. */
    var breath = Math.sin((this.still ? 0 : now) / p.breath * TAU) * 0.5 + 0.5;

    for (var i = 0; i < p.rings; i++) {
      var f = i / Math.max(1, p.rings - 1);
      var baseR = c * (0.34 + f * 0.42);
      var r = baseR + (thinking ? 0 : breath * 1.4);

      /* Arc length: idle rings are nearly closed and calm; thinking rings open
         into sweeping segments that chase each other. */
      var arc = thinking ? (0.30 + 0.18 * Math.sin(t * 1.7 + i)) * TAU
                         : (0.62 + 0.10 * breath) * TAU;
      var dir = i % 2 ? -1 : 1;
      var speed = thinking ? (0.9 + i * 0.55) : 0.16;
      var a0 = this.still ? (-0.4 + i * 1.1) : t * speed * dir + i * 1.7;

      ctx.beginPath();
      ctx.arc(c, c, r, a0, a0 + arc);
      ctx.lineWidth = p.ringW;
      /* The outermost ring carries the accent. One orange element, and it is a
         fill of light rather than a word -- which is the palette's own rule
         about where this colour is allowed to go. */
      ctx.strokeStyle = (i === p.rings - 1) ? this.accent : this.ink;
      ctx.globalAlpha = thinking ? (0.85 - f * 0.25) : (0.55 - f * 0.18 + breath * 0.18);
      ctx.stroke();
    }

    /* The dots. In idle they sit still on the inner orbit and shimmer; in
       thinking they travel, which is the part the eye actually reads as
       "something is happening". */
    var dr = c * 0.30;
    for (var d = 0; d < p.dots; d++) {
      var ang = (d / p.dots) * TAU + (thinking ? t * 1.25 : t * 0.10);
      var wob = thinking ? Math.sin(t * 3 + d) * 1.3 : Math.sin(t * 1.1 + d) * 0.5;
      ctx.beginPath();
      ctx.arc(c + Math.cos(ang) * (dr + wob), c + Math.sin(ang) * (dr + wob), p.dotR, 0, TAU);
      ctx.fillStyle = this.ink;
      ctx.globalAlpha = thinking
        ? 0.45 + 0.45 * Math.abs(Math.sin(t * 2.2 + d * 0.8))
        : 0.30 + 0.25 * breath;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  window.SynOrb = {
    /** Mount an orb inside `el`. opts: {preset:'lg'|'sm', state, ink, accent} */
    mount: function (el, opts) {
      if (!el || !el.getContext && !el.appendChild) return null;
      try { return new Orb(el, opts); } catch (e) { return null; }
    },
    PRESETS: PRESETS,
  };
})();
