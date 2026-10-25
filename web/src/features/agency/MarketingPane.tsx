"use client";
/**
 * The Marketing pane, as React (was renderCampaigns/campaignForm/loadCampaigns, the leaderboard (loadBoard/renderBoard) and the
 * findings (digestFindings/renderDigest) in src/legacy/agency/inline-3.js).
 *
 * Findings first, then the posts that produced them, then the campaigns. Everything here is counted from rows that exist:
 * social_post_stats() for taps, listing visits and enquiries per post, campaign_performance for the campaigns. Nothing is
 * estimated, and a number that is not counted yet says so rather than reading zero.
 *
 * The campaigns are read by the scheduler (its Campaign picker) and by portalData's mkStats (the Ask-Tayo tiles), so this sets
 * `window.SynCampaigns()` and calls mkStats() whenever they change. The pane's header and filter row stay static in AgencyBody
 * (the phone dock lends the filters to its sheet); the view switch, the sort and the New campaign button are listened for here.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";
import { showDrawer } from "./SideDrawer";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const svg = (n: string) => (typeof window !== "undefined" && W().SynIcons && W().SynIcons.svg ? W().SynIcons.svg(n) : "");
const fmtWhen = (iso: string) => (W().fmtWhen ? W().fmtWhen(iso) : "");
const listings = (): any[] => (typeof window !== "undefined" && W().SynListingsData && W().SynListingsData()) || [];
type Ch = { label: string; color: string };
const CHS = (): Record<string, Ch> => W().SynCH || {};
const CH_LABEL: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", youtube: "YouTube", whatsapp: "WhatsApp", x: "X", telegram: "Telegram" };
/* Campaigns used to live in localStorage under this key, on one machine only. It survives for the one-time import below. */
const MK_KEY = "synapse_agency_campaigns_v1";

type Camp = { id: string; nm: string; live: boolean; until: string | null; chans: string[] };
type Row = { id: string; propertyId: string; platform: string; when: string; angle: string | null; clicks: number; visits: number; leads: number; caption: string };
type St = {
  camps: Camp[]; mk: { loaded: boolean; error: string | null }; perf: Record<string, any> | null; now: number; sorted: boolean;
  rows: Row[]; board: { loaded: boolean; error: string | null }; sort: "leads" | "clicks"; view: "board" | "campaigns"; tick: number;
};
let state: St = { camps: [], mk: { loaded: false, error: null }, perf: null, now: 0, sorted: false, rows: [], board: { loaded: false, error: null }, sort: "leads", view: "board", tick: 0 };
const subs = new Set<() => void>();
const set = (v: Partial<St>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useMk = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);

/* Database row -> the shape this pane renders. */
const mapCampaign = (c: any): Camp => ({ id: c.id, nm: c.name, live: c.status === "active", until: c.end_date || null,
  chans: (c.target_platforms || []).length ? c.target_platforms : ["instagram"] });

function loadCampaigns(): Promise<void> {
  const L = W().SynListings;
  if (!L || !L.listCampaigns) { set({ mk: { loaded: true, error: "the data layer did not load" } }); return Promise.resolve(); }
  return L.listCampaigns().then((rows: any[]) => set({ camps: rows.map(mapCampaign), mk: { loaded: true, error: null } }))
    .catch((err: any) => { set({ camps: [], mk: { loaded: true, error: (err && err.message) || "please refresh" } }); console.error("campaigns load failed", err); });
}
/* Real performance, keyed by campaign id: once per load, since the rollup is a round trip over every post. Absent means "not
   counted yet", never zero. A failed rollup leaves the campaigns themselves on screen. */
let perfAsked = false;
function loadPerformance() {
  const L = W().SynListings;
  if (perfAsked || !L || !L.campaignPerformance) return; perfAsked = true;
  L.campaignPerformance().then((m: any) => set({ perf: m || {} })).catch((e: any) => console.error("campaign performance", e));
}
/* One-time import of campaigns built before they moved to the table. The key is cleared only after every row is written, so a
   failed import does not destroy the only copy. The persona, audience and budget these carried are dropped (none of those columns
   exist any more), and so are their invented creatives. */
