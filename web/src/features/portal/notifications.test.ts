import { describe, expect, it } from "vitest";
import { buildNotices, markHandled, noticeKey, unhandled } from "./data/notifications";
import { mapLead } from "./data/leads";
import { mapListing } from "./data/listings";

const now = Date.parse("2026-10-19T12:00:00Z");
const listing = (o: Record<string, unknown> = {}) => mapListing({ id: "p", title: "Flat", price: 1, is_active: true, verification_status: "verified", expires_at: "2026-12-01T00:00:00Z", ...o });
const lead = (stage: string) => mapLead({ id: "l", consumer_name: "A", current_stage: stage, created_at: "2026-10-19T10:00:00Z" }, now);

describe("notification rules", () => {
  it("says nothing when there is nothing to say", () => {
    expect(buildNotices({ listings: [listing()], leads: [lead("contacted")], drafts: 0 }, now)).toEqual([]);
  });
  it("counts and names what needs attention", () => {
    const n = buildNotices({ listings: [listing({ verification_status: "unverified", title: "Only one" }), listing({ expires_at: "2026-10-21T00:00:00Z" }), listing({ expires_at: "2026-10-01T00:00:00Z" })], leads: [lead("new"), lead("new")], drafts: 3 }, now);
    const titles = n.map((x) => x.title);
    expect(titles).toContain("1 listing awaiting verification");
    expect(titles).toContain("1 listing expiring soon");
    expect(titles).toContain("1 listing expired");
    expect(titles).toContain("2 new leads");
    expect(titles).toContain("3 posts awaiting approval");
    expect(n.find((x) => x.type === "verification")!.sub).toBe("Only one");
  });
  it("welcomes a new account with no listings, but not an old one", () => {
    expect(buildNotices({ listings: [], leads: [], drafts: 0, accountCreatedAt: "2026-10-10T00:00:00Z" }, now)[0].title).toBe("Add your first listing");
    expect(buildNotices({ listings: [], leads: [], drafts: 0, accountCreatedAt: "2026-01-01T00:00:00Z" }, now)).toEqual([]);
  });
  it("a handled notice returns only when the count changes", () => {
    const two = buildNotices({ listings: [], leads: [lead("new"), lead("new")], drafts: 0 }, now);
    const handled = markHandled(two.map(noticeKey), {}, now);
    expect(unhandled(two, handled)).toEqual([]);
    const three = buildNotices({ listings: [], leads: [lead("new"), lead("new"), lead("new")], drafts: 0 }, now);
    expect(unhandled(three, handled)).toHaveLength(1);
  });
  it("keeps only the newest two hundred handled", () => {
    const many = Array.from({ length: 230 }, (_, i) => `k${i}`);
    expect(Object.keys(markHandled(many, {}, now)).length).toBe(200);
  });
});
