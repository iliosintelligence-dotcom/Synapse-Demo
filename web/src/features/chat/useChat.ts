"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signInHref } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { listingAgentFor, type ListingAgent } from "@/lib/listingAgent";
import { fetchOpenSlots, type TourSlot } from "@/features/property/queries";
import { ASK_TIMEOUT_MS, askTayo, createLead, fetchReplyListing, prepareHandover, restoreThread, type Handover, type LeadResult } from "./api";
import { dreamContext, isHiddenNote, isPersonTurn, replyContext } from "./context";
import { unwrapEnvelope } from "./envelope";
import {
  archiveThread, clearThread, loadAgency, loadMode, loadMoodBoard, loadReply, loadSessions, loadThread, rotateVisitor, saveAgency, saveMode, saveReply,
  saveSessions, saveThread, setVisitor as storeVisitor, visitorId,
} from "./storage";
import type { ArchivedChat, ChatMessage, ReplyMode, ReplyTo, TojuResponse } from "./types";

export interface AskContext { replyTo?: ReplyTo | null; mode?: ReplyMode }

export type ChatError = "offline" | "timeout" | "busy" | "server" | "network";

const GREETING_TEMPLATE = "I'm Tayo. I'll find you a home from {{LISTING_COUNT}}homes agencies have listed with us.\n\nWhat's prompting the move?";
/** Never hardcode a number: a stale count is a trust bug. The token carries its own article so the sentence still stands with no count. */
export const greetingWith = (n: number | null) => GREETING_TEMPLATE.replace("{{LISTING_COUNT}}", Number.isFinite(n) && (n as number) > 0 ? `the ${(n as number).toLocaleString()} ` : "the ");
const GREETING = greetingWith(null);

