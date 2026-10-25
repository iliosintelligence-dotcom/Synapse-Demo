"use client";
/**
 * The setup anchor, as React (was THE SETUP ANCHOR in src/legacy/agency/inline-3.js). Eden, 2026-10-11: "People come to use the
 * app and usually end up texting me later to ask what they should do next." So the portal always knows and always says: one
 * read-only call (agency_setup_progress) reports what the agency has really done, the steps are ordered, and the first one not
 * done is THE NEXT STEP, shown as a ring in the top bar that opens the whole list. Steps an agent cannot do (logo, papers,
 * inviting people) are not shown to an agent. When everything is done the ring disappears. (The "Your next step" card on
 * Overview is gone: Eden, 2026-10-24.)
 *
 * portalShell's toggleSetup(open) survives as a name (closeAgencyPopups calls it) and fires `syn:setup-toggle`.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

type Progress = { role?: string; logo?: boolean; cac?: boolean; listings: number; channels: number; posts: number; team: number; leads: number; referrals: number };
type Step = { id: string; boss?: boolean; ico: string; title: string; why: string; cta: string; done: boolean; go: () => void };

const Tick = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" /></svg>;

const go = (pane: string) => W().goToPane?.(pane);
const press = (id: string, ms: number) => setTimeout(() => document.getElementById(id)?.click(), ms);

function stepsFor(p: Progress): Step[] {
  const boss = p.role === "agency_owner" || p.role === "agency_admin";
  const all: Step[] = [
    { id: "logo", boss: true, ico: "logo", title: "Add your logo", why: "Buyers trust a listing more when they can see whose it is. It also goes on every post Synapse makes for you.", cta: "Add your logo", done: !!p.logo, go: () => go("brand") },
    { id: "cac", boss: true, ico: "cac", title: "Upload your CAC certificate", why: "You cannot publish a listing until it is on file. It takes a minute, and the verification team reviews it after.", cta: "Upload it", done: !!p.cac, go: () => go("verification") },
    { id: "listing", ico: "listing", title: "Add your first listing", why: "Buyers cannot find you until a listing is live. About three minutes: photos, price and a pin on the map.", cta: "Add a listing", done: p.listings > 0, go: () => { go("listings"); press("newListingBtn", 350); } },
    { id: "channel", boss: true, ico: "channel", title: "Connect a social account", why: "Connect Instagram, Facebook, TikTok or Telegram once, and Synapse can post your listings for you.", cta: "Connect one", done: p.channels > 0, go: () => { go("social"); setTimeout(() => { try { W().openAddChannel("instagram"); } catch { /* not ready */ } }, 500); } },
    { id: "post", ico: "post", title: "Post a listing", why: "Pick a listing, tick where it goes, and let Synapse write the captions. This is how enquiries start.", cta: "Make a post", done: p.posts > 0, go: () => { go("social"); press("newPostBtn", 350); } },
    { id: "team", boss: true, ico: "team", title: "Invite a teammate", why: "Add the agents who will answer buyers. Leads can be assigned to them, and the work stops sitting on one person.", cta: "Invite someone", done: p.team > 1, go: () => { try { W().openInvite(); } catch { go("agents"); } } },
    /* Done once any lead has been moved past New: the portal knows that from its own lead list (portalData's
       SynLeadsAnswered), not from this call. */
    { id: "lead", ico: "lead", title: "Reply to your first lead", why: p.leads > 0 ? "A buyer has asked about a home. Fast replies win; open it and call or message them." : "Your first enquiry lands here the moment a buyer taps Contact agent. Share a listing to get one sooner.", cta: p.leads > 0 ? "Open your leads" : "Share a listing", done: !!(W().SynLeadsAnswered && W().SynLeadsAnswered()), go: () => go(p.leads > 0 ? "crm" : "listings") },
    { id: "refer", boss: true, ico: "refer", title: "Refer another agency", why: "Every 5 agencies you bring earn you a free month. Your link is on the Plans page.", cta: "Get my link", done: p.referrals > 0, go: () => go("subscription") },
  ];
  return all.filter((st) => !st.boss || boss);
}

type State = { steps: Step[]; open: boolean; nudge: boolean };
let state: State = { steps: [], open: false, nudge: false };
const subs = new Set<() => void>();
const set = (v: Partial<State>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useSetup = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);

