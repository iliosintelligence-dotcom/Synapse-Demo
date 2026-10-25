"use client";
/**
 * The CRM, as React (was renderCrmFunnel/renderCrmTable/renderBulk, the CRM interactions block, the outbox and openLead in
 * src/legacy/agency/inline-3.js).
 *
 * It reads the `leads` table through portalData, which still loads and maps the rows (loadLeads/mapLead) because the negotiator,
 * the roster and the overview read the same array: `window.SynLeads()` for the rows, `window.SynCrmState()` for loaded/error,
 * `window.SynCH` for the channel names and colours, `window.SynChMark` for their logos. portalData's renderCrm() survives as a
 * name and fires `syn:crm`; paintOutboxWaiting() fires `syn:outbox-waiting`.
 *
 * The table answers what an agent opens it with (Eden, 2026-10-11): WHO is this, WHAT do they want, WHERE are they in the
 * pipeline, and WHAT should I do next. Selection is held by lead id, not by position, so a reload cannot move a tick onto a
 * different lead.
 */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePageScripts } from "@/legacy/usePageScripts";
import { Icon } from "./VerificationPane";
import { showDrawer } from "./SideDrawer";
import { closeDock } from "./PortalNav";
import { LOST_REASONS, due, report, spanWords, waiting, type Report } from "./funnel";
import "./Funnel.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const leadsNow = (): any[] => (typeof window !== "undefined" && W().SynLeads && W().SynLeads()) || [];
const crmNow = (): { loaded: boolean; error: string | null } => (typeof window !== "undefined" && W().SynCrmState && W().SynCrmState()) || { loaded: false, error: null };
type Ch = { label: string; color: string; short: string };
const CHS = (): Record<string, Ch> => (typeof window !== "undefined" && W().SynCH) || {};
const ch = (c: string): Ch => CHS()[c] || CHS().direct || { label: "Direct app", color: "#8a8f98", short: "·" };
const mark = (c: string, px: number) => (W().SynChMark ? W().SynChMark(c, px) : "");
const svg = (n: string) => (W().SynIcons && W().SynIcons.svg ? W().SynIcons.svg(n) : "");
const initials = (n: string) => String(n || "").split(" ").map((w) => w[0]).join("").slice(0, 2);
const telOf = (ph: string) => "tel:" + String(ph).replace(/[^\d+]/g, "");
const wa = (ph: string, pr: string) => "https://wa.me/" + ph.replace(/[^\d]/g, "") + "?text=" + encodeURIComponent("Hello, thank you for your interest in " + pr.split(" · ")[0] + " via Synapse.");
const scoreTone = (s: number) => (s >= 80 ? { color: "var(--success)", borderColor: "var(--success)" } : s >= 60 ? { color: "var(--brand)", borderColor: "var(--brand)" } : { color: "var(--ink-dim)", borderColor: "var(--ink-dim)" });

const TEMP_LABEL: Record<string, string> = { hot: "Hot", warm: "Warm", cold: "Cold", dormant: "Dormant", won: "Won" };
const STAGE_ORDER = ["New", "Contacted", "Viewing", "Negotiation", "Won"];
const STAGE_CLS: Record<string, string> = { New: "st-new", Contacted: "st-cont", Viewing: "st-view", Negotiation: "st-nego", Won: "st-won" };
/* The table folds nine database stages into five, so writing one back picks a canonical value per label. Lossy in one
   direction only: a lead at `qualified` reads "Contacted" and stays `qualified` until someone deliberately moves it. */
const UI_TO_DB: Record<string, string> = { New: "new", Contacted: "contacted", Viewing: "viewing_scheduled", Negotiation: "negotiating", Won: "closed" };
const tmin = (t: string) => { const m = /(\d+)\s*([mhd])/.exec(t || ""); if (!m) return 1e9; const n = +m[1]; return m[2] === "m" ? n : m[2] === "h" ? n * 60 : n * 1440; };
const budgetN = (l: any) => { const m = /₦?(\d+(?:\.\d+)?)\s*([MB])/.exec(l.price || ""); return m ? +m[1] * (m[2] === "B" ? 1000 : 1) : 0; };

type State = { page: number; per: number; sortK: string; sortDir: number; fStage: string | null; fSrc: string | null; sel: Set<string>; view: "table" | "today" | "report"; tick: number };
let state: State = { page: 1, per: 10, sortK: "recent", sortDir: -1, fStage: null, fSrc: null, sel: new Set(), view: "table", tick: 0 };
const subs = new Set<() => void>();
const set = (v: Partial<State>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useCrm = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
const repaint = () => set({ tick: state.tick + 1 });
const reload = () => { if (typeof W().loadLeads === "function") W().loadLeads(); };

function filtered(s: State) {
  let a = leadsNow().slice();
  if (s.fStage) a = a.filter((l) => l.stage === s.fStage);
  if (s.fSrc) a = a.filter((l) => l.attr.channel === s.fSrc);
  const keys: Record<string, (l: any) => any> = { recent: (l) => -tmin(l.t), score: (l) => (l.score == null ? -1 : l.score), budget: budgetN,
    stage: (l) => STAGE_ORDER.indexOf(l.stage), lead: (l) => l.nm.toLowerCase() };
  const key = keys[s.sortK] || keys.recent;
  a.sort((p, q) => { const pv = key(p), qv = key(q); return pv < qv ? -s.sortDir : pv > qv ? s.sortDir : 0; });
  return a;
}

/* ── a small menu under a button ── One at a time, closed by a pick or a click anywhere else. */
type Opt = { k: string; label: string; on?: boolean };
let menuState: { at: { top: number; left: number }; anchor: Element; opts: Opt[]; pick: (k: string) => void } | null = null;
const menuSubs = new Set<() => void>();
const setMenu = (v: typeof menuState) => { menuState = v; menuSubs.forEach((f) => f()); };
const openMenu = (anchor: Element, opts: Opt[], pick: (k: string) => void) => {
  const r = anchor.getBoundingClientRect();
  setMenu({ at: { top: r.bottom + 6, left: r.left }, anchor, opts, pick });
};
function CrmMenu() {
  const m = useSyncExternalStore((f) => { menuSubs.add(f); return () => menuSubs.delete(f); }, () => menuState, () => null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!m) return;
    const out = (ev: MouseEvent) => { if (box.current && !box.current.contains(ev.target as Node) && ev.target !== m.anchor) setMenu(null); };
    const t = setTimeout(() => document.addEventListener("click", out, true), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", out, true); };
  }, [m]);
  if (!m) return null;
  return createPortal(
    <div className="crm-menu" ref={box} style={{ top: m.at.top + "px", left: m.at.left + "px" }}>
      {m.opts.map((o) => <button key={o.k} className={"cm-i " + (o.on ? "on" : "")} data-k={o.k} onClick={() => { setMenu(null); m.pick(o.k); }}>{o.on ? "✓ " : ""}{o.label}</button>)}
    </div>, document.body);
}