const SOCIAL_NAMES: Record<string, string> = { telegram: "Telegram", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", x: "X", whatsapp: "WhatsApp", whatsapp_campaign: "WhatsApp" };
const arrivalGreeting = (from: string) =>
  `I'm Tayo, Synapse's property advisor. ${from ? `Did a home on our ${from} catch your eye?` : "Did one of our posts catch your eye?"} Tell me which one, the area or the price is enough, or tell me what you’re looking for.`;

export interface InitialChat {
  thread: ChatMessage[];
  visitor: string;
  replyTo: ReplyTo | null;
  mode: ReplyMode;
  agencyId: string | null;
}

/**
 * The state the page opens with, from the device and the address. An ARRIVAL (a social post, the landing page, a bio link) is a new question:
 * it gets a clean chat and a first line that asks what caught their eye, and whatever the browser last said to Tayo is filed in History
 * rather than lost. Safe to run twice (React does in development): the second run finds the thread already filed and cleared.
 */
export function initialChat(search: string): InitialChat {
  const q = new URLSearchParams(search);
  const via = q.get("via");
  const fromSite = q.get("new") === "site";
  const fresh = q.get("new") === "1" || fromSite || via === "bio";
  const from = SOCIAL_NAMES[String(q.get("ch") ?? "").toLowerCase()] ?? "";
  const social = fresh && !fromSite;

  let thread = loadThread();
  let visitor = visitorId();
  if (fresh) {
    if (thread.some((m) => m.role === "user")) {
      archiveThread(visitor, thread);
      visitor = rotateVisitor();
    }
    thread = [];
    clearThread();
  }
  thread = thread.filter((m) => !isHiddenNote(m)); // scrub any hidden context that leaked into storage
  if (thread.length === 0) thread = [{ role: "assistant", content: social ? arrivalGreeting(from) : GREETING }];

  const agencyParam = q.get("agency");
  const agencyId = agencyParam && /^[0-9a-f-]{36}$/i.test(agencyParam) ? agencyParam : loadAgency();
  if (agencyParam && agencyId) saveAgency(agencyId);
  return { thread, visitor, replyTo: loadReply(), mode: loadMode(), agencyId };
}

export interface HandoverState {
  phase: "idle" | "preparing" | "card" | "sending";
  data: Handover | null;
  slots: TourSlot[];
  ticket: { listing: ReplyTo; lead: LeadResult; agent: ListingAgent | null } | null;
}

/** Whether the introduction is available yet: not immediately (an untouched enquiry is worth nothing to an agent), but after two real turns. */
export const introUnlocked = (thread: ChatMessage[]) => thread.filter(isPersonTurn).length >= 2;

export function useChat(init: InitialChat) {
  const [thread, setThread] = useState(init.thread);
  const [visitor, setVisitor] = useState(init.visitor);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(init.replyTo);
  const [mode, setModeState] = useState<ReplyMode>(init.mode);
  const [agencyId, setAgencyId] = useState<string | null>(init.agencyId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [liveAt, setLiveAt] = useState<number | null>(null); // index of the last reply made in THIS page view, the only one that gets quick answers
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [memory, setMemory] = useState<string | null>(null);
  const [handed, setHanded] = useState(false);
  const [handover, setHandover] = useState<HandoverState>({ phase: "idle", data: null, slots: [], ticket: null });

  // The latest values, for callbacks that outlive a render (a timer, an online event).
  const live = useRef({ thread, visitor, replyTo, mode, agencyId, busy, handed, handoverData: handover.data });
  useEffect(() => { live.current = { thread, visitor, replyTo, mode, agencyId, busy, handed, handoverData: handover.data }; });
  const startRef = useRef<() => void>(() => {});

  useEffect(() => saveThread(thread), [thread]);

  const append = useCallback((m: ChatMessage) => setThread((t) => [...t, m]), []);

  /* ── asking ──────────────────────────────────────────────────────────────── */
  /** `ctx` carries a subject that was only just attached: state has not re-rendered yet, so the ref would still hold the old one. */
  const ask = useCallback(async (messages: ChatMessage[], ctx?: AskContext) => {
    setError(null);
    setBusy(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort("timeout"), ASK_TIMEOUT_MS);
    try {
      if (!navigator.onLine) throw Object.assign(new Error("offline"), { kind: "offline" });
      const { visitor: v, agencyId: ag } = live.current;
      const r = ctx?.replyTo !== undefined ? ctx.replyTo : live.current.replyTo;
      const md = ctx?.mode ?? live.current.mode;
      const outgoing = messages.slice(-14).map((m) => ({ role: m.role, content: m.content }));
      const dream = dreamContext(loadMoodBoard());
      if (dream) outgoing.unshift({ role: "user", content: dream }); // the board shapes taste; the last line is the actual question
      const rc = replyContext(r);
      if (rc) outgoing.push({ role: "user", content: rc });
      const res = await askTayo({ visitorId: v, messages: outgoing, listingId: r?.id, agencyId: !r && ag ? ag : undefined, mode: r ? md : undefined }, ctrl.signal);
      clearTimeout(timer);
      if (!res.ok) throw Object.assign(new Error(`http ${res.status}`), { kind: res.status === 429 ? "busy" : "server" });
      const data: TojuResponse = res.data;
      if (data.error || !data.reply) throw Object.assign(new Error("empty reply"), { kind: "server" });
      unwrapEnvelope(data); // a server-side parse miss must never surface as raw JSON
      const matches = Array.isArray(data.matches) ? data.matches : [];
      const more = typeof data.more === "string" && data.more.trim() ? data.more.trim() : null;
      setLiveAt(messages.length); // the reply lands right after the messages this question was asked on
      setThread((t) => [...t, { role: "assistant", content: data.reply!, matches, priceHistory: data.priceHistory?.rows ? data.priceHistory : null, more, searched: data.searched ?? null }]);
      setSuggestions(Array.isArray(data.suggestions) ? (data.suggestions as string[]) : null);
      if (data.offerViewing && r && !live.current.handed) {
        // a price was agreed: open the introduction card straight away for a signed-in buyer, so nobody is left hunting for a button
        setTimeout(async () => { if ((await supabase.auth.getSession()).data.session) startRef.current(); }, 900);
      }
    } catch (e) {
      clearTimeout(timer);
      const err = e as { kind?: ChatError; name?: string };
      setError(err.kind ?? (err.name === "AbortError" || String(e).includes("timeout") ? "timeout" : !navigator.onLine ? "offline" : "network"));
    } finally {
      setBusy(false);
    }
  }, []);

  const send = useCallback((text: string, ctx?: AskContext) => {
    const v = text.trim();
    if (!v || live.current.busy) return;
    const next = [...live.current.thread, { role: "user", content: v } as ChatMessage];
    setThread(next);
    setSuggestions(null);
    void ask(next, ctx);
  }, [ask]);

  const retry = useCallback(() => {
    if (live.current.busy) return;
    void ask(live.current.thread); // the person's message is already in the thread: just ask again
  }, [ask]);

  // back online with a question unanswered: answer it, no tap needed
  useEffect(() => {
    const on = () => {
      const t = live.current.thread;
      if (t[t.length - 1]?.role === "user") retry();
      else setError(null);
    };
    const off = () => { if (!live.current.busy) setError("offline"); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [retry]);

  /* ── the home they are replying about ───────────────────────────────────── */
  const setMode = useCallback((m: ReplyMode) => { setModeState(m); saveMode(m); }, []);

  const attachReply = useCallback(async (id: string) => {
    saveAgency(null);
    setAgencyId(null);
    const p = await fetchReplyListing(id);
    if (!p) return null;
    setReplyTo(p);
    saveReply(p);
    return p;
  }, []);

  const stopReplying = useCallback(() => { setReplyTo(null); saveReply(null); }, []);

  /* ── conversations ──────────────────────────────────────────────────────── */
  const newChat = useCallback(() => {
    archiveThread(live.current.visitor, live.current.thread);
    clearThread();
    setVisitor(rotateVisitor());
    setThread([{ role: "assistant", content: GREETING }]);
    setSuggestions(null);
    setLiveAt(null);
    setError(null);
  }, []);

  const openArchived = useCallback((s: ArchivedChat) => {
    archiveThread(live.current.visitor, live.current.thread); // keep today's thread
    saveSessions(loadSessions().filter((x) => x.id !== s.id)); // it is live again
    const v = s.visitorId || crypto.randomUUID();
    storeVisitor(v);
    setVisitor(v);
    setThread(Array.isArray(s.messages) && s.messages.length ? s.messages : [{ role: "assistant", content: GREETING }]);
    setLiveAt(null);
  }, []);

  /* ── restore from the server (a fallback for continuing on another device) ── */
  useEffect(() => {
    const asked = init.visitor;
    let dead = false;
    restoreThread(asked).then((d) => {
      if (dead || live.current.visitor !== asked) return; // the visitor rotated (New chat) meanwhile
      const msgs = d.messages.filter((m) => !isHiddenNote(m));
      setThread((t) => {
        // never let a server copy (which has no per-message matches) clobber an equally long local thread
        if (msgs.length > t.length) return msgs;
        // the live count only rewrites the greeting while it is still the ONLY thing said
        if (Number.isFinite(d.listingCount) && t.length === 1 && t[0].role === "assistant" && t[0].content === GREETING) return [{ role: "assistant", content: greetingWith(d.listingCount) }];
        return t;
      });
      const hasThread = msgs.some((m) => m.role === "user");
      const brief = typeof d.criteria?.brief === "string" ? d.criteria.brief.trim() : "";
      if (hasThread || brief) setMemory(brief || "");
    }).catch(() => {});
    return () => { dead = true; };
  }, [init.visitor]);

  /* ── the introduction ───────────────────────────────────────────────────── */
  const startHandover = useCallback(async () => {
    const { replyTo: r, handed: h, visitor: v, thread: t } = live.current;
    if (!r || h) return;
    setHandover((s) => (s.phase === "idle" ? { ...s, phase: "preparing" } : s));
    try {
      // handing a name and number to an agency is the thing worth an account; browsing and talking to Tayo stay anonymous
      if (!(await supabase.auth.getSession()).data.session) {
        window.location.assign(signInHref("contact", window.location.pathname + window.location.search));
        return;
      }
      const data = await prepareHandover(v, r.id, t);
      let slots: TourSlot[] = [];
      try { slots = (await fetchOpenSlots(r.id, 14)).slice(0, 6); } catch { slots = []; }
      setHandover({ phase: "card", data, slots, ticket: null });
    } catch (e) {
      setHandover((s) => ({ ...s, phase: "idle" }));
      append({ role: "assistant", content: (e as Error).message || "I could not make that introduction just now." });
    }
  }, [append]);

  useEffect(() => { startRef.current = () => { void startHandover(); }; }, [startHandover]);

  const cancelHandover = useCallback(() => setHandover((s) => ({ ...s, phase: "idle", data: null })), []);

  const sendHandover = useCallback(async (slot: string | null) => {
    const { replyTo: r, visitor: v, handoverData: h } = live.current;
    if (!r || !h) return;
    setHandover((s) => ({ ...s, phase: "sending" }));
    try {
      const lead = await createLead(h, r.id, v, slot);
      // the lead went to the listing's agent, so the buyer is told who has it
      const agent = await listingAgentFor(r.id);
      setHanded(true);
      // say exactly what happened, and no more
      const by = lead.delivery_status === "delivered" ? (lead.email === "sent" ? "on WhatsApp and by email" : "on WhatsApp") : lead.email === "sent" ? "by email" : null;
      const vw = lead.viewing;
      const viewing = vw ? (vw.ok ? ` Your viewing is requested for ${new Date(vw.startsAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}; the agent confirms it.` : " I could not book that viewing slot, so the agent will propose a time.") : "";
      append({ role: "assistant", content: `Done. I have introduced you to ${agent ? `${agent.name}, the agent for` : "the agent for"} ${r.title || "this home"}${by ? ` and sent them the summary ${by}.` : ". The summary is saved on their side and they will see it in their portal."}${viewing} You will not be starting again.` });
      setHandover({ phase: "idle", data: null, slots: [], ticket: { listing: r, lead, agent } });
    } catch (e) {
      setHandover((s) => ({ ...s, phase: "card" }));
      append({ role: "assistant", content: (e as Error).message || "I could not make that introduction just now." });
    }
  }, [append]);

  return {
    thread, visitor, replyTo, mode, agencyId, busy, error, liveAt, suggestions, memory, handed, handover,
    send, retry, newChat, openArchived, attachReply, stopReplying, setMode, startHandover, cancelHandover, sendHandover, dismissMemory: () => setMemory(null),
  };
}
