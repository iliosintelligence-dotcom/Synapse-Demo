// The card renderer's safety rules (from the Greptile audit): ids cannot break out of attributes, unknown status is never
// "Verified", and only https links are rendered. Was tests/unit/cards.test.js, which checked the old static site's copy.
import { beforeAll, describe, expect, it } from "vitest";
import { run } from "./matches-shared.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
let M: any;
beforeAll(() => { run(); M = (window as any).SynMatches; });
const opts = () => ({ saves: new Set(), picked: new Set() });

describe("listing cards", () => {
  it("a hostile id cannot break out of an attribute", () => {
    const html = M.listingCardHtml({ id: 'x" onmouseover="alert(1)', ttl: "T", loc: "L", priceN: 1, vstatus: "verified" }, 0, { ...opts(), compare: true });
    expect(html).not.toMatch(/data-(id|save|cmp)="x" onmouseover/);
    expect(html).toContain("&quot;");
  });
  it("an unknown status is not drawn as Verified", () => {
    const html = M.listingCardHtml({ id: "a1", ttl: "T", loc: "L", priceN: 1 }, 0, opts());
    expect(html).not.toMatch(/chip-pass/);
    expect(html).toMatch(/Not verified/);
  });
  it("an explicit verified still shows Verified", () => {
    expect(M.listingCardHtml({ id: "a2", ttl: "T", loc: "L", priceN: 1, vstatus: "verified" }, 0, opts())).toMatch(/chip-pass/);
  });
  it("a returned id with quotes is replaced, a uuid is kept", () => {
    expect(M.shapeTojuMatch({ id: 'a"b' }, 3).id).toBe("r3");
    expect(M.shapeTojuMatch({ id: "6a4d2d33-8bf4-491a-97bb-a00b987a6326" }, 0).id).toBe("6a4d2d33-8bf4-491a-97bb-a00b987a6326");
  });
});
