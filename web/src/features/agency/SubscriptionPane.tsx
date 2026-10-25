"use client";
/**
 * Subscription, as React (was renderPricing/renderPlanUsage/paintReferral/refreshCurrentPlan in src/legacy/agency/inline-3.js):
 * what this agency has used, the referral card, the plans as a comparison (a table on a desk, cards on a phone -- both always in
 * the DOM and CSS picks one), add-ons and the ROI note. Also the two prompts the paywall shows: the plan-limit prompt
 * (planGate) and "nothing to pay right now" (showFreeAccess).
 *
 * portalShell keeps what is not drawing: loadPaywallInfo (the bell reads SYN_PAYWALL too, and it sets SYN_REFERRAL), the referral
 * claim, the checkout and its return. Its refreshCurrentPlan(), paintReferral() and showFreeAccess() survive as names and fire
 * `syn:plan-refresh`, `syn:referral` and `syn:free-access`; planGate(msg) still answers whether the message was a plan limit
 * (the toast hook needs that at once) and fires `syn:plan-gate`.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePageScripts } from "@/legacy/usePageScripts";
import { DeleteAgency } from "./DeleteAgency";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const noSubscribe = () => () => {};
const scrollToAddons = () => setTimeout(() => document.getElementById("blAddonsHead")?.scrollIntoView({ block: "start", behavior: "smooth" }), 350);

type Plan = { id: string; name: string; headline: string; price: number | null; priceLabel?: string; unit: string; badge?: string; feature?: boolean; gold?: boolean };
/* Edit these to change the plans. ENTERPRISE (Eden, 2026-10-02) has no list price: terms are agreed with the agency -- a monthly
   fee, per project, or a commission on closed deals -- so it says "Negotiated" and its button opens a real conversation. */
const PLANS: Plan[] = [
  { id: "foundation", name: "Free", headline: "Everything you need to start winning buyers.", price: 0, unit: "forever" },
  { id: "accelerator", name: "Accelerate", headline: "Grow faster with AI-powered marketing and verification.", price: 25000, unit: "per month", feature: true, badge: "MOST POPULAR" },
  { id: "market-leader", name: "Leader", headline: "Dominate your local market.", price: 75000, unit: "per month", gold: true },
  { id: "enterprise", name: "Enterprise", headline: "Terms built around your business.", price: null, priceLabel: "Negotiated", unit: "" },
];
const TIER_PLAN: Record<string, string> = { free: "foundation", accelerator: "accelerator", market_leader: "market-leader", enterprise: "enterprise" };
const DEFAULT_CTA: Record<string, string> = { foundation: "Current plan", accelerator: "Upgrade to Accelerate", "market-leader": "Choose Leader", enterprise: "Talk to us" };
/* Tiers as columns, benefits as rows: read a row across to see which plans include it. */
const COMPARE_ROWS: { label: string; vals: (string | boolean)[] }[] = [
  { label: "Active listings", vals: ["20", "100", "Unlimited", "Unlimited"] },
  { label: "Team seats", vals: ["2", "5", "Unlimited", "Unlimited"] },
  { label: "CRM with WhatsApp handoff", vals: [true, true, true, true] },
  { label: "Tayo AI buyer referrals", vals: [true, true, true, true] },
  { label: "Verification speed", vals: ["Standard queue", "48 hours", "Dedicated desk", "Dedicated desk"] },
  { label: "Verification badge", vals: ["Verified", "Verified", "Gold Verified", "Gold Verified"] },
  { label: "Publish once, reach every channel", vals: [false, true, true, true] },
  { label: "AI writes captions & auto-posts", vals: [false, true, true, true] },
  { label: "AI-generated marketing campaigns", vals: [false, false, true, true] },
  { label: "Proximity marketing", vals: [false, false, true, true] },
  { label: "Analytics", vals: ["Basic", "Lead + engagement", "Premium, full attribution", "Premium, full attribution"] },
  { label: "Support", vals: ["Standard", "Standard", "Priority", "Dedicated manager"] },
];
const ADDONS = [
  { ico: "agency", name: "Extra Listing Pack", desc: "+25 active listings when your catalogue outgrows the plan.", price: "₦15k", unit: "/mo" },
  { ico: "spark", name: "AI Marketing Credits", desc: "More AI captions, variations and campaign generations.", price: "₦8k", unit: "pack" },
  { ico: "share", name: "Social Reach Boost", desc: "Extra paid reach behind one listing on social channels, never affects Tayo's ranking.", price: "₦10k", unit: "each" },
  { ico: "shield", name: "Verification Credits", desc: "Fast-track extra listings through the trust desk.", price: "₦6k", unit: "pack" },
  { ico: "chart", name: "Campaign Boost", desc: "Extra reach behind a marketing campaign that's working.", price: "₦20k", unit: "each" },
];
const ROI_POINTS = ["Generate more qualified buyers", "Reduce wasted advertising spend", "Automate repetitive marketing", "Build trust through verification", "Understand which campaigns actually close deals"];
const nairaPlan = (n: number) => (n === 0 ? "₦0" : "₦" + n / 1000 + "k");

