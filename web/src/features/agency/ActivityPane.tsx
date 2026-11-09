"use client";
/**
 * Activity: the agency's social history and channel routing, read-only (contract: "full audit history", "channel
 * routing logs").
 *
 * Two views over tables the DATABASE writes (social_audit_log, social_routing_log -- see the migration
 * 20261109110000_who_did_what_and_where_it_went.sql): who created, edited, rescheduled, cancelled, published each post
 * and connected or disconnected each account; and, for each listing offered to Synapse's own channels, which channel
 * took it and which did not, and why. Nothing here can change either log.
 *
 * Loads when the pane is opened (goToPane fires `syn:activity-load`) and on Refresh.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { Icon } from "./VerificationPane";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

type Audit = {
  id: number; created_at: string; entity: string; entity_id: string; action: string; from_status?: string; to_status?: string;
  changes?: Record<string, any>; actor_kind: string; actor_name: string; platform: string; listing: string; account: string;
};
type Route = { id: number; created_at: string; property_id: string; platform?: string; channel_kind?: string; decision: string; reason: string; listing: string };

const PLATFORM: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", telegram: "Telegram", youtube: "YouTube", x: "X", whatsapp: "WhatsApp",
};
const ACTION: Record<string, string> = {
  created: "Post created", routed_to_synapse_channel: "Copy queued on a Synapse channel", edited: "Post edited",
  rescheduled: "Post moved to a new time", scheduled: "Post scheduled", cancelled: "Post cancelled", removed: "Post removed",
  publishing: "Post going out", published: "Post published", failed: "Post failed", retried: "Post sent back to the queue",
  status_changed: "Post status changed", connected: "Account connected", disconnected: "Account disconnected",
  reconnected: "Account reconnected", token_renewed: "Account access renewed", updated: "Account updated",
};
const TONE: Record<string, string> = { published: "ok", connected: "ok", reconnected: "ok", failed: "bad", cancelled: "warn", removed: "warn", disconnected: "warn" };

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function who(a: Audit) {
  if (a.actor_kind === "user") return a.actor_name || "A team member";
  if (a.actor_kind === "scheduled_job") return "Synapse (scheduled)";
  return "Synapse";
}
function detail(a: Audit) {
  const bits: string[] = [];
  const c = a.changes || {};
  if (c.caption === "edited") bits.push("caption edited");
  if (c.scheduled_at && c.scheduled_at.to) bits.push("now " + when(c.scheduled_at.to));
  if (c.failure_reason && c.failure_reason.to) bits.push(String(c.failure_reason.to).slice(0, 140));
  if (c.token === "replaced" && a.action !== "token_renewed") bits.push("new access granted");
  return bits.join(" · ");
}

const ROW: CSSProperties = { display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid var(--line, rgba(0,0,0,.08))" };
const META: CSSProperties = { fontSize: "12px", color: "var(--muted, #6b6b6b)", marginTop: "2px" };
const CHIP: Record<string, CSSProperties> = {
  ok: { color: "#137a3a", background: "rgba(19,122,58,.1)" }, bad: { color: "#b42318", background: "rgba(180,35,24,.1)" },
  warn: { color: "#9a5b00", background: "rgba(154,91,0,.1)" }, "": { color: "inherit", background: "rgba(0,0,0,.05)" },
};
const chip = (tone: string, text: string) =>
  <span style={{ ...CHIP[tone] || CHIP[""], fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>{text}</span>;

export function ActivityPane() {
  const [data, setData] = useState<{ audit: Audit[]; routing: Route[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<"history" | "routing">("history");
  const [busy, setBusy] = useState(false);

  const load = () => {
    const L = W().SynListings;
    if (!L || !L.socialActivity) return;
    setBusy(true);
    L.socialActivity(300)
      .then((d: any) => { setData({ audit: d.audit || [], routing: d.routing || [] }); setErr(null); })
      .catch((e: any) => setErr((e && e.message) || "please refresh"))
      .then(() => setBusy(false));
  };
  useEffect(() => {
    window.addEventListener("syn:activity-load", load);
    /* Opened straight on #activity: goToPane may have fired before this listener existed, and SynListings may still be
       loading. Wait for it briefly, then load once. */
    let tries = 0;
    const t = location.hash.replace(/^#/, "") === "activity" ? window.setInterval(() => {
      if (W().SynListings?.socialActivity || ++tries > 40) { window.clearInterval(t); load(); }
    }, 250) : 0;
    return () => { window.removeEventListener("syn:activity-load", load); if (t) window.clearInterval(t); };
  }, []);

  let list;
  if (err) list = <div className="ov-blank"><b>Could not load activity</b><p>{err}</p></div>;
  else if (!data) list = <p className="muted" style={{ fontSize: "13px" }}>Loading…</p>;
  else if (view === "history") {
    list = data.audit.length ? data.audit.map((a) => (
      <div key={"a" + a.id} style={ROW} data-audit={a.id}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <b style={{ fontSize: "14px" }}>{ACTION[a.action] || a.action}</b>
            {a.platform ? chip("", PLATFORM[a.platform] || a.platform) : null}
            {TONE[a.action] ? chip(TONE[a.action], a.to_status || a.action) : null}
          </div>
          <div style={META}>
            {[who(a), a.listing || (a.account ? "@" + a.account : ""), detail(a)].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ ...META, whiteSpace: "nowrap" }}>{when(a.created_at)}</div>
      </div>
    )) : <div className="ov-blank"><span className="ov-blank-i"><Icon name="history" /></span><b>No activity yet</b>
      <p>Every post your team creates, moves, cancels or publishes, and every account connected or disconnected, is recorded here
        automatically.</p></div>;
  } else {
    list = data.routing.length ? data.routing.map((r) => (
      <div key={"r" + r.id} style={ROW} data-route={r.id}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <b style={{ fontSize: "14px" }}>{r.listing || "A listing"}</b>
            {r.platform ? chip("", PLATFORM[r.platform] || r.platform) : null}
            {chip(r.decision === "queued" ? "ok" : "", r.decision === "queued" ? "Sent to Synapse channel" : "Not sent")}
          </div>
          <div style={META}>{r.reason}</div>
        </div>
        <div style={{ ...META, whiteSpace: "nowrap" }}>{when(r.created_at)}</div>
      </div>
    )) : <div className="ov-blank"><span className="ov-blank-i"><Icon name="share" /></span><b>Nothing routed yet</b>
      <p>When one of your listings is posted, Synapse decides which of its own channels should also carry it, by city, area, price
        and type. Each decision, and the reason for it, appears here.</p></div>;
  }

  return (
    <>
      <div className="eyebrow" data-agency-eyebrow="">Growth</div>
      <div className="h1">Activity</div>
      <p className="muted" style={{ fontSize: "14px", marginTop: "4px" }}>
        Who did what with your posts and accounts, and where Synapse sent your listings. Recorded automatically; nobody can edit it.
      </p>
      <div className="crm-tools" data-pane-filters="" style={{ marginTop: "18px" }}>
        <div className="crm-tools-l">
          <div className="seg" id="activityView">
            <button className={"seg-b" + (view === "history" ? " on" : "")} data-av="history" onClick={() => setView("history")}>History</button>
            <button className={"seg-b" + (view === "routing" ? " on" : "")} data-av="routing" onClick={() => setView("routing")}>Channel routing</button>
          </div>
        </div>
        <button className="seg-b" type="button" disabled={busy} onClick={load} data-activity-refresh="">{busy ? "Loading…" : "Refresh"}</button>
      </div>
      <div id="activityList">{list}</div>
    </>
  );
}
