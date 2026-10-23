"use client";
/**
 * DELETE AGENCY, as React (was src/legacy/agency/inline-6.js).
 *
 * The owner deletes the agency and their own account. The work is done by the delete-agency edge function (synapse-platform),
 * one request per step, so the list on screen is the truth rather than an animation:
 *
 *   preview  what would go and what would not        nothing changes
 *   begin    typed name checked, listings off the site
 *   files    photos, videos, logo and papers out of Storage
 *   data     every row, in one transaction
 *   finish   the owner's login, then the record is closed
 *
 * Every step is safe to repeat, and the server decides every rule again -- owner, typed name, paid plan, order -- so this only
 * has to be honest about what is happening and carry on from where it stopped.
 *
 * WHY A DIALOG ON <body>. After the data step the agency no longer exists: the role comes back empty, applyRole() strips the
 * Subscription pane, and the portal behind the owner is an empty shell. The last step still has to be shown and pressed, so the
 * dialog is portalled to <body> rather than living in the pane.
 *
 * COMING BACK TO IT. An interrupted deletion leaves somebody with a half-deleted agency, or a login they asked to be rid of, so
 * there are two ways back in: this browser notes the agency id just before begin and on the next load asks the server where
 * that deletion stands; and a portal with no agency at all asks the server, which finds the deletion its owner left unfinished
 * (another device, or after the browser forgot). The note holds an agency id and nothing about a person.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

const FN = "delete-agency";
const MARK = "synapse_agency_deletion_v1";
/* Read once by the homepage to say what happened, then removed. sessionStorage rather than the URL: "your agency was deleted"
   should not be something a person can bookmark, share or land on by accident. */
const GOODBYE = "synapse_goodbye_v1";
/* The agency's own data this browser keeps for the portal. Deleting the agency "completely" includes the copy on this device.
   Interface choices (theme, sidebar, consent) belong to the person and stay. */
const AGENCY_CACHES = ["synapse_agency_listings_v5", "synapse_listing_draft_v1", "synapse_agency_campaigns_v1", "synapse_angles_v1", "synapse_brand_onboard_skipped"];
/* The session supabase-js keeps (auth.js, storageKey), removed by hand as a backstop once the login is deleted. */
const SESSION_KEY = "synapse_auth_v1";
const TIER: Record<string, string> = { free: "Free", accelerator: "Accelerate", market_leader: "Leader" };
const KEPT_BECAUSE: Record<string, string> = {
  owns_another_agency: "you also own another agency on Synapse",
  member_of_another_agency: "you also work in another agency on Synapse",
  platform_staff: "it is a Synapse staff account",
  records_elsewhere: "other records on Synapse still point to it",
};
const STEPS = ["begin", "files", "data", "finish"] as const;

const Bin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
  </svg>
);
const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);

const num = (v: unknown) => { const n = Number(v); return isFinite(n) && n > 0 ? Math.floor(n) : 0; };
const plural = (n: number, one: string, many?: string) => n + " " + (n === 1 ? one : (many || one + "s"));
/* The same comparison the database makes (agency_confirm_key): curly quotes straightened, runs of spaces collapsed, the ends
   trimmed; letters and case exact. A phone types ’ where the name was saved with ', and that is not a different name. */
const confirmKey = (s: unknown) => String(s == null ? "" : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, " ").replace(/\s+/g, " ").trim();
function longDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "the end of this period";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}
const why = (code: string | null | undefined) => (code && KEPT_BECAUSE[code]) || "something else on Synapse still needs it";
function readMark() {
  try { const m = JSON.parse(localStorage.getItem(MARK) || "null"); return m && typeof m.a === "string" ? m.a : null; } catch { return null; }
}
const writeMark = (aid: string) => { try { localStorage.setItem(MARK, JSON.stringify({ a: aid })); } catch { /* best effort */ } };
const clearMark = () => { try { localStorage.removeItem(MARK); } catch { /* best effort */ } };

type Res = { ok: boolean; status: number; data: any };
/* One request, always answered: status 0 means the function was never reached. functions.invoke carries the session's token,
   which the function checks with Auth again. Its own refusals come with a sentence written for the person (data.error, beside
   a data.code); anything else is described here instead, because a gateway's error text is written for nobody. */
