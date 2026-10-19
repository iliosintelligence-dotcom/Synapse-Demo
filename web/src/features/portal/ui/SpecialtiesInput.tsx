"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import s from "./SpecialtiesInput.module.css";

interface Group { g: string; items: string[] }
const norm = (v: string) => v.trim().toLowerCase();

/**
 * Choose-or-type chips. As a plain text box, "shortlets", "short let" and "short-let apartments" were three specialties; the list makes the
 * common ones one spelling, while typing still adds anything it lacks (a specialty saved before the list existed opens as a chip and is kept).
 * Keyboard: arrows move, Enter chooses or adds, Escape closes, Backspace on an empty box removes the last chip.
 */
export function SpecialtiesInput({ value, onChange, groups, id, placeholder = "Choose or type a specialty…", listLabel = "Specialties" }: { value: string[]; onChange: (v: string[]) => void; groups: Group[]; id: string; placeholder?: string; listLabel?: string }) {
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const has = (v: string) => value.some((c) => norm(c) === norm(v));

  const q = norm(typed);
  const shown = useMemo(() => groups.map((grp) => ({ g: grp.g, hits: grp.items.filter((it) => !q || norm(it).includes(q)) })).filter((x) => x.hits.length), [groups, q]);
  const exact = groups.some((grp) => grp.items.some((it) => norm(it) === q));
  const canAdd = !!typed.trim() && !exact && !has(typed);
  const flat = [...shown.flatMap((x) => x.hits), ...(canAdd ? [typed.trim()] : [])];

  const toggle = (v: string) => { onChange(has(v) ? value.filter((c) => norm(c) !== norm(v)) : [...value, v]); setTyped(""); input.current?.focus(); };
  const add = (raw: string) => {
    const next = [...value];
    raw.split(/[|,;\n]+/).map((x) => x.trim().replace(/\s+/g, " ")).filter(Boolean).forEach((v) => { if (!next.some((c) => norm(c) === norm(v))) next.push(v); });
    onChange(next);
    setTyped("");
  };

  // a click outside closes it
  useEffect(() => {
    const away = (e: MouseEvent) => { if (!host.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => (flat.length ? (h + 1) % flat.length : -1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (flat.length ? (h - 1 + flat.length) % flat.length : -1)); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter") { e.preventDefault(); if (hi >= 0 && flat[hi]) add(flat[hi]); else if (typed.trim()) add(typed); }
    else if (e.key === "Backspace" && !typed && value.length) onChange(value.slice(0, -1));
  };

  return (
    <div ref={host} className={s.host}>
      <div className={s.box} onClick={() => { input.current?.focus(); setOpen(true); }}>
        {value.map((a) => (
          <span key={a} className={s.chip}>{a}<button type="button" aria-label={`Remove ${a}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v !== a)); input.current?.focus(); }}>×</button></span>
        ))}
        <input
          ref={input} id={id} className={s.input} type="text" role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" autoComplete="off"
          placeholder={placeholder} value={typed}
          onChange={(e) => { setTyped(e.target.value); setOpen(true); setHi(-1); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
        />
      </div>
      {open && (
        <div className={s.menu} id={listId} role="listbox" aria-label={listLabel}>
          {shown.map((x) => (
            <div key={x.g}>
              <div className={s.grp}>{x.g}</div>
              {x.hits.map((it) => {
                const idx = flat.indexOf(it);
                // mousedown, not click: the input would blur first and shut the menu
                return <div key={it} role="option" aria-selected={has(it)} className={`${s.opt} ${idx === hi ? s.hi : ""}`} onMouseDown={(e) => { e.preventDefault(); toggle(it); }}>{it}</div>;
              })}
            </div>
          ))}
          {canAdd && <div role="option" aria-selected={false} className={`${s.opt} ${s.addOpt} ${flat.length - 1 === hi ? s.hi : ""}`} onMouseDown={(e) => { e.preventDefault(); add(typed); input.current?.focus(); }}>Add “{typed.trim()}”</div>}
          {!shown.length && !canAdd && <div className={s.none}>Already added.</div>}
        </div>
      )}
    </div>
  );
}
