"use client";

import { useEffect, useRef, useState } from "react";
import { POLICY_VERSION } from "@/lib/auth-config";
import {
  enabledProviders, normalisePhone, recordConsent, resendConfirmation, resetPassword, sendPhoneCode, signIn, signInWithGoogle, signUp, verifyPhoneCode,
  type Role,
} from "@/lib/auth-actions";
import { DEMO_ACCOUNTS } from "./demo";
import { errorCode, friendly, type AuthErrorLike } from "./errors";
import { PasswordInput } from "./PasswordInput";
import { pwMessage, pwProblems, pwScore, type PwProblem } from "./policy";
import s from "./SignIn.module.css";

export type Mode = "in" | "up";
type Method = "email" | "phone";
type Note = { kind: "ok" | "bad"; text: string; resend?: boolean } | null;

interface Props {
  role: Role;
  mode: Mode;
  onMode: (m: Mode) => void;
  next: string;
  demoRequested: boolean;
  /** Called once a session exists. `created` is true right after a sign-up, so an agency can be sent to its welcome page. */
  onSignedIn: (opts: { created: boolean }) => void;
  initialNote: string | null;
}

const RULE_ORDER: PwProblem[] = ["len", "up", "lo", "num", "sym", "weak"];
const RULE_LABEL: Record<PwProblem, string> = { len: "At least 10 characters", up: "An uppercase letter", lo: "A lowercase letter", num: "A number", sym: "A symbol, like ! or #", weak: "" };