/* ── the lead, in the drawer ── */
function dueWords(iso: string | null) {
  if (!iso) return { text: "No date set", late: false };
  const ms = new Date(iso).getTime() - Date.now();
  if (isNaN(ms)) return { text: "", late: false };
  const late = ms < 0;
  const h = Math.abs(ms) / 3600000;
  const n = h < 1 ? Math.max(1, Math.round(Math.abs(ms) / 60000)) : (h < 48 ? Math.round(h) : Math.round(h / 24));
  const unit = h < 1 ? "min" : (h < 48 ? "hour" : "day");
  return { text: late ? n + " " + unit + (n === 1 ? "" : "s") + " overdue" : "Due in " + n + " " + unit + (n === 1 ? "" : "s"), late };
}
/* One line per event, in the lead's own words rather than the enum's; how long it sat is the number that shows a lead cooling. */
function activityLine(a: any): { t: string; mark?: boolean } {
  const p = a.payload || {};
  const secs = Number(p.seconds_in_previous);
  const sat = isFinite(secs) && secs > 60 ? ", after " + (secs < 86400 ? Math.round(secs / 3600) + "h" : Math.round(secs / 86400) + " days") : "";
  const u = (v: any) => String(v || "?").replace(/_/g, " ");
  switch (a.activity_type) {
    case "lead_created": return { t: "Lead arrived" + (p.source ? " from " + String(p.source).replace(/_/g, " ") : ""), mark: true };
    case "lead_stage_changed": return { t: "Moved " + u(p.from) + " → " + u(p.to) + sat, mark: true };
    case "lead_assigned": return { t: "Assigned to an agent" };
    case "task_created": return { t: "Follow-up raised: " + (p.title || "a task") };
    case "task_completed": return { t: "Done: " + (p.title || "a task") };
    case "call_logged": return { t: "Call logged" };
    case "whatsapp_sent": return { t: "WhatsApp sent" };
    case "viewing_scheduled": return { t: "Viewing booked", mark: true };
    case "viewing_completed": return { t: "Viewing done", mark: true };
    case "note_added": return { t: "Note added" };
    case "deal_closed": return { t: "Closed", mark: true };
    case "deal_lost": return { t: "Lost", mark: true };
    default: return { t: String(a.activity_type || "").replace(/_/g, " ") };
  }
}
/* Only touches the database recorded: one step per touch, labelled first/last where that means something. */
function Chain({ a }: { a: any }) {
  const ago = (t: string) => (W().agoLabel ? W().agoLabel(t) : "");
  const steps: React.ReactNode[] = !a || a.unattributed
    ? [<span key="s" className="step">{ch(a && a.channel).label} <small>· from the lead&apos;s source; no touch was recorded</small></span>]
    : a.touches.map((t: any, i: number) => {
      const role = t.first && t.last ? "only touch" : t.first ? "first touch" : t.last ? "last touch" : "touch " + (i + 1);
      return <span key={i} className="step">{ch(t.channel).label} <small>· {role}{t.at ? " · " + ago(t.at) + " ago" : ""}</small></span>;
    });
  steps.push(<span key="end" className="step">Lead created</span>);
  return <div className="chain">{steps.flatMap((s, i) => (i ? [<span key={"a" + i} className="arw">→</span>, s] : [s]))}</div>;
}
const Sec = ({ k, cls, style, children }: { k: string; cls?: string; style?: React.CSSProperties; children: React.ReactNode }) =>
  <div className={"sec" + (cls ? " " + cls : "")} style={style}><div className="k">{k}</div>{children}</div>;

function Tasks({ rows, onDone }: { rows: any[] | null; onDone: (id: string) => Promise<boolean> }) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  if (!rows) return <div className="tl-none">Loading…</div>;
  if (!rows.length) return <div className="tl-none">Nothing outstanding on this lead.</div>;
  return <>{rows.map((t) => {
    const d = dueWords(t.due_at);
    const pr = t.priority === "urgent" || t.priority === "high" ? t.priority : "";
    return (
      <div key={t.id} className="tk" data-task={t.id}>
        <button className="tk-done" title="Mark done" data-done={t.id} disabled={!!busy[t.id]}
          onClick={() => { setBusy((b) => ({ ...b, [t.id]: true })); onDone(t.id).then((ok) => { if (!ok) setBusy((b) => ({ ...b, [t.id]: false })); }); }}>✓</button>
        <div className="tk-b"><div className="tk-t">{t.title || "Follow up"}</div>
          {t.description ? <div className="tk-d">{t.description}</div> : null}
          <div className={"tk-w" + (d.late ? " due" : "")}>{d.text}</div></div>
        {pr ? <span className={"tk-p " + pr}>{pr}</span> : null}
      </div>
    );
  })}</>;
}
function Trail({ rows }: { rows: any[] | null }) {
  if (!rows) return <div className="tl-none">Loading…</div>;
  if (!rows.length) return <div className="tl-none">Nothing recorded yet. Moving this lead will start the trail.</div>;
  return <div className="tl">{rows.map((a, i) => { const line = activityLine(a); return <div key={i} className={"tl-i" + (line.mark ? " mark" : "")}>{line.t}<span className="tl-w">{W().fmtWhen ? W().fmtWhen(a.created_at) : ""}</span></div>; })}</div>;
}

/* Real rows carry no AI summary, relationship graph or Tayo brief yet, so each of those sections shows only when it has
   something; a heading over "undefined" would be worse than no heading. */
