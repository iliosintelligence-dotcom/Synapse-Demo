import { describe, expect, it } from "vitest";
import { agoLabel, buildHandoffs, mapLead, nairaShort, temperature } from "./data/leads";

const now = Date.parse("2026-10-19T12:00:00Z");
const row = (o: Record<string, unknown> = {}) => ({ id: "l1", consumer_name: "Ada", current_stage: "negotiating", created_at: "2026-10-19T10:00:00Z", source: "toju_chat", properties: { title: "Flat", city: "Ibadan", price: 1450000 }, ...o });

describe("lead rules", () => {
  it("nairaShort keeps the decimal where it matters", () => {
    expect(nairaShort(800000)).toBe("₦800k");
    expect(nairaShort(1500000)).toBe("₦1.5M");
    expect(nairaShort(1320000)).toBe("₦1.3M");
    expect(nairaShort(null)).toBe("-");
  });
  it("age labels", () => { expect(agoLabel("2026-10-19T11:30:00Z", now)).toBe("30m"); expect(agoLabel("2026-10-17T12:00:00Z", now)).toBe("2d"); });
  it("temperature comes from recency", () => {
    expect(temperature("New", "2026-10-19T00:00:00Z", now)).toBe("hot");
    expect(temperature("New", "2026-10-15T00:00:00Z", now)).toBe("warm");
    expect(temperature("Won", null, now)).toBe("won");
  });
  it("only a lead with a Tayo offer becomes a handoff", () => {
    const leads = [mapLead(row({ preferences: { negotiation: { offer: 1320000, advice: "Call today" } } }), now), mapLead(row({ id: "l2" }), now)];
    const h = buildHandoffs(leads);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ buyer: "Ada", source: "Tayo", rating: "High intent", agreed: "₦1.3M" });
  });
  it("falls back to source when there is no attribution", () => {
    const l = mapLead(row({ source: "social_instagram" }), now);
    expect(l.unattributed).toBe(true);
    expect(l.channel).toBe("instagram");
  });
});
