import { describe, expect, it } from "vitest";
import { LINK_RESERVE, PLATFORMS, buildVariants, factsOf, signOff, validate } from "./data/campaign";

const facts = factsOf({ id: "p", title: "Flat", property_type: "apartment", area_name: "Bodija (north)", city: "Ibadan", bedrooms: 3, price: 45000000, listing_type: "sale" });

describe("campaign rules", () => {
  it("reads the area the agent typed, without a bracketed note", () => { expect(facts.area).toBe("Bodija"); expect(facts.priceShort).toBe("₦45M"); });
  it("signs off as the agency, and says nothing when no name is set", () => {
    expect(signOff({ name: "Prestige", tagline: "Homes" })).toBe("\n\n- Prestige · Homes");
    expect(signOff({ name: "" })).toBe("");
  });
  it("holds room for the tracked link", () => {
    const max = PLATFORMS.x.captionMax - LINK_RESERVE;
    expect(validate({ platform: "x", caption: "a".repeat(max), hashtags: [], title: null })).toEqual([]);
    expect(validate({ platform: "x", caption: "a".repeat(max + 1), hashtags: [], title: null })[0]).toMatch(/held for the tracked link/);
  });
  it("whatsapp takes no hashtags and youtube needs a title", () => {
    expect(validate({ platform: "whatsapp", caption: "hi", hashtags: ["#a"], title: null }).length).toBeGreaterThan(0);
    expect(validate({ platform: "youtube", caption: "hi", hashtags: [], title: null })[0]).toMatch(/needs a title/);
  });
  it("appends hashtags under each platform's own cap and skips unknown platforms", () => {
    const tags = ["#a", "#b", "#c", "#d"];
    const vs = buildVariants({ captions: { x: "Short one", whatsapp: "Status", mystery: "??", instagram: "" }, angles: { x: "value" }, hashtags: tags }, facts, { name: "Prestige" });
    expect(vs.map((v) => v.platform).sort()).toEqual(["whatsapp", "x"]);
    const x = vs.find((v) => v.platform === "x")!, wa = vs.find((v) => v.platform === "whatsapp")!;
    expect(x.hashtags).toEqual(["#a", "#b"]);
    expect(wa.hashtags).toEqual([]);
    expect(x.angleName).toBe("The money");
    expect(x.caption).toContain("- Prestige");
  });
  it("builds a youtube title from the listing's own facts", () => {
    const [v] = buildVariants({ captions: { youtube: "A body of text" } }, facts, null);
    expect(v.title).toBe("3-Bed apartment in Bodija · ₦45M");
    expect(v.issues).toEqual([]);
  });
});
