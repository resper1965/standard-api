#!/usr/bin/env tsx
/**
 * STRM Bundle Seed Script — v2
 *
 * Popula `scf_strm_relationships` com os tipos STRM oficiais da SCF a partir
 * dos 183 XLSXs do STRM Bundle.
 *
 * Estratégia v2 (sem dependência de scf_framework_requirements):
 *   Para cada entry do bundle (fde_code, scf_code, relationship_type):
 *     1. Resolve scf_control_id via control_code ILIKE scf_code
 *     2. Upsert em scf_strm_relationships (scf_control_id, fde_code) com
 *        ON CONFLICT (scf_control_id, fde_code) DO UPDATE
 *     3. Opcionalmente resolve scf_mapping_id para backward-compat
 *
 * Isso garante 100% das entries do bundle sejam preservadas, independente
 * de existir ou não um scf_framework_requirement com fde_code correspondente.
 *
 * AGENTS.md compliance:
 *   - §8: source = "scf_official_strm_bundle_2026.1" — dado normativo oficial
 *   - §8: scf_version rastreada, source rastreável
 *   - §13: sem dados reais de cliente, apenas catalog data
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { eq, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./db/schema.js";
import { parseStrmBundleDirectory } from "../../scf-core/src/importers/strm-bundle-importer.js";

// ──── Configuration ────

const STRM_BUNDLE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../assets/strm",
);

const SOURCE_LABEL = "scf_official_strm_bundle_2026.1";
const BATCH_SIZE = 500;

// ──── CLI flags ────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FRAMEWORK_FILTER = (() => {
  const idx = args.indexOf("--framework");
  return idx !== -1 ? args[idx + 1] : undefined;
})();

// ──── Helpers ────

function banner(title: string) {
  const line = "═".repeat(56);
  console.log(`╔${line}╗`);
  console.log(`║  ${title.padEnd(54)}║`);
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
    console.error("❌ DATABASE_URL is required.");
    process.exit(1);
  }

  banner("STRM Bundle Seed v2 — Official SCF STRM Import");
  console.log();

  if (DRY_RUN) {
    console.log("  🏜️  DRY RUN MODE — parse only, no DB writes\n");
  }
  if (FRAMEWORK_FILTER) {
    console.log(`  🔍 Framework filter: "${FRAMEWORK_FILTER}"\n`);
  }

  if (!fs.existsSync(STRM_BUNDLE_DIR)) {
    console.error(`❌ STRM directory not found: ${STRM_BUNDLE_DIR}`);
    process.exit(1);
  }

  const totalFiles = fs
    .readdirSync(STRM_BUNDLE_DIR)
    .filter((f) => f.endsWith(".xlsx")).length;
  console.log(`  📁 STRM bundle: ${STRM_BUNDLE_DIR}`);
  console.log(`     Files found: ${totalFiles}`);

  // ── 1. Parse bundle ──
  console.log("\n  ⚙️  Parsing STRM bundle XLSXs...");
  const parseStart = Date.now();

  const summary = parseStrmBundleDirectory(
    STRM_BUNDLE_DIR,
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

  // Relationship type breakdown
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

  // ── 2. Connect to database ──
  console.log("\n  🔌 Connecting to database...");
  const client = postgres(databaseUrl, { ssl: "require", max: 5 });
  const db = drizzle(client, { schema });

  try {
    await db.execute(sql`SELECT 1`);
    console.log("     Connection OK ✓");

    // ── 3. Load SCF control lookup ──
    console.log("\n  📖 Loading SCF controls from DB...");
    const controlRows = await db
      .select({
        id: schema.scfControls.id,
        code: schema.scfControls.controlCode,
      })
      .from(schema.scfControls);

    const controlCodeToId = new Map<string, string>(
      controlRows.map((r) => [r.code.trim().toUpperCase(), r.id]),
    );
    console.log(`     Controls loaded: ${controlCodeToId.size}`);

    // ── 4. Optionally load mapping lookup for backward-compat scf_mapping_id ──
    const mappingRows = await db
      .select({
        id: schema.scfMappings.id,
        ctrlId: schema.scfMappings.scfControlId,
        reqId: schema.scfMappings.scfFrameworkRequirementId,
      })
      .from(schema.scfMappings);

    // ctrlId → [mapping_id, ...] (may be multiple per control)
    const ctrlToMappingIds = new Map<string, string[]>();
    for (const m of mappingRows) {
      const list = ctrlToMappingIds.get(m.ctrlId) ?? [];
      list.push(m.id);
      ctrlToMappingIds.set(m.ctrlId, list);
    }
    console.log(`     Mappings loaded: ${mappingRows.length}`);

    // ── 5. Build upsert records ──
    console.log("\n  🔗 Resolving STRM entries against DB controls...");
    const joinStart = Date.now();

    type UpsertRow = {
      scf_control_id: string;
      fde_code: string;
      fde_name: string;
      relationship_type: string;
      relationship_strength: string;
      rationale: string | null;
      source: string;
      scf_mapping_id: string | null;
    };

    // Deduplicate by (scf_control_id, fde_code) — last entry wins (official)
    const deduped = new Map<string, UpsertRow>();
    let noControl = 0;
    const unknownControls = new Set<string>();

    for (const file of summary.files) {
      for (const entry of file.entries) {
        const controlId = controlCodeToId.get(
          entry.scf_code.trim().toUpperCase(),
        );
        if (!controlId) {
          noControl++;
          unknownControls.add(entry.scf_code);
          continue;
        }

        const dedupeKey = `${controlId}||${entry.fde_code.trim().toLowerCase()}`;

        // Try to find a matching scf_mapping for backward-compat
        const mappingId = ctrlToMappingIds.get(controlId)?.[0] ?? null;

        deduped.set(dedupeKey, {
          scf_control_id: controlId,
          fde_code: entry.fde_code.trim(),
          fde_name: entry.fde_name.trim(),
          relationship_type: entry.relationship_type,
          relationship_strength: entry.relationship_strength,
          rationale: entry.strm_rationale || null,
          source: SOURCE_LABEL,
          scf_mapping_id: mappingId,
        });
      }
    }

    const rows = [...deduped.values()];
    const joinMs = Date.now() - joinStart;

    const matched = rows.length;
    const total = summary.total_entries;
    const matchPct = ((matched / total) * 100).toFixed(1);

    console.log(`     Bundle entries:  ${total.toLocaleString()}`);
    console.log(
      `     Matched:         ${matched.toLocaleString()} (${matchPct}%)`,
    );
    console.log(
      `     No control:      ${noControl} (${unknownControls.size} unique)`,
    );
    console.log(`     Join time:       ${elapsed(joinMs)}`);

    if (rows.length === 0) {
      console.warn(
        "\n  ⚠️  No records to upsert. Check SCF catalog is seeded first.",
      );
      return;
    }

    // ── 6. Upsert ──
    console.log(
      `\n  💾 Upserting ${rows.length.toLocaleString()} STRM relationships...`,
    );
    const writeStart = Date.now();

    // Truncate existing official STRM records before re-seeding for clean state
    if (!FRAMEWORK_FILTER) {
      await db
        .delete(schema.scfStrmRelationships)
        .where(eq(schema.scfStrmRelationships.source, SOURCE_LABEL));
      console.log("     Cleared previous official STRM records.");
    }

    let batchCount = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await db
        .insert(schema.scfStrmRelationships)
        .values(
          batch.map((row) => ({
            scfControlId: row.scf_control_id,
            fdeCode: row.fde_code,
            fdeName: row.fde_name,
            scfMappingId: row.scf_mapping_id,
            relationshipType: row.relationship_type,
            relationshipStrength: row.relationship_strength,
            rationale: row.rationale,
            source: row.source,
          })),
        )
        .onConflictDoUpdate({
          target: [
            schema.scfStrmRelationships.scfControlId,
            schema.scfStrmRelationships.fdeCode,
          ],
          set: {
            fdeName: sql`EXCLUDED.fde_name`,
            scfMappingId: sql`EXCLUDED.scf_mapping_id`,
            relationshipType: sql`EXCLUDED.relationship_type`,
            relationshipStrength: sql`EXCLUDED.relationship_strength`,
            rationale: sql`EXCLUDED.rationale`,
            source: sql`EXCLUDED.source`,
            updatedAt: new Date(),
          },
        });

      batchCount++;
      if (batchCount % 5 === 0) {
        const pct = Math.floor((i / rows.length) * 100);
        process.stdout.write(
          `\r     Progress: ${pct}% (${(i + BATCH_SIZE).toLocaleString()}/${rows.length.toLocaleString()})`,
        );
      }
    }
    process.stdout.write(
      `\r     Progress: 100% (${rows.length.toLocaleString()}/${rows.length.toLocaleString()})\n`,
    );

    const writeMs = Date.now() - writeStart;
    console.log(`     Write time:      ${elapsed(writeMs)}`);

    // ── 7. Verify ──
    console.log("\n  🔍 Post-import verification...");
    const [totalCount] = await db
      .select({ count: count() })
      .from(schema.scfStrmRelationships);
    const [officialCount] = await db
      .select({ count: count() })
      .from(schema.scfStrmRelationships)
      .where(eq(schema.scfStrmRelationships.source, SOURCE_LABEL));

    // Coverage by relationship type
    const typeBreakdown = await client`
      SELECT relationship_type, COUNT(*) as n
      FROM scf_strm_relationships
      WHERE source = ${SOURCE_LABEL}
      GROUP BY relationship_type
      ORDER BY n DESC
    `;

    console.log(`     Total STRM records:   ${totalCount?.count ?? 0}`);
    console.log(`     Official (this run):  ${officialCount?.count ?? 0}`);
    console.log(`     By type:`);
    for (const row of typeBreakdown) {
      console.log(
        `       ${String(row.relationship_type).padEnd(16)} ${row.n}`,
      );
    }

    // ── 8. Summary ──
    console.log();
    banner("✅ STRM Bundle Seed v2 — Complete!");
    console.log(`  Source:          ${SOURCE_LABEL}`);
    console.log(`  Files processed: ${summary.total_files}`);
    console.log(`  Entries parsed:  ${summary.total_entries.toLocaleString()}`);
    console.log(`  DB upserted:     ${rows.length.toLocaleString()}`);
    console.log(`  Coverage:        ${matchPct}% of parsed entries`);
    console.log(`  No control:      ${noControl}`);
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