function LeadView({ l }: { l: any }) {
  const [tasks, setTasks] = useState<any[] | null>(null);
  const [trail, setTrail] = useState<any[] | null>(null);
  const [did, setDid] = useState(false);
  const a = l.attr, m = ch(a.channel);
  const L = W().SynListings;
  const loadTrail = () => L.leadActivity(l.id).then(setTrail).catch((e: any) => console.error("lead activity", e));
  useEffect(() => {
    W().synMotion?.refresh?.();
    /* After the drawer is up: the lead's own details paint at once, the two round trips must not hold them back. */
    if (!l.id || !L || !L.leadTasks) return;
    L.leadTasks(l.id).then(setTasks).catch((e: any) => console.error("lead tasks", e));
    loadTrail();
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  /* Ticking a task off is the only write here. The row goes on success rather than a re-fetch; the trail IS re-fetched,
     because completing a task is itself an event and the history claims to be complete. */
  const done = (id: string) => L.completeTask(id).then(() => {
    setTasks((t) => (t || []).filter((x) => x.id !== id));
    toast("Done");
    if (L.leadActivity) loadTrail();
    return true;
  }).catch((err: any) => { toast((err && err.message) || "Could not mark that done"); return false; });
  const parts = String(l.pr).split(" · ");
  const holder = l.agentId ? (W().SynRosterName && W().SynRosterName(l.agentId)) || "A teammate" : "Nobody yet";
  const n = l.nba || {};
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {l.score == null ? null : <span className="score" style={scoreTone(l.score)}>{l.score}</span>}
        <div><div style={{ fontSize: "19px", fontWeight: 700 }}>{l.nm}</div>
          <div className="ph">{l.ph ? <a href={telOf(l.ph)} style={{ color: "inherit", textDecoration: "none" }}>{l.ph}</a> : "No phone number yet"}</div></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
        <span className={"temp " + l.temp}>{TEMP_LABEL[l.temp]}</span>
        <span className="src browse">{l.stage}</span>
        <span className="chn" style={{ background: m.color }} title={"Attributed to " + m.label} dangerouslySetInnerHTML={{ __html: mark(a.channel, 12) || m.short }}></span>
        {l.ph ? <a className="wa" href={wa(l.ph, l.pr)} target="_blank" rel="noreferrer" style={{ marginLeft: "auto" }}>WhatsApp</a> : null}
      </div>
      {/* Each way out is offered, and hidden rather than faked when the lead did not leave that detail. */}
      <div className="lead-ho">
        {l.ph ? <a className="ho" href={telOf(l.ph)}><Icon name="commute" />Call</a> : null}
        {l.em ? <a className="ho" href={"mailto:" + encodeURIComponent(l.em) + "?subject=" + encodeURIComponent("About " + parts[0])}><Icon name="share" />Email</a> : null}
      </div>
      {l.failed ? <Sec k="⚠ Not delivered" style={{ borderColor: "var(--danger,#c0392b)" }}><p style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.5 }}>This lead reached you here, but the WhatsApp alert did not go out. Reach out from this screen.</p></Sec> : null}
      <Sec k="✦ Next best action" cls="nba">
        {n.text ? <p style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.5 }}>{n.text}</p> : null}
        {n.act === "call" && l.ph ? <a className="btn btn-primary do" href={telOf(l.ph)}>{n.do}</a>
          : n.act === "wa" && l.ph ? <a className="btn btn-primary do" href={wa(l.ph, l.pr)} target="_blank" rel="noreferrer">{n.do}</a>
            : <button className="btn btn-primary do" disabled={did} style={did ? { opacity: 0.7 } : undefined} onClick={() => setDid(true)}>{did ? "✓ Done · Tayo logged it" : n.do}</button>}
      </Sec>
      {l.neg ? (
        <Sec k="✦ Tayo already negotiated">
          {l.neg.offer != null ? <p style={{ marginTop: "6px", fontSize: "19px", fontWeight: 700 }}>{W().SynNaira ? W().SynNaira(l.neg.offer) : l.neg.offer}<span className="muted" style={{ fontSize: "12px", fontWeight: 500 }}> opening offer</span></p> : null}
          {l.neg.advice ? <p className="muted" style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.6 }}>{l.neg.advice}</p> : null}
          {l.neg.draft ? <p style={{ marginTop: "10px", fontSize: "13px", lineHeight: 1.6, padding: "10px 12px", borderLeft: "2px solid var(--border)", background: "rgba(0,0,0,0.02)" }}>{l.neg.draft}</p> : null}
        </Sec>
      ) : null}
      {l.id ? <Sec k="Next step"><NextStep l={l} /></Sec> : null}
      <Sec k="Assigned to"><p style={{ marginTop: "6px", fontSize: "13.5px", fontWeight: 600 }}>{holder}</p></Sec>
      {l.summary ? <Sec k="AI summary"><p style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.6 }}>{l.summary}</p></Sec> : null}
      <Sec k="Interested in"><p style={{ marginTop: "6px", fontSize: "13.5px", fontWeight: 600 }}>{parts[0]}</p><p className="muted" style={{ fontSize: "12px" }}>{parts.slice(1).join(" · ")}</p></Sec>
      {l.id ? <Sec k="Follow-ups"><div id="leadTasks"><Tasks rows={tasks} onDone={done} /></div></Sec> : null}
      {l.id ? <Sec k="History"><div id="leadTrail"><Trail rows={trail} /></div></Sec> : null}
      <Sec k="How this lead reached you">
        <Chain a={a} />
        {a.link || a.campaign ? <p className="muted" style={{ fontSize: "11px", marginTop: "10px" }}>
          {a.link ? <>Tracked link <b style={{ color: "var(--ink-muted)" }}>{a.link}</b></> : null}
          {a.campaign ? <> · campaign <b style={{ color: "var(--ink-muted)" }}>{a.campaign}</b></> : null}</p> : null}
        <div className="capture">⚡ Auto-captured — no manual entry</div>
      </Sec>
      {l.stage === "Won" ? <Sec k="Revenue attributed" cls="won"><p style={{ marginTop: "6px", fontSize: "13px", fontWeight: 600, lineHeight: 1.5 }}>
        This {l.price} sale originated from {/^[aeiou]/i.test(m.label) ? "an" : "a"} {m.label} post{a.post ? " (" + a.post + ")" : ""}{a.posted ? " — posted " + a.posted : ""}.</p></Sec> : null}
      {Array.isArray(l.graph) && l.graph.length ? <Sec k="Relationship graph"><div className="gph">{l.graph.map((nd: any, i: number) =>
        <span key={i} style={{ display: "contents" }}><div className="gnode"><span className="r">{nd[0]}</span><span className="n">{nd[1]}</span></div>{i < l.graph.length - 1 ? <div className="gline"></div> : null}</span>)}</div></Sec> : null}
      {l.brief ? <Sec k="✦ Brief from Tayo" cls="brief"><p style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.6 }}>{l.brief}</p></Sec> : null}
    </>
  );
}
const openLead = (l: any) => showDrawer(<LeadView l={l} />);

/* The one next step on a lead: what, and by when. Saved on the lead itself (next_action_recommendation, next_action_at), so
   the table's Next step column and the bell both read it back. A date-only pick means nine in the morning that day. */
const isoDay = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; const p = (n: number) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };
function NextStep({ l }: { l: any }) {
  const [what, setWhat] = useState<string>(l.nbaOwn ? l.nba.do : "");
  const [day, setDay] = useState<string>(isoDay(l.nextAt));
  const [busy, setBusy] = useState(false);
  const [, bump] = useState(0);
  const d = due(l.nextAt);
  const save = (clear: boolean) => {
    const L = W().SynListings;
    if (!L || !L.setNextStep) { toast("Cannot save that right now."); return; }
    const at = clear || !day ? null : new Date(day + "T09:00:00").toISOString();
    setBusy(true);
    L.setNextStep(l.id, at, clear ? null : what.trim())
      .then((r: any) => {
        l.nextAt = r.next_action_at; l.nbaOwn = !!r.next_action_recommendation;
        if (r.next_action_recommendation) l.nba.do = r.next_action_recommendation;
        if (clear) { setWhat(""); setDay(""); }
        toast(clear ? "Next step cleared" : at ? "Next step saved, due " + (due(at)?.text || "").toLowerCase() : "Next step saved");
        bump((n) => n + 1);
        W().renderCrm?.();
        document.dispatchEvent(new Event("syn:noti-refresh"));
      })
      .catch((err: any) => { toast("Could not save the next step - " + ((err && err.message) || "please try again")); console.error("next step", err); })
      .then(() => setBusy(false));
  };
  return (
    <div className="nx">
      {d ? <p className={"nx-due" + (d.late ? " late" : "")}>{d.text}</p> : null}
      <input className="nx-what" type="text" maxLength={200} placeholder={l.nba.do} aria-label="What is the next step" value={what} onChange={(e) => setWhat(e.target.value)} />
      <div className="nx-row">
        <input className="nx-day" type="date" aria-label="When" value={day} onChange={(e) => setDay(e.target.value)} />
        <button className="btn btn-primary" type="button" disabled={busy || (!day && !what.trim())} onClick={() => save(false)}>{busy ? "Saving…" : "Save"}</button>
        {l.nextAt || l.nbaOwn ? <button className="btn" type="button" disabled={busy} onClick={() => save(true)}>Clear</button> : null}
      </div>
    </div>
  );
}

