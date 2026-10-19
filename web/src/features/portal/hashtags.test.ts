import { describe, expect, it } from "vitest";
import { tagsIn, withTags } from "./data/hashtags";

describe("hashtag sets", () => {
  it("reads tags without the #, including accented ones", () => { expect(tagsIn("Lovely #Bodija flat #LagosRealEstate and #café")).toEqual(["Bodija", "LagosRealEstate", "café"]); expect(tagsIn("")).toEqual([]); });
  it("adds a set after a blank line", () => { expect(withTags("A flat in Bodija.\n", ["Ibadan", "Homes"])).toBe("A flat in Bodija.\n\n#Ibadan #Homes"); });
  it("skips tags already there, whatever the case, so #lekki is never doubled", () => {
    expect(withTags("Flat #Lekki", ["lekki", "Homes"])).toBe("Flat #Lekki\n\n#Homes");
  });
  it("says there is nothing new when every tag is already in", () => { expect(withTags("Flat #a #b", ["A", "b"])).toBeNull(); });
});
