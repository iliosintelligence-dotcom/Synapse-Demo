import { supabase } from "@/lib/supabase";
import { accessToken, callFunction } from "@/lib/functions";
import { agencyId } from "../data/agency";
import { FRESH_DAYS } from "../data/listings";
import { geoLadder, type Form, type Payload } from "./schema";

/** The columns a save may write. Anything else in a payload is dropped, so a stray field can never reach the table. */
const WRITABLE = [
  "title", "description", "property_type", "listing_type", "price", "price_period", "move_in_cost", "service_charge", "agency_fee", "legal_fee",
  "address", "city", "state", "country", "latitude", "longitude", "area_name", "bedrooms", "bathrooms", "area_sqm", "amenities", "title_type", "yield_pct", "is_active",
  "toilets", "parking_spaces", "year_built", "furnished", "property_condition", "electricity_band",
  "deal_structure", "build_stage", "handover_date", "build_progress_pct", "payment_plan", "deposit_pct", "instalment_months", "units_available", "plot_count", "plot_size_sqm",
  "min_investment", "investment_term_months", "stated_return_pct",
] as const;

/** Keep only writable keys. The Area field is `neighbourhood` in the form and `area_name` in the table (neighbourhood_id is for curated zones only). */
export function scrub(data: Payload): Record<string, unknown> {
  const src: Record<string, unknown> = { ...data, area_name: data.neighbourhood.trim().slice(0, 120) };
  const out: Record<string, unknown> = {};
  for (const k of WRITABLE) if (k in src && src[k] !== undefined) out[k] = src[k] === "" ? null : src[k];
  // status follows is_active, so saving an inactive listing never republishes it
  if ("is_active" in out) out.status = out.is_active === false ? "draft" : "live";
  return out;
}

export const freshWindow = (now = Date.now()) => ({ listed_at: new Date(now).toISOString(), expires_at: new Date(now + FRESH_DAYS * 864e5).toISOString() });

const VIDEO_EXT = /\.(mp4|mov|m4v|qt)$/i;
export const mediaTypeFromUrl = (url: string): "video" | "image" => (VIDEO_EXT.test(String(url).split("#")[0].split("?")[0]) ? "video" : "image");

/** Photos are written new-first: the new rows go in, and only then are the old ones removed, so a refused insert never leaves a listing with no photos. */
async function writeMedia(propertyId: string, media: Payload["media"]) {
  const rows = media.filter((m) => m.url).map((m, i) => ({ property_id: propertyId, url: m.url, media_type: mediaTypeFromUrl(m.url), display_order: i }));
  const old = await supabase.from("property_media").select("id").eq("property_id", propertyId);
  if (old.error) throw old.error;
  if (rows.length) { const ins = await supabase.from("property_media").insert(rows); if (ins.error) throw ins.error; }
  const ids = (old.data ?? []).map((r) => r.id as string);
  if (ids.length) { const del = await supabase.from("property_media").delete().in("id", ids); if (del.error) throw del.error; }
}

export class PartialSave extends Error {
  constructor(what: string, public id: string) { super(`The ${what}, but its photos could not be saved. Open it from your listings and add the photos again.`); }
}

export async function createListing(data: Payload): Promise<string> {
  const aid = await agencyId();
  if (!aid) throw new Error("This account is not a member of any agency");
  const r = await supabase.from("properties").insert({ ...scrub(data), agency_id: aid, ...freshWindow() }).select("id").single();
  if (r.error) throw r.error;
  const id = r.data.id as string;
  try { await writeMedia(id, data.media); } catch { throw new PartialSave("listing was created", id); }
  return id;
}

export async function updateListing(id: string, data: Payload): Promise<void> {
  const r = await supabase.from("properties").update(scrub(data)).eq("id", id).select("id").single();
  if (r.error) throw r.error;
  try { await writeMedia(id, data.media); } catch { throw new PartialSave("changes were saved", id); }
}

/** The floor is a fact about the listing but a separate permission: an agent can save a listing and still be refused the floor, so it is its own call and its own message. */
export async function getFloor(propertyId: string): Promise<{ amount: number | null; active: boolean } | null> {
  const r = await supabase.from("listing_negotiation_authority").select("floor_amount, is_active").eq("property_id", propertyId).maybeSingle();
  if (r.error || !r.data) return null;
  return { amount: r.data.floor_amount == null ? null : Number(r.data.floor_amount), active: r.data.is_active !== false };
}
export async function setFloor(propertyId: string, amount: number, active: boolean): Promise<void> {
  const r = await supabase.rpc("set_negotiation_floor", { p_property_id: propertyId, p_amount: amount, p_active: active });
  if (r.error) throw new Error(r.error.message || "The floor could not be saved");
}

/** After a save with no pin, ask the server to place one from the address. The pin is a bonus; the listing is the work. */
export async function ensurePin(id: string, data: Pick<Payload, "latitude" | "longitude" | "address">): Promise<void> {
  if (data.latitude != null && data.longitude != null) return;
  if (!data.address) return;
  try { const token = await accessToken(); if (token) await callFunction("geocode-listings", { id }, { token }); } catch { /* ignore */ }
}