/* The plan actually on the agency's record (null until it loads: Free is shown as current, as before). The current plan is inert,
   except a paid one, whose button renews or extends it; Free has no self-serve downgrade, so its button asks a person. */
function ctaFor(p: Plan, tier: string | null) {
  if (tier == null) return { cta: DEFAULT_CTA[p.id], primary: p.id === "accelerator", off: p.id === "foundation" };
  const current = TIER_PLAN[tier] === p.id;
  if (current && (p.id === "accelerator" || p.id === "market-leader")) return { cta: "Renew or extend", primary: false, off: false };
  if (current) return { cta: "Current plan", primary: false, off: true };
  return { cta: p.id === "foundation" ? "Move to Free" : DEFAULT_CTA[p.id], primary: p.id === "accelerator", off: false };
}
const cellCls = (p: Plan) => (p.feature ? " feature" : "") + (p.gold ? " gold-plan" : "");
const amount = (p: Plan) => <>{p.price == null ? p.priceLabel || "Let’s talk" : nairaPlan(p.price)}{p.price ? <small> /{p.unit.replace("per ", "")}</small> : null}</>;

/* EVERY PLAN ANSWERS (Eden, 2026-10-02): a click anywhere on a plan's card, or its column in the table, does what its button says.
   Accelerate and Leader go to Billing with that plan chosen; Enterprise and "Move to Free" open Contact Synapse with an email
   already written about that plan. */
function pick(e: React.MouseEvent, tier: string | null) {
  const t = e.target as HTMLElement;
  const cell = t.closest<HTMLElement>("[data-col]");
  if (!cell || t.closest("a")) return;
  const plan = PLANS.find((p) => p.id === cell.dataset.col);
  if (!plan || ctaFor(plan, tier).off) return;
  if (plan.id === "accelerator" || plan.id === "market-leader") { W().openBilling(plan.id); return; }
  if (typeof W().toggleRm === "function") W().toggleRm(true, plan.name);
}

type Usage = { tier: string; listings_used: number; listings_max: number | null; seats_used: number; seats_max: number | null };
const TIER_NAME: Record<string, string> = { free: "Free", accelerator: "Accelerate", market_leader: "Leader", enterprise: "Enterprise" };
/* null max is unlimited, which is not the same as a ceiling of zero and must never read "3 of 0". */
function UsageRow({ label, used, max }: { label: string; used: number; max: number | null }) {
  if (max == null) return <div className="pu-item"><span className="pu-k">{label}</span><b className="pu-v">{used}</b><span className="pu-max">of unlimited</span></div>;
  const full = used >= max;
  return (
    <div className={"pu-item" + (full ? " full" : "")}>
      <span className="pu-k">{label}</span><b className="pu-v">{used}</b><span className="pu-max">of {max}</span>
      <span className="pu-bar"><i style={{ width: Math.min(100, Math.round((used / max) * 100)) + "%" }}></i></span>
      {full ? <span className="pu-note">at your limit</span> : null}
    </div>
  );
}

type Referral = { on: boolean; code: string; per_reward: number; into_next: number; months_per_reward: number; listings_required: number; counted: number; pending: number;
  months_earned: number; recent?: { name?: string; counted?: boolean }[] };
