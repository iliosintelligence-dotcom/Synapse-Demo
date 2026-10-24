"use client";
/**
 * The scheduler sheet, as React (was openScheduler in src/legacy/agency/inline-3.js). `openScheduler(p, mode)` survives there as a
 * name and fires `syn:schedule`; mode is "approve", "reschedule" or "duplicate".
 *
 * A slot is one channel at one moment, and one slot becomes one row in social_posts. Several slots is how the same caption goes
 * out to Instagram at nine and Facebook at six. Before this there was no scheduler at all: approving set the time to the string
 * "Today 5:00 PM" and the calendar placed posts by hashing their ids.
 *
 * REDESIGNED (Eden, 2026-10-09): the post, the time, and one button. The quick times answer "when" in one tap, and the two
 * caveats are short lines with the full wording in a tooltip.
 */
import { useEffect, useRef, useState } from "react";
import { showDrawer } from "./SideDrawer";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
type Ch = { label: string; color: string };
const CHS = (): Record<string, Ch> => W().SynCH || {};
const chLabel = (c: string) => (CHS()[c] && CHS()[c].label) || c;
const fmtWhen = (iso: string) => (W().fmtWhen ? W().fmtWhen(iso) : "");

/* Telegram was connectable for a day before it was schedulable: an agency could add its channel and find nowhere to send. */
const SCHED_PLATS = ["instagram", "tiktok", "youtube", "facebook", "whatsapp", "telegram"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const dateVal = (d: Date) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
const timeVal = (d: Date) => pad2(d.getHours()) + ":" + pad2(d.getMinutes());

/* Which accounts this agency has on a platform (fetched by the composer into window.SOCIAL_ACCOUNTS). */
const acctsFor = (platform: string): any[] => (W().SOCIAL_ACCOUNTS || []).filter((a: any) => a && a.platform === platform && a.is_active);
const acctLabel = (a: any) => (a.platform_username ? "@" + a.platform_username : "Connected account");
/* ONLY WHEN THERE IS SOMETHING TO CHOOSE: one account is a fact, not a decision. null means the agency's default, which is also
   what a row with no picker sends. */
const firstAcct = (plat: string) => { const l = acctsFor(plat); return l.length < 2 ? null : l[0].id; };

type Row = { k: number; plat: string; d: string; t: string; acct: string | null };
let rowKey = 0;
const row = (plat: string, d: Date): Row => ({ k: ++rowKey, plat, d: dateVal(d), t: timeVal(d), acct: firstAcct(plat) });

function Photo({ url }: { url: string }) {
  const [bad, setBad] = useState(false);
  const u = typeof url === "string" ? url.trim() : "";
  return <div className={"lph" + (bad ? " no-photo" : "")}>{u && !bad ? <img src={u} alt="" loading="lazy" onError={() => setBad(true)} /> : null}</div>;
}

/* "Post now" is the only irreversible button here, so it is the only one that asks, naming the count and the word "public".
   Every Post now queues the agency's own post AND a Synapse twin, and an agency whose own account is not connected watched posts
   appear on Synapse's channels and nothing on theirs, and reported the button broken. So it says so before anything is queued,
   and still lets them go ahead: the Synapse leg is real reach. A lapsed sign-in and a missing account have different fixes. */
function nowQuestion(rows: Row[]) {
  const n = rows.length;
  const connected: string[] | null = Array.isArray(W().SYN_CONNECTED) ? W().SYN_CONNECTED : null;
  const lapsed: string[] = Array.isArray(W().SYN_EXPIRED) ? W().SYN_EXPIRED : [];
  const wanted = [...new Set(rows.map((r) => r.plat))];
  const missing = connected ? wanted.filter((p) => connected.indexOf(p) < 0) : [];
  let ask = "Post " + n + " time" + (n === 1 ? "" : "s") + " right now, for real? This is public and cannot be undone from here.";
  if (missing.length) {
    const stale = missing.filter((p) => lapsed.indexOf(p) >= 0), never = missing.filter((p) => lapsed.indexOf(p) < 0);
    const staleN = stale.map(chLabel).join(" and "), neverN = never.map(chLabel).join(" and ");
    const many = missing.length > 1, mixed = stale.length && never.length;
    const lead = mixed ? "Your " + missing.map(chLabel).join(" and ") + " will not post as you"
      : stale.length ? "Your sign-in for " + staleN + " " + (many ? "have" : "has") + " expired, so this will NOT post as you"
        : "Your " + neverN + " " + (many ? "are" : "is") + " not connected yet, so this will NOT post as you";
    const fix = mixed ? "Reconnect " + staleN + " and connect " + neverN + " under Channels"
      : stale.length ? "Reconnect " + (many ? "them" : "it") + " under Channels" : "Connect " + (many ? "them" : "it") + " under Channels";
    ask = lead + ".\n\nSynapse will still put it out on its own channels, and the tracked link still brings those readers back to your listing.\n\n"
      + "Post on Synapse’s channels now? " + fix + " to post as yourself as well.";
  }
  return ask;
}

/* What actually happened, from the publisher's own count, rather than "sent" on the strength of having asked. */
function report(mode: string, now: boolean, rows: { platform: string; at: string }[], sent: any) {
  const n = rows.length;
  if (mode === "reschedule") toast("Moved to " + fmtWhen(rows[0].at));
  else if (!now) toast(n + (n === 1 ? " post scheduled" : " posts scheduled") + ", going out for real at that time");
  else if (sent && typeof sent.published === "number") {
    /* Every row the drain sent, the Synapse twins included: one press does put the listing on several channels. */
    const n2 = sent.published, tt = rows.some((r) => r.platform === "tiktok");
    toast(n2
      ? n2 + (n2 === 1 ? " post is live" : " posts are live") + (tt ? " · TikTok: open the app, it is in your inbox to finish" : "")
        + (sent.failed ? " · " + sent.failed + " could not go out — see Needs attention" : "")
      : (sent.failed ? sent.failed + " could not go out — see Needs attention" : "Queued — going out within the minute"));
  } else if (sent && sent.drainFailed) toast("Saved. Sending didn’t start just now, so it goes out with the next queue run, within a few minutes.");
  else toast("Queued — going out within the minute");
}

function Sheet({ p, mode, base, nowAt }: { p: any; mode: string; base: number; nowAt: number }) {
  const plat = (p.channels && p.channels[0]) || "instagram";
  const [rows, setRows] = useState<Row[]>(() => [row(plat, new Date(base))]);
  const [quick, setQuick] = useState(-1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "now">("");
  const story = useRef<HTMLInputElement>(null), camp = useRef<HTMLSelectElement>(null);
  const [opts] = useState(() => {
    /* ONE TAP FOR THE USUAL ANSWERS. They set the last row, so with several rows each can be given its own. */
    const now = new Date(nowAt);
    const at = (d: Date, h: number) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x; };
    const tmr = new Date(now); tmr.setDate(now.getDate() + 1);
    const sat = new Date(now); sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    const hour = new Date(nowAt + 36e5); hour.setMinutes(0, 0, 0); if (hour <= now) hour.setHours(hour.getHours() + 1);
    return ([["In 1 hour", hour], ["Today 6pm", at(now, 18)], ["Tomorrow 9am", at(tmr, 9)], ["Saturday 10am", at(sat, 10)]] as [string, Date][]).filter((o) => o[1] > now);
  });
  const campaigns: any[] = (W().SynCampaigns && W().SynCampaigns()) || [];
  const heading = mode === "reschedule" ? "Move this post" : mode === "duplicate" ? "Copy this post" : "Schedule this post";
  const edit = (k: number, v: Partial<Row>) => setRows((rs) => rs.map((r) => (r.k === k ? { ...r, ...v } : r)));

  const add = () => setRows((rs) => {
    /* A copy defaults three hours after the previous slot: the point of a second slot is a different moment. */
    const last = rs[rs.length - 1], d = new Date(base);
    if (last) { const prev = new Date(last.d + "T" + (last.t || "09:00")); if (!isNaN(prev.getTime())) { prev.setHours(prev.getHours() + 3); d.setTime(prev.getTime()); } }
    return rs.concat(row(plat, d));
  });
  const drop = (k: number) => { if (rows.length === 1) { toast("A post needs at least one time"); return; } setRows((rs) => rs.filter((r) => r.k !== k)); };

  /* `now` is the only difference between the two buttons: it overrides every row's time, then drains the queue rather than waiting
     for the minute-by-minute cron. The channel still comes from the row; only the time is replaced. */
  function commit(now: boolean) {
    const list = rows.map((r) => ({ platform: r.plat, accountId: r.acct || null, at: now ? new Date().toISOString() : r.d + "T" + r.t }))
      .filter((r) => r.at && r.at.indexOf("undefined") < 0);
    const bad = list.find((r) => isNaN(new Date(r.at).getTime()));
    if (!list.length || bad) { setNote("Give every row a date and a time."); return; }
    /* A caption is written for one channel (Greptile: adding Facebook to an Instagram post sent the Instagram wording there). */
    const cardPlat = p.platform || (Array.isArray(p.channels) && p.channels.length === 1 ? p.channels[0] : null);
    const off = cardPlat && p.caption && list.find((r) => r.platform && r.platform !== cardPlat);
    if (off) {
      const nm = (x: string) => String(x).charAt(0).toUpperCase() + String(x).slice(1);
      setNote("This caption was written for " + nm(cardPlat) + ". To post on " + nm(off.platform) + " too, write its own version in the composer.");
      return;
    }
    setNote(""); setBusy(now ? "now" : "save");
    const L = W().SynListings;
    /* Rescheduling reuses the row that already exists and only creates rows for the extra slots, so moving a post does not leave
       the old one behind next to the new one. */
    const extra = mode === "reschedule" ? list.slice(1) : list;
    const first = mode === "reschedule" ? L.updateSocialPost(p.postId, { at: list[0].at, platform: list[0].platform, accountId: list[0].accountId }) : Promise.resolve();
    first
      /* NO MEDIA NAMED: queue_social_post reads the listing's whole gallery itself, in display order, capped at ten. Stories and the
         campaign are read at commit, since somebody can tick them after adding a row. Both buttons are real sends; they differ
         only in WHEN. */
      .then(() => (extra.length ? L.schedulePost({ propertyId: p.propertyId, contentId: p.contentId || null, caption: p.caption || "", mediaUrls: null, slots: extra,
        stories: !!(story.current && story.current.checked), campaignId: (camp.current && camp.current.value) || null }) : null))
      .then(() => {
        /* DRAIN IT RATHER THAN WAIT: "Post now" that takes a minute to do anything visible reads as broken. A failure here leaves
           the rows queued for the cron, so the post is late rather than lost, and the toast says so. */
        if (!now) return null;
        const sb = W().SynSB || {};
        return W().authToken().then((t: string) => fetch(sb.url + "/functions/v1/social-publish", {
          method: "POST", headers: { apikey: sb.key, Authorization: "Bearer " + t, "Content-Type": "application/json" },
          body: JSON.stringify({ live: true, limit: Math.min(50, list.length * 4) }),
        })).then((r: Response) => r.json().catch(() => ({})).then((j: any) => (r.ok ? j : { drainFailed: true, error: j && j.error })))
          .catch(() => ({ drainFailed: true }));
      })
      /* A caption that has been scheduled is no longer awaiting review, so it leaves the approval column; the publisher's answer is
         passed through untouched. */
      .then((sent: any) => (mode === "approve" && p.contentId ? L.setContentStatus(p.contentId, "scheduled").catch(() => {}).then(() => sent) : sent))
      .then((sent: any) => {
        W().closeLead();
        report(mode, now, list, sent);
        /* "Your post is out" only after a post actually went out. */
        if (now && mode !== "reschedule" && sent && Number(sent.published) > 0) W().rememberStatusOffer?.(p.propertyId);
        const probs: string[] = W().SYN_LAST_SCHEDULE_PROBLEMS || [];
        W().SYN_LAST_SCHEDULE_PROBLEMS = [];
        if (probs.length) setTimeout(() => toast("The post is saved, but " + probs.join(" and ") + (probs.length === 1 ? " was" : " were") + " not added. Try again from the post card."), 2800);
        W().loadPipeline(); W().watchPipeline();
      })
      .catch((err: any) => {
        setBusy("");
        setNote((err && err.message) || "Could not save that."); W().planGate?.(err && err.message);
        console.error("schedule failed", err);
      });
  }

  return (
    <>
      <div className="sch2-head"><h2>{heading}</h2><button className="x" aria-label="Close" onClick={() => W().closeLead()}>{"×"}</button></div>
      <div className="sch2-post">
        <div className="sch2-ph"><Photo url={p.img} /></div>
        <div className="sch2-pb">
          <div className="sch2-t">{String(p.listing || "").split(",")[0]}</div>
          <div className="sch2-p">{p.price || ""}</div>
          {p.caption ? <div className="sch2-c" title={p.caption}>{p.caption}</div> : null}
        </div>
      </div>
      <div className="sch2-lbl">When</div>
      <div className="sch2-quick" id="schQuick" role="group" aria-label="Quick times">
        {opts.map((o, i) => (
          <button type="button" key={o[0]} className={"sch2-q" + (quick === i ? " on" : "")} data-q={i}
            onClick={() => { const last = rows[rows.length - 1]; if (!last) return; edit(last.k, { d: dateVal(o[1]), t: timeVal(o[1]) }); setQuick(i); }}>{o[0]}</button>
        ))}
      </div>
      <div className="sch-slots" id="schSlots">
        {rows.map((r) => {
          const accts = acctsFor(r.plat);
          return (
            <div className="slot" data-slot="" key={r.k}>
              {/* THE ACCOUNTS FOLLOW THE CHANNEL: queue_social_post refuses an account from another platform. */}
              <select className="slot-p" aria-label="Channel" value={r.plat} onChange={(e) => edit(r.k, { plat: e.target.value, acct: firstAcct(e.target.value) })}>
                {SCHED_PLATS.map((c) => <option key={c} value={c}>{chLabel(c)}</option>)}
              </select>
              <input type="date" className="slot-d" value={r.d} aria-label="Date" onChange={(e) => edit(r.k, { d: e.target.value })} />
              <input type="time" className="slot-t" value={r.t} aria-label="Time" onChange={(e) => edit(r.k, { t: e.target.value })} />
              <button type="button" className="slot-x" aria-label="Remove this time" onClick={() => drop(r.k)}>{"×"}</button>
              {/* Its own line under the three: a fourth control on one row is unreadable on a phone. */}
              <div className="slot-acct">
                {accts.length >= 2 ? (
                  <select className="slot-a" aria-label="Account" value={r.acct || ""} onChange={(e) => edit(r.k, { acct: e.target.value })}>
                    {accts.map((a) => <option key={a.id} value={a.id}>{acctLabel(a)}</option>)}
                  </select>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sch-note" id="schTt" hidden={!rows.some((r) => r.plat === "tiktok")} title="Open TikTok, add a sound, and post it from there.">TikTok goes to your inbox as a draft.</div>
      <div className="sch2-more">
        <button type="button" className="sch2-ghost" id="schAdd" onClick={add}>+ Add another time</button>
        {mode === "reschedule" ? null : (
          <button type="button" className="sch2-ghost" id="schNow" disabled={!!busy} onClick={() => { if (!window.confirm(nowQuestion(rows))) return; commit(true); }}>
            {busy === "now" ? "Sending…" : "Post now"}
          </button>
        )}
      </div>
      {campaigns.length ? (
        <label className="sch-camp"><span>Campaign</span>
          <select id="schCamp" ref={camp} defaultValue=""><option value="">None</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.nm}</option>)}</select>
        </label>
      ) : null}
      <label className="sch2-story" title="Instagram does not allow a tappable link on a Story posted through the API, so this is reach, not clicks. It stays up for 24 hours.">
        <input type="checkbox" id="schStory" ref={story} /><span className="sw2" aria-hidden="true"></span>
        <span className="sch2-sl">Also on Instagram Stories<em>no link</em></span>
      </label>
      <div className="sch-note" id="schNote">{note}</div>
      <button className="btn btn-primary btn-block sch2-save" id="schSave" disabled={!!busy} onClick={() => commit(false)}>
        {busy === "save" ? "Saving…" : mode === "reschedule" ? "Save" : "Add to schedule"}
      </button>
    </>
  );
}

/* Listens for openScheduler(p, mode). Rendered once, beside the board. */
export function SchedulerHost() {
  useEffect(() => {
    const open = (e: Event) => {
      const { p, mode } = (e as CustomEvent).detail || {};
      if (!p) return;
      /* The next round hour rather than "now": nobody means to publish at 14:37. */
      const nowAt = Date.now();
      const base = p.scheduledAt ? new Date(p.scheduledAt) : new Date(nowAt + 36e5);
      if (!p.scheduledAt) base.setMinutes(0, 0, 0);
      showDrawer(<Sheet p={p} mode={mode} base={base.getTime()} nowAt={nowAt} />, { bare: true });
    };
    window.addEventListener("syn:schedule", open);
    return () => window.removeEventListener("syn:schedule", open);
  }, []);
  return null;
}
