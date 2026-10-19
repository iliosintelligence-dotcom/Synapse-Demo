/** Rows as the public (anon) role can read them. Mirrors the columns selected in each feature queries file. */
export interface Agency {
  id: string;
  name: string;
  logo_url: string | null;
  verification_tier: string | null;
  cac_number: string | null;
  cac_certificate_on_file: boolean | null;
  city: string | null;
  address: string | null;
  description: string | null;
  brand_color: string | null;
  brand_font: string | null;
  tagline: string | null;
  founded_year: number | null;
  specialties: string[] | null;
  business_hours: string | { text?: string } | null;
  social: Record<string, string> | null;
  avg_response_minutes: number | null;
}

export interface PropertyMedia { url: string; display_order: number | null; media_type: string | null }

export interface PropertyCard {
  id: string;
  title: string | null;
  price: number | null;
  price_period: string | null;
  listing_type: string | null;
  property_type: string | null;
  city: string | null;
  area_name: string | null;
  bedrooms: number | null;
  verification_status: string | null;
  property_media: PropertyMedia[] | null;
}
