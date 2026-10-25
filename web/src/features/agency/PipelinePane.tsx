"use client";
/**
 * The content pipeline board and its calendar, as React (was pcard/renderPipeline/renderCalendar, the board's click, drag and
 * select-several handlers and holdToConfirm in src/legacy/agency/inline-3.js).
 *
 * The posts are still built in portalData (buildPosts, from the drafts, the social_posts rows, their stats and comments) because
 * the bell, the composer and the scheduler read the same array: `window.SynPosts()` for the cards, `window.SynPStages` for the
 * columns. renderPipeline() and renderCalendar() survive as names and fire `syn:pipeline`. What a card's buttons open stays
 * there too for now: openScheduler, openPropPreview, openBoardCaption, openComposer, and pipeDrop/pipeSoon for taking cards off.
 *
 * THE CARD (Eden, 2026-10-09): a picture, a name, a price, ONE status chip, one short line, and buttons. Everything that used to
 * be a sentence is a chip or an icon, and the full wording lives in the tooltip.
 */
import { Fragment, type MouseEvent as RMouseEvent, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const postsNow = (): any[] => (typeof window !== "undefined" && W().SynPosts && W().SynPosts()) || [];
const stagesNow = (): { id: string; label: string; who: string }[] => (typeof window !== "undefined" && W().SynPStages) || [];
type Ch = { label: string; color: string };
const CHS = (): Record<string, Ch> => (typeof window !== "undefined" && W().SynCH) || {};
const chLabel = (c: string) => (CHS()[c] && CHS()[c].label) || c;
const mark = (c: string, px: number) => (W().SynChMark ? W().SynChMark(c, px) : "");
const svg = (n: string) => (W().SynIcons && W().SynIcons.svg ? W().SynIcons.svg(n) : "");
const fmtWhen = (iso: string) => (W().fmtWhen ? W().fmtWhen(iso) : "");
const call = (name: string, ...a: any[]) => { if (typeof W()[name] === "function") return W()[name](...a); };

/* Mobile collapses the board into an accordion; these two are the only stages where the agent has something to do, so they are
   the only ones that start open. Desktop ignores it: every .col-body is always visible there. */
const PSTAGE_ACTION: Record<string, boolean> = { approval: true, attention: true };
/* One glyph per stage, so a column reads as itself before the sentence does. */
const PSTAGE_ICON: Record<string, string> = { uploaded: "home", generating: "spark", approval: "check", scheduled: "calendar", published: "share", attention: "chart" };
const PSTAGE_EMPTY: Record<string, string> = {
  uploaded: "Nothing waiting", generating: "Nothing writing", approval: "Nothing to review",
  scheduled: "Nothing scheduled", published: "Nothing live yet", attention: "All clear",
};
/* TWO CARDS ON A PHONE, FOUR ON A BOARD. A phone column is the full width of the screen and two cards already fill the thumb's
   reach; a desktop column is 208px wide, where two leave most of it empty. Read live, so a rotated tablet gets the right count. */
const PEEK_PHONE = 2, PEEK_DESK = 4;

const PCI: Record<string, ReactNode> = {
  send: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></svg>,
  move: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>,
  copy: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="3" /><path d="M5 15V7a2 2 0 0 1 2-2h8" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  link: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" /></svg>,
  retry: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.5-5.8" /><path d="M20 4v5h-5" /></svg>,
  edit: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z" /></svg>,
  spark: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></svg>,
  check: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" /></svg>,
  clock: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
};

type Col = { open: boolean; expanded: boolean; sheet: boolean };
type St = { tick: number; view: "pipeline" | "calendar"; cols: Record<string, Col>; sel: Set<string>; mode: boolean; now: number; busy: Record<string, string> };
let state: St = { tick: 0, view: "pipeline", cols: {}, sel: new Set(), mode: false, now: 0, busy: {} };
const subs = new Set<() => void>();
const set = (v: Partial<St>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const usePipe = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
const colOf = (id: string): Col => state.cols[id] || { open: !!PSTAGE_ACTION[id], expanded: false, sheet: false };
const setCol = (id: string, v: Partial<Col>) => set({ cols: { ...state.cols, [id]: { ...colOf(id), ...v } } });
const busy = (k: string, label: string | null) => { const b = { ...state.busy }; if (label) b[k] = label; else delete b[k]; set({ busy: b }); };
const find = (id?: string) => postsNow().find((x) => x.id === id);
const motion = () => { if (W().synMotion) W().synMotion.refresh(); };

function useMedia(q: string) {
  return useSyncExternalStore((f) => { const m = window.matchMedia(q); m.addEventListener("change", f); return () => m.removeEventListener("change", f); },
    () => window.matchMedia(q).matches, () => false);
}

/* Only what can be removed is selectable: a draft is discarded and a scheduled or failed post is taken off the schedule, but a
   post already live on a channel cannot be recalled from here, so it is never offered. */
const removable = (p: any) => !!p && ((p.contentId && p.stage === "approval") || (p.postId && p.status !== "published"));

/* Where it went, as one plain sentence for the tooltip. The agency's own post and the Synapse twins succeed and fail on their
   own: "published" alone leaves an agency thinking its account posted when it did not. An agency's X post goes out on Synapse's
   X (no agency X accounts yet). */
function carriedBy(p: any) {
  const bits: string[] = [];
  if (p.mineLive) { const me = p.channels[0]; bits.push(me === "x" ? "Synapse’s X" : "Your " + ((CHS()[me] && CHS()[me].label) || me || "account")); }
  if (p.ampLive && p.ampLive.length) bits.push("Synapse on " + p.ampLive.map(chLabel).join(", "));
  return bits.join(" · ");
}
function waitLine(p: any) {
  const w = (p.waitMine ? [p.channels[0]] : []).concat(p.waitAmp || []);
  if (!w.length) return "";
  const names = w.map(chLabel);
  const list = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
  return "Sent to " + list + (p.sentWhen ? " " + p.sentWhen : "") + ", not showing there yet. TryPost posts it from its own queue; this updates by itself when it is live.";
}
const where = (p: any) => (carriedBy(p) + (p.waitMine || (p.waitAmp && p.waitAmp.length) ? " " + waitLine(p) : "")).replace(/\s+/g, " ").trim();

function Photo({ url }: { url: string }) {
  const [bad, setBad] = useState(false);
  const u = typeof url === "string" ? url.trim() : "";
  return <div className={"lph" + (bad ? " no-photo" : "")}>{u && !bad ? <img src={u} alt="" loading="lazy" onError={() => setBad(true)} /> : null}</div>;
}
const Cav = ({ c, px }: { c: string; px: number }) => (
  <span className="cav" title={chLabel(c)} style={{ background: (CHS()[c] && CHS()[c].color) || "#161616" }} dangerouslySetInnerHTML={{ __html: mark(c, px) }}></span>
);
const Chip = ({ tone, text, tip }: { tone: string; text: string; tip?: string }) => <span className={"pc-chip " + tone} title={tip || undefined}><i></i>{text}</span>;

/* THE COMMENTS THEMSELVES, under the count that promised them. Only the ones still waiting: a comment somebody has already
   answered is not work. Three at a time; the rest are counted. The body is a stranger's sentence, so React escapes it. */
const CMT_SHOWN = 3;
function Comments({ p }: { p: any }) {
  const { busy: b } = usePipe();
  const all: any[] = p.comments || [];
  const waiting = all.filter((c) => !c.handled_at);
  if (!waiting.length) return <div className="w" style={{ marginTop: "4px", color: "var(--ink-dim)" }}>{"All " + all.length + " answered."}</div>;
  const show = waiting.slice(0, CMT_SHOWN), more = waiting.length - show.length;
  return (
    <div className="cmts">
      {show.map((c) => (
        <div className="cmt" key={c.id}>
          <div className="cmt-who">{(c.author_handle ? "@" + c.author_handle : "Someone") + (c.commented_at ? " · " + fmtWhen(c.commented_at) : "")}</div>
          <div className="cmt-body">{c.body || ""}</div>
          <button className="act gh cmt-done" data-act="cmtdone" data-cid={c.id} disabled={!!b["cmtdone:" + c.id]}>{b["cmtdone:" + c.id] || "Done"}</button>
        </div>
      ))}
      {more ? <div className="w" style={{ color: "var(--ink-dim)" }}>{"and " + more + " more waiting"}</div> : null}
    </div>
  );
}

function PcBtn({ act, id, ico, label, cls, busy }: { act: string; id: string; ico: string; label: string; cls: string; busy?: string }) {
  return <button type="button" className={"pc-btn " + cls} data-act={act} data-id={id} disabled={!!busy}>{PCI[ico]}<span>{busy || label}</span></button>;
}
/* A button that is only a picture still needs a name: aria-label for the reader, title for the hover. */
function PcIb({ act, id, ico, label, extra }: { act: string; id: string; ico: string; label: string; extra?: string }) {
  return <button type="button" className={"pc-ib" + (extra ? " " + extra : "")} data-act={act} data-id={id} aria-label={label} title={label}>{PCI[ico]}</button>;
}

function Card({ p, stage, i, peek, touch, dragging }: { p: any; stage: string; i: number; peek: number; touch: boolean; dragging: boolean }) {
  const { sel, busy: b } = usePipe();
  const id = String(p.id);
  const Btn = (o: { act: string; ico: string; label: string; cls: string }) => PcBtn({ ...o, id, busy: b[o.act + ":" + id] });
  const Ib = (o: { act: string; ico: string; label: string; extra?: string }) => PcIb({ ...o, id });
  /* ON A PHONE IT IS A TAP (Eden, 2026-10-19): holding is for a mouse, so there Discard and Remove are ordinary buttons. */
  const hold = (l: string) => (touch ? l.replace(/^Hold to (\w)/, (m, c) => c.toUpperCase()) : l);
  let chip: ReactNode = null, line: ReactNode = null, acts: ReactNode = null, extra: ReactNode = null;
  if (stage === "uploaded") {
    line = <span className="pc-l">{p.inflight
      ? <><b>{p.inflight}</b>{" in progress"}{p.postedCount ? <>{" · "}<b>{p.postedCount + "×"}</b>{" posted"}</> : null}</>
      : p.postedCount ? <><b>{p.postedCount + "×"}</b>{" posted"}{p.lastPostedAt ? " · " + fmtWhen(p.lastPostedAt) : ""}</> : "Ready for its first post"}</span>;
    acts = Btn({ act: "gen", ico: "spark", label: p.postedCount || p.inflight ? "Write another" : "Generate", cls: "pri" });
  } else if (stage === "generating") {
    line = <span className="pc-l">{"Writing the captions…"}</span>;
  } else if (stage === "approval") {
    line = <span className="cap" data-capedit={id} role="button" tabIndex={0} aria-label="Open this caption to edit" title="Tap to edit">{(p.caption || "").slice(0, 200)}</span>;
    acts = <>{Btn({ act: "approve", ico: "check", label: "Keep & schedule", cls: "pri" })}{Ib({ act: "discard", ico: "close", label: hold("Hold to discard"), extra: "hold" })}</>;
  } else if (stage === "scheduled") {
    chip = p.failure ? <Chip tone="warn" text="Retrying" tip={"Tried already: " + p.failure} /> : null;
    line = <span className="pc-l">{PCI.clock}{p.when || "No time set"}</span>;
    acts = <>{Btn({ act: "sendnow", ico: "send", label: "Send now", cls: "ok" })}{Ib({ act: "reschedule", ico: "move", label: "Move to another time" })}{Ib({ act: "duplicate", ico: "copy", label: "Copy" })}{Ib({ act: "remove", ico: "trash", label: hold("Hold to remove"), extra: "hold" })}</>;
  } else if (stage === "published") {
    const up = p.mineLive || (p.ampLive && p.ampLive.length);
    /* A TikTok "published" is a draft in the agent's TikTok inbox, not a public post, and the card must not claim otherwise. */
    if (p.inbox) chip = <Chip tone="info" text="TikTok draft" tip="In your TikTok inbox. Open TikTok, add a sound and post it: until then it is a draft only you can see." />;
    else chip = up ? <Chip tone="ok" text="Live" tip={where(p)} /> : <Chip tone="warn" text="Sent" tip={where(p) || "Sent, not live yet. This updates by itself when it is up."} />;
    const bits: ReactNode[] = [];
    if (p.clicks) bits.push(<><b>{p.clicks}</b>{" tapped"}</>);
    if (p.token || p.clicks) bits.push(<><b>{p.leads || 0}</b>{" " + ((p.leads || 0) === 1 ? "enquiry" : "enquiries")}</>);
    const e = p.engage || {};
    if (e.comments) bits.push(<><b>{e.comments}</b>{" " + (e.comments === 1 ? "comment" : "comments")}</>);
    line = <><span className="pc-l">{p.when || ""}</span>{bits.length ? <span className="pc-m">{bits.map((x, k) => <Fragment key={k}>{k ? " · " : ""}{x}</Fragment>)}</span> : null}</>;
    extra = p.comments && p.comments.length ? <Comments p={p} /> : null;
    acts = p.token ? Btn({ act: "openlink", ico: "link", label: "Open the link", cls: "gh" }) : null;
  } else if (stage === "attention") {
    if (p.status === "failed") {
      const why = p.failure || "This did not go out.";
      chip = <Chip tone="bad" text="Failed" tip={why} />;
      line = <span className="pc-l pc-why" title={why}>{why.length > 80 ? (p.failure || "").slice(0, 79).trim() + "…" : why}</span>;
      acts = <>{Btn({ act: "sendnow", ico: "retry", label: "Try again", cls: "pri" })}{Ib({ act: "remove", ico: "trash", label: hold("Hold to remove"), extra: "hold" })}</>;
    } else {
      /* A live post nobody tapped is not broken, so no alarm and no retry: write it differently and send it again. Naming the
         preview fetches is the difference between "your link is broken" and "your post did not land". */
      chip = <Chip tone="warn" text="No taps yet" tip={"Live since " + (p.when || "a while back") + (p.clicksRaw ? ", " + p.clicksRaw + " preview fetches, but" : ",") + " not one person has tapped the link."} />;
      line = <span className="pc-l">{"Live since " + (p.when || "a while")}</span>;
      acts = <>{Btn({ act: "duplicate", ico: "edit", label: "Write another version", cls: "gh" })}{p.token ? Ib({ act: "openlink", ico: "link", label: "Check the link" }) : null}</>;
    }
  }
  return (
    <div className={"pcard v2 cmp " + (stage === "attention" ? "warn" : "") + (p._justpub ? " justpub" : "") + (i >= peek ? " pc-extra" : "") + (sel.has(id) ? " pl-sel" : "") + (dragging ? " dragging" : "")}
      draggable="true" data-pid={id}>
      <div className="pc-top">
        <div className="pc-ph"><Photo key={p.img || ""} url={p.img} />{p.channels && p.channels.length ? <div className="pc-chs">{p.channels.map((c: string) => <Cav key={c} c={c} px={12} />)}</div> : null}</div>
        <div className="pc-main">
          <div className="pc-title">{String(p.listing || "").split(",")[0]}</div>
          <div className="pc-sub"><span className="pc-price">{p.price || ""}</span>{chip}</div>
          {line ? <div className="pc-line">{line}</div> : null}
        </div>
      </div>
      {extra}
      {acts ? <div className="pc-acts">{acts}</div> : null}
    </div>
  );
}

/* Every branch either opens something the agency drives or writes to the database and reloads. None of them move a card by
   setting a property on an array. */
function act(b: HTMLElement) {
  const a = b.dataset.act || "";
  const L = W().SynListings;
  /* BEFORE the post lookup: a comment button carries a COMMENT id, and the post search would find nothing. */
  if (a === "cmtdone") {
    const cid = b.dataset.cid;
    if (!cid || !L.markCommentHandled) return;
    busy("cmtdone:" + cid, "…");
    L.markCommentHandled(cid, true).then(() => call("loadPipeline"))
      .catch((err: any) => { busy("cmtdone:" + cid, null); toast((err && err.message) || "Could not mark that answered"); });
    return;
  }
  const p = find(b.dataset.id); if (!p) return;
  const k = a + ":" + p.id;
  if (a === "gen") {
    if (typeof W().openComposer === "function") W().openComposer(p.propertyId);
    else toast("The composer did not load");
  } else if (a === "approve" || a === "reschedule" || a === "duplicate") {
    call("openScheduler", p, a);
  } else if (a === "discard") {
    if (!p.contentId) return;
    /* IN PLACE. The card leaves the board at once and nothing else moves; the write follows, and the confirming reload waits
       until they have stopped. A failure puts it back by reloading now. */
    call("pipeDrop", [p]);
    L.setContentStatus(p.contentId, "archived")
      .then(() => { toast("Discarded"); call("pipeSoon"); })
      .catch((err: any) => { toast((err && err.message) || "Could not discard that"); call("loadPipeline"); });
  } else if (a === "remove") {
    if (!p.postId) return;
    call("pipeDrop", [p]);
    L.deleteSocialPost(p.postId)
      .then(() => { toast("Taken off the schedule"); call("pipeSoon"); })
      .catch((err: any) => { toast((err && err.message) || "Could not remove that"); call("loadPipeline"); });
  } else if (a === "openlink") {
    /* The same URL as in the caption, so opening it records a click like any other, which is honest: somebody did look. */
    if (!p.token) { toast("No tracked link on this one"); return; }
    window.open(W().shortLinkUrl(p.token), "_blank", "noopener");
  } else if (a === "sendnow" && p.status === "failed") {
    /* A DIFFERENT CALL: social_posts_guard refuses a new scheduled_at once the status is 'failed', so the RPC resets the
       status, the clock and the attempt count together. */
    busy(k, "Queueing…");
    L.retrySocialPost(p.postId)
      .then(() => { toast("Back in the queue — it goes out on the next run"); call("loadPipeline"); })
      .catch((err: any) => { busy(k, null); toast((err && err.message) || "Could not queue that again"); });
  } else if (a === "sendnow") {
    if (!p.postId) return;
    /* NOT "mark it published": whether something reached an audience is a fact about the outside world, and the publisher
       alone may write it. Moving the time to now puts it at the front of the queue. */
    busy(k, "Queueing…");
    L.updateSocialPost(p.postId, { at: new Date().toISOString() })
      .then(() => { toast("Moved to the front of the queue, it goes out once a channel is connected"); call("loadPipeline"); })
      .catch((err: any) => { busy(k, null); toast((err && err.message) || "Could not do that"); });
  }
  motion();
}

/* HOLD TO CONFIRM (idea: dqnamo's "Hold to Confirm"). Discard and Remove fill while held and fire at the end; a plain tap only
   reminds you what to do. It sits in front of the board's own handlers (document, capture phase), so they run once, when the
   hold completes. On a touch screen it steps aside and a tap goes straight through. */
let holdOn = false;
function installHold() {
  if (holdOn) return; holdOn = true;
  const touchy = () => window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const HOLD = 700;
  let timer: any = null, cur: HTMLElement | null = null;
  const holdBtn = (t: EventTarget | null) => ((t as HTMLElement)?.closest?.(".pc-ib.hold") as HTMLButtonElement | null) || null;
  const stop = () => { clearTimeout(timer); timer = null; if (cur) { cur.classList.remove("holding"); cur = null; } };
  const begin = (b: HTMLButtonElement) => {
    if (b.disabled) return;
    stop(); delete b.dataset.swallow; cur = b; b.classList.add("holding");
    timer = setTimeout(() => {
      const t = cur; stop(); if (!t) return;
      t.dataset.held = "1";
      if ("vibrate" in navigator) try { navigator.vibrate(18); } catch { /* not on every phone */ }
      t.click();
      t.dataset.swallow = "1"; /* the click the browser sends when you let go is the same press */
    }, HOLD);
  };
  document.addEventListener("pointerdown", (e) => { if (touchy()) return; const b = holdBtn(e.target); if (b && e.button === 0) begin(b); });
  ["pointerup", "pointercancel"].forEach((t) => document.addEventListener(t, stop));
  document.addEventListener("pointermove", (e) => { if (cur && !cur.contains(document.elementFromPoint(e.clientX, e.clientY))) stop(); });
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { const b = holdBtn(e.target); if (b) begin(b); } });
  document.addEventListener("keyup", (e) => { if (e.key === "Enter" || e.key === " ") stop(); });
  document.addEventListener("contextmenu", (e) => { if (holdBtn(e.target)) e.preventDefault(); });
  document.addEventListener("click", (e) => {
    if (touchy()) return;
    const b = holdBtn(e.target); if (!b) return;
    if (b.dataset.held === "1") { delete b.dataset.held; return; }
    e.preventDefault(); e.stopImmediatePropagation();
    if (b.dataset.swallow === "1") { delete b.dataset.swallow; return; }
    toast((b.getAttribute("aria-label") || "Hold to confirm") + ": press and hold the button");
  }, true);
}

