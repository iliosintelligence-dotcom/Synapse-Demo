/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/agency-profile.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/agency-profile/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";
import { AnalyticsHead } from "@/features/site/Analytics";

export const viewport: Viewport = {"width":"device-width","initialScale":1,"viewportFit":"cover","interactiveWidget":"resizes-content"};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <AnalyticsHead />
        <script src="/app/native.js" defer />
        <meta name="theme-color" content="#F7F7F8" />
        <title>{"Agency · Synapse"}</title>
        <meta name="description" content="An estate agency on Synapse: who they are, where their office is, and every home they list." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/app/josefin.css" />
        <link rel="stylesheet" href="app.css" />
        <link rel="stylesheet" href="motion.css" />
        <style  dangerouslySetInnerHTML={{ __html: inline("agency-profile", "inline-2.css") }} />
        <link rel="stylesheet" href="theme.css" />
        <link rel="stylesheet" href="theme-night.css" />
        <link rel="stylesheet" href="theme-dark.css" />
        <script src="theme.js" />
        <script src="brand.js" />
        <link rel="stylesheet" href="tapfix.css" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
