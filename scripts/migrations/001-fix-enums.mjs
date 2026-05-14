// Migration 001: Fix all enum drift between Drizzle schema and production DB
// Idempotent: safe to run multiple times
const H = 'ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_T8MHv6EoDIGh@' + H + '/neondb?sslmode=require';

async function sql(text) {
  const r = await fetch('https://' + H + '/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': CS },
    body: JSON.stringify({ query: text }),
  });
  const d = await r.json();
  if (d.message) throw new Error(d.message);
  return d;
}

const statements = [
  // ── ADD missing values to EXISTING enums ──
  "ALTER TYPE evidence_strength ADD VALUE IF NOT EXISTS 'not_checked'",
  "ALTER TYPE gap_type ADD VALUE IF NOT EXISTS 'no_gap'",
  "ALTER TYPE gap_type ADD VALUE IF NOT EXISTS 'not_applicable'",
  "ALTER TYPE poam_status ADD VALUE IF NOT EXISTS 'deferred'",
  "ALTER TYPE priority ADD VALUE IF NOT EXISTS 'urgent'",
  "ALTER TYPE severity ADD VALUE IF NOT EXISTS 'informational'",
  "ALTER TYPE storage_provider ADD VALUE IF NOT EXISTS 'r2_compatible_mock'",
  "ALTER TYPE approval_gate ADD VALUE IF NOT EXISTS 'report'",

  // ── CREATE enums that DON'T EXIST yet ──
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_status') THEN
      CREATE TYPE evidence_status AS ENUM ('candidate','accepted','rejected','insufficient','conflicting','not_evidenced');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poam_action_type') THEN
      CREATE TYPE poam_action_type AS ENUM ('policy_update','procedure_creation','technical_implementation','evidence_collection','governance_improvement','monitoring_improvement','training','third_party_action','risk_acceptance','validation_required','other');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poam_effort_estimate') THEN
      CREATE TYPE poam_effort_estimate AS ENUM ('small','medium','large','extra_large','unknown');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poam_dependency_type') THEN
      CREATE TYPE poam_dependency_type AS ENUM ('blocks','related_to','prerequisite','duplicates','depends_on_external_party');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
      CREATE TYPE report_type AS ENUM ('full_assessment_report','executive_summary','soa_export','gap_analysis_report','maturity_report','poam_report','audit_package','machine_readable_export');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_artifact_type') THEN
      CREATE TYPE report_artifact_type AS ENUM ('report','export','evidence_index','audit_package','appendix','summary');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_format') THEN
      CREATE TYPE report_format AS ENUM ('json','markdown','html','docx','pdf','csv','xlsx','zip');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_job_status') THEN
      CREATE TYPE export_job_status AS ENUM ('queued','running','succeeded','failed','skipped','cancelled','retrying');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_run_status') THEN
      CREATE TYPE workflow_run_status AS ENUM ('pending','running','waiting_for_input','waiting_for_approval','blocked','failed','cancelled','completed');
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_delivery_status') THEN
      CREATE TYPE webhook_delivery_status AS ENUM ('pending','delivered','failed','retrying');
    END IF;
  END $$`,
];

async function main() {
  console.log('[001] Fixing enum drift...');
  let ok = 0, skip = 0, fail = 0;
  for (const stmt of statements) {
    try {
      await sql(stmt);
      const label = stmt.replace(/\s+/g, ' ').substring(0, 70);
      console.log('  [ok]', label);
      ok++;
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  [skip] already exists');
        skip++;
      } else {
        console.error('  [FAIL]', e.message);
        fail++;
      }
    }
  }
  console.log('\n[001] Done:', ok, 'ok,', skip, 'skipped,', fail, 'failed');

  // Verify
  console.log('\n=== Enum Verification ===');
  const { rows } = await sql(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as vals
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    GROUP BY t.typname ORDER BY t.typname
  `);
  for (const r of rows) {
    const name = Array.isArray(r) ? r[0] : r.typname;
    const vals = Array.isArray(r) ? r[1] : r.vals;
    console.log(name + ':', JSON.stringify(vals));
  }
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