function importLegacy(): Promise<boolean> {
  const L = W().SynListings;
  if (!L || !L.createCampaign) return Promise.resolve(false);
  let old: any = null;
  try { old = JSON.parse(localStorage.getItem(MK_KEY) || "null"); } catch { /* unreadable: nothing to import */ }
  if (!Array.isArray(old) || !old.length) return Promise.resolve(false);
  return Promise.all(old.map((c: any) => L.createCampaign({ name: c.nm || "Imported campaign", channels: c.chans || [] }))).then(() => {
    localStorage.removeItem(MK_KEY);
    toast(old.length + " campaign" + (old.length !== 1 ? "s" : "") + " moved to your account");
    return true;
  }).catch((err: any) => {
    console.error("campaign import failed", err);
    toast("Some saved campaigns could not be moved, they are still on this device");
    return false;
  });
}
/* The leaderboard, over posts that actually went out. PUBLISHED ONLY: a scheduled post has nothing to rank. The angle is the
   subject social-generate chose (space, location, value, trust, fit, moment), recorded at queue time in the payload. */
function loadBoard() {
  const L = W().SynListings;
  if (!L || !L.listSocialPosts) { set({ board: { loaded: true, error: "the data layer did not load" } }); return; }
  Promise.all([L.listSocialPosts(), L.socialPostStats ? L.socialPostStats().catch(() => ({})) : Promise.resolve({})])
    .then(([posts, stats]: [any[], any]) => {
      const rows = (posts || []).filter((p) => p.status === "published").map((p) => {
        const st = (stats || {})[p.id] || {};
        return { id: p.id, propertyId: p.property_id, platform: p.platform, when: p.published_at,
          angle: (p.payload && (p.payload.angle || p.payload.angleKey)) || null,
          clicks: st.clicks || 0, visits: st.visits || 0, leads: st.leads || 0, caption: p.caption || "" };
      });
      set({ rows, board: { loaded: true, error: null }, now: Date.now() });
    })
    .catch((err: any) => { set({ board: { loaded: true, error: (err && err.message) || "could not be loaded" }, now: Date.now() }); console.error("leaderboard load failed", err); });
}

/* ── the findings, at most three, in plain sentences ──
   EVERY FINDING HAS A FLOOR. Two posts on an angle, two channels with traffic, a difference big enough not to be noise. Below it
   they say nothing at all: five confident panels reporting zero is what this page was rescued from. */
