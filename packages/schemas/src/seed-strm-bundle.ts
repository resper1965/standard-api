#!/usr/bin/env tsx
/**
 * STRM Bundle Seed Script â€” v2
 *
 * Popula `scf_strm_relationships` com os tipos STRM oficiais da SCF a partir
 * dos 183 XLSXs do STRM Bundle.
 *
 * EstratÃ©gia (sem dependÃªncia de scf_framework_requirements):
 *   Para cada entry do bundle (fde_code, scf_code, relationship_type):
 *     1. Resolve scf_control_id via control_code ILIKE scf_code
 *     2. Registra o focal document (nome do arquivo XLSX â€” um por framework) e
 *        resolve o framework por nome exato; nÃ£o resolvido fica NULL
 *     3. Upsert em (scf_control_id, fde_code, focal_document) â€” a chave da 0060
 *
 * Um FDE code sÃ³ Ã© Ãºnico dentro do seu focal document: "1.1.1" existe no CIS e
 * no PCI DSS. Sem o focal document na chave, o Ãºltimo dos 183 arquivos lido
 * sobrescrevia o operador de todos os frameworks anteriores.
 *
 * AGENTS.md compliance:
 *   - Â§8: source = "scf_official_strm_bundle_2026.1" â€” dado normativo oficial
 *   - Â§8: scf_version rastreada, source rastreÃ¡vel
 *   - Â§13: sem dados reais de cliente, apenas catalog data
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { eq, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./db/schema.js";
import { parseStrmBundleDirectory } from "../../scf-core/src/importers/strm-bundle-importer.js";
import {
  toCanonicalOperator,
  type StrmOperator,
} from "../../scf-core/src/importers/strm-operator.js";
import {
  strmDedupeKey,
  normaliseFrameworkKey,
  resolveFrameworkId,
  pickUnambiguousMappingId,
  buildFrameworkByName,
} from "./strm-focal-document.js";

// â”€â”€â”€â”€ Configuration â”€â”€â”€â”€

/**
 * Parse a STRM strength value from the source bundle.
 *
 * Returns null for anything that is not a finite number, so an unquantified or
 * malformed source value never becomes a confident-looking 0.500.
 */
/**
 * Normalise the bundle's 0-10 strength onto the 0.0-1.0 scale the column
 * stores. Anything outside that range, or not a number, stays null rather
 * than becoming a fabricated value.
 *
 * The bundle's own `relationship_strength` is the enum the importer derives
 * (strong/moderate/weak), not a number. Parsing that string is what used to
 * yield NaN and, through a `|| 0.5` fallback, publish 0.500 on every single
 * official row.
 */
const parseStrength = (raw?: number | null): string | null =>
  typeof raw === "number" && raw >= 0 && raw <= 10
    ? (raw / 10).toFixed(3)
    : null;

const STRM_BUNDLE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../assets/strm",
);

const SOURCE_LABEL = "scf_official_strm_bundle_2026.1";
const BATCH_SIZE = 500;

// â”€â”€â”€â”€ CLI flags â”€â”€â”€â”€

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FRAMEWORK_FILTER = (() => {
  const idx = args.indexOf("--framework");
  return idx !== -1 ? args[idx + 1] : undefined;
})();

// â”€â”€â”€â”€ Helpers â”€â”€â”€â”€

function banner(title: string) {
  const line = "â•".repeat(56);
  console.log(`â•”${line}â•—`);
  console.log(`â•‘  ${title.padEnd(54)}â•‘`);
  console.log(`â•š${line}â•`);
}

