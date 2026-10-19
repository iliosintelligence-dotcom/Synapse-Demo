import { describe, expect, it } from "vitest";
import { dueSoon, filterTours, type Tour } from "./data/tours";

describe("tours rules", () => {
  const now = Date.parse("2026-10-19T10:00:00Z");
  it("reconfirmation is due inside 48 hours, only for the future", () => {
    expect(dueSoon("2026-10-20T10:00:00Z", now)).toBe(true);
    expect(dueSoon("2026-10-25T10:00:00Z", now)).toBe(false);
    expect(dueSoon("2026-10-18T10:00:00Z", now)).toBe(false);
  });
  it("filters by status", () => {
    const t = (status: string) => ({ status }) as Tour;
    expect(filterTours([t("open"), t("cancelled")], "cancelled")).toHaveLength(1);
    expect(filterTours([t("open"), t("cancelled")], "all")).toHaveLength(2);
  });
});
