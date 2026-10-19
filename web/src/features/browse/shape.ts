import { coverUrl } from "@/lib/media";
import type { BrowseItem, DealCat, FeedRow, TojuMatch } from "./types";

const PER: Record<string, string> = { per_year: "/yr", per_month: "/mo", per_night: "/night" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/** Which of the quick filters a listing belongs to. A flat can be "Buy" and "Off-plan"; a plot, "Buy" and "Land". */
function categories(p: FeedRow): DealCat[] {
  const c: DealCat[] = [p.property_type === "shared" ? "shared" : p.listing_type === "rent" ? "rent" : "sale"];
  if (p.property_type === "land") c.push("land");
  if (p.listing_type === "shortlet" || p.deal_structure === "shortlet") c.push("shortlet");
  if (p.deal_structure === "off_plan" || p.build_stage === "under_construction" || p.build_stage === "not_started") c.push("offplan");
  if (["joint_venture", "development_financing", "off_plan"].includes(p.deal_structure ?? "") || Number(p.min_investment) > 0) c.push("invest");
  return c;
}

/** The fact line under the title. Each part is dropped, never guessed, when its column is empty. */
function factLine(p: FeedRow): string {
  const bits: string[] = [];
  if (p.bedrooms) bits.push(`${p.bedrooms} bed${p.bedrooms > 1 ? "s" : ""}`);
  if (p.bathrooms) bits.push(`${p.bathrooms} bath${p.bathrooms > 1 ? "s" : ""}`);
  if (p.area_sqm) bits.push(`${Math.round(Number(p.area_sqm))} m²`);
  const facts = bits.join(" · ");
  return p.verification_status === "verified" ? facts : (facts ? `${facts} · ` : "") + "Tayo can run the 7 checks before you commit";
}

function locationLine(p: FeedRow): string {
  const area = (p.area_name ?? "").trim();
  if (area && area.length <= 40 && !/\n/.test(area)) return `${area}, ${p.city ?? ""}`;
  const nb = one(p.neighbourhoods);
  return nb?.name ? nb.name : `${p.city ?? ""}, ${p.state ?? ""}`;
}

export function shapeRow(p: FeedRow): BrowseItem {
  const a = one(p.agencies);
  return {
    id: p.id,
    img: coverUrl(p.property_media),
    kind: p.property_type === "shared" ? "shared" : p.listing_type === "rent" ? "rent" : "sale",
    cats: categories(p),
    dealInfo: {
      isLand: p.property_type === "land", deal: p.deal_structure, stage: p.build_stage, handover: p.handover_date, progress: p.build_progress_pct,
      plan: p.payment_plan, deposit: p.deposit_pct, months: p.instalment_months, units: p.units_available, plots: p.plot_count,
      plotSize: p.plot_size_sqm, minInv: p.min_investment,
    },
    per: p.listing_type === "rent",
    perLabel: PER[p.price_period ?? ""] ?? "",
    vstatus: p.verification_status,
    expiresAt: p.expires_at,
    listedAt: p.listed_at,
    currency: p.currency,
    deal: p.property_type === "shared" ? "Shared room" : p.listing_type === "shortlet" ? "Short-let" : p.listing_type === "rent" ? "For rent" : "For sale",
    priceN: Number(p.price) || 0,
    title: p.title,
    loc: locationLine(p),
    score: p.trust_score,
    why: factLine(p),
    agency: a?.name ? { name: a.name, logo: a.logo_url, color: a.brand_color, font: a.brand_font, cac: a.cac_number, cacDoc: !!a.cac_certificate_on_file } : null,
    lat: p.latitude == null ? null : Number(p.latitude),
    lng: p.longitude == null ? null : Number(p.longitude),
    whyLead: null,
  };
}

/** A match from Tayo (`toju-demo` `matches` action) becomes the same card item as a feed row. */
export function shapeMatch(m: TojuMatch, i: number): BrowseItem {
  const d = m.deal;
  const lead = m.why ? "Recommended" : m.whatToWatch && m.whatToWatch !== "No major synthetic flags" ? "Worth checking" : null;
  return {
    id: typeof m.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(m.id) ? m.id : `r${i}`,
    img: typeof m.img === "string" && m.img.trim() ? m.img.trim() : null,
    kind: m.room != null ? "shared" : m.listingType === "rent" ? "rent" : "sale",
    cats: [m.room != null ? "shared" : m.listingType === "rent" ? "rent" : "sale"],
    perLabel: PER[m.pricePeriod ?? ""] ?? "",
    dealInfo: d
      ? { isLand: d.propertyType === "land", deal: d.structure ?? null, stage: d.stage ?? null, handover: d.handover ?? null, plan: d.paymentPlan ?? null,
          deposit: d.depositPct ?? null, months: d.instalmentMonths ?? null, units: d.units ?? null, plots: d.plots ?? null, plotSize: d.plotSizeSqm ?? null, minInv: d.minInvestment ?? null }
      : null,
    per: m.listingType === "rent",
    // from the row: hardcoding "verified" would stamp the badge on homes nobody has checked
    vstatus: m.verificationStatus || (m.verified ? "verified" : "unverified"),
    expiresAt: null,
    listedAt: null,
    currency: null,
    agency: m.agencyBrand ? { name: m.agencyBrand.name, logo: m.agencyBrand.logo, color: m.agencyBrand.color, font: m.agencyBrand.font, cac: m.agencyBrand.cac ?? null, cacDoc: !!m.agencyBrand.cacDoc } : null,
    deal: m.room != null ? "Shared room" : m.listingType === "rent" ? "For rent" : "For sale",
    priceN: Number(m.price) || 0,
    title: m.title || "",
    loc: m.neighbourhood?.name ? m.neighbourhood.name : m.city || "",
    score: m.trustScore == null || m.trustScore === "" ? null : Number(m.trustScore),
    why: m.why ? m.why : lead === "Worth checking" ? (m.whatToWatch ?? "") : m.summary ?? "",
    lat: m.latitude == null ? null : Number(m.latitude),
    lng: m.longitude == null ? null : Number(m.longitude),
    whyLead: lead,
  };
}
