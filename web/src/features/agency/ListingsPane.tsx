"use client";
/**
 * The Listings pane's grid and toolbar, as React (was renderListings, listFiltered, draftCardHtml/sdCardHtml, the card menus,
 * Re-list and Re-list all, the CAC gate and the toolbar wiring in src/legacy/agency/inline-3.js).
 *
 * The listings themselves, their drafts, the freshness rule and the wizard stay in inline-3: this reads them through
 * window.SynListingsData(), SynFreshness, SynDrafts and listingForm(). renderListings() keeps its name there and asks this to
 * redraw (syn:lgrid). The filter row is lent to the phone dock's sheet, so its wrapper stays static in AgencyBody and only the
 * segment, the sort and the Re-list all button inside it are components; the search box and New listing are listened for.
 */
import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent, type MouseEvent } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";
import { useRevealed } from "./useRevealed";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const svg = (n: string) => (typeof window !== "undefined" && W().SynIcons && W().SynIcons.svg ? W().SynIcons.svg(n) : "");
const listings = (): any[] => (typeof window !== "undefined" && W().SynListingsData && W().SynListingsData()) || [];
const fresh = (l: any) => W().SynFreshness(l) as { cls: string; label: string; left: number; expired: boolean; warn: boolean };
const freshDays = (l: any) => (W().SynFreshDays ? W().SynFreshDays(l) : 21);
const lifeLabel = (l: any) => (W().SynLifeLabel ? W().SynLifeLabel(l) : "21 days");
const drafts = () => W().SynDrafts;
const openForm = (l: any, i: number, sd?: any) => W().listingForm(l, i, sd);
const naira = (v: number) => (W().SynNaira ? W().SynNaira(v) : "₦" + v);
const PERIOD_SUFFIX: Record<string, string> = { total: "", per_year: "/yr", per_month: "/mo", per_night: "/night" };
const priceLabel = (l: any) => naira(l.price) + (PERIOD_SUFFIX[l.price_period] || "");
const saveAndPaint = () => { W().SynSaveListings?.(); W().renderListings?.(); };

type Gate = { ok: boolean; canFix: boolean; known: boolean };
type St = { f: string; q: string; sort: "fresh" | "price" | "leads"; tick: number; menu: number | null; gate: Gate; relisting: boolean; uploading: boolean };
let state: St = { f: "all", q: "", sort: "fresh", tick: 0, menu: null, gate: { ok: true, canFix: false, known: false }, relisting: false, uploading: false };
const subs = new Set<() => void>();
const set = (v: Partial<St>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useLs = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);

const SORT_LABEL = { fresh: "Freshness", price: "Price", leads: "Leads" };
function filtered() {
  let a = listings().map((l, oi) => ({ l, oi }));
  if (state.q) { const q = state.q.toLowerCase(); a = a.filter((x) => String(x.l.t || "").toLowerCase().includes(q)); }
  if (state.f === "verified") a = a.filter((x) => x.l.st === "verified");
  else if (state.f === "pending") a = a.filter((x) => x.l.st === "pending");
  else if (state.f === "expiring") a = a.filter((x) => fresh(x.l).warn);
  else if (state.f === "expired") a = a.filter((x) => fresh(x.l).expired);
  if (state.sort === "fresh") a.sort((p, q) => fresh(p.l).left - fresh(q.l).left); // fewest days left first (action queue)
  else if (state.sort === "price") a.sort((p, q) => q.l.pr - p.l.pr);
  else if (state.sort === "leads") a.sort((p, q) => q.l.leads - p.l.leads);
  return a;
}
const expiring = () => listings().filter((l) => { try { const f = fresh(l); return f.warn || f.expired; } catch { return false; } });

/* THE GATE: an agency that has not yet shown a CAC certificate is asked for it before the form opens. The database refuses the
   insert either way. Asked fresh each time: the certificate may have been added or removed in the Verification pane. */
