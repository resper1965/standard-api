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
  // 1. Get all tables
  const { rows: tables } = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
    ORDER BY table_name
  `);
  const tableNames = tables.map(r => Array.isArray(r) ? r[0] : r.table_name);
  console.log("=== ALL TABLES ===");
  console.log(JSON.stringify(tableNames, null, 2));

  // 2. Get columns for each table
  console.log("\n\n=== TABLE COLUMNS ===");
  for (const tbl of tableNames) {
    const { rows } = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = '${tbl}' 
      ORDER BY ordinal_position
    `);
    const cols = rows.map(r => {
      const name = Array.isArray(r) ? r[0] : r.column_name;
      const dtype = Array.isArray(r) ? r[1] : r.data_type;
      const nullable = Array.isArray(r) ? r[2] : r.is_nullable;
      return `${name}(${dtype},${nullable === 'YES' ? 'NULL' : 'NOT NULL'})`;
    });
    console.log(`\n${tbl}:\n  ${cols.join(", ")}`);
  }

  // 3. Get all indexes
  console.log("\n\n=== INDEXES ===");
  const { rows: indexes } = await query(`
    SELECT tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    ORDER BY tablename, indexname
  `);
  for (const r of indexes) {
    const tbl = Array.isArray(r) ? r[0] : r.tablename;
    const idx = Array.isArray(r) ? r[1] : r.indexname;
    const def = Array.isArray(r) ? r[2] : r.indexdef;
    console.log(`${tbl}.${idx}: ${def}`);
  }

  // 4. Get all enums
  console.log("\n\n=== ENUMS ===");
  const { rows: enums } = await query(`
    SELECT t.typname, e.enumlabel 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    ORDER BY t.typname, e.enumsortorder
  `);
  const enumMap = {};
  for (const r of enums) {
    const name = Array.isArray(r) ? r[0] : r.typname;
    const label = Array.isArray(r) ? r[1] : r.enumlabel;
    if (!enumMap[name]) enumMap[name] = [];
    enumMap[name].push(label);
  }
  for (const [name, labels] of Object.entries(enumMap)) {
    console.log(`${name}: [${labels.join(", ")}]`);
  }

  // 5. Get foreign keys
  console.log("\n\n=== FOREIGN KEYS ===");
  const { rows: fks } = await query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name, kcu.column_name
  `);
  for (const r of fks) {
    const tbl = Array.isArray(r) ? r[0] : r.table_name;
    const col = Array.isArray(r) ? r[1] : r.column_name;
    const ftbl = Array.isArray(r) ? r[2] : r.foreign_table_name;
    const fcol = Array.isArray(r) ? r[3] : r.foreign_column_name;
    console.log(`${tbl}.${col} -> ${ftbl}.${fcol}`);
  }

  // 6. Row counts
  console.log("\n\n=== ROW COUNTS ===");
  for (const tbl of tableNames) {
    const { rows } = await query(`SELECT count(*) as cnt FROM "${tbl}"`);
    const cnt = Array.isArray(rows[0]) ? rows[0][0] : rows[0].cnt;
    console.log(`${tbl}: ${cnt}`);
  }
}

main().catch(e => { console.error("[error]", e.message); process.exit(1); });
