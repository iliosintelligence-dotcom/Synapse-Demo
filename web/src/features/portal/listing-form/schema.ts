/**
 * The listing form, as pure rules: what a blank form is, what is required, what a save sends. Nothing here touches the screen or the network,
 * so every rule can be tested.
 */
export const PROP_TYPES = ["apartment", "house", "duplex", "terrace", "penthouse", "bungalow", "land", "commercial", "shared"] as const;
export const TYPE_LABEL: Record<string, string> = { apartment: "Apartment", house: "House", duplex: "Duplex", terrace: "Terrace", penthouse: "Penthouse", bungalow: "Bungalow", land: "Land", commercial: "Commercial", shared: "Room / self-contain" };
export const DEAL_STRUCTURES = ["outright", "rent", "shortlet", "lease", "off_plan", "joint_venture", "development_financing", "rent_to_own"] as const;
export const DEAL_LABEL: Record<string, string> = {
  outright: "Outright sale", rent: "Rent (yearly)", shortlet: "Short-let", lease: "Long lease", off_plan: "Off-plan (buy before it is built)",
  joint_venture: "Joint venture (landowner + developer)", development_financing: "Development financing (investors fund a build)", rent_to_own: "Rent to own",
};
/** listing_type, which everything older reads, follows the deal. */
export const DEAL_TO_LISTING: Record<string, string> = { outright: "sale", rent: "rent", shortlet: "shortlet", lease: "rent", off_plan: "sale", joint_venture: "sale", development_financing: "sale", rent_to_own: "sale" };
export const PRICE_PERIODS = ["total", "per_year", "per_month", "per_night"] as const;
export const PERIOD_LABEL: Record<string, string> = { total: "Total price", per_year: "Per year", per_month: "Per month", per_night: "Per night" };
export const TITLE_TYPES = ["c_of_o", "governors_consent", "registered_deed", "excision", "gazette", "allocation"] as const;
export const TITLE_LABEL: Record<string, string> = { c_of_o: "Certificate of Occupancy (C of O)", governors_consent: "Governor’s Consent", registered_deed: "Registered Deed", excision: "Excision", gazette: "Gazette", allocation: "Allocation" };
export const BANDS: Array<[string, string]> = [["A", "Band A · 20+ hrs/day"], ["B", "Band B · 16+ hrs/day"], ["C", "Band C · 12+ hrs/day"], ["D", "Band D · 8+ hrs/day"], ["E", "Band E · 4+ hrs/day"]];
export const CONDITIONS: Array<[string, string]> = [["brand_new", "Brand new"], ["excellent", "Excellent"], ["good", "Good"], ["fair", "Fair"], ["needs_work", "Needs work"]];
export const FURNISHED: Array<[string, string]> = [["unfurnished", "Unfurnished"], ["semi", "Semi-furnished"], ["fully", "Fully furnished"]];

export const AMENITY_GROUPS = [
  { g: "Power", items: ["24/7 power", "Backup generator", "Solar power", "Inverter and batteries", "Prepaid meter", "Dedicated transformer"] },
  { g: "Water", items: ["Borehole", "Constant water supply", "Water treatment plant", "Overhead tank"] },
  { g: "Security", items: ["24/7 security", "Gated estate", "Security post", "CCTV surveillance", "Electric fence", "Perimeter fence", "Intercom", "Access control", "Burglary proof", "Fire alarm", "Smoke detectors", "Fire extinguisher"] },
  { g: "Parking and access", items: ["Car park", "Covered parking", "Visitor parking", "Ample parking space", "Elevator", "Wheelchair access", "Tarred road access", "Good drainage", "Street lights"] },
  { g: "Inside", items: ["Air conditioning", "Fitted kitchen", "Fitted wardrobes", "POP ceiling", "All rooms ensuite", "Guest toilet", "Walk-in closet", "Store room", "Laundry room", "Study or home office", "Balcony", "Terrace", "Furnished", "Serviced apartment", "Water heater", "Ceiling fans"] },
  { g: "Leisure", items: ["Swimming pool", "Gym", "Children's playground", "Garden", "Lawn", "Barbecue area", "Clubhouse", "Tennis court", "Basketball court", "Cinema room", "Games room", "Rooftop terrace", "Jacuzzi", "Sauna", "Bar"] },
  { g: "Staff and service", items: ["Boys' quarters (BQ)", "Domestic staff quarters", "Gatehouse", "Facility management", "Estate maintenance", "Waste disposal", "Cleaning service", "Concierge"] },
  { g: "Connectivity", items: ["Fibre internet", "WiFi", "Satellite TV", "Cable TV"] },
];

/** Every box holds text, as a box does; conversion to numbers happens once, in toPayload. */
export interface Form {
  title: string; description: string; property_type: string; deal_structure: string; price: string; price_period: string;
  move_in_cost: string; service_charge: string; agency_fee: string; legal_fee: string;
  address: string; city: string; state: string; country: string; neighbourhood: string; latitude: string; longitude: string;
  bedrooms: string; bathrooms: string; toilets: string; parking_spaces: string; area_sqm: string; year_built: string;
  furnished: string; property_condition: string; electricity_band: string; amenities: string[];
  title_type: string; yield_pct: string; is_active: boolean;
  units_available: string; build_stage: string; handover_month: string; build_progress_pct: string; payment_plan: string; deposit_pct: string; instalment_months: string;
  plot_count: string; plot_size_sqm: string; min_investment: string; investment_term_months: string; stated_return_pct: string;
  photos: string[]; floor: string; floor_active: boolean;
}

