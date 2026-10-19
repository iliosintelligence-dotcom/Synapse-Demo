"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Zyn } from "@/components/Zyn";
import { zynForReply } from "@/components/zynState";
import { PANE_NOTE, ask, boldParts, chipsFor, fetchStage, type Stage, type Turn } from "./data/advisor";
import type { PaneId } from "./roles";
import s from "./Advisor.module.css";

interface Msg { who: "you" | "tayo" | "bad"; text: string }

/**
 * Ask Tayo: the advisor you can actually talk to, on every pane. A floating Zyn opens it; the top says what the screen decides, then a conversation with
 * an advisor that is handed a live snapshot of THIS agency (the server builds it, so it cannot be argued into someone else's numbers).
 * The conversation lasts for the session and is not stored.
 */
export function AdvisorPanel({ pane }: { pane: PaneId }) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<Msg[]>([]);
  const [history, setHistory] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState("waving");
  const [stage, setStage] = useState<Stage>("running");
  const scroller = useRef<HTMLDivElement>(null);
  const note = PANE_NOTE[pane];

  // suggestions follow where the agency actually is; read when the panel opens, so they are right the moment it does
  useEffect(() => { if (open) fetchStage().then(setStage).catch(() => {}); }, [open]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [open]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [thread]);

  const send = useCallback(async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true); setText(""); setMood("thinking");
    setThread((t) => [...t, { who: "you", text: question }, { who: "tayo", text: "Thinking…" }]);
    try {
      const answer = await ask(question, history);
      setThread((t) => [...t.slice(0, -1), { who: "tayo", text: answer }]);
      setHistory((h) => [...h, { role: "user", content: question }, { role: "assistant", content: answer }]);
      setMood(zynForReply({ text: answer }));
    } catch (e) {
      setThread((t) => [...t.slice(0, -1), { who: "bad", text: e instanceof Error ? e.message : "Could not reach the advisor just now." }]);
      setMood("sorry");
    } finally { setBusy(false); }
  }, [busy, history]);

  return (
    <>
      <button type="button" className={s.fab} aria-label="Ask Tayo" aria-expanded={open} onClick={() => { setOpen(true); setMood("waving"); }}><Zyn state="happy" size={72} /></button>
      {open && <div className={s.scrim} onClick={() => setOpen(false)} />}
      <aside className={`${s.panel} ${open ? s.on : ""}`} aria-label="Ask Tayo" aria-hidden={!open} inert={!open}>
        <header className={s.head}>
          <Zyn state={mood} size={52} />
          <div className={s.titles}><div className={s.tt}>{note.title}</div><div className={s.sb}>{note.sub}</div></div>
          <button type="button" className={s.x} aria-label="Close" onClick={() => setOpen(false)}>×</button>
        </header>
        <div className={s.scroll} ref={scroller}>
          {note.lines.length > 0 && <div className={s.sec}>{note.lines.map((l) => <div key={l} className={s.line}><span aria-hidden="true">→</span><span>{l}</span></div>)}</div>}
          <div className={s.thread} aria-live="polite">
            {thread.map((m, i) => <div key={i} className={`${s.msg} ${s[m.who]}`}>{boldParts(m.text).map((p, k) => (p.b ? <b key={k}>{p.t}</b> : <span key={k}>{p.t}</span>))}</div>)}
          </div>
          {!busy && <div className={s.chips}>{chipsFor(stage, pane).map((q) => <button key={q} type="button" onClick={() => void send(q)}>{q}</button>)}</div>}
        </div>
        <form className={s.ask} onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <input type="text" autoComplete="off" placeholder="Ask about your numbers, or how to do something…" aria-label="Ask the advisor" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Send">↑</button>
        </form>
      </aside>
    </>
  );
}
