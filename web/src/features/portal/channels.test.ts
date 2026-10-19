import { describe, expect, it } from "vitest";
import { CONNECT_HELP, accountsOn, botName, isExpired, liveCount, minutesLeft, readConnectResult, stripConnectParams, suggestPages, tileReady, type Account } from "./data/channels";

const acct = (o: Partial<Account>): Account => ({ id: "a", platform: "instagram", platform_username: "x", is_active: true, token_expires_at: null, connected_at: "2026-01-01", ...o });
const now = Date.parse("2026-10-19T00:00:00Z");

describe("channel rules", () => {
  it("an expired token is not a live channel", () => {
    expect(isExpired(acct({ token_expires_at: "2026-10-01T00:00:00Z" }), now)).toBe(true);
    expect(isExpired(acct({ token_expires_at: "2027-01-01T00:00:00Z" }), now)).toBe(false);
    expect(isExpired(acct({}), now)).toBe(false);
    expect(liveCount([acct({ id: "1" }), acct({ id: "2", platform: "facebook", token_expires_at: "2026-10-01T00:00:00Z" })])).toBe(1);
  });
  it("lists the oldest account first, because that is where an unnamed post goes", () => {
    const a = [acct({ id: "new", connected_at: "2026-06-01" }), acct({ id: "old", connected_at: "2026-01-01" })];
    expect(accountsOn(a, "instagram").map((x) => x.id)).toEqual(["old", "new"]);
  });
  it("Instagram works whenever Facebook does; unknown readiness behaves as ready", () => {
    expect(tileReady({ platforms: { instagram: { ready: false }, facebook: { ready: true } } }, "instagram")).toBe(true);
    expect(tileReady({ platforms: { instagram: { ready: false }, facebook: { ready: false } } }, "instagram")).toBe(false);
    expect(tileReady({ platforms: null }, "tiktok")).toBe(true);
  });
  it("only a sane bot handle is believed", () => {
    expect(botName({ platforms: { telegram: { bot: "@MyListingsBot" } } })).toBe("@MyListingsBot");
    expect(botName({ platforms: { telegram: { bot: "<script>" } } })).toBe("@SynapseListingsBot");
  });
  it("reads each outcome Facebook or TikTok sends back", () => {
    expect(readConnectResult("")).toBeNull();
    expect(readConnectResult("?connected=choose&detail=123e4567-e89b-12d3-a456-426614174000")).toEqual({ kind: "choose", stash: "123e4567-e89b-12d3-a456-426614174000" });
    expect(readConnectResult("?connected=choose&detail=nope")).toMatchObject({ kind: "ok" });
    expect(readConnectResult("?connected=tiktok&detail=listings")).toMatchObject({ kind: "ok", message: expect.stringContaining("TikTok inbox") });
    expect(readConnectResult("?connected=facebook&detail=Page%20One")).toMatchObject({ kind: "ok", message: "Facebook connected as Page One. Posts to it are real from now on." });
  });
  it("turns a failure reason into steps, and the old wording into a reason", () => {
    const r = readConnectResult("?connected=error&detail=Facebook%20shared%20no%20Page&reason=");
    expect(r).toMatchObject({ kind: "failed", help: CONNECT_HELP.no_pages });
    expect(readConnectResult("?connected=error&reason=user_denied")).toMatchObject({ kind: "failed", help: CONNECT_HELP.user_denied });
    expect(readConnectResult("?connected=cancelled&detail=closed")).toMatchObject({ kind: "failed", help: null, message: "Connection cancelled: closed" });
  });
  it("strips only the outcome from the address", () => {
    expect(stripConnectParams("?connected=ok&detail=x&reason=y&keep=1", "/portal/", "#social")).toBe("/portal/?keep=1#social");
    expect(stripConnectParams("?connected=ok", "/portal/", "")).toBe("/portal/");
  });
  it("ticks only a Page sharing a distinctive word with the agency", () => {
    const pick = { agency: "Greenlight Real Estate Ltd", pages: [{ id: "1", name: "Greenlight Homes" }, { id: "2", name: "Iteriba Real Estate" }, { id: "3", name: "Greenlight Two", connected: "Other Agency" }] };
    expect(suggestPages(pick)).toEqual({ "1": true });
  });
  it("counts minutes left on a code", () => { expect(minutesLeft(now + 90_000, now)).toBe(2); expect(minutesLeft(now - 1, now)).toBe(0); expect(minutesLeft(0, now)).toBe(0); });
});
