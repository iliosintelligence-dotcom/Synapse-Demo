/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tayo's chat engine (was src/legacy/toju/inline-5.js; a module since 2026-10-24).
 *
 * It decides what is said and keeps the thread: what goes to the advisor service, the conversation on this device and on the
 * server, the home a conversation is about, the introduction to the agent, pins, ratings, history and the voice field. It draws
 * nothing itself. What it adds is published in small stores that the React parts draw (window.TayoView for the conversation,
 * window.TayoCanvas for the matches panel, window.TayoReply for the Replying about strip, and the stores exported here for the
 * voice hint, the introduction status and the memory note), and the parts reach it through window.TayoEngine.
 *
 * startEngine() runs once, after the page's shared scripts (matches-shared.js, auth.js, zyn.js and the like) are in, and then
 * raises `syn:tayo-engine` for the parts that wait for it.
 */

import { listingAgentFor, type ListingAgent } from "@/lib/listingAgent";

const SUPABASE_URL = "https://bhrhejpekmhbhwryjhgk.supabase.co";
const ANON_KEY = "sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV";
const ANON_HEADERS = { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY };

/* ── a small store the React parts subscribe to ── */
export type Store<T> = { get: () => T; set: (v: T) => void; subscribe: (f: () => void) => () => void };
function store<T>(initial: T): Store<T> {
  let v = initial;
  const subs = new Set<() => void>();
  return {
    get: () => v,
    set(next) { v = next; subs.forEach((f) => { try { f(); } catch { /* one listener must not stop the rest */ } }); },
    subscribe(f) { subs.add(f); return () => { subs.delete(f); }; },
  };
}

/** The line under the box when voice typing cannot start (cleared after five seconds). */
export const hintStore = store<string>("");
/** Where a signed-in buyer's introductions stand (only the agency's name is shown). */
export type HandoffRow = { stage: string; agency: string; listing: string };
export const handoffStore = store<HandoffRow[]>([]);
/** On return: what Tayo still holds of the search, from the restored thread. null = nothing to say. */
export const memoryNoteStore = store<{ brief: string } | null>(null);

const W = () => window as any;
let started = false;
let newChatFn: () => void = () => {};
/** New chat: the old thread is filed in history and the server thread starts clean. */
export function newChat() { newChatFn(); }

/** What the device knows, sent with each question: only ids and closed words, never anything typed. */
export function liveContext(SynMatches: any = W().SynMatches) {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const c: any = {
    v: 1, where: "tayo",
    surface: document.documentElement.classList.contains("syn-app") ? "app" : "web",
    tzOffsetMin: -new Date().getTimezoneOffset(),
    language: String(navigator.language || "").slice(0, 12),
  };
  try {
    const sv = Array.from(SynMatches.readSaves() as Set<string>).filter((x) => typeof x === "string" && UUID.test(x)).slice(-8);
    const recent = SynMatches.readViews().map((v: any) => v && v.id).filter((x: any) => typeof x === "string" && UUID.test(x)).slice(0, 8);
    if (sv.length) c.saved = sv;
    if (recent.length) c.recent = recent;
  } catch { /* no saves is fine */ }
  try {
    const lh = JSON.parse(localStorage.getItem("syn_last_home") || "null");
    if (lh && typeof lh.id === "string" && UUID.test(lh.id)) {
      c.lastHome = { id: lh.id, ch: String(lh.ch || "").slice(0, 20), ageMin: lh.ts ? Math.max(0, Math.round((Date.now() - Number(lh.ts)) / 60000)) : null };
    }
  } catch { /* none */ }
  return c;
}

