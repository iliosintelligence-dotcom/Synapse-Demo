"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PropertyPage } from "@/features/property/PropertyPage";

/** /property/?id=<uuid>. A query parameter so the static export needs no list of ids at build time. */
function Inner() {
  const id = useSearchParams().get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return <main style={{ padding: 40 }}>No listing selected. Open a property from your matches or from Browse.</main>;
  return <PropertyPage id={id} />;
}

export default function PropertyRoute() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
