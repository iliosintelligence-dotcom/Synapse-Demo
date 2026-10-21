import { describe, expect, it } from "vitest";
import { IDLE_MS, idleAction, idleExpired } from "./idle";

const now = Date.parse("2026-10-21T12:00:00Z");
const H = 3600e3;

describe("signing out after a couple of hours away", () => {
  it("two hours is the limit, to the second", () => {
    expect(IDLE_MS).toBe(2 * H);
    expect(idleExpired(now - (2 * H + 1000), now)).toBe(true);
    expect(idleExpired(now - (2 * H - 60000), now)).toBe(false);
  });
  it("leaves when stale, stamps when there is no stamp yet, and otherwise carries on", () => {
    expect(idleAction(now - 3 * H, now)).toBe("leave");
    expect(idleAction(0, now)).toBe("stamp");
    expect(idleAction(now - 1 * H, now)).toBe("ok");
  });
  it("a missing stamp is never 'expired', so a rollout cannot sign everyone out", () => {
    expect(idleExpired(0, now)).toBe(false);
  });
});
