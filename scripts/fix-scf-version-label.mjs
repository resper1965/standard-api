const NEON_HOST = "ep-REDACTED-endpoint.c-6.us-east-1.aws.neon.tech";
const NEON_USER = "neondb_owner";
const NEON_PASS = "npg_REDACTED";
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
  // Fix version label from SYNTH-SCF-1 to the real label 2026.1.1
  console.log("[fix] Updating version label from SYNTH-SCF-1 to 2026.1.1...");
  await query(
    "UPDATE scf_versions SET version = $1, source_uri = $2, content_hash = $3 WHERE id = $4",
    [
      "2026.1.1",
      "https://www.securecontrolsframework.com/scf-download",
      "scf-2026.1.1-official",
      "50000000-0000-4000-8000-000000000001"
    ]
  );
  
  // Verify
  const v = await query("SELECT id, version, source_uri FROM scf_versions WHERE id = $1", ["50000000-0000-4000-8000-000000000001"]);
  console.log("[ok] Version updated:", JSON.stringify(v[0]));
}

main().catch(e => { console.error("[error]", e.message); process.exit(1); });
