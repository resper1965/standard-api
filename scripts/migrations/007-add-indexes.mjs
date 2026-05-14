// Migration 007: Add missing indexes for performance & enable pg_trgm for search
const H = 'ep-REDACTED-endpoint.c-6.us-east-1.aws.neon.tech';
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
  // Enable pg_trgm for text search indexes
  "CREATE EXTENSION IF NOT EXISTS pg_trgm",

  // Audit & observability
  "CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON audit_logs(actor_id)",
  
  // SCF filter/search performance
  "CREATE INDEX IF NOT EXISTS scf_controls_status_idx ON scf_controls(status)",
  "CREATE INDEX IF NOT EXISTS scf_mappings_source_idx ON scf_mappings(scf_version_id, mapping_source)",
  
  // Session cleanup
  "CREATE INDEX IF NOT EXISTS session_expires_at_idx ON session(expires_at)",
  
  // Document type filter
  "CREATE INDEX IF NOT EXISTS documents_type_idx ON documents(tenant_id, document_type)",

  // Trigram indexes for text search on SCF catalog
  "CREATE INDEX IF NOT EXISTS scf_frameworks_name_trgm_idx ON scf_frameworks USING gin (name gin_trgm_ops)",
  "CREATE INDEX IF NOT EXISTS scf_controls_title_trgm_idx ON scf_controls USING gin (title gin_trgm_ops)",
  "CREATE INDEX IF NOT EXISTS scf_controls_code_trgm_idx ON scf_controls USING gin (control_code gin_trgm_ops)",
];

async function main() {
  console.log('[007] Adding missing indexes...');
  let ok = 0, fail = 0;
  for (const stmt of stmts) {
    try {
      await sql(stmt);
      console.log('  [ok]', stmt.substring(0, 90));
      ok++;
    } catch (e) {
      console.error('  [FAIL]', e.message);
      fail++;
    }
  }
  console.log('\n[007] Done:', ok, 'ok,', fail, 'failed');

  // Verify total index count
  const { rows } = await sql(`SELECT count(*) FROM pg_indexes WHERE schemaname = 'public'`);
  const cnt = Array.isArray(rows[0]) ? rows[0][0] : rows[0].count;
  console.log('Total indexes:', cnt);
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
