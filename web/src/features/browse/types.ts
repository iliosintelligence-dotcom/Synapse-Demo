export type DealCat = "sale" | "rent" | "shared" | "land" | "offplan" | "invest" | "shortlet";

export interface DealInfo {
  isLand: boolean;
  deal: string | null;
  stage: string | null;
  handover: string | null;
  progress?: number | null;
  plan: string | null;
  deposit: number | null;
  months: number | null;
  units: number | null;
  plots: number | null;
  plotSize: number | null;
  minInv: number | null;
}

export interface CardAgency {
  name: string;
  logo: string | null;
  color: string | null;
  font: string | null;
  cac: string | null;
  cacDoc: boolean;
}

/** One card, whether it came from the full listing feed or from Tayo's matches. ONE shape: add new fields here. */
export interface BrowseItem {
  id: string;
  img: string | null;
  kind: "sale" | "rent" | "shared";
  cats: DealCat[];
  dealInfo: DealInfo | null;
  per: boolean;
  perLabel: string;
  vstatus: string | null;
  expiresAt: string | null;
  listedAt: string | null;
  currency: string | null;
  deal: string;
  priceN: number;
  title: string;
  loc: string;
  score: number | null;
  /** A short fact line under the title: beds, baths, size, or Tayo's reason. Plain text. */
  why: string;
  agency: CardAgency | null;
  lat: number | null;
  lng: number | null;
  /** Tayo's own wording prefix for a recommendation ("Recommended" / "Worth checking"), when the card came from a match. */
  whyLead: string | null;
}

/** A row of the listings feed (see queries.ts for the columns). */
export interface FeedRow {
  id: string;
  title: string;
  city: string | null;
  state: string | null;
  listing_type: string | null;
  price_period: string | null;
  property_type: string | null;
  verification_status: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  trust_score: number | null;
  expires_at: string | null;
  listed_at: string | null;
  currency: string | null;
  area_name: string | null;
  latitude: number | null;
  longitude: number | null;
  deal_structure: string | null;
  build_stage: string | null;
  handover_date: string | null;
  build_progress_pct: number | null;
  payment_plan: string | null;
  deposit_pct: number | null;
  instalment_months: number | null;
  units_available: number | null;
  plot_count: number | null;
  plot_size_sqm: number | null;
  min_investment: number | null;
  property_media: { url: string; display_order: number | null; media_type: string | null }[] | null;
  neighbourhoods: { name: string } | { name: string }[] | null;
  agencies:
    | { name: string; logo_url: string | null; brand_color: string | null; brand_font: string | null; cac_number: string | null; cac_certificate_on_file: boolean | null }
    | { name: string; logo_url: string | null; brand_color: string | null; brand_font: string | null; cac_number: string | null; cac_certificate_on_file: boolean | null }[]
    | null;
}

/** A match as the `toju-demo` function returns it (`matches` action). */
export interface TojuMatch {
  id?: string;
  img?: string | null;
  room?: unknown;
  listingType?: string;
  pricePeriod?: string;
  deal?: {
    propertyType?: string; structure?: string; stage?: string; handover?: string; paymentPlan?: string; depositPct?: number;
    instalmentMonths?: number; units?: number; plots?: number; plotSizeSqm?: number; minInvestment?: number;
  } | null;
  verificationStatus?: string;
  verified?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  agencyBrand?: { name: string; logo: string | null; color: string | null; font: string | null; cac?: string | null; cacDoc?: boolean } | null;
  price?: number;
  title?: string;
  neighbourhood?: { name?: string } | null;
  city?: string;
  trustScore?: number | string | null;
  bedrooms?: number | null;
  yieldPct?: number | null;
  why?: string;
  whatToWatch?: string;
  summary?: string;
}
