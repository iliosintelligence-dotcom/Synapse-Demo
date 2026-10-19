"use client";

import { useState } from "react";
import { provisionAgency, saveAgencyWebsite } from "@/lib/auth-actions";
import { friendly, type AuthErrorLike } from "./errors";
import s from "./SignIn.module.css";

/**
 * "One more thing": Google returns a name and an email and nothing else, so a business that signs in that way arrives with no agency
 * behind it. This is where it is asked, once, and only when there is genuinely nothing to attach the account to.
 */
export function AgencyForm({ suggested, onDone }: { suggested: string; onDone: (opts: { already: boolean }) => void }) {
  const [name, setName] = useState(suggested);
  const [city, setCity] = useState("");
  const [site, setSite] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    setNote("");
    if (!name.trim()) return setErr("Enter the name your agency trades under.");
    setBusy(true);
    try {
      const res = await provisionAgency(name.trim(), city.trim());
      if (res.error) throw res.error;
      // The website goes on the agency the RPC just made. A failure here is not worth stopping for: it can be added on the Brand page.
      if (site.trim()) await saveAgencyWebsite(site.trim()).catch(() => {});
      onDone({ already: false });
    } catch (e2) {
      setBusy(false);
      // "already belongs to an agency" means the server refused a second one, which is the guard working. They simply go in.
      if (String((e2 as AuthErrorLike)?.message ?? "").toLowerCase().includes("already")) return onDone({ already: true });
      setNote(friendly(e2 as AuthErrorLike));
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className={s.field}>
        <label className={s.label} htmlFor="agName">What is your agency called?</label>
        <input className={s.input} id="agName" type="text" autoComplete="organization" required autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err || undefined} />
        <div className={s.hint}>The name buyers will see on your listings. You can change it later.</div>
        {err && <div className={s.err} role="alert">{err}</div>}
      </div>
      <div className={s.field}>
        <label className={s.label} htmlFor="agCity">City (optional)</label>
        <input className={s.input} id="agCity" type="text" autoComplete="address-level2" placeholder="Lagos" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className={s.field}>
        <label className={s.label} htmlFor="agWebsite">Agency website (optional)</label>
        <input className={s.input} id="agWebsite" type="url" inputMode="url" autoComplete="url" placeholder="youragency.com" value={site} onChange={(e) => setSite(e.target.value)} />
      </div>
      <button className={s.submit} type="submit" disabled={busy}>{busy ? "Setting up…" : "Finish setting up"}</button>
      {note && <div className={`${s.note} ${s.noteBad}`} role="status">{note}</div>}
    </form>
  );
}
