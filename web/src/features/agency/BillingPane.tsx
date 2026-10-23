"use client";
/**
 * Billing, as React (was loadBilling/blRender in src/legacy/agency/inline-3.js). Eden, 2026-10-02: "build a billing page with our
 * design elements and put the add-ons as well". What the agency is on, paying for a month or a year, add-ons, and every payment.
 *
 * Every price shown comes from agency_billing(), which reads the same billing_prices() the checkout charges, so the page cannot
 * show one number and charge another. The annual offer is per agency: those that joined before it closes keep two months free.
 * Owner only, like Subscription: ROLE_PANES leaves it out for admins and agents, and the checkout refuses anyone else.
 *
 * Paying is still inline-3's startCheckout(what, btn) (the pricing cards share it, and for now it only says the pilot is free).
 * inline-3's loadBilling(), openBilling(planId) and blRender() survive as names and fire `syn:billing-load`, `syn:billing-plan`
 * and `syn:billing-render`.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { dynSet } from "./dyn";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);

type PlanCode = "accelerator" | "market_leader";
type Period = "monthly" | "annual";
type Data = { tier: string; period_end?: string | null; annual_months_free?: number; offer_joined_before?: string | null; listings_max?: number | null;
  card?: { brand?: string; last4?: string } | null; auto_renew?: boolean; renew_period?: string; renew_failed_attempts?: number; renew_error?: string | null;
  prices: { plans: Record<string, { monthly_kobo: number }>; addons?: Record<string, { name: string; kobo: number; unit?: string; on_sale?: boolean }> } };
type Pay = { created_at: string; kind: string; plan_tier?: string; period?: string; addon_code?: string; amount_kobo: number; status: string };
type Add = { addon_code: string; ends_at?: string | null; applied_at?: string | null; created_at?: string };

const BL_TIER_NAME: Record<string, string> = { free: "Free", accelerator: "Accelerate", market_leader: "Leader", enterprise: "Enterprise" };
const BL_PLANS: { code: PlanCode; name: string; line: string }[] = [
  { code: "accelerator", name: "Accelerate", line: "100 listings, 5 seats, every channel" },
  { code: "market_leader", name: "Leader", line: "Unlimited listings and seats, campaigns, proximity" },
];
const BL_ADDON_INFO: Record<string, { name: string; ico: string; desc: string }> = {
  listing_pack: { name: "Extra Listing Pack", ico: "agency", desc: "+25 active listings for a month, added the moment you pay." },
  social_boost: { name: "Social Reach Boost", ico: "share", desc: "Paid reach behind one listing on social. Never affects Tayo’s ranking." },
  verification_credits: { name: "Verification Credits", ico: "shield", desc: "Your next listings go to the front of the verification desk." },
  campaign_boost: { name: "Campaign Boost", ico: "chart", desc: "Extra reach behind a marketing campaign that’s working." },
  ai_credits: { name: "AI Marketing Credits", ico: "spark", desc: "AI captions aren’t metered yet, so there is nothing to top up. On sale when they are." },
};
const esc = (t: unknown) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const naira = (kobo: number) => "₦" + Math.round(Number(kobo) / 100).toLocaleString("en-NG");
const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function quote(d: Data, planCode: string, period: Period) {
  const month = Number(d.prices.plans[planCode].monthly_kobo);
  const free = Number(d.annual_months_free) || 0;
  return period === "annual" ? { amount: month * (12 - free), perMonth: (month * (12 - free)) / 12, unit: "year" } : { amount: month, perMonth: month, unit: "month" };
}

/* THE PRICE, AS A RECEIPT (idea: dqnamo's "Receipt Printer" in The Kitchen). The same sum laid out as the slip you would get at a
   till: what you are buying, the months, anything knocked off, and a TOTAL that matches the button. Drawn from quote(), the same
   function the button reads, so the slip and the charge cannot disagree. Kept as markup so Scramble can decode its numbers. */
