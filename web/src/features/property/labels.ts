/** Wording for coded column values. Kept in one place so a new value added to the database shows up here, not in five components. */

export const TITLE_LABEL: Record<string, string> = {
  c_of_o: "Certificate of Occupancy",
  governors_consent: "Governor’s Consent",
  registered_deed: "Registered Deed",
  excision: "Excision",
  gazette: "Gazette",
  allocation: "Allocation",
};

export const FURNISHED_LABEL: Record<string, string> = { fully: "fully furnished", semi: "semi-furnished", unfurnished: "unfurnished" };

export const CONDITION_LABEL: Record<string, string> = {
  brand_new: "brand new",
  excellent: "excellent condition",
  good: "good condition",
  fair: "fair condition",
  needs_work: "needs work",
};

/** NERC electricity bands, with the hours a buyer actually cares about. */
export const BAND_HOURS: Record<string, string> = { A: "20+", B: "16+", C: "12+", D: "8+", E: "4+" };

export const DEAL_LABEL: Record<string, string> = {
  outright: "Outright sale",
  rent: "Rent",
  shortlet: "Short-let",
  lease: "Long lease",
  off_plan: "Off-plan: you buy before it is built",
  joint_venture: "Joint venture",
  development_financing: "Development financing",
  rent_to_own: "Rent to own",
};

export const BUILD_STAGE_LABEL: Record<string, string> = {
  completed: "Completed, ready now",
  under_construction: "Under construction",
  not_started: "Not started yet",
};

/** property_check_type, in words a buyer reads rather than column names. */
export const CHECK_LABEL: Record<string, string> = {
  listing_authenticity: "The listing is genuine",
  ownership_validation: "The agency can sell it",
  media_validation: "The photos match the property",
  freshness_validation: "Still available",
  structural_assessment: "Structural condition",
  flood_risk: "Flood risk",
  government_acquisition_risk: "Government acquisition risk",
};
