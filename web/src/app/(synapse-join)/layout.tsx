/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/synapse-join.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/synapse-join/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";

export const viewport: Viewport = {"width":"device-width","initialScale":1,"viewportFit":"cover"};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <title>{"Join the Synapse team"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/app/josefin.css" />
        <script src="theme.js" />
        <style  dangerouslySetInnerHTML={{ __html: inline("synapse-join", "inline-1.css") }} />
        <link rel="stylesheet" href="tapfix.css" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
