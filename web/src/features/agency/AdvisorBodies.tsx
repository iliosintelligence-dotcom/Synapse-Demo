"use client";
/**
 * What the Ask-Tayo panel says on each pane, as React (was PANEL, STATS and the chart strings in src/legacy/agency/inline-3.js,
 * and renderBrk, renderBento and renderInsights in portalData.ts). Every number is counted from what the portal has loaded:
 * the leads (window.SynLeads), the listings (SynListingsData, freshness), the campaigns (SynCampaigns), the posts (SynPosts),
 * the roster (SynRoster) and the social accounts (SocialChannels' store).
 *
 * The snapshot tiles are counted on every render now. Overview's and the CRM's were counted once, when the page script ran and
 * before the leads had loaded, so they read 0 whatever the agency had.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CONNECTABLE, connectedTo, expired, useChannels } from "./SocialChannels";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const arr = (f: string): any[] => { try { const v = W()[f]?.(); return Array.isArray(v) ? v : []; } catch { return []; } };
const leadsNow = () => arr("SynLeads");
const listingsNow = () => arr("SynListingsData");
const first = (n: unknown) => String(n || "").split(" ")[0];
const fmtB = (n: number) => n >= 1e9 ? "₦" + (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? "₦" + Math.round(n / 1e6) + "M" : "₦" + n.toLocaleString();
const html = (h: string) => ({ __html: h });

/* Re-draws whenever one of these events fires, without remounting (a remount would replay the reach count-up). */
function useTick(events: [EventTarget, string][]) {
  const [, set] = useState(0);
  useEffect(() => {
    const bump = () => set((n) => n + 1);
    events.forEach(([t, e]) => t.addEventListener(e, bump));
    return () => events.forEach(([t, e]) => t.removeEventListener(e, bump));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ── chart pieces: one brand hue on a muted track; labels wear ink ── */
const C_BRAND = "#121212", C_TRACK = "rgba(0,0,0,0.06)";
export function Ring({ pct, label, size = 54, sw = 6, fs = 12.5 }: { pct: number; label?: string; size?: number; sw?: number; fs?: number }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C_TRACK} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C_BRAND} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dy="0.36em" textAnchor="middle" fontFamily="Lato,system-ui,sans-serif" fontSize={fs} fontWeight="700" fill="#15171a">
        {label != null ? label : Math.round(pct) + "%"}
      </text>
    </svg>
  );
}
function HBars({ rows, unit = "" }: { rows: [string, number][]; unit?: string }) {
  const max = Math.max(...rows.map((r) => r[1]));
  return <>{rows.map((r, i) => (
    <div key={i} className="hrow" title={`${r[0]}: ${r[1]}${unit}`}>
      <span className="hlb">{r[0]}</span><span className="htrack"><i style={{ width: (max ? r[1] / max * 100 : 0) + "%" }}></i></span><span className="hn">{r[1]}{unit}</span>
    </div>
  ))}</>;
}
const Tile = ({ v, l }: { v: ReactNode; l: string }) => <div className="card stat"><div className="v">{v}</div><div className="l">{l}</div></div>;
const Sec = ({ k, kid, children }: { k: ReactNode; kid?: string; children: ReactNode }) => (
  <div className="tp-sec"><div className="tp-k" id={kid}>{k}</div>{children}</div>
);
const Summary = ({ k, lines, reco }: { k: string; lines: string[]; reco?: string }) => (
  <Sec k={k}>
    {lines.map((l, i) => <div key={i} className="tp-line"><span className="d">{"→"}</span><span>{l}</span></div>)}
    {reco ? <div className="tp-reco"><b>{"Tayo’s fix:"}</b> {reco}</div> : null}
  </Sec>
);
const Muted = ({ children }: { children: ReactNode }) => <p className="muted" style={{ fontSize: "13px", margin: 0 }}>{children}</p>;

