"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "@/lib/auth-actions";
import { roleOf } from "@/lib/auth-actions";
import { useSession } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { fetchAgencyHeader, forgetAgency, initialsOf, myRole, tierLabel, type AgencyHeader } from "./data/agency";
import { AgentsPane } from "./panes/AgentsPane";
import { BrandPane } from "./panes/BrandPane";
import { BillingPane } from "./panes/BillingPane";
import { ListingsPane } from "./panes/ListingsPane";
import { OverviewPane } from "./panes/OverviewPane";
import { CrmPane } from "./panes/CrmPane";
import { MarketingPane } from "./panes/MarketingPane";
import { NegotiatorPane } from "./panes/NegotiatorPane";
import { SocialPane } from "./panes/SocialPane";
import { SubscriptionPane } from "./panes/SubscriptionPane";
import { ToursPane } from "./panes/ToursPane";
import { VerificationPane } from "./panes/VerificationPane";
import { AdvisorPanel } from "./AdvisorPanel";
import { ToastProvider } from "./ui/Toast";
import { panesFor, resolvePane, type PaneId } from "./roles";
import s from "./Portal.module.css";

interface PaneDef { id: PaneId; label: string; eyebrow: string; title: string; sub?: string }

/** The sidebar, in the groups the agency already knows. */
const GROUPS: Array<{ label: string; panes: PaneDef[] }> = [
  { label: "Main", panes: [
    { id: "overview", label: "Overview", eyebrow: "Overview", title: "Overview" },
    { id: "crm", label: "CRM · Leads", eyebrow: "Leads", title: "CRM · Leads" },
    { id: "negotiator", label: "Tayo Negotiator", eyebrow: "Negotiation", title: "Tayo Negotiator" },
    { id: "listings", label: "Listings", eyebrow: "Inventory", title: "Listings" },
  ] },
  { label: "Growth", panes: [
    { id: "social", label: "Social studio", eyebrow: "Growth", title: "Social studio" },
    { id: "marketing", label: "Marketing", eyebrow: "Growth", title: "Marketing" },
  ] },
  { label: "Team", panes: [
    { id: "agents", label: "Agents", eyebrow: "Team", title: "Agents" },
    { id: "tours", label: "Tours", eyebrow: "Team", title: "Tours" },
    { id: "brand", label: "Brand", eyebrow: "Team", title: "Brand" },
  ] },
  { label: "Account", panes: [
    { id: "verification", label: "Verification", eyebrow: "Compliance", title: "Get verified", sub: "Buyers see a verified badge on every listing you publish. Your documents are private: kept in a closed store, opened only by you and the Synapse verification desk, never shown on your public page." },
    { id: "subscription", label: "Subscription", eyebrow: "Invest in growth", title: "Plans that pay for themselves" },
    { id: "billing", label: "Billing", eyebrow: "Account", title: "Billing" },
  ] },
];
const ALL_PANES: PaneId[] = GROUPS.flatMap((g) => g.panes.map((p) => p.id));

/** The panes that already live here. Everything else opens on the original portal until it moves; see README. */
const MIGRATED: Partial<Record<PaneId, () => React.ReactNode>> = {
  agents: () => <AgentsPane />,
  brand: () => <BrandPane />,
  billing: () => <BillingPane />,
  crm: () => <CrmPane />,
  listings: () => <ListingsPane />,
  overview: () => <OverviewPane />,
  marketing: () => <MarketingPane />,
  negotiator: () => <NegotiatorPane />,
  social: () => <SocialPane />,
  subscription: () => <SubscriptionPane />,
  tours: () => <ToursPane />,
  verification: () => <VerificationPane />,
};

