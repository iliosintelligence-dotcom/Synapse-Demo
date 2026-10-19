"use client";

import { useEffect, useMemo, useState } from "react";
import { buildHandoffs, fetchLeads, type Handoff, type Rating } from "../data/leads";
import s from "./Negotiator.module.css";

const FILTERS: Array<["all" | Rating, string]> = [["all", "All"], ["High intent", "High intent"], ["Worth a call", "Worth a call"], ["Early", "Early"]];

/** Every lead, from any channel, is qualified, pitched and pre-negotiated by Tayo before it reaches a human. You inherit warm, ready buyers. */
export function NegotiatorPane() {
  const [list, setList] = useState<Handoff[] | null>(null);
  const [failed, setFailed] = useState("");
  const [filter, setFilter] = useState<"all" | Rating>("all");
  const [report, setReport] = useState<Handoff | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());

  useEffect(() => {
    let live = true;
    fetchLeads().then((l) => live && setList(buildHandoffs(l))).catch((e) => live && setFailed(e instanceof Error ? e.message : "please refresh"));
    return () => { live = false; };
  }, []);
  const shown = useMemo(() => (filter === "all" ? list ?? [] : (list ?? []).filter((h) => h.rating === filter)), [list, filter]);

  return (
    <>
      <p className={s.muted}>Every lead, from any channel, is qualified, pitched and pre-negotiated by Tayo before it reaches a human. You inherit warm, ready buyers.</p>
      <h2 className={s.h2}>Ready for handoff</h2>
      <div className={s.seg} role="group" aria-label="Filter by intent">
        {FILTERS.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
      </div>

      {failed ? <div className={s.blank}><b>Could not load handoffs</b><p className={s.muted}>{failed}</p></div>
        : !list ? <p className={s.muted} aria-busy="true">Loading…</p>
        : !list.length ? (
          <div className={s.blank}>
            <b>Nothing ready to close yet</b>
            <p className={s.muted}>Tayo hands a buyer over once it has qualified them and agreed a price. That happens on your live listings: once those are up and leads start arriving, finished negotiations land here with Tayo’s reasoning.</p>
            <a className={s.btn} href="#listings">Go to listings</a>
          </div>
        ) : !shown.length ? <div className={s.blank}><b>Nothing at that level yet</b><p className={s.muted}>No handoff is rated {filter.toLowerCase()} right now.</p></div>
        : (
          <div className={s.grid}>
            {shown.map((h) => (
              <article key={h.id} className={s.card} aria-label={`Tayo deal report: ${h.buyer}, ${h.property}, agreed ${h.agreed}`}>
                <div className={s.top}><span>Tayo Deal Report</span><span className={s.intent}>{h.rating}</span></div>
                <div><div className={s.nm}>{h.buyer}</div><div className={s.sub}>{h.property} · via {h.source}</div></div>
                <div className={s.price}>
                  <div><small>Listed</small><b>{h.listed}</b></div><span aria-hidden="true">→</span>
                  <div className={s.agreed}><small>Agreed</small><b>{h.agreed}</b></div>
                </div>
                <div className={s.sigs}>{h.signals.map((x) => <span key={x} className={s.sig}>{x}</span>)}</div>
                {h.advice && <div className={s.verdict}>✦ {h.advice}</div>}
                <div className={s.acts}>
                  <button type="button" className={s.primary} disabled={taken.has(h.id)} onClick={() => setTaken(new Set(taken).add(h.id))}>{taken.has(h.id) ? "✓ Taken over" : "Take over →"}</button>
                  <button type="button" className={s.ghost} onClick={() => setReport(h)}>View full report</button>
                </div>
              </article>
            ))}
          </div>
        )}

      {report && (
        <div className={s.scrim} onClick={() => setReport(null)}>
          <div className={s.dialog} role="dialog" aria-modal="true" aria-label="Tayo deal report" onClick={(e) => e.stopPropagation()}>
            <h3>{report.buyer}</h3>
            <div className={s.muted}>What Tayo worked out with this buyer before they made contact.</div>
            {report.advice && <div><div className={s.k}>Reasoning</div><p>{report.advice}</p></div>}
            {report.draft && <div><div className={s.k}>Message the buyer opened with</div><p>{report.draft}</p></div>}
            {!report.advice && !report.draft && <p className={s.muted}>No further detail was recorded for this negotiation.</p>}
            <button type="button" className={s.btn} onClick={() => setReport(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
