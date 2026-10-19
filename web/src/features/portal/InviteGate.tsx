"use client";

import { useEffect, useRef } from "react";
import { acceptInvite, markJoined, tokenFrom, whyNot } from "./data/invite";
import { useToast } from "./ui/Toast";

/** Arriving on an invite link (`/portal/?invite=…`). By here there is a signed-in session (the shell sent anyone else to sign in and back, keeping the link). */
export function InviteGate() {
  const toast = useToast();
  const ran = useRef(false);
  useEffect(() => {
    const token = tokenFrom(window.location.search);
    if (!token || ran.current) return;
    ran.current = true;
    const clean = `${window.location.pathname}${window.location.hash}`;
    acceptInvite(token).then((res) => {
      window.history.replaceState({}, "", clean);
      if (res.ok) {
        toast(`You have joined ${res.agency_name || "the agency"}.`);
        markJoined();
        setTimeout(() => window.location.reload(), 1200);
      } else toast(whyNot(res.reason), "error");
    }).catch(() => { window.history.replaceState({}, "", clean); toast("That invite could not be checked just now.", "error"); });
  }, [toast]);
  return null;
}
