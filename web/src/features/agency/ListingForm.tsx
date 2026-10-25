"use client";
/**
 * The listing form and the new-listing wizard, as React (was listingForm() in src/legacy/agency/inline-3.js, about 1,800 lines
 * that wrote the form into the shared #drawer and then rearranged it into steps).
 *
 * It has its own drawer (#lfDrawer) beside #drawer, shares #scrim, and closes whenever inline-3's closeLead() runs
 * (`syn:drawer-close`). listingForm(l, idx, sd) survives there as a name and fires `syn:listing-form`: the grid, the overview,
 * the fast lane and ?add=1 all call it. The listings, the drafts (this browser's copy and the listing_drafts rows) and the save
 * helpers stay in inline-3, read through `window.SynLF`.
 *
 * NEW LISTING = THE WIZARD (Eden, 2026-10-11): six steps, 3 to 5 questions at a time, saved as a draft after every change and
 * when you leave, and the step you were on is remembered. Each step is checked when you press Next; Review lists anything still
 * missing with a button back to it. EDITING keeps the single form.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const X = () => W().SynLF;
const toast = (m: string) => W().toast?.(m);
const P = () => W().SynPlaces;
const str = (v: unknown) => (v == null ? "" : String(v));
const pick = (arr: string[], v: unknown) => (arr.indexOf(v as string) > -1 ? (v as string) : arr[0]);
const nairaFull = (v: number) => "₦" + (Number(v) || 0).toLocaleString("en-NG");
const PERIOD_OF: Record<string, string> = { sale: "total", rent: "per_year", shortlet: "per_night" };
const STAGES = ["completed", "under_construction", "not_started"];
const FURNISHED = ["", "unfurnished", "semi", "fully"];
const BANDS = ["", "A", "B", "C", "D", "E"];
const CONDITIONS = ["", "brand_new", "excellent", "good", "fair", "needs_work"];

type Args = { l: any; idx: number; sd?: any };
type F = Record<string, string>;
type Init = { isNew: boolean; idx: number; l: any; d: any; draft: any; F: F; amen: string[]; photos: string[]; branded: Record<string, any>; active: boolean; step: number };

/* Errors and the field each belongs to. e_lat is shared by the two hidden coordinates. */
const ERR_OF: Record<string, string> = {
  lfTitle: "e_title", lfDesc: "e_desc", lfAddr: "e_addr", lfCity: "e_city", lfState: "e_state", lfPrice: "e_price", lfBeds: "e_beds",
  lfImg: "e_img", lfLat: "e_lat", lfLng: "e_lat", lfUnits: "e_units",
};
/* Typing in, or leaving, one of these is what lets its message show. An empty form should not open shouting. */
const TOUCH_ON = ["lfTitle", "lfDesc", "lfAddr", "lfCity", "lfState", "lfPrice", "lfBeds", "lfImg", "lfUnits"];

const STEPS = [
  { id: "home", t: "The home", errs: ["e_title", "e_desc"] },
  { id: "where", t: "Where", errs: ["e_addr", "e_city", "e_state", "e_lat"] },
  { id: "details", t: "Details", errs: ["e_units", "e_beds"] },
  { id: "price", t: "Price & terms", errs: ["e_price"] },
  { id: "photos", t: "Photos", errs: ["e_img"] },
  { id: "review", t: "Review", errs: [] as string[] },
];

/* What a new or edited form opens with. Run in the event handler, not in render: it moves the server draft pointer (SD.cur). */
function buildInit({ l, idx, sd }: Args): Init {
  const x = X(), C = x.C, isNew = idx === -1, SD = x.SD();
  /* A new listing opens on the one left unsaved, if there is one. A draft opened from the shelf (`sd`) is the server's copy and
     carries the step it was left on. */
  const draft = isNew
    ? (sd ? { data: sd.data || {}, floor: sd.floor || null, at: Date.parse(sd.updated_at) || Date.now(), step: sd.step } : x.readDraft())
    : null;
  if (isNew) SD.cur = sd ? sd.id : (SD.cur && SD.list.some((r: any) => r.id === SD.cur) && x.readDraft() ? SD.cur : null);
  if (draft) l = Object.assign({}, l, draft.data);
  const d = isNew ? Object.assign(x.blankListing(), draft ? draft.data : {}) : l;
  const fl = (draft && draft.floor) || {};
  const f: F = {
    lfTitle: str(d.title), lfType: pick(C.PROP_TYPES, d.property_type),
    lfDeal: pick(C.DEAL_STRUCTURES, d.deal_structure || ({ rent: "rent", shortlet: "shortlet" } as any)[d.listing_type] || "outright"),
    lfListing: pick(C.LISTING_TYPES, d.listing_type), lfDesc: str(d.description),
    lfUnits: str(d.units_available || 1), lfStage: pick(STAGES, d.build_stage), lfHandover: str(d.handover_date).slice(0, 7),
    lfProgress: str(d.build_progress_pct), lfPlan: d.payment_plan === "instalments" ? "instalments" : "outright",
    lfDeposit: str(d.deposit_pct), lfMonths: str(d.instalment_months), lfPlots: str(d.plot_count), lfPlotSize: str(d.plot_size_sqm),
    lfMinInv: str(d.min_investment), lfTerm: str(d.investment_term_months), lfReturn: str(d.stated_return_pct),
    /* Canonicalised, or an existing "Oyo state" listing opens with an empty select and is saved back with no state. */
    lfAddr: str(d.address), lfState: P() ? P().canonicalState(d.state || "") : "", lfCity: str(d.city), lfHood: str(d.neighbourhood),
    lfCountry: "Nigeria", lfLat: str(d.latitude), lfLng: str(d.longitude),
    lfBeds: str(d.bedrooms), lfBaths: str(d.bathrooms), lfToilets: str(d.toilets), lfParking: str(d.parking_spaces),
    lfArea: str(d.area_sqm), lfYear: str(d.year_built), lfFurnished: pick(FURNISHED, d.furnished || ""),
    lfBand: pick(BANDS, d.electricity_band || ""), lfCondition: pick(CONDITIONS, d.property_condition || ""),
    lfPrice: str(d.price), lfPeriod: pick(C.PRICE_PERIODS, d.price_period), lfMoveIn: str(d.move_in_cost), lfService: str(d.service_charge),
    lfAgencyFee: str(d.agency_fee), lfLegalFee: str(d.legal_fee),
    lfFloor: isNew ? str(fl.raw) : "", lfFloorActive: isNew && fl.active === "off" ? "off" : "on",
    lfTitleType: pick([""].concat(C.TITLE_TYPES), d.title_type || ""), lfYield: str(d.yield_pct), lfImg: "",
  };
  if (f.lfDeal === "off_plan" && f.lfStage === "completed") f.lfStage = "not_started";
  /* Seeded the way the save splits them, so a listing written before the chips existed opens as chips. */
  const amen = (d.amenities || []).join(", ").split(/[|,;\n]+/).map((v: string) => v.trim()).filter(Boolean);
  let photos: string[] = (l.media || []).map((m: any) => m && m.url).filter(Boolean);
  /* The branded copies, keyed by the original url, alongside rather than inside `photos`. */
  const branded: Record<string, any> = {};
  (l.media || []).forEach((m: any) => {
    if (m && m.url && m.branded_url) branded[m.url] = { id: m.id, branded_url: m.branded_url, branded_price: m.branded_price, branded_verified: m.branded_verified };
  });
  if (!photos.length && String(l.img || "").trim()) photos = [String(l.img).trim()];
  f.lfImg = photos[0] || "";
  return { isNew, idx, l, d, draft, F: f, amen, photos, branded, active: !!d.is_active, step: Math.min(Math.max((draft && draft.step) || 1, 1), STEPS.length) - 1 };
}

/* One change and everything it implies, so typing, picking from a list and "fill from my description" all agree. */
function applyChange(f: F, id: string, v: string): F {
  const C = X().C, n: F = { ...f, [id]: v };
  if (id === "lfListing") n.lfPeriod = PERIOD_OF[v] || "total";
  if (id === "lfDeal") { const lt = C.DEAL_TO_LISTING[v] || "sale"; if (n.lfListing !== lt) { n.lfListing = lt; n.lfPeriod = PERIOD_OF[lt] || "total"; } }
  if (["lfDeal", "lfType", "lfStage", "lfPlan"].indexOf(id) > -1 && n.lfDeal === "off_plan" && n.lfStage === "completed") n.lfStage = "not_started";
  const SP = P();
  if (SP && id === "lfState") {
    /* A city that does not belong to the newly chosen state is now wrong: that is how a Lagos listing ends up in Oyo. */
    if (v && n.lfCity && SP.citiesIn(v).indexOf(n.lfCity) === -1 && SP.stateOf(n.lfCity)) { n.lfCity = ""; n.lfHood = ""; }
  }
  if (SP && id === "lfCity") {
    /* Plenty of people think of the town first: choosing a city we recognise fills the state in, if it is empty. */
    const st = SP.stateOf(v.trim()); if (st && !n.lfState) n.lfState = st;
  }
  return n;
}

/* Image links. This only ever tested /^https?:\/\//, and a Google share redirect saved cleanly and rendered as nothing. Two
   gates: this one rejects the shapes that cannot be images; the probe actually loads the URL. */
const IMG_SHORTENERS = /^(share\.google|goo\.gl|maps\.app\.goo\.gl|bit\.ly|tinyurl\.com|t\.co|lnkd\.in|rb\.gy)$/i;
function imgUrlError(v: string, probe: Record<string, string>) {
  if (!v) return "A direct image link (https://…)";
  let u: URL;
  try { u = new URL(v); } catch { return "That is not a valid URL"; }
  if (!/^https?:$/.test(u.protocol)) return "Must start with http:// or https://";
  if (IMG_SHORTENERS.test(u.hostname)) return "That is a share link, not an image. Open it, right-click the photo, and copy the image address.";
  if (probe[v] === "bad") return "That link did not load as an image";
  return "";
}
function checksOf(f: F, probe: Record<string, string>): Record<string, string> {
  const isLand = ["land", "commercial"].indexOf(f.lfType) > -1;
  return {
    e_title: f.lfTitle.trim().length >= 6 ? "" : "At least 6 characters",
    e_desc: f.lfDesc.trim().length >= 30 ? "" : "Describe the property (30+ characters)",
    e_addr: f.lfAddr.trim() ? "" : "Required",
    e_city: f.lfCity.trim() ? "" : "Required",
    e_state: f.lfState.trim() ? "" : "Required",
    e_price: parseFloat(f.lfPrice) > 0 ? "" : "Enter a price in naira",
    e_beds: isLand || (f.lfBeds !== "" && +f.lfBeds >= 0) ? "" : "Required",
    e_img: imgUrlError(f.lfImg.trim(), probe),
    e_lat: f.lfLat.trim() && f.lfLng.trim() ? "" : "Place the pin: tap the map where the property is",
    e_units: +f.lfUnits >= 1 ? "" : "At least 1",
  };
}

