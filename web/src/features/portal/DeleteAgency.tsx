"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { signOut } from "@/lib/auth-actions";
import { useSession } from "@/lib/auth";
import { agencyId } from "./data/agency";
import { boldParts } from "./data/advisor";
import {
  STEPS, TIER, armed, call, clearAgencyCaches, clearMark, describe, getPhase, loginOf, longDate, preview, readMark, rememberGoodbye, routePreview, said, setPhase, subscribe, why, writeMark,
  type CallResult, type Preview,
} from "./data/deleteAgency";
import s from "./DeleteAgency.module.css";

type StepState = "wait" | "doing" | "done" | "failed";
interface Job { confirm: string; ack: boolean; kept: boolean; keptBecause: string | null }

const Bold = ({ text }: { text: string }) => <>{boldParts(text).map((p, i) => (p.b ? <b key={i}>{p.t}</b> : <span key={i}>{p.t}</span>))}</>;

/** The card at the foot of Subscription: a sentence and one button. Everything else lives in the dialog, so the pane does not grow a wall of warnings for an owner who only came to change plan. */
export function DeleteSection() {
  return (
    <section className={s.section} aria-label="Delete agency">
      <h2 className={s.h2}>Delete agency</h2>
      <div className={s.card}>
        <p className={s.lede}>Deletes this agency and everything in it, together with your own Synapse account. It cannot be undone. You will see exactly what goes before anything does.</p>
        <button type="button" className={s.open} onClick={() => void start()}>Delete agency…</button>
      </div>
    </section>
  );
}

async function start() {
  setPhase({ kind: "checking" });
  const res = await preview(await agencyId().catch(() => null));
  if (!res.ok) {
    const code = String(res.data.code ?? "");
    setPhase({ kind: "problem", title: "Delete agency", text: said(res), retry: !(code === "not_owner" || code === "agency_not_found") });
    return;
  }
  setPhase(routePreview(res.data as unknown as Preview));
}

/**
 * The dialog lives on the shell, not in the pane. After the data step the agency no longer exists: the role comes back empty and the portal behind the owner is
 * an empty shell, yet the last step still has to be shown and pressed. It also asks, once per load, whether a deletion was left unfinished: in this browser (it
 * notes the agency id just before beginning) or, with no agency at all, from the server, which finds the one its owner left half-done.
 */
export function DeletionHost() {
  const phase = useSyncExternalStore(subscribe, getPhase, getPhase);
  const session = useSession();
  const asked = useRef(false);

  useEffect(() => {
    if (!session || asked.current) return;
    asked.current = true;
    (async () => {
      const mark = readMark();
      let aid: string | null = mark;
      if (!mark) {
        const mine = await agencyId().catch(() => undefined);
        if (mine === undefined || mine) return; // unknown is not "none": ask nothing
        aid = null;
      }
      const res = await preview(aid);
      if (!res.ok) { const c = String(res.data.code ?? ""); if (c === "agency_not_found" || c === "not_owner") clearMark(); return; }
      const pv = res.data as unknown as Preview;
      if (pv.state !== "begun" && pv.state !== "data_deleted") { clearMark(); return; }
      setPhase(routePreview(pv));
    })().catch(() => {});
  }, [session]);

  if (phase.kind === "closed") return null;
  return <Dialog />;
}