function plDelete() {
  const picked = [...state.sel].map(find).filter(removable);
  if (!picked.length) { set({ sel: new Set() }); return; }
  const drafts = picked.filter((x) => x.contentId && x.stage === "approval").length;
  if (!window.confirm("Delete " + picked.length + " item" + (picked.length === 1 ? "" : "s") + "? "
      + (drafts ? drafts + " draft" + (drafts === 1 ? " is" : "s are") + " discarded; " : "")
      + "anything scheduled is taken off the schedule. Posts already live stay up.")) return;
  call("pipeDrop", picked); /* gone from the board at once; the view does not move */
  const L = W().SynListings;
  Promise.all(picked.map((x) => (x.contentId && x.stage === "approval" ? L.setContentStatus(x.contentId, "archived") : L.deleteSocialPost(x.postId)).then(() => true, () => false)))
    .then((oks) => {
      const bad = oks.filter((o) => !o).length;
      toast(bad ? (picked.length - bad) + " of " + picked.length + " deleted — " + bad + " could not be" : picked.length + " deleted");
      if (bad) call("loadPipeline"); else call("pipeSoon");
    });
}

/* The Select switch in the board's header, for phones, where a finger drag is a scroll and not a box. */
export function PipelineSelect() {
  const { mode } = usePipe();
  return (
    <button type="button" id="plSelectMode" className={"pl-mode" + (mode ? " on" : "")} aria-pressed={mode}
      onClick={() => set(mode ? { mode: false, sel: new Set() } : { mode: true })}>Select</button>
  );
}