const ANGLE_WORDS: Record<string, string> = {
  space: "the rooms and the space", location: "the area", value: "the price and the value", trust: "the checks and the paperwork",
  fit: "who the home suits", moment: "the timing", custom: "your own wording",
};
type Finding = { tone: string; text: React.ReactNode; note: string; act?: { label: string; id: string } };
function findings(rows: Row[], data: any[], now: number): Finding[] {
  const out: Finding[] = [];
  if (!rows.length) return out;
  /* Which angle sells, per post rather than in total, or the most used would win. */
  const byAngle: Record<string, { n: number; leads: number; clicks: number }> = {};
  rows.forEach((r) => { if (!r.angle) return; const a = byAngle[r.angle] || (byAngle[r.angle] = { n: 0, leads: 0, clicks: 0 }); a.n++; a.leads += r.leads; a.clicks += r.clicks; });
  const angles = Object.keys(byAngle).filter((k) => byAngle[k].n >= 2).map((k) => ({ k, per: byAngle[k].leads / byAngle[k].n, n: byAngle[k].n })).sort((x, y) => y.per - x.per);
  if (angles.length >= 2 && angles[0].per > 0 && angles[0].per >= angles[angles.length - 1].per * 2) {
    const best = angles[0], worst = angles[angles.length - 1];
    out.push({ tone: "good", text: <>{"Posts about "}<b>{ANGLE_WORDS[best.k] || best.k}</b>{" bring the most enquiries — " + best.per.toFixed(1) + " per post against " + worst.per.toFixed(1) + " for " + (ANGLE_WORDS[worst.k] || worst.k) + "."}</>,
      note: "Based on " + best.n + " and " + byAngle[worst.k].n + " posts." });
  }
  /* Which channel pays. */
  const byCh: Record<string, { n: number; leads: number; clicks: number }> = {};
  rows.forEach((r) => { const c = byCh[r.platform] || (byCh[r.platform] = { n: 0, leads: 0, clicks: 0 }); c.n++; c.leads += r.leads; c.clicks += r.clicks; });
  const chans = Object.keys(byCh).filter((k) => byCh[k].n >= 2).sort((x, y) => (byCh[y].leads - byCh[x].leads) || (byCh[y].clicks - byCh[x].clicks));
  if (chans.length >= 2 && (byCh[chans[0]].leads > 0 || byCh[chans[0]].clicks > 0)) {
    const top = chans[0], low = chans[chans.length - 1];
    out.push({ tone: "good", text: <><b>{CH_LABEL[top] || top}</b>{" is doing the work: " + byCh[top].leads + " " + (byCh[top].leads === 1 ? "enquiry" : "enquiries") + " and " + byCh[top].clicks + " taps from " + byCh[top].n + " posts, against " + byCh[low].leads + " from " + byCh[low].n + " on " + (CH_LABEL[low] || low) + "."}</>,
      note: "Every channel here is free, so this is only about where the effort goes." });
  }
  /* What is going stale: active listings only, since an archived home not being posted is correct. */
  if (data.length) {
    const last: Record<string, number> = {};
    rows.forEach((r) => { const t = r.when ? new Date(r.when).getTime() : 0; if (t > (last[r.propertyId] || 0)) last[r.propertyId] = t; });
    const cutoff = now - 14 * 86400000;
    const stale = data.filter((l) => l && l.id && l.is_active !== false && (last[l.id] || 0) < cutoff);
    if (stale.length) {
      const one = stale[0];
      out.push({ tone: "todo",
        text: stale.length === 1 ? <><b>{one.t || one.title || "One listing"}</b>{" has not been posted in over two weeks."}</>
          : <><b>{stale.length + " listings"}</b>{" have not been posted in over two weeks, starting with " + (one.t || one.title || "one of them") + "."}</>,
        note: "A listing nobody has seen recently cannot produce an enquiry.", act: { label: "Post it", id: one.id } });
    }
  }
  return out.slice(0, 3);
}

const Blank = ({ title, body, children }: { title: string; body: React.ReactNode; children?: React.ReactNode }) => (
  <div className="ov-blank">
    <span className="ov-blank-i has-icon" data-icon="chart" dangerouslySetInnerHTML={{ __html: svg("chart") }}></span>
    <b>{title}</b><p>{body}</p>{children}
  </div>
);

export function MkDigest() {
  const { rows, board, now } = useMk();
  if (!board.loaded || !now) return <div id="mkDigest"></div>;
  const f = findings(rows, listings(), now);
  if (!f.length) {
    /* Says how much more is needed rather than showing an empty chart. */
    const n = rows.length;
    return <div id="mkDigest"><div className="mkdg mkdg-quiet">{n
      ? "Nothing conclusive yet from " + n + " published " + (n === 1 ? "post" : "posts") + ". A few more and this will tell you which subjects and which channels are earning enquiries."
      : "Once listings start going out, what worked appears here — in a sentence, not a spreadsheet."}</div></div>;
  }
  return (
    <div id="mkDigest"><div className="mkdg">
      {f.map((x, i) => (
        <div className={"mkdg-i " + x.tone} key={i}>
          <div className="mkdg-t">{x.text}</div>
          {x.note ? <div className="mkdg-n">{x.note}</div> : null}
          {/* Straight into the composer for that listing: a finding that only tells you something is a report again. */}
          {x.act ? <button className="cmp-ch-btn" data-dg-post={x.act.id} onClick={() => W().openComposer?.(x.act!.id)}>{x.act.label}</button> : null}
        </div>
      ))}
    </div></div>
  );
}

