"use client";
/**
 * Pinned replies, as a React component (stage 2 of the move to React, 2026-10-23).
 *
 * Shows the replies the visitor pinned, with the homes that came with each. Sharing and unpinning are asked of the page
 * (syn:share-pin, syn:share-pins, syn:unpin), which stays the one place that writes pins; this only reads.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { animateClose, animateRowOut, MOTION, Sheet, sheetStyles as s } from "./Sheet";

const PINKEY = "toju_pins_v1";
type Pin = { id: string; text?: string; at?: number | string; matches?: Array<{ id: string; title?: string }> };

const read = (): Pin[] => { try { const v = JSON.parse(localStorage.getItem(PINKEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const ask = (name: string, id?: string) => window.dispatchEvent(new CustomEvent(name, { detail: id ? { id } : {} }));
const day = (ts: number | string | undefined) => { const d = ts === undefined ? null : new Date(ts); return d && !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""; };

export function PinnedSheet() {
  const [open, setOpen] = useState(false);
  const [pins, setPins] = useState<Pin[]>([]);
  const body = useRef<HTMLDivElement>(null);
  const ID = "synPinTitle";

  useEffect(() => {
    const show = () => { setPins(read()); setOpen(true); };
    window.addEventListener("syn:pins", show);
    return () => window.removeEventListener("syn:pins", show);
  }, []);

  useGSAP(() => {
    if (!open || !pins.length) return;
    gsap.matchMedia().add(MOTION, () => {
      gsap.from(body.current!.querySelectorAll("li"), { y: 10, autoAlpha: 0, duration: 0.3, ease: "power2.out", stagger: 0.04, delay: 0.1, clearProps: "transform,opacity,visibility" });
    });
  }, { dependencies: [open] });

  const close = useCallback(() => animateClose(document.querySelector(`[aria-labelledby="${ID}"]`), () => setOpen(false)), []);

  if (!open) return null;
  return (
    <Sheet title="Pinned" id={ID} onClose={close} closing={false}>
      <div ref={body}>
        {!pins.length && <p className={s.note}>Nothing pinned yet. Tap the pin under any reply from Tayo to keep it, and the homes with it, here.</p>}
        {pins.length > 0 && (
          <>
            <ul className={s.list}>
              {pins.map((p) => {
                const text = String(p.text || "");
                return (
                  <li key={p.id} className={s.row} style={{ alignItems: "flex-start" }}>
                    <div className={s.fact}>
                      <span className={s.label}>{day(p.at)}{p.matches && p.matches.length ? ` · ${p.matches.length} home${p.matches.length === 1 ? "" : "s"}` : ""}</span>
                      <span className={s.value} style={{ fontWeight: 400, fontSize: 15 }}>{text.length > 180 ? text.slice(0, 180) + "…" : text}</span>
                      {(p.matches || []).slice(0, 4).map((m) => (
                        <a key={m.id} href={"property.html?id=" + encodeURIComponent(m.id)} style={{ fontSize: 13.5, fontWeight: 600, color: "inherit", marginTop: 4 }}>{m.title || "Listing"}</a>
                      ))}
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <button type="button" className={s.forget} onClick={() => ask("syn:share-pin", p.id)}>Share</button>
                      <button type="button" className={s.forget} onClick={(e) => animateRowOut((e.currentTarget as HTMLElement).closest("li"), () => {
                        ask("syn:unpin", p.id); setPins(read()); window.SynToast?.("Unpinned");
                      })}>Unpin</button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button type="button" className={s.all} onClick={() => ask("syn:share-pins")}>Share everything pinned</button>
          </>
        )}
      </div>
    </Sheet>
  );
}
