import { accessToken, callFunction } from "@/lib/functions";

/**
 * The owner deletes the agency and their own account. The work is done by the delete-agency edge function, one request per step, so the list on screen is the
 * truth rather than an animation:
 *   preview  what would go and what would not      nothing changes
 *   begin    typed name checked, listings off the site
 *   files    photos, videos, logo and papers out of Storage
 *   data     every row, in one transaction
 *   finish   the owner's login, then the record is closed
 * Every step is safe to repeat, and the server decides every rule again (owner, typed name, paid plan, order), so this side only has to be honest about what
 * is happening and carry on from where it stopped.
 */
export const STEPS = ["begin", "files", "data", "finish"] as const;
export type StepName = (typeof STEPS)[number];

export interface Preview {
  agency_id: string; name?: string; state?: "ready" | "begun" | "data_deleted" | string; confirm_phrase?: string; counts?: Record<string, number>;
  paid_plan?: { tier: string; until: string } | null;
  owner_login?: { removable?: boolean; kept_because?: string } | "pending" | string;
  kept_because?: string;
}
export interface CallResult { ok: boolean; status: number; data: Record<string, unknown> }

export async function call(body: Record<string, unknown>): Promise<CallResult> {
  const token = await accessToken();
  if (!token) return { ok: false, status: 401, data: {} };
  try {
    const r = await callFunction<Record<string, unknown>>("delete-agency", body, { token });
    return { ok: r.ok, status: r.status, data: r.data ?? {} };
  } catch { return { ok: false, status: 0, data: {} }; }
}

/** A refusal comes with a sentence written for the person pressing the button; anything else is described here, because a gateway's error text is written for nobody. */
export function said(res: CallResult): string {
  const d = res.data;
  if (typeof d.error === "string" && d.error && typeof d.code === "string") return d.error;
  if (res.status === 401) return "Your session has ended. Sign in again, and this carries on from where it stopped.";
  if (!res.status) return "Synapse could not be reached. Check your connection; it is safe to try again.";
  return "Something went wrong part-way. It is safe to try again: it carries on from where it stopped.";
}

/** The typed confirmation, compared fairly: quotes straightened, runs of spaces collapsed, the ends trimmed; letters and case exact. A phone types ’ where the name was saved with ', and that is not a different name. */
export const confirmKey = (s: unknown): string =>
  String(s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, " ").replace(/\s+/g, " ").trim();

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; };
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export const TIER: Record<string, string> = { free: "Free", accelerator: "Accelerate", market_leader: "Leader" };
const KEPT_BECAUSE: Record<string, string> = {
  owns_another_agency: "you also own another agency on Synapse", member_of_another_agency: "you also work in another agency on Synapse",
  platform_staff: "it is a Synapse staff account", records_elsewhere: "other records on Synapse still point to it",
};
export const why = (code: string | null | undefined): string => KEPT_BECAUSE[code ?? ""] ?? "something else on Synapse still needs it";

export function loginOf(pv: Preview): { removable: boolean; keptBecause: string | null } {
  const l = pv.owner_login;
  return typeof l === "object" && l ? { removable: l.removable === true, keptBecause: l.kept_because ?? null } : { removable: false, keptBecause: pv.kept_because ?? null };
}

/**
 * What goes and what does not, from the server's own numbers (not an estimate drawn from what this page has loaded). "**bold**" marks the parts that matter.
 * Honest in both directions: someone who thinks posts were deleted and then finds them on Instagram has been misled, and so has someone who thinks their team
 * lost their accounts with the agency.
 */