function Thumb({ url }: { url: string }) {
  const [bad, setBad] = useState(false);
  const u = typeof url === "string" ? url.trim() : "";
  return <div className={"lph lph-sm" + (bad ? " no-photo" : "")}>{u && !bad ? <img src={u} alt="" loading="lazy" onError={() => setBad(true)} /> : null}</div>;
}
const rankColor = (i: number) => (i === 0 ? "#C9A227" : i === 1 ? "#9AA0A6" : i === 2 ? "#B08D57" : "var(--ink-dim)");

export function MkBoard() {
  const { rows, board, sort, view } = useMk();
  usePageScripts();
  const style = { display: view === "board" ? "block" : "none" };
  /* Sorted by enquiries by default: a tap is interest and an enquiry is a person. Each breaks the other's ties. */
  const list = rows.slice().sort((x, y) => (sort === "leads" ? (y.leads - x.leads) || (y.clicks - x.clicks) : (y.clicks - x.clicks) || (y.leads - x.leads)));
  if (!list.length) {
    return (
      <div id="mkBoard" style={style}>
        <Blank title={board.error ? "Could not load your posts" : !board.loaded ? "Counting…" : "Nothing has gone out yet"}
          body={board.error ? board.error : "Once a listing is published to a channel it appears here, ranked by the enquiries and taps it actually earned."} />
      </div>
    );
  }
  const data = listings();
  return (
    <div id="mkBoard" style={style}>
      {list.map((r, i) => {
        const L = data.find((l) => l.id === r.propertyId);
        const title = L ? (L.t || L.title || "This listing") : "This listing";
        /* TOP ONLY WHEN IT EARNED IT: no winner's rosette on a row of zeros. */
        const win = i === 0 && (r.leads > 0 || r.clicks > 0);
        const ch = CHS()[r.platform];
        return (
          <div className={"lbrow " + (win ? "win" : "")} key={r.id}>
            {win ? <span className="lbribbon">{"✦ Best so far"}</span> : null}
            <span className="lbrank" style={{ color: rankColor(i) }}>{i + 1}</span>
            <div className="lbthumb"><Thumb url={L ? L.img : ""} /></div>
            <div className="lbmid">
              <div className="lbhl">{title}</div>
              <div className="lbsub">
                {ch ? <span className="chn" style={{ background: ch.color }} title={"Attributed to " + ch.label} dangerouslySetInnerHTML={{ __html: W().SynChMark ? W().SynChMark(r.platform, 12) : "" }}></span> : null}
                <span className="lbcamp">{r.when ? fmtWhen(r.when) : ""}</span>
              </div>
            </div>
            <div className="lbperf"><div className="lbctr"><b>{r.clicks}</b> taps</div><div className="lbctr" style={{ color: "var(--ink-dim)" }}><b>{r.visits}</b> opened</div></div>
            <div className="lbleads"><b>{r.leads}</b><span>{r.leads === 1 ? "enquiry" : "enquiries"}</span></div>
          </div>
        );
      })}
    </div>
  );
}

const Cell = ({ n, label }: { n: number; label: string }) => <span><b>{n}</b>{" " + label}</span>;
/* WHAT IS COUNTED, AND NOTHING ELSE: no impressions and no reach, which nobody measures for us. A campaign with no posts gets a
   sentence, not five zeros. */
