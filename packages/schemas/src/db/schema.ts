/**
 * @module schema
 * @description Barrel re-export for all domain schema files.
 *
 * CRITICAL: Drizzle config points to this file (drizzle.config.ts → schema: ["./src/db/schema.ts"]).
 * Every table, enum, and relation MUST be re-exported here.
 * If a table is NOT re-exported, Drizzle will DROP it on next migration.
 *
 * Baseline: 85 tables, 56 enums, 9 relations, 150 total exports.
 */

export * from "./_helpers";
export * from "./_shared-enums";
export * from "./core.schema";
export * from "./scf.schema";
export * from "./agent.schema";
export * from "./document.schema";
export * from "./kb.schema";
export * from "./assessment.schema";
export * from "./soa.schema";
export * from "./evidence.schema";
export * from "./gap.schema";
export * from "./maturity.schema";
export * from "./poam.schema";
export * from "./relations.schema";
export * from "./security.schema";
export * from "./webhook.schema";
export * from "./workflow.schema";
export * from "./observability.schema";
export * from "./reporting.schema";
export * from "./tpra.schema";
export * from "./cdpas.schema";
export * from "./mad.schema";
export * from "./privacy.schema";
export * from "./custom-frameworks";
