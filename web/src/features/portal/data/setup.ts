import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";
import type { PaneId } from "../roles";

/** What the agency has really done, as the database reports it (agency_setup_progress), plus the one thing the portal knows from its own lead list. */
export interface Progress { role: string; logo: boolean; cac: boolean; listings: number; channels: number; posts: number; team: number; leads: number; referrals: number; repliedLead?: boolean }

/** Where a step sends you, and what it asks that pane to do on arrival. */
export type Intent = "new-listing" | "new-post" | "invite";
export interface Step { id: string; title: string; why: string; cta: string; done: boolean; pane: PaneId; intent?: Intent; legacy?: string }

/**
 * The steps are ordered, and the first one not done is THE NEXT STEP. Steps an agent cannot do (the logo, the papers, inviting people, connecting a
 * social account) are not shown to an agent. When everything is done the anchor goes away.
 */
export function buildSteps(p: Progress): Step[] {
  const boss = p.role === "agency_owner" || p.role === "agency_admin";
  const all: Array<Step & { boss?: boolean }> = [
    { id: "logo", boss: true, title: "Add your logo", why: "Buyers trust a listing more when they can see whose it is. It also goes on every post Synapse makes for you.", cta: "Add your logo", done: !!p.logo, pane: "brand" },
    { id: "cac", boss: true, title: "Upload your CAC certificate", why: "You cannot publish a listing until it is on file. It takes a minute, and the verification team reviews it after.", cta: "Upload it", done: !!p.cac, pane: "verification" },
    { id: "listing", title: "Add your first listing", why: "Buyers cannot find you until a listing is live. About three minutes: photos, price and a pin on the map.", cta: "Add a listing", done: p.listings > 0, pane: "listings", intent: "new-listing" },
    // connecting an account (Meta, Telegram) is still on the original portal
    { id: "channel", boss: true, title: "Connect a social account", why: "Connect Instagram, Facebook, TikTok or Telegram once, and Synapse can post your listings for you.", cta: "Connect one", done: p.channels > 0, pane: "social", legacy: "/app/agency.html#social" },
    { id: "post", title: "Post a listing", why: "Pick a listing, tick where it goes, and let Synapse write the captions. This is how enquiries start.", cta: "Make a post", done: p.posts > 0, pane: "social", intent: "new-post" },
    { id: "team", boss: true, title: "Invite a teammate", why: "Add the agents who will answer buyers. Leads can be assigned to them, and the work stops sitting on one person.", cta: "Invite someone", done: p.team > 1, pane: "agents", intent: "invite" },
    {
      id: "lead", title: "Reply to your first lead", cta: p.leads > 0 ? "Open your leads" : "Share a listing", done: !!p.repliedLead, pane: p.leads > 0 ? "crm" : "listings",
      why: p.leads > 0 ? "A buyer has asked about a home. Fast replies win; open it and call or message them." : "Your first enquiry lands here the moment a buyer taps Contact agent. Share a listing to get one sooner.",
    },
    { id: "refer", boss: true, title: "Refer another agency", why: "Every 5 agencies you bring earn you a free month. Your link is on the Plans page.", cta: "Get my link", done: p.referrals > 0, pane: "subscription" },
  ];
  return all.filter((s) => !s.boss || boss).map(({ boss: _b, ...s }) => { void _b; return s; });
}

export const nextStep = (steps: Step[]): Step | undefined => steps.find((s) => !s.done);
export const doneCount = (steps: Step[]): number => steps.filter((s) => s.done).length;

export async function fetchProgress(): Promise<Progress | null> {
  const aid = await agencyId();
  if (!aid) return null;
  const [r, replied] = await Promise.all([
    supabase.rpc("agency_setup_progress", { p_agency: aid }),
    // the call cannot know a lead was worked; the portal's own lead list can
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("agency_id", aid).is("deleted_at", null).neq("current_stage", "new").neq("current_stage", "lost"),
  ]);
  if (r.error || !r.data) return null;
  return { ...(r.data as Progress), repliedLead: (replied.count ?? 0) > 0 };
}
