"use client";
/**
 * Verification, as React (was renderVerification/loadVerification in src/legacy/agency/inline-3.js). The checklist an agency
 * works through to be verified, and the only place its legal documents are collected.
 *
 * Everything shown is derived by SynListings.verificationStatus() from the documents table -- no separate progress counter to
 * fall out of step with what was actually uploaded. The four states (missing, pending, verified, expired) call for different
 * things from the reader: upload it, wait, nothing, replace it.
 *
 * is_verified is never settable from this page. Supplying the papers is the agency's half and checking them is ours; an agency
 * that could mark its own CAC certificate verified would make the badge worthless.
 *
 * portalShell's loadVerification() survives as a name (goToPane calls it) and fires `syn:verification-load`.
 */
import { useEffect, useRef, useState } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const regate = () => { if (typeof W().loadListingGate === "function") W().loadListingGate(); };

type File = { id: string; storage_url: string; display_name?: string; issuing_state?: string; created_at?: string; file_size_bytes?: number };
type Row = { key: string; label: string; body: string; hint: string; scope?: string; required?: boolean; state: "missing" | "pending" | "verified" | "expired"; files: File[] };
type Status = { rows: Row[]; outstanding: number; complete?: boolean; exempt?: boolean; exemptNote?: string };

const VF_CHIP = { missing: "Not uploaded", pending: "In review", verified: "Verified", expired: "Expired" };

/* A SynIcons icon. Drawn once the page scripts (icons.js among them) are in, so the static page and the first client render agree. */
export function Icon({ name }: { name: string }) {
  const ready = usePageScripts();
  return <span data-icon={name} className="has-icon" dangerouslySetInnerHTML={{ __html: (ready && W().SynIcons?.svg?.(name)) || "" }}></span>;
}

