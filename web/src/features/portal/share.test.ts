import { describe, expect, it } from "vitest";
import { fileNameFor, placeLink, plainLink, SHARE_DEST, shareCaption, sharePhoto, type ShareListing } from "./data/share";

const l: ShareListing = { id: "p1", title: "Flat", listing_type: "rent", property_type: "apartment", bedrooms: 3, bathrooms: 2, toilets: 3, price: 4500000, price_period: "per_year", service_charge: 200000, agency_fee: 450000, legal_fee: null, move_in_cost: 5300000, neighbourhood: "Bodija", city: "Ibadan", furnished: "semi", title_type: null, amenities: ["Borehole", "24/7 power", "Gated estate", "Gym"], photo: null };

describe("share kit", () => {
  it("a Status is short: what, where, how much, the extra costs, three amenities, the link", () => {
    const t = shareCaption(l, "short", "https://s/abc");
    expect(t).toContain("🏡 3-BEDROOM APARTMENT FOR RENT");
    expect(t).toContain("📍 Bodija, Ibadan");
    expect(t).toContain("💰 ₦4,500,000/year");
    expect(t).toContain("Service charge ₦200,000 · Agency fee ₦450,000");
    expect(t).toContain("Borehole · 24/7 power · Gated estate");
    expect(t).not.toContain("Gym");
    expect(t.endsWith("https://s/abc")).toBe(true);
  });
  it("a group post carries the spec sheet and signs off as the agency", () => {
    const t = shareCaption(l, "full", "https://s/abc", "Prestige");
    expect(t).toContain("• 3 bedrooms · 2 bathrooms · 3 toilets");
    expect(t).toContain("• Semi-furnished");
    expect(t).toContain("Total to move in: ₦5,300,000");
    expect(t).toContain("• Gym");
    expect(t.endsWith("— Prestige")).toBe(true);
  });
  it("never uses the street address", () => { expect(shareCaption({ ...l, ...{ address: "12 Secret Road" } } as ShareListing, "full", "x")).not.toContain("Secret"); });
  it("land has no bedrooms in its headline", () => { expect(shareCaption({ ...l, property_type: "land", listing_type: "sale" }, "short", "x")).toContain("🏡 LAND FOR SALE"); });
  it("the Status photo is the first still, preferring the branded copy, never a video", () => {
    expect(sharePhoto([{ url: "a.mp4", display_order: 0 }, { url: "b.jpg", branded_url: "b-branded.jpg", display_order: 1 }, { url: "c.jpg", display_order: 2 }])).toBe("b-branded.jpg");
    expect(sharePhoto([{ url: "a.mp4" }])).toBeNull();
  });
  it("puts the link where the placeholder was, or at the end, and never twice", () => {
    expect(placeLink("See it: …", "https://s/x")).toBe("See it: https://s/x");
    expect(placeLink("My own words", "https://s/x")).toBe("My own words\nhttps://s/x");
    expect(placeLink("Already https://s/x here", "https://s/x")).toBe("Already https://s/x here");
  });
  it("has the four destinations, each credited to its own channel, and a safe plain link", () => {
    expect(SHARE_DEST.map((d) => d.channel)).toEqual(["whatsapp_campaign", "facebook", "telegram", "referral"]);
    expect(plainLink({ id: "a b" }, SHARE_DEST[1])).toBe("https://www.synapsecore.dev/app/property.html?id=a%20b&ch=facebook");
  });
  it("names the saved photo from the title", () => { expect(fileNameFor("3-Bed Flat, Bodija!", "image/jpeg")).toBe("3-bed-flat-bodija.jpg"); expect(fileNameFor("", "image/webp")).toBe("listing.webp"); });
});
