"use client";
/**
 * A voice call with Tayo (Eden, 2026-10-24: "so it feels like a phone call"). You talk, he answers out loud, you talk again,
 * with no typing, recording or sending in between.
 *
 * It is the same conversation, not a second one: what you say goes through TayoEngine.send() and Tayo's answers are the ones the
 * chat already shows, so the whole call is in the thread afterwards, homes and all. The browser does the listening (Web Speech
 * recognition, which ends a turn when you stop talking) and the speaking (speechSynthesis, a Nigerian English voice where the
 * device has one). While Tayo speaks the mic is off, so he never hears himself; tap him to cut in.
 *
 * An error is never spoken in Tayo's voice (he didn't say it): the call shows it and listens again.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import s from "./VoiceCall.module.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Phase = "connecting" | "listening" | "thinking" | "speaking" | "muted" | "off";
const W = () => window as any;
const SR = () => (typeof window === "undefined" ? null : W().SpeechRecognition || W().webkitSpeechRecognition || null);
export const callSupported = () => !!SR() && typeof window !== "undefined" && "speechSynthesis" in window;

/* What Tayo writes is for reading; this is for hearing. Prices are said the way people say them, and no markup is read out. */
function speakable(t: string) {
  return String(t || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>|]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/₦\s?([\d.,]+)\s?B\b/gi, "$1 billion naira")
    .replace(/₦\s?([\d.,]+)\s?M\b/gi, "$1 million naira")
    .replace(/₦\s?([\d.,]+)\s?k\b/gi, "$1 thousand naira")
    .replace(/₦\s?([\d][\d,]*)/g, "$1 naira")
    .replace(/\/yr\b/g, " a year").replace(/\/mo\b/g, " a month").replace(/\/night\b/g, " a night")
    .replace(/\bsqm\b/gi, "square metres")
    .replace(/\s+/g, " ")
    .trim();
}
/* A Nigerian English voice first; then the natural-sounding English ones; then any English. */
function pickVoice(): SpeechSynthesisVoice | null {
  const vs = window.speechSynthesis.getVoices();
  const en = vs.filter((v) => /^en/i.test(v.lang));
  return en.find((v) => /en[-_]NG/i.test(v.lang))
    || en.find((v) => /natural|online/i.test(v.name) && /en[-_]GB/i.test(v.lang))
    || en.find((v) => /natural|online/i.test(v.name))
    || en.find((v) => /en[-_]GB/i.test(v.lang))
    || en[0] || null;
}
/* Long utterances stop partway in Chrome, so Tayo speaks a sentence at a time. */
const sentences = (t: string) => (t.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) || [t]).map((x) => x.trim()).filter(Boolean);
const clock = (sec: number) => Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");

const STATUS: Record<Phase, string> = { connecting: "Connecting…", listening: "Listening…", thinking: "Tayo is thinking…", speaking: "Tayo is speaking", muted: "You’re muted", off: "The call couldn’t start" };

