// Migration 005: Align poam_versions, poam_items, report_versions, report_artifacts
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

const stmts = [
  // ═══════════════════════════════════════════════════════
  // poam_versions — Add missing columns
  // ═══════════════════════════════════════════════════════
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS source_gap_analysis_version_id uuid REFERENCES gap_analysis_versions(id)",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS source_maturity_assessment_version_id uuid REFERENCES maturity_assessment_versions(id)",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id)",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id)",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS generated_by_agent_run_id uuid REFERENCES agent_runs(id)",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id)",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id)",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS approved_at timestamptz",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS superseded_by uuid",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS trace_id text",
  "ALTER TABLE poam_versions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'",
  // Indexes
  "CREATE INDEX IF NOT EXISTS poam_versions_gap_idx ON poam_versions(source_gap_analysis_version_id)",

  // ═══════════════════════════════════════════════════════
  // poam_items — Add canonical columns (preserve existing)
  // ═══════════════════════════════════════════════════════
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS poam_code text",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS related_gap_finding_id uuid REFERENCES gap_findings(id)",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS source_maturity_score_id uuid REFERENCES maturity_scores(id)",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS soa_item_id uuid REFERENCES soa_items(id)",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id)",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS framework_requirement_id uuid REFERENCES scf_framework_requirements(id)",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id)",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS scf_domain_id uuid REFERENCES scf_domains(id)",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS scf_control_id uuid REFERENCES scf_controls(id)",
  // action_type uses poam_action_type enum
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS action_type poam_action_type",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS risk_rating text",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS effort_estimate poam_effort_estimate DEFAULT 'unknown'",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS owner_role text",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS target_maturity_score integer",
  // expected_evidence and acceptance_criteria: production has text, Drizzle wants jsonb
  // Add jsonb versions alongside existing text columns
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS expected_evidence_jsonb jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS acceptance_criteria_jsonb jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS dependencies_summary text",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS rationale text",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS confidence_score numeric(5,4)",
  "ALTER TABLE poam_items ADD COLUMN IF NOT EXISTS requires_user_validation boolean NOT NULL DEFAULT false",
  // Indexes
  "CREATE INDEX IF NOT EXISTS poam_items_gap_idx ON poam_items(related_gap_finding_id)",
  "CREATE INDEX IF NOT EXISTS poam_items_control_idx ON poam_items(scf_control_id)",

  // ═══════════════════════════════════════════════════════
  // report_versions — Add missing columns
  // ═══════════════════════════════════════════════════════
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Standard Assessment Report'",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS report_type report_type",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS source_scope_id uuid REFERENCES assessment_scope(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS source_soa_version_id uuid REFERENCES soa_versions(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS source_gap_analysis_version_id uuid REFERENCES gap_analysis_versions(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS source_maturity_assessment_version_id uuid REFERENCES maturity_assessment_versions(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS source_poam_version_id uuid REFERENCES poam_versions(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS generated_by_agent_run_id uuid REFERENCES agent_runs(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id)",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS approved_at timestamptz",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS superseded_by uuid",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS trace_id text NOT NULL DEFAULT 'trace-not-set'",
  "ALTER TABLE report_versions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'",
  // Indexes
  "CREATE INDEX IF NOT EXISTS report_versions_sources_idx ON report_versions(source_soa_version_id, source_gap_analysis_version_id, source_poam_version_id)",

  // ═══════════════════════════════════════════════════════
  // report_artifacts — Add missing columns
  // ═══════════════════════════════════════════════════════
  "ALTER TABLE report_artifacts ADD COLUMN IF NOT EXISTS artifact_type report_artifact_type NOT NULL DEFAULT 'report'",
  "ALTER TABLE report_artifacts ADD COLUMN IF NOT EXISTS format report_format NOT NULL DEFAULT 'json'",
  "ALTER TABLE report_artifacts ADD COLUMN IF NOT EXISTS storage_bucket text",
  "ALTER TABLE report_artifacts ADD COLUMN IF NOT EXISTS generated_at timestamptz NOT NULL DEFAULT now()",
  "ALTER TABLE report_artifacts ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'",
];

async function main() {
  console.log('[005] Aligning POA&M and report tables...');
  let ok = 0, fail = 0;
  for (const stmt of stmts) {
    try {
      await sql(stmt);
      console.log('  [ok]', stmt.substring(0, 100));
      ok++;
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  [skip]', stmt.substring(0, 80));
        ok++;
      } else {
        console.error('  [FAIL]', e.message);
        fail++;
      }
    }
  }
  console.log('\n[005] Done:', ok, 'ok,', fail, 'failed');

  // Verify
  for (const t of ['poam_versions', 'poam_items', 'report_versions', 'report_artifacts']) {
    const { rows } = await sql(`SELECT count(*) FROM information_schema.columns WHERE table_name = '${t}'`);
    const cnt = Array.isArray(rows[0]) ? rows[0][0] : rows[0].count;
    console.log(`  ${t}: ${cnt} columns`);
  }
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
