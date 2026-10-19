import { describe, expect, it } from "vitest";
import { activityLine, bucketTasks, dueWords, filterLeads, sortLeads, stageCounts, toCsv } from "./data/crm";
import { mapLead } from "./data/leads";

const now = Date.parse("2026-10-19T12:00:00Z");
const mk = (id: string, stage: string, extra: Record<string, unknown> = {}) => mapLead({ id, consumer_name: id, current_stage: stage, created_at: "2026-10-19T10:00:00Z", properties: { title: "Flat", price: 1000000 }, ...extra }, now);

describe("crm rules", () => {
  const leads = [mk("b", "new", { lead_score: 40 }), mk("a", "closed", { lead_score: 90 }), mk("c", "negotiating")];
  it("counts folded stages", () => { expect(stageCounts(leads)).toMatchObject({ New: 1, Won: 1, Negotiation: 1, Contacted: 0 }); });
  it("filters by stage and channel", () => {
    expect(filterLeads(leads, { stage: "Won", channel: null })).toHaveLength(1);
    expect(filterLeads(leads, { stage: null, channel: "instagram" })).toHaveLength(0);
  });
  it("sorts by score with unscored last, and by name ascending", () => {
    expect(sortLeads(leads, "score", -1, now).map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(sortLeads(leads, "lead", 1, now).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });
  it("words due dates", () => {
    expect(dueWords("2026-10-19T14:00:00Z", now)).toEqual({ text: "Due in 2 hours", late: false });
    expect(dueWords("2026-10-19T11:00:00Z", now).late).toBe(true);
    expect(dueWords(null, now).text).toBe("No date set");
  });
  it("buckets tasks overdue, today, later", () => {
    const b = bucketTasks([{ id: "1", title: "x", due_at: "2026-10-18T00:00:00Z" }, { id: "2", title: "y", due_at: "2026-10-19T18:00:00Z" }, { id: "3", title: "z", due_at: "2026-10-25T00:00:00Z" }], now);
    expect([b.late.length, b.today.length, b.later.length]).toEqual([1, 1, 1]);
  });
  it("writes the trail in plain words", () => {
    expect(activityLine({ id: "1", activity_type: "lead_stage_changed", payload: { from: "new", to: "contacted", seconds_in_previous: 172800 }, created_at: "" }).text).toBe("Moved new → contacted, after 2 days");
  });
  it("escapes csv cells", () => { expect(toCsv([mk('x, "y"', "new")])).toContain('"x, ""y"""'); });
});