function FileRow({ f, reload }: { f: File; reload: () => void }) {
  const [opening, setOpening] = useState(false);
  const [removing, setRemoving] = useState(false);
  const when = f.created_at ? new Date(f.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const kb = f.file_size_bytes ? Math.max(1, Math.round(f.file_size_bytes / 1024)) : null;
  const open = () => {
    setOpening(true);
    W().SynListings.documentLink(f.storage_url)
      .then((url: string) => { window.open(url, "_blank", "noopener"); })
      .catch(() => toast("Could not open that document"))
      .then(() => setOpening(false));
  };
  const remove = () => {
    /* Deleting somebody's ID is not an undo-able mistake, so it asks. */
    if (!window.confirm("Remove this document? The file is deleted as well.")) return;
    setRemoving(true);
    W().SynListings.deleteDocument(f.id, f.storage_url)
      .then(() => { toast("Document removed"); regate(); reload(); })
      .catch((err: any) => { setRemoving(false); toast((err && err.message) || "Could not remove that"); });
  };
  return (
    <div className="vf-file" data-doc={f.id} data-path={f.storage_url}>
      <span className="vf-fname">{f.display_name || "Document"}{f.issuing_state ? " · " + f.issuing_state : ""}</span>
      <span className="vf-fmeta">{when}{kb ? " · " + kb + "KB" : ""}</span>
      <button type="button" className="vf-fbtn" data-open="" disabled={opening} onClick={open}>Open</button>
      <button type="button" className="vf-fbtn danger" data-remove="" disabled={removing} onClick={remove}>Remove</button>
    </div>
  );
}

export function VerificationPane() {
  const [st, setSt] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, string>>({});
  /* One hidden input, reused, and what it is uploading for. */
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<{ type: string; state: string | null } | null>(null);

  const load = () => {
    const L = W().SynListings;
    if (!L || !L.verificationStatus) return;
    L.verificationStatus()
      .then((s: Status) => { setSt(s); setFailed(false); })
      .catch((err: any) => { console.error("verificationStatus failed", err); setFailed(true); });
  };
  useEffect(() => {
    window.addEventListener("syn:verification-load", load);
    return () => window.removeEventListener("syn:verification-load", load);
  }, []);

  const pick = (r: Row, sel: HTMLSelectElement | null) => {
    if (r.scope === "state" && !states[r.key]) {
      toast("Choose the state that issued this licence first");
      sel?.focus();
      return;
    }
    pending.current = { type: r.key, state: r.scope === "state" ? states[r.key] : null };
    if (input.current) { input.current.value = ""; input.current.click(); }
  };
  const upload = () => {
    const file = input.current?.files && input.current.files[0];
    const job = pending.current;
    if (!file || !job) return;
    pending.current = null;
    setUploading(job.type);
    W().SynListings.uploadDocument(file, { type: job.type, state: job.state })
      .then(() => { toast("Uploaded — the verification desk will review it"); setStates((s) => ({ ...s, [job.type]: "" })); regate(); load(); })
      .catch((err: any) => toast((err && err.message) || "Could not upload that document"))
      .then(() => setUploading(null));
  };

  let content = null;
  if (failed && !st) {
    content = <div className="ov-blank">Could not load your documents. Reload the page, or call Synapse if it keeps happening.</div>;
  } else if (st) {
    const required = st.rows.filter((r) => r.required);
    const done = required.length - st.outstanding;
    const pct = required.length ? Math.round((done / required.length) * 100) : 0;
    const placeNames: string[] = (W().SynPlaces && W().SynPlaces.STATES) || [];
    content = (
      <>
        {/* An exempt agency is not shown a progress bar reading 0%. It joined before any of this existed and is not behind on
            anything; it keeps the list, because uploading still raises the tier -- it just stops being asked. */}
        {st.exempt ? (
          <div className="vf-head"><div><div className="vf-count">Nothing outstanding</div>
            <div className="vf-sub">{st.exemptNote || "Your agency was verified before Synapse began collecting these documents."} You can still add any of them below.</div></div></div>
        ) : (
          <div className="vf-head">
            <div><div className="vf-count">{done} of {required.length} required documents on file</div>
              <div className="vf-sub">{st.complete ? "Nothing outstanding. The verification desk reviews these next." : "Upload the rest and your listings can carry a verified badge."}</div></div>
            <span className="vf-bar"><i style={{ width: pct + "%" }}></i></span>
          </div>
        )}
        {st.rows.map((r) => {
          const isState = r.scope === "state";
          const busy = uploading === r.key;
          return (
            <div className="vf-row" data-type={r.key} key={r.key}>
              <span className="vf-ico"><Icon key={r.state === "verified" ? "v" : "l"} name={r.state === "verified" ? "verified" : "legal"} /></span>
              <div className="vf-main">
                <div className="vf-t"><span className="vf-name">{r.label}</span>
                  <span className={"vf-chip " + r.state}>{VF_CHIP[r.state]}</span>
                  {r.required && !st.exempt ? <span className="vf-req">Required</span> : null}</div>
                <div className="vf-body-l">{r.body}</div>
                <div className="vf-hint">{r.hint}</div>
                {r.files.length ? <div className="vf-files">{r.files.map((f) => <FileRow key={f.id} f={f} reload={load} />)}</div> : null}
                <div className="vf-act">
                  {isState ? (
                    <select className="vf-state" data-state="" aria-label="Issuing state" value={states[r.key] || ""}
                      onChange={(e) => setStates((s) => ({ ...s, [r.key]: e.target.value }))}>
                      <option value="">Which state?</option>
                      {placeNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  ) : null}
                  <button type="button" className="vf-up" data-pick="" disabled={busy}
                    onClick={(e) => pick(r, e.currentTarget.parentElement!.querySelector<HTMLSelectElement>("[data-state]"))}>
                    {busy ? "Uploading…" : <><Icon name="plus" />{r.files.length ? (isState ? "Add another state" : "Replace") : "Upload"}</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <p className="vf-note">Documents are stored in a private bucket and opened through links that expire after two minutes. Only the people who run
          this agency and the Synapse verification desk can see them {"—"} your agents cannot.</p>
      </>
    );
  }
  return (
    <>
      <div id="vfBody">{content}</div>
      <input type="file" ref={input} accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*" style={{ display: "none" }} onChange={upload} />
    </>
  );
}
