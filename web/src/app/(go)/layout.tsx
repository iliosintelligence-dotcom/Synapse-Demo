/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/go.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/go/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";

export const viewport: Viewport = {"width":"device-width","initialScale":1,"viewportFit":"cover"};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R7VX06N3ZY" />
        <script  dangerouslySetInnerHTML={{ __html: inline("go", "inline-1.js") }} />
        <script src="/consent.js" defer />
        <meta name="theme-color" content="#F7F7F8" />
        <title>{"Homes we just posted · Synapse"}</title>
        <meta name="description" content="The homes this account recently posted, with the full details on each." />
        <meta name="robots" content="noindex, follow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/app/josefin.css" />
        <link rel="stylesheet" href="/app/app.css" />
        <script src="/app/matches-shared.js" defer />
        <style  dangerouslySetInnerHTML={{ __html: inline("go", "inline-2.css") }} />
        <link rel="stylesheet" href="/app/theme.css" />
        <link rel="stylesheet" href="/app/theme-night.css" />
        <link rel="stylesheet" href="/app/theme-dark.css" />
        <script src="/app/theme.js" />
        <script src="/app/brand.js" />
        <link rel="stylesheet" href="tapfix.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
