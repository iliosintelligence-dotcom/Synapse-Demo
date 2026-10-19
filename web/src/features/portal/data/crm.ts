import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";
import type { Lead, Stage } from "./leads";

export const STAGES: Stage[] = ["New", "Contacted", "Viewing", "Negotiation", "Won"];
/** What a person can move a lead to. Nine database stages, named as people say them. */
export const DB_STAGES: Array<[string, string]> = [
  ["new", "New"], ["contacted", "Contacted"], ["qualified", "Qualified"], ["viewing_scheduled", "Viewing booked"], ["viewing_completed", "Viewing done"],
  ["negotiating", "Negotiating"], ["commitment", "Commitment"], ["closed", "Won"], ["lost", "Lost"],
];
export const TEMP_LABEL: Record<Lead["temp"], string> = { hot: "Hot", warm: "Warm", cold: "Cold", dormant: "Dormant", won: "Won" };
export const CHANNEL_NAME: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", whatsapp: "WhatsApp", proximity: "Proximity", tayo: "Tayo", referral: "Referral",
  web: "Website", organic: "Organic", direct: "Direct app", telegram: "Telegram",
};

export type SortKey = "recent" | "score" | "budget" | "stage" | "lead";
const minutesSince = (l: Lead, now: number) => (now - new Date(l.lastActivity ?? l.createdAt).getTime()) / 60000;

export function filterLeads(rows: Lead[], f: { stage: Stage | null; channel: string | null }): Lead[] {
  return rows.filter((l) => (!f.stage || l.stage === f.stage) && (!f.channel || l.channel === f.channel));
}

export function sortLeads(rows: Lead[], key: SortKey, dir: 1 | -1, now = Date.now()): Lead[] {
  const val: Record<SortKey, (l: Lead) => number | string> = {
    recent: (l) => -minutesSince(l, now), score: (l) => l.score ?? -1, budget: (l) => l.budgetMax ?? l.listPrice ?? 0,
    stage: (l) => STAGES.indexOf(l.stage), lead: (l) => l.name.toLowerCase(),
  };
  return [...rows].sort((p, q) => { const a = val[key](p), b = val[key](q); return a < b ? -dir : a > b ? dir : 0; });
}

export function stageCounts(rows: Lead[]): Record<Stage, number> {
  const out = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  rows.forEach((l) => { out[l.stage]++; });
  return out;
}

export interface Task { id: string; lead_id?: string | null; title: string | null; description?: string | null; priority?: string | null; due_at: string | null }
export interface Activity { id: string; activity_type: string; payload: Record<string, unknown> | null; created_at: string }

export function dueWords(iso: string | null, now = Date.now()): { text: string; late: boolean } {
  if (!iso) return { text: "No date set", late: false };
  const ms = new Date(iso).getTime() - now;
  if (Number.isNaN(ms)) return { text: "", late: false };
  const late = ms < 0, h = Math.abs(ms) / 3600000;
  const n = h < 1 ? Math.max(1, Math.round(Math.abs(ms) / 60000)) : h < 48 ? Math.round(h) : Math.round(h / 24);
  const unit = h < 1 ? "min" : h < 48 ? "hour" : "day";
  const s = `${n} ${unit}${n === 1 ? "" : "s"}`;
  return { text: late ? `${s} overdue` : `Due in ${s}`, late };
}

/** Overdue, today, later: what is owed, in the order it is owed. */
export function bucketTasks(rows: Task[], now = Date.now()): { late: Task[]; today: Task[]; later: Task[] } {
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const out = { late: [] as Task[], today: [] as Task[], later: [] as Task[] };
  rows.forEach((t) => {
    const due = t.due_at ? new Date(t.due_at).getTime() : null;
    if (due && due < now) out.late.push(t); else if (!due || due <= end.getTime()) out.today.push(t); else out.later.push(t);
  });
  return out;
}