function loadListingGate(): Promise<void> {
  const L = W().SynListings;
  if (!L || !L.listingGate) return Promise.resolve();
  return L.listingGate()
    .then((g: any) => set({ gate: { ok: g.ok !== false, canFix: !!g.can_fix, known: true } }))
    .catch(() => { /* cannot tell: stay open, the database still decides */ });
}
function newListing() {
  loadListingGate().then(() => {
    const g = state.gate;
    if (g.known && !g.ok) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("lgGate")?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      toast(g.canFix ? "Add your CAC certificate first" : "Your agency owner needs to add the CAC certificate first");
      return;
    }
    openForm({ st: "pending" }, -1);
  });
}

/* The same per-listing call as one Re-list, for everything expiring or expired: no bulk endpoint, no new privilege. A partial
   failure leaves the rest renewed, and the count reported is what actually succeeded. */
function relistAll() {
  const due = expiring();
  if (!due.length) return;
  set({ relisting: true });
  Promise.all(due.map((l) =>
    W().SynListings.relist(l.id, freshDays(l)).then((row: any) => {
      /* Take the new date from the server rather than assuming it, so the grid repaints as what actually happened. */
      if (row && row.expires_at) l.expires_at = row.expires_at;
      if (row && row.availability_confirmed_at) l.availability_confirmed_at = row.availability_confirmed_at;
      l.days = 0;
      return true;
    }).catch((err: any) => { console.error("relist failed", l.id, err); return false; }),
  )).then((res) => {
    const ok = res.filter(Boolean).length;
    set({ relisting: false });
    saveAndPaint();
    if (ok === 0) { toast("Could not re-list those. Try one on its own."); return; }
    toast(ok === res.length
      ? "Re-listed " + ok + " " + (ok === 1 ? "listing" : "listings") + (ok === 1 ? " for another " + lifeLabel(due[0]) : ", each for its full window again")
      : "Re-listed " + ok + " of " + res.length + " — the rest failed");
  });
}
function relistOne(oi: number) {
  const l = listings()[oi];
  if (!l) return;
  l.days = 0;
  saveAndPaint();
  const said = () => toast("Re-listed, “" + String(l.t).split(",")[0] + "” is visible to buyers for the next " + lifeLabel(l));
  if (W().SynDbBacked?.() && l.id) {
    W().SynListings.relist(l.id, freshDays(l))
      .then((row: any) => {
        /* The new date comes from the server, so the card shows what actually happened. */
        if (row && row.expires_at) { l.expires_at = row.expires_at; saveAndPaint(); }
        said();
      })
      .catch((e: any) => toast("Not re-listed on the server: " + ((e && e.message) || e)));
  } else said();
}
/* Straight into the composer for THIS listing, on the pane that owns it: the composer's modal is anchored there. */
function postAbout(id: string) {
  W().goToPane?.("social");
  setTimeout(() => { if (typeof W().openComposer === "function") W().openComposer(id); else toast("The composer did not load"); }, 260);
}

export function ListSeg() {
  const { f } = useLs();
  const segs: [string, string][] = [["all", "All"], ["verified", "Verified"], ["pending", "Pending"], ["expiring", "Expiring"], ["expired", "Expired"]];
  return (
    <div className="seg" id="listSeg">
      {segs.map(([k, t]) => <button key={k} className={"seg-b" + (f === k ? " on" : "")} data-lf={k} onClick={() => set({ f: k })}>{t}</button>)}
    </div>
  );
}
export function ListSort() {
  const { sort } = useLs();
  const next = () => { const o = ["fresh", "price", "leads"] as const; set({ sort: o[(o.indexOf(sort) + 1) % o.length] }); };
  return (
    <button className="tbtn" id="listSort" onClick={next}>
      <span data-icon="sort" className="has-icon" dangerouslySetInnerHTML={{ __html: svg("sort") }}></span>{" Sort: " + SORT_LABEL[sort]}
    </button>
  );
}
export function RelistAll() {
  const { relisting } = useLs();
  const ready = usePageScripts();
  const n = ready ? expiring().length : 0;
  return (
    <button className="tbtn" id="relistAllBtn" hidden={n === 0} disabled={relisting} onClick={relistAll}>
      {relisting ? "Re-listing…" : "↻ Re-list " + n + " expiring"}
    </button>
  );
}

