"use client";

import { useEffect, useMemo, useState } from "react";
import { loadBrand, type BrandRecord } from "../data/brand";
import { ANGLE_LABEL, fetchCampaignListings, generate, saveGeneration, type CampaignListing, type Variant } from "../data/campaign";
import { CHANNEL_NOTE, COMPOSER_CHANNELS, listingFacts, type ListingFacts } from "../data/composer";
import { CHANNEL_LABEL } from "../data/marketing";
import { useToast } from "../ui/Toast";
import { CaptionEditor } from "./CaptionEditor";
import s from "./Composer.module.css";

const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);

/** New post: pick a listing and where it goes, Synapse writes a caption for each channel, you edit them, and they go to review as drafts. Nothing posts from here. */
export function ComposerPanel({ onSent, onClose }: { onSent: () => void; onClose: () => void }) {
  const toast = useToast();
  const [listings, setListings] = useState<CampaignListing[] | null>(null);
  const [brand, setBrand] = useState<Partial<BrandRecord> | null>(null);
  const [pick, setPick] = useState("");
  const [chans, setChans] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [captions, setCaptions] = useState<Record<string, string> | null>(null);
  const [angles, setAngles] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [rec, setRec] = useState("");
  const [facts, setFacts] = useState<ListingFacts | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    fetchCampaignListings().then((l) => { if (!live) return; setListings(l); setPick((p) => p || l[0]?.id || ""); }).catch(() => live && setListings([]));
    loadBrand().then((b) => live && setBrand(b)).catch(() => {});
    return () => { live = false; };
  }, []);
  useEffect(() => { if (!pick) return; let live = true; listingFacts(pick).then((f) => live && setFacts(f)).catch(() => {}); return () => { live = false; }; }, [pick]);

  const chosen = listings?.find((l) => l.id === pick);
  const sendable = useMemo(() => chans.filter((c) => (captions?.[c] ?? "").trim()), [chans, captions]);

  const write = async () => {
    if (!pick || !chans.length || busy) return;
    setBusy(true); setErr("");
    try {
      const { ai } = await generate(pick, chans, brand);
      setCaptions(ai.captions ?? {}); setAngles(ai.angles ?? {}); setNote(ai.note ?? ""); setRec(ai.recommendedChannel ?? "");
    } catch (e) { setErr(reason(e, "Couldn’t generate captions right now. Please try again.")); } finally { setBusy(false); }
  };
  const send = async () => {
    if (!sendable.length || !captions) return;
    setBusy(true);
    try {
      const vs = sendable.map((c) => ({ platform: c, angle: angles[c] ?? "custom", angleName: ANGLE_LABEL[angles[c] ?? "custom"] ?? "Custom", hook: "", body: "", caption: captions[c], hashtags: [], title: null, issues: [] } as Variant));
      const n = await saveGeneration(pick, vs);
      if (!n) throw new Error("Nothing could be filed. None of those channels has a content type yet.");
      toast(`${n} ${n === 1 ? "caption" : "captions"} sent for approval. Review them in Draft.`);
      onSent(); onClose();
    } catch (e) { toast(reason(e, "Could not send those for approval"), "error"); setBusy(false); }
  };

  if (!listings) return <section className={s.card}><p className={s.muted} aria-busy="true">Loading your listings…</p></section>;
  if (!listings.length) return <section className={s.card}><b>No active listings yet</b><p className={s.muted}>Add a listing first; captions are written from its real details.</p><button type="button" className={s.btn} onClick={onClose}>Close</button></section>;

  return (
    <section className={s.card} aria-label="New post">
      <header className={s.head}><div><h2 className={s.h2}>New post</h2><p className={s.muted}>Pick a listing and where it goes. Synapse writes the captions.</p></div><button type="button" className={s.btn} onClick={onClose}>Close</button></header>

      <div className={s.step}><b>1</b> Listing</div>
      <select className={s.select} aria-label="Listing" value={pick} onChange={(e) => { setPick(e.target.value); setCaptions(null); }}>
        {listings.map((l) => <option key={l.id} value={l.id}>{l.title}{l.verified ? " ✓" : ""}</option>)}
      </select>

      <div className={s.step}><b>2</b> Channels <span className={s.count}>{chans.length ? `${chans.length} selected` : "pick at least one"}</span></div>
      <div className={s.chans} role="group" aria-label="Channels">
        {COMPOSER_CHANNELS.map((c) => <button key={c} type="button" aria-pressed={chans.includes(c)} title={CHANNEL_NOTE[c]} onClick={() => setChans((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]))}>{CHANNEL_LABEL[c] ?? c}{c === "x" ? " *" : ""}</button>)}
      </div>
      {chans.includes("x") && <p className={s.muted}>* X posts go out on Synapse’s X account for now; enquiries still come to you.</p>}
      {chosen && !chosen.verified && <p className={s.muted}>This listing is not verified yet, so Tayo will not write captions that claim the seven checks passed.</p>}

      {!captions && <div><button type="button" className={`${s.btn} ${s.solid}`} disabled={busy || !chans.length} title={chans.length ? "" : "Pick at least one channel"} onClick={() => void write()}>{busy ? "Writing…" : "Write the captions"}</button></div>}
      {err && <div className={s.err} role="alert">{err}</div>}

      {captions && (
        <>
          {note && <p className={s.muted}>{note}</p>}
          {rec && <p className={s.muted}>Tayo would start with <b>{CHANNEL_LABEL[rec] ?? rec}</b>.</p>}
          {chans.map((c) => (
            <div key={c} className={s.chanBox}>
              <div className={s.chanHead}><b>{CHANNEL_LABEL[c] ?? c}</b>{angles[c] && <span className={s.chip}>{ANGLE_LABEL[angles[c]] ?? angles[c]}</span>}</div>
              {captions[c] === undefined ? <p className={s.muted}>Nothing came back for this channel.</p> : <CaptionEditor value={captions[c]} onChange={(v) => setCaptions((x) => ({ ...(x ?? {}), [c]: v }))} channel={c} listingId={pick} facts={facts} brand={brand} rows={6} />}
            </div>
          ))}
          <div className={s.foot}>
            <button type="button" className={s.btn} disabled={busy} onClick={() => void write()}>Write them again</button>
            <button type="button" className={`${s.btn} ${s.solid}`} disabled={busy || !sendable.length} onClick={() => void send()}>{busy ? "Sending…" : "Send for approval →"}</button>
          </div>
        </>
      )}
    </section>
  );
}
