import { describe, it, expect } from "vitest";
import { parseStrmOperatorCell } from "../importers/strm-bundle-importer.js";

describe("parseStrmOperatorCell", () => {
  it("reads the vocabulary the 183 bundle files actually contain", () => {
    expect(parseStrmOperatorCell("Intersects With")).toEqual({ kind: "operator", value: "intersects" });
    expect(parseStrmOperatorCell("Subset Of")).toEqual({ kind: "operator", value: "subset" });
    expect(parseStrmOperatorCell("Subset of")).toEqual({ kind: "operator", value: "subset" });
    expect(parseStrmOperatorCell("Equal")).toEqual({ kind: "operator", value: "equal" });
    expect(parseStrmOperatorCell("Superset Of")).toEqual({ kind: "operator", value: "superset" });
    expect(parseStrmOperatorCell("superset of")).toEqual({ kind: "operator", value: "superset" });
    expect(parseStrmOperatorCell("intersects")).toEqual({ kind: "operator", value: "intersects" });
  });

  // 295 rows in the bundle are spelled this way. They do not start with
  // "intersect" and previously reached `intersects` only via the fallback
  // this task removes, so they need an alias of their own.
  it("reads the bundle's Instersects typo", () => {
    expect(parseStrmOperatorCell("Instersects With")).toEqual({ kind: "operator", value: "intersects" });
  });

  it("drops leaked header rows as non-data", () => {
    expect(parseStrmOperatorCell("Functional")).toEqual({ kind: "skip" });
    expect(parseStrmOperatorCell("STRM\nRelationship")).toEqual({ kind: "skip" });
    expect(parseStrmOperatorCell("")).toEqual({ kind: "skip" });
    expect(parseStrmOperatorCell("   ")).toEqual({ kind: "skip" });
  });

  // The point of the task: an operator we cannot read is kept as a row with an
  // unknown operator. It is neither coerced to intersects nor silently dropped.
  it("keeps an unrecognised operator as unknown, never as intersects", () => {
    expect(parseStrmOperatorCell("Partially Related")).toEqual({ kind: "unknown", raw: "Partially Related" });
    expect(parseStrmOperatorCell("related")).toEqual({ kind: "unknown", raw: "related" });
    expect(parseStrmOperatorCell("source_defined")).toEqual({ kind: "unknown", raw: "source_defined" });
  });
});