export const blankForm = (): Form => ({
  title: "", description: "", property_type: "apartment", deal_structure: "outright", price: "", price_period: "total",
  move_in_cost: "", service_charge: "", agency_fee: "", legal_fee: "",
  address: "", city: "", state: "", country: "Nigeria", neighbourhood: "", latitude: "", longitude: "",
  bedrooms: "", bathrooms: "", toilets: "", parking_spaces: "", area_sqm: "", year_built: "",
  furnished: "", property_condition: "", electricity_band: "", amenities: [],
  title_type: "", yield_pct: "", is_active: true,
  units_available: "1", build_stage: "completed", handover_month: "", build_progress_pct: "", payment_plan: "outright", deposit_pct: "", instalment_months: "",
  plot_count: "", plot_size_sqm: "", min_investment: "", investment_term_months: "", stated_return_pct: "",
  photos: [], floor: "", floor_active: true,
});

export const isLand = (f: Pick<Form, "property_type">) => f.property_type === "land" || f.property_type === "commercial";
export const isRentish = (f: Pick<Form, "deal_structure">) => ["rent", "shortlet", "lease"].includes(f.deal_structure);
export const isInvestment = (f: Pick<Form, "deal_structure">) => ["joint_venture", "development_financing"].includes(f.deal_structure);

export type FieldKey = "title" | "description" | "address" | "city" | "state" | "price" | "bedrooms" | "photos" | "pin" | "units" | "floor";
export type Errors = Partial<Record<FieldKey, string>>;

/** Which step each rule belongs to, so "Review" can send a person back to exactly the box that is missing. */
export const STEPS = ["The home", "Where", "Details", "Price", "Photos", "Review"] as const;
export const FIELD_STEP: Record<FieldKey, number> = { title: 0, description: 0, address: 1, city: 1, state: 1, pin: 1, bedrooms: 2, units: 3, price: 3, floor: 3, photos: 4 };

const hasUrl = (u: string) => /^https?:\/\/\S+$/i.test(u.trim());

export function validate(f: Form): Errors {
  const e: Errors = {};
  if (f.title.trim().length < 6) e.title = "At least 6 characters";
  if (f.description.trim().length < 30) e.description = "Describe the property (30+ characters)";
  if (!f.address.trim()) e.address = "Required";
  if (!f.city.trim()) e.city = "Required";
  if (!f.state.trim()) e.state = "Required";
  if (!(parseFloat(f.price) > 0)) e.price = "Enter a price in naira";
  if (!isLand(f) && !(f.bedrooms !== "" && Number(f.bedrooms) >= 0)) e.bedrooms = "Required";
  if (!f.photos.length) e.photos = "Add at least one photo";
  else if (f.photos.some((u) => !hasUrl(u))) e.photos = "One of the photos is not a proper link";
  if (!(f.latitude.trim() && f.longitude.trim())) e.pin = "Place the pin: tap the map where the property is";
  if (!(Number(f.units_available) >= 1)) e.units = "At least 1";
  if (f.floor.trim() !== "" && !(parseFloat(f.floor) > 0)) e.floor = "A floor has to be a positive amount";
  return e;
}

const num = (v: string): number | null => { const n = parseFloat(v); return Number.isNaN(n) ? null : n; };
const int = (v: string): number | null => (v === "" ? null : Number.parseInt(v, 10));
const opt = (v: string): string | null => v || null;

/** What a save sends. Blank and zero are different answers and stay different: blank means "not stated", zero means "genuinely none". */
export function toPayload(f: Form) {
  const land = isLand(f), rent = isRentish(f), inv = isInvestment(f);
  const inst = !rent && f.payment_plan === "instalments";
  return {
    title: f.title.trim(), description: f.description.trim(), property_type: f.property_type, listing_type: DEAL_TO_LISTING[f.deal_structure] ?? "sale",
    price: num(f.price), price_period: f.price_period, move_in_cost: num(f.move_in_cost), service_charge: num(f.service_charge), agency_fee: num(f.agency_fee), legal_fee: num(f.legal_fee),
    address: f.address.trim(), city: f.city.trim(), state: f.state.trim(), country: f.country, neighbourhood: f.neighbourhood.trim(), latitude: num(f.latitude), longitude: num(f.longitude),
    bedrooms: int(f.bedrooms), bathrooms: int(f.bathrooms), toilets: int(f.toilets), parking_spaces: int(f.parking_spaces), area_sqm: num(f.area_sqm), year_built: int(f.year_built),
    furnished: opt(f.furnished), property_condition: opt(f.property_condition), electricity_band: opt(f.electricity_band),
    // people paste amenity lists out of brochures with pipes and line breaks as often as commas
    amenities: f.amenities.flatMap((a) => a.split(/[|,\n;]+/)).map((a) => a.trim()).filter(Boolean),
    title_type: opt(f.title_type), yield_pct: num(f.yield_pct), is_active: f.is_active,
    deal_structure: f.deal_structure,
    build_stage: land ? null : f.build_stage,
    handover_date: !land && f.build_stage !== "completed" && /^\d{4}-\d{2}$/.test(f.handover_month) ? `${f.handover_month}-01` : null,
    build_progress_pct: !land && f.build_stage === "under_construction" ? int(f.build_progress_pct) : null,
    payment_plan: rent ? null : f.payment_plan,
    deposit_pct: inst ? num(f.deposit_pct) : null, instalment_months: inst ? int(f.instalment_months) : null,
    units_available: Math.max(1, Number.parseInt(f.units_available, 10) || 1),
    plot_count: land ? num(f.plot_count) : null, plot_size_sqm: land ? num(f.plot_size_sqm) : null,
    min_investment: inv ? num(f.min_investment) : null, investment_term_months: inv ? int(f.investment_term_months) : null, stated_return_pct: inv ? num(f.stated_return_pct) : null,
    media: f.photos.map((url, i) => ({ url, is_primary: i === 0, display_order: i })),
  };
}
export type Payload = ReturnType<typeof toPayload>;

