// Migration 003: Align soa_versions and soa_items with Drizzle schema
const H = 'ep-REDACTED-endpoint.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_REDACTED@' + H + '/neondb?sslmode=require';

async function sql(text) {
  const r = await fetch('https://' + H + '/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': CS },
    body: JSON.stringify({ query: text }),
  });
  const d = await r.json();
  if (d.message) throw new Error(d.message + ' | SQL: ' + text.substring(0, 120));
  return d;
}

const stmts = [
  // ── soa_versions: add missing columns ──
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS source_framework_id uuid REFERENCES scf_frameworks(id)",
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id)",
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS source_scope_id uuid REFERENCES assessment_scope(id)",
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id)",
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz",
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id)",
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS approved_at timestamptz",
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS superseded_by uuid",
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS trace_id text",
  "ALTER TABLE soa_versions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'",

  // ── soa_items: add missing columns ──
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id)",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS framework_requirement_id uuid REFERENCES scf_framework_requirements(id)",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id)",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS applicability_status text NOT NULL DEFAULT 'requires_validation'",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS implementation_status text NOT NULL DEFAULT 'not_assessed'",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS applicability_rationale text",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS non_applicability_rationale text",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS scope_rationale text",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS evidence_summary text",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS evidence_coverage text NOT NULL DEFAULT 'not_checked'",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS confidence_score numeric(5,4)",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS requires_user_validation boolean NOT NULL DEFAULT true",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS validation_notes text",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS source_mapping_id uuid REFERENCES scf_mappings(id)",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS mapping_status text NOT NULL DEFAULT 'official_mapping'",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS relationship_type text",
  "ALTER TABLE soa_items ADD COLUMN IF NOT EXISTS relationship_strength text",

  // ── soa_items: add missing indexes ──
  "CREATE INDEX IF NOT EXISTS soa_items_control_idx ON soa_items(scf_control_id)",
];

async function main() {
  console.log('[003] Aligning SoA tables...');
  let ok = 0, fail = 0;
  for (const stmt of stmts) {
    try {
      await sql(stmt);
      console.log('  [ok]', stmt.substring(0, 90));
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
  console.log('\n[003] Done:', ok, 'ok,', fail, 'failed');

  // Verify column counts
  for (const t of ['soa_versions', 'soa_items']) {
    const { rows } = await sql(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}' ORDER BY ordinal_position`);
    const cols = rows.map(r => Array.isArray(r) ? r[0] : r.column_name);
    console.log('\n' + t + ' (' + cols.length + ' cols):', cols.join(', '));
  }
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
