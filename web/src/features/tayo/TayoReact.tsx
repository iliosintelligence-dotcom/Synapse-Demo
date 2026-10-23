"use client";
/**
 * Tayo's React layer (stage 1 of moving the site to React, 2026-10-23).
 *
 * The page's own markup and scripts still run inside a protected section (see page.tsx). Everything React adds lives here, beside
 * it, and grows as sections are rewritten as components. The first thing it hosts is the toast notifications (sileo), with a
 * bridge so the existing page code can raise one:  window.SynToast('Copied')  or  window.SynToast({ title, description, type }).
 */
import { useEffect, useState } from "react";
import { Toaster, sileo, type SileoOptions } from "sileo";
import "sileo/styles.css";

type ToastInput = string | (SileoOptions & { type?: SileoOptions["type"] });
declare global {
  interface Window { SynToast?: (t: ToastInput) => string; SynReact?: { ready: boolean } }
}

/** The site's own light and dark (set by the visitor's clock or their choice), followed as it changes. */
function useSiteTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

export function TayoReact() {
  const theme = useSiteTheme();
  useEffect(() => {
    window.SynToast = (t: ToastInput) => {
      const o: SileoOptions = typeof t === "string" ? { title: t } : t;
      const kind = o.type ?? "success";
      const fn = kind === "error" ? sileo.error : kind === "warning" ? sileo.warning : kind === "info" ? sileo.info
        : kind === "action" ? sileo.action : kind === "success" ? sileo.success : sileo.show;
      return fn(o);
    };
    window.SynReact = { ready: true };
    window.dispatchEvent(new Event("synreact:ready"));
    return () => { delete window.SynToast; };
  }, []);
  /* below the floating top bar on a phone, clear of the status bar in the app */
  return <Toaster position="top-center" theme={theme} offset={{ top: "calc(76px + var(--syn-top, env(safe-area-inset-top, 0px)))" }} />;
}
