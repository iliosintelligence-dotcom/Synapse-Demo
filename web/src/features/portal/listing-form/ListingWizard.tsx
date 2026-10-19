"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SynapseMap } from "@/components/map/SynapseMap";
import { NG_STATES } from "@/lib/ng-states";
import { SpecialtiesInput } from "../ui/SpecialtiesInput";
import { useToast } from "../ui/Toast";
import {
  AMENITY_GROUPS, BANDS, CONDITIONS, DEAL_LABEL, DEAL_STRUCTURES, FIELD_STEP, FURNISHED, PERIOD_LABEL, PRICE_PERIODS, PROP_TYPES, STEPS, TITLE_LABEL, TITLE_TYPES, TYPE_LABEL,
  blankForm, firstBadStep, formFromRow, isEmptyDraft, isInvestment, isLand, isRentish, readFloor, toPayload, validate, type Errors, type FieldKey, type Form,
} from "./schema";
import { PartialSave, checkFile, clearDraft, createListing, ensurePin, findPin, getFloor, loadForEdit, readDraft, setFloor, updateListing, uploadPhoto, writeDraft } from "./write";
import s from "./Wizard.module.css";

const IBADAN: [number, number] = [3.947, 7.3775];
const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);
const ago = (at: number) => { const m = Math.round((Date.now() - at) / 60000); return m < 2 ? "a moment ago" : m < 60 ? `${m} minutes ago` : m < 1440 ? `${Math.round(m / 60)} hours ago` : `${Math.round(m / 1440)} days ago`; };
const naira = (v: string) => (parseFloat(v) > 0 ? `₦${Math.round(parseFloat(v)).toLocaleString("en-NG")}` : "");

/**
 * Add or edit a listing, six steps at a time: the home, where, details, price, photos, review. A new listing is kept as a draft on this device as it is
 * typed. Review lists anything still missing with a button back to it, so Save is never a dead end.
 */
