"use client";
/**
 * The listing page itself (React since 2026-10-24, was src/legacy/property/inline-3.js): the photographs and their
 * full-size viewer, the swipe deck of cards, save and share, every fact about the home, what was checked, the deal, who
 * listed it, tours, follow and like, similar homes, the opening offer and the viewing assistant.
 *
 * The map, what is nearby, commute times and the cost breakdown are still the engine in inline-4.js, run after hydration.
 * The two meet where they always did: the listing is announced with a `syn:property` event on document (once the engine is
 * listening), the deck tells the map which card is showing through window.__pvView, and the engine owns the boxes it writes
 * into (costRows, costNote, commute, commuteSrc, piRows), which React renders empty and never touches again. It also hides
 * #negBlock on a rental, so React never sets that box's `hidden`.
 *
 * Nothing on this page may assert a property fact that did not come from the listing's own row.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-location-assign-relative-destination */
const SUPABASE_URL = "https://bhrhejpekmhbhwryjhgk.supabase.co";
const ANON_KEY = "sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV";
const ANON = { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY };
const W = () => window as any;
const STOCK_HERO = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80";

/* THE COVER IS A PHOTO (Eden, 2026-10-02): the first photo in display order is the cover; a video-only listing gets a still
   from its video; nothing else gets a stock image. */
const coverIsVideo = (m: any) => !!m && (m.media_type === "video" || /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(m.url || "")));
const coverFrame = (u: any) => /res\.cloudinary\.com\/.+\/video\/upload\//.test(String(u || ""))
  ? String(u).replace("/video/upload/", "/video/upload/so_0/").replace(/\.(mp4|mov|m4v|qt|webm|3gp)(\?.*)?$/i, ".jpg")
  : null;
