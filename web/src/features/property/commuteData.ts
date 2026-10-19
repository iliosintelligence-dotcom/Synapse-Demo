import type { Place } from "./queries";

/**
 * Commute intelligence, the data side.
 *
 * Two sources, best first:
 *  1. The stored survey of the neighbourhood (`property_surroundings`): real places with drive times MEASURED for the morning, midday
 *     and evening. Used whenever it exists.
 *  2. Otherwise OpenStreetMap (Overpass) for the places and OSRM for distances along the road network. Those times are ESTIMATES from
 *     distance at Nigerian urban speeds, never live traffic, and the card says so. A figure we could not get is shown as a distance, or
 *     not at all, never as a made-up number.
 */

export type Slot = "morning" | "midday" | "evening";

export interface Dest {
  name: string;
  type: string;
  /** Straight-line distance in metres. */
  dm: number;
  /** Distance along the road, when the router gave one. */
  routeM: number | null;
  /** Driving seconds the router gave for this place (free flow). */
  sec: number | null;
  /** Measured seconds per time of day (stored survey only). */
  slots: Partial<Record<Slot, number | null>>;
  measured: boolean;
  /** [lat, lng], for routing; only set on the OpenStreetMap path. */
  coord?: [number, number];
}

const WALK_KMH = 4.8;
const DRIVE_KMH_FAST = 26;
const DRIVE_KMH_SLOW = 16;

export const walkMins = (m: number) => Math.max(1, Math.round(m / 1000 / WALK_KMH * 60));

/** A range, not a point: the low end is a clear hour, the high end a bad one. A single number would invite someone to plan a viewing around a figure nobody measured. */
export function driveText(m: number): string {
  const km = m / 1000;
  const lo = Math.max(1, Math.round((km / DRIVE_KMH_FAST) * 60));
  const hi = Math.max(2, Math.round((km / DRIVE_KMH_SLOW) * 60));
  return lo === hi ? `about ${lo} min` : `${lo}–${hi} min`;
}

