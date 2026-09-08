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

    // Extract the UPDATE statement (the second db.execute). It grades through
    // a `graded` CTE, so the source filter sits on the join feeding that CTE
    // — textually before the UPDATE keyword, not after.
    const updateMatch = src.match(/const updated = await db\.execute\(sql`[\s\S]*?`\);/);
    expect(updateMatch).toBeTruthy();
    expect(updateMatch![0]).toMatch(
      /JOIN scf_strm_relationships s[\s\S]*?s\.source[\s\S]*?UPDATE scf_mappings/,
    );
  });

  it("never writes an operator sourced from structural inference", () => {
    expect(src).not.toMatch(/inferred_structural_analysis/);
  });

  it("clears operators no bundle row backs, scoped by framework and source", () => {
    // Grading only writes rows the bundle covers, so on a database that
    // already holds operators — production does, ~79k of them — the uncovered
    // ones survive it. The clearing statement is what makes "the bundle does
    // not cover this, so there is no operator" true rather than aspirational,
    // and it must carry the same two filters as everything else: only the
    // official bundle counts as provenance, and only for the mapping's OWN
    // framework. Without the framework predicate it would accept another
    // framework's row as backing and leave a fabricated operator in place.
    const clearMatch = src.match(
      /const cleared = await db\.execute\(sql`[\s\S]*?`\);/,
    );
    expect(clearMatch).toBeTruthy();
    const stmt = clearMatch![0];

    expect(stmt).toMatch(/SET\s+relationship_type = NULL/);
    expect(stmt).toMatch(/NOT EXISTS/);
    expect(stmt).toMatch(/s\.scf_framework_id\s*=\s*r\.scf_framework_id/);
    expect(stmt).toMatch(/s\.source\s*=\s*\$\{OFFICIAL_SOURCE\}/);
    // Provenance is the stored value matching the bundle's, not merely the
    // pair being mentioned.
    expect(stmt).toMatch(/s\.relationship_type\s*=\s*m\.relationship_type/);
  });

  it("scopes both statements' joins by scf_framework_id, not bare fde_code", () => {
    // An FDE code is unique only inside its own focal document: two
    // frameworks can both use requirement code "1.1.1". Without
    // scf_framework_id in the join, one framework's bundle row grades the
    // other framework's mapping (migration 0060). This guards against that
    // regression coming back.
    const coverageMatch = src.match(/const coverage = \(await db\.execute\(sql`[\s\S]*?`\)/);
    expect(coverageMatch).toBeTruthy();
    expect(coverageMatch![0]).toMatch(
      /LEFT JOIN scf_strm_relationships[\s\S]*?s\.scf_framework_id\s*=\s*r\.scf_framework_id/,
    );

    const updateMatch = src.match(/const updated = await db\.execute\(sql`[\s\S]*?`\);/);
    expect(updateMatch).toBeTruthy();
    expect(updateMatch![0]).toMatch(
      /JOIN scf_strm_relationships s[\s\S]*?s\.scf_framework_id\s*=\s*r\.scf_framework_id/,
    );
  });
});