function receipt(d: Data, planCode: PlanCode, period: Period) {
  const meta = BL_PLANS.find((p) => p.code === planCode) || { name: planCode };
  const month = Number(d.prices.plans[planCode].monthly_kobo), free = Number(d.annual_months_free) || 0;
  const annual = period === "annual", months = annual ? 12 : 1;
  const q = quote(d, planCode, period);
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const row = (l: string, r: string, cls: string) => '<div class="rc-row' + (cls ? " " + cls : "") + '"><span>' + l + "</span><b>" + r + "</b></div>";
  return '<div class="rc-paper" role="group" aria-label="What you will pay">'
    + '<div class="rc-head"><span class="rc-brand">SYNAPSE</span><span>' + esc(today) + "</span></div>"
    + '<div class="rc-rule"></div>'
    + '<div class="rc-item">' + esc(meta.name.toUpperCase()) + " PLAN" + (d.tier === planCode ? "<em>your plan</em>" : "") + "</div>"
    + row(months + (months === 1 ? " month" : " months") + " × " + naira(month), naira(month * months), "sub")
    + (annual && free > 0 ? row(free + (free === 1 ? " month" : " months") + " free", "−" + naira(month * free), "off") : "")
    + '<div class="rc-rule dash"></div>'
    + '<div class="rc-total"><span>TOTAL</span><b>' + naira(q.amount) + "</b></div>"
    + '<div class="rc-bar" aria-hidden="true"></div>'
    + "</div>";
}

/* Not on the first paint (nothing changed), only when you switch plan or period: the new amounts decode. */
function Receipt({ html }: { html: string }) {
  const slot = useRef<HTMLDivElement>(null);
  const before = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (before.current !== null && before.current !== html && slot.current && W().Scramble) W().Scramble.numbers(slot.current, ".rc-row b, .rc-total b");
    before.current = html;
  }, [html]);
  return <div className="rc-slot" data-bl-rcpt="" ref={slot} dangerouslySetInnerHTML={{ __html: html }}></div>;
}

function Buy({ d, plan, period, lapsed, setPlan, setPeriod, relabel }: { d: Data; plan: PlanCode; period: Period; lapsed: boolean; setPlan: (p: PlanCode) => void;
  setPeriod: (p: Period) => void; relabel: number }) {
  const pay = useRef<HTMLButtonElement>(null);
  const tier = d.tier;
  const paidThrough = d.period_end ? new Date(d.period_end) : null;
  const free = Number(d.annual_months_free) || 0;
  const q = quote(d, plan, period);
  const chosen = BL_PLANS.find((p) => p.code === plan) || BL_PLANS[0];
  const verb = tier === plan ? (lapsed ? "Renew " : "Extend ") + chosen.name : tier === "free" ? "Pay for " + chosen.name : "Switch to " + chosen.name;
  const label = verb + " · " + naira(q.amount);
  const closes = d.offer_joined_before ? longDate(d.offer_joined_before) : null;
  let note = period === "annual" ? naira(q.perMonth) + " a month, paid once a year." : "Paid month by month. Each payment covers one month.";
  if (period === "annual" && free > 0) note += " Your agency joined before " + (closes || "the offer closed") + ", so annual stays at " + (12 - free) + " months’ price.";
  if (tier !== "free" && tier !== plan) note += " A different plan starts the day you pay.";
  else if (tier === plan && !lapsed && paidThrough) note += " Time you have already paid for is kept: this adds to it.";
  /* The pay button's label is Dyn's (it glides between widths), and startCheckout writes "Opening Paystack" into it by hand. */
  useLayoutEffect(() => {
    const b = pay.current;
    if (!b || b.disabled) return;
    if (relabel) delete b.dataset.dynHtml;
    dynSet(b, label);
  }, [label, relabel]);

  return (
    <>
      <div className="bl-k">Pay for a plan</div>
      <div className="bl-seg" role="group" aria-label="How often you pay">
        <button type="button" data-bl-period="monthly" aria-pressed={period === "monthly"} onClick={() => setPeriod("monthly")}>Monthly</button>
        <button type="button" data-bl-period="annual" aria-pressed={period === "annual"} onClick={() => setPeriod("annual")}>Annual
          {free > 0 ? <span className="bl-save">{free} months free</span> : null}</button>
      </div>
      <div className="bl-opts" role="radiogroup" aria-label="Plan">
        {BL_PLANS.map((p) => {
          const pq = quote(d, p.code, period);
          return (
            <button key={p.code} type="button" className={"bl-opt" + (p.code === "market_leader" ? " irid" : "")} role="radio" aria-checked={p.code === plan} data-bl-plan={p.code}
              onClick={() => setPlan(p.code)}>
              <span className="bl-dot" aria-hidden="true"></span>
              <span><b>{p.name}{tier === p.code ? <span className="bl-tag">YOUR PLAN</span> : null}</b><small>{p.line}</small></span>
              <span className="bl-amt" data-bl-amt={p.code}>{naira(pq.amount)}<small>per {pq.unit}</small></span>
            </button>
          );
        })}
      </div>
      <Receipt html={receipt(d, plan, period)} />
      <div className="bl-note" data-bl-note="">{note}</div>
      <button type="button" className="btn btn-primary bl-pay" data-bl-pay="" ref={pay} onClick={(e) => W().startCheckout({ plan, period }, e.currentTarget)}></button>
      <div className="bl-fine">You pay on Paystack’s page by card, bank transfer or USSD. Paying by card renews your plan automatically each <span data-bl-every="">{period === "annual" ? "year" : "month"}</span>;
        you can turn that off here at any time. Bigger needs? <a href="#" data-bl-enterprise="" style={{ color: "inherit" }} onClick={talk}>Enterprise</a> is priced with you.</div>
    </>
  );
}

