"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CHANNEL_LABEL, createCampaign, digestFindings, fetchCampaignPerf, fetchCampaigns, fetchListingRefs, fetchPostRows, setCampaignLive, sortRows,
  type Campaign, type CampPerf, type ListingRef, type PostRow,
} from "../data/marketing";
import { useToast } from "../ui/Toast";
import s from "./Marketing.module.css";

const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);
const RANK = ["#C9A227", "#9AA0A6", "#B08D57"];
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const CHANNELS = ["instagram", "facebook", "tiktok", "whatsapp"];

/** What each listing earned once it went out: taps, listings opened, enquiries. Counted from your own links, not estimated. */
export function MarketingPane() {
  const toast = useToast();
  const [view, setView] = useState<"board" | "campaigns">("board");
  const [sort, setSort] = useState<"leads" | "clicks">("leads");
  const [rows, setRows] = useState<PostRow[] | null>(null);
  const [listings, setListings] = useState<ListingRef[]>([]);
  const [camps, setCamps] = useState<Campaign[] | null>(null);
  const [perf, setPerf] = useState<Record<string, CampPerf>>({});
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, l, c] = await Promise.all([fetchPostRows(), fetchListingRefs().catch(() => []), fetchCampaigns()]);
      setRows(r); setListings(l); setCamps(c); setError("");
      fetchCampaignPerf().then(setPerf).catch(() => {}); // a failed rollup must not empty a page that has real content
    } catch (e) { setError(reason(e, "please refresh")); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const titleOf = useMemo(() => Object.fromEntries(listings.map((l) => [l.id, l.title])), [listings]);
  const ranked = useMemo(() => sortRows(rows ?? [], sort), [rows, sort]);
  const findings = useMemo(() => digestFindings(rows ?? [], listings), [rows, listings]);

  const toggle = async (c: Campaign) => {
    setCamps((v) => (v ?? []).map((x) => (x.id === c.id ? { ...x, live: !c.live } : x)));
    try { await setCampaignLive(c.id, !c.live); toast(c.live ? "Campaign paused" : "Campaign resumed"); }
    catch (e) { setCamps((v) => (v ?? []).map((x) => (x.id === c.id ? { ...x, live: c.live } : x))); toast(reason(e, "Could not change that campaign"), "error"); }
  };

  if (error) return <div className={s.blank}><b>Could not load your posts</b><p className={s.muted}>{error}</p><button type="button" className={s.primary} onClick={() => void load()}>Try again</button></div>;
  if (!rows || !camps) return <p className={s.muted} aria-busy="true">Counting…</p>;

  return (
    <>
      <div className={s.bar}>
        <div className={s.seg} role="group" aria-label="View">
          <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")}>Leaderboard</button>
          <button type="button" aria-pressed={view === "campaigns"} onClick={() => setView("campaigns")}>Campaigns</button>
        </div>
        <div className={s.rowb}>
          {view === "board" && <button type="button" className={s.ghost} onClick={() => setSort(sort === "leads" ? "clicks" : "leads")}>Sort: {sort === "leads" ? "Enquiries" : "Taps"}</button>}
          <button type="button" className={s.primary} onClick={() => setCreating(true)}>+ New campaign</button>
        </div>
      </div>

      {view === "board" && (
        <>
          {findings.length ? (
            <div className={s.digest}>
              {findings.map((f) => (
                <div key={f.text} className={`${s.finding} ${f.tone === "good" ? s.good : s.todo}`}>
                  <div>{f.text}</div><div className={s.fnote}>{f.note}</div>
                  {f.listingId && <div><a className={s.ghost} href="/app/agency.html#social">Post it</a></div>}
                </div>
              ))}
            </div>
          ) : (
            <div className={s.quiet}>{rows.length ? `Nothing conclusive yet from ${rows.length} published ${rows.length === 1 ? "post" : "posts"}. A few more and this will tell you which subjects and which channels are earning enquiries.` : "Once listings start going out, what worked appears here, in a sentence, not a spreadsheet."}</div>
          )}
          {!ranked.length ? (
            <div className={s.blank}><b>Nothing has gone out yet</b><p className={s.muted}>Once a listing is published to a channel it appears here, ranked by the enquiries and taps it actually earned.</p></div>
          ) : (
            <div className={s.list}>
              {ranked.map((r, i) => {
                const win = i === 0 && (r.leads > 0 || r.clicks > 0);
                return (
                  <div key={r.id} className={`${s.row} ${win ? s.win : ""}`}>
                    <span className={s.rank} style={{ color: RANK[i] }}>{i + 1}</span>
                    <div className={s.mid}>
                      {win && <div className={s.ribbon}>✦ Best so far</div>}
                      <div className={s.hl}>{titleOf[r.propertyId] ?? "This listing"}</div>
                      <div className={s.sub}>{CHANNEL_LABEL[r.platform] ?? r.platform}{r.when ? ` · ${when(r.when)}` : ""}</div>
                    </div>
                    <div className={s.perf}><div><b>{r.clicks}</b> taps</div><div><b>{r.visits}</b> opened</div></div>
                    <div className={s.leads}><b>{r.leads}</b><span>{r.leads === 1 ? "enquiry" : "enquiries"}</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "campaigns" && (
        !camps.length ? (
          <div className={s.blank}><b>No campaigns yet</b><p className={s.muted}>Start one, then pick it when you schedule a post to see what it earns.</p><button type="button" className={s.primary} onClick={() => setCreating(true)}>+ New campaign</button></div>
        ) : (
          <div className={s.list}>
            {camps.map((c) => {
              const p = perf[c.id];
              return (
                <div key={c.id} className={s.camp}>
                  <div className={s.chd}>
                    <span className={s.nm}>{c.name}</span>
                    <span className={`${s.badge} ${c.live ? s.live : ""}`}>{c.live ? "● Live" : "Paused"}</span>
                    {c.until && <span className={s.sub}>Runs to {new Date(`${c.until}T00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>}
                  </div>
                  {!p ? <div className={s.cperf}>Counting…</div> : !p.posts ? <div className={s.cperf}>No posts in this campaign yet. Schedule one and pick this campaign to start measuring it.</div> : (
                    <div className={s.cperf}>
                      <span><b>{p.published}</b> {p.published === 1 ? "post live" : "posts live"}</span><span><b>{p.clicks}</b> taps</span>
                      <span><b>{p.visits}</b> opened the listing</span><span><b>{p.leads}</b> {p.leads === 1 ? "enquiry" : "enquiries"}</span>
                      {p.posts > p.published && <span>{p.posts - p.published} still to go out</span>}
                    </div>
                  )}
                  <div><button type="button" className={s.ghost} onClick={() => void toggle(c)}>{c.live ? "Pause campaign" : "Resume campaign"}</button></div>
                </div>
              );
            })}
          </div>
        )
      )}

      {creating && <CampaignDialog onClose={() => setCreating(false)} onDone={(name) => { setCreating(false); toast(`“${name}” is ready. Pick it when you schedule a post.`); setView("campaigns"); void load(); }} />}
    </>
  );
}

function defaultEnd() { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); }

function CampaignDialog({ onClose, onDone }: { onClose: () => void; onDone: (name: string) => void }) {
  const [name, setName] = useState("");
  const [end, setEnd] = useState(defaultEnd);
  const [chans, setChans] = useState<string[]>(["instagram"]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Name the campaign first."); return; }
    if (!chans.length) { setErr("Pick at least one channel."); return; }
    setBusy(true); setErr("");
    try { await createCampaign({ name: name.trim(), endDate: end || null, channels: chans }); onDone(name.trim()); } catch (x) { setErr(reason(x, "Could not create that campaign.")); setBusy(false); }
  };
  return (
    <div className={s.scrim} onClick={onClose}>
      <form className={s.dialog} role="dialog" aria-modal="true" aria-label="New campaign" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className={s.nm}>New campaign</h2>
        <label className={s.field}>Campaign name<input type="text" autoFocus placeholder="e.g. Ikoyi penthouse push" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className={s.field}>Run until<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <div className={s.field}>Channels
          <div className={s.chans}>{CHANNELS.map((c) => <label key={c}><input type="checkbox" checked={chans.includes(c)} onChange={(e) => setChans((v) => (e.target.checked ? [...v, c] : v.filter((x) => x !== c)))} />{CHANNEL_LABEL[c]}</label>)}</div>
        </div>
        {err && <div className={s.err} role="alert">{err}</div>}
        <div className={s.rowb}><button type="button" className={s.ghost} onClick={onClose}>Cancel</button><button type="submit" className={s.primary} disabled={busy}>{busy ? "Creating…" : "Create campaign"}</button></div>
      </form>
    </div>
  );
}