const hashPane = () => decodeURIComponent(window.location.hash.replace(/^#/, ""));

/** /portal/. The agency workspace: sign-in and role gate, the sidebar (filtered by what the role may open), and one pane at a time. */
export function PortalShell() {
  const session = useSession();
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [agency, setAgency] = useState<AgencyHeader | null>(null);
  const [active, setActive] = useState<PaneId>("overview");
  const [collapsed, setCollapsed] = useState(false);

  const account = session?.user ?? null;
  const side = session === undefined ? "loading" : !account ? "out" : roleOf(account) !== "agency" ? "wrong" : "ok";

  // The gate is a UX gate, never a security boundary: the database policies are. It stops a person seeing a screen they cannot use.
  useEffect(() => {
    if (side !== "out" && side !== "wrong") return;
    const here = `/portal/${window.location.hash}`;
    window.location.replace(routes.signin(`?role=agency&next=${encodeURIComponent(here)}`));
  }, [side]);

  useEffect(() => {
    if (side !== "ok") return;
    let live = true;
    forgetAgency();
    myRole().then((r) => live && setRole(r));
    fetchAgencyHeader().then((a) => live && setAgency(a)).catch(() => {});
    return () => { live = false; };
  }, [side, account?.id]);

  const allowed = useMemo(() => panesFor(role, ALL_PANES), [role]);

  // The open pane lives in the address (#social), so a reload, a link and the Back button all keep their place.
  useEffect(() => {
    if (role === undefined) return;
    const sync = () => {
      const wanted = resolvePane(hashPane(), allowed);
      setActive(wanted ?? "overview");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [role, allowed]);

  const go = useCallback((id: PaneId) => { window.location.hash = id; window.scrollTo(0, 0); }, []);

  if (side !== "ok" || role === undefined) return <main className={s.boot} aria-busy="true"><p>Opening your workspace…</p></main>;

  const def = GROUPS.flatMap((g) => g.panes).find((p) => p.id === active)!;
  const Pane = MIGRATED[active];
  const name = agency?.name || "Your agency";

  return (
    <ToastProvider>
    <div className={s.shell} data-collapsed={collapsed}>
      <aside className={s.side} id="tabs" aria-label="Workspace">
        <div className={s.brand}>
          {/* The landing page is a static file, not a Next route, so a plain link is right here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Synapse</a>
        </div>
        <nav>
          {GROUPS.map((g) => {
            const items = g.panes.filter((p) => allowed.includes(p.id));
            // a group header with nothing under it is a heading for an empty room
            if (!items.length) return null;
            return (
              <div key={g.label} className={s.group}>
                <div className={s.groupLabel}>{g.label}</div>
                {items.map((p) => (
                  <a key={p.id} href={`#${p.id}`} className={active === p.id ? s.on : ""} aria-current={active === p.id ? "page" : undefined} title={p.label} onClick={(e) => { e.preventDefault(); go(p.id); }}>
                    <span className={s.dot} aria-hidden="true" />
                    <span className={s.lbl}>{p.label}</span>
                    {!MIGRATED[p.id] && <span className={s.old} title="Opens on the original portal">↗</span>}
                  </a>
                ))}
              </div>
            );
          })}
        </nav>
        <div className={s.me}>
          <span className={s.avatar} aria-hidden="true">{initialsOf(name)}</span>
          <div className={s.who}><div className={s.nm}>{name}</div><div className={s.tier}>{tierLabel(agency?.verification_tier)}</div></div>
        </div>
        <button type="button" className={s.toggle} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? "»" : "« Collapse"}</button>
      </aside>

      <div className={s.content}>
        <div className={s.topbar}>
          <span className={s.crumb}>{name}</span>
          <span className={s.spacer} />
          <button type="button" className={s.out} onClick={() => signOut().then(() => window.location.reload())}>Sign out</button>
        </div>
        <main className={s.main}>
          <div className={s.eyebrow}>{def.eyebrow}</div>
          <h1 className={s.h1}>{def.title}</h1>
          {def.sub && <p className={s.sub}>{def.sub}</p>}
          {Pane ? Pane() : <OriginalPane pane={def} />}
        </main>
      </div>
      <AdvisorPanel pane={active} />
    </div>
    </ToastProvider>
  );
}

/** A pane that has not moved yet. It is not broken: it is still fully working on the original portal, one tap away, signed in. */
function OriginalPane({ pane }: { pane: PaneDef }) {
  return (
    <div className={s.original}>
      <p><b>{pane.label}</b> is still on the original portal while it moves across.</p>
      <p className={s.muted}>Everything in it works as before and you stay signed in.</p>
      <a className={s.primary} href={`/app/agency.html#${pane.id}`}>Open {pane.label} →</a>
    </div>
  );
}
