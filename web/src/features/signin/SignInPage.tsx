"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DEFAULT_AGENCY_DEST, DEFAULT_CUSTOMER_DEST } from "@/lib/auth-config";
import { hasAgency, roleOf, safeNext, type Role } from "@/lib/auth-actions";
import { supabase } from "@/lib/supabase";
import { AgencyForm } from "./AgencyForm";
import { ArtPanel } from "./ArtPanel";
import { CredentialsForm, type Mode } from "./CredentialsForm";
import { RecoverForm } from "./RecoverForm";
import { WHY } from "./errors";
import s from "./SignIn.module.css";

type View = { kind: "form" } | { kind: "recover" } | { kind: "agency"; suggested: string };

/**
 * The sign-in page. Besides the form it finishes every journey that comes BACK to it: a confirmation link, a password-reset link, and
 * the return from Google. Each arrives differently (a ?code=, a ?token_hash=, a #fragment), and each is consumed here, once, and
 * stripped from the address bar, because it is a one-use credential and a reload must not try to spend it twice.
 */
export function SignInPage() {
  const params = useSearchParams();
  const role: Role = params.get("role") === "agency" ? "agency" : "customer";
  const reason = params.get("reason") ?? "";
  const next = params.get("next") ?? "";
  const why = WHY[reason];

  // ?mode=up honours a "Create account" link elsewhere; a contact reason and an agency door both start on Create account.
  const [mode, setMode] = useState<Mode>(params.get("mode") === "up" || (why && reason === "contact") || (role === "agency" && !reason) ? "up" : "in");
  const [view, setView] = useState<View>({ kind: "form" });
  const [flash, setFlash] = useState<string | null>(null);
  const started = useRef(false);

  const defaultDest = role === "agency" ? DEFAULT_AGENCY_DEST : DEFAULT_CUSTOMER_DEST;

  /** A sign-in lands on Overview: `next` can carry the pane the session ended on (#social), which is right for a bounce but wrong after someone has actually signed in. Customer pages keep theirs. */
  const signedInDest = (fallback: string) => {
    const d = safeNext(next, fallback);
    return /(^|\/)(agency\.html|portal\/?)/.test(d) ? d.replace(/#.*$/, "") : d;
  };
  const go = (dest: string) => window.location.assign(dest);

  useEffect(() => {
    if (started.current) return; // React runs effects twice in development; a one-use link must be spent once
    started.current = true;
    let cancelled = false;
    const q = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthReturn = q.get("oauth") === "1";

    const finishOauth = async (suggested: string) => {
      const dest = signedInDest(role === "agency" ? DEFAULT_AGENCY_DEST : DEFAULT_CUSTOMER_DEST);
      if (role !== "agency") return go(dest);
      // Ask the database, do not infer: a business that signed in with Google twice already HAS an agency the second time.
      if (await hasAgency()) return go(dest);
      if (!cancelled) setView({ kind: "agency", suggested });
    };

    (async () => {
      // 1. A spent or expired link comes back with the failure in the fragment and no session. Mail scanners that "pre-visit" links use up the one-time token.
      const errCode = hash.get("error_code");
      if (errCode) {
        setFlash(
          errCode === "otp_expired"
            ? "That reset link has already been used or opened. Some mail apps open links automatically to scan them, which can use it up before you click it yourself. Request a fresh one below."
            : "That link did not work. Request a fresh one below.",
        );
        history.replaceState(null, "", window.location.pathname + window.location.search);
        return;
      }

      // 2. A reset link that works on any device: a token_hash needs no verifier, so any browser can redeem it.
      const tokenHash = q.get("type") === "recovery" ? q.get("token_hash") : null;
      // 3. Or the implicit form, with the session in the fragment.
      const accessToken = hash.get("type") === "recovery" ? hash.get("access_token") : null;
      const refreshToken = hash.get("refresh_token");
      if (tokenHash || (accessToken && refreshToken)) {
        history.replaceState(null, "", window.location.pathname); // off the address bar at once
        try {
          const res = tokenHash
            ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
            : await supabase.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken! });
          if (res.error) throw res.error;
          if (!cancelled) setView({ kind: "recover" });
        } catch (err) {
          console.error("recovery link failed", err);
          const m = String((err as { message?: string })?.message ?? "");
          setFlash(/expired|invalid/i.test(m) || (err as { code?: string })?.code === "otp_expired" ? "That reset link has expired or has already been used. Request a fresh one below." : "That reset link did not work. Request a fresh one below.");
        }
        return;
      }

      // 4. A PKCE link (Google, or an email confirmation) comes back with ?code=. It can only be redeemed by the browser that started it.
      const code = q.get("code");
      if (code) {
        history.replaceState(null, "", window.location.pathname + (oauthReturn ? window.location.search.replace(/[?&]code=[^&]*/, "").replace(/^&/, "?") : ""));
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          if (!oauthReturn) setFlash("That link was opened in a different browser from the one it was requested in, so it could not sign you in here. If it was a confirmation link, your email is confirmed: sign in below. If it was a password reset, request a new one: new reset links work on any phone or browser.");
          return;
        }
        if (oauthReturn) {
          const meta = (data.session.user.user_metadata ?? {}) as { name?: string; full_name?: string };
          return finishOauth(meta.name || meta.full_name || "");
        }
      }

      // 5. Otherwise, is there already a session?
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session || cancelled) return;
      if (oauthReturn) {
        const meta = (session.user.user_metadata ?? {}) as { name?: string; full_name?: string };
        return finishOauth(meta.name || meta.full_name || "");
      }
      // Redirect only when the existing session IS the role that was asked for. Redirecting on a session's existence alone made a customer sent here to switch to an agency account bounce straight back to the portal, which bounced them straight back here, forever.
      if (roleOf(session.user) === role) return go(safeNext(next, defaultDest));
      setFlash(`You’re currently signed in on the ${role === "agency" ? "customer" : "agency"} side. Sign in below with ${role === "agency" ? "an agency" : "a customer"} account to switch.`);
    })();
    return () => { cancelled = true; };
    // Runs once per page load by design (the `started` guard); the values read are the ones in the address when the page opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heading =
    view.kind === "recover" ? "Choose a new password"
    : view.kind === "agency" ? "One more thing"
    : mode === "up" ? (role === "agency" ? "Create your agency account" : "Create your account")
    : "Welcome back";
  const sub =
    view.kind === "recover" ? "You are signed in for this one step only. Set a password and you are done."
    : view.kind === "agency" ? "Your account is ready. Tell us the agency it belongs to."
    : mode === "up" ? "It takes about twenty seconds."
    : "Sign in to pick up where you left off.";

  return (
    <div className={`${s.page} ${role === "agency" ? s.agency : ""}`}>
      <ArtPanel role={role} />
      <main className={s.formSide}>
        <div className={s.box}>
          <h1 className={s.h}>{heading}</h1>
          <p className={s.p}>{sub}</p>
          {why && view.kind === "form" && <div className={s.why}><div><b>{why.title}</b><br />{why.body}</div></div>}

          {view.kind === "form" && (
            <CredentialsForm
              key={flash ?? "form"}
              role={role}
              mode={mode}
              onMode={setMode}
              next={next}
              demoRequested={params.get("demo") === "1"}
              initialNote={flash}
              onSignedIn={({ created }) => go(signedInDest(role === "agency" ? (created ? `${DEFAULT_AGENCY_DEST}?welcome=agency` : DEFAULT_AGENCY_DEST) : DEFAULT_CUSTOMER_DEST))}
            />
          )}
          {view.kind === "recover" && <RecoverForm role={role} onDone={(agency) => go(signedInDest(agency ? DEFAULT_AGENCY_DEST : DEFAULT_CUSTOMER_DEST))} />}
          {view.kind === "agency" && <AgencyForm suggested={view.suggested} onDone={({ already }) => go(signedInDest(already ? DEFAULT_AGENCY_DEST : `${DEFAULT_AGENCY_DEST}?welcome=agency`))} />}
        </div>
      </main>
    </div>
  );
}
