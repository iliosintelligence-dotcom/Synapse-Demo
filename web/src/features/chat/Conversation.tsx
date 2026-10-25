"use client";

import { useEffect, useState } from "react";
import { Zyn } from "@/components/Zyn";
import { naira } from "@/lib/format";
import { coverUrl } from "@/lib/media";
import type { Handover, LeadResult } from "./api";
import { priceLine } from "./context";
import type { ChatError } from "./useChat";
import type { ReplyTo } from "./types";
import type { TourSlot } from "@/features/property/queries";
import { initials, type ListingAgent } from "@/lib/listingAgent";
import s from "./Chat.module.css";

export function UserMessage({ text }: { text: string }) {
  return (
    <div className={`${s.msg} ${s.user}`}>
      <div className={s.col}><div className={`${s.bubble} ${s.userBubble}`}>{text}</div></div>
      <div className={`${s.av} ${s.avUser}`}>A</div>
    </div>
  );
}

/** Says what is actually happening at the two moments a person starts to doubt the page. Non-specific about counts: Tayo never claims to be "checking 214 listings" unless it is. */
const STAGES = [{ at: 2500, text: "Checking this against our verified listings…" }, { at: 6000, text: "Still with you. I’d rather get this right than fast." }];

export function Typing() {
  const [stage, setStage] = useState("thinking…");
  useEffect(() => {
    const timers = STAGES.map((x) => setTimeout(() => setStage(x.text), x.at));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className={`${s.msg} ${s.toju}`}>
      <div className={s.av}><Zyn state="typing" size={58} /></div>
      <div className={s.col}>
        <div className={s.sender}>Tayo</div>
        <div className={s.bubble}>
          <span className={s.dots} role="status" aria-label="Tayo is typing"><i /><i /><i /></span>
          <span className={s.stage} aria-live="polite">{stage}</span>
        </div>
      </div>
    </div>
  );
}

/** An error is NOT a Tayo message: it never enters the saved thread and never speaks in Tayo's voice (he did not say it, the connection failed). It names the cause, says what happens to the question, and offers the one action that fixes it. */
const ERRORS: Record<ChatError, { ttl: string; msg: string; auto?: boolean }> = {
  offline: { ttl: "You're offline", msg: "Your question is saved. I’ll answer as soon as you’re back online.", auto: true },
  timeout: { ttl: "That took too long", msg: "The connection is slow right now. Your question is still here. Try again?" },
  busy: { ttl: "A lot of people are asking at once", msg: "Give it a few seconds and try again. Your question is saved." },
  server: { ttl: "I couldn’t reach my advisor service", msg: "This is on our side, not yours. Your question is saved. Try again in a moment." },
  network: { ttl: "Couldn’t connect", msg: "Check your connection and try again. Your question is saved." },
};

export function ErrorNotice({ kind, onRetry }: { kind: ChatError; onRetry: () => void }) {
  const e = ERRORS[kind];
  return (
    <div className={s.error} role="alert">
      <div className={s.eh}>{e.ttl}</div>
      <div className={s.em}>{e.msg}</div>
      {e.auto ? <div className={s.ew}>Waiting for your connection…</div> : <button className={s.er} type="button" onClick={onRetry}>Try again</button>}
    </div>
  );
}

const slotLabel = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** What the agent will read, the times they have free, and one button. Nothing is sent until it is pressed. */
export function HandoverCard({ h, title, slots, sending, onSend, onCancel }: { h: Handover; title: string; slots: TourSlot[]; sending: boolean; onSend: (slot: string | null) => void; onCancel: () => void }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const sm = h.summary ?? {};
  const row = (k: string, v?: string) => (v ? <li key={k}><b>{k}</b>{v}</li> : null);
  const offer = h.openingOffer ? `Opening at ${naira(h.openingOffer)}` : "";
  return (
    <div className={s.ho} id="hoCard">
      <div className={s.hoK}>Handover to the agent</div>
      <div className={s.hoT}>{h.home?.title || title}</div>
      <ul className={s.hoSum}>
        {row("Wants", sm.wants)}{row("Budget", sm.budget)}{row("Paying", sm.financing)}{row("Timeline", sm.timeline)}{row("Household", sm.household)}
        {row("Where it stands", [sm.position, offer].filter(Boolean).join(". "))}
        {row("Asked", sm.questions?.length ? sm.questions.join(" · ") : "")}{row("Worried about", sm.concerns?.length ? sm.concerns.join(" · ") : "")}{row("Next step", sm.nextStep)}
      </ul>
      <div className={s.hoK}>The message Tayo will send</div>
      <div className={s.hoMsg}>{h.message}</div>
      <div className={s.hoK}>{slots.length ? "Pick a viewing time the agent has free" : "Viewing"}</div>
      {slots.length ? (
        <div className={s.hoSlots} role="group" aria-label="Viewing times">
          {slots.map((p) => <button key={p.starts_at} type="button" className={`${s.hoSlot} ${chosen === p.starts_at ? s.hoOn : ""}`} onClick={() => setChosen(chosen === p.starts_at ? null : p.starts_at)}>{slotLabel(p.starts_at)}</button>)}
        </div>
      ) : <p className={s.hoNote}>The agent has not set viewing times for this home yet. They will propose one.</p>}
      <div className={s.hoRow}>
        <button type="button" className={s.primary} disabled={sending} onClick={() => onSend(chosen)}>{sending ? "Sending…" : "Send to the agent"}</button>
        <button type="button" className={s.ghost} disabled={sending} onClick={onCancel}>Not yet</button>
      </div>
      <p className={s.hoNote}>The agent gets this by WhatsApp and email. Nothing is sent until you press the button.</p>
    </div>
  );
}

/** The introduction as something you can hold: the home, the date, a reference taken from the lead's own id, and whether the agent was messaged or the enquiry only saved. States what create-lead returned and nothing more. */
export function IntroTicket({ listing, lead, agent }: { listing: ReplyTo; lead: LeadResult; agent: ListingAgent | null }) {
  const ref = String(lead.lead_id ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
  const when = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const sent = lead.delivery_status === "delivered";
  const img = coverUrl(listing.property_media);
  const where = [priceLine(listing), listing.city].filter(Boolean).join(" · ");
  return (
    <div className={s.tktWrap}>
      <div className={s.tkt} role="group" aria-label="Introduction ticket">
        <div className={s.tktMain}>
          <div className={s.tktKicker}><span>INTRODUCTION</span><span>{when}</span></div>
          <div className={s.tktHero}>
            {img &&   <img className={s.tktPh} src={img} alt="" />}
            <div className={s.tktT}>{listing.title || "This home"}<small>{where}</small></div>
          </div>
          <div className={s.tktGrid}><div><i>From</i><b>You, via Tayo</b></div><div><i>To</i><b>{agent ? agent.name : "The agency"}</b></div><div><i>Status</i><b>{sent ? "Sent" : "Saved"}</b></div></div>
        </div>
        <div className={s.tktStub}><div><i>Reference</i><b>{ref}</b></div></div>
      </div>
      {/* the buyer's side of a fast reply: who has their message, right now */}
      <div className={s.tktHas}>
        {agent && <span className={s.tktFace} style={agent.avatar ? { backgroundImage: `url("${agent.avatar}")` } : undefined}>{agent.avatar ? null : initials(agent.name)}</span>}
        <p className={s.tktNote}><b>{agent ? agent.first + " has your message." : "The agency has your message."}</b> {sent ? "They were sent what we talked about. Quote this reference if you call them." : "It is waiting in their inbox with what we talked about. Quote this reference if you call them."}</p>
      </div>
    </div>
  );
}

/** Rendered ONLY from real restored state (the brief the person gave), never a generic "welcome back". */
export function MemoryNote({ brief, onDismiss }: { brief: string; onDismiss: () => void }) {
  return (
    <div className={s.memory}>
      <span className={s.memK}>Tayo remembers your search</span>
      {brief && <span className={s.memB}>{brief}</span>}
      <button type="button" aria-label="Dismiss" onClick={onDismiss}>×</button>
    </div>
  );
}
