const NEON_HOST = "ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech";
const NEON_USER = "neondb_owner";
const NEON_PASS = "npg_REDACTED";
const NEON_DB = "neondb";
const CONN_STR = `postgresql://${NEON_USER}:${NEON_PASS}@${NEON_HOST}/${NEON_DB}?sslmode=require`;

async function query(sqlText) {
  const res = await fetch(`https://${NEON_HOST}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": CONN_STR },
    body: JSON.stringify({ query: sqlText }),
  });
  const data = await res.json();
  if (data.message) throw new Error(data.message);
  return data;
}

async function main() {
  // Check all SCF tables for missing columns vs schema
  const tables = ['scf_versions', 'scf_frameworks', 'scf_framework_requirements', 'scf_mappings', 'scf_control_metadata', 'scf_strm_relationships'];
  for (const tbl of tables) {
    const { rows } = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tbl}' ORDER BY ordinal_position`);
    const names = rows.map(r => Array.isArray(r) ? r[0] : r.column_name);
    console.log(`\n=== ${tbl} ===`);
    console.log(names.join(", "));
  }

  // Now add missing columns across all SCF tables
  console.log("\n[migration] Fixing scf_versions...");
  await query("ALTER TABLE scf_versions ADD COLUMN IF NOT EXISTS source_uri text");
  await query("ALTER TABLE scf_versions ADD COLUMN IF NOT EXISTS content_hash text");
  await query("ALTER TABLE scf_versions ADD COLUMN IF NOT EXISTS published_at timestamp with time zone");

  console.log("[migration] Fixing scf_frameworks...");
  await query("ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS version_label text");
  await query("ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS publisher text");
  await query("ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS jurisdiction text");
  await query("ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS category text");
  await query("ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS source_reference text");
  await query("ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'");
  await query("ALTER TABLE scf_frameworks ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false");

  console.log("[migration] Fixing scf_framework_requirements...");
  await query("ALTER TABLE scf_framework_requirements ADD COLUMN IF NOT EXISTS description text");
  await query("ALTER TABLE scf_framework_requirements ADD COLUMN IF NOT EXISTS requirement_text text");
  await query("ALTER TABLE scf_framework_requirements ADD COLUMN IF NOT EXISTS parent_requirement_id uuid");
  await query("ALTER TABLE scf_framework_requirements ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0");
  await query("ALTER TABLE scf_framework_requirements ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'");
  await query("ALTER TABLE scf_framework_requirements ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false");

  console.log("[migration] Fixing scf_mappings...");
  await query("ALTER TABLE scf_mappings ADD COLUMN IF NOT EXISTS relationship_strength text");
  await query("ALTER TABLE scf_mappings ADD COLUMN IF NOT EXISTS mapping_rationale text");
  await query("ALTER TABLE scf_mappings ADD COLUMN IF NOT EXISTS mapping_source text NOT NULL DEFAULT 'official_scf'");
  await query("ALTER TABLE scf_mappings ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT true");
  await query("ALTER TABLE scf_mappings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'");
  await query("ALTER TABLE scf_mappings ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false");

  console.log("[ok] All SCF tables aligned with Drizzle schema");
}

main().catch(e => { console.error("[error]", e.message); process.exit(1); });
