import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";

export interface TourPerson { id: string; leadId: string | null; status: string; name: string }
export interface Tour {
  id: string; at: string; capacity: number; status: string; agent: string; property: string; city: string; people: TourPerson[]; confirmed: number;
}
export type TourFilter = "all" | "open" | "confirmed" | "cancelled";
export const TOUR_STATUS: Record<string, string> = { open: "Needs confirming", confirmed: "Confirmed", completed: "Done", cancelled: "Cancelled" };

/** Reconfirmation is due inside 48h: the window where an accurate headcount still changes what the agent does with their day. */
export function dueSoon(iso: string, now = Date.now()): boolean {
  const h = (new Date(iso).getTime() - now) / 36e5;
  return h > 0 && h <= 48;
}

export function filterTours(rows: Tour[], f: TourFilter): Tour[] {
  return f === "all" ? rows : rows.filter((t) => t.status === f);
}

export function tourWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

/** The next 45 days of tours. Cancelled ones stay: a tour called off is part of the record, and an agency that cannot see it cannot answer for it. */
export async function fetchTours(days = 45): Promise<Tour[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const from = new Date().toISOString();
  const to = new Date(Date.now() + days * 864e5).toISOString();
  const sr = await supabase.from("inspection_slots")
    .select("id, agent_id, property_id, starts_at, duration_minutes, capacity, status, properties(title, city), profiles:agent_id(full_name)")
    .eq("agency_id", aid).gte("starts_at", from).lte("starts_at", to).order("starts_at", { ascending: true });
  if (sr.error) throw sr.error;
  const slots = (sr.data ?? []) as unknown as Array<Record<string, unknown>>;
  if (!slots.length) return [];
  const vr = await supabase.from("viewings").select("id, slot_id, status, lead_id, leads:lead_id(consumer_name)").in("slot_id", slots.map((x) => x.id as string)).is("deleted_at", null);
  if (vr.error) throw vr.error;
  const by: Record<string, TourPerson[]> = {};
  for (const v of (vr.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const lead = v.leads as { consumer_name?: string } | null;
    (by[v.slot_id as string] ??= []).push({ id: v.id as string, leadId: (v.lead_id as string) ?? null, status: v.status as string, name: lead?.consumer_name || "A Synapse buyer" });
  }
  return slots.map((x) => {
    const all = by[x.id as string] ?? [];
    // live: who is still coming. cancelled: who HAD booked, which is the thing worth seeing afterwards.
    const people = x.status === "cancelled" ? all : all.filter((p) => p.status !== "cancelled");
    const prop = x.properties as { title?: string; city?: string } | null;
    const agent = x.profiles as { full_name?: string } | null;
    return {
      id: x.id as string, at: x.starts_at as string, capacity: Number(x.capacity), status: x.status as string,
      agent: agent?.full_name || "Unassigned", property: prop?.title || "Listing unavailable", city: prop?.city || "",
      people, confirmed: people.filter((p) => p.status === "confirmed").length,
    };
  });
}

export async function confirmTour(id: string): Promise<void> {
  const r = await supabase.from("inspection_slots").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", id);
  if (r.error) throw r.error;
}

/** One call, so a cancellation cannot half-happen: the slot, the attendance rows and the affected leads move together. */
export async function cancelTour(id: string): Promise<{ affected: number; leadsReset: number }> {
  const r = await supabase.rpc("cancel_inspection_slot", { p_slot_id: id });
  if (r.error) throw r.error;
  const row = (Array.isArray(r.data) ? r.data[0] : r.data) as { ok?: boolean; affected?: number; leads_reset?: number } | null;
  if (!row?.ok) throw new Error("That tour could not be cancelled");
  return { affected: row.affected ?? 0, leadsReset: row.leads_reset ?? 0 };
}

/** Everyone still unanswered goes back to "requested", so the headcount stops counting them as confirmed until they say yes. */
export async function askReconfirm(tour: Tour): Promise<number> {
  const pending = tour.people.filter((p) => p.status !== "confirmed");
  await Promise.all(pending.map(async (p) => {
    const r = await supabase.from("viewings").update({ status: "requested", updated_at: new Date().toISOString() }).eq("id", p.id);
    if (r.error) throw r.error;
  }));
  return pending.length;
}

/** Messages go through the agent-handoff outbox: WhatsApp carries Toju-to-agent handoffs and nothing else, never the buyer. */
export async function queueHandoffs(leadIds: string[], body: string): Promise<number> {
  if (!leadIds.length) return 0;
  const results = await Promise.all(leadIds.map((id) => supabase.rpc("queue_agent_handoff", { p_lead_id: id, p_body: body }).then((r) => ({ ok: !r.error, error: r.error }))));
  const ok = results.filter((r) => r.ok).length;
  if (!ok) throw new Error(results.find((r) => !r.ok)?.error?.message || "Those messages could not be queued");
  return ok;
}
