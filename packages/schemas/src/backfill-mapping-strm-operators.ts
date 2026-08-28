/**
 * backfill-mapping-strm-operators — fill scf_mappings.relationship_type from
 * the STRM bundle already loaded into scf_strm_relationships.
 *
 * Why this exists
 * ---------------
 * The XLSX crosswalk importer hardcoded `relationship_type: "intersects"` on
 * every row it produced, because the column was NOT NULL and the crosswalk
 * sheet does not state an operator. A customer walking the full crosswalk
 * measured the result: 79.127 of 79.133 mappings were `intersects`, and the
 * six that were not sat in a synthetic fixture framework and one consultative
 * row. ADR-001's weights were never exercised, because no production row ever
 * reached `equal`, `subset` or `superset`.
 *
 * The real operators do exist. `scf_strm_relationships` is loaded from the SCF
 * STRM bundle, which states one per (control, FDE) pair.
 *
 * The join
 * --------
 * Exact, on the two columns both sides actually key by:
 *
 *   scf_mappings m
 *     JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
 *     JOIN scf_strm_relationships   s ON s.scf_control_id = m.scf_control_id
 *                                    AND s.fde_code      = r.fde_code
 *
 * Deliberately NOT joined on `scf_strm_relationships.scf_mapping_id`: the
 * seeder sets it with `ctrlToMappingIds.get(controlId)?.[0]`, an arbitrary
 * first mapping among many for the same control. Using it would attach one
 * requirement's operator to a different requirement's mapping — the exact
 * class of fabrication this backfill exists to remove.
 *
 * What is left alone
 * ------------------
 * Mappings the bundle does not cover keep `relationship_type = NULL`. They are
 * not defaulted to `intersects`, which is what produced the problem. A null
 * operator is excluded from the compliance index entirely, so an uncovered
 * mapping lowers no denominator and inflates no percentage.
 *
 * Usage
 * -----
 *   pnpm --filter @standard/schemas db:backfill:strm-operators --dry-run
 *   pnpm --filter @standard/schemas db:backfill:strm-operators
 *
 * The dry run writes nothing and reports coverage per framework, which is the
 * number that decides whether a given framework can produce a graded figure.
 */
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./db/schema.js";

/**
 * Only the official bundle grades a mapping. `scf_strm_relationships` also
 * holds rows sourced from structural inference; those describe how a crosswalk
 * happens to be shaped, not what the SCF states, and must never become an
 * operator the API serves as recorded.
 */
const OFFICIAL_SOURCE = "scf_official_strm_bundle_2026.1";

const DRY_RUN = process.argv.slice(2).includes("--dry-run");

type CoverageRow = {
  framework_id: string;
  framework_name: string;
  total: number;
  graded: number;
  equal: number;
  subset: number;
  superset: number;
  intersects: number;
  no_relation: number;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const client = postgres(databaseUrl, { ssl: "require", max: 5 });
  const db = drizzle(client, { schema });

  try {
    console.log(
      DRY_RUN
        ? "Dry run — measuring what the backfill would write. Nothing is modified.\n"
        : "Backfilling scf_mappings.relationship_type from the STRM bundle.\n",
    );

    // ── Coverage per framework, from the same join the update uses ──────────
    const coverage = (await db.execute(sql`
      SELECT
        f.framework_id,
        f.name AS framework_name,
        COUNT(*)::int AS total,
        COUNT(s.relationship_type)::int AS graded,
        COUNT(*) FILTER (WHERE s.relationship_type = 'equal')::int       AS equal,
        COUNT(*) FILTER (WHERE s.relationship_type = 'subset')::int      AS subset,
        COUNT(*) FILTER (WHERE s.relationship_type = 'superset')::int    AS superset,
        COUNT(*) FILTER (WHERE s.relationship_type = 'intersects')::int  AS intersects,
        COUNT(*) FILTER (WHERE s.relationship_type = 'no_relation')::int AS no_relation
      FROM scf_mappings m
      JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
      JOIN scf_frameworks f             ON r.scf_framework_id = f.id
      LEFT JOIN scf_strm_relationships s
        ON s.scf_control_id = m.scf_control_id
       AND s.fde_code       = r.fde_code
       AND s.source         = ${OFFICIAL_SOURCE}
      GROUP BY f.framework_id, f.name
      ORDER BY COUNT(s.relationship_type) DESC, COUNT(*) DESC
    `)) as unknown as CoverageRow[];

    const totals = coverage.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        graded: acc.graded + r.graded,
        satisfying: acc.satisfying + r.equal + r.subset,
      }),
      { total: 0, graded: 0, satisfying: 0 },
    );

    console.log("Coverage by framework (frameworks with any graded mapping):");
    console.log(
      "  framework".padEnd(44) +
        "total".padStart(9) +
        "graded".padStart(9) +
        "equal".padStart(8) +
        "subset".padStart(8) +
        "superset".padStart(10),
    );
    for (const r of coverage.filter((row) => row.graded > 0)) {
      console.log(
        `  ${r.framework_id} ${r.framework_name}`.slice(0, 43).padEnd(44) +
          String(r.total).padStart(9) +
          String(r.graded).padStart(9) +
          String(r.equal).padStart(8) +
          String(r.subset).padStart(8) +
          String(r.superset).padStart(10),
      );
    }

    const ungraded = coverage.filter((r) => r.graded === 0).length;
    const pct = totals.total ? (totals.graded / totals.total) * 100 : 0;
    console.log(
      `\n  ${totals.graded} of ${totals.total} mappings graded (${pct.toFixed(1)}%).` +
        ` ${totals.satisfying} reach equal or subset.` +
        ` ${ungraded} frameworks get nothing.`,
    );
    console.log(
      "  Frameworks with 0 graded mappings can produce no coverage figure —" +
        " that is the number to read before promising one.\n",
    );

    if (DRY_RUN) {
      console.log("Dry run complete. No rows written.");
      return;
    }

    const updated = await db.execute(sql`
      UPDATE scf_mappings m
         SET relationship_type = s.relationship_type,
             updated_at = now()
        FROM scf_framework_requirements r, scf_strm_relationships s
       WHERE m.scf_framework_requirement_id = r.id
         AND s.scf_control_id = m.scf_control_id
         AND s.fde_code       = r.fde_code
         AND s.source         = ${OFFICIAL_SOURCE}
         AND s.relationship_type IS NOT NULL
         AND m.relationship_type IS DISTINCT FROM s.relationship_type
    `);

    console.log(
      `Updated ${(updated as unknown as unknown[]).length ?? 0} rows.`,
    );
    console.log(
      "Mappings the bundle does not cover keep relationship_type = NULL," +
        " and stay out of every compliance index.",
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
