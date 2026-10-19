import { describe, expect, it } from "vitest";
import { digestFindings, sortRows, type ListingRef, type PostRow } from "./data/marketing";

const post = (o: Partial<PostRow>): PostRow => ({ id: "x", propertyId: "p", platform: "instagram", when: "2026-10-18T00:00:00Z", angle: null, clicks: 0, visits: 0, leads: 0, ...o });
const now = Date.parse("2026-10-19T00:00:00Z");

describe("marketing rules", () => {
  it("sorts by enquiries and breaks the tie on taps", () => {
    const rows = [post({ id: "a", leads: 1, clicks: 2 }), post({ id: "b", leads: 1, clicks: 40 }), post({ id: "c", leads: 0, clicks: 99 })];
    expect(sortRows(rows, "leads").map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(sortRows(rows, "clicks").map((r) => r.id)).toEqual(["c", "b", "a"]);
  });
  it("says nothing below the floor", () => {
    expect(digestFindings([post({ angle: "space", leads: 3 })], [], now)).toEqual([]);
  });
  it("names the angle that sells, per post", () => {
    const rows = [post({ angle: "space", leads: 4 }), post({ angle: "space", leads: 2 }), post({ angle: "value", leads: 0 }), post({ angle: "value", leads: 1 })];
    expect(digestFindings(rows, [], now)[0].text).toContain("the rooms and the space");
  });
  it("flags only active listings not posted in two weeks", () => {
    const listings: ListingRef[] = [{ id: "old", title: "Old flat", active: true }, { id: "arch", title: "Archived", active: false }, { id: "fresh", title: "Fresh", active: true }];
    const rows = [post({ propertyId: "fresh", when: "2026-10-17T00:00:00Z" })];
    const f = digestFindings(rows, listings, now);
    expect(f).toHaveLength(1);
    expect(f[0].listingId).toBe("old");
  });
});
