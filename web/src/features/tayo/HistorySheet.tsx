"use client";
/**
 * Past conversations, as a React component (stage 2 of the move to React, 2026-10-23).
 *
 * Lists the conversations this device has kept (newest first, with the homes each one surfaced). Opening one or deleting one is
 * asked of the page (syn:open-session, syn:delete-session), which stays the one place that writes them; this only reads.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { animateClose, animateRowOut, MOTION, Sheet, sheetStyles as s } from "./Sheet";

const SESS = "toju_sessions_v1";
type Session = { id: string; title?: string; endedAt?: number | string; messages?: Array<{ role: string }>; homes?: number };

const read = (): Session[] => { try { const v = JSON.parse(localStorage.getItem(SESS) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };

function when(ts: number | string | undefined): string {
  if (ts === undefined) return "";
  const d = new Date(ts), now = new Date();
  if (isNaN(d.getTime())) return "";
  const days = Math.floor((now.getTime() - d.getTime()) / 864e5);
  const day = days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return day + " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function HistorySheet() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Session[]>([]);
  const body = useRef<HTMLDivElement>(null);
  const ID = "synHistTitle";

  useEffect(() => {
    const show = () => { setList(read()); setOpen(true); };
    window.addEventListener("syn:history", show);
    return () => window.removeEventListener("syn:history", show);
  }, []);

  useGSAP(() => {
    if (!open || !list.length) return;
    gsap.matchMedia().add(MOTION, () => {
      gsap.from(body.current!.querySelectorAll("li"), { y: 10, autoAlpha: 0, duration: 0.3, ease: "power2.out", stagger: 0.04, delay: 0.1, clearProps: "transform,opacity,visibility" });
    });
  }, { dependencies: [open] });

  const close = useCallback(() => animateClose(document.querySelector(`[aria-labelledby="${ID}"]`), () => setOpen(false)), []);

  if (!open) return null;
  return (
    <Sheet title="Past conversations" id={ID} onClose={close} closing={false}>
      <div ref={body}>
        {!list.length && <p className={s.note}>No past conversations yet. When you start a new chat, the old one is kept here, with every home Tayo recommended.</p>}
        {list.length > 0 && (
          <ul className={s.list}>
            {list.map((c) => {
              const n = (c.messages || []).filter((m) => m.role === "user").length;
              return (
                <li key={c.id} className={s.row}>
                  <button type="button" className={s.fact} style={{ border: 0, background: "none", color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer", padding: 0 }}
                    onClick={() => { window.dispatchEvent(new CustomEvent("syn:open-session", { detail: { id: c.id } })); close(); }}>
                    <span className={s.label}>{when(c.endedAt)}{" · "}{n} message{n === 1 ? "" : "s"}{c.homes ? ` · ${c.homes} home${c.homes === 1 ? "" : "s"}` : ""}</span>
                    <span className={s.value}>{c.title || "Conversation"}</span>
                  </button>
                  <button type="button" className={s.forget} aria-label={"Delete " + (c.title || "conversation")}
                    onClick={(e) => animateRowOut((e.currentTarget as HTMLElement).closest("li"), () => {
                      window.dispatchEvent(new CustomEvent("syn:delete-session", { detail: { id: c.id } }));
                      setList(read());
                      window.SynToast?.("Conversation deleted");
                    })}>
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
