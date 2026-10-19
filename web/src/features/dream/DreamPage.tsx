"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { SiteBar } from "@/components/SiteBar";
import { routes } from "@/lib/routes";
import {
  CATS, MODES, PALETTE, SIGNALS, catOf, clearMirror, load, persist, reduce, safeImageUrl, savedCount, signalCounts, signalRead, signalWord, tojuQuestion,
  type Board, type CatId, type State,
} from "./boards";
import s from "./Dream.module.css";

/** /dream/. Mood boards, kept on this device; the active one is what Tayo reads. */
export function DreamPage() {
  return (
    <>
      <SiteBar active="dream" />
      <ClientOnly fallback={<main className={s.page} aria-hidden="true" />}><DreamInner /></ClientOnly>
    </>
  );
}

function DreamInner() {
  const [state, dispatch] = useReducer(reduce, undefined as unknown as State, load);
  const [cat, setCat] = useState<"all" | CatId>("all");
  // A shared link (from the OS share sheet, once the app is installed) is read once, from the address, when the page opens.
  const [share] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    const link = (q.get("share_url") ?? "").match(/https?:\/\/[^\s"'<>]+/)?.[0] ?? (q.get("share_text") ?? "").match(/https?:\/\/[^\s"'<>]+/)?.[0];
    return link ? { link, title: (q.get("share_title") ?? "").trim().slice(0, 80) || "a link" } : null;
  });
  const [url, setUrl] = useState(share?.link ?? "");
  const [urlCat, setUrlCat] = useState<CatId>("decor");
  const [shareNote, setShareNote] = useState<string | null>(share?.title ?? null);
  const [naming, setNaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const started = useRef(false);
  const board = state.boards.find((b) => b.id === state.activeId) ?? null;

  useEffect(() => persist(state), [state]);

  // What the address asked for, once: a shared link (from the OS share sheet, once the app is installed) or a deep link to a board.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const q = new URLSearchParams(window.location.search);
    if (share) {
      // never auto-pin: the link is previewed into the pin box for the visitor to confirm, because a share is not yet a decision. It lands in a board they own, never the starter.
      const mine = state.boards.find((b) => !b.starter);
      if (mine) dispatch({ type: "open", id: mine.id }); else dispatch({ type: "create", name: "My pins" });
      try { history.replaceState(null, "", window.location.pathname); } catch { /* the address stays; harmless */ }
      return;
    }
    const deep = q.get("board");
    if (deep) dispatch({ type: "open", id: deep });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!board) {
    return (
      <main className={s.page}>
        <div className={s.top}>
          <h1 className={s.h1}>Dream boards</h1>
          <button className={s.primary} type="button" onClick={() => setNaming("New board")}>+ New board</button>
        </div>
        {!state.boards.some((b) => !b.starter) && (
          <p className={s.muted}>Make a board for every idea: a whole home, a kitchen, a corridor you love. Pin what you like. Tayo reads each board and finds real verified homes that match the feeling.</p>
        )}
        {naming !== null && (
          <form className={s.naming} onSubmit={(e) => { e.preventDefault(); dispatch({ type: "create", name: naming }); setNaming(null); setCat("all"); }}>
            <label htmlFor="newName">Name your new board</label>
            <input id="newName" value={naming} onChange={(e) => setNaming(e.target.value)} autoFocus />
            <button className={s.primary} type="submit">Create</button>
            <button className={s.ghost} type="button" onClick={() => setNaming(null)}>Cancel</button>
          </form>
        )}
        <div className={s.grid}>
          {state.boards.map((b) => (
            <button key={b.id} type="button" className={s.bcard} onClick={() => { dispatch({ type: "open", id: b.id }); setCat("all"); setConfirmDelete(false); }}>
              <div className={s.cover}>
                {b.images.slice(0, 4).map((im) =>   <img key={im.u} src={im.u} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />)}
              </div>
              <div className={s.bname}>{b.name || "Untitled board"}</div>
              <div className={s.bmeta}>{b.starter ? "Inspiration, not real listings" : `${b.images.length} pin${b.images.length === 1 ? "" : "s"}${b.vibe.length ? ` · ${b.vibe.length} vibes` : ""}`}</div>
            </button>
          ))}
          {savedCount() > 0 && (
            <a className={`${s.bcard} ${s.watch}`} href={routes.browse()}>
              <div className={s.cover}><div className={s.wc}><b>{savedCount()}</b><span>SAVED HOMES</span></div></div>
              <div className={s.bname}>Saved homes</div>
              <div className={s.bmeta}>Your ♥ watchlist · open Your matches</div>
            </a>
          )}
          <button type="button" className={`${s.bcard} ${s.newCard}`} onClick={() => setNaming("New board")}>
            <div className={s.cover}><span className={s.plus}>+</span></div>
            <div className={s.bname}>Create board</div>
            <div className={s.bmeta}>A fresh idea, kept separate</div>
          </button>
        </div>
      </main>
    );
  }

  return <BoardView board={board} state={state} dispatch={dispatch} cat={cat} setCat={setCat} url={url} setUrl={setUrl} urlCat={urlCat} setUrlCat={setUrlCat}
    shareNote={shareNote} dismissShare={() => setShareNote(null)} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} />;
}

