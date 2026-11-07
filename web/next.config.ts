import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Static export: the build is plain HTML/JS/CSS in `out/`. All server logic lives in Supabase (database, auth, edge
 * functions), so nothing here needs a Node server, and Capacitor can wrap `out/` directly for iOS and Android.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false, // pages are written as app/toju.html and served at /app/toju (vercel.json cleanUrls), the addresses the site has always had minus ".html"
  turbopack: { root: __dirname },
  images: { unoptimized: true },
};

/* `next dev` knows nothing of vercel.json, so locally /index.html, /agencies, /tayo and /your-data 404'd and /portal, /chat
   opened the parked React pages instead of where the live site sends them. In dev, vercel.json's own redirects and
   rewrites are applied, plus cleanUrls (x.html -> x, index.html -> /), so every link goes where it goes live.
   Rewrites to another host (the /s/ short links and /m/ images, both on production's Supabase) are left out, so a PC
   pointed at staging never reaches production through them.
   Dev only: a static export does not support redirects or rewrites, and production gets these from vercel.json. */
type VercelRoute = { source: string; destination: string; permanent?: boolean };
const vercel = JSON.parse(readFileSync(join(__dirname, "vercel.json"), "utf8")) as { redirects?: VercelRoute[]; rewrites?: VercelRoute[] };
const sameSite = (r: VercelRoute) => !/^https?:\/\//.test(r.destination);

export default function config(phase: string): NextConfig {
  if (phase !== PHASE_DEVELOPMENT_SERVER) return nextConfig;
  return {
    ...nextConfig,
    async redirects() {
      return (vercel.redirects ?? []).filter(sameSite)
        .map((r) => ({ source: r.source, destination: r.destination, permanent: Boolean(r.permanent) }));
    },
    async rewrites() {
      return [
        { source: "/index.html", destination: "/" },
        ...(vercel.rewrites ?? []).filter(sameSite).map((r) => ({ source: r.source, destination: r.destination })),
        { source: "/:path*.html", destination: "/:path*" },
      ];
    },
  };
}
