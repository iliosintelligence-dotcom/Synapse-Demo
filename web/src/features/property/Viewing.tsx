"use client";

import { useEffect, useState } from "react";
import { signInHref, useSession } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { bookInspection, fetchInspectionReady, fetchOpenSlots, type TourSlot } from "./queries";
import s from "./Property.module.css";

const when = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
};

/** Each reason names the one thing to do next; "not qualified" on its own tells a buyer nothing they can act on. */
const BLOCKED: Record<string, { text: string; label: string }> = {
  sign_in: { text: "Sign in to book a tour.", label: "Sign in" },
  contact: { text: "Talk to Tayo about this home first, then you can book a tour.", label: "Reply about this home" },
  qualification: { text: "Tayo needs to understand what you are looking for before booking an agent’s time.", label: "Talk to Tayo" },
  budget: { text: "Tayo needs to know your budget for this one, so nobody’s time is wasted.", label: "Tell Tayo" },
  budget_fit: { text: "This home is above the budget you gave Tayo. Talk to Tayo if that has changed.", label: "Talk to Tayo" },
  financial_readiness: { text: "Tayo has a couple of questions about how you plan to pay before booking a tour.", label: "Talk to Tayo" },
};

type Panel =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "slots"; slots: TourSlot[] }
  | { kind: "blocked"; reason: string }
  | { kind: "booked"; at: string; people: number };

/**
 * Tour booking. Offered only when the agent has times open AND Tayo has already qualified this buyer for this home (the "end of
 * priming" rule): a visitor who has not talked to Tayo never sees a booking button, because their next step is the conversation.
 * `book_inspection` re-checks everything on the server; this component only decides whether to offer the step.
 */
export function Viewing({ propertyId }: { propertyId: string }) {
  const session = useSession();
  const [offered, setOffered] = useState(false);
  const [panel, setPanel] = useState<Panel>({ kind: "closed" });
  const [busy, setBusy] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!session) return;
    let live = true;
    Promise.all([fetchOpenSlots(propertyId), fetchInspectionReady(propertyId)])
      .then(([slots, ready]) => live && setOffered(slots.length > 0 && ready))
      .catch(() => { /* no tour offered; the conversation is still the path */ });
    return () => { live = false; };
  }, [session, propertyId]);

  if (!offered) return null;

  const toggle = async () => {
    if (panel.kind !== "closed") return setPanel({ kind: "closed" });
    setPanel({ kind: "loading" });
    try {
      const slots = await fetchOpenSlots(propertyId);
      setPanel(slots.length ? { kind: "slots", slots } : { kind: "none" });
    } catch {
      setPanel({ kind: "none" });
    }
  };

  const book = async (startsAt: string) => {
    setBusy(startsAt);
    try {
      const res = await bookInspection(propertyId, startsAt);
      if (!res.ok) {
        if (res.reason === "slot_full") setPanel((p) => (p.kind === "slots" ? { ...p, slots: p.slots.map((x) => (x.starts_at === startsAt ? { ...x, taken: x.capacity } : x)) } : p));
        else setPanel({ kind: "blocked", reason: (res.reason ?? "").split(",").find((m) => BLOCKED[m]) ?? "qualification" });
        return;
      }
      setBooked(true);
      setPanel({ kind: "booked", at: startsAt, people: Number(res.taken) || 1 });
    } catch {
      /* the row stays tappable: Try again */
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={s.card}>
      <h2 className={s.lbl}>Viewing assistant</h2>
      <button type="button" className={s.dockBtn} disabled={booked} onClick={toggle}>{booked ? "Tour booked" : "Book a tour"}</button>
      <div className={s.insp} aria-live="polite">
        {panel.kind === "loading" && <p className={s.note}>Finding times…</p>}
        {panel.kind === "none" && <p className={s.note}>This agent has no tour times open in the next three weeks. Ask them directly and they can add one.</p>}
        {panel.kind === "slots" && panel.slots.map((t) => {
          const left = Number(t.capacity) - Number(t.taken);
          return (
            <button key={t.starts_at} type="button" className={s.slot} disabled={busy === t.starts_at || left <= 0} onClick={() => book(t.starts_at)}>
              <span><b>{when(t.starts_at)}</b><br /><span className={s.dim}>{t.agent_name ?? "Your agent"} · {left} place{left === 1 ? "" : "s"} left</span></span>
              <span className={Number(t.taken) > 0 ? s.joining : s.dim}>{busy === t.starts_at ? "Booking…" : left <= 0 ? "Full" : Number(t.taken) === 0 ? "Be first" : `${t.taken} going`}</span>
            </button>
          );
        })}
        {panel.kind === "blocked" && (
          <>
            <p className={s.note}>{BLOCKED[panel.reason].text}</p>
            <a className={s.dockBtn} href={panel.reason === "sign_in" ? signInHref("inspection", window.location.pathname + window.location.search) : routes.tayoAbout(propertyId)}>{BLOCKED[panel.reason].label}</a>
          </>
        )}
        {panel.kind === "booked" && (
          <p className={s.ok}><b>You are booked in.</b> {when(panel.at)}. {panel.people > 1 ? `${panel.people} people are going. ` : ""}You will get a reminder to confirm the day before.</p>
        )}
      </div>
    </section>
  );
}
