import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env", "utf-8");
const m = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!m) process.exit(1);
const sql = neon(m[1]);

(async () => {
  // Fix version_label NOT NULL constraint (migration 0003 made it nullable but wasn't applied)
  await sql`ALTER TABLE scf_frameworks ALTER COLUMN version_label DROP NOT NULL`;
  console.log("✅ version_label is now nullable");
  
  // Also verify publisher constraint
  const r = await sql`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'scf_frameworks' AND column_name IN ('version_label', 'publisher')`;
  console.log(JSON.stringify(r, null, 2));
})();
