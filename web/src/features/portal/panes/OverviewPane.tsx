"use client";

import { useEffect, useMemo, useState } from "react";
import { SynapseMap, type MapPin } from "@/components/map/SynapseMap";
import { stageCounts } from "../data/crm";
import { fetchLeads, nairaShort, type Lead } from "../data/leads";
import { VERIFICATION_CHECKS, fetchListings, filterListings, freshness, locationOf, priceLabel, type Listing, type ListingFilter } from "../data/listings";
import s from "./Listings.module.css";

const FILTERS: Array<[ListingFilter, string]> = [["all", "All"], ["verified", "Verified"], ["pending", "Pending"], ["expiring", "Expiring soon"]];
const TABS = [["details", "Details"], ["verification", "Verification"], ["leads", "Leads"], ["performance", "Performance"]] as const;
const IBADAN: [number, number] = [3.9470, 7.3775];
const initialsOf = (n: string) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** The command centre: every listing, its map pin, and a detail card for the one you pick. */
export function OverviewPane() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [failed, setFailed] = useState("");
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("details");

  useEffect(() => {
    let live = true;
    fetchListings().then((l) => live && setListings(l)).catch((e) => live && setFailed(e instanceof Error ? e.message : "please refresh"));
    fetchLeads().then((l) => live && setLeads(l)).catch(() => {});
    return () => { live = false; };
  }, []);

  const shown = useMemo(() => filterListings(listings ?? [], filter, q), [listings, filter, q]);
  const sel = shown.find((l) => l.id === selId) ?? shown[0] ?? null;
  const pins: MapPin[] = useMemo(() => shown.filter((l) => l.lat != null && l.lng != null).map((l) => ({ id: l.id, lng: l.lng!, lat: l.lat!, label: nairaShort(l.price), kind: "listing" as const, title: l.title, onClick: () => setSelId(l.id) })), [shown]);
  // leads are matched to a listing by its name, the only link the lead row carries beyond the property join
  const leadsFor = (l: Listing) => leads.filter((x) => x.property.toLowerCase().startsWith(l.title.toLowerCase().split(",")[0]));

  if (failed) return <div className={s.blank}><b>Could not load your listings</b><p className={s.muted}>{failed}</p></div>;
  if (!listings) return <p className={s.muted} aria-busy="true">Loading your listings…</p>;

  if (!listings.length) {
    return (
      <div className={s.blank}>
        <b>No listings yet</b>
        <p className={s.muted}>Add your first property and the seven verification checks start automatically. Tayo can only match buyers to homes that are listed here.</p>
        <a className={`${s.btn} ${s.solid}`} href="#listings">+ Add your first listing</a>
      </div>
    );
  }

  const f = sel ? freshness(sel) : null;
  const sl = sel ? leadsFor(sel) : [];
  const counts = stageCounts(sl);

  return (
    <>
      <div className={s.tools}>
        <div className={s.seg} role="group" aria-label="Filter listings">{FILTERS.map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
        <input className={s.search} type="search" placeholder="Search listings…" aria-label="Search listings" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!shown.length ? (
        <div className={s.blank}><b>Nothing in this view</b><p className={s.muted}>You have {listings.length} listing{listings.length === 1 ? "" : "s"}, just none matching{q ? ` “${q}”` : ""} here.</p><button type="button" className={s.btn} onClick={() => { setFilter("all"); setQ(""); }}>Show all listings</button></div>
      ) : (
        <div className={s.grid}>
          <div className={s.list}>
            {shown.map((l) => (
              <button key={l.id} type="button" className={s.item} aria-current={sel?.id === l.id} onClick={() => setSelId(l.id)}>
                <span className={s.ph}>{l.cover ? <img src={l.cover} alt="" loading="lazy" /> : null}</span>
                <span className={s.mid}><span className={s.tt} style={{ display: "block" }}>{l.title.split(",")[0]}</span><span className={s.lc} style={{ display: "block" }}>◍ {locationOf(l)}</span></span>
                <span className={s.rt}><span className={s.pr}>{priceLabel(l)}</span><span className={`${s.st} ${s[l.state_]}`}>{l.state_ === "verified" ? "✓ Verified" : l.state_ === "pending" ? "◷ Pending" : "Inactive"}</span></span>
              </button>
            ))}
          </div>

          {sel && f && (
            <div className={s.detail} aria-label="Listing detail">
              {pins.length > 0 && <div className={s.map}><SynapseMap center={pins.find((p) => p.id === sel.id) ? [pins.find((p) => p.id === sel.id)!.lng, pins.find((p) => p.id === sel.id)!.lat] : IBADAN} pins={pins} fit={pins.length > 1} label="Your listings" /></div>}
              <div className={s.card}>
                <div className={s.tabs} role="group" aria-label="Detail">{TABS.map(([k, label]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{label}</button>)}</div>
                {tab === "details" && (
                  <>
                    <div className={s.ttl}>{sel.title}</div>
                    <div className={s.price}>{priceLabel(sel)}</div>
                    <div className={s.chips}>
                      {sel.bedrooms != null && <span className={s.chip}>{sel.bedrooms} bed{sel.bedrooms === 1 ? "" : "s"}</span>}
                      <span className={s.chip}>◍ {locationOf(sel)}</span>
                      <span className={`${s.chip} ${f.cls === "warn" ? s.warn : f.cls === "dead" ? s.dead : ""}`}>{f.label}</span>
                      <span className={s.chip}>{sl.length} {sl.length === 1 ? "lead" : "leads"}</span>
                    </div>
                    <div className={s.acts}><a className={`${s.btn} ${s.solid}`} href="#listings">Open in Listings</a><a className={s.btn} href="#crm">View leads</a></div>
                  </>
                )}
                {tab === "verification" && (
                  <>
                    <div><b>{sel.passedChecks}/7 checks passed</b> {sel.passedChecks === 7 ? <span className={`${s.st} ${s.verified}`}>Verified · live to buyers</span> : <span className={`${s.st} ${s.pending}`}>{7 - sel.passedChecks} remaining</span>}</div>
                    <div className={s.checks}>{VERIFICATION_CHECKS.map((c, i) => <div key={c} className={i < sel.passedChecks ? s.ok : ""}>{i < sel.passedChecks ? "✓" : "○"} {c}</div>)}</div>
                  </>
                )}
                {tab === "leads" && (sl.length ? sl.slice(0, 6).map((x) => <div key={x.id} className={s.lead}><span className={s.chip}>{initialsOf(x.name)}</span><div><b>{x.name}</b><div className={s.lc}>{x.stage} · {x.ageLabel}</div></div></div>) : <p className={s.muted}>No leads on this listing yet.</p>)}
                {tab === "performance" && (
                  <>
                    <div className={s.muted}>Where this listing’s {sl.length} {sl.length === 1 ? "lead is" : "leads are"} in your pipeline right now.</div>
                    <div className={s.kv}>{(["New", "Contacted", "Viewing", "Negotiation", "Won"] as const).map((st) => <div key={st}><b>{counts[st]}</b><span>{st}</span></div>)}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
