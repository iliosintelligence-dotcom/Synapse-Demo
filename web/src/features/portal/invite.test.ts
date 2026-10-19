import { describe, expect, it } from "vitest";
import { takeJoined, markJoined, tokenFrom, whyNot } from "./data/invite";

describe("invite rules", () => {
  it("reads a sane token and ignores a strange one", () => {
    expect(tokenFrom("?invite=abc123DEF_-xyz9")).toBe("abc123DEF_-xyz9");
    expect(tokenFrom("?invite=short")).toBeNull();
    expect(tokenFrom("?invite=<script>alert(1)</script>")).toBeNull();
    expect(tokenFrom("")).toBeNull();
  });
  it("says why an invite failed, in words", () => {
    expect(whyNot("wrong_account")).toMatch(/different email/);
    expect(whyNot("invalid_or_expired")).toMatch(/expired/);
    expect(whyNot("nope")).toBe("That invite could not be used.");
  });
  it("the welcome handoff is taken once", () => {
    const store: Record<string, string> = {};
    (globalThis as unknown as { window: unknown }).window = { sessionStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } } };
    markJoined();
    expect(takeJoined()).toBe(true);
    expect(takeJoined()).toBe(false);
  });
});
