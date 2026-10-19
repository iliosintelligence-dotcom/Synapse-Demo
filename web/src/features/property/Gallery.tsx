"use client";

import { useCallback, useEffect, useState } from "react";
import { isVideo, orderedMedia } from "@/lib/media";
import type { PropertyMedia } from "@/lib/types";
import s from "./Property.module.css";

/** Hero image or video with thumbnails and a full-screen viewer. Keyboard: arrows step, Escape closes. */
export function Gallery({ media, verified }: { media: PropertyMedia[] | null; verified: boolean }) {
  const items = orderedMedia(media);
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const n = items.length;
  const step = useCallback((d: number) => setI((v) => (n ? (v + d + n) % n : 0)), [n]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  if (!n) return <div className={`${s.hero} ${s.heroEmpty}`}>No photos yet</div>;
  const cur = items[i];

  return (
    <>
      <div className={s.hero}>
        {isVideo(cur) ? (
          <video key={cur.url} src={cur.url} muted playsInline controls preload="metadata" className={s.heroMedia} />
        ) : (
          
          <img src={cur.url} alt="" className={s.heroMedia} onClick={() => setOpen(true)} />
        )}
        {verified && <span className={s.stamp}>✓ Verified by Synapse</span>}
        <span className={s.counter}>{i + 1} / {n}</span>
        {n > 1 && (
          <>
            <button type="button" className={`${s.arrow} ${s.prev}`} aria-label="Previous photo" onClick={() => step(-1)}>‹</button>
            <button type="button" className={`${s.arrow} ${s.next}`} aria-label="Next photo" onClick={() => step(1)}>›</button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className={s.thumbs}>
          {items.map((m, k) => (
            <button key={m.url} type="button" className={k === i ? s.thumbOn : ""} aria-label={`Show photo ${k + 1}`} onClick={() => setI(k)}>
              {isVideo(m) ? <span>▶</span> :   <img src={m.url} alt="" loading="lazy" />}
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className={s.lightbox} role="dialog" aria-modal="true" aria-label="Photos" onClick={() => setOpen(false)}>
          { }
          <img src={cur.url} alt="" onClick={(e) => e.stopPropagation()} />
          {n > 1 && (
            <>
              <button type="button" className={`${s.arrow} ${s.prev}`} aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</button>
              <button type="button" className={`${s.arrow} ${s.next}`} aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}>›</button>
            </>
          )}
          <button type="button" className={s.close} aria-label="Close photos" onClick={() => setOpen(false)}>✕</button>
        </div>
      )}
    </>
  );
}
