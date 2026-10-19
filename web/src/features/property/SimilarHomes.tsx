"use client";

import { useEffect, useState } from "react";
import { naira } from "@/lib/format";
import { routes } from "@/lib/routes";
import { coverUrl } from "@/lib/media";
import { fetchSimilar } from "./queries";
import type { SimilarHome } from "./types";
import s from "./Property.module.css";

/** More live homes in the same city. Stays out of the page entirely unless it finds some. */
export function SimilarHomes({ city, excludeId }: { city: string | null; excludeId: string }) {
  const [rows, setRows] = useState<SimilarHome[]>([]);
  useEffect(() => {
    if (!city) return;
    let live = true;
    fetchSimilar(city, excludeId).then((r) => { if (live) setRows(r); }).catch(() => {});
    return () => { live = false; };
  }, [city, excludeId]);
  if (!rows.length) return null;
  return (
    <section className={s.card}>
      <h2 className={s.lbl}>More in {city}</h2>
      <div className={s.sim}>
        {rows.map((r) => {
          const img = coverUrl(r.property_media);
          return (
            <a key={r.id} href={routes.property(r.id)}>
              {img ?   <img src={img} alt="" loading="lazy" /> : <div className={s.simPh} />}
              <div className={s.simBody}>
                <div className={s.simPrice}>{naira(r.price)}</div>
                <div className={s.simTitle}>{r.title ?? "Listing"}</div>
                <div className={s.dim}>{r.verification_status === "verified" ? "Verified" : "Not yet verified"}</div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
