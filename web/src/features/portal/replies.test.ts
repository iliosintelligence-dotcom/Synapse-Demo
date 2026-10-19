import { describe, expect, it } from "vitest";
import { DEFAULT_REPLY, replyPreview, validKeyword } from "./data/replies";

describe("comment replies", () => {
  it("is off by default, with the word PRICE", () => { expect(DEFAULT_REPLY).toMatchObject({ enabled: false, keyword: "PRICE" }); });
  it("puts the link where {{link}} is, however it is spaced", () => {
    expect(replyPreview("Here: {{link}} Automated reply.")).toContain("Here: synapsecore.dev/s/… Automated reply.");
    expect(replyPreview("Here: {{ link }} bot reply")).toContain("synapsecore.dev/s/…");
  });
  it("adds the link when the wording leaves it out, once", () => {
    const t = replyPreview("Thanks for asking, it is ₦4.5m. This is an automated reply.");
    expect(t.match(/synapsecore\.dev\/s\//g)).toHaveLength(1);
    expect(t.endsWith("synapsecore.dev/s/…")).toBe(true);
  });
  it("says it is automated when the wording does not", () => {
    expect(replyPreview("Here: {{link}}")).toContain("Automated reply");
    expect(replyPreview("Auto-reply: {{link}}")).not.toContain("(Automated reply");
  });
  it("needs a word to listen for, of a sane length", () => {
    expect(validKeyword("PRICE")).toBe(true);
    expect(validKeyword("   ")).toBe(false);
    expect(validKeyword("x".repeat(25))).toBe(false);
  });
});
