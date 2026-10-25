"use client";
/**
 * Sign in and create an account (React since 2026-10-24, was src/legacy/signin/inline-5.js and inline-6.js).
 *
 * Every rule of the old page is kept, word for word where it speaks:
 *  - sign-in failures never reveal whether an email exists; errors are mapped by code first, then by message
 *  - new passwords: 10+ characters, upper, lower, number, symbol, nothing common or taken from the email or name; signing in
 *    still accepts an existing 8-character password
 *  - phone sign-in is two steps (send a code, confirm it); an agency signing up must give a WhatsApp number
 *  - consent is recorded (three rows, versioned) once a session exists, never blocking the journey
 *  - a reset link works on any device (token_hash, or the implicit fragment auth.js lifts off the URL); a recovery session is
 *    for setting a new password only
 *  - a business coming back from Google names its agency once; a session of the other role is told, not bounced
 * Sign-in itself is the shared auth.js (window.SynAuth), run after hydration.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";
import { useArtLine } from "./SigninArt";

/* eslint-disable @typescript-eslint/no-explicit-any */
const auth = () => (window as any).SynAuth;

const WHY: Record<string, { t: string; d: string }> = {
  contact: { t: "One step before we introduce you.", d: "We ask for an account before sharing your details with an agent, so you can see every conversation in one place, and so no agency ever gets your number without you choosing." },
  agency: { t: "Set up your agency workspace.", d: "Your listings, leads and verification all live behind this login." },
  idle: { t: "You were signed out.", d: "For your security we sign you out after a couple of hours away. Sign in again to carry on." },
  saved: { t: "Keep your saved homes.", d: "An account keeps them on every device instead of just this browser." },
};
const PW_COMMON = ["password", "passw0rd", "qwerty", "12345678", "letmein", "welcome", "iloveyou", "admin", "synapse", "nigeria", "lagos", "abc123"];
function pwProblems(p: string, email: string, name: string) {
  const out: string[] = [];
  if (!p || p.length < 10) out.push("len");
  if (!/[A-Z]/.test(p || "")) out.push("up");
  if (!/[a-z]/.test(p || "")) out.push("lo");
  if (!/[0-9]/.test(p || "")) out.push("num");
  if (!/[^A-Za-z0-9]/.test(p || "")) out.push("sym");
  const low = String(p || "").toLowerCase(), local = String(email || "").split("@")[0].toLowerCase();
  const bad = PW_COMMON.some((w) => low.indexOf(w) !== -1)
    || (local.length >= 4 && low.indexOf(local) !== -1)
    || (!!name && String(name).trim().length >= 4 && low.indexOf(String(name).trim().toLowerCase().replace(/\s+/g, "")) !== -1);
  if (bad) out.push("weak");
  return out;
}
const PW_MSG: Record<string, string> = { len: "at least 10 characters", up: "an uppercase letter", lo: "a lowercase letter", num: "a number", sym: "a symbol", weak: "nothing common or taken from your name or email" };
const pwMessage = (list: string[]) => "Your password needs " + list.map((k) => PW_MSG[k]).join(", ") + ".";
const GENERIC_ERR = "Something went wrong. Please try again.";
const escHtml = (s: unknown) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));
/* Codes first, then narrow message tests, then the broad ones, so a broad test can never shadow a specific one. */
function friendly(err: any): string {
  const m = String((err && err.message) || "").toLowerCase();
  const code = (err && (err.code || err.error_code)) || "";
  if (code === "same_password" || m.indexOf("different from the old password") > -1) return "That is already your password, choose a different one, or simply sign in with it.";
  if (code === "weak_password") return escHtml((err && err.message) || "That password is too weak, choose a stronger one.");
  if (code === "reauthentication_needed") return "For security, sign in again before changing your password.";
  if (code === "over_email_send_rate_limit" || m.indexOf("email rate limit") > -1) return "The project has sent as many emails as it is allowed this hour, this is our sending limit, not anything you did. Wait an hour, or turn off email confirmation while testing.";
  if (code === "over_request_rate_limit") return "Too many requests from this device just now. Wait a minute and try again.";
  if (code === "over_sms_send_rate_limit" || (m.indexOf("sms") > -1 && m.indexOf("rate") > -1)) return "Too many codes requested. Wait a minute, then ask for another.";
  if (code === "phone_provider_disabled" || m.indexOf("unsupported phone provider") > -1) return "Signing in by phone is not switched on yet. Use your email address for now.";
  if (code === "otp_disabled") return "One-time codes are not switched on for this project yet.";
  if (code === "otp_expired") return "That code has expired. Ask for a new one.";
  if (code === "user_already_exists" || m.indexOf("already registered") > -1 || m.indexOf("already been registered") > -1) return "There is already an account with that email, try signing in instead.";
  if (code === "email_not_confirmed") return "That account still needs confirming. Check your email for the link we sent.";
  if (m.indexOf("invalid login") > -1 || m.indexOf("invalid credentials") > -1) return "That email and password do not match. Try again, or reset your password.";
  if (m.indexOf("invalid") > -1 && (m.indexOf("otp") > -1 || m.indexOf("token") > -1)) return "That code is not right. Check it and try again.";
  if (m.indexOf("password") > -1 && m.indexOf("short") > -1) return "That password is too short, use at least 8 characters.";
  if (m.indexOf("weak") > -1 || m.indexOf("pwned") > -1 || m.indexOf("compromised") > -1) return "That password has appeared in a known breach. Please choose a different one.";
  if (m.indexOf("same") > -1 && m.indexOf("password") > -1) return "That is your current password, choose a different one.";
  if (m.indexOf("provider is not enabled") > -1) return "That sign-in method is not switched on for this project yet.";
  if (m.indexOf("fetch") > -1 || m.indexOf("network") > -1 || m.indexOf("unreachable") > -1) return "We could not reach the sign-in service. Check your connection and try again.";
  if (m.indexOf("session") > -1 || m.indexOf("expired") > -1 || m.indexOf("token") > -1) return "This reset link has expired, request a new one and use it within a few minutes.";
  const wait = /after (\d+) seconds?/i.exec(m);
  if (wait) return "Please wait " + wait[1] + (wait[1] === "1" ? " second" : " seconds") + " before trying that again.";
  if (m.indexOf("for security purposes") > -1) return "Please wait a few seconds before trying that again.";
  if (m.indexOf("rate") > -1 || m.indexOf("too many") > -1) return "Too many attempts just now. Wait a minute and try again.";
  return GENERIC_ERR;
}
/* The shared demo accounts: a deliberate choice (?demo=1 or the button), never the only outcome. */
const DEMO_ACCOUNTS: Record<string, { email: string; password: string }> = {
  customer: { email: "demo-customer@synapse.ng", password: "SynDemo-Cust-9f42x" },
  agency: { email: "demo-agency@synapse.ng", password: "SynDemo-Agcy-7k18q" },
};
/* The version is a date, changed in the same commit as the documents it names. */
const POLICY_VERSION = "2026-09-19";

