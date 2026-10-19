/**
 * The checklist an agency works through to be verified, and the only place its legal documents are collected. Everything shown is DERIVED
 * from the documents table, with no separate progress counter to fall out of step with what was actually uploaded.
 *
 * Four states per row, and they call for different things from the reader: missing (upload it), pending (wait), verified (nothing), expired
 * (replace it). `is_verified` is never settable from the portal: supplying the papers is the agency's half and checking them is Synapse's.
 * An agency that could mark its own CAC certificate verified would make the badge worthless.
 */
export interface DocSpec { key: string; label: string; body: string; scope: "federal" | "state"; required: boolean; hint: string }

/**
 * What a real-estate business in Nigeria must actually hold. Order is the order of obligation, not of convenience: CAC first because nothing
 * else exists without it, SCUML second because the EFCC requires it BEFORE you may trade, then the practice registrations, then the state
 * licence. `required` marks the four an agency cannot operate without; the rest raise the tier but do not block.
 */
export const DOC_CATALOGUE: DocSpec[] = [
  { key: "cac_certificate", label: "CAC certificate", body: "Corporate Affairs Commission", scope: "federal", required: true, hint: "Your certificate of incorporation." },
  { key: "scuml_certificate", label: "SCUML certificate", body: "EFCC", scope: "federal", required: true, hint: "Anti-money-laundering registration. Required before you may trade." },
  { key: "agency_license", label: "State licence", body: "State authority", scope: "state", required: true, hint: "LASRERA in Lagos. One per state you work in." },
  { key: "directors_id", label: "Director’s ID", body: "Government issued", scope: "federal", required: true, hint: "NIN slip, passport or driver’s licence." },
  { key: "esvarbon_registration", label: "ESVARBON registration", body: "Estate Surveyors and Valuers Registration Board", scope: "federal", required: false, hint: "If your firm practises estate surveying or valuation." },
  { key: "niesv_membership", label: "NIESV membership", body: "Nigerian Institution of Estate Surveyors and Valuers", scope: "federal", required: false, hint: "Professional membership certificate." },
  { key: "bank_statement", label: "Bank statement", body: "Corporate account", scope: "federal", required: false, hint: "Recent statement in the company’s name." },
];

export interface DocRow {
  id: string; document_type: string; display_name: string | null; storage_url: string; issuing_state: string | null; is_verified: boolean;
  verified_at: string | null; expires_at: string | null; file_size_bytes: number | null; mime_type: string | null; created_at: string | null;
}
export type DocState = "missing" | "pending" | "verified" | "expired";
export interface VerificationRow extends DocSpec { state: DocState; files: DocRow[] }
export interface VerificationStatus { tier: string; rows: VerificationRow[]; exempt: boolean; exemptNote: string | null; outstanding: number; complete: boolean }
export interface Exemption { documents_reviewed: boolean | null; verification_notes: string | null; current_tier: string | null }

/**
 * An agency verified before Synapse began collecting these documents is not behind on anything, so nothing is counted as outstanding and
 * the page stops asking. `documents_reviewed` is set by the verification desk, readable by the agency and writable by neither.
 */
export function deriveVerification(docs: DocRow[], tier: string | null | undefined, exemption: Exemption | null, now = Date.now()): VerificationStatus {
  const exempt = !!exemption?.documents_reviewed;
  const rows: VerificationRow[] = DOC_CATALOGUE.map((spec) => {
    const mine = docs.filter((d) => d.document_type === spec.key);
    let state: DocState = "missing";
    if (mine.length) {
      const allExpired = mine.every((d) => d.expires_at && new Date(d.expires_at).getTime() < now);
      state = allExpired ? "expired" : mine.some((d) => d.is_verified) ? "verified" : "pending";
    }
    return { ...spec, state, files: mine };
  });
  const missing = exempt ? [] : rows.filter((r) => r.required && (r.state === "missing" || r.state === "expired"));
  return { tier: tier || "unverified", rows, exempt, exemptNote: exempt ? exemption?.verification_notes ?? null : null, outstanding: missing.length, complete: missing.length === 0 };
}
