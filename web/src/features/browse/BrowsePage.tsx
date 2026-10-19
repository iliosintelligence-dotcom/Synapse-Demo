"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { routes } from "@/lib/routes";
import { toggleSave, useSaves } from "@/lib/saved";
import { CompareSheet } from "./CompareSheet";
import { ListingCard } from "./ListingCard";
import { applyFilters, sortItems } from "./filter";
import { DEFAULT_PREFS, readPrefs, readViews, recordView, takeLastVisit, writePrefs, type Prefs, type ViewedHome } from "./local";
import { fetchFeed, fetchSessionMatches } from "./queries";
import type { BrowseItem, DealCat } from "./types";
import { moneyShort } from "@/lib/money";
import s from "./Browse.module.css";

const DEALS: Array<{ id: DealCat; label: string }> = [
  { id: "sale", label: "Buy" }, { id: "rent", label: "Rent" }, { id: "shared", label: "Shared living" }, { id: "land", label: "Land" },
  { id: "offplan", label: "Off-plan" }, { id: "invest", label: "Investment" }, { id: "shortlet", label: "Short-let" },
];

type Load = "loading" | "ready" | "failed";

export function BrowsePage() {
  const [feed, setFeed] = useState<BrowseItem[]>([]);
  const [counts, setCounts] = useState<{ total: number; verified: number } | null>(null);
  const [mine, setMine] = useState<BrowseItem[] | null>(null); // Tayo's matches for this visitor; null = no conversation yet
  const [load, setLoad] = useState<Load>("loading");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [recent, setRecent] = useState<ViewedHome[]>([]);
  const [lastVisit, setLastVisit] = useState<number | null>(null);
  const [visitor, setVisitor] = useState<string | null>(null);
  const saves = useSaves();

  // Browser-only state (device preferences, history, visitor id) is read once after mount, never during render, so the static HTML
  // and the first client render match. This is the one place a setState inside an effect is the right tool.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPrefs(readPrefs());
    setRecent(readViews());
    setLastVisit(takeLastVisit());
    let v: string | null = null;
    try { v = localStorage.getItem("toju_visitor_v1"); } catch { /* no visitor id */ }
    setVisitor(v);

    let live = true;
    fetchFeed()
      .then((r) => { if (live) { setFeed(r.items); setCounts({ total: r.total, verified: r.verified }); setLoad("ready"); } })
      .catch(() => { if (live) setLoad("failed"); });
    if (v) fetchSessionMatches(v).then((r) => { if (live && r.hasSession) setMine(r.items); }).catch(() => {});
    return () => { live = false; };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => { const next = { ...p, ...patch }; writePrefs(next); return next; });
  }, []);

  const base = mine ?? feed;
  const shown = useMemo(() => sortItems(applyFilters(base, prefs, query, null), prefs.sort), [base, prefs, query]);
  const compareOn = saves.size >= 2;
  const pickedItems = base.filter((l) => picked.includes(l.id));
  const fresh = useMemo(
    () => (lastVisit && !mine ? shown.filter((l) => l.listedAt && Date.parse(l.listedAt) > lastVisit) : []),
    [shown, lastVisit, mine],
  );

  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]));

  const card = (l: BrowseItem) => (
    <ListingCard
      key={l.id}
      l={l}
      saved={saves.has(l.id)}
      compareOn={compareOn}
      picked={picked.includes(l.id)}
      onSave={() => toggleSave(l.id)}
      onPick={() => togglePick(l.id)}
      onOpen={() => { recordView(l); setRecent(readViews()); }}
    />
  );

  const status =
    load === "failed" ? "Couldn’t load homes"
    : mine ? (mine.length ? `${mine.length} match your brief` : "Nothing fits your brief yet")
    : counts ? `${counts.total} live · ${counts.verified} verified` : "Loading homes…";

  return (
    <main className={s.page}>
      <header className={s.head}>
        <h1 className={s.h1}>{mine ? "Your matches" : "Browse homes"}</h1>
        <span className={s.count}>{status}</span>
        {saves.size > 0 && <span className={s.saved} title="Your saved homes">♥ {saves.size} saved home{saves.size === 1 ? "" : "s"}</span>}
      </header>

      <div className={s.search}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by area, city, type or price, e.g. Lekki, 3-bed, duplex, under 150M…"
          aria-label="Search homes"
          autoComplete="off"
        />
        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>✕</button>}
      </div>

      <div className={s.toolbar}>
        <div className={s.deals} role="group" aria-label="Kind of deal">
          {DEALS.map((d) => (
            <button key={d.id} type="button" className={prefs.deal === d.id ? s.on : ""} aria-pressed={prefs.deal === d.id} onClick={() => update({ deal: prefs.deal === d.id ? "all" : d.id })}>
              {d.label}
            </button>
          ))}
        </div>
        <select value={prefs.sort} aria-label="Sort" onChange={(e) => update({ sort: e.target.value as Prefs["sort"] })}>
          <option value="match">Sort: Best match</option>
          <option value="price">Sort: Price (low → high)</option>
          <option value="trust">Sort: Property confidence</option>
        </select>
        <button type="button" className={`${s.vtoggle} ${prefs.verifiedOnly ? s.on : ""}`} aria-pressed={prefs.verifiedOnly} onClick={() => update({ verifiedOnly: !prefs.verifiedOnly })} title="Show only homes Synapse has checked">
          <span className={s.box}>{prefs.verifiedOnly ? "✓" : ""}</span> Verified only
        </button>
      </div>

      {recent.length > 0 && (
        <section className={s.recent} aria-label="Recently viewed">
          <div className={s.recentH}>Recently viewed</div>
          <div className={s.recentTrack}>
            {recent.map((v) => (
              <a key={v.id} className={s.rc} href={routes.property(v.id)}>
                <span className={s.rcPrice}>{moneyShort(v.priceN)}{v.per ? <i>/yr</i> : null}</span>
                <span className={s.rcTtl}>{v.ttl}</span>
                <span className={s.rcLoc}>{v.loc}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {fresh.length > 0 && (
        <section className={s.fresh} aria-labelledby="freshH">
          <div className={s.freshH}><span id="freshH">New since your last visit</span><span>{fresh.length === 1 ? "1 home" : `${fresh.length} homes`}</span></div>
          <div className={s.grid}>{fresh.map(card)}</div>
        </section>
      )}

      <div className={s.grid} aria-busy={load === "loading"}>
        {load === "loading" && !mine && Array.from({ length: 6 }, (_, i) => <div key={i} className={s.skeleton} aria-hidden="true" style={{ ["--i" as string]: i }} />)}
        {shown.map(card)}
      </div>

      {load !== "loading" && shown.length === 0 && (
        <div className={s.empty}>
          {load === "failed" ? (
            <>
              <div className={s.emptyTtl}>Nothing to show right now</div>
              <p>We couldn’t reach our listings, so nothing was found. {typeof navigator !== "undefined" && !navigator.onLine ? "You’re offline. Reconnect and try again." : "This is on our side, not yours."}</p>
              <div className={s.emptyActs}>
                <button type="button" className={s.primary} onClick={() => location.reload()}>Try again</button>
                <a className={s.ghost} href={routes.tayo()}>Ask Tayo instead</a>
              </div>
            </>
          ) : (
            <>
              <div className={s.emptyTtl}>{mine ? "No homes fit this exact brief yet" : "No homes match these filters"}</div>
              <p>{mine ? "That usually just means the brief is a little tight. Try one of these:" : "Clear a filter or the search to see more."}</p>
              <div className={s.emptyActs}>
                {mine ? (
                  <>
                    <a className={s.ghost} href={routes.tayo(`?ask=${encodeURIComponent("Widen my budget a little and show me what opens up")}`)}>Widen the budget</a>
                    <a className={s.ghost} href={routes.tayo(`?ask=${encodeURIComponent("Show me good homes in nearby areas too")}`)}>Try a nearby area</a>
                    <a className={s.primary} href={routes.tayo(`?ask=${encodeURIComponent("Help me find homes similar to what I asked for")}`)}>Ask Tayo to help</a>
                  </>
                ) : (
                  <button type="button" className={s.ghost} onClick={() => { setQuery(""); update({ deal: "all", verifiedOnly: false }); }}>Clear filters</button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <p className={s.moved}>The map view is still on the <a href={routes.browse()}>original Browse page</a> while it moves across.</p>

      {picked.length >= 2 && (
        <div className={s.cmpbar}>
          <span><b>{picked.length}</b> selected</span>
          <button type="button" onClick={() => setComparing(true)}>Compare side by side</button>
        </div>
      )}
      {comparing && pickedItems.length >= 2 && <CompareSheet items={pickedItems} visitorId={visitor} onClose={() => setComparing(false)} />}
    </main>
  );
}