function call(body: Record<string, unknown>): Promise<Res> {
  return W().SynAuth.client().then((c: any) => c.functions.invoke(FN, { body })).then((r: any) => {
    if (!r.error) return { ok: true, status: 200, data: r.data || {} };
    const ctx = r.error.context;
    if (ctx && typeof ctx.json === "function") {
      const status = ctx.status || 0;
      return ctx.json().then((d: any) => ({ ok: false, status, data: d || {} }), () => ({ ok: false, status, data: {} }));
    }
    return { ok: false, status: 0, data: {} };
  }, () => ({ ok: false, status: 0, data: {} }));
}
function said(res: Res) {
  const d = res.data || {};
  if (typeof d.error === "string" && d.error && typeof d.code === "string") return d.error;
  if (res.status === 401) return "Your session has ended. Sign in again, and this carries on from where it stopped.";
  if (!res.status) return "Synapse could not be reached. Check your connection; it is safe to try again.";
  return "Something went wrong part-way. It is safe to try again: it carries on from where it stopped.";
}
const ErrBox = ({ text }: { text: string }) => (
  <div className="da-err" role="alert"><span className="da-ic" aria-hidden="true">!</span><span>{text}</span></div>
);

type StepState = "done" | "doing" | "wait" | "failed";
type After = null | { k: "failed"; at: number; text: string; signIn: boolean; gone: boolean } | { k: "done"; filesLeft: boolean; signingOut: boolean };
type Screen =
  | { k: "closed" }
  | { k: "checking" }
  | { k: "problem"; text: string; retry: boolean }
  | { k: "confirm"; err: string | null }
  | { k: "finishOnly"; err: string | null }
  | { k: "run"; title: string; status: string; steps: StepState[]; after: After };
type Job = { confirm: string; ack: boolean; kept: boolean; keptBecause: string | null };

