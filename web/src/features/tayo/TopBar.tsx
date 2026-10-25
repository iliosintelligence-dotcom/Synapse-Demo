"use client";
/**
 * Tayo's top bar on a phone, as a React component (stage 2 of the move to React, 2026-10-23).
 *
 * A menu in one corner (past conversations, pinned, what Tayo remembers, change background), the sections as a pill in the
 * middle, start-again in the other corner. It floats over the conversation (see the phone rules in src/legacy/toju/inline-2.css).
 *
 * The menu's actions drive the page's existing controls (the desktop Chats menu, which is always in the page) rather than
 * re-implementing them, so history, pins, memory, background and new chat behave exactly as they always have while the rest of
 * the page is still moving across.
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);
/* Motion only for people who have not asked their phone for less of it. */
const MOTION = "(prefers-reduced-motion: no-preference)";

/* The same line icons as src/shared/icons.js, so the bar matches the rest of the app. */
const PATHS: Record<string, string> = {
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
  heart: '<path d="M12 20s-7-4.5-9.2-9A4.6 4.6 0 0 1 12 6.5 4.6 4.6 0 0 1 21.2 11c-2.2 4.5-9.2 9-9.2 9z"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>',
  boards: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
};
function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg className="syn-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PATHS[name] }} />
  );
}

const MENU: Array<{ label: string; icon: keyof typeof PATHS; control: string }> = [
  { label: "Past conversations", icon: "history", control: "tjHist" },
  { label: "Pinned", icon: "heart", control: "tjPins" },
  { label: "What Tayo remembers", icon: "user", control: "tjMem" },
  { label: "Change background", icon: "boards", control: "tjBg" },
];

/** Press one of the page's own controls. */
const press = (id: string) => (document.getElementById(id) as HTMLElement | null)?.click();

export function TopBar() {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const bar = useRef<HTMLElement>(null);
  const again = useRef<HTMLButtonElement>(null);

  /* The bar arrives: the corners and the tabs drop in, one after another. */
  useGSAP(() => {
    gsap.matchMedia().add(MOTION, () => {
      gsap.from(".tjm-act, .tjm-tabs", { y: -14, autoAlpha: 0, duration: 0.55, ease: "power3.out", stagger: 0.07, clearProps: "transform,opacity,visibility" });
    });
  }, { scope: bar });

  /* The menu springs open from its corner, and its rows follow. */
  useGSAP(() => {
    if (!open || !menu.current) return;
    gsap.matchMedia().add(MOTION, () => {
      gsap.fromTo(menu.current, { autoAlpha: 0, y: -8, scale: 0.94, transformOrigin: "top left" },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "back.out(1.6)" });
      gsap.from(menu.current!.querySelectorAll("button"), { x: -10, autoAlpha: 0, duration: 0.25, ease: "power2.out", stagger: 0.04, delay: 0.05, clearProps: "transform,opacity,visibility" });
    });
  }, { dependencies: [open] });

  const startAgain = () => {
    if (again.current && window.matchMedia(MOTION).matches) gsap.fromTo(again.current, { rotate: 0 }, { rotate: -360, duration: 0.6, ease: "power2.inOut" });
    press("tjNew");
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !more.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <header ref={bar} className="tjm-bar">
      <button ref={more} className="tjm-act" type="button" aria-label="More" aria-haspopup="menu" aria-expanded={open} aria-controls="tjmMenu"
        onClick={() => setOpen((o) => !o)}>
        <Icon name="history" />
      </button>
      <nav className="tjm-tabs" aria-label="Synapse">
        <a href="../buyers.html" data-keep-landing="">Home</a>
        <a href="toju.html" className="on" aria-current="page">Chat</a>
        <a href="browse.html">Matches</a>
        <a href="dream.html">Boards</a>
      </nav>
      <button ref={again} className="tjm-act" type="button" aria-label="New chat" onClick={startAgain}>↺</button>
      <div ref={menu} className="tjm-menu" id="tjmMenu" role="menu" aria-label="Chats" hidden={!open}>
        {MENU.map((m) => (
          <button key={m.control} type="button" role="menuitem" onClick={() => { setOpen(false); press(m.control); }}>
            <Icon name={m.icon} />
            {m.label}
          </button>
        ))}
      </div>
    </header>
  );
}
