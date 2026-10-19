"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { doneCount, buildSteps, fetchProgress, nextStep, type Step } from "./data/setup";
import { requestIntent } from "./intent";
import { useToast } from "./ui/Toast";
import s from "./Setup.module.css";

interface Ctx { steps: Step[]; next: Step | undefined; done: number; go: (st: Step) => void; openList: () => void }
const SetupCtx = createContext<Ctx | null>(null);
const useSetup = () => useContext(SetupCtx);

const DONE_KEY = "syn_setup_done";

/**
 * The portal always knows what the agency should do next, and always says. One read-only call reports what has really been done; the steps are ordered
 * and the first one not done is the next step: a card at the top of Overview, and a ring in the top bar that opens the whole list.
 */
export function SetupProvider({ onGo, children }: { onGo: (pane: Step["pane"]) => void; children: React.ReactNode }) {
  const toast = useToast();
  const [steps, setSteps] = useState<Step[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const last = useRef<number | null>(null);

  const load = useCallback(async () => {
    const p = await fetchProgress().catch(() => null);
    if (!p) return;
    const next = buildSteps(p);
    const n = doneCount(next);
    // tell them when a step lands, once, in words
    if (last.current == null) { try { last.current = parseInt(window.localStorage.getItem(DONE_KEY) || "-1", 10); } catch { last.current = -1; } }
    if (last.current >= 0 && n > last.current && nextStep(next)) toast(`Done: ${next.filter((x) => x.done).slice(-1)[0].title}. Next: ${nextStep(next)!.title}`);
    if (n !== last.current) { last.current = n; try { window.localStorage.setItem(DONE_KEY, String(n)); } catch { /* fine */ } }
    setSteps(next);
  }, [toast]);

  useEffect(() => {
    const t0 = setTimeout(() => void load(), 600);
    const every = setInterval(() => void load(), 90 * 1000);
    const vis = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearTimeout(t0); clearInterval(every); document.removeEventListener("visibilitychange", vis); };
  }, [load]);

  const go = useCallback((st: Step) => {
    setListOpen(false);
    if (st.legacy) { window.location.assign(st.legacy); return; }
    if (st.intent) requestIntent(st.intent);
    onGo(st.pane);
  }, [onGo]);

  const value = useMemo<Ctx>(() => ({ steps, next: nextStep(steps), done: doneCount(steps), go, openList: () => setListOpen(true) }), [steps, go]);
  return (
    <SetupCtx.Provider value={value}>
      {children}
      {listOpen && value.next && <SetupList onClose={() => setListOpen(false)} />}
    </SetupCtx.Provider>
  );
}

/** The ring in the top bar. Hidden once everything is done. */
export function SetupRing() {
  const c = useSetup();
  if (!c || !c.next) return null;
  return (
    <button type="button" className={s.ring} aria-haspopup="dialog" aria-label={`Getting set up: ${c.done} of ${c.steps.length} done. Next: ${c.next.title}`} onClick={c.openList}>
      <span>{c.done}/{c.steps.length}</span>
    </button>
  );
}

/** The next step, as a card at the top of Overview. */
export function NextCard() {
  const c = useSetup();
  if (!c || !c.next) return null;
  const n = c.next;
  return (
    <section className={s.card} aria-label="Your next step">
      <div className={s.cardTx}>
        <div className={s.k}>Your next step · {c.done + 1} of {c.steps.length}</div>
        <p className={s.t}>{n.title}</p>
        <p className={s.w}>{n.why}</p>
        <div className={s.bar} aria-hidden="true">{c.steps.map((x) => <i key={x.id} className={x.done ? s.on : ""} />)}</div>
      </div>
      <div className={s.cardGo}>
        <button type="button" className={s.primary} onClick={() => c.go(n)}>{n.cta} →</button>
        <button type="button" className={s.link} onClick={c.openList}>See all {c.steps.length} steps</button>
      </div>
    </section>
  );
}

function SetupList({ onClose }: { onClose: () => void }) {
  const c = useSetup()!;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  return (
    <>
      <div className={s.scrim} onClick={onClose} />
      <div className={s.pop} role="dialog" aria-label="Getting set up">
        <div className={s.popHead}><h3>Getting set up</h3><span>{c.done} of {c.steps.length}</span></div>
        <div className={s.meter} aria-hidden="true"><i style={{ width: `${Math.round((c.done / c.steps.length) * 100)}%` }} /></div>
        <ul className={s.list}>
          {c.steps.map((x) => {
            const isNext = x === c.next;
            return (
              <li key={x.id} className={`${x.done ? s.done : ""} ${isNext ? s.nextItem : ""}`}>
                <span className={s.dot} aria-hidden="true">{x.done ? "✓" : ""}</span>
                <div>
                  <div className={s.it}>{x.title}</div>
                  {isNext && <><div className={s.w}>{x.why}</div><button type="button" className={s.primary} onClick={() => c.go(x)}>{x.cta} →</button></>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