/** Address to coordinates, narrower to wider. Nominatim asks for no more than a request a second and we are guests, so the pause is paid only when a rung misses. */
export async function findPin(f: Pick<Form, "address" | "neighbourhood" | "city" | "state">, signal?: AbortSignal): Promise<{ lat: number; lng: number; how: "address" | "area" | "city" } | null> {
  for (const [i, rung] of geoLadder(f).entries()) {
    if (signal?.aborted) return null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q=${encodeURIComponent(rung.q)}`, { signal });
      const rows = res.ok ? ((await res.json()) as Array<{ lat?: string; lon?: string }>) : [];
      const hit = rows[0];
      if (hit?.lat != null && hit?.lon != null) return { lat: Number(hit.lat), lng: Number(hit.lon), how: rung.how };
    } catch { if (signal?.aborted) return null; }
    if (i < geoLadder(f).length - 1) await new Promise((r) => setTimeout(r, 1100));
  }
  return null;
}

export const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const PHOTO_MAX = 10 * 1024 * 1024, VIDEO_MAX = 100 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4", "video/quicktime": "mov" };

/** Names what IS accepted and what the file was, so a person knows which file to go and find. webm is left out on purpose: Meta will not ingest it. */
export function checkFile(file: { type: string; size: number }): string | null {
  const video = VIDEO_TYPES.includes(file.type);
  if (!video && !PHOTO_TYPES.includes(file.type)) return "Use a JPG, PNG, WEBP or AVIF photo, or an MP4 or MOV video";
  const cap = video ? VIDEO_MAX : PHOTO_MAX;
  if (file.size > cap) return `That ${video ? "video" : "photo"} is ${Math.ceil(file.size / 1048576)}MB. Keep it under ${Math.round(cap / 1048576)}MB`;
  return null;
}

/** 1600px on the long edge is about twice the largest view. Every failure path returns the original file, so this can make an upload smaller and cannot stop one working. */
async function shrink(file: File): Promise<File> {
  try {
    if (file.size < 400 * 1024 || typeof createImageBitmap !== "function") return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (!(scale < 1)) { bmp.close?.(); return file; }
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * scale); cv.height = Math.round(bmp.height * scale);
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch { return file; }
}

export async function uploadPhoto(file: File): Promise<string> {
  const bad = checkFile(file);
  if (bad) throw new Error(bad);
  const video = VIDEO_TYPES.includes(file.type);
  const f = video ? file : await shrink(file); // never shrink a video: a canvas yields one still frame
  const aid = await agencyId();
  if (!aid) throw new Error("This account is not a member of any agency");
  // the extension is load-bearing: it is what mediaTypeFromUrl and the publisher both read
  const path = `${aid}/${video ? "video-" : "photo-"}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[f.type] ?? "jpg"}`;
  const up = await supabase.storage.from("property-photos").upload(path, f, { cacheControl: "31536000", upsert: false, contentType: f.type });
  if (up.error) throw up.error;
  return supabase.storage.from("property-photos").getPublicUrl(path).data.publicUrl;
}

/** The listing as the form needs it: the row (exact address and pin, which the public columns generalise) and its photos in order. */
export async function loadForEdit(id: string): Promise<{ row: Record<string, unknown>; photos: string[] } | null> {
  const aid = await agencyId();
  if (!aid) return null;
  const r = await supabase.from("properties").select("*, property_media(url, display_order), neighbourhoods(name)").eq("id", id).eq("agency_id", aid).is("deleted_at", null).maybeSingle();
  if (r.error || !r.data) return null;
  const row = r.data as Record<string, unknown>;
  try {
    const ex = await supabase.rpc("agency_property_exact", { p_agency: aid });
    const mine = ((ex.data ?? []) as Array<{ property_id: string; address?: string | null; latitude?: number | null; longitude?: number | null }>).find((x) => x.property_id === id);
    if (mine) { if (mine.address != null) row.address = mine.address; if (mine.latitude != null) row.latitude = mine.latitude; if (mine.longitude != null) row.longitude = mine.longitude; }
  } catch { /* generalised values stand */ }
  const hood = Array.isArray(row.neighbourhoods) ? (row.neighbourhoods[0] as { name?: string } | undefined) : (row.neighbourhoods as { name?: string } | null);
  if (!row.area_name && hood?.name) row.area_name = hood.name;
  const photos = ((row.property_media as Array<{ url?: string; display_order?: number }>) ?? []).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)).map((m) => m.url ?? "").filter(Boolean);
  return { row, photos };
}

/** A draft lives on this device, one per agency, so closing the form never costs what was typed. */
const draftKey = (aid: string) => `synapse_listing_draft_v2:${aid}`;
export async function readDraft(): Promise<{ form: Form; at: number; step: number } | null> {
  try { const aid = await agencyId(); if (!aid) return null; const raw = window.localStorage.getItem(draftKey(aid)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export async function writeDraft(form: Form, step: number): Promise<void> {
  try { const aid = await agencyId(); if (aid) window.localStorage.setItem(draftKey(aid), JSON.stringify({ form, at: Date.now(), step })); } catch { /* storage full or blocked: the form still works */ }
}
export async function clearDraft(): Promise<void> {
  try { const aid = await agencyId(); if (aid) window.localStorage.removeItem(draftKey(aid)); } catch { /* nothing to clear */ }
}
