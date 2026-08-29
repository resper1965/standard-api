import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { makeTestDb } from "./pglite-harness.js";

let ctx: Awaited<ReturnType<typeof makeTestDb>>;

beforeAll(async () => {
  ctx = await makeTestDb();
});
afterAll(async () => {
  await ctx.client.close();
});

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
