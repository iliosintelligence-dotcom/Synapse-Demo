"use client";

import { useEffect, useMemo, useState } from "react";
import { loadBrand, type BrandRecord } from "../data/brand";
import {
  CHANNEL_ORDER, PLATFORMS, buildVariants, fetchCampaignListings, generate, listPast, saveGeneration, type CampaignListing, type PastGen, type Variant,
} from "../data/campaign";
import { useToast } from "../ui/Toast";
import s from "./Campaign.module.css";

const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);
const ago = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * One verified listing, every angle, every channel: each caption is checked against that platform's real limits before it can be queued, and each lands as a
 * draft in the pipeline for a person to read, edit and schedule. Nothing here posts anything.
 */
export function CampaignPanel({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const toast = useToast();
  const [listings, setListings] = useState<CampaignListing[] | null>(null);
  const [brand, setBrand] = useState<Partial<BrandRecord> | null>(null);
  const [pick, setPick] = useState("");
  const [chans, setChans] = useState<string[]>(["instagram", "facebook"]);
  const [busy, setBusy] = useState(false);
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<{ n: number } | { problem: string } | null>(null);
  const [tab, setTab] = useState("");
  const [past, setPast] = useState<PastGen[]>([]);

  useEffect(() => {
    let live = true;
    fetchCampaignListings().then((l) => { if (!live) return; setListings(l); setPick((p) => p || l[0]?.id || ""); }).catch(() => live && setListings([]));
    loadBrand().then((b) => live && setBrand(b)).catch(() => {});
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!pick) return;
    let live = true;
    listPast(pick).then((p) => live && setPast(p)).catch(() => live && setPast([]));
    return () => { live = false; };
  }, [pick, saved]);

  const chosen = listings?.find((l) => l.id === pick);
  const ready = useMemo(() => (variants ?? []).filter((v) => !v.issues.length).length, [variants]);
  const platforms = useMemo(() => [...new Set((variants ?? []).map((v) => v.platform))], [variants]);

  const run = async () => {
    if (!pick || !chans.length || busy) return;
    setBusy(true); setSaved(null);
    try {
      const { ai, facts } = await generate(pick, chans, brand);
      const vs = buildVariants(ai, facts, brand);
      if (!vs.length) throw new Error("Nothing came back for those channels.");
      setVariants(vs); setNote(ai.note ?? ""); setTab(vs[0].platform);
      // saved before the agency decides anything: "close this and come back" used to be the one action that destroyed the work
      try { const n = await saveGeneration(pick, vs); setSaved({ n }); onSaved(); } catch (e) { setSaved({ problem: reason(e, "not saved") }); }
    } catch (e) { toast(reason(e, "Could not write those just now."), "error"); } finally { setBusy(false); }
  };

  if (!listings) return <div className={s.card}><p className={s.muted} aria-busy="true">Loading your listings…</p></div>;
  if (!listings.length) return <div className={s.card}><b>No active listings yet</b><p className={s.muted}>Add a listing first; captions are written from its real details.</p><button type="button" className={s.btn} onClick={onClose}>Close</button></div>;

  return (
    <section className={s.card} aria-label="Generate a campaign">
      <header className={s.head}><div><h2 className={s.h2}>Generate a campaign</h2><p className={s.muted}>Each version is checked against that platform’s limits before it can be queued.</p></div><button type="button" className={s.btn} onClick={onClose}>Close</button></header>

      <div className={s.controls}>
        <select aria-label="Listing" value={pick} onChange={(e) => { setPick(e.target.value); setVariants(null); setSaved(null); }}>
          {listings.map((l) => <option key={l.id} value={l.id}>{l.title}{l.verified ? " ✓" : ""}</option>)}
        </select>
        <button type="button" className={`${s.btn} ${s.solid}`} disabled={busy || !chans.length} onClick={() => void run()}>{busy ? "Writing…" : variants ? "Generate again" : "Generate"}</button>
      </div>
      <div className={s.chans} role="group" aria-label="Channels">
        {CHANNEL_ORDER.map((c) => <button key={c} type="button" aria-pressed={chans.includes(c)} onClick={() => setChans((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]))}>{PLATFORMS[c].label}</button>)}
      </div>
      {chosen && !chosen.verified && <p className={s.muted}>This listing is not verified yet, so Tayo will not write captions that claim the seven checks passed.</p>}

      {variants && (
        <>
          <div className={s.sum}><span><b>{variants.length}</b> drafts</span><span className={s.good}><b>{ready}</b> ready</span>{variants.length - ready > 0 && <span className={s.bad}><b>{variants.length - ready}</b> to fix</span>}</div>
          {note && <p className={s.muted}>{note}</p>}
          <div className={s.tabs} role="tablist">{platforms.map((p) => { const n = variants.filter((v) => v.platform === p && v.issues.length).length; return <button key={p} type="button" role="tab" aria-selected={tab === p} onClick={() => setTab(p)}>{PLATFORMS[p].label}{n > 0 && <span className={s.badge} title={`${n} need attention`}>{n}</span>}</button>; })}</div>
          <div className={s.grid}>
            {variants.filter((v) => v.platform === tab).map((v, i) => (
              <article key={i} className={`${s.cap} ${v.issues.length ? s.warn : ""}`}>
                <div className={s.capTop}><span className={s.angle}>{v.angleName}</span><span className={v.issues.length ? s.bad : s.good}>{v.issues.length ? "Fix" : "Ready"}</span></div>
                <div className={s.hook}>{v.hook}</div>
                {v.body && <p className={s.body}>{v.body}</p>}
                {v.hashtags.length > 0 && <div className={s.tags}>{v.hashtags.join(" ")}</div>}
                <div className={s.foot}>A tracked synapsecore.dev link is added when it is queued · {v.caption.length} characters</div>
                {v.issues[0] && <div className={s.issue}>{v.issues[0]}</div>}
              </article>
            ))}
          </div>
          {saved && ("n" in saved
            ? <p className={s.savedOk}>{saved.n} version{saved.n === 1 ? "" : "s"} saved as drafts. Review and schedule them in the Draft column below.</p>
            : <p className={s.bad}>Kept on screen only: {saved.problem}</p>)}
        </>
      )}

      {past.length > 0 && (
        <details className={s.past}>
          <summary>Earlier versions for this listing ({past.length})</summary>
          {past.slice(0, 20).map((p) => <div key={p.id} className={s.pastRow}><span className={s.chip}>{PLATFORMS[p.platform]?.label ?? p.platform}</span><span className={s.pastText}>{p.text.slice(0, 140)}{p.text.length > 140 ? "…" : ""}</span><span className={s.muted}>{p.status} · {ago(p.createdAt)}</span></div>)}
        </details>
      )}
    </section>
  );
}
