"use client";

import { AgencyLogo } from "@/components/AgencyLogo";
import { brandHex } from "@/lib/brand";
import { cacLabel } from "@/lib/format";
import { moneyShort } from "@/lib/money";
import { routes } from "@/lib/routes";
import type { BrowseItem, DealInfo } from "./types";
import s from "./Browse.module.css";

const DEAL_WORD: Record<string, string> = {
  off_plan: "Off-plan", joint_venture: "Joint venture", development_financing: "Investment", rent_to_own: "Rent to own", lease: "Long lease", shortlet: "Short-let",
};

/** One line saying what kind of deal this is. A plain completed sale or rental adds nothing, so it returns "". */
export function dealLine(d: DealInfo | null, currency: string | null): string {
  if (!d) return "";
  const month = (v: string) => { const t = new Date(v); return isNaN(t.getTime()) ? "" : t.toLocaleDateString("en-GB", { month: "short", year: "numeric" }); };
  const parts: string[] = [];
  if (d.isLand) {
    const n = Number(d.plots);
    parts.push("Land" + (n > 0 ? `, ${n} plot${n === 1 ? "" : "s"}${d.plotSize ? ` of ${Number(d.plotSize)} sqm` : ""}` : ""));
  }
  if (d.deal && DEAL_WORD[d.deal]) parts.push(DEAL_WORD[d.deal]);
  if (d.stage === "under_construction") parts.push("being built" + (d.progress != null ? ` (${d.progress}%)` : ""));
  else if (d.stage === "not_started" && d.deal !== "off_plan") parts.push("not built yet");
  if (d.handover && d.stage && d.stage !== "completed" && month(d.handover)) parts.push(`ready ${month(d.handover)}`);
  if (d.plan === "instalments") parts.push("instalments" + (d.deposit != null ? `, ${Number(d.deposit)}% down` : "") + (d.months ? ` over ${d.months} months` : ""));
  if (Number(d.minInv) > 0) parts.push(`from ${moneyShort(Number(d.minInv), currency)}`);
  if (Number(d.units) > 1) parts.push(`${Number(d.units)} available`);
  return parts.join(" · ");
}

/** Only inside the last three days: a fortnight-long countdown is just pressure. */
function expiryText(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const days = Math.ceil(ms / 864e5);
  if (days > 3) return null;
  return days === 1 ? "Expires tomorrow" : `Expires in ${days} days`;
}

const VERIFY: Record<string, { cls: string; text: string }> = {
  verified: { cls: "chipPass", text: "✓ Verified" },
  in_progress: { cls: "chipProg", text: "◷ Still checking" },
};

interface Props {
  l: BrowseItem;
  saved: boolean;
  compareOn: boolean;
  picked: boolean;
  onSave: () => void;
  onPick: () => void;
  onOpen: () => void;
}

export function ListingCard({ l, saved, compareOn, picked, onSave, onPick, onOpen }: Props) {
  const v = VERIFY[l.vstatus ?? ""] ?? { cls: "chipUnv", text: "◌ Not verified" };
  const verified = l.vstatus === "verified";
  const href = `/property/?id=${encodeURIComponent(l.id)}`;
  const deal = dealLine(l.dealInfo, l.currency);
  const exp = expiryText(l.expiresAt);
  const cac = l.agency ? (cacLabel(l.agency.cac) ? `CAC ${cacLabel(l.agency.cac)}` : l.agency.cacDoc ? "CAC certificate on file" : "CAC not yet on file") : null;

  return (
    <article className={`${s.card} ${picked ? s.cmp : ""}`}>
      <div className={s.cardBody}>
        <div className={s.tags}>
          <span className={`${s.chip} ${s[v.cls]}`}>{v.text}</span>
          <span className={s.dealTag}>{l.deal}</span>
          {exp && <span className={s.expiry} title="Listings come down after 21 days unless the agency re-lists them">{exp}</span>}
          {compareOn && (
            <label className={s.cmpbox}>
              <input type="checkbox" checked={picked} onChange={onPick} /> compare
            </label>
          )}
        </div>
        <div className={s.price}>
          {moneyShort(l.priceN, l.currency)}
          {(l.perLabel || l.per) && <span className={s.per}>{l.perLabel || "/yr"}</span>}
        </div>
        <h3 className={s.ttl}><a href={href} onClick={onOpen}>{l.title}</a></h3>
        <div className={s.loc}>{l.loc}</div>
        {deal && <div className={s.dealLine}>{deal}</div>}
        {l.why && <div className={s.why}>{l.whyLead && <b>{l.whyLead}, </b>}{l.why}</div>}
        {verified && l.score != null && <div className={s.score}><span className={s.ring}>{l.score}</span> Property Confidence</div>}
        {l.agency && (
          <div className={s.agency}>
            <AgencyLogo name={l.agency.name} logoUrl={l.agency.logo} className={s.agencyLogo} />
            <span className={s.agencyTx}>
              <span className={s.agencyName} style={{ ["--ag" as string]: brandHex(l.agency.color) ?? "inherit" }}>{l.agency.name}</span>
              <span className={`${s.cac} ${l.agency.cac || l.agency.cacDoc ? "" : s.cacNo}`}>{cac}</span>
            </span>
          </div>
        )}
      </div>
      <div className={s.img}>
        <span className={s.noPhoto}>No photo yet</span>
        {l.img && <img src={l.img} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} />}
        <button type="button" className={`${s.save} ${saved ? s.saveOn : ""}`} aria-pressed={saved} aria-label={`${saved ? "Remove" : "Save"} ${l.title}`} onClick={onSave}>
          {saved ? "♥" : "♡"}
        </button>
        <a className={s.contact} href={routes.tayoAbout(l.id)} aria-label={`Contact an agent about ${l.title}`}>Contact</a>
      </div>
    </article>
  );
}
