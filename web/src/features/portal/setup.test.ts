import { describe, expect, it } from "vitest";
import { buildSteps, doneCount, nextStep, type Progress } from "./data/setup";

const base: Progress = { role: "agency_owner", logo: false, cac: false, listings: 0, channels: 0, posts: 0, team: 1, leads: 0, referrals: 0 };

describe("setup steps", () => {
  it("an owner sees all eight, in order, and the first undone is next", () => {
    const s = buildSteps(base);
    expect(s.map((x) => x.id)).toEqual(["logo", "cac", "listing", "channel", "post", "team", "lead", "refer"]);
    expect(nextStep(s)!.id).toBe("logo");
  });
  it("an agent is not asked to do what only a boss can", () => {
    const ids = buildSteps({ ...base, role: "agent" }).map((x) => x.id);
    expect(ids).toEqual(["listing", "post", "lead"]);
  });
  it("progress moves the next step along", () => {
    const s = buildSteps({ ...base, logo: true, cac: true, listings: 2 });
    expect(doneCount(s)).toBe(3);
    expect(nextStep(s)!.id).toBe("channel");
  });
  it("a team of one has not invited anyone", () => {
    expect(buildSteps({ ...base, team: 1 }).find((x) => x.id === "team")!.done).toBe(false);
    expect(buildSteps({ ...base, team: 2 }).find((x) => x.id === "team")!.done).toBe(true);
  });
  it("the lead step follows whether there is a lead, and is done only once one was worked", () => {
    const none = buildSteps(base).find((x) => x.id === "lead")!;
    expect(none.cta).toBe("Share a listing");
    expect(none.pane).toBe("listings");
    const some = buildSteps({ ...base, leads: 3 }).find((x) => x.id === "lead")!;
    expect([some.cta, some.pane, some.done]).toEqual(["Open your leads", "crm", false]);
    expect(buildSteps({ ...base, leads: 3, repliedLead: true }).find((x) => x.id === "lead")!.done).toBe(true);
  });
  it("everything done leaves no next step", () => {
    const all = buildSteps({ role: "agency_owner", logo: true, cac: true, listings: 1, channels: 1, posts: 1, team: 2, leads: 1, referrals: 1, repliedLead: true });
    expect(nextStep(all)).toBeUndefined();
  });
});
