/**
 * The person who has a buyer's message once they are introduced. A new lead is routed to the listing's agent
 * (leads_assign_listing_agent, 0064), so the face and first name shown to the buyer are the same person the lead reached.
 * A listing with no agent answers null and the buyer is told the agency has it. Both reads are public; no session needed.
 */
export type ListingAgent = { name: string; first: string; avatar: string | null };

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function rest(path: string): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = await fetch(URL_ + "/rest/v1/" + path, { headers: { apikey: KEY!, Authorization: "Bearer " + KEY } });
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

export async function listingAgentFor(propertyId: string): Promise<ListingAgent | null> {
  if (!propertyId || !URL_ || !KEY) return null;
  try {
    const [p] = await rest("properties?id=eq." + encodeURIComponent(propertyId) + "&select=listed_by_agent_id");
    if (!p || !p.listed_by_agent_id) return null;
    const [a] = await rest("listing_agent_cards?agent_id=eq." + encodeURIComponent(p.listed_by_agent_id) + "&select=full_name,avatar_url&limit=1");
    const name = String((a && a.full_name) || "").trim();
    if (!name) return null;
    return { name, first: name.split(/\s+/)[0], avatar: a.avatar_url || null };
  } catch { return null; }
}

export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
