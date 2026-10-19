"use client";

import { useEffect, useMemo, useState } from "react";
import { SynapseMap, type ImageOverlay, type MapPin } from "@/components/map/SynapseMap";
import { FLOOD_LEGEND, floodImage } from "./floodImage";
import { fetchFloodGrid, fetchSurroundings, type FloodGrid, type Place } from "./queries";
import type { Property } from "./types";
import s from "./Property.module.css";

const LABEL: Record<string, string> = {
  school: "Schools", university: "Universities", hospital: "Health", pharmacy: "Pharmacies", transit: "Transport", bus_stop: "Bus stops",
  market: "Markets", supermarket: "Supermarkets", restaurant: "Restaurants", cafe: "Cafés", gym: "Gyms", bank: "Banks", park: "Parks",
  fuel: "Petrol stations", police: "Police", church: "Churches", mosque: "Mosques",
};

const dist = (m: number | null) => (m == null ? "" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

/** The event the intelligence card's "View flood map" button sends, so the two cards need not know about each other. */
export const SHOW_FLOOD_EVENT = "syn:show-flood-map";

type View = { mode: "places"; cat: string | null } | { mode: "flood" };

/**
 * What is around this home: the map with the home pinned, each kind of place (nearest few listed, all pinned) and the flood map.
 * Places come from the stored survey of the neighbourhood; the flood map is the JRC / Copernicus river model.
 */
export function Nearby({ p }: { p: Property }) {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [view, setView] = useState<View>({ mode: "places", cat: null });
  const [grid, setGrid] = useState<{ state: "idle" | "loading" | "ready" | "none"; data?: FloodGrid; url?: string }>({ state: "idle" });

  useEffect(() => {
    let live = true;
    fetchSurroundings(p.id).then((r) => live && setPlaces(r)).catch(() => live && setPlaces([]));
    return () => { live = false; };
  }, [p.id]);

  const groups = useMemo(() => {
    const m = new Map<string, Place[]>();
    for (const q of places ?? []) if (LABEL[q.category]) (m.get(q.category) ?? m.set(q.category, []).get(q.category)!).push(q);
    for (const list of m.values()) list.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [places]);

  const openFlood = useMemo(
    () => () => {
      setView({ mode: "flood" });
      setGrid((g) => {
        if (g.state !== "idle") return g;
        fetchFloodGrid(p.id)
          .then((data) => {
            const url = data ? floodImage(data) : null;
            setGrid(data && url ? { state: "ready", data, url } : { state: "none" });
          })
          .catch(() => setGrid({ state: "none" }));
        return { state: "loading" };
      });
    },
    [p.id],
  );

  useEffect(() => {
    const on = () => {
      openFlood();
      document.getElementById("nearby-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener(SHOW_FLOOD_EVENT, on);
    return () => window.removeEventListener(SHOW_FLOOD_EVENT, on);
  }, [openFlood]);

  const hasPin = p.latitude != null && p.longitude != null;
  const open = view.mode === "places" ? (view.cat ?? groups[0]?.[0] ?? null) : null;
  const shown = (groups.find(([c]) => c === open)?.[1] ?? []).slice(0, 8);

  const pins: MapPin[] = useMemo(() => {
    if (!hasPin) return [];
    const home: MapPin = { id: "home", lng: Number(p.longitude), lat: Number(p.latitude), kind: "home", title: p.title };
    if (view.mode === "flood") return [home];
    const list = (groups.find(([c]) => c === open)?.[1] ?? []).filter((q) => q.lat != null && q.lon != null).slice(0, 30);
    return [home, ...list.map((q, i): MapPin => ({ id: `${q.category}-${i}`, lng: Number(q.lon), lat: Number(q.lat), kind: "place", title: `${q.name ?? LABEL[q.category]}, ${dist(q.distance_m)}` }))];
  }, [hasPin, p.latitude, p.longitude, p.title, view.mode, groups, open]);

  const overlay: ImageOverlay | null = view.mode === "flood" && grid.state === "ready" && grid.data && grid.url ? { id: "flood", url: grid.url, bbox: grid.data.bbox, opacity: 0.95 } : null;

  if (places === null) return <section className={s.card} id="nearby-card"><h2 className={s.lbl}>What’s around this home</h2><p className={s.note}>Looking up what is around this address…</p></section>;
  if (!groups.length && !hasPin) return null;

  return (
    <section className={s.card} id="nearby-card">
      <h2 className={s.lbl}>What’s around this home</h2>
      {hasPin && (
        <SynapseMap
          center={[Number(p.longitude), Number(p.latitude)]}
          zoom={view.mode === "flood" ? 14 : 15}
          pins={pins}
          fit={view.mode === "places" && pins.length > 1}
          overlay={overlay}
          className={s.mapBox}
          label="Map of what is around this home"
        />
      )}
      <div className={s.catRow} role="tablist" aria-label="Kinds of place">
        {groups.map(([c, list]) => (
          <button key={c} type="button" role="tab" aria-selected={open === c} className={open === c ? s.catOn : ""} onClick={() => setView({ mode: "places", cat: c })}>{LABEL[c]} <i>{list.length}</i></button>
        ))}
        {hasPin && <button type="button" role="tab" aria-selected={view.mode === "flood"} className={view.mode === "flood" ? s.catOn : ""} onClick={openFlood}>Flood map</button>}
      </div>
      {view.mode === "flood" ? (
        <div className={s.legend}>
          {grid.state === "loading" && <span>Loading the flood map…</span>}
          {grid.state === "none" && <span>No modelled river flooding within 3.5 km of this home, or the flood map is not available here.</span>}
          {grid.state === "ready" && (
            <>
              {FLOOD_LEGEND.map((l) => <span key={l.text}><i style={{ background: l.color }} />{l.text}</span>)}
            </>
          )}
        </div>
      ) : (
        <ul className={s.placeList}>
          {shown.map((q, i) => (
            <li key={`${q.name}-${i}`}>
              <span>{q.name || LABEL[q.category]}</span>
              <span className={s.dim}>{dist(q.distance_m)}{q.drive_text ? ` · ${q.drive_text}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
