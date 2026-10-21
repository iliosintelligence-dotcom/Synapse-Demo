"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { loadBackground, loadPins, loadSessions, saveBackground, savePins, saveSessions } from "./storage";
import { shareOut, shareText } from "./TojuMessage";
import type { ArchivedChat, Pin } from "./types";
import s from "./Chat.module.css";

const histDate = (ts: number) => {
  const d = new Date(ts);
  const days = Math.floor((Date.now() - d.getTime()) / 864e5);
  const when = days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return `${when} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
};

function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={s.hist} role="region" aria-label={title}>
      <div className={s.histHead}><span>{title}</span><button type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>×</button></div>
      <div className={s.histList}>{children}</div>
    </div>
  );
}

/** Past conversations, each with the homes Tayo recommended still on its cards. Opening one files today's thread and brings that one back live. */
export function HistoryPanel({ onOpen, onClose }: { onOpen: (c: ArchivedChat) => void; onClose: () => void }) {
  const [sessions, setSessions] = useState<ArchivedChat[]>(() => loadSessions());
  return (
    <PanelShell title="Past conversations" onClose={onClose}>
      {!sessions.length ? (
        <div className={s.histEmpty}>No past conversations yet.<br />When you start a new chat, the old one is saved here, with every home Tayo recommended.</div>
      ) : sessions.map((c) => {
        const n = (c.messages ?? []).filter((m) => m.role === "user").length;
        return (
          <div key={c.id} className={s.histRow}>
            <button type="button" className={s.histOpen} onClick={() => { onOpen(c); onClose(); }}>
              <div className={s.t}>{c.title || "Conversation"}</div>
              <div className={s.d}>{histDate(c.endedAt)} · {n} message{n === 1 ? "" : "s"}{c.homes ? ` · ${c.homes} home${c.homes === 1 ? "" : "s"}` : ""}</div>
            </button>
            <button type="button" className={s.del} aria-label="Delete conversation" title="Delete" onClick={() => { const next = sessions.filter((x) => x.id !== c.id); saveSessions(next); setSessions(next); }}>🗑</button>
          </div>
        );
      })}
    </PanelShell>
  );
}

/** A pin keeps a Tayo reply, and the homes under it, in this browser. Sharing sends the words and a link to each home through the phone's own share sheet; where there is none, it copies. Nothing is uploaded. */
export function PinsPanel({ onClose }: { onClose: () => void }) {
  const [pins, setPins] = useState<Pin[]>(() => loadPins());
  const [flash, setFlash] = useState("");
  const share = async (text: string) => { const w = await shareOut(text); if (w) { setFlash(w); setTimeout(() => setFlash(""), 1800); } };
  return (
    <PanelShell title="Pinned" onClose={onClose}>
      {!pins.length ? (
        <div className={s.histEmpty}>Nothing pinned yet.<br />Tap the pin under any reply from Tayo to keep it, and the homes with it, here.</div>
      ) : (
        <>
          <button type="button" className={s.histRowBtn} onClick={() => share(pins.map(shareText).join("\n\n-\n\n"))}>
            <div className={s.t}>Share everything pinned</div><div className={s.d}>{pins.length} pinned{flash ? ` · ${flash}` : ""}</div>
          </button>
          {pins.map((x) => (
            <div key={x.id} className={s.histRow}>
              <div className={s.histOpen}>
                <div className={s.t}>{x.text.slice(0, 110)}{x.text.length > 110 ? "…" : ""}</div>
                <div className={s.d}>{histDate(x.at)}{x.matches.length ? ` · ${x.matches.length} home${x.matches.length === 1 ? "" : "s"}` : ""}</div>
                {x.matches.slice(0, 4).map((m) => <a key={m.id} className={s.pinHome} href={routes.property(m.id)}>{m.title || "Listing"}</a>)}
              </div>
              <span className={s.pinActs}>
                <button type="button" onClick={() => share(shareText(x))}>Share</button>
                <button type="button" onClick={() => { const next = pins.filter((p) => p.id !== x.id); savePins(next); setPins(next); }}>Unpin</button>
              </span>
            </div>
          ))}
        </>
      )}
    </PanelShell>
  );
}

export type Background = "tint" | "photo" | "pattern";

/** Change background (signed in only): the warm colour, the interior photograph or a quiet pattern. Each has a light and a dark version. Held per account, so a shared browser does not inherit someone else's choice. */
export function BackgroundPanel({ mode, onMode, onClose }: { mode: Background; onMode: (m: Background) => void; onClose: () => void }) {
  const session = useSession();
  const uid = session?.user.id ?? null;
  const first = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const pick = (m: Background) => { if (uid) { saveBackground(uid, m); onMode(m); } };
  return (
    <div className={s.bgp} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.bgpCard} role="dialog" aria-modal="true" aria-labelledby="tjBgT">
        <div className={s.bgpT} id="tjBgT">Change background</div>
        {!uid ? (
          <>
            <p className={s.bgpS}>Create a free account to choose your own background: the warm colour, the interior photograph or a quiet pattern. Each has a light and a dark version.</p>
            <div className={s.bgpFoot}>
              <button type="button" className={s.ghost} onClick={onClose}>Not now</button>
              <a className={s.primary} ref={(el) => { first.current = el; }} href={routes.signin(`?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>Create an account</a>
            </div>
          </>
        ) : (
          <>
            <p className={s.bgpS}>Pick what sits behind the chat. It follows light and dark mode.</p>
            <div className={s.bgpOpts}>
              {(["tint", "photo", "pattern"] as const).map((m, i) => (
                <button key={m} type="button" ref={i === 0 ? (el) => { first.current = el; } : undefined} className={`${s.bgpOpt} ${mode === m ? s.bgpOn : ""}`} aria-pressed={mode === m} onClick={() => pick(m)}>
                  {{ tint: "Colour", photo: "Photo", pattern: "Pattern" }[m]}
                </button>
              ))}
            </div>
            <div className={s.bgpFoot}><button type="button" className={s.ghost} onClick={onClose}>Done</button></div>
          </>
        )}
      </div>
    </div>
  );
}

/** The saved choice for this account, or the photograph for everyone else. */
export function savedBackground(uid: string | null): Background {
  const b = loadBackground();
  return uid && b && b.uid === uid && (b.mode === "tint" || b.mode === "pattern") ? b.mode : "photo";
}
