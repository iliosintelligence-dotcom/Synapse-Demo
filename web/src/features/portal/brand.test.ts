import { describe, expect, it } from "vitest";
import { buildPatch, emptyForm, formFrom, isBrandEmpty, isFirstRun, swatchName, checkLogo } from "./data/brand";

describe("buildPatch: only what the agency actually decided is written", () => {
  it("skips a colour that was never chosen: the page's own default swatch is not their brand", () => {
    const p = buildPatch({ ...emptyForm(), name: "Laurel" });
    expect(p).not.toHaveProperty("brand_color");
    expect(p).not.toHaveProperty("brand_color_secondary");
  });
  it("writes a colour once it was chosen, or came from the record", () => {
    expect(buildPatch({ ...emptyForm(), color: "#1F4E5F", colorChosen: true }).brand_color).toBe("#1F4E5F");
    const f = formFrom({ brand_color: "#2E7D4F" });
    expect(f.colorChosen).toBe(true);
    expect(buildPatch(f).brand_color).toBe("#2E7D4F");
  });
  it("social is an OBJECT, never null: a null once stopped an agency with no handles from saving its name at all", () => {
    expect(buildPatch(emptyForm()).social).toEqual({});
    expect(buildPatch({ ...emptyForm(), instagram: "@laurel" }).social).toEqual({ instagram: "@laurel", website: null });
  });
  it("trims, and splits specialties on commas, bars, semicolons and newlines", () => {
    const p = buildPatch({ ...emptyForm(), name: "  Laurel  ", specialties: ["Sales", " Lettings ", ""] });
    expect(p.name).toBe("Laurel");
    expect(p.specialties).toEqual(["Sales", "Lettings"]);
    expect(formFrom({ specialties: "Sales, Lettings|Land sales;Valuation" }).specialties).toEqual(["Sales", "Lettings", "Land sales", "Valuation"]);
  });
});

describe("the checklist is derived from what is saved, not from a flag saying they visited", () => {
  it("is first-run until a name, a logo or colour, and a voice are all there", () => {
    expect(isFirstRun({})).toBe(true);
    expect(isFirstRun({ name: "A", logo_url: "x", brand_voice: "warm" })).toBe(false);
    expect(isFirstRun({ name: "A", brand_color: "#121212", brand_voice: "warm" })).toBe(false);
    expect(isFirstRun({ name: "A", brand_color: "#121212" })).toBe(true);
  });
  it("an untouched form is empty, and a chosen colour alone makes it not empty", () => {
    expect(isBrandEmpty(emptyForm())).toBe(true);
    expect(isBrandEmpty({ ...emptyForm(), colorChosen: true })).toBe(false);
    expect(isBrandEmpty({ ...emptyForm(), name: "x" })).toBe(false);
  });
});

describe("logos and colour names", () => {
  const file = (type: string, size: number) => ({ type, size }) as File;
  it("accepts the four image types under 2MB and refuses the rest before uploading", () => {
    expect(checkLogo(file("image/png", 1000))).toBeNull();
    expect(checkLogo(file("image/svg+xml", 1000))).toBeNull();
    expect(checkLogo(file("application/pdf", 1000))).toMatch(/PNG, JPG, WEBP or SVG/);
    expect(checkLogo(file("image/png", 3 * 1024 * 1024))).toMatch(/under 2MB/);
    expect(checkLogo(undefined)).toBe("No file selected");
  });
  it("names a colour in words and keeps the exact hex", () => {
    expect(swatchName("#1F4E5F")).toBe("Deep teal #1F4E5F");
    expect(swatchName("#121212")).toBe("Near black #121212");
  });
});
