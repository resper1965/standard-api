// Migration 004: Align evidence_findings, evidence_sources, gap_analysis_versions, 
// gap_findings, and assessment_scope with Drizzle schema
const H = 'ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_REDACTED@' + H + '/neondb?sslmode=require';

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
  // evidence_findings — Add canonical columns (keep existing columns as aliases)
  // ═══════════════════════════════════════════════════════
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS soa_version_id uuid REFERENCES soa_versions(id)",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id)",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS framework_requirement_id uuid REFERENCES scf_framework_requirements(id)",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id)",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS scf_control_id uuid REFERENCES scf_controls(id)",
  // Drizzle uses evidence_strength (enum), evidence_status (enum), evidence_summary (text)
  // Production has: strength, status, summary — keep both, add canonical ones
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS evidence_strength evidence_strength DEFAULT 'not_checked'",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS evidence_status evidence_status DEFAULT 'not_evidenced'",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS evidence_summary text",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS evidence_limitations jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS confidence_score numeric(5,4)",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS generated_by_agent_run_id uuid REFERENCES agent_runs(id)",
  "ALTER TABLE evidence_findings ADD COLUMN IF NOT EXISTS trace_id text",
  // Indexes
  "CREATE INDEX IF NOT EXISTS evidence_findings_soa_item_idx ON evidence_findings(soa_item_id)",
  "CREATE INDEX IF NOT EXISTS evidence_findings_control_idx ON evidence_findings(scf_control_id)",
  "CREATE INDEX IF NOT EXISTS evidence_findings_agent_idx ON evidence_findings(generated_by_agent_run_id)",

  // ═══════════════════════════════════════════════════════
  // evidence_sources — Add canonical columns
  // ═══════════════════════════════════════════════════════
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES documents(id)",
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS chunk_id uuid REFERENCES document_chunks(id)",
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS vector_reference_id uuid REFERENCES vector_references(id)",
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS source_type text",
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS source_title text",
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS source_location text",
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS snippet text",
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS retrieval_score numeric(8,6)",
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS retrieval_method text",
  "ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS candidate_evidence boolean NOT NULL DEFAULT true",
  // Indexes
  "CREATE INDEX IF NOT EXISTS evidence_sources_chunk_idx ON evidence_sources(chunk_id)",
  "CREATE INDEX IF NOT EXISTS evidence_sources_vector_reference_idx ON evidence_sources(vector_reference_id)",

  // ═══════════════════════════════════════════════════════
  // gap_analysis_versions — Add missing columns
  // ═══════════════════════════════════════════════════════
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS source_soa_version_id uuid REFERENCES soa_versions(id)",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id)",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id)",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS generated_by_agent_run_id uuid REFERENCES agent_runs(id)",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id)",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id)",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS approved_at timestamptz",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS superseded_by uuid",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS trace_id text",
  "ALTER TABLE gap_analysis_versions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'",

  // ═══════════════════════════════════════════════════════
  // gap_findings — Add canonical columns (keep existing aliases)
  // ═══════════════════════════════════════════════════════
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS soa_version_id uuid REFERENCES soa_versions(id)",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS soa_item_id uuid REFERENCES soa_items(id)",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id)",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS framework_requirement_id uuid REFERENCES scf_framework_requirements(id)",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id)",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS scf_control_id uuid REFERENCES scf_controls(id)",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS evidence_finding_id uuid REFERENCES evidence_findings(id)",
  // gap_code is the Drizzle canonical name for finding_code
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS gap_code text",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS assessment_status gap_status",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS gap_type gap_type",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS severity severity",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS impact text",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS likelihood text",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS gap_summary text",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS gap_rationale text",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS recommendation_summary text",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS confidence_score numeric(5,4)",
  "ALTER TABLE gap_findings ADD COLUMN IF NOT EXISTS requires_user_validation boolean NOT NULL DEFAULT true",
  // Indexes
  "CREATE INDEX IF NOT EXISTS gap_findings_control_idx ON gap_findings(scf_control_id)",
  "CREATE INDEX IF NOT EXISTS gap_findings_requirement_idx ON gap_findings(framework_requirement_id)",

  // ═══════════════════════════════════════════════════════
  // assessment_scope — Add missing columns
  // ═══════════════════════════════════════════════════════
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS scope_version integer NOT NULL DEFAULT 1",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS title text",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS description text",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS business_units jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS processes jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS systems jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS locations jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS legal_entities jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS data_types jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS third_parties jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS constraints jsonb NOT NULL DEFAULT '[]'",
  "ALTER TABLE assessment_scope ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id)",
];

async function main() {
  console.log('[004] Aligning evidence, gap, and scope tables...');
  let ok = 0, fail = 0;
  for (const stmt of stmts) {
    try {
      await sql(stmt);
      console.log('  [ok]', stmt.substring(0, 95));
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
  console.log('\n[004] Done:', ok, 'ok,', fail, 'failed');

  // Verify
  for (const t of ['evidence_findings', 'evidence_sources', 'gap_analysis_versions', 'gap_findings', 'assessment_scope']) {
    const { rows } = await sql(`SELECT count(*) FROM information_schema.columns WHERE table_name = '${t}'`);
    const cnt = Array.isArray(rows[0]) ? rows[0][0] : rows[0].count;
    console.log(`  ${t}: ${cnt} columns`);
  }
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
