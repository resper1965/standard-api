/**
 * Migration 012: Add missing columns to SCF tables.
 *
 * The Drizzle schema was expanded with tenant_id, organization_id,
 * provenance_hash, ingestion_mode, deleted_at, and other columns
 * that were never migrated to the production database.
 * This migration adds them with safe defaults.
 *
 * Usage: DATABASE_URL=<url> node scripts/migrations/012-add-missing-scf-columns.mjs
 */
import { neon } from "@neondatabase/serverless";

const MIGRATIONS = [
  // ── scf_versions ────────────────────────────────────────
  `ALTER TABLE scf_versions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)`,
  `ALTER TABLE scf_versions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)`,
  `ALTER TABLE scf_versions ADD COLUMN IF NOT EXISTS provenance_hash text`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scf_ingestion_mode') THEN
      CREATE TYPE scf_ingestion_mode AS ENUM ('scf_official_xlsx', 'oscal_json', 'synthetic', 'manual');
    END IF;
  END $$`,
  `ALTER TABLE scf_versions ADD COLUMN IF NOT EXISTS ingestion_mode scf_ingestion_mode NOT NULL DEFAULT 'scf_official_xlsx'`,
  `ALTER TABLE scf_versions ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // ── scf_domains ─────────────────────────────────────────
  `ALTER TABLE scf_domains ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)`,
  `ALTER TABLE scf_domains ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)`,
  `ALTER TABLE scf_domains ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // ── scf_controls ────────────────────────────────────────
  `ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)`,
  `ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)`,
  `ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0`,
  `ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // ── scf_frameworks ──────────────────────────────────────
  `ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)`,
  `ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)`,
  `ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // ── scf_framework_requirements ──────────────────────────
  `ALTER TABLE scf_framework_requirements ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)`,
  `ALTER TABLE scf_framework_requirements ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)`,
  `ALTER TABLE scf_framework_requirements ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // ── scf_mappings ────────────────────────────────────────
  `ALTER TABLE scf_mappings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)`,
  `ALTER TABLE scf_mappings ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)`,
  `ALTER TABLE scf_mappings ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // ── scf_strm_relationships ──────────────────────────────
  `ALTER TABLE scf_strm_relationships ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)`,
  `ALTER TABLE scf_strm_relationships ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)`,
  `ALTER TABLE scf_strm_relationships ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // ── scf_control_metadata ────────────────────────────────
  `ALTER TABLE scf_control_metadata ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)`,
  `ALTER TABLE scf_control_metadata ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id)`,
  `ALTER TABLE scf_control_metadata ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // ── scf_import_runs ─────────────────────────────────────
  `ALTER TABLE scf_import_runs ADD COLUMN IF NOT EXISTS imported_by text`,
  `ALTER TABLE scf_import_runs ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required");

  const sql = neon(dbUrl);

  console.log("🔧 Adding missing columns to SCF tables...\n");

  let success = 0;
  let skipped = 0;

  for (const migration of MIGRATIONS) {
    try {
      await sql(migration);
      const shortDesc = migration.split("\n")[0].substring(0, 80);
      console.log(`  ✅ ${shortDesc}`);
      success++;
    } catch (err) {
      if (err.message?.includes("already exists")) {
        console.log(`  ⏭ Already exists: ${migration.substring(0, 60)}...`);
        skipped++;
      } else {
        console.error(`  ❌ FAILED: ${migration.substring(0, 60)}...`);
        console.error(`     ${err.message}`);
      }
    }
  }

  console.log(`\n📊 Results: ${success} applied, ${skipped} skipped`);
  console.log("✅ Migration 012 complete.");
}

main().catch(console.error);
