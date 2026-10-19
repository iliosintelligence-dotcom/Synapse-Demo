"use client";

import { useState } from "react";
import { deleteGroup, refreshGroups, saveGroup, tagsIn, useTagGroups, withTags } from "../data/hashtags";
import { useToast } from "../ui/Toast";
import s from "./Composer.module.css";

/** Under a caption: tap a saved set to add it, or save the hashtags already in this caption as a set. Under every caption rather than one toolbar, because the tags for Instagram are not always the ones for Facebook. */
export function TagRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const toast = useToast();
  const groups = useTagGroups();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const tags = tagsIn(value);

  const add = (g: { name: string; tags: string[] }) => {
    const next = withTags(value, g.tags);
    if (!next) { toast("Already in this caption"); return; }
    onChange(next);
  };
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await saveGroup(name, tags); await refreshGroups(); setNaming(false); setName(""); toast("Saved. Tap it on any caption."); } catch (e) { toast(e instanceof Error ? e.message : "Could not save that group", "error"); }
    setBusy(false);
  };

  return (
    <div className={s.tagrow}>
      {groups.map((g) => (
        <span key={g.id} className={s.tagchip}>
          <button type="button" title={g.tags.map((t) => `#${t}`).join(" ")} onClick={() => add(g)}>{g.name} <i>{g.tags.length}</i></button>
          <button type="button" className={s.tagx} aria-label={`Delete the ${g.name} set`} onClick={() => { if (window.confirm(`Delete the “${g.name}” hashtag set?`)) void deleteGroup(g.id).then(refreshGroups, () => toast("Could not delete that set", "error")); }}>×</button>
        </span>
      ))}
      {naming ? (
        <span className={s.tagname}>
          <input autoFocus value={name} placeholder={`Name these ${tags.length} hashtags`} aria-label="Name this set" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } if (e.key === "Escape") setNaming(false); }} />
          <button type="button" disabled={busy || !name.trim()} onClick={() => void save()}>Save</button>
          <button type="button" onClick={() => setNaming(false)}>Cancel</button>
        </span>
      ) : (
        <button type="button" className={`${s.tagchip} ${s.tagadd}`} onClick={() => { if (!tags.length) { toast("No hashtags in this caption to save"); return; } setNaming(true); }}>＋ Save these</button>
      )}
    </div>
  );
}
