/**
 * Who may see which pane. This is the second lock, never the only one: it is checked in the browser, after a round trip, and the database
 * policies are what actually stop an agent writing the brand or reading the books. It exists so the interface does not offer what the
 * database would refuse.
 */
export type PaneId =
  | "overview" | "crm" | "negotiator" | "listings" | "social" | "marketing" | "agents" | "tours" | "brand" | "verification" | "subscription" | "billing";

export type AgencyRole = "agency_owner" | "agency_admin" | "agent";

export const ROLE_PANES: Record<AgencyRole, PaneId[] | null> = {
  agency_owner: null, // null = every pane
  agency_admin: ["overview", "crm", "negotiator", "listings", "social", "marketing", "agents", "tours", "brand", "verification"],
  agent: ["overview", "crm", "negotiator", "listings", "social", "tours"],
};

/**
 * The panes a role may open. A null or unknown role (the lookup failed, or this account is not a member) is treated as an AGENT, the
 * least privileged: neither is a reason to open the company's books.
 */
export function panesFor(role: string | null | undefined, all: readonly PaneId[]): PaneId[] {
  const allowed = role && Object.prototype.hasOwnProperty.call(ROLE_PANES, role) ? ROLE_PANES[role as AgencyRole] : ROLE_PANES.agent;
  return allowed === null ? [...all] : all.filter((p) => allowed.includes(p));
}

/** Old names some notifications still use. An unknown name is ignored (null), never a blank screen. */
const ALIASES: Record<string, PaneId> = { leads: "crm", lead: "crm", posts: "social", post: "social" };
export function resolvePane(name: string, all: readonly PaneId[]): PaneId | null {
  const n = (ALIASES[name] ?? name) as PaneId;
  return all.includes(n) ? n : null;
}