/* ── the snapshot: the pane's headline numbers ── */
function Snapshot({ pane }: { pane: string }) {
  useTick([[window, "syn:crm"], [document, "syn:listings"]]);
  const leads = leadsNow();
  const won = leads.filter((l) => l.stage === "Won");
  const sales = won.reduce((s, l) => s + (Number(String(l.price || "").replace(/[^\d.]/g, "")) || 0), 0);
  let tiles: ReactNode = null;
  if (pane === "overview") {
    tiles = <>
      <Tile v={leads.filter((l) => l.stage !== "Won").length} l="Active leads" />
      <Tile v={leads.filter((l) => l.stage === "Viewing").length} l="Viewings booked" />
      <Tile v={won.length} l="Won this quarter" />
      <Tile v={fmtB(sales)} l="Sales value" />
    </>;
  } else if (pane === "crm") {
    const conv = leads.length ? Math.round((won.length / leads.length) * 100) : 0;
    tiles = <>
      <Tile v={leads.length} l="Leads" />
      <Tile v={leads.filter((l) => l.stage === "Viewing").length} l="Viewings" />
      <div className="card stat"><div className="l" style={{ marginBottom: "6px" }}>Conversion</div><div className="ringwrap"><Ring pct={conv} label={conv + "%"} /></div></div>
      <Tile v={fmtB(sales)} l="Sales" />
    </>;
  } else if (pane === "listings") {
    const L = listingsNow();
    const fresh = (l: any) => { try { return W().freshness(l); } catch { return {}; } };
    tiles = <>
      <Tile v={L.length} l="Total" />
      <Tile v={L.filter((l) => l.st === "verified").length} l="Verified" />
      <Tile v={L.filter((l) => l.st === "pending").length} l="Pending" />
      <Tile v={L.filter((l) => fresh(l).expired).length} l="Expired, re-list" />
    </>;
  } else if (pane === "marketing") {
    const live = arr("SynCampaigns").filter((c) => c.live).length;
    const marketable = listingsNow().filter((l) => l.is_active !== false && l.status === "live").length;
    tiles = <>
      <Tile v={live} l="Active campaigns" />
      <Tile v={marketable} l={marketable === 1 ? "Listing you can market" : "Listings you can market"} />
    </>;
  }
  if (!tiles) return null;
  return <Sec k="Snapshot"><div className="tp-stats">{tiles}</div></Sec>;
}

/* ── CRM: where the leads come from (last-touch channel) ── */
function LeadSources() {
  useTick([[window, "syn:crm"]]);
  const leads = leadsNow();
  const CH = W().SynCH || {};
  const mark = (c: string, px: number) => (W().SynChMark ? W().SynChMark(c, px) : "");
  if (!leads.length) return <div className="card brk" id="brk"><Muted>No leads yet, attribution fills in once one arrives.</Muted></div>;
  const counts: Record<string, number> = {};
  leads.forEach((l) => { const c = l.attr && l.attr.channel; counts[c] = (counts[c] || 0) + 1; });
  const order = Object.keys(CH).filter((c) => counts[c]).sort((a, b) => counts[b] - counts[a]);
  return (
    <div className="card brk" id="brk">
      <div className="hd"><span className="l">Where your leads come from</span><span className="l" style={{ letterSpacing: 0 }}>{leads.length} leads attributed</span></div>
      <div className="chips">{order.map((c) => (
        <span key={c} className="c2"><span className="chn" style={{ background: CH[c].color }} title={"Attributed to " + CH[c].label} dangerouslySetInnerHTML={html(mark(c, 12))}></span> {CH[c].label} <b>{counts[c]}</b></span>
      ))}</div>
      <div className="barline">{order.map((c) => (
        <span key={c} style={{ background: CH[c].color, width: counts[c] / leads.length * 100 + "%" }} title={CH[c].label + ": " + counts[c]}></span>
      ))}</div>
    </div>
  );
}

/* ── Marketing: which channel actually produced the leads, from lead_attribution. Nothing estimated: empty until there are
   leads to count. RLS scopes lead_channel_mix() to the caller's own agency. ── */