export function ListingGate() {
  const { gate, uploading } = useLs();
  const file = useRef<HTMLInputElement>(null);
  const upload = (file: File | undefined) => {
    if (!file) return;
    set({ uploading: true });
    const L = W().SynListings;
    const cacNo = ((document.getElementById("lgCac") as HTMLInputElement | null)?.value || "").trim();
    L.uploadDocument(file, { type: "cac_certificate" })
      .then(() => { if (cacNo && L.saveBrand) return L.saveBrand({ cac_number: cacNo.slice(0, 40) }).catch(() => {}); })
      .then(() => { toast("Uploaded. You can add listings now."); return loadListingGate(); })
      .catch((err: any) => toast((err && err.message) || "Could not upload that. Try again."))
      .then(() => set({ uploading: false }));
  };
  return (
    <div className="lg-gate" id="lgGate" hidden={gate.ok}>
      <div className="lg-gate-t">Add your CAC certificate to start listing</div>
      <p>One document is enough to begin. Upload it now and add listings straight away; the verification desk reviews it afterwards.</p>
      <input id="lgCac" placeholder="CAC registration number, e.g. RC 1234567" autoComplete="off" aria-label="CAC registration number" style={{ display: "block", width: "100%", maxWidth: "340px", minHeight: "44px", margin: "0 0 10px", padding: "0 14px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", font: "500 14px var(--f-sans)" }} />
      <button type="button" className="btn btn-primary" id="lgGateBtn" hidden={!gate.canFix} disabled={uploading} onClick={() => file.current?.click()}>
        {uploading ? "Uploading…" : "Upload CAC certificate"}
      </button>
      <input ref={file} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*" style={{ display: "none" }}
        onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      <span className="lg-gate-agent" id="lgGateAgent" hidden={gate.canFix}>Ask your agency owner to upload it.</span>
    </div>
  );
}

function Photo({ url }: { url: string | null | undefined }) {
  const u = typeof url === "string" ? url.trim() : "";
  /* A URL that does not load drops the broken <img> and tags the wrapper, as photoHtml() did. */
  return <div className="lph">{u ? <img src={u} alt="" loading="lazy" onError={(e) => { const p = e.currentTarget.closest(".lph"); p?.classList.add("no-photo"); e.currentTarget.remove(); }} /> : null}</div>;
}
function VStamp() {
  return (
    <span className="vst ok" title="Verified by Synapse: all seven checks passed">
      <span className="vst-in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.4 3 8 7.5 9.5 4.5-1.5 7.5-5.1 7.5-9.5V6z" /><path d="m8.6 12 2.4 2.4 4.4-4.8" /></svg><b>VERIFIED</b><i>SYNAPSE</i></span>
      <span className="vst-pm" aria-hidden="true"></span><span className="sr-only">Verified. </span>
    </span>
  );
}
const Ico = ({ n }: { n: string }) => <span data-icon={n} className="has-icon" dangerouslySetInnerHTML={{ __html: svg(n) }}></span>;

function DraftCard({ cover, price, title, chip, when, sd }: { cover: string; price: number; title: string; chip: string; when: string; sd?: string }) {
  return (
    <div className="card lcard ldraft" data-sd={sd}>
      <div className="media"><span className="fresh draft">{chip}</span><Photo url={cover} /></div>
      <div className="bd">
        <div className="pr">{Number(price) > 0 ? "₦" + Number(price).toLocaleString("en-NG") : "No price yet"}</div>
        <div className="tt">{title}</div>
        <div className="ft"><span className="st-chip draft">Draft</span><span className="ld">{when}</span></div>
        <div className="acts">
          {sd ? <><button className="edit" data-sd-open={sd}>Continue</button><button className="relist" data-sd-discard={sd}>Discard</button></>
            : <><button className="edit" data-draft-open="">Continue</button><button className="relist" data-draft-discard="">Discard</button></>}
        </div>
      </div>
    </div>
  );
}

