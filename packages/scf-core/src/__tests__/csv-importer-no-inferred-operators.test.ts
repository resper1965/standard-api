import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCsvScfImporter } from "../importers/csv-importer";

const IMPORTER = resolve(__dirname, "../importers/csv-importer.ts");

// Regression guard for the sixth fabrication site (Critical 1, strm-reimport
// closeout): the CSV importer used to fall back an absent/blank/unrecognised
// relationship_type to "intersects", which is how 79,127 of 79,133 rows in
// production came to carry an operator nobody actually recorded. If this
// test starts failing, the fallback has come back — do not delete the test,
// route the value through toCanonicalOperator instead.
describe("csv importer does not infer scf_mappings.relationship_type", () => {
  it("has no hardcoded fallback to a canonical operator", () => {
    const src = readFileSync(IMPORTER, "utf8");
    expect(src).not.toMatch(/:\s*"intersects";?\s*\/\/.*fallback/i);
    expect(src).toMatch(/toCanonicalOperator\(row\.relationship_type\)/);
  });

  const csvFor = (relationshipTypeCell: string) => `record_type,id,version_label,domain_code,domain_name,control_code,control_title,scf_domain_id,framework_code,framework_name,requirement_code,requirement_title,scf_framework_id,scf_framework_requirement_id,scf_control_id,relationship_type
version,v1,2026.1,,,,,,,,,,,,,
domain,,,DOM-1,Domain One,,,,,,,,,,,
control,,,,,CTRL-1,Control One,DOM-1,,,,,,,,
framework,,,,,,,,FW-1,Framework One,,,,,,
requirement,,,,,,,,,,REQ-1,Requirement One,FW-1,,,
mapping,,,,,,,,,,,,FW-1,REQ-1,CTRL-1,${relationshipTypeCell}
`;

  it("writes null when the source relationship_type is absent", async () => {
    const importer = createCsvScfImporter();
    const { dataset } = await importer.parse({
      source_type: "csv",
      version_label: "2026.1",
      content: csvFor(""),
    });
    expect(dataset.mappings).toHaveLength(1);
    expect(dataset.mappings[0]?.relationship_type).toBeNull();
  });

  it("writes null when the source relationship_type is unrecognised, not intersects", async () => {
    const importer = createCsvScfImporter();
    const { dataset } = await importer.parse({
      source_type: "csv",
      version_label: "2026.1",
      content: csvFor("garbage-value"),
    });
    expect(dataset.mappings).toHaveLength(1);
    expect(dataset.mappings[0]?.relationship_type).toBeNull();
  });

  it("still canonicalises a recognised operator", async () => {
    const importer = createCsvScfImporter();
    const { dataset } = await importer.parse({
      source_type: "csv",
      version_label: "2026.1",
      content: csvFor("subset"),
    });
    expect(dataset.mappings[0]?.relationship_type).toBe("subset");
  });
});
