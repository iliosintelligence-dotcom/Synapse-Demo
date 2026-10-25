"use client";
/**
 * The social channels, as React (was the "connected channels" half of the campaign generator's block in
 * src/legacy/agency/inline-3.js): the strip of connected accounts, Add channel (Facebook and Instagram through Meta's login,
 * TikTok, Telegram's bot-and-code), answering comments with the link, what came back from a connection (?connected=), and
 * the "things only a person can do" tasks a connection leaves behind.
 *
 * The steps and their words are the old ones, unchanged: Meta's flow in particular is exactly as it was (social-connect
 * action=start, then the Page chooser on ?connected=choose, then action=facebook-pick). Nothing here ever sees a token --
 * social-connect keeps it in Vault and this page only learns that a row exists.
 *
 * Told to the rest of the page, as before: window.SOCIAL_ACCOUNTS (the scheduler reads it), SYN_CONNECTED / SYN_EXPIRED (which
 * platforms can be posted as, and which need a reconnect), openAddChannel(pl) (the setup ring and the channel task call it),
 * and setTasks('channels', ...) for the tasks.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const sbUrl = (): string => (W().SynSB && W().SynSB.url) || "";
const sbKey = (): string => (W().SynSB && W().SynSB.key) || "";
export const toastOrAlert = (msg: string) => { if (typeof W().toast === "function") W().toast(msg); else alert(msg); };
/* For the task bodies, which the task card renders as markup. */
const esc = (s: unknown) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const CONNECTABLE: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", telegram: "Telegram", tiktok: "TikTok" };
const SOON: Record<string, [string, string]> = {
  linkedin: ["LinkedIn", "not built yet"],
  x: ["X (your X posts go out on Synapse’s X for now)", "not built yet"],
};

type Acct = { id: string; platform: string; platform_username?: string | null; is_active?: boolean; token_expires_at?: string | null;
  connected_at?: string | null; page_cta_type?: string | null; page_cta_url?: string | null };
/* The Pages Facebook shared, waiting for this agency to say which are its own (social-connect action=facebook-pick). id is the stash. */
type Fbp = { id: string; data: any; chosen: Record<string, boolean>; busy: boolean; note: string };
/* linked: undefined = not asked yet, null = not linked, object = linked. code/exp/st: the "/connect CODE" this person was given,
   when it runs out, and what the server last said about it (waiting, working, connected, error, expired). mins: the minutes
   left as last drawn, so the countdown moves once a minute. */
type Tg = { linked: any; note: string; busy: string; code: string; exp: number; st: string; channel: string; deleted: boolean; linkWait: boolean; mins: number };
type Help = { what: string; steps: string[]; retry: boolean };
type ConnErr = { msg: string; help: Help | null; detail: string };
type St = {
  accounts: Acct[];
  /* True once the account list has actually been read. An empty list from a failed fetch is not "no channels", and must not
     trigger the getting-started ask. */
  known: boolean;
  /* Which platforms this PROJECT can connect at all -- our setup, not the agency's. Null means "not asked yet or the ask
     failed", and every platform renders as it always did: a status endpoint having a bad minute must not strip working
     buttons out of the portal. */
  ready: Record<string, any> | null;
  bot: string;
  add: { open: boolean; pick: string };
  fbp: Fbp; tg: Tg;
  reply: any; replyOpen: boolean;
  drawn: boolean; role: string; brandTick: number;
  err: ConnErr | null;
};
const FBP0 = (): Fbp => ({ id: "", data: null, chosen: {}, busy: false, note: "" });
/* Telegram has no OAuth for posting. A bot is added as an administrator of a channel and may then post there. */
let state: St = {
  accounts: [], known: false, ready: null, bot: "@SynapseListingsBot",
  add: { open: false, pick: "" }, fbp: FBP0(),
  tg: { linked: undefined, note: "", busy: "", code: "", exp: 0, st: "", channel: "", deleted: true, linkWait: false, mins: 0 },
  reply: null, replyOpen: false, drawn: false, role: "", brandTick: 0, err: null,
};
const subs = new Set<() => void>();
const set = (v: Partial<St>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const setTg = (v: Partial<Tg>) => set({ tg: { ...state.tg, ...v } });
const setFbp = (v: Partial<Fbp>) => set({ fbp: { ...state.fbp, ...v } });
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useChannels = () => useSyncExternalStore(subscribe, () => state, () => state);
let tgPoll: ReturnType<typeof setInterval> | null = null, tgUntil = 0;

function platformReady(pl: string) {
  const ready = state.ready;
  if (!ready) return true;                  // unknown: behave as before
  return !ready[pl] || ready[pl].ready !== false;
}

function loadConnectStatus() {
  return fetch(sbUrl() + "/functions/v1/social-connect?action=status", { headers: { apikey: sbKey() } })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const ready = (j && j.platforms) || null;
      /* The handle of the bot actually holding our token, so the instruction names the account Telegram will check for. */
      const b = ready && ready.telegram && ready.telegram.bot;
      set({ ready, ...(typeof b === "string" && /^@[A-Za-z0-9_]{5,32}$/.test(b) ? { bot: b } : {}) });
    })
    .catch(() => set({ ready: null }));
}

export function token(): Promise<string | null> {
  if (!W().SynAuth) return Promise.resolve(null);
  return W().SynAuth.client().then((c: any) => c.auth.getSession())
    .then((r: any) => (r && r.data && r.data.session && r.data.session.access_token) || null)
    .catch(() => null);
}

function loadReplySettings() {
  const L = W().SynListings;
  if (!L || !L.getReplySettings) return Promise.resolve();
  return L.getReplySettings()
    .then((row: any) => set({ reply: row || { enabled: false, keyword: "PRICE", message: "" } }))
    /* A failed read must not remove the channel strip around it. */
    .catch(() => set({ reply: null }));
}

/* WHICH PLATFORMS THIS AGENCY CAN ACTUALLY POST AS: usable, not merely present -- an expired token is a row, not a channel, and
   the scheduler must not queue a post onto it. Published separately from the lapsed ones because the two need different words
   and a different fix: "never connected" is solved by OAuth, "the token lapsed" by reconnecting an account already listed. */
function publishConnected(accounts: Acct[]) {
  W().SYN_CONNECTED = accounts.filter((a) => a && a.platform && !expired(a)).map((a) => a.platform);
  W().SYN_EXPIRED = accounts.filter((a) => a && a.platform && expired(a)).map((a) => a.platform);
}