function Perf({ id }: { id: string }) {
  const { perf } = useMk();
  const p = perf && perf[id];
  if (!p) return <div className="cperf cperf-none">{"Counting…"}</div>;
  if (!p.posts) return <div className="cperf cperf-none">{"No posts in this campaign yet — schedule one and pick this campaign to start measuring it."}</div>;
  return (
    <div className="cperf">
      <Cell n={p.published} label={p.published === 1 ? "post live" : "posts live"} />
      <Cell n={p.clicks} label="taps" />
      <Cell n={p.visits} label="opened the listing" />
      <Cell n={p.leads} label={p.leads === 1 ? "enquiry" : "enquiries"} />
      {p.posts > p.published ? <span className="cperf-q">{(p.posts - p.published) + " still to go out"}</span> : null}
    </div>
  );
}

/* Optimistic, then reverted if the database refuses. A plain agent can read campaigns but not change them, and RLS refuses by
   returning no rows, so setCampaignStatus turns that silence into an error rather than show a paused campaign still running. */
function toggle(c: Camp) {
  const was = c.live;
  const flip = (live: boolean) => set({ camps: state.camps.map((x) => (x.id === c.id ? { ...x, live } : x)) });
  flip(!was);
  W().SynListings.setCampaignStatus(c.id, !was)
    .then(() => toast(!was ? "Campaign resumed" : "Campaign paused"))
    .catch((err: any) => { flip(was); toast((err && err.message) || "Could not change that campaign"); console.error("setCampaignStatus failed", err); });
}

