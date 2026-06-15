// @ts-nocheck -- Zod v4 CI type compat
#!/usr/bin/env tsx
/**
 * SCF Catalog Seed Script
 *
 * Imports the official SCF XLSX workbook into the database using the
 * production-grade xlsx-importer + Drizzle SCF repository pipeline.
 *
 * This replaces synthetic SCF data with the real SCF 2026.1.1 catalog
 * including all domains, controls, crosswalk frameworks, requirements,
 * and official mappings.
 *
 * Usage:
 *   DATABASE_URL="..." pnpm db:seed:scf
 *   pnpm db:seed:scf                      # uses .env
 *   pnpm db:seed:scf -- --dry-run         # parse only, no DB writes
 *   pnpm db:seed:scf -- --force           # replace existing version
 *
 * AGENTS.md compliance:
 *   - Â§8: SCF structured data is normative (not synthetic)
 *   - Â§8: scf_version tracked, is_synthetic = false
 *   - Â§14: Synthetic data only in evals/fixtures, not here
 *   - Â§17: No real customer data â€” this is framework catalog data
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql, count } from "drizzle-orm";
import * as schema from "./db/schema";
import {
  createXlsxScfImporter,
  createDrizzleScfRepository,
  ScfImportService,
} from "@standard/scf-core";

// â”€â”€â”€â”€ Configuration â”€â”€â”€â”€

const SCF_XLSX_FILENAME = "Secure Controls Framework (SCF) - 2026.1.1.xlsx";
const SCF_VERSION_LABEL = "2026.1.1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const XLSX_PATHS = [
  path.resolve(__dirname, "../../..", "assets", SCF_XLSX_FILENAME),
  path.resolve(__dirname, "../../..", "evals", "fixtures", "scf-2026.1.1.xlsx"),
];

// â”€â”€â”€â”€ CLI Flags â”€â”€â”€â”€

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

// â”€â”€â”€â”€ Main â”€â”€â”€â”€

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "âŒ DATABASE_URL is required. Set it in .env or pass inline.",
    );
    process.exit(1);
  }

  console.log("â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—");
  console.log("â•‘  SCF Catalog Seed â€” Official XLSX Import Pipeline   â•‘");
  console.log("â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
  console.log();

  if (DRY_RUN) {
    console.log(
      "  ðŸœï¸  DRY RUN MODE â€” will parse XLSX but NOT write to database\n",
    );
  }

  // â”€â”€ 1. Find XLSX file â”€â”€
  const xlsxPath = XLSX_PATHS.find((p) => fs.existsSync(p));
  if (!xlsxPath) {
    console.error(
      `âŒ SCF XLSX not found. Searched:\n${XLSX_PATHS.map((p) => `   - ${p}`).join("\n")}`,
    );
    process.exit(1);
  }
  console.log(`  ðŸ“„ XLSX found: ${xlsxPath}`);
  const fileStats = fs.statSync(xlsxPath);
  console.log(`     Size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

  // â”€â”€ 2. Read and encode as base64 â”€â”€
  console.log("  ðŸ“– Reading XLSX file...");
  const fileBuffer = fs.readFileSync(xlsxPath);
  const base64Content = fileBuffer.toString("base64");
  console.log(
    `     Base64 length: ${(base64Content.length / 1024 / 1024).toFixed(2)} MB`,
  );

  // â”€â”€ 3. Connect to database â”€â”€
  console.log("  ðŸ”Œ Connecting to database...");
  const client = postgres(databaseUrl, { ssl: "require", max: 1 });
  const db = drizzle(client, { schema });

  try {
    // Quick connectivity check
    const [pingResult] = await db.execute(sql`SELECT 1 as ping`);
    console.log("     Connection OK âœ“");

    // â”€â”€ 4. Check for existing version â”€â”€
    console.log(
      `  ðŸ” Checking for existing SCF version "${SCF_VERSION_LABEL}"...`,
    );
    const [existingVersion] = await db
      .select()
      .from(schema.scfVersions)
      .where(eq(schema.scfVersions.version, SCF_VERSION_LABEL))
      .limit(1);

    if (existingVersion && !FORCE) {
      console.log(
        `  âš ï¸  Version "${SCF_VERSION_LABEL}" already exists (id: ${existingVersion.id}).`,
      );
      console.log(
        "     Use --force to replace, or delete the existing version first.",
      );

      // Still show current counts for verification
      await printCurrentCounts(db);
      console.log("\nâœ… No changes made. Database already has SCF catalog.");
      return;
    }

    if (existingVersion && FORCE) {
      console.log(
        `  ðŸ—‘ï¸  FORCE mode: will upsert over existing version ${existingVersion.id}`,
      );
    }

    // â”€â”€ 5. Parse XLSX â”€â”€
    console.log("\n  âš™ï¸  Parsing XLSX with xlsx-importer...");
    const startParse = Date.now();
    const importer = createXlsxScfImporter();

    const source = {
      source_type: "xlsx" as const,
      content: base64Content,
      source_filename: SCF_XLSX_FILENAME,
      version_label: SCF_VERSION_LABEL,
    };

    // Validate first
    const validation = await importer.validate(source);
    if (!validation.valid) {
      console.error("âŒ XLSX validation failed:");
      validation.errors.forEach((e: string) => console.error(`   - ${e}`));
      process.exit(1);
    }
    if (validation.warnings.length > 0) {
      console.log("  âš ï¸  Validation warnings:");
      validation.warnings.forEach((w: string) => console.log(`     - ${w}`));
    }

    // Parse
    const parsed = await importer.parse(source);
    const parseMs = Date.now() - startParse;
    const ds = parsed.dataset;

    console.log(`\n  ðŸ“Š Parse Results (${parseMs}ms):`);
    console.log(`     Versions:     ${ds.versions.length}`);
    console.log(`     Domains:      ${ds.domains.length}`);
    console.log(`     Controls:     ${ds.controls.length}`);
    console.log(`     Frameworks:   ${ds.frameworks.length}`);
    console.log(`     Requirements: ${ds.requirements.length}`);
    console.log(`     Mappings:     ${ds.mappings.length}`);
    console.log(`     STRM Rels:    ${ds.strmRelationships.length}`);
    console.log(`     Import Runs:  ${ds.importRuns.length}`);
    console.log(`     AOs:          ${ds.assessmentObjectives?.length ?? 0}`);
    console.log(`     Evidence Reqs:${ds.evidenceRequests?.length ?? 0}`);
    console.log(`     Maturity:     ${ds.maturityCriteria?.length ?? 0}`);
    console.log(`     Risks:        ${ds.risks?.length ?? 0}`);
    console.log(`     Threats:      ${ds.threats?.length ?? 0}`);

    if (parsed.warnings.length > 0) {
      const shown = parsed.warnings.slice(0, 10);
      console.log(
        `\n  âš ï¸  Parse warnings (${parsed.warnings.length} total, showing first 10):`,
      );
      shown.forEach((w: string) => console.log(`     - ${w}`));
      if (parsed.warnings.length > 10) {
        console.log(`     ... and ${parsed.warnings.length - 10} more`);
      }
    }

    // â”€â”€ 6. Quality gate â”€â”€
    if (ds.controls.length < 100) {
      console.error(
        `\nâŒ Quality gate failed: only ${ds.controls.length} controls parsed (expected 1000+).`,
      );
      console.error(
        "   The XLSX may be malformed or the parser needs adjustment.",
      );
      process.exit(1);
    }

    if (DRY_RUN) {
      console.log("\n  ðŸœï¸  DRY RUN complete. No database changes made.");
      console.log(
        `     Would insert: ${ds.domains.length} domains, ${ds.controls.length} controls, ${ds.frameworks.length} frameworks`,
      );
      return;
    }

    // â”€â”€ 7. Persist to database â”€â”€
    console.log("\n  ðŸ’¾ Writing to database...");
    const startWrite = Date.now();

    // If FORCE and version exists, we need to allow the import service to handle it
    // Use the Drizzle repository directly since importFromSource checks for duplicates
    const scfRepo = createDrizzleScfRepository(db as any);

    // If forcing and version exists, remap ALL IDs to match existing records
    if (existingVersion && FORCE) {
      const existingVersionId = existingVersion.id;
      console.log(
        `     Remapping IDs to existing version ${existingVersionId}...`,
      );

      // 1. Remap version ID
      ds.versions[0]!.id = existingVersionId;
      for (const d of ds.domains) d.scf_version_id = existingVersionId;
      for (const c of ds.controls) c.scf_version_id = existingVersionId;
      for (const m of ds.mappings) m.scf_version_id = existingVersionId;
      for (const ir of ds.importRuns) ir.scf_version_id = existingVersionId;

      // 2. Remap domain IDs to existing DB domain IDs
      const existingDomains = await db
        .select({
          id: schema.scfDomains.id,
          code: schema.scfDomains.domainCode,
        })
        .from(schema.scfDomains)
        .where(eq(schema.scfDomains.scfVersionId, existingVersionId));

      const domainCodeToExistingId = new Map(
        existingDomains.map((d) => [d.code, d.id]),
      );
      const domainOldToNew = new Map<string, string>();

      for (const d of ds.domains) {
        const existingId = domainCodeToExistingId.get(d.domain_code);
        if (existingId) {
          domainOldToNew.set(d.id, existingId);
          d.id = existingId;
        }
      }
      console.log(`     Remapped ${domainOldToNew.size} domain IDs`);

      // 3. Remap control IDs to existing DB control IDs
      const existingControls = await db
        .select({
          id: schema.scfControls.id,
          code: schema.scfControls.controlCode,
        })
        .from(schema.scfControls)
        .where(eq(schema.scfControls.scfVersionId, existingVersionId));

      const controlCodeToExistingId = new Map(
        existingControls.map((c) => [c.code, c.id]),
      );
      const controlOldToNew = new Map<string, string>();

      for (const c of ds.controls) {
        const existingId = controlCodeToExistingId.get(c.control_code);
        if (existingId) {
          controlOldToNew.set(c.id, existingId);
          c.id = existingId;
        }
        // Also remap domain FK
        const newDomainId = domainOldToNew.get(c.scf_domain_id);
        if (newDomainId) c.scf_domain_id = newDomainId;
      }
      console.log(`     Remapped ${controlOldToNew.size} control IDs`);

      // 4. Remap mapping FKs
      for (const m of ds.mappings) {
        const newControlId = controlOldToNew.get(m.scf_control_id);
        if (newControlId) m.scf_control_id = newControlId;
      }

      // 5. Remap risk IDs to existing DB risk IDs
      const existingRisks = await db
        .select({
          id: schema.scfRisks.id,
          code: schema.scfRisks.riskCode,
        })
        .from(schema.scfRisks)
        .where(eq(schema.scfRisks.scfVersionId, existingVersionId));

      const riskCodeToExistingId = new Map(
        existingRisks.map((r) => [r.code.toUpperCase(), r.id]),
      );
      const riskOldToNew = new Map<string, string>();

      if (ds.risks) {
        for (const r of ds.risks) {
          r.scf_version_id = existingVersionId;
          const existingId = riskCodeToExistingId.get(
            r.risk_code.toUpperCase(),
          );
          if (existingId) {
            riskOldToNew.set(r.id, existingId);
            r.id = existingId;
          }
        }
      }

      // 6. Remap threat IDs to existing DB threat IDs
      const existingThreats = await db
        .select({
          id: schema.scfThreats.id,
          code: schema.scfThreats.threatCode,
        })
        .from(schema.scfThreats)
        .where(eq(schema.scfThreats.scfVersionId, existingVersionId));

      const threatCodeToExistingId = new Map(
        existingThreats.map((t) => [t.code.toUpperCase(), t.id]),
      );
      const threatOldToNew = new Map<string, string>();

      if (ds.threats) {
        for (const t of ds.threats) {
          t.scf_version_id = existingVersionId;
          const existingId = threatCodeToExistingId.get(
            t.threat_code.toUpperCase(),
          );
          if (existingId) {
            threatOldToNew.set(t.id, existingId);
            t.id = existingId;
          }
        }
      }

      // 7. Remap Assessment Objectives FKs
      if (ds.assessmentObjectives) {
        for (const ao of ds.assessmentObjectives) {
          ao.scf_version_id = existingVersionId;
          const newControlId = controlOldToNew.get(ao.scf_control_id);
          if (newControlId) ao.scf_control_id = newControlId;
        }
      }

      // 8. Remap Evidence Requests FKs
      if (ds.evidenceRequests) {
        for (const er of ds.evidenceRequests) {
          er.scf_version_id = existingVersionId;
          const newControlId = controlOldToNew.get(er.scf_control_id);
          if (newControlId) er.scf_control_id = newControlId;
        }
      }

      // 9. Remap Maturity Criteria FKs
      if (ds.maturityCriteria) {
        for (const mc of ds.maturityCriteria) {
          mc.scf_version_id = existingVersionId;
          const newControlId = controlOldToNew.get(mc.scf_control_id);
          if (newControlId) mc.scf_control_id = newControlId;
        }
      }

      // 10. Remap Risk Control Mappings FKs
      if (ds.riskControlMappings) {
        for (const rcm of ds.riskControlMappings) {
          rcm.scf_version_id = existingVersionId;
          const newControlId = controlOldToNew.get(rcm.scf_control_id);
          if (newControlId) rcm.scf_control_id = newControlId;
          const newRiskId = riskOldToNew.get(rcm.scf_risk_id);
          if (newRiskId) rcm.scf_risk_id = newRiskId;
        }
      }

      // 11. Remap Threat Control Mappings FKs
      if (ds.threatControlMappings) {
        for (const tcm of ds.threatControlMappings) {
          tcm.scf_version_id = existingVersionId;
          const newControlId = controlOldToNew.get(tcm.scf_control_id);
          if (newControlId) tcm.scf_control_id = newControlId;
          const newThreatId = threatOldToNew.get(tcm.scf_threat_id);
          if (newThreatId) tcm.scf_threat_id = newThreatId;
        }
      }
    }

    console.log("     Starting upsert...");
    await scfRepo.replaceDataset(ds);

    const writeMs = Date.now() - startWrite;
    console.log(`     Write completed in ${writeMs}ms`);

    // â”€â”€ 8. Verify â”€â”€
    console.log("\n  ðŸ” Post-import verification...");
    await printCurrentCounts(db);

    // Verify version label
    const [finalVersion] = await db
      .select()
      .from(schema.scfVersions)
      .where(eq(schema.scfVersions.version, SCF_VERSION_LABEL))
      .limit(1);

    if (!finalVersion) {
      console.error("âŒ Version not found after import! Something went wrong.");
      process.exit(1);
    }

    // â”€â”€ 9. Summary â”€â”€
    console.log("\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—");
    console.log("â•‘  âœ… SCF Catalog Import â€” Complete!                  â•‘");
    console.log("â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•");
    console.log(`  Version:      ${finalVersion.version} (${finalVersion.id})`);
    console.log(`  Parse time:   ${parseMs}ms`);
    console.log(`  Write time:   ${writeMs}ms`);
    console.log(`  Total time:   ${parseMs + writeMs}ms`);
    console.log(`  Domains:      ${ds.domains.length}`);
    console.log(`  Controls:     ${ds.controls.length}`);
    console.log(`  Frameworks:   ${ds.frameworks.length}`);
    console.log(`  Requirements: ${ds.requirements.length}`);
    console.log(`  Mappings:     ${ds.mappings.length}`);
    console.log(`  AOs:          ${ds.assessmentObjectives?.length ?? 0}`);
    console.log(`  Evidence Reqs:${ds.evidenceRequests?.length ?? 0}`);
    console.log(`  Maturity:     ${ds.maturityCriteria?.length ?? 0}`);
    console.log(`  Risks:        ${ds.risks?.length ?? 0}`);
    console.log(`  Threats:      ${ds.threats?.length ?? 0}`);
    console.log();
  } finally {
    await client.end();
  }
}

async function printCurrentCounts(db: ReturnType<typeof drizzle>) {
  const queries = [
    { name: "scf_versions", table: schema.scfVersions },
    { name: "scf_domains", table: schema.scfDomains },
    { name: "scf_controls", table: schema.scfControls },
    { name: "scf_frameworks", table: schema.scfFrameworks },
    {
      name: "scf_framework_requirements",
      table: schema.scfFrameworkRequirements,
    },
    { name: "scf_mappings", table: schema.scfMappings },
  ] as const;

  for (const q of queries) {
    const [result] = await db.select({ count: count() }).from(q.table);
    console.log(`     ${q.name}: ${result?.count ?? 0} rows`);
  }
}

main().catch((err) => {
  console.error("âŒ SCF Catalog Seed failed:", err);
  process.exit(1);
});