export function DeleteAgency() {
  const scripts = usePageScripts();
  const [section, setSection] = useState(false);
  const [screen, setScreen] = useState<Screen>({ k: "closed" });
  const [locked, setLocked] = useState(false);   // running, or done and leaving: nothing to close
  const pv = useRef<any>(null);                  // the last answer from preview
  const job = useRef<Job | null>(null);          // the run in progress
  const running = useRef(false);
  const leaving = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const open = screen.k !== "closed";
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);

  const close = useCallback(() => {
    if (running.current || leaving.current) return;
    setScreen({ k: "closed" });
    const o = opener.current;
    if (o && o.focus && document.contains(o)) o.focus();
    opener.current = null;
  }, []);

  /* ── 1. what would go ── */
  const route = (d: any) => {
    pv.current = d || {};
    if (pv.current.state === "data_deleted") finishOnly(null);
    else setScreen({ k: "confirm", err: null });
  };
  const start = () => {
    setScreen({ k: "checking" });
    const L = W().SynListings;
    const aid: Promise<string | null> = L && L.agencyId ? L.agencyId().catch(() => null) : Promise.resolve(null);
    aid.then((a) => {
      const body: Record<string, unknown> = { action: "preview" };
      if (a) body.agency_id = a;       // without it, the server takes the one agency they own
      return call(body);
    }).then((res) => {
      if (!res.ok) {
        /* "Try again" only where trying again could change the answer: not for somebody who is not the owner, or an agency
           already gone. */
        const code = (res.data && res.data.code) || "";
        setScreen({ k: "problem", text: said(res), retry: !(code === "not_owner" || code === "agency_not_found") });
        return;
      }
      route(res.data);
    });
  };
  /* Past the data step there is nothing left to confirm: the agency is gone, and what remains is the login. */
  const finishOnly = (err: string | null) => {
    const p = pv.current;
    job.current = { confirm: "", ack: false, kept: p.owner_login !== "pending", keptBecause: p.kept_because || null };
    setScreen({ k: "finishOnly", err });
  };

  /* ── 2. the run ── */
  const stepLabel = (k: number) => [
    "Taking your listings off the site and stopping anything scheduled",
    "Deleting your photos, videos, logo and documents",
    "Deleting listings, leads, posts and your team’s access",
    job.current && job.current.kept ? "Closing up" : "Deleting your login",
  ][k];
  const setRun = (f: (s: Extract<Screen, { k: "run" }>) => Partial<Extract<Screen, { k: "run" }>>) =>
    setScreen((s) => (s.k === "run" ? { ...s, ...f(s) } : s));
  const setStep = (k: number, st: StepState) => setRun((s) => ({ steps: s.steps.map((x, i) => (i === k ? st : x)) }));
  const hold = useCallback((e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; return ""; }, []);
  const stop = () => {
    running.current = false;
    window.removeEventListener("beforeunload", hold);
    setLocked(leaving.current);
  };
  const run = (from: number) => {
    if (running.current || leaving.current) return;
    running.current = true; setLocked(true);
    /* Leaving mid-step is safe -- every step can be repeated -- but it should be a choice, so the browser asks first. */
    window.addEventListener("beforeunload", hold);
    setScreen({ k: "run", title: pv.current.name ? "Deleting " + pv.current.name : "Deleting",
      status: "Deleting. Keep this page open; it takes a few seconds.",
      steps: STEPS.map((_, k) => (k < from ? "done" : "wait")), after: null });
    step(from);
  };
  const step = (k: number) => {
    const j = job.current as Job, p = pv.current;
    setStep(k, "doing");
    setRun(() => ({ status: stepLabel(k) + "…" }));
    const body: Record<string, unknown> = { action: STEPS[k], agency_id: p.agency_id };
    if (STEPS[k] === "begin") {
      body.confirm_name = j.confirm;
      body.acknowledge_plan = j.ack;
      /* Noted BEFORE the request, so an answer lost on the way back still leaves this browser knowing to ask. */
      writeMark(p.agency_id);
    }
    call(body).then((res) => {
      const d = res.data || {};
      if (STEPS[k] === "finish" && !res.ok && res.status === 401) {
        /* The session's login is gone, which is what finish does: a first attempt that removed it and then lost its answer
           looks exactly like this from here. */
        done({ owner_login: j.kept ? "kept" : "removed", kept_because: j.keptBecause });
        return;
      }
      if (!res.ok) { failed(k, res); return; }
      if (STEPS[k] === "begin" && d.state === "data_deleted") {
        // Somebody (another tab) got further already: straight to the end.
        setRun((s) => ({ steps: s.steps.map((x, i) => (i < 3 ? "done" : x)) }));
        step(3);
        return;
      }
      if (STEPS[k] === "data") {
        /* The database decides here whether the login can go, and the last row says which it decided. */
        j.kept = d.owner_login === "kept";
        j.keptBecause = d.kept_because || null;
      }
      if (STEPS[k] === "finish") {
        if (d.state === "complete") { done(d); return; }
        failed(k, { ok: false, status: 200, data: { code: "login", error: d.login_error
          ? "Your agency’s data is deleted, but your login could not be removed just now. Try again in a moment."
          : "The last step did not finish. It is safe to try again." } });
        return;
      }
      setStep(k, "done");
      step(k + 1);
    });
  };
  const failed = (k: number, res: Res) => {
    stop();
    const code = (res.data && res.data.code) || "";
    /* A wrong name or an unticked box goes back to the form, where it is put right. The server changed nothing. */
    if (k === 0 && (code === "name_mismatch" || code === "plan_not_acknowledged")) {
      if (pv.current.state === "ready") clearMark();   // nothing was started to come back to
      setScreen({ k: "confirm", err: said(res) });
      return;
    }
    setStep(k, "failed");
    setRun(() => ({ status: "It stopped at the step marked below. Nothing after it was attempted.",
      after: { k: "failed", at: k, text: said(res), signIn: res.status === 401, gone: code === "agency_not_found" || code === "not_owner" } }));
  };

  /* ── 3. done: off the device, signed out, home ── */
  const leave = () => {
    W().SynAuth.signOut().catch(() => {}).then(() => {
      try { localStorage.removeItem(SESSION_KEY); } catch { /* best effort */ }
      location.replace(location.origin + "/");
    });
  };
  const done = (d: any) => {
    stop();
    leaving.current = true; setLocked(true);
    const kept = d.owner_login === "kept";
    clearMark();
    AGENCY_CACHES.forEach((key) => { try { localStorage.removeItem(key); } catch { /* best effort */ } });
    try { sessionStorage.setItem(GOODBYE, JSON.stringify({ kind: "agency", login: kept ? "kept" : "removed" })); } catch { /* best effort */ }
    setRun(() => ({
      title: "Deleted",
      steps: STEPS.map(() => "done" as StepState),
      status: kept
        ? "Done. The agency has been deleted. Your login stays, because " + why(d.kept_because || job.current?.keptBecause) + "."
        : "Done. The agency and your Synapse account have been deleted.",
      /* A few files uploaded in the last seconds may have escaped the final sweep: said rather than swallowed. */
      after: { k: "done", filesLeft: !!d.files_left, signingOut: !d.files_left },
    }));
    if (!d.files_left) setTimeout(leave, 1800);
  };

  /* Focus lands where the person acts next: the name field, the button that goes on, or the title while it runs. */
  const focusKey = screen.k === "run" ? "run:" + (screen.after ? screen.after.k : "") : screen.k + ":" + ("err" in screen ? screen.err : "");
  useEffect(() => {
    const d = dialog.current; if (!d) return;
    const sel = screen.k === "confirm" ? "#daName" : screen.k === "finishOnly" ? '[data-da="finish"]'
      : screen.k === "problem" ? (screen.retry ? '[data-da="retry"]' : '[data-da="close"]')
      : screen.k === "run" && screen.after?.k === "failed" ? '[data-da="retry"], #daAfter .da-btn:last-child'
      : screen.k === "run" && screen.after?.k === "done" && screen.after.filesLeft ? '[data-da="leave"]' : null;
    ((sel && d.querySelector<HTMLElement>(sel)) || d.querySelector<HTMLElement>(".da-title"))?.focus();
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The keyboard stays in here: behind the dialog is a portal that may no longer have an agency to show. A tap on the veil does
     nothing -- somebody halfway through typing their agency's name should not lose it to a stray touch. */
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab" || !dialog.current) return;
    const f = [...dialog.current.querySelectorAll<HTMLElement>("button:not([disabled]):not([hidden]), input:not([disabled]), a[href]")];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  /* ── the section, owner only. The role arrives from its own round trip (applyRole), so this both listens for it and checks
     whether it has already landed; the function compares the caller with agencies.owner_id on every step. ── */
  useEffect(() => {
    const on = (e: Event) => { if ((e as CustomEvent).detail === "agency_owner") setSection(true); };
    document.addEventListener("syn:role", on);
    if (document.body.dataset.role === "agency_owner") setSection(true);
    return () => document.removeEventListener("syn:role", on);
  }, []);

  /* ── coming back to an unfinished one ── */
  useEffect(() => {
    if (!scripts || !W().SynAuth || !W().SynAuth.client) return;
    const resume = (aid: string | null) => {
      const body: Record<string, unknown> = { action: "preview" };
      if (aid) body.agency_id = aid;
      call(body).then((res) => {
        if (!res.ok) {
          /* Gone (finished, or never begun) or not theirs: the note points at nothing any more. Matched on the function's own
             code: a gateway 404, a 401, a network failure or a 400 says nothing about the deletion. */
          const code = (res.data && res.data.code) || "";
          if (code === "agency_not_found" || code === "not_owner") clearMark();
          return;
        }
        const d = res.data || {};
        if (d.state !== "begun" && d.state !== "data_deleted") { clearMark(); return; }
        route(d);
      });
    };
    W().SynAuth.ready().then((u: any) => {
      if (!u) return;
      const aid = readMark();
      if (aid) { resume(aid); return; }
      const L = W().SynListings;
      if (!L || !L.agencyId) return;
      L.agencyId().then((mine: string | null) => { if (!mine) resume(null); }, () => { /* unknown is not "none": ask nothing */ });
    });
  }, [scripts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="da" id="daSection" hidden={!section}>
        <div className="h2">Delete agency</div>
        <div className="da-card" id="daCard">
          {section ? (
            <>
              <p className="da-lede">Deletes this agency and everything in it, together with your own Synapse account. It cannot be undone. You will see exactly what goes before anything does.</p>
              <button type="button" className="da-btn da-open" id="daOpen" onClick={(e) => { opener.current = e.currentTarget; start(); }}><Bin /><span>Delete agency…</span></button>
            </>
          ) : null}
        </div>
      </div>
      {open ? createPortal(
        <div className="da-scrim" onKeyDown={onKey}>
          <div ref={dialog} className="da-dialog" role="dialog" aria-modal="true" aria-labelledby="daTitle">
            <Body screen={screen} pv={pv.current} job={job} stepLabel={stepLabel} locked={locked} close={close} start={start} run={run} leave={leave} />
          </div>
        </div>, document.body) : null}
    </>
  );
}

type BodyProps = {
  screen: Screen; pv: any; job: React.MutableRefObject<Job | null>; stepLabel: (k: number) => string; locked: boolean;
  close: () => void; start: () => void; run: (from: number) => void; leave: () => void;
};
function Body({ screen, pv, job, stepLabel, locked, close, start, run, leave }: BodyProps) {
  const head = (title: string) => (
    <div className="da-hd"><h2 className="da-title" id="daTitle" tabIndex={-1}>{title}</h2>
      <button type="button" className="da-x" aria-label="Close" hidden={locked} onClick={close}>×</button></div>
  );
  if (screen.k === "checking") return <>{head("Delete agency")}<div className="da-body"><p className="da-p" role="status">Checking what would be deleted…</p></div></>;
  if (screen.k === "problem") {
    return (
      <>{head("Delete agency")}<div className="da-body">
        <ErrBox text={screen.text} />
        <div className="da-acts">
          <button type="button" className="da-btn" data-da="close" onClick={close}>Close</button>
          {screen.retry ? <button type="button" className="da-btn" data-da="retry" onClick={start}>Try again</button> : null}
        </div>
      </div></>
    );
  }
  if (screen.k === "confirm") return <Confirm key={screen.err || ""} pv={pv} err={screen.err} head={head} job={job} close={close} run={run} />;
  if (screen.k === "finishOnly") {
    const pending = pv.owner_login === "pending";
    return (
      <>{head("Finish deleting")}<div className="da-body">
        {screen.err ? <ErrBox text={screen.err} /> : null}
        <p className="da-p">Your agency and everything in it have already been deleted. {pending
          ? "One step is left: deleting your own login."
          : "One step is left: closing up. Your login stays, because " + why(pv.kept_because) + "."}</p>
        <Steps states={STEPS.map((_, k) => (k < 3 ? "done" : "wait"))} label={stepLabel} />
        <div className="da-acts">
          <button type="button" className="da-btn" data-da="later" onClick={close}>Not now</button>
          <button type="button" className="da-btn da-kill" data-da="finish" onClick={() => run(3)}><Bin /><span>{pending ? "Delete my login" : "Finish"}</span></button>
        </div>
      </div></>
    );
  }
  if (screen.k !== "run") return null;
  const a = screen.after;
  return (
    <>{head(screen.title)}<div className="da-body">
      <p className="da-p" id="daStatus" role="status">{screen.status}</p>
      <Steps states={screen.steps} label={stepLabel} />
      <div id="daAfter">
        {a && a.k === "failed" ? (
          <>
            <ErrBox text={a.text} />
            <div className="da-acts">
              <button type="button" className="da-btn" data-da="close" onClick={close}>Close</button>
              {a.signIn
                ? <a className="da-btn" data-da="signin" href={"signin.html?role=agency&reason=agency&next=" + encodeURIComponent(location.pathname + "#subscription")}>Sign in again</a>
                : a.gone ? null : <button type="button" className="da-btn" data-da="retry" onClick={() => run(a.at)}>Try again</button>}
            </div>
          </>
        ) : a && a.k === "done" ? (
          a.filesLeft ? (
            <>
              <p className="da-note">A few files added in the last moments could not be removed. Nothing links to them any more; <a href="your-data.html">write to us</a> if you want them removed by hand.</p>
              <div className="da-acts"><button type="button" className="da-btn" data-da="leave" onClick={leave}>Continue</button></div>
            </>
          ) : <p className="da-note">Signing you out…</p>
        ) : null}
      </div>
    </div></>
  );
}

function Steps({ states, label }: { states: StepState[]; label: (k: number) => string }) {
  return (
    <ol className="da-steps">
      {STEPS.map((s, k) => (
        <li key={s} className={"is-" + states[k]} data-step={k}>
          <span className="da-ic" aria-hidden="true">{states[k] === "done" ? <Tick /> : states[k] === "failed" ? "!" : null}</span>
          <span className="da-sl">{label(k)}</span>
        </li>
      ))}
    </ol>
  );
}

function Confirm({ pv, err, head, job, close, run }: { pv: any; err: string | null; head: (t: string) => ReactNode; job: React.MutableRefObject<Job | null>; close: () => void; run: (from: number) => void }) {
  const [typed, setTyped] = useState("");
  const [ack, setAck] = useState(false);
  const c = pv.counts || {};
  const login = pv.owner_login || {};
  const removable = login.removable === true;
  const name = String(pv.name || "").trim() || "this agency";
  const team = num(c.team_members);
  const plan = pv.paid_plan || null;
  const phrase = String(pv.confirm_phrase || "");
  const begun = pv.state === "begun";
  const want = confirmKey(phrase);
  /* Live only when the name matches and, on a paid plan, the box is ticked. The server checks both again; this only saves a
     refusal. Deliberately no Enter-to-delete: it takes a press of the button. */
  const armed = !!want && confirmKey(typed) === want && (!plan || ack);

  /* Counted by the same SQL that will do the deleting, so these are the numbers that go -- not an estimate. */
  const gone: ReactNode[] = [];
  gone.push(plural(num(c.listings), "listing") + (num(c.listing_media) ? ", with " + plural(num(c.listing_media), "photo or video", "photos and videos") : ""));
  gone.push(plural(num(c.leads), "lead") + " in your CRM, with their notes, stages and history");
  if (num(c.social_posts)) gone.push(plural(num(c.social_posts), "post") + " in the Social studio. Anything scheduled will not go out");
  if (num(c.short_links)) gone.push(plural(num(c.short_links), "share link") + ". Links you have sent out stop working");
  if (num(c.social_accounts)) gone.push(plural(num(c.social_accounts), "connected social account") + ". Synapse’s access to them is removed; the accounts themselves stay yours");
  if (num(c.campaigns)) gone.push(plural(num(c.campaigns), "campaign"));
  if (num(c.tours)) gone.push(plural(num(c.tours), "tour or viewing slot", "tours and viewing slots"));
  if (num(c.documents)) gone.push(plural(num(c.documents), "verification document"));
  gone.push("Your brand and logo, team chat, invites, and the record of your plan payments in Synapse");
  if (removable) gone.push(<><b>Your own profile, photo and login.</b> You will be signed out</>);

  /* What stays is said as plainly as what goes. Somebody told their posts were "deleted" who then finds them on Instagram has
     been misled, and so has somebody who thinks their team lost their accounts with the agency. */
  const kept: ReactNode[] = [];
  kept.push(<><b>Posts already published</b> on Facebook, Instagram, Telegram, TikTok or X stay up. Synapse cannot recall them; delete them in those apps if you want them gone.</>);
  kept.push(<><b>{"Your team" + (team ? " (" + plural(team, "person", "people") + ")" : "")}</b> keep their own Synapse logins and profiles. They lose access to this agency, and nothing else.</>);
  if (!removable) kept.push(<><b>Your login</b> stays, because {why(login.kept_because)}.</>);
  kept.push("Paystack keeps its own receipts for anything you paid.");
  kept.push("Reports made to Synapse about this agency are kept, so deleting it cannot erase them.");
  kept.push("A note that this agency was deleted: the date and how many items went, with no names in it.");

  const kill = () => {
    if (!armed) return;
    /* Sent in the form both sides compare, so an unusual space a keyboard slipped in cannot make the server disagree with the
       button it just let through. */
    job.current = { confirm: confirmKey(typed), ack: !!(plan && ack), kept: !removable, keptBecause: login.kept_because || null };
    run(0);
  };

  return (
    <>{head("Delete " + name)}<div className="da-body">
      {begun
        ? <p className="da-p"><b>You started deleting this agency and it did not finish.</b> Its listings are already off the site. Confirm below to finish the job.</p>
        : <p className="da-p">This deletes {removable ? "the agency, everything in it, and your own Synapse account" : "the agency and everything in it"}. It cannot be undone, and nobody at Synapse can bring it back.</p>}
      <div className="da-group"><div className="da-k">What is deleted</div><ul className="da-list">{gone.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
      <div className="da-group"><div className="da-k">What is not</div><ul className="da-list">{kept.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
      {/* Paid up: allowed, and said in so many words first. There is no recurring charge to stop and no refund to give. */}
      {plan ? (
        <label className="da-plan"><input type="checkbox" id="daAck" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>Your <b>{TIER[plan.tier] || plan.tier}</b> plan is paid until <b>{longDate(plan.until)}</b>. Deleting does not refund the days left, and nothing more will be charged. I understand.</span></label>
      ) : null}
      <p className="da-note">Your listings come off the site the moment you press Delete; the rest takes a few seconds. Keep this page open until it says it is done. If anything interrupts it, come back here and it carries on from where it stopped.</p>
      {/* A refusal (wrong name, box unticked) is shown here, beside the field that puts it right. */}
      {err ? <ErrBox text={err} /> : null}
      <div className="da-confirm"><label htmlFor="daName">To confirm, type <b>{phrase}</b></label>
        <input id="daName" type="text" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} /></div>
      <div className="da-acts">
        <button type="button" className="da-btn" data-da="keep" onClick={close}>{begun ? "Not now" : "Keep my agency"}</button>
        <button type="button" className="da-btn da-kill" data-da="kill" disabled={!armed} onClick={kill}><Bin /><span>{removable ? "Delete agency and account" : "Delete agency"}</span></button>
      </div>
    </div></>
  );
}
