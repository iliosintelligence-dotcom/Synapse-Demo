"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONNECTABLE, COMING_LATER, accountsOn, botName, connectPages, disconnect, fetchAccounts, fetchReadiness, isExpired, loadPick, minutesLeft, newTelegramCode, readConnectResult, startConnect,
  stripConnectParams, suggestPages, telegramCodeStatus, telegramLinkStart, telegramLinkState, tileReady, type Account, type ConnectResult, type FbPick, type Readiness, type TgState,
} from "../data/channels";
import { goTo } from "./BillingPane";
import { useIntent } from "../intent";
import { useToast } from "../ui/Toast";
import s from "./Channels.module.css";

const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);

/** Where posts go: the agency's own accounts. Add one, see which are live, reconnect an expired one, disconnect. */
export function ChannelsPanel({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [ready, setReady] = useState<Readiness>({ platforms: null });
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<ConnectResult | null>(null);
  const [stash, setStash] = useState("");

  const load = useCallback(async () => {
    try { setAccounts(await fetchAccounts()); } catch { setAccounts([]); }
    onChanged();
  }, [onChanged]);
  useEffect(() => { void Promise.resolve().then(load); fetchReadiness().then(setReady); }, [load]);
  useIntent("add-channel", () => setAdding(true));

  // the outcome Facebook, TikTok or Telegram sent us back with: read once, then stripped so a reload cannot replay it
  useEffect(() => {
    const r = readConnectResult(window.location.search);
    if (!r) return;
    window.history.replaceState({}, "", stripConnectParams(window.location.search, window.location.pathname, window.location.hash));
    const t = setTimeout(() => {
      if (r.kind === "choose") { setStash(r.stash); setPick("facebook"); setAdding(true); } else if (r.kind === "ok") toast(r.message); else setResult(r);
    }, 0);
    return () => clearTimeout(t);
  }, [toast]);

  const go = async (platform: string) => {
    setBusy(platform);
    try { goTo(await startConnect(platform)); } catch (e) { toast(reason(e, "Could not open the connection."), "error"); setBusy(""); }
  };
  const remove = async (a: Account) => {
    setBusy(a.id);
    try { await disconnect(a.id); await load(); } catch (e) { toast(reason(e, "Could not disconnect."), "error"); } finally { setBusy(""); }
  };

  if (!accounts) return <section className={s.card}><p className={s.muted} aria-busy="true">Loading channels…</p></section>;
  const any = Object.keys(CONNECTABLE).some((p) => accountsOn(accounts, p).length);

  return (
    <section className={s.card} aria-label="Channels">
      <div className={s.head}><h2 className={s.h2}>Channels</h2>{!adding && <button type="button" className={s.btn} aria-expanded="false" onClick={() => setAdding(true)}>+ Add channel</button>}</div>

      {result?.kind === "failed" && (
        <div className={s.fail} role="alert">
          {result.help ? (
            <>
              <b>{result.help.what}</b>
              <ol>{result.help.steps.map((x) => <li key={x}>{x}</li>)}</ol>
              {result.detail && <div className={s.said}>Details: {result.detail}</div>}
              {result.help.retry && <button type="button" className={`${s.btn} ${s.solid}`} disabled={busy === "facebook"} onClick={() => void go("facebook")}>Connect Facebook again</button>}
            </>
          ) : <span className={s.said}>{result.message}</span>}
          <button type="button" className={s.x} aria-label="Dismiss" onClick={() => setResult(null)}>×</button>
        </div>
      )}

      <div className={s.list}>
        {!any && <div className={s.muted}>No channels connected. Until one is, anything scheduled is a rehearsal.</div>}
        {Object.keys(CONNECTABLE).flatMap((pl) => accountsOn(accounts, pl).map((a) => {
          const stale = isExpired(a);
          return (
            <div key={a.id} className={`${s.row} ${stale ? "" : s.on}`}>
              <b>{CONNECTABLE[pl]}</b>
              <span className={s.at}>{stale ? "session expired" : pl === "telegram" ? a.platform_username || "channel" : `@${a.platform_username || "connected"}`}</span>
              <button type="button" className={s.btn} disabled={busy === a.id} onClick={() => (stale && pl !== "telegram" ? void go(pl) : void remove(a))}>{stale ? "Reconnect" : "Disconnect"}</button>
            </div>
          );
        }))}
      </div>

      {adding && (
        <div className={s.add} role="group" aria-label="Add a channel">
          <div className={s.head}><b>Add a channel</b><button type="button" className={s.x} aria-label="Close" onClick={() => { setAdding(false); setPick(""); setStash(""); }}>×</button></div>
          <div className={s.picks}>
            {Object.keys(CONNECTABLE).map((pl) => {
              const ok = tileReady(ready, pl);
              return <button key={pl} type="button" aria-pressed={pick === pl} disabled={!ok} onClick={() => { setPick(pl); setStash(""); }}>{CONNECTABLE[pl]}{!ok && <em> not available yet</em>}</button>;
            })}
          </div>
          <div className={s.muted}>Coming later: {COMING_LATER.join(" · ")}</div>

          {stash ? <FacebookPicker stash={stash} onDone={async (msg) => { setStash(""); setAdding(false); setPick(""); toast(msg); await load(); }} onAgain={() => { setStash(""); void go("facebook"); }} />
            : pick === "facebook" || pick === "instagram" ? (
              <div className={s.step}>
                {pick === "instagram" && !ready.platforms?.instagram?.ready && <div className={s.note}><b>Instagram connects through Facebook.</b> Your Instagram has to be a professional account linked to this agency’s Facebook Page (on Facebook: your Page → Settings → Linked accounts). In the Facebook window, tick the Page <b>and</b> its Instagram account: both are connected together.</div>}
                <div className={s.note}>You will be sent to Facebook to sign in. Use the account that administers <b>this agency’s</b> Page; you are only ever offered the Pages that account manages.</div>
                <div><button type="button" className={`${s.btn} ${s.solid}`} disabled={busy !== ""} onClick={() => void go("facebook")}>Continue to Facebook →</button></div>
                <details className={s.help}><summary>Facebook says “App not active”?</summary><div className={s.note}>Synapse’s Facebook app is not open to everyone yet, so for now only Facebook accounts Synapse has added can connect. Check which Facebook profile you are signed in as: on a phone it is the profile in the Facebook app, and if you have switched into your Page’s profile, switch back to your own. If it is the right account, ask Synapse to add it.</div></details>
              </div>
            ) : pick === "tiktok" ? (
              <div className={s.step}>
                <div className={s.note}>You will be sent to TikTok to sign in. Use the TikTok account you post listings from.</div>
                <div className={s.note}><b>Check which account first.</b> TikTok connects whichever account is signed in to TikTok in this browser (or in the TikTok app, on a phone) without asking. <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer">Open TikTok ↗</a> and look at the profile picture; if it is not the listings account, switch there first, then come back.</div>
                <div className={s.note}>Posts arrive in that account’s <b>TikTok inbox</b> as drafts: open TikTok, add a sound, and post. The sound is most of what decides how far a TikTok goes.</div>
                <div><button type="button" className={`${s.btn} ${s.solid}`} disabled={busy !== ""} onClick={() => void go("tiktok")}>Continue to TikTok →</button></div>
              </div>
            ) : pick === "telegram" ? <TelegramSteps ready={ready} onConnected={load} onClose={() => { setAdding(false); setPick(""); }} /> : null}
        </div>
      )}
    </section>
  );
}

function FacebookPicker({ stash, onDone, onAgain }: { stash: string; onDone: (msg: string) => void | Promise<void>; onAgain: () => void }) {
  const [data, setData] = useState<FbPick | null>(null);
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    loadPick(stash).then((j) => { if (live) { setData(j); setChosen(suggestPages(j)); } }).catch((e) => live && setNote(reason(e, "Could not load the Pages Facebook shared.")));
    return () => { live = false; };
  }, [stash]);

  if (!data) return <div className={s.step}>{note ? <><div className={s.fail}>{note}</div><button type="button" className={`${s.btn} ${s.solid}`} onClick={onAgain}>Connect Facebook again</button></> : <div className={s.muted}>Loading the Pages Facebook shared…</div>}</div>;
  const pages = data.pages ?? [];
  const who = data.agency ? `${data.agency}’s` : "this agency’s";
  const ids = Object.keys(chosen).filter((k) => chosen[k]);
  const go = async () => {
    setBusy(true); setNote("");
    try {
      const j = await connectPages(stash, ids);
      const gotIg = (j.connected ?? []).some((c) => /^Instagram /.test(c));
      await onDone(`Connected ${(j.connected ?? []).join(", ")} to ${j.agency || "this agency"}${j.problems?.length ? `. Not saved: ${j.problems.join("; ")}` : "."}${gotIg ? "" : " No Instagram came with it: Add channel → Instagram says how to link one."}`);
    } catch (e) { setNote(reason(e, "Could not connect those Pages.")); setBusy(false); }
  };
  return (
    <div className={s.step}>
      <div className={s.note}><b>Which of these are {who}?</b> Facebook shared {pages.length} Page{pages.length === 1 ? "" : "s"}. Tick only {who}; anything left unticked is not connected.</div>
      <div className={s.pages}>
        {pages.map((pg) => {
          const elsewhere = !!pg.connected && pg.connected !== "here";
          return (
            <label key={pg.id} className={`${s.page} ${elsewhere ? s.dim : ""}`}>
              <input type="checkbox" checked={!!chosen[pg.id]} disabled={elsewhere || busy} onChange={(e) => setChosen((c) => ({ ...c, [pg.id]: e.target.checked }))} />
              <span>{pg.name || pg.id}{pg.instagram ? <i> + Instagram {pg.instagram}</i> : <i> · no Instagram came with it</i>}</span>
              {pg.connected && <span className={s.at}>{pg.connected === "here" ? "already here" : `on ${pg.connected}`}</span>}
            </label>
          );
        })}
      </div>
      <div className={s.row2}><button type="button" className={`${s.btn} ${s.solid}`} disabled={!ids.length || busy} onClick={() => void go()}>{busy ? "Connecting…" : ids.length ? `Connect ${ids.length} Page${ids.length === 1 ? "" : "s"}` : "Tick a Page"}</button></div>
      <details className={s.help}><summary>The Page you want is not here?</summary><div className={s.note}>Facebook only shares the Pages you allowed Synapse before, and on a second connect it skips asking. To choose afresh: on Facebook, Settings &amp; privacy → Settings → <b>Business integrations</b> → remove Synapse. Then Add channel → Facebook here, and tick every Page you run. You still choose which are this agency’s on this screen.</div></details>
      {note && <div className={s.fail} role="status">{note}</div>}
    </div>
  );
}

