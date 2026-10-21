"use client";

import { useEffect, useState } from "react";
import { naira } from "@/lib/format";
import { askVerdict } from "./queries";
import type { BrowseItem } from "./types";
import s from "./Browse.module.css";

/** Side by side. The best value in each numeric row is marked. Escape closes; the page behind stops scrolling while it is open. */
export function CompareSheet({ items, visitorId, onClose }: { items: BrowseItem[]; visitorId: string | null; onClose: () => void }) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [onClose]);

  const ask = async () => {
    setState("loading");
    const v = await askVerdict(visitorId, items).catch(() => null);
    setVerdict(v);
    setState(v ? "idle" : "failed");
  };

  const prices = items.map((l) => l.priceN);
  const scores = items.map((l) => l.score).filter((n): n is number => typeof n === "number");
  const bestPrice = Math.min(...prices);
  const bestScore = scores.length ? Math.max(...scores) : null;

  return (
    <div className={s.sheetWrap} role="dialog" aria-modal="true" aria-label="Compare homes">
      <div className={s.veil} onClick={onClose} />
      <div className={s.sheet}>
        <button type="button" className={s.sheetClose} aria-label="Close comparison" onClick={onClose}>✕</button>
        <h2 className={s.sheetTitle}>Compare side by side</h2>
        <div className={s.tableScroll}>
          <table className={s.table}>
            <thead>
              <tr><th />{items.map((l) => <th key={l.id}>{l.title}</th>)}</tr>
            </thead>
            <tbody>
              <tr><td className={s.h}>Price</td>{items.map((l) => <td key={l.id}><span className={l.priceN === bestPrice ? s.best : ""}>{naira(l.priceN)}</span></td>)}</tr>
              <tr><td className={s.h}>Property confidence</td>{items.map((l) => <td key={l.id}>{l.score == null ? "-" : <span className={l.score === bestScore ? s.best : ""}>{l.score}</span>}</td>)}</tr>
              <tr><td className={s.h}>Deal</td>{items.map((l) => <td key={l.id}>{l.deal}</td>)}</tr>
              <tr><td className={s.h}>Where</td>{items.map((l) => <td key={l.id}>{l.loc}</td>)}</tr>
              <tr><td className={s.h}>Verified</td>{items.map((l) => <td key={l.id}>{l.vstatus === "verified" ? "Yes" : "Not yet"}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <div className={s.verdictRow}>
          <button type="button" className={s.primary} onClick={ask} disabled={state === "loading"}>Ask Tayo: which is better for me?</button>
          <div className={s.verdict} aria-live="polite">
            {state === "loading" && <i>Tayo is weighing them against your brief…</i>}
            {state === "failed" && "Hmm, I could not reach Tayo. Try again."}
            {verdict && <><b>Tayo:</b> {verdict}</>}
          </div>
        </div>
      </div>
    </div>
  );
}
