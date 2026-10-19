"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NG_STATES } from "@/lib/ng-states";
import { DOC_ACCEPT, checkUpload, deleteDocument, documentLink, uploadDocument, verificationStatus } from "../data/documents";
import type { DocRow, DocState, VerificationStatus } from "../data/verification";
import s from "./Verification.module.css";

const CHIP: Record<DocState, string> = { missing: "Not uploaded", pending: "In review", verified: "Verified", expired: "Expired" };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

/**
 * Get verified. The checklist of documents an agency must hold, and the only place they are collected. The files are private: opened through
 * links that expire after two minutes, and visible only to the people who run the agency and the Synapse verification desk (agents cannot).
 */
export function VerificationPane({ onChanged }: { onChanged?: () => void }) {
  const [st, setSt] = useState<VerificationStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // the document type being uploaded
  const [states, setStates] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const job = useRef<{ type: string; state: string | null } | null>(null);

  const reload = useCallback(async () => {
    try { setSt(await verificationStatus()); setFailed(false); } catch (e) { console.error("verificationStatus failed", e); setFailed(true); }
  }, []);
  useEffect(() => {
    let live = true;
    verificationStatus().then((v) => live && setSt(v)).catch((e) => { console.error("verificationStatus failed", e); if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  const say = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 4000); };

  const pick = (type: string, scope: "federal" | "state") => {
    const state = scope === "state" ? states[type] || "" : null;
    if (scope === "state" && !state) return say("Choose the state that issued this licence first");
    job.current = { type, state };
    if (file.current) { file.current.value = ""; file.current.click(); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const j = job.current;
    job.current = null;
    if (!f || !j) return;
    const problem = checkUpload(f, j.type, j.state);
    if (problem) return say(problem);
    setBusy(j.type);
    try {
      await uploadDocument(f, j);
      say("Uploaded. The verification desk will review it");
      onChanged?.();
      await reload();
    } catch (err) {
      say((err as Error)?.message || "Could not upload that document");
    } finally {
      setBusy(null);
    }
  };

  const open = async (d: DocRow) => {
    try { window.open(await documentLink(d.storage_url), "_blank", "noopener"); } catch { say("Could not open that document"); }
  };
  const remove = async (d: DocRow) => {
    setConfirmId(null);
    try { await deleteDocument(d.id, d.storage_url); say("Document removed"); onChanged?.(); await reload(); } catch (err) { say((err as Error)?.message || "Could not remove that"); }
  };

  if (failed) return <p className={s.blank}>Could not load your documents. Reload the page, or call Synapse if it keeps happening.</p>;
  if (!st) return <p className={s.blank}>Loading…</p>;

  const required = st.rows.filter((r) => r.required);
  const done = required.length - st.outstanding;
  const pct = required.length ? Math.round((done / required.length) * 100) : 0;

  return (
    <div>
      <input ref={file} type="file" accept={DOC_ACCEPT} hidden onChange={onFile} />
      {msg && <div className={s.toast} role="status">{msg}</div>}

      <div className={s.head}>
        {st.exempt ? (
          <div>
            <div className={s.count}>Nothing outstanding</div>
            <div className={s.sub}>{st.exemptNote || "Your agency was verified before Synapse began collecting these documents."} You can still add any of them below.</div>
          </div>
        ) : (
          <>
            <div>
              <div className={s.count}>{done} of {required.length} required documents on file</div>
              <div className={s.sub}>{st.complete ? "Nothing outstanding. The verification desk reviews these next." : "Upload the rest and your listings can carry a verified badge."}</div>
            </div>
            <span className={s.bar}><i style={{ width: `${pct}%` }} /></span>
          </>
        )}
      </div>

      {st.rows.map((r) => {
        const isState = r.scope === "state";
        return (
          <div key={r.key} className={s.row}>
            <span className={s.ico} aria-hidden="true">{r.state === "verified" ? "✓" : "§"}</span>
            <div className={s.main}>
              <div className={s.t}>
                <span className={s.name}>{r.label}</span>
                <span className={`${s.chip} ${s[r.state]}`}>{CHIP[r.state]}</span>
                {r.required && !st.exempt && <span className={s.req}>Required</span>}
              </div>
              <div className={s.bodyL}>{r.body}</div>
              <div className={s.hint}>{r.hint}</div>
              {r.files.length > 0 && (
                <div className={s.files}>
                  {r.files.map((d) => (
                    <div key={d.id} className={s.file}>
                      <span className={s.fname}>{d.display_name || "Document"}{d.issuing_state ? ` · ${d.issuing_state}` : ""}</span>
                      <span className={s.fmeta}>{when(d.created_at)}{d.file_size_bytes ? ` · ${Math.max(1, Math.round(d.file_size_bytes / 1024))}KB` : ""}</span>
                      <button type="button" className={s.fbtn} onClick={() => open(d)}>Open</button>
                      {confirmId === d.id ? (
                        // deleting somebody's ID is not an undo-able mistake, so it asks
                        <>
                          <span className={s.fmeta}>Delete the file too?</span>
                          <button type="button" className={`${s.fbtn} ${s.danger}`} onClick={() => remove(d)}>Yes, remove</button>
                          <button type="button" className={s.fbtn} onClick={() => setConfirmId(null)}>Keep</button>
                        </>
                      ) : <button type="button" className={`${s.fbtn} ${s.danger}`} onClick={() => setConfirmId(d.id)}>Remove</button>}
                    </div>
                  ))}
                </div>
              )}
              <div className={s.act}>
                {isState && (
                  <select className={s.stateSel} aria-label="Issuing state" value={states[r.key] ?? ""} onChange={(e) => setStates((x) => ({ ...x, [r.key]: e.target.value }))}>
                    <option value="">Which state?</option>
                    {NG_STATES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
                <button type="button" className={s.up} disabled={busy === r.key} onClick={() => pick(r.key, r.scope)}>
                  {busy === r.key ? "Uploading…" : r.files.length ? (isState ? "Add another state" : "Replace") : "Upload"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <p className={s.note}>Documents are stored in a private bucket and opened through links that expire after two minutes. Only the people who run this agency and the Synapse verification desk can see them. Your agents cannot.</p>
    </div>
  );
}
