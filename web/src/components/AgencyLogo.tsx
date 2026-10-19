"use client";

import { useState } from "react";
import { safeUrl } from "@/lib/brand";

/** The agency's initial is always drawn; the logo fades in over it once loaded, so a missing or broken logo is never a blank box. */
export function AgencyLogo({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = safeUrl(logoUrl);
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden" }}>
      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{(name.trim()[0] ?? "?").toUpperCase()}</span>
      {url && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${name} logo`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#fff", opacity: loaded ? 1 : 0, transition: "opacity .2s" }}
        />
      )}
    </div>
  );
}
