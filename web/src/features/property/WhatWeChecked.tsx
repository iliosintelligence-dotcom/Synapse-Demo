import { fmtDate } from "@/lib/format";
import { CHECK_LABEL } from "./labels";
import type { Property } from "./types";
import s from "./Property.module.css";

function availability(p: Property): { text: string; stale: boolean } {
  const conf = p.availability_confirmed_at;
  const expired = p.expires_at ? new Date(p.expires_at).getTime() < Date.now() : false;
  if (expired) return { text: `Not confirmed since ${conf ? fmtDate(conf) : "listing"}. Ask the agency before viewing`, stale: true };
  if (!conf) return { text: "Not confirmed yet", stale: true };
  const days = Math.floor((Date.now() - new Date(conf).getTime()) / 864e5);
  const when = days <= 0 ? "Confirmed today" : days === 1 ? "Confirmed yesterday" : `Confirmed ${days} days ago`;
  return { text: `${when} · ${fmtDate(conf)}`, stale: days > 21 };
}

/** What Synapse actually checked, and when the listing was last confirmed available. States what was done, never a guarantee. */
export function WhatWeChecked({ p }: { p: Property }) {
  const nodes = Array.isArray(p.verification_nodes) ? p.verification_nodes : [];
  const isV = p.verification_status === "verified";
  const score = p.trust_score == null ? null : Number(p.trust_score);
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const avail = availability(p);
  return (
    <section className={s.card}>
      <h2 className={s.lbl}>What we checked</h2>
      <div className={s.verifySummary}>
        <div className={s.verifyRing} style={{ background: nodes.length ? `conic-gradient(#15803d 0% ${pct}%, rgba(0,0,0,0.08) ${pct}% 100%)` : "rgba(0,0,0,0.06)" }}>
          <span>{nodes.length && score != null ? score : isV ? "✓" : "-"}</span>
        </div>
        <div>
          <b>{isV ? "Verified by Synapse" : nodes.length ? "What has been checked" : "Not yet verified"}</b>
          <p className={s.dim}>
            {nodes.length
              ? "Each line is a check Synapse runs. Anything not listed has not been looked at. This is what was done, not a guarantee."
              : isV
                ? `Synapse verified this listing${p.verified_at ? ` on ${fmtDate(p.verified_at)}` : ""}. The individual check results are not published yet.`
                : "Listed by the agency. Synapse has not run its checks on this home yet."}
          </p>
        </div>
      </div>
      {nodes.map((n, k) => {
        const ok = n.status === "passed";
        const label = n.label || n.name || (n.type ? CHECK_LABEL[n.type] : "") || String(n.type || "Check").replace(/_/g, " ");
        return (
          <div key={k} className={`${s.verifyRow} ${ok ? s.pass : n.status === "pending" ? s.pending : s.fail}`}>
            <span aria-hidden="true">{ok ? "✓" : "…"}</span>
            <span>{label}{ok ? "" : `, ${n.status || "not passed"}`}</span>
          </div>
        );
      })}
      <div className={s.avail}>
        <span>Availability</span>
        <span className={avail.stale ? s.stale : ""}>{avail.text}</span>
      </div>
    </section>
  );
}