function talk(e: React.MouseEvent) { e.preventDefault(); if (typeof W().toggleRm === "function") W().toggleRm(true, "Enterprise"); }

/* AUTO BILLING: whether the plan renews itself, on which card, and what happened if the last try failed. Owner and admin can turn
   it off or drop the card; turning it off lets the plan end on its date. */
function Renewal({ d, paidThrough, reload }: { d: Data; paidThrough: Date | null; reload: () => void }) {
  const [busy, setBusy] = useState<"renew" | "forget" | null>(null);
  const card = (d.card!.brand || "Card") + " ···· " + (d.card!.last4 || "");
  const every = d.renew_period === "annual" ? "year" : "month";
  const ends = paidThrough ? longDate(d.period_end!) : "its end date";
  const fails = d.renew_failed_attempts || 0;
  const change = (forget: boolean) => {
    if (forget && !window.confirm("Remove this card? Your plan will end on its date instead of renewing.")) return;
    setBusy(forget ? "forget" : "renew");
    const on = !d.auto_renew;
    W().SynAuth.client().then((c: any) => W().SynListings.agencyId().then((aid: string) => (forget
      ? c.rpc("remove_billing_card", { p_agency_id: aid })
      : c.rpc("set_auto_renew", { p_agency_id: aid, p_on: on }))))
      .then((r: any) => {
        if (r && r.error) throw new Error(r.error.message);
        toast(forget ? "Card removed." : on ? "Auto-renew is on." : "Auto-renew is off.");
        reload();
      })
      .catch(() => { setBusy(null); toast("That didn’t save. Try again."); });
  };
  return (
    <>
      {d.auto_renew ? (
        <>
          <div className="bl-state">Renews on {ends} to {card}, every {every}.</div>
          {fails > 0 ? (
            <div className="bl-state warn">The last renewal didn’t go through{d.renew_error ? ": " + d.renew_error : ""}. {fails < 4 ? "We’ll try again. " : "We’ve stopped trying. "}Paying below with a working card puts it right.</div>
          ) : null}
        </>
      ) : <div className="bl-state" style={{ color: "var(--ink-muted)" }}>Auto-renew is off. Your plan ends on {ends}.</div>}
      <div className="bl-state" style={{ marginTop: "10px" }}>
        <button type="button" className="btn btn-ghost" data-bl-renew={d.auto_renew ? "off" : "on"} disabled={busy === "renew"} onClick={() => change(false)}>
          {d.auto_renew ? "Turn off auto-renew" : "Turn on auto-renew"}</button>{" "}
        <button type="button" className="btn btn-ghost" data-bl-forget="" disabled={busy === "forget"} onClick={() => change(true)}>Remove card</button>
      </div>
    </>
  );
}

type Loaded = { data: Data; pays: Pay[]; adds: Add[]; gen: number; at: number };

