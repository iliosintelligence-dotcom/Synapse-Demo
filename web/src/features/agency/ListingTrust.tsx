"use client";
/**
 * One listing's face and papers, in the side drawer: which teammate answers for it (their portrait goes on the listing page and
 * new leads on it go to them), and what Synapse needs to verify it. The three things the verification desk must see before it
 * can mark a home verified are a photo, a title with an address and a price, and proof of ownership; the first two are already
 * on the listing, the papers are uploaded here into a private store only the agency and the desk can open.
 *
 * Verifying is never done from here. The agency supplies; Synapse checks (see VerifyDesk).
 */
import { useEffect, useRef, useState } from "react";
import { showDrawer } from "./SideDrawer";
import "./ListingTrust.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
type Paper = { id: string; document_type: string; display_name?: string; storage_url: string; is_verified?: boolean; created_at?: string };
type Person = { id: string; name: string; role: string; avatar?: string | null };

const Tick = ({ ok }: { ok: boolean }) => <span className={"lt-tick" + (ok ? " ok" : "")} aria-hidden="true">{ok ? "✓" : ""}</span>;

function ListingTrust({ l }: { l: any }) {
  const L = W().SynListings;
  const types: { key: string; label: string }[] = (L && L.PROPERTY_PAPERS) || [];
  const [people, setPeople] = useState<Person[] | null>(null);
  const [agent, setAgent] = useState<string>(l.listed_by_agent_id || "");
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [kind, setKind] = useState(types[0] ? types[0].key : "other");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const loadPapers = () => L.propertyDocuments(l.id).then(setPapers).catch((e: any) => { console.error("papers", e); setPapers([]); });
  useEffect(() => {
    if (W().SynLoadRoster) W().SynLoadRoster().then((p: Person[]) => setPeople(p || [])).catch(() => setPeople([]));
    if (L && L.propertyDocuments) loadPapers();
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const pickAgent = (id: string) => {
    const prev = agent;
    setAgent(id);
    L.setListingAgent(l.id, id || null)
      .then(() => {
        l.listed_by_agent_id = id || null;
        const who = people?.find((p) => p.id === id);
        toast(id ? (who ? who.name : "Your teammate") + " now answers for this listing" : "This listing shows the agency only");
        W().renderListings?.();
      })
      .catch((e: any) => { setAgent(prev); toast("Could not change the agent - " + ((e && e.message) || "please try again")); });
  };
  const upload = () => {
    const f = file.current?.files?.[0];
    if (!f) return;
    setBusy(true);
    L.uploadPropertyDocument(l.id, f, kind)
      .then(() => { toast("Paper added. Synapse will check it"); loadPapers(); })
      .catch((e: any) => toast((e && e.message) || "That file would not upload"))
      .then(() => { setBusy(false); if (file.current) file.current.value = ""; });
  };
  const open = (p: Paper) => L.propertyDocumentLink(p.storage_url).then((u: string) => window.open(u, "_blank", "noopener")).catch(() => toast("Could not open that file"));
  const remove = (p: Paper) => {
    if (!window.confirm("Remove this paper?")) return;
    L.deletePropertyDocument(p.id, p.storage_url).then(() => { toast("Removed"); loadPapers(); }).catch((e: any) => toast((e && e.message) || "Could not remove that"));
  };

  const photos = (l.media || []).filter((m: any) => m && m.url).length;
  const basics = !!(String(l.title || "").trim() && String(l.address || "").trim() && Number(l.price) > 0);
  const hasPapers = !!papers && papers.length > 0;
  const verified = l.verification_status === "verified";
  const label = (k: string) => (types.find((t) => t.key === k) || { label: k.replace(/_/g, " ") }).label;
  const me = people?.find((p) => p.id === agent);

  return (
    <div className="lt">
      <div style={{ fontSize: "19px", fontWeight: 700 }}>{l.title || "This listing"}</div>
      <p className="muted" style={{ fontSize: "12.5px", margin: "4px 0 16px" }}>Who answers for it, and what Synapse needs to verify it.</p>

      <div className="sec">
        <div className="k">Listing agent</div>
        <div className="lt-agent">
          <span className="lt-face" style={me && me.avatar ? { backgroundImage: `url("${me.avatar}")` } : undefined}>{me && !me.avatar ? me.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : null}</span>
          <select className="lt-sel" aria-label="Listing agent" value={agent} disabled={!people} onChange={(e) => pickAgent(e.target.value)}>
            <option value="">The agency only</option>
            {(people || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <p className="lt-note">Buyers see this person’s photo and name on the listing, and new leads on it go to them.{me && !me.avatar ? " They have no photo yet: they can add one from their profile." : ""}</p>
      </div>

      <div className="sec">
        <div className="k">{verified ? "Verified by Synapse" : "To get verified"}</div>
        {verified
          ? <p className="lt-note">Synapse checked this listing{l.verified_at ? " on " + new Date(l.verified_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}. Buyers see the verified stamp.</p>
          : <>
            <ul className="lt-list">
              <li><Tick ok={photos > 0} />{photos > 0 ? photos + " photo" + (photos === 1 ? "" : "s") : "Add at least one photo"}</li>
              <li><Tick ok={basics} />{basics ? "Title, address and price" : "Add the title, address and price"}</li>
              <li><Tick ok={hasPapers} />{hasPapers ? "Proof of ownership uploaded" : "Upload proof of ownership below"}</li>
            </ul>
            <p className="lt-note">{photos > 0 && basics && hasPapers ? "Ready. Synapse checks the papers and photos, then marks it verified." : "When all three are done, Synapse checks them and marks the listing verified."}</p>
          </>}
      </div>

      <div className="sec">
        <div className="k">Ownership papers</div>
        {papers == null ? <p className="lt-note">Loading…</p> : !papers.length ? <p className="lt-note">Nothing uploaded yet. A C of O, Governor’s Consent, deed or survey plan, or a letter from the owner letting you list it.</p>
          : papers.map((p) => (
            <div key={p.id} className="lt-paper">
              <div className="lt-pb"><b>{label(p.document_type)}</b><span>{p.display_name}{p.is_verified ? " · checked" : ""}</span></div>
              <button type="button" className="btn" onClick={() => open(p)}>Open</button>
              <button type="button" className="btn" onClick={() => remove(p)}>Remove</button>
            </div>
          ))}
        <div className="lt-up">
          <select className="lt-sel" aria-label="What is this paper" value={kind} onChange={(e) => setKind(e.target.value)}>
            {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <button type="button" className="btn btn-primary" disabled={busy || !l.id} onClick={() => file.current?.click()}>{busy ? "Uploading…" : "Upload"}</button>
          <input ref={file} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" hidden onChange={upload} />
        </div>
        <p className="lt-note">Private: only your agency and Synapse’s verification team can open these. Buyers never see them.</p>
      </div>
    </div>
  );
}

export const openListingTrust = (l: any) => showDrawer(<ListingTrust l={l} />);
