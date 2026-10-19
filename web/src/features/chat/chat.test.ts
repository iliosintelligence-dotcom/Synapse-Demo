import { describe, expect, it } from "vitest";
import { zynForReply } from "@/components/zynState";
import { dreamContext, isHiddenNote, isPersonTurn, priceLine, replyContext } from "./context";
import { unwrapEnvelope } from "./envelope";
import { quickAnswers } from "./quick";
import type { ReplyTo } from "./types";

describe("unwrapEnvelope: raw JSON from the model must never reach the screen", () => {
  it("leaves ordinary prose alone", () => {
    const d = { reply: "Here are three homes." };
    unwrapEnvelope(d);
    expect(d.reply).toBe("Here are three homes.");
  });
  it("unwraps a whole-reply JSON envelope and lifts out matches and suggestions", () => {
    const d: { reply: string; matches?: unknown[]; suggestions?: unknown } = { reply: JSON.stringify({ reply: "Found two.", matches: [{ id: "a" }], suggestions: ["Yes", "No"] }) };
    unwrapEnvelope(d);
    expect(d.reply).toBe("Found two.");
    expect(d.matches).toEqual([{ id: "a" }]);
    expect(d.suggestions).toEqual(["Yes", "No"]);
  });
  it("unwraps a fenced block", () => {
    const d = { reply: "```json\n{\"reply\":\"Hello\"}\n```" };
    unwrapEnvelope(d);
    expect(d.reply).toBe("Hello");
  });
  it("keeps the prose and drops a JSON tail the model welded on", () => {
    const d: { reply: string; suggestions?: unknown } = { reply: 'Two bedrooms is a good start. {"showMatches": false, "suggestions": ["1","2"]}' };
    unwrapEnvelope(d);
    expect(d.reply).toBe("Two bedrooms is a good start.");
    expect(d.suggestions).toEqual(["1", "2"]);
  });
  it("does not mistake a sentence that contains a brace for an envelope", () => {
    const d = { reply: "Use {curly} words if you like." };
    unwrapEnvelope(d);
    expect(d.reply).toBe("Use {curly} words if you like.");
  });
  it("salvages the reply string from broken JSON, and never shows the envelope", () => {
    const d = { reply: '{"reply": "It is a good area.", "matches": [{"id": ' };
    unwrapEnvelope(d);
    expect(d.reply).toBe("It is a good area.");
    const e = { reply: '{"matches": [' };
    unwrapEnvelope(e);
    expect(e.reply).toBe("");
  });
});

describe("quickAnswers: buttons only for a closed question", () => {
  it("offers Rent / Buy for an either-or", () => expect(quickAnswers("Are you looking to rent or buy?", null)).toEqual(["Rent", "Buy"]));
  it("offers Yes / No for a yes-no question", () => expect(quickAnswers("Do you have a budget in mind?", null)).toEqual(["Yes", "No"]));
  it("offers bedroom counts", () => expect(quickAnswers("How many bedrooms do you need?", null)).toHaveLength(5));
  it("offers nothing for an open question, even with suggestions", () => expect(quickAnswers("What's prompting the move?", ["Work", "Family"])).toEqual([]));
  it("uses the server's suggestions when 2 to 6 are answers, and drops actions and questions", () => {
    expect(quickAnswers("Is it for you alone or a family?", ["Just me", "Couple", "Alert me", "Why?"])).toEqual(["Just me", "Couple"]);
  });
  it("offers nothing when the message does not end in a question", () => expect(quickAnswers("Here are three homes.", ["a", "b"])).toEqual([]));
});

const home: ReplyTo = { id: "x", title: "5-bed Duplex", price: 380_000_000, price_period: "total", currency: "NGN", listing_type: "sale", city: "Lagos", bedrooms: 5, bathrooms: 5, area_sqm: 450, latitude: 1, longitude: 1, verification_status: "unverified", trust_score: null, property_media: null };

describe("replyContext: a sale and a rental are different conversations", () => {
  it("says a rent is not negotiable", () => expect(replyContext({ ...home, listing_type: "rent", price_period: "per_year" })).toMatch(/RENTAL.*not negotiable/s));
  it("on a sale, never suggests going below the asking price and never claims verification", () => {
    const c = replyContext(home)!;
    expect(c).toMatch(/SALE/);
    expect(c).toMatch(/never suggest going below it/);
    expect(c).toMatch(/Never claim the home is verified/);
  });
  it("never carries the negotiation floor (that is decided on the server)", () => expect(replyContext(home)).not.toMatch(/floor|minimum|lowest/i));
  it("is null with no home", () => expect(replyContext(null)).toBeNull());
});

describe("priceLine", () => {
  it("formats naira with the period", () => expect(priceLine({ price: 4_500_000, price_period: "per_year", currency: "NGN" })).toMatch(/4,500,000\/yr/));
  it("says price on request with no price", () => expect(priceLine({ price: null, price_period: null, currency: null })).toBe("price on request"));
});

describe("hidden notes and turns", () => {
  it("the dream-home note is hidden from the UI, and bracketed notes are not a person's turn", () => {
    const note = { role: "user", content: "[Background from my Dream Home board ...]" };
    expect(isHiddenNote(note)).toBe(true);
    expect(isHiddenNote({ role: "user", content: "hello" })).toBe(false);
    expect(isPersonTurn({ role: "user", content: "[The buyer is replying about ...]" })).toBe(false);
    expect(isPersonTurn({ role: "user", content: "hello" })).toBe(true);
    expect(isPersonTurn({ role: "assistant", content: "hi" })).toBe(false);
  });
  it("builds a dream context only when the board says something", () => {
    expect(dreamContext(null)).toBeNull();
    expect(dreamContext({ name: "x" })).toBeNull();
    expect(dreamContext({ name: "Mine", areas: ["Lekki"], vibe: ["calm"] })).toMatch(/neighbourhoods\/settings that feel right: Lekki/);
  });
});

describe("zynForReply: the mascot reads what the reply actually carries", () => {
  it("shields only when a shown home is verified", () => {
    expect(zynForReply({ text: "x", matches: [{ verificationStatus: "verified" }] })).toBe("verified");
    expect(zynForReply({ text: "x", matches: [{ verificationStatus: "unverified" }] })).toBe("home");
  });
  it("the empty box only when the search really found nothing", () => expect(zynForReply({ text: "x", searched: { live: 0 } })).toBe("nothing"));
  it("curious on a question, sorry on an apology", () => {
    expect(zynForReply({ text: "Where do you work?" })).toBe("curious");
    expect(zynForReply({ text: "Sorry, I could not do that." })).toBe("sorry");
  });
});
