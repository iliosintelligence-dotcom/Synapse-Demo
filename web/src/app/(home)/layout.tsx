import type { Viewport } from "next";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R7VX06N3ZY" />
        <script src="/consent.js" defer />
        <script src="/app/native.js" defer />
        <meta name="theme-color" content="#F7F7F8" />
        <title>{"Home · Synapse"}</title>
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
        <link rel="stylesheet" href="theme-night.css" />
        <link rel="stylesheet" href="theme-dark.css" />
        <link rel="stylesheet" href="scene.css" />
        <link rel="stylesheet" href="home.css" />
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
