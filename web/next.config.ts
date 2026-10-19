import type { NextConfig } from "next";

/**
 * Static export: the build is plain HTML/JS/CSS in `out/`. All server logic lives in Supabase (database, auth, edge
 * functions), so nothing here needs a Node server, and Capacitor can wrap `out/` directly for iOS and Android.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  turbopack: { root: __dirname },
  images: { unoptimized: true },
};

export default nextConfig;
