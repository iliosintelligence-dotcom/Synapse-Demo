import { describe, expect, it } from "vitest";
import { mailOrigin, normalisePhone, roleOf, safeNext } from "./auth-actions";

describe("safeNext: only same-origin paths are ever followed", () => {
  const fb = "/app/toju.html";
  it("keeps a same-origin absolute path, query and hash", () => {
    expect(safeNext("/property/?id=abc#x", fb)).toBe("/property/?id=abc#x");
  });
  it("resolves a relative path written by the static pages against /app/", () => {
    expect(safeNext("property.html?id=abc", fb)).toBe("/app/property.html?id=abc");
    expect(safeNext("agency.html#social", fb)).toBe("/app/agency.html#social");
  });
  it.each([
    "//evil.example.com/x",
    "https://evil.example.com/",
    "http://synapsecore.dev.evil.com/",
    "javascript:alert(1)",
    "data:text/html,<script>1</script>",
    "///evil.example.com",
  ])("rejects %s", (bad) => {
    expect(safeNext(bad, fb)).toBe(fb);
  });
  // Backslashes are read as slashes by browsers. Whatever these resolve to, it must be on this site: a single leading slash, never // or /\.
  it.each(["/%2F/evil.example.com", "\evil.example.com", "/\evil.example.com", "\\evil.example.com", "/\/evil.example.com"])("never leaves the site for %s", (bad) => {
    const out = safeNext(bad, fb);
    expect(out === fb || /^\/(?![\/])/.test(out)).toBe(true);
  });
  it("falls back for empty input", () => {
    expect(safeNext("", fb)).toBe(fb);
    expect(safeNext(null, fb)).toBe(fb);
  });
});

describe("normalisePhone: every way Nigerians write a number becomes E.164", () => {
  it.each([
    ["08031234567", "+2348031234567"],
    ["0803 123 4567", "+2348031234567"],
    ["2348031234567", "+2348031234567"],
    ["+2348031234567", "+2348031234567"],
    ["803-123-4567", "+2348031234567"],
    ["", ""],
  ])("%s -> %s", (raw, want) => expect(normalisePhone(raw)).toBe(want));
});

describe("roleOf: the database role enum maps to the app's two sides", () => {
  const user = (role?: string) => ({ user_metadata: { role } }) as never;
  it("agency roles", () => {
    for (const r of ["agency_owner", "agency_admin", "agent", "platform_admin"]) expect(roleOf(user(r))).toBe("agency");
  });
  it("everything else is a customer; nobody is null", () => {
    expect(roleOf(user("consumer"))).toBe("customer");
    expect(roleOf(user(undefined))).toBe("customer");
    expect(roleOf(null)).toBeNull();
  });
});

describe("mailOrigin: an emailed link never carries a loopback origin", () => {
  it("uses the real origin as-is", () => expect(mailOrigin()).toBe("https://synapsecore.dev"));
});
