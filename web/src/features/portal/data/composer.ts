import { accessToken, callFunction } from "@/lib/functions";
import { loadForEdit } from "../listing-form/write";
import { CHANNEL_LABEL } from "./marketing";
import type { BrandRecord } from "./brand";

export const COMPOSER_CHANNELS = ["instagram", "tiktok", "youtube", "facebook", "whatsapp", "x", "telegram"] as const;
/** X is posted on Synapse's own account for now; the enquiries still come to the agency, which the chip says where the choice is made. */
export const CHANNEL_NOTE: Record<string, string> = { x: "posted on Synapse’s X account; enquiries still come to you" };

/** Where each feed folds a caption behind "more". Only the first line of a caption is read by most people. */
const FOLD: Record<string, number> = { instagram: 125, facebook: 250, x: 200, telegram: 400, tiktok: 120, whatsapp: 300, youtube: 150 };

export interface ListingFacts { price?: number | null; neighbourhood?: string | null; city?: string | null }

/**
 * What a caption is missing, checked against the listing in front of it, which is the part a generic linter cannot do. WARNINGS, NEVER A BLOCK: an agent
 * posting without a price may know something the check does not ("on application" is a real answer in this market), and a linter that refuses is a linter
 * people route around. It only speaks when it knows: the price check runs only where the listing has a price, the area check only where it has an area.
 */
export function capWarnings(channel: string, text: string, l: ListingFacts): string[] {
  const t = String(text || "");
  if (!t.trim()) return [];
  const out: string[] = [];
  // digits are the reliable signal: "4.5m", "N4,500,000" and "4500000" are all somebody having said the number
  if (l.price && !/\d/.test(t)) out.push("No price in this one. “How much?” is the comment you will get.");
  const area = l.neighbourhood || l.city || "";
  if (area && !t.toLowerCase().includes(String(area).toLowerCase())) out.push(`Does not name ${area}. “3 bed, serviced” describes half of Lagos.`);
  const fold = FOLD[channel] ?? 200;
  if (t.length > fold * 3) out.push(`Long. ${CHANNEL_LABEL[channel] ?? channel} hides everything after about ${fold} characters behind “more”.`);
  const tags = (t.match(/#[\wÀ-ɏ]+/g) || []).length;
  // Instagram rejects the whole call over thirty rather than trimming, so this one is a real failure and not a matter of taste
  if (channel === "instagram" && tags > 30) out.push(`${tags} hashtags. Instagram refuses a post over 30.`);
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length > 24 && letters === letters.toUpperCase()) out.push("All capitals reads as an advert in a feed of photographs.");
  return out;
}

export const QUICK_REWRITES: Array<[string, string]> = [
  ["Shorter", "Make it shorter."], ["Longer", "Make it longer, with more of what the listing actually offers."], ["Warmer", "Make it warmer and more personal."], ["More formal", "Make it more formal."],
];

export interface PostListing { id: string; title: string; price: number | null; neighbourhood: string; city: string; verified: boolean }

/** Facts for the warnings, from the full row (the area the agent typed, else the city). */
export async function listingFacts(id: string): Promise<ListingFacts | null> {
  const got = await loadForEdit(id);
  if (!got) return null;
  const r = got.row;
  return { price: r.price == null ? null : Number(r.price), neighbourhood: (r.area_name as string) || null, city: (r.city as string) || null };
}

/** Rewrite one caption as asked, in words ("shorter", "lead with the service charge"). The brand block carries only what the agency actually wrote: an absent voice must not become an invented one. */
export async function reviseCaption(listingId: string, channel: string, caption: string, instruction: string, brand: Partial<BrandRecord> | null): Promise<string> {
  const text = instruction.trim();
  if (!text) throw new Error("Say what to change first, or tap one of the buttons.");
  if (!caption.trim()) throw new Error("There is no caption to change yet.");
  const got = await loadForEdit(listingId);
  const token = await accessToken();
  if (!token) throw new Error("Sign in again to rewrite this.");
  const property = got ? { ...got.row, neighbourhood: got.row.area_name ?? "", media: got.photos.map((url) => ({ url })) } : { id: listingId };
  const r = await callFunction<{ caption?: string; error?: string }>("social-generate", {
    property, channels: [channel],
    brand: brand ? { name: brand.name || null, tagline: brand.tagline || null, voice: brand.brand_voice || null, handle: brand.social?.instagram || null } : null,
    revise: { channel, caption, instruction: text },
  }, { token });
  if (!r.ok || r.data.error || typeof r.data.caption !== "string" || !r.data.caption.trim()) throw new Error(r.data.error || "Could not rewrite it just now. Please try again.");
  return r.data.caption;
}
