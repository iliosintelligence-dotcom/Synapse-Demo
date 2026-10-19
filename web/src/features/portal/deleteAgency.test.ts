import { describe, expect, it } from "vitest";
import { armed, confirmKey, describe as lists, isAgencyCacheKey, loginOf, routePreview, said, why, type Preview } from "./data/deleteAgency";

const pv = (o: Partial<Preview> = {}): Preview => ({ agency_id: "a", name: "Greenlight Realty", state: "ready", confirm_phrase: "Greenlight Realty", counts: { listings: 3, listing_media: 12, leads: 1, social_posts: 0, team_members: 2 }, owner_login: { removable: true }, ...o });

describe("delete agency rules", () => {
  it("compares the typed name fairly: curly quotes, spacing and edges are not a different name, case is", () => {
    expect(confirmKey("  O’Neil   Homes ")).toBe("O'Neil Homes");
    expect(armed("o’neil homes", "O'Neil Homes", false, false)).toBe(false);
    expect(armed("  O’Neil   Homes", "O'Neil Homes", false, false)).toBe(true);
  });
  it("a paid plan needs the days-left box ticked, and an empty phrase never arms", () => {
    expect(armed("X", "X", true, false)).toBe(false);
    expect(armed("X", "X", true, true)).toBe(true);
    expect(armed("", "", false, false)).toBe(false);
  });
  it("says what goes, from the server's own numbers, and only the lines that apply", () => {
    const { gone } = lists(pv());
    expect(gone[0]).toBe("3 listings, with 12 photos and videos");
    expect(gone[1]).toContain("1 lead in your CRM");
    expect(gone.some((x) => /post/.test(x) && /Social studio/.test(x))).toBe(false);
    expect(gone.some((x) => x.includes("Your own profile, photo and login"))).toBe(true);
  });
  it("is honest about what stays: published posts, the team's logins, and the login when it cannot go", () => {
    const k = lists(pv({ owner_login: { removable: false, kept_because: "owns_another_agency" } })).kept.join(" ");
    expect(k).toContain("Posts already published");
    expect(k).toContain("Your team (2 people)");
    expect(k).toContain("you also own another agency");
    expect(lists(pv()).kept.join(" ")).not.toContain("**Your login** stays");
  });
  it("reads the login whichever shape the server sends", () => {
    expect(loginOf(pv())).toEqual({ removable: true, keptBecause: null });
    expect(loginOf(pv({ owner_login: "pending" }))).toEqual({ removable: false, keptBecause: null });
  });
  it("routes by where the deletion stands", () => {
    expect(routePreview(pv()).kind).toBe("confirm");
    expect(routePreview(pv({ state: "begun" })).kind).toBe("confirm");
    expect(routePreview(pv({ state: "data_deleted" })).kind).toBe("finishOnly");
  });
  it("speaks in the person's words, never a gateway's", () => {
    expect(said({ ok: false, status: 400, data: { error: "That name does not match.", code: "name_mismatch" } })).toBe("That name does not match.");
    expect(said({ ok: false, status: 401, data: {} })).toMatch(/session has ended/);
    expect(said({ ok: false, status: 0, data: {} })).toMatch(/could not be reached/);
    expect(said({ ok: false, status: 502, data: { error: "Bad gateway" } })).toMatch(/safe to try again/);
  });
  it("clears this agency's copies on the device and leaves interface choices alone", () => {
    expect(isAgencyCacheKey("synapse_listing_draft_v2:abc")).toBe(true);
    expect(isAgencyCacheKey("syn_setup_done")).toBe(true);
    expect(isAgencyCacheKey("theme")).toBe(false);
    expect(isAgencyCacheKey("synapse_auth_v1")).toBe(false);
  });
  it("names why a login stays", () => { expect(why("platform_staff")).toBe("it is a Synapse staff account"); expect(why(null)).toMatch(/still needs it/); });
});
