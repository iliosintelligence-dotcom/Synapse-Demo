/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from index.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/index/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";

export const viewport: Viewport = {"width":"device-width","initialScale":1,"viewportFit":"cover"};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R7VX06N3ZY" />
        <script  dangerouslySetInnerHTML={{ __html: inline("index", "inline-1.js") }} />
        <script src="/consent.js" defer />
        <script src="/app/native.js" defer />
        <title>{"Synapse for agencies · Grow your agency, not your workload"}</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="description" content="Synapse helps Nigerian estate agencies publish a listing once and reach every channel, qualify enquiries with an AI advisor, and see which channels actually produce buyers. Free to start." />
        <link rel="canonical" href="https://www.synapsecore.dev/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Synapse" />
        <meta property="og:locale" content="en_NG" />
        <meta property="og:url" content="https://www.synapsecore.dev/" />
        <meta property="og:title" content="Grow your agency. Not your workload." />
        <meta property="og:description" content="Synapse helps Nigerian estate agencies publish a listing once and reach every channel, qualify enquiries with an AI advisor, and see which channels actually produce buyers. Free to start." />
        <meta property="og:image" content="https://www.synapsecore.dev/images/og-agencies.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={"Synapse — Grow your agency. Not your workload."} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Grow your agency. Not your workload." />
        <meta name="twitter:description" content="Synapse helps Nigerian estate agencies publish a listing once and reach every channel, qualify enquiries with an AI advisor, and see which channels actually produce buyers. Free to start." />
        <meta name="twitter:image" content="https://www.synapsecore.dev/images/og-agencies.jpg" />
        <meta name="theme-color" content="#FAF6F0" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: inline("index", "inline-2.json") }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={"https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800&display=swap"} rel="stylesheet" />
        <link rel="stylesheet" href="/app/josefin.css" />
        <script  dangerouslySetInnerHTML={{ __html: inline("index", "inline-3.js") }} />
        <link rel="stylesheet" href="home.css" />
        <link rel="stylesheet" href="app/foil.css" />
        <link rel="stylesheet" href="app/seam.css" />
        <script src="app/seam.js" />
        <script src="app/arrival.js" />
        <script src="app/brand.js" />
        <link rel="stylesheet" href="app/tapfix.css" />
        <link rel="stylesheet" href="app/loaders.css" />
        <script src="app/loaders.js" defer />
        <link rel="stylesheet" href="app/landing-bits.css" />
        <script src="app/ref.js" />
        <link rel="stylesheet" href="/app/swipe-landing.css" />
        <script src="/app/swipe-vt.js" />
        <script src="/app/swipe-nav.js" defer />
        <script src="/app/swipe-landing.js" defer />
      </head>
      <body>{children}</body>
    </html>
  );
}
