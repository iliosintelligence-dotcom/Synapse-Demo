"use client";
/**
 * "Your matches", the panel beside Tayo's chat (2026-10-23): a live preview of the Your matches page, the homes Tayo has found
 * in this conversation on a map and as cards. No toolbar: whatever the person wants changed, they tell Tayo.
 *
 * The chat engine (engine.ts) decides which homes are on it and publishes them in window.TayoCanvas; this draws them into
 * .tj-canvas. The cards and the map are the shared ones from
 * matches-shared.js, so they are identical to the Your matches page; saving a home writes the same saved list that page reads.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useEngineReady } from "./useEngineReady";

type Shaped = { id: string } & Record<string, unknown>;
type CanvasStore = {
  react: boolean; attach: () => void; items: () => Shaped[]; subscribe: (f: () => void) => () => void;
  sb: { url: string; anon: string };
};
type Shared = {
  listingCardHtml: (l: Shaped, i: number, opts?: Record<string, unknown>) => string;
  drawMatchMap: (state: Record<string, unknown>, elId: string, items: Shaped[], opts?: Record<string, unknown>) => unknown;
  readSaves: () => Set<string>;
  toggleSave: (id: string) => Set<string>;
  onSavesChanged: (fn: (s: Set<string>) => void) => void;
  propertyHref: (id: string) => string;
};
declare global {
  interface Window { TayoCanvas?: CanvasStore; synMotion?: { refresh: () => void } }
}
const shared = () => (window as unknown as { SynMatches?: Shared }).SynMatches;
const none: Shaped[] = [];

function Panel({ store }: { store: CanvasStore }) {
  const items = useSyncExternalStore(store.subscribe, store.items, () => none);
  const [saves, setSaves] = useState<Set<string>>(() => shared()?.readSaves() ?? new Set());
  const mapState = useRef<Record<string, unknown>>({});

  /* Saved in another tab (or on the Your matches page): the hearts follow. */
  useEffect(() => { shared()?.onSavesChanged((s) => setSaves(new Set(s))); }, []);

  /* The map shows the homes Tayo picked; no area search, which would replace them with whatever is in view. */
  useEffect(() => {
    if (!items.length) return;
    shared()?.drawMatchMap(mapState.current, "cvMap", items, { sb: store.sb });
    window.synMotion?.refresh();
  }, [items, store.sb]);

  const html = items.map((l, i) => shared()?.listingCardHtml(l, i, { saves }) ?? "").join("");
  const onClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const sv = t.closest<HTMLElement>("[data-save]");
    if (sv) { setSaves(new Set(shared()?.toggleSave(sv.getAttribute("data-save") || "") ?? [])); return; }
    const card = t.closest<HTMLElement>(".listing");
    if (card && !t.closest("a")) window.location.href = shared()?.propertyHref(card.getAttribute("data-id") || "") ?? "browse.html";
  };

  return (
    <>
      <div className="cv-head">
        <span className="cv-t">Your matches</span> <span className="cv-c" id="cvCount">{items.length}</span>{" "}
        <a className="cv-all" href="browse.html" title="Expand to the full Matches page">⤢ Expand</a>
      </div>
      <div className="cv-body" id="cvBody">
        <div id="cvMap" />
        <div className="grid" id="cvGrid" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  );
}

/** Draws into .tj-canvas once the engine is there. */
export function MatchesPanel() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const ready = useEngineReady();
  useEffect(() => {
    if (!ready) return;
    const h = document.querySelector<HTMLElement>(".tj-canvas");
    const store = window.TayoCanvas;
    if (!h || !store || !shared()) return;
    /* The page's markup leaves .tj-canvas empty for this panel; anything in it was drawn by the engine before it attached. */
    while (h.firstChild) h.removeChild(h.firstChild);
    store.attach();
    setHost(h);
  }, [ready]);
  const store = typeof window !== "undefined" ? window.TayoCanvas : undefined;
  return host && store ? createPortal(<Panel store={store} />, host) : null;
}