export function loadChannels(): Promise<void> {
  /* The status first, so the strip is drawn once and correctly. Drawing it twice -- buttons, then buttons removed a moment
     later -- is worse than drawing it late. */
  const none = () => { W().SOCIAL_ACCOUNTS = []; publishConnected([]); set({ accounts: [], known: false, drawn: true }); };
  return loadConnectStatus()
    .then(() => loadReplySettings())
    .then(() => token()).then((t) => {
      if (!t) { none(); return; }
      let ok = false;
      return fetch(sbUrl() + "/rest/v1/social_accounts"
          + "?select=id,platform,platform_username,is_active,token_expires_at,connected_at"
          + ",page_cta_type,page_cta_url"
          + "&is_active=eq.true&deleted_at=is.null", {
          headers: { apikey: sbKey(), Authorization: "Bearer " + t },
        })
        .then((r) => { ok = r.ok; return r.ok ? r.json() : []; })
        .then((rowsIn: Acct[]) => {
          const accounts = rowsIn || [];
          /* The scheduler reads these rows and must not fetch them again: two copies of the same list drift. */
          W().SOCIAL_ACCOUNTS = accounts;
          publishConnected(accounts);
          set({ accounts, known: ok, drawn: true });
        })
        .catch(none);
    });
}

/* Kept: liveCount() and the publish-readiness checks ask "is there one at all". */
export function connectedTo(platform: string): Acct | null {
  return state.accounts.find((a) => a.platform === platform) || null;
}
/* All of them, oldest first -- the same order social-publish uses to choose the default when a post names no account. */
function accountsOn(platform: string) {
  return state.accounts.filter((a) => a.platform === platform)
    .sort((x, y) => String(x.connected_at || "").localeCompare(String(y.connected_at || "")));
}
export function expired(a: Acct | null) {
  return !!(a && a.token_expires_at && new Date(a.token_expires_at) < new Date());
}
/** Usable connections only. An expired token is a row, not a channel. */
export function liveCount() {
  return Object.keys(CONNECTABLE).filter((pl) => { const a = connectedTo(pl); return a && !expired(a); }).length;
}
/* ANY MEMBER (2026-09-25): an agency can hold several accounts per platform and a post names which one it goes to, so an agent
   connecting the account they already run speaks for nobody else. social-connect enforces the same three roles server-side;
   this only decides whether the button is drawn. The role is stamped on <body> by applyRole(). */
function canConnect() {
  const r = document.body.dataset.role;
  return r === "agent" || r === "agency_owner" || r === "agency_admin";
}
function canSetReplies() {
  const r = document.body.dataset.role;
  return r === "agency_owner" || r === "agency_admin";
}
/* The logos live in SynIcons.BRAND, not the data-icon set; brand() returns the markup. */
const markHtml = (pl: string, size = 16) => (W().SynIcons && W().SynIcons.brand ? W().SynIcons.brand(pl, { size }) : "");
export const Mark = ({ pl, size, fallback, cls }: { pl: string; size?: number; fallback?: string; cls?: string }) => {
  const h = markHtml(pl, size || 16);
  return h ? <span className={cls || "cmp-ch-ic"} dangerouslySetInnerHTML={{ __html: h }} /> : <span className={cls || "cmp-ch-ic"}>{fallback || ""}</span>;
};

/* ── connecting and disconnecting ────────────────────────────────────── */
function startConnect(platform: string): Promise<void> {
  if (!CONNECTABLE[platform]) return Promise.resolve();
  return token().then((t) => {
    if (!t) throw new Error("Sign in again to connect an account.");
    return fetch(sbUrl() + "/functions/v1/social-connect?action=start&platform=" + encodeURIComponent(platform), {
      headers: { apikey: sbKey(), Authorization: "Bearer " + t },
    }).then((r) => r.json().then((j) => {
      if (!r.ok) throw new Error(j.error || ("Could not start the connection (" + r.status + ")."));
      return j;
    }));
  }).then((j: any) => {
    if (!j.url) throw new Error("The connect flow returned no URL.");
    /* Full navigation, not a popup: the OAuth callback comes back as a 302 to this portal, and a popup that a blocker kills
       leaves the agency staring at a button that did nothing. */
    window.location.href = j.url;
  });
}

function ConnectButton({ platform, children }: { platform: string; children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    setBusy(true);
    startConnect(platform).catch((err) => { setBusy(false); toastOrAlert(err.message || "Could not open the connection."); });
  };
  return <button type="button" className="cmp-ch-btn primary" data-connect={platform} disabled={busy} onClick={go}>{busy ? "Opening…" : children}</button>;
}

function DisconnectButton({ id, stale, onDone }: { id: string; stale: boolean; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    setBusy(true);
    token().then((t) => {
      if (!t) throw new Error("Sign in again.");
      return fetch(sbUrl() + "/rest/v1/rpc/disconnect_social_account", {
        method: "POST",
        headers: { apikey: sbKey(), Authorization: "Bearer " + t, "Content-Type": "application/json" },
        body: JSON.stringify({ p_account_id: id }),
      });
    }).then((r) => {
      if (!r.ok) throw new Error("Could not disconnect (" + r.status + ").");
      return loadChannels();
    }).then(() => { setBusy(false); if (onDone) onDone(); })
      .catch((err) => { setBusy(false); toastOrAlert(err.message || "Could not disconnect."); });
  };
  return <button className="cmp-ch-btn" data-disconnect={id} disabled={busy} onClick={go}>{busy ? "Working…" : stale ? "Reconnect" : "Disconnect"}</button>;
}

/* ── Facebook: which Pages are this agency's (2026-09-28) ────────────────
   Facebook's answer is not a decision about this agency. It shares whatever Pages the account allowed Synapse before, and on a
   second connect it skips its own list -- so connecting as Greenlight quietly attached Iteriba's Page again. Now nothing is
   connected until the person ticks it here. A Page whose name shares a word with the agency's is ticked for them. */
function tgApi(action: string, opts?: RequestInit): Promise<any> {
  return token().then((t) => {
    if (!t) throw new Error("Sign in again to connect a channel.");
    return fetch(sbUrl() + "/functions/v1/social-connect?action=" + action, Object.assign({
      headers: { apikey: sbKey(), Authorization: "Bearer " + t, "Content-Type": "application/json" },
    }, opts || {}));
  }).then((r) => r.json().catch(() => ({})).then((j: any) => {
    if (!r.ok) {
      const e: any = new Error(j.error || ("Telegram step failed (" + r.status + ")."));
      e.body = j; throw e;
    }
    return j;
  }));
}

