import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { initials, listingAgentFor } from "./listingAgent";
import { IntroTicket } from "@/features/chat/Conversation";

const answer = (byPath: Record<string, unknown[]>) =>
  vi.fn(async (url: string) => ({ json: async () => byPath[Object.keys(byPath).find((k) => url.includes(k)) ?? ""] ?? [] }));

afterEach(() => vi.unstubAllGlobals());

describe("listingAgentFor", () => {
  it("names the listing's agent, the person the lead was routed to", async () => {
    const f = answer({ "properties?": [{ listed_by_agent_id: "a1" }], "listing_agent_cards?": [{ full_name: "Olanrewaju Kolawole", avatar_url: "https://x/a.jpg" }] });
    vi.stubGlobal("fetch", f);
    expect(await listingAgentFor("p1")).toEqual({ name: "Olanrewaju Kolawole", first: "Olanrewaju", avatar: "https://x/a.jpg" });
    expect(f.mock.calls[1][0]).toContain("agent_id=eq.a1");
  });
  it("is null for a listing with no agent, so the buyer is told the agency has it", async () => {
    const f = answer({ "properties?": [{ listed_by_agent_id: null }] });
    vi.stubGlobal("fetch", f);
    expect(await listingAgentFor("p1")).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("is null when the lookup fails, never an error after a lead is saved", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await listingAgentFor("p1")).toBeNull();
  });
  it("makes initials from the first two names", () => expect(initials("Ada Grace Obi")).toBe("AG"));
});

describe("IntroTicket", () => {
  const listing = { id: "p1", title: "3-bed in Bodija", price: 50000000, city: "Ibadan" } as never;
  it("says who has the message", () => {
    const html = renderToStaticMarkup(createElement(IntroTicket, { listing, lead: { lead_id: "abc-123", delivery_status: "delivery_failed" }, agent: { name: "Olanrewaju Kolawole", first: "Olanrewaju", avatar: null } }));
    expect(html).toContain("Olanrewaju has your message.");
    expect(html).toContain("Olanrewaju Kolawole");
    expect(html).toContain(">OK<");
  });
  it("falls back to the agency", () => {
    const html = renderToStaticMarkup(createElement(IntroTicket, { listing, lead: { lead_id: "abc", delivery_status: "delivered" }, agent: null }));
    expect(html).toContain("The agency has your message.");
    expect(html).toContain("They were sent what we talked about.");
  });
});