/** Email and password, phone code, and Google: the entrances that end in a session. */
export function CredentialsForm({ role, mode, onMode, next, demoRequested, onSignedIn, initialNote }: Props) {
  const [method, setMethod] = useState<Method>("email");
  const [codeSent, setCodeSent] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [busy, setBusy] = useState(false);
  // Drawn from the first paint unless the last answer was "off", so a project with Google off never flashes the button.
  const [googleOn, setGoogleOn] = useState(() => {
    try { return typeof window === "undefined" || localStorage.getItem("syn_google_on") !== "0"; } catch { return true; }
  });
  const [googleBusy, setGoogleBusy] = useState(false);
  const [note, setNote] = useState<Note>(initialNote ? { kind: "bad", text: initialNote } : null);
  const [errs, setErrs] = useState<Partial<Record<"email" | "pass" | "phone" | "code" | "consent" | "staffPhone", string>>>({});
  const [v, setV] = useState({ name: "", agencyName: "", agencyWebsite: "", staffPhone: "", email: "", pass: "", phone: "", code: "" });
  const [consent, setConsent] = useState(false);
  const up = mode === "up";
  const agencyUp = up && role === "agency";
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const submitRef = useRef<HTMLFormElement>(null);

  // The answer to "is Google switched on?" only ever removes the button (and is remembered for next time).
  useEffect(() => {
    let live = true;
    enabledProviders().then((list) => {
      const on = list.includes("google");
      try { localStorage.setItem("syn_google_on", on ? "1" : "0"); } catch { /* not remembered */ }
      if (live) setGoogleOn(on);
    });
    return () => { live = false; };
  }, []);

  const clear = () => { setErrs({}); setNote(null); };
  const switchMode = (m: Mode) => { onMode(m); clear(); if (m === "in") setConsent(false); };
  const switchMethod = (m: Method) => { if (busy) return; setMethod(m); clear(); };

  const probs = pwProblems(v.pass, v.email, v.name);
  const label = method === "phone" ? (codeSent ? "Confirm code" : "Send me a code") : up ? "Create account" : "Sign in";

  const submit = async (e: React.FormEvent | null, demo = demoRequested) => {
    e?.preventDefault();
    if (busy) return; // one in flight only
    clear();
    const email = v.email.trim();
    const e2: typeof errs = {};

    if (!demo && method === "email") {
      if (!email || email.indexOf("@") < 1 || email.indexOf(".") < 0) e2.email = "Enter a valid email address.";
      if (!v.pass || v.pass.length < 8) e2.pass = up ? pwMessage(pwProblems(v.pass, email, v.name)) : "Use at least 8 characters.";
      else if (up && probs.length) e2.pass = pwMessage(probs);
    }
    if (!demo && method === "phone") {
      if (!codeSent) {
        if (!v.phone.trim() || normalisePhone(v.phone).length < 11) e2.phone = "Enter your number, including the network code.";
      } else if (v.code.replace(/[^0-9]/g, "").length !== 6) e2.code = "The code is six digits.";
    }
    // Refused in code, not by a native `required`: a browser that declines to submit a form with a hidden invalid field says nothing visible, which reads as a dead button.
    if (up && !consent) e2.consent = "Please read and accept the Terms and the Privacy Policy to continue.";
    // An agency with no number is an agency Tayo cannot hand a lead to, and the only way to notice is a handoff that fails weeks later.
    if (up && role === "agency" && method !== "phone" && !v.staffPhone.trim()) e2.staffPhone = "Tayo sends you leads on WhatsApp, so we need a number for you.";
    if (Object.keys(e2).length) return setErrs(e2);

    setBusy(true);
    const sendingCode = method === "phone" && !codeSent && !demo;
    try {
      const o = { role, name: v.name.trim(), agencyName: v.agencyName.trim(), agencyWebsite: v.agencyWebsite.trim() };
      const res = demo
        ? await signIn(DEMO_ACCOUNTS[role].email, DEMO_ACCOUNTS[role].password)
        : method === "phone"
          ? codeSent ? await verifyPhoneCode(pendingPhone, v.code) : await sendPhoneCode(v.phone, o)
          : up ? await signUp(email, v.pass, { ...o, phone: v.staffPhone.trim(), next }) : await signIn(email, v.pass);
      if (res.error) throw res.error;

      // Step one of two for a phone: no session yet and none expected. Name the number so a mistyped one is obvious before they wait for an SMS that cannot arrive.
      if (sendingCode) {
        setPendingPhone((res as { phone?: string }).phone || normalisePhone(v.phone));
        setCodeSent(true);
        setNote({ kind: "ok", text: "Code sent. Enter it above." });
        return;
      }
      const data = (res as { data?: { session?: unknown; user?: { identities?: unknown[] } } }).data;
      // Sign-up with email confirmation returns a user but no session.
      if (up && !data?.session) {
        // Supabase returns 200 with no error for an already-registered email (so it cannot be used to find out who has an account). An empty `identities` array is the documented signal: "check your email" would be a lie for them.
        if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
          onMode("in");
          setNote({ kind: "bad", text: "You already have an account with that email. Sign in below, or reset your password if you have forgotten it." });
          return;
        }
        onMode("in");
        setNote({ kind: "ok", text: "Check your email to confirm your account, then sign in." });
        return;
      }
      if (up && !demo) void recordConsent(POLICY_VERSION); // fire and forget: the redirect never waits for an audit row
      onSignedIn({ created: up });
    } catch (err) {
      const ae = err as AuthErrorLike;
      // Unconfirmed: offer a NEW link. GoTrue returns email_not_confirmed only when the password was right, so only the owner ever sees the offer.
      if (errorCode(ae) === "email_not_confirmed" && email) setNote({ kind: "bad", text: "That account still needs confirming.", resend: true });
      else setNote({ kind: "bad", text: friendly(ae) });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const r = await resendConfirmation(v.email.trim(), role);
      if (r.error) throw r.error;
      setNote({ kind: "ok", text: "A new link is on its way. Open it on any device. It goes to synapsecore.dev now, not to this computer." });
    } catch (err) {
      setNote({ kind: "bad", text: friendly(err as AuthErrorLike) });
    }
  };

  const forgot = async () => {
    const email = v.email.trim();
    if (!email) return setErrs({ email: "Enter your email first, then tap this again." });
    if (busy) return;
    setBusy(true);
    try {
      await resetPassword(email);
      // Deliberately unconditional: confirming whether the address exists would leak account membership.
      setNote({ kind: "ok", text: "If there is an account for that email, a reset link is on its way." });
    } catch (e) {
      const x = e as { status?: number; code?: string };
      // The limit is on the project's email, not on this address, so naming it leaks nothing about who has an account.
      if (x.status === 429 || /rate_limit/.test(x.code ?? "")) setNote({ kind: "bad", text: "Too many reset emails have gone out in the last hour. Try again later." });
      else setNote({ kind: "ok", text: "If there is an account for that email, a reset link is on its way." });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (busy) return;
    setBusy(true);
    setGoogleBusy(true);
    try {
      if (!(await enabledProviders()).includes("google")) throw new Error("Google sign-in is not available right now.");
      await signInWithGoogle(next, role); // the browser leaves; the role goes WITH them or a business would come back as a consumer
    } catch (err) {
      setBusy(false);
      setGoogleBusy(false);
      setNote({ kind: "bad", text: friendly(err as AuthErrorLike) });
    }
  };

  const demoClick = () => {
    if (busy) return;
    switchMode("in");
    void submit(null, true);
  };

  const showErr = (k: keyof typeof errs) => errs[k] && <div className={s.err} role="alert" id={`err-${k}`}>{errs[k]}</div>;
  const bad = (k: keyof typeof errs) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `err-${k}` } : {});

  return (
    <>
      <div className={s.tabs} role="tablist">
        <button className={`${s.tab} ${!up ? s.tabOn : ""}`} type="button" role="tab" aria-selected={!up} onClick={() => switchMode("in")}>Sign in</button>
        <button className={`${s.tab} ${up ? s.tabOn : ""}`} type="button" role="tab" aria-selected={up} onClick={() => switchMode("up")}>Create account</button>
      </div>

      {googleOn && (
        <div>
          <button className={s.oauth} type="button" onClick={google} disabled={googleBusy}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" /><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
            <span>{googleBusy ? "Taking you to Google..." : "Continue with Google"}</span>
          </button>
          <div className={s.or}>or</div>
        </div>
      )}

      <div className={s.methods} role="tablist" aria-label="How to sign in">
        <button className={`${s.method} ${method === "email" ? s.methodOn : ""}`} type="button" role="tab" aria-selected={method === "email"} onClick={() => switchMethod("email")}>Email</button>
        <button className={`${s.method} ${method === "phone" ? s.methodOn : ""}`} type="button" role="tab" aria-selected={method === "phone"} onClick={() => switchMethod("phone")}>Phone</button>
      </div>

      <form ref={submitRef} onSubmit={submit} noValidate>
        {up && (
          <div className={s.field}>
            <label className={s.label} htmlFor="auName">Your name</label>
            <input className={s.input} id="auName" name="name" type="text" autoComplete="name" value={v.name} onChange={set("name")} />
          </div>
        )}
        {agencyUp && (
          <>
            <div className={s.field}>
              <label className={s.label} htmlFor="auAgencyName">Agency name</label>
              <input className={s.input} id="auAgencyName" name="agencyName" type="text" autoComplete="organization" value={v.agencyName} onChange={set("agencyName")} />
              <div className={s.hint}>The name buyers will see on your listings. You can change it later.</div>
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="auAgencyWebsite">Agency website (optional)</label>
              <input className={s.input} id="auAgencyWebsite" name="agencyWebsite" type="url" inputMode="url" autoComplete="url" placeholder="youragency.com" value={v.agencyWebsite} onChange={set("agencyWebsite")} />
            </div>
            {method !== "phone" && (
              <div className={s.field}>
                <label className={s.label} htmlFor="auStaffPhone">Your WhatsApp number</label>
                <input className={s.input} id="auStaffPhone" name="staffPhone" type="tel" autoComplete="tel" value={v.staffPhone} onChange={set("staffPhone")} inputMode="tel" placeholder="0803 123 4567" {...bad("staffPhone")} />
                <div className={s.hint}>Where Tayo sends you a lead the moment it qualifies. Any format: 08…, 234… or +234…</div>
                {showErr("staffPhone")}
              </div>
            )}
          </>
        )}

        {method === "email" && (
          <>
            <div className={s.field}>
              <label className={s.label} htmlFor="auEmail">Email</label>
              <input className={s.input} id="auEmail" name="email" type="email" autoComplete="email" value={v.email} onChange={set("email")} required {...bad("email")} />
              {showErr("email")}
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="auPass">Password</label>
              <PasswordInput id="auPass" name="password" autoComplete={up ? "new-password" : "current-password"} value={v.pass} onChange={set("pass")} required invalid={!!errs.pass} aria-describedby={errs.pass ? "err-pass" : undefined} />
              {up && (
                <div className={s.hint}>
                  <ul className={s.rules} aria-live="polite">
                    {RULE_ORDER.filter((k) => k !== "weak").map((k) => <li key={k} className={probs.includes(k) ? "" : s.ok}>{RULE_LABEL[k]}</li>)}
                  </ul>
                  <div className={s.bar} aria-hidden="true"><i style={{ width: `${pwScore(probs) * 20}%`, background: pwScore(probs) >= 5 ? "#25683F" : pwScore(probs) >= 3 ? "#B45309" : "#C2410C" }} /></div>
                </div>
              )}
              {showErr("pass")}
            </div>
          </>
        )}

        {method === "phone" && !codeSent && (
          <div className={s.field}>
            <label className={s.label} htmlFor="auPhone">Phone number</label>
            <input className={s.input} id="auPhone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" value={v.phone} onChange={set("phone")} {...bad("phone")} />
            <div className={s.hint}>Nigerian numbers welcome in any format: 08…, 234… or +234…</div>
            {showErr("phone")}
          </div>
        )}
        {method === "phone" && codeSent && (
          <div className={s.field}>
            <label className={s.label} htmlFor="auCode">The 6-digit code</label>
            <input className={s.input} id="auCode" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={v.code} onChange={set("code")} autoFocus {...bad("code")} />
            <div className={s.hint}>Sent to {pendingPhone}. It expires in a few minutes.</div>
            {showErr("code")}
            <button type="button" className={s.linkbtn} style={{ marginTop: 10 }} onClick={() => { if (!busy) { setCodeSent(false); setPendingPhone(""); setV((x) => ({ ...x, code: "" })); clear(); } }}>Use a different number</button>
          </div>
        )}

        {up && (
          <div className={s.consent}>
            <label className={s.consentRow}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I have read and agree to the <a href="/terms" target="_blank" rel="noopener">Terms of Service</a> and the <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span>
            </label>
            <p className={s.consentNote}>Synapse uses an AI advisor. Your messages and the details you share are processed by providers outside Nigeria. The Privacy Policy lists who, and what for.</p>
            {showErr("consent")}
          </div>
        )}

        <button className={s.submit} id="auGo" type="submit" disabled={busy}>
          {busy && !googleBusy ? (up ? "Creating your account…" : method === "phone" && !codeSent ? "Sending…" : "Signing you in…") : label}
        </button>
        {note && (
          <div className={`${s.note} ${note.kind === "ok" ? s.noteOk : s.noteBad}`} role="status">
            {note.text}
            {note.resend && <> <button type="button" className={s.linkbtn} onClick={resend}>Send a new confirmation link</button></>}
          </div>
        )}
      </form>

      {!up && method === "email" && (
        <p className={s.alt}><button type="button" className={s.linkbtn} onClick={forgot}>Forgot your password?</button></p>
      )}

      <p className={s.legal}>
        {demoRequested
          ? "Demo mode: this opens a shared example account."
          : <>Just looking? <button type="button" className={s.linkbtn} onClick={demoClick}>Open a demo {role === "agency" ? "agency" : "account"}</button> instead, no signup.</>}
      </p>
    </>
  );
}
