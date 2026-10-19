/**
 * Everything the chat keeps on the visitor's device. Keys match the static site so a conversation started on either page continues on
 * the other. Every read and write is guarded: private windows and blocked storage must never break the chat.
 */
import type { ArchivedChat, ChatMessage, Pin, ReplyMode, ReplyTo } from "./types";

const K = {
  chat: "toju_chat_v1",
  visitor: "toju_visitor_v1",
  sessions: "toju_sessions_v1",
  pins: "toju_pins_v1",
  feedback: "toju_fb_v1",
  mode: "toju_reply_mode_v1",
  reply: "toju_reply_v1",
  background: "toju_bg_v1",
  moodboard: "synapse_moodboard_v1",
  lastHome: "syn_last_home",
} as const;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* not kept this time */ }
};

export const loadThread = (): ChatMessage[] => read<ChatMessage[]>(K.chat, []);
export const saveThread = (t: ChatMessage[]) => write(K.chat, t);
export const clearThread = () => { try { localStorage.removeItem(K.chat); } catch { /* nothing to clear */ } };

/** A stable anonymous visitor id: Tayo's server-side memory continues anywhere this id exists. */
export function visitorId(): string {
  try {
    let v = localStorage.getItem(K.visitor);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(K.visitor, v); }
    return v;
  } catch {
    return crypto.randomUUID();
  }
}
export function rotateVisitor(): string {
  const v = crypto.randomUUID();
  try { localStorage.setItem(K.visitor, v); } catch { /* not kept */ }
  return v;
}
export function setVisitor(v: string) {
  try { localStorage.setItem(K.visitor, v); } catch { /* not kept */ }
}

export const loadSessions = (): ArchivedChat[] => read<ArchivedChat[]>(K.sessions, []);
export const saveSessions = (s: ArchivedChat[]) => write(K.sessions, s.slice(0, 30));

/** Files a conversation in History. Nothing is filed unless the person actually said something. */
export function archiveThread(visitor: string, messages: ChatMessage[]): void {
  const first = messages.find((m) => m.role === "user");
  if (!first) return;
  const sessions = loadSessions().filter((s) => s.visitorId !== visitor);
  sessions.unshift({
    id: crypto.randomUUID(), visitorId: visitor, endedAt: Date.now(), title: String(first.content).slice(0, 80),
    homes: messages.reduce((n, m) => n + (Array.isArray(m.matches) ? m.matches.length : 0), 0), messages,
  });
  saveSessions(sessions);
}

export const loadPins = (): Pin[] => read<Pin[]>(K.pins, []);
export const savePins = (p: Pin[]) => write(K.pins, p.slice(0, 100));

export type Rating = "up" | "down";
export const loadFeedback = (): Record<string, Rating> => read<Record<string, Rating>>(K.feedback, {});
export const saveFeedback = (m: Record<string, Rating>) => write(K.feedback, m);

export const loadMode = (): ReplyMode => (read<string>(K.mode, "discuss") === "info" ? "info" : "discuss");
export const saveMode = (m: ReplyMode) => { try { localStorage.setItem(K.mode, m); } catch { /* not kept */ } };

export const loadReply = (): ReplyTo | null => read<ReplyTo | null>(K.reply, null);
export function saveReply(r: ReplyTo | null) {
  if (r) return write(K.reply, r);
  try { localStorage.removeItem(K.reply); } catch { /* nothing to remove */ }
}

export const loadBackground = (): { uid: string; mode: string } | null => read(K.background, null);
export const saveBackground = (uid: string, mode: string) => write(K.background, { uid, mode });

export const loadMoodBoard = () => read<Record<string, unknown> | null>(K.moodboard, null);
export const loadLastHome = (): { id: string; ch: string; ts: number } | null => read(K.lastHome, null);

/** Which agency the buyer is asking about ("Ask Tayo about this agency"). Kept for the tab, so a reload does not drop the subject. */
const AGENCY = "syn_agency_ctx";
export const loadAgency = (): string | null => { try { return sessionStorage.getItem(AGENCY); } catch { return null; } };
export function saveAgency(id: string | null) {
  try {
    if (id) sessionStorage.setItem(AGENCY, id);
    else sessionStorage.removeItem(AGENCY);
  } catch { /* not kept */ }
}
