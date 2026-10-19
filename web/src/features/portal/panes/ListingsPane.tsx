"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchListings, filterListings, freshness, locationOf, needsRenewal, priceLabel, relist, relistAll, removeListing, setListingActive, type Listing, type ListingFilter } from "../data/listings";
import { ShareKit } from "./ShareKit";
import { ListingWizard } from "../listing-form/ListingWizard";
import { useIntent } from "../intent";
import { useToast } from "../ui/Toast";
import s from "./Listings.module.css";

const FILTERS: Array<[ListingFilter, string]> = [["all", "All"], ["verified", "Verified"], ["pending", "Pending"], ["expiring", "Expiring soon"]];
const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);

/** Your inventory. Expired listings are hidden from buyers until you re-list. */
export function ListingsPane() {
  const toast = useToast();
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [failed, setFailed] = useState("");
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [share, setShare] = useState<string | null>(null);
  const [wizard, setWizard] = useState<{ id: string | null } | null>(null);
  useIntent("new-listing", () => setWizard({ id: null }));

  const load = useCallback(async () => { try { setRows(await fetchListings()); setFailed(""); } catch (e) { setFailed(reason(e, "please refresh")); } }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const shown = useMemo(() => filterListings(rows ?? [], filter, q), [rows, filter, q]);
  const due = useMemo(() => needsRenewal(rows ?? []), [rows]);

  const run = async (key: string, work: () => Promise<string>, fb: string) => {
    setBusy(key);
    try { toast(await work()); await load(); } catch (e) { toast(reason(e, fb), "error"); } finally { setBusy(""); }
  };

  if (failed) return <div className={s.blank}><b>Could not load your listings</b><p className={s.muted}>{failed}</p><button type="button" className={`${s.btn} ${s.solid}`} onClick={() => void load()}>Try again</button></div>;
  if (!rows) return <p className={s.muted} aria-busy="true">Loading your listings…</p>;

  return (
    <>
      <div className={s.tools}>
        <div className={s.seg} role="group" aria-label="Filter listings">{FILTERS.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
        <div className={s.acts}>
          <input className={s.search} type="search" placeholder="Search listings…" aria-label="Search listings" value={q} onChange={(e) => setQ(e.target.value)} />
          {due.length > 0 && <button type="button" className={s.btn} disabled={busy === "all"} onClick={() => void run("all", async () => { const r = await relistAll(due); return `Renewed ${r.done} of ${r.requested} listing${r.requested === 1 ? "" : "s"}.`; }, "Could not renew those.")}>Re-list {due.length} expiring</button>}
          <button type="button" className={`${s.btn} ${s.solid}`} onClick={() => setWizard({ id: null })}>+ Add listing</button>
        </div>
      </div>

      {!rows.length ? (
        <div className={s.blank}><b>No listings yet</b><p className={s.muted}>Add your first property and the seven verification checks start automatically.</p><button type="button" className={`${s.btn} ${s.solid}`} onClick={() => setWizard({ id: null })}>+ Add your first listing</button></div>
      ) : !shown.length ? (
        <div className={s.blank}><b>Nothing matches</b><button type="button" className={s.btn} onClick={() => { setFilter("all"); setQ(""); }}>Show all listings</button></div>
      ) : (
        <div className={s.cards}>
          {shown.map((l) => {
            const f = freshness(l);
            return (
              <article key={l.id} className={s.lcard}>
                <div className={s.ph}>{l.cover ? <img src={l.cover} alt="" loading="lazy" /> : null}</div>
                <div className={s.lbody}>
                  <div className={s.tt}>{l.title}</div>
                  <div className={s.lc}>◍ {locationOf(l)}</div>
                  <div className={s.chips}>
                    <span className={s.pr}>{priceLabel(l)}</span>
                    <span className={`${s.st} ${s[l.state_]}`}>{l.state_ === "verified" ? "✓ Verified" : l.state_ === "pending" ? "◷ Pending review" : "Inactive"}</span>
                    <span className={`${s.chip} ${f.cls === "warn" ? s.warn : f.cls === "dead" ? s.dead : ""}`}>{f.label}</span>
                  </div>
                  <div className={s.acts}>
                    {!f.expired && <button type="button" className={s.btn} onClick={() => setShare(l.id)}>Share</button>}
                    {!f.expired && <button type="button" className={s.btn} onClick={() => setShare(l.id)}>Share</button>}
                    <button type="button" className={s.btn} disabled={busy === `r${l.id}`} onClick={() => void run(`r${l.id}`, async () => { await relist(l.id); return "Re-listed. It stays visible to buyers."; }, "Could not re-list that.")}>Re-list</button>
                    <button type="button" className={s.btn} disabled={busy === `a${l.id}`} onClick={() => void run(`a${l.id}`, async () => { await setListingActive(l.id, !l.active); return l.active ? "Hidden from buyers." : "Live again."; }, "Could not change that.")}>{l.active ? "Deactivate" : "Activate"}</button>
                    <button type="button" className={s.btn} onClick={() => setWizard({ id: l.id })}>Edit</button>
                    <button type="button" className={`${s.btn} ${s.danger}`} disabled={busy === `d${l.id}`} onClick={() => { if (window.confirm(`Delete “${l.title}”? Its leads and viewings are kept.`)) void run(`d${l.id}`, async () => { await removeListing(l.id); return "Listing deleted."; }, "Could not delete that."); }}>Delete</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    {share && <ShareKit listingId={share} onClose={() => setShare(null)} />}
    {wizard && <ListingWizard editId={wizard.id} onClose={() => setWizard(null)} onSaved={() => { setWizard(null); void load(); }} />}
    </>
  );
}
