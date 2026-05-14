/**
 * Integration test: validate that the SCF 2024.4 seed CSV is parseable
 * by the existing csv-importer and produces the expected data shape.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCsvScfImporter } from "../src/importers/csv-importer";

const csvPath = resolve(process.cwd(), "evals", "fixtures", "scf-2024.4-seed.csv");

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`ok - ${msg}`);
    passed++;
  } else {
    console.error(`FAIL - ${msg}`);
    failed++;
  }
}

async function run() {
  const csv = readFileSync(csvPath, "utf-8");
  assert(csv.length > 1000, "CSV file has content");

  const importer = createCsvScfImporter();

  const source = {
    source_type: "csv" as const,
    content: csv,
    version_label: "SCF 2024.4",
    source_filename: "scf-2024.4-seed.csv",
  };

  // Validate
  const validation = await importer.validate(source);
  assert(validation.valid === true, "CSV validates successfully");
  assert(validation.errors.length === 0, "No validation errors");

  // Parse
  const result = await importer.parse(source);
  const ds = result.dataset;

  // Versions
  assert(ds.versions.length === 1, `1 version parsed (got ${ds.versions.length})`);
  assert(ds.versions[0].version_label === "SCF 2024.4", `Version label is 'SCF 2024.4'`);
  assert(ds.versions[0].is_synthetic === false, `Version is NOT synthetic`);

  // Domains
  assert(ds.domains.length === 33, `33 domains parsed (got ${ds.domains.length})`);
  const govDomain = ds.domains.find(d => d.domain_code === "GOV");
  assert(!!govDomain, "GOV domain exists");
  const webDomain = ds.domains.find(d => d.domain_code === "WEB");
  assert(!!webDomain, "WEB domain exists");

  // Controls
  assert(ds.controls.length >= 80, `≥80 controls parsed (got ${ds.controls.length})`);
  const gov01 = ds.controls.find(c => c.control_code === "GOV-01");
  assert(!!gov01, "GOV-01 control exists");
  assert(gov01!.scf_domain_id === govDomain!.id, "GOV-01 linked to GOV domain");

  // Frameworks
  assert(ds.frameworks.length === 10, `10 frameworks parsed (got ${ds.frameworks.length})`);
  const iso = ds.frameworks.find(f => f.framework_code === "ISO-27001");
  assert(!!iso, "ISO-27001 framework exists");
  const gdpr = ds.frameworks.find(f => f.framework_code === "EU-GDPR");
  assert(!!gdpr, "EU-GDPR framework exists");

  // Requirements
  assert(ds.requirements.length >= 40, `≥40 requirements parsed (got ${ds.requirements.length})`);

  // Mappings
  assert(ds.mappings.length >= 80, `≥80 mappings parsed (got ${ds.mappings.length})`);
  assert(ds.mappings.every(m => m.is_official === true), "All mappings marked official");
  assert(ds.mappings.every(m => m.mapping_source.includes("SCF 2024.4")), "All mappings have SCF source");

  // No synthetic records
  const allRecords = [...ds.versions, ...ds.domains, ...ds.controls, ...ds.frameworks, ...ds.requirements, ...ds.mappings];
  const syntheticCount = allRecords.filter(r => (r as any).is_synthetic === true).length;
  assert(syntheticCount === 0, `No synthetic records (got ${syntheticCount})`);

  // Warnings (some mappings with duplicate requirement codes may warn)
  console.log(`\nWarnings: ${result.warnings.length}`);
  if (result.warnings.length > 0) {
    result.warnings.slice(0, 5).forEach(w => console.log(`  ⚠ ${w}`));
  }

  // Import Run
  assert(ds.importRuns.length === 1, `1 import run`);
  const stats = ds.importRuns[0].import_statistics;
  assert(stats!.synthetic_records === 0, `Import stats show 0 synthetic records`);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