type Insight = { pct: string; ch: string; n: number; total: number };
function Insights() {
  const [rows, setRows] = useState<Insight[]>([]);
  useEffect(() => {
    let live = true;
    if (!W().SynAuth || !W().SynAuth.client) return;
    W().SynAuth.client()
      .then((c: any) => c.rpc("lead_channel_mix"))
      .then((r: any) => {
        const data: any[] = (r && r.data) || [];
        const total = data.reduce((n, x) => n + Number(x.leads || 0), 0);
        if (live) setRows(!total ? [] : data.slice(0, 3).map((x) => {
          const n = Number(x.leads || 0);
          return { pct: Math.round((n / total) * 100) + "%", ch: String(x.channel).replace(/_/g, " "), n, total };
        }));
      })
      .catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, []);
  return (
    <div id="insights">
      {!rows.length
        ? <div className="insight insight-empty"><span className="tx">Once leads arrive we will show which channel actually produced them. Nothing here is estimated, so it stays empty until there is something to count.</span></div>
        : rows.map((i, k) => (
          <div key={k} className="insight"><span className="pct">{i.pct}</span>
            <span className="tx"><b>{i.ch}</b>{" brought " + i.n + " of your " + i.total + " attributed lead" + (i.total === 1 ? "" : "s") + "."}</span></div>
        ))}
    </div>
  );
}

/* ── Social: where it posts, and this week. The channel list was five fixed cards ("Not connected", a made-up WhatsApp
   number) with toggles that only changed the count beside them; it shows the agency's real connections now. ── */
function WherePosts() {
  useChannels();
  const CH = W().SynCH || {};
  const mark = (c: string, px: number) => (W().SynChMark ? W().SynChMark(c, px) : "");
  return (
    <div className="channels" id="socialChannels">
      {Object.keys(CONNECTABLE).map((pl) => {
        const a = connectedTo(pl), dead = expired(a);
        const st = !a ? "Not connected" : dead ? "Session expired" : (a.platform_username ? "@" + String(a.platform_username).replace(/^@/, "") : "Connected");
        return (
          <div key={pl} className="card chan">
            <div className="ic" style={{ background: (CH[pl] && CH[pl].color) || "#161616" }} dangerouslySetInnerHTML={html(mark(pl, 14))}></div>
            <div><div className="nm">{CONNECTABLE[pl]}</div><div className="st">{st}</div></div>
            <div className={"tog" + (a && !dead ? "" : " off")} aria-hidden="true"></div>
          </div>
        );
      })}
    </div>
  );
}
function Bento() {
  useTick([[window, "syn:pipeline"], [window, "syn:posts-moved"]]);
  useChannels();
  const posts = arr("SynPosts");
  const CH = W().SynCH || {};
  const mark = (c: string, px: number) => (W().SynChMark ? W().SynChMark(c, px) : "");
  const reachRef = useRef<HTMLDivElement>(null);
  const reach = posts.filter((p) => p.stage === "published").reduce((s, p) => s + (p.reach || 0), 0);
  const approvals = posts.filter((p) => p.stage === "approval").length;
  const chs = Object.keys(CONNECTABLE).map((c) => { const a = connectedTo(c); return { c, on: !!a && !expired(a) }; });
  const conn = chs.filter((s) => s.on).length;
  const ti = (new Date().getDay() + 6) % 7, days = ["M", "T", "W", "T", "F", "S", "S"];
  const perDay = [0, 0, 0, 0, 0, 0, 0];
  const week: string[] = [];
  for (let i = 0; i < 7; i++) { const dt = new Date(); dt.setDate(dt.getDate() - ti + i); week.push(dt.toDateString()); }
  posts.forEach((p) => {
    const iso = p.publishedAt || p.scheduledAt; if (!iso) return;
    const d = new Date(iso); if (isNaN(d.getTime())) return;
    const di = week.indexOf(d.toDateString()); if (di > -1) perDay[di]++;
  });
  const fmt = (n: number) => (W().fmt ? W().fmt(n) : String(n));
  useEffect(() => { if (reachRef.current && W().countUp) W().countUp(reachRef.current, reach); }, [reach]);
  const jump = () => {
    document.querySelector<HTMLElement>('#socialView [data-sv="pipeline"]')?.click();
    const calm = W().sReduce ? W().sReduce() : false;
    document.getElementById("pipeline")?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "nearest" });
  };
  return (
    <div className="s-bento" id="socialBento">
      <button className="s-tile" aria-label={`Reach this week ${fmt(reach)} across connected channels`}>
        <div className="k">Reach this week</div><div className="v" ref={reachRef}>0</div><div className="cap">across connected channels</div>
        <div className="cbar"><i style={{ width: Math.min(100, reach / 80000 * 100) + "%" }}></i></div>
      </button>
      <div className="s-tile"><div className="k">Connected channels</div>
        <div className="v">{conn}<span style={{ fontSize: "18px", color: "var(--ink-dim)" }}>/{chs.length}</span></div>
        <div className="chdots">{chs.map((s) => (
          <span key={s.c} className={"cd " + (s.on ? "" : "off")} style={{ background: (CH[s.c] && CH[s.c].color) || "#161616" }} dangerouslySetInnerHTML={html(mark(s.c, 10))}></span>
        ))}</div>
      </div>
      <div className="s-tile"><div className="k">This week</div><div className="s-mini">{days.map((d, i) => (
        <div key={i} className={"d " + (i === ti ? "today" : "")}><div className="lbl">{d}</div>
          <div className="cell">{Array.from({ length: Math.min(3, perDay[i]) }, (_, k) => <span key={k} className="pd"></span>)}</div></div>
      ))}</div></div>
      <button className="s-tile" data-sv-jump="approval" aria-label={`${approvals} drafts to review`} onClick={jump}>
        <div className="k">Drafts</div><div className="v">{approvals}</div>
        {approvals ? <span className="rvw">Review now</span> : <div className="cap">{"all caught up ✦"}</div>}
      </button>
    </div>
  );
}

