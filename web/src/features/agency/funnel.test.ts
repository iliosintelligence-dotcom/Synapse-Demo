import { describe, expect, it } from "vitest";
import { checkBackAt, due, foldMoves, report, waiting } from "./funnel";

const NOW = new Date("2026-10-25T12:00:00Z").getTime();
const ago = (mins: number) => new Date(NOW - mins * 60000).toISOString();
const lead = (id: string, dbStage: string, stage: string, createdMinsAgo: number, channel = "direct", extra = {}) =>
  ({ id, dbStage, stage, createdAt: ago(createdMinsAgo), attr: { channel }, ...extra });

describe("waiting", () => {
  it("counts a New lead's wait and flags it past five minutes", () => {
    expect(waiting(lead("a", "new", "New", 3), NOW)).toMatchObject({ text: "Waiting 3 min", urgent: false });
    expect(waiting(lead("a", "new", "New", 7), NOW)).toMatchObject({ urgent: true });
    expect(waiting(lead("a", "new", "New", 3 * 1440), NOW)!.text).toBe("Waiting 3 days");
  });
  it("stops once the lead has moved on", () => {
    expect(waiting(lead("a", "contacted", "Contacted", 30), NOW)).toBeNull();
  });
});

describe("due", () => {
  it("names the day in the fewest words", () => {
    expect(due(null, NOW)).toBeNull();
    expect(due(new Date(NOW - 2 * 864e5).toISOString(), NOW)).toMatchObject({ text: "Overdue 2 days", late: true });
    expect(due(new Date(NOW + 864e5).toISOString(), NOW)!.text).toBe("Tomorrow");
    expect(due(new Date(NOW + 5 * 864e5).toISOString(), NOW)!.text).toBe("In 5 days");
  });
});

describe("foldMoves", () => {
  it("folds the double-written Lost move into one, keeping its reason", () => {
    const f = foldMoves([
      { lead_id: "x", from_stage: "contacted", to_stage: "lost", moved_at: ago(10), reason: "Price" },
      { lead_id: "x", from_stage: "lost", to_stage: "lost", moved_at: ago(10), reason: null },
    ]);
    expect(f).toHaveLength(1);
    expect(f[0].reason).toBe("Price");
  });
});

describe("report", () => {
  const leads = [
    lead("a", "new", "New", 2),
    lead("b", "contacted", "Contacted", 600, "instagram"),
    lead("c", "closed", "Won", 9000, "instagram"),
  ];
  const lost = [{ id: "d", created_at: ago(5000), channel: "facebook" }];
  const moves = [
    { lead_id: "b", from_stage: "new", to_stage: "contacted", moved_at: ago(596) },            // replied in 4 minutes
    { lead_id: "c", from_stage: "new", to_stage: "contacted", moved_at: ago(8990) },           // 10 minutes
    { lead_id: "c", from_stage: "contacted", to_stage: "viewing_scheduled", moved_at: ago(7000) },
    { lead_id: "c", from_stage: "viewing_scheduled", to_stage: "negotiating", moved_at: ago(5000) },
    { lead_id: "c", from_stage: "negotiating", to_stage: "closed", moved_at: ago(4000) },
    { lead_id: "d", from_stage: "new", to_stage: "contacted", moved_at: ago(4990) },
    { lead_id: "d", from_stage: "contacted", to_stage: "lost", moved_at: ago(3000), reason: "Timing" },
    { lead_id: "d", from_stage: "lost", to_stage: "lost", moved_at: ago(3000), reason: null },
  ];
  const r = report(leads, lost, moves, NOW);

  it("counts how many leads get from each stage to the next", () => {
    expect(r.leads).toBe(4);
    expect(r.steps[0]).toMatchObject({ from: "New", to: "Contacted", reached: 4, moved: 3, pct: 75 });
    expect(r.steps[1]).toMatchObject({ reached: 3, moved: 1, pct: 33 });
    expect(r.steps[3]).toMatchObject({ from: "Negotiation", to: "Won", reached: 1, moved: 1, pct: 100 });
  });
  it("measures the first reply and who is waiting now", () => {
    expect(r.reply.n).toBe(3);
    expect(r.reply.within).toBe(1);
    expect(r.reply.mins).toBe(10);
    expect(r.reply.waitingNow).toBe(1);
    expect(r.reply.urgentNow).toBe(0);
  });
  it("finds wins by channel and the reasons deals were lost", () => {
    expect(r.channels[0]).toMatchObject({ channel: "instagram", leads: 2, won: 1 });
    expect(r.channels.find((c) => c.channel === "facebook")).toMatchObject({ lost: 1 });
    expect(r.lost).toEqual([{ reason: "Timing", n: 1 }]);
  });
  it("times each stage between recorded moves", () => {
    expect(r.daysIn.find((d) => d.stage === "Viewing")!.mins).toBe(2000);
  });
});

describe("checkBackAt", () => {
  it("is thirty days on, at nine in the morning", () => {
    const now = new Date(2026, 9, 25, 15, 30).getTime();
    const d = new Date(checkBackAt(now));
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 24, 9, 0]);
  });
});