function paint(p: Progress) {
  const steps = stepsFor(p);
  const doneN = steps.filter((x) => x.done).length, total = steps.length;
  const next = steps.find((x) => !x.done);
  set({ steps });
  try { W().paintFast?.(); } catch { /* page still starting */ }
  if (!next) return;
  /* Say so when a step gets done, and what is next. */
  try {
    const key = "syn_setup_done"; const before = parseInt(localStorage.getItem(key) || "-1", 10);
    if (before >= 0 && doneN > before && doneN < total) W().toast?.("Done: " + steps.filter((x) => x.done).slice(-1)[0].title + ". Next: " + next.title);
    localStorage.setItem(key, String(doneN));
    if (before < 0 || doneN > before) set({ nudge: true });
  } catch { /* storage blocked */ }
}
function load() {
  const A = W().SynAuth, L = W().SynListings;
  if (!A || !L || !L.agencyId) return;
  A.client().then((c: any) => L.agencyId().then((aid: string) => (aid ? c.rpc("agency_setup_progress", { p_agency: aid }) : null)))
    .then((r: any) => { if (!r || r.error || !r.data) return; paint(r.data); })
    .catch(() => {});
}
function toggle(open?: boolean) {
  const want = typeof open === "boolean" ? open : !state.open;
  set(want ? { open: true, nudge: false } : { open: false });
}

export function SetupButton() {
  const { steps, open, nudge } = useSetup();
  const doneN = steps.filter((x) => x.done).length;
  const next = steps.find((x) => !x.done);
  return (
    <button className={"bell setup-ring" + (nudge ? " nudge" : "")} id="setupBtn" type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="setupPop"
      aria-label={next ? "Getting set up: " + doneN + " of " + steps.length + " done. Next: " + next.title : "Getting set up"} hidden={!next}>
      <span className="sr-n" id="setupNum">
        {next ? doneN + "/" + steps.length : 0}
      </span>
    </button>
  );
}

export function SetupPop() {
  const { steps, open } = useSetup();
  const scripts = usePageScripts();
  const pop = useRef<HTMLDivElement>(null);
  const doneN = steps.filter((x) => x.done).length, total = steps.length;
  const next = steps.find((x) => !x.done);

  useEffect(() => {
    const onToggle = (e: Event) => toggle((e as CustomEvent).detail);
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const g = t.closest<HTMLElement>("[data-setup-go]");
      if (g) { const st = state.steps.find((x) => x.id === g.dataset.setupGo); toggle(false); if (st) st.go(); return; }
      if (t.closest("#setupBtn")) { toggle(); return; }
      if (state.open && !t.closest("#setupPop")) toggle(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && state.open) { toggle(false); document.getElementById("setupBtn")?.focus(); } };
    const listings = () => setTimeout(load, 800);
    const visible = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("syn:setup-toggle", onToggle);
    document.addEventListener("click", click);
    document.addEventListener("keydown", key);
    document.addEventListener("syn:listings", listings);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("syn:setup-toggle", onToggle);
      document.removeEventListener("click", click);
      document.removeEventListener("keydown", key);
      document.removeEventListener("syn:listings", listings);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  useEffect(() => {
    if (!scripts) return;
    const first = setTimeout(load, 2200);
    const every = setInterval(load, 90 * 1000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [scripts]);
  useEffect(() => { if (open) pop.current?.querySelector<HTMLElement>("[data-setup-go]")?.focus(); }, [open]);

  return (
    <div className="setup-pop" id="setupPop" role="dialog" aria-label="Getting set up" hidden={!open || !next} ref={pop}>
      {next ? (
        <>
          <div className="sp-h"><h3>Getting set up</h3><span>{doneN} of {total}</span></div>
          <div className="sp-bar" aria-hidden="true"><i style={{ width: Math.round(doneN / total * 100) + "%" }}></i></div>
          <ul className="sp-list">
            {steps.map((x) => {
              const isNext = x === next;
              return (
                <li key={x.id} className={x.done ? "done" : isNext ? "next" : ""}><span className="sp-dot"><Tick /></span><div><div className="sp-t">{x.title}</div>
                  {isNext ? <><div className="sp-w">{x.why}</div><button type="button" className="btn btn-primary" data-setup-go={x.id}>{x.cta} {"→"}</button></> : null}</div></li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
