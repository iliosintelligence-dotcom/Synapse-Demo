"use client";
/**
 * The verification desk (Synapse staff only). React since 2026-10-24; rebuilt 2026-10-25 on the database's own write path.
 *
 * The old desk wrote properties.verification_nodes and verification_status straight from the browser, with seven made-up check
 * names (Title, Survey, ...) that matched nothing in the database, so nothing it did could ever count. Verification goes through
 * three SECURITY DEFINER functions (migrations 0099-0102) and nothing else:
 *   record_property_check(property, check, status, evidence, notes)   one row per check, re-recording replaces it
 *   set_property_verification(property, state, notes)                 refuses 'verified' until the three required checks pass
 * and the database refuses a 'passed' it cannot believe (no photos, no address, no evidence for ownership). Its refusals are
 * written for people, so the desk shows them as they come.
 *
 * Each listing shows what the agency supplied: its photos, its basics, and the ownership papers uploaded from the agency portal
 * (property-documents bucket), which open through a two-minute signed link.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* The seven check types, as the database names them. The first three gate 'verified'; the rest raise the trust score. */
const CHECKS: { key: string; label: string; required?: boolean }[] = [
  { key: "listing_authenticity", label: "Title, address, price", required: true },
  { key: "media_validation", label: "Photos are of this home", required: true },
  { key: "ownership_validation", label: "Ownership papers", required: true },
  { key: "freshness_validation", label: "Still available" },
  { key: "structural_assessment", label: "Structure" },
  { key: "flood_risk", label: "Flood risk" },
  { key: "government_acquisition_risk", label: "Government acquisition" },
];
const PAPER: Record<string, string> = {
  certificate_of_occupancy: "C of O", governors_consent: "Governor’s Consent", deed_of_assignment: "Deed of Assignment",
  survey_plan: "Survey plan", allocation_letter: "Allocation letter", building_approval: "Building approval", excision_document: "Excision", other: "Other",
};
const BUCKET = "property-documents";

type Check = { property_id: string; check_type: string; status: string; notes?: string | null; evidence_urls?: string[] };
type Paper = { id: string; entity_id: string; document_type: string; display_name?: string; storage_url: string };
type Row = {
  id: string; title?: string; price?: number; city?: string; address?: string; listing_type?: string; listed_at?: string;
  verification_status?: string; verified_at?: string | null; trust_score?: number | null; agencies?: { name?: string } | null;
  property_media?: { id: string }[];
};
const auth = () => (window as any).SynAuth as { client: () => Promise<any>; ready: () => Promise<{ id?: string } | null> } | undefined;

