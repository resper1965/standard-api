import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { makeTestDb } from "./pglite-harness.js";

let ctx: Awaited<ReturnType<typeof makeTestDb>>;

beforeAll(async () => {
  ctx = await makeTestDb();
}, 120_000);
afterAll(async () => {
  if (ctx) {
    await ctx.client.close();
  }
}, 120_000);

describe("scf_strm_relationships is keyed by focal document", () => {
  it("keeps one row per focal document for the same control and FDE code", async () => {
    // Two frameworks really do both use "1.1.1", and both really do map it to
    // the same SCF control. Before this key, the second insert overwrote the
    // first and one operator was served to both.
    const control = "30000000-0000-4000-8000-000000000001";
    // scf_controls.scf_domain_id is NOT NULL, so a domain comes first.
    await ctx.client.exec(`
      INSERT INTO scf_versions (id, version)
        VALUES ('30000000-0000-4000-8000-0000000000ff', '2026.1.1')
        ON CONFLICT DO NOTHING;
      INSERT INTO scf_domains (id, scf_version_id, domain_code, name)
        VALUES ('30000000-0000-4000-8000-0000000000fe', '30000000-0000-4000-8000-0000000000ff', 'GOV', 'Governance')
        ON CONFLICT DO NOTHING;
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${control}', '30000000-0000-4000-8000-0000000000ff', '30000000-0000-4000-8000-0000000000fe', 'GOV-01', 'Synthetic control')
        ON CONFLICT DO NOTHING;
    `);

    await ctx.db.execute(sql`
      INSERT INTO scf_strm_relationships
        (scf_control_id, fde_code, focal_document, relationship_type, source)
      VALUES
        (${control}, '1.1.1', 'cis-v8.xlsx',  'equal',  'scf_official_strm_bundle_2026.1'),
        (${control}, '1.1.1', 'pci-dss.xlsx', 'subset', 'scf_official_strm_bundle_2026.1')
    `);

    // drizzle-orm's pglite driver returns the node-postgres-shaped
    // QueryResult ({ rows, ... }), not a bare array — unwrap it.
    const rows = (
      await ctx.db.execute(sql`
      SELECT focal_document, relationship_type
        FROM scf_strm_relationships
       WHERE scf_control_id = ${control} AND fde_code = '1.1.1'
       ORDER BY focal_document
    `)
    ).rows as unknown as Array<{
      focal_document: string;
      relationship_type: string;
    }>;

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      focal_document: "cis-v8.xlsx",
      relationship_type: "equal",
    });
    expect(rows[1]).toMatchObject({
      focal_document: "pci-dss.xlsx",
      relationship_type: "subset",
    });
  });

  it("still collapses two rows from the same focal document", async () => {
    const control = "30000000-0000-4000-8000-000000000002";
    await ctx.client.exec(`
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${control}', '30000000-0000-4000-8000-0000000000ff', '30000000-0000-4000-8000-0000000000fe', 'GOV-02', 'Synthetic control 2')
        ON CONFLICT DO NOTHING;
    `);

    await ctx.db.execute(sql`
      INSERT INTO scf_strm_relationships
        (scf_control_id, fde_code, focal_document, relationship_type, source)
      VALUES (${control}, 'AC-1', 'nist-800-53.xlsx', 'equal', 'scf_official_strm_bundle_2026.1')
    `);
    await ctx.db.execute(sql`
      INSERT INTO scf_strm_relationships
        (scf_control_id, fde_code, focal_document, relationship_type, source)
      VALUES (${control}, 'AC-1', 'nist-800-53.xlsx', 'subset', 'scf_official_strm_bundle_2026.1')
      ON CONFLICT (scf_control_id, fde_code, focal_document)
      DO UPDATE SET relationship_type = EXCLUDED.relationship_type
    `);

    const rows = (
      await ctx.db.execute(sql`
      SELECT relationship_type FROM scf_strm_relationships
       WHERE scf_control_id = ${control} AND fde_code = 'AC-1'
    `)
    ).rows as unknown as Array<{ relationship_type: string }>;

    expect(rows).toHaveLength(1);
    expect(rows[0]?.relationship_type).toBe("subset");
  });

  it("treats two NULL focal documents as the same row", async () => {
    // Rows predating this migration have no focal document. NULLS NOT DISTINCT
    // keeps their behaviour exactly as it was rather than letting them multiply.
    const control = "30000000-0000-4000-8000-000000000003";
    await ctx.client.exec(`
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${control}', '30000000-0000-4000-8000-0000000000ff', '30000000-0000-4000-8000-0000000000fe', 'GOV-03', 'Synthetic control 3')
        ON CONFLICT DO NOTHING;
    `);

    await ctx.db.execute(sql`
      INSERT INTO scf_strm_relationships (scf_control_id, fde_code, relationship_type, source)
      VALUES (${control}, 'X-1', 'equal', 'inferred_structural_analysis')
    `);

    // drizzle-orm wraps the driver error in a DrizzleQueryError whose own
    // .message is "Failed query: ..."; the real Postgres message ("duplicate
    // key value violates unique constraint ...") is on .cause.
    let caught: unknown;
    try {
      await ctx.db.execute(sql`
        INSERT INTO scf_strm_relationships (scf_control_id, fde_code, relationship_type, source)
        VALUES (${control}, 'X-1', 'subset', 'inferred_structural_analysis')
      `);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).cause).toBeInstanceOf(Error);
    expect(((caught as Error).cause as Error).message).toMatch(
      /unique|duplicate/i,
    );
  });
});

