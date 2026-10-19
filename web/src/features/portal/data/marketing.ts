import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";

export interface PostRow { id: string; propertyId: string; platform: string; when: string | null; angle: string | null; clicks: number; visits: number; leads: number }
export interface Campaign { id: string; name: string; live: boolean; until: string | null }
export interface CampPerf { posts: number; published: number; clicks: number; visits: number; leads: number }
export interface Finding { tone: "good" | "todo"; text: string; note: string; listingId?: string }
export interface ListingRef { id: string; title: string; active: boolean }

export const CHANNEL_LABEL: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", youtube: "YouTube", whatsapp: "WhatsApp", x: "X", telegram: "Telegram" };
export const ANGLE_WORDS: Record<string, string> = {
  space: "the rooms and the space", location: "the area", value: "the price and the value", trust: "the checks and the paperwork", fit: "who the home suits", moment: "the timing", custom: "your own wording",
};

/** Published posts only, with the human clicks, listing visits and leads counted from the agency's own links (not estimated). */
export async function fetchPostRows(): Promise<PostRow[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const [p, st] = await Promise.all([
    supabase.from("social_posts").select("id, property_id, platform, status, published_at, payload").eq("agency_id", aid).is("deleted_at", null).eq("status", "published").limit(500),
    supabase.rpc("social_post_stats"),
  ]);
  if (p.error) throw p.error;
  const stats: Record<string, { clicks?: number; visits?: number; leads?: number }> = {};
  ((st.data ?? []) as Array<{ social_post_id?: string }>).forEach((r) => { if (r.social_post_id) stats[r.social_post_id] = r as never; });
  return ((p.data ?? []) as Array<Record<string, unknown>>).map((x) => {
    const s = stats[x.id as string] ?? {};
    const pay = (x.payload ?? {}) as { angle?: string; angleKey?: string };
    return { id: x.id as string, propertyId: x.property_id as string, platform: x.platform as string, when: (x.published_at as string) ?? null, angle: pay.angle ?? pay.angleKey ?? null, clicks: s.clicks ?? 0, visits: s.visits ?? 0, leads: s.leads ?? 0 };
  });
}

export async function fetchListingRefs(): Promise<ListingRef[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("properties").select("id, title, is_active").eq("agency_id", aid).is("deleted_at", null).limit(500);
  if (r.error) throw r.error;
  return ((r.data ?? []) as Array<{ id: string; title: string | null; is_active: boolean | null }>).map((x) => ({ id: x.id, title: x.title || "This listing", active: x.is_active !== false }));
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("campaigns").select("id, name, status, end_date").eq("agency_id", aid).is("deleted_at", null).order("created_at", { ascending: false });
  if (r.error) throw r.error;
  return ((r.data ?? []) as Array<{ id: string; name: string; status: string; end_date: string | null }>).map((c) => ({ id: c.id, name: c.name, live: c.status === "active", until: c.end_date }));
}

export async function fetchCampaignPerf(): Promise<Record<string, CampPerf>> {
  const r = await supabase.rpc("campaign_performance");
  if (r.error) throw r.error;
  const out: Record<string, CampPerf> = {};
  ((r.data ?? []) as Array<CampPerf & { campaign_id: string }>).forEach((x) => { out[x.campaign_id] = x; });
  return out;
}

export async function setCampaignLive(id: string, live: boolean): Promise<void> {
  const aid = await agencyId();
  if (!aid) throw new Error("No agency on this account");
  const r = await supabase.from("campaigns").update({ status: live ? "active" : "paused" }).eq("id", id).eq("agency_id", aid).is("deleted_at", null).select("id, status").maybeSingle();
  if (r.error) throw r.error;
  // RLS refuses by returning no rows rather than an error, so silence here would show a paused campaign that is still running.
  if (!r.data) throw new Error("You do not have permission to change this campaign");
}

/** A campaign starts empty and fills up when posts are scheduled into it. The end date defaults to a month out when missing or already past. */
export async function createCampaign(input: { name: string; endDate: string | null; channels: string[] }): Promise<string> {
  const aid = await agencyId();
  if (!aid) throw new Error("No agency on this account");
  const today = new Date();
  let end = input.endDate ? new Date(input.endDate) : new Date(today.getTime() + 30 * 864e5);
  if (Number.isNaN(end.getTime()) || end < today) end = new Date(today.getTime() + 30 * 864e5);
  const r = await supabase.from("campaigns").insert({
    agency_id: aid, name: input.name, campaign_type: "property_showcase", status: "active",
    start_date: today.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10), target_platforms: input.channels,
  }).select("id").maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) throw new Error("You do not have permission to create campaigns");
  return r.data.id as string;
}

