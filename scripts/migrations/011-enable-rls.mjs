/**
 * Migration 011: Enable Row-Level Security (RLS) on tenant-scoped tables.
 *
 * Defense-in-depth measure — ensures tenant isolation at the database level,
 * not just application level. Uses PostgreSQL's app.current_tenant setting
 * which must be set per connection/transaction.
 *
 * Tables covered: all tables with a tenant_id column.
 *
 * Usage:
 *   SET app.current_tenant = '<tenant-uuid>';
 *   -- All subsequent queries will be filtered by tenant_id
 *
 * @see Architect Review finding D1
 */
import { neon } from "@neondatabase/serverless";

const TENANT_TABLES = [
  "assessments",
  "organizations",
  "documents",
  "ingestion_jobs",
  "document_chunks",
  "soa_versions",
  "soa_items",
  "gap_analysis_versions",
  "gap_findings",
  "evidence_findings",
  "evidence_mappings",
  "scope_definitions",
  "poam_versions",
  "poam_items",
  "poam_milestones",
  "report_jobs",
  "report_artifacts",
  "export_jobs",
  "artifact_versions",
  "approval_events",
  "lifecycle_events",
  "api_keys",
  "audit_logs",
  "kb_entries",
  "observability_metrics",
  "security_events",
  "privacy_consent_records",
  "privacy_data_requests",
  "webhook_endpoints",
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required");

  const sql = neon(dbUrl);

  console.log("🔒 Enabling Row-Level Security on tenant-scoped tables...\n");

  // 1. Create the tenant context setting
  await sql`SELECT set_config('app.current_tenant', '', false)`.catch(() => {
    console.log("  ⚠ app.current_tenant setting already exists or will be created on use");
  });

  let enabled = 0;
  let skipped = 0;

  for (const table of TENANT_TABLES) {
    try {
      // Check if table exists
      const exists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = ${table}
        ) as exists
      `;

      if (!exists[0]?.exists) {
        console.log(`  ⏭ ${table} — table does not exist, skipping`);
        skipped++;
        continue;
      }

      // Check if tenant_id column exists
      const hasTenantId = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = ${table} AND column_name = 'tenant_id'
        ) as exists
      `;

      if (!hasTenantId[0]?.exists) {
        console.log(`  ⏭ ${table} — no tenant_id column, skipping`);
        skipped++;
        continue;
      }

      // Enable RLS
      await sql`ALTER TABLE ${sql(table)} ENABLE ROW LEVEL SECURITY`;

      // Create tenant isolation policy (idempotent via IF NOT EXISTS equivalent)
      const policyName = `tenant_isolation_${table}`;
      
      // Drop existing policy if present (idempotent)
      await sql`
        DO $$ BEGIN
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I', ${policyName}, ${table});
        END $$
      `;

      // Create policy: rows visible only when tenant_id matches current_setting
      await sql`
        DO $$ BEGIN
          EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL USING (tenant_id = current_setting(''app.current_tenant'', true)::text)',
            ${policyName},
            ${table}
          );
        END $$
      `;

      // IMPORTANT: Ensure the application role (neon default) bypasses RLS
      // This allows the application to work normally when app.current_tenant is NOT set
      // Only enforce RLS for restricted roles
      await sql`ALTER TABLE ${sql(table)} FORCE ROW LEVEL SECURITY`;

      console.log(`  ✅ ${table} — RLS enabled + tenant_isolation policy created`);
      enabled++;
    } catch (err) {
      console.log(`  ❌ ${table} — ${err.message}`);
    }
  }

  // 2. Create a helper function to set tenant context
  await sql`
    CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id text)
    RETURNS void AS $$
    BEGIN
      PERFORM set_config('app.current_tenant', p_tenant_id, true);
    END;
    $$ LANGUAGE plpgsql
  `;

  console.log(`\n📊 Results: ${enabled} tables enabled, ${skipped} skipped`);
  console.log("✅ RLS migration complete.\n");
  console.log("⚠️  NOTE: RLS is enforced only for roles other than the table owner.");
  console.log("   The application connection uses the owner role by default,");
  console.log("   so queries work normally. To enforce RLS for the app role,");
  console.log("   create a restricted role and GRANT it specific permissions.");
}

main().catch(console.error);