export function startEngine() {
  if (started) return;
  started = true;
  const SynMatches = W().SynMatches;
  const SynAuth = () => W().SynAuth;

  /* The field is React's (Composer.tsx); the engine reaches it here. */
  const C = {
    r: () => W().TayoComposer,
    value(): string { const r = C.r(); return r ? r.value() : ""; },
    set(v: string) { C.r()?.set(v); },
    placeholder(p: string) { C.r()?.placeholder(p); },
    listening(on: boolean) { C.r()?.listening(on); },
    el(): HTMLInputElement | null { return C.r()?.el() || null; },
  };
  let busy = false;
  const setBusy = (b: boolean) => { busy = b; window.dispatchEvent(new CustomEvent("syn:busy", { detail: b })); };
  const STORE = "toju_chat_v1";
  const PINKEY = "toju_pins_v1";
  // stable anonymous visitor id -> server-side memory (continue anywhere this id exists)
  const VKEY = "toju_visitor_v1";
  /* The channel an agency's own link came from, read before the arrival code below tidies the address. */
  const RAW_CH = (() => { try { return new URLSearchParams(location.search).get("ch") || ""; } catch { return ""; } })();
  /* THE NEW AGENT, ONE BROWSER AT A TIME (2026-10-23). ?agent=1 switches this browser to the reasoning agent (kept until ?agent=0);
     everyone else stays on the current Tayo until the server's TOJU_AGENT switch is turned on. */
  const AGENT_ON = (() => {
    try {
      const a = new URLSearchParams(location.search).get("agent");
      if (a === "1") localStorage.setItem("toju_agent", "1");
      if (a === "0") localStorage.removeItem("toju_agent");
      return localStorage.getItem("toju_agent") === "1";
    } catch { return false; }
  })();
  let VISITOR = localStorage.getItem(VKEY) as string;
  if (!VISITOR) { VISITOR = crypto.randomUUID(); try { localStorage.setItem(VKEY, VISITOR); } catch { /* this visit only */ } }
  const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORE) as string) || []; } catch { return []; } };
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch { /* private mode */ } };
  let saved: any[] = loadSaved();

  /* ARRIVING FROM A POST OR A BIO LINK STARTS A NEW CONVERSATION.
     Tayo reopened whatever this browser last said to it, so somebody who tapped a Telegram bio link to ask about a home they had
     just seen landed in the middle of an old, unrelated thread. An arrival is a new question: it gets a clean chat, and a first
     line that asks what caught their eye. The old thread is set aside here and filed in chat history below, exactly as New chat
     files it. arrival.js has already read the channel from this URL (it runs in the head), so the parameters are taken off it
     now: a reload must not start yet another conversation.
     new=site: arriving from Synapse's own landing page (Eden: anything asked from the landing page starts a fresh chat). The
     greeting is the ordinary one: this visitor did not come from a post. */
  const ARRIVAL = (() => {
    const q = new URLSearchParams(location.search);
    const via = q.get("via");
    const names: Record<string, string> = { telegram: "Telegram", instagram: "Instagram", facebook: "Facebook",
      tiktok: "TikTok", x: "X", whatsapp: "WhatsApp", whatsapp_campaign: "WhatsApp" };
    const fromSite = q.get("new") === "site";
    const fresh = q.get("new") === "1" || fromSite || via === "bio";
    const from = names[String(q.get("ch") || "").toLowerCase()] || "";
    if (fresh) {
      ["new", "via", "ch"].forEach((k) => q.delete(k));
      const rest = q.toString();
      try { history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash); } catch { /* cosmetic */ }
    }
    return { fresh, from, social: fresh && !fromSite };
  })();
  let SET_ASIDE: { visitorId: string; messages: any[] } | null = null;
  if (ARRIVAL.fresh) {
    if (saved.some((m) => m.role === "user")) {
      SET_ASIDE = { visitorId: VISITOR, messages: saved };
      VISITOR = crypto.randomUUID(); try { localStorage.setItem(VKEY, VISITOR); } catch { /* this visit only */ }
    }
    saved = []; persist();
  }

  // shared with browse.html, see matches-shared.js + docs/STATE_CONTRACT.md
  const naira = SynMatches.naira;
  const scrollDown = () => {
    // scroll the chat pane on desktop; the window on mobile (canvas hidden)
    const convoScroll = document.querySelector<HTMLElement>(".convo-scroll");
    if (convoScroll && convoScroll.clientHeight < convoScroll.scrollHeight && getComputedStyle(convoScroll).overflowY !== "visible") {
      convoScroll.scrollTo({ top: convoScroll.scrollHeight, behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

  /* THE CONVERSATION (drawn by Conversation.tsx). Everything this engine adds to it (a reply, a message, the typing dots, an
     error, the handover card, the introduction ticket) is recorded here. */
  const View = (() => {
    let items: any[] = [], seq = 0, react = false;
    const subs = new Set<() => void>();
    const emit = () => subs.forEach((f) => { try { f(); } catch { /* one listener must not stop the rest */ } });
    return {
      get react() { return react; },
      attach() { react = true; },
      items: () => items,
      subscribe(f: () => void) { subs.add(f); return () => subs.delete(f); },
      add(it: any) { it.key = ++seq; items = items.concat([it]); emit(); return it; },
      remove(it: any) { if (!it) return; items = items.filter((x) => x !== it); emit(); },
      clear() { items = []; emit(); },
      bump() { items = items.slice(); emit(); },
    };
  })();
  W().TayoView = View;

  /* ── the MATCHES PANEL (drawn by MatchesPanel.tsx), a live preview of the Your-matches page: this engine decides which homes
     are on it. The page opens as a centered chat and morphs to 25/75 when matches land. ── */
  let canvasMatches: any[] = [];
  const cvKeys = new Set<string>();
  const keyOf = (m: any) => (m.title || "") + "|" + (m.price || "");
  function collect(matches: any) {
    if (!Array.isArray(matches)) return;
    matches.forEach((m) => { const k = keyOf(m); if (!cvKeys.has(k)) { cvKeys.add(k); canvasMatches.unshift(m); } });
  }
  const Canvas = (() => {
    let items: any[] = [], react = false;
    const subs = new Set<() => void>();
    return {
      get react() { return react; },
      attach() { react = true; },
      items: () => items,
      subscribe(f: () => void) { subs.add(f); return () => subs.delete(f); },
      set(next: any[]) { items = next; subs.forEach((f) => { try { f(); } catch { /* one listener must not stop the rest */ } }); },
      sb: { url: SUPABASE_URL, anon: ANON_KEY },
    };
  })();
  W().TayoCanvas = Canvas;
  function renderCanvas() {
    const items = canvasMatches.map(SynMatches.shapeTojuMatch);
    /* The taskbar already lists Your matches and carries a count badge, so there is no strip saying "N matches ready". */
    if (W().CustNav) W().CustNav.setCount("browse.html", items.length);
    document.body.classList.toggle("has-canvas", items.length > 0);
    Canvas.set(items);
  }
  function rebuildCanvas() {
    canvasMatches = []; cvKeys.clear();
    saved.forEach((m) => { if (m.role === "assistant") collect(m.matches); });
    /* The home they arrived about is not in the transcript -- nothing Tayo said put it there -- so a rebuild would drop it. It
       belongs on the canvas for as long as the conversation is about it. */
    if (REPLY_MATCH) collect([REPLY_MATCH]);
    renderCanvas();
  }

  const slimMatch = (m: any) => ({ id: m.id, title: m.title, price: m.price, city: m.city, listingType: m.listingType,
    pricePeriod: m.pricePeriod, bedrooms: m.bedrooms, deal: m.deal || null, verificationStatus: m.verificationStatus || null });
  const FBKEY = "toju_fb_v1";
  function loadFb() { try { return JSON.parse(localStorage.getItem(FBKEY) as string) || {}; } catch { return {}; } }
  function saveFb(m: any) { try { localStorage.setItem(FBKEY, JSON.stringify(m)); } catch { /* this visit only */ } }
  function zynFor(r: any) { return W().Zyn ? W().Zyn.img(W().Zyn.forReply(r), 58) : "T"; }
  function tojuMsg(text: string, matches?: any[] | null, priceHistory?: any, extra?: any) {
    extra = extra || {};
    const payload: any = { text: String(text || ""), more: extra.more || null, matches: (Array.isArray(matches) ? matches : []).slice(0, 6).map(slimMatch), at: Date.now() };
    payload.id = pinId(payload);
    View.add({ kind: "toju", text: String(text || ""), matches: Array.isArray(matches) ? matches : [], priceHistory: priceHistory || null,
      more: extra.more || null, searched: extra.searched || null, payload,
      zyn: zynFor({ text, matches, searched: extra.searched, priceHistory }) });
  }
  function userMsg(text: string) { View.add({ kind: "user", text: String(text || "") }); }
  /* The staged waiting words are the conversation's (Conversation.tsx, Typing). */
  function typing() {
    const it = View.add({ kind: "typing", zyn: W().Zyn ? W().Zyn.img("typing", 58) : "T" });
    return { remove: () => View.remove(it) };
  }

  // ── Dream Home board → Tayo's knowledge ──
  // Tayo reads the visitor's mood board (title, vibe chips, pinned image captions) and folds it into every conversation as silent
  // context. The message is sent to the model but never rendered in the chat; the server persists it, so restored threads carry
  // it: filter everywhere.
  const DREAM_CTX_PREFIX = "[Background from my Dream Home mood board";
  const isDreamCtx = (m: any) => m && m.role === "user" && typeof m.content === "string" && m.content.startsWith(DREAM_CTX_PREFIX);
  /* ── the listing this conversation is about ───────────────────────────
     Arrives as ?reply=<id> from the listing page. Looked up here rather than passed in the URL as text: a title and a price in a
     query string are a thing a buyer can edit, and Tayo would then be answering about a home at a price nobody is asking. Kept
     for the whole conversation, and remembered across a reload, because it is the subject rather than one message's quote. */
  const REPLY_KEY = "toju_reply_v1";
  let REPLY_TO: any = null;
  /* ASKING ABOUT AN AGENCY (Eden, 2026-10-19): from "Ask Tayo about their homes" on an agency's page (?agency=<id>). While it is
     set, and no single home is attached, Tayo answers from what Synapse holds about that agency. Kept for the tab so a reload
     does not drop the subject, and dropped when a home is attached. */
  let AGENCY_ID: string | null = null;
  try {
    const ap = new URLSearchParams(location.search).get("agency");
    if (ap && /^[0-9a-f-]{36}$/i.test(ap)) { AGENCY_ID = ap; sessionStorage.setItem("syn_agency_ctx", ap); }
    else AGENCY_ID = sessionStorage.getItem("syn_agency_ctx");
  } catch { /* storage blocked: the page still works for this visit */ }
  /* AN AGENCY'S OWN LINK (Eden, 2026-10-23): /t/<code>?ch=whatsapp, from the agency's WhatsApp, Instagram or Facebook
     auto-reply. The code is the agency's; the conversation is then about that agency's homes only (AGENCY_ID goes with every
     message), the arrival is recorded so a lead that follows is credited to the agency and the channel, and Tayo says whose
     homes it is showing. */
  (function agencyLink() {
    let code: string | null = null;
    try { code = new URLSearchParams(location.search).get("t"); } catch { return; }
    if (!code || !/^[A-Za-z0-9_-]{3,40}$/.test(code)) return;
    fetch(SUPABASE_URL + "/rest/v1/rpc/agency_link", { method: "POST", headers: ANON_HEADERS, body: JSON.stringify({ p_code: code }) })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const a = Array.isArray(rows) ? rows[0] : null;
        if (!a || !a.agency_id) return;
        AGENCY_ID = a.agency_id;
        try { sessionStorage.setItem("syn_agency_ctx", a.agency_id); } catch { /* this visit still knows */ }
        const CH: Record<string, string> = { whatsapp: "whatsapp_campaign", instagram: "instagram", facebook: "facebook", tiktok: "tiktok", telegram: "telegram" };
        const channel = CH[String(RAW_CH).toLowerCase()] || "referral";
        fetch(SUPABASE_URL + "/rest/v1/rpc/record_agency_touch", {
          method: "POST", headers: ANON_HEADERS,
          body: JSON.stringify({ p_agency_id: AGENCY_ID, p_channel: channel, p_session_id: VISITOR, p_kind: "autoreply" }),
        }).catch(() => { /* attribution is never worth breaking a conversation over */ });
        if (!saved.some((m) => m.role === "user")) {
          tojuMsg("You are talking to Tayo for **" + String(a.name || "this agency") + "** on Synapse. Tell me what you are looking for and I will show you their homes, and introduce you to them when one fits.");
        }
        try { const q = new URLSearchParams(location.search); q.delete("t"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); } catch { /* cosmetic */ }
      })
      .catch(() => { /* an unknown or unreachable code leaves an ordinary chat */ });
  })();
  /* 'discuss' = they pressed Discuss with an agent (Tayo negotiates and hands over); 'info' = they came back to a home from a
     social post or campaign (the card, and answers). Kept across a reload with the listing. */
  const MODE_KEY = "toju_reply_mode_v1";
  let REPLY_MODE = (() => { try { return localStorage.getItem(MODE_KEY) || "discuss"; } catch { return "discuss"; } })();
  const setMode = (m: string) => { REPLY_MODE = m; try { localStorage.setItem(MODE_KEY, m); } catch { /* this visit only */ } };
  function loadReply() { try { return JSON.parse(localStorage.getItem(REPLY_KEY) as string) || null; } catch { return null; } }
  function saveReply(r: any) {
    try { if (r) localStorage.setItem(REPLY_KEY, JSON.stringify(r)); else localStorage.removeItem(REPLY_KEY); }
    catch { /* private mode: the strip still works for this page view */ }
  }
  function priceLine(p: any) {
    const n = Number(p.price) || 0;
    const suffix = p.price_period === "per_year" ? "/yr" : p.price_period === "per_month" ? "/mo" : p.price_period === "per_night" ? "/night" : "";
    let money;
    try {
      money = new Intl.NumberFormat(undefined, { style: "currency", currency: (p.currency || "NGN"), currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(n);
    } catch { money = (p.currency || "NGN") + " " + n.toLocaleString(); }
    return money + suffix;
  }

  /* THE REPLYING ABOUT STRIP (drawn by ReplyStrip.tsx): this engine owns what it says and what Introduce me does. */
  const ReplyBox = (() => {
    let state: any = null, react = false;
    const subs = new Set<() => void>();
    return {
      get react() { return react; },
      attach() { react = true; },
      state: () => state,
      subscribe(f: () => void) { subs.add(f); return () => subs.delete(f); },
      set(s: any) { state = s; subs.forEach((f) => { try { f(); } catch { /* one listener must not stop the rest */ } }); },
    };
  })();
  W().TayoReply = ReplyBox;
  function renderReply() {
    if (!REPLY_TO) { ReplyBox.set(null); return; }
    const r = REPLY_TO;
    const rent = String(r.listing_type || "").toLowerCase() === "rent";
    const turns = userTurns() >= 2;
    ReplyBox.set({
      title: r.title || "this home",
      sub: priceLine(r) + (r.city ? " · " + r.city : "") + (rent ? " · rent is set by the agency" : ""),
      label: HANDED ? "Introduced" : HO_BUSY ? "Preparing…" : "Introduce me",
      disabled: HANDED || HO_BUSY || !turns,
      why: HANDED ? "Already introduced" : !turns ? "Ask Tayo about this home first" : "",
    });
  }
  function clearReply() { REPLY_TO = null; saveReply(null); renderReply(); }

  /* WHEN THE INTRODUCTION BECOMES AVAILABLE
     Not immediately. An untouched enquiry is worth nothing to an agent; offering the same thing one screen later, before a word
     has been said, would only move it. Two turns is a low bar and a real one -- it means the buyer asked something and read an
     answer. The bracketed context notes are excluded from the count: they are written by this page, not by the person. */
  let HANDED = false;
  let HO_BUSY = false;
  const userTurns = () => saved.filter((m) => m.role === "user" && !String(m.content || "").startsWith("[")).length;

  /* THE INTRODUCTION TICKET (idea: dqnamo's Ticket). The sentence "Done, I have introduced you" is easy to scroll past and hard to
     point at later. This is the same fact as something you can hold. It states what create-lead actually returned and nothing
     more: delivery_status 'delivered' says sent; anything else says saved, because that is all we know then. */
  function introTicket(p: any, d: any, agent: ListingAgent | null) {
    if (!p || !d || !d.lead_id) return;
    const ref = String(d.lead_id).replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
    const when = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const sent = d.delivery_status === "delivered";
    let img = ""; try { img = coverOf(p.property_media) || ""; } catch { img = ""; }
    const where = [priceLine(p), p.city].filter(Boolean).join(" · ");
    View.add({ kind: "ticket", title: p.title || "This home", where, when, ref, sent, img, agent });
  }

  /* The introduction. The lead is written before any WhatsApp is attempted, so a messaging outage costs the message and never
     the enquiry -- reached from here, after a conversation, which is the entire point. */
  async function handOff() {
    if (!REPLY_TO || HANDED || HO_BUSY) return;
    HO_BUSY = true; renderReply();
    try {
      if (!SynAuth()) throw new Error("Sign-in is unavailable right now.");
      const who = await SynAuth().ready();
      if (!who) {
        // Handing a name and number to an agency is the thing worth an account. Browsing and talking to Tayo stay anonymous.
        const here = location.pathname + location.search;
        location.href = "signin.html?reason=contact&next=" + encodeURIComponent(here);
        return;
      }
      /* 1. Tayo writes the summary and the message to the agent, from what was actually said. */
      const t = typing();
      const hres = await fetch(SUPABASE_URL + "/functions/v1/toju-demo", {
        method: "POST", headers: ANON_HEADERS,
        body: JSON.stringify({ action: "handover", visitorId: VISITOR, listingId: REPLY_TO.id,
          messages: saved.slice(-16).map((m) => ({ role: m.role, content: m.content })) }),
      });
      const H = await hres.json().catch(() => ({}));
      t.remove();
      if (!hres.ok || !H.message) throw new Error((H && H.error) || "I could not put the summary together just now.");
      /* 2. The viewing times the agent has open (the agent's own calendar, through the same function the listing page uses). */
      let slots: any[] = [];
      try {
        const c = await SynAuth().client();
        const r = await c.rpc("open_inspection_slots", { p_property_id: REPLY_TO.id, p_days: 14 });
        slots = (r && r.data) || [];
      } catch { slots = []; }
      /* The card: what the agent will read, the times they have free, and one button. Nothing is sent until it is pressed. */
      View.add({ kind: "handover", H, slots: (slots || []).slice(0, 6), title: (H.home && H.home.title) || REPLY_TO.title || "This home" });
    } catch (e: any) {
      tojuMsg((e && e.message) || "I could not make that introduction just now.");
      HO_BUSY = false; renderReply();
    }
  }
  const slotLabel = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  function handoverCancel(it: any) { View.remove(it); HO_BUSY = false; renderReply(); }
  /* contact: the two optional fields; ui: how the card shows sending and sent. Resolves true once the introduction is made. */
  async function sendHandover(H: any, slot: string | null, contact: { phone: string; handle: string }, ui: { sending: (on: boolean) => void; sent: () => void }) {
    ui.sending(true);
    try {
      const c = await SynAuth().client();
      const sess = await c.auth.getSession();
      const tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
      if (!tok) throw new Error("Please sign in again to be introduced.");
      /* The two optional contact fields are saved BEFORE the lead is written: create-lead copies the profile's phone onto the
         lead, and the agent reads the handle from the profile. One that does not look right stops the introduction here with a
         clear line, rather than being dropped without a word. */
      const ph = String((contact && contact.phone) || "").trim(), hd = String((contact && contact.handle) || "").trim();
      if (ph) {
        const r1 = await c.rpc("set_my_phone", { p_phone: ph });
        if (r1.error) throw new Error("That phone number does not look complete. Check it, or leave it blank.");
      }
      if (hd) {
        const r2 = await c.rpc("set_my_social_handle", { p_handle: hd });
        if (r2.error) throw new Error("That does not look like a social media handle. Check it, or leave it blank.");
      }
      const sm = H.summary || {};
      const res = await fetch(SUPABASE_URL + "/functions/v1/create-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + tok },
        body: JSON.stringify({
          property_id: REPLY_TO.id, source: "toju_chat", session_id: VISITOR || null,
          negotiation: { offer: H.openingOffer || null, advice: String(sm.position || "").slice(0, 1000), draft: H.message, summary: sm },
          slot: slot || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      // 207: the lead is saved and the WhatsApp did not go out. Still an introduction, and the agency sees it flagged.
      if (!(res.ok || res.status === 207) || !d.lead_id) throw new Error((d && d.error) || "That introduction did not go through.");
      try { if (VISITOR) c.rpc("attribute_lead", { p_lead_id: d.lead_id, p_session_id: VISITOR }).catch(() => {}); } catch { /* the lead stands */ }
      /* Who has the message: the lead went to the listing's agent, so the buyer is told their name, not "the agent". */
      const agent = await listingAgentFor(REPLY_TO.id);
      HANDED = true; HO_BUSY = false; renderReply();
      setTimeout(refreshHandoff, 1500);
      ui.sent();
      /* Say exactly what happened, and no more. */
      const by = d.delivery_status === "delivered" ? (d.email === "sent" ? "on WhatsApp and by email" : "on WhatsApp")
        : d.email === "sent" ? "by email" : null;
      const v = d.viewing;
      const viewing = v ? (v.ok ? " Your viewing is requested for " + slotLabel(v.startsAt) + "; the agent confirms it." : " I could not book that viewing slot, so the agent will propose a time.") : "";
      tojuMsg("Done. I have introduced you to " + (agent ? agent.name + ", the agent for " : "the agent for ") + (REPLY_TO.title || "this home") + (by ? " and sent them the summary " + by + "." : ". The summary is saved on their side and they will see it in their portal.") + viewing
        + " You will not be starting again.");
      try { introTicket(REPLY_TO, d, agent); } catch { /* a keepsake; the introduction stands without it */ }
      return true;
    } catch (e: any) {
      ui.sending(false);
      tojuMsg((e && e.message) || "I could not make that introduction just now.");
      return false;
    }
  }

  /* The listing the visitor arrived about, kept in the shape the canvas speaks so it can be re-seeded after a rebuild. */
  let REPLY_MATCH: any = null;
  /* THE COVER IS A PHOTO (Eden, 2026-10-02): a listing whose first upload was a video showed a blank card, because the video's URL
     went into an <img>. The first photo in display order is the cover; a video-only listing gets a still from its video. */
  const coverIsVideo = (m: any) => !!m && (m.media_type === "video" || /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(m.url || "")));
  const coverFrame = (u: string) => /res\.cloudinary\.com\/.+\/video\/upload\//.test(String(u || ""))
    ? String(u).replace("/video/upload/", "/video/upload/so_0/").replace(/\.(mp4|mov|m4v|qt|webm|3gp)(\?.*)?$/i, ".jpg")
    : null;
  const coverOf = (media: any) => {
    const s = (Array.isArray(media) ? media : []).filter((m) => m && m.url).slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const photo = s.find((m) => !coverIsVideo(m));
    return photo ? photo.url : (s.length ? coverFrame(s[0].url) : null);
  };
  /* A properties row as a Tayo match: same field names the API emits, so the card is identical to every other card on the canvas
     -- a home you asked about should not look like a different kind of object from a home Tayo found. */
  const replyMatch = (p: any) => ({
    id: p.id, img: coverOf(p.property_media), title: p.title, price: p.price, listingType: p.listing_type, city: p.city,
    bedrooms: p.bedrooms, bathrooms: p.bathrooms, areaSqm: p.area_sqm, latitude: p.latitude, longitude: p.longitude,
    verificationStatus: p.verification_status, trustScore: p.trust_score,
  });
  async function attachReply(id: string) {
    AGENCY_ID = null; try { sessionStorage.removeItem("syn_agency_ctx"); } catch { /* nothing kept */ }
    try {
      /* The extra columns turn a quote line into a card: the photograph, where the pin goes, and whether it has been checked. */
      const r = await fetch(SUPABASE_URL + "/rest/v1/properties?id=eq." + encodeURIComponent(id)
        + "&select=id,title,price,price_period,currency,listing_type,city,bedrooms,"
        + "bathrooms,area_sqm,latitude,longitude,verification_status,trust_score,"
        + "property_media(url,display_order,media_type)",
        { headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY } });
      const rows = await r.json().catch(() => []);
      const p = Array.isArray(rows) ? rows[0] : null;
      if (!p) return null;                  // gone or unpublished: no quote
      REPLY_TO = p; saveReply(p); renderReply();
      REPLY_MATCH = replyMatch(p);
      collect([REPLY_MATCH]);
      renderCanvas();
      return p;
    } catch { return null; }                // the chat still works without it
  }

  /* What Tayo is told: a bracketed aside the model reads as context and does not repeat back. The rent/sale split is the point.
     A landlord sets a rent and it is the rent, so inviting a haggle on a rental teaches a buyer to haggle over something nobody
     will move on. On a sale, a number is a fair question -- inside the price the agency set, never below it. */
  function replyContext() {
    if (!REPLY_TO) return null;
    const r = REPLY_TO;
    const rent = String(r.listing_type || "").toLowerCase() === "rent";
    let t = "[The buyer is replying about one specific listing, so answer about THIS home "
      + 'unless they clearly change the subject: "' + (r.title || "a listing") + '"'
      + (r.city ? " in " + r.city : "") + ", " + priceLine(r) + (r.bedrooms ? ", " + r.bedrooms + " bed" : "") + ". ";
    t += rent
      ? "This is a RENTAL: the rent is set by the agency and is not negotiable. Do not "
        + "invite an offer or suggest a lower figure. Answer what they ask, tell them "
        + "what to check before paying, and when they are genuinely interested say you "
        + "will introduce them to the agent."
      : "This is a SALE: a number is a fair question. Stay within the asking price the "
        + "agency set and never suggest going below it, and be clear you can carry an "
        + "offer but only the agency can accept one.";
    return t + " Never claim the home is verified unless told it is.]";
  }
  function dreamContext() {
    try {
      const b = JSON.parse(localStorage.getItem("synapse_moodboard_v1") as string);
      if (!b) return null;
      const clean = (a: any) => Array.isArray(a) ? [...new Set(a.filter(Boolean))] : [];
      const vibes = clean(b.vibe);
      // categorised signals (new boards). Fall back to raw captions for older boards.
      const areas = clean(b.areas), housing = clean(b.housing), lifestyle = clean(b.lifestyle), aesthetic = clean(b.aesthetic);
      const caps = clean(Array.isArray(b.images) ? b.images.map((i: any) => i && i.c) : []);
      const hasCat = areas.length || housing.length || lifestyle.length || aesthetic.length;
      if (!vibes.length && !caps.length && !hasCat) return null;
      let s = "[Background from my Dream Home " + (b.mode || "dream") + " board, use it to shape what you recommend without repeating it back: ";
      s += 'board "' + (b.name || "My dream home") + '"';
      if (vibes.length) s += " · the vibe I love: " + vibes.join(", ");
      if (housing.length) s += " · home types I want: " + housing.join(", ");
      if (areas.length) s += " · neighbourhoods/settings that feel right: " + areas.join(", ");
      if (lifestyle.length) s += " · lifestyle I want: " + lifestyle.join(", ");
      if (aesthetic.length) s += " · interior aesthetic: " + aesthetic.join(", ");
      if (!hasCat && caps.length) s += " · spaces I keep pinning: " + caps.join(", ");
      return s + ". Weight neighbourhood and home-type signals for what you surface; treat aesthetic/vibe as tone, not a hard filter.]";
    } catch { return null; }
  }

  /* If reply is still the model's JSON envelope, lift its fields up onto the response object in place, so every downstream reader
     (reply, matches, suggestions) sees the unwrapped values. Tolerates a ```json fence, and leaves anything it cannot parse.
     ENVELOPE_KEYS only ever appear in the control envelope: they recognise a tail of JSON appended AFTER the prose (which once put
     `{"showMatches": false, "criteria": {...` in front of a buyer) without cutting a sentence that legitimately contains a brace. */
  const ENVELOPE_KEYS = /"(showMatches|criteria|suggestions|matches)"\s*:/;
  function splitTrailingEnvelope(data: any) {
    const text = data.reply;
    let i = -1;
    /* The LAST brace that opens something envelope-shaped: an earlier one may belong to the sentence. */
    for (let at = text.indexOf("{"); at !== -1; at = text.indexOf("{", at + 1)) {
      if (ENVELOPE_KEYS.test(text.slice(at, at + 400))) i = at;
    }
    if (i <= 0) return false;
    const prose = text.slice(0, i).trim();
    if (!prose) return false;               // nothing left to say: leave it alone
    data.reply = prose;
    try {
      const inner = JSON.parse(text.slice(i));
      if ((!Array.isArray(data.matches) || !data.matches.length) && Array.isArray(inner.matches)) data.matches = inner.matches;
      if ((!Array.isArray(data.suggestions) || !data.suggestions.length) && Array.isArray(inner.suggestions)) data.suggestions = inner.suggestions;
    } catch { /* truncated tails are common; the prose is already saved */ }
    return true;
  }
  function unwrapEnvelope(data: any) {
    if (typeof data.reply !== "string") return;
    let raw = data.reply.trim();
    if (!raw.startsWith("{") && !raw.startsWith("```")) {
      /* Not envelope-first -- but it may still be prose with an envelope welded onto the end. */
      if (ENVELOPE_KEYS.test(raw)) splitTrailingEnvelope(data);
      return;
    }
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    if (!raw.startsWith("{")) return;
    let inner;
    try {
      inner = JSON.parse(raw);
    } catch {
      /* Envelopes arrive truncated often enough that a strict parse is not sufficient. Salvage just the reply string; nothing
         readable leaves it empty, so ask() shows its error and never the envelope itself (Greptile audit). */
      const m = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      let said = "";
      if (m) { try { said = JSON.parse('"' + m[1] + '"'); } catch { said = ""; } }
      data.reply = said;
      return;
    }
    if (!inner || typeof inner.reply !== "string") { data.reply = ""; return; }
    data.reply = inner.reply;
    if ((!Array.isArray(data.matches) || !data.matches.length) && Array.isArray(inner.matches)) data.matches = inner.matches;
    if ((!Array.isArray(data.suggestions) || !data.suggestions.length) && Array.isArray(inner.suggestions)) data.suggestions = inner.suggestions;
  }

  /* LIVE CONTEXT. What this device knows about what the buyer is doing, sent with every message so Tayo does not start from
     nothing: the app or the website, the home they last opened and the post it came from, the homes they looked at lately and
     saved, and the hour on their clock. Only ids and a few closed words leave the phone (toju-demo/live-context.ts). */
  async function ask() {
    clearError();
    const t = typing();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort("timeout"), 50000);   // a price-history search can take ~30s
    try {
      if (!navigator.onLine) throw Object.assign(new Error("offline"), { kind: "offline" });
      const outgoing = saved.slice(-14).map((m) => ({ role: m.role, content: m.content }));
      const dream = dreamContext();
      if (dream) outgoing.unshift({ role: "user", content: dream });
      /* After the dream board, so the listing is the nearer context: the board shapes taste, this is the actual question. */
      const reply = replyContext();
      if (reply) outgoing.push({ role: "user", content: reply });
      const res = await fetch(SUPABASE_URL + "/functions/v1/toju-demo", {
        method: "POST", headers: ANON_HEADERS,
        body: JSON.stringify({ visitorId: VISITOR, messages: outgoing, context: liveContext(), agent: AGENT_ON || undefined, listingId: (REPLY_TO && REPLY_TO.id) || undefined, agencyId: (!REPLY_TO && AGENCY_ID) || undefined, mode: REPLY_TO ? REPLY_MODE : undefined }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      clearTimeout(timer); t.remove();
      if (!res.ok) throw Object.assign(new Error("http " + res.status), { kind: res.status === 429 ? "busy" : "server" });
      if (data.error || !data.reply) throw Object.assign(new Error("empty reply"), { kind: "server" });
      /* Guard: when the function's own envelope parse fails it passes the raw text through; unwrap it here so a server-side parse
         miss can never surface as raw JSON. */
      unwrapEnvelope(data);
      // show the canvas whenever the function returns matches, so "show me what you found" always renders them.
      const matches = Array.isArray(data.matches) ? data.matches : [];
      const priceHistory = data.priceHistory && Array.isArray(data.priceHistory.rows) ? data.priceHistory : null;
      const extra = { more: typeof data.more === "string" && data.more.trim() ? data.more.trim() : null, searched: data.searched || null };
      saved.push({ role: "assistant", content: data.reply, matches, priceHistory, more: extra.more, searched: extra.searched });
      persist();
      tojuMsg(data.reply, matches, priceHistory, extra);
      /* A voice call (VoiceCall.tsx) reads the reply aloud. */
      window.dispatchEvent(new CustomEvent("syn:tayo-reply", { detail: { text: data.reply, matches: matches.length } }));
      collect(matches); renderCanvas();
      renderReply();   // the introduction unlocks once there is a conversation
      /* A price was agreed: open the viewing card straight away (the agent's open times, then the introduction), so the buyer is
         never left hunting for a button. Signed-out buyers keep the button, which sends them to sign in. */
      if (data.offerViewing && REPLY_TO && !HANDED) {
        setTimeout(async () => {
          try { if (SynAuth() && await SynAuth().ready()) handOff(); }
          catch { /* the button is still there */ }
        }, 900);
      }
    } catch (e: any) {
      clearTimeout(timer); t.remove();
      const kind = e && e.kind ? e.kind : (e && e.name === "AbortError") ? "timeout" : !navigator.onLine ? "offline" : "network";
      showError(kind);
      window.dispatchEvent(new CustomEvent("syn:tayo-failed", { detail: { kind } }));
    }
    setBusy(false); scrollDown();
  }

  /* ── error states ──────────────────────────────────────────────────────
     An error is NOT a Tayo message: it never enters the saved thread and never speaks in Tayo's voice (he didn't say it, the
     connection failed). It names the real cause, says what happens to the question, and offers the one action that fixes it. */
  const ERRORS: Record<string, { icon: string; ttl: string; msg: string; auto?: boolean }> = {
    offline: { icon: "unverified", ttl: "You're offline", msg: "Your question is saved. I’ll answer as soon as you’re back online.", auto: true },
    timeout: { icon: "pending", ttl: "That took too long", msg: "The connection is slow right now. Your question is still here, try again?" },
    busy: { icon: "pending", ttl: "A lot of people are asking at once", msg: "Give it a few seconds and try again, your question is saved." },
    server: { icon: "unverified", ttl: "I couldn’t reach my advisor service", msg: "This is on our side, not yours. Your question is saved, try again in a moment." },
    network: { icon: "unverified", ttl: "Couldn’t connect", msg: "Check your connection and try again, your question is saved." },
  };
  let errItem: any = null;
  function clearError() { if (errItem) { View.remove(errItem); errItem = null; } }
  function showError(kind: string) {
    const e = ERRORS[kind] || ERRORS.network;
    const ic = (W().SynIcons && W().SynIcons.has(e.icon)) ? W().SynIcons.svg(e.icon) : "!";
    errItem = View.add({ kind: "error", err: e, icon: ic });
  }
  function retry() {
    if (busy) return;
    clearError();
    setBusy(true);
    ask();   // the user's message is already in `saved`, just re-ask
  }
  // came back online with a question still unanswered → answer it, no tap needed
  window.addEventListener("online", () => {
    const last = saved[saved.length - 1];
    if (errItem && last && last.role === "user") retry();
    else clearError();
  });
  window.addEventListener("offline", () => { if (!busy) { clearError(); showError("offline"); } });

  function send(text?: string) {
    const v = (text != null ? text : C.value()).trim();
    if (!v || busy) return;
    setBusy(true); C.set("");
    saved.push({ role: "user", content: v });
    persist();
    userMsg(v);
    ask();
  }

  /* ───────── voice typing (Web Speech API) ───────── */
  const SR = W().SpeechRecognition || W().webkitSpeechRecognition;
  const inIframe = window.self !== window.top;
  let recog: any = null, listening = false, hintTimer: ReturnType<typeof setTimeout> | undefined;
  function hint(msg: string) {
    hintStore.set(msg);
    clearTimeout(hintTimer); hintTimer = setTimeout(() => hintStore.set(""), 5000);
  }
  function stopMicUI() { listening = false; C.listening(false); C.placeholder("Tell Tayo what you're looking for…"); }
  function startMic() {
    recog = new SR();
    // en-NG is rejected by many Chrome builds ("language-not-supported"); en-US is universally supported and handles
    // Nigerian-accented English fine.
    try { recog.lang = (navigator.language && /^en/i.test(navigator.language)) ? navigator.language : "en-US"; } catch { recog.lang = "en-US"; }
    recog.interimResults = true; recog.continuous = true;
    const base = C.value().trim() ? C.value().trim() + " " : "";
    recog.onresult = (e: any) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      C.set(base + txt);
    };
    // exhaustive: no error path is silent
    recog.onerror = (e: any) => {
      stopMicUI();
      switch (e.error) {
        case "not-allowed": case "service-not-allowed":
          hint(inIframe
            ? "Open this page in its own browser tab to use voice, it’s blocked inside the embedded preview."
            : "Microphone is blocked. Click the 🔒 icon in the address bar → Allow, then tap the mic again."); break;
        case "no-speech": hint("Didn’t catch that, tap the mic and speak."); break;
        case "audio-capture": hint("No microphone found, check it’s connected, then try again."); break;
        case "network": hint("Voice needs a connection, check your network and try again."); break;
        case "aborted": break; // user stopped it, no message needed
        case "language-not-supported":
          if (recog.lang !== "en-US") { recog.lang = "en-US"; try { recog.start(); listening = true; C.listening(true); return; } catch { /* falls through to the line below */ } }
          hint("Voice isn’t available in your browser here, try Chrome or Edge."); break;
        default: hint("Voice hit a snag, tap the mic to try again.");
      }
    };
    recog.onend = () => stopMicUI();
    try { recog.start(); listening = true; C.listening(true); C.placeholder("Listening… speak now"); C.el()?.focus(); }
    catch { stopMicUI(); hint("Couldn’t start voice, tap the mic to try again."); }
  }
  async function toggleMic() {
    if (!SR) { hint("Voice typing needs Chrome or Edge on this device."); return; }
    if (!window.isSecureContext) { hint("Voice needs a secure page, open the app on localhost or https, not a raw IP address."); return; }
    if (listening) { try { recog?.stop(); } catch { /* already stopped */ } stopMicUI(); return; }
    // Ask for mic permission the reliable way (getUserMedia shows the prompt); SpeechRecognition alone often throws
    // "not-allowed" without ever asking.
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop()); // we only needed the grant
      } catch (err: any) {
        stopMicUI();
        const n = err && err.name;
        if (n === "NotAllowedError" || n === "SecurityError") {
          hint(inIframe
            ? "Open this page in its own browser tab to use voice, the embedded preview blocks the mic."
            : "Mic access is blocked for this site. Click the 🔒 (or camera) icon in the address bar → set Microphone to Allow → then tap the mic again.");
        } else if (n === "NotFoundError" || n === "DevicesNotFoundError") {
          hint("No microphone found on this device.");
        } else {
          hint("Couldn’t reach the mic, check your browser’s microphone permissions and try again.");
        }
        return;
      }
    }
    startMic();
  }

  /* First-visit greeting. Mirrors FIRST_VISIT_GREETING in the toju-demo edge function. Never hardcode a number here: a stale
     count is a trust bug. The count arrives with the restore response and the greeting is rewritten in place. The token carries
     its own article ("the 6 ") so the sentence still stands when no count is available. It does not promise everything is
     verified: Tayo shows both and says which is which. */
  const GREETING_TEMPLATE =
    "I'm Tayo. I'll find you a home from {{LISTING_COUNT}}homes agencies have listed with us.\n\n"
    + "What's prompting the move?";
  const greetingWith = (n: number | null) =>
    GREETING_TEMPLATE.replace("{{LISTING_COUNT}}", Number.isFinite(n) && (n as number) > 0 ? "the " + (n as number).toLocaleString() + " " : "the ");
  const GREETING = greetingWith(null);
  /* For somebody who arrived from a post: they already have a home in mind, so the first question is which one. */
  const arrivalGreeting = (from: string) =>
    "I'm Tayo, Synapse's property advisor. "
    + (from ? "Did a home on our " + from + " catch your eye?" : "Did one of our posts catch your eye?")
    + " Tell me which one, the area or the price is enough, or tell me what you’re looking for.";
  const FIRST_GREETING = ARRIVAL.social ? arrivalGreeting(ARRIVAL.from) : GREETING;

  function render() {
    View.clear();
    saved.forEach((m) => { if (isDreamCtx(m)) return; (m.role === "user" ? userMsg(m.content) : tojuMsg(m.content, Array.isArray(m.matches) ? m.matches : [], m.priceHistory || null, { more: m.more || null, searched: m.searched || null })); });
    rebuildCanvas();
  }
  // scrub any hidden context that leaked into storage before the filter existed
  if (saved.some(isDreamCtx)) { saved = saved.filter((m) => !isDreamCtx(m)); persist(); }
  if (saved.length === 0) { saved = [{ role: "assistant", content: FIRST_GREETING }]; persist(); }
  render();
  // Server restore, strictly a fallback for continuing on another device. Drop hidden dream-context messages, ignore the response
  // if the visitor rotated (New chat) meanwhile, and never let a server copy (which has no per-message matches) clobber an equally
  // long local thread.
  const restoreFor = VISITOR;
  fetch(SUPABASE_URL + "/functions/v1/toju-demo", {
    method: "POST", headers: ANON_HEADERS,
    body: JSON.stringify({ action: "restore", visitorId: VISITOR }),
  }).then((r) => r.json()).then((d) => {
    if (VISITOR !== restoreFor) return;
    const msgs = (Array.isArray(d.messages) ? d.messages : []).filter((m: any) => !isDreamCtx(m));
    if (msgs.length > saved.length) { saved = msgs; persist(); render(); }
    // Live inventory count → the greeting's placeholder, only while the greeting is still the ONLY thing said: once a
    // conversation has started, editing Tayo's first line under the user would be dishonest. An arrival's greeting has no count.
    if (Number.isFinite(d.listingCount) && saved.length === 1 && saved[0].role === "assistant" && saved[0].content === GREETING) {
      saved[0].content = greetingWith(d.listingCount);
      persist(); render();
    }
    /* Make the memory visible: on return, a quiet line stating what Tayo still holds -- the brief the person gave, never a
       generic "welcome back". No brief and no prior exchange: nothing. */
    const hasThread = msgs.some((m: any) => m.role === "user");
    const brief = d.criteria && typeof d.criteria.brief === "string" ? d.criteria.brief.trim() : "";
    if ((hasThread || brief) && !memoryNoteStore.get()) memoryNoteStore.set({ brief });
  }).catch(() => {});

  /* Shortening a scroller does not move its scrollTop, so when the keyboard opens the message you were reading slides up behind
     the composer. Re-pin to the bottom, but only if you were already there. */
  document.documentElement.addEventListener("syn:keyboard", (e) => {
    const d = (e as CustomEvent).detail;
    if (!d || !d.open) return;
    const sc = document.querySelector(".convo-scroll");
    if (!sc) return;
    if ((sc.scrollHeight - sc.scrollTop - sc.clientHeight) < 220) requestAnimationFrame(() => { sc.scrollTop = sc.scrollHeight; });
  });

  /* ?reply=<listing id> from the listing page, ?home=<id> from a social post or campaign, otherwise restored from storage so a
     reload does not drop the subject. TAYO SPEAKS FIRST: attaching the listing and then waiting made the visitor open a
     conversation about a home they had just been reading. Skipped when ?ask= is also present: the visitor's own words outrank
     a generic opener. */
  const params = new URLSearchParams(location.search);
  const replyParam = params.get("reply"), askParam = params.get("ask"), homeParam = params.get("home");
  if (replyParam) {
    setMode("discuss");
    try { history.replaceState(null, "", location.pathname); } catch { /* cosmetic */ }
    attachReply(replyParam).then((p) => { if (p && !askParam) send("Tell me about this home."); });
  } else if (homeParam) {
    setMode("info");
    try { history.replaceState(null, "", location.pathname); } catch { /* cosmetic */ }
    attachReply(homeParam).then((p) => { if (p && !askParam) send("Tell me about this home."); });
  } else {
    REPLY_TO = loadReply();
    renderReply();
    /* COMING BACK TO THE APP after meeting a home on social: nothing said yet here, a home remembered from a recent visit that
       came through a channel. Put its card up and let them ask. */
    try {
      const lh = JSON.parse(localStorage.getItem("syn_last_home") || "null");
      const fresh = lh && lh.id && lh.ch && (Date.now() - Number(lh.ts || 0)) < 14 * 864e5;
      if (fresh && !REPLY_TO && !askParam && !(saved && saved.length) && !JSON.parse(localStorage.getItem("toju_sessions_v1") || "[]").length) {
        setMode("info");
        attachReply(lh.id).then((p) => { if (p) send("Tell me about this home."); });
      }
    } catch { /* storage blocked: the chat simply opens as usual */ }
  }
  /* ?ask=… from a listing or the landing hero: sent, so someone who typed their brief on the landing page lands mid-conversation.
     The URL is cleaned so a reload doesn't re-ask the same thing. */
  if (askParam) {
    const q = askParam.slice(0, 300).trim();
    try { history.replaceState(null, "", location.pathname); } catch { /* cosmetic */ }
    if (q) setTimeout(() => send(q), 60);
  }

  /* ── chat history: every conversation is kept, with the homes it surfaced. A session archives on "New chat" (or when you open
     an older one) and can be picked back up: its visitorId comes back too, so Tayo's server-side memory continues. ── */
  const SESS = "toju_sessions_v1";
  const loadSessions = (): any[] => { try { return JSON.parse(localStorage.getItem(SESS) as string) || []; } catch { return []; } };
  const saveSessions = (s: any[]) => { try { localStorage.setItem(SESS, JSON.stringify(s.slice(0, 30))); } catch { /* full */ } };
  function archiveThread(visitorId: string, messages: any[]) {
    if (!messages.some((m) => m.role === "user")) return; // nothing worth keeping
    const first = messages.find((m) => m.role === "user");
    const sessions = loadSessions().filter((s) => s.visitorId !== visitorId);
    sessions.unshift({
      id: crypto.randomUUID(), visitorId, endedAt: Date.now(),
      title: String(first.content).slice(0, 80),
      homes: messages.reduce((n, m) => n + (Array.isArray(m.matches) ? m.matches.length : 0), 0),
      messages,
    });
    saveSessions(sessions);
  }
  const archiveCurrent = () => archiveThread(VISITOR, saved);
  // The thread an arrival set aside, filed now that history exists.
  if (SET_ASIDE) { archiveThread(SET_ASIDE.visitorId, SET_ASIDE.messages); SET_ASIDE = null; }
  function openSession(id: string) {
    const s = loadSessions().find((x) => x.id === id);
    if (!s) return;
    archiveCurrent();                                           // keep today's thread
    saveSessions(loadSessions().filter((x) => x.id !== s.id));  // it's live again
    VISITOR = s.visitorId || crypto.randomUUID();
    try { localStorage.setItem(VKEY, VISITOR); } catch { /* this visit only */ }
    saved = Array.isArray(s.messages) ? s.messages : [];
    if (!saved.length) saved = [{ role: "assistant", content: GREETING }];
    persist(); render();
  }
  newChatFn = () => {
    archiveCurrent();
    localStorage.removeItem(STORE);
    VISITOR = crypto.randomUUID(); try { localStorage.setItem(VKEY, VISITOR); } catch { /* this visit only */ }
    saved = [{ role: "assistant", content: GREETING }]; persist(); View.clear(); tojuMsg(GREETING);
    rebuildCanvas();
  };

  /* ── PIN AND SHARE (Eden, 2026-10-03) ─────────────────────────────────
     A pin keeps a Tayo reply, and the homes under it, in this browser. Sharing sends the words and a link to each home through
     the phone's own share sheet; where there is none, it copies them. Nothing is uploaded. */
  function loadPins(): any[] { try { return JSON.parse(localStorage.getItem(PINKEY) as string) || []; } catch { return []; } }
  function savePins(p: any[]) { try { localStorage.setItem(PINKEY, JSON.stringify(p.slice(0, 100))); } catch { /* full */ } }
  function pinId(pl: any) {
    const src = String(pl.text || "") + "|" + (pl.matches || []).map((m: any) => m.id).join(",");
    let h = 5381; for (let i = 0; i < src.length; i++) h = ((h << 5) + h + src.charCodeAt(i)) | 0;
    return "p" + (h >>> 0).toString(36);
  }
  const isPinned = (id: string) => loadPins().some((x) => x.id === id);
  const absLink = (id: string) => new URL(SynMatches.propertyHref(id), location.href).href;
  function shareText(pl: any) {
    const homes = (pl.matches || []).map((m: any) => "• " + (m.title || "Listing") + (Number(m.price) > 0 ? " · " + naira(m.price) : "") + "\n  " + absLink(m.id));
    return "Tayo, Synapse's property advisor:\n\n" + pl.text + (pl.more ? "\n\n" + pl.more : "")
      + (homes.length ? "\n\n" + homes.join("\n") : "") + "\n\n" + location.origin + "/app/toju.html?new=site";
  }
  /* Thumbs: one rating per reply, tapping it again takes it back. Kept on this device for the pressed state, and a new rating is
     sent to the team so ratings teach something. The visitor's own words are never sent. Returns the rating (null = taken back). */
  function rateValue(pl: any, want: string) {
    const map = loadFb();
    const clearing = map[pl.id] === want;
    if (clearing) delete map[pl.id]; else map[pl.id] = want;
    saveFb(map);
    if (clearing) return null;
    fetch(SUPABASE_URL + "/rest/v1/rpc/record_toju_feedback", {
      method: "POST", headers: ANON_HEADERS,
      body: JSON.stringify({ p_reply_id: String(pl.id), p_rating: want, p_excerpt: String(pl.text || "").slice(0, 300) }),
      keepalive: true,
    }).catch(() => {});
    return want;
  }
  function togglePin(pl: any) {
    let pins = loadPins();
    const on = !pins.some((x) => x.id === pl.id);
    pins = on ? [pl].concat(pins) : pins.filter((x) => x.id !== pl.id);
    savePins(pins);
    return on;
  }

  /* WHERE YOUR INTRODUCTION IS. A signed-in buyer who has been introduced to an agency sees whether the agency has it, whether an
     agent holds it, and whether one has taken over the conversation. A visitor who is not signed in, or has no introduction,
     sees nothing at all. */
  function refreshHandoff() {
    if (!SynAuth()) return;
    SynAuth().client().then((c: any) => c.auth.getSession().then((s: any) => {
      if (!(s && s.data && s.data.session)) { handoffStore.set([]); return null; }
      return c.rpc("my_handoff_status");
    })).then((r: any) => { if (r) handoffStore.set(!r.error && Array.isArray(r.data) ? r.data : []); }).catch(() => {});
  }
  refreshHandoff();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshHandoff(); });

  /* What the React panels ask of the engine (HistorySheet.tsx, PinnedSheet.tsx). The engine stays the one place that writes
     conversations and pins, so the two can never disagree. */
  window.addEventListener("syn:open-session", (e) => { const d = (e as CustomEvent).detail; if (d && d.id) openSession(d.id); });
  window.addEventListener("syn:delete-session", (e) => { const id = (e as CustomEvent).detail?.id; saveSessions(loadSessions().filter((s) => s.id !== id)); });
  window.addEventListener("syn:unpin", (e) => { const id = (e as CustomEvent).detail?.id; savePins(loadPins().filter((x) => x.id !== id)); View.bump(); });
  /* Sharing from a panel: the phone's own share menu where there is one, otherwise copied, with a toast to say so. */
  const shareFromPanel = (text: string) => {
    if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
    const copied = () => { W().SynToast?.("Copied"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(copied, () => window.prompt("Copy this to share it:", text));
    else window.prompt("Copy this to share it:", text);
  };
  window.addEventListener("syn:share-pin", (e) => { const pl = loadPins().find((x) => x.id === (e as CustomEvent).detail?.id); if (pl) shareFromPanel(shareText(pl)); });
  window.addEventListener("syn:share-pins", () => { const pins = loadPins(); if (pins.length) shareFromPanel(pins.map(shareText).join("\n\n- - -\n\n")); });

  W().TayoEngine = {
    send: (text?: string) => send(text), toggleMic: () => toggleMic(),
    scrollDown, retry, shareText, togglePin, rateValue, handoverCancel, clearReply, handOff: () => handOff(),
    isPinned, ratingOf: (id: string) => loadFb()[id] || null,
    handoverSend: (H: any, slot: string | null, contact: any, ui: any) => sendHandover(H, slot, contact, ui),
    propertyHref: (id: string) => SynMatches.propertyHref(id),
  };

  /* THE ENGINE IS READY: the React parts that talk to it (Composer, Conversation, MatchesPanel, ReplyStrip) wait for this. */
  W().TayoEngineReady = true;
  window.dispatchEvent(new Event("syn:tayo-engine"));
}
