const NEON_HOST = "ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech";
const NEON_USER = "neondb_owner";
const NEON_PASS = "npg_T8MHv6EoDIGh";
const NEON_DB = "neondb";
const CONN_STR = `postgresql://${NEON_USER}:${NEON_PASS}@${NEON_HOST}/${NEON_DB}?sslmode=require`;

async function query(sqlText, params = []) {
  const res = await fetch(`https://${NEON_HOST}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": CONN_STR },
    body: JSON.stringify({ query: sqlText, params }),
  });
  const data = await res.json();
  if (data.message) throw new Error(data.message);
  const fields = data.fields || [];
  const rawRows = data.rows || [];
  if (rawRows.length === 0) return [];
  if (Array.isArray(rawRows[0])) {
    return rawRows.map(row => {
      const obj = {};
      fields.forEach((f, i) => { obj[f.name] = row[i]; });
      return obj;
    });
  }
  return rawRows;
}

async function main() {
  // Check versions
  const versions = await query("SELECT id, version, source_uri, content_hash, created_at FROM scf_versions ORDER BY created_at");
  console.log("\n=== SCF VERSIONS ===");
  versions.forEach(v => console.log(JSON.stringify(v)));
  
  // Check controls per version
  for (const v of versions) {
    const cnt = await query("SELECT COUNT(*) as cnt FROM scf_controls WHERE scf_version_id = $1", [v.id]);
    console.log(`Controls for version ${v.id} (${v.version}): ${cnt[0]?.cnt}`);
  }
  
  // Check domains per version  
  for (const v of versions) {
    const cnt = await query("SELECT COUNT(*) as cnt FROM scf_domains WHERE scf_version_id = $1", [v.id]);
    console.log(`Domains for version ${v.id} (${v.version}): ${cnt[0]?.cnt}`);
  }
  
  // Check frameworks
  const fwCnt = await query("SELECT COUNT(*) as cnt FROM scf_frameworks");
  console.log(`\nTotal frameworks: ${fwCnt[0]?.cnt}`);
  
  // Sample a few controls
  const controls = await query("SELECT id, scf_version_id, control_code, title FROM scf_controls LIMIT 5");
  console.log("\n=== SAMPLE CONTROLS ===");
  controls.forEach(c => console.log(JSON.stringify(c)));
  
  // Check import runs
  const runs = await query("SELECT id, scf_version_id, source_type, status, started_at FROM scf_import_runs ORDER BY started_at");
  console.log("\n=== IMPORT RUNS ===");
  runs.forEach(r => console.log(JSON.stringify(r)));
}

main().catch(e => { console.error("[error]", e.message); process.exit(1); });
