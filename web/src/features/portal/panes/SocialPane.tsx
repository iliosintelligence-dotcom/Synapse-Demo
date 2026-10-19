"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchListingRefs, type ListingRef } from "../data/marketing";
import { SCHEDULABLE, STAGE_INFO, buildCards, discardDraft, discardPost, fetchStudio, groupByDay, platformName, retryPost, saveDraftText, scheduleDraft, type Card, type Draft, type Stage } from "../data/social";
import { CaptionEditor } from "./CaptionEditor";
import { ComposerPanel } from "./ComposerPanel";
import { loadBrand, type BrandRecord } from "../data/brand";
import { listingFacts, type ListingFacts } from "../data/composer";
import { ShareKit } from "./ShareKit";
import { ChannelsPanel } from "./ChannelsPanel";
import { CampaignPanel } from "./CampaignPanel";
import { useIntent } from "../intent";
import { useToast } from "../ui/Toast";
import s from "./Social.module.css";

const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);
const ORDER: Stage[] = ["review", "scheduled", "published", "attention"];
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " · " + new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "");
const dayName = (d: string) => new Date(`${d}T00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
/** A sensible default slot: tomorrow at 6pm, when people are on their phones after work. */
const defaultSlot = () => { const d = new Date(Date.now() + 864e5); d.setHours(18, 0, 0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

/** Every verified listing becomes content: review the captions, choose when they go out, see what each earned. */
export function SocialPane() {
  const toast = useToast();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [listings, setListings] = useState<ListingRef[]>([]);
  const [failed, setFailed] = useState("");
  const [view, setView] = useState<"pipeline" | "calendar">("pipeline");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState("");
  const [gen, setGen] = useState(false);
  const [post, setPost] = useState(false);
  const [share, setShare] = useState<string | null>(null);
  useIntent("new-post", () => setPost(true));

  const load = useCallback(async () => {
    try { const { drafts, posts } = await fetchStudio(); setCards(buildCards(drafts, posts)); setFailed(""); } catch (e) { setFailed(reason(e, "please refresh")); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); fetchListingRefs().then(setListings).catch(() => {}); }, [load]);

  const title = useMemo(() => Object.fromEntries(listings.map((l) => [l.id, l.title])), [listings]);

  const run = async (key: string, work: () => Promise<string>, fb: string) => {
    setBusy(key);
    try { toast(await work()); await load(); } catch (e) { toast(reason(e, fb), "error"); } finally { setBusy(""); }
  };

  if (failed) return <div className={s.blank}><b>Could not load your posts</b><p className={s.muted}>{failed}</p><button type="button" className={`${s.btn} ${s.solid}`} onClick={() => void load()}>Try again</button></div>;
  if (!cards) return <p className={s.muted} aria-busy="true">Loading…</p>;

  const draftOf = (c: Card): Draft => ({ id: c.id, propertyId: c.propertyId, platform: c.platform, angle: null, text: c.text, createdAt: c.when ?? "" });

  return (
    <>
      <div className={s.tools}>
        <p className={s.muted} style={{ margin: 0 }}>Captioned by AI, posted on schedule. Each post carries its own tracked link, so what it earns is counted, not estimated.</p>
        <div className={s.acts}>
          <div className={s.seg} role="group" aria-label="View">
            <button type="button" aria-pressed={view === "pipeline"} onClick={() => setView("pipeline")}>Pipeline</button>
            <button type="button" aria-pressed={view === "calendar"} onClick={() => setView("calendar")}>Calendar</button>
          </div>
          <button type="button" className={`${s.btn} ${s.solid}`} onClick={() => setPost((v) => !v)}>{post ? "Close composer" : "New post"}</button>
          <button type="button" className={s.btn} onClick={() => setGen((v) => !v)}>{gen ? "Close generator" : "Generate a campaign"}</button>
        </div>
      </div>

      {share && <ShareKit listingId={share} onClose={() => setShare(null)} />}
      <ChannelsPanel onChanged={() => void load()} />

      {post && <ComposerPanel onSent={() => void load()} onClose={() => setPost(false)} />}
      {gen && <CampaignPanel onSaved={() => void load()} onClose={() => setGen(false)} />}

      {!cards.length && <div className={s.blank}><b>No posts yet</b><p className={s.muted}>Generate captions for a listing, review them here, then choose when they go out.</p><button type="button" className={`${s.btn} ${s.solid}`} onClick={() => setGen(true)}>Generate captions</button></div>}

      {cards.length > 0 && view === "pipeline" && (
        <div className={s.cols}>
          {ORDER.map((st) => {
            const list = cards.filter((c) => c.stage === st);
            return (
              <section key={st} className={s.col}>
                <header><b>{STAGE_INFO[st].label}</b><span className={s.count}>{list.length}</span></header>
                <div className={s.muted} style={{ fontSize: 12 }}>{STAGE_INFO[st].who}</div>
                {!list.length && <div className={s.none}>{STAGE_INFO[st].empty}</div>}
                {list.map((c) => (
                  <article key={c.key} className={`${s.pc} ${st === "attention" ? s.warn : ""}`}>
                    <div className={s.pcHead}><span className={s.chip}>{platformName(c.platform)}</span><span className={s.when}>{when(c.when)}</span></div>
                    <div className={s.tt}>{title[c.propertyId] ?? "This listing"}</div>
                    <p className={s.cap}>{c.text.length > 160 ? `${c.text.slice(0, 160)}…` : c.text}</p>
                    {c.post && st !== "review" && st !== "scheduled" && <div className={s.perf}><b>{c.post.clicks}</b> taps · <b>{c.post.visits}</b> opened · <b>{c.post.leads}</b> {c.post.leads === 1 ? "enquiry" : "enquiries"}{c.post.likes + c.post.comments + c.post.shares > 0 && <> · {c.post.likes} likes</>}</div>}
                    {c.failure && <div className={s.fail}>{c.failure}</div>}
                    <div className={s.acts}>
                      {c.kind === "draft" && <>
                        <button type="button" className={`${s.btn} ${s.solid}`} onClick={() => setEditing(draftOf(c))}>Review and schedule</button>
                        <button type="button" className={s.btn} disabled={busy === c.key} onClick={() => void run(c.key, async () => { await discardDraft(c.id); return "Draft discarded."; }, "Could not discard that.")}>Discard</button>
                      </>}
                      {c.kind === "post" && c.post?.status === "published" && <button type="button" className={s.btn} onClick={() => setShare(c.propertyId)}>Share it too</button>}
                      {c.kind === "post" && c.post?.status === "failed" && <button type="button" className={s.btn} disabled={busy === c.key} onClick={() => void run(c.key, async () => { await retryPost(c.id); return "Back in the queue."; }, "Could not retry that.")}>Try again</button>}
                      {c.kind === "post" && c.post?.status !== "published" && <button type="button" className={s.btn} disabled={busy === `x${c.key}`} onClick={() => { if (window.confirm("Remove this post?")) void run(`x${c.key}`, async () => { await discardPost(c.id); return "Post removed."; }, "Could not remove that."); }}>Remove</button>}
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}

      {cards.length > 0 && view === "calendar" && (
        groupByDay(cards).length ? (
          <div className={s.cal}>
            {groupByDay(cards).map((g) => (
              <div key={g.day} className={s.day}>
                <div className={s.dayName}>{dayName(g.day)}</div>
                {g.cards.map((c) => <div key={c.key} className={s.cr}><span className={s.chip}>{platformName(c.platform)}</span><span className={s.tt}>{title[c.propertyId] ?? "This listing"}</span><span className={s.when}>{STAGE_INFO[c.stage].label} · {when(c.when)}</span></div>)}
              </div>
            ))}
          </div>
        ) : <div className={s.blank}><p className={s.muted}>Nothing is scheduled or published yet.</p></div>
      )}

      {editing && <ScheduleDialog draft={editing} listing={title[editing.propertyId]} onClose={() => setEditing(null)} onDone={async () => { setEditing(null); toast("Scheduled. It posts at the time you chose."); await load(); }} />}
    </>
  );
}

function ScheduleDialog({ draft, listing, onClose, onDone }: { draft: Draft; listing?: string; onClose: () => void; onDone: () => void | Promise<void> }) {
  const [text, setText] = useState(draft.text);
  const [platform, setPlatform] = useState<string>((SCHEDULABLE as readonly string[]).includes(draft.platform) ? draft.platform : "instagram");
  const [at, setAt] = useState(defaultSlot);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [facts, setFacts] = useState<ListingFacts | null>(null);
  const [brand, setBrand] = useState<Partial<BrandRecord> | null>(null);
  useEffect(() => { let live = true; listingFacts(draft.propertyId).then((f) => live && setFacts(f)).catch(() => {}); loadBrand().then((b) => live && setBrand(b)).catch(() => {}); return () => { live = false; }; }, [draft.propertyId]);
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      if (text !== draft.text) await saveDraftText(draft.id, text);
      await scheduleDraft(draft, platform, new Date(at), text);
      await onDone();
    } catch (x) { setErr(reason(x, "Could not schedule that.")); setBusy(false); }
  };
  return (
    <div className={s.scrim} onClick={onClose}>
      <form className={s.dialog} role="dialog" aria-modal="true" aria-label="Review and schedule" onClick={(e) => e.stopPropagation()} onSubmit={go}>
        <b>{listing ?? "Review caption"}</b>
        <div className={s.field}>Caption<CaptionEditor value={text} onChange={setText} channel={platform} listingId={draft.propertyId} facts={facts} brand={brand} rows={7} /></div>
        <label className={s.field}>Channel<select value={platform} onChange={(e) => setPlatform(e.target.value)}>{SCHEDULABLE.map((p) => <option key={p} value={p}>{platformName(p)}</option>)}</select></label>
        <label className={s.field}>Post at<input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></label>
        <p className={s.muted} style={{ margin: 0, fontSize: 12.5 }}>This is a real post, not a rehearsal. It goes out on the account connected for that channel.</p>
        {err && <div className={s.fail} role="alert">{err}</div>}
        <div className={s.acts} style={{ justifyContent: "flex-end" }}><button type="button" className={s.btn} onClick={onClose}>Cancel</button><button type="submit" className={`${s.btn} ${s.solid}`} disabled={busy || !text.trim()}>{busy ? "Scheduling…" : "Approve and schedule"}</button></div>
      </form>
    </div>
  );
}
