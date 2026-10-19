import { supabase } from "@/lib/supabase";

/**
 * The number Tayo hands a lead to. Leads are handed over on WhatsApp, so a lead assigned to someone with no number on file reaches nobody, and nothing else
 * in the product would ever say why. Normalised server-side (set_my_phone), with the same rule as signup, so a client never disagrees with it.
 */
export async function fetchMyPhone(): Promise<string | null> {
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) return null;
  const r = await supabase.from("profiles").select("phone").eq("id", me).maybeSingle();
  // null means we could not tell: an unknown is not a missing number, and a banner shown to someone who already gave one is noise
  return r.error ? null : String(r.data?.phone ?? "");
}

export async function saveMyPhone(phone: string): Promise<string> {
  const r = await supabase.rpc("set_my_phone", { p_phone: phone });
  if (r.error) throw new Error(r.error.message || "That number could not be saved");
  return String(r.data ?? phone);
}

/** Only an empty answer from a successful read means "missing". */
export const isMissing = (phone: string | null): boolean => phone !== null && phone.trim() === "";
