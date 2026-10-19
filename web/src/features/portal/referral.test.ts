import { describe, expect, it } from "vitest";
import { monthsWord, pendingCode, referralLink, toGo } from "./data/referral";

const now = Date.parse("2026-10-19T00:00:00Z");
describe("referral rules", () => {
  it("builds a safe link", () => { expect(referralLink("AB C&1")).toBe("https://www.synapsecore.dev/?ref=AB%20C%261"); });
  it("words months", () => { expect(monthsWord(1)).toBe("one month"); expect(monthsWord(3)).toBe("3 months"); });
  it("counts the way to the next reward", () => { expect(toGo({ per_reward: 5, into_next: 2 })).toBe(3); expect(toGo({ per_reward: 5, into_next: 7 })).toBe(0); });
  it("a saved code lasts thirty days and unreadable ones are dropped", () => {
    expect(pendingCode(JSON.stringify({ c: "X1", t: now - 5 * 864e5 }), now)).toBe("X1");
    expect(pendingCode(JSON.stringify({ c: "X1", t: now - 31 * 864e5 }), now)).toBeNull();
    expect(pendingCode("not json", now)).toBeNull();
    expect(pendingCode(null, now)).toBeNull();
  });
});
