/**
 * Manually apply pending SCF schema changes to Neon PostgreSQL.
 * These columns exist in Drizzle schema.ts but are missing from the deployed DB.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env", "utf-8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) { console.error("No DATABASE_URL"); process.exit(1); }
const sql = neon(match[1]);

const migrations = [
  // scf_frameworks missing columns
  `ALTER TABLE "scf_frameworks" ADD COLUMN IF NOT EXISTS "jurisdiction" text`,
  `ALTER TABLE "scf_frameworks" ADD COLUMN IF NOT EXISTS "category" text`,
  `ALTER TABLE "scf_frameworks" ADD COLUMN IF NOT EXISTS "source_reference" text`,
  `ALTER TABLE "scf_frameworks" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL`,
  `ALTER TABLE "scf_frameworks" ADD COLUMN IF NOT EXISTS "is_synthetic" boolean DEFAULT false NOT NULL`,

  // scf_framework_requirements missing columns
  `ALTER TABLE "scf_framework_requirements" ADD COLUMN IF NOT EXISTS "requirement_text" text`,
  `ALTER TABLE "scf_framework_requirements" ADD COLUMN IF NOT EXISTS "parent_requirement_id" uuid`,
  `ALTER TABLE "scf_framework_requirements" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "scf_framework_requirements" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL`,
  `ALTER TABLE "scf_framework_requirements" ADD COLUMN IF NOT EXISTS "is_synthetic" boolean DEFAULT false NOT NULL`,

  // scf_mappings missing columns
  `ALTER TABLE "scf_mappings" ADD COLUMN IF NOT EXISTS "is_official" boolean DEFAULT true NOT NULL`,
  `ALTER TABLE "scf_mappings" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL`,
  `ALTER TABLE "scf_mappings" ADD COLUMN IF NOT EXISTS "is_synthetic" boolean DEFAULT false NOT NULL`,

  // scf_import_runs table (if not exists)
  `CREATE TABLE IF NOT EXISTS "scf_import_runs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "scf_version_id" uuid REFERENCES scf_versions(id),
    "source_type" text NOT NULL,
    "source_filename" text,
    "source_hash" text NOT NULL,
    "status" text NOT NULL,
    "started_at" timestamp with time zone DEFAULT now() NOT NULL,
    "completed_at" timestamp with time zone,
    "error_summary_safe" text,
    "import_statistics" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "imported_by" text,
    "trace_id" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "deleted_at" timestamp with time zone
  )`,

  // Unique indexes for SCF
  `CREATE UNIQUE INDEX IF NOT EXISTS "scf_frameworks_version_framework_uidx" ON "scf_frameworks" USING btree ("scf_version_id", "framework_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "scf_requirements_framework_code_uidx" ON "scf_framework_requirements" USING btree ("scf_framework_id", "requirement_code")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "scf_mappings_requirement_control_uidx" ON "scf_mappings" USING btree ("scf_framework_requirement_id", "scf_control_id")`,

  // Import run indexes
  `CREATE INDEX IF NOT EXISTS "scf_import_runs_version_idx" ON "scf_import_runs" USING btree ("scf_version_id")`,
  `CREATE INDEX IF NOT EXISTS "scf_import_runs_status_idx" ON "scf_import_runs" USING btree ("status")`,
  `CREATE INDEX IF NOT EXISTS "scf_import_runs_trace_idx" ON "scf_import_runs" USING btree ("trace_id")`,
];

(async () => {
  console.log("🔧 Applying SCF schema patches...\n");
  let ok = 0, err = 0;
  for (const m of migrations) {
    try {
      await sql(m);
      const label = m.substring(0, 80).replace(/\n/g, ' ');
      console.log(`  ✅ ${label}...`);
      ok++;
    } catch (e: any) {
      console.error(`  ❌ ${e.message?.substring(0, 120)}`);
      err++;
    }
  }
  console.log(`\n✅ Done: ${ok} applied, ${err} errors`);

  // Verify
  for (const table of ['scf_frameworks', 'scf_framework_requirements', 'scf_mappings', 'scf_import_runs']) {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table} ORDER BY ordinal_position`;
    console.log(`\n${table}: ${cols.map(c => c.column_name).join(', ')}`);
  }
})().catch(e => console.error(e.message));