export function MkCampaigns() {
  const { camps, mk, view } = useMk();
  usePageScripts();
  const style = { display: view === "campaigns" ? "block" : "none" };
  if (!camps.length) {
    return (
      <div id="campaigns" style={style}>
        <Blank title={mk.error ? "Could not load your campaigns" : !mk.loaded ? "Loading your campaigns…" : "No campaigns yet"}
          body={mk.error ? mk.error : !mk.loaded ? "One moment." : "Build one from a listing and Synapse writes the first three creatives, then scales whichever earns the clicks."}>
          {mk.loaded && !mk.error ? <button className="btn btn-primary" type="button" data-mk-new="" onClick={openCampaignForm}>+ New campaign</button> : null}
        </Blank>
      </div>
    );
  }
  return (
    <div id="campaigns" style={style}>
      {camps.map((c) => (
        <div className="card campaign" key={c.id}>
          <div className="chd">
            <span className="nm">{c.nm}</span>
            <span className={"bdg " + (c.live ? "live" : "paused")}>{c.live ? "● Live" : "Paused"}</span>
            <span className="spend">{c.until ? "Runs to " + new Date(c.until + "T00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : ""}</span>
          </div>
          <Perf id={c.id} />
          <div className="cft"><button className="tgl" data-tgl={c.id} onClick={() => toggle(c)}>{c.live ? "Pause campaign" : "Resume campaign"}</button></div>
        </div>
      ))}
    </div>
  );
}

/* The sort, in the pane's filter row. Taps, not CTR: a rate needs impressions and nobody reports them to us. */
export function MkSort() {
  const { sort, view, sorted } = useMk();
  const ready = usePageScripts();
  const icon = sorted ? "sort" : "sliders";
  return (
    <button className="tbtn" id="mkSort" style={view === "board" ? undefined : { display: "none" }} onClick={() => set({ sort: sort === "leads" ? "clicks" : "leads", sorted: true })}>
      <span data-icon={icon} className="has-icon" dangerouslySetInnerHTML={{ __html: ready ? svg(icon) : "" }}></span>
      {" Sort: " + (sort === "leads" ? "Enquiries" : "Taps")}
    </button>
  );
}

function CampaignForm({ end }: { end: string }) {
  const name = useRef<HTMLInputElement>(null), endRef = useRef<HTMLInputElement>(null), box = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const data = listings();
  const save = () => {
    const nm = (name.current?.value || "").trim();
    if (!nm) { toast("Name the campaign first"); return; }
    const chans = [...(box.current?.querySelectorAll<HTMLInputElement>("input:checked") || [])].map((x) => x.value);
    if (!chans.length) { toast("Pick at least one channel"); return; }
    setSaving(true);
    /* NO CREATIVES: a campaign starts empty and fills up when posts are scheduled into it. */
    W().SynListings.createCampaign({ name: nm, endDate: endRef.current?.value || null, channels: chans }).then(() => {
      W().closeLead();
      toast("“" + nm + "” is ready — pick it when you schedule a post");
      return loadCampaigns();
    }).catch((err: any) => {
      setSaving(false);
      toast((err && err.message) || "Could not launch that campaign");
      console.error("createCampaign failed", err);
    });
  };
  return (
    <>
      <div style={{ fontSize: "19px", fontWeight: 700 }}>New campaign</div>
      <p className="muted" style={{ fontSize: "12px", margin: "6px 0 18px" }}>Pick a listing and an audience, the AI generates the first three ad creatives and starts learning.</p>
      <div className="lf">
        <div className="field"><label>Campaign name</label><input id="cfN" ref={name} placeholder="e.g. Ikoyi penthouse push" /></div>
        <div className="field"><label>Listing</label>
          <select id="cfL">{data.map((l, k) => <option key={k} value={k}>{l.t + " · " + W().SynNaira(l.price)}</option>)}</select></div>
        {/* Dates, not a budget: Synapse does not buy advertising, and a campaign genuinely has a run. */}
        <div className="field"><label>Run until</label>
          <input id="cfEnd" type="date" ref={endRef} defaultValue={end} />
          <div className="lf-hint">Starts today. The creatives stay in the pipeline after this date, nothing is deleted.</div>
        </div>
        <div className="field"><label>Channels</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} id="cfC" ref={box}>
            {["instagram", "facebook", "tiktok", "whatsapp"].map((ch) => (
              <label key={ch} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", border: "1px solid var(--border)", borderRadius: "100px", padding: "7px 13px", cursor: "pointer", textTransform: "none", letterSpacing: 0, color: "var(--ink)" }}>
                <input type="checkbox" value={ch} defaultChecked={ch === "instagram"} style={{ accentColor: "#121212" }} />{(CHS()[ch] || { label: ch }).label}
              </label>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-block" id="cfSave" style={{ marginTop: "6px" }} disabled={saving} onClick={save}>{saving ? "Launching…" : "✦ Generate creatives & launch"}</button>
      </div>
    </>
  );
}
function openCampaignForm() {
  /* A month out, which is what the code silently assumed before dates were asked for. */
  const d = new Date(); d.setDate(d.getDate() + 30);
  const end = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  showDrawer(<CampaignForm end={end} />);
}

/* Loads the pane once the page scripts are in, and keeps the rest of the portal told: the scheduler's Campaign picker reads
   window.SynCampaigns(), and mkStats() redraws the Ask-Tayo tiles. Rendered once, inside the pane. */
export function MarketingHost() {
  const ready = usePageScripts();
  const { camps, perf } = useMk();
  useEffect(() => {
    if (!ready) return;
    importLegacy().then(loadCampaigns);
    loadBoard();
    const listingsChanged = () => set({ tick: state.tick + 1, now: Date.now() });
    document.addEventListener("syn:listings", listingsChanged);
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.("#newCampBtn")) { openCampaignForm(); return; }
      const b = t.closest?.("#mkView [data-mv]") as HTMLElement | null; if (!b) return;
      document.querySelectorAll("#mkView .seg-b").forEach((x) => x.classList.toggle("on", x === b));
      set({ view: b.dataset.mv === "board" ? "board" : "campaigns" });
    };
    document.addEventListener("click", click);
    return () => { document.removeEventListener("syn:listings", listingsChanged); document.removeEventListener("click", click); };
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    W().SynCampaigns = () => state.camps;
    W().mkStats?.();
    if (camps.length && !perf) loadPerformance();
  }, [ready, camps, perf]);
  return null;
}
