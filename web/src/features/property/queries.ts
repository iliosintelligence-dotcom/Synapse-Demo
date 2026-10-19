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