function fbpLoad() {
  setFbp({ data: null, note: "", chosen: {} });
  tgApi("facebook-pick&pick=" + encodeURIComponent(state.fbp.id)).then((j) => {
    /* Tick a Page that shares a word with the agency's name -- the distinctive word, not "real" or "estate". */
    const COMMON = ["real", "estate", "estates", "property", "properties", "homes", "realty", "limited", "agency", "group", "the", "and"];
    const words = String(j.agency || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && COMMON.indexOf(w) === -1);
    const chosen: Record<string, boolean> = {};
    (j.pages || []).forEach((pg: any) => {
      if (pg.connected && pg.connected !== "here") return;
      const nm = String(pg.name || "").toLowerCase();
      if (words.some((w) => nm.indexOf(w) > -1)) chosen[pg.id] = true;
    });
    setFbp({ data: j, chosen });
  }).catch((e) => setFbp({ data: null, note: e.message || "Could not load the Pages Facebook shared." }));
}

function fbpConnect() {
  const F = state.fbp;
  const ids = Object.keys(F.chosen).filter((k) => F.chosen[k]);
  if (!ids.length || F.busy) return;
  setFbp({ busy: true, note: "" });
  tgApi("facebook-pick", { method: "POST", body: JSON.stringify({ pick: F.id, page_ids: ids }) })
    .then((j) => {
      /* Names the agency, so a Page attached to the wrong one is obvious the moment it happens. */
      const gotIg = (j.connected || []).some((c: string) => /^Instagram /.test(c));
      toastOrAlert("Connected " + (j.connected || []).join(", ") + " to " + (j.agency || "this agency")
        + ((j.problems || []).length ? ". Not saved: " + j.problems.join("; ") : ".")
        + (gotIg ? "" : " No Instagram came with it: Add channel → Instagram says how to link one."));
      set({ fbp: FBP0(), add: { open: false, pick: "" } });
      return loadChannels();
    })
    .catch((e) => setFbp({ busy: false, note: e.message || "Could not connect those Pages." }));
}

/* ── Telegram in two steps: add the bot, post a code ─────────────────────
   Posting in a channel needs the right to post there, so a code that arrives FROM a channel is the proof the channel is theirs.
   The bot deletes the code post, which is the only thing its Delete right is for. Linking a Telegram account is still offered,
   lower down and optional: bots cannot post Stories, so a Story kit is sent privately to whoever connected the channel. */
const tgMinsLeft = () => (state.tg.exp ? Math.max(0, Math.ceil((state.tg.exp - Date.now()) / 60000)) : 0);
function tgBot(j: any) { if (j && typeof j.bot === "string" && /^@[A-Za-z0-9_]{5,32}$/.test(j.bot)) set({ bot: j.bot }); }
/* The countdown moves once a minute; everything else redraws when it changes. */
function tgPaint() { const m = tgMinsLeft(); if (m !== state.tg.mins) setTg({ mins: m }); }

function tgNewCode() {
  setTg({ busy: "code", note: "", st: "", code: "", channel: "" });
  return tgApi("telegram-code", { method: "POST", body: "{}" }).then((j) => {
    setTg({ code: j.code || "", exp: Date.now() + (j.expires_in || 900) * 1000, st: "waiting" });
    tgBot(j);
    tgWatch(true);
  }).catch((e) => setTg({ note: e.message || "Could not get a code just now." }))
    .then(() => { setTg({ busy: "" }); tgPaint(); });
}

/* Has the code been posted, and what came of it. Only asked while there is something to wait for. */
function tgCheck(): Promise<void> {
  const code = state.tg.code, s = state.tg.st;
  if (!code || !(s === "waiting" || s === "working" || s === "error")) { tgPaint(); return Promise.resolve(); }
  return tgApi("telegram-code-status?code=" + encodeURIComponent(code)).then((j) => {
    if (code !== state.tg.code) return;              // a new code was issued meanwhile
    setTg({ st: j.status || "waiting", note: j.status === "error" ? (j.error || "That did not work.") : "" });
    if (j.status === "connected") {
      setTg({ channel: j.channel || "", deleted: j.code_post_deleted !== false, code: "" });
      tgWatch(false);
      return loadChannels();
    }
  }).catch(() => { /* a missed poll is retried in three seconds */ }).then(tgPaint);
}

function tgLinkState() {
  return tgApi("telegram-link").then((j) => {
    setTg({ linked: j.linked || null, ...(j.linked ? { linkWait: false } : {}) });
    tgBot(j);
  }).catch(() => { if (state.tg.linked === undefined) setTg({ linked: null }); }).then(tgPaint);
}

/* WATCHED WHILE OPEN. The code is posted in another app, so the panel asks every few seconds while it is open and visible, and
   the moment the tab regains focus. It stops when the code runs out. */
function tgWatch(on: boolean) {
  if (tgPoll) clearInterval(tgPoll);
  tgPoll = null;
  if (!on) return;
  tgUntil = Math.max(Date.now() + 60000, (state.tg.exp || 0) + 10000);
  tgPoll = setInterval(() => {
    if (!state.add.open || state.add.pick !== "telegram" || Date.now() > tgUntil) { tgWatch(false); tgPaint(); return; }
    if (document.visibilityState !== "visible") return;
    tgCheck();
    if (state.tg.linkWait) tgLinkState();
  }, 3000);
}

/* Opening Telegram's pick: a fresh code unless the last one is still good, and the link state once, for the Story-kit line. */
function tgOpen() {
  if (state.tg.st === "connected") setTg({ st: "", channel: "" });
  if (state.tg.linked === undefined) tgLinkState();
  if (!state.tg.code || Date.now() > state.tg.exp - 60000) { tgNewCode(); return; }
  tgWatch(true); tgCheck();
}

