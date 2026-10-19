import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";

/** A saved set of hashtags, stored WITHOUT the leading "#" (storing it would make #Lekki and Lekki two different tags). */
export interface TagGroup { id: string; name: string; tags: string[] }

/** The hashtags in a caption, without the "#", for comparing. */
export const tagsIn = (text: string): string[] => (String(text || "").match(/#[\wÀ-ɏ]+/g) || []).map((t) => t.slice(1));

/** Add a group's tags to a caption, skipping any already there (case-insensitively: Instagram reads #Lekki and #lekki as one tag, so the agency should not have to notice). Null when nothing is new. */
export function withTags(caption: string, tags: string[]): string | null {
  const have = new Set(tagsIn(caption).map((t) => t.toLowerCase()));
  const fresh = tags.filter((t) => !have.has(String(t).toLowerCase()));
  return fresh.length ? `${caption.replace(/\s+$/, "")}\n\n${fresh.map((t) => `#${t}`).join(" ")}` : null;
}

export async function fetchGroups(): Promise<TagGroup[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("hashtag_groups").select("id, name, tags, updated_at").eq("agency_id", aid).is("deleted_at", null).order("name", { ascending: true });
  if (r.error) throw r.error;
  return ((r.data ?? []) as Array<{ id: string; name: string; tags: string[] | null }>).map((g) => ({ id: g.id, name: g.name, tags: g.tags ?? [] }));
}

/** Through the RPC because the normalising (stripping the #, dropping punctuation, folding duplicates by case) has to happen in one place, or a second caller quietly adds a duplicate nobody can tell apart in the picker. */
export async function saveGroup(name: string, tags: string[]): Promise<void> {
  if (!name.trim()) throw new Error("Name the group first");
  const r = await supabase.rpc("save_hashtag_group", { p_name: name.trim(), p_tags: tags, p_id: null });
  if (r.error) throw r.error;
}
export async function deleteGroup(id: string): Promise<void> {
  const r = await supabase.from("hashtag_groups").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null);
  if (r.error) throw r.error;
}

// Loaded once and kept: they change rarely, and every caption editor on screen should see a group the moment it is saved.
let cache: TagGroup[] | null = null;
let loading: Promise<void> | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export async function refreshGroups(): Promise<void> {
  cache = await fetchGroups().catch(() => cache ?? []);
  emit();
}
export function useTagGroups(): TagGroup[] {
  const groups = useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => cache, () => null);
  useEffect(() => { if (cache === null && !loading) loading = refreshGroups().finally(() => { loading = null; }); }, []);
  return groups ?? [];
}
