/**
 * Everything Browse keeps on the visitor's own device. Keys match the static site so both read the same data during the migration.
 * Every read and write is guarded: private windows and blocked storage must never break the page.
 */
import type { BrowseItem, DealCat } from "./types";

const PREFS_KEY = "synapse_browse_prefs";
const VISIT_KEY = "synapse_last_visit";
const VIEWS_KEY = "synapse_recent_views";
const VIEWS_CAP = 8;

type Sort = "match" | "price" | "trust";
export interface Prefs { sort: Sort; deal: DealCat | "all"; verifiedOnly: boolean }
export const DEFAULT_PREFS: Prefs = { sort: "match", deal: "all", verifiedOnly: false };

const DEALS: DealCat[] = ["sale", "rent", "shared", "land", "offplan", "invest", "shortlet"];

export function readPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {};
    return {
      sort: ["match", "price", "trust"].includes(p.sort) ? p.sort : "match",
      deal: DEALS.includes(p.deal) ? p.deal : "all",
      verifiedOnly: p.verifiedOnly === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}
export function writePrefs(p: Prefs): void {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* not remembered this time */ }
}

/**
 * "New since your last visit". The baseline is read once and the clock reset at once, so the comparison is always against the
 * previous visit. A first visit has no baseline, so nothing is claimed.
 */
export function takeLastVisit(): number | null {
  try {
    const raw = localStorage.getItem(VISIT_KEY);
    const t = raw ? Date.parse(raw) : NaN;
    localStorage.setItem(VISIT_KEY, new Date().toISOString());
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

export interface ViewedHome { id: string; ttl: string; loc: string; priceN: number; per: boolean; at: number }

export function readViews(): ViewedHome[] {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEWS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((v: ViewedHome) => v && v.id) : [];
  } catch {
    return [];
  }
}
/** Only ever written at the moment of a real card tap, so the rail can never show a home this device did not open. */
export function recordView(l: BrowseItem): void {
  const next = readViews().filter((v) => v.id !== l.id);
  next.unshift({ id: l.id, ttl: l.title, loc: l.loc, priceN: l.priceN, per: l.per, at: Date.now() });
  try { localStorage.setItem(VIEWS_KEY, JSON.stringify(next.slice(0, VIEWS_CAP))); } catch { /* history not kept */ }
}