function Dialog() {
  const phase = useSyncExternalStore(subscribe, getPhase, getPhase);
  const [typed, setTyped] = useState("");
  const [ack, setAck] = useState(false);
  const [running, setRunning] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [steps, setSteps] = useState<StepState[]>(["wait", "wait", "wait", "wait"]);
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState("");
  const [fail, setFail] = useState<{ step: number; text: string; signIn: boolean; gone: boolean } | null>(null);
  const [filesLeft, setFilesLeft] = useState(false);
  const [title, setTitle] = useState("");
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);

  const close = () => { if (!running && !leaving) setPhase({ kind: "closed" }); };
  useEffect(() => { if (!running) return; const hold = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; }; window.addEventListener("beforeunload", hold); return () => window.removeEventListener("beforeunload", hold); }, [running]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); close(); } }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); });
  useEffect(() => { document.documentElement.style.overflow = "hidden"; return () => { document.documentElement.style.overflow = ""; }; }, []);

  const mark = (k: number, v: StepState) => setSteps((x) => x.map((y, i) => (i === k ? v : y)));
  const label = (k: number, j: Job | null) => ["Taking your listings off the site and stopping anything scheduled", "Deleting your photos, videos, logo and documents", "Deleting listings, leads, posts and your team’s access", j?.kept ? "Closing up" : "Deleting your login"][k];

  const finish = async (d: Record<string, unknown>, j: Job) => {
    setRunning(false); setLeaving(true); setSteps(["done", "done", "done", "done"]); setTitle("Deleted");
    const kept = d.owner_login === "kept";
    setStatus(kept ? `Done. The agency has been deleted. Your login stays, because ${why((d.kept_because as string) || j.keptBecause)}.` : "Done. The agency and your Synapse account have been deleted.");
    clearMark(); clearAgencyCaches(); rememberGoodbye(kept ? "kept" : "removed");
    const leave = () => { void signOut().catch(() => {}).then(() => window.location.replace(`${window.location.origin}/`)); };
    if (d.files_left) setFilesLeft(true); else setTimeout(leave, 1800);
    leaveRef.current = leave;
  };
  const leaveRef = useRef<() => void>(() => {});

  const runFrom = async (from: number, pv: Preview, j: Job) => {
    setRunning(true); setFail(null); setJob(j); setTitle(pv.name ? `Deleting ${pv.name}` : "Deleting");
    setSteps(STEPS.map((_, i) => (i < from ? "done" : "wait")));
    let k = from;
    while (k < STEPS.length && live.current) {
      mark(k, "doing"); setStatus(`${label(k, j)}…`);
      const body: Record<string, unknown> = { action: STEPS[k], agency_id: pv.agency_id };
      if (STEPS[k] === "begin") { body.confirm_name = j.confirm; body.acknowledge_plan = j.ack; writeMark(pv.agency_id); } // a refused begin leaves a note the next load finds pointing at nothing, and clears
      const res: CallResult = await call(body);
      const d = res.data;
      if (STEPS[k] === "finish" && !res.ok && res.status === 401) { await finish({ owner_login: j.kept ? "kept" : "removed", kept_because: j.keptBecause }, j); return; } // the login went before the answer arrived
      if (!res.ok) {
        const code = String(d.code ?? "");
        setRunning(false);
        if (k === 0 && (code === "name_mismatch" || code === "plan_not_acknowledged")) { if (pv.state === "ready") clearMark(); setPhase({ kind: "confirm", pv, error: said(res) }); return; }
        mark(k, "failed"); setStatus("It stopped at the step marked below. Nothing after it was attempted.");
        setFail({ step: k, text: said(res), signIn: res.status === 401, gone: code === "agency_not_found" || code === "not_owner" });
        return;
      }
      if (STEPS[k] === "begin" && d.state === "data_deleted") { setSteps(["done", "done", "done", "wait"]); k = 3; continue; } // another tab got further already
      if (STEPS[k] === "data") { j = { ...j, kept: d.owner_login === "kept", keptBecause: (d.kept_because as string) || null }; setJob(j); }
      if (STEPS[k] === "finish") {
        if (d.state === "complete") { await finish(d, j); return; }
        setRunning(false); mark(k, "failed");
        setFail({ step: k, text: d.login_error ? "Your agency’s data is deleted, but your login could not be removed just now. Try again in a moment." : "The last step did not finish. It is safe to try again.", signIn: false, gone: false });
        return;
      }
      mark(k, "done"); k += 1;
    }
  };

  const hasPlan = phase.kind === "confirm" && !!phase.pv.paid_plan;
  const pv = phase.kind === "confirm" || phase.kind === "finishOnly" ? phase.pv : null;
  const showSteps = running || leaving || !!fail;

  return (
    <div className={s.scrim}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="daTitle">
        <div className={s.hd}>
          <h2 id="daTitle" className={s.title} tabIndex={-1}>{title || (phase.kind === "confirm" ? `Delete ${phase.pv.name || "this agency"}` : phase.kind === "finishOnly" ? "Finish deleting" : "Delete agency")}</h2>
          {!running && !leaving && <button type="button" className={s.x} aria-label="Close" onClick={close}>×</button>}
        </div>

        {phase.kind === "checking" && <p className={s.p} role="status">Checking what would be deleted…</p>}
        {phase.kind === "problem" && (
          <>
            <div className={s.err} role="alert">{phase.text}</div>
            <div className={s.acts}><button type="button" className={s.btn} onClick={close}>Close</button>{phase.retry && <button type="button" className={s.btn} onClick={() => void start()}>Try again</button>}</div>
          </>
        )}

        {!showSteps && phase.kind === "confirm" && pv && <Confirm pv={pv} error={phase.error} typed={typed} setTyped={setTyped} ack={ack} setAck={setAck} armed={armed(typed, pv.confirm_phrase ?? "", hasPlan, ack)} onKeep={close}
          onKill={() => { const l = loginOf(pv); void runFrom(0, pv, { confirm: typed, ack, kept: !l.removable, keptBecause: l.keptBecause }); }} />}

        {!showSteps && phase.kind === "finishOnly" && pv && (
          <>
            {phase.error && <div className={s.err} role="alert">{phase.error}</div>}
            <p className={s.p}>Your agency and everything in it have already been deleted. {pv.owner_login === "pending" ? "One step is left: deleting your own login." : `One step is left: closing up. Your login stays, because ${why(pv.kept_because)}.`}</p>
            <div className={s.acts}>
              <button type="button" className={s.btn} onClick={close}>Not now</button>
              <button type="button" className={`${s.btn} ${s.kill}`} onClick={() => void runFrom(3, pv, { confirm: "", ack: false, kept: pv.owner_login !== "pending", keptBecause: pv.kept_because ?? null })}>{pv.owner_login === "pending" ? "Delete my login" : "Finish"}</button>
            </div>
          </>
        )}

        {showSteps && (
          <>
            <p className={s.p} role="status">{status || "Deleting. Keep this page open; it takes a few seconds."}</p>
            <ol className={s.steps}>{steps.map((st, k) => <li key={k} className={s[st]}><span className={s.dot} aria-hidden="true">{st === "done" ? "✓" : st === "failed" ? "!" : ""}</span><span>{label(k, job)}</span></li>)}</ol>
            {fail && (
              <>
                <div className={s.err} role="alert">{fail.text}</div>
                <div className={s.acts}>
                  <button type="button" className={s.btn} onClick={close}>Close</button>
                  {fail.signIn ? <a className={s.btn} href={`/signin/?role=agency&reason=agency&next=${encodeURIComponent("/portal/#subscription")}`}>Sign in again</a> : !fail.gone && pv && job && <button type="button" className={s.btn} onClick={() => void runFrom(fail.step, pv, job)}>Try again</button>}
                </div>
              </>
            )}
            {filesLeft && <><p className={s.note}>A few files added in the last moments could not be removed. Nothing links to them any more; <a href="/app/your-data.html">write to us</a> if you want them removed by hand.</p><div className={s.acts}><button type="button" className={s.btn} onClick={() => leaveRef.current()}>Continue</button></div></>}
            {leaving && !filesLeft && <p className={s.note}>Signing you out…</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Confirm({ pv, error, typed, setTyped, ack, setAck, armed: on, onKeep, onKill }: { pv: Preview; error?: string; typed: string; setTyped: (v: string) => void; ack: boolean; setAck: (v: boolean) => void; armed: boolean; onKeep: () => void; onKill: () => void }) {
  const { gone, kept } = describe(pv);
  const login = loginOf(pv);
  const begun = pv.state === "begun";
  const plan = pv.paid_plan;
  return (
    <>
      {begun ? <p className={s.p}><b>You started deleting this agency and it did not finish.</b> Its listings are already off the site. Confirm below to finish the job.</p>
        : <p className={s.p}>This deletes {login.removable ? "the agency, everything in it, and your own Synapse account" : "the agency and everything in it"}. It cannot be undone, and nobody at Synapse can bring it back.</p>}
      <div className={s.group}><div className={s.k}>What is deleted</div><ul className={s.list}>{gone.map((x) => <li key={x}><Bold text={x} /></li>)}</ul></div>
      <div className={s.group}><div className={s.k}>What is not</div><ul className={s.list}>{kept.map((x) => <li key={x}><Bold text={x} /></li>)}</ul></div>
      {plan && <label className={s.plan}><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>Your <b>{TIER[plan.tier] ?? plan.tier}</b> plan is paid until <b>{longDate(plan.until)}</b>. Deleting does not refund the days left, and nothing more will be charged. I understand.</span></label>}
      <p className={s.note}>Your listings come off the site the moment you press Delete; the rest takes a few seconds. Keep this page open until it says it is done. If anything interrupts it, come back here and it carries on from where it stopped.</p>
      {error && <div className={s.err} role="alert">{error}</div>}
      <div className={s.confirm}>
        <label htmlFor="daName">To confirm, type <b>{pv.confirm_phrase}</b></label>
        <input id="daName" type="text" autoFocus autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} />
      </div>
      <div className={s.acts}>
        <button type="button" className={s.btn} onClick={onKeep}>{begun ? "Not now" : "Keep my agency"}</button>
        <button type="button" className={`${s.btn} ${s.kill}`} disabled={!on} onClick={onKill}>{login.removable ? "Delete agency and account" : "Delete agency"}</button>
      </div>
    </>
  );
}
