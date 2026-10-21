import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";
import { TITLE_LABEL, TYPE_LABEL } from "../listing-form/schema";

/**
 * Posting to channels nobody follows yet is publishing, not reach. The reach in Nigerian property is borrowed: an agent's WhatsApp Status and contacts, the
 * Facebook and Telegram housing groups they already sit in, and the sites buyers already search. Synapse cannot post to any of those, so the kit makes an
 * agent doing it take one tap: the photo, a caption written for where it is going, and a link that is THEIRS.
 *
 * WHATSAPP IS STILL NEVER SYNAPSE MESSAGING A BUYER: this is an agent sharing from their own phone, to their own contacts.
 */
export interface Dest { id: string; label: string; channel: string; form: "short" | "full"; how: string }
export const SHARE_DEST: Dest[] = [
  { id: "whatsapp", label: "WhatsApp", channel: "whatsapp_campaign", form: "short", how: "For your Status or your broadcast list. Save the photo, post it to your Status, and paste the caption with it." },
  { id: "facebook", label: "Facebook groups", channel: "facebook", form: "full", how: "Paste it into the property groups for this area that you belong to. Groups set their own rules; some only allow listings on certain days." },
  { id: "telegram", label: "Telegram groups", channel: "telegram", form: "full", how: "Paste it into the Telegram groups you are in. Housing groups for students and corps members move fast." },
  { id: "other", label: "Anywhere else", channel: "referral", form: "full", how: "Nairaland, X, an email to a client: wherever it goes, the link still says it was yours." },
];

export interface ShareListing {
  id: string; title: string; listing_type: string; property_type: string; bedrooms: number | null; bathrooms: number | null; toilets: number | null; price: number | null; price_period: string;
  service_charge: number | null; agency_fee: number | null; legal_fee: number | null; move_in_cost: number | null; neighbourhood: string; city: string; furnished: string | null; title_type: string | null; amenities: string[];
  photo: string | null;
}

const FURN: Record<string, string> = { unfurnished: "Unfurnished", semi: "Semi-furnished", fully: "Fully furnished" };
const VIDEO = /\.(mp4|mov|m4v|qt)(\?|#|$)/i;
const n = (v: unknown): number => Number(v) || 0;
const money = (v: unknown): string => `₦${n(v).toLocaleString("en-NG")}`;

/**
 * Built here, not by the model: it is instant, costs nothing, needs no plan, and every figure in it is the row's figure. The address is never used, only the
 * area and the city: a caption travels to strangers and somebody lives there.
 */
export function shareCaption(l: ShareListing, form: "short" | "full", link: string, agency?: string | null): string {
  const deal = l.listing_type === "rent" ? "FOR RENT" : l.listing_type === "shortlet" ? "SHORT-LET" : "FOR SALE";
  const beds = n(l.bedrooms);
  const roomy = beds > 0 && l.property_type !== "land" && l.property_type !== "commercial";
  const head = `${roomy ? `${beds}-BEDROOM ` : ""}${String(TYPE_LABEL[l.property_type] ?? "Property").toUpperCase()} ${deal}`;
  const where = [l.neighbourhood, l.city].map((x) => String(x || "").trim()).filter(Boolean).join(", ");
  const per = ({ per_year: "/year", per_month: "/month", per_night: "/night" } as Record<string, string>)[l.price_period] ?? "";
  const price = n(l.price) ? `${money(l.price)}${per}` : "";
  const charges = [n(l.service_charge) ? `Service charge ${money(l.service_charge)}` : "", n(l.agency_fee) ? `Agency fee ${money(l.agency_fee)}` : "", n(l.legal_fee) ? `Legal fee ${money(l.legal_fee)}` : ""].filter(Boolean);
  const amen = (l.amenities ?? []).slice(0, form === "short" ? 3 : 6);
  const out: string[] = [];
  if (form === "short") {
    // a Status is read in a glance: what, where, how much, what else it costs, and the link
    out.push(`🏡 ${head}`);
    if (where) out.push(`📍 ${where}`);
    if (price) out.push(`💰 ${price}`);
    if (charges.length) out.push(charges.join(" · "));
    if (amen.length) out.push(amen.join(" · "));
    out.push("", "Photos, every cost and inspection booking 👇", link);
    return out.join("\n");
  }
  // a group post carries the whole spec sheet: the form the market uses
  out.push(head);
  if (where) out.push(`📍 ${where}`);
  out.push("");
  const spec = [roomy ? `${beds} bedroom${beds === 1 ? "" : "s"}` : "", n(l.bathrooms) ? `${n(l.bathrooms)} bathroom${n(l.bathrooms) === 1 ? "" : "s"}` : "", n(l.toilets) ? `${n(l.toilets)} toilet${n(l.toilets) === 1 ? "" : "s"}` : ""].filter(Boolean);
  if (spec.length) out.push(`• ${spec.join(" · ")}`);
  if (l.furnished && FURN[l.furnished]) out.push(`• ${FURN[l.furnished]}`);
  amen.forEach((a) => out.push(`• ${a}`));
  if (l.listing_type === "sale" && l.title_type && TITLE_LABEL[l.title_type]) out.push(`• Title: ${TITLE_LABEL[l.title_type]}`);
  out.push("");
  if (price) out.push(`💰 ${l.listing_type === "rent" ? "Rent" : "Price"}: ${price}`);
  if (charges.length) out.push(`Other charges: ${charges.join(" · ")}`);
  if (l.listing_type === "rent" && n(l.move_in_cost)) out.push(`Total to move in: ${money(l.move_in_cost)}`);
  out.push("", "Full details, photos and inspection booking:", link);
  if (agency) out.push("", `- ${agency}`);
  return out.join("\n");
}

/** The photo for a Status: the first still image, preferring the copy that carries the agency's mark and the price, else the cover. Never a video: a Status caption rides on an image. */
export function sharePhoto(media: Array<{ url?: string | null; branded_url?: string | null; display_order?: number | null }>): string | null {
  const m = media.slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)).find((x) => x.url && !VIDEO.test(x.url));
  return m ? m.branded_url || m.url || null : null;
}

