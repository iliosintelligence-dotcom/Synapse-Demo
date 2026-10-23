"use client";
/**
 * Tayo's React parts (the move to React, 2026-10-23): the page's shared React layer (toasts and the SynToast bridge) plus what
 * has moved out of Tayo's old markup so far, starting with the phone's top bar; the conversation, the matches panel and the typing field moved too.
 */
import { SiteReact } from "@/features/site/SiteReact";
import { TopBar } from "./TopBar";
import { MemorySheet } from "./MemorySheet";
import { HistorySheet } from "./HistorySheet";
import { PinnedSheet } from "./PinnedSheet";
import { BackgroundSheet } from "./BackgroundSheet";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
import { MatchesPanel } from "./MatchesPanel";

export function TayoReact() {
  return (
    <>
      <TopBar />
      <MemorySheet />
      <HistorySheet />
      <PinnedSheet />
      <BackgroundSheet />
      <Conversation />
      <MatchesPanel />
      <Composer />
      {/* below the floating top bar on a phone, clear of the status bar in the app */}
      <SiteReact toastTop="calc(76px + var(--syn-top, env(safe-area-inset-top, 0px)))" />
    </>
  );
}
