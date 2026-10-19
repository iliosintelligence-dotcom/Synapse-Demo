import { supabase } from "@/lib/supabase";

/**
 * Two tables, because the split is real: `profiles` is who you are on Synapse at all (name, phone, WhatsApp, face), `agent_profiles` is how you work (what you
 * cover, what you speak, how long you have done it). A buyer eventually reads the second. The closed-deal count, rating and reply rate are read-only and the
 * database refuses a write to them (agent_profiles_guard): that is what makes them worth anything to a buyer.
 */
export interface MyProfile {
  id: string; name: string; phone: string; whatsapp: string; avatar: string; bio: string; years: string; languages: string[]; specializations: string[]; areas: string[]; certifications: string[];
  closed: number | null; rating: number | null; responseRate: number | null;
}
export interface ProfileForm { name: string; phone: string; whatsapp: string; avatar: string; bio: string; years: string; languages: string; specializations: string; areas: string; certifications: string }

/** Comma-separated text to a clean list: trimmed, empties dropped. */
export const listOf = (v: string | string[]): string[] => (Array.isArray(v) ? v : String(v || "").split(",")).map((x) => String(x).trim()).filter(Boolean);
/** Years as the database takes them: a whole number from 0 to 70, else not stated. */
export const yearsOf = (v: string): number | null => { const y = Number.parseInt(v, 10); return Number.isFinite(y) && y >= 0 && y <= 70 ? y : null; };
export const initialsOf = (n: string): string => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
export const formOf = (m: MyProfile): ProfileForm => ({ name: m.name, phone: m.phone, whatsapp: m.whatsapp, avatar: m.avatar, bio: m.bio, years: m.years, languages: m.languages.join(", "), specializations: m.specializations.join(", "), areas: m.areas.join(", "), certifications: m.certifications.join(", ") });
/** A profile is "complete enough to appear as a colleague rather than a blank" with a name, a face and a line about how you work. Used to prompt, never to block. */
export const isComplete = (m: Pick<MyProfile, "name" | "avatar" | "bio">): boolean => !!(m.name && m.avatar && m.bio);

export async function fetchMyProfile(): Promise<MyProfile> {
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) throw new Error("Not signed in");
  const r = await supabase.from("profiles").select("id, full_name, phone, whatsapp, avatar_url, agent_profiles(bio, years_experience, languages, specializations, areas_covered, certifications, response_rate_pct, closed_deals, avg_rating)").eq("id", me).maybeSingle();
  if (r.error) throw r.error;
  const row = (r.data ?? {}) as Record<string, unknown>;
  let ap = (row.agent_profiles ?? {}) as Record<string, unknown> | Array<Record<string, unknown>>;
  if (Array.isArray(ap)) ap = ap[0] ?? {};
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: me, name: (row.full_name as string) || "", phone: (row.phone as string) || "", whatsapp: (row.whatsapp as string) || "", avatar: (row.avatar_url as string) || "",
    bio: (ap.bio as string) || "", years: ap.years_experience == null ? "" : String(ap.years_experience),
    languages: (ap.languages as string[]) || [], specializations: (ap.specializations as string[]) || [], areas: (ap.areas_covered as string[]) || [], certifications: (ap.certifications as string[]) || [],
    closed: n(ap.closed_deals), rating: n(ap.avg_rating), responseRate: n(ap.response_rate_pct),
  };
}

/** Both halves, written separately because they are governed separately: a failure on one is reported, never left half-saved in silence. */
export async function saveMyProfile(f: ProfileForm): Promise<void> {
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) throw new Error("Not signed in");
  const name = f.name.trim();
  // a name is the one field with no sensible empty state: it is what a colleague and a buyer both see first
  if (!name) throw new Error("Your name cannot be blank");
  const who = await supabase.from("profiles").update({ full_name: name, phone: f.phone.trim() || null, whatsapp: f.whatsapp.trim() || null, avatar_url: f.avatar.trim() || null, updated_at: new Date().toISOString() }).eq("id", me);
  if (who.error) throw who.error;
  // upsert: someone who has never opened this has no row at all, and making them save twice would be a bug they cannot see
  const work = await supabase.from("agent_profiles").upsert({
    profile_id: me, bio: f.bio.trim() || null, years_experience: yearsOf(f.years), languages: listOf(f.languages), specializations: listOf(f.specializations), areas_covered: listOf(f.areas), certifications: listOf(f.certifications),
  }, { onConflict: "profile_id" });
  if (work.error) throw work.error;
}

export const AVATAR_MAX = 3 * 1024 * 1024;
export const checkAvatar = (f: { type: string; size: number }): string | null =>
  !/^image\//.test(f.type || "") ? "That is not an image" : f.size > AVATAR_MAX ? `That photo is ${Math.ceil(f.size / 1048576)}MB. Keep it under 3MB` : null;

export async function uploadAvatar(file: File): Promise<string> {
  const bad = checkAvatar(file);
  if (bad) throw new Error(bad);
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) throw new Error("Not signed in");
  const ext = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[file.type] ?? "png";
  const path = `${me}/avatar-${Date.now()}.${ext}`;
  const up = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (up.error) throw up.error;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
