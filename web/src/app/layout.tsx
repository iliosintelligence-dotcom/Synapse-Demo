import type { Metadata, Viewport } from "next";
import { Josefin_Sans } from "next/font/google";
import "./globals.css";

const sans = Josefin_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Synapse",
  description: "Find a home in Nigeria with Tayo, an AI advisor that negotiates for the agency.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
