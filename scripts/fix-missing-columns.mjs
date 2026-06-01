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
  console.log("[migration] Adding missing columns to scf_domains...");
  await query("ALTER TABLE scf_domains ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0");
  await query("ALTER TABLE scf_domains ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false");
  console.log("[ok] scf_domains updated");

  console.log("[migration] Adding missing columns to scf_controls...");
  await query("ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS control_question text");
  await query("ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS control_intent text");
  await query("ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS implementation_guidance text");
  await query("ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS expected_evidence text");
  await query("ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS control_weight numeric(6,3)");
  await query("ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS maturity_criteria_ref text");
  await query("ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0");
  await query("ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'");
  await query("ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false");
  console.log("[ok] scf_controls updated");

  // Verify the columns exist now
  const { rows } = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'scf_domains' ORDER BY ordinal_position");
  console.log("\n=== scf_domains columns after migration ===");
  const names = rows.map(r => Array.isArray(r) ? r[0] : r.column_name);
  console.log(names.join(", "));

  const { rows: rows2 } = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'scf_controls' ORDER BY ordinal_position");
  console.log("\n=== scf_controls columns after migration ===");
  const names2 = rows2.map(r => Array.isArray(r) ? r[0] : r.column_name);
  console.log(names2.join(", "));
}

main().catch(e => { console.error("[error]", e.message); process.exit(1); });
