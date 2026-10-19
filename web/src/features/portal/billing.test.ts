import { describe, expect, it } from "vitest";
import { naira, paymentChip, quote, usageRow, type BillingInfo } from "./data/billing";

const info = (free: number) => ({ annual_months_free: free, prices: { plans: { accelerator: { monthly_kobo: 2500000 }, market_leader: { monthly_kobo: 7500000 } }, addons: {} } }) as unknown as BillingInfo;

describe("billing rules", () => {
  it("monthly is one month, annual knocks off the free months", () => {
    expect(quote(info(2), "accelerator", "monthly")).toEqual({ amount: 2500000, perMonth: 2500000, unit: "month" });
    expect(quote(info(2), "accelerator", "annual").amount).toBe(25000000);
    expect(quote(info(0), "accelerator", "annual").amount).toBe(30000000);
  });
  it("formats kobo as naira", () => { expect(naira(2500000)).toBe("₦25,000"); });
  it("a pending payment older than an hour is not completed", () => {
    const now = Date.parse("2026-10-19T12:00:00Z");
    expect(paymentChip("pending", "2026-10-19T11:30:00Z", now).label).toBe("Waiting for Paystack");
    expect(paymentChip("pending", "2026-10-19T09:00:00Z", now).label).toBe("Not completed");
    expect(paymentChip("success", "2026-10-19T09:00:00Z", now).tone).toBe("paid");
  });
  it("an unlimited ceiling is never 'of 0'", () => {
    expect(usageRow(3, null)).toEqual({ label: "of unlimited", pct: null, full: false });
    expect(usageRow(20, 20).full).toBe(true);
    expect(usageRow(5, 20).pct).toBe(25);
  });
});