export function PipelineBoard() {
  const s = usePipe();
  const mounted = usePageScripts();
  const desk = useMedia("(min-width: 1025px)");
  const touch = useMedia("(hover: none), (pointer: coarse)");
  const peek = desk ? PEEK_DESK : PEEK_PHONE;
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const from = useRef<{ x: number; y: number; add: boolean } | null>(null);

  useEffect(() => {
    installHold();
    const repaint = () => {
      const ids = new Set(postsNow().map((p) => String(p.id)));
      set({ tick: state.tick + 1, now: Date.now(), busy: {}, sel: new Set([...state.sel].filter((i) => ids.has(i))) });
    };
    repaint();
    window.addEventListener("syn:pipeline", repaint);
    /* The view switcher sits in the pane's filters, which the phone dock lends to its sheet, so it is listened for here. */
    const view = (e: MouseEvent) => {
      const b = (e.target as HTMLElement)?.closest?.("#socialView [data-sv]") as HTMLElement | null; if (!b) return;
      document.querySelectorAll("#socialView .seg-b").forEach((x) => x.classList.toggle("on", x === b));
      set({ view: b.dataset.sv === "calendar" ? "calendar" : "pipeline", now: Date.now() });
    };
    document.addEventListener("click", view);
    /* Escape closes an open column sheet, and clears a selection. */
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const open = Object.keys(state.cols).find((k) => state.cols[k].sheet);
      if (open) { setCol(open, { sheet: false }); document.documentElement.style.overflow = ""; }
      if (state.sel.size) set({ sel: new Set() });
    };
    document.addEventListener("keydown", esc);
    /* The box: press on the board's empty space and drag. */
    const move = (e: PointerEvent) => {
      const f = from.current; if (!f) return;
      const dx = e.clientX - f.x, dy = e.clientY - f.y;
      let box = document.querySelector(".pl-box") as HTMLElement | null;
      if (!box && Math.abs(dx) + Math.abs(dy) < 6) return; /* a click, not a drag */
      if (!box) { box = document.createElement("div"); box.className = "pl-box"; document.body.appendChild(box); }
      const x = Math.min(e.clientX, f.x), y = Math.min(e.clientY, f.y);
      box.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + Math.abs(dx) + "px;height:" + Math.abs(dy) + "px";
      const r = { l: x, t: y, r: x + Math.abs(dx), b: y + Math.abs(dy) };
      const sel = new Set(state.sel);
      ref.current?.querySelectorAll<HTMLElement>(".pcard").forEach((c) => {
        const q = c.getBoundingClientRect(), id = c.dataset.pid || "";
        const hit = !(q.right < r.l || q.left > r.r || q.bottom < r.t || q.top > r.b);
        if (hit && removable(find(id))) sel.add(id);
        else if (!hit && !f.add) sel.delete(id);
      });
      set({ sel });
      e.preventDefault();
    };
    const up = () => { from.current = null; document.querySelector(".pl-box")?.remove(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("syn:pipeline", repaint); document.removeEventListener("click", view); document.removeEventListener("keydown", esc);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    };
  }, []);

  const posts = postsNow();
  const stages = stagesNow();

  /* A tap in select mode, or Ctrl/Shift + click, picks a card instead of opening it. */
  const pick = (e: RMouseEvent) => {
    const card = (e.target as HTMLElement).closest(".pcard") as HTMLElement | null;
    if (!card || !(state.mode || e.ctrlKey || e.metaKey || e.shiftKey)) return;
    e.preventDefault(); e.stopPropagation();
    const id = card.dataset.pid || "";
    if (!removable(find(id))) { toast("That one is live on a channel, so it cannot be deleted from here"); return; }
    const sel = new Set(state.sel); if (sel.has(id)) sel.delete(id); else sel.add(id);
    set({ sel });
  };
  const click = (e: RMouseEvent) => {
    const t = e.target as HTMLElement;
    const ce = t.closest("[data-capedit]") as HTMLElement | null;
    if (ce) { call("openBoardCaption", ce.dataset.capedit); return; }
    const b = t.closest("[data-act]") as HTMLElement | null;
    if (!b) { const card = t.closest(".pcard") as HTMLElement | null; if (card) call("openPropPreview", find(card.dataset.pid)); return; }
    act(b);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const ce = (e.target as HTMLElement).closest("[data-capedit]") as HTMLElement | null;
    if (!ce) return;
    e.preventDefault(); call("openBoardCaption", ce.dataset.capedit);
  };
  /* "+4 more": on a phone the column becomes a full-screen sheet, because there is nowhere else for ninety cards to go; on a
     desktop that would take over a 1440px board to read one column, so the column expands where it stands. */
  const more = (id: string) => {
    if (desk) { setCol(id, { expanded: !colOf(id).expanded }); return; }
    setCol(id, { sheet: true, open: true });
    document.documentElement.style.overflow = "hidden";
  };
  const less = (id: string) => { setCol(id, { sheet: false }); document.documentElement.style.overflow = ""; };
  /* PUBLISHED AND NEEDS-ATTENTION ARE DERIVED, NOT CHOSEN: one means a platform accepted the post, the other that it failed or
     nobody clicked, and a drag cannot make either true. */
  const onDrop = (e: React.DragEvent) => {
    const col = (e.target as HTMLElement).closest(".col") as HTMLElement | null; if (!col || !dragId) return;
    e.preventDefault();
    const stage = col.dataset.stage || "", p = find(dragId);
    if (p && stage && (stage === "published" || stage === "attention")) {
      toast(stage === "published" ? "A post lands here when a platform accepts it — use Send now." : "This fills itself when a post fails or goes unclicked.");
    } else if (p && stage && p.stage !== stage) {
      p.stage = stage;
      set({ tick: state.tick + 1 });
      window.dispatchEvent(new Event("syn:posts-moved"));   // the Ask-Tayo bento counts drafts
    }
    setDrop(null);
  };

  return (
    <>
      <div className={"pipeline" + (s.mode ? " pl-selecting" : "")} id="pipeline" ref={ref} style={s.view === "calendar" ? { display: "none" } : undefined}
        onClickCapture={pick} onClick={click} onKeyDown={key}
        onPointerDown={(e) => {
          if (e.pointerType === "touch" || e.button !== 0) return;
          if ((e.target as HTMLElement).closest(".pcard, button, a, input, select, textarea, .col-more")) return;
          from.current = { x: e.clientX, y: e.clientY, add: e.ctrlKey || e.metaKey || e.shiftKey };
          if (!from.current.add) set({ sel: new Set() });
        }}
        onDragStart={(e) => {
          if (from.current) { e.preventDefault(); return; }
          const c = (e.target as HTMLElement).closest(".pcard") as HTMLElement | null; if (!c) return;
          setDragId(c.dataset.pid || null); if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => { setDragId(null); setDrop(null); }}
        onDragOver={(e) => { const col = (e.target as HTMLElement).closest(".col") as HTMLElement | null; if (!col || !dragId) return; e.preventDefault(); setDrop(col.dataset.stage || null); }}
        onDrop={onDrop}>
        {stages.map((st) => {
          const col = posts.filter((p) => p.stage === st.id);
          const c = colOf(st.id), bodyId = "colbody-" + st.id, extra = col.length - peek;
          /* .ch is a real <button> so a phone can make it an accordion header; desktop styles it flush. */
          return (
            <div key={st.id} className={"col" + (c.open ? " open" : "") + (c.expanded ? " expanded" : "") + (c.sheet ? " sheet" : "") + (drop === st.id ? " drop" : "")} data-stage={st.id}>
              <button className="ch" type="button" aria-expanded={c.open} aria-controls={bodyId} onClick={() => setCol(st.id, { open: !c.open })}>
                <div><div className="t">{st.label}</div><div className="w">{st.who}</div></div>
                <span className="ct">{col.length}</span><span className="col-chv" aria-hidden="true">›</span>
              </button>
              <div className="col-body" id={bodyId}>
                {col.length
                  ? col.map((p, i) => <Card key={p.id} p={p} stage={st.id} i={i} peek={peek} touch={touch} dragging={dragId === String(p.id)} />)
                  : <div className="col-blank"><span className="col-blank-i has-icon" data-icon={PSTAGE_ICON[st.id] || "grid"} dangerouslySetInnerHTML={{ __html: svg(PSTAGE_ICON[st.id] || "grid") }}></span><p>{PSTAGE_EMPTY[st.id] || ""}</p></div>}
                {extra > 0 ? <button type="button" className="col-more" data-more={st.id} data-count={extra} onClick={() => more(st.id)}>{c.expanded ? "Show less" : "+" + extra + " more"}</button> : null}
                <button type="button" className="col-sheet-x" data-less={st.id} onClick={() => less(st.id)}>Done</button>
              </div>
            </div>
          );
        })}
      </div>
      {mounted ? createPortal(
        <div className={"pl-bar" + (s.sel.size ? " on" : "")} role="toolbar" aria-label="Selected posts">
          <span className="pl-n">{s.sel.size + " selected"}</span>
          <button type="button" data-pl="del" className="pl-del" onClick={plDelete}>Delete</button>
          <button type="button" data-pl="clear" aria-label="Clear selection" onClick={() => set({ sel: new Set() })}>{"×"}</button>
        </div>, document.body) : null}
    </>
  );
}

/* A calendar entry: the photo with its time on it, the name, and where it goes. Clicking one opens the scheduler on it, since
   that is the thing you want to move; a published post has nowhere to move to, so it opens the property preview. */
function CalEvent({ p }: { p: any }) {
  const live = p.stage === "published";
  const w = String(p.when || "");
  const t = live ? "Live" : (w.indexOf(",") > -1 ? w.slice(w.lastIndexOf(",") + 1).trim() : (w || "Scheduled"));
  const tone = live ? "ok" : (p.stage === "attention" ? "bad" : (p.failure ? "warn" : "info"));
  const name = String(p.listing || "").split(",")[0];
  const open = () => { const q = find(p.id); if (!q) return; if (q.stage === "scheduled" && q.postId) call("openScheduler", q, "reschedule"); else call("openPropPreview", q); };
  return (
    <div className="cev v2" data-pid={p.id} tabIndex={0} role="button" aria-label={name + ", " + t} onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }}>
      <div className="cv-ph"><Photo key={p.img || ""} url={p.img} /><span className={"cv-t " + tone}><i></i>{t}</span></div>
      <div className="cv-b"><div className="cet">{name}</div><div className="cv-chs">{(p.channels || []).slice(0, 3).map((c: string) => <Cav key={c} c={c} px={9} />)}</div></div>
    </div>
  );
}

