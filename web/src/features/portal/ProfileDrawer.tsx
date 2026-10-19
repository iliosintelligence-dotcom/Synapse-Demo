"use client";

import { useEffect, useRef, useState } from "react";
import { checkAvatar, fetchMyProfile, formOf, initialsOf, saveMyProfile, uploadAvatar, type MyProfile, type ProfileForm } from "./data/profile";
import { useToast } from "./ui/Toast";
import s from "./Profile.module.css";

const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);

/** My profile: the part buyers see. A face and a line about how you work is the difference between a name on a card and someone they will call. */
export function ProfileDrawer({ welcome = false, onClose, onSaved }: { welcome?: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [me, setMe] = useState<MyProfile | null>(null);
  const [f, setF] = useState<ProfileForm | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    fetchMyProfile().then((m) => { if (live) { setMe(m); setF(formOf(m)); } }).catch((e) => live && setErr(reason(e, "Could not load your profile just now.")));
    return () => { live = false; };
  }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose, busy]);

  const set = (k: keyof ProfileForm, v: string) => setF((x) => (x ? { ...x, [k]: v } : x));
  const photo = async (file: File) => {
    const bad = checkAvatar(file);
    if (bad) { setNote(bad); return; }
    setNote("Uploading…");
    try { set("avatar", await uploadAvatar(file)); setNote(""); } catch (e) { setNote(reason(e, "That photo would not upload.")); }
  };
  const save = async () => {
    if (!f) return;
    if (!f.name.trim()) { setNote("Your name cannot be blank."); return; }
    setBusy(true); setNote("");
    try { await saveMyProfile(f); toast("Profile saved."); onSaved(); onClose(); } catch (e) { setNote(reason(e, "Could not save that.")); setBusy(false); }
  };

  const input = (k: keyof ProfileForm, label: string, ph = "", type = "text") => (
    <label className={s.field}><span>{label}</span><input type={type} inputMode={type === "number" ? "numeric" : undefined} min={type === "number" ? 0 : undefined} max={type === "number" ? 70 : undefined} placeholder={ph} value={f![k]} onChange={(e) => set(k, e.target.value)} /></label>
  );

  return (
    <div className={s.scrim} onClick={() => !busy && onClose()}>
      <aside className={s.drawer} role="dialog" aria-modal="true" aria-label="My profile" onClick={(e) => e.stopPropagation()}>
        <div className={s.head}><h2>{welcome ? "Welcome. Set up your profile" : "My profile"}</h2><button type="button" className={s.x} aria-label="Close" onClick={onClose}>×</button></div>
        {err ? <p className={s.err}>{err}</p> : !f || !me ? <p className={s.muted} aria-busy="true">Loading…</p> : (
          <>
            {welcome
              ? <div className={s.nudge}>You have joined the agency. This is the part buyers see: a face and a line about how you work is the difference between a name on a card and someone they will call.</div>
              : <p className={s.muted}>Your colleagues see this on the Agents page. A version of it is what a buyer reads when they are handed to you.</p>}

            <div className={s.face}>
              <div className={s.shot}>{f.avatar ? <img src={f.avatar} alt="" /> : initialsOf(f.name)}</div>
              <div className={s.faceBtns}>
                <button type="button" className={s.btn} onClick={() => pick.current?.click()}>{f.avatar ? "Change photo" : "Add a photo"}</button>
                {f.avatar && <button type="button" className={s.btn} onClick={() => set("avatar", "")}>Remove</button>}
                <div className={s.hint}>A real photograph, under 3MB.</div>
              </div>
              <input ref={pick} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void photo(file); e.target.value = ""; }} />
            </div>

            {input("name", "Full name *", "Adaeze Mohammed")}
            <div className={s.two}>{input("phone", "Phone", "+234…")}{input("whatsapp", "WhatsApp", "+234…")}</div>

            <fieldset className={s.sec}>
              <legend>How you work</legend>
              <label className={s.field}><span>Short bio</span><textarea rows={3} placeholder="Two lines. What you handle, and how you like to work." value={f.bio} onChange={(e) => set("bio", e.target.value)} /></label>
              <div className={s.two}>{input("years", "Years doing this", "5", "number")}{input("languages", "Languages", "English, Yoruba")}</div>
              <label className={s.field}><span>Areas you cover</span><input placeholder="Bodija, Jericho, Akobo" value={f.areas} onChange={(e) => set("areas", e.target.value)} /><em className={s.hint}>Comma separated. These are the areas a lead gets routed to you for.</em></label>
              {input("specializations", "Specialisations", "Rentals, family homes")}
              <label className={s.field}><span>Certifications</span><input placeholder="ESVARBON, NIESV" value={f.certifications} onChange={(e) => set("certifications", e.target.value)} /><em className={s.hint}>Only what you actually hold. A buyer may ask to see it.</em></label>
            </fieldset>

            <fieldset className={s.sec}>
              <legend>Your record</legend>
              <div className={s.record}>
                <div><b>{me.closed ?? "—"}</b><span>closed</span></div>
                <div><b>{me.rating ?? "—"}</b><span>rating</span></div>
                <div><b>{me.responseRate == null ? "—" : `${me.responseRate}%`}</b><span>reply rate</span></div>
              </div>
              <p className={s.hint}>Synapse records these from your actual deals and replies. They are not editable, which is what makes them worth anything to a buyer.</p>
            </fieldset>

            {note && <div className={s.err} role="alert">{note}</div>}
            <button type="button" className={s.save} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : welcome ? "Save and get started" : "Save profile"}</button>
          </>
        )}
      </aside>
    </div>
  );
}
