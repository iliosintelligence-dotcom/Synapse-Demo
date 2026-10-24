"use client";
/**
 * The Overview command center, as React (was renderOverview/renderOvDetail/selectOv and the sheet in
 * src/legacy/agency/inline-3.js): the agency's listings, the selected one on a map, and its detail in tabs. On a phone the detail
 * is a full-screen sheet pushed in over the list.
 *
 * It reads the same LISTINGS_DATA as the Listings pane (`window.SynListingsData()`), the leads through `window.SynLeads()`, and
 * freshness/openListingById from inline-3. renderOverview() survives as a name and fires `syn:overview`. The map is drawn by the
 * shared SynMatches helper into #ovMap, which React renders empty and never touches again.
 *
 * The tabs, Sort and Filter sit in the pane's filter rows (lent to the phone dock's sheet) and the search box is in the top bar,
 * so those are listened for here rather than rendered.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const svg = (n: string) => (typeof window !== "undefined" && W().SynIcons && W().SynIcons.svg ? W().SynIcons.svg(n) : "");
const listings = (): any[] => (typeof window !== "undefined" && W().SynListingsData && W().SynListingsData()) || [];
const naira = (n: number) => (W().SynNaira ? W().SynNaira(n) : "");
const OV_CHECKS = ["Title deed", "Structural survey", "Flood assessment", "Legal search", "Ownership KYC", "Media validation", "Freshness"];

type St = { f: string; sel: number; dtab: string; q: string; tick: number; sheet: boolean };
let state: St = { f: "all", sel: 0, dtab: "details", q: "", tick: 0, sheet: false };
const subs = new Set<() => void>();
const set = (v: Partial<St>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useOv = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
/* The map's own state ({r, pending, opts, ...}), kept across draws by SynMatches. */
const MAP: any = {};
let sortDesc = true;

function useMedia(q: string) {
  return useSyncExternalStore((f) => { const m = window.matchMedia(q); m.addEventListener("change", f); return () => m.removeEventListener("change", f); },
    () => window.matchMedia(q).matches, () => false);
}

/* The address the listing actually carries, de-duplicated: agencies often type the city into the address line, which would
   otherwise read "Ring Road, Ibadan, Ibadan, Oyo state". Split on commas first, since "Ikolaba GRA, Ibadan" and "Ibadan" differ as
   whole strings. The title is the fallback only when there is no address at all. */
function ovLoc(l: any) {
  const parts = [l.address, l.city, l.state].filter((x) => x && String(x).trim());
  if (!parts.length) { const p = String(l.t || "").split(","); return p.length > 1 ? p.slice(1).join(",").trim() : ""; }
  const seen: Record<string, 1> = {}, out: string[] = [];
  parts.forEach((x) => String(x).split(",").forEach((seg) => { const v = seg.trim(); if (!v) return; const k = v.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(v); } }));
  return out.join(", ");
}
const ovBeds = (t: string) => { const m = String(t || "").match(/(\d+)\s*-?\s*bed/i); return m ? m[1] : "-"; };
/* The listing's real verification_nodes: a passed check is one that happened. */
const ovChecks = (l: any) => (Array.isArray(l.verification_nodes) ? l.verification_nodes : []).filter((n: any) => n && n.status === "passed").length;
/* Real leads attached to this listing, matched by its short name. */
function ovLeads(l: any) {
  const all: any[] = (W().SynLeads && W().SynLeads()) || [];
  const name = String(l.title || l.t || "").split(",")[0].toLowerCase();
  if (!name) return [];
  return all.filter((x) => String(x.pr || "").toLowerCase().includes(name)).slice(0, 4).map((x) => ({ nm: x.nm, src: x.src }));
}
function filtered(s: St) {
  let a = listings().slice();
  if (s.q) { const q = s.q.toLowerCase(); a = a.filter((l) => String(l.t || "").toLowerCase().includes(q)); }
  if (s.f === "verified") a = a.filter((l) => l.st === "verified");
  else if (s.f === "pending") a = a.filter((l) => l.st === "pending");
  else if (s.f === "expiring") a = a.filter((l) => W().freshness(l).warn);
  return a;
}
/* The one place a listing row becomes a map item: its own price in naira, its own position, its id and its verification. */
const ovItem = (l: any) => ({ id: l.id, ttl: l.title || l.t, loc: ovLoc(l), priceN: l.price, currency: l.currency, lat: l.latitude, lng: l.longitude,
  vstatus: l.verification_status, bedrooms: l.bedrooms, img: l.img });