export function PipelineCalendar() {
  const { view, now } = usePipe();
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let days: ReactNode = null;
  if (now) {
    const base = new Date(now), ti = (base.getDay() + 6) % 7;
    const nums: number[] = [], dayOf: string[] = [], buckets: any[][] = [[], [], [], [], [], [], []];
    for (let i = 0; i < 7; i++) { const dt = new Date(base); dt.setDate(base.getDate() - ti + i); nums.push(dt.getDate()); dayOf.push(dt.toDateString()); }
    /* Each post sits on the day its scheduled_at (or published_at) names. */
    postsNow().forEach((p) => {
      const iso = p.publishedAt || p.scheduledAt; if (!iso) return;
      const d = new Date(iso); if (isNaN(d.getTime())) return;
      const di = dayOf.indexOf(d.toDateString()); if (di > -1) buckets[di].push(p);
    });
    buckets.forEach((b) => b.sort((a, z) => +new Date(a.publishedAt || a.scheduledAt) - +new Date(z.publishedAt || z.scheduledAt)));
    /* `empty` drives the phone agenda: days with nothing are left out there, except today, which stays as the "you are here"
       anchor. Desktop renders all seven. */
    days = names.map((dn, i) => (
      <div key={dn} className={"cday " + (i === ti ? "today" : "") + (!buckets[i].length ? " empty" : "")}>
        <div className="dh"><span className="dn">{dn}</span><span className="dd">{nums[i]}</span></div>
        {buckets[i].length ? buckets[i].map((p) => <CalEvent key={p.id} p={p} />) : <div className="cempty" aria-label={"Nothing " + (i === ti ? "today" : "this day")}><span className="cempty-dot"></span></div>}
      </div>
    ));
  }
  return <div className="s-cal" id="calendar" style={{ display: view === "calendar" ? "grid" : "none" }}>{days}</div>;
}
