"use client";
/**
 * The Brand pane, as React (was the brandPage block of src/legacy/agency/inline-3.js). Reads and writes the agency's own record
 * through SynListings (loadBrand, saveBrand, uploadBrandAsset, removeBrandAsset). Nothing is pre-filled: an empty brand is an
 * honest brand, and a specimen one would end up in real posts.
 *
 * Told to the rest of the page: `window.SYN_BRAND_ONBOARDING` and `syn:brand-onboard` (the channels strip holds its "connect
 * your channels" ask until the checklist here is out of the way).
 */
import { Fragment, useEffect, useRef, useState } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);

/* Input id -> column on agencies. */
const FIELDS = {
  bkName: "name", bkTagline: "tagline", bkDesc: "description",
  bkLogo: "logo_url", bkLogoDark: "logo_dark_url",
  bkColor: "brand_color", bkColor2: "brand_color_secondary", bkFont: "brand_font",
  bkVoice: "brand_voice", bkWhatsapp: "whatsapp_number", bkCity: "city", bkCac: "cac_number",
} as const;
type FieldId = keyof typeof FIELDS | "bkInstagram" | "bkWebsite";
type Form = Record<FieldId, string>;
const COLOUR_DEFAULTS = { bkColor: "#121212", bkColor2: "#c76a1a" };
const EMPTY: Form = {
  bkName: "", bkTagline: "", bkDesc: "", bkLogo: "", bkLogoDark: "", bkColor: COLOUR_DEFAULTS.bkColor, bkColor2: COLOUR_DEFAULTS.bkColor2,
  bkFont: "", bkVoice: "", bkWhatsapp: "", bkCity: "", bkCac: "", bkInstagram: "", bkWebsite: "",
};
type Colour = "bkColor" | "bkColor2";

/* ── specialties: a list to pick from ─────────────────────────────
   As a text box, "shortlets", "short let" and "short-let apartments" were three specialties. The list makes the common ones one
   spelling; typing still adds anything it lacks, so a specialty saved before this existed ("Lekki resale") opens as a chip and
   is kept. */
const SPECIALTY_GROUPS = [
  { g: "What you handle", items: ["Sales", "Lettings", "Short-lets", "Off-plan sales", "Land sales", "Property management",
    "Facility management", "Valuation", "Joint ventures"] },
  { g: "Property", items: ["Residential", "Luxury homes", "Affordable homes", "Serviced apartments", "Office space", "Shops and retail",
    "Warehouses and industrial", "Hotels and hospitality"] },
  { g: "Who you serve", items: ["First-time buyers", "Diaspora buyers", "Investors", "Corporate relocation", "Expatriates", "Landlords",
    "Developers"] },
  { g: "Paperwork and payment", items: ["Title verification", "C of O and Governor's consent", "Survey and documentation",
    "Mortgage advisory", "Instalment plans", "Rent-to-own"] },
];
const norm = (v: string) => String(v || "").trim().toLowerCase();
const split = (v: string) => String(v || "").split(/[|,;\n]+/).map((x) => x.trim().replace(/\s+/g, " ")).filter(Boolean);
const dedupe = (list: string[], add: string[]) => { const out = [...list]; add.forEach((v) => { if (!out.some((c) => norm(c) === norm(v))) out.push(v); }); return out; };

/* Somewhere to start. Deliberately not the Synapse palette -- this is the agency's brand, not ours -- and spread across the hue
   wheel so the row reads as a choice rather than a shade of one idea. */