const referralLink = (code: string) => "https://www.synapsecore.dev/?ref=" + encodeURIComponent(code);
/* Referrals: every 5 agencies you refer = a month free. SYN_REFERRAL is set by portalShell's loadPaywallInfo. */
function ReferralCard() {
  const [r, setR] = useState<Referral | null>(null);
  const code = useRef<HTMLElement>(null);
  useEffect(() => {
    const paint = () => setR(W().SYN_REFERRAL || null);
    window.addEventListener("syn:referral", paint);
    return () => window.removeEventListener("syn:referral", paint);
  }, []);
  const show = !!(r && r.on && r.code);
  const copy = () => {
    if (!r) return;
    const link = referralLink(r.code);
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) { navigator.share({ title: "Synapse for agencies", text: "Try Synapse for your agency:", url: link }).catch(() => {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(() => toast("Link copied. Send it to another agent."), () => {});
    else if (code.current) { const rg = document.createRange(); rg.selectNodeContents(code.current); const sl = getSelection()!; sl.removeAllRanges(); sl.addRange(rg); }
  };
  if (!show || !r) return <div className="ref-card" id="referralCard" hidden></div>;
  const per = r.per_reward, into = r.into_next;
  const month = r.months_per_reward === 1 ? "month" : r.months_per_reward + " months";
  const recent = r.recent || [];
  return (
    <div className={"ref-card" + (r.months_earned > 0 ? " irid" : "")} id="referralCard">
      <h3>Refer agents, get a free {r.months_per_reward === 1 ? "month" : "stretch"}</h3>
      <p>Every {per} agencies you bring to Synapse earn you {r.months_per_reward === 1 ? "one month" : month} free. An agency counts once it has uploaded {r.listings_required} listings.</p>
      <div className="ref-steps" aria-hidden="true">{Array.from({ length: per }, (_, i) => <i key={i} className={i < into ? "on" : ""}></i>)}</div>
      <div className="ref-line"><span><b>{into} of {per}</b> toward your next free month</span><span>{r.counted} counted{r.pending ? " · " + r.pending + " joined" : ""}</span></div>
      {r.months_earned ? <span className="ref-earned">{r.months_earned}{r.months_earned === 1 ? " month" : " months"} earned</span> : null}
      <div className="ref-link"><code id="refLinkTxt" ref={code}>{referralLink(r.code)}</code><button type="button" className="btn btn-primary" id="refCopy" onClick={copy}>Copy link</button></div>
      {recent.length ? (
        <ul className="ref-list" aria-label="Agencies you referred">
          {recent.map((x, i) => <li key={i} className={x.counted ? "ok" : ""}><span>{x.name || "An agency"}</span><span>{x.counted ? "Counted" : "Joined · needs " + r.listings_required + " listings"}</span></li>)}
        </ul>
      ) : null}
    </div>
  );
}

export function SubscriptionPane() {
  const scripts = usePageScripts();
  const [tier, setTier] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);

  useEffect(() => {
    if (!scripts) return;
    /* The numbers come from the database function the triggers share, so the portal cannot promise headroom the insert will
       refuse. A failure leaves it hidden: a wrong number is worse. */
    const loadUsage = () => {
      const A = W().SynAuth, L = W().SynListings;
      if (!A || !A.client || !L) return;
      A.client().then((c: any) => L.agencyId().then((aid: string) => (aid ? c.rpc("agency_plan_usage", { p_agency_id: aid }) : null)))
        .then((r: any) => { const u = r && r.data; if (u && u.tier) setUsage(u); })
        .catch(() => {});
    };
    const refresh = () => {
      loadUsage();
      if (!W().SynListings) return;
      W().SynListings.agency().then((a: any) => { setTier((a && a.subscription_tier) || "free"); loadUsage(); }).catch(() => {});
    };
    refresh();
    window.addEventListener("syn:plan-refresh", refresh);
    return () => window.removeEventListener("syn:plan-refresh", refresh);
  }, [scripts]);

  const openBilling = (e: React.MouseEvent, addons = false) => { e.preventDefault(); W().openBilling(); if (addons) scrollToAddons(); };
  return (
    <>
      <div className="eyebrow">Invest in growth</div>
      <div className="h1">Plans that pay for themselves</div>
      {usage ? (
        <div className="plan-usage" id="planUsage">
          <div className="pu-plan">You are on <b>{TIER_NAME[usage.tier] || usage.tier}</b></div>
          <UsageRow label="Active listings" used={usage.listings_used} max={usage.listings_max} />
          <UsageRow label="Team seats" used={usage.seats_used} max={usage.seats_max} />
        </div>
      ) : <div className="plan-usage" id="planUsage" hidden></div>}
      <ReferralCard />
      <a className="bl-link" href="#billing" data-open-billing="" onClick={(e) => openBilling(e)}>{"Billing, payments and add-ons "}<span aria-hidden="true">{"→"}</span></a>
      <div className="pr-table-wrap">
        <div className="pr-compare" id="pricingGrid" onClick={(e) => pick(e, tier)}>
          <div className="pr-corner"></div>
          {PLANS.map((p) => <div key={p.id} className={"pr-head" + cellCls(p)} data-col={p.id}>{p.badge ? <span className="pr-pop">{p.badge}</span> : null}<div className="tname">{p.name}</div><div className="thead">{p.headline}</div></div>)}
          <div className="pr-row-label">Price</div>
          {PLANS.map((p) => <div key={p.id} className={"pr-cell" + cellCls(p)} data-col={p.id}><div className="amt">{amount(p)}</div></div>)}
          <div className="pr-row-label"></div>
          {PLANS.map((p) => {
            const c = ctaFor(p, tier);
            return <div key={p.id} className={"pr-cell" + cellCls(p)} data-col={p.id}><button className={"btn btn-" + (c.primary ? "primary" : "ghost")} data-plan={p.id} disabled={c.off} style={c.off ? { opacity: 0.7 } : undefined}>{c.cta}</button></div>;
          })}
          {COMPARE_ROWS.map((r) => [
            <div key={r.label} className="pr-row-label">{r.label}</div>,
            ...r.vals.map((v, i) => (
              <div key={r.label + i} className={"pr-cell" + cellCls(PLANS[i])} data-col={PLANS[i].id}>
                {v === true ? <span className="pr-check">✓</span> : v === false ? <span className="pr-dash">-</span> : <span className="pr-val">{v}</span>}
              </div>
            )),
          ])}
        </div>
      </div>
      {/* The same comparison as cards: the table needs 680px, and a comparison you can only see one column of is not one. */}
      <div className="pr-cards" id="pricingCards" onClick={(e) => pick(e, tier)}>
        {PLANS.map((p, i) => {
          const c = ctaFor(p, tier);
          return (
            <div key={p.id} className={"prc-card" + (p.badge ? " pop" : "") + (c.off ? "" : " can")} data-col={p.id}>
              {p.badge ? <span className="pr-pop">{p.badge}</span> : null}
              <div className="prc-name">{p.name}</div>
              <div className="prc-head">{p.headline}</div>
              <div className="prc-amt">{amount(p)}</div>
              <button className={"btn btn-" + (c.primary ? "primary" : "ghost")} data-plan={p.id} disabled={c.off} style={c.off ? { opacity: 0.7 } : undefined}>{c.cta}</button>
              <ul className="prc-feats">
                {COMPARE_ROWS.map((r) => {
                  const v = r.vals[i];
                  if (v === false) return null;   // omit, don't clutter
                  return <li key={r.label} className={v === true ? "yes" : undefined}><span className="prc-k">{r.label}</span>{v === true ? null : <span className="prc-v">{v}</span>}</li>;
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="h2" style={{ marginTop: "40px" }}>Grow as you need</div>
      <p className="sub">Top up a plan without upgrading, one-off or monthly.</p>
      <div className="addons-grid" id="addonsGrid">
        {ADDONS.map((a) => (
          <div key={a.name} className="card addon">
            <div className="aico" dangerouslySetInnerHTML={{ __html: mounted && W().SynIcons ? W().SynIcons.svg(a.ico) : "" }}></div>
            <div className="aname">{a.name}</div><div className="adesc">{a.desc}</div>
            <div className="aprice">{a.price}<small> {a.unit}</small></div>
            <button className="abtn" onClick={(e) => openBilling(e, true)}>Add</button>
          </div>
        ))}
      </div>
      <div className="card roi" id="roiSection">
        <h3>One sale can pay for your subscription many times over.</h3>
        <div className="rgrid">{ROI_POINTS.map((p) => <div key={p}>{p}</div>)}</div>
        <p className="rclose">The goal isn&apos;t to save money. <b>The goal is to help you earn more.</b></p>
      </div>
      <DeleteAgency />
    </>
  );
}

/* THE PAYWALL'S FACE (2026-10-03). When a plan limit refuses something, the database says so in a sentence. This says what
   happened and offers the way through: plans, or a listing pack. Only the owner pays, so others are told to ask their owner. */
export function PlanGate() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setMsg(String((e as CustomEvent).detail || ""));
    window.addEventListener("syn:plan-gate", on);
    return () => window.removeEventListener("syn:plan-gate", on);
  }, []);
  if (msg == null) return null;
  const listing = /active listings/i.test(msg), seats = /team seats/i.test(msg);
  const owner = document.body.dataset.role === "agency_owner";
  const go = (what: "close" | "plans" | "pack") => {
    setMsg(null);
    if (what === "plans") W().goToPane("subscription");
    if (what === "pack") { W().openBilling(); scrollToAddons(); }
  };
  return createPortal(
    <div className="pg-scrim" id="planGate" onClick={(e) => { if (e.target === e.currentTarget) go("close"); }}>
      <div className="pg" role="dialog" aria-modal="true" aria-labelledby="pgT">
        <h3 id="pgT">{listing ? "You’ve reached your listing limit" : seats ? "Your team is full on this plan" : "That’s on Accelerate and above"}</h3>
        <p>{msg.replace(/\s*(Upgrade|Subscription in the portal).*$/i, "")}</p>
        {owner ? (
          <div className="pg-b">
            {listing ? <button type="button" className="btn btn-ghost" data-pg="pack" onClick={() => go("pack")}>Add 25 listings</button> : null}
            <button type="button" className="btn btn-primary" data-pg="plans" onClick={() => go("plans")}>See plans</button>
          </div>
        ) : <p className="pg-n">Only your agency’s owner can change the plan. Ask them to upgrade.</p>}
        <button type="button" className="pg-x" data-pg="close" aria-label="Close" onClick={() => go("close")}>{"×"}</button>
      </div>
    </div>,
    document.body,
  );
}

/* FOR NOW, NOBODY PAYS (Eden, 2026-10-16): pressing Pay on any plan or add-on shows this instead of opening Paystack. It is true
   because the paywall is off: every agency already has everything. portalShell's FREE_30_DAYS decides whether it shows. */
export function FreeAccess() {
  const [open, setOpen] = useState(false);
  const [turn, setTurn] = useState(0);
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const on = () => { setOpen(true); setTurn((t) => t + 1); };
    window.addEventListener("syn:free-access", on);
    return () => window.removeEventListener("syn:free-access", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", key);
    const t = setTimeout(() => ok.current?.focus(), 30);
    return () => { document.removeEventListener("keydown", key); clearTimeout(t); };
  }, [open, turn]);
  if (!open) return null;
  return createPortal(
    <div id="freeAccess" className="fa-scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="fa-card" role="dialog" aria-modal="true" aria-labelledby="faT">
        <div className="fa-k">Nothing to pay right now</div>
        <h2 id="faT" className="fa-t">You are in the <em>free pilot</em>.</h2>
        <p className="fa-w">Every feature is open to your agency while we run the pilot: unlimited listings, the studio, the proximity alerts and the negotiator. There is nothing to pay and no card to enter. Billing stays here, and we will tell you well before anything changes.</p>
        <div className="fa-row"><button type="button" className="btn btn-primary" id="faOk" ref={ok} onClick={() => setOpen(false)}>Great, carry on</button></div>
      </div>
    </div>,
    document.body,
  );
}
