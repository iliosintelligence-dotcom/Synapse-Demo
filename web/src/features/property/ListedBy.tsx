"use client";

import { useEffect, useState } from "react";
import { AgencyLogo } from "@/components/AgencyLogo";
import { brandHex } from "@/lib/brand";
import { cacLabel } from "@/lib/format";
import { fetchAgentCard } from "./queries";
import type { AgentCard, Property, PropertyAgency } from "./types";
import s from "./Property.module.css";

/**
 * "Listed by": the agency first (its logo or colour and initial, its CAC standing, a link to its page), and a named agent only
 * when the listing has one. With no agent the big block is the agency itself, never an empty portrait.
 */
export function ListedBy({ p }: { p: Property }) {
  const agency: PropertyAgency | null = Array.isArray(p.agencies) ? p.agencies[0] ?? null : p.agencies;
  const [agent, setAgent] = useState<AgentCard | null>(null);

  useEffect(() => {
    if (!p.listed_by_agent_id) return;
    let live = true;
    fetchAgentCard(p.listed_by_agent_id).then((a) => { if (live && a?.full_name) setAgent(a); }).catch(() => {});
    return () => { live = false; };
  }, [p.listed_by_agent_id]);

  const name = agency?.name ?? "Agency not published";
  const cac = cacLabel(agency?.cac_number)
    ? `CAC ${cacLabel(agency?.cac_number)}`
    : agency?.cac_certificate_on_file ? "CAC certificate on file" : "CAC not yet on file";
  const verified = agency?.verification_tier === "verified";
  const href = p.agency_id ? `/agency/?id=${encodeURIComponent(p.agency_id)}` : null;
  const agentBits = agent
    ? [
        agent.years_experience != null ? `${agent.years_experience} yr${agent.years_experience === 1 ? "" : "s"} experience` : "",
        agent.closed_deals != null ? `${agent.closed_deals} deals closed` : "",
        agent.response_rate_pct != null ? `${agent.response_rate_pct}% reply rate` : "",
      ].filter(Boolean)
    : [];

  return (
    <section className={s.card}>
      <h2 className={s.lbl}>Listed by</h2>
      <div className={s.apc}>
        {agent ? (
          <div className={s.apcPhoto} style={agent.avatar_url ? { backgroundImage: `url("${agent.avatar_url}")` } : undefined}>
            {!agent.avatar_url && agent.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </div>
        ) : (
          <AgencyLogo name={name} logoUrl={agency?.logo_url ?? null} className={s.apcAgencyBlock} />
        )}
        <div className={s.apcBody}>
          {agent && (
            <>
              <div className={s.apcName}>{agent.full_name}{verified && <span className={s.tick}>✓</span>}</div>
              <div className={s.dim}>{agentBits.length ? agentBits.join(" · ") : "Your agent for this listing"}</div>
            </>
          )}
          <a className={s.agencyLine} href={href ?? undefined}>
            <span className={s.agencyName} style={{ ["--ag" as string]: brandHex(agency?.brand_color) ?? "inherit" }}>{name}</span>
            <span className={s.dim}>{cac}{verified ? " · Verified by Synapse" : ""}</span>
          </a>
          {href && <a className={s.seeAll} href={href}>See the agency and all its listings →</a>}
          {agency?.tagline && <div className={s.dim}>{agency.tagline}</div>}
        </div>
      </div>
    </section>
  );
}
