import { describe, expect, it } from "vitest";
import { buildCards, groupByDay, stageOfPost, type Draft, type Post } from "./data/social";

const now = Date.parse("2026-10-19T12:00:00Z");
const post = (o: Partial<Post> = {}): Post => ({ id: "p", propertyId: "x", platform: "instagram", status: "scheduled", scheduledAt: "2026-10-20T10:00:00Z", publishedAt: null, caption: "hi", failure: null, clicks: 0, visits: 0, leads: 0, likes: 0, comments: 0, shares: 0, ...o });

describe("social rules", () => {
  it("failed posts need attention", () => { expect(stageOfPost(post({ status: "failed" }), now)).toBe("attention"); });
  it("a live post nobody tapped after two days needs attention, a fresh one does not", () => {
    expect(stageOfPost(post({ status: "published", publishedAt: "2026-10-15T00:00:00Z" }), now)).toBe("attention");
    expect(stageOfPost(post({ status: "published", publishedAt: "2026-10-19T08:00:00Z" }), now)).toBe("published");
    expect(stageOfPost(post({ status: "published", publishedAt: "2026-10-15T00:00:00Z", clicks: 3 }), now)).toBe("published");
  });
  it("drafts are review cards, scheduled posts are scheduled", () => {
    const d: Draft = { id: "d", propertyId: "x", platform: "tiktok", angle: null, text: "t", createdAt: "2026-10-19T00:00:00Z" };
    const c = buildCards([d], [post()], now);
    expect(c.map((x) => x.stage)).toEqual(["review", "scheduled"]);
  });
  it("calendar groups posts by day, soonest first, ignoring drafts", () => {
    const d: Draft = { id: "d", propertyId: "x", platform: "tiktok", angle: null, text: "t", createdAt: "2026-10-19T00:00:00Z" };
    const cards = buildCards([d], [post({ id: "b", scheduledAt: "2026-10-21T09:00:00Z" }), post({ id: "a", scheduledAt: "2026-10-20T09:00:00Z" }), post({ id: "c", scheduledAt: "2026-10-20T17:00:00Z" })], now);
    const g = groupByDay(cards);
    expect(g.map((x) => x.day)).toEqual(["2026-10-20", "2026-10-21"]);
    expect(g[0].cards.map((x) => x.id)).toEqual(["a", "c"]);
  });
});
