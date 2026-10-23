/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/syndication-test.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/syndication-test/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>{"Syndication engine, tests"}</title>
        <meta name="robots" content="noindex, nofollow" />
        <style  dangerouslySetInnerHTML={{ __html: inline("syndication-test", "inline-1.css") }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
