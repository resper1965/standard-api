import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env", "utf-8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) { console.error("No DATABASE_URL"); process.exit(1); }
const sql = neon(match[1]);

(async () => {
  for (const table of ['scf_versions', 'scf_frameworks', 'scf_framework_requirements', 'scf_mappings', 'scf_import_runs']) {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table} ORDER BY ordinal_position`;
    console.log(`\n=== ${table} ===`);
    console.log(cols.map(c => c.column_name).join(', '));
  }
  
  // Check constraints
  const uqs = await sql`SELECT tc.table_name, tc.constraint_name, string_agg(kcu.column_name, ', ') as columns 
    FROM information_schema.table_constraints tc 
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name 
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_name LIKE 'scf_%' 
    GROUP BY tc.table_name, tc.constraint_name`;
  console.log('\n=== UNIQUE CONSTRAINTS ===');
  for (const u of uqs) {
    console.log(`  ${u.table_name}.${u.constraint_name}: (${u.columns})`);
  }
})().catch(e => console.error(e.message));
