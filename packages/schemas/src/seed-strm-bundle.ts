#!/usr/bin/env tsx
/**
 * STRM Bundle Seed Script
 *
 * Popula a tabela `scf_strm_relationships` com os tipos STRM oficiais da SCF,
 * a partir dos 183 XLSXs do STRM Bundle comprado em securecontrolsframework.com.
 *
 * Estratégia de join:
 *   1. Para cada entry do bundle (fde_code, scf_code):
 *      - Busca scf_framework_requirements WHERE requirement_code ILIKE fde_code
 *      - Busca scf_controls WHERE control_code ILIKE scf_code
 *      - Busca scf_mappings WHERE requirement_id AND control_id correspondem
 *   2. Upsert em scf_strm_relationships ON CONFLICT (scf_mapping_id) DO UPDATE
 *      com source = "scf_official_strm_bundle_2026.1"
 *      sobrescrevendo os registros inferidos (source = "inferred_structural_analysis_v1")
 *
 * Usage:
 *   DATABASE_URL="..." pnpm db:seed:strm
 *   pnpm db:seed:strm                    # usa .env
 *   pnpm db:seed:strm -- --dry-run       # parse + join, sem writes
 *   pnpm db:seed:strm -- --framework iso-27001  # filtrar por framework
 *
 * AGENTS.md compliance:
 *   - §8: source = "scf_official_strm_bundle_2026.1" — dado normativo oficial
 *   - §8: scf_version rastreada, source rastreável
 *   - §13: sem dados reais de cliente, apenas catalog data
 *   - §17: dados do bundle SCF são catalog data, não customer data
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, ilike, sql, count } from "drizzle-orm";
import * as schema from "./db/schema.js";
import { parseStrmBundleDirectory } from "../../scf-core/src/importers/strm-bundle-importer.js";

// ──── Configuration ────

const STRM_BUNDLE_DIR_CANDIDATES = [
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
    "assets",
    "strm",
  ),
];

const SOURCE_LABEL = "scf_official_strm_bundle_2026.1";
const BATCH_SIZE = 200;

// ──── CLI flags ────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FRAMEWORK_FILTER = (() => {
  const idx = args.indexOf("--framework");
  return idx !== -1 ? args[idx + 1] : undefined;
})();

// ──── Helpers ────

function banner(title: string) {
  const line = "═".repeat(54);
  console.log(`╔${line}╗`);
  console.log(`║  ${title.padEnd(52)}║`);
  console.log(`╚${line}╝`);
}

function elapsed(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ──── Main ────

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "❌ DATABASE_URL is required. Set it in .env or pass inline.",
    );
    process.exit(1);
  }

  banner("STRM Bundle Seed — Official SCF STRM Import");
  console.log();

  if (DRY_RUN) {
    console.log("  🏜️  DRY RUN MODE — will parse + join but NOT write to DB\n");
  }
  if (FRAMEWORK_FILTER) {
    console.log(`  🔍 Framework filter: "${FRAMEWORK_FILTER}"\n`);
  }

  // ── 1. Find STRM bundle directory ──
  const strmDir = STRM_BUNDLE_DIR_CANDIDATES.find((d) => fs.existsSync(d));
  if (!strmDir) {
    console.error(
      `❌ STRM bundle directory not found. Searched:\n${STRM_BUNDLE_DIR_CANDIDATES.map((d) => `   - ${d}`).join("\n")}`,
    );
    console.error(
      "   Copy the STRM bundle XLSXs to assets/strm/ and try again.",
    );
    process.exit(1);
  }

  const totalFiles = fs
    .readdirSync(strmDir)
    .filter((f) => f.endsWith(".xlsx")).length;
  console.log(`  📁 STRM bundle: ${strmDir}`);
  console.log(`     Files found: ${totalFiles}`);

  // ── 2. Parse bundle ──
  console.log("\n  ⚙️  Parsing STRM bundle XLSXs...");
  const parseStart = Date.now();

  const summary = parseStrmBundleDirectory(
    strmDir,
    FRAMEWORK_FILTER
      ? {
          fileFilter: (f: string) =>
            f.toLowerCase().includes(FRAMEWORK_FILTER!.toLowerCase()),
        }
      : {},
  );

  const parseMs = Date.now() - parseStart;
  console.log(`     Files parsed:    ${summary.total_files}`);
  console.log(
    `     Entries found:   ${summary.total_entries.toLocaleString()}`,
  );
  console.log(
    `     Skipped (N/A):   ${summary.total_skipped.toLocaleString()}`,
  );
  console.log(`     Warnings:        ${summary.total_warnings}`);
  console.log(`     Parse time:      ${elapsed(parseMs)}`);

  // Breakdown
  const breakdown: Record<string, number> = {};
  for (const file of summary.files) {
    for (const e of file.entries) {
      breakdown[e.relationship_type] =
        (breakdown[e.relationship_type] ?? 0) + 1;
    }
  }
  console.log("\n  📊 Relationship type breakdown:");
  for (const [t, n] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
    const pct = ((n / summary.total_entries) * 100).toFixed(1);
    console.log(`     ${t.padEnd(18)} ${String(n).padStart(7)} (${pct}%)`);
  }

  if (DRY_RUN) {
    console.log("\n  🏜️  DRY RUN complete. No database changes made.");
    return;
  }

  // ── 3. Connect to database ──
  console.log("\n  🔌 Connecting to database...");
  const client = postgres(databaseUrl, { ssl: "require", max: 3 });
  const db = drizzle(client, { schema });

  try {
    await db.execute(sql`SELECT 1`);
    console.log("     Connection OK ✓");

    // ── 4. Load lookup maps from DB ──
    console.log("\n  📖 Loading lookup tables from DB...");
    const lookupStart = Date.now();

    // Load all control_code → id mappings
    const controlRows = await db
      .select({
        id: schema.scfControls.id,
        code: schema.scfControls.controlCode,
      })
      .from(schema.scfControls);

    const controlCodeToId = new Map<string, string>(
      controlRows.map((r) => [r.code.trim().toLowerCase(), r.id]),
    );
    console.log(`     Controls loaded: ${controlCodeToId.size}`);

    // Load all requirement_code → id mappings
    const reqRows = await db
      .select({
        id: schema.scfFrameworkRequirements.id,
        code: schema.scfFrameworkRequirements.requirementCode,
      })
      .from(schema.scfFrameworkRequirements);

    const reqCodeToId = new Map<string, string>(
      reqRows.map((r) => [r.code.trim().toLowerCase(), r.id]),
    );
    console.log(`     Requirements loaded: ${reqCodeToId.size}`);

    // Load all (requirement_id, control_id) → mapping_id
    const mappingRows = await db
      .select({
        id: schema.scfMappings.id,
        reqId: schema.scfMappings.scfFrameworkRequirementId,
        ctrlId: schema.scfMappings.scfControlId,
      })
      .from(schema.scfMappings);

    // Composite key: reqId|ctrlId → mapping_id
    const mappingKey = (reqId: string, ctrlId: string) => `${reqId}|${ctrlId}`;
    const mappingKeyToId = new Map<string, string>(
      mappingRows.map((r) => [mappingKey(r.reqId, r.ctrlId), r.id]),
    );
    console.log(`     Mappings loaded: ${mappingKeyToId.size}`);
    console.log(`     Lookup time:     ${elapsed(Date.now() - lookupStart)}`);

    // ── 5. Build STRM upsert records ──
    console.log("\n  🔗 Joining STRM entries with DB mappings...");
    const joinStart = Date.now();

    type UpsertRow = {
      scf_mapping_id: string;
      relationship_type: string;
      relationship_strength: string;
      rationale: string | null;
      source: string;
    };

    const toUpsert: UpsertRow[] = [];
    let notFound = 0;
    let noControl = 0;
    let noReq = 0;
    const unknownControls = new Set<string>();
    const unknownReqs = new Set<string>();

    for (const file of summary.files) {
      for (const entry of file.entries) {
        const controlId = controlCodeToId.get(
          entry.scf_code.trim().toLowerCase(),
        );
        if (!controlId) {
          noControl++;
          unknownControls.add(entry.scf_code);
          continue;
        }

        const reqId = reqCodeToId.get(entry.fde_code.trim().toLowerCase());
        if (!reqId) {
          noReq++;
          unknownReqs.add(entry.fde_code);
          continue;
        }

        const mappingId = mappingKeyToId.get(mappingKey(reqId, controlId));
        if (!mappingId) {
          notFound++;
          continue;
        }

        toUpsert.push({
          scf_mapping_id: mappingId,
          relationship_type: entry.relationship_type,
          relationship_strength: entry.relationship_strength,
          rationale: entry.strm_rationale || null,
          source: SOURCE_LABEL,
        });
      }
    }

    const joinMs = Date.now() - joinStart;
    console.log(`     Matched:         ${toUpsert.length.toLocaleString()}`);
    console.log(
      `     No control match: ${noControl} (${unknownControls.size} unique SCF codes)`,
    );
    console.log(
      `     No req match:     ${noReq} (${unknownReqs.size} unique FDE codes)`,
    );
    console.log(`     No mapping match: ${notFound}`);
    console.log(`     Join time:        ${elapsed(joinMs)}`);

    if (toUpsert.length === 0) {
      console.warn(
        "\n  ⚠️  No records to upsert. Check that the SCF catalog has been seeded first.",
      );
      console.warn("     Run: pnpm db:seed:scf\n");
      return;
    }

    // ── 6. Upsert into scf_strm_relationships ──
    console.log(
      `\n  💾 Upserting ${toUpsert.length.toLocaleString()} STRM relationships...`,
    );
    const writeStart = Date.now();

    // Deduplicate by scf_mapping_id (keep last, official wins)
    const deduped = new Map<string, UpsertRow>();
    for (const row of toUpsert) {
      deduped.set(row.scf_mapping_id, row);
    }
    const dedupedRows = [...deduped.values()];
    console.log(
      `     After dedup:     ${dedupedRows.length.toLocaleString()} unique mappings`,
    );

    let batchCount = 0;
    for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
      const batch = dedupedRows.slice(i, i + BATCH_SIZE);
      await db
        .insert(schema.scfStrmRelationships)
        .values(
          batch.map((row) => ({
            scfMappingId: row.scf_mapping_id,
            relationshipType: row.relationship_type,
            relationshipStrength: row.relationship_strength,
            rationale: row.rationale,
            source: row.source,
          })),
        )
        .onConflictDoUpdate({
          target: schema.scfStrmRelationships.scfMappingId,
          set: {
            relationshipType: sql`EXCLUDED.relationship_type`,
            relationshipStrength: sql`EXCLUDED.relationship_strength`,
            rationale: sql`EXCLUDED.rationale`,
            source: sql`EXCLUDED.source`,
            updatedAt: new Date(),
          },
        });

      batchCount++;
      if (batchCount % 10 === 0) {
        const pct = Math.floor((i / dedupedRows.length) * 100);
        process.stdout.write(
          `\r     Progress: ${pct}% (${i.toLocaleString()}/${dedupedRows.length.toLocaleString()})`,
        );
      }
    }
    process.stdout.write(
      `\r     Progress: 100% (${dedupedRows.length.toLocaleString()}/${dedupedRows.length.toLocaleString()})\n`,
    );

    const writeMs = Date.now() - writeStart;
    console.log(`     Write time:      ${elapsed(writeMs)}`);

    // ── 7. Verify ──
    console.log("\n  🔍 Post-import verification...");
    const [strmCount] = await db
      .select({ count: count() })
      .from(schema.scfStrmRelationships);
    const [officialCount] = await db
      .select({ count: count() })
      .from(schema.scfStrmRelationships)
      .where(eq(schema.scfStrmRelationships.source, SOURCE_LABEL));
    const [inferredCount] = await db
      .select({ count: count() })
      .from(schema.scfStrmRelationships)
      .where(ilike(schema.scfStrmRelationships.source, "inferred_%"));

    console.log(
      `     scf_strm_relationships total:    ${strmCount?.count ?? 0}`,
    );
    console.log(
      `     source = official (this run):    ${officialCount?.count ?? 0}`,
    );
    console.log(
      `     source = inferred (remaining):   ${inferredCount?.count ?? 0}`,
    );

    // ── 8. Summary ──
    console.log();
    banner("✅ STRM Bundle Seed — Complete!");
    console.log(`  Source:          ${SOURCE_LABEL}`);
    console.log(`  Files processed: ${summary.total_files}`);
    console.log(`  Entries parsed:  ${summary.total_entries.toLocaleString()}`);
    console.log(`  DB upserted:     ${dedupedRows.length.toLocaleString()}`);
    console.log(`  Unmatched:       ${notFound + noControl + noReq}`);
    console.log(`  Parse time:      ${elapsed(parseMs)}`);
    console.log(`  Write time:      ${elapsed(writeMs)}`);
    console.log(`  Total time:      ${elapsed(parseMs + joinMs + writeMs)}`);
    console.log();
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ STRM Bundle Seed failed:", err);
  process.exit(1);
});
