"use client";
/**
 * Your matches (React since 2026-10-24, was src/legacy/browse/inline-3.js).
 *
 * Every live home, verified and unverified each clearly labelled; after a Tayo conversation, the homes that match the brief.
 * Search, deal filters, sort, Verified only, list or map, compare up to four saved homes, "new since your last visit" and
 * the recently viewed rail. Cards and the map are the shared ones (public/app/matches-shared.js), identical to Tayo's panel.
 *
 * The phone navigation (cust-nav.js) moves the search box, the filter row and the Map chip into its own bar and sheets, so
 * those elements are always rendered (shown or hidden), never added or removed: React keeps updating them wherever they sit.
 * Rules kept from the old page: skeletons only while the request is really in flight, no sample homes ever, a failed request
 * is a failure and not an empty shop, and no invented numbers in the comparison.
 */
import { useEffect, useRef, useState } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

const SUPABASE_URL = "https://bhrhejpekmhbhwryjhgk.supabase.co";
const ANON_KEY = "sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV";
const PREFS_KEY = "synapse_browse_prefs";
const VISIT_KEY = "synapse_last_visit";
const DEALS = ["sale", "rent", "shared", "land", "offplan", "invest", "shortlet"];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Item = any;
type SynMatches = {
  naira: (n: number) => string; esc: (s: unknown) => string; readSaves: () => Set<string>; onSavesChanged: (f: (s: Set<string>) => void) => void;
  toggleSave: (id: string) => Set<string>; listingCardHtml: (l: Item, i: number, o: Record<string, unknown>) => string;
  drawMatchMap: (st: Record<string, any>, el: string, items: Item[], o: Record<string, unknown>) => void; recordView: (l: Item) => void;
  propertyHref: (id: string) => string; readViews: () => Item[]; shapeTojuMatch: (m: Item) => Item;
};
const SM = () => (window as any).SynMatches as SynMatches | undefined;

const BROWSE_BASE = SUPABASE_URL + "/rest/v1/properties?select=id,title,city,state,listing_type,price_period,property_type,verification_status,price,bedrooms,bathrooms,area_sqm,trust_score,expires_at,listed_at,currency,latitude,longitude,area_name,deal_structure,build_stage,handover_date,build_progress_pct,payment_plan,deposit_pct,instalment_months,units_available,plot_count,plot_size_sqm,min_investment,property_media(url,display_order,media_type),neighbourhoods(name),agencies(name,logo_url,brand_color,brand_font,cac_number,cac_certificate_on_file)"
  + "&status=eq.live&is_active=is.true";
const HDR = { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY };

/* The cover is a photo: the first photo in display order, a still from the video for a video-only listing, never stock. */
const coverIsVideo = (m: any) => !!m && (m.media_type === "video" || /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(m.url || "")));
const coverFrame = (u: string) => (/res\.cloudinary\.com\/.+\/video\/upload\//.test(String(u || ""))
  ? String(u).replace("/video/upload/", "/video/upload/so_0/").replace(/\.(mp4|mov|m4v|qt|webm|3gp)(\?.*)?$/i, ".jpg") : null);
