import { describe, expect, it } from "vitest";
import { fresh, pickOffer, type Live, type Watch } from "./data/statusOffer";

const now = Date.parse("2026-10-21T12:00:00Z");
const day = 864e5;
const w = (postId: string, ageDays: number): Watch => ({ postId, propertyId: `p-${postId}`, at: now - ageDays * day });
const live = (id: string, hoursAgo: number): Live => ({ id, propertyId: `p-${id}`, title: `Flat ${id}`, publishedAt: new Date(now - hoursAgo * 36e5).toISOString() });

describe("WhatsApp Status offer", () => {
  it("forgets a post this device scheduled more than three days ago", () => {
    expect(fresh([w("a", 1), w("b", 3.5)], now).map((x) => x.postId)).toEqual(["a"]);
  });
  it("offers only a post that is really live", () => {
    expect(pickOffer([w("a", 1)], [], now)).toBeNull();
    expect(pickOffer([w("a", 1)], [live("a", 2)], now)?.title).toBe("Flat a");
  });
  it("does not offer a post that went live more than three days ago", () => {
    expect(pickOffer([w("a", 1)], [live("a", 80)], now)).toBeNull();
  });
  it("offers the first watched post that is live, in the order they were scheduled", () => {
    expect(pickOffer([w("a", 2), w("b", 1)], [live("b", 1), live("a", 1)], now)?.id).toBe("a");
  });
  it("ignores live posts this device never scheduled", () => {
    expect(pickOffer([w("a", 1)], [live("zzz", 1)], now)).toBeNull();
  });
});
