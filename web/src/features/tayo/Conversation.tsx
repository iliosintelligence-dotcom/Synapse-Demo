"use client";
/**
 * Tayo's conversation (2026-10-23): the replies, your messages, the typing dots, errors, the homes deck, the handover card and
 * the introduction ticket.
 *
 * The chat engine (src/legacy/toju/inline-5.js) still decides what is said and keeps the thread; it records each thing it adds
 * in window.TayoView, and this draws that list into #convo. On attaching it takes #convo over from the engine's old drawing,
 * which keeps running until then (and for good if React never arrives). Pins and ratings are still written by the engine
 * (window.TayoEngine), so the Pinned sheet and the page can never disagree. The class names are the old ones, so the look is
 * unchanged.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { flushSync } from "react-dom";

/* ── what the engine records ── */
type Match = { id: string; title?: string; price?: number } & Record<string, unknown>;
type Payload = { id: string; text: string; more: string | null; matches: Match[]; at: number };
type PriceHistory = { area?: string; unit?: string; summary?: string; rows: Array<{ period: string; typical: string; change?: string }>; sources?: Array<{ title: string; url: string }> };
type Searched = { live?: number; found?: number; where?: string; kinds?: string };
type HandoverSummary = Partial<Record<"wants" | "budget" | "financing" | "timeline" | "household" | "position" | "nextStep", string>> & { questions?: string[]; concerns?: string[] };
type Item =
  | { key: number; kind: "user"; text: string }
  | { key: number; kind: "toju"; text: string; matches: Match[]; priceHistory: PriceHistory | null; more: string | null; searched: Searched | null; payload: Payload; zyn: string }
  | { key: number; kind: "typing"; zyn: string }
  | { key: number; kind: "error"; err: { ttl: string; msg: string; auto?: boolean }; icon: string }
  | { key: number; kind: "ticket"; title: string; where: string; when: string; ref: string; sent: boolean; img: string }
  | { key: number; kind: "handover"; H: { message: string; openingOffer?: number; summary?: HandoverSummary }; slots: Array<{ starts_at: string }>; title: string };

type HandoverUi = { sending: (on: boolean) => void; sent: () => void };
declare global {
  interface Window {
    TayoView?: { react: boolean; attach: () => void; items: () => Item[]; subscribe: (f: () => void) => () => void; remove: (it: Item) => void };
    SynMatches?: {
      shapeTojuMatch: (m: Match, i: number) => unknown;
      listingCardHtml: (l: unknown, i: number, opts?: Record<string, unknown>) => string;
    };
  }
  interface TayoEngineApi {
    scrollDown: () => void;
    retry: () => void;
    shareText: (pl: Payload) => string;
    togglePin: (pl: Payload) => boolean;
    rateValue: (pl: Payload, want: "up" | "down") => "up" | "down" | null;
    handoverCancel: (it: Item) => void;
    handoverSend: (H: unknown, slot: string | null, contact: { phone: string; handle: string }, ui: HandoverUi) => Promise<boolean>;
    isPinned: (id: string) => boolean;
    ratingOf: (id: string) => "up" | "down" | null;
    propertyHref: (id: string) => string;
  }
}
const engine = () => (window.TayoEngine as unknown as TayoEngineApi | undefined);
const reduced = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── the words: a small, safe markdown (bold, italic, code, lists, paragraphs), as React nodes ── */
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|(^|[^*])\*([^*\n]+)\*(?!\*)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    const lead = m[4] ?? "";
    out.push(s.slice(last, m.index) + lead);
    if (m[1] != null) out.push(<code key={k++}>{m[1]}</code>);
    else if (m[2] != null || m[3] != null) out.push(<strong key={k++}>{m[2] ?? m[3]}</strong>);
    else out.push(<em key={k++}>{m[5]}</em>);
    last = re.lastIndex;
  }
  out.push(s.slice(last));
  return out.filter((x) => x !== "");
}
function Md({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  const close = () => {
    if (!list) return;
    const L = list.tag;
    blocks.push(<L key={blocks.length}>{list.items.map((x, i) => <li key={i}>{inline(x)}</li>)}</L>);
    list = null;
  };
  String(text ?? "").split(/\n/).forEach((line) => {
    const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const tag = ul ? "ul" : "ol";
      if (!list || list.tag !== tag) { close(); list = { tag, items: [] }; }
      list.items.push((ul || ol)![1]);
    } else { close(); if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>); }
  });
  close();
  return <>{blocks.length ? blocks : <p>{inline(String(text ?? ""))}</p>}</>;
}

