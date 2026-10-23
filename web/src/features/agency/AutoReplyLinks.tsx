"use client";
/**
 * "Your auto-reply links", in the agency portal's Social studio (2026-10-23).
 *
 * One link per channel for the agency's WhatsApp, Instagram and Facebook auto-replies. Each opens Tayo focused on this agency's
 * homes and records where the person came from, so a lead that follows is credited to the agency and the channel. The agency
 * sets the auto-reply in its own app (WhatsApp Business, Meta Business Suite); Synapse never messages buyers on WhatsApp itself.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);
const SITE = "https://www.synapsecore.dev";

const CHANNELS: Array<{ ch: string; label: string; where: string; text: (name: string, url: string) => string }> = [
  {
    ch: "whatsapp", label: "WhatsApp", where: "WhatsApp Business app: Settings, Business tools, Away message (and Greeting message).",
    text: (n, u) => `Thanks for messaging ${n}! We'll reply shortly. Meanwhile, see our available homes and get answers right away here: ${u}`,
  },
  {
    ch: "instagram", label: "Instagram", where: "Meta Business Suite: Inbox, Automations, Instant reply (Instagram).",
    text: (n, u) => `Hi! Thanks for reaching out to ${n}. Browse our homes and ask anything, any time: ${u}`,
  },
  {
    ch: "facebook", label: "Facebook", where: "Meta Business Suite: Inbox, Automations, Instant reply (Messenger).",
    text: (n, u) => `Hello from ${n}! While we get back to you, see our homes and ask questions here: ${u}`,
  },
];

function copy(text: string) {
  const ok = () => window.SynToast?.("Copied");
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, () => window.prompt("Copy this:", text));
  else window.prompt("Copy this:", text);
}

function Card({ code, name }: { code: string; name: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".syn-arl-row", { y: 12, autoAlpha: 0, duration: 0.4, ease: "power2.out", stagger: 0.08, clearProps: "transform,opacity,visibility" });
    });
  }, { scope: root });
  return (
    <div ref={root} className="card" style={{ marginTop: 16, padding: 18 }}>
      <div className="eyebrow">Auto-replies</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>Your auto-reply links</div>
      <p className="muted" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
        Put one of these in your auto-replies. Whoever taps it lands with Tayo, sees only your homes, and when they enquire the lead comes to you,
        credited to that channel. Set the auto-reply in your own app; Synapse does not send it.
      </p>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {CHANNELS.map((c) => {
          const url = `${SITE}/t/${encodeURIComponent(code)}?ch=${c.ch}`;
          const msg = c.text(name, url);
          return (
            <div key={c.ch} className="syn-arl-row" style={{ border: "1px solid rgba(128,128,128,0.2)", borderRadius: 14, padding: 14, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <b>{c.label}</b>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn" style={{ padding: "7px 12px", fontSize: 13 }} onClick={() => copy(url)}>Copy link</button>
                  <button type="button" className="btn btn-primary" style={{ padding: "7px 12px", fontSize: 13 }} onClick={() => copy(msg)}>Copy message</button>
                </div>
              </div>
              <code style={{ fontSize: 12.5, overflowWrap: "anywhere", opacity: 0.85 }}>{url}</code>
              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{msg}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>Where: {c.where}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Mounts into the Social studio pane once the signed-in member's agency code is known. */
export function AutoReplyLinks() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [agency, setAgency] = useState<{ code: string; name: string } | null>(null);
  useEffect(() => {
    setHost(document.getElementById("react-autoreply"));
    let gone = false;
    (async () => {
      try {
        if (!window.SynAuth?.client) return;
        await window.SynAuth.ready?.();
        const c = await window.SynAuth.client();
        const { data } = await c.rpc("my_agency_link");
        const row = Array.isArray(data) ? (data[0] as { code?: string; name?: string } | undefined) : undefined;
        if (!gone && row?.code) setAgency({ code: row.code, name: row.name || "our agency" });
      } catch { /* signed out or not an agency member: nothing to show */ }
    })();
    return () => { gone = true; };
  }, []);
  if (!host || !agency) return null;
  return createPortal(<Card code={agency.code} name={agency.name} />, host);
}
