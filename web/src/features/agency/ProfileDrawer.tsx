"use client";
/**
 * My profile, as React (was openMyProfile in src/legacy/agency/inline-3.js). An agent accepted an invite and arrived as a name;
 * this is where they add a face, a bio, the areas they cover and the languages they work in (agent_profiles has write policies
 * for it now).
 *
 * Deliberately NOT the brand editor. An owner setting up an agency is describing a company; an agent joining one is describing
 * themselves -- the brand is what Tayo writes in, the profile is what a buyer reads when deciding whether to trust the person
 * showing them a house.
 *
 * Its own drawer (the old shared #drawer was filled from eleven innerHTML templates, which React could not share; it is gone).
 * It uses the same .drawer styles and the same scrim, and closes whenever portalShell's closeLead() runs (`syn:drawer-close`).
 * portalData's openMyProfile(opts) survives as a name and fires `syn:my-profile`.
 */
import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

type Me = { name: string; phone: string; whatsapp: string; avatar: string; bio: string; years: string | number; languages: string[]; areas: string[];
  specializations: string[]; certifications: string[]; closed: number | null; rating: number | null; responseRate: number | null };
type Vals = { mpName: string; mpPhone: string; mpWa: string; mpBio: string; mpYears: string; mpLangs: string; mpAreas: string; mpSpecs: string; mpCerts: string };

const initials = (n: string) => String(n || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "—";
const str = (v: unknown) => (v == null ? "" : String(v));
const arr = (a?: string[]) => (a || []).join(", ");
const shut = () => W().closeLead?.();

function Loaded({ me, first }: { me: Me; first: boolean }) {
  const [vals, setVals] = useState<Vals>({
    mpName: str(me.name), mpPhone: str(me.phone), mpWa: str(me.whatsapp), mpBio: str(me.bio), mpYears: str(me.years),
    mpLangs: arr(me.languages), mpAreas: arr(me.areas), mpSpecs: arr(me.specializations), mpCerts: arr(me.certifications),
  });
  const [avatar, setAvatar] = useState(me.avatar);
  const [shotInitials, setShotInitials] = useState(initials(me.name));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { W().SynIcons?.hydrate?.(document.getElementById("profileDrawer")); }, []);
  const input = (id: keyof Vals) => ({ id, value: vals[id], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setVals((v) => ({ ...v, [id]: e.target.value })) });
  const label = first ? "Save and get started" : "Save profile";

  const upload = () => {
    const f = file.current?.files && file.current.files[0];
    if (!f) return;
    setNote("Uploading…");
    W().SynListings.uploadAvatar(f)
      .then((url: string) => { setAvatar(url); setNote(""); })
      .catch((err: any) => setNote((err && err.message) || "That photo would not upload."));
  };
  const save = () => {
    const v = (id: keyof Vals) => (vals[id] || "").trim();
    if (!v("mpName")) { setNote("Your name cannot be blank."); return; }
    setSaving(true);
    W().SynListings.saveMyProfile({
      name: v("mpName"), phone: v("mpPhone"), whatsapp: v("mpWa"), avatar, bio: v("mpBio"), years: v("mpYears"),
      languages: v("mpLangs"), specializations: v("mpSpecs"), areas: v("mpAreas"), certifications: v("mpCerts"),
    })
      .then(() => { shut(); W().toast?.("Profile saved."); if (typeof W().loadAgents === "function") W().loadAgents(); })
      .catch((err: any) => { setSaving(false); setNote((err && err.message) || "Could not save that."); W().planGate?.(err && err.message); });
  };

  return (
    <>
      {first ? (
        <div className="mp-nudge" style={{ marginTop: "10px" }}><span data-icon="user"></span>
          <span>You have joined the agency. This is the part buyers see {"—"} a face and a line about how you work is the difference between a name on a card and someone they will call.</span></div>
      ) : (
        <p className="muted" style={{ fontSize: "12px", margin: "6px 0 4px" }}>Your colleagues see this on the Agents page. A version of it is what a buyer reads when they are handed to you.</p>
      )}
      <div className="lf" style={{ marginTop: "14px" }}>
        <div className="mp-face">
          <div className="mp-shot" id="mpShot">{avatar ? <img src={avatar} alt="" /> : shotInitials}</div>
          <div className="mp-facebtns">
            <button type="button" className="btn" id="mpPick" onClick={() => file.current?.click()}>{me.avatar ? "Change photo" : "Add a photo"}</button>
            {me.avatar ? <button type="button" className="btn" id="mpClear" onClick={() => { setAvatar(""); setShotInitials(initials(vals.mpName)); }}>Remove</button> : null}
            <div className="mp-hint">A real photograph, under 3MB.</div>
          </div>
          <input type="file" id="mpFile" accept="image/*" hidden ref={file} onChange={upload} />
        </div>
        <div className="field"><label htmlFor="mpName">Full name *</label>
          <input {...input("mpName")} placeholder="Adaeze Mohammed" /></div>
        <div className="row2">
          <div className="field"><label htmlFor="mpPhone">Phone</label>
            <input {...input("mpPhone")} placeholder={"+234…"} /></div>
          <div className="field"><label htmlFor="mpWa">WhatsApp</label>
            <input {...input("mpWa")} placeholder={"+234…"} /></div>
        </div>

        <div className="mp-sec"><div className="mp-sec-k">How you work</div>
          <div className="field"><label htmlFor="mpBio">Short bio</label>
            <textarea {...input("mpBio")} rows={3} placeholder="Two lines. What you handle, and how you like to work." /></div>
          <div className="row2">
            <div className="field"><label htmlFor="mpYears">Years doing this</label>
              <input {...input("mpYears")} type="number" inputMode="numeric" min="0" max="70" placeholder="5" /></div>
            <div className="field"><label htmlFor="mpLangs">Languages</label>
              <input {...input("mpLangs")} placeholder="English, Yoruba" /></div>
          </div>
          <div className="field"><label htmlFor="mpAreas">Areas you cover</label>
            <input {...input("mpAreas")} placeholder="Bodija, Jericho, Akobo" />
            <div className="lf-hint">Comma separated. These are the areas a lead gets routed to you for.</div></div>
          <div className="field"><label htmlFor="mpSpecs">Specialisations</label>
            <input {...input("mpSpecs")} placeholder="Rentals, family homes" /></div>
          <div className="field"><label htmlFor="mpCerts">Certifications</label>
            <input {...input("mpCerts")} placeholder="ESVARBON, NIESV" />
            <div className="lf-hint">Only what you actually hold {"—"} a buyer may ask to see it.</div></div>
        </div>

        {/* The record is shown but not offered. An agent typing their own closed-deal count is the one thing this form must not
            allow, and the database refuses it too (agent_profiles_guard). */}
        <div className="mp-sec"><div className="mp-sec-k">Your record</div>
          <div className="mp-record">
            <div><div className="v">{me.closed == null ? "—" : me.closed}</div><div className="l">closed</div></div>
            <div><div className="v">{me.rating == null ? "—" : me.rating}</div><div className="l">rating</div></div>
            <div><div className="v">{me.responseRate == null ? "—" : me.responseRate + "%"}</div><div className="l">reply rate</div></div>
          </div>
          <div className="mp-note">Synapse records these from your actual deals and replies. They are not editable {"—"} that is what makes them worth anything to a buyer.</div>
        </div>

        <div className="sch-note" id="mpNote">{note}</div>
        <button className="btn btn-primary btn-block" id="mpSave" style={{ marginTop: "14px" }} disabled={saving} onClick={save}>{saving ? "Saving…" : label}</button>
      </div>
    </>
  );
}

