"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AgencyProfile } from "@/features/agency-profile/AgencyProfile";

/** /agency/?id=<uuid>. A query parameter, not a path segment, so the static export needs no list of ids at build time. */
function Inner() {
  const id = useSearchParams().get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return <main style={{ padding: 40 }}>This agency link is incomplete.</main>;
  return <AgencyProfile id={id} />;
}

export default function AgencyPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
