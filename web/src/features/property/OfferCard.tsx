"use client";

import { useState } from "react";
import { naira } from "@/lib/format";
import { fetchOpeningOffer, type Offer } from "./queries";
import type { Property } from "./types";
import s from "./Property.module.css";

type State = { kind: "idle" } | { kind: "working" } | { kind: "done"; offer: Offer } | { kind: "error"; why: "offline" | "server" };

/**
 * "What to offer": Tayo works out an opening offer and drafts the message. Sales only: a landlord sets a rent and it is the rent,
 * so offering to "work the numbers" on a fixed yearly price teaches a buyer to haggle over something nobody will move on.
 */
export function OfferCard({ p }: { p: Property }) {
  const [st, setSt] = useState<State>({ kind: "idle" });
  const [copied, setCopied] = useState<"no" | "yes" | "manual">("no");
  if (p.listing_type === "rent") return null;

  const run = async () => {
    setSt({ kind: "working" });
    try {
      if (!navigator.onLine) throw Object.assign(new Error("offline"), { why: "offline" });
      let visitor: string | null = null;
      try { visitor = localStorage.getItem("toju_visitor_v1"); } catch { /* no visitor id: the offer is worked out without a brief */ }
      setSt({ kind: "done", offer: await fetchOpeningOffer(visitor, p) });
    } catch (e) {
      setSt({ kind: "error", why: (e as { why?: string }).why === "offline" || !navigator.onLine ? "offline" : "server" });
    }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied("yes"); } catch { setCopied("manual"); }
  };

  return (
    <section className={s.card}>
      <h2 className={s.lbl}>What to offer</h2>
      {st.kind !== "done" && (
        <button type="button" className={s.dockBtn} disabled={st.kind === "working"} onClick={run}>
          {st.kind === "working" ? "Tayo is working the numbers…" : "Get my opening offer"}
        </button>
      )}
      {st.kind === "error" && (
        <p className={s.inlineErr} role="alert">
          {st.why === "offline" ? "You’re offline. Reconnect and I’ll run the numbers." : "I couldn’t work the numbers just now. This is on our side, not yours."} Nothing was sent to the agency.
        </p>
      )}
      {st.kind === "done" && (
        <>
          {st.offer.openingOffer != null && <div className={s.offerAmt}>Opening offer: {naira(st.offer.openingOffer)}</div>}
          {st.offer.advice && <p className={s.take}>{st.offer.advice}</p>}
          {st.offer.draft && (
            <>
              <div className={s.draft}>{st.offer.draft}</div>
              <button type="button" className={s.dockBtn} onClick={() => copy(st.offer.draft)}>{copied === "yes" ? "Copied ✓" : copied === "manual" ? "Press Ctrl+C to copy" : "Copy message"}</button>
            </>
          )}
        </>
      )}
    </section>
  );
}
