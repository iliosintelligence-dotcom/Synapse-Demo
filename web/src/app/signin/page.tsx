"use client";

import { Suspense } from "react";
import { SignInPage } from "@/features/signin/SignInPage";

/** /signin/. Everything arrives as query parameters or a fragment (role, reason, next, mode, demo, and the return legs of email and Google). */
export default function SignInRoute() {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  );
}
