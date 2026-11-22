"use client";
/**
 * What the landing pages do (React since 2026-10-24; was public/home.js, public/app/foil.js and the main landing's goodbye script):
 *
 *   ModeButton       the light/dark switch, and the clock that turns the page at 7pm and 7am (Lagos time)
 *   LandingEffects   the bar's hairline on scroll, always opening at the top, the two scroll-driven carousels on the main
 *                    landing (the reality row and the vertical reel), and the iridescent foil on .irid cards
 *   Goodbye          after an agency deletes itself, the note that says what was deleted
 *
 * The first paint's theme is still stamped by the inline script in each page's <head> (window.SynHome), before React runs.
 */
import { useEffect, useState } from "react";

type SynHome = { byClock: () => "light" | "dark"; chosen: () => string | null; choose: (t: string | null) => void };
const home = () => (window as unknown as { SynHome?: SynHome }).SynHome;
const KEY = "syn_theme_pick";

function paint(t: string) {
  document.documentElement.setAttribute("data-theme", t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#000000" : "#FAF6F0");
}
/* 07:00 and 19:00 in Lagos are 06:00 and 18:00 UTC. */
function nextSwitch() {
  const now = new Date();
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (const t of [day + 6 * 3600e3, day + 18 * 3600e3, day + 30 * 3600e3]) if (t > now.getTime()) return t;
  return day + 30 * 3600e3;
}

/** The switch. A choice holds until the next 7am/7pm switch and is shared with the app (app/theme.js reads the same key). */
export function ModeButton() {
  const [theme, setTheme] = useState<string>("light");
  useEffect(() => {
    const t0 = document.documentElement.getAttribute("data-theme") || "light";
    paint(t0); setTheme(t0);
    let pickUntil = 0;
    try { const p0 = JSON.parse(localStorage.getItem(KEY) || "null"); if (p0 && p0.until > Date.now()) pickUntil = p0.until; } catch { /* none */ }
    (window as unknown as { __synPick?: { get: () => number; set: (n: number) => void } }).__synPick = { get: () => pickUntil, set: (n) => { pickUntil = n; } };
    /* Left open across 7pm or 7am, the page turns with the clock; a choice made with the switch lapses at that moment too. */
    const iv = setInterval(() => {
      const h = home(); if (!h) return;
      if (h.chosen() && pickUntil && Date.now() >= pickUntil) { h.choose(null); pickUntil = 0; }
      if (!h.chosen() && document.documentElement.getAttribute("data-theme") !== h.byClock()) { const t = h.byClock(); paint(t); setTheme(t); }
    }, 60000);
    return () => clearInterval(iv);
  }, []);
  const toggle = () => {
    const h = home();
    const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    const back = !!h && t === h.byClock();
    h?.choose(back ? null : t);
    const until = back ? 0 : nextSwitch();
    (window as unknown as { __synPick?: { set: (n: number) => void } }).__synPick?.set(until);
    try { if (back) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify({ t, until })); } catch { /* private mode */ }
    paint(t); setTheme(t);
  };
  return (
    <button type="button" className="mode" id="modeBtn" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggle}>
      <svg className="moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z" />
      </svg>{" "}
      <svg className="sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </svg>
    </button>
  );
}

/* The reality row: on a wide screen with motion allowed the section holds still under the bar and the page's scroll moves the
   row sideways; everywhere else it is a swipe row with arrows and a count. */