function elapsed(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// â”€â”€â”€â”€ Main â”€â”€â”€â”€

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("âŒ DATABASE_URL is required.");
    process.exit(1);
  }

  banner("STRM Bundle Seed v2 â€” Official SCF STRM Import");
  console.log();

  if (DRY_RUN) {
    console.log("  ðŸœï¸  DRY RUN MODE â€” parse only, no DB writes\n");
  }
  if (FRAMEWORK_FILTER) {
    console.log(`  ðŸ” Framework filter: "${FRAMEWORK_FILTER}"\n`);
  }

  if (!fs.existsSync(STRM_BUNDLE_DIR)) {
    console.error(`âŒ STRM directory not found: ${STRM_BUNDLE_DIR}`);
    process.exit(1);
  }

  const totalFiles = fs
    .readdirSync(STRM_BUNDLE_DIR)
    .filter((f) => f.endsWith(".xlsx")).length;
  console.log(`  ðŸ“ STRM bundle: ${STRM_BUNDLE_DIR}`);
  console.log(`     Files found: ${totalFiles}`);

  // â”€â”€ 1. Parse bundle â”€â”€
  console.log("\n  âš™ï¸  Parsing STRM bundle XLSXs...");
  const parseStart = Date.now();

  const summary = await parseStrmBundleDirectory(
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
      // null = source operator unreadable (kept, not coerced to intersects)
      const key = e.relationship_type ?? "unknown";
      breakdown[key] = (breakdown[key] ?? 0) + 1;
    }
  }
  console.log("\n  ðŸ“Š Relationship type breakdown:");
  for (const [t, n] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
    const pct = ((n / summary.total_entries) * 100).toFixed(1);
    console.log(`     ${t.padEnd(18)} ${String(n).padStart(7)} (${pct}%)`);
  }

  if (DRY_RUN) {
    console.log("\n  ðŸœï¸  DRY RUN complete. No database changes made.");
    return;
  }

  // â”€â”€ 2. Connect to database â”€â”€
  console.log("\n  ðŸ”Œ Connecting to database...");
  const client = postgres(databaseUrl, { ssl: "require", max: 5 });
  const db = drizzle(client, { schema });

  try {
    await db.execute(sql`SELECT 1`);
    console.log("     Connection OK âœ“");

    // â”€â”€ 3. Load SCF control lookup â”€â”€
    console.log("\n  ðŸ“– Loading SCF controls from DB...");
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

    // â”€â”€ 4. Optionally load mapping lookup for backward-compat scf_mapping_id â”€â”€
    const mappingRows = await db
      .select({
        id: schema.scfMappings.id,
        ctrlId: schema.scfMappings.scfControlId,
        reqId: schema.scfMappings.scfFrameworkRequirementId,
      })
      .from(schema.scfMappings);

    // ctrlId â†’ [mapping_id, ...] (may be multiple per control)
    const ctrlToMappingIds = new Map<string, string[]>();
    for (const m of mappingRows) {
      const list = ctrlToMappingIds.get(m.ctrlId) ?? [];
      list.push(m.id);
      ctrlToMappingIds.set(m.ctrlId, list);
    }
    console.log(`     Mappings loaded: ${mappingRows.length}`);

    // â”€â”€ 4b. Framework lookup, for resolving each file's focal document â”€â”€
    const frameworkRows = await db
      .select({
        id: schema.scfFrameworks.id,
        name: schema.scfFrameworks.name,
      })
      .from(schema.scfFrameworks);

    const { byName: frameworkByName, collidedKeys: collidedFrameworkKeys } =
      buildFrameworkByName(frameworkRows);
    console.log(`     Frameworks loaded: ${frameworkByName.size}`);
    if (collidedFrameworkKeys.size > 0) {
      console.log(
        `     Ambiguous names:   ${collidedFrameworkKeys.size} â€” shared by >1 scf_frameworks row, resolve to none.`,
      );
    }

    // â”€â”€ 5. Build upsert records â”€â”€
    console.log("\n  ðŸ”— Resolving STRM entries against DB controls...");
    const joinStart = Date.now();

    type UpsertRow = {
      scf_control_id: string;
      fde_code: string;
      fde_name: string;
      /** Bundle file this row came from â€” part of the 0060 unique key. */
      focal_document: string;
      /** Framework the focal document resolved to; null = unresolved. */
      scf_framework_id: string | null;
      /** null = source operator unreadable; kept, not coerced to intersects */
      relationship_type: string | null;
      /** Computed once here, reused at the insert site instead of recomputed. */
      relationship_type_canonical: StrmOperator | null;
      /** Set when the source operator could not be canonicalised. */
      operator_unrecognised: boolean;
      strength_raw: number;
      rationale: string | null;
      source: string;
      scf_mapping_id: string | null;
    };

    // Deduplicate by (scf_control_id, fde_code, focal_document) â€” 0060's key.
    // An FDE code is unique only inside its focal document, so keying without
    // it made the last file parsed overwrite every earlier framework's operator.
    const deduped = new Map<string, UpsertRow>();
    let noControl = 0;
    const unknownControls = new Set<string>();
    const unresolvedFocalDocuments = new Set<string>();
    const collidedFocalDocuments = new Set<string>();

    for (const file of summary.files) {
      const frameworkId = resolveFrameworkId(
        file.framework_name,
        frameworkByName,
      );
      if (!frameworkId) {
        unresolvedFocalDocuments.add(file.filename);
        if (collidedFrameworkKeys.has(normaliseFrameworkKey(file.framework_name))) {
          collidedFocalDocuments.add(file.filename);
        }
      }

      for (const entry of file.entries) {
        const controlId = controlCodeToId.get(
          entry.scf_code.trim().toUpperCase(),
        );
        if (!controlId) {
          noControl++;
          unknownControls.add(entry.scf_code);
          continue;
        }

        const canonical = toCanonicalOperator(entry.relationship_type);

        deduped.set(strmDedupeKey(controlId, entry.fde_code, file.filename), {
          scf_control_id: controlId,
          fde_code: entry.fde_code.trim(),
          fde_name: entry.fde_name.trim(),
          focal_document: file.filename,
          scf_framework_id: frameworkId,
          relationship_type: entry.relationship_type,
          relationship_type_canonical: canonical,
          operator_unrecognised: canonical === null,
          strength_raw: entry.strength_raw,
          rationale: entry.strm_rationale || null,
          source: SOURCE_LABEL,
          scf_mapping_id: pickUnambiguousMappingId(
            ctrlToMappingIds.get(controlId),
          ),
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

    const unrecognised = rows.filter((r) => r.operator_unrecognised);
    console.log(`     Unrecognised op: ${unrecognised.length}`);
    if (unrecognised.length > 0) {
      const vocab = [...new Set(unrecognised.map((r) => r.relationship_type))];
      console.log(`     Values seen:     ${vocab.slice(0, 10).join(", ")}`);
      console.log(
        "     These are stored as NULL. A new source vocabulary belongs in",
      );
      console.log(
        "     toCanonicalOperator, not in a fallback at the write site.",
      );
    }

    const resolvedRows = rows.filter((r) => r.scf_framework_id !== null).length;
    console.log(
      `     Framework resolved: ${resolvedRows.toLocaleString()} of ${rows.length.toLocaleString()} rows`,
    );
    if (unresolvedFocalDocuments.size > 0) {
      console.log(
        `     Unresolved files:   ${unresolvedFocalDocuments.size} â€” these grade NO mapping.`,
      );
      for (const f of [...unresolvedFocalDocuments].slice(0, 15)) {
        const reason = collidedFocalDocuments.has(f)
          ? "ambiguous â€” name shared by >1 scf_frameworks row"
          : "absent â€” no scf_frameworks row has this name";
        console.log(`       ${f}  (${reason})`);
      }
      console.log(
        "     Resolution is exact-match on scf_frameworks.name. Fix the name in",
      );
      console.log(
        "     the catalogue; never widen the matcher to close the gap.",
      );
      if (collidedFocalDocuments.size > 0) {
        console.log(
          `     Of those, ${collidedFocalDocuments.size} are ambiguous, not absent: the catalogue holds`,
        );
        console.log(
          "     more than one scf_frameworks row with that name (e.g. one per SCF",
        );
        console.log(
          "     version). Disambiguate the catalogue row, not this matcher.",
        );
      }
    }

    if (rows.length === 0) {
      console.warn(
        "\n  âš ï¸  No records to upsert. Check SCF catalog is seeded first.",
      );
      return;
    }

    // â”€â”€ 6. Upsert â”€â”€
    console.log(
      `\n  ðŸ’¾ Upserting ${rows.length.toLocaleString()} STRM relationships...`,
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
            focalDocument: row.focal_document,
            scfFrameworkId: row.scf_framework_id,
            scfMappingId: row.scf_mapping_id,
            // Unknown operators become NULL (0059). They are not coerced to
            // `intersects`: that asserts scope overlap, which a value we could
            // not read does not support. The count is reported below so an
            // unrecognised vocabulary shows up as a number, not as silence.
            relationshipType: row.relationship_type_canonical,
            // strengthScore replaces legacy relationshipStrength (text â†’ numeric string for Drizzle)
            // A value that does not parse stays null ("related, unquantified").
            // It used to fall back to 0.5, which published a fabricated 0.500
            // indistinguishable from a measured one. ADR-001 already applies
            // the 0.5 default at calculation time, where it belongs.
            strengthScore: parseStrength(row.strength_raw),
            rationale: row.rationale,
            source: row.source,
          })),
        )
        .onConflictDoUpdate({
          // 0060: the key includes the focal document. Without it this upsert
          // was the write half of the cross-framework overwrite.
          target: [
            schema.scfStrmRelationships.scfControlId,
            schema.scfStrmRelationships.fdeCode,
            schema.scfStrmRelationships.focalDocument,
          ],
          set: {
            fdeName: sql`EXCLUDED.fde_name`,
            scfFrameworkId: sql`EXCLUDED.scf_framework_id`,
            scfMappingId: sql`EXCLUDED.scf_mapping_id`,
            relationshipType: sql`EXCLUDED.relationship_type`,
            strengthScore: sql`EXCLUDED.strength_score`,
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

    // â”€â”€ 7. Verify â”€â”€
    console.log("\n  ðŸ” Post-import verification...");
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

    // â”€â”€ 8. Summary â”€â”€
    console.log();
    banner("âœ… STRM Bundle Seed v2 â€” Complete!");
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
  console.error("âŒ STRM Bundle Seed failed:", err);
  process.exit(1);
});
