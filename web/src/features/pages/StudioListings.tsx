/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Every live home on Synapse, for the Studio team to market (2026-11-25).
 *
 * Create used to offer only the 14 newest listings in a sideways strip, with no way to reach the rest, so a home an agency
 * published last week could not be posted from the Studio at all. This page lists all of them, newest first, 24 at a time,
 * with the agency that published each one. "Market this" hands the home to Create, which fills in its photos and details.
 */
import { useEffect, useRef, useState } from "react";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase-env";
import { Thumb } from "@/components/Thumb";
import { isVideoUrl } from "@/lib/media";

export type StudioHome = {
  id: string; title: string; city?: string; area?: string; price?: number; per?: string; beds?: number; type?: string;
  pics: string[]; agency?: string;
};

const PAGE = 24;
const SELECT = "id,title,city,area_name,price,price_period,bedrooms,listing_type,listed_at,property_media(url,display_order,media_type),agencies(name)";

/* PostgREST's or=() takes commas and parentheses as syntax: keep them out of what is searched for. */
const clean = (q: string) => q.replace(/[(),*%]/g, " ").trim();

/* Video by its type or address; only the formats Create and the server post as video are handed over (mp4, mov, m4v, qt). */
const POSTABLE_VIDEO = /\.(mp4|mov|m4v|qt)(\?|#|$)/i;
const isVideoMedia = (m: any) => /video/i.test(String(m.media_type || "")) || /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(m.url || ""));

export function toHome(p: any): StudioHome {
  const all = (p.property_media || []).filter((m: any) => m && m.url)
    .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
  /* Photos, as before. A home with only videos used to have nothing here, so "Market this" was greyed out ("No photos")
     and the home could not be posted at all (2026-11-26): it now hands Create its first video. */
  const photos = all.filter((m: any) => !isVideoMedia(m)).map((m: any) => m.url);
  const pics = photos.length ? photos : all.filter((m: any) => isVideoMedia(m) && POSTABLE_VIDEO.test(String(m.url))).slice(0, 1).map((m: any) => m.url);
  return { id: p.id, title: p.title, city: p.city, area: p.area_name, price: p.price, per: p.price_period, beds: p.bedrooms,
    type: p.listing_type, pics, agency: p.agencies && p.agencies.name };
}

export function StudioListings({ money, onMarket }: { money: (p: any, per?: any) => string; onMarket: (h: StudioHome) => void }) {
  const [rows, setRows] = useState<StudioHome[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | "sale" | "rent">("");
  const seq = useRef(0);

  const load = (offset: number) => {
    const my = ++seq.current;
    setBusy(true); setErr("");
    let url = SUPABASE_URL + "/rest/v1/properties?select=" + SELECT
      + "&status=eq.live&is_active=eq.true&deleted_at=is.null&order=listed_at.desc&limit=" + PAGE + "&offset=" + offset;
    if (kind) url += "&listing_type=eq." + kind;
    const s = clean(q);
    if (s) { const v = encodeURIComponent("*" + s + "*"); url += "&or=(title.ilike." + v + ",city.ilike." + v + ",area_name.ilike." + v + ")"; }
    fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, Prefer: "count=exact" } })
      .then((r) => {
        if (!r.ok) throw new Error("Could not load listings.");
        const range = r.headers.get("content-range") || "";
        const n = Number(range.split("/")[1]);
        return r.json().then((d) => ({ d, n }));
      })
      .then(({ d, n }) => {
        if (my !== seq.current) return;
        const got = (Array.isArray(d) ? d : []).map(toHome);
        setRows((prev) => (offset && prev ? prev.concat(got) : got));
        setTotal(isFinite(n) ? n : null);
      })
      .catch((e) => { if (my === seq.current) setErr(e.message || "Could not load listings."); })
      .then(() => { if (my === seq.current) setBusy(false); });
  };

  /* New search or filter: start again from the top, a moment after typing stops. */
  useEffect(() => {
    const t = setTimeout(() => load(0), q ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, kind]);

  const shown = rows ? rows.length : 0;
  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1 className="h">Listings</h1>
          <p className="lede">Every live home agencies have published on Synapse, newest first. Pick one to market it from Create.</p>
        </div>
      </div>
      <div className="card stack">
        <div className="lst-tools">
          <input type="search" className="grow" placeholder="Search by title, area or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search listings" />
          <div className="lst-seg" role="group" aria-label="Sale or rent">
            {([["", "All"], ["sale", "For sale"], ["rent", "To rent"]] as const).map(([k, l]) => (
              <button key={k || "all"} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="small muted">{total == null ? "" : total + " live listing" + (total === 1 ? "" : "s") + (q || kind ? " match" : "")}</div>
        {err && !rows ? <div className="empty">{err}</div> : !rows ? <div className="empty">Loading listings…</div>
          : rows.length ? (
            <div className="lst-grid">
              {rows.map((h) => (
                <div className="lst-card" key={h.id}>
                  <div className="ph" style={h.pics[0] && !isVideoUrl(h.pics[0]) ? { backgroundImage: "url('" + h.pics[0] + "')" } : { position: "relative" }}>{h.pics[0] && isVideoUrl(h.pics[0]) ? <Thumb src={h.pics[0]} style={{ position: "absolute", inset: 0 }} /> : null}{h.pics.length ? <span className="n">{isVideoUrl(h.pics[0]) ? "Video" : h.pics.length + " photo" + (h.pics.length === 1 ? "" : "s")}</span> : <span className="n">No photos</span>}</div>
                  <div className="t">
                    <b title={h.title}>{h.title}</b>
                    <span className="muted">{[h.area, h.city].filter(Boolean).join(", ")}</span>
                    <span>{money(h.price, h.type === "rent" ? h.per : "")}</span>
                    {h.agency ? <span className="muted small">by {h.agency}</span> : null}
                  </div>
                  <div className="lst-acts">
                    <button type="button" className="btn sm orange" disabled={!h.pics.length} title={h.pics.length ? "" : "This home has no photos or videos to post yet"} onClick={() => onMarket(h)}>Market this</button>
                    <a className="btn sm" href={"property.html?id=" + encodeURIComponent(h.id)} target="_blank" rel="noopener noreferrer">View</a>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty">{q || kind ? "No live listings match." : "No live listings right now."}</div>}
        {err && rows ? <div className="empty">{err}</div> : null}
        {rows && total != null && shown < total ? (
          <div><button type="button" className="btn" disabled={busy} onClick={() => load(shown)}>{busy ? "Loading…" : "Load more (" + (total - shown) + " left)"}</button></div>
        ) : null}
      </div>
    </>
  );
}
