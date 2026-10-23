"use client";
/**
 * Auto-reply links, in the agency portal (2026-10-23).
 *
 * One link per channel for the agency's WhatsApp, Instagram and Facebook auto-replies. Each opens Tayo focused on this agency's
 * homes and records where the person came from, so a lead that follows is credited to the agency and the channel. The agency
 * sets the auto-reply in its own app (WhatsApp Business, Meta Business Suite); Synapse never messages buyers on WhatsApp itself.
 *
 * Eden: not a big card. It is a notification in the bell (window.SYN_AUTOREPLY tells the bell; opening it fires `syn:autoreply`)
 * and a single line in the Social studio, and both open one pop-up that shows a channel at a time.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);
const SITE = "https://www.synapsecore.dev";

declare global {
  interface Window { SYN_AUTOREPLY?: { code: string; name: string } }
}

type Channel = { ch: string; label: string; app: string; where: string[]; text: (name: string, url: string) => string };
const CHANNELS: Channel[] = [
  {
    ch: "whatsapp", label: "WhatsApp", app: "WhatsApp Business",
    where: ["Open WhatsApp Business, then Settings.", "Business tools, then Away message (and Greeting message).", "Paste the message and save."],
    text: (n, u) => `Thanks for messaging ${n}! We'll reply shortly. Meanwhile, see our available homes and get answers right away here: ${u}`,
  },
  {
    ch: "instagram", label: "Instagram", app: "Meta Business Suite",
    where: ["Open Meta Business Suite, then Inbox.", "Automations, then Instant reply, and choose Instagram.", "Paste the message and save."],
    text: (n, u) => `Hi! Thanks for reaching out to ${n}. Browse our homes and ask anything, any time: ${u}`,
  },
  {
    ch: "facebook", label: "Facebook", app: "Meta Business Suite",
    where: ["Open Meta Business Suite, then Inbox.", "Automations, then Instant reply, and choose Messenger.", "Paste the message and save."],
    text: (n, u) => `Hello from ${n}! While we get back to you, see our homes and ask questions here: ${u}`,
  },
];

function copy(text: string, what: string) {
  const ok = () => window.SynToast?.({ title: what + " copied", type: "success" });
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, () => window.prompt("Copy this:", text));
  else window.prompt("Copy this:", text);
}

/** The pop-up: one channel at a time. Uses the portal's own modal and segmented-control styles. */
function Popup({ code, name, open, onClose }: { code: string; name: string; open: boolean; onClose: () => void }) {
  const [ch, setCh] = useState("whatsapp");
  const body = useRef<HTMLDivElement>(null);
  const c = CHANNELS.find((x) => x.ch === ch) ?? CHANNELS[0];
  const url = `${SITE}/t/${encodeURIComponent(code)}?ch=${c.ch}`;
  const msg = c.text(name, url);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onClose]);

  /* A small cross-fade as the channel changes. */
  useGSAP(() => {
    gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(body.current, { autoAlpha: 0, y: 6, duration: 0.25, ease: "power2.out", clearProps: "opacity,visibility,transform" });
    });
  }, { dependencies: [ch], scope: body });

  return (
    <>
      <div className={"modal-scrim" + (open ? " on" : "")} onClick={onClose} />
      <div className={"modal" + (open ? " on" : "")} role="dialog" aria-modal="true" aria-labelledby="arlTitle" style={{ width: "min(93vw, 480px)" }}>
        <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
        <div className="eyebrow">Auto-replies</div>
        <h3 id="arlTitle" style={{ margin: "4px 0 6px", fontSize: 19 }}>Send enquirers to Tayo</h3>
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
          Put this in your auto-reply. Whoever taps it sees only your homes, and their enquiry comes to you, credited to that channel.
        </p>
        <div className="seg" role="tablist" aria-label="Channel" style={{ margin: "14px 0 12px", width: "fit-content" }}>
          {CHANNELS.map((x) => (
            <button key={x.ch} type="button" role="tab" aria-selected={x.ch === ch} className={"seg-b" + (x.ch === ch ? " on" : "")} onClick={() => setCh(x.ch)}>{x.label}</button>
          ))}
        </div>
        <div ref={body} style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 14, lineHeight: 1.55, padding: "12px 14px", borderRadius: 14, background: "var(--brand-tint)" }}>{msg}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={() => copy(msg, "Message")}>Copy message</button>
            <button type="button" className="btn" onClick={() => copy(url, "Link")}>Copy link only</button>
          </div>
          <details style={{ fontSize: 13 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Where to paste it in {c.app}</summary>
            <ol style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{c.where.map((w) => <li key={w}>{w}</li>)}</ol>
          </details>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>Synapse does not send the auto-reply; you set it in your own app.</p>
        </div>
      </div>
    </>
  );
}

/** One line in the Social studio, the bell notification, and the pop-up both open. */
export function AutoReplyLinks() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [agency, setAgency] = useState<{ code: string; name: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHost(document.getElementById("react-autoreply"));
    let gone = false;
    /* Sign-in (auth.js) is one of the page's scripts, which now run after React takes the page over: wait for them. */
    const scriptsReady = () => new Promise<void>((done) => {
      if (window.SynAuth?.client || window.SynPageScriptsReady) { done(); return; }
      window.addEventListener("syn:page-scripts", () => done(), { once: true });
    });
    (async () => {
      try {
        await scriptsReady();
        if (!window.SynAuth?.client) return;
        await window.SynAuth.ready?.();
        const c = await window.SynAuth.client();
        const { data } = await c.rpc("my_agency_link");
        const row = Array.isArray(data) ? (data[0] as { code?: string; name?: string } | undefined) : undefined;
        if (gone || !row?.code) return;
        const a = { code: row.code, name: row.name || "our agency" };
        setAgency(a);
        window.SYN_AUTOREPLY = a;
        document.dispatchEvent(new Event("syn:noti-refresh"));   // the bell can offer it now
      } catch { /* signed out or not an agency member: nothing to show */ }
    })();
    const show = () => setOpen(true);
    window.addEventListener("syn:autoreply", show);
    return () => { gone = true; window.removeEventListener("syn:autoreply", show); };
  }, []);

  if (!agency) return null;
  return (
    <>
      {host ? createPortal(
        <div className="card" style={{ marginTop: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <b style={{ fontSize: 14 }}>Auto-reply links</b>
            <span className="muted" style={{ fontSize: 13, marginLeft: 8 }}>Send WhatsApp, Instagram and Facebook enquirers to Tayo.</span>
          </div>
          <button type="button" className="btn" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => setOpen(true)}>Set up</button>
        </div>, host) : null}
      {createPortal(<Popup code={agency.code} name={agency.name} open={open} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
