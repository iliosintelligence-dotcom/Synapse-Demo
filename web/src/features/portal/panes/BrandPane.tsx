"use client";

import { useEffect, useRef, useState } from "react";
import { brandHex, safeUrl } from "@/lib/brand";
import {
  DEFAULT_COLOR, DEFAULT_COLOR2, ONBOARD_STEPS, SPECIALTY_GROUPS, SWATCHES, buildPatch, emptyForm, formFrom, isBrandEmpty, isFirstRun, loadBrand, removeBrandAsset, saveBrand, swatchName,
  uploadBrandAsset, type BrandForm, type BrandRecord,
} from "../data/brand";
import { SpecialtiesInput } from "../ui/SpecialtiesInput";
import { useToast } from "../ui/Toast";
import s from "./Brand.module.css";

const SKIP_KEY = "synapse_brand_onboard_skipped";
const initialsOf = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "-";

/** Only a plain font name is ever put in a style attribute. */
const fontOf = (f: string) => (/^[A-Za-z0-9][A-Za-z0-9 ]{1,39}$/.test(f.trim()) ? `'${f.trim()}', var(--font-sans)` : undefined);

type Mode = "view" | "edit";
type Load = { state: "loading" } | { state: "none" } | { state: "failed" } | { state: "ready" };

/**
 * Brand: the agency's logo, colours, voice and links. Tayo uses these when it writes and designs anything on the agency's behalf. Nothing is
 * pre-filled: an empty brand is an honest brand, and a specimen one would end up in real posts. It opens on the BRAND, not on the settings for it.
 */
