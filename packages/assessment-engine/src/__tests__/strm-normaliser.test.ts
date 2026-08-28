import { describe, it, expect } from "vitest";
import { normaliseRelationshipType } from "../strm-normaliser.js";

describe("normaliseRelationshipType", () => {
  it("still accepts the canonical five and the legacy DB aliases", () => {
    expect(normaliseRelationshipType("equal")).toBe("equal");
    expect(normaliseRelationshipType("no_relation")).toBe("no_relation");
    expect(normaliseRelationshipType("direct")).toBe("equal");
    expect(normaliseRelationshipType("related")).toBe("intersects");
    expect(normaliseRelationshipType("intersecting")).toBe("intersects");
    expect(normaliseRelationshipType("no_relationship")).toBe("no_relation");
  });

  // A caller filtering ?relationship_type=source_defined was silently served
  // `intersects` rows. It is not one of the five, so it is a 400.
  it("rejects source_defined instead of aliasing it to intersects", () => {
    expect(normaliseRelationshipType("source_defined")).toBeNull();
  });
});
