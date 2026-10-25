"use client";
/**
 * Getting around the agency portal, as React (was goToPane, the dock, openInitialPane, applyRole's stripping and the floating
 * taskbar in src/legacy/agency/inline-3.js). One store says which pane is open, which role is signed in, the panes visited (for
 * Back and Forward), whether the side rail is expanded and which taskbar sheet is up. The rail, the panes, the history buttons
 * and the phone taskbar all draw from it, so a tab cannot be highlighted without its pane showing, or the other way round.
 *
 * portalShell's goToPane(pane) survives as a name (the bell, the setup ring, the billing and social code call it) and fires
 * `syn:goto`; applyRole still stamps body[data-role] and fires `syn:role`, and this hides what that role may not open. Panes
 * a role may not see are not rendered at all, not hidden: a stale hash or a goToPane call cannot reach them.
 */
import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

type Item = { pane: string; icon: string; label: string; title?: string };
type Group = { sec: string; name: string; items: Item[] };
/* The rail, in order. The phone's navigation sheet is drawn from the same list. */
const NAV: Group[] = [
  { sec: "main", name: "Main", items: [
    { pane: "overview", icon: "grid", label: "Overview" },
    { pane: "crm", icon: "users", label: "CRM · Leads" },
    { pane: "negotiator", icon: "negotiate", label: "Tayo Negotiator" },
    { pane: "listings", icon: "agency", label: "Listings" },
  ] },
  { sec: "growth", name: "Growth", items: [
    { pane: "social", icon: "share", label: "Social studio" },
    { pane: "marketing", icon: "chart", label: "Marketing" },
  ] },
  { sec: "team", name: "Team", items: [
    { pane: "agents", icon: "user", label: "Agents" },
    { pane: "tours", icon: "calendar", label: "Tours" },
    { pane: "brand", icon: "spark", label: "Brand" },
  ] },
  { sec: "account", name: "Account", items: [
    { pane: "verification", icon: "legal", label: "Verification" },
    { pane: "subscription", icon: "card", label: "Subscription" },
    { pane: "billing", icon: "costs", label: "Billing" },
  ] },
];
const PANES = NAV.flatMap((g) => g.items.map((i) => i.pane));
const SEC_OF: Record<string, string> = {};
NAV.forEach((g) => g.items.forEach((i) => { SEC_OF[i.pane] = g.sec; }));

/* What each role may open. Every agent posts listings and social (synapse-agent-permissions); only the owner sees the money.
   This is the second lock, never the only one: the database policies are what stop an agent writing the brand. */
const ROLE_PANES: Record<string, string[] | null> = {
  agency_owner: null, /* null = every pane */
  agency_admin: ["overview", "crm", "negotiator", "listings", "social", "marketing", "agents", "tours", "brand", "verification"],
  agent: ["overview", "crm", "negotiator", "listings", "social", "tours"],
};
/* The leads notification asks for 'leads'; the CRM pane is 'crm'. Old names are translated. */
const ALIAS: Record<string, string> = { leads: "crm", lead: "crm", posts: "social", post: "social" };

