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

// `next dev` has no cleanUrls, so links like /app/signin.html 404 locally; map them to the page the way Vercel does.
// Dev only: a static export does not support rewrites, and production gets this from vercel.json.
export default function config(phase: string): NextConfig {
  if (phase !== PHASE_DEVELOPMENT_SERVER) return nextConfig;
  return {
    ...nextConfig,
    async rewrites() {
      return [{ source: "/:path*.html", destination: "/:path*" }];
    },
  };
}
