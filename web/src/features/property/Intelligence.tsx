"use client";

import { useEffect, useState } from "react";
import { BAND_HOURS, CONDITION_LABEL, TITLE_LABEL } from "./labels";
import { SHOW_FLOOD_EVENT } from "./Nearby";
import { fetchFlood, type FloodRow } from "./queries";
import type { Property } from "./types";
import s from "./Property.module.css";

type Tone = "ok" | "mid" | "bad" | "na";

/** 1 (lowest) to 10. Inside the 10-year zone is the worst; inside the 100-year zone scales with depth; outside it, how close the nearest modelled flood water is. */
function floodScore(r: FloodRow | null): number | null {
  if (!r || r.covered === false) return null;
  if (r.in_zone_10) return 9;
  if (r.in_zone_100) {
    const d = Number(r.depth_100_m) || 0;
    return d >= 2 ? 8 : d >= 1 ? 7 : 6;
  }
  const n = r.nearest_flood_m;
  if (n == null) return 1;
  return n <= 300 ? 4 : n <= 1000 ? 3 : 2;
}

const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

function floodSentence(r: FloodRow): string {
  if (r.in_zone_100) return `Inside the modelled 100-year river flood zone, up to ${Number(r.depth_100_m).toFixed(1)} m deep${r.in_zone_10 ? ", and flooded in a 10-year event too" : ""}.`;
  if (r.nearest_flood_m != null && r.nearest_flood_m > 0) return `Modelled river flood water about ${km(r.nearest_flood_m)} away.`;
  return "No modelled river flooding within 3.5 km.";
}

const Chip = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => <span className={`${s.chip} ${s[`tone_${tone}`]}`}>{children}</span>;

function Row({ k, children, sub }: { k: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className={s.piRow}>
      <div className={s.piK}>{k}</div>
      <div className={s.piV}>{children}</div>
      {sub ? <div className={s.dim}>{sub}</div> : null}
    </div>
  );
}

/** What matters about a home in Nigeria beyond its price: electricity, flood, water, security, title and age. Anything the agency did not state says so. */
export function Intelligence({ p }: { p: Property }) {
  const [flood, setFlood] = useState<{ state: "loading" | "done"; row: FloodRow | null }>({ state: "loading", row: null });
  useEffect(() => {
    let live = true;
    fetchFlood(p.id).then((row) => live && setFlood({ state: "done", row })).catch(() => live && setFlood({ state: "done", row: null }));
    return () => { live = false; };
  }, [p.id]);

  const am = (p.amenities ?? []).map(String);
  const has = (re: RegExp) => am.filter((a) => re.test(a));
  const band = p.electricity_band && BAND_HOURS[p.electricity_band] ? p.electricity_band : null;
  const bandTone: Tone = band === "A" || band === "B" ? "ok" : band === "C" ? "mid" : "bad";
  const backup = has(/generator|inverter|solar|24\s*\/?\s*7\s*power/i);
  const meter = has(/prepaid|meter/i);
  const water = has(/borehole|water\s*(storage|supply|tank|treatment|well)|\bwell\b|tank/i);
  const security = has(/secur|gated|fenc|cctv|guard|gatehouse/i);

  const sc = floodScore(flood.row);
  const fTone: Tone = sc == null ? "na" : sc <= 3 ? "ok" : sc <= 6 ? "mid" : "bad";
  const fWord = sc == null ? "" : sc <= 3 ? "Low" : sc <= 6 ? "Moderate" : "High";

  const built = [
    p.year_built ? `Built ${p.year_built}` : "",
    p.property_condition ? (CONDITION_LABEL[p.property_condition] ?? "") : "",
    p.build_stage && p.build_stage !== "completed" ? ({ under_construction: "Under construction", not_started: "Not started" } as Record<string, string>)[p.build_stage] + (p.build_progress_pct != null ? ` (${p.build_progress_pct}%)` : "") : "",
  ].filter(Boolean);

  return (
    <section className={s.card}>
      <h2 className={s.lbl}>Property intelligence</h2>
      <Row k="Electricity" sub={[backup.join(", "), meter.length ? "Prepaid meter" : ""].filter(Boolean).join(" · ")}>
        {band ? <>Band {band} · {BAND_HOURS[band]} hours a day <Chip tone={bandTone}>{bandTone === "ok" ? "Reliable" : bandTone === "mid" ? "Fair" : "Limited"}</Chip></> : <>Band not stated <Chip tone="na">Ask the agency</Chip></>}
      </Row>
      <Row k="Flood risk" sub={flood.state !== "done" ? "Checking the flood model…" : flood.row && sc != null ? floodSentence(flood.row) : "Not assessed for this location."}>
        {sc == null ? "Not assessed" : <><span className={`${s.score} ${s[`tone_${fTone}`]}`} title="River flood risk, 1 (lowest) to 10. Source: JRC / Copernicus GloFAS flood model. Covers rivers, not drainage or coastal flooding.">{sc}</span> out of 10 <Chip tone={fTone}>{fWord}</Chip></>}
      </Row>
      {sc != null && p.latitude != null && (
        <button type="button" className={s.piBtn} onClick={() => window.dispatchEvent(new Event(SHOW_FLOOD_EVENT))}>View flood map</button>
      )}
      {water.length > 0 && <Row k="Water">{water.join(", ")}</Row>}
      {security.length > 0 && <Row k="Security">{security.join(", ")}</Row>}
      <Row k="Title">{p.title_type && TITLE_LABEL[p.title_type] ? TITLE_LABEL[p.title_type] : <>Not stated <Chip tone="na">Ask for the document</Chip></>}</Row>
      {built.length > 0 && <Row k="Building">{built.join(" · ")}</Row>}
    </section>
  );
}
