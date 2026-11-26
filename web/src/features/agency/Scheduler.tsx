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
import { useCallback, useEffect, useRef, useState } from "react";
import { showDrawer } from "./SideDrawer";
import { TikTokPanel, type TikTokChoice } from "./TikTokPanel";
import { writeCaptions } from "./PostComposer";
import { Thumb } from "@/components/Thumb";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
type Ch = { label: string; color: string };
const CHS = (): Record<string, Ch> => W().SynCH || {};
const chLabel = (c: string) => (CHS()[c] && CHS()[c].label) || c;
const fmtWhen = (iso: string) => (W().fmtWhen ? W().fmtWhen(iso) : "");

/* Telegram was connectable for a day before it was schedulable: an agency could add its channel and find nowhere to send. */
const SCHED_PLATS = ["instagram", "tiktok", "youtube", "facebook", "whatsapp", "telegram"];
/* LinkedIn and X (2026-11-13) are offered only to an agency that has connected one: without it a LinkedIn post has
   nowhere to go, and an X post would go out on Synapse's X instead. */
/* ONLY A CONNECTED CHANNEL (2026-11-26). Every channel above used to be offered whether or not the agency had connected it,
   and the bulk planner ticks every channel with a caption: 34 Telegram posts were queued for an agency with no Telegram
   connected, each certain to fail on the day ("No telegram account is connected"). WhatsApp is always offered, as before
   (Eden, 2026-11-26: "the whatsapp has to be there"): it is not connected per agency like the others. */
const ALWAYS_OFFERED = new Set(["whatsapp"]);
const connectedPlat = (p: string) => ALWAYS_OFFERED.has(p) || acctsFor(p).length > 0;
const schedPlats = (current: string): string[] => {
  const l = SCHED_PLATS.concat(["linkedin", "x"]).filter(connectedPlat);
  return l.indexOf(current) < 0 && connectedPlat(current) ? l.concat([current]) : l;
};
/* The channel a new row starts on: the card's, if connected, else the first connected one. */
const startPlat = (pref: string) => (connectedPlat(pref) ? pref : (schedPlats(pref)[0] || pref));
const notConnectedNote = (plat: string) => "Connect " + chLabel(plat) + " under Channels first, then schedule to it.";
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
  return <div className={"lph" + (bad ? " no-photo" : "")}>{u && !bad ? <Thumb src={u} loading="lazy" onError={() => setBad(true)} /> : null}</div>;
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
  /* WHAT THE PLAN WOULD NOT ALLOW, said as itself (2026-11-26): "this can't be posted right now, and here is why", never a bare
     "could not go out". The publisher sends at most one message per kind. */
  else if (sent && Array.isArray(sent.limits) && sent.limits.length) toast(String(sent.limits[0].message || ""));
  else if (sent && typeof sent.published === "number") {
    /* Every row the drain sent, the Synapse twins included: one press does put the listing on several channels. */
    const n2 = sent.published, tt = rows.some((r) => r.platform === "tiktok");
    toast(n2
      ? n2 + (n2 === 1 ? " post is live" : " posts are live") + (tt ? " · TikTok: open the app, it is in your inbox to finish" : "")
        + (sent.failed ? " · " + sent.failed + " could not go out — see Needs attention" : "")
      : (sent.failed ? sent.failed + " could not go out — see Needs attention"
        : sent.deferred ? "Saved. " + String((sent.results || []).find((x: any) => x && x.status === "deferred")?.reason || "It goes out automatically later.")
        : "Queued — going out within the minute"));
  } else if (sent && sent.drainFailed) toast("Saved. Sending didn’t start just now, so it goes out with the next queue run, within a few minutes.");
  else toast("Queued — going out within the minute");
}

