"use client";
/**
 * Tayo's composer: the typing field, the mic and send (2026-10-23).
 *
 * The chat engine (engine.ts) decides what a message does; this owns the field. It mounts into #react-composer inside the
 * page's .chatbox. The engine reaches it through window.TayoComposer (read, write, placeholder, listening, the element) and it
 * reaches the engine through window.TayoEngine (send, toggleMic). The engine says when it is busy with `syn:busy`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEngineReady } from "./useEngineReady";
import { VoiceCall, callSupported } from "./VoiceCall";
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
  /* The call needs speech in both directions; a browser without it never shows the button. Known only on the client. */
  const [callOk, setCallOk] = useState(false);
  useEffect(() => { const t = setTimeout(() => setCallOk(callSupported()), 0); return () => clearTimeout(t); }, []);
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

  /* The swap pops in: a new button (mic or send) arrives small and turned, then settles. Not on first paint. */
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);
  const swapIn = useCallback((el: HTMLButtonElement | null) => {
    if (!el || !mounted.current || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    gsap.fromTo(el, { scale: 0.6, rotate: -45, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.32, ease: "back.out(2.2)", clearProps: "transform,opacity" });
  }, []);

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
      {/* ONE BUTTON (Eden, 2026-10-24, like Hark): the mic while the box is empty, the send arrow once there is something
          to send. While listening it stays the mic, so the same button stops it. */}
      {value.trim() && !listening ? (
        <button
          key="send"
          ref={swapIn}
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
      ) : (
        <>
        {callOk && !listening ? (
          <button
            key="call"
            type="button"
            className="mic call"
            title="Call Tayo"
            aria-label="Call Tayo"
            onClick={(e) => { press(e.currentTarget); window.dispatchEvent(new Event("syn:call-start")); }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
            </svg>
          </button>
        ) : null}
        <button
          key="mic"
          ref={swapIn}
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
        </>
      )}
    </div>
  );
}

/** Appears once the engine is there to talk to. */
export function Composer() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const ready = useEngineReady();
  useEffect(() => {
    if (!ready) return;
    const h = document.getElementById("react-composer");
    if (h && window.TayoEngine) setHost(h);
  }, [ready]);
  return host ? <>{createPortal(<Field />, host)}<VoiceCall /></> : null;
}
