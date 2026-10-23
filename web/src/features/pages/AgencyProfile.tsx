"use client";
/**
 * An agency's public page (React since 2026-10-24, was src/legacy/agency-profile/inline-3.js).
 *
 * Who the agency is, what can be checked about it (CAC number or certificate, office, website, socials, hours, focus, how fast
 * it replies) and its live listings, filterable by kind. The agency's own colour and font tint the hero. Links an agency typed
 * are only ever http(s); anything else is dropped.
 */
import { Fragment, useEffect, useState, type ReactNode } from "react";

const SUPABASE_URL = "https://bhrhejpekmhbhwryjhgk.supabase.co";
const ANON_KEY = "sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV";
const H = { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY };
const PERIOD: Record<string, string> = { total: "", per_year: "/yr", per_month: "/mo", per_night: "/night" };
const TIER: Record<string, string> = { gold: "Gold verified", basic: "Verified", verified: "Verified" };
const KIND_LABEL: Record<string, string> = { sale: "For sale", rent: "For rent", land: "Land", shortlet: "Shortlet" };

type Media = { url?: string; display_order?: number; media_type?: string };
type Prop = {
  id: string; title?: string; price?: number; price_period?: string; listing_type?: string; property_type?: string; city?: string;
  area_name?: string; bedrooms?: number | null; verification_status?: string; property_media?: Media[];
};
type Agency = {
  id: string; name: string; logo_url?: string; verification_tier?: string; cac_number?: string | number; cac_certificate_on_file?: boolean;
  city?: string; address?: string; description?: string; brand_color?: string; brand_font?: string; tagline?: string; founded_year?: number;
  specialties?: string[]; business_hours?: string | { text?: string }; social?: Record<string, string>; avg_response_minutes?: number;
};

const naira = (n0: unknown) => { const n = Number(n0) || 0; return n >= 1e9 ? "₦" + (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? "₦" + (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + "M" : "₦" + n.toLocaleString(); };
const safeUrl = (raw: unknown) => {
  let v = String(raw || "").trim(); if (!v) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : ""; } catch { return ""; }
};
const isVid = (m: Media) => !!m && (m.media_type === "video" || /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(m.url || "")));
const cover = (media?: Media[]) => {
  const s = (media || []).filter((m) => m && m.url).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const ph = s.find((m) => !isVid(m));
  if (ph) return ph.url!;
  const u = s.length ? String(s[0].url) : "";
  return /res\.cloudinary\.com\/.+\/video\/upload\//.test(u) ? u.replace("/video/upload/", "/video/upload/so_0/").replace(/\.(mp4|mov|m4v|qt|webm|3gp)(\?.*)?$/i, ".jpg") : null;
};
const kindOf = (p: Prop) => (p.property_type === "land" ? "land" : p.listing_type === "shortlet" ? "shortlet" : p.listing_type === "rent" ? "rent" : "sale");

function Logo({ a }: { a: Agency }) {
  const [on, setOn] = useState(false), [gone, setGone] = useState(false);
  const url = safeUrl(a.logo_url);
  /* The initial is always drawn; the logo sits over it once loaded, so a missing or broken logo is never a blank box. */
  return (
    <>
      <span className="ini">{(a.name || "?").trim()[0].toUpperCase()}</span>
      {url && !gone ? <img src={url} alt={a.name + " logo"} className={on ? "on" : undefined} onLoad={() => setOn(true)} onError={() => setGone(true)} /> : null}
    </>
  );
}

