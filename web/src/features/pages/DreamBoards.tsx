"use client";
/**
 * Dream boards (React since 2026-10-24, was src/legacy/dream/inline-3.js).
 *
 * Boards of pinned images, each pin tagged Housing, Areas, Décor, Lifestyle or Palette, plus vibe words and a mode (Dream,
 * Mood, Vision). All boards live in localStorage (synapse_dream_boards_v1). The active board is mirrored, split by category, to
 * synapse_moodboard_v1, which is what Tayo reads: Areas as a location signal, Housing as a type signal, Décor and Palette as
 * taste. A starter board is inspiration we wrote and never mirrors until the visitor keeps it. Nothing here is a listing.
 */
import { useEffect, useRef, useState } from "react";

const BKEY = "synapse_dream_boards_v1";   // all boards
const MIRROR = "synapse_moodboard_v1";    // active board, what Tayo reads
const SAVES = "synapse_saved";            // ♥'d homes -> watchlist count

type Cat = "housing" | "area" | "decor" | "lifestyle" | "palette";
type Pin = { u: string; c: string; cat?: Cat };
type Board = { id: string; name: string; starter?: boolean; vibe: string[]; images: Pin[]; mode?: string };
type State = { boards: Board[]; activeId: string | null };

const PALETTE: Pin[] = [
  // housing, the building itself
  { u: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=500&q=70", c: "Modern facade", cat: "housing" },
  { u: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=70", c: "Detached duplex", cat: "housing" },
  { u: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&q=70", c: "Terrace houses", cat: "housing" },
  // areas, neighbourhood & setting
  { u: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&q=70", c: "Leafy estate street", cat: "area" },
  { u: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=500&q=70", c: "Waterfront view", cat: "area" },
  { u: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=500&q=70", c: "City skyline", cat: "area" },
  // décor, interiors
  { u: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&q=70", c: "Open plan", cat: "decor" },
  { u: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=500&q=70", c: "Quiet bedroom", cat: "decor" },
  { u: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=500&q=70", c: "Kitchen", cat: "decor" },
  { u: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=500&q=70", c: "Living room", cat: "decor" },
  // lifestyle, how you'll live there
  { u: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&q=70", c: "Lounge", cat: "lifestyle" },
  { u: "https://images.unsplash.com/photo-1585128792020-803d29415281?w=500&q=70", c: "Terrace view", cat: "lifestyle" },
  { u: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500&q=70", c: "Poolside", cat: "lifestyle" },
  // palette, colour, light & material
  { u: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&q=70", c: "Warm minimal", cat: "palette" },
  { u: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=500&q=70", c: "Soft light", cat: "palette" },
  { u: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&q=70", c: "Bright & airy", cat: "palette" },
];
const uid = () => "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const CATS: Array<{ id: Cat; lbl: string; dot: string }> = [
  { id: "housing", lbl: "Housing", dot: "#121212" },
  { id: "area", lbl: "Areas", dot: "#3f9c6d" },
  { id: "decor", lbl: "Décor", dot: "#c98b3a" },
  { id: "lifestyle", lbl: "Lifestyle", dot: "#8a5cd6" },
  { id: "palette", lbl: "Palette", dot: "#2f6dbd" },
];
const CAT = Object.fromEntries(CATS.map((c) => [c.id, c])) as Record<Cat, (typeof CATS)[number]>;
function inferCat(c0: string): Cat {
  const c = String(c0 || "").toLowerCase();
  if (/facade|duplex|penthouse|curb|exterior|villa|bungalow|maisonette|block|storey|building/.test(c)) return "housing";
  if (/lekki|ikoyi|island|ikeja|yaba|estate|street|waterfront|neighbourhood|\barea\b|gated|skyline|corridor|district/.test(c)) return "area";
  if (/palette|colou?r|texture|material|tone|marble|wood|light|airy|minimal/.test(c)) return "palette";
  if (/pool|gym|garden|terrace|lounge|workspace|balcony|patio|rooftop|bar|spa/.test(c)) return "lifestyle";
  return "decor";
}
const MODES = [
  { id: "dream", lbl: "Dream", hint: "Your concrete wishlist, homes & must-haves. This is what Tayo matches you to.",
    /* Same mode, board Tayo cannot see yet. */
    hintUnadopted: "Your concrete wishlist, homes & must-haves. Keep this board and Tayo starts matching you to it." },
  { id: "mood", lbl: "Mood", hint: "The feeling, palettes, textures and interior vibe." },
  { id: "vision", lbl: "Vision", hint: "The whole outcome, home, neighbourhood and lifestyle you're aiming for." },
];

/* Starter board: INSPIRATION, never listings. No prices, addresses, chips or agency names. It never mirrors to Tayo (that
   would be a signal the visitor did not send); it only becomes theirs via "Keep this board". */
const STARTER_PINS: Pin[] = [
  { u: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=500&q=70", c: "Warm wood, stone counters", cat: "decor" },
  { u: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=500&q=70", c: "An island for slow Sunday cooking", cat: "decor" },
  { u: "https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?w=500&q=70", c: "Deep green cabinetry", cat: "decor" },
  { u: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=500&q=70", c: "White and timber, kept simple", cat: "decor" },
  { u: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=500&q=70", c: "Clean lines, open shelves", cat: "decor" },
  { u: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=500&q=70", c: "Soft morning light", cat: "palette" },
  { u: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&q=70", c: "Warm minimal", cat: "palette" },
  { u: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&q=70", c: "Bright and airy", cat: "palette" },
];
const starterBoard = (): Board => ({ id: uid(), name: "Lagos kitchens we love", starter: true, vibe: [], images: STARTER_PINS.map((p) => ({ ...p })) });

function loadState(): State {
  let state: State | null = null;
  try { state = JSON.parse(localStorage.getItem(BKEY) || "null"); } catch { /* none */ }
  if (!state || !Array.isArray(state.boards)) {
    // migrate a legacy single mood board, else offer the labelled starter board, never a pre-filled board presented as theirs
    let legacy: { name?: string; vibe?: string[]; images?: Pin[] } | null = null;
    try { legacy = JSON.parse(localStorage.getItem(MIRROR) || "null"); } catch { /* none */ }
    const first = legacy && (legacy.images || legacy.vibe)
      ? { id: uid(), name: legacy.name || "My dream home", vibe: legacy.vibe || [], images: legacy.images || [] }
      : starterBoard();
    state = { boards: [first], activeId: null };
  }
  // every board gets a mode (a starter board is Mood: décor and light), every pin a category
  state.boards.forEach((b) => {
    if (!b.mode) b.mode = b.starter ? "mood" : "dream";
    (b.images || []).forEach((im) => { if (!im.cat) im.cat = inferCat(im.c); });
  });
  return state;
}
const capsOf = (b: Board, id: Cat) => (b.images || []).filter((im) => (im.cat || "decor") === id).map((im) => im.c).filter(Boolean);
/* The active board, in the shape Tayo reads. A starter board is never mirrored. */
function mirror(b: Board | null) {
  if (!b || b.starter) return;
  try {
    localStorage.setItem(MIRROR, JSON.stringify({
      name: b.name, mode: b.mode || "dream", vibe: b.vibe, images: b.images,
      areas: capsOf(b, "area"), housing: capsOf(b, "housing"), lifestyle: capsOf(b, "lifestyle"),
      aesthetic: capsOf(b, "decor").concat(capsOf(b, "palette")),
    }));
  } catch { /* storage blocked */ }
}
function savesCount() { try { return (JSON.parse(localStorage.getItem(SAVES) || "[]") || []).length; } catch { return 0; } }

/* What the board says, honestly: no score, only the signals it actually holds and which are thin. */
const SIGNALS = [
  { id: "style", lbl: "Style", tip: "pin an interior or a palette you love" },
  { id: "area", lbl: "areas", tip: "pin a street, skyline or neighbourhood that feels right" },
  { id: "housing", lbl: "housing", tip: "pin the kind of building you see yourself in" },
  { id: "lifestyle", lbl: "lifestyle", tip: "pin how you want to live, a pool, a terrace, a workspace" },
] as const;
type Counts = Record<"style" | "area" | "housing" | "lifestyle", number>;
function signalCounts(b: Board): Counts {
  const n: Counts = { style: 0, area: 0, housing: 0, lifestyle: 0 };
  (b.images || []).forEach((im) => {
    const c = im.cat || "decor";
    if (c === "decor" || c === "palette") n.style++;
    else if (c in n) n[c as keyof Counts]++;
  });
  n.style += (b.vibe || []).length;
  return n;
}
const sigWord = (n: number) => (n === 0 ? "nothing yet" : n < 3 ? "starting to show" : "coming through clearly");

function Signals({ b }: { b: Board }) {
  const n = signalCounts(b);
  const prev = useRef<Counts | null>(null);
  const was = prev.current;
  useEffect(() => { prev.current = n; });
  const total = SIGNALS.reduce((t, s) => t + n[s.id], 0);
  let read: React.ReactNode;
  if (total === 0) read = "Nothing pinned yet, each pin teaches this board something: style, an area, a kind of home, a way of living.";
  else {
    const sorted = SIGNALS.slice().sort((a, c) => n[c.id] - n[a.id]);
    const strong = sorted[0], weak = sorted[sorted.length - 1];
    if (n[weak.id] === 0) read = <>This board says {n[strong.id] >= 3 ? "a lot" : "a little"} about <b>{strong.lbl.toLowerCase()}</b>, nothing yet about <b>{weak.lbl.toLowerCase()}</b>, {weak.tip}.</>;
    else if (n[weak.id] < 3) read = <>Every signal has something. The thinnest is <b>{weak.lbl.toLowerCase()}</b>, {weak.tip}.</>;
    else read = "Style, areas, housing and lifestyle all come through clearly. This board is ready for Tayo.";
  }
  return (
    <section className="signals" id="signals" aria-label="What this board says so far">
      <div className="sig-h">What this board says so far</div>
      <div className="sig-rows" id="sigRows">
        {SIGNALS.map((s) => {
          const lit = Math.min(n[s.id], 3), before = was ? Math.min(was[s.id], 3) : lit;   // only newly lit pips pop
          return (
            <div className="sig-row" key={s.id}>
              <span className="lbl">{s.lbl.charAt(0).toUpperCase() + s.lbl.slice(1)}</span>
              <span className="sig-pips" aria-hidden="true">
                {[0, 1, 2].map((i) => <i key={i} className={"sig-pip " + (i < lit ? "fill" : "") + " " + (i < lit && i >= before ? "pop" : "")} />)}
              </span>
              <span className="sig-state">{sigWord(n[s.id])}</span>
            </div>
          );
        })}
      </div>
      <p className="sig-read" id="sigRead" aria-live="polite">{read}</p>
    </section>
  );
}

function Tile({ im, i, onRemove }: { im: Pin; i: number; onRemove: (i: number) => void }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const c = CAT[im.cat || "decor"] || CAT.decor;
  return (
    <div className="tile">
      <img src={im.u} alt={im.c || "pinned image"} loading="lazy" onError={() => setGone(true)} />
      <span className="catdot" style={{ background: c.dot }} title={c.lbl} />
      {im.c ? <span className="cap">{im.c}</span> : null}
      <button className="rm" title="Remove" onClick={() => onRemove(i)}>×</button>
    </div>
  );
}

function firstUrl(s: string | null) { const m = String(s || "").match(/https?:\/\/[^\s"'<>]+/); return m ? m[0] : null; }

export function DreamBoards() {
  const [state, setState] = useState<State | null>(null);
  const [boardCat, setBoardCat] = useState<"all" | Cat>("all");
  const [vibeDraft, setVibeDraft] = useState("");
  const [url, setUrl] = useState("");
  const [urlCat, setUrlCat] = useState<Cat>("decor");
  const [share, setShare] = useState<{ label: string; board: string } | null>(null);
  const [saves, setSaves] = useState(0);
  const urlRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const vibeRef = useRef<HTMLInputElement>(null);

  const active = state ? state.boards.find((b) => b.id === state.activeId) || null : null;
  /* Every change saves, and re-mirrors the active board for Tayo. */
  const commit = (next: State) => {
    try { localStorage.setItem(BKEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    mirror(next.boards.find((b) => b.id === next.activeId) || null);
    setState({ ...next, boards: next.boards.slice() });
  };
  const editActive = (fn: (b: Board) => void) => {
    if (!state || !active) return;
    const b = { ...active, vibe: active.vibe.slice(), images: active.images.slice() };
    fn(b);
    commit({ ...state, boards: state.boards.map((x) => (x.id === b.id ? b : x)) });
  };
  const openBoard = (id: string, from?: State) => {
    const s = from || state; if (!s) return;
    setBoardCat("all"); setUrlCat("decor");
    commit({ ...s, activeId: id });
    window.scrollTo(0, 0);
  };
  const toHome = () => { if (!state) return; commit({ ...state, activeId: null }); setSaves(savesCount()); window.scrollTo(0, 0); };

  /* Boot: a share lands first, then a deep link ?board=<id>, else the boards home. */
  useEffect(() => {
    let s = loadState();
    try { localStorage.setItem(BKEY, JSON.stringify(s)); } catch { /* storage blocked */ }
    mirror(s.boards.find((b) => b.id === s.activeId) || null);
    setSaves(savesCount());
    const qp = new URLSearchParams(location.search);
    /* Pin from anywhere (Web Share Target): the shared link is previewed into the pin box, never pinned on its own. */
    const su = firstUrl(qp.get("share_url")) || firstUrl(qp.get("share_text"));
    if (su) {
      let b = s.boards.find((x) => x.id === s.activeId && !x.starter) || s.boards.find((x) => !x.starter);
      if (!b) { b = { id: uid(), name: "My pins", vibe: [], images: [], mode: "dream" }; s = { ...s, boards: s.boards.concat(b) }; }
      s = { ...s, activeId: b.id };
      try { localStorage.setItem(BKEY, JSON.stringify(s)); } catch { /* storage blocked */ }
      mirror(b);
      setShare({ label: (qp.get("share_title") || "").trim().slice(0, 80), board: b.name });
      setUrl(su);
      try { history.replaceState(null, "", location.pathname); } catch { /* old browsers */ }
      setState(s);
      setTimeout(() => urlRef.current?.focus(), 0);
    } else {
      const deep = qp.get("board");
      setState(deep && s.boards.some((b) => b.id === deep) ? { ...s, activeId: deep } : { ...s, activeId: null });
    }
    /* Installable and share-target capable; notify.js registers the same worker, so this is idempotent. */
    if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("sw.js"); } catch { /* unsupported */ } }
  }, []);

  /* The phone bar's back button: inside a board it goes back to the boards, not off the page. */
  useEffect(() => {
    const nav = (window as unknown as { CustNav?: { setBack: (f: (() => void) | null) => void } }).CustNav;
    const set = () => (window as unknown as { CustNav?: { setBack: (f: (() => void) | null) => void } }).CustNav?.setBack(active ? toHome : null);
    if (nav) set(); else window.addEventListener("syn:page-scripts", set, { once: true });
    return () => window.removeEventListener("syn:page-scripts", set);
  });
  useEffect(() => { if (active && titleRef.current && document.activeElement !== titleRef.current) titleRef.current.value = active.name || ""; }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createBoard = () => {
    if (!state) return;
    const raw = prompt("Name your new board", "New board");
    if (raw === null) return;   // cancelled: no empty board
    const b: Board = { id: uid(), name: raw.trim() || "New board", vibe: [], images: [], mode: "dream" };
    openBoard(b.id, { ...state, boards: state.boards.concat(b) });
  };
  const deleteBoard = () => {
    if (!state || !confirm("Delete this board? Its pins will be removed.")) return;
    let boards = state.boards.filter((b) => b.id !== state.activeId);
    if (!boards.length) boards = [{ id: uid(), name: "My dream home", vibe: [], images: [], mode: "dream" }];
    // the deleted board must stop informing Tayo until another board is opened
    try { localStorage.removeItem(MIRROR); } catch { /* storage blocked */ }
    const next = { boards, activeId: null };
    try { localStorage.setItem(BKEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    setState(next); setSaves(savesCount()); window.scrollTo(0, 0);
  };
  const addUrl = () => {
    const u = url.trim(); if (!u) return;
    editActive((b) => b.images.push({ u, c: "", cat: urlCat }));
    setUrl("");
  };
  const togglePalette = (p: Pin) => editActive((b) => {
    if (b.images.some((i) => i.u === p.u)) b.images = b.images.filter((i) => i.u !== p.u);
    else b.images.push({ u: p.u, c: p.c, cat: p.cat || "decor" });
  });

  const inBoard = !!active;
  const tojuHref = (() => {
    if (!active) return "toju.html";
    const areas = capsOf(active, "area"), housing = capsOf(active, "housing"), parts: string[] = [];
    if (active.vibe.length) parts.push("vibe: " + active.vibe.join(", "));
    if (housing.length) parts.push("home type: " + housing.join(", "));
    if (areas.length) parts.push("areas that feel right: " + areas.join(", "));
    return "toju.html?ask=" + encodeURIComponent('Find me verified homes that match my "' + (active.name || "dream") + '" board' + (parts.length ? ", " + parts.join("; ") : "") + ".");
  })();
  const mode = active ? active.mode || "dream" : "dream";
  const modeHint = active && active.starter && mode === "dream" ? MODES[0].hintUnadopted : (MODES.find((m) => m.id === mode) || MODES[0]).hint;
  const shown = active ? active.images.map((im, i) => ({ im, i })).filter(({ im }) => boardCat === "all" || (im.cat || "decor") === boardCat) : [];
  const pool = PALETTE.filter((p) => boardCat === "all" || (p.cat || "decor") === boardCat);

  return (
    <div className="board-wrap" data-cnav-back-slot="" role="main">
      <section id="homeView" className={inBoard ? "hidden" : undefined}>
        <div className="db-top">
          <div className="db-h1" role="heading" aria-level={1}>Dream boards</div>
          <button className="btn btn-primary" id="newBoardBtn" style={{ padding: "11px 18px", fontSize: "13.5px" }} onClick={createBoard}>+ New board</button>
        </div>
        {/* Starter boards are seeded, not made: only boards they made hide the explanation. */}
        <p className="muted" id="dbIntro" style={{ fontSize: "14px", marginTop: "6px" }} hidden={!state || state.boards.some((b) => !b.starter)}>
          Make a board for every idea: a whole home, a kitchen, a corridor you love. Pin what you like. Tayo reads each board and finds real verified homes that feel like it.
        </p>
        <div className="boards-grid" id="boardsGrid">
          {state ? <>
            {state.boards.map((b) => {
              const imgs = (b.images || []).slice(0, 4);
              return (
                <button className="bcard" key={b.id} data-open={b.id} onClick={() => openBoard(b.id)}>
                  <div className="bcover">
                    {imgs.length ? imgs.map((im, k) => <img key={k} src={im.u} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />) : <div className="bempty" aria-hidden="true" />}
                  </div>
                  <div className="bname">{b.name || "Untitled board"}</div>
                  <div className="bmeta">
                    {b.starter ? "Inspiration, not real listings"
                      : `${(b.images || []).length} pin${(b.images || []).length === 1 ? "" : "s"}${b.vibe && b.vibe.length ? " · " + b.vibe.length + " vibes" : ""}`}
                  </div>
                </button>
              );
            })}
            {saves > 0 ? (
              <a className="bcard watch" href="browse.html" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="bcover"><div className="wc"><b>{saves}</b><span>SAVED HOMES</span></div></div>
                <div className="bname">Saved homes</div><div className="bmeta">Your ♥ watchlist · open Your matches</div>
              </a>
            ) : null}
            <button className="bcard new" data-new="" onClick={createBoard}>
              <div className="bcover"><span className="plus">+</span></div>
              <div className="bname">Create board</div><div className="bmeta">A fresh idea, kept separate</div>
            </button>
          </> : null}
        </div>
      </section>
      <section id="boardView" className={inBoard ? "" : "hidden"}>
        <a className="db-back" id="backBtn" onClick={toHome}>← All boards</a>
        <div className="db-top" style={{ marginTop: "12px" }}>
          <input className="board-title" id="boardTitle" aria-label="Board name" ref={titleRef} defaultValue={active?.name || ""}
            onInput={(e) => { const v = e.currentTarget.value; editActive((b) => { b.name = v; }); }} />
          <div className="db-tools">
            <button id="renameBtn" onClick={() => { titleRef.current?.focus(); titleRef.current?.select(); }}><span data-icon="edit"></span>{" Rename"}</button>
            <button className="del" id="deleteBtn" onClick={deleteBoard}><span data-icon="trash"></span>{" Delete"}</button>
          </div>
        </div>
        <div className="mode-switch" id="modeSwitch" role="tablist" aria-label="Board mode">
          {active ? MODES.map((m) => (
            <button key={m.id} role="tab" className={"ms " + (m.id === mode ? "on" : "")} data-mode={m.id} aria-selected={m.id === mode} onClick={() => editActive((b) => { b.mode = m.id; })}>{m.lbl}</button>
          )) : null}
        </div>
        <p className="mode-hint muted" id="modeHint">{active ? modeHint : ""}</p>
        <div className={"starter-note" + (active && active.starter ? "" : " hidden")} id="starterNote">
          {active && active.starter ? <>
            <div className="t">Nothing here is a Synapse listing.</div>
            <button className="keep" id="keepBtn" onClick={() => editActive((b) => { delete b.starter; })}>Keep this board</button>
          </> : null}
        </div>
        <div className="vibe" id="vibe">
          {active ? active.vibe.map((v, i) => <span className="v" key={i}>{v} <button title="Remove" onClick={() => editActive((b) => { b.vibe.splice(i, 1); })}>×</button></span>) : null}
          <input id="vibeInput" placeholder="+ add a vibe…" ref={vibeRef} value={vibeDraft} onChange={(e) => setVibeDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && vibeDraft.trim()) { const v = vibeDraft.trim(); editActive((b) => { b.vibe.push(v); }); setVibeDraft(""); } }} />
        </div>
        {active && !active.starter ? <Signals b={active} /> : <section className="signals hidden" id="signals" aria-label="What this board says so far"><div className="sig-h">What this board says so far</div><div className="sig-rows" id="sigRows"></div><p className="sig-read" id="sigRead" aria-live="polite"></p></section>}
        <div className="cat-tabs" id="catTabs" role="tablist" aria-label="Filter pins by category">
          {active ? <>
            <button role="tab" className={"ct " + (boardCat === "all" ? "on" : "")} data-cat="all" aria-selected={boardCat === "all"} onClick={() => setBoardCat("all")}>All<b>{active.images.length}</b></button>
            {CATS.map((c) => {
              const n = active.images.filter((im) => (im.cat || "decor") === c.id).length;
              return n ? <button key={c.id} role="tab" className={"ct " + (boardCat === c.id ? "on" : "")} data-cat={c.id} aria-selected={boardCat === c.id} onClick={() => setBoardCat(c.id)}><i style={{ background: c.dot }}></i>{c.lbl}<b>{n}</b></button> : null;
            })}
          </> : null}
        </div>
        <div id="board">
          {!active ? null : !active.images.length ? (
            <div className="card add-card"><div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-muted)" }}><p style={{ maxWidth: "400px", margin: "0 auto", fontSize: "14.5px" }}>This board is empty. Pin a few images below and it starts to take shape, Tayo does the rest.</p></div></div>
          ) : !shown.length ? (
            <div className="card add-card"><div style={{ textAlign: "center", padding: "34px 0", color: "var(--ink-muted)" }}><p style={{ fontSize: "14px" }}>No <b>{boardCat === "all" ? "" : CAT[boardCat].lbl}</b> pins yet. Pin one below, or switch back to <button className="lnk-all" onClick={() => setBoardCat("all")}>All</button>.</p></div></div>
          ) : (
            <div className="masonry">{shown.map(({ im, i }) => <Tile key={im.u + i} im={im} i={i} onRemove={(k) => editActive((b) => { b.images.splice(k, 1); })} />)}</div>
          )}
        </div>
        <div className={"share-note" + (share ? "" : " hidden")} id="shareNote">
          {share ? <>
            <div className="t"><b>Shared to Synapse{share.label ? ", “" + share.label + "”" : ""}.</b> The link is ready below: pick a category and hit <b>Pin it</b> to add it to “{share.board}”. If the link isn&apos;t a direct image it may not render as a tile.</div>
            <button className="sn-x" aria-label="Dismiss shared link" onClick={() => setShare(null)}>×</button>
          </> : null}
        </div>
        <div className="card add-card">
          <div className="add-row">
            <input id="urlInput" type="url" placeholder="Paste an image URL to pin it to this board…" ref={urlRef} value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addUrl(); }} />
            <select id="urlCat" aria-label="Category for the pinned image" value={urlCat} onChange={(e) => setUrlCat(e.target.value as Cat)}>
              {active ? CATS.map((c) => <option key={c.id} value={c.id}>{c.lbl}</option>) : null}
            </select>
            <button className="btn btn-primary" id="addUrlBtn" style={{ padding: "11px 18px", fontSize: "13.5px" }} onClick={addUrl}>Pin it</button>
          </div>
          <p className="muted" style={{ fontSize: "12.5px", marginBottom: "10px" }}>Or pin from a little inspiration:</p>
          <div className="palette" id="palette">
            {active ? (pool.length ? pool : PALETTE).map((p) => {
              const c = CAT[p.cat || "decor"] || CAT.decor;
              return (
                <button key={p.u} className={"pal " + (active.images.some((i) => i.u === p.u) ? "added" : "")} data-u={p.u} data-c={p.c} data-cat={p.cat || "decor"} title={p.c + " · " + c.lbl} onClick={() => togglePalette(p)}>
                  <img src={p.u} alt={p.c} loading="lazy" />
                  <span className="catdot" style={{ background: c.dot }}></span>
                </button>
              );
            }) : null}
          </div>
        </div>
        <div className="card toju-cta">
          <span data-lottie="orb-pulse" data-speed="0.8" style={{ width: "44px", height: "44px", display: "inline-block" }}></span>
          <div className="t"><b>Turn this board into homes.</b>{" Tayo reads the styles, the light and the space you pinned and lines up verified listings that match the feeling."}</div>
          <a className="btn btn-primary" id="tojuBtn" href={tojuHref} style={{ whiteSpace: "nowrap" }}>Find my matches →</a>
        </div>
      </section>
    </div>
  );
}
