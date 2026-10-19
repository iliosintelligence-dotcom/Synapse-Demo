import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";

/** Stages as the pipeline folds them: nine database stages read as five on the board. */
export type Stage = "New" | "Contacted" | "Viewing" | "Negotiation" | "Won";
export const DB_STAGE: Record<string, Stage> = {
  new: "New", contacted: "Contacted", qualified: "Contacted", viewing_scheduled: "Viewing", viewing_completed: "Viewing",
  negotiating: "Negotiation", commitment: "Negotiation", closed: "Won",
};
export const DEFAULT_NEXT: Record<Stage, string> = {
  New: "Call within the hour", Contacted: "Qualify the budget", Viewing: "Confirm the viewing", Negotiation: "Send the offer", Won: "Close the paperwork",
};
const ATTR_CHANNEL: Record<string, string> = {
  instagram: "instagram", tiktok: "tiktok", facebook: "facebook", whatsapp_campaign: "whatsapp", proximity_alert: "proximity", ai_recommendation: "tayo",
  referral: "referral", website: "web", organic: "organic", direct_search: "direct", telegram: "telegram",
};
const SOURCE_CHANNEL: Record<string, string> = { social_instagram: "instagram", social_tiktok: "tiktok", social_facebook: "facebook" };
export const uiChannel = (c: string | null | undefined): string => ATTR_CHANNEL[c ?? ""] ?? "direct";

export interface Negotiation { offer?: number | null; advice?: string; draft?: string }
export interface Touch { channel: string; at: string | null; first: boolean; last: boolean }
export interface Lead {
  id: string; name: string; phone: string; stage: Stage; dbStage: string; ageLabel: string; score: number | null;
  temp: "won" | "hot" | "warm" | "cold" | "dormant"; failed: boolean; failReason: string | null; agentId: string | null; nextAction: string;
  property: string; listPrice: number | null; budgetMax: number | null; rawSource: string | null;
  channel: string; touches: Touch[]; unattributed: boolean; neg: Negotiation | null; createdAt: string; lastActivity: string | null;
}

/** ₦ with a decimal where it carries meaning: 800,000 is not "one million", and an ask of 1.45M and an agreed 1.32M must not read the same. */
export function nairaShort(n: number | null | undefined): string {
  if (n == null) return "-";
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  if (v >= 1e9) return `₦${+(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `₦${+(v / 1e6).toFixed(v % 1e6 ? 1 : 0)}M`;
  if (v >= 1e3) return `₦${Math.round(v / 1e3)}k`;
  return `₦${Math.round(v)}`;
}

export function agoLabel(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "-";
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

/** Temperature from real recency, not from a score we do not have. */
export function temperature(stage: Stage, stamp: string | null, now = Date.now()): Lead["temp"] {
  if (stage === "Won") return "won";
  const mins = stamp ? (now - new Date(stamp).getTime()) / 60000 : Infinity;
  return mins < 2880 ? "hot" : mins < 10080 ? "warm" : mins < 43200 ? "cold" : "dormant";
}

type Row = Record<string, unknown>;

export function mapLead(r: Row, now = Date.now()): Lead {
  const prop = (r.properties ?? {}) as { title?: string; city?: string; price?: number | null };
  const stage = DB_STAGE[r.current_stage as string] ?? "New";
  const stamp = ((r.last_activity_at ?? r.created_at) as string) ?? null;
  // the channel on the row is the LAST touch, the one that produced the lead; with no attribution row it falls back to the lead's source and says so
  const att = ((r.lead_attribution as Array<Row>) ?? []).slice().sort((a, b) => new Date((a.occurred_at as string) || 0).getTime() - new Date((b.occurred_at as string) || 0).getTime());
  const touches: Touch[] = att.map((t) => ({ channel: uiChannel(t.channel as string), at: (t.occurred_at as string) ?? null, first: !!t.is_first_touch, last: !!t.is_last_touch }));
  const prefs = (r.preferences ?? {}) as { negotiation?: Negotiation };
  return {
    id: r.id as string, name: (r.consumer_name as string) || "Unnamed buyer", phone: (r.consumer_phone as string) || "", stage, dbStage: r.current_stage as string,
    ageLabel: agoLabel(stamp, now), score: r.lead_score == null ? null : Math.round(Number(r.lead_score)), temp: temperature(stage, stamp, now),
    failed: r.delivery_status === "delivery_failed", failReason: (r.delivery_error as string) || null, agentId: (r.assigned_agent_id as string) || null,
    nextAction: (r.next_action_recommendation as string) || DEFAULT_NEXT[stage],
    property: [prop.title, prop.city].filter(Boolean).join(" · ") || "Listing unavailable", listPrice: prop.price ?? null,
    budgetMax: r.budget_max == null ? null : Number(r.budget_max), rawSource: (r.source as string) ?? null,
    channel: att.length ? uiChannel(att[att.length - 1].channel as string) : SOURCE_CHANNEL[r.source as string] ?? "direct", touches, unattributed: !att.length,
    neg: prefs.negotiation ?? null, createdAt: r.created_at as string, lastActivity: (r.last_activity_at as string) ?? null,
  };
}

export async function fetchLeads(): Promise<Lead[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("leads")
    .select("id, consumer_name, consumer_phone, source, current_stage, lead_score, risk_level, next_action_recommendation, budget_min, budget_max, preferences, delivery_status, delivery_error, last_activity_at, created_at, assigned_agent_id, properties(title, price, city), lead_attribution(channel, is_first_touch, is_last_touch, occurred_at, campaign_id)")
    .eq("agency_id", aid).is("deleted_at", null).neq("current_stage", "lost").order("created_at", { ascending: false }).limit(500);
  if (r.error) throw r.error;
  return ((r.data ?? []) as unknown as Row[]).map((x) => mapLead(x));
}

export type Rating = "High intent" | "Worth a call" | "Early";
export interface Handoff { id: string; buyer: string; property: string; source: string; listed: string; agreed: string; rating: Rating; advice: string; draft: string; signals: string[] }

const SOURCE_NAME: Record<string, string> = { toju_chat: "Tayo", contact_button: "Contact button", browse: "Browse" };

/** A lead carries preferences.negotiation when the buyer ran Tayo's negotiator before making contact: Tayo qualified them and worked out a price. No negotiation, no card. */
export function buildHandoffs(leads: Lead[]): Handoff[] {
  return leads.filter((l) => l.neg && l.neg.offer != null).map((l) => ({
    id: l.id, buyer: l.name, property: l.property.split(" · ")[0], source: SOURCE_NAME[l.rawSource ?? ""] ?? "Direct",
    listed: l.listPrice != null ? nairaShort(l.listPrice) : nairaShort(l.budgetMax), agreed: nairaShort(l.neg!.offer),
    rating: l.temp === "hot" ? "High intent" : l.temp === "warm" ? "Worth a call" : "Early",
    advice: l.neg!.advice ?? "", draft: l.neg!.draft ?? "", signals: [l.stage, l.score != null ? `${l.score}/100` : null].filter((x): x is string => !!x),
  }));
}
