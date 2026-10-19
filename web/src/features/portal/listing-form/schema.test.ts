import { describe, expect, it } from "vitest";
import { blankForm, firstBadStep, formFromRow, geoLadder, isEmptyDraft, readFloor, toPayload, validate, type Form } from "./schema";
import { checkFile, freshWindow, mediaTypeFromUrl, scrub } from "./write";

const good = (o: Partial<Form> = {}): Form => ({ ...blankForm(), title: "3-Bed Flat, Bodija", description: "A bright three bedroom flat with a large compound and reliable water.", address: "12 Aafin Road", city: "Ibadan", state: "Oyo", price: "45000000", bedrooms: "3", photos: ["https://x.test/a.jpg"], latitude: "7.4", longitude: "3.9", ...o });

describe("listing form rules", () => {
  it("a complete form has no errors", () => { expect(validate(good())).toEqual({}); });
  it("a blank form fails on every required field", () => {
    expect(Object.keys(validate(blankForm())).sort()).toEqual(["address", "bedrooms", "city", "description", "photos", "pin", "price", "state", "title"]);
  });
  it("land does not need bedrooms", () => { expect(validate(good({ property_type: "land", bedrooms: "" })).bedrooms).toBeUndefined(); });
  it("rejects a pasted photo that is not a link", () => { expect(validate(good({ photos: ["not a link"] })).photos).toBeTruthy(); });
  it("sends the deal's listing type and drops rows that do not apply", () => {
    const p = toPayload(good({ deal_structure: "rent", payment_plan: "instalments", deposit_pct: "20", build_stage: "under_construction", handover_month: "2027-03" }));
    expect(p.listing_type).toBe("rent");
    expect(p.payment_plan).toBeNull();
    expect(p.deposit_pct).toBeNull();
    expect(p.handover_date).toBe("2027-03-01");
  });
  it("keeps blank and zero apart for fees", () => {
    const p = toPayload(good({ agency_fee: "", legal_fee: "0" }));
    expect(p.agency_fee).toBeNull();
    expect(p.legal_fee).toBe(0);
  });
  it("splits amenities pasted with pipes and line breaks", () => {
    expect(toPayload(good({ amenities: ["Gym | Pool\nBorehole", "Garden"] })).amenities).toEqual(["Gym", "Pool", "Borehole", "Garden"]);
  });
  it("puts photos in order with the first as cover", () => {
    const p = toPayload(good({ photos: ["https://a/1.jpg", "https://a/2.jpg"] }));
    expect(p.media.map((m) => [m.display_order, m.is_primary])).toEqual([[0, true], [1, false]]);
  });
  it("reads the floor", () => {
    expect(readFloor({ floor: "", floor_active: true })).toBeNull();
    expect(readFloor({ floor: "40000000", floor_active: false })).toEqual({ amount: 40000000, active: false });
    expect(readFloor({ floor: "-5", floor_active: true })).toEqual({ error: "A floor has to be a positive amount" });
  });
  it("round-trips an existing row", () => {
    const f = formFromRow({ title: "X flat", price: 100, listing_type: "rent", area_name: "Bodija", is_active: false, amenities: ["Gym"] }, ["https://a/1.jpg"]);
    expect(f).toMatchObject({ title: "X flat", price: "100", deal_structure: "rent", neighbourhood: "Bodija", is_active: false, amenities: ["Gym"] });
    expect(f.photos).toHaveLength(1);
  });
  it("an untouched form is an empty draft", () => { expect(isEmptyDraft(blankForm())).toBe(true); expect(isEmptyDraft(good())).toBe(false); });
  it("points at the earliest step with something missing", () => {
    expect(firstBadStep({ photos: "x", city: "y" })).toBe(1);
    expect(firstBadStep({})).toBeNull();
  });
  it("tries the street, then the area, then the city, without repeats", () => {
    expect(geoLadder({ address: "12 Aafin", neighbourhood: "Bodija", city: "Ibadan", state: "Oyo" }).map((r) => r.how)).toEqual(["address", "area", "city"]);
    expect(geoLadder({ address: "", neighbourhood: "", city: "Ibadan", state: "Oyo" })).toHaveLength(1);
  });
});

describe("listing write rules", () => {
  it("scrub keeps only writable columns and renames the area", () => {
    const out = scrub({ ...toPayload(good({ neighbourhood: "Bodija" })), is_primary: true } as never);
    expect(out.area_name).toBe("Bodija");
    expect(out).not.toHaveProperty("neighbourhood");
    expect(out).not.toHaveProperty("media");
    expect(out).not.toHaveProperty("verification_status");
    expect(out.status).toBe("live");
  });
  it("an inactive listing saves as draft, never live", () => { expect(scrub(toPayload(good({ is_active: false }))).status).toBe("draft"); });
  it("the freshness clock is 21 days", () => {
    const w = freshWindow(Date.parse("2026-10-19T00:00:00Z"));
    expect(w.expires_at).toBe("2026-11-09T00:00:00.000Z");
  });
  it("reads video from the extension, ignoring query strings", () => {
    expect(mediaTypeFromUrl("https://a/b.mp4?t=1")).toBe("video");
    expect(mediaTypeFromUrl("https://a/b.jpg")).toBe("image");
  });
  it("gates files by type and size", () => {
    expect(checkFile({ type: "video/webm", size: 1 })).toMatch(/MP4 or MOV/);
    expect(checkFile({ type: "image/jpeg", size: 11 * 1048576 })).toMatch(/under 10MB/);
    expect(checkFile({ type: "video/mp4", size: 50 * 1048576 })).toBeNull();
  });
});
