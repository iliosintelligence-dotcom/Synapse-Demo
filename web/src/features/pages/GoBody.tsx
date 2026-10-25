"use client";
/**
 * The bio-link page, /go/<handle> (React since 2026-10-24, was src/legacy/go/inline-3.js).
 *
 * The homes an account posted recently, from its bio link. Each card goes to the post's own short link when it has one (so
 * the click is credited to that post), otherwise to the property page with the channel on it. An unknown handle and an
 * account that has not posted anything yet are two different nothings, and the page says which.
 */
import { Fragment, useEffect, useState } from "react";

const SUPABASE_URL = "https://bhrhejpekmhbhwryjhgk.supabase.co";
const ANON_KEY = "sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV";

type Home = {
  property_id: string; token?: string | null; platform?: string; listing_type?: string; bedrooms?: number | null; city?: string;
  verified?: boolean; image_url?: string | null; price?: number; currency?: string; title?: string;
};
type Owner = { is_synapse?: boolean; agency_name?: string; handle?: string };

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error("rpc " + fn + " " + r.status);
  return r.json();
}

/* The app's price style (the same as money() in src/shared/matches-shared.js): the currency's own symbol (narrowSymbol turns NGN
   into ₦), whole units, and millions or billions once the plain figure gets unwieldy. */
function price(n?: number, cur?: string) {
  const v = Number(n) || 0;
  const code = /^[A-Za-z]{3}$/.test(cur || "") ? String(cur).toUpperCase() : "NGN";
  const fmt = (value: number, opts?: Intl.NumberFormatOptions) => {
    const base: Intl.NumberFormatOptions = { style: "currency", currency: code, maximumFractionDigits: 0, ...opts };
    try { return new Intl.NumberFormat(undefined, { currencyDisplay: "narrowSymbol", ...base }).format(value); } catch { /* the plain form */ }
    try { return new Intl.NumberFormat(undefined, base).format(value); } catch { return code + " " + Math.round(value).toLocaleString(); }
  };
  if (Math.abs(v) >= 1e9) return fmt(v / 1e9, { maximumFractionDigits: 1 }) + "B";
  if (Math.abs(v) >= 1e6) return fmt(v / 1e6, { maximumFractionDigits: v % 1e6 === 0 ? 0 : 1 }) + "M";
  return fmt(v);
}
const hrefFor = (r: Home) => (r.token ? "/s/" + encodeURIComponent(r.token)
  : "/app/property.html?id=" + encodeURIComponent(r.property_id) + "&ch=" + encodeURIComponent(r.platform || "organic"));

function Card({ r }: { r: Home }) {
  const [broken, setBroken] = useState(false);
  const bits: string[] = [];
  if (r.bedrooms) bits.push(r.bedrooms + " bed" + (r.bedrooms === 1 ? "" : "s"));
  if (r.city) bits.push(r.city);
  /* The badge says what is true, both ways round: verified on the photo, unverified stated plainly in the facts. */
  if (!r.verified) bits.push("Not yet verified");
  return (
    <a className="home" href={hrefFor(r)}>
      <div className="ph">
        {r.image_url ? (broken ? null : <img src={r.image_url} alt="" loading="lazy" onError={() => setBroken(true)} />) : <span className="none">No photo yet</span>}
        {r.verified ? <span className="tag"><span className="mk" aria-hidden="true">✦</span>Verified</span> : null}
      </div>
      <div className="body">
        <div className="price">{price(r.price, r.currency)}{r.listing_type === "rent" ? <span className="per">/yr</span> : null}</div>
        <div className="ttl">{r.title || "Listing"}</div>
        {bits.length ? (
          <div className="meta">
            {bits.map((b, i) => (
              <Fragment key={i}>{i ? " · " : ""}{!r.verified && i === bits.length - 1 ? <span className="unv">{b}</span> : b}</Fragment>
            ))}
          </div>
        ) : null}
      </div>
    </a>
  );
}

type View = { kind: "loading" } | { kind: "homes"; rows: Home[] } | { kind: "state"; title: string; body: string };

