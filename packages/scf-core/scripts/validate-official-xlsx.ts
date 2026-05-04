/**
 * Validate an official SCF XLSX workbook against the Aegis parser.
 * 
 * Usage:
 *   npx tsx packages/scf-core/scripts/validate-official-xlsx.ts <path-to-xlsx>
 * 
 * This script:
 * 1. Reads the XLSX file from disk
 * 2. Validates it with the xlsx-importer
 * 3. Parses it and outputs a detailed report
 * 4. Logs any warnings or format mismatches
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createXlsxScfImporter } from "../src/importers/xlsx-importer";

const main = async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx validate-official-xlsx.ts <path-to-xlsx>");
    process.exit(1);
  }

  const absolutePath = resolve(filePath);
  console.log(`\n📂 Loading: ${absolutePath}`);

  const buffer = readFileSync(absolutePath);
  const base64 = buffer.toString("base64");

  console.log(`📏 File size: ${(buffer.length / 1024).toFixed(1)} KB`);

  const importer = createXlsxScfImporter();

  // Step 1: Validate
  console.log(`\n🔍 Step 1: Validation...`);
  const validation = await importer.validate({
    source_type: "xlsx",
    source_filename: filePath.split(/[\\/]/).pop(),
    version_label: "auto-detect",
    content: base64
  });

  if (!validation.valid) {
    console.error("❌ VALIDATION FAILED:");
    validation.errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log("✅ Validation passed");
  if (validation.warnings.length > 0) {
    console.log(`⚠️  ${validation.warnings.length} warnings:`);
    validation.warnings.forEach(w => console.log(`   - ${w}`));
  }

  // Step 2: Parse
  console.log(`\n🔍 Step 2: Parsing...`);
  const result = await importer.parse({
    source_type: "xlsx",
    source_filename: filePath.split(/[\\/]/).pop(),
    version_label: "auto-detect",
    content: base64
  });

  const { dataset, warnings } = result;

  // Step 3: Report
  console.log(`\n📊 Parse Results:`);
  console.log(`   Versions:     ${dataset.versions.length}`);
  console.log(`   Domains:      ${dataset.domains.length}`);
  console.log(`   Controls:     ${dataset.controls.length}`);
  console.log(`   Frameworks:   ${dataset.frameworks.length}`);
  console.log(`   Requirements: ${dataset.requirements.length}`);
  console.log(`   Mappings:     ${dataset.mappings.length}`);
  console.log(`   STRM:         ${dataset.strmRelationships.length}`);
  console.log(`   Import Runs:  ${dataset.importRuns.length}`);

  if (dataset.domains.length > 0) {
    console.log(`\n📁 Domains (first 10):`);
    dataset.domains.slice(0, 10).forEach(d => 
      console.log(`   ${d.domain_code.padEnd(8)} ${d.domain_name}`)
    );
    if (dataset.domains.length > 10) {
      console.log(`   ... and ${dataset.domains.length - 10} more`);
    }
  }

  if (dataset.frameworks.length > 0) {
    console.log(`\n🏛️ Frameworks (first 10):`);
    dataset.frameworks.slice(0, 10).forEach(f => 
      console.log(`   ${f.framework_code.padEnd(20)} ${f.framework_name}`)
    );
    if (dataset.frameworks.length > 10) {
      console.log(`   ... and ${dataset.frameworks.length - 10} more`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} parse warnings:`);
    warnings.slice(0, 20).forEach(w => console.log(`   - ${w}`));
    if (warnings.length > 20) {
      console.log(`   ... and ${warnings.length - 20} more`);
    }
  }

  // Step 4: Import run stats
  if (dataset.importRuns.length > 0) {
    const run = dataset.importRuns[0];
    console.log(`\n📈 Import Run Statistics:`);
    const stats = run.import_statistics;
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }

  console.log(`\n✅ Validation complete. Ready for production import.`);
};

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