function realityRow(): (() => void) | void {
  const sec = document.getElementById("reality"); if (!sec) return;
  const pin = document.getElementById("rlPin")!, stage = document.getElementById("rlStage")!;
  const rail = document.getElementById("rlRail")!, track = document.getElementById("rlTrack")!;
  const prev = document.getElementById("rlPrev") as HTMLButtonElement, next = document.getElementById("rlNext") as HTMLButtonElement;
  const count = document.getElementById("rlCount")!;
  const cards = Array.from(track.querySelectorAll<HTMLElement>(".rl-card"));
  if (!cards.length) return;
  const wide = window.matchMedia("(min-width: 961px)"), still = window.matchMedia("(prefers-reduced-motion: reduce)");
  let dist = 0, pinned = false, ticking = false, t: ReturnType<typeof setTimeout>, rt: ReturnType<typeof setTimeout>;
  const onScroll = () => {
    if (!pinned) return;
    const r = pin.getBoundingClientRect(), span = pin.offsetHeight - stage.offsetHeight;
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const p = span > 0 ? Math.min(1, Math.max(0, (top - r.top) / span)) : 0;
    rail.style.transform = "translate3d(" + (-p * dist).toFixed(1) + "px, 0, 0)";
  };
  const measureArt = () => {
    const art = cards[0].querySelector<HTMLElement>(".rl-art"); if (!art) return;
    const mid = art.getBoundingClientRect().top - stage.getBoundingClientRect().top + art.offsetHeight / 2;
    stage.style.setProperty("--art-mid", Math.round(mid) + "px");
  };
  const index = () => {
    let best = 0, bestD = Infinity; const x0 = cards[0].offsetLeft;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - x0 - track.scrollLeft); if (d < bestD) { bestD = d; best = i; } });
    return best;
  };
  const sync = () => { const i = index(); count.textContent = i + 1 + " / " + cards.length; prev.disabled = i === 0; next.disabled = i === cards.length - 1; };
  const go = (i: number) => {
    i = Math.max(0, Math.min(cards.length - 1, i));
    track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: still.matches ? "auto" : "smooth" });
  };
  const layout = () => {
    pinned = wide.matches && !still.matches;
    sec.classList.toggle("rl-pinned", pinned);
    rail.style.transform = "";
    if (!pinned) { pin.style.height = ""; measureArt(); sync(); return; }
    dist = Math.max(0, rail.scrollWidth - stage.clientWidth);
    pin.style.height = stage.offsetHeight + dist + "px";
    onScroll();
  };
  const onPrev = () => go(index() - 1), onNext = () => go(index() + 1);
  const onTrack = () => { clearTimeout(t); t = setTimeout(sync, 60); };
  const onWin = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); };
  const onResize = () => { clearTimeout(rt); rt = setTimeout(layout, 120); };
  prev.addEventListener("click", onPrev); next.addEventListener("click", onNext);
  track.addEventListener("scroll", onTrack, { passive: true });
  window.addEventListener("scroll", onWin, { passive: true });
  window.addEventListener("resize", onResize);
  wide.addEventListener("change", layout); still.addEventListener("change", layout);
  window.addEventListener("load", layout);   // fonts and images settle widths
  layout();
  return () => {
    prev.removeEventListener("click", onPrev); next.removeEventListener("click", onNext);
    track.removeEventListener("scroll", onTrack); window.removeEventListener("scroll", onWin); window.removeEventListener("resize", onResize);
    wide.removeEventListener("change", layout); still.removeEventListener("change", layout); window.removeEventListener("load", layout);
  };
}

/* The vertical reel: held still on a wide screen while the page's scroll picks which idea is in the middle; a plain list, where
   tapping an idea shows its picture, everywhere else. */
function verticalReel(): (() => void) | void {
  const sec = document.getElementById("vcar"); if (!sec) return;
  const pin = document.getElementById("vcPin")!, stage = document.getElementById("vcStage")!;
  const track = document.getElementById("vcTrack")!, reel = document.getElementById("vcReel")!;
  const items = Array.from(track.querySelectorAll<HTMLElement>(".vc-item"));
  const shots = Array.from(sec.querySelectorAll<HTMLElement>(".vc-shot"));
  const ticks = Array.from(sec.querySelectorAll<HTMLElement>(".vc-ticks i"));
  if (!items.length) return;
  const wide = window.matchMedia("(min-width: 961px)"), still = window.matchMedia("(prefers-reduced-motion: reduce)");
  let pinned = false, cur = -1, step = 0, ticking = false, rt: ReturnType<typeof setTimeout>;
  const show = (i0: number) => {
    const i = Math.max(0, Math.min(items.length - 1, i0));
    if (i === cur) return;
    cur = i;
    items.forEach((it, n) => { it.classList.toggle("on", n === i); it.setAttribute("aria-current", n === i ? "true" : "false"); });
    shots.forEach((s, n) => s.classList.toggle("on", n === i));
    ticks.forEach((t, n) => t.classList.toggle("on", n === i));
    if (pinned) {
      const h = items[0].offsetHeight, mid = (reel.clientHeight - h) / 2;
      track.style.transform = "translate3d(0," + (mid - i * h).toFixed(1) + "px,0)";
    } else track.style.transform = "";
  };
  const onScroll = () => {
    if (!pinned) return;
    const r = pin.getBoundingClientRect(), span = pin.offsetHeight - stage.offsetHeight;
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const p = span > 0 ? Math.min(1, Math.max(0, (top - r.top) / span)) : 0;
    show(Math.min(items.length - 1, Math.floor(p * items.length)));
  };
  const layout = () => {
    pinned = wide.matches && !still.matches;
    sec.classList.toggle("vc-pinned", pinned);
    if (!pinned) { pin.style.height = ""; const c = cur; cur = -1; show(c < 0 ? 0 : c); return; }
    step = Math.round(window.innerHeight * 0.55);   // one screen of scrolling per idea
    pin.style.height = stage.offsetHeight + step * (items.length - 1) + step * 0.4 + "px";
    const c2 = cur; cur = -1; show(c2 < 0 ? 0 : c2);
    onScroll();
  };
  const pick = (i: number) => {
    if (!pinned) { show(i); return; }
    const top = pin.getBoundingClientRect().top + window.pageYOffset;
    const stageTop = parseFloat(getComputedStyle(stage).top) || 0;
    window.scrollTo({ top: top - stageTop + step * i + step * 0.2, behavior: still.matches ? "auto" : "smooth" });
  };
  const offs: Array<() => void> = [];
  items.forEach((it, n) => {
    const click = () => pick(n);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(n); }
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); const k = Math.min(items.length - 1, n + 1); items[k].focus(); pick(k); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); const k = Math.max(0, n - 1); items[k].focus(); pick(k); }
    };
    it.addEventListener("click", click); it.addEventListener("keydown", key);
    offs.push(() => { it.removeEventListener("click", click); it.removeEventListener("keydown", key); });
  });
  const onWin = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); };
  const onResize = () => { clearTimeout(rt); rt = setTimeout(layout, 120); };
  window.addEventListener("scroll", onWin, { passive: true });
  window.addEventListener("resize", onResize);
  wide.addEventListener("change", layout); still.addEventListener("change", layout);
  window.addEventListener("load", layout);
  layout();
  return () => {
    offs.forEach((f) => f());
    window.removeEventListener("scroll", onWin); window.removeEventListener("resize", onResize);
    wide.removeEventListener("change", layout); still.removeEventListener("change", layout); window.removeEventListener("load", layout);
  };
}