/* What the form says, in the shape the save writes. Shared by the save and the draft, so a restored draft is exactly what Save
   would have sent. */
function collect(f: F, amen: string[], photos: string[], branded: Record<string, any>, active: boolean) {
  const num = (v: string) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const int = (v: string) => (v === "" ? null : parseInt(v, 10));
  const deal = f.lfDeal, isLand = f.lfType === "land";
  const rentish = ["rent", "shortlet", "lease"].indexOf(deal) > -1;
  const inv = ["joint_venture", "development_financing"].indexOf(deal) > -1;
  const st = f.lfStage, inst = !rentish && f.lfPlan === "instalments";
  return {
    title: f.lfTitle.trim(), description: f.lfDesc.trim(), property_type: f.lfType, listing_type: f.lfListing,
    price: num(f.lfPrice), price_period: f.lfPeriod, move_in_cost: num(f.lfMoveIn), service_charge: num(f.lfService),
    /* num() returns null for '', which is what keeps "not stated" and "no fee" apart all the way to the card. */
    agency_fee: num(f.lfAgencyFee), legal_fee: num(f.lfLegalFee),
    address: f.lfAddr.trim(), city: f.lfCity.trim(), state: f.lfState.trim(), country: f.lfCountry,
    neighbourhood: f.lfHood.trim(), latitude: num(f.lfLat), longitude: num(f.lfLng),
    bedrooms: int(f.lfBeds), bathrooms: int(f.lfBaths), area_sqm: num(f.lfArea), toilets: int(f.lfToilets),
    parking_spaces: int(f.lfParking), year_built: int(f.lfYear),
    /* '' is "not stated", and an empty enum string is not a value Postgres will take, so it goes as null. */
    furnished: f.lfFurnished || null, property_condition: f.lfCondition || null, electricity_band: f.lfBand || null,
    amenities: amen.map((s) => s.trim()).filter(Boolean),
    title_type: f.lfTitleType || null, yield_pct: num(f.lfYield),
    deal_structure: deal,
    build_stage: isLand ? null : st,
    handover_date: !isLand && st !== "completed" && /^\d{4}-\d{2}$/.test(f.lfHandover) ? f.lfHandover + "-01" : null,
    build_progress_pct: !isLand && st === "under_construction" ? int(f.lfProgress) : null,
    payment_plan: rentish ? null : f.lfPlan,
    deposit_pct: inst ? num(f.lfDeposit) : null,
    instalment_months: inst ? int(f.lfMonths) : null,
    units_available: Math.max(1, parseInt(f.lfUnits, 10) || 1),
    plot_count: isLand ? num(f.lfPlots) : null,
    plot_size_sqm: isLand ? num(f.lfPlotSize) : null,
    min_investment: inv ? num(f.lfMinInv) : null,
    investment_term_months: inv ? int(f.lfTerm) : null,
    stated_return_pct: inv ? num(f.lfReturn) : null,
    is_active: active,
    /* Every photo, in gallery order, each carrying its branded copy back onto the row it belongs to. */
    media: photos.map((u, i) => Object.assign({ url: u, is_primary: i === 0, display_order: i }, branded[u] || {})),
  };
}

/* ── the map pin, from the address ──
   Nigerian OSM holds streets but almost no house numbers, and many streets not at all, while areas resolve. So the ladder goes
   address, street (house number stripped), area, city, and each rung says which one it landed on, so nobody mistakes an area
   centroid for a surveyed address. */
const HOUSE_NO = /^\s*(?:(?:no|number|nos|house|flat|plot|suite|apt|apartment|block)\s*\.?\s*)?\d+\s*[a-z]?\s*(?:[,/-]\s*|\s+)/i;
function geoLadder(addr: string, hood: string, city: string, state: string) {
  const A = addr.trim(), H = hood.trim(), Cc = city.trim(), S = state.trim();
  const near = H && A.toLowerCase().indexOf(H.toLowerCase()) < 0 ? [H] : [];
  const tail = [Cc, S, "Nigeria"].filter(Boolean);
  const rungs: { q: string[]; how: string }[] = [];
  if (A) rungs.push({ q: [A].concat(near, tail), how: "address" });
  const street = A.replace(HOUSE_NO, "").trim();
  if (street && street !== A && /[a-z]/i.test(street)) rungs.push({ q: [street].concat(near, tail), how: "street" });
  if (H) rungs.push({ q: [H].concat(tail), how: "area" });
  if (Cc) rungs.push({ q: tail, how: "city" });
  return rungs;
}
const GEO_SAYS: Record<string, (w: string) => string> = {
  address: () => "Map pin found from the address.",
  street: () => "Map pin found from the street, house numbers are not mapped in Nigeria.",
  area: (w) => "That street is not on the map, so the pin sits on " + w + ". Good enough to show the area; edit the pin if you need it exact.",
  city: (w) => "Pinned to " + w + " only. Add the area above to place it closer.",
};

/* Grouped so the dropdown reads as a checklist of the questions buyers ask, in the order they ask them. Power and water first:
   in Lagos and Ibadan they decide a viewing. */
const AMENITY_GROUPS = [
  { g: "Power", items: ["24/7 power", "Backup generator", "Solar power", "Inverter and batteries", "Prepaid meter", "Dedicated transformer"] },
  { g: "Water", items: ["Borehole", "Constant water supply", "Water treatment plant", "Overhead tank"] },
  { g: "Security", items: ["24/7 security", "Gated estate", "Security post", "CCTV surveillance", "Electric fence", "Perimeter fence", "Intercom",
    "Access control", "Burglary proof", "Fire alarm", "Smoke detectors", "Fire extinguisher"] },
  { g: "Parking and access", items: ["Car park", "Covered parking", "Visitor parking", "Ample parking space", "Elevator", "Wheelchair access",
    "Tarred road access", "Good drainage", "Street lights"] },
  { g: "Inside", items: ["Air conditioning", "Fitted kitchen", "Fitted wardrobes", "POP ceiling", "All rooms ensuite", "Guest toilet",
    "Walk-in closet", "Store room", "Laundry room", "Study or home office", "Balcony", "Terrace", "Furnished", "Serviced apartment",
    "Water heater", "Ceiling fans"] },
  { g: "Leisure", items: ["Swimming pool", "Gym", "Children's playground", "Garden", "Lawn", "Barbecue area", "Clubhouse", "Tennis court",
    "Basketball court", "Cinema room", "Games room", "Rooftop terrace", "Jacuzzi", "Sauna", "Bar"] },
  { g: "Staff and service", items: ["Boys' quarters (BQ)", "Domestic staff quarters", "Gatehouse", "Facility management",
    "Estate maintenance", "Waste disposal", "Cleaning service", "Concierge"] },
  { g: "Connectivity", items: ["Fibre internet", "WiFi", "Satellite TV", "Cable TV"] },
  { g: "Setting", items: ["Waterfront", "Sea view", "City view", "Corner piece", "Close to main road", "Pet friendly", "Newly built"] },
];

/* Agents write everything in one paragraph. listing-extract returns only what the text states; each filled box is marked so the
   agent checks it before saving. */
const FILL_TO: Record<string, string> = {
  property_type: "lfType", deal_structure: "lfDeal", build_stage: "lfStage", payment_plan: "lfPlan",
  handover_date: "lfHandover", build_progress_pct: "lfProgress", deposit_pct: "lfDeposit", instalment_months: "lfMonths",
  units_available: "lfUnits", price: "lfPrice", price_period: "lfPeriod", bedrooms: "lfBeds", bathrooms: "lfBaths",
  toilets: "lfToilets", parking_spaces: "lfParking", area_sqm: "lfArea", plot_count: "lfPlots", plot_size_sqm: "lfPlotSize",
  title_type: "lfTitleType", furnished: "lfFurnished", service_charge: "lfService", agency_fee: "lfAgencyFee",
  legal_fee: "lfLegalFee", min_investment: "lfMinInv", investment_term_months: "lfTerm", stated_return_pct: "lfReturn",
  address: "lfAddr",
};
function selectOptions(id: string): string[] | null {
  const C = X().C;
  return ({ lfType: C.PROP_TYPES, lfDeal: C.DEAL_STRUCTURES, lfStage: STAGES, lfPlan: ["outright", "instalments"], lfPeriod: C.PRICE_PERIODS,
    lfTitleType: [""].concat(C.TITLE_TYPES), lfFurnished: FURNISHED } as Record<string, string[]>)[id] || null;
}

let formSeq = 0;
export function ListingFormHost() {
  const [s, setS] = useState<{ open: boolean; key: number; init: Init | null }>({ open: false, key: 0, init: null });
  useEffect(() => {
    const open = (e: Event) => {
      if (!X()) return;
      const a = (e as CustomEvent).detail as Args;
      W().closeLead?.();   // whatever the shared drawer held goes away
      document.getElementById("scrim")?.classList.add("on");
      setS({ open: true, key: ++formSeq, init: buildInit(a) });
    };
    const close = () => setS((v) => (v.open ? { ...v, open: false } : v));
    window.addEventListener("syn:listing-form", open);
    window.addEventListener("syn:drawer-close", close);
    return () => { window.removeEventListener("syn:listing-form", open); window.removeEventListener("syn:drawer-close", close); };
  }, []);
  return (
    <aside className={"drawer" + (s.open ? " on" : "")} id="lfDrawer">
      {s.init ? <ListingForm key={s.key} init={s.init} open={s.open} /> : null}
    </aside>
  );
}

