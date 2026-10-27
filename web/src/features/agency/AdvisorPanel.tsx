"use client";
/**
 * The persistent Ask-Tayo panel, as React (was openToju/advChips/advAsk in src/legacy/agency/inline-3.js). The AI commentary
 * lives here, not on the main panes, and what the panel shows depends on which pane the agency is looking at.
 *
 * What a pane's body says is AdvisorBodies.tsx, counted from what the portal has loaded. Here: the fab, opening and closing,
 * the suggested questions and the conversation with the agency-advisor function.
 *
 * openToju(), refreshTojuPanel(pane) and closeToju() survive as names (goToPane and three renderers call them) and
 * fire `syn:advisor-open`, `syn:advisor-refresh` and `syn:advisor-close`.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AdvisorBody, advisorHead } from "./AdvisorBodies";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/* One set per stage, plus a pane-specific question so the panel still knows which screen you are on. Written as things an
   agency would actually say, not as report titles. The stage is read from what the portal already knows (portalShell's
   SynAdvisorStage), so the chips are right the instant the panel opens; the server recomputes it from the database before it
   answers -- this decides what to SUGGEST, never what is true. */
const STAGE_QS: Record<string, string[]> = {
  new: [
    "I just signed up, what should I do first?",
    "How do I add my first listing?",
    "What does Synapse do for me once a listing is up?",
  ],
  "no-listings": [
    "How do I add my first listing?",
    "What makes a listing get verified?",
    "How do I set up my brand so posts sign off as us?",
  ],
  "no-leads": [
    "How do I publish this listing to Instagram?",
    "Why has nothing reached buyers yet?",
    "What happens when a buyer contacts us?",
  ],
  running: [
    "Where should I focus today?",
    "Which of my listings need attention?",
    "How is my pipeline looking?",
  ],
};
/* Keyed by the data-pane value (`agents`, `subscription`), and every one answerable from the live snapshot of THIS agency the
   advisor is handed, rather than asking the product to explain itself. */
const PANE_Q: Record<string, string> = {
  overview: "What is getting in the way of my listings reaching buyers?",
  listings: "Which of my listings are going stale, and what should I do about them?",
  marketing: "Have my posts actually published, or are they still rehearsals?",
  crm: "Where in the pipeline are my leads getting stuck?",
  social: "Which channels am I connected to, and which am I missing?",
  negotiator: "Which of my leads are worth a call today?",
  agents: "Is my team the right size for the listings we are running?",
  tours: "Which viewings still need chasing?",
  brand: "What is still missing from my brand setup?",
  verification: "What do I still need to send to get verified?",
  subscription: "Does my plan fit how much we are actually listing?",
};

const currentPane = () => (document.querySelector<HTMLElement>("#tabs a.on")?.dataset.pane) || "overview";
function chipsFor(pane: string) {
  let stage = "running";
  try { stage = W().SynAdvisorStage?.() || "running"; } catch { /* the portal is still loading */ }
  const qs = (STAGE_QS[stage] || STAGE_QS.running).slice();
  const pq = PANE_Q[pane];
  if (pq && qs.indexOf(pq) === -1) qs.push(pq);
  return qs;
}
const zyn = (img: Element | null, s: string) => { if (img && W().Zyn) W().Zyn.set(img, s); };

/* **bold** only. The advisor writes plain prose and the odd bold label; anything else is shown as typed. */
const Said = ({ text }: { text: string }) => <>{text.split(/\*\*([^*]+)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))}</>;

type Msg = { id: number; who: "you" | "toju" | "bad"; text: string };
type Body = { seq: number; pane: string };
type Turn = { role: "user" | "assistant"; content: string };

let open = false;
const subs = new Set<() => void>();
const setOpen = (v: boolean) => { open = v; subs.forEach((f) => f()); };
const useOpen = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => open, () => false);

export function AdvisorFab() {
  const img = useRef<HTMLImageElement>(null);
  return (
    <button className="toju-fab" id="tojuFab" aria-label="Ask Tayo" onClick={() => window.dispatchEvent(new CustomEvent("syn:advisor-open"))}
      onMouseEnter={() => zyn(img.current, "waving")} onMouseLeave={() => zyn(img.current, "happy")}>
      <img ref={img} className="zyn zm-bob" src="../images/zyn/zyn-happy.webp?v=cat" width="92" height="92" alt="" aria-hidden="true" draggable="false" />
    </button>
  );
}

