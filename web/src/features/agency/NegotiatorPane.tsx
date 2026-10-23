"use client";
/**
 * The Tayo Negotiator pane, as React (was renderHandoffs/takeOver/openHandover/openTranscript in src/legacy/agency/inline-3.js).
 *
 * Real handoffs only. A lead carries preferences.negotiation when the buyer ran Tayo's negotiator before making contact, which is
 * exactly what this pane describes: Tayo qualified them and worked out a price. No negotiation, no card. Which leads those are is
 * still worked out in inline-3 beside the lead list (buildHandoffs, `window.SynHandoffs()`); renderHandoffs() survives as a name
 * and fires `syn:handoffs`.
 *
 * TAKE OVER (2026-10-21) calls take_over_lead, which hands the lead to the agent who pressed it and returns the handover summary:
 * the buyer's phone, email and social handle, what Tayo agreed and how. The same summary is queued on WhatsApp to that agent,
 * never to the buyer. A card is "taken" when the lead is already this agent's, or was just taken in this session.
 */
import { useEffect, useState } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";
import { Icon } from "./VerificationPane";
import { showDrawer } from "./SideDrawer";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);

type Handoff = { id: string; agentId?: string | null; buyer: string; prop: string; source: string; price: string; agreed: string; rating: string; rec: string; draft: string; signals: string[] };
type Handover = { buyer?: { name?: string; phone?: string; email?: string; handle?: string }; listing?: string; agreed?: string; listed?: string; advice?: string; draft?: string; whatsapp?: string };

const FILTERS = ["all", "High intent", "Worth a call", "Early"];
/* What was queued, said plainly. Nothing here claims a message left: it waits in the outbox until Send is pressed. */
const WA_SAYS: Record<string, string> = {
  queued: "The same summary is queued on WhatsApp to your number. It waits in the outbox until you press Send.",
  already_queued: "This summary is already queued on WhatsApp to your number.",
  no_phone: "You have no phone number on file, so nothing was queued on WhatsApp. Add your number in My profile, then press the button again.",
  failed: "The WhatsApp message could not be queued. The summary here is complete.",
  not_queued: "Nothing was queued on WhatsApp.",
};
const taken = new Set<string>();

function Reach({ k, v, href }: { k: string; v?: string; href?: string }) {
  return (
    <div style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid rgba(128,128,128,.18)", fontSize: "13.5px" }}>
      <span className="muted" style={{ minWidth: "74px" }}>{k}</span>
      {v ? (href ? <a href={href} style={{ wordBreak: "break-all" }}>{v}</a> : <span style={{ wordBreak: "break-all" }}>{v}</span>) : <span className="muted">Not given</span>}
    </div>
  );
}
const Sec = ({ k, top, children }: { k: string; top: string; children: React.ReactNode }) => (
  <div className="sec" style={{ marginTop: top }}><div className="k">{k}</div>{children}</div>
);
const Para = ({ text }: { text: string }) => <p style={{ marginTop: "6px", fontSize: "13px", lineHeight: 1.6 }}>{text}</p>;

function HandoverView({ d }: { d: Handover }) {
  const b = d.buyer || {};
  const listedTail = d.listed ? ", listed at " + d.listed : "";
  const plain = [
    "Handover: " + (b.name || "Buyer") + " for " + (d.listing || "the listing"),
    "Phone: " + (b.phone || "not given"),
    "Email: " + (b.email || "not given"),
    "Social: " + (b.handle || "not given"),
    d.agreed ? "Tayo reached " + d.agreed + (d.listed ? " (listed " + d.listed + ")" : "") : "No agreed price yet" + (d.listed ? " (listed " + d.listed + ")" : ""),
    d.advice ? "Reasoning: " + d.advice : "",
    d.draft ? "The buyer opened with: " + d.draft : "",
  ].filter(Boolean).join("\n");
  const copy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(plain).then(() => toast("Summary copied"), () => toast("Could not copy. Select the text instead."));
    else toast("Copying is not available here. Select the text instead.");
  };
  return (
    <>
      <div style={{ fontSize: "19px", fontWeight: 700 }}>Taken over: {b.name || "Buyer"}</div>
      <p className="muted" style={{ fontSize: "12px", margin: "6px 0 14px" }}>{d.listing || ""}</p>
      <div className="sec"><div className="k">How to reach them</div>
        <Reach k="Phone" v={b.phone} href={b.phone ? "tel:" + b.phone : ""} />
        <Reach k="Email" v={b.email} href={b.email ? "mailto:" + b.email : ""} />
        {/* No link for the handle: it is Instagram or TikTok and the buyer does not say which, so a link would guess. */}
        <Reach k="Social" v={b.handle} />
      </div>
      <Sec k="Where Tayo got to" top="14px">
        <p style={{ marginTop: "6px", fontSize: "13.5px" }}>{d.agreed ? <>Reached <b>{d.agreed}</b>{listedTail}</> : "No price agreed yet" + listedTail}</p>
      </Sec>
      {d.advice ? <Sec k="Reasoning" top="12px"><Para text={d.advice} /></Sec> : null}
      {d.draft ? <Sec k="Message the buyer opened with" top="12px"><Para text={d.draft} /></Sec> : null}
      <p className="muted" style={{ fontSize: "12px", margin: "16px 0 10px" }}>{WA_SAYS[d.whatsapp || ""] || WA_SAYS.not_queued}</p>
      <button className="btn btn-primary btn-block" id="hoCopy" onClick={copy}>Copy summary</button>
    </>
  );
}

/* No verbatim transcript exists for a lead negotiated on the property page: what Tayo produced there is the reasoning and the
   opening message, and that is what is shown. Inventing a conversation would be worse than an honest, shorter one. */
