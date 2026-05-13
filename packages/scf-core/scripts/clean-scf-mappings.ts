import { neon } from "@neondatabase/serverless";
import * as fs from "fs";

async function main() {
  const envContent = fs.readFileSync(".env", "utf-8");
  const match = envContent.match(/DATABASE_URL="([^"]+)"/);
  if (!match) { console.error("No DB URL"); process.exit(1); }
  const sql = neon(match[1]);

  console.log("Cleaning old mappings...");
  await sql`DELETE FROM scf_mappings WHERE is_synthetic = false`;
  console.log("Mappings cleaned.");
  
  console.log("Cleaning old requirements...");
  await sql`DELETE FROM scf_framework_requirements WHERE is_synthetic = false`;
  console.log("Requirements cleaned.");
  
  console.log("Cleaning old frameworks...");
  await sql`DELETE FROM scf_frameworks WHERE is_synthetic = false`;
  console.log("Frameworks cleaned.");
}

main().catch(console.error);
