"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { freshTasks, mark, openTasks, readMarks, type Task } from "./data/tasks";
import s from "./Tasks.module.css";

interface Ctx { open: Task[]; setTasks: (source: string, list: Task[]) => void; show: (t: Task) => void }
const TasksCtx = createContext<Ctx>({ open: [], setTasks: () => {}, show: () => {} });
export const useTasks = () => useContext(TasksCtx);

/** Sources hand over their whole current list each time they know their state; a task that stops being true simply disappears. New ones arrive as a card, one at a time. */
export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [bySource, setBySource] = useState<Record<string, Task[]>>({});
  const [done, setDone] = useState<Record<string, number>>(() => (typeof window === "undefined" ? {} : readMarks("done")));
  const [queue, setQueue] = useState<Task[]>([]);
  const [idx, setIdx] = useState(0);
  const popped = useRef(new Set<string>());

  const enqueue = useCallback((list: Task[]) => {
    if (!list.length) return;
    list.forEach((t) => popped.current.add(t.id));
    // a card already open is not replaced under someone who is in the middle of reading it
    setQueue((q) => { const add = list.filter((t) => !q.some((x) => x.id === t.id)); return q.length ? [...q, ...add] : add; });
  }, []);

  const setTasks = useCallback((source: string, list: Task[]) => {
    setBySource((b) => ({ ...b, [source]: list }));
    enqueue(freshTasks(list, readMarks("done"), readMarks("later"), popped.current));
  }, [enqueue]);
  const show = useCallback((t: Task) => { popped.current.add(t.id); setQueue((q) => (q.some((x) => x.id === t.id) ? q : [...q, t])); setIdx((i) => i); }, []);

  const all = useMemo(() => Object.values(bySource).flat(), [bySource]);
  const open = useMemo(() => openTasks(all, done), [all, done]);
  const value = useMemo(() => ({ open, setTasks, show }), [open, setTasks, show]);

  const cur = queue[idx] ?? queue[0];
  const next = () => setQueue((q) => { const k = Math.min(idx, q.length - 1); const n = q.filter((_, i) => i !== k); setIdx(0); return n; });

  return (
    <TasksCtx.Provider value={value}>
      {children}
      {cur && <Card task={cur} n={queue.length} at={Math.min(idx, queue.length - 1)} onDone={() => { if (!cur.once) setDone(mark("done", cur.id)); next(); }} onLater={() => { if (!cur.once) mark("later", cur.id); next(); }} />}
    </TasksCtx.Provider>
  );
}

function Card({ task: t, n, at, onDone, onLater }: { task: Task; n: number; at: number; onDone: () => void; onLater: () => void }) {
  const [say, setSay] = useState<Record<number, string>>({});
  const copy = async (i: number, text: string) => {
    let word = "Copied";
    try { await navigator.clipboard.writeText(text); } catch { word = "Select it"; }
    setSay((x) => ({ ...x, [i]: word }));
    setTimeout(() => setSay((x) => { const y = { ...x }; delete y[i]; return y; }), 2200);
  };
  return (
    <div className={s.card} role="dialog" aria-labelledby="ytaskTitle">
      <div className={s.top}><span className={s.eye}>{t.eye || "Only you can do this"}</span>{n > 1 && <span className={s.n}>{at + 1} of {n}</span>}<button type="button" className={s.x} aria-label="Close for now" onClick={onLater}>×</button></div>
      <div className={s.title} id="ytaskTitle">{t.title}</div>
      {t.body && <div className={s.body}>{t.body}</div>}
      {(t.copies ?? []).map((c, i) => (
        <div key={i} className={s.copy}>{c.label && <span className={s.cl}>{c.label}</span>}<code className={s.cv}>{c.text}</code><button type="button" className={s.cb} onClick={() => void copy(i, c.text)}>{say[i] ?? "Copy"}</button></div>
      ))}
      {t.where && <div className={s.where}>{t.where}</div>}
      <div className={s.acts}>{!t.once && <button type="button" className={s.btn} onClick={onLater}>Later</button>}<button type="button" className={`${s.btn} ${s.primary}`} onClick={onDone}>{t.once ? "Got it" : "Done"}</button></div>
    </div>
  );
}
