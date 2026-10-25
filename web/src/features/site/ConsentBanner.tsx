"use client";
/**
 * COOKIE CONSENT (2026-10-02; React since 2026-10-25, was public/consent.js).
 *
 * Google Analytics is the only thing on Synapse that sets a non-essential cookie, so it is the only thing this asks about. The tag
 * runs in Google Consent Mode (advanced), Eden's choice: it loads on every page, but sets no cookie until the visitor accepts.
 * Until then, and after "No thanks", Google gets only cookieless signals with no stored identifier. Accepting grants
 * analytics_storage; advertising is never granted. The default is set in the head (Analytics.tsx).
 *
 * The choice is remembered in localStorage (syn_consent_v1). Any element with [data-cookie-settings] reopens the banner, so the
 * choice can be changed later -- the footers and the privacy policy carry that link. window.SynConsent {open, get} stays.
 * Pages without analytics (the team pages) have no gtag, and the banner never shows there.
 */
import { useEffect, useRef, useState } from "react";
import "./ConsentBanner.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = "syn_consent_v1";
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const remember = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } };

/* Taking consent back has to undo what accepting did: Analytics' cookies are cleared on this host and on the parent domain they
   are written to. */
function clearGaCookies() {
  const host = location.hostname;
  const domains = ["", host, "." + host.replace(/^www\./, "")];
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (!/^_ga(_|$)/.test(name)) return;
    domains.forEach((d) => { document.cookie = name + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : ""); });
  });
}

export function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("privacy.html#what");
  const yes = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof (window as any).gtag !== "function") return;   // no analytics on this page, nothing to ask
    /* eslint-disable react-hooks/set-state-in-effect -- read once on mount: localStorage and the path do not exist on the server */
    setHref(location.pathname.indexOf("/app/") === 0 ? "/privacy.html#what" : "privacy.html#what");
    (window as any).SynConsent = { open: () => setOpen(true), get: stored };
    const v = stored();
    if (v !== "granted" && v !== "denied") setOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onClick = (e: MouseEvent) => {
      const t = (e.target as Element | null)?.closest?.("[data-cookie-settings]");
      if (!t) return;
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => yes.current?.focus());
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const choose = (v: "granted" | "denied") => {
    remember(v);
    const g = (window as any).gtag;
    if (typeof g === "function") g("consent", "update", { analytics_storage: v === "granted" ? "granted" : "denied" });
    if (v !== "granted") clearGaCookies();
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="syn-consent" role="dialog" aria-label="Cookies">
      <p className="sc-t">Can we count your visit?</p>
      <p className="sc-b">We use Google Analytics cookies to see which pages help people find homes. Nothing you type is ever sent. <a href={href}>Privacy policy</a></p>
      <div className="sc-row">
        <button type="button" className="sc-no" onClick={() => choose("denied")}>No thanks</button>
        <button type="button" className="sc-yes" ref={yes} onClick={() => choose("granted")}>Accept</button>
      </div>
    </div>
  );
}
