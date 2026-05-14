import { createCsvScfImporter, createInMemoryScfCore } from "../src";
import { expect, test } from "./test-kit";

const csvFixture = [
  "record_type,id,version_label,domain_code,domain_name,control_code,control_title,framework_code,framework_name,requirement_code,requirement_title,is_synthetic,is_official,mapping_source",
  "version,,csv-test-1,,,,,,,,,true,,",
  "domain,,,GOV,Governance,,,,,,,true,,",
  "control,,,GOV,,GOV-001,Control title,,,,,true,,",
  "framework,,,,,,,SYNTH,Framework title,,,,true,,",
  "requirement,,,,,,,SYNTH,,SYNTH-1.1,Requirement title,true,,",
  "mapping,,,,,GOV-001,,SYNTH,,SYNTH-1.1,,true,true,csv-test"
].join("\n");

test("CSV importer rejects source without version", async () => {
  const importer = createCsvScfImporter();
  const validation = await importer.validate({ source_type: "csv", content: "record_type\ncontrol" });
  expect(validation.valid).toBe(false);
});

test("CSV importer calculates a source hash when missing", async () => {
  const importer = createCsvScfImporter();
  const parsed = await importer.parse({ source_type: "csv", version_label: "csv-test-1", content: csvFixture });
  expect(parsed.dataset.importRuns[0]!.source_hash.startsWith("sha256:")).toBe(true);
});

test("failed import run stores safe failed status", async () => {
  const scf = createInMemoryScfCore();
  const result = await scf.imports.importFromSource({ source_type: "csv", content: "record_type\ncontrol" });
  expect(result.import_run.status).toBe("failed");
  expect(Boolean(result.import_run.error_summary_safe)).toBe(true);
});