/** The floor Tayo may negotiate down to. Empty means none was set; an invalid one is refused before anything is written. */
export function readFloor(f: Pick<Form, "floor" | "floor_active">): { amount: number; active: boolean } | { error: string } | null {
  const raw = f.floor.trim();
  if (raw === "") return null;
  const amount = parseFloat(raw);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "A floor has to be a positive amount" };
  return { amount, active: f.floor_active };
}

/** An existing listing's database row, back into the form. */
export function formFromRow(p: Record<string, unknown>, photos: string[]): Form {
  const s = (v: unknown) => (v == null ? "" : String(v));
  const b = blankForm();
  return {
    ...b,
    title: s(p.title), description: s(p.description), property_type: s(p.property_type) || b.property_type,
    deal_structure: s(p.deal_structure) || ({ rent: "rent", shortlet: "shortlet" } as Record<string, string>)[s(p.listing_type)] || "outright",
    price: s(p.price), price_period: s(p.price_period) || "total", move_in_cost: s(p.move_in_cost), service_charge: s(p.service_charge), agency_fee: s(p.agency_fee), legal_fee: s(p.legal_fee),
    address: s(p.address), city: s(p.city), state: s(p.state), country: s(p.country) || "Nigeria", neighbourhood: s(p.area_name), latitude: s(p.latitude), longitude: s(p.longitude),
    bedrooms: s(p.bedrooms), bathrooms: s(p.bathrooms), toilets: s(p.toilets), parking_spaces: s(p.parking_spaces), area_sqm: s(p.area_sqm), year_built: s(p.year_built),
    furnished: s(p.furnished), property_condition: s(p.property_condition), electricity_band: s(p.electricity_band), amenities: Array.isArray(p.amenities) ? (p.amenities as string[]) : [],
    title_type: s(p.title_type), yield_pct: s(p.yield_pct), is_active: p.is_active !== false,
    units_available: s(p.units_available) || "1", build_stage: s(p.build_stage) || "completed", handover_month: s(p.handover_date).slice(0, 7), build_progress_pct: s(p.build_progress_pct),
    payment_plan: s(p.payment_plan) || "outright", deposit_pct: s(p.deposit_pct), instalment_months: s(p.instalment_months),
    plot_count: s(p.plot_count), plot_size_sqm: s(p.plot_size_sqm), min_investment: s(p.min_investment), investment_term_months: s(p.investment_term_months), stated_return_pct: s(p.stated_return_pct),
    photos,
  };
}

/** A draft is "empty" until the agent has typed something worth keeping, so opening and closing the form leaves no ghost draft behind. */
export function isEmptyDraft(f: Form): boolean {
  return !f.title && !f.description && !f.address && !f.price && !f.photos.length && !f.floor;
}

/** The first step with something still missing, for the Review step's "go back to it". */
export function firstBadStep(e: Errors): number | null {
  const steps = (Object.keys(e) as FieldKey[]).map((k) => FIELD_STEP[k]);
  return steps.length ? Math.min(...steps) : null;
}

/** The address lookup tries narrower to wider: the street, then the area, then the city. Nigerian streets are often missing from the free map, so the last rung still lands somewhere near. */
export function geoLadder(f: Pick<Form, "address" | "neighbourhood" | "city" | "state">): Array<{ q: string; how: "address" | "area" | "city" }> {
  const join = (...p: string[]) => p.map((x) => x.trim()).filter(Boolean).join(", ");
  const rungs = [
    { q: join(f.address, f.neighbourhood, f.city, f.state), how: "address" as const },
    { q: join(f.neighbourhood, f.city, f.state), how: "area" as const },
    { q: join(f.city, f.state), how: "city" as const },
  ];
  const seen = new Set<string>();
  return rungs.filter((r) => r.q && !seen.has(r.q) && seen.add(r.q));
}
