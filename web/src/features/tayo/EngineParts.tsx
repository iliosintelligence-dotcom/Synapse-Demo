"use client";
/**
 * The pieces of Tayo's page the chat engine (engine.ts) used to write into the markup itself: starting the engine, the desktop
 * Chats menu, the line under the box when voice typing cannot start, where an introduction stands, and the memory note on return.
 * The engine publishes what they show (hintStore, handoffStore, memoryNoteStore); these draw it. The markup and class names are
 * the old ones, so the look is unchanged.
 */
import { useEffect, useSyncExternalStore } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";
import { handoffStore, hintStore, memoryNoteStore, newChat, startEngine, type Store } from "./engine";

function useStore<T>(s: Store<T>, server: T): T {
  return useSyncExternalStore(s.subscribe, s.get, () => server);
}

/** Starts the engine once the page's shared scripts (matches-shared.js, auth.js, zyn.js and the like) are in. */
export function EngineStart() {
  const scripts = usePageScripts();
  useEffect(() => { if (scripts) startEngine(); }, [scripts]);
  return null;
}

const ask = (name: string) => () => window.dispatchEvent(new Event(name));

/** The Chats menu in the desktop bar. cust-nav.js opens and closes it ([data-bar-menu]); the phone's top bar presses these same
 *  buttons by id. */
export function ChatsMenu() {
  return (
    <div className="cnav-desk cnav-mwrap" data-bar-menu="">
      <button type="button" className="cnav-dbtn" aria-expanded="false" aria-haspopup="menu" aria-controls="tjChatMenu">
        <span data-icon="chat" aria-hidden="true"></span>
        <span>Chats</span>
      </button>
      <div className="cnav-dpop cnav-menu" id="tjChatMenu" role="menu" aria-label="Chats">
        <button id="tjNew" type="button" className="cnav-mi" role="menuitem" onClick={newChat}>
          <span data-icon="plus" aria-hidden="true"></span>
          New chat
        </button>
        <button id="tjHist" type="button" className="cnav-mi" role="menuitem" onClick={ask("syn:history")}>
          <span data-icon="history" aria-hidden="true"></span>
          History
        </button>
        <button id="tjPins" type="button" className="cnav-mi" role="menuitem" onClick={ask("syn:pins")}>
          <span data-icon="heart" aria-hidden="true"></span>
          Pinned
        </button>
        <button id="tjMem" type="button" className="cnav-mi" role="menuitem" onClick={ask("syn:memory")}>
          <span data-icon="user" aria-hidden="true"></span>
          What Tayo remembers
        </button>
        <button id="tjBg" type="button" className="cnav-mi" role="menuitem" onClick={ask("syn:background")}>
          <span data-icon="boards" aria-hidden="true"></span>
          Change background
        </button>
      </div>
    </div>
  );
}

/** Why voice typing did not start (it clears itself after five seconds). */
export function VoiceHint() {
  const text = useStore(hintStore, "");
  return <div id="tjHint" className="tj-hint" hidden={!text}>{text}</div>;
}

const HO_STEPS: Array<[string, string]> = [["sent", "Sent to"], ["with_agent", "With an agent at"], ["taken_over", "An agent has taken over at"]];
/** Where a signed-in buyer's introductions stand. Only the agency's name is ever shown; nobody else sees anything. */
export function HandoffStatus() {
  const rows = useStore(handoffStore, []);
  return (
    <div className="tj-handoff" id="tjHandoffStatus" role="status" hidden={!rows.length}>
      {rows.slice(0, 2).map((r, k) => {
        const at = Math.max(0, HO_STEPS.findIndex((s) => s[0] === r.stage));
        return (
          <div className="tj-ho-row" key={k}>
            <div className="tj-ho-t">{HO_STEPS[at][1] + " " + r.agency + " "}<span>{"· " + r.listing}</span></div>
            <div className="tj-ho-bar" aria-hidden="true">{HO_STEPS.map((s, i) => <i key={s[0]} className={i <= at ? "on" : ""} />)}</div>
          </div>
        );
      })}
    </div>
  );
}

/** On return, a quiet line stating what Tayo still holds of the search, from real restored state only. */
export function MemoryNote() {
  const note = useStore(memoryNoteStore, null);
  if (!note) return null;
  return (
    <div id="tjMemory" className="tj-memory">
      <span className="tj-mem-k">Tayo remembers your search</span>
      {note.brief ? <span className="tj-mem-b">{note.brief}</span> : null}
      <button type="button" className="tj-mem-x" aria-label="Dismiss" onClick={() => memoryNoteStore.set(null)}>×</button>
    </div>
  );
}
