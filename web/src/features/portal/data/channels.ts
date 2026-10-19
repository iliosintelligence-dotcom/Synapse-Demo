import { supabase } from "@/lib/supabase";
import { accessToken } from "@/lib/functions";

/**
 * Connecting the agency's own social accounts. Nothing here ever sees a token: social-connect puts it in Vault and this page only learns that a row exists.
 * The OAuth return goes to the function's PORTAL_URL setting, so the new portal reads the outcome from the address whenever it arrives here.
 */
export const CONNECTABLE: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", telegram: "Telegram", tiktok: "TikTok" };
export const COMING_LATER = ["LinkedIn", "X (your X posts go out on Synapse’s X for now)"];

export interface Account { id: string; platform: string; platform_username: string | null; is_active: boolean; token_expires_at: string | null; connected_at: string | null; page_cta_type?: string | null; page_cta_url?: string | null }

/** An expired token is a row, not a channel: shown greyed out with a reconnect, never as connected. */
export const isExpired = (a: Pick<Account, "token_expires_at">, now = Date.now()): boolean => !!a.token_expires_at && new Date(a.token_expires_at).getTime() < now;
/** Oldest first: the first listed IS the one a post that names no account goes to, so the screen must agree with the publisher. */
export const accountsOn = (all: Account[], platform: string): Account[] => all.filter((a) => a.platform === platform).sort((x, y) => String(x.connected_at ?? "").localeCompare(String(y.connected_at ?? "")));
export const liveCount = (all: Account[]): number => Object.keys(CONNECTABLE).filter((p) => accountsOn(all, p).some((a) => !isExpired(a))).length;

export async function fetchAccounts(): Promise<Account[]> {
  const r = await supabase.from("social_accounts").select("id, platform, platform_username, is_active, token_expires_at, connected_at, page_cta_type, page_cta_url").eq("is_active", true).is("deleted_at", null);
  if (r.error) throw r.error;
  return (r.data ?? []) as Account[];
}
export async function disconnect(id: string): Promise<void> {
  const r = await supabase.rpc("disconnect_social_account", { p_account_id: id });
  if (r.error) throw new Error("Could not disconnect.");
}