export function sortRows(rows: PostRow[], by: "leads" | "clicks"): PostRow[] {
  // Taps break a tie on leads: two posts with one enquiry each are not equally good if one of them was tapped forty times.
  return [...rows].sort((x, y) => (by === "leads" ? y.leads - x.leads || y.clicks - x.clicks : y.clicks - x.clicks || y.leads - x.leads));
}

/**
 * The findings, at most three, in plain sentences. Every finding has a floor (two posts on an angle, two channels with traffic, a difference big
 * enough to not be noise); below it they say nothing, because confident panels reporting zero are what this page replaced.
 */
export function digestFindings(rows: PostRow[], listings: ListingRef[], now = Date.now()): Finding[] {
  const out: Finding[] = [];
  if (!rows.length) return out;

  const byAngle: Record<string, { n: number; leads: number }> = {};
  rows.forEach((r) => { if (r.angle) { const a = (byAngle[r.angle] ??= { n: 0, leads: 0 }); a.n++; a.leads += r.leads; } });
  // per post, not in total: three posts on one angle and one on another would otherwise crown whichever was used more often
  const angles = Object.keys(byAngle).filter((k) => byAngle[k].n >= 2).map((k) => ({ k, per: byAngle[k].leads / byAngle[k].n, n: byAngle[k].n })).sort((x, y) => y.per - x.per);
  if (angles.length >= 2 && angles[0].per > 0 && angles[0].per >= angles[angles.length - 1].per * 2) {
    const best = angles[0], worst = angles[angles.length - 1];
    out.push({ tone: "good", text: `Posts about ${ANGLE_WORDS[best.k] ?? best.k} bring the most enquiries: ${best.per.toFixed(1)} per post against ${worst.per.toFixed(1)} for ${ANGLE_WORDS[worst.k] ?? worst.k}.`, note: `Based on ${best.n} and ${byAngle[worst.k].n} posts.` });
  }

  const byCh: Record<string, { n: number; leads: number; clicks: number }> = {};
  rows.forEach((r) => { const c = (byCh[r.platform] ??= { n: 0, leads: 0, clicks: 0 }); c.n++; c.leads += r.leads; c.clicks += r.clicks; });
  const chans = Object.keys(byCh).filter((k) => byCh[k].n >= 2).sort((x, y) => byCh[y].leads - byCh[x].leads || byCh[y].clicks - byCh[x].clicks);
  if (chans.length >= 2 && (byCh[chans[0]].leads > 0 || byCh[chans[0]].clicks > 0)) {
    const top = chans[0], low = chans[chans.length - 1];
    out.push({ tone: "good", text: `${CHANNEL_LABEL[top] ?? top} is doing the work: ${byCh[top].leads} ${byCh[top].leads === 1 ? "enquiry" : "enquiries"} and ${byCh[top].clicks} taps from ${byCh[top].n} posts, against ${byCh[low].leads} from ${byCh[low].n} on ${CHANNEL_LABEL[low] ?? low}.`, note: "Every channel here is free, so this is only about where the effort goes." });
  }

  if (listings.length) {
    const last: Record<string, number> = {};
    rows.forEach((r) => { const t = r.when ? new Date(r.when).getTime() : 0; if (t > (last[r.propertyId] ?? 0)) last[r.propertyId] = t; });
    const cutoff = now - 14 * 864e5;
    // active listings only: an archived home not being posted is correct behaviour, and flagging it would train people to ignore this
    const stale = listings.filter((l) => l.active && (last[l.id] ?? 0) < cutoff);
    if (stale.length) {
      out.push({
        tone: "todo",
        text: stale.length === 1 ? `${stale[0].title} has not been posted in over two weeks.` : `${stale.length} listings have not been posted in over two weeks, starting with ${stale[0].title}.`,
        note: "A listing nobody has seen recently cannot produce an enquiry.", listingId: stale[0].id,
      });
    }
  }
  return out.slice(0, 3);
}