/* ── pieces of a reply ── */
function More({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="tj-more" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Less" : "More"}</button>
      <div className="tj-more-body" hidden={!open}><Md text={text} /></div>
    </>
  );
}
function PriceHistoryCard({ ph }: { ph: PriceHistory }) {
  if (!ph || !Array.isArray(ph.rows) || !ph.rows.length) return null;
  /* Only https links become links: a javascript: URL is not made safe by escaping. */
  const src = (ph.sources || []).filter((x) => x && /^https:\/\/[^\s"'<>]+$/i.test(String(x.url || "")));
  return (
    <div className="ph-card">
      <div className="ph-k">Past prices · {ph.area}{ph.unit ? " · " + ph.unit : ""}</div>
      <div className="ph-scroll"><table className="ph-t"><thead><tr><th>When</th><th>Typical price</th><th>Change</th></tr></thead>
        <tbody>{ph.rows.map((r, i) => <tr key={i}><td>{r.period}</td><td>{r.typical}</td><td>{r.change || ""}</td></tr>)}</tbody></table></div>
      {ph.summary ? <p className="ph-sum">{ph.summary}</p> : null}
      {src.length ? <p className="ph-src">Sources: {src.map((x, i) => <Fragment key={i}>{i ? " · " : ""}<a href={x.url} target="_blank" rel="noopener nofollow">{x.title}</a></Fragment>)}</p> : null}
    </div>
  );
}
function Checked({ sr }: { sr: Searched }) {
  const n = Number(sr.live) || 0, f = Number(sr.found) || 0;
  return (
    <div className="tj-checked">
      Checked our live listings{sr.where ? " in " + sr.where : ""}: {n === 0 ? "none there" : n + " live" + (sr.kinds ? " (" + sr.kinds + ")" : "")}{f ? " · " + f + " shown below" : ""}
    </div>
  );
}

/* THE DECK (Eden, 2026-10-22: "swipe to see the next one, the card in front goes to the back"). One card in front, the others
   peeking behind; swipe it away or use the arrows. The card itself is the shared listing card (matches-shared.js). */
function Deck({ matches }: { matches: Match[] }) {
  const n = matches.length;
  const [order, setOrder] = useState(() => matches.map((_, i) => i));   // order[pos] = card index
  const deck = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const drag = useRef<{ slot: HTMLElement; x: number; y: number; dx: number; t: number; on: boolean; id: number } | null>(null);
  const dragged = useRef(false);
  const cards = useRef<string[]>([]);
  if (cards.current.length !== n && window.SynMatches) {
    cards.current = matches.map((m, i) => window.SynMatches!.listingCardHtml(window.SynMatches!.shapeTojuMatch(m, i), i, { bare: true }));
  }
  const posOf = (i: number) => order.indexOf(i);
  const frontEl = () => deck.current?.querySelector<HTMLElement>(".hc-slot.front") ?? null;
  const go = (dir: number) => {
    if (n < 2 || busy.current) return;
    const rotate = () => setOrder((o) => o.slice(1).concat(o[0]));
    const f = frontEl();
    if (reduced() || !f) { rotate(); return; }
    busy.current = true;
    f.classList.add("flying");
    f.style.transform = "translateX(" + dir * 130 + "%) rotate(" + dir * 14 + "deg)";
    f.style.opacity = "0";
    setTimeout(() => {
      flushSync(rotate);
      f.classList.remove("flying"); f.style.transform = ""; f.style.opacity = "";
      busy.current = false;
    }, 240);
  };
  const back = () => { if (n >= 2 && !busy.current) setOrder((o) => [o[n - 1]].concat(o.slice(0, n - 1))); };

  const onDown = (e: React.PointerEvent) => {
    const slot = (e.target as HTMLElement).closest<HTMLElement>(".hc-slot.front");
    if (!slot || busy.current || n < 2) return;
    drag.current = { slot, x: e.clientX, y: e.clientY, dx: 0, t: Date.now(), on: false, id: e.pointerId };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }   // a scroll, not a swipe
      if (Math.abs(dx) < 8) return;
      d.on = true; d.slot.classList.add("dragging");
      try { d.slot.setPointerCapture(e.pointerId); } catch { /* the drag still follows the pointer */ }
    }
    d.dx = dx;
    d.slot.style.transform = "translateX(" + dx + "px) rotate(" + dx / 22 + "deg)";
  };
  const onEnd = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.on) return;
    d.slot.classList.remove("dragging");
    dragged.current = true; setTimeout(() => { dragged.current = false; }, 60);   // the click after a drag is not a tap
    const fast = Math.abs(d.dx) / Math.max(1, Date.now() - d.t) > 0.5;
    if (Math.abs(d.dx) > 70 || (fast && Math.abs(d.dx) > 30)) go(d.dx > 0 ? 1 : -1);
    else d.slot.style.transform = "";
  };
  const onClickCapture = (e: React.MouseEvent) => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); } };
  const onClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const hc = t.closest<HTMLElement>(".hc[data-id]");
    if (!hc || hc.closest(".hc-slot:not(.front)") || t.closest("a, button")) return;
    const href = engine()?.propertyHref(hc.dataset.id || "");
    if (href) window.location.href = href;
  };

  return (
    <>
      <div className="matches-h"><span className="mh-rule" aria-hidden="true" /><span className="lbl">HOMES WORTH A LOOK</span><span className="cnt">{n}</span></div>
      <div ref={deck} className="hc-deck" data-deck="" data-ready="1" data-n={n} role="group" aria-roledescription="carousel" aria-label="Homes Tayo found"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd} onClickCapture={onClickCapture} onClick={onClick}>
        {matches.map((_, i) => {
          const pos = posOf(i);
          return (
            <div key={i} className={"hc-slot" + (pos === 0 ? " front" : "")} data-orig={i} data-pos={pos}
              style={{ ["--d" as string]: String(pos) }} inert={pos !== 0} dangerouslySetInnerHTML={{ __html: cards.current[i] || "" }} />
          );
        })}
      </div>
      {n > 1 ? (
        <div className="hc-deck-bar">
          <button type="button" className="hc-deck-btn" aria-label="Previous home" onClick={back}>{"‹"}</button>
          <span className="hc-deck-count" aria-live="polite">{order[0] + 1} / {n}</span>
          <button type="button" className="hc-deck-btn" aria-label="Next home" onClick={() => go(-1)}>{"›"}</button>
        </div>
      ) : null}
      <a className="hc-viewall" href="browse.html">View all {n}{n === 1 ? " home" : " homes"}</a>
    </>
  );
}

