import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";

export interface Referral {
  on: boolean; code: string; per_reward: number; into_next: number; months_per_reward: number; months_earned: number; counted: number; pending: number; listings_required: number;
  recent?: Array<{ name?: string | null; counted: boolean }>;
}

export async function fetchReferral(): Promise<Referral | null> {
  const aid = await agencyId();
  if (!aid) return null;
  const r = await supabase.rpc("referral_overview", { p_agency: aid });
  const d = r.data as Referral | null;
  return !r.error && d && d.on && d.code ? d : null;
}

export const referralLink = (code: string): string => `https://www.synapsecore.dev/?ref=${encodeURIComponent(code)}`;
export const monthsWord = (n: number): string => (n === 1 ? "one month" : `${n} months`);
/** How many more agencies until the next reward. */
export const toGo = (r: Pick<Referral, "per_reward" | "into_next">): number => Math.max(0, r.per_reward - r.into_next);

const KEY = "syn_ref";
const MAX_AGE = 30 * 864e5;
/** A code saved when someone arrived on a referral link, valid for 30 days. Anything unreadable or stale is discarded. */
export function pendingCode(raw: string | null, now = Date.now()): string | null {
  try {
    const v = JSON.parse(raw || "null") as { c?: string; t?: number } | null;
    return v && v.c && now - (v.t || 0) <= MAX_AGE ? v.c : null;
  } catch { return null; }
}

/**
 * The code a visitor arrived with, handed to the database once they have an agency. The database decides whether it counts; this only passes the code on
 * and then forgets it, unless the answer is "not yet" (no agency yet) or the network failed.
 */
export async function claimPendingReferral(): Promise<void> {
  let code: string | null = null;
  try { code = pendingCode(window.localStorage.getItem(KEY)); if (!code) { window.localStorage.removeItem(KEY); return; } } catch { return; }
  const r = await supabase.rpc("referral_claim", { p_code: code });
  if (r.error) return;
  const why = (r.data as { reason?: string } | null)?.reason;
  if (why !== "no_agency") { try { window.localStorage.removeItem(KEY); } catch { /* fine */ } }
}
