/* IRIDESCENT FOIL, the part CSS cannot do: tell each .irid card where the
   pointer is inside it (--gx --gy --fx) and where it sits in the window as the
   page scrolls (--fy). On a phone there is no pointer, so scrolling alone makes
   the foil move, which is the effect that matters there. Reduced motion: the
   foil is drawn and stays still. */
(function () {
  'use strict';
  const calm = function () { return (window.matchMedia as typeof matchMedia | undefined) && matchMedia('(prefers-reduced-motion: reduce)').matches; };
  let ticking = false;
  function onScroll() {
    if (calm()) return;
    const h = window.innerHeight || 1, els = document.querySelectorAll('.irid');
    for (let i = 0; i < els.length; i++) {
      const r = (els[i] as HTMLElement).getBoundingClientRect();
      if (r.bottom < -80 || r.top > h + 80) continue;
      const p = Math.max(0, Math.min(1, (r.top + r.height / 2) / h));
      (els[i] as HTMLElement).style.setProperty('--fy', p.toFixed(3));
    }
  }
  function queue() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  document.addEventListener('pointermove', function (e) {
    if (calm()) return;
    const el = ((e.target as HTMLElement).closest && (e.target as HTMLElement).closest('.irid')) as HTMLElement | null; if (!el) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    el.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    el.style.setProperty('--fx', x.toFixed(3)); el.classList.add('lit');
  });
  document.addEventListener('pointerout', function (e) {
    const el = (e.target as HTMLElement).closest && (e.target as HTMLElement).closest('.irid'); if (!el || el.contains(e.relatedTarget as Node | null)) return;
    el.classList.remove('lit');
  });
  /* Cards that appear later (the portal draws billing on demand) get their first
     reading as soon as the page next scrolls or the window changes; this nudges
     the first one along. */
  setInterval(function () { if (document.visibilityState === 'visible' && document.querySelector('.irid')) queue(); }, 1500);
  queue();
})();
