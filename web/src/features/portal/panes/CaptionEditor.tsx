"use client";

import { useState } from "react";
import type { BrandRecord } from "../data/brand";
import { QUICK_REWRITES, capWarnings, reviseCaption, type ListingFacts } from "../data/composer";
import { TagRow } from "./TagRow";
import s from "./Composer.module.css";

/** One caption, at a readable size, with what it is missing and a place to ask for it to be changed in words. Undo steps back through every rewrite. */
export function CaptionEditor({ value, onChange, channel, listingId, facts, brand, rows = 8 }: {
  value: string; onChange: (v: string) => void; channel: string; listingId: string; facts: ListingFacts | null; brand: Partial<BrandRecord> | null; rows?: number;
}) {
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const warnings = facts ? capWarnings(channel, value, facts) : [];

  const rewrite = async (instruction: string) => {
    if (busy) return;
    setBusy(true); setNote("Rewriting…");
    try {
      const next = await reviseCaption(listingId, channel, value, instruction, brand);
      setHistory((h) => [...h, value]); onChange(next); setAsk(""); setNote("Rewritten.");
    } catch (e) { setNote(e instanceof Error ? e.message : "Could not rewrite it just now."); } finally { setBusy(false); }
  };

  return (
    <div className={s.ced}>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Caption" disabled={busy} />
      <div className={s.meta}>{value.length} characters{warnings.length > 0 && <span className={s.warns}>{warnings.map((w) => <span key={w}>⚠ {w}</span>)}</span>}</div>
      <TagRow value={value} onChange={onChange} />
      <div className={s.quick}>{QUICK_REWRITES.map(([label, q]) => <button key={label} type="button" disabled={busy} onClick={() => void rewrite(q)}>{label}</button>)}{history.length > 0 && <button type="button" disabled={busy} onClick={() => { onChange(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); setNote("Undone."); }}>Undo</button>}</div>
      <div className={s.askRow}>
        <input type="text" placeholder="Ask for a change: “lead with the service charge”" value={ask} aria-label="Ask for a change" onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void rewrite(ask); } }} />
        <button type="button" className={s.btn} disabled={busy || !ask.trim()} onClick={() => void rewrite(ask)}>Rewrite</button>
      </div>
      {note && <div className={s.note} role="status">{note}</div>}
    </div>
  );
}
