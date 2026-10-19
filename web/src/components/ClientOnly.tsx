"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Renders its children only in the browser. The pages that read the device's storage and the address on their first render (the chat, the
 * mood board) cannot be pre-rendered, because the static HTML would differ from what the browser then draws. Server render and first client
 * render both show `fallback`; the real page appears one frame later.
 */
export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  return <>{isClient ? children : fallback}</>;
}