/* The map follows the selection: select() both highlights the pin and returns where it is, so the highlight and the camera cannot
   disagree. With no pin yet, fly to where the pin would be put (the index matters: rows without coordinates are spread by it). */
function focusMap(l: any, i: number) {
  const r = MAP.r;
  if (!r || !l) return;
  let hit = null;
  try { hit = r.select(l.id); } catch { hit = null; }
  if (hit) { r.flyTo(hit.lng, hit.lat, 15); return; }
  if (!W().SynMatches) return;
  const c = W().SynMatches.coords(ovItem(l), i);
  r.flyTo(c[1], c[0], 15); /* coords() is [lat, lng]; flyTo takes lng first */
}

function Thumb({ url }: { url: string }) {
  const [bad, setBad] = useState(false);
  const u = typeof url === "string" ? url.trim() : "";
  return <div className={"lph lph-sm" + (bad ? " no-photo" : "")}>{u && !bad ? <img src={u} alt="" loading="lazy" onError={() => setBad(true)} /> : null}</div>;
}

function Detail({ l }: { l: any }) {
  const { dtab } = useOv();
  const f = W().freshness(l), checks = ovChecks(l), beds = ovBeds(l.t);
  const tabs = [["details", "Details"], ["verification", "Verification"], ["leads", "Leads"], ["performance", "Performance"]];
  /* "Open in Listings" carries the id across and opens that property; the pane renders on click, so it waits a frame. */
  const go = (pane: string, lid?: string) => {
    (document.querySelector('#tabs a[data-pane="' + pane + '"]') as HTMLElement | null)?.click();
    if (lid) requestAnimationFrame(() => W().openListingById(lid));
  };
  let body: React.ReactNode;
  if (dtab === "details") {
    body = (
      <>
        <div className="ovd-ttl">{l.t}</div>
        <div className="ovd-price">{naira(l.price)}</div>
        <div className="ovd-chips">
          <span className="ovd-chip">{beds + " bed" + (Number(beds) === 1 ? "" : "s")}</span>
          <span className="ovd-chip">{"◍ " + ovLoc(l)}</span>
          <span className={"ovd-chip " + (f.cls === "ok" ? "" : f.cls)}>{f.label}</span>
          <span className="ovd-chip">{l.leads + " active " + (l.leads === 1 ? "lead" : "leads")}</span>
        </div>
        <div className="ovd-actions">
          <button className="ovd-btn primary" data-goto="listings" data-goto-listing={l.id || ""} onClick={() => go("listings", l.id)}>Open in Listings</button>
          <button className="ovd-btn" data-goto="crm" onClick={() => go("crm")}>View leads</button>
        </div>
      </>
    );
  } else if (dtab === "verification") {
    body = (
      <>
        <div className="ovd-vh"><b>{checks + "/7 checks passed"}</b>{checks === 7
          ? <span className="ovs verified" style={{ marginLeft: "8px" }}>Verified · live to buyers</span>
          : <span className="ovs pending" style={{ marginLeft: "8px" }}>{(7 - checks) + " remaining"}</span>}</div>
        <div className="ovd-checks">{OV_CHECKS.map((c, i) => <div key={c} className={"ovd-check " + (i < checks ? "ok" : "")}><span>{i < checks ? "✓" : "○"}</span>{c}</div>)}</div>
      </>
    );
  } else if (dtab === "leads") {
    const lds = ovLeads(l);
    body = lds.length ? (
      <div className="ovd-leads">{lds.map((x, i) => (
        <div className="ovd-lead" key={i}>
          <span className="av">{String(x.nm || "").split(" ").map((n: string) => n[0]).join("")}</span>
          <div className="mid"><div className="nm">{x.nm}</div><span className={"src " + x.src}>{x.src === "toju" ? "via Tayo" : x.src === "contact" ? "Contacted" : "Browsed"}</span></div>
          <button className="wa">WhatsApp</button>
        </div>
      ))}</div>
    ) : <div className="noti-empty">No leads on this listing yet.</div>;
  } else {
    body = (
      <>
        <div className="h2" style={{ margin: "0 0 14px", fontSize: "15px" }}>Pipeline this quarter</div>
        <div className="funnel">
          {[["Leads", 100, 128], ["Contacted", 66, 84], ["Viewings", 27, 34], ["Offers", 12, 15], ["Won", 7, 9]].map(([lb, w, n]) => (
            <div className="row" key={lb}><span className="lb">{lb}</span><span className="track"><i style={{ width: w + "%" }}></i></span><span className="n">{n}</span></div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: "12.5px", marginTop: "16px" }}>{l.leads + " " + (l.leads === 1 ? "lead is" : "leads are") + " attributed to this listing · " + (checks === 7 ? "live to buyers now" : "hidden until verification completes") + "."}</p>
      </>
    );
  }
  return (
    <>
      <div className="ov-dtabs">{tabs.map(([k, lbl]) => <button key={k} className={"ov-dtab " + (k === dtab ? "on" : "")} data-dt={k} onClick={() => set({ dtab: k })}>{lbl}</button>)}</div>
      <div className="ov-body">{body}</div>
    </>
  );
}

export function OverviewGrid() {
  const s = useOv();
  const ready = usePageScripts();
  const mobile = useMedia("(max-width: 1024px)");
  const trigger = useRef<HTMLElement | null>(null);
  const back = useRef<HTMLButtonElement>(null);
  const list = ready ? filtered(s) : [];
  const sel = list.length && s.sel < list.length ? s.sel : 0;
  const cur = list[sel] || null;
  const all = ready ? listings() : [];

  const closeSheet = () => {
    /* Closing is "go back", not "deselect", so reopening lands on the same listing. Focus moves out before the sheet is hidden. */
    if (trigger.current && trigger.current.focus) trigger.current.focus();
    trigger.current = null;
    set({ sheet: false });
  };
  useEffect(() => {
    if (!ready) return;
    const repaint = () => set({ tick: state.tick + 1 });
    window.addEventListener("syn:overview", repaint);
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const tab = t.closest?.("#ovTabs [data-f]") as HTMLElement | null;
      if (tab) { document.querySelectorAll("#ovTabs .ovtab").forEach((x) => x.classList.toggle("on", x === tab)); set({ f: tab.dataset.f || "all", sel: 0 }); return; }
      if (t.closest?.("#ovSort")) {
        /* Sorts the shared array in place, as it always has, so the Listings pane follows. */
        listings().sort((a, b) => (sortDesc ? b.pr - a.pr : a.pr - b.pr));
        sortDesc = !sortDesc; set({ sel: 0, tick: state.tick + 1 });
        toast("Sorted by price · " + (sortDesc ? "low to high" : "high to low"));
        return;
      }
      if (t.closest?.("#ovFilter")) (document.getElementById("ovSearch") as HTMLInputElement | null)?.focus();
    };
    const input = (e: Event) => { const t = e.target as HTMLInputElement; if (t && t.id === "ovSearch") set({ q: t.value, sel: 0 }); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && state.sheet) closeSheet(); };
    document.addEventListener("click", click);
    document.addEventListener("input", input);
    document.addEventListener("keydown", esc);
    repaint();
    return () => { window.removeEventListener("syn:overview", repaint); document.removeEventListener("click", click); document.removeEventListener("input", input); document.removeEventListener("keydown", esc); };
  }, [ready]);

  /* The map draws the filtered list whenever it changes. Its pins link to #listing-<id>; that hash is never followed, the click is
     turned into the portal's own listing view, since for an agency "the property details" means the record they can edit. */
  const sig = list.map((l) => l.id + ":" + l.price + ":" + l.verification_status).join("|");
  useEffect(() => {
    if (!ready || !list.length || !W().SynMatches) return;
    const sb = W().SynSB || {};
    W().SynMatches.drawMatchMap(MAP, "ovMap", list.map(ovItem), { sb: { url: sb.url, anon: sb.key }, ask: null, href: (id: string) => "#listing-" + encodeURIComponent(id) });
  }, [ready, sig]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const host = document.getElementById("ovMap");
    if (!host) return;
    const open = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("[data-open]"); if (!a) return;
      const href = a.getAttribute("href") || "";
      if (href.indexOf("#listing-") !== 0) return;
      e.preventDefault();
      W().openListingById(decodeURIComponent(href.slice("#listing-".length)));
    };
    host.addEventListener("click", open);
    return () => host.removeEventListener("click", open);
  }, []);
  useEffect(() => { if (state.sheet && back.current) back.current.focus(); }, [s.sheet]);
  useEffect(() => { if (ready) W().synMotion?.refresh(); }, [ready, cur, s.dtab]);

  const select = (i: number, b: HTMLElement) => {
    set({ sel: i });
    focusMap(list[i], i);
    /* On a phone the map and card are below the list, so the result of the tap would be invisible: push the detail in as a sheet. */
    if (mobile) { trigger.current = b; set({ sheet: true }); }
  };

  let listBody: React.ReactNode;
  if (!list.length) {
    /* No listings at all, and a filter that matches none, need different words and different actions. */
    const none = !all.length;
    const filterName = ({ verified: "Verified", pending: "Pending", expiring: "Expiring soon" } as Record<string, string>)[s.f];
    listBody = none ? (
      <div className="ov-blank">
        <span className="ov-blank-i has-icon" data-icon="home" dangerouslySetInnerHTML={{ __html: svg("home") }}></span>
        <b>No listings yet</b>
        <p>Add your first property and the seven verification checks start automatically. Tayo can only match buyers to homes that are listed here.</p>
        <button className="btn btn-primary" type="button" data-ov-add="" onClick={() => document.getElementById("newListingBtn")?.click()}>+ Add your first listing</button>
      </div>
    ) : (
      <div className="ov-blank">
        <span className="ov-blank-i has-icon" data-icon="search" dangerouslySetInnerHTML={{ __html: svg("search") }}></span>
        <b>{"Nothing in " + (filterName || "this view")}</b>
        <p>{"You have " + all.length + " listing" + (all.length === 1 ? "" : "s") + (s.q ? ", none match \"" + s.q + "\" in this view." : ", just none in this one.")}</p>
        <button className="btn btn-ghost" type="button" data-ov-all="" onClick={() => {
          document.querySelectorAll("#pane-overview .ovtab").forEach((t) => t.classList.toggle("on", (t as HTMLElement).dataset.f === "all"));
          set({ f: "all", q: "" });
        }}>Show all listings</button>
      </div>
    );
  } else {
    listBody = list.map((l, i) => (
      <button key={l.id || i} className={"ovi " + (i === sel ? "on" : "")} data-i={i} onClick={(e) => select(i, e.currentTarget)}>
        <Thumb url={l.img} />
        <div className="mid"><div className="tt">{String(l.t || "").split(",")[0]}</div><div className="lc">{"◍ " + ovLoc(l)}</div></div>
        <div className="rt">
          <div className="pr">{naira(l.price)}</div>
          <span className={"ovs " + (l.st === "verified" ? "verified" : "pending")}>{l.st === "verified" ? "✓ Verified" : "◷ Pending"}</span>
          <div className="rf">{"SYN-" + (1000 + all.indexOf(l))}</div>
        </div>
        <span className="ovi-chv" aria-hidden="true">›</span>
      </button>
    ));
  }
  /* Off-canvas by transform still leaves the sheet reachable by tab and screen reader, so on a phone a closed sheet is aria-hidden.
     Desktop's detail is always the visible panel and is never hidden. */
  const open = mobile && s.sheet;
  return (
    <div className="ov-grid">
      <div className="ov-list" id="ovList">{listBody}</div>
      <div className={"ov-detail" + (s.sheet ? " on" : "")} aria-label="Listing detail" hidden={ready && !list.length}
        role={s.sheet ? "dialog" : undefined} aria-modal={s.sheet ? true : undefined} aria-hidden={mobile && !open ? true : undefined}>
        <div className="ov-sheet-hd">
          <button className="ov-sheet-back" id="ovBack" type="button" aria-label="Back to listings" ref={back} onClick={closeSheet}>←</button>
          <div className="ov-sheet-tt" id="ovSheetTitle">{cur ? String(cur.t || "").split(",")[0] : ""}</div>
        </div>
        <div className="ov-map" id="ovMap"></div>
        <div className="card ov-card" id="ovCard">{cur ? <Detail l={cur} /> : null}</div>
      </div>
    </div>
  );
}
