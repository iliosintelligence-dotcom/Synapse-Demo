"use client";
/**
 * The React layer every page carries (the move to React, 2026-10-23).
 *
 * Each page's existing markup and scripts run in a protected section (src/legacy/LegacyPage.tsx); this sits beside it. It hosts
 * the toast notifications (sileo) and a bridge so the existing page code can raise one:
 *   window.SynToast('Copied')   or   window.SynToast({ title, description, type: 'error' })
 * Page-specific React parts (Tayo's top bar, and more as sections move across) are added next to it by each page.
 */
import { useEffect, useState } from "react";
import { Toaster, sileo, type SileoOptions } from "sileo";
import "sileo/styles.css";

type ToastInput = string | SileoOptions;
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

export function SiteReact({ toastTop = "calc(20px + var(--syn-top, env(safe-area-inset-top, 0px)))" }: { toastTop?: string }) {
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
    window.dispatchEvent(new Event("syn:react-ready"));   // e.g. brand.js upgrades the logos React drew
    window.dispatchEvent(new Event("synreact:ready"));
    return () => { delete window.SynToast; };
  }, []);
  return <Toaster position="top-center" theme={theme} offset={{ top: toastTop }} />;
}
