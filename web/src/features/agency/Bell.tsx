"use client";
/**
 * The notification bell, as React (was the bell block of src/legacy/agency/inline-3.js): the button and its count, the panel,
 * the list of things already dealt with, what the items are and where each one goes. The state they are derived from (listings,
 * leads, posts, tasks) stays in portalData and is read through its window API.
 *
 * Talking to the rest of the page: portalShell's renderNoti() fires `syn:noti-refresh` and toggleNoti(open) fires `syn:noti-toggle`
 * (both kept as names, since the page and the account menu call them); `syn:listings` refreshes too.
 */
import { Fragment, useEffect, useSyncExternalStore } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";
import { due, spanWords, waiting } from "./funnel";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

type Item = { key: string; type: string; tag: string; icon: string; pane?: string; task?: string; action?: string; title: string; sub: string; group?: string };

type State = { open: boolean; items: Item[] };
let state: State = { open: false, items: [] };
const subs = new Set<() => void>();
const set = (v: Partial<State>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useBell = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);

/* A notification you have opened (or cleared) is dealt with: it leaves the bell. Items are derived from state, so what identifies
   one is its text, and that carries the count ("3 new leads"). It comes back only when the facts change (a fourth lead), never
   just because the page re-rendered. Kept per browser. */
const SEEN_KEY = "syn-noti-handled";
let handled: Record<string, number> = {};
let handledRead = false;
function readHandled() {
  if (handledRead) return;
  handledRead = true;
  try { handled = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; } catch { handled = {}; }
}
function handle(keys: string[]) {
  keys.forEach((k) => { if (k) handled[k] = Date.now(); });
  /* Capped, so it cannot grow for ever: the oldest 200 go first. */
  const live: Record<string, number> = {};
  Object.keys(handled).sort((a, b) => handled[b] - handled[a]).slice(0, 200).forEach((k) => { live[k] = handled[k]; });
  handled = live;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(handled)); } catch { /* private mode: handled for this visit only */ }
}

function refresh() {
  readHandled();
  let all: Item[] = [];
  try { all = deriveItems(); } catch (e) { console.error("bell", e); }   // the bell is never worth an error
  set({ items: all.filter((n) => !handled[n.key]) });
}
const setOpen = (open: boolean) => set({ open });

/* ── WHAT THE ITEMS ARE ──
   Notifications are DERIVED from real state, never authored. The previous list named a buyer, a lead SLA and three properties
   that do not exist, so the bell always showed four unread items about nothing. Each item carries a `pane` (or a task, or an
   action) so clicking it takes you to the thing it is about, which is the only reason to show it at all. The state is read
   through portalData's window API (SynListingsData, SynFreshness, SynLeads, SynPosts, openTasks, SynDbBacked). `key` identifies an
   item in the handled list, so it keeps the form it always had. */
const esc2 = (s: unknown) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const notiKey = (n: Omit<Item, "key">) => [n.type, n.pane || "", n.task || "", n.title, n.sub].join("|");
const plural = (n: number, w: string) => n + " " + w + (n === 1 ? "" : "s");
const call = (name: string, ...a: any[]) => (typeof W()[name] === "function" ? W()[name](...a) : undefined);

