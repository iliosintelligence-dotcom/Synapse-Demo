"use client";
/**
 * The notification bell, as React (was the bell block of src/legacy/agency/inline-3.js): the button and its count, the panel,
 * the list of things already dealt with, and where each item goes. What the items ARE is still derived in inline-3, beside the
 * state it reads (listings, leads, posts, tasks); this asks for them through `window.SynNoti.items()`.
 *
 * Talking to the rest of the page: inline-3's renderNoti() fires `syn:noti-refresh` and toggleNoti(open) fires `syn:noti-toggle`
 * (both kept as names, since the page and the account menu call them); `syn:listings` refreshes too.
 */
import { Fragment, useEffect, useSyncExternalStore } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

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
  try { all = W().SynNoti?.items?.() ?? []; } catch (e) { console.error("bell", e); }   // the bell is never worth an error
  set({ items: all.filter((n) => !handled[n.key]) });
}
const setOpen = (open: boolean) => set({ open });

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
  useEffect(() => { if (scripts) refresh(); }, [scripts]);

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