const ICO = {
  share: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>,
  pin: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>,
  up: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>,
  down: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" /></svg>,
};

/* Share, pin, and the two thumbs under a reply. A word flashes over the button to say what happened. */
function Actions({ pl }: { pl: Payload }) {
  const [pinned, setPinned] = useState(() => !!engine()?.isPinned(pl.id));
  const [rating, setRating] = useState(() => engine()?.ratingOf(pl.id) ?? null);
  const [tip, setTip] = useState<{ act: string; word: string } | null>(null);
  const tipT = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {   // the Pinned sheet can unpin this reply
    const sync = () => setPinned(!!engine()?.isPinned(pl.id));
    return window.TayoView?.subscribe(sync);
  }, [pl.id]);
  const flash = (act: string, word: string) => { setTip({ act, word }); clearTimeout(tipT.current); tipT.current = setTimeout(() => setTip(null), 1600); };
  const share = () => {
    const text = engine()?.shareText(pl) ?? pl.text;
    if (navigator.share) { navigator.share({ title: "Tayo on Synapse", text }).catch((e) => { if (e && e.name !== "AbortError") flash("share", "Could not share"); }); return; }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => flash("share", "Copied"), () => window.prompt("Copy this to share it:", text));
    else window.prompt("Copy this to share it:", text);
  };
  const btn = (act: "share" | "pin" | "up" | "down", label: string, onClick: () => void, pressed?: boolean) => (
    <button type="button" className={"tj-ib" + (tip?.act === act ? " tip" : "")} data-act={act} data-tip={tip?.act === act ? tip.word : undefined}
      aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>{ICO[act]}</button>
  );
  const rate = (want: "up" | "down") => { const now = engine()?.rateValue(pl, want) ?? null; setRating(now); flash(want, now ? "Thanks" : "Removed"); };
  return (
    <div className="tj-acts" role="group" aria-label="Reply actions">
      {btn("share", "Share", share)}
      {btn("pin", pinned ? "Unpin" : "Pin", () => { const on = !!engine()?.togglePin(pl); setPinned(on); flash("pin", on ? "Pinned" : "Unpinned"); }, pinned)}
      {btn("up", "Good reply", () => rate("up"), rating === "up")}
      {btn("down", "Poor reply", () => rate("down"), rating === "down")}
    </div>
  );
}

