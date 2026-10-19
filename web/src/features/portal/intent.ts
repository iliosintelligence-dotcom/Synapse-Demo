"use client";

import { useEffect, useRef } from "react";
import type { Intent } from "./data/setup";

/**
 * "Take me there and start it": a step that sends you to a pane also asks the pane to open its form. The pane may not be mounted yet (it mounts after the
 * address changes) or may already be on screen, so the ask is held until a pane picks it up, and announced for one that is already listening.
 */
let pending: Intent | null = null;
const EVENT = "portal:intent";

export function requestIntent(i: Intent): void {
  pending = i;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: i }));
}

/** Runs `fn` once when the named intent is asked for, whether it was asked before this pane mounted or after. */
export function useIntent(name: Intent, fn: () => void): void {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    const take = () => { if (pending === name) { pending = null; ref.current(); } };
    const t = setTimeout(take, 0);
    const on = () => take();
    window.addEventListener(EVENT, on);
    return () => { clearTimeout(t); window.removeEventListener(EVENT, on); };
  }, [name]);
}
