"use client";
/**
 * Things only a person can do, as a pop-up card (was paintTask/onTaskClick in src/legacy/agency/inline-3.js). Eden: "things that
 * need you to copy and paste, don't have them fixed on the page. Let them come as a pop-up."
 *
 * A task arrives when it becomes true, says exactly what to paste where, and leaves when it is done. Which tasks exist is still
 * portalShell's (setTasks/openTasks/findTask, beside the sources that know); showTasks(list) hands them here with `syn:tasks-show`,
 * and this marks them through portalShell's taskMark(kind, id) so the bell and the card agree on what is done.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

type Task = { id: string; once?: boolean; eye?: string; title: string; body?: string; copies?: { label?: string; text: string }[]; where?: string;
  action?: { label: string; run?: () => void } };

type State = { queue: Task[]; idx: number };
let state: State = { queue: [], idx: 0 };
const subs = new Set<() => void>();
const set = (v: State) => { state = v; subs.forEach((f) => f()); };
const useCard = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
const noSubscribe = () => () => {};
const mark = (kind: "done" | "later", id: string) => { try { W().taskMark?.(kind, id); } catch { /* the card still closes */ } };

/* Joins a card already open rather than replacing what somebody is in the middle of reading. */
function show(list: Task[]) {
  if (!list || !list.length) return;
  if (state.queue[state.idx]) {
    const queue = [...state.queue];
    list.forEach((t) => { if (!queue.some((q) => q.id === t.id)) queue.push(t); });
    set({ ...state, queue });
  } else set({ queue: list.slice(), idx: 0 });
}
function next() {
  const queue = state.queue.filter((_, i) => i !== state.idx);
  set({ queue, idx: state.idx >= queue.length ? 0 : state.idx });
  try { W().renderNoti?.(); } catch { /* bell not ready */ }
}

function Copy({ c, say }: { c: { label?: string; text: string }; say: (s: string) => void }) {
  const [word, setWord] = useState("Copy");
  const v = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const said = (w: string, spoken: string) => {
    setWord(w); say(spoken);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setWord("Copy"), 2200);
  };
  /* clipboard.writeText is missing on insecure origins and refused in some in-app browsers; the fallback selects the text so a
     long-press or Ctrl+C still works. */
  const selectIt = () => {
    try {
      const r = document.createRange(); r.selectNodeContents(v.current!);
      const s = window.getSelection()!; s.removeAllRanges(); s.addRange(r);
      said("Selected", "The text is selected. Copy it by hand.");
    } catch { said("Select it", "Select the text and copy it by hand."); }
  };
  const copy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c.text).then(() => said("Copied", "Copied."), selectIt);
    else selectIt();
  };
  return (
    <div className="ytask-copy">
      {c.label ? <span className="ytask-copy-l">{c.label}</span> : null}
      <code className="ytask-copy-v" ref={v}>{c.text}</code>
      <button type="button" className="ytask-copy-b" onClick={copy}>{word}</button>
    </div>
  );
}

export function TaskCard() {
  const { queue, idx } = useCard();
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);   // the card lives in <body>, so not on the server
  const [spoken, setSpoken] = useState({ id: "", text: "" });
  const t = queue[idx];

  useEffect(() => {
    const onShow = (e: Event) => show((e as CustomEvent).detail || []);
    const onKey = (e: KeyboardEvent) => {
      const cur = state.queue[state.idx];
      if (e.key !== "Escape" || !cur) return;
      if (!cur.once) mark("later", cur.id);
      next();
    };
    window.addEventListener("syn:tasks-show", onShow);
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("syn:tasks-show", onShow); document.removeEventListener("keydown", onKey); };
  }, []);
  if (!mounted) return null;
  const later = () => { if (t && !t.once) mark("later", t.id); next(); };
  const done = () => { if (t && !t.once) mark("done", t.id); next(); };
  /* Started, not done: put away for this visit, and still in the bell. */
  const act = () => { if (!t) return; mark("later", t.id); next(); if (t.action && typeof t.action.run === "function") t.action.run(); };

  return createPortal(
    <div className={"ytask" + (t ? " on" : "")} role="dialog" aria-labelledby="ytaskTitle">
      {t ? (
        <>
          <div className="ytask-top"><span className="ytask-eye">{t.eye || "Only you can do this"}</span>
            {queue.length > 1 ? <span className="ytask-n">{idx + 1} of {queue.length}</span> : null}
            <button type="button" className="ytask-x" data-ytask-later="" aria-label="Close for now" onClick={later}>×</button></div>
          <div className="ytask-title" id="ytaskTitle">{t.title}</div>
          {/* Built by the sources with their own escaping (a channel's URL inside <code>). */}
          {t.body ? <div className="ytask-body" dangerouslySetInnerHTML={{ __html: t.body }}></div> : null}
          {(t.copies || []).map((c, i) => <Copy key={t.id + ":" + i} c={c} say={(text) => setSpoken({ id: t.id, text })} />)}
          {t.where ? <div className="ytask-where">{t.where}</div> : null}
          <div className="ytask-acts">
            {t.once ? null : <button type="button" className="ytask-btn" data-ytask-later="" onClick={later}>Later</button>}
            {/* A task that can be started from here offers that instead of Done: "Done" is for things finished elsewhere, and this
                one finishes itself when it stops being true. */}
            {t.action
              ? <button type="button" className="ytask-btn primary" data-ytask-act="" onClick={act}>{t.action.label}</button>
              : <button type="button" className="ytask-btn primary" data-ytask-done="" onClick={done}>{t.once ? "Got it" : "Done"}</button>}
          </div>
          <span className="sr-only" role="status" id="ytaskSay">{spoken.id === t.id ? spoken.text : ""}</span>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
