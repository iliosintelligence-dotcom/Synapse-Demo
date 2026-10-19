"use client";

import { useEffect } from "react";
import { captureArrival } from "@/lib/arrival";

/** Remembers which channel brought the visitor, once per page load, on every page (mounted in the root layout). Renders nothing. */
export function ArrivalCapture() {
  useEffect(() => captureArrival(window.location.search, document.referrer), []);
  return null;
}