function tgLinkStart() {
  /* Opened now, inside the click, and pointed at Telegram once the server answers: a window opened after an await is a popup,
     and phones block those. */
  let w: Window | null = null;
  try { w = window.open("", "_blank"); } catch { w = null; }
  setTg({ busy: "link" });
  tgApi("telegram-link-start", { method: "POST", body: "{}" }).then((j) => {
    if (w && !w.closed) w.location.href = j.url; else window.location.href = j.url;
    setTg({ linkWait: true });
    if (!tgPoll) tgWatch(true);
  }).catch((e) => {
    if (w && !w.closed) w.close();
    setTg({ note: e.message || "Could not start the link." });
  }).then(() => { setTg({ busy: "" }); tgPaint(); });
}

function closeAdd() {
  tgWatch(false);
  set({ add: { open: false, pick: "" }, fbp: FBP0(), ...(state.tg.st === "connected" ? { tg: { ...state.tg, st: "", channel: "" } } : {}) });
}

/* Somewhere else on the page (the setup ring, the channel task) can send somebody straight here: Social studio, the add panel open. */
export function openAddChannel(pl?: string) {
  if (typeof W().goToPane === "function") W().goToPane("social");
  set({ add: { open: true, pick: pl && CONNECTABLE[pl] ? pl : state.add.pick } });
  if (state.add.pick === "telegram") tgOpen();
  setTimeout(() => {
    const el = document.getElementById("chAdd");
    if (!el) return;
    if (el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const b = el.querySelector(".ch-pick:not([disabled])") as HTMLElement | null;
    if (b) { try { b.focus({ preventScroll: true }); } catch { b.focus(); } }
  }, 380);
}

/* "APP NOT ACTIVE" IS FACEBOOK'S PAGE, NOT OURS. Nothing comes back from it, so this is the only place it can be explained. While
   Synapse's Meta app is in Development mode, only Facebook accounts with a role on the app may log in through it. */
const AppNotActive = () => (
  <details className="fbp-help"><summary>Facebook says “App not active”?</summary>
    <div className="cmp-ch-note">Synapse’s Facebook app is not open to everyone yet, so for now only Facebook accounts Synapse has added can connect. Check which Facebook profile you are signed in as: on a phone it is the profile in the Facebook app, and if you have switched into your Page’s profile, switch back to your own. If it is the right account, ask Synapse to add it.</div></details>
);

function FbPick() {
  const { fbp: F } = useChannels();
  if (!F.data) {
    if (F.note) {
      return <div className="ch-step"><div className="cmp-setup-why" role="status">{F.note}</div>
        <div><ConnectButton platform="facebook">Connect Facebook again</ConnectButton></div></div>;
    }
    return <div className="ch-step"><div className="ch-tg-wait">Loading the Pages Facebook shared…</div></div>;
  }
  const d = F.data, pages: any[] = d.pages || [];
  const who = d.agency ? d.agency + "’s" : "this agency’s";
  const n = Object.keys(F.chosen).filter((k) => F.chosen[k]).length;
  return (
    <div className="ch-step">
      <div className="cmp-ch-note"><b>Which of these are {who}?</b> Facebook shared {pages.length} Page{pages.length === 1 ? "" : "s"}. Tick only {who}; anything left unticked is not connected.</div>
      <div className="ch-tg-list">
        {pages.map((pg) => {
          const elsewhere = pg.connected && pg.connected !== "here";
          return (
            <label key={pg.id} className={"ch-tg-item fbp-item" + (elsewhere ? " dim" : "")}>
              <input type="checkbox" data-fbp={pg.id} checked={!!F.chosen[pg.id]} disabled={!!elsewhere || F.busy}
                onChange={(e) => setFbp({ chosen: { ...state.fbp.chosen, [pg.id]: e.target.checked } })} />
              <Mark pl="facebook" />
              {/* Said when absent too: a Page connecting without its Instagram was silent, and read as "Instagram is not posting". */}
              <span className="ch-tg-nm">{pg.name || pg.id}{pg.instagram ? <> <i>+ Instagram {pg.instagram}</i></> : <> <i>· no Instagram came with it</i></>}</span>
              {pg.connected ? <span className="cmp-ch-at">{pg.connected === "here" ? "already here" : "on " + pg.connected}</span> : null}
            </label>
          );
        })}
      </div>
      <div className="ch-tg-acts">
        <button type="button" className="cmp-ch-btn primary" data-fbp-go="" disabled={!(n && !F.busy)} onClick={fbpConnect}>
          {F.busy ? "Connecting…" : n ? "Connect " + n + " Page" + (n === 1 ? "" : "s") : "Tick a Page"}</button>
        <button type="button" className="cmp-ch-btn" data-ch-close="" onClick={closeAdd}>Cancel</button>
      </div>
      <details className="fbp-help"><summary>The Page you want is not here?</summary>
        <div className="cmp-ch-note">Facebook only shares the Pages you allowed Synapse before, and on a second connect it skips asking. To choose afresh: on Facebook, Settings &amp; privacy → Settings → <b>Business integrations</b> → remove Synapse. Then Add channel → Facebook here, and tick every Page you run. You still choose which are this agency’s on this screen.</div></details>
      <div className="cmp-setup-why" role="status" aria-live="polite">{F.note || ""}</div>
    </div>
  );
}

/* WHOSE ACCOUNT, said before the redirect and not after the mistake. Facebook offers the Pages of whoever is signed into
   facebook.com in this browser; nothing downstream can detect the wrong one, so it is said here, where the button is. */
function MetaStep({ pl }: { pl: string }) {
  const { fbp } = useChannels();
  if (fbp.id) return <FbPick />;
  /* INSTAGRAM THROUGH FACEBOOK: the Facebook connection returns the Page AND the Instagram professional account linked to it. */
  if (pl === "instagram" && !platformReady("instagram")) {
    return (
      <div className="ch-step">
        <div className="cmp-ch-note"><b>Instagram connects through Facebook.</b> Your Instagram has to be a professional account linked to this agency’s Facebook Page (on Facebook: your Page → Settings → Linked accounts). In the Facebook window, tick the Page <b>and</b> its Instagram account: both are connected together.</div>
        <div className="cmp-ch-note">Sign in with the Facebook account that administers the Page.</div>
        <div><ConnectButton platform="facebook">Continue to Facebook →</ConnectButton></div>
        <AppNotActive />
      </div>
    );
  }
  return (
    <div className="ch-step">
      <div className="cmp-ch-note">You will be sent to {CONNECTABLE[pl]} to sign in. Use the account that administers <b>this agency’s</b> page, you are only ever offered the pages that account manages.</div>
      <div><ConnectButton platform={pl}>{"Continue to " + CONNECTABLE[pl] + " →"}</ConnectButton></div>
      {pl === "facebook" ? <AppNotActive /> : null}
    </div>
  );
}

/* TIKTOK SENDS TO THE INBOX, and authorises whoever is already signed in without asking -- both said before connecting. */
const TiktokStep = () => (
  <div className="ch-step">
    <div className="cmp-ch-note">You will be sent to TikTok to sign in. Use the TikTok account you post listings from.</div>
    <div className="cmp-ch-note ch-tt-who"><b>Check which account first.</b> TikTok connects whichever account is signed in to TikTok in this browser (or in the TikTok app, on a phone) without asking. <a href="https://www.tiktok.com/" target="_blank" rel="noopener">Open TikTok ↗</a> and look at the profile picture; if it is not the listings account, switch there first, then come back.</div>
    <div className="cmp-ch-note">Posts arrive in that account’s <b>TikTok inbox</b> as drafts: open TikTok, add a sound, and post. The sound is most of what decides how far a TikTok goes.</div>
    <div><ConnectButton platform="tiktok">Continue to TikTok →</ConnectButton></div>
  </div>
);

/* clipboard.writeText is missing on insecure origins and refused in some in-app browsers; the fallback selects the command so a
   long-press or Ctrl+C still works. */
function TgCopy() {
  const [word, setWord] = useState("Copy");
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const said = (w: string) => { setWord(w); clearTimeout(t.current); t.current = setTimeout(() => setWord("Copy"), 2200); };
  const selectIt = () => {
    try {
      const r = document.createRange(); r.selectNodeContents(document.getElementById("tgCmd") as Node);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
      said("Selected");
    } catch { said("Select it"); }
  };
  const go = () => {
    const text = "/connect " + state.tg.code;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => said("Copied"), selectIt);
    else selectIt();
  };
  return <button type="button" className="cmp-ch-btn" data-tg-copy="" onClick={go}>{word}</button>;
}

