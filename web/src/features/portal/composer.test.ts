import { describe, expect, it } from "vitest";
import { capWarnings } from "./data/composer";

const l = { price: 4500000, neighbourhood: "Bodija", city: "Ibadan" };

describe("caption warnings", () => {
  it("a good caption has none", () => { expect(capWarnings("instagram", "3 bed flat in Bodija, ₦4,500,000 a year. Book a viewing.", l)).toEqual([]); });
  it("says nothing about an empty caption", () => { expect(capWarnings("instagram", "   ", l)).toEqual([]); });
  it("flags a missing price only when the listing has one", () => {
    expect(capWarnings("facebook", "Lovely flat in Bodija", l).join(" ")).toMatch(/No price/);
    expect(capWarnings("facebook", "Lovely flat in Bodija", { ...l, price: null })).toEqual([]);
  });
  it("flags a missing area, falling back to the city", () => {
    expect(capWarnings("facebook", "Flat for 4500000", l).join(" ")).toMatch(/Does not name Bodija/);
    expect(capWarnings("facebook", "Flat in Ibadan for 4500000", { price: 1, neighbourhood: null, city: "Ibadan" })).toEqual([]);
  });
  it("flags a caption far past where the feed folds it", () => {
    const long = `Bodija 4500000 ${"x".repeat(125 * 3)}`;
    expect(capWarnings("instagram", long, l).join(" ")).toMatch(/hides everything after about 125/);
  });
  it("over thirty hashtags on Instagram is a real failure", () => {
    const tags = Array.from({ length: 31 }, (_, i) => `#t${i}`).join(" ");
    expect(capWarnings("instagram", `Bodija 4500000 ${tags}`, l).join(" ")).toMatch(/31 hashtags/);
    expect(capWarnings("facebook", `Bodija 4500000 ${tags}`, l).join(" ")).not.toMatch(/hashtags/);
  });
  it("all capitals reads as an advert", () => { expect(capWarnings("tiktok", "BODIJA 4500000 BOOK A VIEWING TODAY NOW", l).join(" ")).toMatch(/All capitals/); });
});