const coverOf = (media: any) => {
  const s = (Array.isArray(media) ? media : []).filter((m: any) => m && m.url).slice().sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const photo = s.find((m: any) => !coverIsVideo(m));
  return photo ? photo.url : (s.length ? coverFrame(s[0].url) : null);
};
const isVid = (u: any) => (W().SynListings && W().SynListings.isVideoUrl) ? W().SynListings.isVideoUrl(u) : /\.(mp4|mov|m4v|qt)(\?|#|$)/i.test(String(u || ""));
const fmtDate = (iso: any) => { const d = new Date(iso); return isNaN(+d) ? "" : d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); };
const naira = (n: any) => { n = Number(n) || 0; return n >= 1e9 ? "₦" + (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? "₦" + (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + "M" : "₦" + n.toLocaleString(); };
const PERIOD_SUFFIX: Record<string, string> = { total: "", per_year: "/yr", per_month: "/mo", per_night: "/night" };
const TITLE_LABEL: Record<string, string> = { c_of_o: "Certificate of Occupancy", governors_consent: "Governor’s Consent", registered_deed: "Registered Deed", excision: "Excision", gazette: "Gazette", allocation: "Allocation" };
const FURNISHED_LABEL: Record<string, string> = { fully: "fully furnished", semi: "semi-furnished", unfurnished: "unfurnished" };
const CONDITION_LABEL: Record<string, string> = { brand_new: "brand new", excellent: "excellent condition", good: "good condition", fair: "fair condition", needs_work: "needs work" };
/* The hours, not just the letter: "Band D" is meaningless to anyone who has not had to learn the NERC bands. */
const BAND_HOURS: Record<string, string> = { A: "20+", B: "16+", C: "12+", D: "8+", E: "4+" };
/* property_check_type, in words a buyer reads rather than column names. */
const CHECK_LABEL: Record<string, string> = {
  listing_authenticity: "The listing is genuine", ownership_validation: "The agency can sell it", media_validation: "The photos match the property",
  freshness_validation: "Still available", structural_assessment: "Structural condition", flood_risk: "Flood risk", government_acquisition_risk: "Government acquisition risk",
};
const DEAL_LABEL: Record<string, string> = { outright: "Outright sale", rent: "Rent", shortlet: "Short-let", lease: "Long lease", off_plan: "Off-plan: you buy before it is built", joint_venture: "Joint venture", development_financing: "Development financing", rent_to_own: "Rent to own" };
const STAGE_LABEL: Record<string, string> = { completed: "Completed, ready now", under_construction: "Under construction", not_started: "Not started yet" };
/* The map view each card drives, in the deck's order. */
const CARD_VIEW_ORDER = ["poi", "poi", "agency", "cost", "poi", "commute", "poi", "legal", "agency", "poi"];
const CHECKS = ["Check water pressure", "Test electrical outlets & sockets", "Ask about service charges", "Inspect ceilings & walls for leaks/damp", "Confirm legal documentation (C of O / deed)", "Test the backup power / generator", "Check mobile signal & internet", "Walk the compound security & parking"];
const HEART = (filled: boolean) => (
  <svg viewBox="0 1 24 24" width="18" height="18" aria-hidden="true" style={{ display: "block" }}>
    <path d="M12 20.5s-7-4.4-9-8.8C1.8 8.8 3.4 5.5 6.6 5.5c1.9 0 3.5 1 4.3 2.5l1.1 1.8 1.1-1.8c.8-1.5 2.4-2.5 4.3-2.5 3.2 0 4.8 3.3 3.6 6.2-2 4.4-9 8.8-9 8.8z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

/* A lightweight feedback toast that speaks to the user, not the system. It lives on <body>, outside React. */
let toastT: ReturnType<typeof setTimeout> | undefined;
function toast(msg: string, kind?: string) {
  let t = document.getElementById("synToast");
  if (!t) { t = document.createElement("div"); t.id = "synToast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
  t.className = kind === "error" ? "err" : "";
  t.textContent = msg;
  const el = t;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 3600);
}
const lagosHexLum = (hex: string) => {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const lin = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
/* The agency typed it, so it is checked: a bare domain gets https://, and anything not a plain http(s) address is never linked. */
function siteOf(raw: any) {
  let v = String(raw || "").trim();
  if (!v) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : ""; } catch { return ""; }
}
/* An image that shows only once it has loaded, and removes itself if it fails (the initial underneath stays). */
function LoadImg({ src, className, alt }: { src: string; className?: string; alt: string }) {
  const [on, setOn] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return <img className={[className, on ? "on" : ""].filter(Boolean).join(" ") || undefined} alt={alt} loading="lazy" src={src} onLoad={() => setOn(true)} onError={() => setGone(true)} />;
}

type Fatal = { msg: string; detail: string } | null;

export function PropertyPage({ canvas }: { canvas: ReactNode }) {
  const scripts = usePageScripts();
  const [urlId, setUrlId] = useState<string | null>(null);
  const [P, setP] = useState<any>(null);
  const [fatal, setFatal] = useState<Fatal>(null);
  const [mounted, setMounted] = useState(false);

  /* ── the listing itself ─────────────────────────────────────────────── */
  useEffect(() => {
    setMounted(true);
    const id = new URLSearchParams(location.search).get("id");
    setUrlId(id);
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";   // always open on the first card
    if (!id) { setFatal({ msg: "No listing selected", detail: "Open a property from your matches or from Browse." }); return; }
    const q = SUPABASE_URL + "/rest/v1/properties"
      + "?select=*,property_media(url,display_order,media_type),property_enrichment(toju_summary,what_to_watch),agencies(name,verification_tier,logo_url,brand_color,brand_font,tagline,social,cac_number,cac_certificate_on_file)"
      + ",neighbourhoods(name)"
      + "&id=eq." + encodeURIComponent(id) + "&limit=1";
    fetch(q, { headers: ANON })
      .then((r) => { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then((rows) => {
        if (!Array.isArray(rows) || !rows.length) { setFatal({ msg: "This listing is no longer available", detail: "It may have expired, been removed, or never existed." }); return; }
        const p = rows[0];
        /* The Area the agency typed arrives as area_name; the page reads it as `neighbourhood`, as the portal does. An area is a
           place name: anything longer than a name is not used as one. */
        if (!p.neighbourhood && typeof p.area_name === "string" && p.area_name.trim() && p.area_name.trim().length <= 40 && !/\n/.test(p.area_name.trim())) {
          p.neighbourhood = p.area_name.trim();
        }
        setP(p);
      })
      .catch(() => setFatal({ msg: "Could not load this listing", detail: "Check your connection and try again." }));
  }, []);
  /* The engine (map, nearby, commute, costs) hears about the listing once it is listening. */
  useEffect(() => {
    if (!P || !scripts) return;
    document.dispatchEvent(new CustomEvent("syn:property", { detail: P }));
  }, [P, scripts]);
  useEffect(() => { if (P) document.title = P.title + ", Synapse"; }, [P]);

  /* ── attribution ───────────────────────────────────────────────────────
     A visitor arriving from a syndicated post carries the channel and post id on the URL (or SynArrival kept them from
     the arrival). Recorded once against the anonymous visitor id; quiet, and never worth breaking a page view over. */
  useEffect(() => {
    if (!scripts) return;
    const q = new URLSearchParams(location.search), id = q.get("id");
    const channel = q.get("ch") || (W().SynArrival ? W().SynArrival.channel() : "");
    try { if (channel && id) localStorage.setItem("syn_last_home", JSON.stringify({ id, ch: channel, ts: Date.now() })); } catch { /* storage blocked */ }
    if (!channel || !id) return;
    let visitor: string | null = null;
    try {
      visitor = localStorage.getItem("toju_visitor_v1");
      if (!visitor) { visitor = crypto.randomUUID ? crypto.randomUUID() : null; if (visitor) localStorage.setItem("toju_visitor_v1", visitor); }
    } catch { return; }
    if (!visitor) return;
    fetch(SUPABASE_URL + "/rest/v1/rpc/record_channel_touch", {
      method: "POST", headers: { "Content-Type": "application/json", ...ANON },
      body: JSON.stringify({ p_property_id: id, p_channel: channel, p_session_id: visitor, p_post_id: q.get("post") || (W().SynArrival ? W().SynArrival.post() : null) || null, p_kind: "visit" }),
    }).catch(() => { /* attribution is never worth breaking a page view over */ });
  }, [scripts]);

  /* ── gallery ───────────────────────────────────────────────────────────
     null until the page has taken over (the first frame keeps the markup's own picture); then the listing's media,
     sorted, with the first photo leading and a video uploaded first straight after it (Eden, 2026-10-02). */
  const photos: string[] | null = !mounted ? null : !P ? [] : (() => {
    const list = (P.property_media || []).slice().sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)).map((m: any) => m.url).filter(Boolean);
    const firstPhoto = list.findIndex((u: string) => !isVid(u));
    if (firstPhoto > 0) list.unshift(list.splice(firstPhoto, 1)[0]);
    return list;
  })();
  const nPhotos = photos ? photos.length : 0;
  const photosRef = useRef<string[]>([]);
  photosRef.current = photos || [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const [shown, setShown] = useState(0);        // the photo on the hero, which trails photoIndex by the fade
  const [fade, setFade] = useState(false);
  const idxRef = useRef(0);
  idxRef.current = photoIndex;
  const heroVid = useRef<HTMLVideoElement>(null);
  useEffect(() => { setPhotoIndex(0); setShown(0); }, [P]);
  /* A video left running when you move on keeps running: you would hear a kitchen tap while looking at a bedroom. */
  useEffect(() => { try { heroVid.current?.pause(); } catch { /* not ready */ } }, [shown, nPhotos]);
  const fadeT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /* ONE function moves the gallery, and everything that can move it calls this. It wraps, because a gallery that stops
     dead at the last photo feels broken on a phone. */
  const goToPhoto = (i: number) => {
    const n = photosRef.current.length; if (!n) return;
    const next = (i + n) % n;
    idxRef.current = next;
    setPhotoIndex(next); setFade(true);
    clearTimeout(fadeT.current);
    fadeT.current = setTimeout(() => { setShown(next); setFade(false); }, 160);
  };
  const heroUrl = photos && photos.length ? photos[shown] || photos[0] : null;
  const heroIsVid = !!heroUrl && isVid(heroUrl);

  /* ── the photograph, full size ─────────────────────────────────────────
     Shares photoIndex with the hero, so closing it leaves the strip on the picture you were looking at. */
  const [lbOpen, setLbOpen] = useState(false);
  const lbImg = useRef<HTMLImageElement>(null);
  const lbVid = useRef<HTMLVideoElement>(null);
  const lbShut = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);
  const sliding = useRef(false);
  const lbUrl = photos && photos.length ? photos[photoIndex] : null;
  const lbIsVid = !!lbUrl && isVid(lbUrl);
  useEffect(() => {
    if (!lbOpen) { try { lbVid.current?.pause(); } catch { /* not ready */ } return; }   // the sound must not follow you out
    if (lbIsVid) lbVid.current?.play().catch(() => {});
  }, [lbOpen, lbUrl, lbIsVid]);
  const openLb = () => {
    if (!photosRef.current.length) return;
    lastFocus.current = document.activeElement;
    const img = lbImg.current;
    /* Cleared on the way in: a viewer closed mid-gesture would otherwise reopen holding the offset it was dragged to. */
    if (img) { img.style.transition = "none"; img.style.transform = "translateX(0)"; img.style.opacity = "1"; }
    flushSync(() => setLbOpen(true));
    document.body.classList.add("pvlb-open");
    lbShut.current?.focus();
  };
  const closeLb = () => {
    setLbOpen(false);
    document.body.classList.remove("pvlb-open");
    const f = lastFocus.current as any;
    if (f && f.focus) f.focus();
  };
  /* THE SLIDE IS THE POINT: the outgoing photo leaves the way you are going and the next arrives from the other side.
     Guarded, because a fast double-tap would start a second slide mid-flight and strand the transform. */
  const step = (d: number) => {
    const img = lbImg.current;
    if (sliding.current || photosRef.current.length < 2 || !img) { if (!sliding.current) flushSync(() => goToPhoto(idxRef.current + d)); return; }
    sliding.current = true;
    const away = d > 0 ? -1 : 1;
    img.style.transition = "transform var(--m-micro) var(--m-ease), opacity var(--m-micro) var(--m-ease)";
    img.style.transform = "translateX(" + (away * 26) + "px)";
    img.style.opacity = "0";
    setTimeout(() => {
      flushSync(() => goToPhoto(idxRef.current + d));
      img.style.transition = "none";
      img.style.transform = "translateX(" + (-away * 26) + "px)";
      void img.offsetWidth;
      img.style.transition = "transform var(--m-standard) var(--m-ease), opacity var(--m-standard) var(--m-ease)";
      img.style.transform = "translateX(0)";
      img.style.opacity = "1";
      setTimeout(() => { sliding.current = false; }, 190);
    }, 110);
  };
  const stepRef = useRef(step); stepRef.current = step;
  const closeRef = useRef(closeLb); closeRef.current = closeLb;
  useEffect(() => {
    if (!lbOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeRef.current(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); stepRef.current(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); stepRef.current(1); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lbOpen]);
  /* THE PHOTO FOLLOWS THE FINGER: horizontal intent is established before the drag is claimed, then the photo tracks, and
     on release it either completes or springs back. */
  useEffect(() => {
    const img = lbImg.current; if (!img) return;
    let x0: number | null = null, y0: number | null = null, claimed = false;
    const rest = (animate: boolean) => {
      img.style.transition = animate ? "transform var(--m-standard) var(--m-ease), opacity var(--m-standard) var(--m-ease)" : "none";
      img.style.transform = "translateX(0)"; img.style.opacity = "1";
    };
    const ts = (e: TouchEvent) => { if (sliding.current) return; const t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; claimed = false; img.style.transition = "none"; };
    const tm = (e: TouchEvent) => {
      if (x0 == null || sliding.current) return;
      const t = e.changedTouches[0], dx = t.clientX - x0;
      if (!claimed && Math.abs(dx) > Math.abs(t.clientY - (y0 as number)) + 8) claimed = true;
      if (!claimed) return;
      const atEnd = photosRef.current.length < 2;
      img.style.transform = "translateX(" + (dx * (atEnd ? 0.18 : 0.55)) + "px)";
      img.style.opacity = String(Math.max(0.45, 1 - Math.abs(dx) / 420));
    };
    const te = (e: TouchEvent) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const go = claimed && Math.abs(dx) > 42 && photosRef.current.length > 1;
      x0 = null; y0 = null; claimed = false;
      if (go) { rest(false); stepRef.current(dx < 0 ? 1 : -1); } else rest(true);
    };
    img.addEventListener("touchstart", ts, { passive: true });
    img.addEventListener("touchmove", tm, { passive: true });
    img.addEventListener("touchend", te, { passive: true });
    return () => { img.removeEventListener("touchstart", ts); img.removeEventListener("touchmove", tm); img.removeEventListener("touchend", te); };
  }, []);

  /* ── swipe the hero ────────────────────────────────────────────────────
     Horizontal intent is required before the gesture is claimed: a mostly vertical drag is the page being scrolled. */
  const stage = useRef<HTMLDivElement>(null);
  const goRef = useRef(goToPhoto); goRef.current = goToPhoto;
  useEffect(() => {
    const el = stage.current; if (!el) return;
    let x0: number | null = null, y0: number | null = null, decided: string | null = null;
    const ts = (e: TouchEvent) => { if (e.touches.length !== 1) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; decided = null; };
    const tm = (e: TouchEvent) => {
      if (x0 == null) return;
      const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - (y0 as number);
      if (decided === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) decided = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (decided === "x" && e.cancelable) e.preventDefault();
    };
    const te = (e: TouchEvent) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, wasX = decided === "x";
      x0 = y0 = null; decided = null;
      if (!wasX || Math.abs(dx) < 40) return;      // a tap, or a twitch
      goRef.current(idxRef.current + (dx < 0 ? 1 : -1));
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te, { passive: true });
    return () => { el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm); el.removeEventListener("touchend", te); };
  }, []);

  /* ── the swipe deck: cards move left and right, the picture stays put ──
     The deck is recounted whenever a card can appear (Tayo's take, the checks, similar homes), so the dots never
     describe the deck as it was on load. */
  const deck = useRef<HTMLDivElement>(null);
  const deckCards = useRef<HTMLElement[]>([]);
  const [deckN, setDeckN] = useState(0);
  const [deckIdx, setDeckIdx] = useState(0);
  const deckIdxRef = useRef(0);
  deckIdxRef.current = deckIdx;
  const syncDeck = () => {
    const el = deck.current, cards = deckCards.current; if (!el || !cards.length) return;
    const w = el.clientWidth || 0;
    const i = w ? Math.round(el.scrollLeft / w) : deckIdxRef.current;
    const idx = Math.max(0, Math.min(cards.length - 1, Number.isFinite(i) ? i : 0));
    deckIdxRef.current = idx; setDeckIdx(idx);
    cards[idx].querySelectorAll<HTMLElement>(".bar i").forEach((b) => { b.style.width = b.dataset.w + "%"; });
    if (W().__pvView) W().__pvView(cards[idx]);    // the map beside follows the card
  };
  const syncRef = useRef(syncDeck); syncRef.current = syncDeck;
  const rebuildDeck = () => {
    const el = deck.current; if (!el) return;
    const current = deckCards.current[deckIdxRef.current];
    deckCards.current = ([...el.children] as HTMLElement[]).filter((c) => !c.hidden && c.offsetParent !== null);
    setDeckN(deckCards.current.length);
    const keep = current ? deckCards.current.indexOf(current) : -1;
    let idx = keep > -1 ? keep : Math.min(deckIdxRef.current, deckCards.current.length - 1);
    if (idx < 0) idx = 0;
    deckIdxRef.current = idx;
    syncRef.current();
  };
  const goCard = (i: number) => {
    const el = deck.current; if (!el) return;
    i = Math.max(0, Math.min(deckCards.current.length - 1, i));
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const goCardRef = useRef(goCard); goCardRef.current = goCard;
  useEffect(() => {
    const el = deck.current; if (!el) return;
    let raf = 0, ready = false;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => syncRef.current()); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") goCardRef.current(deckIdxRef.current + 1); if (e.key === "ArrowLeft") goCardRef.current(deckIdxRef.current - 1); };
    const onResize = () => { if (ready) el.scrollTo({ left: deckIdxRef.current * el.clientWidth }); };
    el.addEventListener("scroll", onScroll);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    W().__pvDeckChanged = () => rebuildDeck();
    rebuildDeck();
    requestAnimationFrame(() => { el.scrollLeft = 0; syncRef.current(); ready = true; });
    return () => { el.removeEventListener("scroll", onScroll); document.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── the ends are sealed ───────────────────────────────────────────────
     Safari's back-swipe is a gesture the browser claims for itself; the only way to refuse it is to cancel a clearly
     horizontal drag when the strip is already at the end that drag pushes towards. */
  const thumbsRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const offs: (() => void)[] = [];
    [deck.current, thumbsRef.current, simRef.current, document.querySelector<HTMLElement>(".pvc-tabs")].forEach((el) => {
      if (!el) return;
      let x0: number | null = null, y0: number | null = null, decided: string | null = null;
      const ts = (e: TouchEvent) => { if (e.touches.length !== 1) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; decided = null; };
      const tm = (e: TouchEvent) => {
        if (x0 == null || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - (y0 as number);
        if (decided === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) decided = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (decided !== "x") return;
        const max = el.scrollWidth - el.clientWidth;
        const stuck = (dx > 0 && el.scrollLeft <= 1) || (dx < 0 && el.scrollLeft >= max - 1);
        if (stuck && e.cancelable) e.preventDefault();
      };
      const te = () => { x0 = y0 = null; decided = null; };
      el.addEventListener("touchstart", ts, { passive: true });
      el.addEventListener("touchmove", tm, { passive: false });
      el.addEventListener("touchend", te, { passive: true });
      offs.push(() => { el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm); el.removeEventListener("touchend", te); });
    });
    return () => offs.forEach((f) => f());
  }, []);

  /* ── save + share ──────────────────────────────────────────────────── */
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { setSaved(new Set(JSON.parse(localStorage.getItem("synapse_saved") || "[]")).has(new URLSearchParams(location.search).get("id") || "")); } catch { /* storage blocked */ }
  }, []);
  const toggleSaved = () => {
    const id = urlId || "";
    const set = new Set<string>(JSON.parse(localStorage.getItem("synapse_saved") || "[]"));
    if (set.has(id)) set.delete(id); else set.add(id);
    localStorage.setItem("synapse_saved", JSON.stringify([...set]));
    setSaved(set.has(id));
  };
  /* The dock button carries classes the shared motion script adds (m-press), so its "on" is toggled, not rewritten. */
  const dkSave = useRef<HTMLButtonElement>(null);
  useEffect(() => { dkSave.current?.classList.toggle("on", saved); }, [saved]);
  const priceText = fatal ? "" : P ? naira(P.price) + (PERIOD_SUFFIX[P.price_period] || "") : "-";
  const doShare = async () => {
    const L = W().__pvListing || P || {};
    const where = [L.neighbourhood, L.city].filter(Boolean).join(", ");
    /* One share path for the page and the cards: the phone's own share sheet where there is one, a small one of ours where not. */
    if (W().SynShare && urlId) {
      W().SynShare.open({ id: urlId, title: L.title || document.title.replace(/, Synapse$/, ""), price: priceText, place: where });
    } else { await navigator.clipboard.writeText(location.href); toast("Link copied, paste it anywhere to share"); }
  };

  /* ── where it is ───────────────────────────────────────────────────────
     De-duplicated: agencies routinely type the city into the address line. Introduced buyers (a lead on this home) get the
     exact address back; everyone else sees the street without its house number. The server decides, never this page. */
  const [exact, setExact] = useState<string | null>(null);
  useEffect(() => {
    if (!P || !P.id || !scripts || !W().SynAuth) return;
    W().SynAuth.client().then((c: any) => c.rpc("property_exact_for_me", { p_property: P.id })).then((r: any) => {
      const row = r && r.data && r.data[0];
      if (row && row.address) setExact(row.address);
    }).catch(() => {});
  }, [P, scripts]);
  const locText = fatal ? fatal.detail : !P ? "" : exact ? [exact, P.city, P.state].filter(Boolean).join(", ") : (() => {
    const seen = new Set<string>();
    return [P.address, P.city, P.state].filter(Boolean).filter((part: any) => {
      const k = String(part).trim().toLowerCase();
      if (seen.has(k)) return false;
      for (const prev of seen) if (prev.includes(k)) return false;
      seen.add(k); return true;
    }).join(", ");
  })();

  /* ── the named agent, similar homes ────────────────────────────────────
     listing_agent_cards is a view of identity and track record only (profiles RLS keeps phone and WhatsApp private). */
  const [agent, setAgent] = useState<any>(null);
  useEffect(() => {
    if (!P || !P.listed_by_agent_id) return;
    fetch(SUPABASE_URL + "/rest/v1/listing_agent_cards?agent_id=eq." + encodeURIComponent(P.listed_by_agent_id) + "&limit=1", { headers: ANON })
      .then((r) => (r.ok ? r.json() : [])).then((rows) => { const a = rows && rows[0]; if (a && a.full_name) setAgent(a); })
      .catch(() => { /* the agency identity on the card still stands */ });
  }, [P]);
  const [sim, setSim] = useState<any[] | null>(null);
  useEffect(() => {
    if (!P || !P.city) return;
    const q = SUPABASE_URL + "/rest/v1/properties?select=id,title,price,city,verification_status,property_media(url,display_order,media_type)"
      + "&city=eq." + encodeURIComponent(P.city) + "&id=neq." + encodeURIComponent(P.id) + "&status=eq.live&is_active=is.true&deleted_at=is.null&limit=3";
    fetch(q, { headers: ANON }).then((r) => (r.ok ? r.json() : [])).then((rows) => { if (rows && rows.length) setSim(rows); }).catch(() => { /* stays hidden */ });
  }, [P]);

  /* ── follow and like ───────────────────────────────────────────────────
     Counted rows, one per person per agent. The count renders from the view; the pressed state from the viewer's own row. */
  const [social, setSocial] = useState({ followers: 0, likes: 0, following: false, liked: false });
  const busy = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!agent || !agent.agent_id) return;
    setSocial((s) => ({ ...s, followers: Number(agent.followers || 0), likes: Number(agent.likes || 0) }));
  }, [agent]);
  useEffect(() => {
    if (!agent || !agent.agent_id || !scripts || !W().SynAuth || !W().SynAuth.client) return;
    W().SynAuth.client()
      .then((c: any) => c.auth.getUser().then((u: any) => ({ c, uid: u && u.data && u.data.user && u.data.user.id })))
      .then(({ c, uid }: any) => {
        if (!uid) return;
        c.from("agent_follows").select("agent_id").eq("agent_id", agent.agent_id).eq("follower_id", uid).maybeSingle()
          .then((r: any) => setSocial((s) => ({ ...s, following: !!(r && r.data) }))).catch(() => {});
        c.from("agent_likes").select("agent_id").eq("agent_id", agent.agent_id).eq("liker_id", uid).maybeSingle()
          .then((r: any) => setSocial((s) => ({ ...s, liked: !!(r && r.data) }))).catch(() => {});
      }).catch(() => {});
  }, [agent, scripts]);
  const toggleSocial = (isFollow: boolean) => {
    const key = isFollow ? "f" : "l";
    if (busy.current[key] || !agent) return;
    busy.current[key] = true;
    const on = isFollow ? social.following : social.liked;
    const table = isFollow ? "agent_follows" : "agent_likes", col = isFollow ? "follower_id" : "liker_id";
    W().SynAuth.client()
      .then((c: any) => c.auth.getUser().then((u: any) => ({ c, uid: u && u.data && u.data.user && u.data.user.id })))
      .then(({ c, uid }: any) => {
        if (!uid) { location.href = "signin.html?reason=follow&next=" + encodeURIComponent(location.pathname + location.search); return null; }
        const row: any = { agent_id: agent.agent_id }; row[col] = uid;
        return on ? c.from(table).delete().eq("agent_id", agent.agent_id).eq(col, uid) : c.from(table).insert(row);
      })
      .then((res: any) => {
        if (!res) return;
        if (res.error) throw res.error;
        /* Move the number by one rather than refetching, never below zero. */
        setSocial((s) => isFollow
          ? { ...s, following: !on, followers: Math.max(0, s.followers + (on ? -1 : 1)) }
          : { ...s, liked: !on, likes: Math.max(0, s.likes + (on ? -1 : 1)) });
      })
      .catch(() => toast("Could not save that just now, please try again."))
      .then(() => { busy.current[key] = false; });
  };

  /* ── booking a tour ────────────────────────────────────────────────────
     The rules are server-side (inspection_readiness / book_inspection). The button appears only when the agent has times
     AND Tayo has already qualified this buyer for this home: that is the end of priming. */
  const [tourReady, setTourReady] = useState(false);
  const [tour, setTour] = useState<{ open: boolean; view: any }>({ open: false, view: null });
  const [booked, setBooked] = useState(false);
  useEffect(() => {
    if (!agent || !scripts || !W().SynAuth || !urlId) return;
    W().SynAuth.client()
      .then((client: any) => Promise.all([
        client.rpc("open_inspection_slots", { p_property_id: urlId, p_days: 21 }),
        client.rpc("inspection_readiness", { p_property_id: urlId }),
      ]))
      .then(([slots, ready]: any) => {
        const hasTimes = ((slots && slots.data) || []).length > 0;
        const row = ready && Array.isArray(ready.data) ? ready.data[0] : (ready && ready.data);
        if (hasTimes && row && row.ready) setTourReady(true);
      })
      .catch(() => { /* no tour offered; the conversation is still the path */ });
  }, [agent, scripts, urlId]);
  const fmtWhen = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  /* Each reason names the one thing to do next. */
  const BLOCKED: Record<string, [string, string, () => void]> = {
    sign_in: ["Sign in to book a tour.", "Sign in", () => { location.href = "signin.html?reason=inspection&next=" + encodeURIComponent(location.pathname + location.search); }],
    contact: ["Talk to Tayo about this home first, then you can book a tour.", "Reply about this home", () => { location.href = "toju.html" + (urlId ? "?reply=" + encodeURIComponent(urlId) : ""); }],
    qualification: ["Tayo needs to understand what you are looking for before booking an agent’s time.", "Talk to Tayo", () => { location.href = "toju.html"; }],
    budget: ["Tayo needs to know your budget for this one, so nobody’s time is wasted.", "Tell Tayo", () => { location.href = "toju.html"; }],
    budget_fit: ["This home is above the budget you gave Tayo. Talk to Tayo if that has changed.", "Talk to Tayo", () => { location.href = "toju.html"; }],
    financial_readiness: ["Tayo has a couple of questions about how you plan to pay before booking a tour.", "Talk to Tayo", () => { location.href = "toju.html"; }],
  };
  const openTour = () => {
    if (tour.open) { setTour((t) => ({ ...t, open: false })); return; }
    setTour({ open: true, view: { kind: "note", text: "Finding times…" } });
    W().SynAuth.client()
      .then((client: any) => client.rpc("open_inspection_slots", { p_property_id: urlId, p_days: 21 }).then(({ data, error }: any) => {
        if (error) throw error;
        const slots = data || [];
        if (!slots.length) {
          setTour({ open: true, view: { kind: "note", text: (agent.full_name ? agent.full_name.split(" ")[0] : "This agent") + " has no tour times open in the next three weeks. Ask them directly and they can add one." } });
          return;
        }
        setTour({ open: true, view: { kind: "slots", slots, state: {} } });
      }))
      .catch(() => setTour({ open: true, view: { kind: "note", text: "Could not check tour times just now." } }));
  };
  const bookSlot = (startsAt: string) => {
    const setRow = (st: any) => setTour((t) => (t.view && t.view.kind === "slots" ? { ...t, view: { ...t.view, state: { ...t.view.state, [startsAt]: st } } } : t));
    const cur = tour.view && tour.view.state && tour.view.state[startsAt];
    if (cur && cur.disabled) return;
    setRow({ disabled: true, tag: "Booking…" });
    W().SynAuth.client().then((client: any) => client.rpc("book_inspection", { p_property_id: urlId, p_starts_at: startsAt }))
      .then(({ data, error }: any) => {
        if (error) throw error;
        const res = Array.isArray(data) ? data[0] : data;
        if (!res || !res.ok) {
          if (res && res.reason === "slot_full") { setRow({ disabled: true, tag: "Full" }); return; }
          const missing = res && res.reason ? res.reason.split(",") : [];
          setTour({ open: true, view: { kind: "blocked", key: missing.find((m: string) => BLOCKED[m]) || "qualification" } });
          return;
        }
        const n = Number(res.taken) || 1;
        setTour({ open: true, view: { kind: "ok", when: fmtWhen(startsAt), n } });
        setBooked(true);
      })
      .catch(() => setRow({ disabled: false, tag: "Try again" }));
  };

  /* ── the opening offer ─────────────────────────────────────────────────
     Nothing to negotiate over until the listing has loaded: a null property would have Tayo invent an offer. */
  const [neg, setNeg] = useState<{ busy: boolean; out: any; err: string }>({ busy: false, out: null, err: "" });
  const [copyLbl, setCopyLbl] = useState("Copy message");
  const draftRef = useRef<HTMLDivElement>(null);
  const getOffer = async () => {
    if (!P) { toast("Still loading this listing, one moment."); return; }
    setNeg({ busy: true, out: null, err: "" });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      if (!navigator.onLine) throw Object.assign(new Error("offline"), { kind: "offline" });
      const r = await fetch(SUPABASE_URL + "/functions/v1/toju-demo", {
        method: "POST", headers: { "Content-Type": "application/json", ...ANON },
        body: JSON.stringify({ action: "negotiate", visitorId: localStorage.getItem("toju_visitor_v1"), property: P }), signal: ctrl.signal,
      });
      clearTimeout(timer);
      const d = await r.json().catch(() => ({}));
      // never reveal an empty panel: a 200 with no offer is still a failure
      if (!r.ok || d.error || (!d.openingOffer && !d.advice && !d.draft)) throw new Error("bad payload");
      setNeg({ busy: false, out: d, err: "" });
    } catch (e: any) {
      clearTimeout(timer);
      const kind = !navigator.onLine ? "offline" : (e && e.name === "AbortError") ? "timeout" : "server";
      const msg = kind === "offline" ? "You’re offline, reconnect and I’ll run the numbers."
        : kind === "timeout" ? "That took longer than expected. The connection is slow right now."
        : "I couldn’t work the numbers just now, this is on our side, not yours.";
      setNeg({ busy: false, out: null, err: msg + " Nothing was sent to the agency." });
    }
  };
  const copyDraft = async () => {
    try { await navigator.clipboard.writeText(draftRef.current?.textContent || ""); setCopyLbl("Copied ✓"); }
    catch {
      // clipboard blocked: tell them, don't go silent
      setCopyLbl("Press Ctrl+C to copy");
      try { const r = document.createRange(); r.selectNodeContents(draftRef.current!); const s = getSelection()!; s.removeAllRanges(); s.addRange(r); } catch { /* nothing more to do */ }
    }
  };

  /* ── the viewing assistant: checklist, notes and photos, kept on this device for this home ── */
  const [vState, setVState] = useState<{ done: number[]; notes: string; photos: string[] } | null>(null);
  const vKey = () => "synapse_viewing_" + (new URLSearchParams(location.search).get("id") || "");
  useEffect(() => { setVState(JSON.parse(localStorage.getItem(vKey()) || '{"done":[],"notes":"","photos":[]}')); }, []);
  const saveV = (s: any) => { setVState(s); localStorage.setItem(vKey(), JSON.stringify(s)); };
  const vfile = useRef<HTMLInputElement>(null);
  const onVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => setVState((s) => { const n = { ...s!, photos: s!.photos.concat(String(rd.result)) }; localStorage.setItem(vKey(), JSON.stringify(n)); return n; });
    rd.readAsDataURL(f);
  };

  /* ── what the listing says ─────────────────────────────────────────── */
  const verified = !!P && P.verification_status === "verified";
  const facts: ReactNode[] = [];
  if (P) {
    const plural = (n: number, w: string) => w + (n === 1 ? "" : "s");
    if (P.bedrooms != null) facts.push(<span key="bed"><b>{P.bedrooms}</b> {plural(P.bedrooms, "bed")}</span>);
    if (P.bathrooms != null) facts.push(<span key="bath"><b>{P.bathrooms}</b> {plural(P.bathrooms, "bath")}</span>);
    if (P.toilets != null) facts.push(<span key="wc"><b>{P.toilets}</b> {plural(P.toilets, "toilet")}</span>);
    if (P.parking_spaces != null) facts.push(<span key="park"><b>{P.parking_spaces}</b> parking</span>);
    if (P.area_sqm != null) facts.push(<span key="area"><b>{P.area_sqm}</b> m²</span>);
    if (P.year_built != null) facts.push(<span key="yr">built <b>{P.year_built}</b></span>);
    if (P.electricity_band && BAND_HOURS[P.electricity_band]) facts.push(<span key="band">Band <b>{P.electricity_band}</b> · {BAND_HOURS[P.electricity_band]} hrs/day</span>);
    if (P.furnished) facts.push(<span key="furn">{FURNISHED_LABEL[P.furnished] || P.furnished}</span>);
    if (P.property_condition) facts.push(<span key="cond">{CONDITION_LABEL[P.property_condition] || P.property_condition}</span>);
    if (P.title_type) facts.push(<span key="title">{TITLE_LABEL[P.title_type] || P.title_type}</span>);
  }
  const amen = P && Array.isArray(P.amenities) ? P.amenities.map((a: any) => String(a || "").trim()).filter(Boolean).slice(0, 30) : [];
  const enrich = P && P.property_enrichment && (Array.isArray(P.property_enrichment) ? P.property_enrichment[0] : P.property_enrichment);
  const take = enrich && enrich.toju_summary ? enrich.toju_summary : "";

  /* The deal, in rows, only what the agency set. */
  const deal = (() => {
    if (!P) return null;
    const month = (v: any) => { const t = new Date(v); return isNaN(+t) ? "" : t.toLocaleDateString("en-GB", { month: "long", year: "numeric" }); };
    const rows: [string, string][] = [];
    if (P.deal_structure && P.deal_structure !== "outright" && P.deal_structure !== "rent" && DEAL_LABEL[P.deal_structure]) rows.push(["Deal", DEAL_LABEL[P.deal_structure]]);
    if (P.property_type !== "land" && P.build_stage && P.build_stage !== "completed") {
      rows.push(["Built", STAGE_LABEL[P.build_stage] + (P.build_progress_pct != null ? " (" + P.build_progress_pct + "% done)" : "")]);
      if (P.handover_date && month(P.handover_date)) rows.push(["Handover", "Expected " + month(P.handover_date)]);
    }
    if (P.payment_plan === "instalments") {
      rows.push(["Payment", "Instalments" + (P.deposit_pct != null ? ": " + Number(P.deposit_pct) + "% deposit" : "") + (P.instalment_months ? ", the rest over " + P.instalment_months + " months" : "")]);
    } else if (P.payment_plan === "outright" && P.listing_type === "sale") rows.push(["Payment", "Outright"]);
    if (Number(P.plot_count) > 0) rows.push(["Plots", Number(P.plot_count) + (P.plot_size_sqm ? " × " + Number(P.plot_size_sqm) + " sqm" : "")]);
    if (Number(P.units_available) > 1) rows.push(["Available", Number(P.units_available) + " identical units"]);
    if (Number(P.min_investment) > 0) rows.push(["Minimum stake", naira(P.min_investment)]);
    if (P.investment_term_months) rows.push(["Term", P.investment_term_months + " months"]);
    if (P.stated_return_pct != null) rows.push(["Return", Number(P.stated_return_pct) + "% over the term, as stated by the agency"]);
    if (!rows.length) return null;
    let note = "";
    if (P.deal_structure === "off_plan" || ["under_construction", "not_started"].includes(P.build_stage)) note = "Buying before completion: ask Tayo what to check. Who the developer is, what happens if handover is late, and how payments are tied to progress matter most.";
    else if (P.stated_return_pct != null || ["joint_venture", "development_financing"].includes(P.deal_structure)) note = "Returns are the agency’s own figures. Synapse does not forecast prices or returns.";
    return { rows, note };
  })();

  /* What was checked. The ring is the trust score (out of all seven check types), never a ratio of what was recorded. */
  const checks = (() => {
    if (!P) return null;
    const nodes = Array.isArray(P.verification_nodes) ? P.verification_nodes : [];
    if (nodes.length) {
      const score = (P.trust_score == null || P.trust_score === "") ? null : Number(P.trust_score);
      const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
      return {
        bg: "conic-gradient(var(--success) 0% " + pct + "%, rgba(0,0,0,0.08) " + pct + "% 100%)", ring: score == null ? (verified ? "✓" : "—") : String(score),
        head: verified ? "Verified by Synapse" : "What has been checked",
        note: "Each line is a check Synapse runs. Anything not listed has not been looked at — this is what was done, not a guarantee.",
        rows: nodes.map((n: any) => {
          const ok = n.status === "passed";
          return { cls: ok ? "pass" : (n.status === "pending" ? "pending" : "fail"), ic: ok ? "check" : "pending",
            lbl: (n.label || n.name || CHECK_LABEL[n.type] || String(n.type || "Check").replace(/_/g, " ")) + (ok ? "" : " — " + (n.status || "not passed")) };
        }),
      };
    }
    return {
      bg: "rgba(0,0,0,0.06)", ring: verified ? "✓" : "—", head: verified ? "Verified by Synapse" : "Not yet verified",
      note: verified ? "Synapse verified this listing" + (P.verified_at ? " on " + fmtDate(P.verified_at) : "") + ". The individual check results are not published yet."
        : "Listed by the agency. Synapse has not run its checks on this home yet.",
      rows: [] as any[],
    };
  })();
  /* Availability, stated as its own claim with its own date. */
  const avail = (() => {
    if (!P) return { text: "-", stale: false };
    const conf = P.availability_confirmed_at, exp = P.expires_at ? new Date(P.expires_at) : null;
    if (exp && exp.getTime() < Date.now()) return { text: "Not confirmed since " + (conf ? fmtDate(conf) : "listing") + ", ask the agency before viewing", stale: true };
    if (!conf) return { text: "Not confirmed yet", stale: true };
    const days = Math.floor((Date.now() - new Date(conf).getTime()) / 864e5);
    return { text: (days <= 0 ? "Confirmed today" : days === 1 ? "Confirmed yesterday" : "Confirmed " + days + " days ago") + " · " + fmtDate(conf), stale: days > 21 };
  })();

  /* Listed by: the real agency, as it designed itself on its Brand page, each input checked before use. */
  const ag = P ? (P.agencies && (Array.isArray(P.agencies) ? P.agencies[0] : P.agencies)) : null;
  const agName = P ? (ag && ag.name) || "Agency not published" : "-";
  const agHex = ag && HEX.test(String(ag.brand_color || "").trim()) ? String(ag.brand_color).trim() : "";
  const agLogo = ag && /^https?:\/\//i.test(String(ag.logo_url || "").trim()) ? String(ag.logo_url).trim() : "";
  const agFont = ag ? String(ag.brand_font || "").trim().replace(/\s+/g, " ") : "";
  const agFontOk = /^[A-Za-z0-9][A-Za-z0-9 ]{1,39}$/.test(agFont);
  useEffect(() => {
    if (!agFontOk || /^(arial|helvetica|georgia|times|times new roman|verdana|tahoma|trebuchet ms|courier new|garamond)$/i.test(agFont)) return;
    const lk = document.createElement("link");
    lk.rel = "stylesheet"; lk.href = "https://fonts.googleapis.com/css2?family=" + agFont.replace(/ /g, "+") + "&display=swap";
    document.head.appendChild(lk);
  }, [agFont, agFontOk]);
  const agSite = ag ? siteOf(ag.social && ag.social.website) : "";
  const agTag = ag && ag.tagline && String(ag.tagline).trim() ? String(ag.tagline).trim() : "";
  const agHref = P && P.agency_id ? "agency-profile.html?id=" + encodeURIComponent(P.agency_id) : "";
  const agVerified = !!ag && ag.verification_tier === "verified";
  const cacTxt = ag && ag.cac_number ? "CAC " + (/^[a-z]/i.test(String(ag.cac_number).trim()) ? String(ag.cac_number).trim() : "RC " + String(ag.cac_number).trim())
    : ag && ag.cac_certificate_on_file ? "CAC certificate on file" : "CAC not yet on file";
  /* The large block shows the agency until a named agent loads. */
  const agentInits = agent ? agent.full_name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() : "";
  const agentBits: string[] = [];
  if (agent) {
    if (agent.years_experience != null) agentBits.push(agent.years_experience + " yr" + (agent.years_experience === 1 ? "" : "s") + " experience");
    if (agent.closed_deals != null) agentBits.push(agent.closed_deals + " deals closed");
    if (agent.response_rate_pct != null) agentBits.push(agent.response_rate_pct + "% reply rate");
  }
  const photoClass = "apc-photo" + (agent ? (agent.avatar_url ? " has-photo" : "") : P ? " agency" : "");
  const photoStyle = agent ? (agent.avatar_url ? { backgroundImage: 'url("' + agent.avatar_url + '")' } : undefined) : agHex ? { background: agHex, color: "#fff" } : undefined;

  /* The chat link carries the listing, from the address bar, so even a tap before anything loads opens the chat about it. */
  const [replyHref, setReplyHref] = useState("toju.html");
  useEffect(() => { if (P && P.id) setReplyHref("toju.html?reply=" + encodeURIComponent(P.id)); }, [P]);

  /* Cards appear: recount the deck, and draw icons into anything new. */
  const hasChecks = !!checks, hasSim = !!sim, nChecks = checks ? checks.rows.length : 0;
  useLayoutEffect(() => { if (W().__pvDeckChanged) W().__pvDeckChanged(); }, [take, hasChecks, hasSim, P]);
  const checksRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scripts || !W().SynIcons || !W().SynIcons.hydrate) return;
    if (checksRef.current && hasChecks) W().SynIcons.hydrate(checksRef.current);
    if (socialRef.current && agent) W().SynIcons.hydrate(socialRef.current);
  }, [scripts, nChecks, hasChecks, agent]);

  const stamp = verified && scripts && W().SynStamp ? W().SynStamp.html({ land: true }) : "";
  const disabled: Record<string, unknown> = fatal ? { "aria-disabled": "true" } : {};

  return (
    <div className="pv-split">
      <div className="pdp" role="main">
        <div className="pv-backslot" data-cnav-back-slot=""></div>
        <div className="hero" ref={stage} tabIndex={mounted ? 0 : undefined} aria-label={mounted ? "Property photos, use the arrow keys" : undefined}
          onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); goToPhoto(photoIndex + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); goToPhoto(photoIndex - 1); } }}>
          <img id="heroImg" src={photos === null ? STOCK_HERO : heroUrl && !heroIsVid ? heroUrl : undefined} hidden={heroIsVid}
            alt={photos === null ? "" : photos.length ? "Photo of this property" : "No photos supplied for this listing"}
            style={photos === null ? undefined : { opacity: fade ? 0 : 1 }} onClick={openLb} />
          {" "}
          {" "}
          <video id="heroVid" ref={heroVid} hidden={!heroIsVid} muted playsInline controls preload="metadata" src={heroIsVid ? heroUrl! : undefined} style={photos === null ? undefined : { opacity: fade ? 0 : 1 }}></video>
          {" "}
          <span id="heroStamp" dangerouslySetInnerHTML={{ __html: stamp }}></span>
          {" "}
          <span className="counter" id="counter">{photos === null ? "1 / 5" : photos.length ? (photoIndex + 1) + " / " + photos.length : ""}</span>
          {" "}
          {/* Say there is more than one, once, on the photo itself. */}
          <span className="swipe-hint" id="swipeHint" hidden={!photos || photos.length < 2}>Swipe for more</span>
          <div className="actions">
            <div className={"act" + (saved ? " on" : "")} id="saveBtn" title="Save" onClick={toggleSaved} {...disabled}>{HEART(saved)}</div>
            <div className="act" id="shareBtn" title="Share" onClick={doShare}><span data-icon="share"></span></div>
          </div>
        </div>
        <div className="thumbs" id="thumbs" ref={thumbsRef}>
          {(photos || []).map((p, i) => (isVid(p)
            ? <span key={i} className={"th-v" + (i === photoIndex ? " on" : "")} data-i={i} onClick={() => goToPhoto(i)}><video src={p} muted playsInline preload="metadata"></video><i aria-hidden="true">▶</i></span>
            : <img key={i} src={p} data-i={i} className={i === photoIndex ? "on" : ""} alt="" onClick={() => goToPhoto(i)} />))}
        </div>
        <div className={"pvlb" + (lbOpen ? (nPhotos < 2 ? " single on" : " on") : "")} id="pvlb" role="dialog" aria-modal="true" aria-label="Photos"
          onClick={(e) => { const t = e.target as HTMLElement; if (t === e.currentTarget || t.classList.contains("pvlb-stage")) closeLb(); }}>
          <div className="pvlb-stage">
            <img id="pvlbImg" ref={lbImg} alt="" hidden={lbOpen && lbIsVid} src={lbOpen && lbUrl && !lbIsVid ? lbUrl : undefined} />
            {" "}
            {" "}
            <video id="pvlbVid" ref={lbVid} hidden={!(lbOpen && lbIsVid)} muted playsInline controls preload="metadata" src={lbOpen && lbIsVid ? lbUrl! : undefined}></video>
            <button type="button" className="pvlb-a prev" id="pvlbPrev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</button>
            <button type="button" className="pvlb-a next" id="pvlbNext" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}>›</button>
          </div>
          <button type="button" className="pvlb-x" id="pvlbX" aria-label="Close photos" ref={lbShut} onClick={closeLb}>✕</button>
          <div className="pvlb-n" id="pvlbN">{lbOpen && nPhotos > 1 ? (photoIndex + 1) + " of " + nPhotos : ""}</div>
        </div>
        <div className="deckbar">
          <button className="arrow" id="deckPrev" aria-label="Previous card" disabled={deckN > 0 && deckIdx === 0} onClick={() => goCard(deckIdx - 1)}>‹</button>
          <button className="arrow" id="deckNext" aria-label="Next card" disabled={deckN > 0 && deckIdx === deckN - 1} onClick={() => goCard(deckIdx + 1)}>›</button>
        </div>
        <div className="dots" id="deckDots">{Array.from({ length: deckN }, (_, i) => <i key={i} data-i={i} className={i === deckIdx ? "on" : undefined} onClick={() => goCard(i)}></i>)}</div>
        <div className="deck" id="deck" ref={deck}>
          <div className="card summary" data-title="Overview" data-view={CARD_VIEW_ORDER[0]}>
            <div className="price" id="pvPrice">{priceText}</div>
            {/* ₦/m² only when area is actually recorded; no invented median comparison. */}
            <div className="ctx" id="pvCtx" hidden={!(P && P.area_sqm && P.price)}>{P && P.area_sqm && P.price ? naira(Math.round(P.price / P.area_sqm)) + "/m²" : ""}</div>
            <div className="ttl" id="pvTitle" role="heading" aria-level={1}>{fatal ? fatal.msg : P ? P.title : "Loading listing…"}</div>
            <div className="loc" id="pvLoc">{locText}{exact ? <small className="exact" style={{ display: "block", marginTop: "4px", fontSize: "12px", opacity: 0.7 }}>Exact address, shared because you have been introduced to the agency</small> : null}</div>
            <div className="facts" id="pvFacts">{facts}</div>
            {/* Verification, stated plainly either way: unverified is a fact the buyer is entitled to weigh, not a warning. */}
            <div className="pvtrust-row" id="pvTrust" hidden={!P}>
              <div className="ringbig" id="pvRing">{!P ? "-" : verified && P.trust_score != null ? P.trust_score : verified ? "✓" : "-"}</div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }} id="pvVerifyLine">{!P ? "" : verified ? "Verified by Synapse" : "Not yet verified"}</div>
                <div className="dim" style={{ fontSize: "12.5px" }} id="pvVerifyNote">{!P ? "" : verified ? "What Synapse checked on this listing" : "Listed by the agency; Synapse has not run its checks on this home yet."}</div>
              </div>
            </div>
            <div className="glance" id="pvGlance" hidden={!(P && P.description)}>{P && P.description ? P.description : ""}</div>
            <div className="amen" id="pvAmen" hidden={!amen.length} aria-label="Amenities" role="list">
              {amen.map((a: string, i: number) => <span role="listitem" key={i}>{a.charAt(0).toUpperCase() + a.slice(1)}</span>)}
            </div>
          </div>
          <div className="card section" id="pvTakeCard" hidden={!take} data-view={CARD_VIEW_ORDER[1]}>
            <div className="lbl"><span data-icon="spark"></span>{" Tayo's take"}</div>
            <p className="reason" id="pvTake">{take}</p>
          </div>
          <div className="card section" id="costCard" data-view={CARD_VIEW_ORDER[2]}>
            <div className="lbl"><span data-icon="costs"></span>{" "}<span id="costLbl">{deal ? "The deal & what it really costs" : "What it really costs"}</span></div>
            <div id="pvDealCard" hidden={!deal}>
              <dl className="pv-deal" id="pvDeal">{deal ? deal.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>) : null}</dl>
              <p className="pv-deal-note" id="pvDealNote" hidden={!(deal && deal.note)}>{deal ? deal.note : ""}</p>
            </div>
            <div className="cost-rows" id="costRows"></div>
            <p className="cost-note" id="costNote"></p>
            <div id="negBlock" className="neg-block">
              <div className="neg-sub"><span data-icon="negotiate"></span>{" What to offer"}</div>
              <button className="btn btn-primary" id="negBtn" style={{ padding: "11px 20px", fontSize: "13.5px" }} hidden={!!neg.out} disabled={neg.busy || !!fatal} aria-disabled={fatal ? "true" : undefined} onClick={getOffer}>
                {neg.busy ? "Tayo is working the numbers…" : "Get my opening offer"}
              </button>
              {neg.err ? <p id="negErr" className="inline-err" role="alert">{neg.err}</p> : null}
              <div id="negOut" hidden={!neg.out}>
                <div className="neg-offer" id="negOffer">{neg.out && neg.out.openingOffer ? "Opening offer: " + naira(neg.out.openingOffer) : ""}</div>
                <p className="reason" id="negAdvice" style={{ fontSize: "13.5px" }}>{neg.out ? neg.out.advice || "" : ""}</p>
                <div className="neg-draft" id="negDraft" ref={draftRef}>{neg.out ? neg.out.draft || "" : ""}</div>
                <button className="copybtn" id="negCopy" onClick={copyDraft}>{copyLbl}</button>
              </div>
            </div>
            <p className="cost-handoff">
              {"Ready to move on this? Tayo takes your brief first, then\n        introduces the agency with it, so the agent you meet already knows\n        what you can afford and what you asked about."}
            </p>
          </div>
          <div className="card section" id="piCard" data-view={CARD_VIEW_ORDER[3]}>
            <div className="lbl"><span data-icon="spark"></span>{" Property intelligence"}</div>
            <div className="pi-rows" id="piRows"></div>
          </div>
          <div className="card section" data-view={CARD_VIEW_ORDER[4]}>
            <div className="lbl"><span data-icon="commute"></span>{" Commute intelligence"}</div>
            <div className="tod" id="tod" role="group" aria-label="Time of day">
              <button type="button" data-slot="morning">Morning</button>
              <button type="button" data-slot="midday" className="on">Midday</button>
              <button type="button" data-slot="evening">Evening</button>
            </div>
            <div className="commute" id="commute"></div>
            <p className="cmt-src" id="commuteSrc"></p>
          </div>
          <div className="card section" data-view={CARD_VIEW_ORDER[5]}>
            <div className="lbl"><span data-icon="legal"></span>{" Viewing assistant"}</div>
            <div className="vcheck" id="vcheck">{vState ? CHECKS.map((c, i) => {
              const on = vState.done.includes(i);
              return <label key={i} className={on ? "done" : ""}><input type="checkbox" data-i={i} checked={on}
                onChange={() => saveV({ ...vState, done: on ? vState.done.filter((x) => x !== i) : vState.done.concat(i) })} />{c}</label>;
            }) : null}</div>
            <textarea className="vnotes" id="vnotes" placeholder={"Notes from the viewing, water pressure, smells, the agent's answers…"}
              value={vState ? vState.notes || "" : ""} onChange={(e) => vState && saveV({ ...vState, notes: e.target.value })} />
            <div className="vphotos" id="vphotos">{vState ? <>
              {vState.photos.map((p, i) => <img key={i} src={p} alt="" />)}
              <div className="add" id="addPhoto" onClick={() => vfile.current?.click()}>＋</div>
            </> : null}</div>
            <input type="file" id="vfile" ref={vfile} accept="image/*" hidden onChange={onVFile} />
          </div>
          <div className="card section" id="pvSimCard" hidden={!sim} data-view={CARD_VIEW_ORDER[6]}>
            <div className="lbl" id="pvSimLbl">More in this city</div>
            <div className="sim" id="pvSim" ref={simRef}>{(sim || []).map((r) => {
              const img = coverOf(r.property_media);
              return (
                <a key={r.id} href={"property.html?id=" + encodeURIComponent(r.id)}>
                  {img ? <img src={img} alt="" loading="lazy" /> : <div className="simph"></div>}
                  <div className="b"><div className="p">{naira(r.price)}</div><div className="t">{r.title || "Listing"}</div><div className="m">{r.verification_status === "verified" ? "Verified" : "Not yet verified"}</div></div>
                </a>
              );
            })}</div>
          </div>
          <div className="card section" data-view={CARD_VIEW_ORDER[7]}>
            <div className="lbl">Listed by</div>
            <div className={"apc" + (agent ? " has-agent" : "")} id="pvAgentCard">
              <div className={photoClass} id="pvAgentPhoto" style={photoStyle}>
                <span id="pvAgentInitials">{agent ? agentInits : P ? (agName[0] || "?").toUpperCase() : "-"}</span>
                {!agent && agLogo ? <LoadImg key={agLogo} src={agLogo} className="ag-logo" alt={agName + " logo"} /> : null}
              </div>
              <div className="apc-body">
                <div className="apc-nm">
                  <span id="pvAgentName">{agent ? agent.full_name : "-"}</span>
                  {/* The tick is the agency's verification standing, shown against the person who answers for the listing. */}
                  <span className="apc-vf" id="pvAgentVf" hidden={!(agent && agVerified)}>✓</span>
                </div>
                <div className="apc-role" id="pvAgentMeta">{agent ? (agentBits.length ? agentBits.join(" · ") : "Your agent for this listing") : ""}</div>
                <a className="apc-agency apc-ag-open" id="pvAgencyLink" href={!P ? "#" : agHref || undefined}>
                  {" "}
                  <span className="apc-ag-logo" id="pvAgencyInitial" style={agHex ? { background: agHex, color: lagosHexLum(agHex) > 0.4 ? "#1C1C1E" : "#fff" } : undefined}>
                    {P ? (agName[0] || "—").toUpperCase() : "-"}
                    {agLogo ? <LoadImg key={agLogo} src={agLogo} alt="" /> : null}
                  </span>
                  {" "}
                  <span className="apc-ag-nm" id="pvAgencyName" style={agFontOk ? { fontFamily: "'" + agFont + "', var(--f-sans)" } : undefined}>{agName}</span>
                  {" "}
                  <span className="apc-ag-meta" id="pvAgencyMeta">{P ? cacTxt + (agVerified ? " · Verified by Synapse" : "") : ""}</span>
                  {" "}
                  <span className="apc-ag-go" aria-hidden="true">›</span>
                  {" "}
                </a>
                {" "}
                <a className="apc-ag-page" id="pvAgencyPage" href={agHref || "#"} hidden={!agHref}>{"See the agency and all its listings "}<span aria-hidden="true">→</span></a>
                <div className="apc-ag-tag" id="pvAgencyTag" hidden={!agTag}>{agTag}</div>
                <a className="apc-ag-web" id="pvAgencyWeb" href={agSite || "#"} title={agSite ? agSite.replace(/^https?:\/\//, "").replace(/\/$/, "") : undefined} target="_blank" rel="noopener nofollow" hidden={!agSite}>{"Visit website "}<span aria-hidden="true">↗</span></a>
                <div className="insp" id="pvInsp" hidden={!tourReady}>
                  <button type="button" className="insp-cta" id="pvInspBtn" disabled={booked} onClick={openTour}>
                    {booked ? "Tour booked" : <><span data-icon="calendar" aria-hidden="true"></span>{" Take a tour\n            "}</>}
                  </button>
                  <div className="insp-panel" id="pvInspPanel" hidden={!tour.open}>{!tour.view ? null
                    : tour.view.kind === "note" ? <p className="insp-note">{tour.view.text}</p>
                    : tour.view.kind === "blocked" ? <><p className="insp-note">{BLOCKED[tour.view.key][0]}</p><button type="button" className="insp-act" onClick={BLOCKED[tour.view.key][2]}>{BLOCKED[tour.view.key][1]}</button></>
                    : tour.view.kind === "ok" ? <div className="insp-ok"><b>You are booked in.</b><br />{tour.view.when + " with " + (agent.full_name || "your agent") + ". "
                      + (tour.view.n > 1 ? tour.view.n + " people are going, you will get a reminder to confirm the day before." : "You will get a reminder to confirm the day before.")}</div>
                    : tour.view.slots.map((s: any) => {
                      const left = Number(s.capacity) - Number(s.taken), st = tour.view.state[s.starts_at] || {};
                      return (
                        <button type="button" className="insp-slot" data-at={s.starts_at} key={s.starts_at} disabled={!!st.disabled} onClick={() => bookSlot(s.starts_at)}>
                          <span><span className="insp-when">{fmtWhen(s.starts_at)}</span><span className="insp-who">{(s.agent_name || "Your agent") + " · " + left + " place" + (left === 1 ? "" : "s") + " left"}</span></span>
                          <span className={"insp-going" + (Number(s.taken) > 0 ? " joining" : "")}>{st.tag || (Number(s.taken) === 0 ? "Be first" : Number(s.taken) + " going")}</span>
                        </button>
                      );
                    })}</div>
                </div>
                <div className="apc-foot" id="pvAgentSocial" hidden={!(agent && agent.agent_id)} ref={socialRef}>
                  <button type="button" className="apc-stat" id="pvLikeBtn" aria-pressed={social.liked ? "true" : "false"} aria-label="Like this agent" onClick={() => toggleSocial(false)}>
                    <span data-icon="heart" aria-hidden="true"></span>
                    <b id="pvLikeN">{social.likes.toLocaleString()}</b>
                  </button>
                  <span className="apc-stat static">
                    {" "}
                    <span data-icon="users" aria-hidden="true"></span>
                    <b id="pvFollowN">{social.followers.toLocaleString()}</b>
                    {" "}
                  </span>
                  <button type="button" className="apc-follow" id="pvFollowBtn" aria-pressed={social.following ? "true" : "false"} onClick={() => toggleSocial(true)}>
                    <span id="pvFollowLbl">{social.following ? "Following" : "Follow"}</span>
                    {" "}
                    <i>+</i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="card section" id="pvChecksCard" hidden={!checks} ref={checksRef} data-view={CARD_VIEW_ORDER[8]}>
            <div className="lbl"><span data-icon="shield"></span>{" What we checked"}</div>
            <div className="verify-summary">
              <div className="verify-ring" id="pvChecksRing" style={checks ? { background: checks.bg } : undefined}><span>{checks ? checks.ring : "-"}</span></div>
              <div className="verify-summary-txt">
                <b id="pvChecksHead">{checks ? checks.head : "Not yet verified"}</b>
                <p id="pvChecksNote">{checks ? checks.note : ""}</p>
              </div>
            </div>
            <div className="verify-list" id="pvChecksList">{checks ? checks.rows.map((r: any, i: number) => (
              <div className={"verify-row " + r.cls} key={i}><span className="vi-ic" data-icon={r.ic}></span><span className="vi-lbl">{r.lbl}</span></div>
            )) : null}</div>
            <div className="avail-row" id="pvAvailRow">
              <span className="avail-lbl">Availability</span>
              {" "}
              <span className={"avail-val" + (avail.stale ? " stale" : "")} id="pvAvailVal">{avail.text}</span>
            </div>
          </div>
        </div>
        <div className="cta-dock" data-cnav-clear="">
          <button type="button" className="btn btn-ghost dk-act" ref={dkSave} id="dkSave" aria-pressed={saved ? "true" : "false"} onClick={toggleSaved}>
            <span className="dk-heart" aria-hidden="true" style={{ display: "inline-flex", verticalAlign: "middle" }}>{HEART(saved)}</span>
            {" "}
            <span>{saved ? "Saved" : "Save"}</span>
          </button>
          <button type="button" className="btn btn-ghost dk-act" id="dkShare" onClick={doShare}><span data-icon="share"></span>{" "}<span>Share</span></button>
          <a className="btn btn-primary" style={{ flex: "1" }} id="replyBtn" href={replyHref}
            onClick={(e) => { const q = new URLSearchParams(location.search).get("id"); if (q) { const h = "toju.html?reply=" + encodeURIComponent(q); e.currentTarget.setAttribute("href", h); setReplyHref(h); } }}>
            {" "}
            <span data-icon="chat"></span>
            {" Contact\n      "}
          </a>
        </div>
      </div>
      {canvas}
    </div>
  );
}
