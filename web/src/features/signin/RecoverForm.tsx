"use client";

import { useState } from "react";
import { roleOf, updatePassword, type Role } from "@/lib/auth-actions";
import { errorCode, friendly, GENERIC_ERR, type AuthErrorLike } from "./errors";
import { PasswordInput } from "./PasswordInput";
import { pwMessage, pwProblems } from "./policy";
import s from "./SignIn.module.css";

/**
 * Choosing a new password after a reset link. A reset link issues a real session (that is how it proves who you are), but a session is
 * not a new password: this page must not treat "there is a session" as "done" and redirect into the app, or nobody who used the link
 * would ever actually change their password.
 */
export function RecoverForm({ role, onDone }: { role: Role; onDone: (agency: boolean) => void }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [errs, setErrs] = useState<{ p1?: string; p2?: string }>({});
  const [note, setNote] = useState<{ kind: "ok" | "bad"; text: string; cont?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setNote(null);
    const problems = pwProblems(p1);
    if (problems.length) return setErrs({ p1: pwMessage(problems) });
    if (p1 !== p2) return setErrs({ p2: "These two do not match." });
    setErrs({});
    setBusy(true);
    try {
      const res = await updatePassword(p1);
      if (res.error) throw res.error;
      setNote({ kind: "ok", text: "Password updated. Taking you in…" });
      // The reset link carries no role, so the page assumes a customer; the account itself knows better.
      const agency = role === "agency" || roleOf(res.data.user) === "agency";
      setTimeout(() => onDone(agency), 900);
    } catch (err) {
      setBusy(false);
      const ae = err as AuthErrorLike;
      console.error("password update failed", err);
      // Already their password: nothing needs fixing and the link has signed them in, so offer the door instead of making them solve a problem they no longer have.
      if (errorCode(ae) === "same_password" || /different from the old password/i.test(String(ae?.message ?? ""))) {
        return setNote({ kind: "ok", text: "That is already your password, so there is nothing to change.", cont: true });
      }
      // Anything unrecognised: the server's own words. They are already signed in by the link, so there is nothing to protect by hiding them.
      const msg = friendly(ae);
      setNote({ kind: "bad", text: msg === GENERIC_ERR && ae?.message ? `That did not work: ${ae.message}` : msg });
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className={s.field}>
        <label className={s.label} htmlFor="rpPass1">New password</label>
        <PasswordInput id="rpPass1" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} required minLength={8} invalid={!!errs.p1} />
        <div className={s.hint}>At least 10 characters, with upper and lower case, a number and a symbol.</div>
        {errs.p1 && <div className={s.err} role="alert">{errs.p1}</div>}
      </div>
      <div className={s.field}>
        <label className={s.label} htmlFor="rpPass2">Confirm new password</label>
        <PasswordInput id="rpPass2" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} required minLength={8} invalid={!!errs.p2} />
        {errs.p2 && <div className={s.err} role="alert">{errs.p2}</div>}
      </div>
      <button className={s.submit} type="submit" disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
      {note && (
        <div className={`${s.note} ${note.kind === "ok" ? s.noteOk : s.noteBad}`} role="status">
          {note.text}
          {note.cont && <> <button type="button" className={s.linkbtn} onClick={() => onDone(role === "agency")}>Continue to Synapse</button></>}
        </div>
      )}
    </form>
  );
}