export function describe(pv: Preview): { gone: string[]; kept: string[] } {
  const c = pv.counts ?? {};
  const { removable, keptBecause } = loginOf(pv);
  const team = num(c.team_members);
  const gone = [`${plural(num(c.listings), "listing")}${num(c.listing_media) ? `, with ${plural(num(c.listing_media), "photo or video", "photos and videos")}` : ""}`, `${plural(num(c.leads), "lead")} in your CRM, with their notes, stages and history`];
  if (num(c.social_posts)) gone.push(`${plural(num(c.social_posts), "post")} in the Social studio. Anything scheduled will not go out`);
  if (num(c.short_links)) gone.push(`${plural(num(c.short_links), "share link")}. Links you have sent out stop working`);
  if (num(c.social_accounts)) gone.push(`${plural(num(c.social_accounts), "connected social account")}. Synapse’s access to them is removed; the accounts themselves stay yours`);
  if (num(c.campaigns)) gone.push(plural(num(c.campaigns), "campaign"));
  if (num(c.tours)) gone.push(plural(num(c.tours), "tour or viewing slot", "tours and viewing slots"));
  if (num(c.documents)) gone.push(plural(num(c.documents), "verification document"));
  gone.push("Your brand and logo, team chat, invites, and the record of your plan payments in Synapse");
  if (removable) gone.push("**Your own profile, photo and login.** You will be signed out");
  const kept = [
    "**Posts already published** on Facebook, Instagram, Telegram, TikTok or X stay up. Synapse cannot recall them; delete them in those apps if you want them gone.",
    `**Your team${team ? ` (${plural(team, "person", "people")})` : ""}** keep their own Synapse logins and profiles. They lose access to this agency, and nothing else.`,
  ];
  if (!removable) kept.push(`**Your login** stays, because ${why(keptBecause)}.`);
  kept.push("Paystack keeps its own receipts for anything you paid.", "Reports made to Synapse about this agency are kept, so deleting it cannot erase them.", "A note that this agency was deleted: the date and how many items went, with no names in it.");
  return { gone, kept };
}

/** Delete is armed only when the typed name matches and, for a paid plan, the days-left box is ticked. The server checks both again; this only saves a refusal. Deliberately no Enter-to-delete. */
export const armed = (typed: string, phrase: string, hasPlan: boolean, ack: boolean): boolean => !!confirmKey(phrase) && confirmKey(typed) === confirmKey(phrase) && (!hasPlan || ack);

export function longDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "the end of this period" : d.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

// ── coming back to an interrupted deletion ───────────────────────────────────────────────────────────────────────
const MARK = "synapse_agency_deletion_v1";
const GOODBYE = "synapse_goodbye_v1";
/** The note holds an agency id and nothing about a person, and goes when the deletion completes. */
export const readMark = (): string | null => { try { const m = JSON.parse(window.localStorage.getItem(MARK) || "null") as { a?: unknown } | null; return m && typeof m.a === "string" ? m.a : null; } catch { return null; } };
export const writeMark = (aid: string): void => { try { window.localStorage.setItem(MARK, JSON.stringify({ a: aid })); } catch { /* fine */ } };
export const clearMark = (): void => { try { window.localStorage.removeItem(MARK); } catch { /* fine */ } };
/** In sessionStorage rather than the URL: "your agency was deleted" should not be something a person can bookmark, share or land on by accident. */
export const rememberGoodbye = (login: "kept" | "removed"): void => { try { window.sessionStorage.setItem(GOODBYE, JSON.stringify({ kind: "agency", login })); } catch { /* fine */ } };

/** What this device holds about the agency: Deleting it "completely" includes the copy here. Interface choices (theme, sidebar, consent) belong to the person and stay. */
const CACHE_KEYS = ["synapse_agency_listings_v5", "synapse_listing_draft_v1", "synapse_agency_campaigns_v1", "synapse_angles_v1", "synapse_used_angles_v1", "synapse_brand_onboard_skipped", "syn-noti-handled", "syn_setup_done", "syn_status_offer_v1"];
export const isAgencyCacheKey = (k: string): boolean => CACHE_KEYS.includes(k) || k.startsWith("synapse_listing_draft_v2:");
export function clearAgencyCaches(): void {
  try { Object.keys(window.localStorage).filter(isAgencyCacheKey).forEach((k) => window.localStorage.removeItem(k)); } catch { /* fine */ }
}

// ── a tiny store, so a button in Subscription and the shell's "come back to it" open the same dialog ─────────────────────
export type Phase = { kind: "closed" } | { kind: "checking" } | { kind: "problem"; title: string; text: string; retry: boolean } | { kind: "confirm"; pv: Preview; error?: string } | { kind: "finishOnly"; pv: Preview; error?: string };
let phase: Phase = { kind: "closed" };
const subs = new Set<() => void>();
export const getPhase = (): Phase => phase;
export const setPhase = (p: Phase): void => { phase = p; subs.forEach((f) => f()); };
export const subscribe = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Ask the server where this deletion stands: with no agency id it finds the one this owner owns. */
export async function preview(aid: string | null): Promise<CallResult> {
  return call(aid ? { action: "preview", agency_id: aid } : { action: "preview" });
}
export function routePreview(pv: Preview): Phase { return pv.state === "data_deleted" ? { kind: "finishOnly", pv } : { kind: "confirm", pv }; }
