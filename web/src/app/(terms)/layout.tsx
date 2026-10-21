/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from terms.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/terms/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";

export const viewport: Viewport = {"width":"device-width","initialScale":1,"viewportFit":"cover"};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R7VX06N3ZY" />
        <script  dangerouslySetInnerHTML={{ __html: inline("terms", "inline-1.js") }} />
        <script src="/consent.js" defer />
        <title>{"Terms of Service · Synapse Core"}</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="description" content={"The terms that govern using Synapse Core: what the platform is, what “verified” means and does not mean, and what Synapse Core does not promise."} />
        <link rel="canonical" href="https://www.synapsecore.dev/terms.html" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Synapse Core" />
        <meta property="og:locale" content="en_NG" />
        <meta property="og:url" content="https://www.synapsecore.dev/terms.html" />
        <meta property="og:title" content="Terms of Service" />
        <meta property="og:description" content={"The terms that govern using Synapse Core: what the platform is, what “verified” means and does not mean, and what Synapse Core does not promise."} />
        <meta property="og:image" content="https://www.synapsecore.dev/images/og-synapse.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={"Synapse Core — Terms of Service"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Terms of Service" />
        <meta name="twitter:description" content={"The terms that govern using Synapse Core: what the platform is, what “verified” means and does not mean, and what Synapse Core does not promise."} />
        <meta name="twitter:image" content="https://www.synapsecore.dev/images/og-synapse.jpg" />
        <meta name="theme-color" content="#f5f5f5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/app/josefin.css" />
        <link rel="stylesheet" href="landing.css" />
        <link rel="stylesheet" href="landing-mobile.css" />
        <link rel="stylesheet" href="app/motion.css" />
        <link rel="stylesheet" href="app/seam.css" />
        <script src="app/seam.js" />
        <style  dangerouslySetInnerHTML={{ __html: inline("terms", "inline-2.css") }} />
        <script src="app/brand.js" />
        <link rel="stylesheet" href="app/tapfix.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
