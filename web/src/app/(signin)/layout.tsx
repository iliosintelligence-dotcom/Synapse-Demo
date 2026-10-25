/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/signin.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/signin/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";
import { AnalyticsHead } from "@/features/site/Analytics";

export const viewport: Viewport = {"width":"device-width","initialScale":1,"viewportFit":"cover"};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <AnalyticsHead />
        <script src="/app/native.js" defer />
        <meta name="theme-color" content="#121212" media="(max-width: 1024px)" />
        <meta name="theme-color" content="#f5f5f5" media="(min-width: 1025px)" />
        <title>{"Sign in · Synapse"}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="same-origin" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/app/josefin.css" />
        <link rel="stylesheet" href="app.css" />
        <link rel="stylesheet" href="motion.css" />
        <link rel="stylesheet" href="loader.css" />
        <link rel="stylesheet" href="seam.css" />
        <script src="seam.js" />
        <script  dangerouslySetInnerHTML={{ __html: inline("signin", "inline-2.js") }} />
        <style  dangerouslySetInnerHTML={{ __html: inline("signin", "inline-3.css") }} />
        <script src="brand.js" />
        <link rel="stylesheet" href="tapfix.css" />
        <script src="ref.js" />
        <link rel="preconnect" href="https://bhrhejpekmhbhwryjhgk.supabase.co" crossOrigin="" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
