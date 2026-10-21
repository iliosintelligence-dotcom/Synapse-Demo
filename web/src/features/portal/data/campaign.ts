import { supabase } from "@/lib/supabase";
import { accessToken, callFunction } from "@/lib/functions";
import { agencyId } from "./agency";
import type { BrandRecord } from "./brand";
import { nairaShort } from "./leads";
import { loadForEdit } from "../listing-form/write";

/** Real platform limits, not decoration: these decide whether a caption is publishable. A wrong number here is a truncated caption or a rejected post at 2am. */
export interface PlatformSpec { label: string; captionMax: number; hashtagMax: number; needsTitle?: boolean; titleMax?: number }
export const PLATFORMS: Record<string, PlatformSpec> = {
  instagram: { label: "Instagram", captionMax: 2200, hashtagMax: 30 },
  tiktok: { label: "TikTok", captionMax: 2200, hashtagMax: 30 },
  youtube: { label: "YouTube Shorts", captionMax: 5000, hashtagMax: 15, needsTitle: true, titleMax: 100 },
  facebook: { label: "Facebook", captionMax: 63206, hashtagMax: 10 },
  // 240, not 280: room for the short link the server appends
  x: { label: "X", captionMax: 240, hashtagMax: 2 },
  whatsapp: { label: "WhatsApp Status", captionMax: 700, hashtagMax: 0 },
};
export const CHANNEL_ORDER = ["instagram", "tiktok", "youtube", "facebook", "whatsapp", "x"] as const;

/** queue_social_post mints a short link per post and appends it server-side, so a caption is measured against the limit minus this. A length, never a string: a client-side copy of the link would be a second, different link. */
export const LINK_RESERVE = 38;

export const ANGLE_LABEL: Record<string, string> = {
  space: "The space itself", location: "Where it is", value: "The money", trust: "What has been checked", fit: "Who it is for", moment: "Why now",
  cost: "What it really costs", amenity: "What it has", objection: "The honest worry", process: "What happens next", question: "A question", custom: "Custom",
};
/** narrative_angle values a draft may be filed under; anything else is filed as custom rather than guessed. */
const FILED_ANGLES = new Set(["trust", "value", "life", "scarcity", "question", "custom"]);
const CONTENT_TYPE: Record<string, string> = { instagram: "instagram_post", tiktok: "tiktok_script", youtube: "youtube_short", facebook: "facebook_post", whatsapp: "whatsapp_message", x: "x_post", telegram: "telegram_post" };

export interface AiResponse { captions?: Record<string, string>; angles?: Record<string, string>; hashtags?: string[]; note?: string; recommendedChannel?: string; error?: string }
export interface Variant { platform: string; angle: string; angleName: string; hook: string; body: string; caption: string; hashtags: string[]; title: string | null; issues: string[] }
export interface Facts { id: string; title: string; kind: string; area: string; city: string; bedrooms: number | null; priceShort: string }

export const signOff = (b: Partial<BrandRecord> | null): string => (b?.name?.trim() ? `\n\n- ${b.name.trim()}${b.tagline?.trim() ? ` · ${b.tagline.trim()}` : ""}` : "");

/** The facts a title is built from. The area is what the agent typed, else the city. */
export function factsOf(row: Record<string, unknown>): Facts {
  const hood = String(row.area_name ?? row.neighbourhood ?? "").trim();
  const rent = row.listing_type === "rent";
  return {
    id: row.id as string, title: String(row.title ?? ""), kind: String(row.property_type ?? "home"), area: hood ? hood.replace(/\s*\(.*\)$/, "") : String(row.city ?? ""), city: String(row.city ?? ""),
    bedrooms: row.bedrooms == null ? null : Number(row.bedrooms), priceShort: nairaShort(Number(row.price) || 0) + (rent ? "/yr" : ""),
  };
}

/** What stops a draft being publishable, in words a person can act on. Empty means it is. */
export function validate(v: Pick<Variant, "platform" | "caption" | "hashtags" | "title">): string[] {
  const spec = PLATFORMS[v.platform];
  if (!spec) return ["Unknown platform."];
  const out: string[] = [];
  if (v.caption.length > spec.captionMax - LINK_RESERVE) out.push(`Caption is ${v.caption.length} characters. ${spec.label} allows ${spec.captionMax}, and ${LINK_RESERVE} are held for the tracked link.`);
  if (spec.hashtagMax === 0 && v.hashtags.length) out.push(`${spec.label} does not use hashtags.`);
  if (v.hashtags.length > spec.hashtagMax) out.push(`${v.hashtags.length} hashtags. ${spec.label} allows ${spec.hashtagMax}.`);
  if (spec.needsTitle && !v.title) out.push(`${spec.label} needs a title.`);
  if (spec.needsTitle && v.title && spec.titleMax && v.title.length > spec.titleMax) out.push(`Title is over ${spec.titleMax} characters.`);
  return out;
}

/**
 * One social-generate response into drafts. The model returns hashtags per batch, not per channel, so they are appended under each platform's own cap
 * (WhatsApp Status takes none, Facebook far fewer than Instagram): the same thirty on every channel is how a good caption reads like spam.
 */
