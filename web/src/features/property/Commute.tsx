"use client";

import { useEffect, useState } from "react";
import { destsFromOsm, destsFromSurvey, driveText, fmtDist, fmtMin, readMyPlaces, secondsFor, writeMyPlaces, type Dest, type MyPlace, type Slot } from "./commuteData";
import { fetchSurroundings } from "./queries";
import type { Property } from "./types";
import s from "./Property.module.css";

const SLOTS: Array<{ id: Slot; label: string }> = [{ id: "morning", label: "Morning" }, { id: "midday", label: "Midday" }, { id: "evening", label: "Evening" }];

type State = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; dests: Dest[]; source: "survey" | "osm" };

/**
 * How long it takes to get from this home to the places people actually go. Midday is the default because it is the closest thing to
 * "normally"; a page that opens on the worst hour is arguing rather than informing. The buyer can add their own places (work, church,
 * gym) with the minutes they know; those are labelled as theirs, never presented as measured.
 */
export function Commute({ p }: { p: Property }) {
  const [st, setSt] = useState<State>({ kind: "loading" });
  const [slot, setSlot] = useState<Slot>("midday");
  // Mounted only once the listing has loaded in the browser, so reading the device's storage here cannot mismatch the static HTML.
  const [mine, setMine] = useState<MyPlace[]>(() => readMyPlaces(p.id));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ place: "", min: "20" });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const stored = destsFromSurvey(await fetchSurroundings(p.id));
        if (stored.length) return live && setSt({ kind: "ready", dests: stored, source: "survey" });
        if (p.latitude == null || p.longitude == null) return live && setSt({ kind: "ready", dests: [], source: "osm" });
        const osm = await destsFromOsm(p.id, Number(p.latitude), Number(p.longitude));
        if (live) setSt({ kind: "ready", dests: osm, source: "osm" });
      } catch {
        if (live) setSt({ kind: "failed" });
      }
    })();
    return () => { live = false; };
  }, [p.id, p.latitude, p.longitude]);

  const save = (next: MyPlace[]) => { setMine(next); writeMyPlaces(p.id, next); };
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseInt(form.min, 10);
    if (!form.place.trim() || !Number.isFinite(min) || min < 1) return;
    save([...mine, { place: form.place.trim().slice(0, 40), min }]);
    setForm({ place: "", min: "20" });
    setAdding(false);
  };

  const dests = st.kind === "ready" ? st.dests : [];
  const measured = dests.some((d) => d.measured);
  const routed = dests.some((d) => d.sec != null);

  return (
    <section className={s.card}>
      <h2 className={s.lbl}>Commute intelligence</h2>
      <div className={s.catRow} role="group" aria-label="Time of day">
        {SLOTS.map((x) => (
          <button key={x.id} type="button" aria-pressed={slot === x.id} className={slot === x.id ? s.catOn : ""} onClick={() => setSlot(x.id)}>{x.label}</button>
        ))}
      </div>

      <div className={s.commute}>
        {st.kind === "loading" && <span className={s.cmtChip}>Looking up real places and drive times…</span>}
        {st.kind === "failed" && <span className={s.cmtChip}>Couldn’t reach the maps service just now</span>}
        {st.kind === "ready" && dests.length === 0 && <span className={s.cmtChip}>No major destinations mapped near this address yet</span>}
        {dests.map((d) => {
          const pick = secondsFor(d, slot);
          const metres = d.routeM ?? d.dm;
          return (
            <span key={d.type} className={s.cmtChip}>
              <span>{d.name}</span>
              <b>{pick.sec != null ? fmtMin(Math.round(pick.sec / 60)) : fmtDist(metres)}</b>
              {pick.sec == null && <span className={s.dim}>{driveText(metres)} drive</span>}
              {pick.sec != null && !pick.measured && <i title="Free-flow time; this hour was not measured">~</i>}
            </span>
          );
        })}
        {mine.map((m, i) => (
          <span key={`${m.place}-${i}`} className={s.cmtChip}>
            <span>{m.place}</span><b>{fmtMin(m.min)}</b><span className={s.dim}>yours</span>
            <button type="button" className={s.cmtRm} aria-label={`Remove ${m.place}`} onClick={() => save(mine.filter((_, k) => k !== i))}>×</button>
          </span>
        ))}
      </div>

      {adding ? (
        <form className={s.addForm} onSubmit={add}>
          <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Somewhere you go often (work, church, gym)" aria-label="Place" maxLength={40} autoFocus />
          <input value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} inputMode="numeric" aria-label="Minutes away at normal traffic" />
          <span className={s.dim}>min</span>
          <button type="submit" className={s.dockBtn}>Add</button>
          <button type="button" className={s.dockBtn} onClick={() => setAdding(false)}>Cancel</button>
        </form>
      ) : (
        <button type="button" className={s.piBtn} onClick={() => setAdding(true)}>+ add a place</button>
      )}

      {st.kind === "ready" && dests.length > 0 && (
        <p className={s.note}>
          {st.source === "survey"
            ? measured
              ? "Places and drive times from Synapse’s survey of this neighbourhood, measured for each time of day. A ~ marks a free-flow time where that hour was not measured."
              : "Places from Synapse’s survey of this neighbourhood. Drive times were not measured for this home, so these are distances with the drive estimated at Nigerian urban speeds, not live traffic."
            : routed
              ? "Places from OpenStreetMap, distances along the road network via OSRM. Driving times are estimated from distance at Nigerian urban speeds, not live traffic."
              : "Places from OpenStreetMap. Routing was unavailable, so these are straight-line distances and the times estimated from them are rougher still."}
        </p>
      )}
    </section>
  );
}
