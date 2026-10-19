"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ADDON_INFO, BUYABLE, FREE_PILOT, TIER_NAME, fetchBilling, longDate, naira, paymentChip, quote, removeCard, setAutoRenew, shortDate, startCheckout,
  type Billing, type Period, type PlanCode,
} from "../data/billing";
import { useToast } from "../ui/Toast";
import s from "./Billing.module.css";

/** A plan picked on the Subscription pane arrives here already chosen. */
let preferred: PlanCode | null = null;
/** Navigation lives outside the component so the lint rule about mutating globals in render code stays honest. */
export const goTo = (url: string) => { window.location.assign(url); };
export const preferPlan = (p: PlanCode) => { preferred = p; };

export function PilotDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className={s.scrim} onClick={onClose}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="pilotT" onClick={(e) => e.stopPropagation()}>
        <div className={s.k}>Nothing to pay right now</div>
        <h2 id="pilotT" className={s.plan} style={{ fontSize: 22 }}>You are in the free pilot.</h2>
        <p className={s.muted}>Every feature is open to your agency while we run the pilot: unlimited listings, the studio, the proximity alerts and the negotiator. There is nothing to pay and no card to enter.</p>
        <button type="button" className={s.primary} autoFocus onClick={onClose}>Great, carry on</button>
      </div>
    </div>
  );
}

const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);