interface ViewProps {
  board: Board; state: State; dispatch: React.Dispatch<Parameters<typeof reduce>[1]>;
  cat: "all" | CatId; setCat: (c: "all" | CatId) => void; url: string; setUrl: (u: string) => void; urlCat: CatId; setUrlCat: (c: CatId) => void;
  shareNote: string | null; dismissShare: () => void; confirmDelete: boolean; setConfirmDelete: (v: boolean) => void;
}

function BoardView({ board, dispatch, cat, setCat, url, setUrl, urlCat, setUrlCat, shareNote, dismissShare, confirmDelete, setConfirmDelete }: ViewProps) {
  const [vibe, setVibe] = useState("");
  const [bad, setBad] = useState("");
  const mode = board.mode ?? "dream";
  const counts = useMemo(() => signalCounts(board), [board]);
  const read = signalRead(counts);
  const shown = board.images.map((im, i) => ({ im, i })).filter(({ im }) => cat === "all" || (im.cat || "decor") === cat);
  const pool = PALETTE.filter((p) => cat === "all" || p.cat === cat);
  const palette = pool.length ? pool : PALETTE;
  const hasPin = (u: string) => board.images.some((i) => i.u === u);
  const m = MODES.find((x) => x.id === mode) ?? MODES[0];

  const addUrl = () => {
    const safe = safeImageUrl(url);
    if (!url.trim()) return;
    if (!safe) return setBad("That does not look like a web address for an image.");
    setBad("");
    dispatch({ type: "pin", pin: { u: safe, c: "", cat: urlCat } });
    setUrl("");
  };

  return (
    <main className={s.page}>
      <button className={s.back} type="button" onClick={() => { dispatch({ type: "home" }); setConfirmDelete(false); }}>← All boards</button>
      <div className={s.top}>
        <input className={s.title} aria-label="Board name" value={board.name} onChange={(e) => dispatch({ type: "rename", name: e.target.value })} />
        <div className={s.tools}>
          {confirmDelete ? (
            <>
              <span className={s.muted}>Delete this board? Its pins will be removed.</span>
              <button className={s.danger} type="button" onClick={() => { clearMirror(); dispatch({ type: "delete" }); setConfirmDelete(false); }}>Delete</button>
              <button className={s.ghost} type="button" onClick={() => setConfirmDelete(false)}>Keep it</button>
            </>
          ) : <button className={s.ghost} type="button" onClick={() => setConfirmDelete(true)}>Delete</button>}
        </div>
      </div>

      <div className={s.modeSwitch} role="tablist" aria-label="Board mode">
        {MODES.map((x) => <button key={x.id} role="tab" type="button" aria-selected={x.id === mode} className={x.id === mode ? s.on : ""} onClick={() => dispatch({ type: "mode", mode: x.id })}>{x.label}</button>)}
      </div>
      <p className={s.muted}>{board.starter && mode === "dream" ? m.hintUnadopted : m.hint}</p>

      {board.starter && (
        <div className={s.starter}>
          <div><b>Nothing here is a Synapse listing.</b></div>
          <button className={s.primary} type="button" onClick={() => dispatch({ type: "keep" })}>Keep this board</button>
        </div>
      )}

      <div className={s.vibes}>
        {board.vibe.map((v, i) => <span key={`${v}-${i}`} className={s.vibeChip}>{v} <button type="button" aria-label={`Remove ${v}`} onClick={() => dispatch({ type: "removeVibe", index: i })}>×</button></span>)}
        <input placeholder="+ add a vibe…" value={vibe} onChange={(e) => setVibe(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && vibe.trim()) { dispatch({ type: "addVibe", text: vibe }); setVibe(""); } }} aria-label="Add a vibe" />
      </div>

      {!board.starter && (
        <section className={s.signals} aria-label="What this board says so far">
          <div className={s.sigH}>What this board says so far</div>
          {SIGNALS.map((g) => {
            const lit = Math.min(counts[g.id], 3);
            return (
              <div key={g.id} className={s.sigRow}>
                <span className={s.sigLbl}>{g.label.charAt(0).toUpperCase() + g.label.slice(1)}</span>
                <span className={s.pips} aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i < lit ? s.fill : ""} />)}</span>
                <span className={s.sigState}>{signalWord(counts[g.id])}</span>
              </div>
            );
          })}
          <p className={s.sigRead} aria-live="polite">
            {read.kind === "empty" && "Nothing pinned yet. Each pin teaches this board something: style, an area, a kind of home, a way of living."}
            {read.kind === "gap" && <>This board says {read.many ? "a lot" : "a little"} about <b>{read.strong}</b>, nothing yet about <b>{read.weak}</b>: {read.tip}.</>}
            {read.kind === "thin" && <>Every signal has something. The thinnest is <b>{read.weak}</b>: {read.tip}.</>}
            {read.kind === "ready" && "Style, areas, housing and lifestyle all come through clearly. This board is ready for Tayo."}
          </p>
        </section>
      )}

      <div className={s.catTabs} role="tablist" aria-label="Filter pins by category">
        <button role="tab" type="button" aria-selected={cat === "all"} className={cat === "all" ? s.on : ""} onClick={() => setCat("all")}>All <b>{board.images.length}</b></button>
        {CATS.map((c) => { const n = board.images.filter((im) => (im.cat || "decor") === c.id).length; return n ? (
          <button key={c.id} role="tab" type="button" aria-selected={cat === c.id} className={cat === c.id ? s.on : ""} onClick={() => setCat(c.id)}><i style={{ background: c.dot }} />{c.label} <b>{n}</b></button>
        ) : null; })}
      </div>

      {!board.images.length ? (
        <div className={s.empty}>This board is empty. Pin an image from the inspiration below, or paste a link to one.</div>
      ) : !shown.length ? (
        <div className={s.empty}>No <b>{catOf(cat === "all" ? undefined : cat).label}</b> pins yet. <button className={s.link} type="button" onClick={() => setCat("all")}>Show all</button></div>
      ) : (
        <div className={s.masonry}>
          {shown.map(({ im, i }) => (
            <div key={`${im.u}-${i}`} className={s.tile}>
              { }
              <img src={im.u} alt={im.c || "pinned image"} loading="lazy" onError={(e) => { e.currentTarget.closest("div")?.setAttribute("hidden", ""); }} />
              <span className={s.catdot} style={{ background: catOf(im.cat).dot }} title={catOf(im.cat).label} />
              {im.c && <span className={s.cap}>{im.c}</span>}
              <button className={s.rm} type="button" title="Remove" aria-label={`Remove ${im.c || "pin"}`} onClick={() => dispatch({ type: "unpin", index: i })}>×</button>
            </div>
          ))}
        </div>
      )}

      {shareNote !== null && (
        <div className={s.shareNote}>
          <div><b>Shared to Synapse: {shareNote}.</b> The link is ready below: pick a category and hit <b>Pin it</b> to add it to “{board.name}”. If the link isn’t a direct image it may not render as a tile.</div>
          <button type="button" aria-label="Dismiss shared link" onClick={dismissShare}>×</button>
        </div>
      )}

      <div className={s.addCard}>
        <div className={s.addRow}>
          <input type="url" placeholder="Paste an image URL to pin it to this board…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addUrl(); }} aria-label="Image address" />
          <select value={urlCat} onChange={(e) => setUrlCat(e.target.value as CatId)} aria-label="Category for the pinned image">{CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          <button className={s.primary} type="button" onClick={addUrl}>Pin it</button>
        </div>
        {bad && <p className={s.bad} role="alert">{bad}</p>}
        <p className={s.muted}>Or pin from a little inspiration:</p>
        <div className={s.palette}>
          {palette.map((p) => (
            <button key={p.u} type="button" className={hasPin(p.u) ? s.added : ""} title={`${p.c} · ${catOf(p.cat).label}`} aria-pressed={hasPin(p.u)} onClick={() => dispatch({ type: "togglePalette", pin: p })}>
              { }
              <img src={p.u} alt={p.c} loading="lazy" />
              <span className={s.catdot} style={{ background: catOf(p.cat).dot }} />
            </button>
          ))}
        </div>
      </div>

      <div className={s.cta}>
        <div><b>Turn this board into homes.</b> Tayo reads the styles, the light and the space you pinned and lines up verified listings that match the feeling.</div>
        <a className={s.primary} href={routes.tayo(`?ask=${encodeURIComponent(tojuQuestion(board))}`)}>Find my matches →</a>
      </div>
    </main>
  );
}