/* The iridescent foil: each .irid card learns where the pointer is inside it (--gx --gy --fx) and where it sits in the window
   as the page scrolls (--fy). Reduced motion: drawn, and still. */
function foil(): () => void {
  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ticking = false;
  const onScroll = () => {
    if (calm()) return;
    const h = window.innerHeight || 1;
    document.querySelectorAll<HTMLElement>(".irid").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > h + 80) return;
      el.style.setProperty("--fy", Math.max(0, Math.min(1, (r.top + r.height / 2) / h)).toFixed(3));
    });
  };
  const queue = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); };
  const move = (e: PointerEvent) => {
    if (calm()) return;
    const el = (e.target as HTMLElement).closest?.<HTMLElement>(".irid"); if (!el) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    el.style.setProperty("--gx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
    el.style.setProperty("--fx", x.toFixed(3)); el.classList.add("lit");
  };
  const out = (e: PointerEvent) => {
    const el = (e.target as HTMLElement).closest?.<HTMLElement>(".irid"); if (!el || el.contains(e.relatedTarget as Node)) return;
    el.classList.remove("lit");
  };
  window.addEventListener("scroll", queue, { passive: true }); window.addEventListener("resize", queue);
  document.addEventListener("pointermove", move); document.addEventListener("pointerout", out);
  const iv = setInterval(() => { if (document.visibilityState === "visible" && document.querySelector(".irid")) queue(); }, 1500);
  queue();
  return () => {
    window.removeEventListener("scroll", queue); window.removeEventListener("resize", queue);
    document.removeEventListener("pointermove", move); document.removeEventListener("pointerout", out); clearInterval(iv);
  };
}

export function LandingEffects() {
  useEffect(() => {
    /* The bar's hairline once the page scrolls. */
    const nav = document.getElementById("nav");
    const scrolled = () => nav?.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", scrolled, { passive: true }); scrolled();
    /* Always open at the top (a link to a section, #pricing, still goes there). */
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch { /* old browsers */ }
    const top = () => { if (!location.hash) window.scrollTo(0, 0); };
    const shown = (e: PageTransitionEvent) => { if (e.persisted) top(); };
    top(); window.addEventListener("load", top); window.addEventListener("pageshow", shown);
    const offs = [realityRow(), verticalReel(), foil()];
    return () => {
      window.removeEventListener("scroll", scrolled); window.removeEventListener("load", top); window.removeEventListener("pageshow", shown);
      offs.forEach((f) => f && f());
    };
  }, []);
  return null;
}

/** After an agency deletes itself: says what was done, not what sounds most final, for twelve seconds. */
export function Goodbye() {
  const [g, setG] = useState<{ login?: string } | null>(null);
  useEffect(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem("synapse_goodbye_v1") || "null");
      sessionStorage.removeItem("synapse_goodbye_v1");
      if (v && v.kind === "agency") { setG(v); const t = setTimeout(() => setG(null), 12000); return () => clearTimeout(t); }
    } catch { /* storage blocked */ }
  }, []);
  if (!g) return null;
  return (
    <div className="goodbye" role="status">
      <span>{g.login === "kept"
        ? "Your agency has been deleted. Your Synapse login was kept, because you still use it elsewhere on Synapse."
        : "Your agency and your Synapse account have been deleted."}</span>
      <button type="button" aria-label="Dismiss" onClick={() => setG(null)}>×</button>
    </div>
  );
}