function ListingForm({ init, open }: { init: Init; open: boolean }) {
  const { isNew, idx, l, d, draft } = init;
  const [f, setF] = useState<F>(init.F);
  const [amen, setAmen] = useState<string[]>(init.amen);
  const [photos, setPhotos] = useState<string[]>(init.photos);
  const [branded, setBranded] = useState<Record<string, any>>(init.branded);
  const [active, setActive] = useState(init.active);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [revealAll, setRevealAll] = useState(false);
  const [probe, setProbe] = useState<Record<string, string>>(() => (init.photos[0] ? { [init.photos[0]]: "ok" } : {}));
  const [geoNote, setGeoNote] = useState("The map pin is found from the address. Tap the map to move it.");
  const [hereLabel, setHereLabel] = useState("I’m at the property: use my location");
  const [filled, setFilled] = useState<Record<string, boolean>>({});
  const [filling, setFilling] = useState(false);
  const [fillNote, setFillNote] = useState("Paste or type everything you know, then press this: the price, rooms, units, payment terms and more go into their boxes for you to check.");
  const [floorErr, setFloorErr] = useState("");
  const [galNote, setGalNote] = useState<{ msg: string; bad: boolean } | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [prev, setPrev] = useState<{ url: string; note: string; err: boolean }>(() => ({ url: init.photos[0] || "", note: "", err: false }));
  const [pickLabel, setPickLabel] = useState("Choose files");
  const [uploading, setUploading] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [at, setAt] = useState(init.step);

  const probeRef = useRef(probe);
  const fRef = useRef(f), photosRef = useRef(photos), stateRef = useRef({ amen, branded, active, at });
  const done = useRef(false);
  useEffect(() => { fRef.current = f; photosRef.current = photos; stateRef.current = { amen, branded, active, at }; probeRef.current = probe; });

  const checks = checksOf(f, probe);
  const ok = !Object.values(checks).some(Boolean);
  const shown = (e: string) => ((revealAll || touched[e]) ? checks[e] : "");
  const touch = (...errs: string[]) => setTouched((t) => { const n = { ...t }; errs.forEach((e) => { n[e] = true; }); return n; });
  const set = (id: string, v: string) => setF((p) => applyChange(p, id, v));
  const drawerEl = () => document.getElementById("lfDrawer");

  const doProbe = (v: string) => {
    if (!v || probeRef.current[v]) return;
    probeRef.current = { ...probeRef.current, [v]: "pending" };
    setProbe((p) => ({ ...p, [v]: "pending" }));
    const im = new Image();
    im.onload = () => setProbe((p) => ({ ...p, [v]: "ok" }));
    im.onerror = () => setProbe((p) => ({ ...p, [v]: "bad" }));
    im.referrerPolicy = "no-referrer";
    im.src = v;
  };
  /* `photos` is the ordered truth; #lfImg mirrors the first one because validation and the save read a cover URL from it. */
  const setGallery = (next: string[]) => {
    setPhotos(next);
    setF((p) => ({ ...p, lfImg: next[0] || "" }));
    if (next.length) setProbe((p) => ({ ...p, [next[0]]: "ok" }));
  };

  /* ── the draft (a new listing only) ── */
  const snapshot = useCallback((immediate: boolean) => {
    if (done.current || !isNew) return;
    const x = X(), S = stateRef.current, cur = fRef.current;
    const data = collect(cur, S.amen, photosRef.current, S.branded, S.active);
    const fl = { raw: cur.lfFloor.trim(), active: cur.lfFloorActive };
    /* Nothing typed is nothing to keep: opening the form and closing it must not leave an empty draft on the Listings page. */
    if (!data.title && !data.description && !data.address && data.price == null && !(data.media || []).length && !fl.raw) return;
    const first = !x.readDraft();
    x.sdQueue(data, fl, S.at + 1, immediate === true);
    if (!x.writeDraft(data, fl)) return;
    setDraftNote("Kept on this device as you type, close this and it will be here when you come back.");
    if (first) x.renderListings();
  }, [isNew]);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (!isNew || done.current) return;
    const t = setTimeout(() => snapshot(false), 600);
    return () => clearTimeout(t);
  }, [f, amen, photos, branded, active, at, isNew, snapshot]);
  /* A reload, a closed tab or a closed drawer: the debounce may be holding the last few keystrokes. */
  useEffect(() => {
    if (!isNew) { X().setFlush(null); return; }
    if (open) { X().setFlush(() => snapshot(true)); return; }
    snapshot(true); X().setFlush(null);
  }, [open, isNew, snapshot]);

  /* ── the pin map ── */
  const mapEl = useRef<HTMLDivElement>(null), map = useRef<any>(null), marker = useRef<any>(null);
  const setPin = useCallback((la: number, lo: number, how: string) => {
    setF((p) => ({ ...p, lfLat: Number(la).toFixed(6), lfLng: Number(lo).toFixed(6) }));
    touch("e_lat");
    setGeoNote(how === "here" ? "Pinned where you are standing. Drag it if that is not the property." : "Pin placed. Drag it, or tap the map again, to adjust.");
  }, []);
  useEffect(() => {
    const L = W().L, el = mapEl.current;
    if (!el || !L) return;
    const m = L.map(el, { zoomControl: true }).setView([9.06, 7.49], 6);
    if (W().SynTiles && W().SynTiles.add) W().SynTiles.add(m);
    else L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(m);
    m.on("click", (e: any) => setPin(e.latlng.lat, e.latlng.lng, "tap"));
    map.current = m;
    const t = setTimeout(() => { if (map.current) { map.current.invalidateSize(); } }, 350);
    return () => { clearTimeout(t); m.remove(); map.current = null; marker.current = null; };
  }, [setPin]);
  useEffect(() => {
    const m = map.current, L = W().L;
    if (!m || !L) return;
    const la = parseFloat(f.lfLat), lo = parseFloat(f.lfLng);
    if (!isFinite(la) || !isFinite(lo)) return;
    if (!marker.current) {
      marker.current = L.marker([la, lo], { draggable: true }).addTo(m);
      marker.current.on("dragend", () => { const p = marker.current.getLatLng(); setPin(p.lat, p.lng, "moved"); });
    } else marker.current.setLatLng([la, lo]);
    m.setView([la, lo], Math.max(m.getZoom(), 15));
  }, [f.lfLat, f.lfLng, setPin]);
  const pinHere = () => {
    if (!navigator.geolocation) { toast("This browser cannot share its location. Tap the map instead."); return; }
    setHereLabel("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setHereLabel("I’m at the property: use my location"); setPin(p.coords.latitude, p.coords.longitude, "here"); },
      () => { setHereLabel("I’m at the property: use my location"); toast("Location not shared. Tap the map where the property is instead."); },
      { enableHighAccuracy: true, timeout: 12000 });
  };

  /* Runs when the address, area, city or state is left, one ladder of requests, never one per keystroke. Failure costs only the
     pin and never blocks the save. A slow first rung must never land after a later edit started its own ladder. */
  const geo = useRef({ key: "", run: 0 });
  const findPin = (vals?: F) => {
    const v = vals || fRef.current;
    const addr = v.lfAddr.trim(), hood = v.lfHood.trim(), city = v.lfCity.trim(), state = v.lfState.trim();
    if (!addr || !city) return;
    const key = [addr, hood, city, state].join("|").toLowerCase();
    if (key === geo.current.key) return;
    geo.current.key = key;
    setGeoNote("Finding the map pin…");
    const run = ++geo.current.run;
    const rungs = geoLadder(addr, hood, city, state);
    const wait = () => new Promise((r) => setTimeout(r, 1100));   // Nominatim asks for one request a second; paid only on a miss
    const ask = (i: number): Promise<any> => {
      if (run !== geo.current.run || i >= rungs.length) return Promise.resolve(null);
      const r = rungs[i];
      return fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q=" + encodeURIComponent(r.q.join(", ")))
        .then((res) => (res.ok ? res.json() : []))
        .then((rows) => {
          const hit = Array.isArray(rows) && rows[0];
          if (hit && hit.lat != null && hit.lon != null) return { hit, how: r.how, said: r.q[0] };
          return wait().then(() => ask(i + 1));
        })
        .catch(() => wait().then(() => ask(i + 1)));
    };
    ask(0).then((found) => {
      if (run !== geo.current.run) return;
      if (!found) {
        /* A pin placed by hand is kept: the lookup missing the street says nothing about where they put it. */
        const c = fRef.current;
        setGeoNote(c.lfLat && c.lfLng ? "That address is not on the map, so your pin stays where it is." : "That address is not on the map. Tap the map below where the property is.");
        return;
      }
      setF((p) => ({ ...p, lfLat: Number(found.hit.lat).toFixed(6), lfLng: Number(found.hit.lon).toFixed(6) }));
      setGeoNote(GEO_SAYS[found.how](found.said));
    });
  };

  const findPinRef = useRef(findPin);
  useEffect(() => { findPinRef.current = findPin; });
  useEffect(() => {
    const go = () => findPinRef.current();
    window.addEventListener("lf:geo", go);
    return () => window.removeEventListener("lf:geo", go);
  }, []);

  /* ── fill from the description ── */
  const fill = () => {
    const desc = fRef.current.lfDesc.trim();
    if (desc.length < 20) { toast("Write or paste the description first."); return; }
    setFilling(true);
    const SB = W().SynSB || {};
    (typeof W().authToken === "function" ? W().authToken() : Promise.resolve(null)).then((token: string | null) => {
      if (!token) throw new Error("Sign in again to use this.");
      return fetch(SB.url + "/functions/v1/listing-extract", {
        method: "POST", headers: { "Content-Type": "application/json", apikey: SB.key, Authorization: "Bearer " + token },
        body: JSON.stringify({ title: fRef.current.lfTitle, description: desc }),
      }).then((r) => r.json().catch(() => ({})).then((dd: any) => ({ ok: r.ok, d: dd })));
    }).then(({ ok, d: dd }: any) => {
      setFilling(false);
      if (!ok || !dd.fields) throw new Error(dd.error || "Could not read the description just now.");
      const fl = dd.fields;
      let cur = fRef.current, n = 0;
      const hit: string[] = [];
      Object.keys(FILL_TO).forEach((k) => {
        if (fl[k] == null || fl[k] === "") return;
        const id = FILL_TO[k];
        if (k === "address" && cur.lfAddr.trim()) return;      // never overwrite a typed address
        const v = k === "handover_date" ? String(fl[k]).slice(0, 7) : String(fl[k]);
        const opts = selectOptions(id);
        if (opts && opts.indexOf(v) === -1) return;
        cur = applyChange(cur, id, v); hit.push(id); n++;
      });
      /* No title in the text: make a plain one from what was read, e.g. "4-bed Duplex in Bodija, Ibadan". */
      if (!cur.lfTitle.trim()) {
        const beds = parseInt(cur.lfBeds, 10);
        const tl = fl.property_type ? (X().C.TYPE_LABEL[cur.lfType] || "") : "";
        const area = String(cur.lfAddr || "").split(",")[0].replace(/^\s*(?:plot|block|flat|house|no\.?)?\s*\d+[a-z]?\s*/i, "").trim();
        const city = cur.lfCity.trim();
        const place = [area, city].filter((x2, i, arr) => x2 && arr.findIndex((y) => y.toLowerCase() === x2.toLowerCase()) === i).join(", ");
        const t = [beds > 0 ? beds + "-bed" : "", tl].filter(Boolean).join(" ") + (place ? " in " + place : "");
        if (t.length > 6) { cur = { ...cur, lfTitle: t }; hit.push("lfTitle"); n++; }
      }
      setF(cur);
      touch(...hit.filter((id) => TOUCH_ON.indexOf(id) > -1 && ERR_OF[id]).map((id) => ERR_OF[id]));
      const mark: Record<string, boolean> = {}; hit.forEach((id) => { mark[id] = true; });
      setFilled(mark);
      setTimeout(() => setFilled({}), 6000);
      if (hit.indexOf("lfAddr") > -1) findPin(cur);
      setFillNote(n ? "Filled " + n + " box" + (n > 1 ? "es" : "") + " from your description (highlighted). Check them before saving."
        : "Nothing in the description could go into a box. Fill them in below.");
      /* After "Fill", land on the first step that still needs something; the rest is already done. */
      if (isNew) {
        const c = checksOf(cur, probeRef.current);
        const k = STEPS.findIndex((st) => st.errs.some((e) => c[e]));
        setTimeout(() => show(k < 0 ? STEPS.length - 1 : k), 900);
      }
    }).catch((err: any) => { setFilling(false); toast(err && err.message ? err.message : "Could not read the description just now."); });
  };

  /* ── photos ── */
  const isVid = (u: string) => (W().SynListings && W().SynListings.isVideoUrl ? W().SynListings.isVideoUrl(u) : /\.(mp4|mov|m4v|qt)(\?|#|$)/i.test(String(u || "")));
  const fileEl = useRef<HTMLInputElement>(null), dz = useRef<HTMLDivElement>(null);
  const upload = (files: File[]) => {
    if (!files.length) return;
    const SL = W().SynListings;
    if (!SL || !SL.uploadPropertyPhotos) { setGalNote({ msg: "Uploads are unavailable on this page.", bad: true }); return; }
    setUploading(true);
    setGalNote({ msg: "Uploading " + files.length + " " + (files.length === 1 ? "file" : "files") + "…", bad: false });
    /* DRAWN WITH WHAT IS ON SCREEN: the price this listing is about to have. Verification is not the agency's to type, so it
       comes from the saved row. */
    const B = W().BRAND;
    const brandOpts = B && String(B.logo_url || "").trim()
      ? { logoUrl: B.logo_url, price: Number(fRef.current.lfPrice) || 0, verified: (l && l.verification_status) === "verified" } : null;
    SL.uploadPropertyPhotos(files, (dn: number, total: number, name: string) => {
      setPickLabel(dn >= total ? "Finishing…" : "Uploading " + (dn + 1) + " of " + total + "…");
      if (name) setGalNote({ msg: "Uploading " + (dn + 1) + " of " + total + ", " + name, bad: false });
    }, brandOpts).then(({ urls, items, failed }: any) => {
      const add: Record<string, any> = {};
      (items || []).forEach((it: any) => { if (it && it.branded_url) add[it.url] = it; });
      setBranded((b) => ({ ...b, ...add }));
      /* Appended, not replaced: an agency adding three more photos to six has not asked to lose the six. */
      setGallery(photosRef.current.concat(urls));
      const why = (failed || []).map((x2: any) => x2.name + " (" + x2.reason + ")").join(", ");
      if (failed.length && urls.length) setGalNote({ msg: urls.length + " added. " + failed.length + " could not be used: " + why, bad: true });
      else if (failed.length) setGalNote({ msg: "None of those could be used: " + why, bad: true });
      else setGalNote({ msg: urls.length + " " + (urls.length === 1 ? "file" : "files") + " added.", bad: false });
    }).catch((err: any) => setGalNote({ msg: (err && err.message) || "That upload did not go through.", bad: true }))
      .finally(() => { setUploading(false); setPickLabel("Choose files"); if (fileEl.current) fileEl.current.value = ""; });
  };
  const uploadRef = useRef(upload);
  useEffect(() => { uploadRef.current = upload; });
  /* THE MAGNETIC DROP ZONE: the page-wide half (magneticDrop in inline-3) hands dropped files to `__take`; they go through the
     same upload as the picker, so there is one route and one set of checks. */
  useEffect(() => {
    const z = dz.current as any; if (!z) return;
    const OKT = /^(image\/(png|jpeg|webp|avif)|video\/(mp4|quicktime))$/;
    z.__take = (list: FileList) => {
      const ok2 = Array.prototype.slice.call(list || []).filter((x2: File) => OKT.test(x2.type));
      if (!ok2.length) { setGalNote({ msg: "Those are not photos or videos we can use. Try JPG, PNG, WebP, MP4 or MOV.", bad: true }); return; }
      uploadRef.current(ok2);
    };
    return () => { delete z.__take; };
  }, []);

  /* When the price moves, the photographs say so: the mark is drawn once at upload. Compared here with the same formatter. */
  const nairaNow = () => {
    const v = Number(f.lfPrice) || 0;
    if (!(v > 0)) return "";
    return v >= 1000000 ? "₦" + (v / 1000000).toFixed(1) + "m" : "₦" + v.toLocaleString("en-NG");
  };
  const verifiedNow = (l && l.verification_status) === "verified";
  const stale = photos.filter((u) => { const b = branded[u]; return !!(b && b.branded_url && b.id) && ((b.branded_price || "") !== nairaNow() || !!b.branded_verified !== verifiedNow); });
  const redraw = () => {
    const SL = W().SynListings, B = W().BRAND;
    if (!stale.length || !SL || !SL.redrawBrandedMedia) return;
    if (!B || !String(B.logo_url || "").trim()) { setGalNote({ msg: "Add your logo under Brand first — there is nothing to draw.", bad: true }); return; }
    setRedrawing(true);
    const opts = { logoUrl: B.logo_url, price: Number(fRef.current.lfPrice) || 0, verified: verifiedNow };
    let failed = 0;
    const list = stale.slice();
    /* One at a time: a photograph that fails keeps its old mark and is counted rather than taking the others with it. */
    list.reduce((chain: Promise<any>, u) => chain.then(() => {
      const b = stateRef.current.branded[u];
      return SL.redrawBrandedMedia(b.id, u, opts).then((res: any) => {
        if (!res) { failed++; return; }
        setBranded((m) => ({ ...m, [u]: { id: b.id, branded_url: res.url, branded_price: res.price, branded_verified: res.verified } }));
      });
    }), Promise.resolve()).then(() => {
      setRedrawing(false);
      setGalNote(failed ? { msg: (list.length - failed) + " redrawn, " + failed + " could not be.", bad: true } : { msg: "Redrawn with the current price.", bad: false });
    });
  };
  /* A pasted link is another photo, not a replacement for the set: it becomes the cover, the rest keep their order behind it. */
  const urlBlur = () => {
    const v = fRef.current.lfImg.trim();
    touch("e_img");
    doProbe(v);
    if (v && photosRef.current[0] !== v && !imgUrlError(v, probeRef.current)) {
      setGallery([v].concat(photosRef.current.filter((u) => u !== v)));
      setGalNote({ msg: "Link added as the cover.", bad: false });
    }
    if (!v) { setPrev({ url: "", note: "", err: false }); return; }
    const err = imgUrlError(v, probeRef.current);
    setPrev(err ? { url: "", note: err, err: true } : { url: v, note: "", err: false });
  };

  /* ── the floor ── a separate table with its own permissions, read and written on its own. */
  useEffect(() => {
    if (isNew || !d.id || !W().SynListings || !W().SynListings.getNegotiationFloor) return;
    let gone = false;
    W().SynListings.getNegotiationFloor(d.id).then((row: any) => {
      if (gone || !row) return;
      setF((p) => ({ ...p, lfFloor: row.floor_amount == null ? "" : String(Number(row.floor_amount)), lfFloorActive: row.is_active === false ? "off" : "on" }));
    });
    return () => { gone = true; };
  }, [isNew, d.id]);
  const readFloor = () => {
    const raw = fRef.current.lfFloor.trim();
    if (raw === "") return null;
    const amount = parseFloat(raw);
    if (!isFinite(amount) || amount <= 0) return { error: "A floor has to be a positive amount" } as const;
    return { amount, active: fRef.current.lfFloorActive !== "off" };
  };
  const saveFloor = (id: string, fl: any) => {
    if (!fl || fl.error || !id || !W().SynListings) return;
    W().SynListings.setNegotiationFloor(id, fl.amount, fl.active)
      .then(() => toast(fl.active ? "Tayo will not go below ₦" + fl.amount.toLocaleString() : "Tayo will not negotiate this listing"))
      .catch((e: any) => toast((e && e.message) || "The floor was not saved"));
  };
  /* THE SERVER IS ASKED TO PLACE anything still without a pin the moment it is posted (geocode-listings only fills coordinates
     that are NULL, so it never moves a hand-placed pin). Never awaited, never fatal. */
  const ensurePin = (id: string, data: any) => {
    const x = X();
    if (!id || !x.dbBacked()) return;
    if (data && data.latitude != null && data.longitude != null) return;
    if (!data || !data.address) return;
    const SB = W().SynSB || {};
    W().authToken().then((t: string | null) => {
      if (!t) return;
      return fetch(SB.url + "/functions/v1/geocode-listings", {
        method: "POST", headers: { apikey: SB.key, Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      }).then((r) => (r.ok ? r.json() : null));
    }).then((out: any) => {
      const hit = out && Array.isArray(out.results) && out.results[0];
      if (!hit || !hit.placed) return;
      const row = (x.listings() || []).find((r: any) => r && r.id === id);
      if (row) { row.latitude = hit.lat; row.longitude = hit.lon; }
      x.announce();
    }).catch(() => { /* the pin is a bonus; the listing is the work */ });
  };

  const close = () => W().closeLead?.();
  const scrollToErr = () => requestAnimationFrame(() => {
    const first = document.querySelector("#lfDrawer .lf .ferr[style*=\"block\"]");
    if (first) first.closest(".field")?.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  const save = () => {
    const x = X();
    const floor = readFloor();
    if (floor && "error" in floor) {
      setFloorErr(floor.error || "");
      document.getElementById("lfFloor")?.closest(".field")?.scrollIntoView({ block: "center", behavior: "smooth" });
      toast(floor.error || "");
      return;
    }
    if (!ok) { setRevealAll(true); scrollToErr(); toast("Fill in the required fields (*) first"); return; }
    const data = collect(f, amen, photos, branded, active);
    const LD = x.listings();
    if (isNew) {
      /* The draft steps aside while the create is in flight and comes back if it fails: a refused save must not cost the agent
         the listing they just finished typing. */
      done.current = true; x.setFlush(null);
      const kept = { data, floor: { raw: f.lfFloor.trim(), active: f.lfFloorActive } };
      const sdId = x.SD().cur;
      x.clearDraft();
      const item = x.deriveLegacy(Object.assign(x.blankListing(), data, { verification_status: "unverified", leads: 0, days: 0 }));
      LD.unshift(item);
      if (x.dbBacked()) {
        toast("Saving…");
        W().SynListings.create(data).then((id: string) => {
          item.id = id;
          if (sdId) x.sdDelete(sdId);                 // finished: the draft has become a listing
          toast("Listing created, saved, and unverified until the desk checks it");
          saveFloor(id, floor);                       // the floor needs the listing's id, so it follows the create
          ensurePin(id, data);
          x.announce();
        }).catch((e: any) => {
          const k = LD.indexOf(item);
          if (k >= 0) LD.splice(k, 1);
          x.writeDraft(kept.data, kept.floor);
          x.SD().cur = sdId; x.sdQueue(kept.data, kept.floor, STEPS.length, true);
          x.saveListings(); x.renderListings();
          toast("Not saved to the server: " + ((e && e.message) || e) + ", kept as a draft in Listings");
        });
      } else toast("Listing created here only, sign in as an agency to save it");
    } else {
      Object.assign(LD[idx], data);                   // verification_status left untouched (system-owned)
      x.deriveLegacy(LD[idx]);
      const id = LD[idx].id;
      if (x.dbBacked() && id) {
        toast("Saving…");
        W().SynListings.update(id, data)
          .then(() => { toast("Listing updated"); x.announce(); ensurePin(id, data); })
          .catch((e: any) => toast("Not saved to the server: " + ((e && e.message) || e)));
        saveFloor(id, floor);
      } else toast(x.dbBacked() ? "Updated here only, this listing has no server record" : "Listing updated");
    }
    x.saveListings(); x.renderListings(); close();
  };
  const del = () => {
    const x = X(), LD = x.listings(), gone = LD[idx];
    LD.splice(idx, 1); x.saveListings(); x.renderListings(); close();
    if (x.dbBacked() && gone && gone.id) {
      W().SynListings.remove(gone.id).then(() => toast("Listing deleted"))
        .catch((e: any) => toast("Removed here, but the server still has it: " + ((e && e.message) || e)));
    } else toast("Listing deleted");
  };
  const startBlank = () => {
    if (!window.confirm("Start a blank listing? The one you had not saved will be discarded.")) return;
    const x = X();
    done.current = true; x.setFlush(null);
    const gone = x.SD().cur; x.SD().cur = null; if (gone) x.sdDelete(gone);
    x.clearDraft(); x.renderListings();
    W().listingForm({ st: "pending" }, -1);
  };

  /* ── the wizard ── */
  const firstShow = useRef(true);
  const show = (i: number) => setAt(Math.min(Math.max(i, 0), STEPS.length - 1));
  useLayoutEffect(() => {
    if (!isNew) return;
    if (firstShow.current) { firstShow.current = false; return; }
    const dr = drawerEl(); if (dr) dr.scrollTop = 0;
    const page = document.querySelector("#lfDrawer .wz-step[data-wz=\"" + STEPS[at].id + "\"]") as HTMLElement | null;
    if (page) {
      const fld = page.querySelector("input:not([type=hidden]):not([type=checkbox]),textarea,select") as HTMLElement | null;
      if (fld && !matchMedia("(max-width:720px)").matches) fld.focus({ preventScroll: true });
      if (W().SynIcons?.hydrate) W().SynIcons.hydrate(page);
    }
    if (STEPS[at].id === "where" && map.current) setTimeout(() => { if (map.current) map.current.invalidateSize(); }, 60);
  }, [at, isNew]);
  const checkStep = (i: number) => {
    touch(...STEPS[i].errs);
    const c = checksOf(fRef.current, probeRef.current);
    const bad = STEPS[i].errs.filter((e) => c[e]);
    if (!bad.length) return true;
    requestAnimationFrame(() => { const el = document.getElementById(bad[0]); el?.closest(".field")?.scrollIntoView({ block: "center", behavior: "smooth" }); });
    toast(c[bad[0]] || "Finish this step first");
    return false;
  };
  /* Backwards is always free; forwards only once everything before it passes. */
  const goTo = (to: number) => {
    if (to <= at) { show(to); return; }
    for (let k = at; k < to; k++) { if (!checkStep(k)) { show(k); return; } }
    show(to);
  };
  const flushNow = () => { if (isNew) snapshot(true); };

  /* ── pieces ── */
  const C = X().C;
  const err = (id: string) => { const m = shown(id); return <span className="ferr" id={id} role="alert" style={{ display: m ? "block" : "none" }}>{m}</span>; };
  const aria = (fid: string) => { const e = ERR_OF[fid]; return e && shown(e) ? { "aria-invalid": true as const, "aria-describedby": e } : {}; };
  const cls = (id: string, base?: string) => [base, filled[id] ? "lf-filled" : ""].filter(Boolean).join(" ") || undefined;
  function onFieldChange(e: { target: { id: string; value: string } }) {
    const id = e.target.id;
    set(id, e.target.value);
    if (TOUCH_ON.indexOf(id) > -1 && ERR_OF[id]) touch(ERR_OF[id]);
  }
  function onFieldBlur(e: { target: { id: string } }) {
    const id = e.target.id;
    if (TOUCH_ON.indexOf(id) > -1 && ERR_OF[id] && id !== "lfUnits") touch(ERR_OF[id]);
    /* Through an event: the pin lookup reads the form as it is now, which only an effect may hold on to. */
    if (["lfAddr", "lfHood", "lfCity", "lfState"].indexOf(id) > -1) window.dispatchEvent(new Event("lf:geo"));
  }
  const onField = (id: string) => ({ id, value: f[id], className: cls(id), ...aria(id), onChange: onFieldChange, onBlur: onFieldBlur });
  const opts = (arr: string[], lbl: Record<string, string>) => arr.map((v) => <option key={v} value={v}>{lbl[v] || v}</option>);
  const isLand = ["land", "commercial"].indexOf(f.lfType) > -1;
  const deal = f.lfDeal, rentish = ["rent", "shortlet", "lease"].indexOf(deal) > -1;
  const vis = (on: boolean) => ({ display: on ? undefined : "none" });
  const showStage = f.lfType !== "land", priceV = parseFloat(f.lfPrice);
  const SP = P();
  const cityItems: string[] = SP ? (f.lfState ? SP.citiesIn(f.lfState) : SP.allCities()) : [];
  const knownAreas = (city: string) => ((X().listings() || []) as any[]).filter((r) => (r.city || "") === city).map((r) => String(r.neighbourhood || "").trim()).filter(Boolean);
  const hoodItems: string[] = SP ? SP.areasIn(f.lfCity.trim(), knownAreas(f.lfCity.trim())) : [];
  const hoodHint = !SP ? "" : hoodItems.length ? hoodItems.length + " areas in " + f.lfCity.trim() + ", start typing, or enter your own."
    : (f.lfCity.trim() ? "Type the area, we have no list for " + f.lfCity.trim() + " yet." : "");
  const vLabel = d.verification_status === "verified" ? "✓ Verified" : d.verification_status === "in_progress" ? "◷ In progress" : "Unverified · enters the 7-check queue";

  const descField = (
    <div className="field"><label>Description *</label>
      <textarea {...onField("lfDesc")} rows={3} placeholder="Condition, layout, neighbourhood, what's included…"></textarea>{err("e_desc")}
      {!isNew ? fillBits() : null}
    </div>
  );
  function fillBits() {
    return (
      <>
        <button type="button" className="lf-fill" id="lfFill" disabled={filling} onClick={fill}>{filling ? "Reading your description…" : "Fill the form from my description"}</button>
        <span className="lf-hint" id="lfFillNote">{fillNote}</span>
      </>
    );
  }
  const basics = (
    <fieldset className="lf-sec"><legend>Basics</legend>
      {isNew ? <>
        <p className="wz-fast"><b>Fastest way to start:</b> paste the text you would send on WhatsApp below and press <b>Fill</b>. Synapse reads it and fills the rest for you to check.</p>
        {descField}{fillBits()}
      </> : null}
      <div className="field"><label>Title *</label><input {...onField("lfTitle")} placeholder="3-Bed Apartment, Lekki Phase 1" />{err("e_title")}</div>
      <div className="row2">
        <div className="field"><label>Property type *</label><select {...onField("lfType")}>{opts(C.PROP_TYPES, C.TYPE_LABEL)}</select></div>
        <div className="field"><label>The deal *</label><select {...onField("lfDeal")}>{opts(C.DEAL_STRUCTURES, C.DEAL_STRUCTURE_LABEL)}</select>
          <select id="lfListing" hidden aria-hidden="true" tabIndex={-1} value={f.lfListing} onChange={(e) => set("lfListing", e.target.value)}>{opts(C.LISTING_TYPES, C.DEAL_LABEL)}</select></div>
      </div>
      {!isNew ? descField : null}
    </fieldset>
  );
  /* THE DEAL (Eden, 2026-10-02): rows that apply to the deal chosen, and nothing else. */
  const dealSec = (
    <fieldset className="lf-sec" id="lfDealSec"><legend>The deal</legend>
      <div className="row2">
        <div className="field"><label>Units available *</label><input {...onField("lfUnits")} type="number" inputMode="numeric" min="1" max="10000" /><span className="lf-hint">Identical units or plots on this listing.</span>{err("e_units")}</div>
        <div className="field" data-deal-row="stage" style={vis(showStage)}><label>Is it built?</label>
          <select {...onField("lfStage")}>
            <option value="completed">Completed, ready now</option>
            <option value="under_construction">Under construction</option>
            <option value="not_started">Not started yet (off-plan)</option>
          </select></div>
      </div>
      <div className="row2" data-deal-row="build" style={vis(showStage && f.lfStage !== "completed")}>
        <div className="field"><label>Expected handover</label><input {...onField("lfHandover")} type="month" /></div>
        <div className="field" style={vis(f.lfStage === "under_construction")}><label>Built so far (%)</label><input {...onField("lfProgress")} type="number" inputMode="numeric" min="0" max="100" placeholder="40" /></div>
      </div>
      <div className="row2" data-deal-row="pay" style={vis(!rentish)}>
        <div className="field"><label>Payment</label>
          <select {...onField("lfPlan")}><option value="outright">Outright</option><option value="instalments">Instalments allowed</option></select></div>
        <div className="field" data-deal-row="inst" style={vis(!rentish && f.lfPlan === "instalments")}><label>Initial deposit (%)</label><input {...onField("lfDeposit")} type="number" inputMode="decimal" min="0" max="100" placeholder="30" /></div>
      </div>
      <div className="row2" data-deal-row="inst" style={vis(!rentish && f.lfPlan === "instalments")}>
        <div className="field"><label>Spread over (months)</label><input {...onField("lfMonths")} type="number" inputMode="numeric" min="1" max="240" placeholder="12" /></div>
        <div></div>
      </div>
      <div className="row2" data-deal-row="land" style={vis(f.lfType === "land")}>
        <div className="field"><label>Number of plots</label><input {...onField("lfPlots")} type="number" inputMode="decimal" min="0" step="any" placeholder="1" /></div>
        <div className="field"><label>Size of one plot (sqm)</label><input {...onField("lfPlotSize")} type="number" inputMode="decimal" min="0" step="any" placeholder="600" /></div>
      </div>
      <div data-deal-row="invest" style={vis(["joint_venture", "development_financing"].indexOf(deal) > -1)}>
        <div className="row2">
          <div className="field"><label>Minimum investment (₦)</label><input {...onField("lfMinInv")} type="number" inputMode="numeric" min="0" /></div>
          <div className="field"><label>Term (months)</label><input {...onField("lfTerm")} type="number" inputMode="numeric" min="1" max="600" placeholder="24" /></div>
        </div>
        <div className="field"><label>Return you state (% over the term)</label><input {...onField("lfReturn")} type="number" inputMode="decimal" min="0" step="any" /><span className="lf-hint">Shown to buyers as stated by your agency. Synapse does not forecast returns.</span></div>
      </div>
    </fieldset>
  );
  /* State first, because it decides the other two: a real select (36 states and the FCT). City and area stay free text with a
     suggestion list: blocking a listing in a town we forgot is worse than an inconsistent spelling. THE PIN IS REQUIRED. */
  const location = (
    <fieldset className="lf-sec"><legend>Location</legend>
      <div className="field"><label>Address *</label><input {...onField("lfAddr")} placeholder="Street / estate" />{err("e_addr")}</div>
      <div className="row2">
        <div className="field"><label>State *</label>
          <select {...onField("lfState")}><option value="">- Select a state -</option>{(SP ? SP.STATES : []).map((st: string) => <option key={st} value={st}>{st}</option>)}</select>
          {err("e_state")}</div>
        <div className="field"><label>City *</label>
          <Combo wrapId="lfCityCombo" inputId="lfCity" value={f.lfCity} items={cityItems} placeholder="Start typing or tap…" toggleLabel="Show cities"
            extra={{ ...aria("lfCity"), className: cls("lfCity") }} onChange={(v) => { set("lfCity", v); touch("e_city"); }} onBlur={() => { touch("e_city"); findPin(); }} />
          {err("e_city")}</div>
      </div>
      <div className="row2">
        <div className="field"><label>Neighbourhood</label>
          <Combo wrapId="lfHoodCombo" inputId="lfHood" value={f.lfHood} items={hoodItems} placeholder="Start typing or tap…" toggleLabel="Show areas" maxLength={40}
            onChange={(v) => set("lfHood", v)} onBlur={() => findPin()} />
          <div className="lf-hint" id="lfHoodHint">{hoodHint}</div></div>
        <div className="field"><label>Country *</label><select id="lfCountry" value="Nigeria" onChange={() => {}}><option>Nigeria</option></select></div>
      </div>
      <input type="hidden" id="lfLat" value={f.lfLat} {...aria("lfLat")} />
      <input type="hidden" id="lfLng" value={f.lfLng} {...aria("lfLng")} />
      {err("e_lat")}
      <p className="lf-hint" id="lfGeoNote">{geoNote}</p>
      <div className="lf-pinmap" id="lfPinMap" ref={mapEl} aria-label="Map: tap to place the listing's pin"></div>
      <button type="button" className="lf-linkbtn" id="lfHere" onClick={pinHere}>{hereLabel}</button>
    </fieldset>
  );
  const specs = (
    <fieldset className="lf-sec"><legend>Specifications</legend>
      <div className="row2">
        <div className="field"><label id="lbBeds">{isLand ? "Bedrooms" : "Bedrooms *"}</label><input {...onField("lfBeds")} type="number" inputMode="numeric" min="0" max="20" placeholder="3" />{err("e_beds")}</div>
        <div className="field"><label>Bathrooms</label><input {...onField("lfBaths")} type="number" inputMode="numeric" min="0" max="20" placeholder="3" /></div>
      </div>
      <div className="row2">
        <div className="field"><label>Toilets</label><input {...onField("lfToilets")} type="number" inputMode="numeric" min="0" max="20" placeholder="4" /></div>
        <div className="field"><label>Parking spaces</label><input {...onField("lfParking")} type="number" inputMode="numeric" min="0" max="50" placeholder="2" /></div>
      </div>
      <div className="field"><label>Area (sqm)</label><input {...onField("lfArea")} type="number" inputMode="decimal" min="0" step="any" placeholder="220" /></div>
      <div className="row2">
        <div className="field"><label>Year built</label><input {...onField("lfYear")} type="number" inputMode="numeric" min="1900" max="2100" placeholder="2021" /></div>
        <div className="field"><label>Furnishing</label>
          <select {...onField("lfFurnished")}><option value="">Not stated</option><option value="unfurnished">Unfurnished</option><option value="semi">Semi-furnished</option><option value="fully">Fully furnished</option></select></div>
      </div>
      {/* Bands are a NERC commitment, not an opinion about the area; nothing is preselected, guessing one would invent a commitment. */}
      <div className="field"><label>Electricity band</label>
        <select {...onField("lfBand")}>
          <option value="">Not stated</option><option value="A">Band A · 20+ hrs/day</option><option value="B">Band B · 16+ hrs/day</option>
          <option value="C">Band C · 12+ hrs/day</option><option value="D">Band D · 8+ hrs/day</option><option value="E">Band E · 4+ hrs/day</option>
        </select></div>
      <div className="field"><label>Condition</label>
        <select {...onField("lfCondition")}>
          <option value="">Not stated</option><option value="brand_new">Brand new</option><option value="excellent">Excellent</option>
          <option value="good">Good</option><option value="fair">Fair</option><option value="needs_work">Needs work</option>
        </select></div>
      <Amenities chosen={amen} setChosen={setAmen} />
    </fieldset>
  );
  const pricing = (
    <fieldset className="lf-sec"><legend>Pricing</legend>
      <div className="row2">
        <div className="field"><label>Price (₦) *</label><input {...onField("lfPrice")} type="number" inputMode="numeric" min="1" placeholder="165000000" />{err("e_price")}
          <span className="lf-echo" id="priceEcho">{priceV > 0 ? "= " + nairaFull(priceV) + " (" + (W().SynNaira ? W().SynNaira(priceV) : "") + ")" : ""}</span></div>
        <div className="field"><label>Price period *</label><select {...onField("lfPeriod")}>{opts(C.PRICE_PERIODS, C.PERIOD_LABEL)}</select></div>
      </div>
      <div className="row2">
        <div className="field"><label>Move-in cost (₦)</label><input {...onField("lfMoveIn")} type="number" inputMode="numeric" min="0" placeholder="optional" /></div>
        <div className="field"><label>Service charge (₦/yr)</label><input {...onField("lfService")} type="number" inputMode="numeric" min="0" placeholder="optional" /></div>
      </div>
      {/* Blank and zero are different answers: blank is "not stated", zero is "no fee". Never in social captions. */}
      <div className="row2">
        <div className="field"><label>Agency fee (₦)</label><input {...onField("lfAgencyFee")} type="number" inputMode="numeric" min="0" placeholder="optional" /></div>
        <div className="field"><label>Legal fee (₦)</label><input {...onField("lfLegalFee")} type="number" inputMode="numeric" min="0" placeholder="optional" /></div>
      </div>
      <p className="lf-hint">Shown to buyers in the cost breakdown on the listing page. Left blank, the listing says the fee has not been stated. Never used in social captions.</p>
    </fieldset>
  );
  /* What Tayo may agree to: a fact about the listing, never shown or sent to a buyer. */
  const negotiation = (
    <fieldset className="lf-sec"><legend>Negotiation</legend>
      <div className="row2">
        <div className="field"><label>Tayo&#39;s floor (₦)</label>
          <input id="lfFloor" type="number" inputMode="numeric" min="1" placeholder="No floor set" value={f.lfFloor} onChange={(e) => { setF((p) => ({ ...p, lfFloor: e.target.value })); setFloorErr(""); }} />
          <span className="ferr" id="e_floor" role="alert" style={{ display: floorErr ? "block" : "none" }}>{floorErr}</span></div>
        <div className="field"><label>Negotiation</label>
          <select id="lfFloorActive" value={f.lfFloorActive} onChange={(e) => setF((p) => ({ ...p, lfFloorActive: e.target.value }))}>
            <option value="on">Tayo may negotiate down to the floor</option>
            <option value="off">Tayo may not negotiate this listing</option>
          </select></div>
      </div>
      <p className="muted" style={{ fontSize: "11.5px", margin: "2px 0 0" }}>
        The lowest Tayo will agree to. An offer under it stops the negotiation and messages the assigned agent instead. Buyers never see this figure. Only an owner or admin can set it.
      </p>
    </fieldset>
  );
  const toggleActive = () => setActive((a) => !a);
  const trust = (
    <fieldset className="lf-sec"><legend>Trust &amp; documents</legend>
      <div className="row2">
        <div className="field"><label>Title document</label><select {...onField("lfTitleType")}><option value="">- Select -</option>{opts(C.TITLE_TYPES, C.TITLE_LABEL)}</select></div>
        <div className="field"><label>Gross yield (%)</label><input {...onField("lfYield")} type="number" inputMode="decimal" min="0" max="100" step="any" placeholder="optional" /></div>
      </div>
      <div className="lf-ro"><span className="k">Verification</span><span className="v">{vLabel}</span></div>
      <label className="lf-toggle"><span>Listing active (visible to buyers)</span>
        <span className={"sw" + (active ? " on" : "")} id="lfActive" role="switch" aria-checked={active} tabIndex={0}
          onClick={toggleActive} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleActive(); } }}></span></label>
    </fieldset>
  );
  const media = (
    <fieldset className="lf-sec"><legend>Media</legend>
      <div className="field">
        <label>Photos of the property *</label>
        <div className="mdz" id="lfDz" ref={dz} role="group" aria-label="Add photos or video" onClick={(e) => { if (!(e.target as HTMLElement).closest("button")) fileEl.current?.click(); }}>
          <span className="mdz-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg></span>
          <span className="mdz-t">
            <b className="rest rest-fine">Drag photos or video here</b>
            <b className="rest rest-touch">Add photos or video</b>
            <b className="wake">Drop them here</b>
            <b className="hot-t">Let go to add them</b>
            <small>JPG, PNG, WebP, MP4 or MOV. As many as you like.</small>
          </span>
          <button type="button" className="btn-ghost" id="lfImgPick" disabled={uploading} onClick={() => fileEl.current?.click()}>{pickLabel}</button>
        </div>
        <div className="lfimg-row">
          {/* mp4 and quicktime and no webm, matching the upload gate and the bucket: Meta will not ingest webm. */}
          <input id="lfImgFile" ref={fileEl} type="file" multiple accept="image/png,image/jpeg,image/webp,image/avif,video/mp4,video/quicktime" hidden
            onChange={(e) => upload(Array.prototype.slice.call(e.target.files || []))} />
          <span className="lfimg-or">or paste a link</span>
        </div>
        <input id="lfImg" value={f.lfImg} placeholder="https://… (a direct link to the image itself)" {...aria("lfImg")}
          onChange={(e) => { setF((p) => ({ ...p, lfImg: e.target.value })); touch("e_img"); }} onBlur={urlBlur} />
        {stale.length ? (
          <div className="lf-brandnote"><span>
            {stale.length === 1 ? "One photo still shows " : stale.length + " photos still show "}<b>{(branded[stale[0]] || {}).branded_price || "no price"}</b>
            {((branded[stale[0]] || {}).branded_price || "no price") !== (nairaNow() || "no price") ? <>{" — this listing is now "}<b>{nairaNow() || "no price"}</b>.</> : "."}
            {" They go out on social as they are."}</span>
            <button type="button" className="cmp-ch-btn" id="lfRedraw" disabled={redrawing} onClick={redraw}>{redrawing ? "Redrawing…" : "Redraw " + (stale.length === 1 ? "it" : "them")}</button>
          </div>
        ) : null}
        {/* The gallery, in the order buyers will see it. First is the cover, which is why it says so on the tile. */}
        <div className="lf-gal" id="lfGal">
          {photos.map((u, i) => (
            <div key={u + i} className={"lf-ph" + (isVid(u) ? " is-vid" : "") + (pending[u] ? " pending" : "")} data-i={i}>
              {isVid(u)
                ? <><video src={u} muted playsInline preload="metadata" onError={() => setPending((p) => ({ ...p, [u]: true }))}></video><span className="vid-badge" aria-hidden="true">▶</span></>
                : <img src={u} alt="" loading="lazy" onError={() => setPending((p) => ({ ...p, [u]: true }))} />}
              {i === 0 ? <span className="cover">Cover</span>
                : <button type="button" className="mv" data-up={i} aria-label="Make this the cover"
                    onClick={() => { setGallery([photos[i]].concat(photos.filter((_, n) => n !== i))); setGalNote({ msg: "Cover updated.", bad: false }); }}>↑</button>}
              <button type="button" className="x" data-rm={i} aria-label="Remove" onClick={() => {
                const next = photos.filter((_, n) => n !== i); setGallery(next);
                setGalNote({ msg: next.length ? "" : "A listing needs at least one photo.", bad: !next.length });
              }}>×</button>
            </div>
          ))}
        </div>
        {galNote ? <div className={"lf-galnote" + (galNote.bad ? " bad" : "")}>{galNote.msg}</div> : null}
        <div className="lfimg-prev" id="lfImgPrev">
          {prev.url ? <img src={prev.url} alt="" /> : null}
          {prev.note ? <div className={"st" + (prev.err ? " err" : "")}>{prev.note}</div> : null}
        </div>
        {err("e_img")}
      </div>
    </fieldset>
  );
  const saveBtn = (hidden: boolean) => (
    <button className="btn btn-primary btn-block" id="lfSave" style={{ marginTop: "6px", opacity: ok ? 1 : 0.75 }} hidden={hidden} onClick={save}>{isNew ? "Create listing" : "Save changes"}</button>
  );

  const header = (
    <>
      <button className="x" aria-label="Close" onClick={() => { flushNow(); close(); }}>×</button>
      <div style={{ fontSize: "19px", fontWeight: 700 }}>{isNew ? "New listing" : "Edit listing"}</div>
      <p className="muted" style={{ fontSize: "12px", margin: "6px 0 12px" }}>Complete every required field (<b style={{ color: "var(--brand-text)" }}>*</b>) so Tayo can match this property accurately. {isNew ? "New listings enter the 7-check verification queue." : "Edits must keep the listing complete."}</p>
      {draft ? <div className="lf-restored" role="status"><span>Picking up the listing you had not saved, from {X().draftAgo(draft.at)}.</span>
        <button type="button" className="lf-linkbtn" id="lfDraftFresh" onClick={startBlank}>Start a blank one</button></div> : null}
    </>
  );

  if (!isNew) {
    return (
      <>
        {header}
        <div className="lf">
          {basics}{dealSec}{location}{specs}{pricing}{negotiation}{trust}{media}
          {saveBtn(false)}
          <button className="btn btn-ghost btn-block" id="lfDel" style={{ marginTop: "8px" }} onClick={del}>Delete listing</button>
        </div>
      </>
    );
  }

  /* ── the review ── */
  const last = at === STEPS.length - 1;
  let review: ReactNode = null, saveHidden = true;
  if (last) {
    const dd = collect(f, amen, photos, branded, active);
    const row = (k: string, v: unknown) => (v ? <div className="wz-row" key={k}><span>{k}</span><b>{String(v)}</b></div> : null);
    const where = [dd.address, dd.city, dd.state].filter(Boolean).join(", ");
    const missing: { i: number; msg: string; st: string }[] = [];
    STEPS.forEach((st, i) => st.errs.forEach((e) => { if (checks[e]) missing.push({ i, msg: checks[e], st: st.t }); }));
    const nPh = dd.media.length;
    /* No CAC certificate yet: the draft is kept and creating waits for the paper. */
    const G = W().SynLG ? W().SynLG() : null, blocked = !!(G && G.known && !G.ok);
    saveHidden = !!missing.length || blocked;
    review = (
      <div id="wzReview">
        <div className="wz-sum">
          {row("Title", dd.title)}{row("Type", C.TYPE_LABEL[dd.property_type] || dd.property_type)}{row("Deal", C.DEAL_LABEL[dd.deal_structure || dd.listing_type] || "")}
          {row("Where", where)}
          {row("Price", Number(dd.price) > 0 ? "₦" + Number(dd.price).toLocaleString("en-NG") + (dd.price_period && dd.price_period !== "total" ? " / " + String(dd.price_period).replace("per_", "") : "") : "")}
          {row("Bedrooms", dd.bedrooms)}{row("Photos", nPh ? nPh + (nPh === 1 ? " photo" : " photos") : "")}
        </div>
        {missing.length ? (
          <div className="wz-miss" role="alert"><b>Still needed before you can create it</b>
            {missing.map((m, k) => <button type="button" key={k} data-wz-go={m.i} onClick={() => goTo(m.i)}><span>{m.st}</span> {m.msg}</button>)}</div>
        ) : null}
        {blocked ? (
          <div className="wz-miss wz-cac"><b>One more thing: your CAC certificate</b><p>It is not on file yet, so this listing stays a draft. Upload the certificate and come back to publish it.</p>
            <button type="button" data-wz-cac="" onClick={() => { flushNow(); close(); W().goToPane?.("verification"); }}>Upload the certificate</button></div>
        ) : null}
      </div>
    );
  }
  const page = (i: number, kids: ReactNode) => <section className="wz-step" data-wz={STEPS[i].id} hidden={at !== i}>{kids}</section>;
  return (
    <>
      {header}
      <div className="wz-head">
        <div className="wz-k" id="wzK" aria-live="polite">{"Step " + (at + 1) + " of " + STEPS.length + " · " + STEPS[at].t}</div>
        <div className="wz-bar" aria-hidden="true"><i id="wzBar" style={{ width: Math.round((at + 1) / STEPS.length * 100) + "%" }}></i></div>
        <ol className="wz-dots">
          {STEPS.map((st, i) => (
            <li key={st.id}><button type="button" data-wz-go={i} aria-label={"Step " + (i + 1) + ": " + st.t} className={[i === at ? "on" : "", i < at ? "done" : ""].filter(Boolean).join(" ") || undefined}
              aria-current={i === at ? "step" : undefined} onClick={() => goTo(i)}><b>{i + 1}</b><span>{st.t}</span></button></li>
          ))}
        </ol>
      </div>
      <div className="lf">
        {page(0, basics)}
        {page(1, location)}
        {page(2, <>{dealSec}{specs}</>)}
        {page(3, <>{pricing}{negotiation}{trust}</>)}
        {page(4, media)}
        {page(5, <>{review}{saveBtn(saveHidden)}<p className="lf-draftnote" id="lfDraftNote" aria-live="polite">{draftNote}</p></>)}
      </div>
      <div className="wz-foot">
        <button type="button" className="btn btn-ghost" id="wzBack" hidden={at === 0} onClick={() => show(at - 1)}>Back</button><span className="wz-sp"></span>
        <button type="button" className="btn btn-ghost" id="wzKeep" onClick={() => { flushNow(); toast("Draft saved. Find it in Listings."); close(); }}>Save draft &amp; close</button>
        <button type="button" className="btn btn-primary" id="wzNext" hidden={last} onClick={() => { if (checkStep(at)) show(at + 1); }}>Next</button>
      </div>
    </>
  );
}

/* A combobox that behaves the same on every phone. Free text is always allowed: the list narrows what you see, it never decides
   what you may enter. */
function Combo({ wrapId, inputId, value, items, onChange, onBlur, placeholder, toggleLabel, maxLength, extra }: {
  wrapId: string; inputId: string; value: string; items: string[]; onChange: (v: string) => void; onBlur: () => void;
  placeholder: string; toggleLabel: string; maxLength?: number; extra?: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) { setOpen(false); setActive(-1); } };
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);
  useEffect(() => { if (active > -1 && list.current) list.current.querySelectorAll(".combo-opt")[active]?.scrollIntoView({ block: "nearest" }); }, [active]);
  const ql = q.trim().toLowerCase();
  const hits = (ql ? items.filter((v) => v.toLowerCase().indexOf(ql) > -1) : items).slice(0, 60);
  const paint = (filter: string) => { setQ(filter); setOpen(true); setActive(-1); };
  const close = () => { setOpen(false); setActive(-1); };
  const choose = (v: string) => { onChange(v); close(); };
  return (
    <div className="combo" id={wrapId} ref={wrap}>
      <input id={inputId} ref={input} value={value} autoComplete="off" maxLength={maxLength} role="combobox" aria-expanded={open} aria-controls={wrapId + "List"} aria-autocomplete="list"
        placeholder={placeholder} {...extra}
        onFocus={() => paint("")} onChange={(e) => { onChange(e.target.value); paint(e.target.value); }} onBlur={onBlur}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!hits.length) return;
            setActive((a) => (e.key === "ArrowDown" ? (a + 1) % hits.length : (a <= 0 ? hits.length - 1 : a - 1)));
          } else if (e.key === "Enter" && active > -1 && hits[active]) { e.preventDefault(); choose(hits[active]); }
          else if (e.key === "Escape") close();
        }} />
      <button type="button" className="combo-toggle" tabIndex={-1} aria-label={toggleLabel} onClick={() => { if (!open) { input.current?.focus(); paint(""); } else close(); }}>▾</button>
      {/* mousedown, not click: blurring the input first would close the list and the tap would land on nothing. */}
      <div className="combo-list" id={wrapId + "List"} role="listbox" hidden={!open} ref={list}
        onMouseDown={(e) => { const b = (e.target as HTMLElement).closest(".combo-opt") as HTMLElement | null; if (!b) return; e.preventDefault(); choose(b.dataset.v || ""); }}>
        {!hits.length ? <div className="combo-empty">No match, type it in and carry on.</div> : hits.map((v, i) => {
          const atq = ql ? v.toLowerCase().indexOf(ql) : -1;
          return (
            <button type="button" key={v + i} className={"combo-opt" + (i === active ? " on" : "")} role="option" aria-selected={i === active} data-v={v} data-i={i}>
              {atq > -1 ? <>{v.slice(0, atq)}<mark>{v.slice(atq, atq + ql.length)}</mark>{v.slice(atq + ql.length)}</> : v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── the amenities chips ──
   Free text fed a FILTER, and "24h power", "24hr power" and "24/7 power" are three amenities to any query. A list makes the
   common ones identical; Enter still accepts anything the list has not got. */
function Amenities({ chosen, setChosen }: { chosen: string[]; setChosen: (f: (c: string[]) => string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [boxOn, setBoxOn] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(-1);
  const host = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), menu = useRef<HTMLDivElement>(null);
  const norm = (v: string) => String(v || "").trim().toLowerCase();
  /* The event's path was recorded at dispatch, while a picked option was still in the menu, so it is the question to ask. */
  useEffect(() => {
    const out = (e: MouseEvent) => { if (host.current && e.composedPath().indexOf(host.current) !== -1) return; setBoxOn(false); setOpen(false); setHi(-1); };
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);
  const nq = norm(q);
  const groups = AMENITY_GROUPS.map((g) => ({ g: g.g, hits: g.items.filter((it) => !nq || norm(it).indexOf(nq) !== -1) })).filter((g) => g.hits.length);
  const flat = groups.flatMap((g) => g.hits);
  useEffect(() => { if (hi > -1 && menu.current) menu.current.querySelectorAll(".amen-opt")[hi]?.scrollIntoView({ block: "nearest" }); }, [hi]);
  /* Splits on the save's own separators, so a pasted brochure list becomes chips rather than one absurd amenity. */
  const add = (raw: string) => {
    setChosen((c) => {
      const n = c.slice();
      String(raw || "").split(/[|,;\n]+/).forEach((piece) => { const v = piece.trim().replace(/\s+/g, " "); if (v && !n.some((x2) => norm(x2) === norm(v))) n.push(v); });
      return n;
    });
    setQ(""); setHi(-1);
  };
  const doOpen = () => { setOpen(true); setHi(-1); };
  return (
    <div className="field amen" id="amenHost" ref={host}>
      <label htmlFor="amenIn">Amenities</label>
      <div className={"amen-box" + (boxOn ? " on" : "")} id="amenBox" onClick={() => { input.current?.focus(); if (!open) doOpen(); }}>
        {chosen.map((a) => (
          <span className="amen-chip" key={a}>{a}<button type="button" aria-label={"Remove " + a}
            onClick={(e) => { e.stopPropagation(); setChosen((c) => c.filter((v) => v !== a)); input.current?.focus(); }}>×</button></span>
        ))}
        <input id="amenIn" ref={input} className="amen-in" type="text" role="combobox" aria-expanded={open} aria-controls="amenMenu" aria-autocomplete="list"
          autoComplete="off" placeholder="Search amenities…" value={q}
          onFocus={() => { setBoxOn(true); doOpen(); }}
          onChange={(e) => { setQ(e.target.value); if (!open) doOpen(); else setHi(-1); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); if (!open) doOpen(); if (flat.length) setHi((h) => (h + 1 + flat.length) % flat.length); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); if (flat.length) setHi((h) => (h - 1 + flat.length) % flat.length); return; }
            if (e.key === "Escape") { setOpen(false); setHi(-1); return; }
            if (e.key === "Enter") { e.preventDefault(); if (hi >= 0 && flat[hi]) add(flat[hi]); else if (q.trim()) add(q); return; }
            /* Backspace on an empty box removes the last chip, as every token field does. */
            if (e.key === "Backspace" && !q && chosen.length) setChosen((c) => c.slice(0, -1));
          }} />
      </div>
      <div className={"amen-menu" + (open ? " on" : "")} id="amenMenu" role="listbox" aria-label="Amenities" ref={menu}
        onMouseDown={(e) => {
          /* mousedown, not click: the input would blur first and shut the menu out from under the pointer. */
          const o = (e.target as HTMLElement).closest(".amen-opt") as HTMLElement | null; if (!o) return;
          e.preventDefault();
          const v = o.dataset.v || "";
          setChosen((c) => (c.some((x2) => norm(x2) === norm(v)) ? c.filter((x2) => norm(x2) !== norm(v)) : c.concat(v)));
          setQ(""); setHi(-1); input.current?.focus();
        }}>
        {groups.length ? groups.map((g) => (
          <div key={g.g} style={{ display: "contents" }}>
            <div className="amen-grp">{g.g}</div>
            {g.hits.map((it) => (
              <div key={it} className={"amen-opt" + (flat[hi] === it ? " hi" : "")} role="option" data-v={it} aria-selected={chosen.some((c) => norm(c) === norm(it))}>{it}</div>
            ))}
          </div>
        )) : <div className="amen-none">{q.trim() ? "Nothing matches. Press Enter to add “" + q.trim() + "”." : "Every amenity is already on this listing."}</div>}
      </div>
      <input type="hidden" id="lfAmen" value={chosen.join(", ")} />
      <p className="lf-hint">Pick from the list, or type your own and press Enter.</p>
    </div>
  );
}
