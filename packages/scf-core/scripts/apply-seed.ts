/**
 * Apply SCF Official Frameworks Seed to Neon PostgreSQL (Optimized)
 * 
 * Sends large batches of SQL statements in single HTTP requests.
 * Neon serverless driver supports multi-statement queries.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envContent = readFileSync(".env", "utf-8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) { console.error("❌ No DATABASE_URL found in .env"); process.exit(1); }
const sql = neon(match[1]);

const isDryRun = process.argv.includes("--dry-run");
const seedFile = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "infra/docker/postgres/seeds/0010_scf_official_frameworks_seed.sql";
const seedPath = resolve(seedFile);

console.log(`📄 Reading seed: ${seedPath}`);
if (isDryRun) {
  console.log(`🏜️ [DRY-RUN] Modality enabled. No queries will be sent to Neon.`);
}
const seedContent = readFileSync(seedPath, "utf-8");

// Remove comments, BEGIN/COMMIT, clean up
const cleanedSql = seedContent
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && line.trim() !== 'BEGIN;' && line.trim() !== 'COMMIT;')
  .join('\n');

// Split into individual statements
const rawStatements = cleanedSql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`📊 Total statements: ${rawStatements.length}`);

// Group by type for optimal batching
// Framework inserts, requirement inserts, and mapping inserts can be batched aggressively
const BATCH_SIZE = 500; // Neon supports large multi-statement batches
let executed = 0;
let errors = 0;

const startTime = Date.now();

(async () => {
  for (let i = 0; i < rawStatements.length; i += BATCH_SIZE) {
    const batch = rawStatements.slice(i, i + BATCH_SIZE);
    // Concatenate into a single multi-statement query
    const batchSql = batch.join(';\n') + ';';
    
    try {
      if (!isDryRun) {
        await sql(batchSql);
      }
      executed += batch.length;
    } catch (e: any) {
      // On batch failure, try smaller sub-batches
      const SUB_BATCH = 50;
      for (let j = 0; j < batch.length; j += SUB_BATCH) {
        const subBatch = batch.slice(j, j + SUB_BATCH);
        const subSql = subBatch.join(';\n') + ';';
        try {
          if (!isDryRun) {
            await sql(subSql);
          }
          executed += subBatch.length;
        } catch (e2: any) {
          // Individual fallback
          for (const stmt of subBatch) {
            try {
              if (!isDryRun) {
                await sql(stmt + ';');
              }
              executed++;
            } catch (e3: any) {
              errors++;
              if (errors <= 5) {
                console.error(`⚠️ Error: ${e3.message?.substring(0, 150)}`);
              }
            }
          }
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const pct = (Math.min(i + BATCH_SIZE, rawStatements.length) / rawStatements.length * 100).toFixed(1);
    const rate = (executed / ((Date.now() - startTime) / 1000)).toFixed(0);
    console.log(`  [${pct}%] ${executed} ok, ${errors} err (${elapsed}s, ~${rate}/s)`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${totalTime}s`);
  console.log(`   Executed: ${executed}`);
  console.log(`   Errors: ${errors}`);

  // Verify
  if (!isDryRun) {
    console.log(`\n📊 Verification:`);
    const fwCount = await sql`SELECT COUNT(*) as total FROM scf_frameworks WHERE is_synthetic = false`;
    console.log(`   Frameworks (non-synthetic): ${fwCount[0].total}`);
    const reqCount = await sql`SELECT COUNT(*) as total FROM scf_framework_requirements WHERE is_synthetic = false`;
    console.log(`   Requirements (non-synthetic): ${reqCount[0].total}`);
    const mapCount = await sql`SELECT COUNT(*) as total FROM scf_mappings WHERE is_synthetic = false`;
    console.log(`   Mappings (non-synthetic): ${mapCount[0].total}`);
  }
  
  // Sample LGPD
  if (!isDryRun) {
    const lgpd = await sql`SELECT f.framework_id, f.name, COUNT(r.id) as req_count 
      FROM scf_frameworks f 
      LEFT JOIN scf_framework_requirements r ON r.scf_framework_id = f.id 
      WHERE f.framework_id = 'BR-LGPD' 
      GROUP BY f.id`;
    if (lgpd.length > 0) {
      console.log(`\n🇧🇷 BR-LGPD: ${lgpd[0].name} — ${lgpd[0].req_count} requirements`);
    }
  }
})().catch(e => {
  console.error(`❌ Fatal error: ${e.message}`);
  process.exit(1);
});
