import { supabase } from "@/lib/supabase";

export interface InviteResult { ok: boolean; reason?: string; agency_name?: string }

/** The database decides, and checks the invite belongs to THIS account's email address, so a forwarded link cannot let the wrong person in. */
export async function acceptInvite(token: string): Promise<InviteResult> {
  const r = await supabase.rpc("accept_agency_invite", { p_token: token });
  if (r.error) throw r.error;
  const row = (Array.isArray(r.data) ? r.data[0] : r.data) as InviteResult | null;
  return row ?? { ok: false, reason: "unknown" };
}

const WHY: Record<string, string> = {
  sign_in: "Sign in first, then open the invite link again.",
  wrong_account: "That invite was sent to a different email address.",
  invalid_or_expired: "That invite has expired or has already been used.",
  no_email: "This account has no email address on it.",
};
export const whyNot = (reason: string | undefined): string => WHY[reason ?? ""] ?? "That invite could not be used.";

/** The invite token in an address, if any. Tokens are long random strings; anything with odd characters is ignored rather than sent to the database. */
export function tokenFrom(search: string): string | null {
  const t = new URLSearchParams(search).get("invite");
  return t && /^[A-Za-z0-9_-]{8,200}$/.test(t) ? t : null;
}

/** The handoff across the reload: accepting makes the whole portal key to an agency this account did not belong to a second ago, so the page reloads and the profile opens, once, on the far side. */
const JOINED = "syn-just-joined";
export const markJoined = (): void => { try { window.sessionStorage.setItem(JOINED, "1"); } catch { /* the welcome is a nicety */ } };
export function takeJoined(): boolean {
  try { const v = window.sessionStorage.getItem(JOINED); window.sessionStorage.removeItem(JOINED); return !!v; } catch { return false; }
}
