import { fmtDate, joinPlace, naira, pricePeriod } from "@/lib/format";
import { BAND_HOURS, CONDITION_LABEL, FURNISHED_LABEL, TITLE_LABEL } from "./labels";
import type { Property } from "./types";
import s from "./Property.module.css";

/** The facts a buyer reads first. Each appears only when the listing states it; nothing is invented. */
function factsOf(p: Property): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const count = (n: number | null, one: string, many: string, key: string) =>
    n != null && out.push(<span key={key}><b>{n}</b> {n === 1 ? one : many}</span>);
  count(p.bedrooms, "bed", "beds", "bed");
  count(p.bathrooms, "bath", "baths", "bath");
  count(p.toilets, "toilet", "toilets", "toilet");
  if (p.parking_spaces != null) out.push(<span key="park"><b>{p.parking_spaces}</b> parking</span>);
  if (p.area_sqm != null) out.push(<span key="sqm"><b>{p.area_sqm}</b> m²</span>);
  if (p.year_built != null) out.push(<span key="built">built <b>{p.year_built}</b></span>);
  if (p.electricity_band && BAND_HOURS[p.electricity_band]) {
    out.push(<span key="band">Band <b>{p.electricity_band}</b> · {BAND_HOURS[p.electricity_band]} hrs/day</span>);
  }
  if (p.furnished) out.push(<span key="furn">{FURNISHED_LABEL[p.furnished] ?? p.furnished}</span>);
  if (p.property_condition) out.push(<span key="cond">{CONDITION_LABEL[p.property_condition] ?? p.property_condition}</span>);
  if (p.title_type) out.push(<span key="title">{TITLE_LABEL[p.title_type] ?? p.title_type}</span>);
  return out;
}

export function Overview({ p, exactAddress }: { p: Property; exactAddress: string | null }) {
  const place = exactAddress ? joinPlace([exactAddress, p.city, p.state]) : joinPlace([p.address, p.city, p.state]);
  const verified = p.verification_status === "verified";
  const amenities = (p.amenities ?? []).map((a) => String(a ?? "").trim()).filter(Boolean).slice(0, 30);
  return (
    <section className={s.card}>
      <div className={s.price}>{naira(p.price) + pricePeriod(p.price_period)}</div>
      {p.area_sqm && p.price ? <div className={s.ctx}>{naira(Math.round(p.price / p.area_sqm))}/m²</div> : null}
      <h1 className={s.title}>{p.title}</h1>
      <div className={s.loc}>{place}</div>
      <div className={s.facts}>{factsOf(p)}</div>
      <div className={s.trust}>
        <div className={s.ring}>{verified && p.trust_score != null ? p.trust_score : verified ? "✓" : "—"}</div>
        <div>
          <strong>{verified ? "Verified by Synapse" : "Not yet verified"}</strong>
          <div className={s.dim}>
            {verified
              ? `What Synapse checked on this listing${p.verified_at ? ` · ${fmtDate(p.verified_at)}` : ""}`
              : "Listed by the agency; Synapse has not run its checks on this home yet."}
          </div>
        </div>
      </div>
      {p.description && <p className={s.glance}>{p.description}</p>}
      {amenities.length > 0 && (
        <div className={s.amen} role="list" aria-label="Amenities">
          {amenities.map((a) => <span key={a} role="listitem">{a.charAt(0).toUpperCase() + a.slice(1)}</span>)}
        </div>
      )}
    </section>
  );
}
