/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/browse.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/browse/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";

export const viewport: Viewport = {"width":"device-width","initialScale":1,"viewportFit":"cover","interactiveWidget":"resizes-content"};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R7VX06N3ZY" />
        <script  dangerouslySetInnerHTML={{ __html: inline("browse", "inline-1.js") }} />
        <script src="/consent.js" defer />
        <script src="/app/native.js" defer />
        <meta name="theme-color" content="#F7F7F8" />
        <title>{"Your matches · Synapse"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/app/josefin.css" />
        <link rel="stylesheet" href="app.css" />
        <link rel="stylesheet" href="motion.css" />
        <link rel="stylesheet" href="loader.css" />
        <link rel="stylesheet" href="seam.css" />
        <script src="seam.js" />
        <script src="loader.js" defer />
        <script src="kbd.js" />
        <script src="arrival.js" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style  dangerouslySetInnerHTML={{ __html: inline("browse", "inline-2.css") }} />
        <link rel="stylesheet" href="theme-night.css" />
        <link rel="stylesheet" href="theme-dark.css" />
        <link rel="stylesheet" href="scene.css" />
        <script src="theme.js" />
        <script src="brand.js" />
        <link rel="stylesheet" href="tapfix.css" />
        <link rel="stylesheet" href="loaders.css" />
        <script src="loaders.js" defer />
      </head>
      <body>{children}</body>
    </html>
  );
}
