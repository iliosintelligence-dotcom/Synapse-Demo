"use client";
/**
 * The properties feed that ends the landing pages (Eden, 2026-10-11; React since 2026-10-24, was public/home-feed.js).
 *
 * Real properties sorted into rows the way people shop: Invest, Rent, Buy, Short let. Each row slides sideways; empty rows are
 * not drawn, and the whole section goes if there is nothing live. Live listings only, verified ones first; prices are formatted
 * here and nothing is invented. Share buttons are picked up by the shared share sheet (public/app/share.js, data-share).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

const URL_ = "https://bhrhejpekmhbhwryjhgk.supabase.co";
const KEY = "sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV";
const SAVES = "synapse_saved";

type Row = { id: string; title: string; sub: string; deals: string[] };
const ROWS: Row[] = [
  { id: "invest", title: "Invest", sub: "Off-plan, joint ventures and development deals", deals: ["off_plan", "joint_venture", "development_financing"] },
  { id: "rent", title: "Rent", sub: "Homes to rent now", deals: ["rent", "lease"] },
  { id: "buy", title: "Buy", sub: "Homes and land for sale", deals: ["outright", "rent_to_own"] },
  { id: "shortlet", title: "Short let", sub: "By the night", deals: ["shortlet"] },
];

type Media = { url?: string; display_order?: number; media_type?: string };
type Listing = {
  id: string; title?: string; price?: number; price_period?: string; currency?: string; city?: string; area_name?: string;
  verification_status?: string; bedrooms?: number | null; bathrooms?: number | null; property_media?: Media[];
};

function readSaves(): Set<string> {
  try { const r = JSON.parse(localStorage.getItem(SAVES) || "[]"); return new Set(Array.isArray(r) ? r : []); } catch { return new Set(); }
}
function money(n0: unknown, cur?: string) {
  const n = Number(n0); if (!isFinite(n) || n <= 0) return "";
  const sym = cur && cur !== "NGN" ? cur + " " : "₦";
  if (n >= 1e9) return sym + (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + "B";
  if (n >= 1e6) return sym + (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return sym + Math.round(n / 1e3) + "k";
  return sym + n;
}
function cover(media?: Media[]) {
  const s = (Array.isArray(media) ? media : []).filter((m) => m && m.url && m.media_type !== "video" && !/\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(m.url));
  s.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  return s.length ? s[0].url! : "";
}
async function fetchRow(r: Row): Promise<Listing[]> {
  const q = URL_ + "/rest/v1/properties?select=id,title,price,price_period,currency,city,area_name,verification_status,bedrooms,bathrooms,property_media(url,display_order,media_type)"
    + "&status=eq.live&is_active=is.true&deleted_at=is.null&deal_structure=in.(" + r.deals.join(",") + ")"
    + "&order=verification_status.desc,listed_at.desc&limit=12";
  try {
    const x = await fetch(q, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
    if (!x.ok) return [];
    const rows = await x.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

/** The perforated "Verified by Synapse" stamp (was public/app/stamp.js), drawn only for a listing that is exactly 'verified'. */
export function VerifiedStamp({ land }: { land?: boolean }) {
  return (
    <span className={"vst" + (land ? " land" : "")} title="Verified by Synapse">
      <span className="vst-in">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.4 3 8 7.5 9.5 4.5-1.5 7.5-5.1 7.5-9.5V6z" /><path d="m8.6 12 2.4 2.4 4.4-4.8" /></svg>
        <b>VERIFIED</b><i>SYNAPSE</i>
      </span>
      <span className="vst-pm" aria-hidden="true" />
      <span className="vst-sr">Verified by Synapse. </span>
    </span>
  );
}

