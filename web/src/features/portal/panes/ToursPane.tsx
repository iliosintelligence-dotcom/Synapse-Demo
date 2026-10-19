"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { askReconfirm, cancelTour, confirmTour, dueSoon, fetchTours, filterTours, queueHandoffs, TOUR_STATUS, tourWhen, type Tour, type TourFilter } from "../data/tours";
import { useToast } from "../ui/Toast";
import s from "./Tours.module.css";

const FILTERS: Array<[TourFilter, string]> = [["all", "All"], ["open", "Needs confirming"], ["confirmed", "Confirmed"], ["cancelled", "Cancelled"]];
const reason = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const buyers = (n: number) => `${n} ${n === 1 ? "buyer" : "buyers"}`;
const REBOOK = "The viewing you booked has been cancelled, and we are sorry for the change. New times are open on the listing now, so you can pick one that suits you.";

/** One trip, several buyers. Tayo only ever offers times your agents have already cleared. */
export function ToursPane() {
  const toast = useToast();
  const [tours, setTours] = useState<Tour[] | null>(null);
  const [filter, setFilter] = useState<TourFilter>("all");
  const [busy, setBusy] = useState("");
  const [failed, setFailed] = useState("");

  const load = useCallback(async () => {
    try { setTours(await fetchTours()); setFailed(""); } catch (e) { setFailed(reason(e, "please refresh")); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const rows = useMemo(() => filterTours(tours ?? [], filter), [tours, filter]);

  const run = async (key: string, work: () => Promise<string>, failMsg: string) => {
    setBusy(key);
    try { toast(await work()); await load(); } catch (e) { toast(reason(e, failMsg), "error"); } finally { setBusy(""); }
  };

  if (failed) return <div className={s.blank}><b>Could not load tours</b><p className={s.muted}>{failed}</p></div>;
  if (!tours) return <p className={s.muted} aria-busy="true">Loading…</p>;

  return (
    <>
      <div className={s.sort} role="group" aria-label="Filter tours">
        {FILTERS.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
      </div>

      {!tours.length ? (
        <div className={s.blank}><b>No tours booked yet</b><p className={s.muted}>Set when an agent can show, and Tayo offers those times to buyers it has already qualified. Several buyers on one visit means one trip, not four.</p></div>
      ) : !rows.length ? (
        <div className={s.blank}><b>Nothing at that status</b><p className={s.muted}>No tour is {(TOUR_STATUS[filter] ?? filter).toLowerCase()} right now.</p></div>
      ) : (
        <div className={s.list}>
          {rows.map((t) => {
            const dead = t.status === "cancelled";
            return (
              <article key={t.id} className={`${s.card} ${dead ? s.dead : ""}`}>
                <div className={s.top}>
                  <div><div className={s.when}>{tourWhen(t.at)}</div><div className={s.what}>{t.property}{t.city ? ` · ${t.city}` : ""} · {t.agent}</div></div>
                  <span className={`${s.state} ${t.status === "confirmed" ? s.confirmed : dead ? s.cancelled : ""}`}>{TOUR_STATUS[t.status] ?? t.status}</span>
                </div>
                <div className={s.count}><b>{t.people.length}</b>{dead ? "had booked · this tour was cancelled" : `booked of ${t.capacity} · ${t.confirmed} confirmed`}</div>
                {t.people.length > 0 && <div className={s.people}>{t.people.map((p) => <span key={p.id} className={`${s.person} ${p.status === "confirmed" ? s.yes : ""}`}><i aria-hidden="true">{p.status === "confirmed" ? "✓" : "○"}</i>{p.name}</span>)}</div>}
                <div className={s.acts}>
                  {dead ? (
                    t.people.length > 0 && (
                      <button type="button" className={`${s.btn} ${s.solid}`} disabled={busy === `re${t.id}`} onClick={() => {
                        const ids = t.people.map((p) => p.leadId).filter((x): x is string => !!x);
                        if (!ids.length) { toast("These buyers have no lead to message on."); return; }
                        void run(`re${t.id}`, async () => `Queued for ${buyers(await queueHandoffs(ids, REBOOK))} in the outbox.`, "Could not queue that.");
                      }}>Invite {t.people.length} back to pick a new time</button>
                    )
                  ) : (
                    <>
                      {t.status === "open" && (
                        <button type="button" className={`${s.btn} ${s.solid}`} disabled={busy === `ok${t.id}`} onClick={() => void run(`ok${t.id}`, async () => { await confirmTour(t.id); return "Tour confirmed. Everyone booked in will be told."; }, "Could not confirm that.")}>{busy === `ok${t.id}` ? "Confirming…" : "Confirm this tour"}</button>
                      )}
                      {dueSoon(t.at) && (
                        <button type="button" className={s.btn} disabled={busy === `rc${t.id}`} onClick={() => void run(`rc${t.id}`, async () => { const n = await askReconfirm(t); return n ? `Asked ${buyers(n)} to reconfirm.` : "Everyone has already confirmed."; }, "Could not send that.")}>Ask everyone to reconfirm</button>
                      )}
                      <button type="button" className={s.btn} disabled={busy === `no${t.id}`} onClick={() => void run(`no${t.id}`, async () => { const r = await cancelTour(t.id); return `Tour cancelled. ${buyers(r.affected)} affected${r.leadsReset ? `, ${r.leadsReset} back in the pipeline` : ""}.`; }, "Could not cancel that.")}>Cancel</button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
