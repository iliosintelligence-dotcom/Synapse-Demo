"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-actions";
import { useSession } from "@/lib/auth";
import { routes } from "@/lib/routes";
import s from "./AuthSlot.module.css";

/** The account control for any page's bar: signed out, Sign in and Create account (both carry where the person was, so signing in never loses the thing they were looking at); signed in, Sign out. Renders nothing until the session is known, so it never flashes the wrong one. */
export function AuthSlot() {
  const session = useSession();
  const [out, setOut] = useState(false);
  if (session === undefined) return null;
  const here = typeof window === "undefined" ? "/" : window.location.pathname + window.location.search + window.location.hash;
  if (session) {
    const name = (session.user.user_metadata as { full_name?: string } | undefined)?.full_name || session.user.email || "Account";
    return (
      <button type="button" className={s.out} title={`Signed in as ${name}`} disabled={out} onClick={() => { setOut(true); signOut().then(() => window.location.reload()); }}>
        {out ? "Signing out…" : "Sign out"}
      </button>
    );
  }
  const next = encodeURIComponent(here);
  return (
    <span className={s.wrap}>
      <a className={s.in} href={routes.signin(`?next=${next}`)}>Sign in</a>
      <a className={s.up} href={routes.signin(`?mode=up&next=${next}`)}>Create account</a>
    </span>
  );
}