/** What each platform can connect right now, as the function reports it. A status call having a bad minute must not strip working buttons: unknown means ready. */
export interface Readiness { platforms: Record<string, { ready?: boolean; bot?: string }> | null }
export async function fetchReadiness(): Promise<Readiness> {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-connect?action=status`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! } });
    const j = r.ok ? ((await r.json()) as { platforms?: Readiness["platforms"] }) : null;
    return { platforms: j?.platforms ?? null };
  } catch { return { platforms: null }; }
}
export const platformReady = (r: Readiness, pl: string): boolean => !r.platforms || !r.platforms[pl] || r.platforms[pl].ready !== false;
/** Instagram connects through the Facebook connection, so its tile works whenever Facebook does. */
export const tileReady = (r: Readiness, pl: string): boolean => platformReady(r, pl) || (pl === "instagram" && platformReady(r, "facebook"));
export const botName = (r: Readiness, fallback = "@SynapseListingsBot"): string => { const b = r.platforms?.telegram?.bot; return typeof b === "string" && /^@[A-Za-z0-9_]{5,32}$/.test(b) ? b : fallback; };

export async function api<T = Record<string, unknown>>(action: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error("Sign in again to connect a channel.");
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-connect?action=${action}`, {
    ...init, headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error((j.error as string) || `That step failed (${r.status}).`);
  return j as T;
}

/** The URL to send the browser to for Facebook, Instagram or TikTok. Sent in this window, never a popup: phones block popups, and a popup killed by a blocker leaves a button that did nothing. */
export async function startConnect(platform: string): Promise<string> {
  if (!CONNECTABLE[platform]) throw new Error("Unknown channel.");
  const j = await api<{ url?: string }>(`start&platform=${encodeURIComponent(platform)}`);
  if (!j.url) throw new Error("The connect flow returned no URL.");
  return j.url;
}

// ── what the address says when Facebook, TikTok or Telegram send you back ─────────────────────────────────────────────
const FB_RESET = "On Facebook, go to Settings & privacy → Settings → Business integrations (search Settings for “Business integrations” if you can’t see it), find Synapse and remove it.";
/** The function sends a fixed `reason` beside the detail (the detail is cut at 180 characters on the way), so the steps live here, where there is room for them. */
export const CONNECT_HELP: Record<string, { what: string; steps: string[]; retry: boolean }> = {
  no_pages: { what: "Facebook connected, but no Page came with it, so nothing was connected.", retry: true, steps: [
    "Press Connect Facebook again. In Facebook’s window, tick every Page you post from, and its Instagram account, then continue.",
    `If Facebook shows no list of Pages and only offers “Continue as …”, it is reusing an earlier choice. If the window has a link to edit that choice, use it; otherwise: ${FB_RESET} Then come back and connect again.`,
    "You need full control of the Page on Facebook."] },
  stale_pages: { what: "Facebook is still pointing Synapse at Pages that no longer exist (most likely deleted), and it skipped asking about your current ones.", retry: true, steps: [FB_RESET, "Come back here and press Connect Facebook again.", "In Facebook’s window, tick your current Pages and their Instagram accounts, then continue."] },
  no_token: { what: "Facebook named your Pages but gave Synapse no permission to post to them.", retry: true, steps: ["Press Connect Facebook again and leave every permission switched on in Facebook’s window.", "You need full control of the Page on Facebook; partial access is not enough to post."] },
  missing_permission: { what: "Facebook did not give Synapse the permission it needs to list your Pages.", retry: false, steps: ["This is set in Synapse’s own Facebook app, not on your side. Tell Synapse."] },
  pages_unreadable: { what: "Facebook would not tell Synapse which Pages you run.", retry: true, steps: ["Press Connect Facebook again.", "If it happens again, tell Synapse."] },
  unknown: { what: "Facebook shared no Page, and Synapse could not tell why.", retry: true, steps: ["Press Connect Facebook again.", "If it happens again, tell Synapse."] },
  user_denied: { what: "Facebook’s window was closed or Cancel was pressed, so nothing was connected.", retry: true, steps: ["Press Connect Facebook again and continue through Facebook’s window to the end."] },
};

export type ConnectResult =
  | { kind: "choose"; stash: string }
  | { kind: "ok"; message: string }
  | { kind: "failed"; message: string; detail: string; help: (typeof CONNECT_HELP)[string] | null };

/** Read once and then stripped by the caller: a reload must not replay a stale outcome. */
export function readConnectResult(search: string): ConnectResult | null {
  const q = new URLSearchParams(search);
  const outcome = q.get("connected");
  if (!outcome) return null;
  const detail = q.get("detail") || "";
  let reason = q.get("reason") || "";
  if (!reason && outcome === "error" && /shared no Page/i.test(detail)) reason = "no_pages";
  if (outcome === "choose" && /^[0-9a-f-]{36}$/i.test(detail)) return { kind: "choose", stash: detail };
  if (outcome === "cancelled" || outcome === "error") {
    const message = outcome === "cancelled" ? `Connection cancelled${detail ? `: ${detail}` : "."}` : `Could not connect${detail ? `: ${detail}` : "."}`;
    return { kind: "failed", message, detail, help: Object.prototype.hasOwnProperty.call(CONNECT_HELP, reason) ? CONNECT_HELP[reason] : null };
  }
  if (outcome === "tiktok") return { kind: "ok", message: `TikTok connected${detail ? ` as ${detail}` : ""}. Posts will arrive in that account’s TikTok inbox to finish and post.` };
  return { kind: "ok", message: `${CONNECTABLE[outcome] ?? outcome} connected${detail ? ` as ${detail}` : ""}. Posts to it are real from now on.` };
}
export function stripConnectParams(search: string, pathname: string, hash: string): string {
  const q = new URLSearchParams(search);
  ["connected", "detail", "reason"].forEach((k) => q.delete(k));
  return `${pathname}${q.toString() ? `?${q}` : ""}${hash}`;
}

// ── Facebook: which of the shared Pages are this agency's ────────────────────────────────────────────────────────────
export interface FbPage { id: string; name?: string; instagram?: string | null; connected?: string | null }
export interface FbPick { agency?: string; pages?: FbPage[] }
const COMMON = ["real", "estate", "estates", "property", "properties", "homes", "realty", "limited", "agency", "group", "the", "and"];
/**
 * Facebook shares whatever Pages the account allowed Synapse before, and on a second connect it skips its own list, so nothing is connected until the person
 * ticks it. A Page whose name shares a DISTINCTIVE word with the agency's is ticked for them ("real" and "estate" are not distinctive); nothing else is.
 */
export function suggestPages(pick: FbPick): Record<string, boolean> {
  const words = String(pick.agency ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !COMMON.includes(w));
  const out: Record<string, boolean> = {};
  (pick.pages ?? []).forEach((pg) => {
    if (pg.connected && pg.connected !== "here") return;
    const nm = String(pg.name ?? "").toLowerCase();
    if (words.some((w) => nm.includes(w))) out[pg.id] = true;
  });
  return out;
}
export const loadPick = (stash: string) => api<FbPick>(`facebook-pick&pick=${encodeURIComponent(stash)}`);
export const connectPages = (stash: string, pageIds: string[]) => api<{ connected?: string[]; problems?: string[]; agency?: string }>("facebook-pick", { method: "POST", body: JSON.stringify({ pick: stash, page_ids: pageIds }) });

// ── Telegram: post /connect CODE in the channel, which proves it is theirs ──────────────────────────────────────────
export type TgState = "" | "waiting" | "working" | "connected" | "error" | "expired" | "unknown";
export const newTelegramCode = () => api<{ code?: string; expires_in?: number; bot?: string }>("telegram-code", { method: "POST", body: "{}" });
export const telegramCodeStatus = (code: string) => api<{ status?: TgState; error?: string; channel?: string; code_post_deleted?: boolean }>(`telegram-code-status?code=${encodeURIComponent(code)}`);
export const telegramLinkState = () => api<{ linked?: { telegram_username?: string; first_name?: string } | null; bot?: string }>("telegram-link");
export const telegramLinkStart = () => api<{ url: string }>("telegram-link-start", { method: "POST", body: "{}" });
export const minutesLeft = (expiresAt: number, now = Date.now()): number => (expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 60000)) : 0);