export function buildVariants(ai: AiResponse, facts: Facts, brand: Partial<BrandRecord> | null): Variant[] {
  const out: Variant[] = [];
  const tags = ai.hashtags ?? [];
  for (const [platform, raw] of Object.entries(ai.captions ?? {})) {
    const spec = PLATFORMS[platform];
    const text = String(raw ?? "").trim();
    if (!spec || !text) continue; // an unknown platform is never guessed at
    const useTags = spec.hashtagMax ? tags.slice(0, Math.min(spec.hashtagMax, 8)) : [];
    const caption = text + signOff(brand) + (useTags.length ? `\n\n${useTags.join(" ")}` : "");
    const key = ai.angles?.[platform] ?? "custom";
    const v = {
      platform, angle: key, angleName: ANGLE_LABEL[key] ?? key, hook: text.split("\n")[0], body: text.split("\n").slice(1).join("\n").trim(), caption, hashtags: useTags,
      title: spec.needsTitle ? `${facts.bedrooms ?? ""}-Bed ${facts.kind} in ${facts.area} · ${facts.priceShort}`.slice(0, spec.titleMax) : null,
    };
    out.push({ ...v, issues: validate(v) });
  }
  return out;
}

/** The six subjects rotate; remembering which a listing has spent means a second press moves to different ones instead of re-rolling the same. */
const ANGLE_KEY = "synapse_used_angles_v1";
function angleStore(): Record<string, string[]> { try { return JSON.parse(window.localStorage.getItem(ANGLE_KEY) || "{}"); } catch { return {}; } }
export const anglesUsed = (id: string): string[] => angleStore()[id] ?? [];
export function rememberAngles(id: string, angles: string[]): void {
  if (!id || !angles.length) return;
  try { const all = angleStore(); all[id] = [...new Set([...(all[id] ?? []), ...angles])]; window.localStorage.setItem(ANGLE_KEY, JSON.stringify(all)); } catch { /* rotation still works for this page view */ }
}

export interface CampaignListing { id: string; title: string; verified: boolean }
export async function fetchCampaignListings(): Promise<CampaignListing[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("properties").select("id, title, verification_status").eq("agency_id", aid).is("deleted_at", null).eq("is_active", true).order("created_at", { ascending: false }).limit(200);
  if (r.error) throw r.error;
  return ((r.data ?? []) as Array<{ id: string; title: string | null; verification_status: string | null }>).map((x) => ({ id: x.id, title: x.title || "Untitled listing", verified: x.verification_status === "verified" }));
}

/** The writer is given the WHOLE listing row (charges, amenities, title type), not a thin projection, or it has nothing true to write about. It resolves the caller to an agency from the session token, so the anon key is never enough. */
export async function generate(listingId: string, channels: string[], brand: Partial<BrandRecord> | null): Promise<{ ai: AiResponse; facts: Facts }> {
  const got = await loadForEdit(listingId);
  if (!got) throw new Error("That listing could not be opened.");
  const row = { ...got.row, neighbourhood: got.row.area_name ?? "", media: got.photos.map((url) => ({ url })) };
  const token = await accessToken();
  if (!token) throw new Error("Sign in again to generate captions.");
  const r = await callFunction<AiResponse>("social-generate", {
    property: row, channels, usedAngles: anglesUsed(listingId),
    brand: brand ? { name: brand.name || null, tagline: brand.tagline || null, voice: brand.brand_voice || null, handle: brand.social?.instagram || null } : null,
  }, { token });
  const ai = r.data;
  if (!r.ok || !ai || ai.error || !ai.captions) throw new Error(ai?.error || "The writer did not return anything usable.");
  rememberAngles(listingId, Object.values(ai.angles ?? {}));
  return { ai, facts: factsOf(row) };
}

/** One insert for the batch (a partial save is worse than none: you could not tell which half you were looking at). Each lands as a draft, awaiting a person's say-so. */
export async function saveGeneration(propertyId: string, variants: Variant[]): Promise<number> {
  const aid = await agencyId();
  if (!aid) return 0;
  const rows = variants.filter((v) => CONTENT_TYPE[v.platform]).map((v) => ({
    property_id: propertyId, agency_id: aid, content_type: CONTENT_TYPE[v.platform], narrative_angle: FILED_ANGLES.has(v.angle) ? v.angle : "custom",
    generated_text: v.caption, status: "draft", generated_by: "social-generate", generation_prompt_version: "angles-v2",
  }));
  if (!rows.length) return 0;
  const r = await supabase.from("generated_content").insert(rows);
  if (r.error) throw r.error;
  return rows.length;
}

export interface PastGen { id: string; platform: string; angle: string | null; text: string; status: string; createdAt: string }
const PLATFORM_OF: Record<string, string> = Object.fromEntries(Object.entries(CONTENT_TYPE).map(([p, c]) => [c, p]));
export async function listPast(propertyId: string): Promise<PastGen[]> {
  const r = await supabase.from("generated_content").select("id, content_type, narrative_angle, generated_text, status, created_at").eq("property_id", propertyId).is("deleted_at", null).order("created_at", { ascending: false }).limit(60);
  if (r.error) throw r.error;
  return ((r.data ?? []) as Array<Record<string, string>>).map((x) => ({ id: x.id, platform: PLATFORM_OF[x.content_type] ?? x.content_type, angle: x.narrative_angle ?? null, text: x.generated_text ?? "", status: x.status, createdAt: x.created_at }));
}
