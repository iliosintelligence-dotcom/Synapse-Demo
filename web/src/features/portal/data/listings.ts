import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";
import { nairaShort } from "./leads";

export const FRESH_DAYS = 21;
export const PERIOD_SUFFIX: Record<string, string> = { monthly: "/mo", yearly: "/yr", annual: "/yr", weekly: "/wk", daily: "/night", per_night: "/night" };

export type ListingState = "verified" | "pending" | "inactive";
export interface Listing {
  id: string; title: string; price: number; period: string; address: string; city: string; state: string; area: string;
  lat: number | null; lng: number | null; active: boolean; state_: ListingState; verification: string; passedChecks: number;
  expiresAt: string | null; listedAt: string | null; cover: string | null; photos: number; bedrooms: number | null; listingType: string;
}

export const VERIFICATION_CHECKS = ["Title deed", "Structural survey", "Flood assessment", "Legal search", "Ownership KYC", "Media validation", "Freshness"];

type Row = Record<string, unknown>;

export function mapListing(p: Row): Listing {
  const media = ((p.property_media as Array<{ url?: string; display_order?: number }>) ?? []).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const nodes = Array.isArray(p.verification_nodes) ? (p.verification_nodes as Array<{ status?: string }>) : [];
  const active = p.is_active !== false;
  const verification = (p.verification_status as string) || "unverified";
  const hood = Array.isArray(p.neighbourhoods) ? (p.neighbourhoods[0] as { name?: string } | undefined) : (p.neighbourhoods as { name?: string } | null);
  const typed = typeof p.area_name === "string" ? p.area_name.trim() : "";
  const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
  return {
    id: p.id as string, title: (p.title as string) || "Untitled listing", price: Number(p.price) || 0, period: (p.price_period as string) || "total",
    address: (p.address as string) || "", city: (p.city as string) || "", state: (p.state as string) || "", area: typed || hood?.name || "",
    lat: num(p.latitude), lng: num(p.longitude), active, state_: !active ? "inactive" : verification === "verified" ? "verified" : "pending", verification,
    passedChecks: nodes.filter((n) => n && n.status === "passed").length, expiresAt: (p.expires_at as string) ?? null, listedAt: (p.listed_at as string) ?? null,
    cover: media.find((m) => m.url)?.url ?? null, photos: media.filter((m) => m.url).length, bedrooms: num(p.bedrooms), listingType: (p.listing_type as string) || "sale",
  };
}

/** Scoped by agency_id explicitly, not left to RLS: permissive policies OR together, and the public policy matches every live listing on the platform. */
export async function fetchListings(): Promise<Listing[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("properties").select("*, property_media(url, display_order), neighbourhoods(name)").eq("agency_id", aid).is("deleted_at", null).order("created_at", { ascending: false });
  if (r.error) throw r.error;
  const rows = (r.data ?? []) as unknown as Row[];
  // the public columns hold a generalised address and a rounded pin; this agency's own members see the exact ones
  const exact: Record<string, { address?: string | null; latitude?: number | null; longitude?: number | null }> = {};
  try {
    const er = await supabase.rpc("agency_property_exact", { p_agency: aid });
    ((er.data ?? []) as Array<{ property_id: string }>).forEach((x) => { exact[x.property_id] = x as never; });
  } catch { /* generalised values stand */ }
  return rows.map((p) => {
    const ex = exact[p.id as string];
    if (ex) { if (ex.address != null) p.address = ex.address; if (ex.latitude != null) p.latitude = ex.latitude; if (ex.longitude != null) p.longitude = ex.longitude; }
    return mapListing(p);
  });
}

/** Days left on the listing, from expires_at (the clock Tayo gates buyers on), never from a second assumed one. */
export function freshness(l: Pick<Listing, "expiresAt" | "listedAt">, now = Date.now()): { cls: "ok" | "warn" | "dead"; label: string; left: number; expired: boolean; warn: boolean } {
  const left = l.expiresAt ? Math.ceil((new Date(l.expiresAt).getTime() - now) / 864e5)
    : l.listedAt ? FRESH_DAYS - Math.floor((now - new Date(l.listedAt).getTime()) / 864e5) : FRESH_DAYS;
  if (left <= 0) return { cls: "dead", label: "Expired · hidden from buyers", left, expired: true, warn: false };
  if (left <= 3) return { cls: "warn", label: `Expires in ${left} ${left === 1 ? "day" : "days"}`, left, expired: false, warn: true };
  return { cls: "ok", label: `${left} days left`, left, expired: false, warn: false };
}
export const needsRenewal = (rows: Listing[], now = Date.now()): Listing[] => rows.filter((l) => { const f = freshness(l, now); return f.warn || f.expired; });

/** "Ring Road, Ibadan, Oyo": the address the listing carries, each comma-separated piece once (agencies type the city into the address line). */
export function locationOf(l: Pick<Listing, "address" | "city" | "state">): string {
  const seen = new Set<string>(), out: string[] = [];
  [l.address, l.city, l.state].forEach((x) => String(x ?? "").split(",").forEach((seg) => {
    const v = seg.trim(), k = v.toLowerCase();
    if (v && !seen.has(k)) { seen.add(k); out.push(v); }
  }));
  return out.join(", ");
}

export type ListingFilter = "all" | "verified" | "pending" | "expiring";
export function filterListings(rows: Listing[], f: ListingFilter, q = "", now = Date.now()): Listing[] {
  let a = rows;
  if (q.trim()) { const s = q.trim().toLowerCase(); a = a.filter((l) => l.title.toLowerCase().includes(s) || locationOf(l).toLowerCase().includes(s)); }
  if (f === "verified") a = a.filter((l) => l.state_ === "verified");
  else if (f === "pending") a = a.filter((l) => l.state_ === "pending");
  else if (f === "expiring") a = a.filter((l) => { const x = freshness(l, now); return x.left > 0 && x.left <= 3; });
  return a;
}

export const priceLabel = (l: Pick<Listing, "price" | "period">): string => nairaShort(l.price) + (PERIOD_SUFFIX[l.period] ?? "");

/** Renewing asserts the home is still available: one server-side statement stamps the confirmation and moves expiry together. */
export async function relist(id: string, days = FRESH_DAYS): Promise<void> {
  const r = await supabase.rpc("reconfirm_listing", { p_property_id: id, p_days: days });
  if (r.error) throw r.error;
  if (!(Array.isArray(r.data) ? r.data[0] : r.data)) throw new Error("That listing could not be confirmed");
}

/** Renews each one separately (no bulk endpoint, no new privilege), so a partial failure leaves the rest renewed and the count reported is what actually worked. */
export async function relistAll(rows: Listing[]): Promise<{ done: number; requested: number }> {
  const results = await Promise.all(rows.map((l) => relist(l.id).then(() => true, () => false)));
  return { done: results.filter(Boolean).length, requested: rows.length };
}

export async function setListingActive(id: string, active: boolean): Promise<void> {
  const r = await supabase.from("properties").update({ is_active: active }).eq("id", id);
  if (r.error) throw r.error;
}

/** Soft delete: there is no DELETE policy on properties by design, and marking deleted_at keeps the leads and viewings that referenced it. */
export async function removeListing(id: string): Promise<void> {
  const r = await supabase.from("properties").update({ deleted_at: new Date().toISOString(), is_active: false, status: "archived" }).eq("id", id);
  if (r.error) throw r.error;
}