export function BillingPane() {
  const [got, setGot] = useState<Loaded | null>(null);
  const [err, setErr] = useState<{ msg: string; retry: boolean } | null>(null);
  const [plan, setPlanState] = useState<PlanCode | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [relabel, setRelabel] = useState(0);
  const [irid, setIrid] = useState(false);   // kept through an error, as the old page left the class alone
  const gens = useRef(0);
  const planRef = useRef<PlanCode | null>(null);
  const setPlan = (p: PlanCode) => { planRef.current = p; setPlanState(p); };

  const load = () => {
    const A = W().SynAuth, L = W().SynListings;
    const fail = (msg: string, retry = false) => { setErr({ msg, retry }); setGot(null); };
    if (!A || !L || !L.agencyId) { fail("Sign in to see billing."); return; }
    A.client().then((c: any) => L.agencyId().then((aid: string) => {
      if (!aid) throw new Error("No agency for this account");
      return Promise.all([
        c.rpc("agency_billing", { p_agency_id: aid }),
        c.from("subscription_payments").select("created_at, kind, plan_tier, period, months, addon_code, amount_kobo, status")
          .eq("agency_id", aid).order("created_at", { ascending: false }).limit(50),
        c.from("agency_addons").select("addon_code, ends_at, applied_at, created_at")
          .eq("agency_id", aid).order("created_at", { ascending: false }).limit(50),
      ]);
    })).then(([b, pays, adds]: any[]) => {
      if (b.error || !b.data) {
        /* The database side ships as a migration; until it is applied the function does not exist. Say that. */
        const missing = b.error && (b.error.code === "PGRST202" || /could not find the function/i.test(b.error.message || ""));
        fail(missing ? "Billing is being switched on. Check back shortly." : "Billing couldn’t load.", !missing);
        return;
      }
      const data: Data = b.data;
      if (!planRef.current) setPlan(data.tier === "market_leader" ? "market_leader" : "accelerator");
      setPeriod((p) => p || ((data.annual_months_free || 0) > 0 ? "annual" : "monthly"));
      setErr(null); setIrid(data.tier === "market_leader");
      setGot({ data, pays: (pays && pays.data) || [], adds: (adds && adds.data) || [], gen: ++gens.current, at: Date.now() });
    }).catch((e: any) => { console.error("loadBilling failed", e); fail("Billing couldn’t load.", true); });
  };
  useEffect(() => {
    const onPlan = (e: Event) => { const p = (e as CustomEvent).detail; if (p) setPlan(p === "market-leader" ? "market_leader" : p); };
    const onRender = () => setRelabel((n) => n + 1);
    window.addEventListener("syn:billing-load", load);
    window.addEventListener("syn:billing-plan", onPlan);
    window.addEventListener("syn:billing-render", onRender);
    return () => {
      window.removeEventListener("syn:billing-load", load);
      window.removeEventListener("syn:billing-plan", onPlan);
      window.removeEventListener("syn:billing-render", onRender);
    };
  }, []);

  const d = got && !err ? got.data : null;
  const tier = d ? d.tier : "";
  const paidThrough = d && d.period_end ? new Date(d.period_end) : null;
  const lapsed = !!(paidThrough && paidThrough < new Date());
  /* The plan picker is rebuilt only when what it is priced from changes, as before, so the card under the pointer stays. */
  const sig = d ? [tier, d.period_end, Number(d.annual_months_free) || 0, JSON.stringify(d.prices.plans)].join("|") : "";

  let now;
  if (err) {
    now = (
      <>
        <div className="bl-k">Your plan</div><div className="bl-state">{err.msg}</div>
        {err.retry ? <button type="button" className="btn btn-ghost" style={{ marginTop: "14px" }} data-bl-retry="" onClick={load}>Try again</button> : null}
      </>
    );
  } else if (!d || !got) {
    now = <><div className="bl-k">Your plan</div><div className="bl-state">Loading…</div></>;
  } else {
    const packs = got.adds.filter((a) => a.addon_code === "listing_pack" && a.applied_at && (!a.ends_at || new Date(a.ends_at) > new Date())).length;
    const limit = d.listings_max == null ? "Unlimited active listings."
      : d.listings_max + " active listings" + (packs ? ", including " + packs + " listing pack" + (packs > 1 ? "s" : "") : "") + ".";
    now = (
      <>
        <div className="bl-k">Your plan</div>
        <div className="bl-plan">{BL_TIER_NAME[tier] || tier}</div>
        {tier === "enterprise" ? <div className="bl-state">Terms agreed with you.</div>
          : tier === "free" ? <div className="bl-state">Free forever. Upgrade whenever you like.</div>
          : !paidThrough ? <div className="bl-state">Active.</div>
          : lapsed ? <div className="bl-state warn">Your paid period ended on {longDate(d.period_end!)}. Renew to keep it.</div>
          : <div className="bl-state">Paid through {longDate(d.period_end!)}.</div>}
        {d.card && (tier === "accelerator" || tier === "market_leader") ? <Renewal key={got.gen} d={d} paidThrough={paidThrough} reload={load} /> : null}
        <div className="bl-meta">{limit}</div>
      </>
    );
  }

  const addons = d ? d.prices.addons || {} : {};
  return (
    <>
      <div className="bl-grid">
        <div className={"card bl-now" + (irid ? " irid" : "")} id="blNow">{now}</div>
        <div className="card bl-buy" id="blBuy">
          {d && tier === "enterprise" ? (
            <>
              <div className="bl-k">Your terms</div>
              <p className="bl-note" style={{ fontSize: "14px", color: "var(--ink)" }}>Enterprise is priced with you: a monthly fee, per project, or a commission on closed deals. Invoices come from ILIOS Digital.</p>
              <button type="button" className="btn btn-ghost bl-pay" data-bl-talk="" onClick={talk}>Talk to us about your terms</button>
            </>
          ) : d && plan && period ? (
            <Buy key={sig} d={d} plan={plan} period={period} lapsed={lapsed} setPlan={setPlan} setPeriod={setPeriod} relabel={relabel} />
          ) : null}
        </div>
      </div>
      <div className="h2 bl-h2" id="blAddonsHead">Add-ons</div>
      <p className="sub">Top up without changing plan. A listing pack works the moment you pay. Boosts and the verification fast-track are done by our team, who contact you to set them up.</p>
      <div className="addons-grid bl-addons" id="blAddons">
        {got && d ? Object.keys(BL_ADDON_INFO).filter((k) => addons[k]).map((k) => {
          const a = addons[k], info = BL_ADDON_INFO[k];
          const mine = got.adds.filter((x) => x.addon_code === k);
          let held = null;
          if (k === "listing_pack") {
            const live = mine.filter((x) => x.applied_at && x.ends_at && new Date(x.ends_at) > new Date());
            if (live.length) held = <div className="bl-held">{live.length} active, until {shortDate(live.map((x) => x.ends_at!).sort().pop()!)}</div>;
          } else if (mine.length) {
            const waiting = mine.filter((x) => !x.applied_at).length;
            held = waiting ? <div className="bl-held wait">{waiting} paid, we’ll contact you to set {waiting > 1 ? "them" : "it"} up</div>
              : <div className="bl-held">Done {shortDate(mine[0].applied_at!)}</div>;
          }
          return (
            <div className="card addon bl-addon" key={k}>
              <div className="aico" dangerouslySetInnerHTML={{ __html: W().SynIcons ? W().SynIcons.svg(info.ico) : "" }}></div>
              <div className="aname">{a.name}</div>
              <div className="adesc">{info.desc}</div>
              <div className="aprice">{naira(a.kobo)}<small> {a.unit === "month" ? "/month" : a.unit === "pack" ? "pack" : "each"}</small></div>
              {held}
              {/* Keyed by the load: startCheckout writes into the button by hand, so each load draws a fresh one. */}
              {a.on_sale === true
                ? <button key={got.gen} type="button" className="abtn" data-bl-addon={k} onClick={(e) => W().startCheckout({ addon: k }, e.currentTarget)}>Buy · {naira(a.kobo)}</button>
                : <button type="button" className="abtn" disabled>Not on sale yet</button>}
            </div>
          );
        }) : null}
      </div>
      <div className="h2 bl-h2">Payments</div>
      <div className="card bl-hist" id="blHist">
        {got && d ? (got.pays.length ? (
          <table className="bl-tbl"><thead><tr><th>Date</th><th>What</th><th className="num">Amount</th><th>Status</th></tr></thead><tbody>
            {got.pays.map((p, i) => {
              const what = p.kind === "addon" ? ((BL_ADDON_INFO[p.addon_code || ""] || {}).name || p.addon_code)
                : (BL_TIER_NAME[p.plan_tier || ""] || p.plan_tier) + ", " + (p.period === "annual" ? "a year" : "a month");
              const age = got.at - new Date(p.created_at).getTime();
              const chip = p.status === "success" ? <span className="bl-chip paid">Paid</span>
                : p.status === "failed" ? <span className="bl-chip fail">Failed</span>
                : age > 3600 * 1000 ? <span className="bl-chip wait">Not completed</span>
                : <span className="bl-chip wait">Waiting for Paystack</span>;
              return <tr key={i}><td>{shortDate(p.created_at)}</td><td>{what}</td><td className="num">{naira(p.amount_kobo)}</td><td>{chip}</td></tr>;
            })}
          </tbody></table>
        ) : <div className="bl-empty">No payments yet. Each one will be listed here, and Paystack emails a receipt to whoever paid.</div>) : null}
      </div>
      <p className="bl-foot">{"Paystack emails a receipt to whoever paid. A question about a payment? "}<a href="#" data-bl-talk="" onClick={talk}>Talk to us</a>.</p>
    </>
  );
}