const codeLapsed = (T: Tg) => T.st === "expired" || T.st === "unknown" || (!!T.code && (T.st === "waiting" || T.st === "error") && Date.now() > T.exp);

function TgStep() {
  const { tg: T, bot: TG_BOT } = useChannels();
  const bot = TG_BOT.replace(/^@/, "");
  const lapsed = codeLapsed(T);
  const who = T.linked ? (T.linked.telegram_username ? "@" + T.linked.telegram_username : (T.linked.first_name || "your Telegram account")) : "";
  return (
    <div className="ch-step ch-tg">
      {T.st === "connected" ? (
        <>
          <div className="ch-tg-s ok">✓ Connected <b>{T.channel || "your channel"}</b></div>
          {!T.deleted ? <div className="ch-tg-s"><span>The bot could not delete the <code>/connect</code> post. Delete it from the channel yourself, so your followers do not see it.</span></div> : null}
          <div className="ch-tg-acts"><button type="button" className="cmp-ch-btn primary" data-ch-close="" onClick={closeAdd}>Done</button>
            <button type="button" className="cmp-ch-btn" data-tg-again="" onClick={() => tgNewCode()}>Connect another channel</button></div>
        </>
      ) : (
        <>
          <div className="ch-tg-s"><span><b>1. Add the bot to your channel.</b> Telegram opens and asks which channel. <b>Post Messages</b> and <b>Delete Messages</b> are already ticked; Delete is only used to remove the code you post in step 2.</span>
            <div><a className="cmp-ch-btn cmp-tg-add" target="_blank" rel="noopener" href={"https://t.me/" + encodeURIComponent(bot) + "?startchannel&admin=post_messages+delete_messages"}>{"Add " + TG_BOT + " ↗"}</a></div></div>
          <div className="ch-tg-s"><span><b>2. Post this in the channel.</b> As an ordinary post in the channel itself, not in a chat with the bot. It connects the channel and disappears.</span>
            {T.busy === "code" || (!T.code && !T.note) ? <div className="ch-tg-wait">Getting your code…</div>
              : lapsed ? <div className="ch-tg-wait">That code has expired. <button type="button" className="lf-linkbtn" data-tg-new="" onClick={() => tgNewCode()}>Get a new one</button></div>
              : T.code ? (
                <>
                  <div className="ch-tg-code"><code className="ch-tg-cmd" id="tgCmd">{"/connect " + T.code}</code><TgCopy /></div>
                  <div className="ch-tg-wait">
                    {T.st === "working" ? "Got it. Connecting…" : T.st === "error" ? "Fix that, then post the same code again." : "Watching for it · expires in " + tgMinsLeft() + " min"}
                    {" · "}<button type="button" className="lf-linkbtn" data-tg-new="" onClick={() => tgNewCode()}>New code</button></div>
                </>
              ) : <div><button type="button" className="cmp-ch-btn" data-tg-new="" onClick={() => tgNewCode()}>Try again</button></div>}
          </div>
        </>
      )}
      {/* Story kits: offered once the channel part is on screen, and only while this person is not linked. */}
      {T.linked === null ? (
        <div className="ch-tg-s ch-tg-opt"><span><b>Optional: Story kits.</b> Bots cannot post Telegram Stories, so after each post we can send you the photo and link to share as a Story in a tap. Link your Telegram to get them.</span>
          <div><button type="button" className="cmp-ch-btn" data-tg-link="" disabled={T.busy === "link"} onClick={tgLinkStart}>{T.busy === "link" ? "Opening…" : "Link Telegram ↗"}</button>
            {T.linkWait ? <> <span className="ch-tg-wait">Press Start in Telegram, then come back.</span></> : null}</div></div>
      ) : T.linked ? <div className="ch-tg-s ch-tg-opt ok">✓ Story kits come to you on Telegram as <b>{who}</b></div> : null}
      {/* The server's own words: they name what went wrong. */}
      <div className="cmp-setup-why" role="status" aria-live="polite">{T.note || ""}</div>
    </div>
  );
}