function Call({ onEnd }: { onEnd: () => void }) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [heard, setHeard] = useState("");
  const [said, setSaid] = useState("");
  const [note, setNote] = useState("");
  const [secs, setSecs] = useState(0);
  const live = useRef(true);
  const muted = useRef(false);
  const recog = useRef<any>(null);
  const phaseRef = useRef<Phase>("connecting");
  const go = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const stopListening = () => { const r = recog.current; recog.current = null; if (r) { r.onend = null; r.onresult = null; r.onerror = null; try { r.abort(); } catch { /* already stopped */ } } };

  const listen = () => {
    if (!live.current) return;
    if (muted.current) { go("muted"); return; }
    stopListening();
    const Rec = SR(); const r = new Rec();
    try { r.lang = navigator.language && /^en/i.test(navigator.language) ? navigator.language : "en-US"; } catch { r.lang = "en-US"; }
    r.interimResults = true; r.continuous = false;
    let finalText = "";
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      setHeard((finalText + interim).trim());
    };
    r.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { setNote("The microphone is blocked for this site. Allow it in the address bar, then call again."); live.current = false; go("off"); }
      else if (e.error === "audio-capture") { setNote("No microphone found."); live.current = false; go("off"); }
      else if (e.error === "network") setNote("Voice needs a connection. Trying again…");
    };
    /* The turn ends when you stop talking: send what was said, or listen again if it was silence. */
    r.onend = () => {
      recog.current = null;
      if (!live.current || phaseRef.current !== "listening") return;
      const text = finalText.trim();
      if (!text) { listen(); return; }
      ask(text);
    };
    recog.current = r;
    try { r.start(); go("listening"); setHeard(""); }
    catch { setTimeout(listen, 400); }
  };

  const ask = (text: string) => {
    go("thinking"); setNote(""); setSaid("");
    const E = W().TayoEngine;
    if (!E) { setNote("Tayo isn’t ready yet. Try again in a moment."); listen(); return; }
    E.send(text);
  };

  const speak = (text: string, matches: number) => {
    if (!live.current) return;
    const t = speakable(text);
    setSaid(text);
    if (matches > 0) setNote(matches === 1 ? "One home is in the chat for you." : matches + " homes are in the chat for you.");
    const synth = window.speechSynthesis;
    synth.cancel();
    const v = pickVoice(), parts = sentences(t);
    if (!parts.length) { listen(); return; }
    go("speaking");
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = 1.02;
      if (i === parts.length - 1) { u.onend = () => { if (live.current && phaseRef.current === "speaking") listen(); }; u.onerror = u.onend; }
      synth.speak(u);
    });
  };

  /* Tap Tayo while he talks to cut in. */
  const interrupt = () => { if (phaseRef.current !== "speaking") return; window.speechSynthesis.cancel(); listen(); };
  const toggleMute = () => {
    muted.current = !muted.current;
    if (muted.current) { stopListening(); if (phaseRef.current === "listening") go("muted"); }
    else if (phaseRef.current === "muted") listen();
    setNote("");
  };
  const end = () => { live.current = false; stopListening(); try { window.speechSynthesis.cancel(); } catch { /* nothing playing */ } onEnd(); };

  useEffect(() => {
    const onReply = (e: Event) => { const d = (e as CustomEvent).detail || {}; if (phaseRef.current === "thinking") speak(String(d.text || ""), Number(d.matches) || 0); };
    const onFail = () => { if (phaseRef.current !== "thinking") return; setNote("That didn’t go through. Say it again."); listen(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") end(); };
    window.addEventListener("syn:tayo-reply", onReply);
    window.addEventListener("syn:tayo-failed", onFail);
    document.addEventListener("keydown", onKey);
    const tick = setInterval(() => setSecs((n) => n + 1), 1000);
    /* The screen stays on for the length of the call, where the browser allows it. */
    let lock: any = null;
    W().navigator?.wakeLock?.request?.("screen").then((l: any) => { lock = l; }).catch(() => {});
    /* Ask for the microphone the reliable way, then start listening. */
    navigator.mediaDevices?.getUserMedia?.({ audio: true })
      .then((st) => { st.getTracks().forEach((t) => t.stop()); listen(); })
      .catch(() => { setNote("The microphone is blocked for this site. Allow it in the address bar, then call again."); live.current = false; go("off"); });
    return () => {
      live.current = false; stopListening();
      try { window.speechSynthesis.cancel(); } catch { /* nothing playing */ }
      window.removeEventListener("syn:tayo-reply", onReply); window.removeEventListener("syn:tayo-failed", onFail);
      document.removeEventListener("keydown", onKey); clearInterval(tick); lock?.release?.().catch?.(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caption = phase === "speaking" ? said : phase === "thinking" ? heard : heard || (phase === "listening" ? "Go ahead, I’m listening." : "");
  return (
    <div className={s.call} role="dialog" aria-modal="true" aria-label="Voice call with Tayo">
      <div className={s.top}>
        <span className={s.who}>Tayo</span>
        <span className={s.time} aria-label={"Call time " + clock(secs)}>{clock(secs)}</span>
      </div>
      <button type="button" className={s.face + " " + s[phase]} onClick={interrupt} aria-label={phase === "speaking" ? "Interrupt Tayo" : "Tayo"} disabled={phase !== "speaking"}>
        <span className={s.ring} aria-hidden="true"></span>
        <span className={s.ring2} aria-hidden="true"></span>
        <img src="../images/brand/mark-black-on-white-tight.jpg" alt="" />
      </button>
      <p className={s.status} aria-live="polite">{STATUS[phase]}{phase === "speaking" ? <span className={s.hint}> · tap to cut in</span> : null}</p>
      <p className={s.caption}>{caption}</p>
      {note ? <p className={s.note} role="status">{note}</p> : null}
      <div className={s.controls}>
        <button type="button" className={s.ctl + (phase === "muted" ? " " + s.on : "")} onClick={toggleMute} aria-pressed={phase === "muted"} aria-label={phase === "muted" ? "Unmute" : "Mute"}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="19" x2="12" y2="22" />
            {phase === "muted" ? <line x1="3" y1="3" x2="21" y2="21" /> : null}
          </svg>
          <span>{phase === "muted" ? "Unmute" : "Mute"}</span>
        </button>
        <button type="button" className={s.ctl + " " + s.end} onClick={end} aria-label="End call">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
            <path d="M12 9c-2.6 0-5.1.5-7.4 1.5-.9.4-1.4 1.3-1.3 2.2l.2 1.8c.1.9.9 1.5 1.8 1.4l2.9-.4c.8-.1 1.4-.8 1.4-1.6v-1.6c1.6-.4 3.2-.4 4.8 0v1.6c0 .8.6 1.5 1.4 1.6l2.9.4c.9.1 1.7-.5 1.8-1.4l.2-1.8c.1-.9-.4-1.8-1.3-2.2C17.1 9.5 14.6 9 12 9z" />
          </svg>
          <span>End</span>
        </button>
      </div>
    </div>
  );
}

/** Listens for `syn:call-start` (the call button in the composer) and holds the call screen while it lasts. */
export function VoiceCall() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const start = () => {
      /* Some phones only let speech play after a tap: an empty utterance inside this tap unlocks it for the call. */
      try { window.speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch { /* no speech on this device */ }
      setOn(true);
    };
    window.addEventListener("syn:call-start", start);
    return () => window.removeEventListener("syn:call-start", start);
  }, []);
  return on ? createPortal(<Call onEnd={() => setOn(false)} />, document.body) : null;
}
