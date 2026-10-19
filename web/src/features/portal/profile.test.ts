import { describe, expect, it } from "vitest";
import { checkAvatar, formOf, initialsOf, isComplete, listOf, yearsOf, type MyProfile } from "./data/profile";

describe("profile rules", () => {
  it("turns comma text into a clean list", () => { expect(listOf(" Bodija, , Jericho ,Akobo ")).toEqual(["Bodija", "Jericho", "Akobo"]); expect(listOf("")).toEqual([]); });
  it("years are 0 to 70 or not stated", () => {
    expect([yearsOf("5"), yearsOf("0"), yearsOf("70")]).toEqual([5, 0, 70]);
    expect([yearsOf("71"), yearsOf("-1"), yearsOf(""), yearsOf("abc")]).toEqual([null, null, null, null]);
  });
  it("initials", () => { expect(initialsOf("Adaeze Mohammed Okoro")).toBe("AM"); expect(initialsOf("")).toBe("?"); });
  it("photo must be an image under 3MB", () => {
    expect(checkAvatar({ type: "application/pdf", size: 1 })).toMatch(/not an image/);
    expect(checkAvatar({ type: "image/png", size: 4 * 1048576 })).toMatch(/under 3MB/);
    expect(checkAvatar({ type: "image/jpeg", size: 1000 })).toBeNull();
  });
  it("complete means a name, a face and a bio", () => {
    expect(isComplete({ name: "A", avatar: "x", bio: "y" })).toBe(true);
    expect(isComplete({ name: "A", avatar: "", bio: "y" })).toBe(false);
  });
  it("the form shows lists as comma text", () => {
    const m = { name: "A", phone: "", whatsapp: "", avatar: "", bio: "", years: "3", languages: ["English", "Yoruba"], specializations: [], areas: ["Bodija"], certifications: [] } as unknown as MyProfile;
    expect(formOf(m)).toMatchObject({ languages: "English, Yoruba", areas: "Bodija", years: "3" });
  });
});