function Avatar({ html }: { html: string }) {
  return <div className="av av-toju" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Reply({ it }: { it: Extract<Item, { kind: "toju" }> }) {
  return (
    <div className="msg toju m-enter">
      <Avatar html={it.zyn} />
      <div className="col">
        <div className="sender">Tayo</div>
        <div className="bubble"><Md text={it.text} />{it.more ? <More text={it.more} /> : null}</div>
        {it.priceHistory ? <PriceHistoryCard ph={it.priceHistory} /> : null}
        {it.searched && typeof it.searched === "object" ? <Checked sr={it.searched} /> : null}
        {it.matches.length ? <Deck matches={it.matches} /> : null}
        <Actions pl={it.payload} />
      </div>
    </div>
  );
}

/* Staged waiting words: what is actually happening, at the two moments a person starts to doubt the page. */
const STAGES = [
  { at: 2500, text: "Checking this against our verified listings…" },
  { at: 6000, text: "Still with you, I’d rather get this right than fast." },
];
function Typing({ zyn }: { zyn: string }) {
  const [stage, setStage] = useState("thinking…");
  useEffect(() => {
    const timers = STAGES.map((s) => setTimeout(() => { setStage(s.text); engine()?.scrollDown(); }, s.at));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="msg toju typing m-enter">
      <Avatar html={zyn} />
      <div className="col">
        <div className="sender">Tayo</div>
        <div className="bubble">
          <span className="sl sl-dots" role="status" aria-label="Tayo is typing"><i /><i /><i /></span>
          <span className="tj-stage" aria-live="polite" style={{ color: "var(--ink-muted)", fontStyle: "italic" }}>{stage}</span>
        </div>
      </div>
    </div>
  );
}

/* An error is not a Tayo message: it never enters the thread and never speaks in Tayo's voice. */
function ErrorNote({ it }: { it: Extract<Item, { kind: "error" }> }) {
  return (
    <div className="tj-error m-enter" role="alert">
      <div className="ei" dangerouslySetInnerHTML={{ __html: it.icon }} />
      <div className="et">
        <div className="eh">{it.err.ttl}</div>
        <div className="em">{it.err.msg}</div>
        {it.err.auto ? <div className="ew">Waiting for your connection…</div> : <button className="er" type="button" onClick={() => engine()?.retry()}>Try again</button>}
      </div>
    </div>
  );
}

/* The introduction as something you can hold. The tilt that follows the pointer is the page's (data-tkt). */
function Ticket({ it }: { it: Extract<Item, { kind: "ticket" }> }) {
  return (
    <div className="tkt-wrap">
      <div className="tkt" data-tkt="" role="group" aria-label="Introduction ticket">
        <div className="tkt-body">
          <div className="tkt-main">
            <div className="tkt-kicker"><span>INTRODUCTION</span><span>{it.when}</span></div>
            <div className="tkt-hero">
              {it.img ? <span className="tkt-ph"><img src={it.img} alt="" /></span> : null}
              <div className="tkt-t">{it.title}<small>{it.where}</small></div>
            </div>
            <div className="tkt-grid"><div><i>From</i><b>You, via Tayo</b></div><div><i>To</i><b>The agent</b></div><div><i>Status</i><b>{it.sent ? "Sent" : "Saved"}</b></div></div>
          </div>
          <div className="tkt-stub"><div className="tkt-ref"><i>Reference</i><b>{it.ref}</b></div><div className="tkt-bar" aria-hidden="true" /></div>
        </div>
      </div>
      <p className="tkt-note">{it.sent
        ? "The agent has been messaged with what we talked about. Quote this reference if you call them."
        : "The agency has your brief and will see it on their side. Quote this reference if you call them."}</p>
    </div>
  );
}

const slotLabel = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* What the agent will read, the times they have free, and one button. Nothing is sent until it is pressed. */
function Handover({ it }: { it: Extract<Item, { kind: "handover" }> }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const phone = useRef<HTMLInputElement>(null), handle = useRef<HTMLInputElement>(null);
  const sm = it.H.summary || {};
  const offer = it.H.openingOffer ? "Opening at ₦" + Number(it.H.openingOffer).toLocaleString("en-NG") : "";
  const rows: Array<[string, string | undefined]> = [
    ["Wants", sm.wants], ["Budget", sm.budget], ["Paying", sm.financing], ["Timeline", sm.timeline], ["Household", sm.household],
    ["Where it stands", [sm.position, offer].filter(Boolean).join(". ")],
    ["Asked", Array.isArray(sm.questions) && sm.questions.length ? sm.questions.join(" · ") : ""],
    ["Worried about", Array.isArray(sm.concerns) && sm.concerns.length ? sm.concerns.join(" · ") : ""],
    ["Next step", sm.nextStep],
  ];
  const locked = sending || sent;
  const send = () => {
    engine()?.handoverSend(it.H, chosen, { phone: phone.current?.value ?? "", handle: handle.current?.value ?? "" },
      { sending: setSending, sent: () => setSent(true) });
  };
  return (
    <div className="ho-card" id="hoCard">
      <div className="ho-k">Handover to the agent</div>
      <div className="ho-t">{it.title}</div>
      <ul className="ho-sum">{rows.filter(([, v]) => v).map(([k, v]) => <li key={k}><b>{k}</b>{v}</li>)}</ul>
      <div className="ho-k">The message Tayo will send</div>
      <div className="ho-msg">{it.H.message}</div>
      <div className="ho-k">{it.slots.length ? "Pick a viewing time the agent has free" : "Viewing"}</div>
      {it.slots.length ? (
        <div className="ho-slots" role="group" aria-label="Viewing times">
          {it.slots.map((s) => (
            <button key={s.starts_at} type="button" className={"ho-slot" + (chosen === s.starts_at ? " on" : "")} disabled={sent}
              onClick={() => setChosen(chosen === s.starts_at ? null : s.starts_at)}>{slotLabel(s.starts_at)}</button>
          ))}
        </div>
      ) : <p className="ho-note">The agent has not set viewing times for this home yet. They will propose one.</p>}
      <div className="ho-k">How the agent can reach you</div>
      <p className="ho-note" style={{ margin: "2px 0 0" }}>Your email goes with this. Add a phone number or a social media handle if you would like the agent to reach you there. Both are optional.</p>
      <div className="ho-contact">
        <input ref={phone} id="hoPhone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="Phone or WhatsApp number (optional)" aria-label="Phone or WhatsApp number, optional" />
        <input ref={handle} id="hoHandle" type="text" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={80} placeholder="Instagram or TikTok handle (optional)" aria-label="Instagram or TikTok handle, optional" />
      </div>
      <div className="ho-row">
        <button type="button" className="btn btn-primary" id="hoSend" disabled={locked} onClick={send}>{sending ? "Sending…" : "Send to the agent"}</button>
        <button type="button" className="btn btn-ghost" id="hoCancel" disabled={locked} onClick={() => engine()?.handoverCancel(it)}>Not yet</button>
      </div>
      <p className="ho-note">The agent gets this by WhatsApp and email. Nothing is sent until you press the button.</p>
    </div>
  );
}

function UserMsg({ text }: { text: string }) {
  return (
    <div className="msg user m-enter">
      <div className="col"><div className="bubble">{text}</div></div>
      <div className="av av-user">A</div>
    </div>
  );
}

const noItems: Item[] = [];
function List({ view }: { view: NonNullable<Window["TayoView"]> }) {
  const items = useSyncExternalStore(view.subscribe, view.items, () => noItems);
  /* Down to the newest, as the old drawing did after each addition. */
  const count = useRef(0);
  useLayoutEffect(() => {
    if (items.length !== count.current) { count.current = items.length; engine()?.scrollDown(); }
  }, [items]);
  return (
    <>
      {items.map((it) => {
        switch (it.kind) {
          case "user": return <UserMsg key={it.key} text={it.text} />;
          case "toju": return <Reply key={it.key} it={it} />;
          case "typing": return <Typing key={it.key} zyn={it.zyn} />;
          case "error": return <ErrorNote key={it.key} it={it} />;
          case "ticket": return <Ticket key={it.key} it={it} />;
          case "handover": return <Handover key={it.key} it={it} />;
          default: return null;
        }
      })}
    </>
  );
}

/** Takes #convo over from the engine's old drawing once both are there. */
export function Conversation() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const h = document.getElementById("convo");
    const view = window.TayoView;
    if (!h || !view || !window.TayoEngine || !window.SynMatches) return;
    view.attach();
    setHost(h);
  }, []);
  const view = typeof window !== "undefined" ? window.TayoView : undefined;
  return host && view ? createPortal(<List view={view} />, host) : null;
}