/* ── the funnel report ── Agency-wide, counted from the recorded stage moves: how many leads get from each stage to the next,
   how long they sit, how fast the first reply is, which channels win, and why deals are lost. */
const pctTxt = (n: number, of: number) => (of ? Math.round((n / of) * 100) + "%" : "-");
const SOCIAL: Record<string, string> = { social_instagram: "instagram", social_tiktok: "tiktok", social_facebook: "facebook" };
function FunnelReport({ on }: { on: boolean }) {
  const [rep, setRep] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);
  const s = useCrm();
  useEffect(() => {
    const L = W().SynListings;
    if (!on || !L || !L.funnelData) return;
    let live = true;
    L.funnelData().then((d: any) => {
      if (!live) return;
      /* A lost lead's channel, by the same rule as the table: the last recorded touch, else its source. */
      const lost = d.lost.map((r: any) => {
        const t = (r.lead_attribution || []).slice().sort((a: any, b: any) => new Date(a.occurred_at || 0).getTime() - new Date(b.occurred_at || 0).getTime()).pop();
        return { id: r.id, created_at: r.created_at, channel: t ? (W().uiChannel ? W().uiChannel(t.channel) : t.channel) : SOCIAL[r.source] || "direct" };
      });
      setRep(report(leadsNow(), lost, d.moves));
      setFailed(false);
    }).catch((e: any) => { console.error("funnel report", e); if (live) setFailed(true); });
    return () => { live = false; };
  }, [on, s.tick]);
  if (!on) return <div className="card fr" id="crmReport" hidden></div>;
  let body: React.ReactNode;
  if (failed) body = <div className="td-none">Could not load the report.</div>;
  else if (!rep) body = <div className="td-none">Counting…</div>;
  else if (!rep.leads) body = <div className="td-none">The report fills in with your first lead.</div>;
  else {
    const r = rep.reply;
    body = <>
      <div className="fr-sec">
        <div className="td-h">First reply</div>
        <p className="fr-big">{r.mins == null ? "No replies recorded yet" : spanWords(r.mins)}{r.mins == null ? null : <span> typical wait before a new lead is moved on</span>}</p>
        {r.n ? <p className="fr-note">{r.within} of {r.n} answered within 5 minutes ({pctTxt(r.within, r.n)}).</p> : null}
        {r.waitingNow ? <p className={"fr-note" + (r.urgentNow ? " late" : "")}>{r.waitingNow} new lead{r.waitingNow === 1 ? " is" : "s are"} waiting now{r.urgentNow ? ", " + r.urgentNow + " past 5 minutes" : ""}.</p> : null}
      </div>
      <div className="fr-sec">
        <div className="td-h">Stage to stage</div>
        {rep.steps.map((st) => (
          <div key={st.from} className="fr-step">
            <span className="fr-l">{st.from} → {st.to}</span>
            <span className="fr-bar"><i style={{ width: (st.pct || 0) + "%" }}></i></span>
            <span className="fr-n">{st.pct == null ? "-" : st.pct + "%"}<small> {st.moved} of {st.reached}</small></span>
          </div>
        ))}
      </div>
      <div className="fr-sec">
        <div className="td-h">Time in each stage</div>
        <div className="fr-grid">{rep.daysIn.map((d) => (
          <div key={d.stage} className="fr-cell"><span className="fr-l">{d.stage}</span><b>{d.mins == null ? "-" : spanWords(d.mins)}</b><small>{d.n ? "typical, from " + d.n + " move" + (d.n === 1 ? "" : "s") : "no moves yet"}</small></div>
        ))}</div>
      </div>
      <div className="fr-sec">
        <div className="td-h">Wins by channel</div>
        {rep.channels.map((c) => (
          <div key={c.channel} className="fr-ch">
            <span className="fr-dot" style={{ background: ch(c.channel).color }}></span>
            <span className="fr-l">{ch(c.channel).label}</span>
            <span className="fr-n">{c.won} won<small> of {c.leads} lead{c.leads === 1 ? "" : "s"}{c.lost ? " · " + c.lost + " lost" : ""}</small></span>
          </div>
        ))}
      </div>
      <div className="fr-sec">
        <div className="td-h">Why deals were lost</div>
        {!rep.lostTotal ? <p className="fr-note">No lost leads yet. Mark one Lost from its stage menu and say why.</p> : rep.lost.map((x) => (
          <div key={x.reason} className="fr-ch"><span className="fr-l">{x.reason}</span><span className="fr-n">{x.n}</span></div>
        ))}
      </div>
    </>;
  }
  return <div className="card fr" id="crmReport">{body}</div>;
}

/* ── the outbox ── Messages are written first and delivered separately, so a failing provider costs the attempt, never the
   message. Nothing leaves on its own: sending is a button, because these are real messages. */
const OB_LABEL: Record<string, string> = { queued: "Waiting", sending: "Sending", sent: "Sent", failed: "Failed", cancelled: "Cancelled" };
const waitingSubs = new Set<() => void>();
const repaintWaiting = () => waitingSubs.forEach((f) => f());

