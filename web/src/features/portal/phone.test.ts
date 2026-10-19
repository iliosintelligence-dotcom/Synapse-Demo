import { describe, expect, it } from "vitest";
import { isMissing } from "./data/phone";

describe("phone banner rule", () => {
  it("shows only when a successful read came back empty", () => {
    expect(isMissing("")).toBe(true);
    expect(isMissing("   ")).toBe(true);
    expect(isMissing("+2348031234567")).toBe(false);
  });
  it("an unknown is not a missing number", () => { expect(isMissing(null)).toBe(false); });
});
