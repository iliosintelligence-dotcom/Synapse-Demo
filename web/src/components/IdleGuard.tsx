"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth";
import { roleOf, signOut } from "@/lib/auth-actions";
import { clearStamp, idleAction, readStamp, writeStamp } from "@/lib/idle";
import { routes } from "@/lib/routes";

/** Signs a signed-in person out after a couple of hours away, and sends them to sign in with a line saying why. No `next`: they are not returned to their last page. */
export function IdleGuard() {
  const session = useSession();
  const user = session?.user ?? null;
  const leaving = useRef(false);
  const last = useRef(0);

  useEffect(() => {
    if (session === undefined) return; // still being read
    if (!user) { clearStamp(); return; }

    const note = (force = false) => {
      const now = Date.now();
      if (!force && now - last.current < 15000) return; // a stamp every fifteen seconds is plenty, and cheap
      last.current = now;
      writeStamp(now);
    };
    const check = () => {
      if (leaving.current) return;
      const act = idleAction(readStamp());
      if (act === "stamp") note(true);
      if (act !== "leave") return;
      leaving.current = true;
      const agency = roleOf(user) === "agency";
      void signOut().catch(() => {}).then(() => {
        clearStamp();
        // the sign-in page itself needs no redirect
        if (window.location.pathname.replace(/\/$/, "").endsWith("/signin")) { window.location.reload(); return; }
        window.location.replace(routes.signin(`?reason=idle${agency ? "&role=agency" : ""}`));
      });
    };

    check(); // BEFORE the first stamp, or opening the page would reset the clock
    if (leaving.current) return;
    note(true);
    const bump = () => note(false);
    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true, capture: true }));
    const vis = () => { if (document.visibilityState === "visible") { check(); if (!leaving.current) note(true); } };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", check);
    const timer = setInterval(check, 60 * 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump, { capture: true }));
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("focus", check);
      clearInterval(timer);
    };
  }, [session, user]);

  return null;
}
