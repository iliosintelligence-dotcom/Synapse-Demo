import { supabase } from "@/lib/supabase";
import type { AgentCard, Property, SimilarHome } from "./types";

const PROPERTY_SELECT =
  "*,property_media(url,display_order,media_type),property_enrichment(toju_summary),agencies(name,verification_tier,logo_url,brand_color,brand_font,tagline,social,cac_number,cac_certificate_on_file)";

export async function fetchProperty(id: string): Promise<Property | null> {
  const { data, error } = await supabase.from("properties").select(PROPERTY_SELECT).eq("id", id).limit(1).maybeSingle();
  if (error) throw error;
  return (data as unknown as Property | null) ?? null;
}

export async function fetchSimilar(city: string, excludeId: string): Promise<SimilarHome[]> {
  const { data } = await supabase
    .from("properties")
    .select("id,title,price,verification_status,property_media(url,display_order,media_type)")
    .eq("city", city)
    .neq("id", excludeId)
    .eq("status", "live")
    .is("is_active", true)
    .is("deleted_at", null)
    .limit(3);
  return (data as unknown as SimilarHome[]) ?? [];
}

export async function fetchAgentCard(agentId: string): Promise<AgentCard | null> {
  const { data } = await supabase.from("listing_agent_cards").select("*").eq("agent_id", agentId).limit(1).maybeSingle();
  return (data as AgentCard | null) ?? null;
}

/** Introduced buyers (a lead on this home) get the exact address back. The server decides; this only asks. */
export async function fetchExactAddress(propertyId: string): Promise<string | null> {
  const { data } = await supabase.rpc("property_exact_for_me", { p_property: propertyId });
  const row = Array.isArray(data) ? data[0] : null;
  return row?.address ?? null;
}

/** Which channel (a social post, a short link) brought this visitor here. Never worth breaking a page view over. */
export function recordChannelTouch(propertyId: string, channel: string, post: string | null): void {
  try {
    let visitor = localStorage.getItem("toju_visitor_v1");
    if (!visitor && crypto.randomUUID) {
      visitor = crypto.randomUUID();
      localStorage.setItem("toju_visitor_v1", visitor);
    }
    if (!visitor) return;
    void supabase.rpc("record_channel_touch", { p_property_id: propertyId, p_channel: channel, p_session_id: visitor, p_post_id: post, p_kind: "visit" });
  } catch {
    /* storage blocked: no visitor id, no attribution */
  }
}

/* ── Reads for the extra cards: viewing booking, flood, nearby places, the opening offer ── */
/* Reads that belong to the property page's extra cards: viewing booking, flood, nearby places, the opening offer. */

export interface TourSlot { starts_at: string; capacity: number; taken: number; agent_name: string | null }
export interface BookResult { ok: boolean; reason?: string; taken?: number }

export async function fetchOpenSlots(propertyId: string, days = 21): Promise<TourSlot[]> {
  const { data, error } = await supabase.rpc("open_inspection_slots", { p_property_id: propertyId, p_days: days });
  if (error) throw error;
  return (data as TourSlot[]) ?? [];
}

/** Has Tayo qualified this buyer for this home? Needs a session; a signed-out visitor simply is not ready. */
export async function fetchInspectionReady(propertyId: string): Promise<boolean> {
  const { data } = await supabase.rpc("inspection_readiness", { p_property_id: propertyId });
  const row = Array.isArray(data) ? data[0] : data;
  return !!row?.ready;
}

export async function bookInspection(propertyId: string, startsAt: string): Promise<BookResult> {
  const { data, error } = await supabase.rpc("book_inspection", { p_property_id: propertyId, p_starts_at: startsAt });
  if (error) throw error;
  const res = Array.isArray(data) ? data[0] : data;
  return (res as BookResult) ?? { ok: false };
}

/** River flood data for a listing (JRC / Copernicus GloFAS). Read from the table; if it has not been measured yet, ask the function to. */
export interface FloodRow {
  property_id: string;
  measured?: boolean;
  covered?: boolean;
  in_zone_10?: boolean;
  in_zone_100?: boolean;
  depth_100_m?: number | null;
  nearest_flood_m?: number | null;
}
export async function fetchFlood(propertyId: string): Promise<FloodRow | null> {
  const { data } = await supabase.from("property_flood").select("*").eq("property_id", propertyId).limit(1).maybeSingle();
  const row = data as FloodRow | null;
  if (row && (row.measured || row.covered === false)) return row;
  const res = await supabase.functions.invoke("property-flood", { body: { property_id: propertyId } });
  const fresh = res.data as FloodRow | null;
  return fresh && fresh.property_id ? fresh : null;
}

export interface Place { name: string | null; category: string; lat: number | null; lon: number | null; distance_m: number | null; drive_text: string | null; drive_seconds: number | null }
export async function fetchSurroundings(propertyId: string): Promise<Place[]> {
  const { data } = await supabase.rpc("property_surroundings", { p_property_id: propertyId, p_limit: 1000 });
  return Array.isArray(data) ? (data as Place[]) : [];
}

export interface Offer { openingOffer: number | null; advice: string; draft: string }
/** Tayo works out an opening offer and a message to send. `property` is the row the page already holds. */
export async function fetchOpeningOffer(visitorId: string | null, property: Property): Promise<Offer> {
  const { data, error } = await supabase.functions.invoke("toju-demo", { body: { action: "negotiate", visitorId, property } });
  if (error || !data || data.error || (!data.openingOffer && !data.advice && !data.draft)) throw new Error("bad payload");
  return { openingOffer: typeof data.openingOffer === "number" ? data.openingOffer : null, advice: String(data.advice ?? ""), draft: String(data.draft ?? "") };
}

/** The flood DEPTH grid around the public pin: 90 m cells in 5 cm steps (uint8, base64), for drawing the flood map. */
export interface FloodGrid { depth_b64?: string; cols: number; rows: number; bbox: [number, number, number, number] }
export async function fetchFloodGrid(propertyId: string): Promise<FloodGrid | null> {
  const { data, error } = await supabase.functions.invoke("property-flood", { body: { property_id: propertyId, grid: true } });
  return error || !data?.depth_b64 ? null : (data as FloodGrid);
}