function AddPanel() {
  const { add } = useChannels();
  if (!add.open) {
    return <button type="button" className="ch-add-btn" data-ch-add="" aria-expanded="false" onClick={() => set({ add: { ...state.add, open: true } })}><span aria-hidden="true">+</span> Add channel</button>;
  }
  const pick = (pl: string) => {
    set({ add: { ...state.add, pick: pl } });
    if (pl === "telegram") tgOpen(); else tgWatch(false);
  };
  return (
    <div className="ch-add-panel" role="group" aria-label="Add a channel">
      <div className="ch-add-top"><span>Add a channel</span><button type="button" className="ch-add-x" data-ch-close="" aria-label="Close" onClick={closeAdd}>×</button></div>
      <div className="ch-pick-row">
        {Object.keys(CONNECTABLE).map((pl) => {
          /* OURS TO FIX, SO NOT THEIR BUTTON: a platform Synapse has not finished setting up is shown, and said to be unavailable.
             An Instagram linked to a Facebook Page comes through the Facebook connection, so its tile works whenever Facebook's does. */
          const ok = platformReady(pl) || (pl === "instagram" && platformReady("facebook"));
          return (
            <button key={pl} type="button" className={"ch-pick" + (add.pick === pl ? " on" : "")} data-ch-pick={pl} aria-pressed={add.pick === pl} disabled={!ok} onClick={() => pick(pl)}>
              <Mark pl={pl} />{CONNECTABLE[pl]}{ok ? null : <> <em>not available yet</em></>}</button>
          );
        })}
      </div>
      <div className="ch-soon">Coming later: {Object.keys(SOON).map((k) => SOON[k][0]).join(" · ")}</div>
      {add.pick === "facebook" || add.pick === "instagram" ? <MetaStep pl={add.pick} /> : add.pick === "tiktok" ? <TiktokStep /> : add.pick === "telegram" ? <TgStep /> : null}
    </div>
  );
}

/* ── answering a comment with the link ───────────────────────────────────
   Instagram captions never linkify. Meta allows ONE private message to somebody who commented, and it may carry a link. It sends
   in the agency's name to somebody who has never used Synapse, so it is off until an owner or admin says otherwise, and the
   exact message is on screen before it can ever go anywhere. */
/* The two things the server adds, shown here rather than discovered in somebody's inbox. */
function replyPreview(msg: string) {
  const link = "synapsecore.dev/s/…";
  let text = String(msg || "").replace(/\{\{\s*link\s*\}\}/g, link);
  if (text.indexOf(link) === -1) text = text.trim() + "\n\n" + link;
  if (!/automat|bot\b|auto-?reply/i.test(text)) text += "\n\n(Automated reply — say anything here and a real person will see it.)";
  return text;
}

function Replies() {
  const { reply: cfg, replyOpen } = useChannels();
  const [on, setOn] = useState(false), [kw, setKw] = useState(""), [msg, setMsg] = useState("");
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false);
  const saved = !!(cfg && cfg.agency_id);
  const shut = saved && !replyOpen;
  /* The form starts from what is saved each time it opens. */
  const seeded = useRef(false);
  useEffect(() => {
    if (!cfg || shut) { seeded.current = false; return; }
    if (seeded.current) return;
    seeded.current = true;
    setOn(!!cfg.enabled); setKw(cfg.keyword || "PRICE"); setMsg(cfg.message || ""); setNote("");
  }, [cfg, shut]);
  if (!cfg || !canSetReplies()) return null;
  const k0 = cfg.keyword || "PRICE";
  /* SAVED MEANS A ROW CAME BACK. Off is SAID, not implied by absence: this is the control that messages strangers. */
  if (shut) {
    return (
      <div className="cmp-setup cmp-reply cmp-reply-shut">
        <div className="cmp-reply-sum"><span className={"cmp-reply-dot" + (cfg.enabled ? " on" : "")}></span>
          <span>{cfg.enabled ? <>Answering comments that say <b>{k0}</b> with the listing link</> : <>Comment replies are <b>off</b></>}</span></div>
        <button className="cmp-ch-btn" id="rpEdit" onClick={() => set({ replyOpen: true })}>Edit</button>
      </div>
    );
  }
  const save = () => {
    const k = kw.trim();
    if (!k) { setNote("Give it a word to listen for."); return; }
    setBusy(true); setNote("Saving…");
    W().SynListings.saveReplySettings({ enabled: on, keyword: k, message: msg })
      .then(() => { setNote("Saved"); return loadReplySettings(); })
      /* Shut on the way out of a successful save; a failed save leaves it open, so nobody loses what they typed. */
      .then(() => { setBusy(false); set({ replyOpen: false }); })
      .catch((err: any) => { setBusy(false); setNote((err && err.message) || "Could not save that"); W().planGate?.(err && err.message); });
  };
  return (
    <div className="cmp-setup cmp-reply">
      <div className="cmp-setup-hd">Answer comments with the link</div>
      <p className="cmp-ch-note">Instagram captions cannot be tapped. When somebody comments <b>{k0}</b> on one of your posts, Synapse sends them one direct message with the link to that exact home. <b>The comment is the permission</b> — so the caption has to ask for it, and nobody else is messaged.</p>
      <label className="cmp-reply-row"><input type="checkbox" id="rpOn" checked={on} onChange={(e) => setOn(e.target.checked)} /> <span>Send the link when somebody comments the word below</span></label>
      <div className="cmp-setup-row"><label htmlFor="rpKw">Word</label><input id="rpKw" className="cmp-reply-kw" value={kw} maxLength={24} onChange={(e) => setKw(e.target.value)} /></div>
      <label className="cmp-reply-lbl" htmlFor="rpMsg">Message</label>
      <textarea id="rpMsg" className="cmp-reply-msg" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)}></textarea>
      <div className="cmp-reply-prev" id="rpPrev">{replyPreview(msg)}</div>
      <div className="cmp-setup-row"><button className="cmp-ch-btn primary" id="rpSave" disabled={busy} onClick={save}>Save</button><span className="cmp-setup-why" id="rpNote">{note}</span></div>
    </div>
  );
}

/* The strip: what is connected, and a way to add. It shows what IS connected, and "Add channel" opens the choice only when
   somebody wants to make it. onDisconnect: the generator redraws its Publish button. */
