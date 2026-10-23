"use client";
/**
 * The animated sheet Tayo's panels open in (the move to React, 2026-10-23): slides up from the bottom on a phone, opens in the
 * middle on a wider screen, over a dimmed backdrop. Escape, the backdrop and the × close it. GSAP does the motion; none of it
 * runs for reduced motion.
 */
import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./MemorySheet.module.css";

gsap.registerPlugin(useGSAP);
export const MOTION = "(prefers-reduced-motion: no-preference)";
const WIDE = "(min-width: 721px)";

export function Sheet({ title, id, onClose, closing, children }: {
  title: string; id: string; onClose: () => void; closing: boolean; children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  useGSAP(() => {
    gsap.matchMedia().add(MOTION, () => {
      gsap.fromTo(`.${styles.backdrop}`, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 });
      const wide = window.matchMedia(WIDE).matches;
      gsap.fromTo(sheet.current, wide ? { autoAlpha: 0, scale: 0.96, y: 8 } : { yPercent: 100 },
        wide ? { autoAlpha: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.4)" } : { yPercent: 0, duration: 0.42, ease: "power3.out" });
    });
  }, { scope: root });

  return (
    <div ref={root} className={styles.wrap} role="dialog" aria-modal="true" aria-labelledby={id} data-closing={closing || undefined}>
      <div className={styles.backdrop} onClick={onClose} />
      <div ref={sheet} className={styles.sheet}>
        <div className={styles.grab} aria-hidden="true" />
        <div className={styles.head}>
          <h2 id={id} className={styles.title}>{title}</h2>
          <button type="button" className={styles.x} aria-label="Close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Play the sheet's way out, then call done (straight away for reduced motion). */
export function animateClose(root: HTMLElement | null, done: () => void) {
  const sheet = root?.querySelector(`.${styles.sheet}`), back = root?.querySelector(`.${styles.backdrop}`);
  if (!sheet || !window.matchMedia(MOTION).matches) return done();
  const wide = window.matchMedia(WIDE).matches;
  if (back) gsap.to(back, { autoAlpha: 0, duration: 0.2 });
  gsap.to(sheet, wide ? { autoAlpha: 0, scale: 0.97, duration: 0.18, onComplete: done } : { yPercent: 100, duration: 0.28, ease: "power2.in", onComplete: done });
}

/** A row leaves: it slides away and folds up, then done. */
export function animateRowOut(row: HTMLElement | null, done: () => void) {
  if (!row || !window.matchMedia(MOTION).matches) return done();
  gsap.to(row, { x: 40, autoAlpha: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, duration: 0.3, ease: "power2.in", onComplete: done });
}

export { styles as sheetStyles };