function Facts({ a }: { a: Agency }) {
  const social = a.social && typeof a.social === "object" ? a.social : {};
  const cacNo = a.cac_number ? (/^[a-z]/i.test(String(a.cac_number).trim()) ? String(a.cac_number).trim() : "RC " + String(a.cac_number).trim()) : "";
  const rows: Array<[string, ReactNode]> = [];
  rows.push(["CAC registration", cacNo
    ? <>{cacNo} · <a href="https://search.cac.gov.ng/" target="_blank" rel="noopener nofollow">Check the CAC registry</a></>
    : a.cac_certificate_on_file ? "Certificate uploaded to Synapse" : "Not yet on file"]);
  if (a.address || a.city) {
    const where = [a.address, a.city].filter(Boolean).join(", ");
    rows.push(["Office", <>{where} · <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(where + ", Nigeria")} target="_blank" rel="noopener">Map</a></>]);
  }
  const site = safeUrl(social.website);
  if (site) rows.push(["Website", <a href={site} target="_blank" rel="noopener nofollow">{site.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>]);
  const nets = ["instagram", "facebook", "tiktok", "x", "linkedin", "youtube"].map((k) => [k, safeUrl(social[k])]).filter(([, u]) => u);
  if (nets.length) rows.push(["Social", <>{nets.map(([k, u], i) => <Fragment key={k}>{i ? " · " : ""}<a href={u} target="_blank" rel="noopener nofollow">{k.charAt(0).toUpperCase() + k.slice(1)}</a></Fragment>)}</>]);
  const hours = typeof a.business_hours === "string" ? a.business_hours : (a.business_hours && typeof a.business_hours === "object" && a.business_hours.text) || "";
  if (hours) rows.push(["Hours", hours]);
  const spec = Array.isArray(a.specialties) ? a.specialties.filter(Boolean) : [];
  if (spec.length) rows.push(["Focus", <span className="ap-tags">{spec.map((s, i) => <span key={i}>{s}</span>)}</span>]);
  if (a.avg_response_minutes) rows.push(["Replies in", "about " + (a.avg_response_minutes < 90 ? Math.round(a.avg_response_minutes) + " min" : Math.round(a.avg_response_minutes / 60) + " h")]);
  return <>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</>;
}

function Listing({ p }: { p: Prop }) {
  const img = cover(p.property_media);
  const area = (p.area_name || "").trim();
  const where = [area.length <= 40 && !/\n/.test(area) ? area : "", p.city].filter(Boolean).join(", ");
  const meta = [p.bedrooms ? p.bedrooms + " bed" : "", p.verification_status === "verified" ? "Verified" : "Not yet verified"].filter(Boolean).join(" · ");
  return (
    <a className="ap-l" href={"property.html?id=" + encodeURIComponent(p.id)}>
      <div className="ph">{img ? <img src={img} alt="" loading="lazy" /> : "No photo yet"}</div>
      <div className="b">
        <div className="kind">{KIND_LABEL[kindOf(p)]}</div>
        <div className="pr">{Number(p.price) > 0 ? naira(p.price) + (PERIOD[p.price_period || ""] || "") : "Price on request"}</div>
        <div className="t">{p.title || "Listing"}</div>
        <div className="m">{where}{where && meta ? " · " : ""}{meta}</div>
      </div>
    </a>
  );
}

type State = { kind: "loading" } | { kind: "missing"; msg: string } | { kind: "ok"; a: Agency; props: Prop[] };

