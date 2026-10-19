import { describe, expect, it } from "vitest";
import { bioSlug, channelTasks, freshTasks, goUrl, openTasks, type Task } from "./data/tasks";

const acct = (o: Record<string, unknown>) => ({ id: "a1", platform: "instagram", platform_username: "Prestige.Homes_NG", is_active: true, ...o }) as never;

describe("channel tasks", () => {
  it("builds the bio link slug the /go/ page expects", () => {
    expect(bioSlug("@Prestige Homes!")).toBe("prestige-homes-");
    expect(bioSlug("  @A.B_c-d ")).toBe("a.b_c-d");
    expect(goUrl("@Prestige")).toBe("https://synapsecore.dev/go/prestige");
    expect(goUrl("")).toBe("");
  });
  it("an Instagram account gets a bio-link task naming where to paste it", () => {
    const [t] = channelTasks([acct({})]);
    expect(t.title).toBe("Put this link in @Prestige.Homes_NG’s bio");
    expect(t.copies).toEqual([{ text: "https://synapsecore.dev/go/prestige.homes_ng" }]);
    expect(t.where).toBe("Instagram → Edit profile → Links");
  });
  it("Telegram points at the Tayo chat, in the channel description", () => {
    const [t] = channelTasks([acct({ platform: "telegram", platform_username: "@homes" })]);
    expect(t.copies![0].text).toBe("https://synapsecore.dev/tayo/telegram");
    expect(t.where).toContain("Description");
  });
  it("an inactive account has no tasks", () => { expect(channelTasks([acct({ is_active: false })])).toEqual([]); });
  it("says nothing about the Page button when it could not be read", () => {
    expect(channelTasks([acct({ platform: "facebook" })]).map((t) => t.id)).toEqual(["bio:a1:prestige.homes_ng"]);
  });
  it("covers each state a Facebook Page button can be in", () => {
    const fb = (cta: Record<string, unknown>) => channelTasks([acct({ platform: "facebook", ...cta })]).filter((t) => t.id.startsWith("cta:"));
    expect(fb({ page_cta_type: "NONE" })[0].title).toMatch(/Give .* an action button/);
    expect(fb({ page_cta_type: "WHATSAPP_MESSAGE", page_cta_url: null })[0].body).toContain("whatsapp message");
    expect(fb({ page_cta_type: "SHOP_NOW", page_cta_url: "https://other.example/x" })[0].title).toMatch(/goes somewhere else/);
    expect(fb({ page_cta_type: "SHOP_NOW", page_cta_url: "https://synapsecore.dev/go/x" })).toEqual([]);
  });
  it("lists what is still owed and pops only what is new", () => {
    const a: Task = { id: "a", title: "A" }, b: Task = { id: "b", title: "B" }, c: Task = { id: "c", title: "C", once: true };
    expect(openTasks([a, b, c], { a: 1 }).map((t) => t.id)).toEqual(["b"]);
    expect(freshTasks([a, b, c], { a: 1 }, { b: 1 }, new Set())).toEqual([c]);
    expect(freshTasks([a, b], {}, {}, new Set(["a"])).map((t) => t.id)).toEqual(["b"]);
  });
});
