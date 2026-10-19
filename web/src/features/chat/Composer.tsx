"use client";

import { useEffect, useRef, useState } from "react";
import { groundedSuggestions } from "./api";
import { priceLine } from "./context";
import { useVoice } from "./useVoice";
import type { ReplyTo } from "./types";
import s from "./Chat.module.css";

const STATIC_CHIPS = ["What is available right now?", "What can I afford on ₦250,000 a month?", "What should I check before paying?"];

interface Props {
  busy: boolean;
  suggestions: string[] | null;
  replyTo: ReplyTo | null;
  introReady: boolean;
  handed: boolean;
  onSend: (text: string) => void;
  onStopReplying: () => void;
  onIntroduce: () => void;
  initialText: string;
}

/** The message box, voice typing, tap-to-answer chips, and the "Replying about" bar that stays for the whole conversation (the buyer came about this home; restating it every turn is what they were trying to avoid). */
export function Composer({ busy, suggestions, replyTo, introReady, handed, onSend, onStopReplying, onIntroduce, initialText }: Props) {
  const [text, setText] = useState(initialText);
  const [grounded, setGrounded] = useState<string[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const textRef = useRef(text);
  useEffect(() => { textRef.current = text; });
  const voice = useVoice(() => textRef.current, setText);

  useEffect(() => {
    let live = true;
    groundedSuggestions().then((g) => live && setGrounded(g));
    return () => { live = false; };
  }, []);

  const submit = () => {
    if (!text.trim() || busy) return;
    onSend(text);
    setText("");
  };
  const chips = suggestions && suggestions.length ? suggestions : grounded ?? STATIC_CHIPS;
  const rent = String(replyTo?.listing_type ?? "").toLowerCase() === "rent";

  return (
    <div className={s.composer}>
      {replyTo && (
        <div className={s.reply}>
          <div className={s.replyMain}>
            <span className={s.replyK}>Replying about</span>
            <span className={s.replyT}>{replyTo.title || "this home"}</span>
            <span className={s.replyS}>{priceLine(replyTo)}{replyTo.city ? ` · ${replyTo.city}` : ""}{rent ? " · rent is set by the agency" : ""}</span>
          </div>
          <button className={s.replyGo} type="button" disabled={handed || !introReady} title={handed ? "Already introduced" : introReady ? undefined : "Ask Tayo about this home first"} onClick={onIntroduce}>{handed ? "Introduced" : "Introduce me"}</button>
          <button className={s.replyX} type="button" aria-label="Stop replying about this home" onClick={onStopReplying}>×</button>
        </div>
      )}
      {voice.hint && <div className={s.hint} role="status">{voice.hint}</div>}
      <div className={s.chatbox}>
        <div className={s.pillrow}>
          <input
            ref={input}
            className={s.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
            placeholder={voice.listening ? "Listening… speak now" : "Tell Tayo what you're looking for…"}
            autoComplete="off"
            aria-label="Message Tayo"
          />
          <button className={`${s.mic} ${voice.listening ? s.listening : ""}`} type="button" title="Voice typing" aria-label="Voice typing" aria-pressed={voice.listening} onClick={voice.toggle}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 19v3" /></svg>
          </button>
          <button className={s.send} type="button" title="Send" aria-label="Send" disabled={busy} onClick={submit}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ display: "block" }}><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        {suggestions !== null && suggestions.length === 0 ? null : (
          <div className={s.suggest}>
            {chips.map((c) => <button key={c} type="button" disabled={busy} onClick={() => onSend(c)}>{c}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}