export async function loadShareListing(id: string): Promise<ShareListing | null> {
  const aid = await agencyId();
  if (!aid) return null;
  const r = await supabase.from("properties").select("id, title, listing_type, property_type, bedrooms, bathrooms, toilets, price, price_period, service_charge, agency_fee, legal_fee, move_in_cost, city, area_name, furnished, title_type, amenities, property_media(url, branded_url, display_order)").eq("id", id).eq("agency_id", aid).is("deleted_at", null).maybeSingle();
  if (r.error || !r.data) return null;
  const p = r.data as Record<string, unknown>;
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: p.id as string, title: (p.title as string) || "Listing", listing_type: (p.listing_type as string) || "sale", property_type: (p.property_type as string) || "apartment",
    bedrooms: num(p.bedrooms), bathrooms: num(p.bathrooms), toilets: num(p.toilets), price: num(p.price), price_period: (p.price_period as string) || "total",
    service_charge: num(p.service_charge), agency_fee: num(p.agency_fee), legal_fee: num(p.legal_fee), move_in_cost: num(p.move_in_cost), neighbourhood: (p.area_name as string) || "", city: (p.city as string) || "",
    furnished: (p.furnished as string) || null, title_type: (p.title_type as string) || null, amenities: Array.isArray(p.amenities) ? (p.amenities as string[]) : [],
    photo: sharePhoto((p.property_media as Array<{ url?: string | null; branded_url?: string | null; display_order?: number | null }>) ?? []),
  };
}

export interface ShareLink { url: string; token: string | null; plain?: boolean; why?: string }
/** This person's own tracked link for a listing on one channel: the same person, listing and channel always get the same token back, so opening the kit twice never scatters one agent's visits across two links. */
export async function makeLink(l: Pick<ShareListing, "id">, d: Dest): Promise<ShareLink> {
  try {
    const r = await supabase.rpc("create_short_link", { p_property_id: l.id, p_channel: d.channel });
    if (r.error) throw r.error;
    const row = (Array.isArray(r.data) ? r.data[0] : r.data) as { url?: string; token?: string } | null;
    if (!row?.url) throw new Error("No link came back");
    return { url: row.url, token: row.token ?? null };
  } catch (e) {
    // credits the channel but not the person: said, so nobody thinks it counts
    return { url: plainLink(l, d), token: null, plain: true, why: e instanceof Error ? e.message : "" };
  }
}
export const plainLink = (l: Pick<ShareListing, "id">, d: Dest): string => `https://www.synapsecore.dev/app/property.html?id=${encodeURIComponent(l.id)}&ch=${encodeURIComponent(d.channel)}`;
/** How many people (not preview bots) have opened one link. */
export async function linkOpens(token: string): Promise<number> {
  const r = await supabase.from("short_links").select("human_click_count").eq("token", token).maybeSingle();
  return r.error ? 0 : Number(r.data?.human_click_count) || 0;
}

/** After the link arrives: fill it into the caption where the placeholder was (or at the end), so a share still counts even if the person edited the text. */
export function placeLink(text: string, url: string): string {
  if (text.includes(url)) return text;
  return text.includes("…") ? text.replace("…", url) : `${text.replace(/\s*$/, "")}\n${url}`;
}

/** WhatsApp and most share targets take JPEG or PNG and uploads are stored as WebP, so anything else is redrawn as a JPEG before it leaves. If the redraw fails, the original still goes. */
export async function asJpeg(blob: Blob): Promise<Blob> {
  if (/jpe?g|png/i.test(blob.type || "") || typeof createImageBitmap !== "function") return blob;
  try {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas");
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); // no transparent corners turning black
    ctx.drawImage(bmp, 0, 0);
    return await new Promise<Blob>((res) => c.toBlob((j) => res(j || blob), "image/jpeg", 0.9));
  } catch { return blob; }
}
export async function fetchPhoto(url: string): Promise<Blob> {
  const r = await fetch(url, { mode: "cors" });
  if (!r.ok) throw new Error(`photo ${r.status}`);
  return asJpeg(await r.blob());
}
export function fileNameFor(title: string, type: string): string {
  const base = String(title || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "listing";
  return `${base}.${/png/.test(type) ? "png" : /webp/.test(type) ? "webp" : "jpg"}`;
}