type Dock = "" | "nav" | "add" | "filter";
type Row = [string, string, string];
type St = {
  pane: string;
  role: string | null | undefined; /* undefined until the role arrives: every pane shows, as the page always did */
  list: string[]; i: number;
  side: boolean;
  secs: Record<string, boolean>;
  dock: Dock; agdSecs: Record<string, boolean>; addRows: { wanted: number; rows: Row[] }; filterHas: boolean;
};
let state: St = {
  pane: "overview", role: undefined, list: [], i: -1, side: false,
  secs: { main: true, growth: true, team: true, account: true },
  dock: "", agdSecs: {}, addRows: { wanted: 0, rows: [] }, filterHas: false,
};
const subs = new Set<() => void>();
const set = (v: Partial<St>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useNav = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
/* Changes the rest of the page reads straight after (a .pane.on lookup, a click into the new pane) land at once. */
const setNow = (v: Partial<St>) => { try { flushSync(() => set(v)); } catch { set(v); } };

function allowed(pane: string, role = state.role) {
  if (role === undefined) return true;
  const list = Object.prototype.hasOwnProperty.call(ROLE_PANES, role || "") ? ROLE_PANES[role as string] : ROLE_PANES.agent;
  return list === null || list.indexOf(pane) > -1;
}

/* Back and forward walk the panes visited here, like a browser's, without adding browser history. */
function record(pane: string, s: St = state): Pick<St, "list" | "i"> {
  if (s.list[s.i] === pane) return { list: s.list, i: s.i };
  const list = s.list.slice(0, s.i + 1).concat(pane);
  if (list.length > 50) list.shift();
  return { list, i: list.length - 1 };
}
/* The pane survives a reload and can be linked to; replaceState, so sidebar clicks do not pile up in the Back button. */
function remember(pane: string) {
  try { history.replaceState(null, "", "#" + pane); } catch { /* file:// */ }
}

/* One way to change pane, used by the rail and by anything else that sends you somewhere. A name with no pane, or one this
   role may not open, is ignored rather than blanking the screen. */
export function goToPane(name: string, step?: number) {
  const pane = ALIAS[name] || name;
  if (!pane || PANES.indexOf(pane) < 0 || !allowed(pane)) return;
  if (pane === "tours") W().loadTours?.();
  /* Recount on arrival: a message queued in another tab changes what this should say. */
  if (pane === "crm") W().paintOutboxWaiting?.();
  if (pane === "verification") W().loadVerification?.();
  if (pane === "billing") W().loadBilling?.();
  setTimeout(syncFilterFab, 0);
  /* Going somewhere puts every popup away: the taskbar sheets, the setup list, the bell and the account menu. */
  try { closeAgencyPopups(); } catch { /* the pane change still happens */ }
  const hist = step === undefined ? record(pane) : { list: state.list, i: step };
  setNow({ pane, ...hist, secs: { ...state.secs, [SEC_OF[pane]]: true } });
  if (document.getElementById("tpanel")?.classList.contains("on")) W().openToju?.(); /* keep the advisor in step */
  try { W().synMotion?.refresh(); } catch { /* motion is decoration */ }
  /* To the top, and at once (Eden, 2026-10-11): every scroller there is goes to 0. */
  try {
    window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
    const sc = document.querySelector(".content"); if (sc) sc.scrollTop = 0;
    const el = document.getElementById("pane-" + pane); if (el) el.scrollTop = 0;
  } catch { /* nothing to scroll */ }
  remember(pane);
}
function stepHist(d: number) {
  const j = state.i + d;
  if (j < 0 || j >= state.list.length) return;
  goToPane(state.list[j], j);
}

/* ── the phone taskbar's filter sheet ─────────────────────────────────
   The pane's own controls are MOVED into the sheet, not copied (a second sort dropdown would disagree with the real one), and
   each goes back exactly where it came from when the sheet closes. Panes keep [data-pane-filters] nodes as static children. */
let lent: { el: Element; parent: Node; next: Node | null }[] = [];
const onPane = () => document.querySelector(".pane.on") || document.querySelector(".pane:not([hidden])");
function lendFilters() {
  const sheet = document.getElementById("agdFilterSheet"), pane = onPane();
  if (!sheet || !pane) return;
  lent = [...pane.querySelectorAll("[data-pane-filters]")].map((el) => {
    const home = { el, parent: el.parentNode as Node, next: el.nextSibling };
    sheet.appendChild(el);
    return home;
  });
}
function returnFilters() {
  lent.forEach(({ el, parent, next }) => parent.insertBefore(el, next));
  lent = [];
}
/* Nothing to filter on Brand, Agents, Subscription or the Negotiator: the button goes rather than opening an empty sheet. */
function syncFilterFab() {
  const pane = onPane();
  const has = !!(pane && pane.querySelector("[data-pane-filters]")) || lent.length > 0;
  if (has !== state.filterHas) set({ filterHas: has });
}

export function closeDock() {
  if (lent.length) returnFilters();
  if (state.dock) setNow({ dock: "" });
}
function closeAgencyPopups() {
  closeDock();
  try { W().toggleSetup?.(false); } catch { /* not on this page */ }
  try { W().toggleNoti?.(false); } catch { /* not ready */ }
  try { W().toggleRm?.(false); } catch { /* not ready */ }
  window.dispatchEvent(new Event("syn:acct-close")); /* the account menu is React's (AgencyAccount.tsx) */
}

/* Per-pane create actions: the id of the real control on that pane, and what the fan shows. "Add a property" is offered
   everywhere, because it is the job the portal exists for. */
const CREATE: Record<string, Row[]> = {
  overview: [["newListingBtn", "New listing", "home"]],
  listings: [["newListingBtn", "New listing", "home"]],
  crm: [["crmAdd", "Add lead", "user"]],
  social: [["newPostBtn", "New social post", "share"]],
  marketing: [["newCampBtn", "New campaign", "chart"]],
  agents: [["inviteAgentBtn", "Invite agent", "user"]],
};
const ALWAYS: Row[] = [["newListingBtn", "New listing", "home"], ["newPostBtn", "New social post", "share"], ["newCampBtn", "New campaign", "chart"]];
function openDock(which: Dock) {
  if (state.dock === which) { closeDock(); return; }
  closeDock();
  if (which === "filter") { lendFilters(); setNow({ dock: "filter" }); return; }
  if (which === "nav") {
    /* the group holding the current pane starts open, the first one otherwise */
    const groups = NAV.filter((g) => g.items.some((i) => allowed(i.pane)));
    const agdSecs: Record<string, boolean> = {};
    groups.forEach((g, i) => { agdSecs[g.sec] = g.items.some((x) => x.pane === state.pane) || i === 0; });
    setNow({ dock: "nav", agdSecs });
    return;
  }
  const wanted = CREATE[state.pane] || [];
  const seen = new Set(wanted.map((a) => a[0]));
  /* never offer a dead action */
  const live = (rows: Row[]) => rows.filter(([id]) => document.getElementById(id));
  const w = live(wanted);
  setNow({ dock: "add", addRows: { wanted: w.length, rows: w.concat(live(ALWAYS.filter((a) => !seen.has(a[0])))) } });
}

/* Each fab's icon travels to a cross and back as its sheet opens and closes (icon-morph.js; without it the icons sit still). */
function syncTaskbarIcons() {
  if (!W().SynMorph) return;
  ([["nav", "agdNavFab", "grid"], ["filter", "agdFilterFab", "filter"], ["add", "agdAddFab", "plus"]] as const).forEach(([which, id, rest]) => {
    const host = document.getElementById(id)?.querySelector("[data-icon]");
    if (host) W().SynMorph.morphTo(host, state.dock === which ? "close" : rest);
  });
}

/* Sets everything up once: the pane from the link, the saved rail width, the role, and the names the old page called. */
export function PortalNavHost() {
  const { side, dock } = useNav();
  useEffect(() => {
    /* Open where you left off: the hash names a pane, or you get Overview (a first visit, a junk fragment). */
    const want = (location.hash || "").replace(/^#/, "");
    const pane = PANES.indexOf(want) > -1 ? want : "overview";
    if (pane !== want && location.hash) history.replaceState(null, "", location.pathname);
    let saved = false;
    try { saved = localStorage.getItem("syn_side_open") === "1"; } catch { /* closed by default */ }
    set({ pane, ...record(pane), secs: { ...state.secs, [SEC_OF[pane]]: true }, side: saved });

    const onGo = (e: Event) => goToPane((e as CustomEvent).detail);
    /* The role arrives from its own round trip. A pane this account may not open goes, and the hash is honoured again now that
       it is known which panes exist. */
    const onRole = (e: Event) => {
      const role = (e as CustomEvent).detail || null;
      setNow({ role });
      const h = (location.hash || "").replace(/^#/, "");
      if (h && PANES.indexOf(h) > -1 && allowed(h)) goToPane(h);
      else if (!allowed(state.pane)) goToPane("overview");
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDock(); };
    window.addEventListener("syn:goto", onGo);
    document.addEventListener("syn:role", onRole);
    document.addEventListener("keydown", onKey);
    window.addEventListener("pageshow", closeAgencyPopups);
    W().syncFilterFab = syncFilterFab;
    W().syncTaskbarIcons = syncTaskbarIcons;
    W().closeAgencyPopups = closeAgencyPopups;
    syncFilterFab();
    return () => {
      window.removeEventListener("syn:goto", onGo);
      document.removeEventListener("syn:role", onRole);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("pageshow", closeAgencyPopups);
    };
  }, []);
  /* The page makes room rather than being covered (Eden: "I want it to shift the things in the background"). */
  useEffect(() => { document.body.classList.toggle("dock-open", side); }, [side]);
  useEffect(() => { syncTaskbarIcons(); }, [dock]);
  return null;
}

/* ── the rail ── */
function useDesk() {
  return useSyncExternalStore((f) => { const m = window.matchMedia("(min-width: 1025px)"); m.addEventListener("change", f); return () => m.removeEventListener("change", f); },
    () => window.matchMedia("(min-width: 1025px)").matches, () => false);
}
function RailGroup({ g, extra }: { g: Group; extra?: ReactNode }) {
  const { pane, role, secs } = useNav();
  const desk = useDesk();
  const items = g.items.filter((i) => allowed(i.pane, role));
  /* A group header with nothing under it is a heading for an empty room. */
  if (!items.length) return null;
  const open = !!secs[g.sec];
  /* The desktop dock keeps every group open, so its headers are labels there, out of the tab order. */
  const toggle = () => { if (!desk) set({ secs: { ...state.secs, [g.sec]: !open } }); };
  return (
    <div className={"grp-sec" + (open ? " open" : "")} data-sec={g.sec}>
      <button className="grp" aria-expanded={open} aria-controls={"grp-" + g.sec} tabIndex={desk ? -1 : undefined} onClick={toggle}>
        <span>{g.name}</span>
        <span className="grp-chv" aria-hidden="true">›</span>
      </button>
      <div className="grp-items" id={"grp-" + g.sec}>
        {items.map((it, n) => (
          <Fragment key={it.pane}>
            {n ? " " : null}
            <a className={it.pane === pane ? "on" : undefined} data-pane={it.pane} title={it.title || it.label} onClick={() => goToPane(it.pane)}>
              <span data-icon={it.icon}></span>
              <span className="lbl-x">{it.label}</span>
            </a>
          </Fragment>
        ))}
        {extra}
      </div>
    </div>
  );
}
export function Rail({ profileLink, children }: { profileLink: ReactNode; children: ReactNode }) {
  const { side } = useNav();
  return (
    <aside className={"side" + (side ? " expanded" : "")} id="tabs">
      {NAV.map((g) => <RailGroup key={g.sec} g={g} extra={g.sec === "team" ? profileLink : null} />)}
      {children}
    </aside>
  );
}
export function HistButtons() {
  const { list, i } = useNav();
  return (
    <div className="side-hist" role="group" aria-label="Pages you visited">
      <button type="button" id="navBack" aria-label="Back to the previous page" title="Back" disabled={i <= 0} onClick={() => stepHist(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </svg>{" "}
        <span className="lbl-x">Back</span>
      </button>
      <button type="button" id="navFwd" aria-label="Forward to the next page" title="Forward" disabled={i >= list.length - 1} onClick={() => stepHist(1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
        </svg>{" "}
        <span className="lbl-x">Forward</span>
      </button>
    </div>
  );
}
export function SideToggle() {
  const { side } = useNav();
  const title = side ? "Collapse the menu" : "Expand the menu";
  const flip = () => {
    set({ side: !side });
    try { localStorage.setItem("syn_side_open", side ? "0" : "1"); } catch { /* stays for this visit */ }
  };
  return (
    <button type="button" className="side-toggle" id="sideToggle" aria-controls="tabs" aria-expanded={side} title={title} aria-label={title} onClick={flip}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M9 4v16" />
      </svg>{" "}
      <span className="lbl-x">Collapse</span>
    </button>
  );
}

/* A pane: shown when it is the open one, not there at all when this role may not open it. */
export function Pane({ id, children }: { id: string; children?: ReactNode }) {
  const { pane, role } = useNav();
  if (!allowed(id, role)) return null;
  return <section className={"pane" + (pane === id ? " on" : "")} id={"pane-" + id}>{children}</section>;
}

/* ── the phone taskbar: navigation, filters and create, two thumbs away ── */
export function Dock() {
  const { dock, pane, role, agdSecs, addRows, filterHas } = useNav();
  /* Icons in the sheets come from icons.js, which fills [data-icon] spans it has not seen. */
  useEffect(() => {
    if (!dock) return;
    const id = dock === "nav" ? "agdNavSheet" : dock === "add" ? "agdAddSheet" : "";
    const el = id && document.getElementById(id);
    if (el) W().SynIcons?.hydrate?.(el);
  }, [dock, agdSecs]);
  const groups = NAV.filter((g) => g.items.some((i) => allowed(i.pane, role)));
  const press = (id: string) => { closeDock(); document.getElementById(id)?.click(); }; /* the pane's own control does the work */
  return (
    <>
      <div className={"agd-scrim" + (dock ? " on" : "")} id="agdScrim" onClick={closeDock}></div>
      <div className="agd-bar" id="agdBar">
        <div className={"agd agd-nav" + (dock === "nav" ? " open" : "")} id="agdNav">
          <div className="agd-sheet" id="agdNavSheet" role="menu" aria-label="Portal navigation">
            {dock === "nav" ? (
              <>
                {groups.map((g) => (
                  <div key={g.sec} className={"agd-sec" + (agdSecs[g.sec] ? " open" : "")}>
                    <button className="agd-grp" type="button" onClick={() => set({ agdSecs: { ...state.agdSecs, [g.sec]: !state.agdSecs[g.sec] } })}>
                      <span>{g.name}</span><span className="chv">›</span>
                    </button>
                    <div className="agd-items">
                      {g.items.filter((i) => allowed(i.pane, role)).map((it) => (
                        <button key={it.pane} className={"agd-item" + (it.pane === pane ? " on" : "")} role="menuitem" data-goto={it.pane}
                          onClick={() => { closeDock(); goToPane(it.pane); }}>
                          <span data-icon={it.icon}></span>{it.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="agd-sep"></div>
                <button className="agd-item" role="menuitem" data-nav-site="" onClick={() => { window.location.href = "../index.html"; }}>
                  <span data-icon="home"></span>Back to the landing page
                </button>
              </>
            ) : null}
          </div>
          <button className="agd-btn" id="agdNavFab" type="button" aria-expanded={dock === "nav"} aria-label="Open navigation" onClick={() => openDock("nav")}>
            <span data-icon="grid"></span>
          </button>
        </div>
        <span className="agd-div" aria-hidden="true"></span>
        <div className={"agd agd-filter" + (dock === "filter" ? " open" : "")} id="agdFilter" hidden={!filterHas}>
          {/* filled by lendFilters with the open pane's own controls; React never draws inside it */}
          <div className="agd-sheet" id="agdFilterSheet" role="menu" aria-label="Filter and sort"></div>
          <button className="agd-btn" id="agdFilterFab" type="button" aria-expanded={dock === "filter"} aria-label="Filter and sort" onClick={() => openDock("filter")}>
            <span data-icon="filter"></span>
          </button>
        </div>
        <span className="agd-div" aria-hidden="true"></span>
        <div className={"agd agd-add" + (dock === "add" ? " open" : "")} id="agdAdd">
          <div className="agd-sheet" id="agdAddSheet" role="menu" aria-label="Create">
            {dock === "add" ? (
              <>
                <div className="agd-add-hint">Create</div>
                {addRows.rows.map(([id, label, icon], i) => (
                  <Fragment key={id}>
                    {i === addRows.wanted && addRows.wanted ? <div className="agd-sep"></div> : null}
                    <button className="agd-act" role="menuitem" data-act={id} onClick={() => press(id)}>
                      <span data-icon={icon}></span>{label}
                    </button>
                  </Fragment>
                ))}
              </>
            ) : null}
          </div>
          <button className="agd-btn agd-btn-primary" id="agdAddFab" type="button" aria-expanded={dock === "add"} aria-label="Create" onClick={() => openDock("add")}>
            <span data-icon="plus"></span>
          </button>
        </div>
      </div>
    </>
  );
}