const coverOf = (media: any) => {
  const s = (Array.isArray(media) ? media : []).filter((m: any) => m && m.url).slice().sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const photo = s.find((m: any) => !coverIsVideo(m));
  return photo ? photo.url : s.length ? coverFrame(s[0].url) : null;
};
function shapeRow(p: any): Item {
  const cats = [p.property_type === "shared" ? "shared" : p.listing_type === "rent" ? "rent" : "sale"];
  if (p.property_type === "land") cats.push("land");
  if (p.listing_type === "shortlet" || p.deal_structure === "shortlet") cats.push("shortlet");
  if (p.deal_structure === "off_plan" || p.build_stage === "under_construction" || p.build_stage === "not_started") cats.push("offplan");
  if (["joint_venture", "development_financing", "off_plan"].includes(p.deal_structure) || Number(p.min_investment) > 0) cats.push("invest");
  const bits: string[] = [];
  if (p.bedrooms) bits.push("<b>" + p.bedrooms + " bed" + (p.bedrooms > 1 ? "s" : "") + "</b>");
  if (p.bathrooms) bits.push(p.bathrooms + " bath" + (p.bathrooms > 1 ? "s" : ""));
  if (p.area_sqm) bits.push(Math.round(Number(p.area_sqm)) + " m²");
  const facts = bits.join(" · ");
  const a0 = Array.isArray(p.agencies) ? p.agencies[0] : p.agencies;
  const area = p.area_name && p.area_name.trim();
  return {
    id: p.id, img: coverOf(p.property_media),
    kind: p.property_type === "shared" ? "shared" : p.listing_type === "rent" ? "rent" : "sale",
    cats,
    dealInfo: { isLand: p.property_type === "land", deal: p.deal_structure, stage: p.build_stage, handover: p.handover_date, progress: p.build_progress_pct,
      plan: p.payment_plan, deposit: p.deposit_pct, months: p.instalment_months, units: p.units_available, plots: p.plot_count, plotSize: p.plot_size_sqm, minInv: p.min_investment },
    per: p.listing_type === "rent",
    perLabel: ({ per_year: "/yr", per_month: "/mo", per_night: "/night" } as Record<string, string>)[p.price_period] || "",
    vstatus: p.verification_status, expiresAt: p.expires_at || null, listedAt: p.listed_at || null, currency: p.currency || null,
    deal: p.property_type === "shared" ? "Shared room" : p.listing_type === "shortlet" ? "Short-let" : p.listing_type === "rent" ? "For rent" : "For sale",
    priceN: Number(p.price) || 0,
    /* The Area the agency typed, then the linked zone, then the city; also what the search box matches. */
    ttl: p.title,
    loc: area && area.length <= 40 && !/\n/.test(area) ? area + ", " + p.city : p.neighbourhoods && p.neighbourhoods.name ? p.neighbourhoods.name : p.city + ", " + (p.state || ""),
    score: p.trust_score, match: null,
    agency: a0 && a0.name ? { name: a0.name, logo: a0.logo_url, color: a0.brand_color, font: a0.brand_font, cac: a0.cac_number, cacDoc: !!a0.cac_certificate_on_file } : null,
    lat: p.latitude == null ? null : Number(p.latitude), lng: p.longitude == null ? null : Number(p.longitude),
    /* The card says what this home IS while you scan; the unverified line keeps its prompt about what to do next. */
    why: p.verification_status === "verified" ? facts : (facts ? facts + " · " : "") + "Tayo can run the 7 checks before you commit",
  };
}

function matchesSearch(l: Item, q: string, naira: (n: number) => string) {
  if (!q) return true;
  const hay = (l.ttl + " " + l.loc + " " + (l.deal || "") + " " + naira(l.priceN)).toLowerCase();
  return q.split(/\s+/).every((term) => {
    if (!term) return true;
    const under = term.match(/^(?:under|below|<)?₦?(\d+)m?$/);
    if (under && /\d/.test(term)) {
      const cap = parseInt(under[1], 10) * (term.includes("m") || parseInt(under[1], 10) < 10000 ? 1e6 : 1);
      if (/^(under|below|<)/.test(q) || q.includes("under") || q.includes("below")) return l.priceN <= cap;
    }
    return hay.includes(term);
  });
}

type Load = "loading" | "ready" | "failed";