const EYE = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.8 12S5.5 5.4 12 5.4 22.2 12 22.2 12 18.5 18.6 12 18.6 1.8 12 1.8 12z" /><circle cx="12" cy="12" r="3.1" /></svg>;
const EYE_OFF = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.6 6.1A10.6 10.6 0 0 1 12 6c6.5 0 10.2 6 10.2 6a18.5 18.5 0 0 1-3.3 3.8" /><path d="M6.4 7.5A17.9 17.9 0 0 0 1.8 12s3.7 6 10.2 6a10 10 0 0 0 4.1-.8" /><path d="M9.8 9.9a3.1 3.1 0 0 0 4.3 4.3" /><path d="M3 3l18 18" /></svg>;

/** A password field with its reveal. The type is toggled (never copied elsewhere), and it always loads hidden. */
function PwInput(props: React.InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="au-pw">
      <input {...props} ref={ref} type={shown ? "text" : "password"} />
      <button type="button" className="au-pw-t" aria-controls={props.id} aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"} title={shown ? "Hide password" : "Show password"}
        onClick={() => {
          let pos: number | null = null;
          try { pos = ref.current?.selectionStart ?? null; } catch { /* not all types allow it */ }
          setShown(!shown);
          requestAnimationFrame(() => { try { ref.current?.focus(); if (pos != null) ref.current?.setSelectionRange(pos, pos); } catch { /* focus is the nice-to-have */ } });
        }}>{shown ? EYE_OFF : EYE}</button>
    </div>
  );
}

type Note = { kind: "ok" | "bad"; body: ReactNode } | null;
type Errs = Partial<Record<"email" | "pass" | "phone" | "code" | "consent" | "staffPhone" | "agName" | "rp1" | "rp2", string>>;

