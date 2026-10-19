import { describe, expect, it } from "vitest";
import { filterListings, freshness, locationOf, mapListing, needsRenewal, priceLabel } from "./data/listings";

const now = Date.parse("2026-10-19T12:00:00Z");
const row = (o: Record<string, unknown> = {}) => mapListing({ id: "p", title: "Ring Road Bungalow", price: 450000, price_period: "yearly", is_active: true, verification_status: "verified", expires_at: "2026-10-30T00:00:00Z", property_media: [{ url: "b.jpg", display_order: 2 }, { url: "a.jpg", display_order: 1 }], ...o });

describe("listing rules", () => {
  it("maps state, cover and passed checks", () => {
    const l = row({ verification_nodes: [{ status: "passed" }, { status: "failed" }, { status: "passed" }] });
    expect(l.state_).toBe("verified");
    expect(l.cover).toBe("a.jpg");
    expect(l.passedChecks).toBe(2);
    expect(row({ is_active: false }).state_).toBe("inactive");
  });
  it("freshness follows expires_at", () => {
    expect(freshness({ expiresAt: "2026-10-21T00:00:00Z", listedAt: null }, now)).toMatchObject({ warn: true, left: 2 });
    expect(freshness({ expiresAt: "2026-10-18T00:00:00Z", listedAt: null }, now).expired).toBe(true);
    expect(freshness({ expiresAt: "2026-11-30T00:00:00Z", listedAt: null }, now).cls).toBe("ok");
  });
  it("renewal list is the expiring or expired ones", () => {
    const rows = [row({ id: "a", expires_at: "2026-10-20T00:00:00Z" }), row({ id: "b", expires_at: "2026-12-01T00:00:00Z" }), row({ id: "c", expires_at: "2026-10-01T00:00:00Z" })];
    expect(needsRenewal(rows, now).map((l) => l.id)).toEqual(["a", "c"]);
  });
  it("de-duplicates the city typed into the address", () => {
    expect(locationOf({ address: "Ikolaba GRA, Ibadan", city: "Ibadan", state: "Oyo" })).toBe("Ikolaba GRA, Ibadan, Oyo");
  });
  it("filters and labels prices", () => {
    const rows = [row({ id: "a" }), row({ id: "b", verification_status: "unverified" })];
    expect(filterListings(rows, "pending", "", now).map((l) => l.id)).toEqual(["b"]);
    expect(filterListings(rows, "all", "bungalow", now)).toHaveLength(2);
    expect(priceLabel(rows[0])).toBe("₦450k/yr");
  });
});
