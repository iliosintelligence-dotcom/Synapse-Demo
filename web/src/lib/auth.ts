"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/** The current session: undefined while it is being read, null when signed out. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => live && setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => live && setSession(s));
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return session;
}

/** Where to send someone who has to sign in. Sign-in is still the static page; `next` brings them back here. */
export const signInHref = (reason: string, next: string) => `/app/signin.html?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent(next)}`;
