import type { Agency, PropertyMedia } from "@/lib/types";

export interface VerificationNode {
  type?: string;
  name?: string;
  label?: string;
  status?: string;
}

export type PropertyAgency = Pick<
  Agency,
  "name" | "verification_tier" | "logo_url" | "brand_color" | "brand_font" | "tagline" | "social" | "cac_number" | "cac_certificate_on_file"
>;

/** One listing row (select * plus joins). Only the columns the property page reads are named. */
export interface Property {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_period: string | null;
  currency: string | null;
  listing_type: string | null;
  property_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  parking_spaces: number | null;
  year_built: number | null;
  electricity_band: string | null;
  furnished: string | null;
  property_condition: string | null;
  title_type: string | null;
  amenities: string[] | null;
  service_charge: number | null;
  move_in_cost: number | null;
  agency_fee: number | null;
  legal_fee: number | null;
  deal_structure: string | null;
  build_stage: string | null;
  build_progress_pct: number | null;
  handover_date: string | null;
  payment_plan: string | null;
  deposit_pct: number | null;
  instalment_months: number | null;
  plot_count: number | null;
  plot_size_sqm: number | null;
  units_available: number | null;
  min_investment: number | null;
  investment_term_months: number | null;
  stated_return_pct: number | null;
  verification_status: string | null;
  verified_at: string | null;
  trust_score: number | null;
  verification_nodes: VerificationNode[] | null;
  availability_confirmed_at: string | null;
  expires_at: string | null;
  agency_id: string | null;
  listed_by_agent_id: string | null;
  property_media: PropertyMedia[] | null;
  property_enrichment: { toju_summary: string | null }[] | { toju_summary: string | null } | null;
  agencies: PropertyAgency | PropertyAgency[] | null;
}

export interface AgentCard {
  full_name: string;
  avatar_url: string | null;
  years_experience: number | null;
  closed_deals: number | null;
  response_rate_pct: number | null;
}

export interface SimilarHome {
  id: string;
  title: string | null;
  price: number | null;
  verification_status: string | null;
  property_media: PropertyMedia[] | null;
}
