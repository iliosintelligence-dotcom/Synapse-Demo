/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from privacy.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/privacy/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";

export const viewport: Viewport = {"width":"device-width","initialScale":1,"viewportFit":"cover"};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R7VX06N3ZY" />
        <script  dangerouslySetInnerHTML={{ __html: inline("privacy", "inline-1.js") }} />
        <script src="/consent.js" defer />
        <title>{"Privacy Policy · Synapse Core"}</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="description" content="What Synapse Core collects, why it collects it, where it is stored, and how to see or delete your data." />
        <link rel="canonical" href="https://www.synapsecore.dev/privacy" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Synapse Core" />
        <meta property="og:locale" content="en_NG" />
        <meta property="og:url" content="https://www.synapsecore.dev/privacy" />
        <meta property="og:title" content="Privacy Policy" />
        <meta property="og:description" content="What Synapse Core collects, why it collects it, where it is stored, and how to see or delete your data." />
        <meta property="og:image" content="https://www.synapsecore.dev/images/og-synapse.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={"Synapse Core — Privacy Policy"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Privacy Policy" />
        <meta name="twitter:description" content="What Synapse Core collects, why it collects it, where it is stored, and how to see or delete your data." />
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
        <style  dangerouslySetInnerHTML={{ __html: inline("privacy", "inline-2.css") }} />
        <script src="app/brand.js" />
        <link rel="stylesheet" href="app/tapfix.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
