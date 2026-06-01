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
  const fields = data.fields || [];
  const rawRows = data.rows || [];
  return { fields, rows: rawRows };
}

async function main() {
  // Check actual columns in scf_domains table
  const { rows } = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'scf_domains' ORDER BY ordinal_position");
  console.log("=== scf_domains COLUMNS ===");
  rows.forEach(r => console.log(`  ${r.column_name || r[0]} : ${r.data_type || r[1]}`));
  
  // Also check scf_controls columns
  const { rows: rows2 } = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'scf_controls' ORDER BY ordinal_position");
  console.log("\n=== scf_controls COLUMNS ===");
  rows2.forEach(r => console.log(`  ${r.column_name || r[0]} : ${r.data_type || r[1]}`));
}

main().catch(e => { console.error("[error]", e.message); process.exit(1); });
