import type { Metadata, Viewport } from "next";
import { Ubuntu } from "next/font/google";
import { ArrivalCapture } from "@/components/ArrivalCapture";
import { IdleGuard } from "@/components/IdleGuard";
import "./globals.css";

/* Ubuntu, the site's face (2026-11-05). It has no 600: 500 and 700 cover the weights these pages ask for. */
const sans = Ubuntu({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "700"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Synapse",
  description: "Find a home in Nigeria with Tayo, an AI advisor that negotiates for the agency.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <ArrivalCapture />
        <IdleGuard />
        {children}
      </body>
    </html>
  );
}
