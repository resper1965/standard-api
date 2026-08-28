import { describe, it, expect } from "vitest";
import { toCanonicalOperator } from "../importers/strm-operator.js";

describe("toCanonicalOperator", () => {
  it("passes the five canonical operators through unchanged", () => {
    expect(toCanonicalOperator("equal")).toBe("equal");
    expect(toCanonicalOperator("subset")).toBe("subset");
    expect(toCanonicalOperator("intersects")).toBe("intersects");
    expect(toCanonicalOperator("superset")).toBe("superset");
    expect(toCanonicalOperator("no_relation")).toBe("no_relation");
  });

  it("translates the legacy bundle aliases", () => {
    expect(toCanonicalOperator("direct")).toBe("equal");
    expect(toCanonicalOperator("related")).toBe("intersects");
    expect(toCanonicalOperator("intersecting")).toBe("intersects");
    expect(toCanonicalOperator("no_relationship")).toBe("no_relation");
  });

  it("is tolerant of surrounding whitespace and case", () => {
    expect(toCanonicalOperator("  Equal ")).toBe("equal");
    expect(toCanonicalOperator("NO_RELATIONSHIP")).toBe("no_relation");
  });

  // The point of the whole exercise: an operator we do not recognise is
  // unknown. It must not become intersects, which asserts scope overlap.
  it("returns null for an unrecognised operator", () => {
    expect(toCanonicalOperator("source_defined")).toBeNull();
    expect(toCanonicalOperator("partially_related")).toBeNull();
    expect(toCanonicalOperator("")).toBeNull();
    expect(toCanonicalOperator(null)).toBeNull();
    expect(toCanonicalOperator(undefined)).toBeNull();
  });
});
