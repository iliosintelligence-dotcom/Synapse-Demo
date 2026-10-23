"use client";
/**
 * True once the page's shared scripts (auth.js and the like, run by AfterHydration) have all run. React parts that need one of
 * them, sign-in above all, wait for this.
 */
import { useEffect, useState } from "react";

export function usePageScripts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.SynPageScriptsReady) { setReady(true); return; }
    const on = () => setReady(true);
    window.addEventListener("syn:page-scripts", on);
    return () => window.removeEventListener("syn:page-scripts", on);
  }, []);
  return ready;
}
