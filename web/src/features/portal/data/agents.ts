import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";

export interface Teammate {
  id: string; name: string; role: string; joined: string | null; avatar: string | null;
  bio: string | null; years: number | null; areas: string[]; closed: number | null; followers: number | null; likes: number | null;
}
export interface Invite { id: string; email: string; role: string; token: string; expires_at: string }
export interface TeamMessage { id: string; body: string; at: string; mine: boolean }

const num = (v: unknown): number | null => (v == null ? null : Number(v));

/** The team, with public social counts. The counts come from a view (numbers public, people not) in a second request that may fail: then the card prints "-", never a zero it cannot back. */
export async function fetchRoster(): Promise<Teammate[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("agency_members")
    .select("profile_id, role, joined_at, profiles(full_name, avatar_url, agent_profiles(bio, years_experience, areas_covered, closed_deals))")
    .eq("agency_id", aid).is("deleted_at", null);
  if (r.error) throw r.error;
  const rows = (r.data ?? []) as unknown as Array<Record<string, unknown>>;
  const social: Record<string, { followers: unknown; likes: unknown }> = {};
  try {
    const sr = await supabase.from("agent_social_counts").select("agent_id, followers, likes").in("agent_id", rows.map((m) => m.profile_id as string));
    (sr.data ?? []).forEach((x) => { social[x.agent_id as string] = x; });
  } catch { /* degrade to dashes */ }
  return rows.map((m) => {
    const p = (m.profiles ?? {}) as Record<string, unknown>;
    let ap = (p.agent_profiles ?? {}) as Record<string, unknown> | Array<Record<string, unknown>>;
    if (Array.isArray(ap)) ap = ap[0] ?? {};
    const soc = social[m.profile_id as string];
    return {
      id: m.profile_id as string,
      name: (p.full_name as string) || "Unnamed teammate",
      role: m.role as string,
      joined: (m.joined_at as string) ?? null,
      avatar: (p.avatar_url as string) ?? null,
      bio: (ap.bio as string) || null,
      years: num(ap.years_experience),
      areas: (ap.areas_covered as string[]) ?? [],
      closed: num(ap.closed_deals),
      followers: soc ? num(soc.followers) : null,
      likes: soc ? num(soc.likes) : null,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** Open leads per agent: every lead that is not won (the fetch already leaves out lost). */
export async function fetchOpenLeadCounts(): Promise<Record<string, number>> {
  const aid = await agencyId();
  if (!aid) return {};
  const r = await supabase.from("leads").select("assigned_agent_id, current_stage").eq("agency_id", aid).is("deleted_at", null).neq("current_stage", "lost").limit(500);
  if (r.error) throw r.error;
  return countOpen((r.data ?? []) as Array<{ assigned_agent_id: string | null; current_stage: string }>);
}

export function countOpen(rows: Array<{ assigned_agent_id: string | null; current_stage: string }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of rows) {
    if (!l.assigned_agent_id || l.current_stage === "closed") continue;
    out[l.assigned_agent_id] = (out[l.assigned_agent_id] ?? 0) + 1;
  }
  return out;
}

/** At capacity from ten open leads, a rule the agency already knows. */
export const CAPACITY = 10;
export const statusOf = (open: number): "full" | "free" => (open >= CAPACITY ? "full" : "free");

export async function fetchInvites(): Promise<Invite[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("agency_invites").select("id, email, role, token, created_at, expires_at")
    .eq("agency_id", aid).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
  if (r.error) throw r.error;
  return (r.data ?? []) as Invite[];
}

export async function createInvite(email: string, role = "agent"): Promise<Invite> {
  const aid = await agencyId();
  if (!aid) throw new Error("No agency on this account");
  const me = (await supabase.auth.getUser()).data.user?.id;
  const r = await supabase.from("agency_invites").insert({ agency_id: aid, email: email.trim().toLowerCase(), role, invited_by: me }).select("id, email, role, token, expires_at").single();
  if (r.error) {
    if (String(r.error.message).includes("agency_invites_live_idx") || r.error.code === "23505") throw new Error("There is already a live invite for that address.");
    throw r.error;
  }
  return r.data as Invite;
}

export async function revokeInvite(id: string): Promise<void> {
  const r = await supabase.from("agency_invites").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (r.error) throw r.error;
}

/** The link opens the new portal, which accepts it (links already sent to the original portal still work there). */
export const inviteLink = (token: string): string => `${window.location.origin}/portal/?invite=${token}`;

export const validEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export async function fetchThread(agentId: string): Promise<TeamMessage[]> {
  const me = (await supabase.auth.getUser()).data.user?.id;
  const aid = await agencyId();
  if (!me) throw new Error("Not signed in");
  if (!aid) return [];
  const r = await supabase.from("team_messages").select("id, sender_id, recipient_id, body, created_at").eq("agency_id", aid)
    .or(`and(sender_id.eq.${me},recipient_id.eq.${agentId}),and(sender_id.eq.${agentId},recipient_id.eq.${me})`)
    .order("created_at", { ascending: true }).limit(200);
  if (r.error) throw r.error;
  return (r.data ?? []).map((m) => ({ id: m.id as string, body: m.body as string, at: m.created_at as string, mine: m.sender_id === me }));
}

export async function sendTeamMessage(agentId: string, body: string): Promise<TeamMessage> {
  const text = body.trim().slice(0, 4000);
  if (!text) throw new Error("Nothing to send");
  const me = (await supabase.auth.getUser()).data.user?.id;
  const aid = await agencyId();
  if (!me) throw new Error("Not signed in");
  if (!aid) throw new Error("No agency on this account");
  const r = await supabase.from("team_messages").insert({ agency_id: aid, sender_id: me, recipient_id: agentId, body: text }).select("id, body, created_at").single();
  if (r.error) throw r.error;
  return { id: r.data.id as string, body: r.data.body as string, at: r.data.created_at as string, mine: true };
}