/* ── Agents: the floor, drawn from the same roster the Agents pane shows. Career totals, not "this quarter": closed_deals is a
   lifetime count on the profile. Response rate is a real column; average first reply in minutes is recorded nowhere. ── */
function TeamRead() {
  useTick([[window, "syn:roster-changed"]]);
  const real = arr("SynRoster");
  const rated = real.filter((a) => a.rating != null);
  const withRate = real.filter((a) => a.responseRate != null);
  const have = real.filter((a) => a.closed != null);
  const kpis: [string, ReactNode][] = [
    ["Agents", real.length],
    ["Active leads", real.reduce((s, a) => s + (a.active || 0), 0)],
    ["Closed · career", real.reduce((s, a) => s + (a.closed || 0), 0) || "-"],
    ["Avg rating", rated.length ? (rated.reduce((s, a) => s + a.rating, 0) / rated.length).toFixed(1) : "-"],
  ];
  const blank = <Muted>No agents yet.</Muted>, none = <Muted>Not recorded for anyone on this team yet.</Muted>;
  return <>
    <Sec k="The floor"><div className="ag-kpis" id="agKpis">{kpis.map((k) => <div key={k[0]} className="ag-kpi"><div className="l">{k[0]}</div><div className="v">{k[1]}</div></div>)}</div></Sec>
    <Sec k="Closed deals · career"><div className="hbars" id="agClosed">
      {!real.length ? blank : have.length ? <HBars rows={have.map((a) => [first(a.nm), a.closed])} /> : none}
    </div></Sec>
    <Sec k="Response rate" kid="agReplyLbl"><div className="hbars" id="agReply">
      {!real.length ? blank : withRate.length ? <HBars rows={withRate.map((a) => [first(a.nm), a.responseRate])} unit="%" /> : none}
    </div></Sec>
  </>;
}

