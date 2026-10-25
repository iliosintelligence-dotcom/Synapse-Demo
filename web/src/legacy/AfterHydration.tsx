"use client";
/**
 * A page's own scripts, run once React has taken the page over (2026-10-24, the move to React, stage 2).
 *
 * When a page's markup becomes JSX, its old scripts can no longer run while the HTML is still arriving: they change text and
 * add elements, and React then finds a page it did not draw (error #418). They run here instead, right after hydration, one at a
 * time and in their original order, so the page behaves exactly as before. Each one is a step on the way to a React hook.
 */
import { useEffect } from "react";
import { SHARED, type SharedName } from "@/shared";

/* `shared` names a shared script that is part of the app's code now (src/shared): loaded and run at the point in the order where
   its file used to load. `module` keeps a module's place at the end, where a deferred module script ran. */
export type PageScript = { src: string; module?: boolean } | { code: string } | { shared: SharedName; module?: boolean };

declare global {
  interface Window { SynPageScriptsReady?: boolean }
}

let ran = false;   // once per page load, even if React mounts this twice

function load(s: PageScript): Promise<void> {
  if ("shared" in s) {
    /* one failing script must not stop the rest, as with a file */
    return SHARED[s.shared]().then((m) => { try { m.run(); } catch (e) { console.error(e); } }, (e) => console.error(e));
  }
  return new Promise((done) => {
    const el = document.createElement("script");
    if ("src" in s) {
      el.src = s.src;
      if (s.module) el.type = "module";
      el.async = false;
      el.onload = () => done();
      el.onerror = () => done();   // one missing file must not stop the rest
    } else {
      el.text = s.code;
    }
    document.body.appendChild(el);
    if (!("src" in s)) done();
  });
}

export function AfterHydration({ scripts }: { scripts: PageScript[] }) {
  useEffect(() => {
    if (ran) return;
    ran = true;
    (async () => {
      /* Module scripts were deferred originally, so they ran after the rest: same here. */
      const isModule = (s: PageScript) => !("code" in s) && !!s.module;
      for (const s of scripts.filter((x) => !isModule(x))) await load(s);
      for (const s of scripts.filter(isModule)) await load(s);
      /* Everything has run: React parts that need the page's scripts (sign-in, for one) can go now. */
      window.SynPageScriptsReady = true;
      window.dispatchEvent(new Event("syn:page-scripts"));
      /* Some of them re-measure on window load, which has usually happened by now; a resize re-runs that measuring. */
      const settle = () => window.dispatchEvent(new Event("resize"));
      if (document.readyState === "complete") setTimeout(settle, 50);
      else window.addEventListener("load", settle, { once: true });
    })();
  }, [scripts]);
  return null;
}