type View = { open: boolean; first: boolean; turn: number; me: Me | null; err: string | null };

export function ProfileDrawer() {
  const [v, setV] = useState<View>({ open: false, first: false, turn: 0, me: null, err: null });
  const turns = useRef(0);   // a reply to an earlier opening is ignored

  useEffect(() => {
    const close = () => setV((s) => ({ ...s, open: false }));
    const open = (e: Event) => {
      const first = !!((e as CustomEvent).detail || {}).welcome;
      shut();   // whatever the shared drawer held goes away, as when this replaced its contents
      document.getElementById("scrim")?.classList.add("on");
      const turn = ++turns.current;
      setV({ open: true, first, turn, me: null, err: null });
      W().SynListings.myProfile()
        .then((me: Me) => setV((s) => (s.turn === turn ? { ...s, me } : s)))
        .catch((err: any) => setV((s) => (s.turn === turn ? { ...s, err: (err && err.message) || "Could not load your profile just now." } : s)));
    };
    window.addEventListener("syn:drawer-close", close);
    window.addEventListener("syn:my-profile", open);
    return () => { window.removeEventListener("syn:drawer-close", close); window.removeEventListener("syn:my-profile", open); };
  }, []);

  const title = v.first && !v.err ? "Welcome — set up your profile" : "My profile";
  return (
    <aside className={"drawer" + (v.open ? " on" : "")} id="profileDrawer">
      {v.turn ? (
        <>
          <button className="x" aria-label="Close" onClick={shut}>{"×"}</button>
          <div style={{ fontSize: "19px", fontWeight: 700 }}>{title}</div>
          {v.err ? <p className="muted" style={{ fontSize: "12.5px", marginTop: "10px" }}>{v.err}</p>
            : v.me ? <Loaded key={v.turn} me={v.me} first={v.first} />
            : <p className="muted" style={{ fontSize: "12px", margin: "6px 0 16px" }}>Loading{"…"}</p>}
        </>
      ) : null}
    </aside>
  );
}
