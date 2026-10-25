import { money, naira } from "@/lib/format";
import { BUILD_STAGE_LABEL, DEAL_LABEL } from "./labels";
import type { Property } from "./types";
import s from "./Property.module.css";

const month = (v: string) => {
  const t = new Date(v);
  return isNaN(t.getTime()) ? "" : t.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

/** The deal terms (built or not, how it is paid for, investment terms), from the listing's own fields. Empty when it has none. */
function dealRows(p: Property): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (p.deal_structure && p.deal_structure !== "outright" && p.deal_structure !== "rent" && DEAL_LABEL[p.deal_structure]) rows.push(["Deal", DEAL_LABEL[p.deal_structure]]);
  if (p.property_type !== "land" && p.build_stage && p.build_stage !== "completed") {
    rows.push(["Built", (BUILD_STAGE_LABEL[p.build_stage] ?? p.build_stage) + (p.build_progress_pct != null ? ` (${p.build_progress_pct}% done)` : "")]);
    if (p.handover_date && month(p.handover_date)) rows.push(["Handover", `Expected ${month(p.handover_date)}`]);
  }
  if (p.payment_plan === "instalments") {
    rows.push(["Payment", "Instalments" + (p.deposit_pct != null ? `: ${Number(p.deposit_pct)}% deposit` : "") + (p.instalment_months ? `, the rest over ${p.instalment_months} months` : "")]);
  } else if (p.payment_plan === "outright" && p.listing_type === "sale") {
    rows.push(["Payment", "Outright"]);
  }
  if (Number(p.plot_count) > 0) rows.push(["Plots", `${Number(p.plot_count)}${p.plot_size_sqm ? ` × ${Number(p.plot_size_sqm)} sqm` : ""}`]);
  if (Number(p.units_available) > 1) rows.push(["Available", `${Number(p.units_available)} identical units`]);
  if (Number(p.min_investment) > 0) rows.push(["Minimum stake", naira(p.min_investment)]);
  if (p.investment_term_months) rows.push(["Term", `${p.investment_term_months} months`]);
  if (p.stated_return_pct != null) rows.push(["Return", `${Number(p.stated_return_pct)}% over the term, as stated by the agency`]);
  return rows;
}

function dealNote(p: Property): string | null {
  if (p.deal_structure === "off_plan" || ["under_construction", "not_started"].includes(p.build_stage ?? "")) {
    return "Buying before completion: ask Tayo what to check. Who the developer is, what happens if handover is late, and how payments are tied to progress matter most.";
  }
  if (p.stated_return_pct != null || ["joint_venture", "development_financing"].includes(p.deal_structure ?? "")) {
    return "Returns are the agency’s own figures. Synapse does not forecast prices or returns.";
  }
  return null;
}

/** "What it really costs", printed like a till slip. A first-year total appears only when every part of it is stated. */
export function CostsCard({ p }: { p: Property }) {
  const cur = p.currency || "NGN";
  const m = (n: number | null) => money(n, cur);
  const isRent = p.listing_type === "rent";
  const per = p.price_period === "per_year" ? "/yr" : p.price_period === "per_month" ? "/mo" : "";
  const fee = (n: number | null) => (Number(n) === 0 ? "None" : m(n));
  const deal = dealRows(p);

  const yearRent = p.price == null ? null : p.price_period === "per_month" ? Number(p.price) * 12 : p.price_period === "per_night" ? null : Number(p.price);
  const parts = [yearRent, p.service_charge, p.move_in_cost, p.agency_fee, p.legal_fee];
  const total = isRent && parts.every((v) => v != null) ? parts.reduce<number>((a, v) => a + Number(v), 0) : null;
  const priceLabel = isRent ? "Rent" : "Price";

  const line = (label: string, v: number | null, text: string) => (
    <div className={`${s.crRow} ${v == null ? s.crNo : ""}`}><span>{label}</span><i aria-hidden="true" /><b>{v == null ? "not stated" : text}</b></div>
  );

  return (
    <section className={s.card}>
      <h2 className={s.lbl}>{deal.length ? "The deal & what it really costs" : "What it really costs"}</h2>
      {deal.length > 0 && (
        <>
          <dl className={s.deal}>{deal.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {dealNote(p) && <p className={s.note}>{dealNote(p)}</p>}
        </>
      )}
      <div className={s.paper} role="group" aria-label="What this home costs">
        <div className={s.crHead}><span>SYNAPSE</span><span>COST SLIP</span></div>
        <div className={s.crRule} />
        {total != null && p.price != null && <><div className={s.crSec}>EVERY YEAR</div><div className={s.crRow}><span>{priceLabel}</span><i aria-hidden="true" /><b>{m(p.price) + per}</b></div></>}
        {total == null && <div className={s.crSec}>RECURRING</div>}
        {line("Service charge", p.service_charge, m(p.service_charge) + (isRent ? "/yr" : ""))}
        <div className={s.crSec}>ONCE</div>
        {line("Move-in cost", p.move_in_cost, m(p.move_in_cost))}
        {line("Agency fee", p.agency_fee, fee(p.agency_fee))}
        {line("Legal fee", p.legal_fee, fee(p.legal_fee))}
        <div className={`${s.crRule} ${s.crDash}`} />
        {p.price != null && (
          <div className={s.crTotal}>
            <span>{(total != null ? "First year, all in" : priceLabel).toUpperCase()}</span>
            <b>{total != null ? m(total) : m(p.price) + per}</b>
          </div>
        )}
        <div className={s.crFine}>FIGURES AS STATED BY THE AGENCY</div>
      </div>
      <p className={s.note}>Utilities and power are separate and not shown here.</p>
      <p className={s.handoff}>
        Ready to move on this? Tayo takes your brief first, then introduces the agency with it, so the agent you meet already knows what you can afford and what you asked about.
      </p>
    </section>
  );
}
