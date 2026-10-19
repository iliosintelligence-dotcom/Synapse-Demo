"use client";

import { useCallback, useState } from "react";

/** Same key and shape as the static site (`synapse_saved`, an array of listing ids), so saves carry across both during the migration. */
const KEY = "synapse_saved";

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useSaved(id: string) {
  /* Read once on first render. This hook only ever runs in the browser (the page waits for the URL), so there is nothing to hydrate. */
  const [saved, setSaved] = useState(() => typeof window !== "undefined" && read().includes(id));
  const toggle = useCallback(() => {
    const set = new Set(read());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...set]));
    } catch {
      /* storage blocked: the heart still flips for this visit */
    }
    setSaved(set.has(id));
  }, [id]);
  return { saved, toggle };
}
