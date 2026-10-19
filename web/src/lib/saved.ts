"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Saved homes: the same key and shape as the static site (`synapse_saved`, an array of listing ids), so saves carry across
 * both during the migration. Writes re-read storage first, so two tabs cannot overwrite each other with a stale list.
 */
const KEY = "synapse_saved";
const EVENT = "syn-saves-changed";

function parse(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb); // another tab saved something
  window.addEventListener(EVENT, cb); // this tab did
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};
const snapshot = () => {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};

export function toggleSave(id: string): void {
  const set = new Set(parse(snapshot()));
  if (set.has(id)) set.delete(id);
  else set.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* storage blocked: nothing persists this visit */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** All saved ids, live: repaints when this or another tab changes them. */
export function useSaves(): Set<string> {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  return useMemo(() => new Set(parse(raw)), [raw]);
}

export function useSaved(id: string) {
  const saves = useSaves();
  const toggle = useCallback(() => toggleSave(id), [id]);
  return { saved: saves.has(id), toggle };
}