function deriveItems(): Item[] {
  const out: (Omit<Item, "key"> & { key?: string })[] = [];
  const L: any[] = call("SynListingsData") || [];
  const fresh = (l: any) => { try { return W().SynFreshness(l) || {}; } catch { return {}; } };

  const pending = L.filter((l) => l.verification_status !== "verified");
  if (pending.length) out.push({ type: "verification", tag: "Verification", icon: "shield", pane: "listings",
    title: plural(pending.length, "listing") + " awaiting verification",
    sub: pending.length === 1 ? (pending[0].title || pending[0].t) : "Not yet checked by Synapse", group: "Today" });

  /* Warned BEFORE a listing goes dark (`warn`), and again once it has. */
  const expiring = L.filter((l) => fresh(l).warn);
  if (expiring.length) out.push({ type: "reminder", tag: "Reminder", icon: "pending", pane: "listings",
    title: plural(expiring.length, "listing") + " expiring soon",
    sub: "Re-list to keep " + (expiring.length === 1 ? "it" : "them") + " visible to buyers", group: "Today" });
  const expired = L.filter((l) => fresh(l).expired);
  if (expired.length) out.push({ type: "reminder", tag: "Reminder", icon: "pending", pane: "listings",
    title: plural(expired.length, "listing") + " expired", sub: "Hidden from buyers until re-listed", group: "Today" });

  const leads: any[] = call("SynLeads") || [];
  const newLeads = leads.filter((x) => x.stage === "New");
  /* Past five minutes a new lead is going cold, so the bell says how long the oldest has waited. */
  const waits = newLeads.map((x) => waiting(x)).filter(Boolean) as { mins: number; urgent: boolean }[];
  const oldest = waits.reduce((m, w) => Math.max(m, w.mins), 0);
  if (newLeads.length) out.push({ type: "lead", tag: waits.some((w) => w.urgent) ? "Reply now" : "Lead", icon: "user", pane: "crm",
    title: plural(newLeads.length, "new lead"), sub: waits.length ? "Oldest waiting " + spanWords(oldest) + " for a first reply" : "Waiting on a first response", group: "Today",
    /* Keyed without the age, which changes every minute: a dismissed item comes back with a new lead, not with the clock. */
    key: notiKey({ type: "lead", tag: "", icon: "", pane: "crm", title: plural(newLeads.length, "new lead"), sub: "Waiting on a first response" }) });
  /* Next steps the agents set on their leads, once due. */
  const owed = leads.filter((x) => { const d = due(x.nextAt); return d && (d.late || d.today); });
  if (owed.length) out.push({ type: "reminder", tag: "Next step", icon: "pending", pane: "crm",
    title: owed.length === 1 ? owed[0].nm + ": " + owed[0].nba.do : plural(owed.length, "next step") + " due",
    sub: owed.some((x) => due(x.nextAt)!.late) ? (owed.length === 1 ? "Overdue" : "Some are overdue") : "Due today", group: "Today" });

  /* Lost leads someone asked to check back on (lost for timing), once the day comes. Loaded when the scripts are ready. */
  const backDue = ((W().SYN_LOST_BACK || []) as any[]).filter((x) => { const d = due(x.next_action_at); return d && (d.late || d.today); });
  if (backDue.length) out.push({ type: "reminder", tag: "Check back", icon: "pending", pane: "", action: "crm-today",
    title: backDue.length === 1 ? "Check back in with " + (backDue[0].consumer_name || "a buyer") : "Check back in with " + plural(backDue.length, "buyer"),
    sub: "Lost for timing. They said not now", group: "Today" });

  const posts: any[] = call("SynPosts") || [];
  const appr = posts.filter((p) => p.stage === "approval");
  if (appr.length) out.push({ type: "social", tag: "Social", icon: "share", pane: "social",
    title: plural(appr.length, "post") + " awaiting approval", sub: "In the social studio", group: "Today" });

  /* Things only the agency can do, until marked done. A Telegram channel title is whatever its owner typed: the bell draws text,
     not markup. The key is built from the escaped text, as it was when the bell drew markup. */
  ((call("openTasks") || []) as any[]).forEach((t) => {
    const n = { type: "setup", tag: "Only you", icon: "pending", pane: "", task: t.id, title: t.title, sub: t.where || "Tap to see what to do", group: "To do" };
    out.push({ ...n, key: notiKey({ ...n, title: esc2(n.title), sub: esc2(n.sub) }) });
  });
  /* A FACE ON EVERY LISTING (2026-10-25): the listing page shows the photo of the agent who answers for it. Known once the
     signed-in member's profile has loaded; opening it opens their profile. */
  if (W().SYN_MY_FACE === false) out.push({ type: "setup", tag: "Your profile", icon: "user", pane: "", action: "my-profile",
    title: "Add your photo", sub: "Buyers see your face and name on the listings you post", group: "To do" });
  /* AUTO-REPLY LINKS (Eden, 2026-10-23: a notification and a pop-up, not a big card). Known once AutoReplyLinks.tsx has read the
     agency's code; opening it opens the pop-up. */
  if (W().SYN_AUTOREPLY && W().SYN_AUTOREPLY.code) out.push({ type: "social", tag: "Auto-replies", icon: "share", pane: "", action: "autoreply",
    title: "Your auto-reply links are ready", sub: "Add one to your WhatsApp, Instagram or Facebook auto-reply", group: "To do" });

  /* The free days (Eden, 2026-10-03: "notify them about this"), from the day the paywall switches on until the day it applies. */
  const pw = W().SYN_PAYWALL;
  if (pw && pw.paywall_on && !pw.enforced && pw.free_until && new Date(pw.free_until) > new Date()) {
    const until = new Date(pw.free_until).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    out.unshift({ type: "billing", tag: "Plans", icon: "card", pane: "billing", title: "Synapse is free for you until " + until,
      sub: "After that, your plan’s limits apply. See what each plan includes.", group: "Today" });
  }
  /* REFERRALS: how far you are toward the next free month. */
  const rf = W().SYN_REFERRAL;
  if (rf && rf.on) out.unshift({ type: "billing", tag: "Referrals", icon: "users", pane: "subscription",
    title: rf.into_next ? "You are " + rf.into_next + " of " + rf.per_reward + " toward a free month" : "Refer " + rf.per_reward + " agents, get a month free",
    sub: "Share your link from Plans. An agency counts once it has uploaded " + rf.listings_required + " listings.", group: "Today" });

  /* GETTING STARTED (Eden, 2026-10-07): only for the first month, only once the listings have answered (so it never claims "none"
     before it knows), and gone the moment there is a listing. */
  try {
    const me = W().SynAuth && W().SynAuth.user && W().SynAuth.user();
    const young = me && me.created_at && (Date.now() - new Date(me.created_at).getTime()) < 30 * 864e5;
    if (young && call("SynDbBacked") && !L.length) out.unshift({ type: "setup", tag: "Getting started", icon: "plus", pane: "listings",
      title: "Add your first listing",
      sub: "About three minutes: photos, price and a pin on the map. Tayo starts matching it to buyers once it is live.", group: "Getting started" });
  } catch { /* the bell is never worth an error */ }
  return out.map((n) => ({ ...n, key: n.key || notiKey(n) }));
}

