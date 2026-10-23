"use client";
/**
 * "Replying about", the strip above Tayo's typing box (2026-10-24): the home this conversation is about, Introduce me, and ×
 * to stop. Introduce me opens once there has been a conversation (two of your messages); it is the same introduction the old
 * strip made, run by the chat engine (src/legacy/toju/inline-5.js), which publishes the strip in window.TayoReply.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useEngineReady } from "./useEngineReady";
import gsap from "gsap";

type ReplyState = { title: string; sub: string; label: string; disabled: boolean; why: string } | null;
type ReplyStore = { react: boolean; attach: () => void; state: () => ReplyState; subscribe: (f: () => void) => () => void };
declare global {
  interface Window { TayoReply?: ReplyStore }
}
const api = () => window.TayoEngine as unknown as { clearReply: () => void; handOff: () => void } | undefined;

function Strip({ store, box }: { store: ReplyStore; box: HTMLElement }) {
  const s = useSyncExternalStore(store.subscribe, store.state, () => null);
  const shown = useRef(false);
  /* The box is the page's; it is shown only while there is a home to reply about, and slides in when one arrives. */
  useEffect(() => {
    box.hidden = !s;
    if (s && !shown.current && window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
      gsap.fromTo(box, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out", clearProps: "transform,opacity" });
    }
    shown.current = !!s;
  }, [s, box]);
  if (!s) return null;
  return (
    <>
      <div className="tjr-main">
        <span className="tjr-k">Replying about</span>
        <span className="tjr-t">{s.title}</span>
        <span className="tjr-s">{s.sub}</span>
      </div>
      <button className="tjr-go" id="tjHandoff" type="button" disabled={s.disabled} title={s.why || undefined} onClick={() => api()?.handOff()}>{s.label}</button>
      <button className="tjr-x" id="tjReplyX" type="button" aria-label="Stop replying about this home" onClick={() => api()?.clearReply()}>{"×"}</button>
    </>
  );
}

/** Takes #tjReply over from the engine's old drawing once both are there. */
export function ReplyStrip() {
  const [box, setBox] = useState<HTMLElement | null>(null);
  const ready = useEngineReady();
  useEffect(() => {
    if (!ready) return;
    const b = document.getElementById("tjReply");
    const store = window.TayoReply;
    if (!b || !store || !window.TayoEngine) return;
    while (b.firstChild) b.removeChild(b.firstChild);   // the old drawing
    store.attach();
    setBox(b);
  }, [ready]);
  const store = typeof window !== "undefined" ? window.TayoReply : undefined;
  return box && store ? createPortal(<Strip store={store} box={box} />, box) : null;
}
