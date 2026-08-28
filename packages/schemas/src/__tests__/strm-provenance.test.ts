import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BACKFILL = resolve(__dirname, "../backfill-mapping-strm-operators.ts");
const OFFICIAL = "scf_official_strm_bundle_2026.1";

describe("backfill provenance", () => {
  const src = readFileSync(BACKFILL, "utf8");

  it("wires both SQL statements to OFFICIAL_SOURCE constant", () => {
    // The literal string appears exactly once: in the const declaration.
    const literalCount = src.split(OFFICIAL).length - 1;
    expect(literalCount).toBe(1);

    // Variable interpolation appears at least twice: once per SQL statement.
    const varCount = src.split("${OFFICIAL_SOURCE}").length - 1;
    expect(varCount).toBeGreaterThanOrEqual(2);
  });

  it("filters by source in both coverage and update statements", () => {
    // Extract the coverage query (the first db.execute with LEFT JOIN).
    const coverageMatch = src.match(/const coverage = \(await db\.execute\(sql`[\s\S]*?`\)/);
    expect(coverageMatch).toBeTruthy();
    expect(coverageMatch![0]).toMatch(/LEFT JOIN scf_strm_relationships[\s\S]*?s\.source/);

    // Extract the UPDATE statement (the second db.execute).
    const updateMatch = src.match(/const updated = await db\.execute\(sql`[\s\S]*?`\);/);
    expect(updateMatch).toBeTruthy();
    expect(updateMatch![0]).toMatch(/UPDATE scf_mappings[\s\S]*?s\.source/);
  });

  it("never writes an operator sourced from structural inference", () => {
    expect(src).not.toMatch(/inferred_structural_analysis/);
  });
});
