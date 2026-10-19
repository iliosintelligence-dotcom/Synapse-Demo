import { describe, expect, it } from "vitest";
import { friendly, GENERIC_ERR } from "./errors";
import { pwMessage, pwProblems, pwScore } from "./policy";

describe("password policy", () => {
  it("accepts a strong password", () => expect(pwProblems("Tr0ub4dor&3xYz", "a@b.co", "Ada Obi")).toEqual([]));
  it("names every missing rule", () => expect(pwProblems("abc")).toEqual(["len", "up", "num", "sym"]));
  it("rejects common words and anything built from the email or name", () => {
    expect(pwProblems("Password123!!", "x@y.co")).toContain("weak");
    expect(pwProblems("Johnsmith99!!", "johnsmith@y.co")).toContain("weak");
    expect(pwProblems("Adaobiokafor9!", "x@y.co", "Ada Obi Okafor")).toContain("weak");
  });
  it("scores 0 to 5 and writes a sentence", () => {
    expect(pwScore(pwProblems("Tr0ub4dor&3xYz"))).toBe(5);
    expect(pwMessage(["len", "sym"])).toBe("Your password needs at least 10 characters, a symbol.");
  });
});

describe("friendly(): the message is chosen by code first, then specific text, then broad text", () => {
  it("the email limit is not swallowed by the generic 'rate' test", () => {
    expect(friendly({ code: "over_email_send_rate_limit", message: "rate limit" })).toMatch(/sending limit/);
  });
  it("wrong credentials say the same thing whatever is wrong (no account enumeration)", () => {
    expect(friendly({ message: "Invalid login credentials" })).toMatch(/do not match/);
  });
  it("a repeated password is named", () => expect(friendly({ code: "same_password" })).toMatch(/already your password/));
  it("the wait time is pulled out of the throttle message", () => {
    expect(friendly({ message: "For security purposes, you can only request this after 42 seconds." })).toBe("Please wait 42 seconds before trying that again.");
  });
  it("falls back to the generic sentence", () => expect(friendly({ message: "???" })).toBe(GENERIC_ERR));
});
