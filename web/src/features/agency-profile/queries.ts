import { supabase } from "@/lib/supabase";
import type { Agency, PropertyCard } from "@/lib/types";

const AGENCY_COLUMNS =
  "id,name,logo_url,verification_tier,cac_number,cac_certificate_on_file,city,address,description,brand_color,brand_font,tagline,founded_year,specialties,business_hours,social,avg_response_minutes";

const PROPERTY_COLUMNS =
  "id,title,price,price_period,listing_type,property_type,city,area_name,bedrooms,verification_status,property_media(url,display_order,media_type)";

export async function fetchAgency(id: string): Promise<Agency | null> {
  const { data, error } = await supabase.from("agencies").select(AGENCY_COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return (data as Agency | null) ?? null;
}

export async function fetchAgencyListings(agencyId: string): Promise<PropertyCard[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_COLUMNS)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as unknown as PropertyCard[]) ?? [];
}
