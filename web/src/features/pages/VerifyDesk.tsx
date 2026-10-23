"use client";
/**
 * The verification desk (Synapse staff only; React since 2026-10-24, was src/legacy/verify/inline-3.js).
 *
 * Seven checks per listing, named exactly as stored in properties.verification_nodes. A check cycles nobody-has-looked ->
 * it holds -> it does not, and each press is saved at once. A listing is marked verified only when all seven pass, and that
 * records the date. The page asks is_platform_admin() (the same function the database's guard uses) before showing anything;
 * the guard is what actually refuses a write.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

/* NOTE: these names do not match the seven listed in terms.html; that mismatch predates this page and is tracked separately. */
const CHECKS = ["Title", "Survey", "Structure", "Flood", "Legal", "Area", "Financial"];
const CHECK_STATES = ["pending", "passed", "failed", "not_applicable", "expired"];

type CheckNode = { name: string; status: string };
type Row = {
  id: string; title?: string; price?: number; city?: string; listing_type?: string; verification_status?: string;
  verification_nodes?: CheckNode[]; verified_at?: string | null;
};
type Client = {
  rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>;
  from: (t: string) => {
    select: (c: string) => { is: (k: string, v: null) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null; error: { message: string } | null }> } };
    update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> };
  };
};
const auth = () => window.SynAuth as unknown as { client: () => Promise<Client>; ready: () => Promise<{ id?: string } | null> } | undefined;

