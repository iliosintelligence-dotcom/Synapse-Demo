"use client";
/**
 * SAVE, SHARE, CONTACT: one tap each, on every property card and on the property page (Eden, 2026-10-11). This is the SHARE
 * half, as React (was public/app/share.js). On a phone it opens the phone's own share sheet (WhatsApp, Telegram, Messages, Save
 * to Drive, Save to Files, Copy...). On a computer, which has no such sheet, it shows a small one of its own with the same
 * choices. Anything on a page marked data-share="<listing id>" works, with optional data-title, data-price and data-place; the
 * link shared is always the listing's own page. window.SynShare.open / .link keep their names for the pages that call them.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Opts = { id?: string | null; url?: string; title?: string | null; price?: string | null; place?: string | null };
type Open = { o: Opts; url: string; text: string };

function linkFor(id: string) {
  const base = location.origin && location.origin !== "null" ? location.origin : "https://www.synapsecore.dev";
  return base + "/app/property.html?id=" + encodeURIComponent(id);
}
/* The page's own toast when it has one (#synToast), made on the spot otherwise. */
let toastT: ReturnType<typeof setTimeout> | undefined;
function toast(msg: string) {
  let t = document.getElementById("synToast");
  if (!t) { t = document.createElement("div"); t.id = "synToast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
  const el = t;
  el.textContent = msg; el.className = ""; requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 3200);
}
function copy(text: string) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => toast("Link copied. Paste it anywhere."), () => toast("Could not copy. Long-press the link to copy it."));
  }
  const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); toast("Link copied. Paste it anywhere."); } catch { toast("Could not copy."); }
  document.body.removeChild(ta); return Promise.resolve();
}
const esc = (t: unknown) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
/* A tiny shortcut file the person can keep in Files or Drive, which opens the home when tapped. */
function saveFile(o: Opts, url: string, text: string) {
  const html = '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' + esc(url) + '"><title>' + esc(o.title) + '</title><p><a href="' + esc(url) + '">' + esc(text) + "</a></p>";
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  a.download = (String(o.title || "home").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "home") + ".html";
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("Saved as a shortcut file.");
}

function Sheet({ s, close }: { s: Open; close: () => void }) {
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inp.current?.focus(); inp.current?.select();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);
  const { o, url, text } = s;
  const q = encodeURIComponent(text + " " + url), u = encodeURIComponent(url), t = encodeURIComponent(text);
  const opts = [
    ["WhatsApp", "https://wa.me/?text=" + q],
    ["Telegram", "https://t.me/share/url?url=" + u + "&text=" + t],
    ["Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + u],
    ["X", "https://twitter.com/intent/tweet?text=" + t + "&url=" + u],
    ["Email", "mailto:?subject=" + encodeURIComponent(o.title || "A home on Synapse") + "&body=" + q],
  ];
  return createPortal(
    <div id="synShareSheet" className="sh-scrim" role="dialog" aria-label="Share this home" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="sh-sheet">
        <div className="sh-head"><b>Share this home</b><button type="button" className="sh-x" data-sh-close="" aria-label="Close" onClick={close}>×</button></div>
        <div className="sh-link"><input ref={inp} readOnly value={url} aria-label="Link" /><button type="button" className="btn btn-primary" data-sh-copy="" onClick={() => copy(url)}>Copy link</button></div>
        <div className="sh-grid">
          {opts.map(([label, href]) => <a key={label} className="sh-opt" target="_blank" rel="noopener noreferrer" href={href} onClick={() => setTimeout(close, 200)}>{label}</a>)}
          <button type="button" className="sh-opt" data-sh-file="" onClick={() => saveFile(o, url, text)}>Save to a file</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ShareHost() {
  const [s, setS] = useState<Open | null>(null);
  useEffect(() => {
    function share(o: Opts) {
      o = o || {};
      if (!o.id && !o.url) return;
      const url = o.url || linkFor(o.id as string);
      const title = String(o.title || "A home on Synapse");
      const text = [title, o.price, o.place].filter(Boolean).join(" · ");
      if (navigator.share) {
        navigator.share({ title: title + " — Synapse", text, url }).catch((err) => { if (err && err.name !== "AbortError") setS({ o, url, text }); });
        return;
      }
      setS({ o, url, text });
    }
    /* Capture phase: a card is one big tap target, and this must win over the card's own "open the home" handler without it also
       firing. */
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null;
      const b = el?.closest?.("[data-share]");
      if (b) {
        e.preventDefault(); e.stopPropagation();
        share({ id: b.getAttribute("data-share"), title: b.getAttribute("data-title"), price: b.getAttribute("data-price"), place: b.getAttribute("data-place") });
        return;
      }
      if (el?.closest?.("[data-contact]")) e.stopPropagation(); /* let the link go to Tayo; just do not also open the home */
    };
    document.addEventListener("click", onClick, true);
    (window as any).SynShare = { open: share, link: linkFor };
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  const close = useCallback(() => setS(null), []);
  return s ? <Sheet s={s} close={close} /> : null;
}
