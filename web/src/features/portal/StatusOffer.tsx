"use client";

import { useEffect, useRef, useState } from "react";
import { nextOffer, removeWatch, type Live } from "./data/statusOffer";
import { ShareKit } from "./panes/ShareKit";
import s from "./StatusOffer.module.css";

/** Your post is out: offer to share the same listing to your WhatsApp Status. Asked once, when you come back, never in the same moment you scheduled it. */
export function StatusOffer() {
  const [offer, setOffer] = useState<Live | null>(null);
  const [kit, setKit] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (busy.current || document.visibilityState !== "visible") return;
      busy.current = true;
      try { const o = await nextOffer(); setOffer((cur) => cur ?? o); } catch { /* a missed check is retried on the next return */ } finally { busy.current = false; }
    };
    const first = setTimeout(() => void check(), 5000);
    const later = setTimeout(() => void check(), 12000);
    const vis = () => setTimeout(() => void check(), 800);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", vis);
    return () => { clearTimeout(first); clearTimeout(later); document.removeEventListener("visibilitychange", vis); window.removeEventListener("focus", vis); };
  }, []);

  const answer = (yes: boolean) => {
    if (!offer) return;
    removeWatch(offer.id); // answered: never asked about this post again
    if (yes) setKit(offer.propertyId);
    setOffer(null);
  };

  return (
    <>
      {offer && (
        <div className={s.card} role="dialog" aria-label="Share to WhatsApp Status">
          <div className={s.t}><b>Your post is out.</b> Share {offer.title} to your WhatsApp Status too?</div>
          <div className={s.b}>
            <button type="button" className={s.btn} onClick={() => answer(false)}>Not now</button>
            <button type="button" className={`${s.btn} ${s.primary}`} onClick={() => answer(true)}>Share to Status</button>
          </div>
        </div>
      )}
      {kit && <ShareKit listingId={kit} startOn="whatsapp" onClose={() => setKit(null)} />}
    </>
  );
}
