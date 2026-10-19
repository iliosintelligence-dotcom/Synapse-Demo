import { supabase } from "@/lib/supabase";
import { shapeMatch, shapeRow } from "./shape";
import type { BrowseItem, FeedRow, TojuMatch } from "./types";

const FEED_SELECT =
  "id,title,city,state,listing_type,price_period,property_type,verification_status,price,bedrooms,bathrooms,area_sqm,trust_score,expires_at,listed_at,currency,area_name,latitude,longitude,deal_structure,build_stage,handover_date,build_progress_pct,payment_plan,deposit_pct,instalment_months,units_available,plot_count,plot_size_sqm,min_investment,property_media(url,display_order,media_type),neighbourhoods(name),agencies(name,logo_url,brand_color,brand_font,cac_number,cac_certificate_on_file)";

/** One slice of the live feed. Three slices keep the page balanced: verified homes, the rest, and shared rooms. */
async function slice(filter: (q: ReturnType<typeof base>) => ReturnType<typeof base>, limit: number): Promise<FeedRow[]> {
  const { data, error } = await filter(base()).order("listed_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data as unknown as FeedRow[]) ?? [];
}
const base = () => supabase.from("properties").select(FEED_SELECT).eq("status", "live").is("is_active", true);

/** Every live home, freshest first (so the feed spans many neighbourhoods instead of clustering the prime ones). Throws if any slice fails. */
export async function fetchFeed(): Promise<{ items: BrowseItem[]; total: number; verified: number }> {
  const [verified, rest, shared] = await Promise.all([
    slice((q) => q.neq("property_type", "shared").eq("verification_status", "verified"), 800),
    slice((q) => q.neq("property_type", "shared").neq("verification_status", "verified"), 300),
    slice((q) => q.eq("property_type", "shared"), 200),
  ]);
  const rows = [...verified, ...rest, ...shared];
  return { items: rows.map(shapeRow), total: rows.length, verified: rows.filter((r) => r.verification_status === "verified").length };
}

/** What this visitor's conversation with Tayo has matched so far. `criteria` is set once a real session exists. */
export async function fetchSessionMatches(visitorId: string): Promise<{ hasSession: boolean; items: BrowseItem[] }> {
  const { data, error } = await supabase.functions.invoke("toju-demo", { body: { action: "matches", visitorId } });
  if (error || !data) return { hasSession: false, items: [] };
  const matches: TojuMatch[] = Array.isArray(data.matches) ? data.matches : [];
  return { hasSession: !!data.criteria || matches.length > 0, items: matches.map(shapeMatch) };
}

/** Tayo's verdict on which of the picked homes is better for this visitor. */
export async function askVerdict(visitorId: string | null, items: BrowseItem[]): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("toju-demo", {
    body: {
      action: "compare",
      visitorId,
      items: items.map((l) => ({ id: l.id, title: l.title, price: l.priceN, deal: l.per ? "rent" : "sale", trustScore: l.score, area: l.loc })),
    },
  });
  return error ? null : (data?.verdict ?? null);
}