export function AgencyProfile() {
  const [st, setSt] = useState<State>({ kind: "loading" });
  const [show, setShow] = useState("all");
  const [id, setId] = useState("");

  useEffect(() => {
    const aid = new URLSearchParams(location.search).get("id") || "";
    setId(aid);
    if (!/^[0-9a-f-]{36}$/i.test(aid)) { setSt({ kind: "missing", msg: "This agency link is incomplete." }); return; }
    const AG = "id,name,logo_url,logo_dark_url,verification_tier,cac_number,cac_certificate_on_file,city,address,description,brand_color,brand_font,tagline,founded_year,specialties,business_hours,social,avg_response_minutes,closed_deals";
    Promise.all([
      fetch(SUPABASE_URL + "/rest/v1/agencies?select=" + AG + "&id=eq." + aid + "&deleted_at=is.null", { headers: H }).then((r) => (r.ok ? r.json() : [])),
      fetch(SUPABASE_URL + "/rest/v1/properties?select=id,title,price,price_period,listing_type,property_type,city,area_name,bedrooms,verification_status,property_media(url,display_order,media_type)"
        + "&agency_id=eq." + aid + "&deleted_at=is.null&is_active=eq.true&order=created_at.desc&limit=200", { headers: H }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([ags, props]) => {
      const a = Array.isArray(ags) && ags[0];
      if (!a) { setSt({ kind: "missing", msg: "We couldn’t find this agency." }); return; }
      document.title = a.name + " · Synapse";
      setSt({ kind: "ok", a, props: Array.isArray(props) ? props : [] });
    }).catch(() => setSt({ kind: "missing", msg: "This page couldn’t load. Check your connection and try again." }));
  }, []);

  if (st.kind === "missing") {
    return (
      <main className="ap" id="ap">
        <div className="ap-miss">
          <h1 className="ap-name" style={{ color: "var(--ink)" }}>{st.msg}</h1>
          <p className="ap-sub" style={{ marginTop: 10 }}><a href="browse.html">Back to your matches</a></p>
        </div>
      </main>
    );
  }

  const a = st.kind === "ok" ? st.a : null;
  const props = st.kind === "ok" ? st.props : [];
  const heroStyle: Record<string, string> = {};
  if (a && /^#[0-9a-f]{3,8}$/i.test(a.brand_color || "")) heroStyle["--ag"] = a.brand_color!;
  if (a && a.brand_font && /^[\w\s-]{2,40}$/.test(a.brand_font)) heroStyle["--ag-font"] = '"' + a.brand_font + '", var(--f-sans)';
  const chips: ReactNode[] = [];
  if (a) {
    if (TIER[a.verification_tier || ""]) chips.push(<span className="ap-chip ok" key="t">✓ {TIER[a.verification_tier!]}</span>);
    const cacNo = a.cac_number ? (/^[a-z]/i.test(String(a.cac_number).trim()) ? String(a.cac_number).trim() : "RC " + String(a.cac_number).trim()) : "";
    chips.push(cacNo ? <span className="ap-chip cac" key="c">CAC {cacNo}</span>
      : a.cac_certificate_on_file ? <span className="ap-chip cac" key="c">CAC certificate on file</span>
      : <span className="ap-chip cac no" key="c">CAC not yet on file</span>);
    if (a.city) chips.push(<span className="ap-chip" key="ci">{a.city}</span>);
    if (a.founded_year) chips.push(<span className="ap-chip" key="f">Since {a.founded_year}</span>);
  }
  const kinds = Array.from(new Set(props.map(kindOf)));
  const list = props.filter((p) => show === "all" || kindOf(p) === show);

  return (
    <main className="ap" id="ap">
      <section className="ap-hero" id="apHero" style={heroStyle}>
        <div className="ap-logo" id="apLogo">{a ? <Logo a={a} /> : "-"}</div>
        <div className="ap-id">
          <h1 className="ap-name" id="apName">{a ? a.name : "Loading…"}</h1>
          <p className="ap-tag" id="apTag" hidden={!a?.tagline}>{a?.tagline || ""}</p>
          <div className="ap-chips" id="apChips">{chips}</div>
        </div>
      </section>
      <div className="ap-grid">
        <div className="ap-card" id="apAboutCard" hidden={!a?.description}>
          <div className="ap-k">About</div>
          <p className="ap-about" id="apAbout">{a?.description || ""}</p>
        </div>
        <div className="ap-card">
          <div className="ap-k">The agency</div>
          <dl className="ap-facts" id="apFacts">{a ? <Facts a={a} /> : null}</dl>
          <a className="ap-ask" id="apAsk" href={a ? "toju.html?new=site&agency=" + encodeURIComponent(id) + "&ask=" + encodeURIComponent("Tell me about " + a.name + ". Can I trust them?") : "toju.html?new=site"}>
            Ask Tayo about their homes
          </a>
        </div>
      </div>
      <h2 className="ap-h2" id="apListHead">
        {a ? (props.length ? props.length + " listing" + (props.length > 1 ? "s" : "") + " from " + a.name : "Listings from " + a.name) : "Their listings"}
      </h2>
      <p className="ap-sub" id="apListSub"></p>
      <div className="ap-filters" id="apFilters" role="group" aria-label="Show">
        {kinds.length > 1 ? ["all"].concat(kinds).map((k) => (
          <button type="button" key={k} data-k={k} aria-pressed={k === show} onClick={() => setShow(k)}>{k === "all" ? "All" : KIND_LABEL[k]}</button>
        )) : null}
      </div>
      <div className="ap-list" id="apList">
        {a ? (list.length ? list.map((p) => <Listing key={p.id} p={p} />) : <div className="ap-empty" style={{ gridColumn: "1/-1" }}>No live listings right now.</div>) : null}
      </div>
    </main>
  );
}