const naira = (n0: unknown) => {
  const n = Number(n0) || 0;
  return n >= 1e9 ? "₦" + (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? "₦" + Math.round(n / 1e6) + "M" : "₦" + n.toLocaleString();
};
const errText = (e: any) => String((e && (e.message || e.details)) || "please try again");

type Gate = { kind: "loading" } | { kind: "signin" } | { kind: "staff" } | { kind: "error"; msg: string } | { kind: "empty" } | { kind: "ok" };

export function VerifyDesk() {
  const scripts = usePageScripts();
  const [gate, setGate] = useState<Gate>({ kind: "loading" });
  const [rows, setRows] = useState<Row[]>([]);
  const [checks, setChecks] = useState<Record<string, Record<string, Check>>>({});
  const [papers, setPapers] = useState<Record<string, Paper[]>>({});
  const [filter, setFilter] = useState<"queue" | "verified" | "all">("queue");
  const [busy, setBusy] = useState<string>("");
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const client = useRef<any>(null);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = (m: string) => {
    setToastMsg(m); setToastOn(true);
    clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastOn(false), 4500);
  };

  const load = async () => {
    const c = client.current;
    const { data, error } = await c.from("properties")
      .select("id,title,price,city,address,listing_type,listed_at,verification_status,verified_at,trust_score,agencies(name),property_media(id)")
      .is("deleted_at", null).order("created_at", { ascending: false });
    if (error) { setGate({ kind: "error", msg: error.message }); return; }
    const list: Row[] = data || [];
    const ids = list.map((r) => r.id);
    const by: Record<string, Record<string, Check>> = {};
    const docs: Record<string, Paper[]> = {};
    if (ids.length) {
      const [ck, dc] = await Promise.all([
        c.from("property_verification_checks").select("property_id,check_type,status,notes,evidence_urls").in("property_id", ids),
        c.from("documents").select("id,entity_id,document_type,display_name,storage_url").eq("entity_type", "property")
          .in("entity_id", ids).is("deleted_at", null).eq("is_current", true),
      ]);
      ((ck && ck.data) || []).forEach((x: Check) => { (by[x.property_id] = by[x.property_id] || {})[x.check_type] = x; });
      ((dc && dc.data) || []).forEach((x: Paper) => { (docs[x.entity_id] = docs[x.entity_id] || []).push(x); });
    }
    setRows(list); setChecks(by); setPapers(docs);
    setGate({ kind: list.length ? "ok" : "empty" });
  };

  useEffect(() => {
    if (!scripts) return;
    (async () => {
      const a = auth();
      if (!a || !(await a.ready())) { setGate({ kind: "signin" }); return; }
      client.current = await a.client();
      let isAdmin = false;
      try { const { data, error } = await client.current.rpc("is_platform_admin"); isAdmin = !error && data === true; }
      catch { isAdmin = false; }   // fail closed: an unanswered question is a no
      if (!isAdmin) { setGate({ kind: "staff" }); return; }
      await load();
    })();
  }, [scripts]);

  /* One press records one check. Ownership carries the listing's papers as its evidence; a failure asks why, because a failed
     check with no reason is one the agency cannot fix. */
  const record = async (r: Row, key: string, status: "passed" | "failed" | "pending") => {
    let notes: string | null = null;
    if (status === "failed") {
      notes = window.prompt("Why does this check fail? The agency will need to fix it.") || null;
      if (!notes) return;
    }
    const evidence = key === "ownership_validation" ? (papers[r.id] || []).map((p) => BUCKET + "/" + p.storage_url) : [];
    setBusy(r.id + key);
    const { error } = await client.current.rpc("record_property_check", {
      p_property_id: r.id, p_check_type: key, p_status: status, p_evidence_urls: evidence, p_notes: notes,
    });
    setBusy("");
    if (error) { toast(errText(error)); return; }
    await load();
  };
  const setState = async (r: Row, state: "verified" | "under_review") => {
    const notes = state === "verified" ? "Required checks passed at the desk" : window.prompt("Why is verification being withdrawn?") || "";
    if (state !== "verified" && !notes) return;
    setBusy(r.id + state);
    const { error } = await client.current.rpc("set_property_verification", { p_property_id: r.id, p_state: state, p_notes: notes });
    setBusy("");
    if (error) { toast(errText(error)); return; }
    toast(state === "verified" ? "Verified. Buyers now see the stamp" : "Verification withdrawn");
    await load();
  };
  const openPaper = async (p: Paper) => {
    const { data, error } = await client.current.storage.from(BUCKET).createSignedUrl(p.storage_url, 120);
    if (error || !data) { toast("Could not open that paper: " + errText(error)); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const ready = (r: Row) => (papers[r.id] || []).length > 0;
  const shown = rows
    .filter((r) => (filter === "all" ? true : filter === "verified" ? r.verification_status === "verified" : r.verification_status !== "verified"))
    /* The queue leads with what can actually be finished: listings whose agency has sent papers. */
    .sort((a, b) => (filter === "queue" ? Number(ready(b)) - Number(ready(a)) : 0));
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
    list = <div className="vd-empty">Nothing here.</div>;
  } else if (gate.kind === "ok") {
    list = shown.map((r) => {
      const ck = checks[r.id] || {};
      const st = (k: string) => (ck[k] ? ck[k].status : "pending");
      const req = CHECKS.filter((c) => c.required);
      const passed = req.filter((c) => st(c.key) === "passed").length;
      const docs = papers[r.id] || [];
      const photos = (r.property_media || []).length;
      const when = r.verified_at ? new Date(r.verified_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
      return (
        <div className="vd-row" key={r.id}>
          <div className="vd-top">
            <div>
              <div className="vd-ttl">{r.title || "(untitled)"}</div>
              <div className="vd-meta">{naira(r.price)} · {r.address || r.city || "no address"} · {r.agencies?.name || "agency"} · {photos} photo{photos === 1 ? "" : "s"}{r.trust_score != null ? " · trust " + r.trust_score : ""}</div>
            </div>
            <div className="vd-spacer" />
            {r.verification_status === "verified"
              ? <span className="chip chip-pass">✓ Verified{when ? " · " + when : ""}</span>
              : docs.length ? <span className="chip chip-pending">Papers in · ready to check</span>
                : <span className="chip" style={{ background: "rgba(0,0,0,0.05)", color: "var(--ink-muted)" }}>Waiting for papers</span>}
          </div>
          <div className="vd-papers">
            {docs.length ? docs.map((p) => <button key={p.id} type="button" className="btn btn-ghost" onClick={() => openPaper(p)}>{PAPER[p.document_type] || p.document_type}: {p.display_name || "open"}</button>)
              : <span className="vd-count">No ownership papers uploaded yet.</span>}
          </div>
          <div className="vd-checks">
            {CHECKS.map((c) => {
              const s = st(c.key);
              const note = ck[c.key]?.notes;
              return (
                <div key={c.key} className={"vd-ck " + s}>
                  <span className="vd-ck-l">{c.label}{c.required ? " *" : ""}</span>
                  <span className="vd-ck-s" title={note || undefined}>{s === "passed" ? "✓ passed" : s === "failed" ? "✕ failed" : s.replace(/_/g, " ")}</span>
                  <button type="button" className={"vd-chk" + (s === "passed" ? " passed on" : "")} disabled={!!busy} onClick={() => record(r, c.key, s === "passed" ? "pending" : "passed")}>{s === "passed" ? "Undo" : "Pass"}</button>
                  <button type="button" className={"vd-chk" + (s === "failed" ? " failed" : "")} disabled={!!busy || s === "failed"} onClick={() => record(r, c.key, "failed")}>Fail</button>
                </div>
              );
            })}
          </div>
          <div className="vd-act">
            {r.verification_status === "verified"
              ? <button className="btn btn-ghost" disabled={!!busy} onClick={() => setState(r, "under_review")}>Withdraw verification</button>
              : <button className="btn btn-primary" disabled={!!busy || passed !== req.length} title={passed === req.length ? undefined : "The three required checks must pass"} onClick={() => setState(r, "verified")}>Mark verified</button>}
            <span className="vd-count">{passed} of {req.length} required checks passed · * required</span>
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
