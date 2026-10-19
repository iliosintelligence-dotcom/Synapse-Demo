import type { PaneId } from "../roles";
import type { Lead } from "./leads";
import { freshness, type Listing } from "./listings";

export interface Notice { type: "verification" | "reminder" | "lead" | "social" | "setup"; tag: string; pane: PaneId; title: string; sub: string; group: "Getting started" | "Today" }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * What needs the agency's attention, derived from state, never stored: nothing here is an event someone could forget to clear. Each notice names the pane it is
 * about, because taking you to the thing is the only reason to show it at all.
 */
export function buildNotices(s: { listings: Listing[]; leads: Lead[]; drafts: number; accountCreatedAt?: string | null }, now = Date.now()): Notice[] {
  const out: Notice[] = [];
  const pending = s.listings.filter((l) => l.verification !== "verified");
  if (pending.length) out.push({ type: "verification", tag: "Verification", pane: "listings", group: "Today", title: `${plural(pending.length, "listing")} awaiting verification`, sub: pending.length === 1 ? pending[0].title : "Not yet checked by Synapse" });
  // `warn` is the flag for "about to go dark": warning only after expiry means buyers have already stopped seeing it
  const expiring = s.listings.filter((l) => freshness(l, now).warn);
  if (expiring.length) out.push({ type: "reminder", tag: "Reminder", pane: "listings", group: "Today", title: `${plural(expiring.length, "listing")} expiring soon`, sub: `Re-list to keep ${expiring.length === 1 ? "it" : "them"} visible to buyers` });
  const expired = s.listings.filter((l) => freshness(l, now).expired);
  if (expired.length) out.push({ type: "reminder", tag: "Reminder", pane: "listings", group: "Today", title: `${plural(expired.length, "listing")} expired`, sub: "Hidden from buyers until re-listed" });
  const fresh = s.leads.filter((l) => l.stage === "New");
  if (fresh.length) out.push({ type: "lead", tag: "Lead", pane: "crm", group: "Today", title: plural(fresh.length, "new lead"), sub: "Waiting on a first response" });
  if (s.drafts) out.push({ type: "social", tag: "Social", pane: "social", group: "Today", title: `${plural(s.drafts, "post")} awaiting approval`, sub: "In the social studio" });
  // only for the first month, and only once listings have answered, so it never claims "none" before it knows
  const young = s.accountCreatedAt ? now - new Date(s.accountCreatedAt).getTime() < 30 * 864e5 : false;
  if (young && !s.listings.length) out.unshift({ type: "setup", tag: "Getting started", pane: "listings", group: "Getting started", title: "Add your first listing", sub: "About three minutes: photos, price and a pin on the map. Tayo starts matching it to buyers once it is live." });
  return out;
}

/** A notice has no id of its own, so what identifies it is its text, which carries the count ("3 new leads"). It comes back only when the facts change (a fourth lead), not because the page re-rendered. */
export const noticeKey = (n: Notice): string => [n.type, n.pane, n.title, n.sub].join("|");

const SEEN_KEY = "syn-noti-handled";
export function readHandled(): Record<string, number> {
  try { return JSON.parse(window.localStorage.getItem(SEEN_KEY) || "{}") || {}; } catch { return {}; }
}
/** Newest two hundred only, so the list cannot grow for ever. */
export function markHandled(keys: string[], prev: Record<string, number>, now = Date.now()): Record<string, number> {
  const all = { ...prev };
  keys.forEach((k) => { if (k) all[k] = now; });
  const kept = Object.keys(all).sort((a, b) => all[b] - all[a]).slice(0, 200);
  const next: Record<string, number> = {};
  kept.forEach((k) => { next[k] = all[k]; });
  try { window.localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* private mode: handled for this visit only */ }
  return next;
}
export const unhandled = (all: Notice[], handled: Record<string, number>): Notice[] => all.filter((n) => !handled[noticeKey(n)]);
