/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from buyers.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/buyers/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";

export const viewport: Viewport = {"width":"device-width","initialScale":1,"viewportFit":"cover"};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R7VX06N3ZY" />
        <script  dangerouslySetInnerHTML={{ __html: inline("buyers", "inline-1.js") }} />
        <script src="/consent.js" defer />
        <script src="/app/native.js" defer />
        <title>{"Synapse · Find a home that's actually right for you"}</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="description" content="Tayo is an AI property advisor for Nigeria. Tell it the city, your budget and how you live, and it works through the options with you instead of handing you a page of search results." />
        <link rel="canonical" href="https://www.synapsecore.dev/buyers" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Synapse" />
        <meta property="og:locale" content="en_NG" />
        <meta property="og:url" content="https://www.synapsecore.dev/buyers" />
        <meta property="og:title" content="Find a home that's actually right for you" />
        <meta property="og:description" content="Tayo is an AI property advisor for Nigeria. Tell it the city, your budget and how you live, and it works through the options with you instead of handing you a page of search results." />
        <meta property="og:image" content="https://www.synapsecore.dev/images/og-buyers.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={"Synapse, Find a home that's actually right for you"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Find a home that's actually right for you" />
        <meta name="twitter:description" content="Tayo is an AI property advisor for Nigeria. Tell it the city, your budget and how you live, and it works through the options with you instead of handing you a page of search results." />
        <meta name="twitter:image" content="https://www.synapsecore.dev/images/og-buyers.jpg" />
        <meta name="theme-color" content="#FAF6F0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/app/josefin.css" />
        <script  dangerouslySetInnerHTML={{ __html: inline("buyers", "inline-2.js") }} />
        <link rel="stylesheet" href="home.css" />
        <link rel="stylesheet" href="app/seam.css" />
        <script src="app/seam.js" />
        <script src="app/arrival.js" />
        <script src="app/brand.js" />
        <link rel="stylesheet" href="app/tapfix.css" />
        <link rel="stylesheet" href="app/loaders.css" />
        <script src="app/loaders.js" defer />
        <link rel="stylesheet" href="app/foil.css" />
        <script src="app/foil.js" defer />
        <link rel="stylesheet" href="app/landing-bits.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
