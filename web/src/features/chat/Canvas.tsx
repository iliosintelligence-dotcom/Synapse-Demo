"use client";

import { useMemo } from "react";
import { SynapseMap, type MapPin } from "@/components/map/SynapseMap";
import { moneyShort } from "@/lib/money";
import { routes } from "@/lib/routes";
import { toggleSave, useSaves } from "@/lib/saved";
import { ListingCard } from "@/features/browse/ListingCard";
import { shapeMatch } from "@/features/browse/shape";
import type { TojuMatch } from "@/features/browse/types";
import { coverUrl } from "@/lib/media";
import type { ChatMessage, ReplyTo } from "./types";
import s from "./Chat.module.css";

const keyOf = (m: TojuMatch) => `${m.title ?? ""}|${m.price ?? ""}`;

/** A home the buyer is replying about becomes a match like any other, so it looks like every other card: a home you asked about should not look like a different kind of object from a home Tayo found. */
const replyMatch = (p: ReplyTo): TojuMatch => ({
  id: p.id, img: coverUrl(p.property_media), title: p.title ?? undefined, price: p.price ?? undefined, listingType: p.listing_type ?? undefined, city: p.city ?? undefined,
  bedrooms: p.bedrooms, latitude: p.latitude, longitude: p.longitude, verificationStatus: p.verification_status ?? undefined, trustScore: p.trust_score,
});

/** Every home Tayo has recommended in this conversation, newest first, with the map. No toolbar: whatever the buyer wants changed (cheaper, bigger, another area) they tell Tayo. */
export function matchesIn(thread: ChatMessage[], replyTo: ReplyTo | null): TojuMatch[] {
  const seen = new Set<string>();
  const out: TojuMatch[] = [];
  const add = (m: TojuMatch) => { const k = keyOf(m); if (!seen.has(k)) { seen.add(k); out.unshift(m); } };
  thread.forEach((m) => { if (m.role === "assistant") (m.matches ?? []).forEach(add); });
  if (replyTo) add(replyMatch(replyTo));
  return out;
}

export function Canvas({ matches }: { matches: TojuMatch[] }) {
  const saves = useSaves();
  const items = useMemo(() => matches.map(shapeMatch), [matches]);
  const pins: MapPin[] = useMemo(
    () => items.filter((l) => l.lat != null && l.lng != null).map((l): MapPin => ({ id: l.id, lng: Number(l.lng), lat: Number(l.lat), kind: "listing", label: moneyShort(l.priceN, l.currency), title: l.title, href: routes.property(l.id) })),
    [items],
  );
  if (!items.length) return null;
  return (
    <aside className={s.canvas}>
      <div className={s.cvHead}>
        <span className={s.cvT}>Your matches</span>
        <span className={s.cvC}>{items.length}</span>
        <a className={s.cvAll} href={routes.browse()} title="Expand to the full Matches page">⤢ Expand</a>
      </div>
      <div className={s.cvBody}>
        {pins.length > 0 && <SynapseMap center={[pins[0].lng, pins[0].lat]} pins={pins} fit className={s.cvMap} label="Map of your matches" />}
        <div className={s.cvGrid}>
          {items.map((l) => <ListingCard key={l.id} l={l} saved={saves.has(l.id)} compareOn={false} picked={false} onSave={() => toggleSave(l.id)} onPick={() => {}} onOpen={() => {}} />)}
        </div>
      </div>
    </aside>
  );
}