/** What the agency is on, paying for a month or a year, add-ons, and every payment. Owner only. */
export function BillingPane() {
  const toast = useToast();
  const [b, setB] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanCode>(preferred ?? "accelerator");
  const [period, setPeriod] = useState<Period | null>(null);
  const [busy, setBusy] = useState("");
  const [pilot, setPilot] = useState(false);

  const load = useCallback(async () => {
    try {
      const x = await fetchBilling();
      setB(x); setError("");
      if (!preferred) setPlan(x.info.tier === "market_leader" ? "market_leader" : "accelerator");
      setPeriod((p) => p ?? (x.info.annual_months_free > 0 ? "annual" : "monthly"));
    } catch (e) { setError(reason(e, "Billing couldn’t load.")); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const pay = async (key: string, what: Parameters<typeof startCheckout>[0]) => {
    if (FREE_PILOT) { setPilot(true); return; }
    setBusy(key);
    try { goTo(await startCheckout(what)); } catch (e) { toast(reason(e, "Could not start checkout. Please try again."), "error"); setBusy(""); }
  };
  const act = async (key: string, work: () => Promise<void>, done: string) => {
    setBusy(key);
    try { await work(); toast(done); await load(); } catch { toast("That didn’t save. Try again.", "error"); } finally { setBusy(""); }
  };

  if (error) return <div className={s.card}><div className={s.k}>Your plan</div><div className={s.state}>{error}</div><button type="button" className={s.ghost} onClick={() => void load()}>Try again</button></div>;
  if (!b || !period) return <p className={s.muted} aria-busy="true">Loading…</p>;

  const { info: d, pays, adds } = b;
  const tier = d.tier;
  const end = d.period_end ? new Date(d.period_end) : null;
  const lapsed = !!end && end < new Date();
  const free = Number(d.annual_months_free) || 0;
  const packs = adds.filter((a) => a.addon_code === "listing_pack" && a.applied_at && (!a.ends_at || new Date(a.ends_at) > new Date())).length;
  const q = quote(d, plan, period);
  const chosen = BUYABLE.find((p) => p.code === plan)!;
  const verb = tier === plan ? `${lapsed ? "Renew" : "Extend"} ${chosen.name}` : tier === "free" ? `Pay for ${chosen.name}` : `Switch to ${chosen.name}`;
  const monthPrice = Number(d.prices.plans[plan].monthly_kobo);
  const months = period === "annual" ? 12 : 1;
  let note = period === "annual" ? `${naira(q.perMonth)} a month, paid once a year.` : "Paid month by month. Each payment covers one month.";
  if (period === "annual" && free > 0) note += ` Your agency joined before ${d.offer_joined_before ? longDate(d.offer_joined_before) : "the offer closed"}, so annual stays at ${12 - free} months’ price.`;
  if (tier !== "free" && tier !== plan) note += " A different plan starts the day you pay.";
  else if (tier === plan && !lapsed && end) note += " Time you have already paid for is kept: this adds to it.";
  const paidPlan = tier === "accelerator" || tier === "market_leader";

  return (
    <>
      {FREE_PILOT && <div className={s.pilot}><b>Free pilot.</b> Everything is open and nothing is charged while the pilot runs. This page stays so you can see how billing will work.</div>}
      <p className={s.muted}>Your plan, what you have paid, and extras. Payments go through Paystack to ILIOS Digital, the company behind Synapse. Card details never touch Synapse.</p>

      <div className={s.grid}>
        <section className={s.card}>
          <div className={s.k}>Your plan</div>
          <div className={s.plan}>{TIER_NAME[tier] ?? tier}</div>
          {tier === "enterprise" ? <div className={s.state}>Terms agreed with you.</div>
            : tier === "free" ? <div className={s.state}>Free forever. Upgrade whenever you like.</div>
            : !end ? <div className={s.state}>Active.</div>
            : lapsed ? <div className={`${s.state} ${s.warn}`}>Your paid period ended on {longDate(d.period_end!)}. Renew to keep it.</div>
            : <div className={s.state}>Paid through {longDate(d.period_end!)}.</div>}
          {d.card && paidPlan && (
            <>
              {d.auto_renew ? <div className={s.state}>Renews on {end ? longDate(d.period_end!) : "its end date"} to {d.card.brand || "Card"} ···· {d.card.last4}, every {d.renew_period === "annual" ? "year" : "month"}.</div>
                : <div className={`${s.state} ${s.muted}`}>Auto-renew is off. Your plan ends on {end ? longDate(d.period_end!) : "its end date"}.</div>}
              {d.auto_renew && (d.renew_failed_attempts ?? 0) > 0 && (
                <div className={`${s.state} ${s.warn}`}>The last renewal didn’t go through{d.renew_error ? `: ${d.renew_error}` : ""}. {(d.renew_failed_attempts ?? 0) < 4 ? "We’ll try again. " : "We’ve stopped trying. "}Paying below with a working card puts it right.</div>
              )}
              <div className={s.row}>
                <button type="button" className={s.ghost} disabled={busy === "ar"} onClick={() => void act("ar", () => setAutoRenew(!d.auto_renew), d.auto_renew ? "Auto-renew is off." : "Auto-renew is on.")}>{d.auto_renew ? "Turn off auto-renew" : "Turn on auto-renew"}</button>
                <button type="button" className={s.ghost} disabled={busy === "rc"} onClick={() => { if (window.confirm("Remove this card? Your plan will end on its date instead of renewing.")) void act("rc", removeCard, "Card removed."); }}>Remove card</button>
              </div>
            </>
          )}
          <div className={s.meta}>{d.listings_max == null ? "Unlimited active listings." : `${d.listings_max} active listings${packs ? `, including ${packs} listing pack${packs > 1 ? "s" : ""}` : ""}.`}</div>
        </section>

        <section className={s.card}>
          {tier === "enterprise" ? (
            <>
              <div className={s.k}>Your terms</div>
              <p className={s.state}>Enterprise is priced with you: a monthly fee, per project, or a commission on closed deals. Invoices come from ILIOS Digital.</p>
              <a className={s.ghost} href="mailto:hello@synapsecore.dev?subject=Enterprise%20terms">Talk to us about your terms</a>
            </>
          ) : (
            <>
              <div className={s.k}>Pay for a plan</div>
              <div className={s.seg} role="group" aria-label="How often you pay">
                <button type="button" aria-pressed={period === "monthly"} onClick={() => setPeriod("monthly")}>Monthly</button>
                <button type="button" aria-pressed={period === "annual"} onClick={() => setPeriod("annual")}>Annual{free > 0 && <span className={s.save}>{free} months free</span>}</button>
              </div>
              <div className={s.opts} role="radiogroup" aria-label="Plan">
                {BUYABLE.map((p) => {
                  const pq = quote(d, p.code, period);
                  return (
                    <button key={p.code} type="button" role="radio" aria-checked={p.code === plan} className={s.opt} onClick={() => { setPlan(p.code); preferred = p.code; }}>
                      <span><b>{p.name}{tier === p.code && <span className={s.tag}>YOUR PLAN</span>}</b><small>{p.line}</small></span>
                      <span className={s.amt}>{naira(pq.amount)}<small>per {pq.unit}</small></span>
                    </button>
                  );
                })}
              </div>
              <div className={s.slip} role="group" aria-label="What you will pay">
                <div><span>{chosen.name.toUpperCase()} PLAN</span><span>{tier === plan ? "your plan" : ""}</span></div>
                <div><span>{months} {months === 1 ? "month" : "months"} × {naira(monthPrice)}</span><b>{naira(monthPrice * months)}</b></div>
                {period === "annual" && free > 0 && <div><span>{free} {free === 1 ? "month" : "months"} free</span><b>−{naira(monthPrice * free)}</b></div>}
                <div className={s.total}><span>TOTAL</span><b>{naira(q.amount)}</b></div>
              </div>
              <div className={s.note}>{note}</div>
              <button type="button" className={s.primary} disabled={busy === "plan"} onClick={() => void pay("plan", { plan, period })}>{busy === "plan" ? "Opening Paystack…" : `${verb} · ${naira(q.amount)}`}</button>
              <div className={s.note}>You pay on Paystack’s page by card, bank transfer or USSD. Paying by card renews your plan automatically each {period === "annual" ? "year" : "month"}.</div>
            </>
          )}
        </section>
      </div>

      <h2 className={s.h2}>Add-ons</h2>
      <p className={s.muted}>Top up without changing plan. A listing pack works the moment you pay. Boosts and the verification fast-track are done by our team, who contact you to set them up.</p>
      <div className={s.addons}>
        {Object.keys(ADDON_INFO).filter((k) => d.prices.addons?.[k]).map((k) => {
          const a = d.prices.addons[k];
          const mine = adds.filter((x) => x.addon_code === k);
          let held = "";
          if (k === "listing_pack") {
            const live = mine.filter((x) => x.applied_at && x.ends_at && new Date(x.ends_at) > new Date());
            if (live.length) held = `${live.length} active, until ${shortDate(live.map((x) => x.ends_at!).sort().pop()!)}`;
          } else if (mine.length) {
            const waiting = mine.filter((x) => !x.applied_at).length;
            held = waiting ? `${waiting} paid, we’ll contact you to set ${waiting > 1 ? "them" : "it"} up` : `Done ${shortDate(mine[0].applied_at!)}`;
          }
          return (
            <div key={k} className={s.card}>
              <div className={s.name}>{a.name}</div>
              <div className={s.muted}>{ADDON_INFO[k].desc}</div>
              <div className={s.price}>{naira(a.kobo)}<small> {a.unit === "month" ? "/month" : a.unit === "pack" ? "pack" : "each"}</small></div>
              {held && <div className={s.held}>{held}</div>}
              {a.on_sale === true
                ? <button type="button" className={s.ghost} disabled={busy === k} onClick={() => void pay(k, { addon: k })}>Buy · {naira(a.kobo)}</button>
                : <button type="button" className={s.ghost} disabled>Not on sale yet</button>}
            </div>
          );
        })}
      </div>

      <h2 className={s.h2}>Payments</h2>
      <div className={s.card}>
        {!pays.length ? <div className={s.muted}>No payments yet. Each one will be listed here, and Paystack emails a receipt to whoever paid.</div> : (
          <div className={s.scroll}>
            <table className={s.tbl}>
              <thead><tr><th>Date</th><th>What</th><th className={s.num}>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {pays.map((p, i) => {
                  const what = p.kind === "addon" ? ADDON_INFO[p.addon_code ?? ""]?.name ?? p.addon_code : `${TIER_NAME[p.plan_tier ?? ""] ?? p.plan_tier}, ${p.period === "annual" ? "a year" : "a month"}`;
                  const chip = paymentChip(p.status, p.created_at);
                  return <tr key={i}><td>{shortDate(p.created_at)}</td><td>{what}</td><td className={s.num}>{naira(p.amount_kobo)}</td><td><span className={`${s.chip} ${chip.tone === "paid" ? s.paid : chip.tone === "fail" ? s.fail : ""}`}>{chip.label}</span></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className={s.foot}>Paystack emails a receipt to whoever paid. A question about a payment? <a href="mailto:hello@synapsecore.dev?subject=A%20payment%20question" style={{ textDecoration: "underline" }}>Talk to us</a>.</p>
      {pilot && <PilotDialog onClose={() => setPilot(false)} />}
    </>
  );
}
