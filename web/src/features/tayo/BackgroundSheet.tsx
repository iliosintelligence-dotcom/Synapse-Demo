"use client";
/**
 * Change background, as a React component (stage 2 of the move to React, 2026-10-23).
 *
 * Signed-in people choose what sits behind the chat: the warm colour, the interior photograph or a quiet pattern, each with a
 * light and a dark version. The choice is kept on this device for that account only (toju_bg_v1, as before), so somebody else
 * signing in on the same phone sees the photograph. Signed out, it explains and offers an account.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { animateClose, MOTION, Sheet, sheetStyles as s } from "./Sheet";

const KEY = "toju_bg_v1";
type Mode = "tint" | "photo" | "pattern";
const OPTIONS: Array<{ mode: Mode; label: string }> = [{ mode: "tint", label: "Colour" }, { mode: "photo", label: "Photo" }, { mode: "pattern", label: "Pattern" }];
declare global { interface Window { SynAuth?: { ready?: () => Promise<{ id?: string } | null> } } }

const current = (): Mode => (document.documentElement.getAttribute("data-tjbg") as Mode | null) ?? "photo";
function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === "tint" || mode === "pattern") root.setAttribute("data-tjbg", mode); else root.removeAttribute("data-tjbg");
}

export function BackgroundSheet() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("photo");
  const opts = useRef<HTMLDivElement>(null);
  const ID = "synBgTitle";

  useEffect(() => {
    const show = () => {
      setMode(current());
      Promise.resolve(window.SynAuth?.ready ? window.SynAuth.ready() : null).then((u) => setMe(u && u.id ? u.id : null)).catch(() => setMe(null)).finally(() => setOpen(true));
    };
    window.addEventListener("syn:background", show);
    return () => window.removeEventListener("syn:background", show);
  }, []);

  useGSAP(() => {
    if (!open || !opts.current) return;
    gsap.matchMedia().add(MOTION, () => {
      gsap.from(opts.current!.children, { y: 14, autoAlpha: 0, scale: 0.96, duration: 0.35, ease: "back.out(1.6)", stagger: 0.06, delay: 0.12, clearProps: "transform,opacity,visibility" });
    });
  }, { dependencies: [open, me] });

  const close = useCallback(() => animateClose(document.querySelector(`[aria-labelledby="${ID}"]`), () => setOpen(false)), []);

  function choose(m: Mode, el: HTMLElement) {
    if (!me) return;
    apply(m); setMode(m);
    try { localStorage.setItem(KEY, JSON.stringify({ uid: me, mode: m })); } catch { /* the choice still shows for this visit */ }
    if (window.matchMedia(MOTION).matches) gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.5)" });
  }

  if (!open) return null;
  const here = typeof location !== "undefined" ? location.pathname + location.search : "/app/toju";
  return (
    <Sheet title="Change background" id={ID} onClose={close} closing={false}>
      {!me ? (
        <>
          <p className={s.note}>Create a free account to choose your own background: the warm colour, the interior photograph or a quiet pattern. Each has a light and a dark version.</p>
          <div className={s.confirmBtns} style={{ marginTop: 14 }}>
            <button type="button" className={s.ghost} onClick={close}>Not now</button>
            <a className={s.danger} style={{ background: "#15120f", textDecoration: "none" }} href={"signin.html?next=" + encodeURIComponent(here)}>Create an account</a>
          </div>
        </>
      ) : (
        <>
          <p className={s.note}>Pick what sits behind the chat. It follows light and dark mode.</p>
          <div ref={opts} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 12 }}>
            {OPTIONS.map((o) => (
              <button key={o.mode} type="button" aria-pressed={mode === o.mode} onClick={(e) => choose(o.mode, e.currentTarget)}
                style={{ display: "grid", gap: 8, padding: 8, borderRadius: 16, border: mode === o.mode ? "2px solid currentColor" : "2px solid transparent",
                  background: "rgba(128,128,128,0.08)", color: "inherit", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                <span className={"tj-sw " + o.mode} />
                {o.label}
              </button>
            ))}
          </div>
          <button type="button" className={s.all} onClick={close}>Done</button>
        </>
      )}
    </Sheet>
  );
}
