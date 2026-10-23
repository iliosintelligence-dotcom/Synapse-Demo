"use client";
/**
 * Tayo's composer: the typing field, the mic and send (2026-10-23).
 *
 * The chat engine (src/legacy/toju/inline-5.js) still decides what a message does; this owns the field. It mounts into
 * #react-composer inside the page's .chatbox and hides the old field beside it, so the page keeps working if React never
 * arrives. The engine reaches it through window.TayoComposer (read, write, placeholder, listening, the element) and it
 * reaches the engine through window.TayoEngine (send, toggleMic). The engine says when it is busy with `syn:busy`.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const PLACEHOLDER = "Tell Tayo what you're looking for…";

declare global {
  interface Window {
    TayoComposer?: {
      value: () => string;
      set: (v: string) => void;
      placeholder: (p: string) => void;
      listening: (on: boolean) => void;
      el: () => HTMLInputElement | null;
    };
    TayoEngine?: { send: (text?: string) => void; toggleMic: () => void };
  }
}

function Field() {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const valueRef = useRef("");
  valueRef.current = value;

  useEffect(() => {
    window.TayoComposer = {
      value: () => valueRef.current,
      set: (v) => { valueRef.current = v; setValue(v); },
      placeholder: setPlaceholder,
      listening: setListening,
      el: () => input.current,
    };
    const onBusy = (e: Event) => setBusy(!!(e as CustomEvent).detail);
    window.addEventListener("syn:busy", onBusy);
    return () => { window.removeEventListener("syn:busy", onBusy); delete window.TayoComposer; };
  }, []);

  const { contextSafe } = useGSAP({ scope: root });
  const press = contextSafe((el: Element | null) => {
    if (!el || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    gsap.fromTo(el, { scale: 0.86 }, { scale: 1, duration: 0.45, ease: "back.out(3)", clearProps: "transform" });
  });

  const send = (btn?: Element | null) => {
    if (!valueRef.current.trim() || busy) return;
    press(btn ?? null);
    window.TayoEngine?.send();
  };

  return (
    <div ref={root} className="pillrow" data-react-composer="">
      <input
        ref={input}
        id="tjInputR"
        aria-label="Message Tayo"
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="send"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
      />
      <button
        type="button"
        className={"mic" + (listening ? " listening" : "")}
        title="Voice typing"
        aria-label={listening ? "Stop voice typing" : "Voice typing"}
        aria-pressed={listening}
        onClick={(e) => { press(e.currentTarget); window.TayoEngine?.toggleMic(); }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      </button>
      <button
        type="button"
        className="send"
        title="Send"
        aria-label="Send"
        aria-busy={busy}
        disabled={busy}
        onClick={(e) => send(e.currentTarget)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ display: "block" }}>
          <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/** Takes the old field's place once the engine is there to talk to. */
export function Composer() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const h = document.getElementById("react-composer");
    if (!h || !window.TayoEngine) return;
    const old = h.parentElement?.querySelector<HTMLElement>(".pillrow:not([data-react-composer])");
    const had = (old?.querySelector("input") as HTMLInputElement | null)?.value ?? "";
    if (old) old.style.display = "none";
    setHost(h);
    /* Anything typed before React arrived carries over. */
    if (had) requestAnimationFrame(() => window.TayoComposer?.set(had));
    return () => { if (old) old.style.display = ""; };
  }, []);
  return host ? createPortal(<Field />, host) : null;
}