/** One line per event in the lead's own words: "Moved contacted → qualified, after 2 days" tells the person who must act, the enum does not. */
export function activityLine(a: Activity): { text: string; mark: boolean } {
  const p = (a.payload ?? {}) as Record<string, unknown>;
  const secs = Number(p.seconds_in_previous);
  const sat = Number.isFinite(secs) && secs > 60 ? `, after ${secs < 86400 ? `${Math.round(secs / 3600)}h` : `${Math.round(secs / 86400)} days`}` : "";
  const word = (v: unknown) => String(v ?? "?").replace(/_/g, " ");
  switch (a.activity_type) {
    case "lead_created": return { text: `Lead arrived${p.source ? ` from ${word(p.source)}` : ""}`, mark: true };
    case "lead_stage_changed": return { text: `Moved ${word(p.from)} → ${word(p.to)}${sat}`, mark: true };
    case "lead_assigned": return { text: "Assigned to an agent", mark: false };
    case "task_created": return { text: `Follow-up raised: ${p.title || "a task"}`, mark: false };
    case "task_completed": return { text: `Done: ${p.title || "a task"}`, mark: false };
    case "call_logged": return { text: "Call logged", mark: false };
    case "whatsapp_sent": return { text: "WhatsApp sent", mark: false };
    case "viewing_scheduled": return { text: "Viewing booked", mark: true };
    case "viewing_completed": return { text: "Viewing done", mark: true };
    case "note_added": return { text: "Note added", mark: false };
    case "deal_closed": return { text: "Closed", mark: true };
    case "deal_lost": return { text: "Lost", mark: true };
    default: return { text: word(a.activity_type), mark: false };
  }
}

const csvCell = (v: unknown) => { const t = String(v ?? ""); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
/** The pipeline as a CSV a person can open in a spreadsheet. */
export function toCsv(rows: Lead[]): string {
  const head = ["Name", "Phone", "Stage", "Property", "Budget", "Channel", "Score", "Created"];
  return [head, ...rows.map((l) => [l.name, l.phone, l.stage, l.property, l.budgetMax ?? "", CHANNEL_NAME[l.channel] ?? l.channel, l.score ?? "", l.createdAt])].map((r) => r.map(csvCell).join(",")).join("\n");
}

export async function fetchOpenTasks(limit = 100): Promise<Task[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("tasks").select("id, lead_id, title, priority, due_at").eq("agency_id", aid).is("deleted_at", null).in("status", ["pending", "in_progress"]).order("due_at", { ascending: true, nullsFirst: false }).limit(limit);
  if (r.error) throw r.error;
  return (r.data ?? []) as Task[];
}
export async function fetchLeadTasks(leadId: string): Promise<Task[]> {
  const r = await supabase.from("tasks").select("id, title, description, priority, due_at").eq("lead_id", leadId).is("deleted_at", null).in("status", ["pending", "in_progress"]).order("due_at", { ascending: true, nullsFirst: false }).limit(50);
  if (r.error) throw r.error;
  return (r.data ?? []) as Task[];
}
/** The trail, newest first. activity_feed is append-only by trigger: the one account of a lead that cannot have been tidied up afterwards. */
export async function fetchLeadActivity(leadId: string): Promise<Activity[]> {
  const r = await supabase.from("activity_feed").select("id, activity_type, payload, created_at").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(40);
  if (r.error) throw r.error;
  return (r.data ?? []) as Activity[];
}
export async function completeTask(id: string): Promise<void> {
  const now = new Date().toISOString();
  const r = await supabase.from("tasks").update({ status: "completed", completed_at: now, updated_at: now }).eq("id", id);
  if (r.error) throw r.error;
}

export async function setLeadStage(id: string, stage: string): Promise<void> {
  const aid = await agencyId();
  if (!aid) throw new Error("No agency on this account");
  const r = await supabase.from("leads").update({ current_stage: stage, last_activity_at: new Date().toISOString() }).eq("id", id).eq("agency_id", aid).is("deleted_at", null).select("id").maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) throw new Error("That lead could not be updated");
}

/** Assign several leads at once; a null agent unassigns. A partial result is reported, not smoothed over. */
export async function assignLeads(ids: string[], agentId: string | null): Promise<{ updated: number; requested: number }> {
  if (!ids.length) return { updated: 0, requested: 0 };
  const aid = await agencyId();
  if (!aid) throw new Error("No agency on this account");
  const r = await supabase.from("leads").update({ assigned_agent_id: agentId, last_activity_at: new Date().toISOString() }).in("id", ids).eq("agency_id", aid).is("deleted_at", null).select("id");
  if (r.error) throw r.error;
  const done = (r.data ?? []).length;
  if (!done) throw new Error("Those leads could not be assigned");
  return { updated: done, requested: ids.length };
}

/** delete_lead checks the caller is an admin or owner, then bypasses RLS (a client-side soft delete can never satisfy the select policy). One call per id so one failure does not take the rest with it. */
export async function deleteLeads(ids: string[]): Promise<{ deleted: number; requested: number; error: string | null }> {
  const results = await Promise.all(ids.map((id) => supabase.rpc("delete_lead", { p_lead_id: id }).then((r) => ({ ok: !r.error, error: r.error }))));
  const ok = results.filter((r) => r.ok).length;
  const err = results.find((r) => !r.ok)?.error?.message ?? null;
  if (!ok && ids.length) throw new Error(err || "Those leads could not be deleted");
  return { deleted: ok, requested: ids.length, error: err };
}
