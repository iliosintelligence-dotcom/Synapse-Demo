"use client";
/**
 * True once Tayo's chat engine (engine.ts) has finished starting. The engine now runs after React has taken
 * the page over, so the parts that talk to it wait for its signal (`syn:tayo-engine`, with window.TayoEngineReady for late
 * listeners) before they attach.
 */
import { useEffect, useState } from "react";

declare global {
  interface Window { TayoEngineReady?: boolean }
}

export function useEngineReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.TayoEngineReady) { setReady(true); return; }
    const on = () => setReady(true);
    window.addEventListener("syn:tayo-engine", on);
    return () => window.removeEventListener("syn:tayo-engine", on);
  }, []);
  return ready;
}
