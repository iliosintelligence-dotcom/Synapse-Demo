import { describe, expect, it } from "vitest";
import { countOpen, statusOf, validEmail } from "./data/agents";

describe("agents rules", () => {
  it("counts open leads per agent, skipping closed and unassigned", () => {
    expect(countOpen([
      { assigned_agent_id: "a", current_stage: "new" },
      { assigned_agent_id: "a", current_stage: "closed" },
      { assigned_agent_id: null, current_stage: "new" },
      { assigned_agent_id: "b", current_stage: "viewing_scheduled" },
    ])).toEqual({ a: 1, b: 1 });
  });
  it("marks capacity at ten", () => { expect(statusOf(9)).toBe("free"); expect(statusOf(10)).toBe("full"); });
  it("validates emails", () => { expect(validEmail("a@b.co")).toBe(true); expect(validEmail("a@b")).toBe(false); });
});
