import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";

/**
 * The agency's own identity fields. `verification_tier`, `rating` and `closed_deals` are deliberately absent: they are platform-owned and the
 * database refuses them anyway (agencies_guard_tier). An agency describes itself here; it does not rate itself.
 */
export interface BrandRecord {
  name: string | null; tagline: string | null; description: string | null; specialties: string[] | string | null;
  logo_url: string | null; logo_dark_url: string | null; brand_color: string | null; brand_color_secondary: string | null; brand_font: string | null;
  brand_voice: string | null; whatsapp_number: string | null; city: string | null; social: { instagram?: string | null; website?: string | null } | null; cac_number: string | null;
}

const COLUMNS: Array<keyof BrandRecord> = [
  "name", "tagline", "description", "specialties", "logo_url", "logo_dark_url", "brand_color", "brand_color_secondary", "brand_font", "brand_voice", "whatsapp_number", "city", "social", "cac_number",
];

/** The form's values, as typed. Colours carry whether they were CHOSEN, never assumed from the page's own default swatch. */
export interface BrandForm {
  name: string; tagline: string; description: string; specialties: string[];
  logo: string; logoDark: string; color: string; color2: string; colorChosen: boolean; color2Chosen: boolean; font: string;
  voice: string; whatsapp: string; city: string; cac: string; instagram: string; website: string;
}

export const DEFAULT_COLOR = "#121212";
export const DEFAULT_COLOR2 = "#c76a1a";

export const emptyForm = (): BrandForm => ({
  name: "", tagline: "", description: "", specialties: [], logo: "", logoDark: "", color: DEFAULT_COLOR, color2: DEFAULT_COLOR2, colorChosen: false, color2Chosen: false,
  font: "", voice: "", whatsapp: "", city: "", cac: "", instagram: "", website: "",
});

const splitList = (v: string[] | string | null | undefined): string[] =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[|,;\n]+/)).map((x) => String(x).trim().replace(/\s+/g, " ")).filter(Boolean);

/** A record from the database becomes form values. A colour is "chosen" only if the record already held one. */
export function formFrom(b: Partial<BrandRecord> | null): BrandForm {
  const f = emptyForm();
  if (!b) return f;
  f.name = b.name ?? ""; f.tagline = b.tagline ?? ""; f.description = b.description ?? ""; f.specialties = splitList(b.specialties);
  f.logo = b.logo_url ?? ""; f.logoDark = b.logo_dark_url ?? "";
  if (b.brand_color) { f.color = b.brand_color; f.colorChosen = true; }
  if (b.brand_color_secondary) { f.color2 = b.brand_color_secondary; f.color2Chosen = true; }
  f.font = b.brand_font ?? ""; f.voice = b.brand_voice ?? ""; f.whatsapp = b.whatsapp_number ?? ""; f.city = b.city ?? ""; f.cac = b.cac_number ?? "";
  f.instagram = b.social?.instagram ?? ""; f.website = b.social?.website ?? "";
  return f;
}

/**
 * What is written. Colours the agency never actually chose are SKIPPED: sending the default would record a decision they did not make
 * and sign their posts with the page's own swatch. `social` is an object (empty when there are no handles), never null: a null
 * `social` once made it impossible for an agency without an Instagram or website to save its brand at all, not even its name.
 */
export function buildPatch(f: BrandForm): Partial<BrandRecord> {
  const t = (v: string) => v.trim();
  const patch: Partial<BrandRecord> = {
    name: t(f.name), tagline: t(f.tagline), description: t(f.description), logo_url: t(f.logo), logo_dark_url: t(f.logoDark), brand_font: t(f.font),
    brand_voice: t(f.voice), whatsapp_number: t(f.whatsapp), city: t(f.city), cac_number: t(f.cac), specialties: splitList(f.specialties),
  };
  if (f.colorChosen) patch.brand_color = f.color;
  if (f.color2Chosen) patch.brand_color_secondary = f.color2;
  const ig = t(f.instagram), web = t(f.website);
  patch.social = ig || web ? { instagram: ig || null, website: web || null } : {};
  return patch;
}

/** Nothing has been set: no name, copy, logo, voice or links, and no colour chosen. */
export const isBrandEmpty = (f: BrandForm): boolean =>
  !f.name.trim() && !f.tagline.trim() && !f.description.trim() && !f.logo.trim() && !f.logoDark.trim() && !f.voice.trim() && !f.website.trim() && !f.instagram.trim() && !f.whatsapp.trim() && !f.colorChosen;

/**
 * Three steps, each satisfied by REAL content rather than by clicking through, so an agency that skips still sees the checklist next time:
 * "done" is derived from the saved record, not from a flag saying they visited.
 */
export const ONBOARD_STEPS: Array<{ k: string; done: (b: Partial<BrandRecord>) => boolean }> = [
  { k: "Name yourself", done: (b) => !!(b.name ?? "").trim() },
  { k: "Add a logo or colours", done: (b) => !!((b.logo_url ?? "").trim() || (b.brand_color ?? "").trim()) },
  { k: "Describe your voice", done: (b) => !!(b.brand_voice ?? "").trim() },
];
export const isFirstRun = (b: Partial<BrandRecord>) => ONBOARD_STEPS.some((s) => !s.done(b));

/** The record shape that buildPatch's result and a saved record share, for deriving the checklist after a save. */
export const asRecord = (p: Partial<BrandRecord>): Partial<BrandRecord> => p;

