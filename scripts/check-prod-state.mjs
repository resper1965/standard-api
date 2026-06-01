const NEON_HOST = "ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech";
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
  // 1. Check user role
  const users = await query("SELECT id, name, email, role, created_at FROM \"user\" WHERE email = $1", ["resper@bekaa.eu"]);
  console.log("[check] User:", JSON.stringify(users));
  
  if (users.length > 0 && users[0].role !== "admin") {
    console.log("[fix] Promoting to admin...");
    await query("UPDATE \"user\" SET role = 'admin' WHERE email = $1", ["resper@bekaa.eu"]);
    console.log("[fix] Done.");
  } else if (users.length > 0) {
    console.log("[ok] User already has admin role.");
  }

  // 2. Check user table columns
  const cols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user' ORDER BY ordinal_position");
  console.log("[schema] user columns:", cols.map(c => c.column_name).join(", "));
  
  // 3. Check SCF tables
  const scfTables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'scf%' ORDER BY table_name");
  console.log("[scf] tables:", scfTables.map(t => t.table_name).join(", "));
  
  // 4. Check SCF version count
  const scfVersions = await query("SELECT COUNT(*) as cnt FROM scf_versions");
  console.log("[scf] versions:", scfVersions[0]?.cnt);
  
  // 5. Check SCF controls count
  try {
    const scfControls = await query("SELECT COUNT(*) as cnt FROM scf_controls");
    console.log("[scf] controls:", scfControls[0]?.cnt);
  } catch (e) { console.log("[scf] controls table:", e.message); }
  
  // 6. Check SCF frameworks count
  try {
    const fwCount = await query("SELECT COUNT(*) as cnt FROM scf_frameworks");
    console.log("[scf] frameworks:", fwCount[0]?.cnt);
  } catch (e) { console.log("[scf] frameworks table:", e.message); }
}

main().catch(e => { console.error("[error]", e.message); process.exit(1); });