export function BrandPane() {
  const toast = useToast();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [record, setRecord] = useState<Partial<BrandRecord>>({});
  const [form, setForm] = useState<BrandForm>(emptyForm());
  const [mode, setMode] = useState<Mode>("view");
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState(() => { try { return localStorage.getItem(SKIP_KEY) === "1"; } catch { return false; } });
  const [notes, setNotes] = useState<{ light: string; dark: string; err: boolean }>({ light: "", dark: "", err: false });
  const files = { light: useRef<HTMLInputElement>(null), dark: useRef<HTMLInputElement>(null) };
  const welcomed = useRef(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("welcome") === "agency");

  useEffect(() => {
    let live = true;
    loadBrand()
      .then((b) => {
        if (!live) return;
        if (!b) return setLoad({ state: "none" });
        setRecord(b);
        setForm(formFrom(b));
        setLoad({ state: "ready" });
      })
      .catch(() => live && setLoad({ state: "failed" }));
    return () => { live = false; };
  }, []);

  const set = <K extends keyof BrandForm>(k: K, v: BrandForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (load.state === "loading") return <p className={s.muted}>Loading…</p>;
  if (load.state === "none") return <p className={s.gate}>Sign in as an agency to set up your brand.</p>;
  if (load.state === "failed") return <p className={s.gate}>Could not load your brand details. Check your connection and reload.</p>;

  const showOnboard = isFirstRun(record) && (!skipped || welcomed.current);
  const editing = mode === "edit";

  const cancel = async () => {
    // discarding means going back to what is stored, or it is just another way to leave the page
    try { const b = await loadBrand(); if (b) { setRecord(b); setForm(formFrom(b)); } } catch { /* the draft stays as it was */ }
    setMode("view");
  };

  const save = async () => {
    setSaving(true);
    const patch = buildPatch(form);
    try {
      await saveBrand(patch);
      const next = { ...record, ...patch };
      setRecord(next);
      setForm(formFrom(next));
      setMode("view");
      // re-derive the checklist from what was actually saved, so the last step ticking off is what ends onboarding
      toast(isFirstRun(next) ? "Saved. Finish the remaining steps whenever you like" : "Brand saved. Tayo will use it from the next post");
    } catch (e) {
      toast(`Not saved: ${(e as Error)?.message ?? e}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (slot: "light" | "dark", file: File | undefined) => {
    if (!file) return;
    const previous = slot === "light" ? form.logo : form.logoDark;
    setNotes((n) => ({ ...n, [slot]: "Uploading…", err: false }));
    try {
      const url = await uploadBrandAsset(file, slot);
      set(slot === "light" ? "logo" : "logoDark", url);
      setNotes((n) => ({ ...n, [slot]: "Uploaded. Save to apply it everywhere", err: false }));
      void removeBrandAsset(previous); // an agency iterating on its mark does not leave a trail of dead objects
    } catch (e) {
      setNotes((n) => ({ ...n, [slot]: (e as Error)?.message || "Upload failed", err: true }));
    }
  };
  const clearLogo = (slot: "light" | "dark") => {
    const previous = slot === "light" ? form.logo : form.logoDark;
    set(slot === "light" ? "logo" : "logoDark", "");
    setNotes((n) => ({ ...n, [slot]: "Removed. Save to apply", err: false }));
    void removeBrandAsset(previous);
  };

  const c1 = form.color || DEFAULT_COLOR, c2 = form.color2 || DEFAULT_COLOR2;
  const name = form.name.trim() || "Your agency";

  return (
    <div>
      <div className={s.actions}>
        {!editing ? <button className={s.primary} type="button" onClick={() => setMode("edit")}>Edit brand</button> : (
          <>
            <button className={s.ghost} type="button" onClick={cancel} disabled={saving}>Cancel</button>
            <button className={s.primary} type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save brand"}</button>
          </>
        )}
      </div>

      {showOnboard && (
        <div className={s.onboard}>
          <div className={s.boHead}>
            <div>
              <div className={s.kicker}>Getting set up</div>
              <div className={s.h2}>Let’s set up your brand</div>
              <p className={s.muted}>Tayo writes captions, replies and ad creative for you. These details are what make that output sound like your agency instead of a generic listing site.</p>
            </div>
            <button className={s.ghost} type="button" onClick={() => { try { localStorage.setItem(SKIP_KEY, "1"); } catch { /* not remembered */ } setSkipped(true); welcomed.current = false; toast("Skipped. Your brand lives under Team, then Brand, whenever you want it"); }}>Skip for now</button>
          </div>
          <ol className={s.steps}>
            {ONBOARD_STEPS.map((st) => { const ok = st.done(record); return <li key={st.k} className={ok ? s.done : ""}><span className={s.tick}>{ok ? "✓" : "·"}</span><span>{st.k}</span></li>; })}
          </ol>
        </div>
      )}

      {!editing ? (
        isBrandEmpty(form) ? (
          <div className={s.empty}>
            <div className={s.h2}>Your brand is not set up yet</div>
            <p className={s.muted}>Your logo, colours and voice are what make Tayo’s captions sound like your agency instead of a generic listing site. It takes about two minutes.</p>
            <button className={s.primary} type="button" onClick={() => setMode("edit")}>Set up your brand</button>
          </div>
        ) : (
          <BrandView form={form} c1={c1} c2={c2} name={name} onCopy={(hex) => (navigator.clipboard ? navigator.clipboard.writeText(hex).then(() => toast(`Copied ${hex}`), () => toast(hex)) : toast(hex))} />
        )
      ) : (
        <div className={s.form}>
          <div className={s.hero}>
            <div className={s.heroLabel}>How Tayo introduces you</div>
            <div className={s.preview} aria-live="polite">
              {form.logo && safeUrl(form.logo) &&   <img src={safeUrl(form.logo)!} alt="" onError={(e) => e.currentTarget.remove()} />}
              <div className={s.mark} style={{ background: c1 }}>{initialsOf(name)}</div>
              <div className={s.pTxt}><div className={s.pNm} style={{ fontFamily: fontOf(form.font) }}>{name}</div><div className={s.pTag}>{form.tagline.trim() || "Your tagline appears here"}</div></div>
              <span className={s.chipAccent} style={{ background: c2 }}>Accent</span>
            </div>
          </div>

          <div className={s.two}>
            <section className={s.card}>
              <h3 className={s.h3}>Identity</h3>
              <p className={s.sub}>How you are named and described.</p>
              <Field label="Agency name" id="bkName"><input id="bkName" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your registered trading name" autoFocus /></Field>
              <Field label="Tagline" id="bkTagline"><input id="bkTagline" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="One line: what you want to be known for" /></Field>
              <Field label="About" id="bkDesc"><textarea id="bkDesc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="A short description buyers will read on your listings" /></Field>
              <Field label="Specialties" id="bkSpecIn"><SpecialtiesInput id="bkSpecIn" value={form.specialties} onChange={(v) => set("specialties", v)} groups={SPECIALTY_GROUPS} /></Field>
            </section>

            <section className={s.card}>
              <h3 className={s.h3}>Look</h3>
              <p className={s.sub}>Used on your creatives and your public agency page.</p>
              <div className={s.logos}>
                {(["light", "dark"] as const).map((slot) => {
                  const url = slot === "light" ? form.logo : form.logoDark;
                  const shown = url || (slot === "dark" ? form.logo : "");
                  return (
                    <div key={slot} className={`${s.logoTile} ${slot === "dark" ? s.darkTile : ""}`}>
                      <div className={s.ltPreview}>{shown && safeUrl(shown) ?   <img src={safeUrl(shown)!} alt="" /> : <span className={s.ltEmpty}>No logo yet</span>}</div>
                      <label>{slot === "light" ? "Logo" : "Dark background"}</label>
                      <input ref={files[slot]} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void upload(slot, f); }} />
                      <div className={s.ltActs}>
                        <button type="button" className={s.ltBtn} onClick={() => files[slot].current?.click()}>Upload</button>
                        {url && <button type="button" className={`${s.ltBtn} ${s.ltRm}`} onClick={() => clearLogo(slot)}>Remove</button>}
                      </div>
                      <div className={`${s.ltNote} ${notes.err && notes[slot] ? s.err : ""}`}>{notes[slot] || (slot === "light" ? "PNG, JPG, WEBP or SVG · up to 2MB" : "Optional, for dark creatives")}</div>
                    </div>
                  );
                })}
              </div>
              <div className={s.swatchRow}>
                <SwatchCard label="Primary" value={form.color} chosen={form.colorChosen} onPick={(hex) => setForm((f) => ({ ...f, color: hex, colorChosen: true }))} />
                <SwatchCard label="Secondary" value={form.color2} chosen={form.color2Chosen} onPick={(hex) => setForm((f) => ({ ...f, color2: hex, color2Chosen: true }))} />
              </div>
              <Field label="Typeface" id="bkFont"><input id="bkFont" value={form.font} onChange={(e) => set("font", e.target.value)} placeholder="e.g. Josefin Sans" /></Field>
              <div className={s.specimen}>
                <div className={s.tsName}>{form.font.trim() || "Default"}</div>
                <div className={s.tsGlyphs} style={{ fontFamily: fontOf(form.font) }}>Aa</div>
                <div className={s.tsSample} style={{ fontFamily: fontOf(form.font) }}>{form.name.trim() || "Your agency name in this typeface"}</div>
              </div>
            </section>
          </div>

          <div className={s.two}>
            <section className={s.card}>
              <h3 className={s.h3}>Voice</h3>
              <p className={s.sub}>Tayo writes captions and replies in this tone. Be specific: “warm and plain-spoken, never salesy” beats “professional”.</p>
              <Field label="How you sound" id="bkVoice"><textarea id="bkVoice" rows={3} value={form.voice} onChange={(e) => set("voice", e.target.value)} placeholder="Describe the voice you want in your own words" /></Field>
            </section>
            <section className={s.card}>
              <h3 className={s.h3}>Reach</h3>
              <p className={s.sub}>Where buyers find you. Handles here label your posts; connecting an account for publishing is done in Social.</p>
              <Field label="CAC registration number" id="bkCac" hint="Shown to buyers on your property cards so they can check you at the CAC registry."><input id="bkCac" value={form.cac} onChange={(e) => set("cac", e.target.value)} placeholder="RC 1234567" autoComplete="off" /></Field>
              <Field label="WhatsApp number" id="bkWhatsapp"><input id="bkWhatsapp" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+234…" /></Field>
              <Field label="Instagram handle" id="bkInstagram"><input id="bkInstagram" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@youragency" /></Field>
              <Field label="Website" id="bkWebsite"><input id="bkWebsite" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
              <Field label="City" id="bkCity"><input id="bkCity" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Lagos" /></Field>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return <div className={s.field}><label htmlFor={id}>{label}</label>{children}{hint && <span className={s.hint}>{hint}</span>}</div>;
}

function SwatchCard({ label, value, chosen, onPick }: { label: string; value: string; chosen: boolean; onPick: (hex: string) => void }) {
  return (
    <div className={`${s.swatchCard} ${chosen ? "" : s.unset}`}>
      <input type="color" value={brandHex(value)?.length === 7 ? value : DEFAULT_COLOR} aria-label={`${label} brand colour`} onChange={(e) => onPick(e.target.value)} />
      <div className={s.swInfo}><span className={s.swName}>{label}</span><span className={s.swHex}>{chosen ? value.toUpperCase() : "Not set"}</span></div>
      <div className={s.presets}>
        {SWATCHES.map((c) => <button key={c} type="button" aria-pressed={chosen && c.toLowerCase() === value.toLowerCase()} aria-label={swatchName(c)} title={swatchName(c)} style={{ ["--sw" as string]: c }} onClick={() => onPick(c)}><i /></button>)}
      </div>
    </div>
  );
}

function BrandView({ form, c1, c2, name, onCopy }: { form: BrandForm; c1: string; c2: string; name: string; onCopy: (hex: string) => void }) {
  const none = (t: string) => <span className={s.none}>{t}</span>;
  const logo = safeUrl(form.logo), logoDark = safeUrl(form.logoDark);
  const ig = form.instagram.trim();
  const igHref = ig ? (/^https?:/i.test(ig) ? ig : `https://instagram.com/${ig.replace(/^@/, "")}`) : "";
  const web = safeUrl(form.website);
  const font = fontOf(form.font);
  return (
    <div className={s.bkGrid}>
      <div className={`${s.bkCard} ${s.full}`}>
        <div className={s.bkK}>Identity</div>
        <div className={s.bkId}>
          {logo ?   <img src={logo} alt="" /> : <div className={s.bkMark} style={{ background: c1 }}>{initialsOf(name)}</div>}
          <div style={{ minWidth: 0 }}><div className={s.bkNm} style={{ fontFamily: font }}>{name}</div><div className={s.bkTag}>{form.tagline.trim() || none("No tagline yet")}</div></div>
        </div>
      </div>
      <div className={s.bkCard}>
        <div className={s.bkK}>Logo</div>
        <div className={s.bkLogos}>
          <div><div className={`${s.bkLogo} ${s.light}`}>{logo ?   <img src={logo} alt="" /> : none("No logo")}</div><div className={s.bkCap}>On light</div></div>
          <div><div className={`${s.bkLogo} ${s.dark}`}>{logoDark || logo ?   <img src={(logoDark ?? logo)!} alt="" /> : none("No logo")}</div><div className={s.bkCap}>{logoDark ? "On dark" : "On dark (same file)"}</div></div>
        </div>
      </div>
      <div className={s.bkCard}>
        <div className={s.bkK}>Colours</div>
        <div className={s.bkColours}>
          {[[c1, form.colorChosen, "Primary"], [c2, form.color2Chosen, "Accent"]].map(([c, set, role]) => (
            <button key={String(role)} type="button" className={s.bkSwatch} onClick={() => onCopy(String(c).toUpperCase())}>
              <i style={{ background: String(c) }} /><span className={s.bkHex}>{set ? String(c).toUpperCase() : "Not set"}</span><span className={s.bkRole}>{String(role)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={s.bkCard}>
        <div className={s.bkK}>Typeface</div>
        {form.font.trim() ? (
          <>
            <div className={s.bkTypeName}>{form.font.trim()}</div>
            <div className={s.bkGlyphs} style={{ fontFamily: font }}>Aa Bb Cc 123</div>
            <div className={s.bkSample} style={{ fontFamily: font }}>{form.tagline.trim() || "A three-bedroom in Lekki, priced to move."}</div>
          </>
        ) : none("No typeface chosen. Captions use the default.")}
      </div>
      <div className={s.bkCard}><div className={s.bkK}>Voice</div>{form.voice.trim() ? <div className={s.bkText}>{form.voice.trim()}</div> : none("Not set. Tayo writes in a neutral voice.")}</div>
      <div className={s.bkCard}><div className={s.bkK}>About</div>{form.description.trim() ? <div className={s.bkText}>{form.description.trim()}</div> : none("No description yet.")}</div>
      <div className={s.bkCard}>
        <div className={s.bkK}>Where to find you</div>
        <div className={s.bkRows}>
          <div className={s.bkRow}><span>Website</span>{web ? <a href={web} target="_blank" rel="noopener noreferrer">{form.website.trim()}</a> : none("Not added")}</div>
          <div className={s.bkRow}><span>Instagram</span>{ig ? <a href={igHref} target="_blank" rel="noopener noreferrer">{ig}</a> : none("Not added")}</div>
          <div className={s.bkRow}><span>WhatsApp</span>{form.whatsapp.trim() ? <b>{form.whatsapp.trim()}</b> : none("Not added")}</div>
          <div className={s.bkRow}><span>City</span>{form.city.trim() ? <b>{form.city.trim()}</b> : none("Not set")}</div>
        </div>
      </div>
    </div>
  );
}