function Card({ p, saved, onSave }: { p: Listing; saved: boolean; onSave: (id: string) => void }) {
  const [broken, setBroken] = useState(false);
  const img = cover(p.property_media);
  const per = ({ per_year: "/yr", per_month: "/mo", per_night: "/night" } as Record<string, string>)[p.price_period || ""] || "";
  const area = p.area_name && p.area_name.trim().length <= 40 && !/\n/.test(p.area_name) ? p.area_name.trim() + ", " + (p.city || "") : p.city || "";
  const facts = [p.bedrooms != null ? p.bedrooms + " bed" + (p.bedrooms === 1 ? "" : "s") : "", p.bathrooms != null ? p.bathrooms + " bath" + (p.bathrooms === 1 ? "" : "s") : ""].filter(Boolean).join(" · ");
  const price = money(p.price, p.currency) + per;
  const title = p.title || "A property on Synapse";
  return (
    <article className="hf-card">
      <a className="hf-link" href={"app/property.html?id=" + encodeURIComponent(p.id)} aria-label={title} />
      <div className={"img" + (broken ? " no-photo" : "")}>
        {img && !broken ? <img src={img} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} /> : null}
        {p.verification_status === "verified" ? <VerifiedStamp /> : null}
        <button type="button" className={"hf-save" + (saved ? " on" : "")} aria-pressed={saved} aria-label={(saved ? "Remove from saved" : "Save") + " " + title}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(p.id); }}>{saved ? "♥" : "♡"}</button>
        <button type="button" className="share" data-share={p.id} data-title={title} data-price={price} data-place={area} aria-label={"Share " + title}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
        </button>
        <a className="contact" data-contact="" href={"app/toju.html?reply=" + encodeURIComponent(p.id)} aria-label={"Contact an agent about " + title} title="Contact an agent">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" /></svg>
        </a>
      </div>
      <div className="hf-body">
        <div className="hf-price">{price}</div>
        <div className="hf-title">{title}</div>
        <div className="hf-meta">{area}{facts ? " · " + facts : ""}</div>
      </div>
    </article>
  );
}

function FeedRow({ r, rows, saves, onSave }: { r: Row; rows: Listing[]; saves: Set<string>; onSave: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const step = (dir: number) => {
    const t = track.current; if (!t) return;
    t.scrollBy({ left: dir * Math.max(240, t.clientWidth * 0.85), behavior: "smooth" });
  };
  return (
    <section className="hf-row" aria-labelledby={"hfr-" + r.id}>
      <div className="hf-rowhead">
        <div><h3 id={"hfr-" + r.id}>{r.title}</h3><p>{r.sub}</p></div>
        <div className="hf-nav">
          <button type="button" aria-label={"Scroll " + r.title + " back"} onClick={() => step(-1)}>{"‹"}</button>
          <button type="button" aria-label={"Scroll " + r.title + " forward"} onClick={() => step(1)}>{"›"}</button>
        </div>
      </div>
      <div className="hf-track" tabIndex={-1} ref={track}>
        {rows.map((p) => <Card key={p.id} p={p} saved={saves.has(p.id)} onSave={onSave} />)}
      </div>
    </section>
  );
}

/** The section: its heading (children), the rows once they are read, and the closing links (end) once there is something to see. */
export function HomesFeed({ children, end }: { children: ReactNode; end: ReactNode }) {
  const [rows, setRows] = useState<Listing[][] | null>(null);
  const [saves, setSaves] = useState<Set<string>>(new Set());
  useEffect(() => {
    let gone = false;
    setSaves(readSaves());
    Promise.all(ROWS.map(fetchRow)).then((all) => { if (!gone) setRows(all); });
    return () => { gone = true; };
  }, []);
  const onSave = (id: string) => {
    const s = readSaves();
    if (s.has(id)) s.delete(id); else s.add(id);
    try { localStorage.setItem(SAVES, JSON.stringify(Array.from(s))); } catch { /* private mode: saved for this visit */ }
    setSaves(new Set(s));
  };
  const shown = rows ? rows.reduce((n, r) => n + r.length, 0) : 0;
  return (
    <section className="feed" id="homesFeed" aria-labelledby="feedTitle" hidden={rows !== null && shown === 0}>
      <div className="wrap">
        {children}
        <div id="hfRows">
          {rows ? ROWS.map((r, i) => (rows[i].length ? <FeedRow key={r.id} r={r} rows={rows[i]} saves={saves} onSave={onSave} /> : null)) : null}
        </div>
        <div className="hf-end" id="hfEnd" hidden={!shown}>{end}</div>
      </div>
    </section>
  );
}