function Sheet({ p, mode, base, nowAt }: { p: any; mode: string; base: number; nowAt: number }) {
  const plat = startPlat((p.channels && p.channels[0]) || "instagram");
  const [rows, setRows] = useState<Row[]>(() => [row(plat, new Date(base))]);
  const [quick, setQuick] = useState(-1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "now">("");
  /* null = TikTok is in inbox mode (as before); otherwise the TikTok panel's choices, which a TikTok row needs. */
  const [tt, setTt] = useState<TikTokChoice>(null);
  const onTt = useCallback((c: TikTokChoice) => setTt(c), []);
  const story = useRef<HTMLInputElement>(null), camp = useRef<HTMLSelectElement>(null);
  /* The TikTok account this post goes to -- the one picked, else the agency's oldest (the same default the publisher
     uses) -- and whether that agency has switched direct posting on for it. Off: the inbox, and no TikTok panel. */
  const ttRow = rows.find((r) => r.plat === "tiktok") || null;
  const ttAcct = ttRow ? (acctsFor("tiktok").find((a) => a.id === ttRow.acct)
    || acctsFor("tiktok").slice().sort((x, y) => String(x.connected_at || "").localeCompare(String(y.connected_at || "")))[0] || null) : null;
  const ttDirectOn = !!(ttAcct && ttAcct.direct_post);
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
    const unconnected = list.find((r) => !connectedPlat(r.platform));
    if (unconnected) { setNote(notConnectedNote(unconnected.platform)); return; }
    /* A caption is written for one channel (Greptile: adding Facebook to an Instagram post sent the Instagram wording there). */
    const cardPlat = p.platform || (Array.isArray(p.channels) && p.channels.length === 1 ? p.channels[0] : null);
    const off = cardPlat && p.caption && list.find((r) => r.platform && r.platform !== cardPlat);
    if (off) {
      const nm = (x: string) => String(x).charAt(0).toUpperCase() + String(x).slice(1);
      setNote("This caption was written for " + nm(cardPlat) + ". To post on " + nm(off.platform) + " too, write its own version in the composer.");
      return;
    }
    /* TikTok DIRECT mode: a TikTok row needs the panel completed (TikTok's own rule), and each TikTok row carries the
       choices plus the moment of consent. In inbox mode (tt null) nothing changes. */
    const hasTt = list.some((r) => r.platform === "tiktok");
    const ttNow = ttDirectOn ? tt : null;   /* the account's own switch is off: inbox, whatever the panel last said */
    if (hasTt && ttNow && !ttNow.valid) { setNote(ttNow.reason); return; }
    const ttPayload = hasTt && ttNow && ttNow.valid ? { ...ttNow.tiktok, consent_at: new Date().toISOString() } : null;
    const withTt = (rs: typeof list) => rs.map((r) => (r.platform === "tiktok" && ttPayload ? { ...r, tiktok: ttPayload } : r));
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
      .then(() => (extra.length ? L.schedulePost({ propertyId: p.propertyId, contentId: p.contentId || null, caption: p.caption || "", mediaUrls: null, slots: withTt(extra),
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
                {schedPlats(r.plat).map((c) => <option key={c} value={c}>{chLabel(c)}</option>)}
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
      <div className="sch-note" id="schTt" hidden={!ttRow || (ttDirectOn && tt !== null)} title="Open TikTok, add a sound, and post it from there.">TikTok goes to your inbox as a draft.</div>
      {/* TikTok's required posting panel, only when the post goes to a TikTok account whose agency switched direct posting
          on, and the backend is in direct mode (the panel renders nothing otherwise). Re-mounts per account, so creator
          info is fetched fresh for the account the post goes to. */}
      {ttRow && ttDirectOn ? (
        <TikTokPanel key={ttAcct ? ttAcct.id : "default"} accountId={ttAcct ? ttAcct.id : null} caption={p.caption || ""} onChange={onTt} />
      ) : null}
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

/* ── THE CALENDAR PLANNER (Eden, 2026-11-23): "allow them to pick the dates on the calendar ... pick multiple dates in one go
   and then adjust the time during each of the days". Tick the channels, tap (or drag across) days, set each day's times.
   Every ticked channel × every day × every time becomes one row, each channel with its OWN caption: the card's caption for
   its own channel, and the listing's other waiting captions (pipeCaptionsFor) for the rest. A channel with no caption is
   shown but cannot be ticked, which keeps the old rule that one channel's wording never goes out on another.
   "Move this post" (reschedule) keeps the one-row sheet above: it moves one post. */
type Days = Record<string, string[]>;
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayOf = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtT = (t: string) => { const [h, m] = t.split(":").map(Number); return (h % 12 || 12) + (m ? ":" + pad2(m) : "") + (h < 12 ? "am" : "pm"); };
const uniq = (ts: string[]) => [...new Set(ts.filter(Boolean))].sort();
const MAX_POSTS = 60;

function PlanSheet({ p, mode, base, nowAt }: { p: any; mode: string; base: number; nowAt: number }) {
  const today = new Date(nowAt); today.setHours(0, 0, 0, 0);
  const cardPlat: string | null = p.platform || (Array.isArray(p.channels) && p.channels.length === 1 ? p.channels[0] : null);
  const [caps, setCaps] = useState<Record<string, { contentId: string | null; caption: string }>>(() => {
    const sib = { ...((W().pipeCaptionsFor && W().pipeCaptionsFor(p.propertyId)) || {}), ...(p.captions || {}) };
    return cardPlat && p.caption ? { ...sib, [cardPlat]: { contentId: p.contentId || null, caption: p.caption } } : sib;
  });
  /* No channel on the card (an older post with no caption yet): any channel, as before. */
  const can = (plat: string) => !cardPlat || !!caps[plat];
  /* Channels with a caption first; the order is fixed when the sheet opens, so a chip does not jump when its caption arrives. */
  const [plats] = useState(() => schedPlats(cardPlat || (p.channels && p.channels[0]) || "instagram").sort((a, b) => Number(can(b)) - Number(can(a))));
  /* EVERY CHANNEL THAT ALREADY HAS A CAPTION STARTS TICKED (Eden: "if they've drafted content for 5 different platforms for the
     same property ... let all of them move"). Untick any that should wait. */
  const [on, setOn] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = { [cardPlat || (p.channels && p.channels[0]) || "instagram"]: true };
    /* Straight from the composer: exactly the channels just written, not older drafts as well. */
    if (p.captions) Object.keys(p.captions).forEach((c) => { o[c] = true; });
    else if (cardPlat) Object.keys(caps).forEach((c) => { if (plats.includes(c)) o[c] = true; });
    return o;
  });
  /* A channel with no caption yet is written on the spot (Eden: "help them generate it"), filed as a draft like the
     composer's, and ticked once it arrives. */
  const [writing, setWriting] = useState<Record<string, boolean>>({});
  const write = (c: string) => {
    if (writing[c]) return;
    setWriting((w) => ({ ...w, [c]: true })); setNote("");
    writeCaptions(p.propertyId, [c])
      .then((got) => { setCaps((x) => ({ ...x, ...got })); if (got[c]) setOn((o) => ({ ...o, [c]: true })); })
      .catch((e: any) => setNote((e && e.message) || "Couldn’t write that caption right now, please try again."))
      .then(() => setWriting((w) => ({ ...w, [c]: false })));
  };
  const anyWriting = Object.values(writing).some(Boolean);
  const [acct, setAcct] = useState<Record<string, string | null>>(() => Object.fromEntries(plats.map((c) => [c, firstAcct(c)])));
  const b0 = new Date(base);
  const [days, setDays] = useState<Days>(() => ({ [dateVal(b0)]: [timeVal(b0)] }));
  const [view, setView] = useState(() => new Date(b0.getFullYear(), b0.getMonth(), 1));
  const [allT, setAllT] = useState("09:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "now">("");
  const [tt, setTt] = useState<TikTokChoice>(null);
  const onTt = useCallback((c: TikTokChoice) => setTt(c), []);
  const story = useRef<HTMLInputElement>(null), camp = useRef<HTMLSelectElement>(null);
  const drag = useRef<boolean | null>(null);
  const campaigns: any[] = (W().SynCampaigns && W().SynCampaigns()) || [];

  const chans = plats.filter((c) => on[c] && can(c));
  const keys = Object.keys(days).sort();
  const slots = keys.reduce((n, k) => n + days[k].length, 0);
  const total = chans.length * slots;
  const ttAcct = on.tiktok ? (acctsFor("tiktok").find((a) => a.id === acct.tiktok)
    || acctsFor("tiktok").slice().sort((x, y) => String(x.connected_at || "").localeCompare(String(y.connected_at || "")))[0] || null) : null;
  const ttDirectOn = !!(ttAcct && ttAcct.direct_post);

  /* The time a newly picked day starts with: the last time used, so picking five days after setting 6pm gives five 6pms. */
  const lastT = () => { const k = keys[keys.length - 1]; return (k && days[k][0]) || timeVal(b0); };
  const setDay = (k: string, want: boolean) => setDays((d) => {
    if (want === !!d[k]) return d;
    const n = { ...d };
    if (want) n[k] = [lastT()]; else delete n[k];
    return n;
  });
  const pickMany = (ds: Date[]) => {
    if (!ds.length) return;
    const t = lastT();
    setDays((d) => { const n = { ...d }; ds.forEach((x) => { const k = dateVal(x); if (!n[k]) n[k] = [t]; }); return n; });
    setView(new Date(ds[0].getFullYear(), ds[0].getMonth(), 1));
  };
  const quick: [string, () => void][] = [
    ["Next 3 days", () => pickMany([1, 2, 3].map((n) => addDays(today, n)))],
    ["Mon, Wed, Fri", () => pickMany([1, 2, 3, 4, 5, 6, 7].map((n) => addDays(today, n)).filter((d) => [1, 3, 5].includes(d.getDay())))],
    ["Every other day, 2 weeks", () => pickMany([1, 3, 5, 7, 9, 11, 13].map((n) => addDays(today, n)))],
    ["This weekend", () => pickMany([0, 1, 2, 3, 4, 5, 6].map((n) => addDays(today, n)).filter((d) => d.getDay() === 6 || d.getDay() === 0))],
  ];
  const setTime = (k: string, i: number, v: string) => setDays((d) => { if (!v) return d; const ts = d[k].slice(); ts[i] = v; return { ...d, [k]: uniq(ts) }; });
  const addTime = (k: string) => setDays((d) => {
    const ts = d[k], last = ts[ts.length - 1] || "09:00";
    let h = Number(last.slice(0, 2)) + 6; if (h > 21) h = Math.max(7, Number(ts[0].slice(0, 2)) - 3);
    return { ...d, [k]: uniq(ts.concat(pad2(h) + ":00")) };
  });
  const dropTime = (k: string, i: number) => setDays((d) => ({ ...d, [k]: d[k].filter((_, j) => j !== i) }));
  const everyDay = (ts: string[]) => setDays((d) => Object.fromEntries(Object.keys(d).map((k) => [k, ts.slice()])));

  /* The calendar: Monday first, past days off, the picked ones filled with their time under the date. */
  const lead = (view.getDay() + 6) % 7, nDays = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const firstMonth = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();
  const cells: (Date | null)[] = Array.from({ length: lead }, (): Date | null => null).concat(Array.from({ length: nDays }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)));
  const touchMove = (e: React.PointerEvent) => {
    if (drag.current === null || e.pointerType === "mouse") return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const k = el && (el.closest("[data-day]") as HTMLElement | null)?.dataset.day;
    if (k && dayOf(k) >= today) setDay(k, drag.current);
  };
  useEffect(() => { const up = () => { drag.current = null; }; window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up); return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); }; }, []);

  function commit(now: boolean) {
    if (!plats.length) { setNote("Connect a channel under Channels first, then schedule to it."); return; }
    if (!chans.length) { setNote("Tick at least one channel."); return; }
    if (!now && !slots) { setNote("Pick at least one day on the calendar."); return; }
    const at = (k: string, t: string) => new Date(k + "T" + t);
    const past = now ? null : keys.flatMap((k) => days[k].map((t) => [k, t] as const)).find(([k, t]) => at(k, t).getTime() < Date.now());
    if (past) { setNote(dayOf(past[0]).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + " at " + fmtT(past[1]) + " has already passed. Pick a later time."); return; }
    if (!now && total > MAX_POSTS) { setNote("That is " + total + " posts. Keep it to " + MAX_POSTS + " at a time."); return; }
    const hasTt = chans.includes("tiktok");
    const ttNow = ttDirectOn ? tt : null;
    if (hasTt && ttNow && !ttNow.valid) { setNote(ttNow.reason); return; }
    const ttPayload = hasTt && ttNow && ttNow.valid ? { ...ttNow.tiktok, consent_at: new Date().toISOString() } : null;
    const nowIso = new Date().toISOString();
    const perChan = chans.map((c) => ({
      c,
      slots: (now ? [nowIso] : keys.flatMap((k) => days[k].map((t) => k + "T" + t))).map((a) => ({
        platform: c, accountId: acct[c] || null, at: a, ...(c === "tiktok" && ttPayload ? { tiktok: ttPayload } : {}),
      })),
    }));
    const list = perChan.flatMap((x) => x.slots);
    setNote(""); setBusy(now ? "now" : "save");
    const L = W().SynListings;
    const stories = !!(story.current && story.current.checked), campaignId = (camp.current && camp.current.value) || null;
    /* One call per channel, so each carries its own caption and links back to its own draft. In turn, not at once: the
       plan gate counts what is already queued. */
    const used: string[] = [];
    perChan.reduce((chain: Promise<any>, x) => chain.then(() => {
      const cap = caps[x.c] || { contentId: p.contentId || null, caption: p.caption || "" };
      if (cap.contentId) used.push(cap.contentId);
      return L.schedulePost({ propertyId: p.propertyId, contentId: cap.contentId || null, caption: cap.caption || "", mediaUrls: null, slots: x.slots, stories, campaignId });
    }), Promise.resolve())
      .then(() => {
        if (!now) return null;
        const sb = W().SynSB || {};
        return W().authToken().then((t: string) => fetch(sb.url + "/functions/v1/social-publish", {
          method: "POST", headers: { apikey: sb.key, Authorization: "Bearer " + t, "Content-Type": "application/json" },
          body: JSON.stringify({ live: true, limit: Math.min(50, list.length * 4) }),
        })).then((r: Response) => r.json().catch(() => ({})).then((j: any) => (r.ok ? j : { drainFailed: true, error: j && j.error })))
          .catch(() => ({ drainFailed: true }));
      })
      /* Every waiting caption that went out on a schedule leaves the approval column. A duplicated post's caption is already
         scheduled, so only drafts are touched. */
      .then((sent: any) => {
        const drafts = used.filter((id) => id !== p.contentId || mode === "approve");
        return Promise.all(drafts.map((id) => L.setContentStatus(id, "scheduled").catch(() => {}))).then(() => sent);
      })
      .then((sent: any) => {
        W().closeLead();
        report(mode, now, list, sent);
        if (now && sent && Number(sent.published) > 0) W().rememberStatusOffer?.(p.propertyId);
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

  const heading = mode === "duplicate" ? "Copy this post" : "Schedule this post";
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

      <div className="sch2-lbl">Post to</div>
      <div className="plan-chans" role="group" aria-label="Channels">
        {plats.map((c) => {
          const ok = can(c), isOn = !!on[c] && ok, busyC = !!writing[c];
          return (
            <button type="button" key={c} className={"plan-ch" + (isOn ? " on" : "") + (ok ? "" : " off") + (busyC ? " busy" : "")} aria-pressed={isOn}
              title={ok ? (caps[c] && c !== cardPlat ? "Uses this listing's " + chLabel(c) + " caption" : "") : "No " + chLabel(c) + " caption yet. Tap to write one."}
              onClick={() => { if (!ok) { write(c); return; } setNote(""); setOn((o) => ({ ...o, [c]: !o[c] })); }}>
              <span className="plan-tick" aria-hidden="true">{isOn ? "✓" : busyC ? "" : ok ? "" : "+"}</span>{chLabel(c)}
              {busyC ? <em>writing…</em> : ok ? null : <em>write caption</em>}
            </button>
          );
        })}
      </div>
      {chans.length && cardPlat ? (
        <details className="plan-caps">
          <summary>Read the {chans.length === 1 ? "caption" : chans.length + " captions"}</summary>
          {chans.map((c) => <div key={c}><b>{chLabel(c)}</b><p>{(caps[c] && caps[c].caption) || ""}</p></div>)}
        </details>
      ) : null}
      {chans.filter((c) => acctsFor(c).length >= 2).map((c) => (
        <label className="plan-acct" key={c}><span>{chLabel(c)} account</span>
          <select value={acct[c] || ""} onChange={(e) => setAcct((a) => ({ ...a, [c]: e.target.value }))}>
            {acctsFor(c).map((a) => <option key={a.id} value={a.id}>{acctLabel(a)}</option>)}
          </select>
        </label>
      ))}

      <div className="sch2-lbl">Days <span className="plan-hint">tap or drag across days to pick several</span></div>
      <div className="plan-cal">
        <div className="plan-mon">
          <button type="button" aria-label="Previous month" disabled={firstMonth} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>{"‹"}</button>
          <b>{view.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</b>
          <button type="button" aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>{"›"}</button>
        </div>
        <div className="plan-grid plan-wk" aria-hidden="true">{WD.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="plan-grid" onPointerMove={touchMove}>
          {cells.map((d, i) => {
            if (!d) return <span key={"e" + i} />;
            const k = dateVal(d), ts = days[k], gone = d < today;
            return (
              <button type="button" key={k} data-day={k} disabled={gone} aria-pressed={!!ts}
                className={"plan-day" + (ts ? " on" : "") + (d.getTime() === today.getTime() ? " today" : "")}
                aria-label={d.toDateString() + (ts ? ", picked" : "")}
                onPointerDown={(e) => { if (gone) return; if (e.pointerType !== "mouse") (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId); drag.current = !ts; setDay(k, !ts); }}
                onPointerEnter={() => { if (drag.current !== null && !gone) setDay(k, drag.current); }}
                onClick={(e) => { if (e.detail === 0) setDay(k, !ts); /* the keyboard; a tap already toggled on pointerdown */ }}>
                <span>{d.getDate()}</span>
                {ts ? <small>{ts.length > 1 ? ts.length + " times" : fmtT(ts[0])}</small> : null}
              </button>
            );
          })}
        </div>
        <div className="plan-quick">
          {quick.map(([l, f]) => <button type="button" key={l} className="sch2-q" onClick={f}>{l}</button>)}
          {keys.length ? <button type="button" className="sch2-q plan-clear" onClick={() => setDays({})}>Clear</button> : null}
        </div>
      </div>

      <div className="sch2-lbl">Times {keys.length ? "(" + keys.length + (keys.length === 1 ? " day)" : " days)") : ""}</div>
      {keys.length > 1 ? (
        <div className="plan-all">
          <span>Every day at</span>
          <input type="time" value={allT} aria-label="Time for every day" onChange={(e) => setAllT(e.target.value)} />
          <button type="button" className="sch2-q" onClick={() => everyDay([allT || "09:00"])}>Apply</button>
          <button type="button" className="sch2-q" onClick={() => everyDay(["09:00", "18:00"])}>9am + 6pm</button>
        </div>
      ) : null}
      <div className="plan-days">
        {keys.length ? keys.map((k) => {
          const d = dayOf(k);
          return (
            <div className="plan-row" key={k}>
              <div className="plan-d"><b>{d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}</b><span>{d.toLocaleDateString("en-GB", { month: "short" })}</span></div>
              <div className="plan-ts">
                {days[k].map((t, i) => (
                  <span className="plan-t" key={k + i}>
                    <input type="time" value={t} aria-label={"Time on " + d.toDateString()} onChange={(e) => setTime(k, i, e.target.value)} />
                    {days[k].length > 1 ? <button type="button" aria-label="Remove this time" onClick={() => dropTime(k, i)}>{"×"}</button> : null}
                  </span>
                ))}
                <button type="button" className="plan-add" onClick={() => addTime(k)}>+ time</button>
              </div>
              <button type="button" className="slot-x" aria-label="Remove this day" onClick={() => setDay(k, false)}>{"×"}</button>
            </div>
          );
        }) : <div className="plan-empty">Tap days on the calendar, or use a quick pick.</div>}
      </div>

      {on.tiktok && !(ttDirectOn && tt !== null) ? <div className="sch-note" title="Open TikTok, add a sound, and post it from there.">TikTok goes to your inbox as a draft.</div> : null}
      {on.tiktok && ttDirectOn ? <TikTokPanel key={ttAcct ? ttAcct.id : "default"} accountId={ttAcct ? ttAcct.id : null} caption={(caps.tiktok && caps.tiktok.caption) || p.caption || ""} onChange={onTt} /> : null}
      {campaigns.length ? (
        <label className="sch-camp"><span>Campaign</span>
          <select ref={camp} defaultValue=""><option value="">None</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.nm}</option>)}</select>
        </label>
      ) : null}
      {on.instagram && can("instagram") ? (
        <label className="sch2-story" title="Instagram does not allow a tappable link on a Story posted through the API, so this is reach, not clicks. It stays up for 24 hours.">
          <input type="checkbox" ref={story} /><span className="sw2" aria-hidden="true"></span>
          <span className="sch2-sl">Also on Instagram Stories<em>no link</em></span>
        </label>
      ) : null}
      <div className="sch-note">{note}</div>
      <div className="plan-foot">
        <div className="plan-sum">
          <b>{total ? total + (total === 1 ? " post" : " posts") : "Nothing picked yet"}</b>
          <span>{total ? slots + (slots === 1 ? " time" : " times") + " × " + chans.length + (chans.length === 1 ? " channel" : " channels") : "Pick a channel and a day"}</span>
        </div>
        <button className="btn btn-primary plan-save" disabled={!!busy || !total || anyWriting} onClick={() => commit(false)}>
          {busy === "save" ? "Saving…" : anyWriting ? "Writing…" : total ? "Schedule " + total : "Schedule"}
        </button>
      </div>
      <button type="button" className="sch2-ghost plan-now" disabled={!!busy || !chans.length}
        onClick={() => { if (!window.confirm(nowQuestion(chans.map((c) => ({ plat: c }) as Row)))) return; commit(true); }}>
        {busy === "now" ? "Sending…" : "Post now instead" + (chans.length > 1 ? " (" + chans.length + " channels)" : "")}
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
      showDrawer(mode === "reschedule"
        ? <Sheet p={p} mode={mode} base={base.getTime()} nowAt={nowAt} />
        : <PlanSheet p={p} mode={mode} base={base.getTime()} nowAt={nowAt} />, { bare: true });
    };
    window.addEventListener("syn:schedule", open);
    return () => window.removeEventListener("syn:schedule", open);
  }, []);
  return null;
}
