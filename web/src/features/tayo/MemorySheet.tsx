"use client";
/**
 * "What Tayo remembers" as a React component (stage 2 of the move to React, 2026-10-23).
 *
 * Opens from either menu (the phone's top bar, or the desktop Chats menu, which raises a "syn:memory" event). It reads what Tayo
 * keeps about this visitor from Tayo's server and lets them delete any of it, or all of it. On a phone it slides up from the
 * bottom; on a wider screen it opens in the middle. GSAP does the motion, and none of it runs for reduced motion.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./MemorySheet.module.css";

gsap.registerPlugin(useGSAP);
const MOTION = "(prefers-reduced-motion: no-preference)";
const SUPABASE_URL = "https://bhrhejpekmhbhwryjhgk.supabase.co";
const ANON_KEY = "sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV";
const VKEY = "toju_visitor_v1"; // the same visitor id the chat uses

type Fact = { key: string; label: string; value: string };
type State = { status: "idle" | "loading" | "ready" | "error"; facts: Fact[] };

async function call(body: Record<string, unknown>): Promise<Fact[]> {
  let visitorId = "";
  try { visitorId = localStorage.getItem(VKEY) ?? ""; } catch { /* private window: Tayo holds nothing for it */ }
  if (!visitorId) return [];
  const r = await fetch(SUPABASE_URL + "/functions/v1/toju-demo", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
    body: JSON.stringify({ visitorId, ...body }),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = (await r.json()) as { facts?: Fact[] };
  return Array.isArray(d.facts) ? d.facts : [];
}

export function MemorySheet() {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState<State>({ status: "idle", facts: [] });
  const [confirmAll, setConfirmAll] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setSt((s) => ({ ...s, status: "loading" }));
    call({ action: "memory" }).then((facts) => setSt({ status: "ready", facts })).catch(() => setSt({ status: "error", facts: [] }));
  }, []);

  useEffect(() => {
    const show = () => { setOpen(true); setConfirmAll(false); load(); };
    window.addEventListener("syn:memory", show);
    return () => window.removeEventListener("syn:memory", show);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  });

  /* in: the backdrop fades and the sheet rises (or grows, on a wide screen) */
  useGSAP(() => {
    if (!open) return;
    gsap.matchMedia().add(MOTION, () => {
      gsap.fromTo(`.${styles.backdrop}`, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 });
      const wide = window.matchMedia("(min-width: 721px)").matches;
      gsap.fromTo(sheet.current, wide ? { autoAlpha: 0, scale: 0.96, y: 8 } : { yPercent: 100 },
        wide ? { autoAlpha: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.4)" } : { yPercent: 0, duration: 0.42, ease: "power3.out" });
    });
  }, { scope: root, dependencies: [open] });

  /* the rows arrive one after another once they are loaded */
  useGSAP(() => {
    if (!open || st.status !== "ready") return;
    gsap.matchMedia().add(MOTION, () => {
      gsap.from(`.${styles.row}`, { y: 10, autoAlpha: 0, duration: 0.3, ease: "power2.out", stagger: 0.04, clearProps: "transform,opacity,visibility" });
    });
  }, { scope: root, dependencies: [open, st.status] });

  function close() {
    const done = () => setOpen(false);
    if (!sheet.current || !window.matchMedia(MOTION).matches) return done();
    const wide = window.matchMedia("(min-width: 721px)").matches;
    gsap.to(`.${styles.backdrop}`, { autoAlpha: 0, duration: 0.2 });
    gsap.to(sheet.current, wide ? { autoAlpha: 0, scale: 0.97, duration: 0.18, onComplete: done } : { yPercent: 100, duration: 0.28, ease: "power2.in", onComplete: done });
  }

  function forget(keys: string[] | "all", rowEl?: HTMLElement | null) {
    const go = () => call({ action: "forget", keys }).then((facts) => {
      setSt({ status: "ready", facts }); setConfirmAll(false);
      window.SynToast?.(keys === "all" ? { title: "Forgotten", description: "Tayo starts from nothing next time." } : "Forgotten");
    }).catch(() => window.SynToast?.({ title: "That did not go through", description: "Try again in a moment.", type: "error" }));
    if (rowEl && window.matchMedia(MOTION).matches) gsap.to(rowEl, { x: 40, autoAlpha: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, duration: 0.3, ease: "power2.in", onComplete: go });
    else go();
  }

  if (!open) return null;
  return (
    <div ref={root} className={styles.wrap} role="dialog" aria-modal="true" aria-labelledby="synMemTitle">
      <div className={styles.backdrop} onClick={close} />
      <div ref={sheet} className={styles.sheet}>
        <div className={styles.grab} aria-hidden="true" />
        <div className={styles.head}>
          <h2 id="synMemTitle" className={styles.title}>What Tayo remembers</h2>
          <button type="button" className={styles.x} aria-label="Close" onClick={close}>×</button>
        </div>
        {st.status === "loading" && <p className={styles.note}>One moment…</p>}
        {st.status === "error" && <p className={styles.note}>Could not load this just now. Try again in a moment.</p>}
        {st.status === "ready" && !st.facts.length && (
          <p className={styles.note}>Tayo is not holding anything about you yet. What you tell it about where, how much and who it is for will show up here, and you can delete any of it.</p>
        )}
        {st.status === "ready" && st.facts.length > 0 && (
          <>
            <ul className={styles.list}>
              {st.facts.map((f) => (
                <li key={f.key} className={styles.row}>
                  <div className={styles.fact}>
                    <span className={styles.label}>{f.label}</span>
                    <span className={styles.value}>{f.value}</span>
                  </div>
                  <button type="button" className={styles.forget} onClick={(e) => forget([f.key], (e.currentTarget as HTMLElement).closest("li"))}>Forget</button>
                </li>
              ))}
            </ul>
            {confirmAll ? (
              <div className={styles.confirm}>
                <span>Forget everything Tayo knows about you?</span>
                <div className={styles.confirmBtns}>
                  <button type="button" className={styles.ghost} onClick={() => setConfirmAll(false)}>Keep it</button>
                  <button type="button" className={styles.danger} onClick={() => forget("all")}>Forget everything</button>
                </div>
              </div>
            ) : (
              <button type="button" className={styles.all} onClick={() => setConfirmAll(true)}>Forget everything</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
