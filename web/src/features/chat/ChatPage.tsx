"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AuthSlot } from "@/components/AuthSlot";
import { ClientOnly } from "@/components/ClientOnly";
import { useSession } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { Canvas, matchesIn } from "./Canvas";
import { Composer } from "./Composer";
import { ErrorNotice, HandoverCard, IntroTicket, MemoryNote, Typing, UserMessage } from "./Conversation";
import { BackgroundPanel, HistoryPanel, PinsPanel, savedBackground, type Background } from "./Panels";
import { TojuMessage } from "./TojuMessage";
import { initialChat, introUnlocked, useChat } from "./useChat";
import { isHiddenNote } from "./context";
import s from "./Chat.module.css";

/** /tayo/. Opens with whatever the address says (?reply=, ?home=, ?ask=, ?new=, ?agency=) on top of what this device remembers. */
export function ChatPage() {
  return <ClientOnly fallback={<div className={s.boot} aria-hidden="true" />}><ChatInner /></ClientOnly>;
}

type Panel = "none" | "history" | "pins";

function ChatInner() {
  const [init] = useState(() => initialChat(window.location.search));
  const chat = useChat(init);
  const session = useSession();
  const [panel, setPanel] = useState<Panel>("none");
  const [bgOpen, setBgOpen] = useState(false);
  const [bgPick, setBgPick] = useState<Background | null>(null);
  const [menu, setMenu] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const bg = bgPick ?? savedBackground(session?.user.id ?? null);
  const matches = useMemo(() => matchesIn(chat.thread, chat.replyTo), [chat.thread, chat.replyTo]);

  // What the address asked for, once. React runs effects twice in development; a reply listing must not be attached and asked about twice.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const q = new URLSearchParams(window.location.search);
    const reply = q.get("reply"), home = q.get("home"), ask = q.get("ask");
    const clean = () => { try { history.replaceState(null, "", window.location.pathname); } catch { /* the address stays; harmless */ } };
    const text = (ask ?? "").slice(0, 300).trim();
    if (reply || home) {
      const mode = reply ? "discuss" : "info"; // from a listing's "Discuss with an agent", or from a social post or campaign
      chat.setMode(mode);
      clean();
      // Tayo speaks first, as a visible message (a truthful account of what "Discuss with an agent" meant). The visitor's own words, when ?ask= carries them, outrank a generic opener.
      // The attached home travels WITH the message: the page has not re-rendered yet, so state would still say there is none.
      void chat.attachReply((reply || home)!).then((p) => {
        if (p) chat.send(text || "Tell me about this home.", { replyTo: p, mode });
        else if (text) chat.send(text);
      });
    } else if (ask !== null) {
      clean();
      // typed on the landing page, so they arrive mid-conversation rather than staring at their own sentence
      if (text) setTimeout(() => chat.send(text), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the newest message in view
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chat.thread.length, chat.busy, chat.error, chat.handover.phase, chat.handover.ticket]);

  const visible = chat.thread.map((m, i) => ({ m, i })).filter(({ m }) => !isHiddenNote(m));
  const onlyGreeting = chat.thread.length === 1 && chat.thread[0].role === "assistant";

  return (
    <div className={s.app} data-bg={bg} data-canvas={matches.length > 0 ? "on" : "off"}>
      <div className={s.bgLayer} aria-hidden="true" />

      <header className={s.bar}>
        <a className={s.back} href="/buyers" aria-label="Back to the landing page">←</a>
        <div className={s.id}>
          <span className={s.name} role="heading" aria-level={1}>Tayo</span>
          <span className={s.status}><i /> AI advisor · not neutral on price · <a href="/privacy">how your chat is used</a></span>
        </div>
        <nav className={s.nav} aria-label="Main">
          <a href={routes.tayo()} aria-current="page" className={s.active}>Tayo</a>
          <a href={routes.browse()}>Your matches</a>
          <a href={routes.dream()}>Dream Home</a>
        </nav>
        <div className={s.menuWrap}>
          <button type="button" className={s.menuBtn} aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu(!menu)}>Chats</button>
          {menu && (
            <div className={s.menu} role="menu" aria-label="Chats" onClick={() => setMenu(false)}>
              <button type="button" role="menuitem" onClick={() => chat.newChat()}>New chat</button>
              <button type="button" role="menuitem" onClick={() => setPanel("history")}>History</button>
              <button type="button" role="menuitem" onClick={() => setPanel("pins")}>Pinned</button>
              <button type="button" role="menuitem" onClick={() => setBgOpen(true)}>Change background</button>
            </div>
          )}
        </div>
        <AuthSlot />
      </header>

      <div className={s.layout}>
        <section className={s.chat}>
          {panel === "history" && <HistoryPanel onOpen={chat.openArchived} onClose={() => setPanel("none")} />}
          {panel === "pins" && <PinsPanel onClose={() => setPanel("none")} />}

          {chat.memory !== null && <MemoryNote brief={chat.memory} onDismiss={chat.dismissMemory} />}
          <div className={s.convoScroll} aria-live="polite">
            <div className={s.convo}>
              {visible.map(({ m, i }) =>
                m.role === "user" ? (
                  <UserMessage key={i} text={m.content} />
                ) : (
                  <TojuMessage key={i} m={m} live={i === chat.liveAt && !chat.busy} onQuick={chat.send} greeting={onlyGreeting && i === 0} />
                ),
              )}
              {(chat.busy || chat.handover.phase === "preparing") && <Typing />}
              {chat.error && <ErrorNotice kind={chat.error} onRetry={chat.retry} />}
              {(chat.handover.phase === "card" || chat.handover.phase === "sending") && chat.handover.data && chat.replyTo && (
                <HandoverCard h={chat.handover.data} title={chat.replyTo.title || "This home"} slots={chat.handover.slots} sending={chat.handover.phase === "sending"} onSend={chat.sendHandover} onCancel={chat.cancelHandover} />
              )}
              {chat.handover.ticket && <IntroTicket listing={chat.handover.ticket.listing} lead={chat.handover.ticket.lead} />}
              <div ref={bottom} />
            </div>
          </div>

          <Composer
            busy={chat.busy}
            suggestions={chat.suggestions}
            replyTo={chat.replyTo}
            introReady={introUnlocked(chat.thread)}
            handed={chat.handed}
            onSend={chat.send}
            onStopReplying={chat.stopReplying}
            onIntroduce={chat.startHandover}
            initialText=""
          />
        </section>

        <Canvas matches={matches} />
      </div>

      {bgOpen && <BackgroundPanel mode={bg} onMode={setBgPick} onClose={() => setBgOpen(false)} />}
    </div>
  );
}