export function BrowsePage() {
  const scripts = usePageScripts();
  const [items, setItems] = useState<Item[]>([]);
  const [load, setLoad] = useState<Load>("loading");
  const [session, setSession] = useState(false);          // a Tayo session answered (with or without homes)
  const [saves, setSaves] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [deal, setDeal] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("match");
  const [view, setView] = useState<"list" | "map">("list");
  const [areaIds, setAreaIds] = useState<Set<string> | null>(null);
  const [count, setCount] = useState("Loading homes…");
  const [title, setTitle] = useState("Your matches");
  const [hideMap, setHideMap] = useState(false);
  const [views, setViews] = useState<Item[]>([]);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; on: boolean }>({ msg: "", on: false });
  const lastVisit = useRef<number | null | undefined>(undefined);
  const mapState = useRef<Record<string, any>>({});
  const popId = useRef<string | null>(null);
  const prefsReady = useRef(false);
  const lockedAt = useRef(0);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const say = (msg: string) => {
    setToast({ msg, on: false }); requestAnimationFrame(() => setToast({ msg, on: true }));
    clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 3600);
  };

  /* "New since your last visit": the baseline is read ONCE and the clock reset at once, so it means the previous visit. */
  if (lastVisit.current === undefined && typeof window !== "undefined") {
    let prev: number | null = null;
    try { const t = Date.parse(localStorage.getItem(VISIT_KEY) || ""); if (Number.isFinite(t)) prev = t; localStorage.setItem(VISIT_KEY, new Date().toISOString()); } catch { /* private mode: no claim */ }
    lastVisit.current = prev;
  }

  /* The page's own choices, restored before the first real render. */
  useEffect(() => {
    let p: any = {};
    try { p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}; } catch { p = {}; }
    if (["match", "price", "trust"].includes(p.sort)) setSort(p.sort);
    if (DEALS.includes(p.deal)) setDeal(p.deal);
    if (p.verifiedOnly === true) setVerifiedOnly(true);
    if (p.view === "map") setView("map");
    prefsReady.current = true;
  }, []);
  useEffect(() => {
    if (!prefsReady.current) return;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ sort, deal, verifiedOnly, view })); } catch { /* storage blocked */ }
  }, [sort, deal, verifiedOnly, view]);

  /* The listings and the Tayo session are asked for at once; they do not need the shared scripts. Only drawing the cards and
     shaping a Tayo match do, and those wait for them. */
  const sessionView = useRef(false);
  useEffect(() => {
    /* A balanced set so every quick filter has homes; freshest first so the feed spans many neighbourhoods. */
    Promise.all(["&property_type=neq.shared&verification_status=eq.verified&order=listed_at.desc&limit=800",
      "&property_type=neq.shared&verification_status=neq.verified&order=listed_at.desc&limit=300",
      "&property_type=eq.shared&order=listed_at.desc&limit=200"].map((qs) =>
      fetch(BROWSE_BASE + qs, { headers: HDR }).then((r) => r.json().catch(() => null).then((d) => {
        if (!r.ok || !Array.isArray(d)) throw new Error("listings " + r.status);   // a failure, not an empty shop
        return d;
      })))).then(([v, u, s2]) => {
      const rows = [...v, ...u, ...s2];
      setLoad("ready");
      if (sessionView.current || !rows.length) return;
      setItems(rows.map(shapeRow));
      setCount("<b>" + rows.length + "</b> live · <b>" + rows.filter((r: any) => r.verification_status === "verified").length + "</b> verified");
    }).catch(() => { if (!sessionView.current) { setLoad("failed"); setItems([]); } });
    const online = () => { setLoad((l) => { if (l === "failed") location.reload(); return l; }); };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);
  const [sessionRaw, setSessionRaw] = useState<any>(null);
  useEffect(() => {
    const visitor = localStorage.getItem("toju_visitor_v1");
    if (!visitor) return;
    fetch(SUPABASE_URL + "/functions/v1/toju-demo", {
      method: "POST", headers: { "Content-Type": "application/json", ...HDR }, body: JSON.stringify({ action: "matches", visitorId: visitor }),
    }).then((r) => r.json()).then((d) => {
      /* A real session with nothing matched shows the honest empty state, never other homes. */
      if (d.criteria && (!Array.isArray(d.matches) || d.matches.length === 0)) {
        sessionView.current = true; setSession(true); setItems([]); setPicked(new Set()); setTitle("Your matches");
        setCount("Nothing fits your brief yet"); setHideMap(true);
        return;
      }
      if (!Array.isArray(d.matches) || !d.matches.length) return;
      sessionView.current = true; setSession(true); setTitle("Your matches");
      setSessionRaw(d.matches);
      setCount("<b>" + d.matches.length + "</b> match your brief");
    }).catch(() => {});
  }, []);
  /* What needs the shared scripts: the saves, the recent rail, and shaping Tayo's matches exactly as its panel does. */
  useEffect(() => {
    if (!scripts) return;
    const sm = SM(); if (!sm) return;
    setSaves(sm.readSaves());
    sm.onSavesChanged((st) => setSaves(new Set(st)));   // another tab hearted something
    setViews(sm.readViews());
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setViews(sm.readViews()); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [scripts]);
  useEffect(() => {
    const sm = SM();
    if (!scripts || !sm || !sessionRaw) return;
    setItems(sessionRaw.map(sm.shapeTojuMatch)); setPicked(new Set());
  }, [scripts, sessionRaw]);

  const sm = typeof window !== "undefined" ? SM() : undefined;
  const naira = sm ? sm.naira : (n: number) => String(n);
  const compareOn = saves.size >= 2;   // compare appears once there is a shortlist
  const scored = items.some((l) => typeof l.match === "number");
  const newest = (a: Item, b: Item) => String(b.listedAt || "").localeCompare(String(a.listedAt || ""));
  const sorted = items.slice().sort((a, b) => (sort === "price" ? a.priceN - b.priceN : sort === "trust" ? (b.score || 0) - (a.score || 0) : scored ? (b.match || 0) - (a.match || 0) : newest(a, b)));
  const shown = sorted.filter((l) => matchesSearch(l, q, naira) && (deal === "all" || (l.cats || [l.kind || "sale"]).includes(deal))
    && (!verifiedOnly || l.vstatus === "verified") && (!areaIds || areaIds.has(l.id)));
  const loadingView = (load === "loading" && !session && items.length === 0) || (!sm && load === "ready" && items.length > 0);
  const pickedNow = compareOn ? picked : new Set<string>();
  const fresh = lastVisit.current ? shown.filter((l) => { const t = l.listedAt ? Date.parse(l.listedAt) : NaN; return Number.isFinite(t) && t > (lastVisit.current as number); }) : [];
  const cards = (list: Item[]) => (sm ? list.map((l, i) => sm.listingCardHtml(l, i, { saves, picked: pickedNow, compare: compareOn })).join("") : "");

  /* After each paint: the map (the only map that opts into area search), motion, the saved counters, the heart pulse. */
  useEffect(() => {
    if (!sm || loadingView) return;
    sm.drawMatchMap(mapState.current, "map", shown.length || q ? shown : sorted, {
      areaSearch: true, sb: { url: SUPABASE_URL, anon: ANON_KEY }, onAreaResults: (rows: any[]) => setAreaIds(new Set((rows || []).map((r) => r.id))),
    });
    (window as any).synMotion?.refresh();
    if (popId.current) { document.querySelector('[data-save="' + popId.current + '"]')?.classList.add("pop"); popId.current = null; }
  });
  useEffect(() => {
    (window as any).CustNav?.setCount("dream.html", saves.size);
    window.dispatchEvent(new CustomEvent("syn:saves", { detail: saves.size }));
  }, [saves, scripts]);
  /* Leaflet caches its box: re-measure after the list/map height change, and once more as it settles. */
  useEffect(() => {
    document.body.classList.toggle("view-map", view === "map");
    const nudge = () => mapState.current.map?.invalidateSize();
    requestAnimationFrame(nudge); const t = setTimeout(nudge, 320);
    return () => clearTimeout(t);
  }, [view]);
  useEffect(() => { if (!compareOn && picked.size) setPicked(new Set()); }, [compareOn, picked.size]);

  /* One handler for both grids, so the "new since" cards behave exactly like the rest. */
  const onGrid = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-area-clear]")) { setAreaIds(null); return; }
    const sv = t.closest("[data-save]");
    if (sv && sm) {
      const id = sv.getAttribute("data-save")!, was = saves.has(id);
      setSaves(new Set(sm.toggleSave(id)));   // re-reads storage; no lost updates
      if (!was) { popId.current = id; say("Saved, your ♥ homes stay on this device."); } else say("Removed from your saved homes.");
      return;
    }
    const cb = t.closest("[data-cmp]") as HTMLInputElement | null;
    if (cb) {
      const id = cb.getAttribute("data-cmp")!, next = new Set(picked);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size > 4) { next.delete(id); cb.checked = false; }
      setPicked(next); return;
    }
    if (t.closest(".cmpbox")) return;   // the label re-dispatches to its checkbox; do not open the card
    const card = t.closest(".listing");
    if (card && sm) {
      const id = card.getAttribute("data-id")!;
      const viewed = shown.find((l) => l.id === id) || items.find((l) => l.id === id);
      if (viewed) sm.recordView(viewed);   // the only writer of the recently-viewed history
      if (t.closest("a[href]")) return;    // a real link navigates itself (cmd/ctrl-click too)
      location.href = sm.propertyHref(id);
    }
  };

  const openCompare = () => {
    lockedAt.current = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden";
    setVerdict(null); setCmpOpen(true);
  };
  const closeCompare = () => {
    setCmpOpen(false);
    document.documentElement.style.overflow = ""; document.body.style.overflow = "";
    window.scrollTo(0, lockedAt.current);
  };
  useEffect(() => {
    if (!cmpOpen) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") closeCompare(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  });
  const sel = sorted.filter((l) => picked.has(l.id));   // in the list's current order
  const askVerdict = async () => {
    setVerdict("…");
    try {
      const r = await fetch(SUPABASE_URL + "/functions/v1/toju-demo", {
        method: "POST", headers: { "Content-Type": "application/json", ...HDR },
        body: JSON.stringify({ action: "compare", visitorId: localStorage.getItem("toju_visitor_v1"),
          items: sel.map((l) => ({ id: l.id, title: l.ttl, price: l.priceN, deal: l.per ? "rent" : "sale", trustScore: l.score, yieldPct: l.yield ?? null, area: l.loc })) }),
      });
      const d = await r.json();
      setVerdict(d.verdict ? "ok:" + d.verdict : "Hmm, I could not reach Tayo, try again.");
    } catch { setVerdict("Connection hiccup, try again."); }
  };
  /* Flood risk and power reliability are not compared: both were invented numbers in the seed data. */
  const cmpRows: Array<[string, Array<number | string>, "min" | "max", (v: any, best: number | null) => React.ReactNode]> = [
    ["Price", sel.map((l) => l.priceN), "min", (v, b) => <span className={v === b ? "best" : ""}>{naira(v)}</span>],
    ...(sel.some((l) => typeof l.match === "number")
      ? [["Match", sel.map((l) => l.match), "max", (v: any, b: number | null) => (typeof v !== "number" ? "—" : <span className={v === b ? "best" : ""}>{v}%</span>)] as [string, Array<number | string>, "min" | "max", (v: any, best: number | null) => React.ReactNode]]
      : []),
    ["Property confidence", sel.map((l) => l.score ?? "-"), "max", (v, b) => (typeof v !== "number" ? "-" : <span className={v === b ? "best" : ""}>{v}</span>)],
    ["Gross yield", sel.map((l) => l.yield ?? "-"), "max", (v, b) => (typeof v !== "number" ? "-" : <span className={v === b ? "best" : ""}>{v}%</span>)],
  ];

  const emptyBox = (() => {
    if (loadingView || shown.length) return null;
    if (load === "loading" && !session) return <><div className="empty-ttl">Finding homes…</div><p className="empty-sub">Checking every verified listing across Nigeria.</p></>;
    if (load === "failed" && !session) {
      return (
        <>
          <div className="empty-ttl">Nothing to show right now</div>
          <p className="empty-sub">{typeof navigator !== "undefined" && navigator.onLine ? "We couldn’t reach our listings, nothing was found. This is on our side, not yours." : "You’re offline, so nothing could be found. Reconnect and try again."}</p>
          <div className="empty-acts"><button className="btn btn-primary" type="button" id="retryLoad" onClick={() => location.reload()}>Try again</button><a className="btn btn-ghost" href="toju.html">Ask Tayo instead</a></div>
        </>
      );
    }
    return (
      <>
        <div className="empty-ttl">No homes fit this exact brief yet</div>
        <p className="empty-sub">That usually just means the brief is a little tight. Try one of these:</p>
        <div className="empty-acts">
          <a className="btn btn-ghost" href={"toju.html?ask=" + encodeURIComponent("Widen my budget a little and show me what opens up")}>Widen the budget</a>
          <a className="btn btn-ghost" href={"toju.html?ask=" + encodeURIComponent("Show me good homes in nearby areas too")}>Try a nearby area</a>
          <a className="btn btn-primary" href={"toju.html?ask=" + encodeURIComponent("Help me find homes similar to what I asked for")}>Ask Tayo to help</a>
        </div>
      </>
    );
  })();
  const failedCount = load === "failed" && !session ? "Couldn’t load homes" : null;
  const skeletons = Array.from({ length: 6 }, (_, i) =>
    '<div class="sk-card" aria-hidden="true" style="--sk-i:' + i + '">'
    + '<div class="sk-b" style="width:42%"></div><div class="sk-b sk-big" style="width:58%"></div>'
    + '<div class="sk-b" style="width:84%"></div><div class="sk-b" style="width:36%"></div><div class="sk-img"></div></div>').join("");
  const areaNote = areaIds
    ? '<div class="area-note" style="grid-column:1/-1;display:flex;gap:10px;align-items:center;font-size:13px;color:var(--ink-muted)">'
      + 'Showing the homes in the map area. <button type="button" class="btn btn-ghost" data-area-clear style="min-height:34px;padding:0 12px">Show everywhere</button></div>'
    : "";

  return (
    <>
      <div className="wrap" data-cnav-back-slot="" role="main">
        <div className="h1" id="pageTitle" role="heading" aria-level={1}>{title}</div>
        <div className="searchbar" data-cnav-search="">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>{" "}
          <input id="searchInput" type="text" placeholder="Search by area, city, type or price, e.g. Lekki, 3-bed, duplex, under 150M…" autoComplete="off"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <button id="searchClear" hidden={!q.trim()} aria-label="Clear" onClick={() => { setQ(""); (document.getElementById("searchInput") as HTMLInputElement | null)?.focus(); }}>✕</button>
        </div>
        <div className="bm-meta"><span className="bm-count" id="bmCount" dangerouslySetInnerHTML={{ __html: failedCount || count }} /></div>
        <div id="map" style={hideMap || (load === "failed" && !session) ? { display: "none" } : undefined}></div>
        <div data-cnav-actions="">
          <button className="cnav-act" id="bmMap" type="button" aria-pressed={view === "map"} onClick={() => setView(view === "map" ? "list" : "map")}>
            <span data-icon="pin"></span>{" Map view\n      "}
          </button>
          <div data-proximity-slot=""></div>
        </div>
        <div className="viewseg" role="group" aria-label="View">
          {(["list", "map"] as const).map((v) => (
            <button key={v} type="button" className={"vseg" + (view === v ? " on" : "")} data-view={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === "list" ? "List" : "Map"}</button>
          ))}
        </div>
        <div className="toolbar" data-cnav-filters="">
          <div className="dealfilter" id="dealFilter">
            {[["sale", "Buy"], ["rent", "Rent"], ["shared", "Shared living"], ["land", "Land"], ["offplan", "Off-plan"], ["invest", "Investment"], ["shortlet", "Short-let"]].map(([d, l]) => (
              <button key={d} data-deal={d} className={deal === d ? "on" : undefined} onClick={() => setDeal(deal === d ? "all" : d)}>{l}</button>
            ))}
          </div>
          <select id="sortSel" aria-label="Sort homes" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="match">Sort: Best match</option>
            <option value="price">Sort: Price (low → high)</option>
            <option value="trust">Sort: Property confidence</option>
          </select>
          <button className={"vtoggle" + (verifiedOnly ? " on" : "")} id="verifyToggle" title="Show only homes Synapse has checked" onClick={() => setVerifiedOnly(!verifiedOnly)}>
            <span className="box">{verifiedOnly ? "✓" : ""}</span>{" Verified only"}
          </button>
        </div>
        <div className="recent" id="recentRail" hidden={!views.length}>
          <div className="recent-h">Recently viewed</div>
          <div className="recent-track" id="recentTrack">
            {views.map((v, i) => (
              <a className="rc" key={v.id + i} href={sm ? sm.propertyHref(v.id) : "#"}>
                <span className="rc-price">{naira(v.priceN)}{v.per ? <i>/yr</i> : null}</span>
                <span className="rc-ttl">{v.ttl}</span><span className="rc-loc">{v.loc}</span>
              </a>
            ))}
          </div>
        </div>
        <section className="fresh-since" id="freshSince" hidden={loadingView || !fresh.length} aria-labelledby="freshSinceH">
          <div className="fresh-h">
            <span id="freshSinceH">New since your last visit</span>
            <span className="fresh-n" id="freshSinceN">{fresh.length === 1 ? "1 home" : fresh.length ? fresh.length + " homes" : ""}</span>
          </div>
          <div className="grid" id="freshGrid" onClick={onGrid} dangerouslySetInnerHTML={{ __html: loadingView ? "" : cards(fresh) }} />
        </section>
        <span className="sr-only" id="gridStatus" role="status" aria-live="polite">{loadingView ? "Finding homes…" : ""}</span>
        <div className="grid" id="grid" aria-busy={loadingView ? "true" : undefined} onClick={onGrid}
          dangerouslySetInnerHTML={{ __html: loadingView ? skeletons : areaNote + cards(shown) }} />
        <div className="empty" role="status" aria-live="polite" hidden={!emptyBox}>{emptyBox}</div>
      </div>
      <div className={"cmpbar" + (picked.size >= 2 ? " on" : "")} id="cmpbar" data-cnav-clear="">
        <span><b id="cmpCount">{picked.size}</b>{" selected"}</span>
        <button id="cmpGo" onClick={openCompare}>Compare side by side</button>
      </div>
      <div className={"cmpwrap" + (cmpOpen ? " on" : "")} id="cmpwrap">
        <div className="veil" id="cmpVeil" onClick={closeCompare}></div>
        <div className="card cmpsheet">
          <button className="cmpclose" id="cmpClose" onClick={closeCompare}>✕</button>
          <h3>Side by side</h3>
          <p className="sub">Tayo&apos;s read: green = strongest of the set, terracotta = watch it.</p>
          <div id="cmpTable">
            {cmpOpen ? <>
              <table className="cmptable">
                <tbody>
                  <tr><th></th>{sel.map((l) => <th key={l.id}>{l.ttl}</th>)}</tr>
                  {cmpRows.map(([label, vals, dir, fmt]) => {
                    const nums = vals.filter((v): v is number => typeof v === "number");
                    const b = nums.length ? (dir === "min" ? Math.min(...nums) : Math.max(...nums)) : null;
                    return <tr key={label}><td className="h">{label}</td>{vals.map((v, i) => <td key={i}>{fmt(v, b)}</td>)}</tr>;
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: "16px", display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <button id="verdictBtn" className="btn btn-primary" style={{ padding: "10px 18px", fontSize: "13px" }} onClick={askVerdict}>Ask Tayo: which is better for me?</button>
                <div id="verdictBox" style={{ flex: 1, minWidth: "240px", fontSize: "13.5px", lineHeight: 1.6, color: "var(--ink-muted)" }}>
                  {verdict === "…" ? <i>Tayo is weighing them against your brief…</i> : verdict && verdict.startsWith("ok:") ? <><b style={{ color: "var(--ink)" }}>Tayo:</b> {verdict.slice(3)}</> : verdict}
                </div>
              </div>
            </> : null}
          </div>
        </div>
      </div>
      <div id="synToast" role="status" aria-live="polite" className={toast.on ? "show" : ""} hidden={!toast.msg}>{toast.msg}</div>
    </>
  );
}

/** The appbar's saved-homes counter: a true count of the shared save store, hidden at zero, with a pulse when it changes. */
export function NavSaved() {
  const [n, setN] = useState(0);
  const [pop, setPop] = useState(false);
  const last = useRef<number | null>(null);
  useEffect(() => {
    const read = () => { try { const r = JSON.parse(localStorage.getItem("synapse_saved") || "[]"); return Array.isArray(r) ? r.length : 0; } catch { return 0; } };
    const tick = () => {
      const v = read();
      if (last.current !== null && v !== last.current && v > 0) { setPop(false); requestAnimationFrame(() => setPop(true)); }
      last.current = v; setN(v);
    };
    tick();
    window.addEventListener("syn:saves", tick);   // the page says when a heart changes
    window.addEventListener("storage", tick);     // another tab
    return () => { window.removeEventListener("syn:saves", tick); window.removeEventListener("storage", tick); };
  }, []);
  return (
    <span className={"nav-saved" + (pop ? " pop" : "")} id="navSaved" hidden={n === 0} title="Your saved homes">
      <span className="nsh" aria-hidden="true">♥</span>
      <b id="navSavedN">{n}</b>
      <span className="sr-only" id="navSavedSr">{" saved home" + (n === 1 ? "" : "s")}</span>
    </span>
  );
}