/** Plain-language colour names: "Deep teal" rather than "#1F4E5F". Plain RGB distance is enough at this palette size. */
const SW_NAMES: Array<[string, string]> = [
  ["#000000", "Black"], ["#FFFFFF", "White"], ["#6E6E73", "Grey"], ["#B23B3B", "Red"], ["#C76A1A", "Burnt orange"], ["#FF8A2D", "Orange"], ["#E0B64A", "Gold"], ["#9C7A1E", "Ochre"],
  ["#2E7D4F", "Green"], ["#1F4E5F", "Deep teal"], ["#2F6DBD", "Blue"], ["#3B2F6E", "Indigo"], ["#6B3FA0", "Purple"], ["#A0446E", "Plum"], ["#121212", "Near black"],
];
export function swatchName(hex: string): string {
  const h = String(hex).replace("#", "");
  const to = (i: number) => parseInt(h.slice(i, i + 2), 16);
  const [r, g, b] = [to(0), to(2), to(4)];
  let best = "", bestD = Infinity;
  for (const [hx, name] of SW_NAMES) {
    const q = hx.replace("#", "");
    const d = (r - parseInt(q.slice(0, 2), 16)) ** 2 + (g - parseInt(q.slice(2, 4), 16)) ** 2 + (b - parseInt(q.slice(4, 6), 16)) ** 2;
    if (d < bestD) { bestD = d; best = name; }
  }
  // the exact hex is spoken as well: it is the only way to tell two near neighbours apart by ear
  return `${best} ${String(hex).toUpperCase()}`;
}

/** Spread across the hue wheel so the row reads as a choice rather than a shade of one idea. */
export const SWATCHES = ["#1F4E5F", "#2E7D4F", "#7A3E9D", "#B8860B", "#C2552B", "#1D4ED8", "#B91C4C", "#0F766E", "#334155", "#121212"];

/** One spelling for the common ones; typing still adds anything the list lacks. */
export const SPECIALTY_GROUPS: Array<{ g: string; items: string[] }> = [
  { g: "What you handle", items: ["Sales", "Lettings", "Short-lets", "Off-plan sales", "Land sales", "Property management", "Facility management", "Valuation", "Joint ventures"] },
  { g: "Property", items: ["Residential", "Luxury homes", "Affordable homes", "Serviced apartments", "Office space", "Shops and retail", "Warehouses and industrial", "Hotels and hospitality"] },
  { g: "Who you serve", items: ["First-time buyers", "Diaspora buyers", "Investors", "Corporate relocation", "Expatriates", "Landlords", "Developers"] },
  { g: "Paperwork and payment", items: ["Title verification", "C of O and Governor's consent", "Survey and documentation", "Mortgage advisory", "Instalment plans", "Rent-to-own"] },
];

/* ── the database ────────────────────────────────────────────────────────────── */

export async function loadBrand(): Promise<BrandRecord | null> {
  const aid = await agencyId();
  if (!aid) return null;
  const pub = COLUMNS.filter((k) => k !== "whatsapp_number");
  const r = await supabase.from("agencies").select(pub.join(",")).eq("id", aid).limit(1);
  if (r.error) throw r.error;
  const row = (r.data?.[0] as unknown as BrandRecord | undefined) ?? null;
  if (!row) return null;
  // whatsapp_number is private to the agency's members: it comes from agency_private()
  try {
    const pr = await supabase.rpc("agency_private", { p_agency: aid });
    row.whatsapp_number = (pr.data as { whatsapp_number?: string } | null)?.whatsapp_number ?? null;
  } catch {
    row.whatsapp_number = null;
  }
  return row;
}

export async function saveBrand(patch: Partial<BrandRecord>): Promise<void> {
  const aid = await agencyId();
  if (!aid) throw new Error("no-agency: this account is not a member of any agency");
  const row: Record<string, unknown> = {};
  for (const k of COLUMNS) {
    if (!(k in patch)) continue;
    const v = patch[k];
    row[k] = v === "" ? null : v;
  }
  const r = await supabase.from("agencies").update(row).eq("id", aid).select("id").single();
  if (r.error) throw r.error;
}

/**
 * Logo files live in the public `brand` bucket at brand/<agency_id>/<slot>-<timestamp>.<ext>. The agency-id folder is what the storage policies
 * check, so a member can only ever write inside their own folder. The timestamp matters: object storage is cached hard at the CDN, and
 * re-uploading to a fixed path would keep serving the old image, so each upload gets a fresh filename and the previous file is deleted.
 */
const BUCKET = "brand";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };

export function checkLogo(file: File | undefined): string | null {
  if (!file) return "No file selected";
  if (!LOGO_TYPES.includes(file.type)) return "Use a PNG, JPG, WEBP or SVG";
  if (file.size > LOGO_MAX_BYTES) return `That file is ${Math.ceil(file.size / 1024 / 1024)}MB. Keep a logo under 2MB`;
  return null;
}

export async function uploadBrandAsset(file: File, slot: "light" | "dark"): Promise<string> {
  const problem = checkLogo(file);
  if (problem) throw new Error(problem);
  const aid = await agencyId();
  if (!aid) throw new Error("no-agency: this account is not a member of any agency");
  const path = `${aid}/logo-${slot}-${Date.now()}.${EXT[file.type] ?? "png"}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (up.error) throw up.error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort: a storage hiccup must never stop the new logo being saved. A pasted URL that is not in our bucket is left alone. */
export async function removeBrandAsset(url: string): Promise<boolean> {
  if (!url) return false;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return false;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  try { await supabase.storage.from(BUCKET).remove([path]); return true; } catch { return false; }
}