function Report({ h }: { h: Handoff }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span className="o" style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#121212,#121212)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>T</span>
        <div><div style={{ fontSize: "18px", fontWeight: 700 }}>{h.buyer}</div><div className="ph">{h.prop} · {h.price}</div></div>
      </div>
      <p className="muted" style={{ fontSize: "12px", marginTop: "10px" }}>What Tayo worked out with this buyer before they made contact.</p>
      {h.rec ? <Sec k="Reasoning" top="10px"><Para text={h.rec} /></Sec> : null}
      {h.draft ? <Sec k="Message the buyer opened with" top="10px"><Para text={h.draft} /></Sec> : null}
    </>
  );
}

function Card({ h, me, busy, take }: { h: Handoff; me: string | null; busy: boolean; take: (h: Handoff, btn: HTMLButtonElement) => void }) {
  const isTaken = taken.has(h.id) || (me !== null && h.agentId === me);
  return (
    <div className="card handoff" role="group" aria-label={`Tayo deal report, ${h.buyer}, ${h.prop}, agreed ${h.agreed}`}>
      <div className="veil"></div>
      <div className="top"><span className="stamp"><span className="o">T</span> Tayo Deal Report</span><span className="intent">{h.rating}</span></div>
      <div className="report">
        <div className="rp-nm">{h.buyer}</div>
        <div className="rp-sub">{h.prop} · via {h.source}</div>
        <div className="rp-price">
          <div><div className="lab">Listed</div><div className="listed">{h.price}</div></div>
          <span className="arrow">→</span>
          <div className="agreed"><small>Agreed</small>{h.agreed}</div>
        </div>
        <div className="rp-sig">{h.signals.map((s) => <span key={s} className="sig">{s}</span>)}</div>
        <div className="rp-verdict"><span className="vi">✦</span><span>{h.rec}</span></div>
        <div className="rp-actions">
          <button className="btn btn-primary" style={{ padding: "10px 16px", fontSize: "13px" }} disabled={busy} onClick={(e) => take(h, e.currentTarget)}
            {...(isTaken ? { "data-sum": "" } : { "data-take": "" })}>{busy ? "Taking over…" : isTaken ? "✓ Taken over · Summary" : "Take over →"}</button>
          <button className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: "13px" }} data-tr="" onClick={() => showDrawer(<Report h={h} />)}>View full report</button>
        </div>
      </div>
    </div>
  );
}

export function NegotiatorPane() {
  const scripts = usePageScripts();
  const [list, setList] = useState<Handoff[]>([]);
  const [filter, setFilter] = useState("all");
  const [me, setMe] = useState<string | null>(null);
  const [taking, setTaking] = useState<string | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    const paint = () => setList((W().SynHandoffs && W().SynHandoffs()) || []);
    window.addEventListener("syn:handoffs", paint);
    return () => window.removeEventListener("syn:handoffs", paint);
  }, []);
  useEffect(() => {
    if (!scripts || !W().SynAuth || !W().SynAuth.ready) return;
    Promise.resolve(W().SynAuth.ready()).then((u: any) => setMe(u && u.id ? u.id : null)).catch(() => {});
  }, [scripts]);

  /* Taking it over again shows the summary again: take_over_lead answers with it either way. */
  const take = (h: Handoff) => {
    if (!h.id || taking) return;
    setTaking(h.id);
    W().SynAuth.client()
      .then((c: any) => c.rpc("take_over_lead", { p_lead_id: h.id }))
      .then((r: any) => {
        if (r.error) throw r.error;
        taken.add(h.id); bump((n) => n + 1);
        showDrawer(<HandoverView d={r.data || {}} />);
      })
      .catch((err: any) => { toast((err && err.message) || "Could not take over that lead"); console.error("take_over_lead failed", err); })
      .then(() => setTaking(null));
  };

  let body;
  if (!list.length) {
    body = (
      <div className="ov-blank">
        <span className="ov-blank-i"><Icon name="negotiate" /></span>
        <b>Nothing ready to close yet</b>
        <p>Tayo hands a buyer over once it has qualified them and agreed a price. That happens on your live listings, once those are up and leads start arriving,
          finished negotiations land here with the full transcript.</p>
        <button className="btn btn-ghost" type="button" data-go-listings="" onClick={() => W().goToPane("listings")}>Go to listings</button>
      </div>
    );
  } else {
    const shown = filter === "all" ? list : list.filter((h) => h.rating === filter);
    body = shown.length ? shown.map((h) => <Card key={h.id} h={h} me={me} busy={taking === h.id} take={take} />)
      : <div className="ov-blank"><b>Nothing at that level yet</b><p>No handoff is rated {filter.toLowerCase()} right now.</p></div>;
  }

  return (
    <>
      <div className="eyebrow">Every lead sells itself first</div>
      <div className="h1">Tayo Negotiator</div>
      <p className="muted" style={{ fontSize: "14px", marginTop: "4px" }}>Every lead, from any channel, is qualified, pitched and pre-negotiated by Tayo before it reaches a human. You inherit warm, ready buyers.</p>
      <div className="h2" style={{ marginTop: "22px" }}>Ready for handoff</div>
      <div className="crm-tools" data-pane-filters="">
        <div className="crm-tools-l">
          <div className="seg" id="handoffFilter">
            {FILTERS.map((f) => <button key={f} className={"seg-b" + (filter === f ? " on" : "")} data-hf={f} onClick={() => setFilter(f)}>{f === "all" ? "All" : f}</button>)}
          </div>
        </div>
      </div>
      <div id="handoffs">{body}</div>
    </>
  );
}
