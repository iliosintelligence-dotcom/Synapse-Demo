import type { Account } from "./channels";

/**
 * Things only a person can do ("copy this, paste it there"). A standing checklist is furniture: read once, then scrolled past for ever. A task that arrives
 * when it becomes true, says exactly what to paste where, and leaves when it is done gets read. Each stays in the bell under "To do" until it is marked done,
 * so closing the card never loses it.
 */
export interface Copy { label?: string; text: string }
export interface Task { id: string; title: string; body?: string; copies?: Copy[]; where?: string; eye?: string; once?: boolean }

export const goUrl = (username: string | null | undefined): string => {
  const slug = bioSlug(username);
  return slug ? `https://synapsecore.dev/go/${slug}` : "";
};
/**
 * Strip the "@", trim, lower-case, and replace every run of anything outside [a-z0-9._-] with a hyphen. A slug computed differently here points at a /go/ page that
 * does not resolve, which is a broken link in somebody's Instagram bio: the single worst place in this product for one.
 */
export function bioSlug(handle: string | null | undefined): string {
  return String(handle ?? "").replace(/^\s*@/, "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

const FIX = "Meta Business Suite → your Page → Edit action button";

/**
 * The to-do list for the accounts an agency has connected, derived from state: a task that stops being true simply disappears. Facebook's Page button is read
 * at connect time; a missing value means we could not look, and then this says nothing at all.
 */
export function channelTasks(accounts: Array<Pick<Account, "id" | "platform" | "platform_username" | "is_active"> & { page_cta_type?: string | null; page_cta_url?: string | null }>): Task[] {
  const out: Task[] = [];
  for (const ac of accounts) {
    if (!ac.is_active) continue;
    const link = goUrl(ac.platform_username);
    const who = ac.platform === "telegram" ? ac.platform_username || "your channel" : ac.platform_username ? `@${ac.platform_username}` : ({ instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" } as Record<string, string>)[ac.platform] ?? ac.platform;

    // the posts carry their own button on Telegram, so the description is for somebody browsing the channel, and the useful thing is a conversation
    if (ac.platform === "telegram") {
      out.push({ id: `bio:${ac.id}:tayo`, title: `Put this link in ${who}’s description`, body: "Anyone browsing the channel can tap straight into a new chat with Tayo, which asks which home caught their eye.", copies: [{ text: "https://synapsecore.dev/tayo/telegram" }], where: "Telegram → your channel → Edit → Description" });
    } else if (bioSlug(ac.platform_username)) {
      // on Instagram, where captions cannot link, the page of this account's homes is how a reader finds the one they saw
      out.push({ id: `bio:${ac.id}:${bioSlug(ac.platform_username)}`, title: `Put this link in ${who}’s bio`, body: "It lists the homes this account has posted, newest first, and each one opens the right listing, so the posts have somewhere to send people.", copies: [{ text: link }], where: ac.platform === "instagram" ? "Instagram → Edit profile → Links" : "Facebook → your Page → Edit details → Website" });
    }

    if (ac.platform !== "facebook" || !ac.page_cta_type) continue;
    const copies = link ? [{ text: link }] : [];
    if (ac.page_cta_type === "NONE") {
      out.push({ id: `cta:${ac.id}:NONE`, title: `Give ${who} an action button`, body: "This Page has none. One that points at your listings puts a tappable route under every post, in the spot Facebook makes most prominent.", copies, where: FIX });
      continue;
    }
    // no web address means a call, a WhatsApp thread or a Messenger window: the buyer arrives with no listing attached and the enquiry belongs to nothing
    if (!ac.page_cta_url) {
      out.push({ id: `cta:${ac.id}:${ac.page_cta_type}`, title: `Point ${who}’s Page button at your listings`, body: `It is set to ${String(ac.page_cta_type).toLowerCase().replace(/_/g, " ")}, so it sends people to a message or a call. Facebook puts it under every post, above your caption link, so most people tap it, and it arrives with no listing attached. Keep the phone number on the Page; anyone who wants to call still can.`, copies, where: FIX });
      continue;
    }
    if (!ac.page_cta_url.includes("synapsecore.dev")) {
      out.push({ id: `cta:${ac.id}:url:${ac.page_cta_url}`, title: `${who}’s Page button goes somewhere else`, body: `It opens ${ac.page_cta_url}. That is fine if it is meant to; pointing it at your Synapse listings means the taps are counted against the homes they were about.`, copies, where: FIX });
    }
  }
  return out;
}

// ── what has been dealt with, on this device ──────────────────────────────────────────────────────────────────
// Done is remembered on this device. Later hides it until the next visit; it comes back then, because it is still not done.
const DONE_KEY = "syn_tasks_done_v1", LATER_KEY = "syn_tasks_later_v1";
type Marks = Record<string, number>;
const store = (kind: "done" | "later") => (kind === "done" ? window.localStorage : window.sessionStorage);
const key = (kind: "done" | "later") => (kind === "done" ? DONE_KEY : LATER_KEY);
export function readMarks(kind: "done" | "later"): Marks { try { return JSON.parse(store(kind).getItem(key(kind)) || "{}") || {}; } catch { return {}; } }
export function mark(kind: "done" | "later", id: string): Marks {
  const m = readMarks(kind); m[id] = Date.now();
  try { store(kind).setItem(key(kind), JSON.stringify(m)); } catch { /* storage blocked: the card still closes */ }
  return m;
}
/** Everything still owed: not done, and not a one-off moment (those are shown but never listed). */
export const openTasks = (all: Task[], done: Marks): Task[] => all.filter((t) => !t.once && !done[t.id]);
/** What is worth popping up now: not done, not put off for this visit, not already shown. */
export const freshTasks = (list: Task[], done: Marks, later: Marks, popped: Set<string>): Task[] => list.filter((t) => !done[t.id] && !later[t.id] && !popped.has(t.id));
