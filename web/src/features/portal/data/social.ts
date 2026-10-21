import { supabase } from "@/lib/supabase";
import { addWatch } from "./statusOffer";
import { agencyId } from "./agency";
import { CHANNEL_LABEL } from "./marketing";

export const SCHEDULABLE = ["instagram", "facebook", "tiktok", "youtube", "whatsapp", "x", "telegram"] as const;
export const PLATFORM_OF_CONTENT: Record<string, string> = {
  instagram_post: "instagram", instagram_reel: "instagram", tiktok_script: "tiktok", youtube_short: "youtube", facebook_post: "facebook",
  whatsapp_message: "whatsapp", linkedin_post: "linkedin", x_post: "x", telegram_post: "telegram",
};

export type Stage = "review" | "scheduled" | "published" | "attention";
export const STAGE_INFO: Record<Stage, { label: string; who: string; empty: string }> = {
  review: { label: "Draft", who: "You review before publishing", empty: "Nothing to review" },
  scheduled: { label: "Scheduled", who: "Posts at the time you chose", empty: "Nothing scheduled" },
  published: { label: "Published", who: "Live, click-throughs counted", empty: "Nothing live yet" },
  attention: { label: "Needs attention", who: "Failed, or live and unclicked", empty: "All clear" },
};

export interface Draft { id: string; propertyId: string; platform: string; angle: string | null; text: string; createdAt: string }
export interface Post {
  id: string; propertyId: string; platform: string; status: string; scheduledAt: string | null; publishedAt: string | null; caption: string;
  failure: string | null; clicks: number; visits: number; leads: number; likes: number; comments: number; shares: number;
}
export interface Card { key: string; stage: Stage; kind: "draft" | "post"; id: string; propertyId: string; platform: string; text: string; when: string | null; post?: Post; failure?: string | null }

type Row = Record<string, unknown>;

export async function fetchStudio(): Promise<{ drafts: Draft[]; posts: Post[] }> {
  const aid = await agencyId();
  if (!aid) return { drafts: [], posts: [] };
  const [d, p, st] = await Promise.all([
    supabase.from("generated_content").select("id, property_id, content_type, narrative_angle, generated_text, status, created_at").eq("agency_id", aid).eq("status", "draft").is("deleted_at", null).order("created_at", { ascending: false }).limit(200),
    supabase.from("social_posts").select("id, property_id, platform, status, scheduled_at, published_at, caption, failure_reason, likes, comments, shares, twin_of").eq("agency_id", aid).is("deleted_at", null).order("scheduled_at", { ascending: true, nullsFirst: false }).limit(500),
    supabase.rpc("social_post_stats"),
  ]);
  if (d.error) throw d.error;
  if (p.error) throw p.error;
  const stats: Record<string, { clicks?: number; visits?: number; leads?: number }> = {};
  ((st.data ?? []) as Array<{ social_post_id?: string }>).forEach((r) => { if (r.social_post_id) stats[r.social_post_id] = r as never; });
  const n = (v: unknown) => Number(v) || 0;
  return {
    drafts: ((d.data ?? []) as Row[]).map((x) => ({ id: x.id as string, propertyId: x.property_id as string, platform: PLATFORM_OF_CONTENT[x.content_type as string] ?? "instagram", angle: (x.narrative_angle as string) ?? null, text: (x.generated_text as string) ?? "", createdAt: x.created_at as string })),
    posts: ((p.data ?? []) as Row[]).filter((x) => !x.twin_of).map((x) => {
      const s = stats[x.id as string] ?? {};
      return { id: x.id as string, propertyId: x.property_id as string, platform: x.platform as string, status: x.status as string, scheduledAt: (x.scheduled_at as string) ?? null, publishedAt: (x.published_at as string) ?? null, caption: (x.caption as string) ?? "", failure: (x.failure_reason as string) ?? null, clicks: n(s.clicks), visits: n(s.visits), leads: n(s.leads), likes: n(x.likes), comments: n(x.comments), shares: n(x.shares) };
    }),
  };
}

