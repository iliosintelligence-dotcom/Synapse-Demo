"use client";

import { useEffect, useMemo, useState } from "react";
import { AgencyLogo } from "@/components/AgencyLogo";
import { brandHex, safeUrl } from "@/lib/brand";
import { cacLabel, naira, pricePeriod } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { Agency, PropertyCard } from "@/lib/types";
import { fetchAgency, fetchAgencyListings } from "./queries";
import s from "./AgencyProfile.module.css";

type Kind = "sale" | "rent" | "land" | "shortlet";
const KIND_LABEL: Record<Kind, string> = { sale: "For sale", rent: "For rent", land: "Land", shortlet: "Shortlet" };
const kindOf = (p: PropertyCard): Kind =>
  p.property_type === "land" ? "land" : p.listing_type === "shortlet" ? "shortlet" : p.listing_type === "rent" ? "rent" : "sale";

const coverOf = (media: PropertyCard["property_media"]): string | null => {
  const list = (media ?? []).filter((m) => m?.url).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const photo = list.find((m) => m.media_type !== "video" && !/\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(m.url));
  return photo?.url ?? null;
};

/** What a buyer should be told about the agency's CAC standing: the number if given, else whether a certificate is on file. */
function cacChip(a: Agency): { text: string; muted: boolean } {
  const no = cacLabel(a.cac_number);
  if (no) return { text: `CAC ${no}`, muted: false };
  if (a.cac_certificate_on_file) return { text: "CAC certificate on file", muted: false };
  return { text: "CAC not yet on file", muted: true };
}

export function AgencyProfile({ id }: { id: string }) {
  const [agency, setAgency] = useState<Agency | null | undefined>(undefined); // undefined = loading, null = not found
  const [listings, setListings] = useState<PropertyCard[]>([]);
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([fetchAgency(id), fetchAgencyListings(id)])
      .then(([a, l]) => {
        if (live) {
          setAgency(a);
          setListings(l);
        }
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [id]);

  const kinds = useMemo(() => Array.from(new Set(listings.map(kindOf))), [listings]);
  const shown = listings.filter((p) => filter === "all" || kindOf(p) === filter);

  if (failed) return <main className={s.page}><p className={s.empty}>This page couldn’t load. Check your connection and try again.</p></main>;
  if (agency === undefined) return <main className={s.page}><p className={s.empty}>Loading…</p></main>;
  if (agency === null) return <main className={s.page}><p className={s.empty}>We couldn’t find this agency.</p></main>;

  const a = agency;
  const cac = cacChip(a);
  const where = [a.address, a.city].filter(Boolean).join(", ");
  const website = safeUrl(a.social?.website);
  const spec = (a.specialties ?? []).filter(Boolean);
  const heroStyle = { ["--ag" as string]: brandHex(a.brand_color) ?? "#141412" };
  const askHref = routes.tayo(`?new=site&agency=${encodeURIComponent(a.id)}&ask=${encodeURIComponent(`Tell me about ${a.name}. Can I trust them?`)}`);

  return (
    <main className={s.page}>
      <section className={s.hero} style={heroStyle}>
        <AgencyLogo name={a.name} logoUrl={a.logo_url} className={s.logo} />
        <div>
          <h1 className={s.name}>{a.name}</h1>
          {a.tagline && <p className={s.tag}>{a.tagline}</p>}
          <div className={s.chips}>
            {a.verification_tier === "verified" && <span className={`${s.chip} ${s.chipOk}`}>✓ Verified</span>}
            <span className={`${s.chip} ${cac.muted ? s.chipMuted : ""}`}>{cac.text}</span>
            {a.city && <span className={s.chip}>{a.city}</span>}
            {a.founded_year && <span className={s.chip}>Since {a.founded_year}</span>}
          </div>
        </div>
      </section>

      <div className={s.grid}>
        {a.description && (
          <div className={s.card}>
            <div className={s.k}>About</div>
            <p className={s.about}>{a.description}</p>
          </div>
        )}
        <div className={s.card}>
          <div className={s.k}>The agency</div>
          <dl className={s.facts}>
            <div className={s.fact}>
              <dt>CAC registration</dt>
              <dd>{cacLabel(a.cac_number) ?? (a.cac_certificate_on_file ? "Certificate uploaded to Synapse" : "Not yet on file")}</dd>
            </div>
            {where && (
              <div className={s.fact}>
                <dt>Office</dt>
                <dd>
                  {where} ·{" "}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${where}, Nigeria`)}`} target="_blank" rel="noopener noreferrer">Map</a>
                </dd>
              </div>
            )}
            {website && (
              <div className={s.fact}>
                <dt>Website</dt>
                <dd><a href={website} target="_blank" rel="noopener noreferrer nofollow">{website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></dd>
              </div>
            )}
            {spec.length > 0 && (
              <div className={s.fact}>
                <dt>Focus</dt>
                <dd><span className={s.tags}>{spec.map((t) => <span key={t}>{t}</span>)}</span></dd>
              </div>
            )}
          </dl>
          <a className={s.ask} href={askHref}>Ask Tayo about this agency</a>
        </div>
      </div>

      <h2 className={s.h2}>{listings.length ? `${listings.length} listing${listings.length > 1 ? "s" : ""} from ${a.name}` : `Listings from ${a.name}`}</h2>
      {kinds.length > 1 && (
        <div className={s.filters} role="group" aria-label="Show">
          {(["all", ...kinds] as const).map((k) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {k === "all" ? "All" : KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      <div className={s.list}>
        {shown.length === 0 && <div className={s.empty} style={{ gridColumn: "1/-1" }}>No live listings right now.</div>}
        {shown.map((p) => <ListingTile key={p.id} p={p} />)}
      </div>
    </main>
  );
}

function ListingTile({ p }: { p: PropertyCard }) {
  const img = coverOf(p.property_media);
  const place = [p.area_name && p.area_name.length <= 40 ? p.area_name : "", p.city].filter(Boolean).join(", ");
  const meta = [p.bedrooms ? `${p.bedrooms} bed` : "", p.verification_status === "verified" ? "Verified" : "Not yet verified"].filter(Boolean).join(" · ");
  return (
    <a className={s.listing} href={routes.property(p.id)}>
      <div className={s.photo}>
        {img ? (
           
          <img src={img} alt="" loading="lazy" />
        ) : (
          "No photo yet"
        )}
      </div>
      <div className={s.body}>
        <div className={s.kind}>{KIND_LABEL[kindOf(p)]}</div>
        <div className={s.price}>{Number(p.price) > 0 ? naira(p.price) + pricePeriod(p.price_period) : "Price on request"}</div>
        <div className={s.title}>{p.title ?? "Listing"}</div>
        <div className={s.meta}>{place}{place && meta ? " · " : ""}{meta}</div>
      </div>
    </a>
  );
}
