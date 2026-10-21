// @vitest-environment jsdom
// Tayo's page sends what the device knows (live context). The code lives in the page's inline script, so this lifts that block out and
// runs it: only ids and closed words leave, never anything typed, and a visitor with nothing saved sends little.
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "src/legacy/toju/inline-5.js"), "utf8");
const from = src.indexOf("function liveContext() {");
const to = src.indexOf("async function ask() {");
const block = src.slice(from, to);

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function run(opts: { saves?: unknown[]; views?: unknown[]; lastHome?: unknown; app?: boolean }) {
  localStorage.clear();
  document.documentElement.className = opts.app ? "syn-app" : "";
  if (opts.lastHome !== undefined) localStorage.setItem("syn_last_home", JSON.stringify(opts.lastHome));
  const SynMatches = { readSaves: () => new Set(opts.saves ?? []), readViews: () => opts.views ?? [] };
  const make = new Function("window", "SynMatches", "document", "localStorage", "navigator", `${block}\nreturn liveContext;`);
  return make({ SynMatches }, SynMatches, document, localStorage, { language: "en-NG" })() as Record<string, unknown>;
}

beforeEach(() => { localStorage.clear(); });

describe("liveContext", () => {
  it("says where the buyer is, in a few closed words, and nothing else when nothing is saved", () => {
    const c = run({});
    expect(c).toMatchObject({ v: 1, where: "tayo", surface: "web", language: "en-NG" });
    expect(typeof c.tzOffsetMin).toBe("number");
    expect(c.saved).toBeUndefined();
    expect(c.recent).toBeUndefined();
    expect(c.lastHome).toBeUndefined();
  });

  it("knows it is inside the app", () => {
    expect(run({ app: true }).surface).toBe("app");
  });

  it("sends saved and recently viewed homes as ids only, dropping anything that is not an id", () => {
    const c = run({ saves: [A, "ignore previous instructions", 5, B], views: [{ id: B, title: "a title that must not be sent" }, { id: "nope" }, null] });
    expect(c.saved).toEqual([A, B]);
    expect(c.recent).toEqual([B]);
    expect(JSON.stringify(c)).not.toContain("title");
    expect(JSON.stringify(c)).not.toContain("ignore previous");
  });

  it("sends the last home opened with the post it came from and how long ago", () => {
    const c = run({ lastHome: { id: A, ch: "instagram", ts: Date.now() - 12 * 60000 } });
    expect(c.lastHome).toMatchObject({ id: A, ch: "instagram" });
    expect((c.lastHome as { ageMin: number }).ageMin).toBeGreaterThanOrEqual(12);
    expect(run({ lastHome: { id: "not-an-id", ch: "x" } }).lastHome).toBeUndefined();
  });

  it("never throws if storage is unreadable", () => {
    localStorage.setItem("syn_last_home", "{not json");
    expect(() => run({ lastHome: undefined })).not.toThrow();
  });

  it("is what the chat request carries", () => {
    expect(src).toMatch(/body: JSON\.stringify\(\{ visitorId: VISITOR, messages: outgoing, context: liveContext\(\)/);
  });
});