export function ListingWizard({ editId, onClose, onSaved }: { editId?: string | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geo, setGeo] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const top = useRef<HTMLDivElement>(null);
  const isNew = !editId;

  // load: a draft for a new listing, the row for an edit
  useEffect(() => {
    let live = true;
    (async () => {
      if (editId) {
        const got = await loadForEdit(editId);
        if (!live) return;
        if (!got) { setLoadErr("That listing could not be opened. It may have been deleted."); return; }
        const f = formFromRow(got.row, got.photos);
        const fl = await getFloor(editId);
        if (!live) return;
        setForm(fl ? { ...f, floor: fl.amount == null ? "" : String(fl.amount), floor_active: fl.active } : f);
      } else {
        const d = await readDraft();
        if (!live) return;
        if (d && !isEmptyDraft(d.form)) { setForm({ ...blankForm(), ...d.form }); setStep(Math.min(d.step, STEPS.length - 1)); setRestored(d.at); } else setForm(blankForm());
      }
    })().catch((e) => live && setLoadErr(reason(e, "That listing could not be opened.")));
    return () => { live = false; };
  }, [editId]);

  // keep a new listing as a draft while it is typed
  useEffect(() => {
    if (!isNew || !form || isEmptyDraft(form)) return;
    const t = setTimeout(() => { void writeDraft(form, step); }, 600);
    return () => clearTimeout(t);
  }, [form, step, isNew]);

  const errors: Errors = useMemo(() => (form ? validate(form) : {}), [form]);
  const set = useCallback(<K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f)), []);
  const stepErrors = (n: number): Errors => Object.fromEntries((Object.entries(errors) as Array<[FieldKey, string]>).filter(([k]) => FIELD_STEP[k] === n)) as Errors;
  const show = (k: FieldKey) => (reveal ? errors[k] : undefined);

  const go = (n: number) => { setStep(n); top.current?.scrollIntoView({ block: "start" }); };
  const next = () => {
    if (Object.keys(stepErrors(step)).length) { setReveal(true); toast("Fill in the required fields (*) first", "error"); return; }
    go(Math.min(step + 1, STEPS.length - 1));
  };

  const place = (lat: number, lng: number) => { set("latitude", lat.toFixed(6)); set("longitude", lng.toFixed(6)); };
  const lookup = async () => {
    if (!form) return;
    setGeo("Finding the map pin…");
    const hit = await findPin(form);
    if (!hit) { setGeo(form.latitude ? "That address is not on the map, so your pin stays where it is." : "That address is not on the map. Tap the map where the property is."); return; }
    place(hit.lat, hit.lng);
    setGeo(hit.how === "address" ? "Pin placed from the address. Tap the map to move it." : hit.how === "area" ? "Street not found, so the pin is at the area. Tap the map to move it." : "Only the city was found. Tap the map where the property is.");
  };
  const here = () => {
    if (!navigator.geolocation) { setGeo("This device cannot share its location. Tap the map instead."); return; }
    navigator.geolocation.getCurrentPosition((p) => { place(p.coords.latitude, p.coords.longitude); setGeo("Pin placed where you are standing."); }, () => setGeo("Location was not shared. Tap the map instead."), { enableHighAccuracy: true, timeout: 10000 });
  };

  const addFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const bad = checkFile(file);
      if (bad) { toast(bad, "error"); continue; }
      try { const url = await uploadPhoto(file); setForm((f) => (f ? { ...f, photos: [...f.photos, url] } : f)); } catch (e) { toast(reason(e, "That file could not be uploaded."), "error"); }
    }
  };

  const save = async () => {
    if (!form) return;
    const bad = firstBadStep(errors);
    const floor = readFloor(form);
    if (bad != null) { setReveal(true); go(bad); toast("Fill in the required fields (*) first", "error"); return; }
    if (floor && "error" in floor) { setReveal(true); go(3); toast(floor.error, "error"); return; }
    setSaving(true);
    const data = toPayload(form);
    try {
      let id = editId ?? "";
      if (editId) await updateListing(editId, data); else id = await createListing(data);
      if (isNew) await clearDraft();
      toast(isNew ? "Listing created. It is unverified until the desk checks it." : "Listing updated");
      void ensurePin(id, data);
      if (floor && !("error" in floor)) await setFloor(id, floor.amount, floor.active).then(() => toast(floor.active ? `Tayo will not go below ₦${floor.amount.toLocaleString()}` : "Tayo will not negotiate this listing"), (e) => toast(reason(e, "The floor was not saved"), "error"));
      onSaved();
    } catch (e) {
      if (e instanceof PartialSave) { if (isNew) await clearDraft(); toast(e.message, "error"); onSaved(); }
      else { toast(`Not saved: ${reason(e, "please try again")}${isNew ? ". Your draft is kept." : ""}`, "error"); setSaving(false); }
    }
  };

  const close = () => { if (!saving) onClose(); };
  if (loadErr) return <Shell onClose={onClose} title="Listing"><p className={s.err}>{loadErr}</p></Shell>;
  if (!form) return <Shell onClose={onClose} title="Listing"><p className={s.muted} aria-busy="true">Opening…</p></Shell>;

  const land = isLand(form), rent = isRentish(form), inv = isInvestment(form);
  const pin = form.latitude && form.longitude ? { lat: Number(form.latitude), lng: Number(form.longitude) } : null;
  const input = (k: keyof Form, label: string, o: { type?: string; ph?: string; req?: boolean; err?: FieldKey; hint?: string; min?: number; max?: number } = {}) => (
    <Field label={label} req={o.req} error={o.err ? show(o.err) : undefined} hint={o.hint}>
      <input type={o.type ?? "text"} inputMode={o.type === "number" ? "decimal" : undefined} min={o.min} max={o.max} placeholder={o.ph} value={form[k] as string} onChange={(e) => set(k, e.target.value as never)} />
    </Field>
  );
  const select = (k: keyof Form, label: string, options: Array<[string, string]>, o: { blank?: string; req?: boolean; err?: FieldKey } = {}) => (
    <Field label={label} req={o.req} error={o.err ? show(o.err) : undefined}>
      <select value={form[k] as string} onChange={(e) => set(k, e.target.value as never)}>{o.blank != null && <option value="">{o.blank}</option>}{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </Field>
  );

  return (
    <Shell onClose={close} title={isNew ? "New listing" : "Edit listing"}>
      <div ref={top} />
      <ol className={s.steps} aria-label="Steps">
        {STEPS.map((name, i) => <li key={name} className={`${i === step ? s.on : ""} ${i < step ? s.done : ""}`}><button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined}><i>{i + 1}</i><span>{name}</span></button></li>)}
      </ol>

      {restored != null && (
        <div className={s.note} role="status">Picking up the listing you had not saved, from {ago(restored)}. <button type="button" className={s.link} onClick={() => { if (window.confirm("Start a blank listing? The one you had not saved will be discarded.")) { void clearDraft(); setForm(blankForm()); setRestored(null); setStep(0); } }}>Start a blank one</button></div>
      )}

      {step === 0 && (
        <section className={s.sec}>
          {input("title", "Title", { req: true, err: "title", ph: "3-Bed Apartment, Lekki Phase 1" })}
          <div className={s.two}>
            {select("property_type", "Property type", PROP_TYPES.map((v) => [v, TYPE_LABEL[v]]), { req: true })}
            {select("deal_structure", "The deal", DEAL_STRUCTURES.map((v) => [v, DEAL_LABEL[v]]), { req: true })}
          </div>
          <Field label="Description" req error={show("description")} hint={`${form.description.trim().length} characters. Condition, layout, neighbourhood, what’s included.`}>
            <textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </section>
      )}

      {step === 1 && (
        <section className={s.sec}>
          {input("address", "Address", { req: true, err: "address", ph: "Street / estate" })}
          <div className={s.two}>
            <Field label="State" req error={show("state")}>
              <select value={form.state} onChange={(e) => set("state", e.target.value)}><option value="">— Select a state —</option>{NG_STATES.map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
            {input("city", "City", { req: true, err: "city", ph: "Ibadan" })}
          </div>
          <div className={s.two}>
            {input("neighbourhood", "Neighbourhood", { ph: "Bodija" })}
            <Field label="Country" req><select value={form.country} onChange={(e) => set("country", e.target.value)}><option>Nigeria</option></select></Field>
          </div>
          <Field label="Map pin" req error={show("pin")} hint={geo || "Found from the address. Tap the map to move it."}>
            <div className={s.map}>
              <SynapseMap center={pin ? [pin.lng, pin.lat] : IBADAN} zoom={pin ? 16 : 11} fit={!!pin} label="Tap to place the listing’s pin" pins={pin ? [{ id: "pin", lng: pin.lng, lat: pin.lat, kind: "home", title: "Listing pin" }] : []} onMapClick={(lng, lat) => place(lat, lng)} />
            </div>
          </Field>
          <div className={s.row}>
            <button type="button" className={s.btn} onClick={() => void lookup()} disabled={!form.address.trim() && !form.city.trim()}>Find the pin from the address</button>
            <button type="button" className={s.btn} onClick={here}>I’m at the property: use my location</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className={s.sec}>
          <div className={s.two}>{input("bedrooms", land ? "Bedrooms" : "Bedrooms", { type: "number", req: !land, err: "bedrooms", min: 0, max: 20, ph: "3" })}{input("bathrooms", "Bathrooms", { type: "number", min: 0, max: 20 })}</div>
          <div className={s.two}>{input("toilets", "Toilets", { type: "number", min: 0, max: 20 })}{input("parking_spaces", "Parking spaces", { type: "number", min: 0, max: 50 })}</div>
          <div className={s.two}>{input("area_sqm", "Area (sqm)", { type: "number" })}{input("year_built", "Year built", { type: "number", min: 1900, max: 2100 })}</div>
          <div className={s.two}>{select("furnished", "Furnishing", FURNISHED, { blank: "Not stated" })}{select("property_condition", "Condition", CONDITIONS, { blank: "Not stated" })}</div>
          {select("electricity_band", "Electricity band", BANDS, { blank: "Not stated" })}
          <Field label="Amenities" hint="Pick from the list, or type your own and press Enter.">
            <SpecialtiesInput id="amen" value={form.amenities} onChange={(v) => set("amenities", v)} groups={AMENITY_GROUPS} placeholder="Search amenities…" listLabel="Amenities" />
          </Field>
        </section>
      )}

      {step === 3 && (
        <section className={s.sec}>
          <div className={s.two}>
            {input("price", "Price (₦)", { type: "number", req: true, err: "price", ph: "165000000", hint: naira(form.price) })}
            {select("price_period", "Price period", PRICE_PERIODS.map((v) => [v, PERIOD_LABEL[v]]), { req: true })}
          </div>
          <div className={s.two}>{input("move_in_cost", "Move-in cost (₦)", { type: "number" })}{input("service_charge", "Service charge (₦/yr)", { type: "number" })}</div>
          <div className={s.two}>{input("agency_fee", "Agency fee (₦)", { type: "number", ph: "or leave blank" })}{input("legal_fee", "Legal fee (₦)", { type: "number", ph: "or leave blank" })}</div>
          <p className={s.muted}>Shown to buyers in the cost breakdown. Left blank, the listing says the fee has not been stated; enter 0 if there genuinely is none. Never used in social captions.</p>

          <h3 className={s.h3}>The deal</h3>
          <div className={s.two}>
            {input("units_available", "Units available", { type: "number", req: true, err: "units", min: 1 })}
            {!land && select("build_stage", "Is it built?", [["completed", "Completed, ready now"], ["under_construction", "Under construction"], ["not_started", "Not started yet (off-plan)"]])}
          </div>
          {!land && form.build_stage !== "completed" && <div className={s.two}>{input("handover_month", "Expected handover", { type: "month" })}{form.build_stage === "under_construction" && input("build_progress_pct", "Built so far (%)", { type: "number", min: 0, max: 100 })}</div>}
          {!rent && select("payment_plan", "Payment", [["outright", "Outright"], ["instalments", "Instalments allowed"]])}
          {!rent && form.payment_plan === "instalments" && <div className={s.two}>{input("deposit_pct", "Initial deposit (%)", { type: "number", min: 0, max: 100 })}{input("instalment_months", "Spread over (months)", { type: "number", min: 1, max: 240 })}</div>}
          {land && <div className={s.two}>{input("plot_count", "Number of plots", { type: "number" })}{input("plot_size_sqm", "Size of one plot (sqm)", { type: "number" })}</div>}
          {inv && <><div className={s.two}>{input("min_investment", "Minimum investment (₦)", { type: "number" })}{input("investment_term_months", "Term (months)", { type: "number", min: 1, max: 600 })}</div>{input("stated_return_pct", "Return you state (% over the term)", { type: "number" })}</>}

          <h3 className={s.h3}>Trust</h3>
          <div className={s.two}>{select("title_type", "Title document", TITLE_TYPES.map((v) => [v, TITLE_LABEL[v]]), { blank: "— Select —" })}{input("yield_pct", "Gross yield (%)", { type: "number" })}</div>

          <h3 className={s.h3}>Negotiation</h3>
          <div className={s.two}>
            {input("floor", "Tayo’s floor (₦)", { type: "number", err: "floor", ph: "No floor set" })}
            <Field label="Negotiation"><select value={form.floor_active ? "on" : "off"} onChange={(e) => set("floor_active", e.target.value === "on")}><option value="on">Tayo may negotiate down to the floor</option><option value="off">Tayo may not negotiate this listing</option></select></Field>
          </div>
          <p className={s.muted}>The lowest Tayo will agree to. An offer under it stops the negotiation and messages the assigned agent instead. Buyers never see this figure. Only an owner or admin can set it.</p>
          <label className={s.toggle}><input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Listing active (visible to buyers)</label>
        </section>
      )}

      {step === 4 && (
        <section className={s.sec}>
          <Field label="Photos of the property" req error={show("photos")} hint="JPG, PNG, WebP, MP4 or MOV. The first is the cover.">
            <Photos photos={form.photos} onAdd={addFiles} onChange={(p) => set("photos", p)} />
          </Field>
        </section>
      )}

      {step === 5 && (
        <section className={s.sec}>
          <h3 className={s.h3}>{form.title || "Untitled listing"}</h3>
          <p className={s.muted}>{[TYPE_LABEL[form.property_type], DEAL_LABEL[form.deal_structure], naira(form.price), [form.address, form.city, form.state].filter(Boolean).join(", "), `${form.photos.length} photo${form.photos.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</p>
          {Object.keys(errors).length ? (
            <div className={s.missing} role="alert"><b>Still missing</b>
              {(Object.entries(errors) as Array<[FieldKey, string]>).map(([k, m]) => <div key={k}><span>{m}</span> <button type="button" className={s.link} onClick={() => { setReveal(true); go(FIELD_STEP[k]); }}>Go to {STEPS[FIELD_STEP[k]].toLowerCase()}</button></div>)}
            </div>
          ) : <p className={s.ok}>Everything required is filled in.</p>}
          <p className={s.muted}>New listings start unverified and join the seven-check queue. Tayo can only match buyers to a listing once it is verified.</p>
        </section>
      )}

      <div className={s.bar}>
        <button type="button" className={s.btn} onClick={step === 0 ? close : () => go(step - 1)}>{step === 0 ? "Close" : "Back"}</button>
        {step < STEPS.length - 1
          ? <button type="button" className={`${s.btn} ${s.solid}`} onClick={next}>Next</button>
          : <button type="button" className={`${s.btn} ${s.solid}`} disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : isNew ? "Create listing" : "Save changes"}</button>}
      </div>
    </Shell>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className={s.scrim}>
      <div className={s.panel} role="dialog" aria-modal="true" aria-label={title}>
        <header className={s.head}><h2>{title}</h2><button type="button" className={s.x} aria-label="Close" onClick={onClose}>×</button></header>
        {children}
      </div>
    </div>
  );
}

function Field({ label, req, error, hint, children }: { label: string; req?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.lbl}>{label}{req && <b aria-hidden="true"> *</b>}</span>
      {children}
      {error ? <span className={s.err} role="alert">{error}</span> : hint ? <span className={s.hint}>{hint}</span> : null}
    </label>
  );
}

function Photos({ photos, onAdd, onChange }: { photos: string[]; onAdd: (f: FileList | File[]) => Promise<void>; onChange: (p: string[]) => void }) {
  const pick = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const take = async (files: FileList | File[]) => { setBusy(true); await onAdd(files); setBusy(false); };
  const move = (i: number, d: number) => { const n = [...photos], j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div className={s.photos} onClick={(e) => e.preventDefault()}>
      <div className={`${s.drop} ${over ? s.over : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files); }}>
        <b>{busy ? "Uploading…" : "Drag photos or video here"}</b>
        <button type="button" className={s.btn} disabled={busy} onClick={() => pick.current?.click()}>Choose files</button>
        <input ref={pick} type="file" multiple hidden accept="image/png,image/jpeg,image/webp,image/avif,video/mp4,video/quicktime" onChange={(e) => { if (e.target.files) void take(e.target.files); e.target.value = ""; }} />
      </div>
      <div className={s.row}>
        <input type="url" placeholder="or paste a direct link to an image" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Photo link" />
        <button type="button" className={s.btn} disabled={!/^https?:\/\/\S+$/i.test(link.trim())} onClick={() => { onChange([...photos, link.trim()]); setLink(""); }}>Add</button>
      </div>
      {photos.length > 0 && (
        <ul className={s.gal}>
          {photos.map((u, i) => (
            <li key={`${u}${i}`}>
              {/\.(mp4|mov)(\?|$)/i.test(u) ? <video src={u} muted /> : <img src={u} alt="" />}
              {i === 0 && <span className={s.cover}>Cover</span>}
              <div className={s.tile}>
                <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}>←</button>
                <button type="button" aria-label="Move later" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>→</button>
                <button type="button" aria-label="Remove" onClick={() => onChange(photos.filter((_, k) => k !== i))}>×</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