function TelegramSteps({ ready, onConnected, onClose }: { ready: Readiness; onConnected: () => void | Promise<void>; onClose: () => void }) {
  const [bot, setBot] = useState(botName(ready));
  const [code, setCode] = useState("");
  const [exp, setExp] = useState(0);
  const [st, setSt] = useState<TgState>("");
  const [channel, setChannel] = useState("");
  const [deleted, setDeleted] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [linked, setLinked] = useState<{ telegram_username?: string; first_name?: string } | null | undefined>(undefined);
  const [linkWait, setLinkWait] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const codeRef = useRef("");
  const [copied, setCopied] = useState("Copy");

  const fresh = useCallback(async () => {
    setBusy("code"); setNote(""); setSt(""); setCode(""); codeRef.current = ""; setChannel("");
    try {
      const j = await newTelegramCode();
      setCode(j.code ?? ""); codeRef.current = j.code ?? ""; setExp(Date.now() + (j.expires_in || 900) * 1000); setSt("waiting");
      if (j.bot && /^@[A-Za-z0-9_]{5,32}$/.test(j.bot)) setBot(j.bot);
    } catch (e) { setNote(reason(e, "Could not get a code just now.")); }
    setBusy("");
  }, []);

  // open: one code, and the link state once for the Story-kit line
  useEffect(() => {
    void Promise.resolve().then(fresh);
    telegramLinkState().then((j) => { setLinked(j.linked ?? null); }).catch(() => setLinked(null));
  }, [fresh]);

  // watch for the code every few seconds while this is open and visible; stops when it runs out
  useEffect(() => {
    if (!code || !(st === "waiting" || st === "working" || st === "error" || linkWait)) return;
    const until = Math.max(Date.now() + 60000, exp + 10000);
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() > until) return;
      const mine = codeRef.current;
      if (mine && (st === "waiting" || st === "working" || st === "error")) {
        try {
          const j = await telegramCodeStatus(mine);
          if (mine !== codeRef.current) return; // a new code was issued meanwhile
          setSt(j.status ?? "waiting"); setNote(j.status === "error" ? j.error || "That did not work." : "");
          if (j.status === "connected") { setChannel(j.channel ?? ""); setDeleted(j.code_post_deleted !== false); setCode(""); codeRef.current = ""; await onConnected(); }
        } catch { /* a missed poll is retried in three seconds */ }
      }
      if (linkWait) telegramLinkState().then((j) => { setLinked(j.linked ?? null); if (j.linked) setLinkWait(false); }).catch(() => {});
      setNowMs(Date.now());
    };
    const h = setInterval(() => void check(), 3000);
    window.addEventListener("focus", check);
    return () => { clearInterval(h); window.removeEventListener("focus", check); };
  }, [code, st, exp, linkWait, onConnected]);

  const link = async () => {
    // opened before the server answers: a window opened after an await is a popup, and phones block those
    let w: Window | null = null;
    try { w = window.open("", "_blank"); } catch { w = null; }
    setBusy("link");
    try { const j = await telegramLinkStart(); if (w && !w.closed) w.location.href = j.url; else goTo(j.url); setLinkWait(true); } catch (e) { w?.close(); setNote(reason(e, "Could not start the link.")); }
    setBusy("");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`/connect ${code}`); setCopied("Copied"); } catch { setCopied("Select it"); }
    setTimeout(() => setCopied("Copy"), 2200);
  };

  const lapsed = st === "expired" || st === "unknown" || (!!code && (st === "waiting" || st === "error") && nowMs > exp);
  const botSlug = bot.replace(/^@/, "");
  return (
    <div className={s.step}>
      {st === "connected" ? (
        <>
          <div className={s.okline}>✓ Connected <b>{channel || "your channel"}</b></div>
          {!deleted && <div className={s.note}>The bot could not delete the <code>/connect</code> post. Delete it from the channel yourself, so your followers do not see it.</div>}
          <div className={s.row2}><button type="button" className={`${s.btn} ${s.solid}`} onClick={onClose}>Done</button><button type="button" className={s.btn} onClick={() => void fresh()}>Connect another channel</button></div>
        </>
      ) : (
        <>
          <div className={s.note}><b>1. Add the bot to your channel.</b> Telegram opens and asks which channel. <b>Post Messages</b> and <b>Delete Messages</b> are already ticked; Delete is only used to remove the code you post in step 2.</div>
          <div><a className={s.btn} target="_blank" rel="noopener noreferrer" href={`https://t.me/${encodeURIComponent(botSlug)}?startchannel&admin=post_messages+delete_messages`}>Add {bot} ↗</a></div>
          <div className={s.note}><b>2. Post this in the channel.</b> As an ordinary post in the channel itself, not in a chat with the bot. It connects the channel and disappears.</div>
          {busy === "code" || (!code && !note) ? <div className={s.muted}>Getting your code…</div>
            : lapsed ? <div className={s.muted}>That code has expired. <button type="button" className={s.link} onClick={() => void fresh()}>Get a new one</button></div>
            : code ? (
              <>
                <div className={s.code}><code>/connect {code}</code><button type="button" className={s.btn} onClick={() => void copy()}>{copied}</button></div>
                <div className={s.muted}>{st === "working" ? "Got it. Connecting…" : st === "error" ? "Fix that, then post the same code again." : `Watching for it · expires in ${minutesLeft(exp, nowMs)} min`} · <button type="button" className={s.link} onClick={() => void fresh()}>New code</button></div>
              </>
            ) : <div><button type="button" className={s.btn} onClick={() => void fresh()}>Try again</button></div>}
        </>
      )}
      {linked === null ? (
        <div className={s.note}><b>Optional: Story kits.</b> Bots cannot post Telegram Stories, so after each post we can send you the photo and link to share as a Story in a tap. Link your Telegram to get them.
          <div><button type="button" className={s.btn} disabled={busy === "link"} onClick={() => void link()}>{busy === "link" ? "Opening…" : "Link Telegram ↗"}</button>{linkWait && <span className={s.muted}> Press Start in Telegram, then come back.</span>}</div></div>
      ) : linked ? <div className={s.okline}>✓ Story kits come to you on Telegram as <b>{linked.telegram_username ? `@${linked.telegram_username}` : linked.first_name || "your Telegram account"}</b></div> : null}
      {note && <div className={s.fail} role="status">{note}</div>}
    </div>
  );
}