export function GoBody() {
  const [who, setWho] = useState("Homes we just posted");
  const [plat, setPlat] = useState("");
  const [lede, setLede] = useState("The homes we posted recently. Tap one for the full details.");
  const [ask, setAsk] = useState("/app/toju.html?new=1");
  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    /* The handle arrives as /go/<handle>, rewritten here with ?h=; both are read, so the page works either way. */
    let handle = new URLSearchParams(location.search).get("h") || "";
    if (!handle) {
      const seg = location.pathname.replace(/\/+$/, "").split("/");
      if (seg.length > 1 && seg[seg.length - 2] === "go") handle = decodeURIComponent(seg[seg.length - 1]);
    }
    if (!handle) { setView({ kind: "state", title: "No account in the link", body: "This page needs to be opened from an account’s bio link." }); return; }
    /* Both at once: the owner only changes the heading, so it must not hold up the listings. */
    rpc<Owner[]>("bio_owner", { p_handle: handle }).then((rows) => {
      const o = rows && rows[0]; if (!o) return;
      const name = o.is_synapse ? "Synapse" : o.agency_name || "Synapse";
      /* On an agency's link the agency IS the answer to "whose homes are these", and it leads. */
      setWho(o.is_synapse ? "Homes we just posted" : name);
      setPlat(o.handle || "");
      document.title = "Homes we just posted · " + name;
      if (!o.is_synapse) setLede("Homes " + name + " posted recently, listed on Synapse. Tap one for the full details.");
    }).catch(() => { /* the heading stays generic */ });
    rpc<Home[]>("bio_page", { p_handle: handle, p_limit: 12 }).then((rows) => {
      const pl = rows && rows[0] && rows[0].platform;
      if (pl && /^[a-z_]{1,24}$/.test(pl)) setAsk("/app/toju.html?new=1&ch=" + encodeURIComponent(pl));
      if (!rows || !rows.length) {
        return rpc<Owner[]>("bio_owner", { p_handle: handle }).then((o) => {
          setView(o && o.length
            ? { kind: "state", title: "Nothing posted yet", body: "This account has not put a home out yet. Everything on Synapse is below." }
            : { kind: "state", title: "We could not find that account", body: "Check the link, or browse everything on Synapse below." });
        }).catch(() => setView({ kind: "state", title: "Nothing to show yet", body: "Browse everything on Synapse below." }));
      }
      setView({ kind: "homes", rows });
    }).catch((err) => {
      console.error("bio_page failed", err);
      setView({ kind: "state", title: "That did not load", body: "Something went wrong on our side, not yours. Try again, or browse everything on Synapse below." });
    });
  }, []);

  return (
    <div className="wrap">
      <div className="brandbar">
        <img src="/images/brand/mark-black-on-white-tight.jpg" alt="" aria-hidden="true" />{" "}
        <span className="word">Synapse</span>{" "}
        <span className="by">Verified Nigerian homes</span>
      </div>
      <header className="hd">
        <h1 className="who" id="who">{who}</h1>
        <div className="plat" id="plat">{plat}</div>
      </header>
      <p className="lede" id="lede">{lede}</p>
      <div className="list" id="list">
        {view.kind === "loading" ? [0, 1].map((i) => (
          <div className="skel" key={i}><div className="ph"></div><div className="ln a"></div><div className="ln b"></div><div className="ln c"></div></div>
        )) : view.kind === "state" ? (
          <div className="state"><b>{view.title}</b>{view.body}</div>
        ) : view.rows.map((r) => <Card key={r.property_id + (r.token || "")} r={r} />)}
      </div>
      <div className="ft">
        <a className="primary" id="askTayo" href={ask}>Tell Tayo what you&apos;re looking for</a>{" "}
        <a className="ghost" href="/app/browse.html">See every home on Synapse</a>
        <p className="note">{"Every listing on Synapse expires unless it is re-confirmed,\n        so nothing here has been sitting for months."}</p>
        <div className="sig" aria-hidden="true">
          <img src="/images/brand/mark-black-on-white-tight.jpg" alt="" />{" "}
          <span>Synapse · an AI property advisor for Nigeria</span>
        </div>
      </div>
    </div>
  );
}
