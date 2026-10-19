import { supabase } from "@/lib/supabase";
import type { AgencyRole } from "../roles";

/**
 * Which agency am I? Membership is the authority, not a role string on the user. RLS on agency_members already restricts the select to
 * rows where profile_id is the caller, so an unprivileged read cannot enumerate other agencies.
 *
 * The request in flight is cached, not just the answer: on a cold load every part of the portal asks at once, and without this each asked
 * its own query and waited its own round trip (eleven identical GETs, 313 ms to 3.5 s). The first caller makes the request; the rest wait
 * on it. Cleared on settle, so a failure is retried instead of cached forever.
 */
let cached: string | null = null;
let inFlight: Promise<string | null> | null = null;

export function agencyId(force = false): Promise<string | null> {
  if (cached && !force) return Promise.resolve(cached);
  if (inFlight && !force) return inFlight;
  inFlight = Promise.resolve(supabase.from("agency_members").select("agency_id").is("deleted_at", null).limit(1))
    .then((r) => {
      if (r.error) throw r.error;
      cached = (r.data?.[0]?.agency_id as string | undefined) ?? null;
      return cached;
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Forget everything on sign-out, or the next person on this browser would inherit the last one's agency. */
export function forgetAgency(): void {
  cached = null;
  inFlight = null;
}

export async function myRole(): Promise<AgencyRole | null> {
  try {
    const { data } = await supabase.auth.getUser();
    const me = data.user?.id;
    const aid = await agencyId();
    if (!me || !aid) return null;
    const r = await supabase.from("agency_members").select("role").eq("agency_id", aid).eq("profile_id", me).maybeSingle();
    return (r.data?.role as AgencyRole | undefined) ?? null;
  } catch {
    return null;
  }
}

export interface AgencyHeader { id: string; name: string; verification_tier: string | null }

/** The agency's name and tier, for the sidebar. The plan is not a public column (a signed-in buyer could read every agency's plan); members get it from a function. */
export async function fetchAgencyHeader(): Promise<AgencyHeader | null> {
  const aid = await agencyId();
  if (!aid) return null;
  const r = await supabase.from("agencies").select("id,name,verification_tier").eq("id", aid).limit(1);
  if (r.error) throw r.error;
  return (r.data?.[0] as AgencyHeader | undefined) ?? null;
}

/**
 * "Appending 'verified' is a claim", so it is an allowlist, not the default. Only gold and basic are qualifiers that need the word
 * ("Gold verified"); every other tier already names its own state and is shown as itself, so a tier nobody has added yet can never be
 * dressed up as verified by accident. The star glyph marks a real badge, so an unverified agency does not get one.
 */
export function tierLabel(tier: string | null | undefined): string {
  const t = String(tier ?? "").toLowerCase();
  if (!t) return "";
  const word = t.charAt(0).toUpperCase() + t.slice(1);
  if (t === "gold" || t === "basic") return `✦ ${word} verified`;
  if (["unverified", "pending", "rejected", "none"].includes(t)) return word;
  return `✦ ${word}`;
}

export const initialsOf = (name: string): string => String(name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