function Outbox() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [cfg, setCfg] = useState<{ missing?: string[] } | null>(null);
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});
  const L = W().SynListings;
  const paint = () => L.listOutbox(50).then((r: any[]) => { setRows(r); setErr(null); setCancelling({}); })
    .catch((e: any) => { setErr((e && e.message) || "please try again"); console.error("listOutbox failed", e); });
  useEffect(() => {
    paint();
    /* Say whether anything CAN be sent before the button is pressed: pressing Send with WhatsApp unconfigured used to burn an
       attempt on every queued message. null means we could not tell, and silence beats a wrong warning. */
    if (L.checkOutbox) L.checkOutbox().then((r: any) => { if (r && r.twilioReady === false) setCfg(r); });
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const send = () => {
    setSending(true);
    L.sendOutbox(50)
      .then((r: any) => { toast(!r.claimed ? "Nothing waiting to send" : r.sent + " sent" + (r.failed ? ", " + r.failed + " failed, see below" : "")); paint(); repaintWaiting(); })
      .catch((e: any) => { toast((e && e.message) || "Could not send"); console.error("sendOutbox failed", e); paint(); })
      .then(() => setSending(false));
  };
  const cancel = (id: string) => {
    setCancelling((c) => ({ ...c, [id]: true }));
    L.cancelMessage(id).then(() => { toast("Message cancelled"); paint(); })
      .catch((e: any) => { setCancelling((c) => ({ ...c, [id]: false })); toast((e && e.message) || "Could not cancel that"); paint(); });
  };
  let list;
  if (err) list = <p className="muted" style={{ fontSize: "12.5px" }}>Could not load the outbox, {err}</p>;
  else if (!rows) list = <p className="muted" style={{ fontSize: "12.5px" }}>Loading…</p>;
  else if (!rows.length) list = <p className="muted" style={{ fontSize: "12.5px" }}>Nothing in the outbox.</p>;
  else list = rows.map((m) => (
    <div key={m.id} className="ob-row">
      <div className="ob-b">
        <div className="ob-who">{(m.leads && m.leads.consumer_name) || m.to_phone}</div>
        <div className="ob-tx">{String(m.body).slice(0, 160)}{m.body.length > 160 ? "…" : ""}</div>
        {m.last_error ? <div className="ob-err">{m.last_error}{m.attempts > 0 ? " · attempt " + m.attempts + " of " + m.max_attempts : ""}</div> : null}
      </div>
      <span className={"ob-st " + m.status}>{OB_LABEL[m.status] || m.status}</span>
      {m.status === "queued" ? <button className="ob-x" data-ob-cancel={m.id} disabled={!!cancelling[m.id]} onClick={() => cancel(m.id)}>Cancel</button> : null}
    </div>
  ));
  const blocked = !!cfg;
  return (
    <>
      <div style={{ fontSize: "19px", fontWeight: 700 }}>Outbox</div>
      <p className="muted" style={{ fontSize: "12px", margin: "6px 0 14px" }}>Messages are held here until you send them. Nothing goes out on its own.</p>
      <div className="ob-cfg" id="obCfg" hidden={!cfg}>
        {cfg ? <><b>WhatsApp is not connected yet</b><p>Messages stay queued and unharmed, nothing is lost and nothing has failed. Sending needs these on the project first:</p>
          <code>{(cfg.missing || []).map((x, i) => <span key={x}>{i ? <br /> : null}{x}</span>)}</code></> : null}
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button className="btn btn-primary" id="obSend" style={{ flex: 1 }} disabled={sending || blocked} onClick={send}>{blocked ? "Cannot send yet" : sending ? "Sending…" : "Send now"}</button>
        <button className="btn" id="obRefresh" onClick={paint}>Refresh</button>
      </div>
      <div id="obList">{list}</div>
    </>
  );
}
const openOutbox = () => showDrawer(<Outbox />);

/* Counts the same rows the outbox shows. It never sends and never opens anything by itself. */
function Waiting() {
  const [s, setS] = useState<{ waiting: number; failed: number; age: string } | null>(null);
  const scripts = usePageScripts();
  useEffect(() => {
    const paint = () => {
      const L = W().SynListings;
      if (!L || !L.listOutbox) return;
      L.listOutbox(50).then((rows: any[]) => {
        const waiting = (rows || []).filter((m) => m.status === "queued" || m.status === "sending");
        const failed = (rows || []).filter((m) => m.status === "failed");
        /* The age of the OLDEST: "waiting 12 days" is the one that gets acted on. */
        const oldest = waiting.reduce((a: number | null, m) => { const t = new Date(m.created_at).getTime(); return a == null || t < a ? t : a; }, null);
        let age = "";
        if (oldest != null) {
          const mins = Math.max(0, Math.round((Date.now() - oldest) / 60000));
          const d = Math.round(mins / 1440);
          age = mins < 60 ? mins + " min" : mins < 1440 ? Math.round(mins / 60) + " hr" : d + " day" + (d === 1 ? "" : "s");
        }
        setS({ waiting: waiting.length, failed: failed.length, age });
      }).catch(() => { /* a count that cannot load must not break the pane */ });
    };
    waitingSubs.add(paint);
    window.addEventListener("syn:outbox-waiting", paint);
    /* Once on load: the notice has to be there when this is the pane you land on. */
    const t = scripts ? setTimeout(paint, 1200) : 0;
    return () => { waitingSubs.delete(paint); window.removeEventListener("syn:outbox-waiting", paint); clearTimeout(t); };
  }, [scripts]);
  const show = !!s && (s.waiting > 0 || s.failed > 0);
  return (
    <div className="ob-waiting" id="obWaiting" hidden={!show}>
      {show ? <>
        <div className="ob-w-txt">
          {s!.waiting ? <><b>{s!.waiting} message{s!.waiting === 1 ? "" : "s"} waiting to be sent</b>{s!.age ? <> <span className="ob-w-age">· oldest {s!.age}</span></> : null}</> : null}
          {s!.waiting && s!.failed ? <> &nbsp;—&nbsp; </> : null}
          {s!.failed ? <b>{s!.failed} failed</b> : null}
          <br />Nothing sends on its own. Open the outbox to review and send.</div>
        <button className="btn" type="button" id="obWaitingOpen" onClick={openOutbox}>Open outbox</button>
      </> : null}
    </div>
  );
}

/* ── hands leads to an agent. It does not message the buyer. ── WhatsApp carries Tayo-to-agent handoffs only: this goes to
   the agent each lead is assigned to, or the owner where nobody is. */
function Handoff({ picked }: { picked: any[] }) {
  const [body, setBody] = useState("");
  const [to, setTo] = useState<{ names: string[]; unreachable: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const L = W().SynListings;
  useEffect(() => {
    W().SynMatches?.focusUnlessTouch?.(ta.current);
    /* Name the recipients before a word is typed, and say now if one of them cannot be reached. */
    if (!L.handoffTarget) return;
    Promise.all(picked.slice(0, 12).map((l) => L.handoffTarget(l.id))).then((rows: any[]) => {
      const known = rows.filter(Boolean);
      if (known.length) setTo({ names: [...new Set(known.map((r) => r.recipient_name as string))], unreachable: known.filter((r) => r.reachable === false).length });
    });
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const queue = () => {
    const v = body.trim();
    if (!v) { toast("Write the message first"); ta.current?.focus(); return; }
    setBusy(true);
    L.queueMessages(picked.map((l) => l.id), v)
      .then(({ queued, requested, error }: any) => {
        toast(queued === requested ? queued + " handoff" + (queued !== 1 ? "s" : "") + " queued, press Send when ready"
          : queued + " of " + requested + " queued, " + (error || "the rest were refused"));
        set({ sel: new Set() });
        openOutbox();
      })
      .catch((err: any) => { setBusy(false); toast((err && err.message) || "Could not queue those handoffs"); console.error("queueMessages failed", err); });
  };
  const n = picked.length;
  return (
    <>
      <div style={{ fontSize: "19px", fontWeight: 700 }}>Hand {n} lead{n !== 1 ? "s" : ""} to an agent</div>
      <p className="muted" style={{ fontSize: "12px", margin: "6px 0 16px" }}>Goes on WhatsApp to the agent each lead is assigned to, or to the agency owner where nobody is assigned. The buyer is not messaged.</p>
      <div className="ob-to" id="obTo" hidden={!to}>
        {to ? <><b>Goes to</b> {to.names.join(", ")}{n > 12 ? " and others" : ""}
          {to.unreachable ? <><br /><span className="warn">{to.unreachable} of them {to.unreachable === 1 ? "has" : "have"} no phone number on file and cannot be reached.</span></> : null}</> : null}
      </div>
      <div className="lf">
        <div className="field"><label>What the agent needs to know</label>
          <textarea id="obBody" ref={ta} rows={5} maxLength={1000} placeholder="New lead from Tayo - budget, area, and what they asked about" value={body} onChange={(e) => setBody(e.target.value)}></textarea></div>
        <p className="muted" style={{ fontSize: "11.5px", margin: "-4px 0 0" }}><span id="obCount">{body.length}</span>/1000</p>
        <button className="btn btn-primary btn-block" id="obQueue" style={{ marginTop: "10px" }} disabled={busy} onClick={queue}>{busy ? "Adding…" : "Add to outbox"}</button>
        <button className="btn btn-block" id="obOpen" style={{ marginTop: "8px" }} onClick={openOutbox}>View outbox</button>
      </div>
    </>
  );
}

/* ── Today: everything owed, across every lead, in the order it is owed ── RLS narrows tasks to the caller's own unless they
   are an admin or owner, which is the right default. */
function Today({ on }: { on: boolean }) {
  const [data, setData] = useState<{ rows: any[]; at: number } | null>(null);
  const [failed, setFailed] = useState(false);
  /* Each lead's own next step joins the follow-ups, under the same due-date buckets. */
  const rows = data && data.rows.concat(leadsNow().filter((l) => l.nextAt).map((l) => ({ lead_id: l.id, title: l.nba.do, due_at: l.nextAt })))
    .sort((a, b) => (a.due_at ? new Date(a.due_at).getTime() : Infinity) - (b.due_at ? new Date(b.due_at).getTime() : Infinity));
  useEffect(() => {
    const L = W().SynListings;
    if (!on || !L || !L.openTasks) return;
    let live = true;
    Promise.resolve().then(() => { if (live) { setData(null); setFailed(false); } });
    L.openTasks().then((r: any[]) => { if (live) setData({ rows: r || [], at: Date.now() }); }).catch((e: any) => { console.error("openTasks", e); if (live) setFailed(true); });
    return () => { live = false; };
  }, [on]);
  let body;
  if (failed) body = <div className="td-none">Could not load your follow-ups.</div>;
  else if (!rows) body = <div className="td-none">Loading…</div>;
  else if (!rows.length) body = <div className="td-none">Nothing owed right now. Follow-ups appear here the moment a lead moves stage.</div>;
  else {
    const now = data!.at, endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
    const b: Record<string, any[]> = { late: [], today: [], later: [] };
    rows.forEach((t) => { const due = t.due_at ? new Date(t.due_at).getTime() : null; (due && due < now ? b.late : !due || due <= endOfDay.getTime() ? b.today : b.later).push(t); });
    /* The lead's name, not its uuid: a task that says "call 4f3a-..." is a task nobody does. */
    const nameOf = (id: string) => { const l = leadsNow().find((x) => x.id === id); return l ? l.nm : ""; };
    const open = (id: string) => { const l = leadsNow().find((x) => x.id === id); if (l) openLead(l); else toast("That lead is not on this page of the table"); };
    const group = (k: string, title: string, late: boolean) => b[k].length ? [
      <div key={k} className={"td-h" + (late ? " late" : "")}>{title} · {b[k].length}</div>,
      ...b[k].map((t, i) => { const who = nameOf(t.lead_id); return (
        <div key={k + i} className="td-r" data-lead={t.lead_id || ""} onClick={() => t.lead_id && open(t.lead_id)}>
          {who ? <span className="who">{who}</span> : null}<span className="what">{t.title || "Follow up"}</span><span className={"when" + (late ? " late" : "")}>{dueWords(t.due_at).text}</span>
        </div>); }),
    ] : [];
    body = [...group("late", "Overdue", true), ...group("today", "Today", false), ...group("later", "Later", false)];
  }
  return <div className="card" id="crmToday" hidden={!on} style={{ padding: "18px 20px" }}>{on ? body : null}</div>;
}

function Row({ l, sel }: { l: any; sel: boolean }) {
  const hue = Array.from(String(l.nm || "")).reduce((h: number, c: string) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const c = ch(l.attr.channel);
  const want = String(l.pr || "").split(" · ");
  const why = l.failed ? String(l.failReason || "Could not notify the agency automatically").replace(/[.\s]+$/, "") : "";
  const id = "crmsel-" + l.id;
  const toggle = (on: boolean) => { const s = new Set(state.sel); if (on) s.add(l.id); else s.delete(l.id); set({ sel: s }); };
  const lose = (anchor: HTMLButtonElement) => openMenu(anchor, LOST_REASONS.map((r) => ({ k: r, label: "Lost: " + r })), (reason) => {
    const L = W().SynListings;
    if (!L || !L.loseLead) { toast("Cannot save that right now."); return; }
    l.saving = true;
    repaint();
    /* A lost lead leaves the table (the CRM lists live leads); the report keeps it, with its reason. */
    L.loseLead(l.id, reason)
      .then((r: any) => { toast(l.nm + " marked lost" + (r.reasonSaved ? " · " + reason.toLowerCase() : ", but the reason could not be saved")); reload(); })
      .catch((err: any) => { l.saving = false; repaint(); toast("Could not mark that lead lost - " + ((err && err.message) || "please try again")); console.error("lose lead", err); });
  });
  const stageMenu = (anchor: HTMLButtonElement) => openMenu(anchor, [...STAGE_ORDER.map((st) => ({ k: st, label: st, on: l.stage === st })), { k: "Lost", label: "Lost…" }], (st) => {
    if (st === l.stage) return;
    if (st === "Lost") { setTimeout(() => lose(anchor), 0); return; }
    const L = W().SynListings;
    if (!L || !L.setLeadStage) { toast("Cannot save that right now."); return; }
    /* Optimistic, but reverted on failure: the table must never show a stage the database did not accept. */
    const prevUi = l.stage, prevDb = l.dbStage;
    l.stage = st; l.dbStage = UI_TO_DB[st]; l.saving = true;
    repaint();
    L.setLeadStage(l.id, UI_TO_DB[st])
      .then(() => toast(l.nm + " moved to " + st))
      .catch((err: any) => { l.stage = prevUi; l.dbStage = prevDb; toast("Could not move that lead - " + ((err && err.message) || "please try again")); console.error("stage update failed", err); })
      .then(() => { l.saving = false; W().renderCrm?.(); });
  });
  const holder = l.agentId ? (W().SynRosterName && W().SynRosterName(l.agentId)) || "Assigned" : (l.ph || "No phone yet");
  const wt = waiting(l), nd = due(l.nextAt);
  return (
    <tr className={"crm-row " + (sel ? "sel" : "")} data-i={l.id} onClick={(e) => { if ((e.target as Element).closest(".crm-chk, [data-stop], [data-stage-i]")) return; openLead(l); }}>
      <td className="c-chk"><input type="checkbox" className="crm-chk" id={id} data-sel={l.id} checked={sel} aria-label={"Select " + l.nm} onChange={(e) => toggle(e.target.checked)} /></td>
      <td className="c-lead"><span className="cell"><label htmlFor={id} className="crm-av" data-stop="" title={"Select " + l.nm} style={{ "--av-h": hue } as React.CSSProperties}>{initials(l.nm)}<i className="crm-srcdot" style={{ background: c.color }} title={"Came from " + c.label}></i></label>
        <span className="crm-lead-tx"><span className="nmx">{l.nm}</span><span className="phx">{holder}</span></span></span></td>
      <td className="c-int"><span className="int-t">{want[0] || "Listing unavailable"}</span><span className="int-b"><b>{l.price}</b>{want[1] ? <span className="int-c"> · {want[1]}</span> : null}</span></td>
      <td className="c-stage"><button className={"stpill stpill-btn " + STAGE_CLS[l.stage]} data-stage-i={l.id} disabled={!!l.saving} aria-label={"Change stage for " + l.nm + " - currently " + l.stage}
        onClick={(e) => stageMenu(e.currentTarget)}>{l.stage}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button></td>
      <td className="c-next"><span className="nbax">→ {l.nba.do}</span>{nd ? <span className={"nxd" + (nd.late ? " late" : nd.today ? " today" : "")}>{nd.text}</span> : null}</td>
      <td className="c-status"><span className={"heat " + l.temp}>{TEMP_LABEL[l.temp]}</span>{l.score != null ? <span className="scr" title="Lead score">{l.score}</span> : null}{l.failed ? <span className="failx" title={why}>⚠ Not notified</span> : null}</td>
      <td className="c-time">{wt ? <span className={"wait" + (wt.urgent ? " hot" : "")} title="Time since this lead arrived, with no reply yet">{wt.text}</span> : l.t}</td>
      <td className="c-act">
        {l.ph ? <>
          <a className="crm-call" href={telOf(l.ph)} data-stop="" aria-label={"Call " + l.nm} title="Call" dangerouslySetInnerHTML={{ __html: svg("phone") }}></a>
          <a className="crm-wa" href={wa(l.ph, l.pr)} target="_blank" rel="noreferrer" data-stop="" aria-label={"WhatsApp " + l.nm} title="WhatsApp" dangerouslySetInnerHTML={{ __html: mark("whatsapp", 18) }}></a>
        </> : <span className="crm-call off" title="No phone number on this lead" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg("phone") }}></span>}
        <button className="crm-more" aria-label={"Open " + l.nm} title="Open" dangerouslySetInnerHTML={{ __html: svg("more") }}></button>
      </td>
    </tr>
  );
}

const COLS: [string, string][] = [["", ""], ["Lead", "lead"], ["Interested in", "budget"], ["Stage", "stage"], ["Next step", ""], ["Heat", "score"], ["Last activity", "recent"], ["", ""]];
const firstDir = (k: string) => (k === "lead" || k === "stage" ? 1 : -1);

export function CrmPane() {
  const s = useCrm();
  const scripts = usePageScripts();
  const [goVal, setGoVal] = useState("");
  const crm = scripts ? crmNow() : { loaded: false, error: null };
  const all = scripts ? leadsNow() : [];

  useEffect(() => {
    window.addEventListener("syn:crm", repaint);
    return () => window.removeEventListener("syn:crm", repaint);
  }, []);
  /* Selection is by id; ids that left with a reload leave the selection too. */
  useLayoutEffect(() => {
    if (!s.sel.size) return;
    const ids = new Set(all.map((l) => l.id));
    const kept = [...s.sel].filter((id) => ids.has(id));
    if (kept.length !== s.sel.size) set({ sel: new Set(kept) });
  });
  /* On a phone the avatar is the tap target; .selecting turns every avatar into a selection ring once one lead is picked. */
  useEffect(() => { document.querySelector(".crm-tablecard")?.classList.toggle("selecting", s.sel.size > 0); }, [s.sel]);

  const rows = scripts ? filtered(s) : [];
  const pages = Math.max(1, Math.ceil(rows.length / s.per));
  const page = Math.min(s.page, pages);
  const start = (page - 1) * s.per;
  const picked = () => all.filter((l) => s.sel.has(l.id));

  /* Five stages reading zero above an empty table tell you nothing; the funnel comes back with the first lead. */
  const counts = STAGE_ORDER.map((st) => all.filter((l) => l.stage === st).length);
  const max = Math.max(...counts, 1);
  const pickStage = (st: string, el: Element) => {
    set({ fStage: s.fStage === st ? null : st, page: 1 });
    /* picked from inside the taskbar sheet: get out of the way of the result */
    if (el.closest(".agd-sheet")) closeDock();
  };
  const sortBy = (k: string) => set(s.sortK === k ? { sortDir: s.sortDir * -1, page: 1 } : { sortK: k, sortDir: firstDir(k), page: 1 });

  const bulkAssign = (anchor: Element) => {
    const p = picked();
    if (!p.length) return;
    W().SynLoadRoster().then((people: any[]) => {
      if (!people.length) { toast("Could not load your team, try again in a moment"); return; }
      const opts = [{ k: "", label: "Unassigned" }].concat(people.map((m) => ({ k: m.id, label: m.name + (m.role === "agent" ? "" : " · " + m.role.replace("agency_", "")) })));
      openMenu(anchor, opts, (id) => {
        W().SynListings.assignLeads(p.map((l) => l.id), id || null)
          .then(({ updated, requested }: any) => {
            const who = id ? (people.find((m) => m.id === id) || {}).name : "nobody";
            toast(updated === requested ? updated + " lead" + (updated !== 1 ? "s" : "") + " assigned to " + who
              : updated + " of " + requested + " assigned to " + who + ", the rest could not be changed");
            set({ sel: new Set() });
            reload();
          })
          .catch((err: any) => { toast((err && err.message) || "Could not assign those leads"); console.error("assignLeads failed", err); });
      });
    });
  };
  const bulkDelete = () => {
    const p = picked();
    if (!p.length) return;
    const n = p.length;
    /* Destructive and shared, so it asks. Only admins and owners may; anyone else is told plainly. */
    if (!window.confirm("Delete " + n + " lead" + (n !== 1 ? "s" : "") + "? They will be removed from your CRM.")) return;
    W().SynListings.deleteLeads(p.map((l) => l.id))
      .then(({ deleted, requested, error }: any) => {
        toast(deleted === requested ? deleted + " lead" + (deleted !== 1 ? "s" : "") + " deleted" : deleted + " of " + requested + " deleted, " + (error || "the rest could not be removed"));
        set({ sel: new Set() });
        reload();
      })
      .catch((err: any) => { toast((err && err.message) || "Could not delete those leads"); console.error("deleteLeads failed", err); });
  };
  const bulk = (act: string, el: Element) => {
    if (act === "clear") { set({ sel: new Set() }); return; }
    if (!W().SynListings) { toast("Cannot do that right now, the data layer did not load"); return; }
    if (act === "assign") bulkAssign(el);
    else if (act === "message") { const p = picked(); if (p.length) showDrawer(<Handoff picked={p} />); }
    else if (act === "delete") bulkDelete();
  };

  let body: React.ReactNode;
  let bare = false;
  if (!rows.length) {
    /* A column header over nothing looks broken, not empty. Filtered-empty keeps it: the columns are the way back. */
    const isFiltered = !!(s.fStage || s.fSrc);
    bare = !crm.loaded || !!crm.error || !isFiltered;
    body = <tr className="crm-empty"><td colSpan={8}>{
      crm.error ? <div className="ov-blank"><b>Could not load your leads</b><p>{crm.error}</p></div>
        : !crm.loaded ? <div className="ov-blank"><p>Loading your leads…</p></div>
          : isFiltered ? "No leads match this filter."
            : <div className="ov-blank"><span className="ov-blank-i"><Icon name="users" /></span><b>No leads yet</b>
              <p>A lead lands here the moment a buyer taps Contact agent on one of your listings — with what they told Tayo, the listing they asked about, and where they came from already filled in.</p>
              {/* To Listings, not to + Add lead, which only refetches: Listings is where a lead actually starts. */}
              <button className="btn btn-primary" type="button" id="crmBlankAdd" onClick={() => (document.querySelector('a[data-pane="listings"]') as HTMLElement | null)?.click()}>See your listings</button></div>
    }</td></tr>;
  } else {
    body = rows.slice(start, start + s.per).map((l) => <Row key={l.id} l={l} sel={s.sel.has(l.id)} />);
  }

  return (
    <>
      <div className="eyebrow" data-agency-eyebrow="">Your agency</div>
      <div className="h1">CRM</div>
      <div className="crm-tools" data-pane-filters="">
        <div className="crm-tools-l">
          <div className="seg">
            <button className={"seg-b" + (s.view === "table" ? " on" : "")} id="crmTableBtn" onClick={() => set({ view: "table" })}><Icon name="card" />{" Table"}</button>
            <button className={"seg-b" + (s.view === "today" ? " on" : "")} id="crmTodayBtn" onClick={() => set({ view: "today" })}><Icon name="check" />{" Today"}</button>
            <button className={"seg-b" + (s.view === "report" ? " on" : "")} id="crmReportBtn" onClick={() => set({ view: "report" })}><Icon name="boards" />{" Report"}</button>
          </div>
          <button className="tbtn" id="crmFilterBtn" onClick={(e) => {
            const srcs = Object.keys(CHS()).filter((c) => all.some((l) => l.attr.channel === c));
            openMenu(e.currentTarget, [{ k: "", label: "All sources", on: !s.fSrc }, ...srcs.map((c) => ({ k: c, label: ch(c).label, on: s.fSrc === c }))], (k) => set({ fSrc: k || null, page: 1 }));
          }}><Icon name="filter" />{" Filter"}</button>
          <button className="tbtn" id="crmSortBtn" onClick={(e) => openMenu(e.currentTarget,
            [["recent", "Most recent"], ["score", "Lead score"], ["budget", "Budget"], ["stage", "Pipeline stage"], ["lead", "Name"]].map(([k, label]) => ({ k, label, on: s.sortK === k })),
            (k) => set({ sortK: k, sortDir: firstDir(k), page: 1 }))}><Icon name="sort" />{" Sort"}</button>
        </div>
        <div className="crm-tools-r">
          <button className="tbtn" id="crmExport" onClick={() => toast("Exporting your pipeline to CSV…")}><Icon name="export" />{" Export"}</button>
          <button className="tbtn primary" id="crmAdd" onClick={() => { toast("Refreshing leads..."); const st = crmNow() as any; st.loaded = false; st.error = null; repaint(); reload(); }}>+ Add lead</button>
        </div>
      </div>
      <Waiting />
      <div className="crm-funnel" id="crmFunnel" data-pane-filters="" hidden={!all.length}>
        {STAGE_ORDER.map((st, i) => (
          <span key={st} style={{ display: "contents" }}>
            <button className={"fn-card " + STAGE_CLS[st] + " " + (s.fStage === st ? "on" : "")} data-stage={st} aria-pressed={s.fStage === st} onClick={(e) => pickStage(st, e.currentTarget)}>
              <span className="fn-l">{st}</span><span className="fn-n">{counts[i]}</span><span className="fn-bar"><i style={{ width: (counts[i] / max) * 100 + "%" }}></i></span>
            </button>{i < STAGE_ORDER.length - 1 ? <span className="fn-sep">›</span> : null}
          </span>
        ))}
      </div>
      <div className="card crm-tablecard" hidden={s.view !== "table"}>
        <table className="crm-table" id="crmTable">
          <caption className="sr-only">Leads pipeline</caption>
          <thead id="crmHead" hidden={bare}><tr>{COLS.map(([label, k], i) => {
            if (!k) return <th key={i}>{label ? <span>{label}</span> : null}</th>;
            const on = s.sortK === k;
            return <th key={i} className={"sortable " + (on ? "on" : "")} data-sort={k} aria-sort={on ? (s.sortDir < 0 ? "descending" : "ascending") : "none"} onClick={() => sortBy(k)}>
              <span>{label}</span><span className="crt">{on && s.sortDir > 0 ? "▴" : "▾"}</span></th>;
          })}</tr></thead>
          <tbody id="leads">{body}</tbody>
        </table>
        <div className="crm-pg" id="crmPager">{rows.length ? <>
          <div className="pg-l">Showing <select id="crmPer" aria-label="Rows per page" value={s.per} onChange={(e) => set({ per: +e.target.value, page: 1 })}><option>10</option><option>25</option><option>50</option></select> per page · {rows.length} lead{rows.length !== 1 ? "s" : ""}</div>
          <nav className="pg-nav" aria-label="Pagination">{Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
            <button key={p} className={"pg-n " + (p === page ? "on" : "")} data-pg={p} aria-current={p === page ? "page" : undefined} onClick={() => set({ page: p })}>{p}</button>)}</nav>
          <div className="pg-go">Go to page <input type="number" min="1" max={pages} id="crmGo" inputMode="numeric" aria-label="Go to page" value={goVal} onChange={(e) => setGoVal(e.target.value)} />
            <button className="tbtn" id="crmGoBtn" onClick={() => { const v = +goVal; if (v) set({ page: Math.min(Math.max(1, v), pages) }); }}>Go</button></div>
        </> : null}</div>
      </div>
      <Today on={s.view === "today"} />
      <FunnelReport on={s.view === "report"} />
      <div className={"crm-bulk" + (s.sel.size > 0 ? " on" : "")} id="crmBulk" role="toolbar" aria-label="Bulk actions">
        <span className="bk-n" id="crmBulkN">{s.sel.size} selected</span>
        <button data-bulk="assign" onClick={(e) => bulk("assign", e.currentTarget)}>Assign</button>
        <button data-bulk="message" onClick={(e) => bulk("message", e.currentTarget)}>Message</button>
        <button data-bulk="delete" className="dgr" onClick={(e) => bulk("delete", e.currentTarget)}>Delete</button>
        <button className="bk-x" data-bulk="clear" aria-label="Clear selection" onClick={(e) => bulk("clear", e.currentTarget)}>×</button>
      </div>
      <CrmMenu />
    </>
  );
}