/** The bell in the top bar. One floating panel at a time: opening it closes Contact Synapse. */
export function BellButton() {
  const { open, items } = useBell();
  return (
    <button className="bell" id="bellBtn" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded={open}
      onClick={() => { try { W().toggleRm?.(false); } catch { /* not ready */ } setOpen(!state.open); }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {" "}
      <span className={"bell-badge" + (items.length ? "" : " hide")} id="bellBadge">{items.length}</span>
    </button>
  );
}

/** The panel, the single home for every alert and reminder. Clicking an item goes where it points; the rows are buttons, so
 *  Enter and Space work and focus is visible. */
export function BellPanel() {
  const { open, items } = useBell();
  const scripts = usePageScripts();

  useEffect(() => {
    const toggle = (e: Event) => { const d = (e as CustomEvent).detail; setOpen(d === undefined ? !state.open : !!d); };
    document.addEventListener("syn:noti-refresh", refresh);
    document.addEventListener("syn:listings", refresh);
    window.addEventListener("syn:noti-toggle", toggle);
    return () => {
      document.removeEventListener("syn:noti-refresh", refresh);
      document.removeEventListener("syn:listings", refresh);
      window.removeEventListener("syn:noti-toggle", toggle);
    };
  }, []);
  useEffect(() => {
    if (!scripts) return;
    refresh();
    const L = W().SynListings;
    if (L && L.myProfile) L.myProfile().then((me: any) => { W().SYN_MY_FACE = !!(me && me.avatar); refresh(); }).catch(() => { /* no nudge without an answer */ });
    if (L && L.lostReminders) L.lostReminders().then((r: any[]) => { W().SYN_LOST_BACK = r || []; refresh(); }).catch(() => { /* no reminder without an answer */ });
  }, [scripts]);

  /* Going there is dealing with it: take it out of the bell first. */
  const go = (n: Item) => {
    handle([n.key]);
    if (n.action) {
      setOpen(false);
      window.dispatchEvent(new Event("syn:" + n.action));
    } else if (n.task) {
      const t = W().findTask?.(n.task);
      setOpen(false);
      if (t) W().showTasks([t]);
    } else if (n.pane) {
      W().goToPane(n.pane);
      setOpen(false);
    }
    refresh();
  };
  /* Clearing is a dismissal, not a fix: the underlying state is unchanged, so the handled list stops derived items from
     immediately reappearing. */
  const clear = () => { handle(items.map((n) => n.key)); refresh(); setOpen(false); W().toast?.("Notifications cleared"); };

  const groups: { g: string; items: Item[] }[] = [];
  items.forEach((n) => {
    let g = groups.find((x) => x.g === (n.group || ""));
    if (!g) { g = { g: n.group || "", items: [] }; groups.push(g); }
    g.items.push(n);
  });

  return (
    <>
      <div className={"noti-scrim" + (open ? " on" : "")} id="notiScrim" onClick={() => setOpen(false)}></div>
      <div className={"noti" + (open ? " on" : "")} id="noti" role="dialog" aria-label="Notifications">
        <div className="noti-h">
          <span className="t">{"Notifications & reminders"}</span>
          <button className="clr" id="notiClear" type="button" onClick={clear}>Mark all read</button>
        </div>
        <div id="notiList">
          {!items.length ? <div className="noti-empty">You’re all caught up ✦</div> : groups.map((g) => (
            <Fragment key={g.g}>
              {g.g ? <div className="noti-group">{g.g}</div> : null}
              {g.items.map((n) => (
                <div key={n.key} className={"attn " + n.type} role="button" tabIndex={0} style={{ cursor: "pointer" }} data-noti-pane={n.pane || ""}
                  onClick={() => go(n)} onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== " ") return; e.preventDefault(); go(n); }}>
                  <span className="ico" dangerouslySetInnerHTML={{ __html: W().SynIcons?.svg?.(n.icon) || "" }}></span>
                  <span className="body"><span className="ttl">{n.title}</span><span className="sub">{n.sub}</span><span className="tag">{n.tag}</span></span>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