/** Where a post sits. A published post nobody has tapped after two days is flagged: a post that went out and earned nothing deserves a second look. */
export function stageOfPost(p: Post, now = Date.now()): Stage {
  if (p.status === "failed") return "attention";
  if (p.status === "published") {
    const old = p.publishedAt ? now - new Date(p.publishedAt).getTime() > 2 * 864e5 : false;
    return old && p.clicks === 0 ? "attention" : "published";
  }
  return "scheduled";
}

export function buildCards(drafts: Draft[], posts: Post[], now = Date.now()): Card[] {
  const out: Card[] = drafts.map((d) => ({ key: `d${d.id}`, stage: "review", kind: "draft", id: d.id, propertyId: d.propertyId, platform: d.platform, text: d.text, when: d.createdAt }));
  posts.forEach((p) => out.push({ key: `p${p.id}`, stage: stageOfPost(p, now), kind: "post", id: p.id, propertyId: p.propertyId, platform: p.platform, text: p.caption, when: p.publishedAt ?? p.scheduledAt, post: p, failure: p.failure }));
  return out;
}

/** The calendar: posts with a time, grouped by day, soonest first. */
export function groupByDay(cards: Card[]): Array<{ day: string; cards: Card[] }> {
  const by = new Map<string, Card[]>();
  cards.filter((c) => c.kind === "post" && c.when).sort((a, b) => new Date(a.when!).getTime() - new Date(b.when!).getTime()).forEach((c) => {
    const day = c.when!.slice(0, 10);
    by.set(day, [...(by.get(day) ?? []), c]);
  });
  return [...by.entries()].map(([day, list]) => ({ day, cards: list }));
}
export const platformName = (p: string): string => CHANNEL_LABEL[p] ?? p;

export async function saveDraftText(id: string, text: string): Promise<void> {
  const t = text.replace(/\s+$/, "");
  if (!t.trim()) throw new Error("A caption cannot be empty");
  const r = await supabase.from("generated_content").update({ generated_text: t }).eq("id", id).select("id");
  if (r.error) throw r.error;
  if (!r.data?.length) throw new Error("That caption could not be changed. It may already have been approved or removed.");
}
export async function discardDraft(id: string): Promise<void> {
  const r = await supabase.from("generated_content").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
  if (r.error) throw r.error;
}

/** Approve a draft and queue it for a platform and time. A scheduled post is a real post (not a rehearsal); its confirmation is that someone chose a time and pressed the button. */
export async function scheduleDraft(d: Draft, platform: string, at: Date, text: string): Promise<void> {
  if (!(SCHEDULABLE as readonly string[]).includes(platform)) throw new Error("Pick a channel to post on");
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() - 60000) throw new Error("Pick a time in the future");
  const me = (await supabase.auth.getUser()).data.user?.id ?? null;
  const q = await supabase.rpc("queue_social_post", {
    p_property_id: d.propertyId, p_platform: platform, p_social_account_id: null, p_caption: text, p_media_urls: [], p_scheduled_at: at.toISOString(), p_dry_run: false, p_payload: d.angle ? { angle: d.angle } : null,
  });
  if (q.error) throw q.error;
  // remembered on this device, so the person who scheduled it is asked about WhatsApp Status once it is live
  addWatch(q.data as string, d.propertyId);
  // bookkeeping: link the post to its draft, then mark the draft scheduled; neither failing loses the post itself
  await supabase.from("social_posts").update({ content_id: d.id }).eq("id", q.data as string).then(() => null, () => null);
  await supabase.from("generated_content").update({ status: "scheduled", approved_by: me, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", d.id).then(() => null, () => null);
}

/** Puts a failed post back in the queue; resets attempts server-side because a failed post has spent them all. */
export async function retryPost(id: string): Promise<void> {
  const r = await supabase.rpc("retry_social_post", { p_post_id: id });
  if (r.error) throw r.error;
}
export async function discardPost(id: string): Promise<void> {
  const r = await supabase.rpc("discard_social_post", { p_post_id: id });
  if (r.error) throw r.error;
}
