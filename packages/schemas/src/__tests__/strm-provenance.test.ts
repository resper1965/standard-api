import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BACKFILL = resolve(__dirname, "../backfill-mapping-strm-operators.ts");
const OFFICIAL = "scf_official_strm_bundle_2026.1";

describe("backfill provenance", () => {
  const src = readFileSync(BACKFILL, "utf8");

  it("names the official source in both statements", () => {
    // One occurrence in the coverage query, one in the UPDATE.
    const hits = src.split(OFFICIAL).length - 1;
    expect(hits).toBeGreaterThanOrEqual(2);
  });

  it("never writes an operator sourced from structural inference", () => {
    expect(src).not.toMatch(/inferred_structural_analysis/);
  });
});