const SWATCHES = ["#1F4E5F", "#2E7D4F", "#7A3E9D", "#B8860B", "#C2552B", "#1D4ED8", "#B91C4C", "#0F766E", "#334155", "#121212"];
/* Nearest common colour name for a hex, so the button announces "Deep teal" rather than "#1F4E5F". */
const SW_NAMES: [string, string][] = [
  ["#000000", "Black"], ["#FFFFFF", "White"], ["#6E6E73", "Grey"], ["#B23B3B", "Red"], ["#C76A1A", "Burnt orange"], ["#FF8A2D", "Orange"],
  ["#E0B64A", "Gold"], ["#9C7A1E", "Ochre"], ["#2E7D4F", "Green"], ["#1F4E5F", "Deep teal"], ["#2F6DBD", "Blue"], ["#3B2F6E", "Indigo"],
  ["#6B3FA0", "Purple"], ["#A0446E", "Plum"], ["#121212", "Near black"],
];
function swatchName(hex: string) {
  const h = String(hex).replace("#", "");
  const to = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
  let best = "", bestD = Infinity;
  SW_NAMES.forEach(([hx, nm]) => {
    const q = hx.replace("#", "");
    const d = (to(h, 0) - to(q, 0)) ** 2 + (to(h, 2) - to(q, 2)) ** 2 + (to(h, 4) - to(q, 4)) ** 2;
    if (d < bestD) { bestD = d; best = nm; }
  });
  /* The hex stays in the name: it is the only way to tell two near neighbours apart by ear. */
  return best + " " + String(hex).toUpperCase();
}
/* What a colour <input> holds after being given a value: lower case, and black for anything it cannot read. */
const asColour = (v: string) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : "#000000");
const initialsOf = (name: string, none: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || none;

/* ── first-run onboarding ──────────────────────────────────────────
   Three steps, each satisfied by real content rather than by clicking through: "done" is derived from the saved record, not from
   a flag saying they visited. */
const SKIP_KEY = "synapse_brand_onboard_skipped";
const STEPS: { k: string; done: (b: any) => boolean }[] = [
  { k: "Name yourself", done: (b) => !!(b.name || "").trim() },
  { k: "Add a logo or colours", done: (b) => !!((b.logo_url || "").trim() || (b.brand_color || "").trim()) },
  { k: "Describe your voice", done: (b) => !!(b.brand_voice || "").trim() },
];
const isFirstRun = (b: any) => STEPS.some((s) => !s.done(b));
const tellBrandState = (on: boolean) => { W().SYN_BRAND_ONBOARDING = on; document.dispatchEvent(new Event("syn:brand-onboard")); };

const LOGO_SLOTS = {
  light: { url: "bkLogo", file: "bkLogoFile", prev: "bkLogoPrevLight", note: "bkLogoNote", idle: "PNG, JPG, WEBP or SVG · up to 2MB" },
  dark: { url: "bkLogoDark", file: "bkLogoDarkFile", prev: "bkLogoPrevDark", note: "bkLogoDarkNote", idle: "Optional, for dark creatives" },
} as const;
type Slot = keyof typeof LOGO_SLOTS;

/** An image that is swapped for something else when it will not load. Keyed by its address, so a new address tries again. */
function Img({ src, fallback = null }: { src: string; fallback?: React.ReactNode }) {
  const [bad, setBad] = useState(false);
  return bad ? <>{fallback}</> : <img src={src} alt="" onError={() => setBad(true)} />;
}

/* The kit's small parts. */
const None = ({ children }: { children: React.ReactNode }) => <span className="bk-none">{children}</span>;
const Link = ({ v, href }: { v: string; href: string }) => v ? <a className="bk-val" href={href || v} target="_blank" rel="noopener noreferrer">{v}</a> : <None>Not added</None>;
const Row = ({ lab, children, text }: { lab: string; children?: React.ReactNode; text?: string }) => (
  <div className="bk-row"><span className="bk-lab">{lab}</span>{text ? <span className="bk-val">{text}</span> : children}</div>
);

/* ── the specialties combobox ─────────────────────────────────── */
function Specialties({ chosen, setChosen }: { chosen: string[]; setChosen: (v: string[]) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const [boxOn, setBoxOn] = useState(false);
  const [hi, setHi] = useState(-1);
  const has = (v: string) => chosen.some((c) => norm(c) === norm(v));

  const q = norm(typed);
  let exact = false;
  const groups = SPECIALTY_GROUPS.map((grp) => ({ g: grp.g, hits: grp.items.filter((it) => !q || norm(it).indexOf(q) !== -1) })).filter((x) => x.hits.length);
  groups.forEach((x) => x.hits.forEach((it) => { if (norm(it) === q) exact = true; }));
  /* Typing something the list lacks offers it as a tap target, not only as "press Enter" -- a phone keyboard's Enter key is not
     an obvious way to confirm a choice. Last, so a partial match ("short" -> Short-lets) is what the eye lands on first. */
  const offerTyped = !!typed.trim() && !exact && !has(typed.trim());
  const values = [...groups.flatMap((x) => x.hits), ...(offerTyped ? [typed.trim()] : [])];

  const show = () => { setOpen(true); setHi(-1); };
  const shut = () => { setOpen(false); setHi(-1); };
  const add = (raw: string) => { setChosen(dedupe(chosen, split(raw))); setTyped(""); setHi(-1); };
  useEffect(() => { if (hi >= 0) menu.current?.querySelector(".amen-opt.hi")?.scrollIntoView({ block: "nearest" }); }, [hi]);
  useEffect(() => {
    /* The path, not contains(): a pick re-draws the option it clicked. */
    const away = (e: MouseEvent) => { if (host.current && e.composedPath().indexOf(host.current) !== -1) return; setBoxOn(false); shut(); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const keys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const move = (d: number, base: number) => { if (!values.length) return; setHi((base + d + values.length) % values.length); };
    if (e.key === "ArrowDown") { e.preventDefault(); if (!open) { setOpen(true); move(1, -1); } else move(1, hi); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); move(-1, hi); return; }
    if (e.key === "Escape") { shut(); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (hi >= 0 && values[hi] !== undefined) add(values[hi]);
      else if (typed.trim()) add(typed);
      return;
    }
    if (e.key === "Backspace" && !typed && chosen.length) { setChosen(chosen.slice(0, -1)); setHi(-1); }
  };
  /* mousedown, not click: the input would blur first and shut the menu. */
  const pick = (e: React.MouseEvent, v: string) => {
    e.preventDefault();
    setChosen(has(v) ? chosen.filter((c) => norm(c) !== norm(v)) : [...chosen, v]);
    setTyped(""); setHi(-1); input.current?.focus();
  };

  let k = -1;
  return (
    <div className="field amen" id="bkSpecHost" ref={host}
      onBlur={(e) => { if (host.current?.contains(e.relatedTarget as Node)) return; setBoxOn(false); shut(); }}>
      <label htmlFor="bkSpecIn">
        Specialties
      </label>
      <div className={"amen-box" + (boxOn ? " on" : "")} id="bkSpecBox" onClick={() => { input.current?.focus(); if (!open) show(); }}>
        {chosen.map((a) => (
          <span className="amen-chip" key={a}>
            {a}
            <button type="button" aria-label={"Remove " + a}
              onClick={(e) => { e.stopPropagation(); setChosen(chosen.filter((v) => v !== a)); setHi(-1); input.current?.focus(); }}>{"×"}</button>
          </span>
        ))}
        <input ref={input} id="bkSpecIn" className="amen-in" type="text" role="combobox" aria-expanded={open} aria-controls="bkSpecMenu" aria-autocomplete="list" autoComplete="off" placeholder={"Choose or type a specialty…"}
          value={typed} onFocus={() => { setBoxOn(true); show(); }} onChange={(e) => { setTyped(e.target.value); setOpen(true); setHi(-1); }} onKeyDown={keys} />
      </div>
      <div className={"amen-menu" + (open ? " on" : "")} id="bkSpecMenu" role="listbox" aria-label="Specialties" ref={menu}>
        {!values.length ? <div className="amen-none">Already added.</div> : null}
        {groups.map((grp) => (
          <Fragment key={grp.g}>
            <div className="amen-grp">{grp.g}</div>
            {grp.hits.map((it) => { k++; return (
              <div key={it} className={"amen-opt" + (k === hi ? " hi" : "")} role="option" data-v={it} aria-selected={has(it)} onMouseDown={(e) => pick(e, it)}>{it}</div>
            ); })}
          </Fragment>
        ))}
        {offerTyped ? (k++, (
          <div className={"amen-opt amen-add" + (k === hi ? " hi" : "")} role="option" data-v={typed.trim()} aria-selected={false} onMouseDown={(e) => pick(e, typed.trim())}>
            Add {"“"}{typed.trim()}{"”"}
          </div>
        )) : null}
      </div>
      <input type="hidden" id="bkSpecialties" value={chosen.join(", ")} readOnly />
    </div>
  );
}

export function BrandPage() {
  const scripts = usePageScripts();
  const [form, setForm] = useState<Form>(EMPTY);
  const [chosen, setChosen] = useState<string[]>([]);
  /* A colour input always reports a value, so "did they choose it?" can only be answered by `stored` (set from the record, or by
     a real choice) and `touched` (an actual interaction). An untouched default is never written back as their brand colour. */
  const [stored, setStored] = useState<Record<Colour, boolean>>({ bkColor: false, bkColor2: false });
  const touched = useRef(new Set<string>());
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [gate, setGate] = useState<string | null>(null);
  const [onboard, setOnboard] = useState<{ hidden: boolean; record: any }>({ hidden: true, record: {} });
  const [notes, setNotes] = useState<Record<Slot, { msg: string; err: boolean }>>({ light: { msg: LOGO_SLOTS.light.idle, err: false }, dark: { msg: LOGO_SLOTS.dark.idle, err: false } });
  const [uploading, setUploading] = useState<Record<Slot, boolean>>({ light: false, dark: false });
  const [saving, setSaving] = useState(false);
  const [filled, setFilled] = useState(0);   // each fill from the record starts the specialties box afresh
  const files = { light: useRef<HTMLInputElement>(null), dark: useRef<HTMLInputElement>(null) };
  const nameInput = useRef<HTMLInputElement>(null);

  const val = (id: FieldId) => (form[id] || "").trim();
  const set = (id: FieldId, v: string) => { touched.current.add(id); setForm((f) => ({ ...f, [id]: v })); };
  const note = (slot: Slot, msg: string | null, err = false) => setNotes((n) => ({ ...n, [slot]: { msg: msg || LOGO_SLOTS[slot].idle, err } }));

  function fill(b: any) {
    if (!b) return;
    setForm((f) => {
      const next = { ...f };
      (Object.keys(FIELDS) as (keyof typeof FIELDS)[]).forEach((id) => {
        const v = b[FIELDS[id]];
        if (id === "bkColor" || id === "bkColor2") { if (v) next[id] = asColour(v); }   // an absent colour keeps the picker where it is, unset
        else next[id] = v == null ? "" : v;
      });
      const s = b.social || {};
      next.bkInstagram = s.instagram || "";
      next.bkWebsite = s.website || "";
      return next;
    });
    setStored({ bkColor: !!b.brand_color, bkColor2: !!b.brand_color_secondary });
    setChosen(dedupe([], split(Array.isArray(b.specialties) ? b.specialties.join(", ") : (b.specialties || ""))));
    setFilled((n) => n + 1);
  }

  function collect() {
    const f = form;
    const patch: Record<string, any> = {};
    (Object.keys(FIELDS) as (keyof typeof FIELDS)[]).forEach((id) => {
      /* Skip colours the agency never actually chose: sending the default would record a decision they did not make. */
      if ((id === "bkColor" || id === "bkColor2") && !(touched.current.has(id) || stored[id])) return;
      patch[FIELDS[id]] = f[id].trim();
    });
    patch.specialties = chosen.join(", ").split(/[|,;\n]+/).map((x) => x.trim()).filter(Boolean);
    /* `social` is NOT NULL with a '{}' default, so sending null failed the whole update. Empty means an empty object. */
    const ig = f.bkInstagram.trim(), web = f.bkWebsite.trim();
    patch.social = (ig || web) ? { instagram: ig || null, website: web || null } : {};
    return patch;
  }

  function refreshOnboard(b: any) {
    const welcomed = new URLSearchParams(location.search).get("welcome") === "agency";
    let skipped = false;
    try { skipped = localStorage.getItem(SKIP_KEY) === "1"; } catch { /* private mode */ }
    const firstRun = isFirstRun(b);
    /* Shown while anything is genuinely missing, unless they dismissed it and did not just arrive from signup. */
    const hidden = !firstRun || (skipped && !welcomed);
    setOnboard({ hidden, record: b });
    tellBrandState(!hidden);
    /* ?welcome=agency is not the only route here: email confirmation loses it (the sign-in after the inbox lands on plain
       agency.html). The saved record already knows -- nothing set up means first run. */
    if (welcomed || (firstRun && !skipped)) W().goToPane?.("brand");
  }

  useEffect(() => {
    if (!scripts) return;
    const L = W().SynListings;
    if (!L) return;
    L.loadBrand().then((b: any) => {
      if (!b) { setGate("Sign in as an agency to set up your brand."); return; }
      fill(b);
      refreshOnboard(b);
      /* Land on the brand, not on the settings for it. */
      setMode("view");
    }).catch(() => {
      setGate("Could not load your brand details, check your connection and reload.");
      tellBrandState(false);
    });
  }, [scripts]);

  const editing = mode === "edit";
  useEffect(() => { if (editing) nameInput.current?.focus(); }, [editing]);

  const cancel = () => {
    /* Reload from storage rather than keeping half-typed edits: Cancel has to actually discard. */
    const L = W().SynListings;
    if (L && L.loadBrand) L.loadBrand().then((b: any) => { fill(b || {}); setMode("view"); }).catch(() => setMode("view"));
    else setMode("view");
  };

  const skip = () => {
    try { localStorage.setItem(SKIP_KEY, "1"); } catch { /* this visit only */ }
    setOnboard((o) => ({ ...o, hidden: true }));
    tellBrandState(false);
    toast("Skipped, your brand lives under Team → Brand whenever you want it");
  };

  const save = () => {
    setSaving(true);
    const patch = collect();
    W().SynListings.saveBrand(patch)
      .then(() => {
        setSaving(false);
        /* Re-derive the checklist from what was actually saved, so the last step ticking off is what ends onboarding. */
        refreshOnboard(patch);
        toast(isFirstRun(patch) ? "Saved, finish the remaining steps whenever you like" : "Brand saved, Tayo will use it from the next post");
      })
      .catch((e: any) => { setSaving(false); toast("Not saved: " + ((e && e.message) || e)); });
  };

  /* ── logo upload ──────────────────────────────────────────────────
     The file goes to storage at once and its public URL goes into the form, so Save persists it with everything else. A
     replacement deletes the file it replaced (best-effort: a storage hiccup never stops the new logo being saved). */
  const upload = (slot: Slot, file: File | undefined) => {
    if (!file) return;
    const key = LOGO_SLOTS[slot].url as FieldId;
    const previous = (form[key] || "").trim();
    setUploading((u) => ({ ...u, [slot]: true })); note(slot, "Uploading…");
    W().SynListings.uploadBrandAsset(file, slot)
      .then((url: string) => {
        setForm((f) => ({ ...f, [key]: url }));
        note(slot, "Uploaded, save to apply it everywhere");
        return W().SynListings.removeBrandAsset(previous);
      })
      .catch((e: any) => note(slot, (e && e.message) || "Upload failed", true))
      .then(() => setUploading((u) => ({ ...u, [slot]: false })));
  };
  const clearLogo = (slot: Slot) => {
    const key = LOGO_SLOTS[slot].url as FieldId;
    const previous = (form[key] || "").trim();
    setForm((f) => ({ ...f, [key]: "" }));
    note(slot, "Removed, save to apply");
    W().SynListings.removeBrandAsset(previous);
  };

  /* Copying a hex is the single most common thing anyone does with a brand page. */
  const copyHex = (hex: string) => {
    if (navigator.clipboard && hex) navigator.clipboard.writeText(hex).then(() => toast("Copied " + hex)).catch(() => toast(hex));
    else toast(hex);
  };

  /* ── derived, as the old preview() and renderKit() painted it ── */
  const name = val("bkName") || "Your agency";
  const tagline = val("bkTagline");
  const logo = val("bkLogo"), logoDark = val("bkLogoDark");
  const font = val("bkFont");
  const c1 = form.bkColor || COLOUR_DEFAULTS.bkColor, c2 = form.bkColor2 || COLOUR_DEFAULTS.bkColor2;
  const brandIsEmpty = !(["bkName", "bkTagline", "bkDesc", "bkLogo", "bkLogoDark", "bkVoice", "bkWebsite", "bkInstagram", "bkWhatsapp"] as FieldId[]).some((id) => val(id)) && !stored.bkColor;
  const ig = val("bkInstagram");
  const igHref = ig ? (/^https?:/i.test(ig) ? ig : "https://instagram.com/" + ig.replace(/^@/, "")) : "";
  const wa = val("bkWhatsapp");

  const kit = brandIsEmpty ? (
    <div className="bk-empty">
      <div className="h2">Your brand is not set up yet</div>
      <p className="muted" style={{ fontSize: "13.5px", maxWidth: "460px", margin: "0 auto 16px" }}>
        Your logo, colours and voice are what make Tayo{"’"}s captions sound like your agency instead of a generic listing site. It takes about two minutes.
      </p>
      <button className="btn btn-primary" type="button" data-bk-edit="" onClick={() => setMode("edit")}>Set up your brand</button>
    </div>
  ) : (
    <div className="bk-grid">
      <div className="bk-card">
        <div className="bk-k">Identity</div>
        <div className="bk-id">
          {logo ? <Img key={logo} src={logo} fallback={<div className="bk-mark" style={{ background: c1 }}>{initialsOf(name, "—")}</div>} />
            : <div className="bk-mark" style={{ background: c1 }}>{initialsOf(name, "—")}</div>}
          <div style={{ minWidth: 0 }}>
            <div className="bk-nm" style={font ? { fontFamily: font } : undefined}>{name}</div>
            <div className="bk-tag">{tagline ? tagline : <None>No tagline yet</None>}</div>
          </div>
        </div>
      </div>
      <div className="bk-card half"><div className="bk-k">Logo</div><div className="bk-logos">
        <div><div className="bk-logo light">{logo ? <img src={logo} alt="" /> : <span className="bk-none">No logo</span>}</div><div className="bk-cap">On light</div></div>
        <div><div className="bk-logo dark">{(logoDark || logo) ? <img src={logoDark || logo} alt="" /> : <span className="bk-none">No logo</span>}</div>
          <div className="bk-cap">{logoDark ? "On dark" : "On dark (same file)"}</div></div>
      </div></div>
      <div className="bk-card half"><div className="bk-k">Colours</div><div className="bk-colours">
        <button type="button" className="bk-swatch" data-copy={c1.toUpperCase()} onClick={() => copyHex(c1.toUpperCase())}>
          <i style={{ background: c1 }}></i>
          <span className="bk-hex">{stored.bkColor ? c1.toUpperCase() : "Not set"}</span>
          <span className="bk-role">Primary</span></button>
        <button type="button" className="bk-swatch" data-copy={c2.toUpperCase()} onClick={() => copyHex(c2.toUpperCase())}>
          <i style={{ background: c2 }}></i>
          <span className="bk-hex">{stored.bkColor2 ? c2.toUpperCase() : "Not set"}</span>
          <span className="bk-role">Accent</span></button>
      </div></div>
      <div className="bk-card half"><div className="bk-k">Typeface</div>
        {font ? (
          <>
            <div className="bk-type-name">{font}</div>
            <div className="bk-glyphs" style={{ fontFamily: font }}>Aa Bb Cc 123</div>
            <div className="bk-sample" style={{ fontFamily: font }}>{tagline || "A three-bedroom in Lekki, priced to move."}</div>
          </>
        ) : <None>No typeface chosen {"—"} captions use the default.</None>}
      </div>
      <div className="bk-card half"><div className="bk-k">Voice</div>
        {val("bkVoice") ? <div style={{ fontSize: "13.5px", lineHeight: 1.6 }}>{val("bkVoice")}</div> : <None>Not set {"—"} Tayo writes in a neutral voice.</None>}
      </div>
      <div className="bk-card half"><div className="bk-k">About</div>
        {val("bkDesc") ? <div style={{ fontSize: "13.5px", lineHeight: 1.6 }}>{val("bkDesc")}</div> : <None>No description yet.</None>}
      </div>
      <div className="bk-card"><div className="bk-k">Post templates</div></div>
      <div className="bk-card half"><div className="bk-k">Where to find you</div><div className="bk-rows">
        <Row lab="Website"><Link v={val("bkWebsite")} href={val("bkWebsite")} /></Row>
        <Row lab="Instagram">{ig ? <Link v={ig} href={igHref} /> : <None>Not added</None>}</Row>
        {wa ? <Row lab="WhatsApp" text={wa} /> : <Row lab="WhatsApp"><None>Not added</None></Row>}
        {val("bkCity") ? <Row lab="City" text={val("bkCity")} /> : <Row lab="City"><None>Not set</None></Row>}
      </div></div>
    </div>
  );

  const swatchCard = (id: Colour, label: string, aria: string) => {
    const chosenHere = stored[id];
    return (
      <div className={"swatch-card" + (chosenHere ? "" : " unset")}>
        <input id={id} type="color" aria-label={aria} value={form[id]}
          onChange={(e) => { set(id, e.target.value); setStored((s) => ({ ...s, [id]: true })); }} />
        <div className="sw-info">
          <span className="sw-name">{label}</span>
          <span className="sw-hex" id={id + "Hex"}>{chosenHere ? form[id].toUpperCase() : "Not set"}</span>
        </div>
        <div className="sw-presets" data-for={id}>
          {SWATCHES.map((c) => {
            const on = chosenHere && c.toLowerCase() === form[id].toLowerCase();
            return (
              /* Named, not just tinted: a hex in a `title` is not an accessible name. aria-pressed carries the selected state. */
              <button key={c} type="button" data-c={c} aria-pressed={on} aria-label={swatchName(c)} title={swatchName(c)} className={on ? "on" : undefined}
                style={{ ["--sw" as string]: c }} onClick={() => { setForm((f) => ({ ...f, [id]: asColour(c) })); setStored((s) => ({ ...s, [id]: true })); }}><i></i></button>
            );
          })}
        </div>
      </div>
    );
  };

  const logoTile = (slot: Slot, label: string) => {
    const S = LOGO_SLOTS[slot];
    const url = slot === "light" ? logo : logoDark;
    const shown = slot === "light" ? logo : (logoDark || logo);
    const dim = slot === "dark" ? { color: "rgba(255,255,255,0.4)" } : undefined;
    return (
      <div className={"logo-tile " + slot}>
        <div className="lt-preview" id={S.prev}>
          {shown ? <Img key={shown} src={shown} fallback={<span className="lt-empty" style={dim}>Couldn{"’"}t load that image</span>} />
            : <span className="lt-empty" style={dim}>No logo yet</span>}
        </div>
        <label>
          {label}
        </label>
        {" "}
        <input id={S.url} type="hidden" value={url} readOnly />
        {" "}
        <input id={S.file} ref={files[slot]} className="lt-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden
          onChange={(e) => { const file = e.target.files && e.target.files[0]; e.target.value = ""; upload(slot, file || undefined); }} />
        <div className="lt-acts">
          <button type="button" className="lt-btn" data-upload={slot} disabled={uploading[slot]} onClick={() => files[slot].current?.click()}>
            Upload
          </button>
          <button type="button" className="lt-btn lt-rm" data-clear={slot} hidden={!url} onClick={() => clearLogo(slot)}>
            Remove
          </button>
        </div>
        <div className={"lt-note" + (notes[slot].err ? " err" : "")} id={S.note}>
          {notes[slot].msg}
        </div>
      </div>
    );
  };

  const field = (id: FieldId, label: string, placeholder: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="field">
      <label htmlFor={id}>
        {label}
      </label>
      <input id={id} placeholder={placeholder} value={form[id]} onChange={(e) => set(id, e.target.value)} {...extra} />
    </div>
  );

  return (
    <>
      <div style={{ "display": "flex", "alignItems": "flex-end", "justifyContent": "space-between", "gap": "12px", "flexWrap": "wrap" }}>
        <div>
          <div className="eyebrow">
            Your identity
          </div>
          <div className="h1">
            Brand
          </div>
          <p className="muted" style={{ "fontSize": "14px", "marginTop": "4px" }}>
            Your logo, colours, voice and links. Tayo uses these when it writes and designs anything on your behalf.
          </p>
        </div>
        <div className="bk-actions">
          <button className="btn btn-primary" id="brandEdit" type="button" hidden={editing || !!gate} onClick={() => setMode("edit")}>
            Edit brand
          </button>
          <button className="btn" id="brandCancel" type="button" hidden={!editing} onClick={cancel}>
            Cancel
          </button>
          <button className="btn btn-primary" id="brandSave" hidden={!editing} disabled={saving || !!gate} data-busy={saving ? "true" : undefined} onClick={save}>
            {saving ? "Saving…" : "Save brand"}
          </button>
        </div>
      </div>
      <div className="card brand-onboard" id="brandOnboard" hidden={onboard.hidden}>
        <div className="bo-head">
          <div>
            <div className="eyebrow">
              Getting set up
            </div>
            <div className="h2" style={{ "margin": "2px 0 0" }}>
              Let’s set up your brand
            </div>
            <p className="muted" style={{ "fontSize": "13.5px", "marginTop": "4px" }}>
              Tayo writes captions, replies and ad creative for you. These details are what make that output sound like your agency instead of a generic listing site. It takes about two minutes, and you can change any of it later.
            </p>
          </div>
          <button className="btn btn-ghost" id="brandSkip" type="button" onClick={skip}>
            Skip for now
          </button>
        </div>
        <ol className="bo-steps" id="brandSteps">
          {STEPS.map((s) => { const ok = s.done(onboard.record); return (
            <li key={s.k} className={ok ? "done" : ""}><span className="tick">{ok ? "✓" : "·"}</span><span>{s.k}</span></li>
          ); })}
        </ol>
      </div>
      <div id="brandGate" className="noti-empty" style={{ "marginTop": "20px" }} hidden={!gate}>{gate}</div>
      <div id="brandView" style={{ "marginTop": "20px" }} hidden={editing || !!gate}>{kit}</div>
      <div id="brandForm" style={{ "marginTop": "20px" }} hidden={!editing || !!gate}>
        <div className="card brand-hero">
          <div className="bh-label">
            How Tayo introduces you
          </div>
          <div className="brand-preview" id="bkPreview" aria-live="polite">
            {logo ? <Img key={logo} src={logo} /> : null}
            <div className="bp-mark" style={{ background: c1 }}>{initialsOf(name, "-")}</div>
            <div className="bp-txt" style={{ minWidth: 0 }}>
              <div className="bp-nm" style={{ fontFamily: font || "inherit" }}>{name}</div>
              <div className="bp-tag">{tagline || "Your tagline appears here"}</div>
            </div>
            <span className="bp-chip" style={{ background: c2 }}>Accent</span>
          </div>
        </div>
        <div className="two" style={{ "marginTop": "16px", "alignItems": "start" }}>
          <div className="card" style={{ "padding": "20px 22px" }}>
            <div className="h2" style={{ "margin": "0 0 4px" }}>
              Identity
            </div>
            <p className="sub" style={{ "marginBottom": "14px" }}>
              How you are named and described.
            </p>
            <div className="field">
              <label htmlFor="bkName">
                Agency name
              </label>
              <input id="bkName" ref={nameInput} placeholder="Your registered trading name" value={form.bkName} onChange={(e) => set("bkName", e.target.value)} />
            </div>
            {field("bkTagline", "Tagline", "One line, what you want to be known for")}
            <div className="field">
              <label htmlFor="bkDesc">
                About
              </label>
              <textarea id="bkDesc" rows={4} placeholder="A short description buyers will read on your listings" value={form.bkDesc} onChange={(e) => set("bkDesc", e.target.value)} />
            </div>
            <Specialties key={filled} chosen={chosen} setChosen={setChosen} />
          </div>
          <div className="card" style={{ "padding": "20px 22px" }}>
            <div className="h2" style={{ "margin": "0 0 4px" }}>
              Look
            </div>
            <p className="sub" style={{ "marginBottom": "14px" }}>
              Used on your creatives and your public agency page.
            </p>
            <div className="look-logos">
              {logoTile("light", "Logo")}
              {logoTile("dark", "Dark background")}
            </div>
            <div className="swatch-row">
              {swatchCard("bkColor", "Primary", "Primary brand colour")}
              {swatchCard("bkColor2", "Secondary", "Secondary brand colour")}
            </div>
            {field("bkFont", "Typeface", "e.g. Josefin Sans")}
            {/* The typeface rendered large, at real size, rather than a name typed into a box with no visual feedback. */}
            <div className="type-specimen" id="bkSpecimen">
              <div className="ts-name" id="bkSpecimenName">
                {font || "Default"}
              </div>
              <div className="ts-glyphs" id="bkSpecimenGlyphs" style={{ fontFamily: font || "inherit" }}>
                Aa
              </div>
              <div className="ts-sample" id="bkSpecimenSample" style={{ fontFamily: font || "inherit" }}>
                {name !== "Your agency" ? name : "Your agency name in this typeface"}
              </div>
            </div>
          </div>
        </div>
        <div className="two" style={{ "marginTop": "16px", "alignItems": "start" }}>
          <div className="card" style={{ "padding": "20px 22px" }}>
            <div className="h2" style={{ "margin": "0 0 4px" }}>
              Voice
            </div>
            <p className="sub" style={{ "marginBottom": "14px" }}>
              Tayo writes captions and replies in this tone. Be specific, “warm and plain-spoken, never salesy” beats “professional”.
            </p>
            <div className="field">
              <label htmlFor="bkVoice">
                How you sound
              </label>
              <textarea id="bkVoice" rows={3} placeholder="Describe the voice you want in your own words" value={form.bkVoice} onChange={(e) => set("bkVoice", e.target.value)} />
            </div>
          </div>
          <div className="card" style={{ "padding": "20px 22px" }}>
            <div className="h2" style={{ "margin": "0 0 4px" }}>
              Reach
            </div>
            <p className="sub" style={{ "marginBottom": "14px" }}>
              Where buyers find you. Handles here label your posts; connecting an account for publishing is done in Social.
            </p>
            <div className="field">
              <label htmlFor="bkCac">
                CAC registration number
              </label>
              <input id="bkCac" placeholder="RC 1234567" autoComplete="off" value={form.bkCac} onChange={(e) => set("bkCac", e.target.value)} />
              <span className="bk-hint" style={{ "fontSize": "12px", "opacity": ".7" }}>
                Shown to buyers on your property cards so they can check you at the CAC registry.
              </span>
            </div>
            {field("bkWhatsapp", "WhatsApp number", "+234…")}
            {field("bkInstagram", "Instagram handle", "@youragency")}
            {field("bkWebsite", "Website", "https://…")}
            {field("bkCity", "City", "Lagos")}
          </div>
        </div>
      </div>
    </>
  );
}
