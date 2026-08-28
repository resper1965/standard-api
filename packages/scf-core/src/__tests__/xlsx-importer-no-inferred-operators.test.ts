import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const IMPORTER = resolve(
  __dirname,
  "../importers/xlsx-importer.ts",
);

describe("xlsx importer does not infer scf_mappings.relationship_type", () => {
  it("has no assignment of relationship_type on a parsed mapping", () => {
    const src = readFileSync(IMPORTER, "utf8");
    // The removed block did:
    //   (m as { relationship_type: string }).relationship_type = inferredType;
    expect(src).not.toMatch(/\.relationship_type\s*=\s*inferredType/);
    expect(src).not.toMatch(/mappingIdToStrmType/);
  });

  it("still sets relationship_type to null when building a mapping", () => {
    const src = readFileSync(IMPORTER, "utf8");
    expect(src).toMatch(/relationship_type:\s*null/);
  });

  it("keeps the inference engine for scf_strm_relationships", () => {
    const src = readFileSync(IMPORTER, "utf8");
    expect(src).toMatch(/inferStrmRelationships\(allMappings\)/);
    expect(src).toMatch(/inferred_structural_analysis_v1/);
  });
});
