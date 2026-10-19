"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth";
import { fetchLeads, type Lead } from "./data/leads";
import { fetchListings, type Listing } from "./data/listings";
import { buildNotices, markHandled, noticeKey, readHandled, unhandled, type Notice } from "./data/notifications";
import { fetchStudio } from "./data/social";
import type { PaneId } from "./roles";
import { useTasks } from "./Tasks";
import { useToast } from "./ui/Toast";
import s from "./Bell.module.css";

/** The bell: what needs attention, derived from live state. Clicking one takes you to the pane it is about and marks it handled until the facts change. */
export function Bell({ allowed, onGo }: { allowed: PaneId[]; onGo: (p: PaneId) => void }) {
  const toast = useToast();
  const tasks = useTasks();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ listings: Listing[]; leads: Lead[]; drafts: number } | null>(null);
  const [handled, setHandled] = useState<Record<string, number>>(() => (typeof window === "undefined" ? {} : readHandled()));

  const load = useCallback(async () => {
    const [listings, leads, studio] = await Promise.all([fetchListings().catch(() => [] as Listing[]), fetchLeads().catch(() => [] as Lead[]), fetchStudio().catch(() => ({ drafts: [], posts: [] }))]);
    setState({ listings, leads, drafts: studio.drafts.length });
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  // fresh whenever it is opened: a lead that arrived a minute ago should be on it
  useEffect(() => { if (open) void Promise.resolve().then(load); }, [open, load]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [open]);

  const all: Notice[] = useMemo(() => (state ? buildNotices({ ...state, accountCreatedAt: session?.user?.created_at ?? null }) : []), [state, session]);
  // only what this role can open: a notice that links to a screen you cannot see is a dead end
  const shown = useMemo(() => unhandled(all, handled).filter((n) => allowed.includes(n.pane)), [all, handled, allowed]);
  const groups = useMemo(() => [...new Set(shown.map((n) => n.group))].map((g) => ({ g, items: shown.filter((n) => n.group === g) })), [shown]);

  const take = (n: Notice) => { setHandled((h) => markHandled([noticeKey(n)], h)); setOpen(false); onGo(n.pane); };

  return (
    <>
      <button type="button" className={s.bell} aria-label={`Notifications${shown.length + tasks.open.length ? `, ${shown.length + tasks.open.length} waiting` : ""}`} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {shown.length + tasks.open.length > 0 && <span className={s.badge}>{shown.length + tasks.open.length}</span>}
      </button>
      {open && <div className={s.scrim} onClick={() => setOpen(false)} />}
      {open && (
        <div className={s.pop} role="dialog" aria-label="Notifications">
          <div className={s.top}><b>Notifications</b>{shown.length > 0 && <button type="button" className={s.clear} onClick={() => { setHandled((h) => markHandled(shown.map(noticeKey), h)); setOpen(false); toast("Notifications cleared"); }}>Clear all</button>}</div>
          {!shown.length && !tasks.open.length ? <div className={s.empty}>You’re all caught up ✦</div> : groups.map((g) => (
            <div key={g.g}>
              <div className={s.group}>{g.g}</div>
              {g.items.map((n) => (
                <button key={noticeKey(n)} type="button" className={`${s.item} ${s[n.type]}`} onClick={() => take(n)}>
                  <span className={s.ttl}>{n.title}</span><span className={s.sub}>{n.sub}</span><span className={s.tag}>{n.tag}</span>
                </button>
              ))}
            </div>
          ))}
          {tasks.open.length > 0 && (
            <div>
              <div className={s.group}>To do</div>
              {tasks.open.map((k) => (
                <button key={k.id} type="button" className={`${s.item} ${s.setup}`} onClick={() => { setOpen(false); tasks.show(k); }}>
                  <span className={s.ttl}>{k.title}</span><span className={s.sub}>Tap to see what to paste where</span><span className={s.tag}>Only you</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