export function ChannelStrip({ onDisconnect }: { onDisconnect?: () => void }) {
  const s = useChannels();
  if (!s.drawn) return null;
  /* EVERY ACCOUNT, not the first one found -- a second Instagram account invisible here is indistinguishable from absent. */
  const rows = Object.keys(CONNECTABLE).flatMap((pl) => accountsOn(pl).map((a) => ({ pl, a })));
  const any = rows.length > 0;
  return (
    <>
      <div className="cmp-ch-hd">Channels</div>
      <div className="cmp-ch-row">
        {rows.map(({ pl, a }) => {
          /* A token with an expiry in the past is worse than no token: the publish attempt fails at the provider. */
          const stale = expired(a);
          return (
            <div key={a.id} className={"cmp-ch" + (stale ? "" : " on")}>
              <span className="cmp-ch-nm"><Mark pl={pl} />{CONNECTABLE[pl]}</span>
              {/* Telegram stores its own label: the @name, or the title of a channel that has none. */}
              <span className="cmp-ch-at">{stale ? "session expired" : pl === "telegram" ? (a.platform_username || "channel") : "@" + (a.platform_username || "connected")}</span>
              <DisconnectButton id={a.id} stale={stale} onDone={onDisconnect} />
            </div>
          );
        })}
        {!any ? <div className="ch-empty" title="Until a channel is connected, anything scheduled here is a rehearsal.">No channels connected</div> : null}
      </div>
      {canConnect() ? <div className="ch-add" id="chAdd"><AddPanel /></div>
        : !any ? <div className="ch-empty">Sign in as a member of this agency to add a channel.</div> : null}
      <Replies />
    </>
  );
}

/* ── what is still outstanding, and only they can do ────────────────────
   Steps outside anything we can reach, handed to the task pop-ups (they arrive once and live in the bell until marked done). */