/* ── each pane's title, sub and body ── */
const PANEL: Record<string, { title: string; sub: string; body: () => ReactNode }> = {
  /* No canned body: the snapshot is real, and anything else worth saying is a live answer in the composer below. */
  overview: { title: "Business advisor", sub: "Your numbers, and what to do next", body: () => null },
  negotiator: { title: "How Tayo negotiates", sub: "The funnel, the rules, the 5 stages", body: () => <>
    <Sec k="The rule">
      <div className="rule" style={{ margin: 0 }}><span className="ic">{"⚖️"}</span><div className="t"><b>Tayo advises within the range you authorise, it never makes a binding commitment.</b> It can discuss flexibility inside your pre-set floor, but only you close. Every agreement stays legally yours.</div></div>
    </Sec>
    <Sec k="Where a lead comes from, and what happens to it">
      <ol className="fnl">
        <li><span className="fnl-k">They start anywhere</span>
          <span className="fnl-v">Instagram, WhatsApp, TikTok, Facebook, YouTube, the Synapse app, or walking past the building.</span></li>
        <li className="is-tayo"><span className="fnl-k">Tayo picks it up</span>
          <span className="fnl-v">Qualifies the budget, presents the fit, handles the objections, and negotiates only inside the range you set.</span></li>
        <li className="is-out"><span className="fnl-k">You get a warm one</span>
          <span className="fnl-v">The conversation arrives with it, what they want, what they can pay, what they already asked.</span></li>
      </ol>
    </Sec>
    <Sec k="The five stages">
      <div className="stepper" style={{ margin: 0 }}>
        <span className="step5"><b>1</b> Qualify</span><span className="step5"><b>2</b> Present</span><span className="step5"><b>3</b> Handle objections</span><span className="step5"><b>4</b> Negotiate · your range</span><span className="step5"><b>5</b> Handoff</span>
      </div>
    </Sec>
  </> },
  marketing: { title: "Creative insights", sub: "What the AI learned from your ads", body: () => <Sec k={"✦ What’s working"}><Insights /></Sec> },
  crm: { title: "Pipeline read", sub: "Tayo’s take on your leads", body: () => <>
    <Summary k="Where your attention pays off" lines={[
      "Tayo ranks your leads by intent, deal value and how close the SLA is.",
      "No leads yet, this fills in the moment a buyer reaches you.",
    ]} reco="Connect a channel or share a listing, and the first real lead lands here." />
    <Sec k="Where your leads come from"><LeadSources /></Sec>
  </> },
  brand: { title: "Your brand", sub: "What signs off every post and page", body: () => <Summary k="What this pane decides" lines={[
    "The name, logo, colour and voice Synapse writes and publishes as.",
    "Anything blank here shows up as a gap on your public page and in every generated post.",
  ]} reco="Ask below what is still missing from your setup." /> },
  tours: { title: "Viewings", sub: "Who is coming, and when", body: () => <Summary k="What this pane decides" lines={[
    "The availability you publish, the slots buyers book, and who has confirmed.",
    "A booking nobody has reconfirmed is not a body at the door yet.",
  ]} reco="Ask below which viewings still need chasing." /> },
  verification: { title: "Verification", sub: "What is on file, and what is outstanding", body: () => <Summary k="What this pane decides" lines={[
    "The documents Nigeria requires of an agency: CAC, SCUML, a state licence, a director’s ID.",
    "Verified means specific checks passed on a date. It is never something an agency sets for itself.",
  ]} reco="Ask below what you still need to send." /> },
  listings: { title: "Inventory read", sub: "Freshness & what to re-list", body: () => <Summary k="Keep your listings live" lines={[
    "A listing expires after it was last confirmed: rentals in 21 days, short-lets in a week, sales in 3 months.",
    "Tayo flags what has expired and what is about to, per listing.",
  ]} reco="The notification bell carries the same warnings, and takes you straight to the listing." /> },
  social: { title: "Content coach", sub: "What to post next", body: () => <>
    <Summary k="Move the needle" lines={[
      "Tayo compares reach, DMs and leads per format and channel.",
      "Nothing has been published yet, so there is no performance to read.",
    ]} reco="Generate a campaign from one of your listings and publish it, the first numbers land here." />
    <Sec k="Where it posts"><WherePosts /></Sec>
    <Sec k="This week"><Bento /></Sec>
  </> },
  agents: { title: "Team read", sub: "Coaching for your agents", body: () => <>
    <Summary k="Coach the floor" lines={[
      "Tayo reads first-reply times, win rates and stalled leads per agent.",
      "Coaching notes appear once your team has real activity to read.",
    ]} reco="Invite your agents and route some leads, the read below is built from their actual numbers." />
    <TeamRead />
  </> },
  /* What a plan includes is a fact; what it would earn this agency is not, so it says only the first. */
  subscription: { title: "Plan advisor", sub: "Is your plan earning its keep?", body: () => <Summary k="What each plan includes" lines={[
    "Free: list, generate campaigns, and rehearse them.",
    "Accelerate: publish for real to your connected channels.",
    "Leader: unlimited listings and syndication.",
  ]} reco="Ask below what your own numbers would look like on another plan, the answer uses your listings and leads, not an example." /> },
};

export const advisorHead = (pane: string) => { const p = PANEL[pane] || PANEL.overview; return { title: p.title, sub: p.sub }; };
export function AdvisorBody({ pane }: { pane: string }) {
  const p = PANEL[pane] ? pane : "overview";
  return <><Snapshot pane={p} />{PANEL[p].body()}</>;
}
