import { supabase } from "@/lib/supabase";
import { accessToken, callFunction } from "@/lib/functions";
import { agencyId } from "./agency";

/**
 * FOR NOW, NOBODY PAYS (Eden, 2026-10-16). Pressing Pay shows the free-pilot notice instead of opening Paystack, true because the paywall is
 * off in platform_settings. Set to false and the real checkout below runs again.
 */
export const FREE_PILOT = true;

export type PlanCode = "accelerator" | "market_leader";
export type Period = "monthly" | "annual";

export const TIER_NAME: Record<string, string> = { free: "Free", accelerator: "Accelerate", market_leader: "Leader", enterprise: "Enterprise" };
export const BUYABLE: Array<{ code: PlanCode; name: string; line: string }> = [
  { code: "accelerator", name: "Accelerate", line: "100 listings, 5 seats, every channel" },
  { code: "market_leader", name: "Leader", line: "Unlimited listings and seats, campaigns, proximity" },
];
export const ADDON_INFO: Record<string, { name: string; desc: string }> = {
  listing_pack: { name: "Extra Listing Pack", desc: "+25 active listings for a month, added the moment you pay." },
  social_boost: { name: "Social Reach Boost", desc: "Paid reach behind one listing on social. Never affects Tayo’s ranking." },
  verification_credits: { name: "Verification Credits", desc: "Your next listings go to the front of the verification desk." },
  campaign_boost: { name: "Campaign Boost", desc: "Extra reach behind a marketing campaign that’s working." },
  ai_credits: { name: "AI Marketing Credits", desc: "AI captions aren’t metered yet, so there is nothing to top up. On sale when they are." },
};

export interface BillingInfo {
  tier: string; period_end: string | null; annual_months_free: number; offer_joined_before: string | null; listings_max: number | null;
  auto_renew?: boolean; renew_period?: string; renew_failed_attempts?: number; renew_error?: string | null; card?: { brand?: string; last4?: string } | null;
  prices: { plans: Record<string, { monthly_kobo: number | string }>; addons: Record<string, { name: string; kobo: number | string; unit: string; on_sale?: boolean }> };
}
export interface Payment { created_at: string; kind: string; plan_tier: string | null; period: string | null; addon_code: string | null; amount_kobo: number; status: string }
export interface AddonHeld { addon_code: string; ends_at: string | null; applied_at: string | null }
export interface Billing { info: BillingInfo; pays: Payment[]; adds: AddonHeld[] }

/** The price is always the database's: billing_prices() is the same function the checkout charges, so the page cannot show one number and charge another. */
export function quote(info: BillingInfo, plan: PlanCode, period: Period): { amount: number; perMonth: number; unit: "year" | "month" } {
  const month = Number(info.prices.plans[plan].monthly_kobo);
  const free = Number(info.annual_months_free) || 0;
  return period === "annual" ? { amount: month * (12 - free), perMonth: (month * (12 - free)) / 12, unit: "year" } : { amount: month, perMonth: month, unit: "month" };
}
export const naira = (kobo: number | string): string => `₦${Math.round(Number(kobo) / 100).toLocaleString("en-NG")}`;
export const longDate = (iso: string): string => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
export const shortDate = (iso: string): string => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** A payment row's status chip: a pending one older than an hour is "not completed", not "waiting". */
export function paymentChip(status: string, createdAt: string, now = Date.now()): { label: string; tone: "paid" | "fail" | "wait" } {
  if (status === "success") return { label: "Paid", tone: "paid" };
  if (status === "failed") return { label: "Failed", tone: "fail" };
  return { label: now - new Date(createdAt).getTime() > 3600 * 1000 ? "Not completed" : "Waiting for Paystack", tone: "wait" };
}

export class BillingUnavailable extends Error {}

export async function fetchBilling(): Promise<Billing> {
  const aid = await agencyId();
  if (!aid) throw new Error("No agency for this account");
  const [b, pays, adds] = await Promise.all([
    supabase.rpc("agency_billing", { p_agency_id: aid }),
    supabase.from("subscription_payments").select("created_at, kind, plan_tier, period, months, addon_code, amount_kobo, status").eq("agency_id", aid).order("created_at", { ascending: false }).limit(50),
    supabase.from("agency_addons").select("addon_code, ends_at, applied_at, created_at").eq("agency_id", aid).order("created_at", { ascending: false }).limit(50),
  ]);
  if (b.error || !b.data) {
    // The database side ships as a migration; until it is applied the function does not exist. Say that, not "something went wrong".
    if (b.error && (b.error.code === "PGRST202" || /could not find the function/i.test(b.error.message || ""))) throw new BillingUnavailable("Billing is being switched on. Check back shortly.");
    throw new Error("Billing couldn’t load.");
  }
  return { info: b.data as BillingInfo, pays: (pays.data ?? []) as Payment[], adds: (adds.data ?? []) as AddonHeld[] };
}

export interface PlanUsage { tier: string; listings_used: number; listings_max: number | null; seats_used: number; seats_max: number | null }

/** Reads the same plan_limits() the triggers enforce, so the portal cannot promise headroom the insert will refuse. Null means "knows nothing, says nothing". */
export async function fetchUsage(): Promise<PlanUsage | null> {
  const aid = await agencyId();
  if (!aid) return null;
  const r = await supabase.rpc("agency_plan_usage", { p_agency_id: aid });
  const u = r.data as PlanUsage | null;
  return !r.error && u && u.tier ? u : null;
}

/** Opens Paystack's page. The key never touches the browser: the edge function holds it and prices the order. */
export async function startCheckout(what: { plan: PlanCode; period: Period } | { addon: string }): Promise<string> {
  const token = await accessToken();
  if (!token) throw new Error("Sign in again to pay.");
  const aid = await agencyId();
  const r = await callFunction<{ authorization_url?: string; error?: string }>("paystack-checkout", { action: "init", ...(aid ? { agencyId: aid } : {}), ...what }, { token });
  if (!r.ok || !r.data.authorization_url) throw new Error(r.data.error || "Could not start checkout. Please try again.");
  return r.data.authorization_url;
}

export async function setAutoRenew(on: boolean): Promise<void> {
  const aid = await agencyId();
  const r = await supabase.rpc("set_auto_renew", { p_agency_id: aid, p_on: on });
  if (r.error) throw new Error(r.error.message);
}
export async function removeCard(): Promise<void> {
  const aid = await agencyId();
  const r = await supabase.rpc("remove_billing_card", { p_agency_id: aid });
  if (r.error) throw new Error(r.error.message);
}

/** "3 of 20", never "3 of 0": a null ceiling is unlimited. */
export function usageRow(used: number, max: number | null): { label: string; pct: number | null; full: boolean } {
  if (max == null) return { label: "of unlimited", pct: null, full: false };
  return { label: `of ${max}`, pct: Math.min(100, Math.round((used / max) * 100)), full: used >= max };
}