/* Must match bio_slug() in 0106 exactly: a slug computed differently points at a /go/ page that does not resolve. */
function bioSlug(handle: unknown) {
  return String(handle || "").replace(/^\s*@/, "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}
function channelTasks() {
  const tasks: any[] = [];
  state.accounts.forEach((ac) => {
    if (!ac.is_active) return;
    const slug = bioSlug(ac.platform_username);
    const who = ac.platform === "telegram"
      ? (ac.platform_username || "your channel")
      : (ac.platform_username ? "@" + ac.platform_username : CONNECTABLE[ac.platform] || ac.platform);
    const goUrl = slug ? "https://synapsecore.dev/go/" + slug : "";
    /* THE BIO LINK. On Telegram, straight into a new chat with Tayo; on Instagram, where captions cannot link, the page of this
       account's homes is how a reader finds the one they saw. */
    if (ac.platform === "telegram") {
      tasks.push({
        id: "bio:" + ac.id + ":tayo",
        title: "Put this link in " + who + "’s description",
        body: "Anyone browsing the channel can tap straight into a new chat with Tayo, which asks which home caught their eye.",
        copies: [{ text: "https://synapsecore.dev/tayo/telegram" }],
        where: "Telegram → your channel → Edit → Description",
      });
    } else if (slug) {
      tasks.push({
        id: "bio:" + ac.id + ":" + slug,
        title: "Put this link in " + who + "’s bio",
        body: "It lists the homes this account has posted, newest first, and each one opens the right listing — so the posts have somewhere to send people.",
        copies: [{ text: goUrl }],
        where: ac.platform === "instagram" ? "Instagram → Edit profile → Links" : "Facebook → your Page → Edit details → Website",
      });
    }
    /* THE PAGE BUTTON. Read at connect time; null means we could not look, and then this says nothing at all. */
    if (ac.platform !== "facebook" || !ac.page_cta_type) return;
    const fix = "Meta Business Suite → your Page → Edit action button";
    if (ac.page_cta_type === "NONE") {
      tasks.push({
        id: "cta:" + ac.id + ":NONE",
        title: "Give " + who + " an action button",
        body: "This Page has none. One that points at your listings puts a tappable route under every post, in the spot Facebook makes most prominent.",
        copies: goUrl ? [{ text: goUrl }] : [], where: fix,
      });
      return;
    }
    /* NO WEB ADDRESS means a call, a WhatsApp thread or a Messenger window -- the buyer arrives with no listing attached. */
    if (!ac.page_cta_url) {
      tasks.push({
        id: "cta:" + ac.id + ":" + ac.page_cta_type,
        title: "Point " + who + "’s Page button at your listings",
        body: "It is set to " + esc(String(ac.page_cta_type).toLowerCase().replace(/_/g, " "))
          + ", so it sends people to a message or a call. Facebook puts it under every post, above your caption link, so most people tap it — and it arrives with no listing attached. Keep the phone number on the Page; anyone who wants to call still can.",
        copies: goUrl ? [{ text: goUrl }] : [], where: fix,
      });
      return;
    }
    if (ac.page_cta_url.indexOf("synapsecore.dev") === -1) {
      tasks.push({
        id: "cta:" + ac.id + ":url:" + ac.page_cta_url,
        title: who + "’s Page button goes somewhere else",
        body: "It opens <code>" + esc(ac.page_cta_url) + "</code>. That is fine if it is meant to; pointing it at your Synapse listings means the taps are counted against the homes they were about.",
        copies: goUrl ? [{ text: goUrl }] : [], where: fix,
      });
    }
  });
  /* GETTING SET UP, asked once, straight after the brand checklist (two getting-started asks at once is one too many). It stays in
     the bell until a channel is connected. */
  if (state.known && !state.accounts.length && canConnect() && W().SYN_BRAND_ONBOARDING === false) {
    const ready = Object.keys(CONNECTABLE).filter(platformReady).map((k) => CONNECTABLE[k]);
    if (ready.length) {
      tasks.push({
        id: "onboard:channels",
        eye: "Getting set up",
        title: "Connect your social channels",
        body: "Synapse writes the captions and posts your listings to your own "
          + esc(ready.length > 1 ? ready.slice(0, -1).join(", ") + " or " + ready[ready.length - 1] : ready[0])
          + ", and every enquiry that comes back is counted against the home it was about. Connect the accounts you already post from.",
        where: "Social studio → Channels → Add channel",
        action: { label: "Add a channel", run: () => openAddChannel() },
      });
    }
  }
  return tasks;
}

/* ── what came back from a connection ────────────────────────────────────
   social-connect's detail is cut at 180 characters on its way here, so it sends a fixed `reason` beside it and the steps live
   here, where there is room for them. Every reason is a Facebook one. */
const FB_RESET = "On Facebook, go to Settings & privacy → Settings → Business integrations "
  + "(search Settings for “Business integrations” if you can’t see it), find Synapse and remove it.";
const CONNECT_HELP: Record<string, Help> = {
  no_pages: {
    what: "Facebook connected, but no Page came with it, so nothing was connected.",
    steps: [
      "Press Connect Facebook again. In Facebook’s window, tick every Page you post from, and its Instagram account, then continue.",
      "If Facebook shows no list of Pages and only offers “Continue as …”, it is reusing an earlier choice. If the window has a link to edit that choice, use it; otherwise: " + FB_RESET
        + " Then come back and connect again.",
      "You need full control of the Page on Facebook."],
    retry: true },
  stale_pages: {
    what: "Facebook is still pointing Synapse at Pages that no longer exist (most likely deleted), and it skipped asking about your current ones.",
    steps: [FB_RESET,
      "Come back here and press Connect Facebook again.",
      "In Facebook’s window, tick your current Pages and their Instagram accounts, then continue."],
    retry: true },
  no_token: {
    what: "Facebook named your Pages but gave Synapse no permission to post to them.",
    steps: ["Press Connect Facebook again and leave every permission switched on in Facebook’s window.",
      "You need full control of the Page on Facebook; partial access is not enough to post."],
    retry: true },
  missing_permission: {
    what: "Facebook did not give Synapse the permission it needs to list your Pages.",
    steps: ["This is set in Synapse’s own Facebook app, not on your side. Send the message below to Synapse."],
    retry: false },
  pages_unreadable: {
    what: "Facebook would not tell Synapse which Pages you run.",
    steps: ["Press Connect Facebook again.", "If it happens again, send the message below to Synapse."],
    retry: true },
  unknown: {
    what: "Facebook shared no Page, and Synapse could not tell why.",
    steps: ["Press Connect Facebook again.", "If it happens again, send the message below to Synapse."],
    retry: true },
  user_denied: {
    what: "Facebook’s window was closed or Cancel was pressed, so nothing was connected.",
    steps: ["Press Connect Facebook again and continue through Facebook’s window to the end."],
    retry: true },
};

/* The portal returns from OAuth with ?connected= on the URL. Read it once, say what happened, and strip it -- a reload should not
   replay a stale outcome. */
function readConnectResult() {
  const q = new URLSearchParams(location.search);
  const outcome = q.get("connected");
  if (!outcome) return;
  const detail = q.get("detail") || "";
  let reason = q.get("reason") || "";
  q.delete("connected"); q.delete("detail"); q.delete("reason");
  history.replaceState({}, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  /* WHEREVER THE CONNECTION CAME FROM, THE AGENCY LANDS IN THE SOCIAL STUDIO (Eden, 2026-10-19). */
  setTimeout(() => { try { if (typeof W().goToPane === "function") W().goToPane("social"); } catch { /* stay put */ } }, 0);
  /* A function deployed before `reason` existed still says "shared no Page" in words. */
  if (!reason && outcome === "error" && /shared no Page/i.test(detail)) reason = "no_pages";
  /* Facebook shared some Pages; this agency now says which are its own. */
  if (outcome === "choose" && /^[0-9a-f-]{36}$/i.test(detail)) {
    set({ fbp: { id: detail, data: null, chosen: {}, busy: false, note: "" }, add: { open: true, pick: "facebook" } });
    fbpLoad();
    return;
  }
  const msg = outcome === "cancelled"
    ? "Connection cancelled" + (detail ? ": " + detail : ".")
    : outcome === "error"
      ? "Could not connect" + (detail ? ": " + detail : ".")
      : outcome === "tiktok"
        /* Not "real from now on": a TikTok post is a draft until the agent finishes it in the app. */
        ? "TikTok connected" + (detail ? " as " + detail : "") + ". Posts will arrive in that account’s TikTok inbox to finish and post."
        : (CONNECTABLE[outcome] || outcome) + " connected" + (detail ? " as " + detail : "") + ". Posts to it are real from now on.";
  /* A FAILURE STAYS ON SCREEN, selectable: Meta's reason arrives once, in a query parameter already stripped from the URL, and it
     is the sentence somebody needs to paste to whoever can fix it. */
  if (outcome === "error" || outcome === "cancelled") {
    set({ err: { msg, detail, help: Object.prototype.hasOwnProperty.call(CONNECT_HELP, reason) ? CONNECT_HELP[reason] : null } });
    return;
  }
  setTimeout(() => toastOrAlert(msg), 400);
}

function ConnectErr() {
  const { err } = useChannels();
  if (!err) return null;
  const help = err.help;
  return createPortal(
    <div className="connect-err" role="alert">
      <div className="ce-msg">
        {!help ? err.msg : (
          <>
            <span className="ce-what">{help.what}</span>
            <ol className="ce-steps">{help.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            {/* The detail came in on the URL and is only ever text. */}
            {err.detail ? <div className="ce-said">{"Details: " + err.detail}</div> : null}
            {help.retry ? <div className="ce-acts"><ConnectButton platform="facebook">Connect Facebook again</ConnectButton></div> : null}
          </>
        )}
      </div>
      <button type="button" className="ce-x" aria-label="Dismiss" onClick={() => set({ err: null })}>&#10005;</button>
    </div>,
    document.body,
  );
}

/* Rendered once, beside the strip: starts everything, keeps the tasks current, and lends the page openAddChannel. */
export function ChannelsHost() {
  const s = useChannels();
  useEffect(() => {
    W().openAddChannel = openAddChannel;
    readConnectResult();
    loadChannels();
    /* Re-render once the role is known: the strip is whatever it guessed before applyRole's round trip came back. */
    const role = () => set({ role: document.body.dataset.role || "", drawn: true });
    if (document.body.dataset.role) role();
    const brand = () => set({ brandTick: state.brandTick + 1 });
    const focus = () => {
      if (!state.add.open || state.add.pick !== "telegram") return;
      tgCheck();
      if (state.tg.linkWait) tgLinkState();
    };
    document.addEventListener("syn:role", role);
    document.addEventListener("syn:brand-onboard", brand);
    window.addEventListener("focus", focus);
    return () => {
      document.removeEventListener("syn:role", role);
      document.removeEventListener("syn:brand-onboard", brand);
      window.removeEventListener("focus", focus);
      tgWatch(false);
    };
  }, []);
  useEffect(() => {
    if (!s.drawn || typeof W().setTasks !== "function") return;
    W().setTasks("channels", channelTasks());
  }, [s.drawn, s.accounts, s.known, s.ready, s.role, s.brandTick]);
  return <ConnectErr />;
}
