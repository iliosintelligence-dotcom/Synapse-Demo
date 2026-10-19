import { supabase } from "@/lib/supabase";
import { accessToken, callFunction } from "@/lib/functions";
import { agencyId } from "./agency";
import type { PaneId } from "../roles";

export type Stage = "new" | "no-listings" | "no-leads" | "running";

/** Where the agency actually IS, so the suggestions fit: "Why are sales down?" is the wrong question for somebody who signed up four minutes ago. The server recomputes the truth before it answers; this only decides what to SUGGEST. */
export function stageOf(s: { listings: number; leads: number; brandThin: boolean }): Stage {
  if (!s.listings) return s.brandThin ? "new" : "no-listings";
  if (!s.leads) return "no-leads";
  return "running";
}

export const STAGE_QS: Record<Stage, string[]> = {
  new: ["I just signed up. What should I do first?", "How do I add my first listing?", "What does Synapse do for me once a listing is up?"],
  "no-listings": ["How do I add my first listing?", "What makes a listing get verified?", "How do I set up my brand so posts sign off as us?"],
  "no-leads": ["How do I publish this listing to Instagram?", "Why has nothing reached buyers yet?", "What happens when a buyer contacts us?"],
  running: ["Where should I focus today?", "Which of my listings need attention?", "How is my pipeline looking?"],
};

/** Each is answerable from the live snapshot the advisor is handed, rather than asking the product to explain itself. */
export const PANE_Q: Record<PaneId, string> = {
  overview: "What is getting in the way of my listings reaching buyers?", listings: "Which of my listings are going stale, and what should I do about them?",
  marketing: "Have my posts actually published, or are they still rehearsals?", crm: "Where in the pipeline are my leads getting stuck?",
  social: "Which channels am I connected to, and which am I missing?", negotiator: "Which of my leads are worth a call today?",
  agents: "Is my team the right size for the listings we are running?", tours: "Which viewings still need chasing?",
  brand: "What is still missing from my brand setup?", verification: "What do I still need to send to get verified?",
  subscription: "Does my plan fit how much we are actually listing?", billing: "What have I paid for, and what is it covering?",
};

export function chipsFor(stage: Stage, pane: PaneId): string[] {
  const qs = [...STAGE_QS[stage]];
  const pq = PANE_Q[pane];
  if (pq && !qs.includes(pq)) qs.push(pq);
  return qs;
}

/** What each screen decides, in a line or two, at the top of the panel. */
export const PANE_NOTE: Record<PaneId, { title: string; sub: string; lines: string[] }> = {
  overview: { title: "Business advisor", sub: "Your numbers, and what to do next", lines: [] },
  crm: { title: "Pipeline read", sub: "Tayo’s take on your leads", lines: ["Tayo ranks your leads by intent, deal value and how close the SLA is."] },
  negotiator: { title: "How Tayo negotiates", sub: "The rules, and what you inherit", lines: ["Tayo advises within the range you authorise. It never makes a binding commitment.", "Every lead is qualified, pitched and pre-negotiated before it reaches a human."] },
  listings: { title: "Inventory read", sub: "Freshness and what to re-list", lines: ["Every listing expires 21 days after it was last confirmed.", "Tayo flags what has expired and what is about to, per listing."] },
  social: { title: "Content coach", sub: "What to post next", lines: ["Tayo compares reach, enquiries and taps per channel.", "Generate captions from a listing, review them, then choose when they go out."] },
  marketing: { title: "Creative insights", sub: "What your posts earned", lines: ["Counted from your own tracked links, not estimated."] },
  agents: { title: "Team read", sub: "Coaching for your agents", lines: ["Invite your agents and route some leads; the read is built from their actual numbers."] },
  tours: { title: "Viewings", sub: "Who is coming, and when", lines: ["The availability you publish, the slots buyers book, and who has confirmed.", "A booking nobody has reconfirmed is not a body at the door yet."] },
  brand: { title: "Your brand", sub: "What signs off every post and page", lines: ["The name, logo, colour and voice Synapse writes and publishes as.", "Anything blank shows up as a gap on your public page and in every generated post."] },
  verification: { title: "Verification", sub: "What is on file, and what is outstanding", lines: ["The documents Nigeria requires of an agency: CAC, SCUML, a state licence, a director’s ID.", "Verified means specific checks passed on a date. It is never something an agency sets for itself."] },
  subscription: { title: "Plan advisor", sub: "Is your plan earning its keep?", lines: ["Free: list, generate campaigns and schedule them.", "Accelerate: more listings and seats, verification in 48 hours.", "Leader: unlimited listings and seats, proximity marketing."] },
  billing: { title: "Billing", sub: "What you have paid for", lines: ["Payments go through Paystack to ILIOS Digital. Card details never touch Synapse."] },
};

export interface Turn { role: "user" | "assistant"; content: string }
/** Only the last ten turns go with a question: enough to follow the thread, not enough to drag a whole afternoon along. */
export const recent = (h: Turn[]): Turn[] => h.slice(-10);

/** `**bold**` only. The advisor writes plain prose and the odd bold label; anything else is shown as typed, never parsed as markup. */
export function boldParts(text: string): Array<{ t: string; b: boolean }> {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? { t: p.slice(2, -2), b: true } : { t: p, b: false }));
}

export async function ask(question: string, history: Turn[]): Promise<string> {
  const token = await accessToken();
  if (!token) throw new Error("Sign in again to ask.");
  const r = await callFunction<{ answer?: string; error?: string }>("agency-advisor", { question, history: recent(history) }, { token });
  if (r.data.error && !r.data.answer) throw new Error(r.data.error);
  if (!r.data.answer) throw new Error("Could not reach the advisor just now.");
  return r.data.answer;
}

/** Cheap counts for choosing suggestions: head-only queries, nothing is downloaded. */
export async function fetchStage(): Promise<Stage> {
  const aid = await agencyId();
  if (!aid) return "new";
  const [l, ld, b] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("agency_id", aid).is("deleted_at", null),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("agency_id", aid).is("deleted_at", null),
    supabase.from("agencies").select("name, logo_url").eq("id", aid).maybeSingle(),
  ]);
  const brandThin = !b.data || !String(b.data.name ?? "").trim() || !String(b.data.logo_url ?? "").trim();
  return stageOf({ listings: l.count ?? 0, leads: ld.count ?? 0, brandThin });
}
