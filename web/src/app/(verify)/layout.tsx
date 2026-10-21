/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/verify.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/verify/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";

export const viewport: Viewport = {"width":"device-width","initialScale":1};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R7VX06N3ZY" />
        <script  dangerouslySetInnerHTML={{ __html: inline("verify", "inline-1.js") }} />
        <script src="/consent.js" defer />
        <script src="/app/native.js" defer />
        <title>{"Verification desk · Synapse"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/app/josefin.css" />
        <link rel="stylesheet" href="app.css" />
        <link rel="stylesheet" href="motion.css" />
        <link rel="stylesheet" href="seam.css" />
        <script src="seam.js" />
        <style  dangerouslySetInnerHTML={{ __html: inline("verify", "inline-2.css") }} />
        <link rel="stylesheet" href="theme.css" />
        <link rel="stylesheet" href="theme-night.css" />
        <link rel="stylesheet" href="theme-dark.css" />
        <script src="theme.js" />
        <link rel="stylesheet" href="tapfix.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
