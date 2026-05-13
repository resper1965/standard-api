import postgres from "postgres";
import * as fs from "fs";

async function main() {
  const envContent = fs.readFileSync(".env", "utf-8");
  const match = envContent.match(/DATABASE_URL="([^"]+)"/);
  const sql = postgres(match[1], { max: 1, idle_timeout: 0});
  
  console.log("Reading...");
  const sqlContent = fs.readFileSync("infra/docker/postgres/seeds/0010_scf_official_frameworks_seed.sql", "utf-8");
  console.log("Applying directly via TCP (will take a minute)...");
  
  await sql.unsafe(sqlContent);
  console.log("DONE!");
  process.exit(0);
}
main().catch(console.error);
