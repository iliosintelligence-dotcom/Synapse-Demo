import { describe, expect, it } from "vitest";
import { initialsOf, tierLabel } from "./data/agency";
import { DOC_CATALOGUE, deriveVerification, type DocRow } from "./data/verification";
import { panesFor, resolvePane, type PaneId } from "./roles";

const ALL: PaneId[] = ["overview", "crm", "negotiator", "listings", "social", "marketing", "agents", "tours", "brand", "verification", "subscription", "billing"];

describe("panesFor: the interface does not offer what the database would refuse", () => {
  it("an owner sees every pane", () => expect(panesFor("agency_owner", ALL)).toEqual(ALL));
  it("an admin never sees the books", () => {
    const p = panesFor("agency_admin", ALL);
    expect(p).toContain("brand");
    expect(p).not.toContain("billing");
    expect(p).not.toContain("subscription");
  });
  it("an agent sees only the working panes", () => expect(panesFor("agent", ALL)).toEqual(["overview", "crm", "negotiator", "listings", "social", "tours"]));
  it("a missing or unknown role is treated as the LEAST privileged, never as an owner", () => {
    expect(panesFor(null, ALL)).toEqual(panesFor("agent", ALL));
    expect(panesFor("platform_admin", ALL)).toEqual(panesFor("agent", ALL));
    expect(panesFor("anything", ALL)).not.toContain("billing");
  });
});

describe("resolvePane", () => {
  it("translates the names old notifications used and ignores unknown ones", () => {
    expect(resolvePane("leads", ALL)).toBe("crm");
    expect(resolvePane("posts", ALL)).toBe("social");
    expect(resolvePane("nonsense", ALL)).toBeNull();
    expect(resolvePane("billing", ["overview"])).toBeNull();
  });
});

const doc = (over: Partial<DocRow>): DocRow => ({ id: "d", document_type: "cac_certificate", display_name: null, storage_url: "p", issuing_state: null, is_verified: false, verified_at: null, expires_at: null, file_size_bytes: 1, mime_type: "application/pdf", created_at: null, ...over });

describe("deriveVerification: everything derived, nothing stored", () => {
  it("nothing uploaded means four required documents outstanding", () => {
    const v = deriveVerification([], "unverified", null);
    expect(v.rows).toHaveLength(DOC_CATALOGUE.length);
    expect(v.outstanding).toBe(4);
    expect(v.complete).toBe(false);
  });
  it("an uploaded document is pending until the desk verifies it, which is not the same as complete", () => {
    const v = deriveVerification([doc({})], "unverified", null);
    expect(v.rows.find((r) => r.key === "cac_certificate")!.state).toBe("pending");
    expect(v.outstanding).toBe(3);
  });
  it("verified when any current file is verified", () => {
    expect(deriveVerification([doc({ is_verified: true })], "basic", null).rows[0].state).toBe("verified");
  });
  it("expired only when EVERY file is past its date, and an expired required document counts as outstanding", () => {
    const past = "2020-01-01T00:00:00Z";
    const future = "2099-01-01T00:00:00Z";
    expect(deriveVerification([doc({ expires_at: past })], null, null).rows[0].state).toBe("expired");
    expect(deriveVerification([doc({ expires_at: past, id: "a" }), doc({ expires_at: future, id: "b" })], null, null).rows[0].state).toBe("pending");
    expect(deriveVerification([doc({ expires_at: past })], null, null).outstanding).toBe(4);
  });
  it("an agency verified before documents were collected is not behind on anything", () => {
    const v = deriveVerification([], "verified", { documents_reviewed: true, verification_notes: "Verified in 2025.", current_tier: "verified" });
    expect(v.exempt).toBe(true);
    expect(v.outstanding).toBe(0);
    expect(v.complete).toBe(true);
    expect(v.exemptNote).toBe("Verified in 2025.");
  });
  it("optional documents never count as outstanding", () => {
    const v = deriveVerification(DOC_CATALOGUE.filter((s) => s.required).map((s) => doc({ document_type: s.key, id: s.key })), null, null);
    expect(v.outstanding).toBe(0);
  });
});

describe("tierLabel: 'verified' is a claim, so it is an allowlist", () => {
  it("never dresses an unverified agency up as verified", () => {
    expect(tierLabel("unverified")).toBe("Unverified");
    expect(tierLabel("pending")).toBe("Pending");
    expect(tierLabel("rejected")).toBe("Rejected");
    expect(tierLabel("")).toBe("");
  });
  it("only gold and basic need the word", () => {
    expect(tierLabel("gold")).toBe("✦ Gold verified");
    expect(tierLabel("basic")).toBe("✦ Basic verified");
    expect(tierLabel("verified")).toBe("✦ Verified");
    expect(tierLabel("platinum")).toBe("✦ Platinum"); // a tier nobody has added yet is shown as itself
  });
});

describe("initialsOf", () => {
  it("takes the first two words", () => {
    expect(initialsOf("Laurel Homes and Properties")).toBe("LH");
    expect(initialsOf("JAK")).toBe("J");
    expect(initialsOf("")).toBe("?");
  });
});