export function SigninForm() {
  const scripts = usePageScripts();
  const [role, setRole] = useState<"customer" | "agency">("customer");
  const [next, setNext] = useState("");
  const [why, setWhy] = useState<{ t: string; d: string } | null>(null);
  const [mode, setModeS] = useState<"in" | "up">("in");
  const [method, setMethodS] = useState<"email" | "phone">("email");
  const [codeSent, setCodeSent] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [codeHint, setCodeHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);   // the form itself, not Google or a reset request
  const [f, setF] = useState({ name: "", agencyName: "", agencyWebsite: "", staffPhone: "", email: "", pass: "", phone: "", code: "" });
  const [consent, setConsent] = useState(false);
  const [errs, setErrs] = useState<Errs>({});
  const [note, setNote] = useState<Note>(null);
  const [googleOn, setGoogleOn] = useState(true);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [demoFromUrl, setDemoFromUrl] = useState(false);
  const [view, setView] = useState<"main" | "recover" | "agency">("main");
  const [rp, setRp] = useState({ p1: "", p2: "" });
  const [rpBusy, setRpBusy] = useState(false);
  const [rpNote, setRpNote] = useState<Note>(null);
  const [ag, setAg] = useState({ name: "", city: "", website: "" });
  const [agNote, setAgNote] = useState<Note>(null);
  const [agBusy, setAgBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const decided = useRef(false);
  const demoRef = useRef(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const clearErrors = () => { setErrs({}); setNote(null); };
  /* A mode switch clears the errors and never carries consent across. */
  const setMode = (m: "in" | "up") => { setModeS(m); clearErrors(); if (m !== "up") setConsent(false); };
  const setMethod = (m: "email" | "phone") => { setMethodS(m); clearErrors(); };
  /* A sign-in lands on Overview: a portal address loses its pane after a real sign-in; customer pages keep theirs. */
  const signedInDest = (fallback: string) => {
    const d = auth().safeNext(next, fallback);
    return /(^|\/)agency\.html/.test(d) ? d.replace(/#.*$/, "") : d;
  };

  /* The page's own framing, from the address. */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get("role") === "agency" ? "agency" : "customer";
    const reason = params.get("reason") || "";
    let m: "in" | "up" = params.get("mode") === "up" ? "up" : "in";
    setRole(r); setNext(params.get("next") || "");
    if (reason && WHY[reason]) { setWhy(WHY[reason]); if (reason === "contact") m = "up"; }
    if (r === "agency" && !reason) m = "up";
    setModeS(m);
    const d = params.get("demo") === "1"; setDemoFromUrl(d); demoRef.current = d;
    try { if (localStorage.getItem("syn_google_on") === "0") setGoogleOn(false); } catch { /* storage blocked */ }
    /* A spent one-time link comes back with the failure in the fragment: name the likely cause (mail scanners). */
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const code = hash.get("error_code");
    if (code) {
      setNote({ kind: "bad", body: code === "otp_expired"
        ? "That reset link has already been used or opened, some mail apps open links automatically to scan them, which can use it up before you click it yourself. Request a fresh one below."
        : "That link did not work, request a fresh one below." });
      history.replaceState(null, "", location.pathname + location.search);
    }
  }, []);

  /* Once auth.js is here: is Google on, any recovery link, and the session that is already here. */
  useEffect(() => {
    if (!scripts || !auth()) return;
    const A = auth();
    const params = new URLSearchParams(location.search);
    const r = params.get("role") === "agency" ? "agency" : "customer";
    const nx = params.get("next") || "";
    A.enabledProviders().then((list: string[]) => {
      const on = list.indexOf("google") !== -1;
      try { localStorage.setItem("syn_google_on", on ? "1" : "0"); } catch { /* storage blocked */ }
      setGoogleOn(on);
    });
    const oauthReturn = params.get("oauth") === "1";
    const recoveryToken = params.get("type") === "recovery" ? params.get("token_hash") : null;
    const hashRecovery = !recoveryToken && A.takeRecovery ? A.takeRecovery() : null;
    decided.current = !!(recoveryToken || hashRecovery);   // the link decides, not the first auth event
    const redeem = (spend: (c: any) => Promise<any>) => {
      A.client().then(spend).then((res: any) => { if (res && res.error) throw res.error; setView("recover"); })
        .catch((err: any) => {
          console.error("recovery link failed", err);
          const rc = (err && (err.code || err.error_code)) || "";
          setNote({ kind: "bad", body: rc === "otp_expired" || /expired|invalid/i.test(String((err && err.message) || ""))
            ? "That reset link has expired or has already been used. Request a fresh one below." : "That reset link did not work. Request a fresh one below." });
        });
    };
    if (recoveryToken) {
      history.replaceState(null, "", location.pathname);   // a one-use credential must not be spent twice by a reload
      redeem((c) => c.auth.verifyOtp({ token_hash: recoveryToken, type: "recovery" }));
    } else if (hashRecovery) {
      redeem((c) => c.auth.setSession(hashRecovery));
    }
    const finishOauth = (session: any) => {
      const dest = (() => { const d = A.safeNext(nx, r === "agency" ? "agency.html" : "toju.html"); return /(^|\/)agency\.html/.test(d) ? d.replace(/#.*$/, "") : d; })();
      if (r !== "agency") { location.href = dest; return; }
      /* Ask the database, do not infer: a business that signed in with Google before already has an agency. */
      A.hasAgency().then((has: boolean) => {
        if (has) { location.href = dest; return; }
        const meta = (session && session.user && session.user.user_metadata) || {};
        setAg((x) => ({ ...x, name: meta.name || meta.full_name || "" }));
        setView("agency");
      });
    };
    A.client().then((c: any) => {
      c.auth.onAuthStateChange((event: string, session: any) => {
        if (decided.current) return;
        if (oauthReturn && session && event !== "PASSWORD_RECOVERY") { decided.current = true; finishOauth(session); return; }
        if (event === "PASSWORD_RECOVERY") { decided.current = true; setView("recover"); }
        else if (event === "INITIAL_SESSION") {
          decided.current = true;
          if (!session) {
            if (params.get("code") && !oauthReturn) {
              setNote({ kind: "bad", body: "That link was opened in a different browser from the one it was requested in, so it could not sign you in here. If it was a confirmation link, your email is confirmed: sign in below. If it was a password reset, request a new one: new reset links work on any phone or browser." });
            }
            return;
          }
          /* Redirect only when the session IS the role asked for; otherwise stay and say so (this stopped a redirect loop). */
          if (A.roleOf(session.user) === r) location.href = A.safeNext(nx, r === "agency" ? "agency.html" : "toju.html");
          else setNote({ kind: "bad", body: "You’re currently signed in on the " + (r === "agency" ? "customer" : "agency") + " side. Sign in below with " + (r === "agency" ? "an agency" : "a customer") + " account to switch." });
        }
      });
    });
  }, [scripts]);

  /* Fire-and-forget: the redirect does not wait for an audit row, and a missing row can be reconciled. */
  const recordConsent = () => {
    try {
      const A = auth(); if (!A || !A.client) return;
      A.client().then((c: any) => c.auth.getUser().then((u: any) => {
        const id = u && u.data && u.data.user && u.data.user.id;
        if (!id) return null;
        return c.from("consent_records").insert(["terms_of_service", "privacy_policy", "ai_processing"].map((k) => ({ profile_id: id, kind: k, version: POLICY_VERSION, granted: true, context: "signup" })));
      })).then((r: any) => { if (r && r.error) console.warn("[consent] not recorded:", r.error.message); })
        .catch((e: any) => console.warn("[consent] not recorded:", e && e.message));
    } catch { /* never block the journey over an audit row */ }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    clearErrors();
    const A = auth(); if (!A) return;
    const isDemo = demoRef.current;
    const { email: em0, pass, name: nm0, agencyName: an0, agencyWebsite: aw0, staffPhone: sp0, phone: ph0, code: cd0 } = f;
    const email = em0.trim(), name = nm0.trim(), agencyName = an0.trim(), agencyWebsite = aw0.trim(), staffPhone = sp0.trim(), phone = ph0.trim(), code = cd0.trim();
    const e2: Errs = {};
    if (!isDemo && method === "email") {
      if (!email || email.indexOf("@") < 1 || email.indexOf(".") < 0) e2.email = "Enter a valid email address.";
      if (!pass || pass.length < 8) e2.pass = mode === "up" ? pwMessage(pwProblems(pass, email, name)) : "Use at least 8 characters.";
      else if (mode === "up") { const pp = pwProblems(pass, email, name); if (pp.length) e2.pass = pwMessage(pp); }
      if (e2.email || e2.pass) { setErrs(e2); return; }
    }
    if (!isDemo && method === "phone") {
      if (!codeSent) { if (!phone || A.normalisePhone(phone).length < 11) { setErrs({ phone: "Enter your number, including the network code." }); return; } }
      else if (code.replace(/[^0-9]/g, "").length !== 6) { setErrs({ code: "The code is six digits." }); return; }
    }
    if (mode === "up" && !consent) {
      setErrs({ consent: "Please read and accept the Terms and the Privacy Policy to continue." });
      document.getElementById("auConsent")?.focus();
      return;
    }
    /* An agency without a number is an agency Tayo cannot hand a lead to. */
    if (mode === "up" && role === "agency" && method !== "phone" && !staffPhone) {
      setErrs({ staffPhone: "Tayo sends you leads on WhatsApp, so we need a number for you." });
      document.getElementById("auStaffPhone")?.focus();
      return;
    }
    setBusy(true); setSubmitting(true);
    const sendingCode = method === "phone" && !codeSent && !isDemo;
    const work = isDemo ? A.signIn(DEMO_ACCOUNTS[role].email, DEMO_ACCOUNTS[role].password)
      : method === "phone"
        ? (codeSent ? A.verifyPhoneCode(pendingPhone, code) : A.sendPhoneCode(phone, { role, name, agencyName, agencyWebsite }))
        : mode === "up" ? A.signUp(email, pass, { role, name, agencyName, agencyWebsite, phone: staffPhone, next }) : A.signIn(email, pass);
    work.then((res: any) => {
      if (res && res.error) throw res.error;
      if (sendingCode) {
        /* Step one of two: name the number it went to, so a mistyped one is obvious. */
        const pp = res.phone || A.normalisePhone(phone);
        setPendingPhone(pp); setCodeSent(true);
        setCodeHint("Sent to " + pp + ". It expires in a few minutes.");
        setTimeout(() => document.getElementById("auCode")?.focus(), 0);
        setNote({ kind: "ok", body: "Code sent. Enter it above." });
        return;
      }
      const session = res && res.data && res.data.session;
      if (mode === "up" && !session) {
        /* An already-registered email comes back with no identities: say so, rather than "check your email". */
        const u = res && res.data && res.data.user;
        const alreadyExists = u && Array.isArray(u.identities) && u.identities.length === 0;
        setMode("in");
        if (alreadyExists) {
          setF((x) => ({ ...x, email }));
          setNote({ kind: "bad", body: "You already have an account with that email. Sign in below, or reset your password if you have forgotten it." });
          return;
        }
        setNote({ kind: "ok", body: "Check your email to confirm your account, then sign in." });
        return;
      }
      const fallback = role === "agency" ? (mode === "up" ? "agency.html?welcome=agency" : "agency.html") : "toju.html";
      if (mode === "up" && !isDemo) recordConsent();
      location.href = signedInDest(fallback);
    }).catch((err: any) => {
      /* Unconfirmed: offer a new link (only the account's owner can see this, the password was right). */
      const errCode = (err && (err.code || err.error_code)) || "";
      if (errCode === "email_not_confirmed" && email && A.resendConfirmation) {
        setNote({ kind: "bad", body: <>That account still needs confirming. <ResendButton email={email} role={role} onDone={setNote} /></> });
      } else setNote({ kind: "bad", body: <span dangerouslySetInnerHTML={{ __html: friendly(err) }} /> });
    }).then(() => { setBusy(false); setSubmitting(false); });
  };

  const forgot = () => {
    const email = f.email.trim();
    if (!email) { setErrs({ email: "Enter your email first, then tap this again." }); return; }
    if (busy) return;
    setBusy(true);
    auth().resetPassword(email).then(() => {
      /* Deliberately unconditional: confirming whether the address exists would leak account membership. */
      setNote({ kind: "ok", body: "If there is an account for that email, a reset link is on its way." });
    }).catch((e: any) => {
      console.warn("reset request failed", e);
      const rc = (e && e.code) || "";
      if ((e && e.status === 429) || /rate_limit/.test(rc)) { setNote({ kind: "bad", body: "Too many reset emails have gone out in the last hour. Try again later." }); return; }
      setNote({ kind: "ok", body: "If there is an account for that email, a reset link is on its way." });
    }).then(() => setBusy(false));
  };

  const google = () => {
    if (busy) return;
    setBusy(true); setGoogleBusy(true);
    const A = auth();
    A.enabledProviders().then((list: string[]) => {
      if (list.indexOf("google") === -1) throw new Error("Google sign-in is not available right now.");
      return A.signInWithProvider("google", next, role);   // the role goes with them
    }).catch((err: any) => { setBusy(false); setGoogleBusy(false); setNote({ kind: "bad", body: <span dangerouslySetInnerHTML={{ __html: friendly(err) }} /> }); });
  };

  const recoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rpBusy) return;
    setErrs({}); setRpNote(null);
    const rpp = pwProblems(rp.p1, "", "");
    if (rpp.length) { setErrs({ rp1: pwMessage(rpp) }); return; }
    if (rp.p1 !== rp.p2) { setErrs({ rp2: "These two do not match." }); return; }
    setRpBusy(true);
    const A = auth();
    A.client().then((c: any) => c.auth.updateUser({ password: rp.p1 })).then((res: any) => {
      if (res && res.error) throw res.error;
      setRpNote({ kind: "ok", body: "Password updated. Taking you in…" });
      /* The reset link carries no role; the account itself does. */
      const who = res && res.data && res.data.user;
      const fallback = role === "agency" || A.roleOf(who) === "agency" ? "agency.html" : "toju.html";
      setTimeout(() => { location.href = signedInDest(fallback); }, 900);
    }).catch((err: any) => {
      setRpBusy(false);
      console.error("password update failed", err);
      const rc = (err && (err.code || err.error_code)) || "";
      if (rc === "same_password" || /different from the old password/i.test(String((err && err.message) || ""))) {
        setRpNote({ kind: "ok", body: <>That is already your password, so there is nothing to change. <button type="button" className="au-linkbtn" id="rpContinue" onClick={() => { location.href = signedInDest(role === "agency" ? "agency.html" : "toju.html"); }}>Continue to Synapse</button></> });
        return;
      }
      /* The person is already signed in by the link, so the server's own words hide nothing. */
      let msg = friendly(err);
      if (msg === GENERIC_ERR && err && err.message) msg = "That did not work: " + escHtml(err.message);
      setRpNote({ kind: "bad", body: <span dangerouslySetInnerHTML={{ __html: msg }} /> });
    });
  };

  const agencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (agBusy) return;
    const name = ag.name.trim();
    setErrs({});
    if (!name) { setErrs({ agName: "Enter the name your agency trades under." }); return; }
    setAgBusy(true);
    const A = auth(), site = ag.website.trim();
    A.provisionAgency(name, ag.city.trim()).then((res: any) => {
      if (res && res.error) throw res.error;
      return site ? A.saveAgencyWebsite(site).catch(() => {}) : Promise.resolve();
    }).then(() => { location.href = signedInDest("agency.html?welcome=agency"); }).catch((err: any) => {
      setAgBusy(false);
      /* "already belongs to an agency" is the guard working: they simply go in. */
      if (String((err && err.message) || "").toLowerCase().indexOf("already") > -1) { location.href = signedInDest("agency.html"); return; }
      setAgNote({ kind: "bad", body: <span dangerouslySetInnerHTML={{ __html: friendly(err) }} /> });
    });
  };

  useEffect(() => { if (view === "agency") document.getElementById("agName")?.focus(); }, [view]);

  const up = mode === "up";
  const probs = pwProblems(f.pass, f.email, f.name);
  const score = 5 - probs.filter((k) => k !== "weak").length - (probs.indexOf("weak") !== -1 ? 1 : 0);
  const submitLabel = submitting
    ? (up ? "Creating your account…" : "Signing you in…")
    : method === "phone" ? (codeSent ? "Confirm code" : "Send me a code") : up ? "Create account" : "Sign in";
  const heading = view === "recover" ? "Choose a new password" : view === "agency" ? "One more thing" : up ? (role === "agency" ? "Create your agency account" : "Create your account") : "Welcome back";
  const sub = view === "recover" ? "You are signed in for this one step only, set a password and you are done." : view === "agency" ? "Your account is ready. Tell us the agency it belongs to." : up ? "It takes about twenty seconds." : "Sign in to pick up where you left off.";
  const inv = (k: keyof Errs, id: string) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": id } : {});
  const noteEl = (n: Note) => (n ? <div className={"au-note " + n.kind} role="status">{n.body}</div> : null);
  const main = view === "main";

  return (
    <div className="au-box">
      <a className="au-back" href="../index.html">← Back to the landing page</a>
      <h1 className="au-h" id="auH">{heading}</h1>
      <p className="au-p" id="auP">{sub}</p>
      <div className="au-why" id="auWhy" hidden={!why || view === "recover"}>{why ? <div><b>{why.t}</b><br />{why.d}</div> : null}</div>
      <div className="au-tabs" role="tablist" hidden={!main}>
        <button className={"au-tab" + (!up ? " on" : "")} id="tabIn" type="button" role="tab" aria-selected={!up} onClick={() => setMode("in")}>Sign in</button>
        <button className={"au-tab" + (up ? " on" : "")} id="tabUp" type="button" role="tab" aria-selected={up} onClick={() => setMode("up")}>Create account</button>
      </div>
      <div id="auOauth" hidden={!googleOn || view === "agency"}>
        <button className="au-oauth" id="auGoogle" type="button" disabled={googleBusy} onClick={google}>
          <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
            {" "}<path fill="#4285F4" d="M17.6 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.82a4.12 4.12 0 0 1-1.79 2.7v2.26h2.9c1.7-1.56 2.67-3.87 2.67-6.6z" />
            {" "}<path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.71H.93v2.33A9 9 0 0 0 9 18z" />
            {" "}<path fill="#FBBC05" d="M3.95 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.93a9 9 0 0 0 0 8.08l3.02-2.33z" />
            {" "}<path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .93 4.96l3.02 2.33C4.66 5.16 6.65 3.58 9 3.58z" />{" "}
          </svg>{" "}
          <span id="auGoogleLabel">{googleBusy ? "Taking you to Google..." : "Continue with Google"}</span>
        </button>
        <div className="au-or"><span>or</span></div>
      </div>
      <div className="au-methods" role="tablist" aria-label="How to sign in" hidden={view === "agency"}>
        <button className={"au-method" + (method === "email" ? " on" : "")} id="methodEmail" type="button" role="tab" aria-selected={method === "email"} onClick={() => { if (!busy) setMethod("email"); }}>Email</button>
        <button className={"au-method" + (method === "phone" ? " on" : "")} id="methodPhone" type="button" role="tab" aria-selected={method === "phone"} onClick={() => { if (!busy) setMethod("phone"); }}>Phone</button>
      </div>
      <form id="auForm" noValidate hidden={!main} ref={formRef} onSubmit={submit}>
        <div className="au-field" id="nameField" hidden={!up}>
          <label className="au-label" htmlFor="auName">Your name</label>{" "}
          <input className="au-input" id="auName" type="text" autoComplete="name" name="name" value={f.name} onChange={set("name")} />
        </div>
        <div className="au-field" id="agencyNameField" hidden={!(up && role === "agency")}>
          <label className="au-label" htmlFor="auAgencyName">Agency name</label>{" "}
          <input className="au-input" id="auAgencyName" type="text" autoComplete="organization" name="agencyName" value={f.agencyName} onChange={set("agencyName")} />
          <div className="au-hint">The name buyers will see on your listings. You can change it later.</div>
        </div>
        <div className="au-field" id="agencyWebField" hidden={!(up && role === "agency")}>
          <label className="au-label" htmlFor="auAgencyWebsite">Agency website (optional)</label>{" "}
          <input className="au-input" id="auAgencyWebsite" type="url" inputMode="url" autoComplete="url" placeholder="youragency.com" name="agencyWebsite" value={f.agencyWebsite} onChange={set("agencyWebsite")} />
        </div>
        <div className="au-field" id="staffPhoneField" hidden={!(up && role === "agency" && method !== "phone")}>
          <label className="au-label" htmlFor="auStaffPhone">Your WhatsApp number</label>{" "}
          <input className="au-input" id="auStaffPhone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" name="staffPhone" value={f.staffPhone} onChange={set("staffPhone")} />
          <div className="au-hint">Where Tayo sends you a lead the moment it qualifies. Any format, 08…, 234… or +234…</div>
          <div className="au-err" id="errStaffPhone" role="alert" hidden={!errs.staffPhone}>{errs.staffPhone}</div>
        </div>
        <div className="au-field" id="emailField" hidden={method !== "email"}>
          <label className="au-label" htmlFor="auEmail">Email</label>{" "}
          <input className="au-input" id="auEmail" type="email" autoComplete="email" required={method === "email"} inputMode="email" name="email" value={f.email} onChange={set("email")} {...inv("email", "errEmail")} />
          <div className="au-err" id="errEmail" role="alert" hidden={!errs.email}>{errs.email}</div>
        </div>
        <div className="au-field" id="passField" hidden={method !== "email"}>
          <label className="au-label" htmlFor="auPass">Password</label>{" "}
          <PwInput className="au-input" id="auPass" autoComplete={up ? "new-password" : "current-password"} required={method === "email"} minLength={8} name="password" value={f.pass} onChange={set("pass")} {...inv("pass", "errPass")} />
          <div className="au-hint" id="passHint" hidden={!up}>
            <ul className="pw-rules" id="pwRules" aria-live="polite">
              {[["len", "At least 10 characters"], ["up", "An uppercase letter"], ["lo", "A lowercase letter"], ["num", "A number"], ["sym", "A symbol, like ! or #"]].map(([r, l]) => (
                <li key={r} data-r={r} className={up && f.pass && probs.indexOf(r) === -1 ? "ok" : undefined}>{l}</li>
              ))}
            </ul>
            <div className="pw-bar" aria-hidden="true">
              <i id="pwBar" style={up && f.pass ? { width: Math.max(0, score) * 20 + "%", background: score >= 5 ? "#25683F" : score >= 3 ? "#B45309" : "#C2410C" } : undefined}></i>
            </div>
          </div>
          <div className="au-err" id="errPass" role="alert" hidden={!errs.pass}>{errs.pass}</div>
        </div>
        <div className="au-field" id="phoneField" hidden={method !== "phone" || codeSent}>
          <label className="au-label" htmlFor="auPhone">Phone number</label>{" "}
          <input className="au-input" id="auPhone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" name="phone" value={f.phone} onChange={set("phone")} {...inv("phone", "errPhone")} />
          <div className="au-hint">Nigerian numbers welcome in any format, 08…, 234… or +234…</div>
          <div className="au-err" id="errPhone" role="alert" hidden={!errs.phone}>{errs.phone}</div>
        </div>
        <div className="au-field" id="codeField" hidden={method !== "phone" || !codeSent}>
          <label className="au-label" htmlFor="auCode">The 6-digit code</label>{" "}
          <input className="au-input" id="auCode" type="text" autoComplete="one-time-code" inputMode="numeric" maxLength={6} placeholder="123456" name="code" value={f.code} onChange={set("code")} {...inv("code", "errCode")} />
          <div className="au-hint" id="codeHint">{codeHint}</div>
          <div className="au-err" id="errCode" role="alert" hidden={!errs.code}>{errs.code}</div>
          <button type="button" className="au-linkbtn" id="codeBack" style={{ marginTop: "10px" }} onClick={() => { if (busy) return; setCodeSent(false); setPendingPhone(""); setF((x) => ({ ...x, code: "" })); setMethod("phone"); }}>Use a different number</button>
        </div>
        <div className="au-consent" id="consentBlock" hidden={!up}>
          <label className="au-consent-row">
            {" "}<input type="checkbox" id="auConsent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{" "}
            <span>{"I have read and agree to the\n                "}<a href="/terms" target="_blank" rel="noopener">Terms of Service</a>{" and the\n                "}<a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span>{" "}
          </label>
          <p className="au-consent-note">{"\n              Synapse uses an AI advisor. Your messages and the details you share are processed\n              by providers outside Nigeria, the Privacy Policy lists who, and what for.\n            "}</p>
          <div className="au-err" id="errConsent" role="alert" hidden={!errs.consent}>{errs.consent}</div>
        </div>
        <button className="au-submit" id="auGo" type="submit" disabled={busy}>{submitLabel}</button>
        <div id="auNote">{noteEl(note)}</div>
      </form>
      <form id="agencyForm" noValidate hidden={view !== "agency"} onSubmit={agencySubmit}>
        <div className="au-field">
          <label className="au-label" htmlFor="agName">What is your agency called?</label>{" "}
          <input className="au-input" id="agName" type="text" autoComplete="organization" required value={ag.name} onChange={(e) => setAg({ ...ag, name: e.target.value })} {...inv("agName", "errAgName")} />
          <div className="au-hint">The name buyers will see on your listings. You can change it later.</div>
          <div className="au-err" id="errAgName" role="alert" hidden={!errs.agName}>{errs.agName}</div>
        </div>
        <div className="au-field">
          <label className="au-label" htmlFor="agCity">City (optional)</label>{" "}
          <input className="au-input" id="agCity" type="text" autoComplete="address-level2" placeholder="Lagos" value={ag.city} onChange={(e) => setAg({ ...ag, city: e.target.value })} />
        </div>
        <div className="au-field">
          <label className="au-label" htmlFor="agWebsite">Agency website (optional)</label>{" "}
          <input className="au-input" id="agWebsite" type="url" inputMode="url" autoComplete="url" placeholder="youragency.com" value={ag.website} onChange={(e) => setAg({ ...ag, website: e.target.value })} />
        </div>
        <button className="au-submit" id="agGo" type="submit" disabled={agBusy}>{agBusy ? "Setting up…" : "Finish setting up"}</button>
        <div id="agNote">{noteEl(agNote)}</div>
      </form>
      <form id="recoverForm" noValidate hidden={view !== "recover"} onSubmit={recoverSubmit}>
        <div className="au-field">
          <label className="au-label" htmlFor="rpPass1">New password</label>{" "}
          <PwInput className="au-input" id="rpPass1" autoComplete="new-password" required minLength={8} value={rp.p1} onChange={(e) => setRp({ ...rp, p1: e.target.value })} {...inv("rp1", "errRp1")} />
          <div className="au-hint">At least 8 characters. Longer is better than complicated.</div>
          <div className="au-err" id="errRp1" role="alert" hidden={!errs.rp1}>{errs.rp1}</div>
        </div>
        <div className="au-field">
          <label className="au-label" htmlFor="rpPass2">Confirm new password</label>{" "}
          <PwInput className="au-input" id="rpPass2" autoComplete="new-password" required minLength={8} value={rp.p2} onChange={(e) => setRp({ ...rp, p2: e.target.value })} {...inv("rp2", "errRp2")} />
          <div className="au-err" id="errRp2" role="alert" hidden={!errs.rp2}>{errs.rp2}</div>
        </div>
        <button className="au-submit" id="rpGo" type="submit" disabled={rpBusy}>{rpBusy ? "Saving…" : "Set new password"}</button>
        <div id="rpNote">{noteEl(rpNote)}</div>
      </form>
      <p className="au-alt" id="auAlt" hidden={up || !main}>
        <button type="button" id="forgotBtn" hidden={method === "phone"} onClick={forgot}>Forgot your password?</button>
      </p>
      <p className="au-legal">Synapse never shares your details with an agency until you choose to contact them.</p>
      <p className="au-legal" id="demoNote" style={{ marginTop: "6px" }}>
        {view === "agency" ? "" : demoFromUrl ? "Demo mode, this opens a shared example account." : (
          <>Just looking? <button type="button" className="au-linkbtn" id="demoBtn" onClick={() => {
            if (busy) return;
            /* Through the form's own submit, on the sign-in tab, so the label and destination are the ones for signing in. */
            demoRef.current = true; setMode("in");
            setTimeout(() => formRef.current?.requestSubmit(), 0);
          }}>Open a demo {role === "agency" ? "agency" : "account"}</button> instead, no signup.</>
        )}
      </p>
    </div>
  );
}

function ResendButton({ email, role, onDone }: { email: string; role: string; onDone: (n: Note) => void }) {
  const [sending, setSending] = useState(false);
  return (
    <button type="button" className="au-linkbtn" id="auResend" disabled={sending} onClick={() => {
      setSending(true);
      auth().resendConfirmation(email, { role }).then((r: any) => {
        if (r && r.error) throw r.error;
        onDone({ kind: "ok", body: "A new link is on its way. Open it on any device, it goes to synapsecore.dev now, not to this computer." });
      }).catch((e2: any) => onDone({ kind: "bad", body: <span dangerouslySetInnerHTML={{ __html: friendly(e2) }} /> }));
    }}>{sending ? "Sending…" : "Send a new confirmation link"}</button>
  );
}

/** The panel's line and, for an agency, its sub-line: the photograph's own line as the cycler (SigninArt.tsx) chose it. */
export function SigninArtText() {
  const line = useArtLine();
  const [agency, setAgency] = useState(false);
  useEffect(() => {
    setAgency(new URLSearchParams(location.search).get("role") === "agency");   // eslint-disable-line react-hooks/set-state-in-effect -- the URL exists only in the browser
  }, []);
  return (
    <>
      <p className="au-quote" id="artQuote">{line || "The last step before the keys."}</p>
      <p className="au-sub" id="artSub">{agency
        ? "Every enquiry, every reply and every post that brought them in, in one place your whole team works from."
        : "Your account keeps your saved homes, your conversations with Tayo, and the agents you have spoken to, on every device."}</p>
    </>
  );
}
