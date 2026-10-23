"use client";
/**
 * Tayo's React parts (the move to React, 2026-10-23): the page's shared React layer (toasts and the SynToast bridge) plus what
 * has moved out of Tayo's old markup so far, starting with the phone's top bar.
 */
import { SiteReact } from "@/features/site/SiteReact";
import { TopBar } from "./TopBar";
import { MemorySheet } from "./MemorySheet";

export function TayoReact() {
  return (
    <>
      <TopBar />
      <MemorySheet />
      {/* below the floating top bar on a phone, clear of the status bar in the app */}
      <SiteReact toastTop="calc(76px + var(--syn-top, env(safe-area-inset-top, 0px)))" />
    </>
  );
}
