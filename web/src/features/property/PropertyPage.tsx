"use client";

import { useEffect, useState } from "react";
import { useSaved } from "@/lib/saved";
import { CostsCard } from "./CostsCard";
import { Gallery } from "./Gallery";
import { ListedBy } from "./ListedBy";
import { Overview } from "./Overview";
import { SimilarHomes } from "./SimilarHomes";
import { WhatWeChecked } from "./WhatWeChecked";
import { fetchExactAddress, fetchProperty, recordChannelTouch } from "./queries";
import type { Property } from "./types";
import s from "./Property.module.css";

export function PropertyPage({ id }: { id: string }) {
  const [p, setP] = useState<Property | null | undefined>(undefined); // undefined = loading, null = not found
  const [exact, setExact] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState("");
  const { saved, toggle } = useSaved(id);

  useEffect(() => {
    let live = true;
    fetchProperty(id)
      .then((row) => {
        if (!live) return;
        setP(row);
        if (row) document.title = `${row.title} — Synapse`;
      })
      .catch(() => live && setFailed(true));
    fetchExactAddress(id).then((a) => live && setExact(a)).catch(() => {});

    const q = new URLSearchParams(window.location.search);
    const channel = q.get("ch");
    if (channel) {
      try { localStorage.setItem("syn_last_home", JSON.stringify({ id, ch: channel, ts: Date.now() })); } catch { /* storage blocked */ }
      recordChannelTouch(id, channel, q.get("post"));
    }
    return () => { live = false; };
  }, [id]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p?.title ?? "A home on Synapse", url });
      else { await navigator.clipboard.writeText(url); setToast("Link copied. Paste it anywhere to share."); setTimeout(() => setToast(""), 3200); }
    } catch { /* the person closed the share sheet */ }
  };

  if (failed) return <main className={s.page}><p className={s.empty}>This listing couldn’t load. Check your connection and try again.</p></main>;
  if (p === undefined) return <main className={s.page}><p className={s.empty}>Loading listing…</p></main>;
  if (p === null) return <main className={s.page}><p className={s.empty}>This home is no longer listed. <a href="/app/browse.html">Back to your matches</a></p></main>;

  const takeRaw = Array.isArray(p.property_enrichment) ? p.property_enrichment[0] : p.property_enrichment;
  const take = takeRaw?.toju_summary ?? null;

  return (
    <main className={s.page}>
      <a className={s.back} href="/app/browse.html">← Back to matches</a>
      <div className={s.layout}>
        <div className={s.left}>
          <Gallery media={p.property_media} verified={p.verification_status === "verified"} />
          <Overview p={p} exactAddress={exact} />
        </div>
        <div className={s.right}>
          {take && (
            <section className={s.card}>
              <h2 className={s.lbl}>Tayo’s take</h2>
              <p className={s.take}>{take}</p>
            </section>
          )}
          <CostsCard p={p} />
          <ListedBy p={p} />
          <WhatWeChecked p={p} />
          <SimilarHomes city={p.city} excludeId={p.id} />
          <p className={s.moved}>
            The map, what’s nearby, flood risk, commute times and viewing bookings are still on the{" "}
            <a href={`/app/property.html?id=${encodeURIComponent(p.id)}`}>original page</a> while they move across.
          </p>
        </div>
      </div>

      <div className={s.dock}>
        <button type="button" className={`${s.dockBtn} ${saved ? s.dockOn : ""}`} aria-pressed={saved} onClick={toggle}>{saved ? "♥ Saved" : "♡ Save"}</button>
        <button type="button" className={s.dockBtn} onClick={share}>Share</button>
        <a className={s.contact} href={`/app/toju.html?reply=${encodeURIComponent(p.id)}`}>Contact</a>
      </div>
      {toast && <div className={s.toast} role="status">{toast}</div>}
    </main>
  );
}