function Card({ l, oi, menu }: { l: any; oi: number; menu: boolean }) {
  const f = fresh(l);
  const leads = Number(l.leads) || 0;
  const label = W().SynTypeLabel?.[l.property_type] || "";
  const meta = f.expired
    ? (f.left === 0 ? "Expired today" : "Expired " + (-f.left) + (f.left === -1 ? " day" : " days") + " ago")
    : [label, leads + (leads === 1 ? " lead" : " leads")].filter(Boolean).join(" · ");
  const due = f.expired || f.warn;
  const cls = "card lcard lc2 " + (f.expired ? "expired" : "");
  const el = useRevealed(cls);   // a re-listed card loses "expired", which must not cost it motion.js's .in
  /* A CALMER CARD (Eden, 2026-10-03): status once, as one chip on the photo; expiry only when it matters; one main action -- Post,
     or Re-list when the listing is running out -- with Share beside it, and Edit / Re-list in the menu. The whole card opens Edit. */
  return (
    <div ref={el} className={cls} data-card-edit={oi} tabIndex={0} aria-label={l.t + ": open to edit"}>
      <div className="media">
        <Photo url={l.img} />
        {l.st === "verified" ? <VStamp /> : l.st === "pending" ? <span className="lc-st rev">In review</span> : l.st === "inactive" ? <span className="lc-st off">Not live</span> : null}
        {f.expired ? <span className="lc-exp dead">Hidden from buyers</span> : f.warn ? <span className="lc-exp warn">{f.left + (f.left === 1 ? " day" : " days") + " left"}</span> : null}
      </div>
      <div className="bd">
        <div className="pr">{priceLabel(l)}</div>
        <div className="tt">{l.t}</div>
        <div className="lc-meta">{meta}</div>
        <div className="lc-row">
          {due ? <button className="lc-main" data-relist={oi}>↻ Re-list</button> : <button className="lc-main" data-post={l.id}><Ico n="spark" /> Post</button>}
          {f.expired ? null : <button className="lc-ic" data-share={l.id} aria-label="Share" title="Share"><Ico n="share" /></button>}
          <div className="lc-more">
            <button className="lc-ic" data-more="" aria-label="More actions" aria-expanded={menu} title="More">⋯</button>
            <div className="lc-menu" role="menu" hidden={!menu}>
              <button role="menuitem" data-edit={oi}>Edit listing</button>
              {due ? <button role="menuitem" data-post={l.id}>Post about it</button> : <button role="menuitem" data-relist={oi}>{"Re-list for " + lifeLabel(l)}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListingsGrid() {
  const st = useLs();
  const ready = usePageScripts();

  useEffect(() => {
    const redraw = () => set({ tick: state.tick + 1 });
    const onClick = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest?.("#newListingBtn")) { newListing(); return; }
      if (state.menu != null && !t.closest?.("#lgrid .lc-more")) set({ menu: null });
    };
    const onInput = (e: Event) => { const t = e.target as HTMLInputElement; if (t && t.id === "listSearch") set({ q: t.value }); };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape" && state.menu != null) set({ menu: null }); };
    window.addEventListener("syn:lgrid", redraw);
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("syn:lgrid", redraw); document.removeEventListener("click", onClick); document.removeEventListener("input", onInput); document.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    W().loadListingGate = loadListingGate;
    W().SynLG = () => state.gate;
    loadListingGate();
  }, [ready]);

  const click = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    const at = (s: string) => t.closest(s) as HTMLElement | null;
    const L = listings(), D = drafts();
    const mo = at("[data-more]");
    if (mo) { const oi = +(mo.closest("[data-card-edit]") as HTMLElement).dataset.cardEdit!; set({ menu: state.menu === oi ? null : oi }); return; }
    const sh = at("[data-share]");
    if (sh) { set({ menu: null }); W().openShareKit(sh.dataset.share); return; }
    const po = at("[data-post]");
    if (po) { postAbout(po.dataset.post!); return; }
    const sdo = at("[data-sd-open]");
    if (sdo) { const d = D.sd().list.find((x: any) => x.id === sdo.dataset.sdOpen); if (d) openForm({ st: "pending" }, -1, d); return; }
    const sdx = at("[data-sd-discard]");
    if (sdx) {
      if (!window.confirm("Discard this draft? It cannot be brought back.")) return;
      const id = sdx.dataset.sdDiscard; const mine = D.sd().cur === id;
      D.del(id); if (mine) D.clear();
      toast("Draft discarded"); return;
    }
    if (at("[data-draft-open]")) { D.sd().cur = null; openForm({ st: "pending" }, -1); return; }
    if (at("[data-draft-discard]")) {
      if (!window.confirm("Discard this unsaved listing? It cannot be brought back.")) return;
      D.clear(); W().renderListings(); toast("Draft discarded"); return;
    }
    const ed = at("[data-edit]");
    if (ed) { set({ menu: null }); const i = +ed.dataset.edit!; openForm({ ...L[i] }, i); return; }
    const rl = at("[data-relist]");
    if (rl) { set({ menu: null }); relistOne(+rl.dataset.relist!); return; }
    /* The card itself opens Edit; its buttons and menu keep their own jobs. */
    const card = at("[data-card-edit]");
    if (card && !at("button, a, .lc-menu")) { set({ menu: null }); const i = +card.dataset.cardEdit!; openForm({ ...L[i] }, i); }
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (e.key !== "Enter" || t.getAttribute("data-card-edit") == null) return;
    const i = +t.dataset.cardEdit!; openForm({ ...listings()[i] }, i);
  };

  let body: React.ReactNode = null;
  if (ready && W().SynFreshness) {
    const rows = filtered();
    /* Server drafts first (any device), then the browser's own copy only when no server draft already covers it. Not listings
       yet, so the Verified / Pending / Expiring views -- which are questions about listings -- do not show them. */
    const cards: React.ReactNode[] = [];
    const D = drafts();
    if (st.f === "all" && !st.q && D) {
      const sd = D.sd(), local = D.local();
      const covered = local && sd.list.some((d: any) => d.id === sd.cur || Math.abs(Date.parse(d.updated_at) - Number(local.at)) < 20000);
      if (local && !covered) {
        const x = local.data || {};
        cards.push(<DraftCard key="local" cover={W().SynListingCover(x.media) || ""} price={x.price} title={x.title || "Untitled listing"} chip="Not saved yet" when={"Edited " + D.ago(local.at)} />);
      }
      sd.list.forEach((d: any) => {
        const x = d.data || {};
        cards.push(<DraftCard key={"sd" + d.id} sd={d.id} cover={W().SynListingCover(x.media) || ""} price={x.price} title={d.title || x.title || "Untitled listing"}
          chip={"Draft · step " + Math.min(d.step || 1, D.total) + " of " + D.total} when={"Saved " + D.ago(Date.parse(d.updated_at))} />);
      });
    }
    body = !rows.length && !cards.length
      ? <div className="noti-empty" style={{ gridColumn: "1/-1" }}>No listings match this view.</div>
      : <>{cards}{rows.map(({ l, oi }) => <Card key={l.id || "i" + oi} l={l} oi={oi} menu={st.menu === oi} />)}</>;
  }
  return <div className="lgrid" id="lgrid" onClick={click} onKeyDown={key}>{body}</div>;
}
