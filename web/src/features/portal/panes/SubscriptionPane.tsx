"use client";

import { useEffect, useState } from "react";
import { TIER_NAME, fetchUsage, usageRow, type PlanCode, type PlanUsage } from "../data/billing";
import { PLANS, ADDONS, ROI } from "../data/plans";
import { ReferralCard } from "./ReferralCard";
import { goTo, preferPlan } from "./BillingPane";
import s from "./Billing.module.css";

function Row({ label, used, max }: { label: string; used: number; max: number | null }) {
  const r = usageRow(used, max);
  return (
    <div className={`${s.uItem} ${r.full ? s.full : ""}`}>
      <span className={s.k}>{label}</span>
      <span><b>{used}</b>{r.label}</span>
      {r.pct != null && <span className={s.bar}><i style={{ width: `${r.pct}%` }} /></span>}
      {r.full && <span className={s.warn}>at your limit</span>}
    </div>
  );
}

/** Plans that pay for themselves. Owner only; the delete-agency section stays on the original portal until it moves. */
export function SubscriptionPane() {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  useEffect(() => { let live = true; fetchUsage().then((u) => live && setUsage(u)).catch(() => {}); return () => { live = false; }; }, []);
  const tier = usage?.tier ?? "free";

  const choose = (code: string) => {
    if (code === "accelerator" || code === "market_leader") { preferPlan(code as PlanCode); goTo("#billing"); return; }
    goTo("mailto:hello@synapsecore.dev?subject=" + encodeURIComponent(`Plan: ${code}`));
  };

  return (
    <>
      {usage && (
        <div className={s.usage}>
          <div>You are on <b>{TIER_NAME[usage.tier] ?? usage.tier}</b></div>
          <Row label="Active listings" used={usage.listings_used} max={usage.listings_max} />
          <Row label="Team seats" used={usage.seats_used} max={usage.seats_max} />
        </div>
      )}
      <ReferralCard />
      <a className={s.link} href="#billing">Billing, payments and add-ons →</a>

      <div className={s.plans}>
        {PLANS.map((p) => {
          const current = p.tier === tier;
          const renewable = current && (p.code === "accelerator" || p.code === "market_leader");
          return (
            <article key={p.code} className={`${s.pcard} ${p.badge ? s.pop : ""}`}>
              {p.badge && <span className={s.badge}>{p.badge}</span>}
              <div className={s.pname}>{p.name}</div>
              <div className={s.muted}>{p.headline}</div>
              <div className={s.pamt}>{p.price == null ? "Negotiated" : p.price === 0 ? "₦0" : `₦${p.price / 1000}k`}{p.price ? <small> /month</small> : null}</div>
              <button type="button" className={p.code === "accelerator" && !current ? s.primary : s.ghost} disabled={current && !renewable} onClick={() => choose(p.code)}>
                {renewable ? "Renew or extend" : current ? "Current plan" : p.cta}
              </button>
              <ul className={s.feats}>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            </article>
          );
        })}
      </div>

      <h2 className={s.h2}>Grow as you need</h2>
      <p className={s.muted}>Top up a plan without upgrading, one-off or monthly.</p>
      <div className={s.addons}>
        {ADDONS.map((a) => (
          <div key={a.name} className={s.card}>
            <div className={s.name}>{a.name}</div>
            <div className={s.muted}>{a.desc}</div>
            <div className={s.price}>{a.price}<small> {a.unit}</small></div>
            <a className={s.ghost} href="#billing">Add</a>
          </div>
        ))}
      </div>

      <div className={s.roi}>
        <h3>{ROI.title}</h3>
        <ul>{ROI.points.map((x) => <li key={x}>{x}</li>)}</ul>
        <p><b>{ROI.close}</b></p>
      </div>

      <p className={s.foot}>Need to close this agency? <a href="/app/agency.html#subscription" style={{ textDecoration: "underline" }}>Delete agency is on the original portal</a> until it moves across.</p>
    </>
  );
}