export function AdvisorPanel() {
  const on = useOpen();
  const [body, setBody] = useState<Body>({ seq: 0, pane: "" });
  const [chips, setChips] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const history = useRef<Turn[]>([]);   // the panel's own conversation, this session
  const ids = useRef(0);
  const busyRef = useRef(false);
  const face = useRef<HTMLImageElement>(null);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const show = () => {
      const pane = currentPane();
      setBody((s) => ({ seq: s.seq + 1, pane }));
      setOpen(true);
      if (!busyRef.current) setChips(chipsFor(pane));
    };
    /* Keeps the open panel's snapshot fresh when a pane's numbers change, but only for the pane on screen. */
    const refresh = (e: Event) => { if (open && currentPane() === (e as CustomEvent).detail) show(); };
    const close = () => setOpen(false);
    window.addEventListener("syn:advisor-open", show);
    window.addEventListener("syn:advisor-refresh", refresh);
    window.addEventListener("syn:advisor-close", close);
    return () => {
      window.removeEventListener("syn:advisor-open", show);
      window.removeEventListener("syn:advisor-refresh", refresh);
      window.removeEventListener("syn:advisor-close", close);
    };
  }, []);
  useEffect(() => { document.body.classList.toggle("tpanel-open", on); }, [on]);
  /* The thread does not scroll -- the panel does -- so keeping the newest message in view means moving the column. */
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [msgs]);

  const ask = (question: string) => {
    if (busyRef.current || !question) return;
    busyRef.current = true; setBusy(true);
    setQ(""); setChips([]);
    const you = ++ids.current, pending = ++ids.current;
    setMsgs((m) => [...m, { id: you, who: "you", text: question }, { id: pending, who: "toju", text: "Thinking…" }]);
    zyn(face.current, "thinking");
    const settle = (who: Msg["who"], text: string) => setMsgs((m) => m.map((x) => (x.id === pending ? { ...x, who, text } : x)));

    W().SynAuth.client()
      .then((c: any) => c.auth.getSession())
      .then((r: any) => {
        const tok = r && r.data && r.data.session && r.data.session.access_token;
        if (!tok) throw new Error("Sign in again to ask.");
        return fetch(SB_URL + "/functions/v1/agency-advisor", {
          method: "POST",
          headers: { apikey: SB_KEY, Authorization: "Bearer " + tok, "Content-Type": "application/json" },
          body: JSON.stringify({ question, history: history.current.slice(-10) }),
        });
      })
      .then((res: Response) => res.json())
      .then((d: any) => {
        if (d.error && !d.answer) throw new Error(d.error);
        const answer = String(d.answer || "");
        settle("toju", answer);
        zyn(face.current, W().Zyn ? W().Zyn.forReply({ text: d.answer }) : "helpful");
        history.current.push({ role: "user", content: question }, { role: "assistant", content: d.answer });
      })
      .catch((err: any) => {
        zyn(face.current, "sorry");
        settle("bad", (err && err.message) || "Could not reach the advisor just now.");
      })
      .then(() => {
        busyRef.current = false; setBusy(false);
        setChips(chipsFor(currentPane()));
      });
  };
  const close = () => setOpen(false);
  const head = body.pane ? advisorHead(body.pane) : { title: "Ask Tayo", sub: "" };

  return (
    <>
      <div className={"tpanel-scrim" + (on ? " on" : "")} id="tpScrim" onClick={close}></div>
      <aside className={"tpanel" + (on ? " on" : "")} id="tpanel" aria-label="Ask Tayo">
        <div className="thd">
          <img ref={face} className="zyn zm-bob o-zyn" id="tpZyn" src="../images/zyn/zyn-waving.webp?v=cat" width="58" height="58" alt="" aria-hidden="true"
            onClick={() => { if (W().Zyn) W().Zyn.emote(face.current); }} />
          <div>
            <div className="tt" id="tpTitle">{head.title}</div>
            <div className="sb" id="tpSub">{head.sub}</div>
          </div>
          <button className="x" id="tpClose" aria-label="Close" onClick={close}>{"×"}</button>
        </div>
        <div className="tp-scroll" id="tpScroll" ref={scroll}>
          {/* Rebuilt on every opening and refresh (keyed by seq). */}
          <div className="tbody" id="tpBody" key={body.seq}>{body.pane ? <AdvisorBody pane={body.pane} /> : null}</div>
          <div className="tp-thread" id="tpThread">
            {msgs.map((m) => <div key={m.id} className={"tp-msg " + m.who}>{m.who === "bad" ? m.text : <Said text={m.text} />}</div>)}
          </div>
          <div className="tp-chips" id="tpChips">
            {chips.map((c) => <button key={c} type="button" className="tp-chip" onClick={() => ask(c)}>{c}</button>)}
          </div>
        </div>
        <div className="tp-ask">
          <form className="tp-composer" id="tpForm" onSubmit={(e) => { e.preventDefault(); ask(q.trim()); }}>
            <input id="tpInput" type="text" autoComplete="off" placeholder={"Ask about your numbers, or how to do something…"} aria-label="Ask the advisor"
              value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" id="tpSend" aria-label="Send" disabled={busy}>{"↑"}</button>
          </form>
        </div>
      </aside>
    </>
  );
}