export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${Math.round(m)} min`);
export const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

/** The measurement for the chosen hour, or the free-flow one if that hour was never measured. Says which it used. */
export function secondsFor(d: Dest, slot: Slot): { sec: number | null; measured: boolean } {
  const s = d.slots[slot];
  if (s != null) return { sec: s, measured: true };
  if (d.sec != null) return { sec: d.sec, measured: false };
  return { sec: null, measured: false };
}

/* ── source 1: the stored survey ───────────────────────────────────────────── */

/** The kinds of place people commute to at city scale: not the corner shop, but the hospital, the university, the market, the bus station. */
const COMMUTE_KINDS: Record<string, string> = { university: "University", hospital: "Hospital", market: "Market", transit: "Bus station" };

export function destsFromSurvey(places: Place[]): Dest[] {
  const best = new Map<string, Dest>();
  for (const p of places) {
    const label = COMMUTE_KINDS[p.category];
    if (!label || !p.name || p.distance_m == null) continue; // an unnamed place tells you nothing: "Hospital, 14 min"
    const hasTime = p.drive_seconds != null || p.drive_seconds_midday != null;
    const cur = best.get(label);
    if (cur && (cur.measured || !hasTime) && cur.dm <= p.distance_m) continue;
    best.set(label, {
      name: p.name, type: label, dm: p.distance_m, routeM: null, sec: p.drive_seconds ?? null,
      slots: { morning: p.drive_seconds_morning ?? null, midday: p.drive_seconds_midday ?? null, evening: p.drive_seconds_evening ?? null },
      measured: hasTime,
    });
  }
  return [...best.values()].sort((a, b) => a.dm - b.dm).slice(0, 5);
}

/* ── source 2: OpenStreetMap + OSRM, with a month-long cache ────────────────── */

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.osm.ch/api/interpreter"];
const QUERY = (lat: number, lng: number) =>
  `[out:json][timeout:20];(node["amenity"="university"](around:14000,${lat},${lng});node["amenity"="hospital"](around:12000,${lat},${lng});` +
  `node["amenity"="marketplace"](around:12000,${lat},${lng});node["shop"="mall"](around:14000,${lat},${lng});` +
  `node["amenity"="bus_station"](around:14000,${lat},${lng});node["aeroway"="aerodrome"](around:40000,${lat},${lng}););out body 60;`;

const TTL = 30 * 24 * 60 * 60 * 1000;
const cacheKey = (id: string) => `synapse_commute_${id}`;

function typeOf(tags: Record<string, string>): string | null {
  if (tags.amenity === "university") return "University";
  if (tags.amenity === "hospital") return "Hospital";
  if (tags.amenity === "marketplace") return "Market";
  if (tags.shop === "mall") return "Shopping mall";
  if (tags.amenity === "bus_station") return "Bus station";
  if (tags.aeroway === "aerodrome") return "Airport";
  return null;
}

const haversine = (a: [number, number], b: [number, number]) => {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

async function timed(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

/** Overpass is free, public and often overloaded, so try each mirror; an empty answer from one mirror is treated as "it does not cover here". */
async function overpass(query: string): Promise<{ elements?: Array<{ lat?: number; lon?: number; tags?: Record<string, string> }> }> {
  let last: { elements?: never[] } = {};
  for (const url of OVERPASS) {
    try {
      const r = await timed(url, { method: "POST", body: `data=${encodeURIComponent(query)}` }, 15000);
      if (!r.ok) continue;
      const d = await r.json();
      if (Array.isArray(d.elements) && d.elements.length) return d;
      last = d;
    } catch { /* next mirror */ }
  }
  if (last.elements) return last;
  throw new Error("all overpass mirrors failed");
}

export async function destsFromOsm(propertyId: string, lat: number, lng: number): Promise<Dest[]> {
  try {
    const raw = JSON.parse(localStorage.getItem(cacheKey(propertyId)) || "null");
    if (raw && Date.now() - raw.at < TTL && Array.isArray(raw.d) && raw.d.length) return raw.d as Dest[];
  } catch { /* no cache */ }

  const data = await overpass(QUERY(lat, lng));
  const seen = new Set<string>();
  const out: Dest[] = [];
  for (const el of data.elements ?? []) {
    const t = typeOf(el.tags ?? {});
    const name = el.tags?.name;
    if (!t || !name || el.lat == null || el.lon == null || seen.has(t)) continue; // one of each kind, the nearest
    seen.add(t);
    out.push({ name, type: t, dm: haversine([lat, lng], [el.lat, el.lon]), routeM: null, sec: null, slots: {}, measured: false, coord: [el.lat, el.lon] });
  }
  out.sort((a, b) => a.dm - b.dm);
  const dests = out.slice(0, 5);
  if (!dests.length) return [];

  // One OSRM table call: the road distance and duration from the home to every place at once. If it fails, straight-line distances still stand.
  try {
    const coords = [`${lng},${lat}`, ...dests.map((d) => `${d.coord![1]},${d.coord![0]}`)].join(";");
    const r = await timed(`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration,distance`, {}, 12000);
    if (r.ok) {
      const j = await r.json();
      dests.forEach((d, i) => {
        const sec = j?.durations?.[0]?.[i + 1];
        const m = j?.distances?.[0]?.[i + 1];
        d.sec = typeof sec === "number" && isFinite(sec) ? sec : null;
        d.routeM = typeof m === "number" && isFinite(m) ? m : null;
      });
    }
  } catch { /* distances only */ }

  try { localStorage.setItem(cacheKey(propertyId), JSON.stringify({ at: Date.now(), d: dests })); } catch { /* not cached */ }
  return dests;
}

/* ── the buyer's own places ─────────────────────────────────────────────────── */

export interface MyPlace { place: string; min: number }
const myKey = (id: string) => `synapse_places_${id}`;

export function readMyPlaces(id: string): MyPlace[] {
  try {
    const v = JSON.parse(localStorage.getItem(myKey(id)) || "[]");
    return Array.isArray(v) ? v.filter((p): p is MyPlace => p && typeof p.place === "string" && Number.isFinite(p.min)) : [];
  } catch {
    return [];
  }
}
export function writeMyPlaces(id: string, list: MyPlace[]): void {
  try { localStorage.setItem(myKey(id), JSON.stringify(list)); } catch { /* not kept */ }
}
