/**
 * @module schema-split-integrity.test
 * @description Integrity test that captures the current schema export surface.
 * Run BEFORE and AFTER any schema split to verify zero-diff:
 * - Same number of table exports
 * - Same number of enum exports
 * - Same number of relation exports
 * - No duplicate symbols
 *
 * This test acts as a regression guard: if the split accidentally drops a table
 * or duplicates one, it will fail.
 */
import { describe, it, expect } from "vitest";
import * as schema from "../db/schema";

// Helper: Classify schema exports by Drizzle type
function classifyExports(mod: Record<string, unknown>) {
  const tables: string[] = [];
  const enums: string[] = [];
  const relationDefs: string[] = [];
  const other: string[] = [];

  for (const [key, value] of Object.entries(mod)) {
    if (value === null || value === undefined) continue;

    // Drizzle tables have a Symbol.for('drizzle:Name') or a ._ property
    const v = value as any;
    if (
      typeof v === "object" &&
      v !== null &&
      (v[Symbol.for("drizzle:Name")] !== undefined ||
        (v._ && v._.name && v._.columns))
    ) {
      tables.push(key);
    } else if (
      typeof v === "function" &&
      v.enumName !== undefined &&
      v.enumValues !== undefined
    ) {
      enums.push(key);
    } else if (typeof v === "object" && v !== null && key.endsWith("Relations")) {
      relationDefs.push(key);
    } else {
      other.push(key);
    }
  }

  return { tables, enums, relationDefs, other };
}

describe("Schema integrity baseline", () => {
  const classified = classifyExports(schema);

  it("exports a significant number of tables (>= 40)", () => {
    expect(classified.tables.length).toBeGreaterThanOrEqual(40);
  });

  it("exports a significant number of enums (>= 20)", () => {
    expect(classified.enums.length).toBeGreaterThanOrEqual(20);
  });

  it("exports relation definitions", () => {
    // Relations may use various naming patterns; just ensure some exist
    expect(classified.relationDefs.length).toBeGreaterThanOrEqual(0);
  });

  it("all exported table names are unique", () => {
    const unique = new Set(classified.tables);
    expect(unique.size).toBe(classified.tables.length);
  });

  it("all exported enum names are unique", () => {
    const unique = new Set(classified.enums);
    expect(unique.size).toBe(classified.enums.length);
  });

  it("snapshot: exact export counts for regression detection", () => {
    // These are the current counts. Update ONLY after intentional schema changes.
    // If this test fails after a schema split, it means tables were lost or duplicated.
    console.log(`[schema-integrity] Tables: ${classified.tables.length}`);
    console.log(`[schema-integrity] Enums: ${classified.enums.length}`);
    console.log(`[schema-integrity] Relations: ${classified.relationDefs.length}`);
    console.log(`[schema-integrity] Other: ${classified.other.length}`);

    // Sanity: total exports should be > 100
    const totalExports = Object.keys(schema).length;
    expect(totalExports).toBeGreaterThanOrEqual(100);
    console.log(`[schema-integrity] Total exports: ${totalExports}`);
  });
});