describe("the backfill grades per framework", () => {
  it("gives each framework the operator its own focal document stated", async () => {
    // Two frameworks, both with a requirement coded "1.1.1", both mapped to the
    // same SCF control, and the bundle states a DIFFERENT operator for each.
    // Before 0060 this was one row and both frameworks got one operator.
    const v = "40000000-0000-4000-8000-0000000000ff";
    const ctrl = "40000000-0000-4000-8000-000000000001";
    const fwA = "40000000-0000-4000-8000-00000000000a";
    const fwB = "40000000-0000-4000-8000-00000000000b";
    const reqA = "40000000-0000-4000-8000-0000000000a1";
    const reqB = "40000000-0000-4000-8000-0000000000b1";
    const mapA = "40000000-0000-4000-8000-0000000000a2";
    const mapB = "40000000-0000-4000-8000-0000000000b2";

    const dom = "40000000-0000-4000-8000-0000000000fe";

    // scf_mappings has NO framework column — the framework reaches it through
    // scf_framework_requirements, which is exactly why the backfill has to join
    // through r to know which framework a mapping belongs to.
    await ctx.client.exec(`
      INSERT INTO scf_versions (id, version) VALUES ('${v}', '2026.1.2');
      INSERT INTO scf_domains (id, scf_version_id, domain_code, name)
        VALUES ('${dom}', '${v}', 'GOV', 'Governance');
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${ctrl}', '${v}', '${dom}', 'GOV-10', 'Shared control');
      INSERT INTO scf_frameworks (id, scf_version_id, framework_id, name)
        VALUES ('${fwA}', '${v}', 'cis-v8', 'CIS Controls v8'),
               ('${fwB}', '${v}', 'pci-dss-4', 'PCI DSS 4.0');
      INSERT INTO scf_framework_requirements
        (id, scf_version_id, scf_framework_id, requirement_code, fde_code, title)
        VALUES ('${reqA}', '${v}', '${fwA}', '1.1.1', '1.1.1', 'CIS 1.1.1'),
               ('${reqB}', '${v}', '${fwB}', '1.1.1', '1.1.1', 'PCI 1.1.1');
      INSERT INTO scf_mappings
        (id, scf_version_id, scf_framework_requirement_id, scf_control_id)
        VALUES ('${mapA}', '${v}', '${reqA}', '${ctrl}'),
               ('${mapB}', '${v}', '${reqB}', '${ctrl}');
      INSERT INTO scf_strm_relationships
        (scf_control_id, scf_framework_id, fde_code, focal_document, relationship_type, source)
        VALUES ('${ctrl}', '${fwA}', '1.1.1', 'cis-v8.xlsx',  'equal',
                'scf_official_strm_bundle_2026.1'),
               ('${ctrl}', '${fwB}', '1.1.1', 'pci-dss.xlsx', 'superset',
                'scf_official_strm_bundle_2026.1');
    `);

    await ctx.db.execute(sql`
      WITH graded AS (
        SELECT m.id AS mapping_id,
               MIN(s.relationship_type::text) AS op
          FROM scf_mappings m
          JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
          JOIN scf_strm_relationships s
            ON s.scf_control_id   = m.scf_control_id
           AND s.fde_code         = r.fde_code
           AND s.scf_framework_id = r.scf_framework_id
           AND s.source           = 'scf_official_strm_bundle_2026.1'
           AND s.relationship_type IS NOT NULL
         GROUP BY m.id
        HAVING COUNT(DISTINCT s.relationship_type) = 1
      )
      UPDATE scf_mappings m
         SET relationship_type = g.op::strm_operator
        FROM graded g
       WHERE m.id = g.mapping_id
    `);

    const rows = (
      await ctx.db.execute(sql`
      SELECT id, relationship_type FROM scf_mappings
       WHERE id IN (${mapA}, ${mapB}) ORDER BY id
    `)
    ).rows as unknown as Array<{ id: string; relationship_type: string }>;

    const byId = new Map(rows.map((r) => [r.id, r.relationship_type]));
    expect(byId.get(mapA)).toBe("equal");
    expect(byId.get(mapB)).toBe("superset");
  });

  it("refuses to grade when two bundle rows disagree for one framework", async () => {
    // Two focal documents can resolve to the SAME framework (two editions of
    // one file). If they disagree, picking either is a coin flip presented as
    // a measurement, so the mapping stays NULL.
    const v = "50000000-0000-4000-8000-0000000000ff";
    const ctrl = "50000000-0000-4000-8000-000000000001";
    const fw = "50000000-0000-4000-8000-00000000000a";
    const req = "50000000-0000-4000-8000-0000000000a1";
    const map = "50000000-0000-4000-8000-0000000000a2";

    const dom = "50000000-0000-4000-8000-0000000000fe";

    await ctx.client.exec(`
      INSERT INTO scf_versions (id, version) VALUES ('${v}', '2026.1.3');
      INSERT INTO scf_domains (id, scf_version_id, domain_code, name)
        VALUES ('${dom}', '${v}', 'GOV', 'Governance');
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${ctrl}', '${v}', '${dom}', 'GOV-20', 'Ambiguous control');
      INSERT INTO scf_frameworks (id, scf_version_id, framework_id, name)
        VALUES ('${fw}', '${v}', 'dupe', 'Duplicated Framework');
      INSERT INTO scf_framework_requirements
        (id, scf_version_id, scf_framework_id, requirement_code, fde_code, title)
        VALUES ('${req}', '${v}', '${fw}', 'AC-1', 'AC-1', 'AC-1');
      INSERT INTO scf_mappings
        (id, scf_version_id, scf_framework_requirement_id, scf_control_id)
        VALUES ('${map}', '${v}', '${req}', '${ctrl}');
      INSERT INTO scf_strm_relationships
        (scf_control_id, scf_framework_id, fde_code, focal_document, relationship_type, source)
        VALUES ('${ctrl}', '${fw}', 'AC-1', 'dupe-2025.xlsx', 'equal',
                'scf_official_strm_bundle_2026.1'),
               ('${ctrl}', '${fw}', 'AC-1', 'dupe-2026.xlsx', 'subset',
                'scf_official_strm_bundle_2026.1');
    `);

    await ctx.db.execute(sql`
      WITH graded AS (
        SELECT m.id AS mapping_id, MIN(s.relationship_type::text) AS op
          FROM scf_mappings m
          JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
          JOIN scf_strm_relationships s
            ON s.scf_control_id   = m.scf_control_id
           AND s.fde_code         = r.fde_code
           AND s.scf_framework_id = r.scf_framework_id
           AND s.source           = 'scf_official_strm_bundle_2026.1'
           AND s.relationship_type IS NOT NULL
         GROUP BY m.id
        HAVING COUNT(DISTINCT s.relationship_type) = 1
      )
      UPDATE scf_mappings m
         SET relationship_type = g.op::strm_operator
        FROM graded g
       WHERE m.id = g.mapping_id
    `);

    const rows = (
      await ctx.db.execute(sql`
      SELECT relationship_type FROM scf_mappings WHERE id = ${map}
    `)
    ).rows as unknown as Array<{ relationship_type: string | null }>;

    expect(rows[0]?.relationship_type).toBe(null);
  });

  it("computes graded, ambiguous, null-operator, and unresolved coverage counts per framework", async () => {
    // Reuses the frameworks/mappings the two tests above already created:
    //   - cis-v8 / pci-dss-4 (from the first test): one agreeing bundle row
    //     each => graded.
    //   - dupe (from the second test): two disagreeing bundle rows for its
    //     one mapping => ambiguous.
    // Adds one new minimal fixture whose bundle row matches on control and
    // FDE code but carries scf_framework_id = NULL — the seeder's documented
    // behaviour when a focal document's name never resolves to a framework
    // => unresolved.
    // Adds a second new fixture whose bundle row matches this mapping's own
    // framework exactly (control + fde_code + scf_framework_id all agree)
    // but whose relationship_type is NULL — the source stated no operator we
    // could read for this control/FDE pair => null_operator. Before this
    // bucket existed, this mapping was invisible: hits = 0 and
    // unresolved_hits = 0, so it fell into neither of the other three.
    const v = "60000000-0000-4000-8000-0000000000ff";
    const ctrl = "60000000-0000-4000-8000-000000000001";
    const fwC = "60000000-0000-4000-8000-00000000000a";
    const reqC = "60000000-0000-4000-8000-0000000000a1";
    const mapC = "60000000-0000-4000-8000-0000000000a2";
    const dom = "60000000-0000-4000-8000-0000000000fe";

    const fwD = "60000000-0000-4000-8000-00000000000d";
    const reqD = "60000000-0000-4000-8000-0000000000d1";
    const mapD = "60000000-0000-4000-8000-0000000000d2";

    await ctx.client.exec(`
      INSERT INTO scf_versions (id, version) VALUES ('${v}', '2026.1.4');
      INSERT INTO scf_domains (id, scf_version_id, domain_code, name)
        VALUES ('${dom}', '${v}', 'GOV', 'Governance');
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${ctrl}', '${v}', '${dom}', 'GOV-30', 'Unresolved-provenance control');
      INSERT INTO scf_frameworks (id, scf_version_id, framework_id, name)
        VALUES ('${fwC}', '${v}', 'unresolved-fw', 'Unresolved Framework'),
               ('${fwD}', '${v}', 'null-op-fw', 'Null Operator Framework');
      INSERT INTO scf_framework_requirements
        (id, scf_version_id, scf_framework_id, requirement_code, fde_code, title)
        VALUES ('${reqC}', '${v}', '${fwC}', 'X-1', 'X-1', 'X-1'),
               ('${reqD}', '${v}', '${fwD}', 'Y-1', 'Y-1', 'Y-1');
      INSERT INTO scf_mappings
        (id, scf_version_id, scf_framework_requirement_id, scf_control_id)
        VALUES ('${mapC}', '${v}', '${reqC}', '${ctrl}'),
               ('${mapD}', '${v}', '${reqD}', '${ctrl}');
      INSERT INTO scf_strm_relationships
        (scf_control_id, fde_code, focal_document, relationship_type, source)
        VALUES ('${ctrl}', 'X-1', 'unresolved-doc.xlsx', 'equal',
                'scf_official_strm_bundle_2026.1');
      INSERT INTO scf_strm_relationships
        (scf_control_id, scf_framework_id, fde_code, focal_document, relationship_type, source)
        VALUES ('${ctrl}', '${fwD}', 'Y-1', 'null-op-doc.xlsx', NULL,
                'scf_official_strm_bundle_2026.1');
    `);

    // Same matched-CTE coverage query the backfill script uses, filtered to
    // the five frameworks this test cares about.
    const coverage = (
      await ctx.db.execute(sql`
      WITH matched AS (
        SELECT m.id AS mapping_id,
               f.framework_id,
               COUNT(s.relationship_type)          AS hits,
               COUNT(DISTINCT s.relationship_type) AS variants,
               COUNT(s.id)                         AS s_rows,
               COUNT(u.id)                         AS unresolved_hits
          FROM scf_mappings m
          JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
          JOIN scf_frameworks f             ON r.scf_framework_id = f.id
          LEFT JOIN scf_strm_relationships s
            ON s.scf_control_id   = m.scf_control_id
           AND s.fde_code         = r.fde_code
           AND s.scf_framework_id = r.scf_framework_id
           AND s.source           = 'scf_official_strm_bundle_2026.1'
          LEFT JOIN scf_strm_relationships u
            ON u.scf_control_id   = m.scf_control_id
           AND u.fde_code         = r.fde_code
           AND u.scf_framework_id IS NULL
           AND u.source           = 'scf_official_strm_bundle_2026.1'
         GROUP BY m.id, f.framework_id
      )
      SELECT
        framework_id,
        COUNT(*)::int                                                          AS total,
        COUNT(*) FILTER (WHERE variants = 1)::int                              AS graded,
        COUNT(*) FILTER (WHERE variants > 1)::int                              AS ambiguous,
        COUNT(*) FILTER (WHERE hits = 0 AND s_rows > 0)::int                   AS null_operator,
        COUNT(*) FILTER (WHERE hits = 0 AND s_rows = 0 AND unresolved_hits > 0)::int AS unresolved
      FROM matched
      WHERE framework_id IN ('cis-v8', 'pci-dss-4', 'dupe', 'unresolved-fw', 'null-op-fw')
      GROUP BY framework_id
    `)
    ).rows as unknown as Array<{
      framework_id: string;
      total: number;
      graded: number;
      ambiguous: number;
      null_operator: number;
      unresolved: number;
    }>;

    const byFw = new Map(coverage.map((r) => [r.framework_id, r]));

    expect(byFw.get("cis-v8")).toMatchObject({
      total: 1,
      graded: 1,
      ambiguous: 0,
      null_operator: 0,
      unresolved: 0,
    });
    expect(byFw.get("pci-dss-4")).toMatchObject({
      total: 1,
      graded: 1,
      ambiguous: 0,
      null_operator: 0,
      unresolved: 0,
    });
    expect(byFw.get("dupe")).toMatchObject({
      total: 1,
      graded: 0,
      ambiguous: 1,
      null_operator: 0,
      unresolved: 0,
    });
    expect(byFw.get("unresolved-fw")).toMatchObject({
      total: 1,
      graded: 0,
      ambiguous: 0,
      null_operator: 0,
      unresolved: 1,
    });
    expect(byFw.get("null-op-fw")).toMatchObject({
      total: 1,
      graded: 0,
      ambiguous: 0,
      null_operator: 1,
      unresolved: 0,
    });

    // Each framework here has exactly one mapping, so its row's counts prove
    // that single mapping landed in exactly one of the four buckets, and that
    // the buckets are exclusive: they sum to total with nothing left over.
    for (const r of coverage) {
      const buckets = [r.graded, r.ambiguous, r.null_operator, r.unresolved];
      expect(buckets.filter((n) => n > 0)).toHaveLength(1);
      expect(buckets.reduce((a, b) => a + b, 0)).toBe(r.total);
    }
  });
});
