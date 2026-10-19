"use client";

import { useEffect, useState } from "react";
import { fetchMyPhone, isMissing, saveMyPhone } from "./data/phone";
import { useToast } from "./ui/Toast";
import s from "./PhoneBanner.module.css";

/** Not dismissible: ignoring it fails silently (leads simply never arrive). It goes away by being answered, and only by that. */
export function PhoneBanner() {
  const toast = useToast();
  const [missing, setMissing] = useState(false);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { let live = true; fetchMyPhone().then((p) => live && setMissing(isMissing(p))).catch(() => {}); return () => { live = false; }; }, []);
  if (!missing) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim()) return;
    setBusy(true); setErr("");
    try { const stored = await saveMyPhone(val.trim()); setMissing(false); toast(`Saved. Tayo will reach you on ${stored}`); } catch (x) { setErr(x instanceof Error ? x.message : "That number could not be saved"); setBusy(false); }
  };

  return (
    <div className={s.bar} role="region" aria-label="Your WhatsApp number">
      <div className={s.tx}><b>Tayo has no way to reach you</b><span>Leads are handed over on WhatsApp. Without a number here, a lead assigned to you cannot be sent anywhere.</span></div>
      <form className={s.form} onSubmit={save} noValidate>
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" aria-label="Your WhatsApp number" value={val} onChange={(e) => setVal(e.target.value)} />
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </form>
      {err && <div className={s.err} role="alert">{err}</div>}
    </div>
  );
}
