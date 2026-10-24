"use client";
/**
 * The property preview ("zoom to confirm the right property"), as React (was openPropPreview/ourFunnel/platformBlock in
 * src/legacy/agency/inline-3.js). openPropPreview(post) and closePropPreview() survive there as names and fire
 * `syn:prop-preview` / `syn:prop-preview-close`.
 *
 * It opens at once on what we know (the listing, the channels, our own funnel) and fills in what the platforms say when that
 * arrives. The answer is dropped if the panel has since closed or moved to another post.
 */
import { useEffect, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
type Ch = { label: string; color: string };
const CHS = (): Record<string, Ch> => W().SynCH || {};
const mark = (c: string, px: number) => (W().SynChMark ? W().SynChMark(c, px) : "");

function Photo({ url }: { url: string }) {
  const [bad, setBad] = useState(false);
  const u = typeof url === "string" ? url.trim() : "";
  return <div className={"lph" + (bad ? " no-photo" : "")}>{u && !bad ? <img src={u} alt="" loading="lazy" onError={() => setBad(true)} /> : null}</div>;
}

const N = ({ v, label }: { v: number; label: string }) => <div className={"pan-n" + (v ? "" : " zero")}><b>{v || 0}</b><span>{label}</span></div>;
/* WHAT WE MEASURE OURSELVES, which does not depend on anybody's API being up: a tap on the link, a session that reached the
   listing, an enquiry that followed. */
function OurFunnel({ p }: { p: any }) {
  if (!p.token && !p.clicks && !p.visits) return null;
  return (
    <div className="psec"><div className="k">What we measured</div>
      <div className="pan-grid">
        <N v={p.clicks} label="tapped the link" />
        <N v={p.visits} label="read the listing" />
        <N v={p.leads} label={p.leads === 1 ? "enquiry" : "enquiries"} />
      </div>
      {p.clicksRaw && p.clicksRaw > p.clicks
        ? <div className="pan-note">{(p.clicksRaw - p.clicks) + " more fetches were preview crawlers — the platforms load every link the moment it is posted, and counting those as readers would flatter every post equally."}</div>
        : null}
    </div>
  );
}

/* WHAT THE PLATFORM SAYS, the other half, which arrives later. */
function Platforms({ res }: { res: any }) {
  if (res === undefined) return <div className="pan-load">{"Asking the platforms…"}</div>;
  if (!res) return <div className="pan-load">No engagement data for this one.</div>;
  if (res.error) return <div className="pan-load">{"Could not reach the platform just now" + (res.error === "not_found" ? " — this post is not in the connected workspace." : ".")}</div>;
  const rows = (res.platforms || []) as any[];
  if (!rows.length) return <div className="pan-load">No engagement data for this one.</div>;
  return (
    <>
      {rows.map((pl, i) => {
        const nm = (CHS()[pl.platform] && CHS()[pl.platform].label) || pl.platform || "Channel";
        let body: React.ReactNode;
        if (pl.supported && pl.metrics && pl.metrics.length) {
          /* The labels come plural ("Likes"), so a value of 1 loses its trailing s; "Reach" and an emoji label are left alone. */
          body = pl.metrics.map((m: any, k: number) => {
            let label = String(m.label || "").toLowerCase();
            if (Number(m.value) === 1 && label.length > 1 && label.slice(-1) === "s") label = label.slice(0, -1);
            return <span key={k}>{k ? " · " : ""}<b>{String(m.value)}</b>{" " + label}</span>;
          });
        } else if (!pl.supported && pl.reason === "not_published") body = "not out yet";
        /* Named, because it is permanent and not our doing. */
        else if (!pl.supported && pl.reason === "platform_not_supported") body = nm + " does not publish per-post numbers";
        else if (pl.supported) body = "nothing yet";
        else body = "no numbers available";
        return (
          <div className="pan-plat" key={i}>
            <span className="nm">{nm}</span><span className="ms">{body}</span>
            {pl.url ? <a href={pl.url} target="_blank" rel="noopener">See the post</a> : null}
          </div>
        );
      })}
    </>
  );
}

export function PropPreview() {
  const [post, setPost] = useState<any>(null);
  const [res, setRes] = useState<{ id: string; v: any } | null>(null);
  useEffect(() => {
    const open = (e: Event) => { const p = (e as CustomEvent).detail; if (p) { setRes(null); setPost(p); } };
    const close = () => setPost(null);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPost(null); };
    window.addEventListener("syn:prop-preview", open);
    window.addEventListener("syn:prop-preview-close", close);
    document.addEventListener("keydown", esc);
    return () => { window.removeEventListener("syn:prop-preview", open); window.removeEventListener("syn:prop-preview-close", close); document.removeEventListener("keydown", esc); };
  }, []);
  /* Only a post that reached a platform has anything to report; asking for a scheduled one returns "not_published" everywhere. */
  const live = !!post && (post.stage === "published" || post.stage === "attention");
  useEffect(() => {
    if (!post || !live || !post.familyIds || !post.familyIds.length || !W().SynListings || !W().SynListings.postMetrics) return;
    let gone = false;
    W().SynListings.postMetrics(post.familyIds).then((byId: any) => {
      if (gone) return;
      /* The agency's own post and each Synapse twin, as one list: to the reader they are one thing on several channels. */
      const all: any[] = [];
      post.familyIds.forEach((id: string) => {
        const r = byId[id];
        if (r && r.platforms) all.push(...r.platforms);
        else if (r && r.error) all.push({ error: r.error });
      });
      const good = all.filter((x) => !x.error);
      setRes({ id: post.id, v: good.length ? { platforms: good } : all.length ? { error: all[0].error } : null });
    });
    return () => { gone = true; };
  }, [post, live]);

  let inner: React.ReactNode = null;
  if (post) {
    const data: any[] = (W().SynListingsData && W().SynListingsData()) || [];
    const L = data.find((l) => (l.title || l.t) === post.listing) || null;
    const img = post.img || (L && L.img) || "";
    const price = post.price || (L && W().SynNaira(L.price)) || "";
    const vs = L ? L.verification_status : null;
    const loc = L ? [L.neighbourhood, L.city].filter(Boolean).join(", ") : String(post.listing || "").split(",").slice(1).join(",").trim();
    const meta: string[] = [];
    if (L) {
      if (L.bedrooms != null) meta.push(L.bedrooms + " bed" + (L.bedrooms == 1 ? "" : "s"));
      if (L.bathrooms != null) meta.push(L.bathrooms + " bath" + (L.bathrooms == 1 ? "" : "s"));
      if (L.area_sqm) meta.push(L.area_sqm + " sqm");
      if (L.property_type) meta.push((W().SynTypeLabel && W().SynTypeLabel[L.property_type]) || L.property_type);
    }
    const stg = ((W().SynPStages || []).find((s: any) => s.id === post.stage) || {}).label || post.stage;
    const close = () => setPost(null);
    inner = (
      <>
        <div className="pimg">
          <Photo url={img} />
          {vs === "verified" ? <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: W().vStamp("ok").replace('class="vst ', 'class="vst land ') }}></span>
            : vs === "in_progress" ? <span className="pvb" style={{ background: "#7a5410" }}>Verifying</span>
              : vs ? <span className="pvb" style={{ background: "rgba(20,22,26,0.72)" }}>Unverified</span> : null}
          <button className="px" id="pprevX" aria-label="Close" onClick={close}>×</button>
        </div>
        <div className="pbody">
          <div className="pprice">{price}</div>
          <div className="ptt">{post.listing}</div>
          {loc ? <div className="ploc">{"◍ " + loc}</div> : null}
          {meta.length ? <div className="pmeta2">{meta.map((m) => <span className="pchip" key={m}>{m}</span>)}</div> : null}
          <div className="psec"><div className="k">In this post</div>
            <div className="row">
              <span style={{ display: "flex", gap: "4px" }}>
                {post.channels && post.channels.length
                  ? post.channels.map((c: string) => (
                    <span key={c} className="cav" style={{ width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", font: "700 9px var(--f-sans)", color: "#fff", background: (CHS()[c] || {}).color }}
                      dangerouslySetInnerHTML={{ __html: mark(c, 13) }}></span>))
                  : <span style={{ fontSize: "12.5px", color: "var(--ink-dim)" }}>Not yet on any channel</span>}
              </span>
              <span className="stg">{stg}</span>
            </div>
          </div>
          {live ? <OurFunnel p={post} /> : null}
          {live ? <div className="psec"><div className="k">On the platforms</div><div id="pprevPlat"><Platforms res={res && res.id === post.id ? res.v : undefined} /></div></div> : null}
          {L ? <button className="btn btn-ghost btn-block" id="pprevOpen" style={{ marginTop: "14px" }}
            onClick={() => { close(); (document.querySelector('#tabs a[data-pane="listings"]') as HTMLElement | null)?.click(); }}>Open in Listings →</button> : null}
        </div>
      </>
    );
  }
  return (
    <div className={"pprev-scrim" + (post ? " on" : "")} id="pprevScrim" onClick={(e) => { if (e.target === e.currentTarget) setPost(null); }}>
      <div className="pprev" id="pprevModal" role="dialog" aria-label="Property preview">{inner}</div>
    </div>
  );
}