const naira = (n0: unknown) => {
  const n = Number(n0) || 0;
  return n >= 1e9 ? "₦" + (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? "₦" + Math.round(n / 1e6) + "M" : "₦" + n.toLocaleString();
};
/* Unknown is `pending`, which is what it always was: a listing nobody has opened has not FAILED anything. */
function nodesOf(row: Row): CheckNode[] {
  const by: Record<string, string> = {};
  (Array.isArray(row.verification_nodes) ? row.verification_nodes : []).forEach((n) => { if (n && n.name) by[n.name] = n.status; });
  return CHECKS.map((name) => ({ name, status: CHECK_STATES.indexOf(by[name]) === -1 ? "pending" : by[name] }));
}

type Gate = { kind: "loading" } | { kind: "signin" } | { kind: "staff" } | { kind: "error"; msg: string } | { kind: "empty" } | { kind: "ok" };

export function VerifyDesk() {
  const scripts = usePageScripts();
  const [gate, setGate] = useState<Gate>({ kind: "loading" });
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"queue" | "verified" | "all">("queue");
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const client = useRef<Client | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = (m: string) => {
    setToastMsg(m); setToastOn(true);
    clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastOn(false), 3000);
  };

  useEffect(() => {
    if (!scripts) return;
    (async () => {
      const a = auth();
      if (!a || !(await a.ready())) { setGate({ kind: "signin" }); return; }
      const c = await a.client(); client.current = c;
      let isAdmin = false;
      try { const { data, error } = await c.rpc("is_platform_admin"); isAdmin = !error && data === true; }
      catch { isAdmin = false; }   // fail closed: an unanswered question is a no
      if (!isAdmin) { setGate({ kind: "staff" }); return; }
      const { data, error } = await c.from("properties")
        .select("id,title,price,city,listing_type,verification_status,verification_nodes,verified_at")
        .is("deleted_at", null).order("created_at", { ascending: false });
      if (error) { setGate({ kind: "error", msg: error.message }); return; }
      setRows(data || []);
      setGate({ kind: data && data.length ? "ok" : "empty" });
    })();
  }, [scripts]);

  /* Toggling a check writes immediately: a desk that loses its work on a refresh is a desk nobody trusts. */
  const toggleCheck = async (id: string, name: string) => {
    const row = rows.find((r) => r.id === id); if (!row || !client.current) return;
    const nodes = nodesOf(row);
    const n = nodes.find((x) => x.name === name)!;
    n.status = n.status === "pending" ? "passed" : n.status === "passed" ? "failed" : "pending";
    const patch: Partial<Row> = { verification_nodes: nodes };
    if (row.verification_status !== "verified") patch.verification_status = nodes.some((x) => x.status === "passed") ? "in_progress" : "unverified";
    const { error } = await client.current.from("properties").update(patch).eq("id", id);
    if (error) { toast("Could not save: " + error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  /* verified_at records when this actually happened. */
  const mark = async (id: string, on: boolean) => {
    const row = rows.find((r) => r.id === id); if (!row || !client.current) return;
    const nodes = nodesOf(row);
    if (on && nodes.filter((n) => n.status === "passed").length !== CHECKS.length) { toast("All seven checks must pass first"); return; }
    const patch: Partial<Row> = on
      ? { verification_status: "verified", verified_at: new Date().toISOString(), verification_nodes: nodes }
      : { verification_status: "in_progress", verified_at: null };
    const { error } = await client.current.from("properties").update(patch).eq("id", id);
    if (error) { toast("Could not save: " + error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    toast(on ? "Verified, the date is now on the record" : "Verification withdrawn");
  };

  const shown = rows.filter((r) => (filter === "all" ? true : filter === "verified" ? r.verification_status === "verified" : r.verification_status !== "verified"));
  const here = typeof location !== "undefined" ? location.pathname : "";
  let list: ReactNode = null;
  if (gate.kind === "signin") {
    list = <div className="vd-gate">Sign in to use the verification desk. <a href={"signin.html?next=" + encodeURIComponent(here)} style={{ textDecoration: "underline" }}>Sign in</a></div>;
  } else if (gate.kind === "staff") {
    list = <div className="vd-gate">The verification desk is for Synapse staff. Your agency’s own listings and their verification state are in the <a href="agency.html" style={{ textDecoration: "underline" }}>agency portal</a>.</div>;
  } else if (gate.kind === "error") {
    list = <div className="vd-gate">Could not load the queue: {gate.msg}</div>;
  } else if (gate.kind === "empty") {
    list = <div className="vd-gate">Nothing in the queue. When an agency lists a home it lands here.</div>;
  } else if (gate.kind === "ok" && !shown.length) {
    list = <div className="vd-empty">Nothing here. When an agency lists a home it lands in the queue.</div>;
  } else if (gate.kind === "ok") {
    list = shown.map((r) => {
      const nodes = nodesOf(r), passed = nodes.filter((n) => n.status === "passed").length;
      const when = r.verified_at ? new Date(r.verified_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
      return (
        <div className="vd-row" key={r.id}>
          <div className="vd-top">
            <div>
              <div className="vd-ttl">{r.title || "(untitled)"}</div>
              <div className="vd-meta">{naira(r.price)} · {r.city || ""} · {r.listing_type || ""}</div>
            </div>
            <div className="vd-spacer" />
            {r.verification_status === "verified"
              ? <span className="chip chip-pass">✓ Verified{when ? " · " + when : ""}</span>
              : r.verification_status === "in_progress"
                ? <span className="chip chip-pending">◷ Still checking</span>
                : <span className="chip" style={{ background: "rgba(0,0,0,0.05)", color: "var(--ink-muted)", border: "1px solid rgba(0,0,0,0.12)" }}>◌ Not verified</span>}
          </div>
          <div className="vd-checks">
            {nodes.map((n) => (
              <button key={n.name} className={"vd-chk " + n.status + (n.status === "passed" ? " on" : "")} onClick={() => toggleCheck(r.id, n.name)}>{n.name}</button>
            ))}
          </div>
          <div className="vd-act">
            <button className="btn btn-primary" disabled={passed !== CHECKS.length} title={passed === CHECKS.length ? undefined : "All seven checks must pass"} onClick={() => mark(r.id, true)}>Mark verified</button>
            {r.verification_status === "verified" ? <button className="btn btn-ghost" onClick={() => mark(r.id, false)}>Withdraw verification</button> : null}
            <span className="vd-count">{passed} of {CHECKS.length} checks passing</span>
          </div>
        </div>
      );
    });
  }

  return (
    <>
      <div className="vd-seg" id="vdSeg" hidden={gate.kind === "staff"}>
        {(["queue", "verified", "all"] as const).map((f) => (
          <button key={f} data-f={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {f === "queue" ? "Queue" : f === "verified" ? "Verified" : "All"}
          </button>
        ))}
      </div>
      <div id="vdList">{list}</div>
      <div id="synToast" className={toastOn ? "show" : ""}>{toastMsg}</div>
    </>
  );
}
