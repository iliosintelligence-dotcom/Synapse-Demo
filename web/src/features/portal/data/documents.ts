import { supabase } from "@/lib/supabase";
import { agencyId, fetchAgencyHeader } from "./agency";
import { DOC_CATALOGUE, deriveVerification, type DocRow, type Exemption, type VerificationStatus } from "./verification";

/**
 * The agency's papers. The bucket is PRIVATE: nothing here is a URL you can open. `storage_url` holds the PATH, and `documentLink` trades it
 * for a signed URL that lives two minutes, at the moment somebody clicks. A director's ID behind a guessable URL is the exact failure this exists to avoid.
 */
const BUCKET = "agency-documents";
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
export const DOC_MAX_BYTES = 15 * 1024 * 1024;
export const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*";

const extFor = (file: File) => ({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" } as Record<string, string>)[file.type] ?? "pdf";

export async function listDocuments(): Promise<DocRow[]> {
  const aid = await agencyId();
  if (!aid) return [];
  const r = await supabase.from("documents")
    .select("id, document_type, display_name, storage_url, issuing_state, is_verified, verified_at, expires_at, file_size_bytes, mime_type, created_at")
    .eq("entity_type", "agency").eq("entity_id", aid).is("deleted_at", null).eq("is_current", true).order("created_at", { ascending: false });
  if (r.error) throw r.error;
  return (r.data as DocRow[]) ?? [];
}

export async function documentLink(path: string): Promise<string> {
  const r = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
  if (r.error) throw r.error;
  return r.data.signedUrl;
}

/** Marker readable by the agency and writable by neither: the table has a SELECT policy and nothing else, so an agency cannot exempt itself. */
async function exemption(): Promise<Exemption | null> {
  try {
    const aid = await agencyId();
    if (!aid) return null;
    const r = await supabase.from("agency_verifications").select("documents_reviewed, verification_notes, current_tier").eq("agency_id", aid).is("deleted_at", null).maybeSingle();
    return r.error ? null : (r.data as Exemption | null);
  } catch {
    return null;
  }
}

export async function verificationStatus(): Promise<VerificationStatus> {
  const [docs, ag, ex] = await Promise.all([listDocuments(), fetchAgencyHeader().catch(() => null), exemption()]);
  return deriveVerification(docs, ag?.verification_tier, ex);
}

/** The refusals are said BEFORE a 15 MB upload, not after it. */
export function checkUpload(file: File | undefined, type: string, state: string | null): string | null {
  if (!file) return "No file selected";
  if (!TYPES.includes(file.type)) return "Use a PDF, JPG, PNG or WEBP";
  if (file.size > DOC_MAX_BYTES) return `That file is ${Math.ceil(file.size / 1024 / 1024)}MB. Keep it under 15MB`;
  const spec = DOC_CATALOGUE.find((s) => s.key === type);
  if (!spec) return "Unknown document type";
  if (spec.scope === "state" && !state) return "Choose the state that issued this licence";
  return null;
}

/**
 * Upload, then supersede, then record. The order matters: the old document is superseded (is_current = false) only AFTER the new file is
 * safely stored, because a certificate is evidence of what was on file when a decision was taken. The row is only written if the upload
 * succeeded (pointing at a file that failed to upload is worse than an orphan), and the file is removed again if the row cannot be written.
 */
export async function uploadDocument(file: File, o: { type: string; state: string | null; expiresAt?: string | null; name?: string }): Promise<void> {
  const problem = checkUpload(file, o.type, o.state);
  if (problem) throw new Error(problem);
  const spec = DOC_CATALOGUE.find((s) => s.key === o.type)!;
  const aid = await agencyId();
  if (!aid) throw new Error("no-agency: this account is not a member of any agency");

  const path = `${aid}/${o.type}-${Date.now()}.${extFor(file)}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "0", upsert: false, contentType: file.type });
  if (up.error) throw up.error;

  let sup = supabase.from("documents").update({ is_current: false, updated_at: new Date().toISOString() })
    .eq("entity_type", "agency").eq("entity_id", aid).eq("document_type", o.type).eq("is_current", true);
  if (spec.scope === "state") sup = sup.eq("issuing_state", o.state!);
  const sr = await sup;
  if (sr.error) throw sr.error;

  const me = (await supabase.auth.getUser()).data.user?.id;
  const ins = await supabase.from("documents").insert({
    entity_type: "agency", entity_id: aid, document_type: o.type, display_name: o.name?.trim() || spec.label, storage_url: path,
    issuing_state: spec.scope === "state" ? o.state : null, expires_at: o.expiresAt || null, file_size_bytes: file.size, mime_type: file.type,
    uploaded_by: me,
    is_current: true, // is_verified is never set here: the agency does not verify its own papers
  }).select("id").single();
  if (ins.error) {
    void supabase.storage.from(BUCKET).remove([path]); // do not leave a private bucket filling with unreferenced IDs
    throw ins.error;
  }
}

/**
 * A HARD delete, on purpose. A soft delete (stamping deleted_at) can never work here: `documents_select` requires deleted_at is null, and
 * PostgreSQL applies SELECT policies to the NEW row on UPDATE, so stamping it makes the row invisible to the very policy that must admit it.
 * This path is for "I uploaded the wrong file", and the file goes with the row. The history that matters is superseding on replacement.
 */
export async function deleteDocument(id: string, path: string | null): Promise<void> {
  const r = await supabase.from("documents").delete().eq("id", id);
  if (r.error) throw r.error;
  if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => null);
}
