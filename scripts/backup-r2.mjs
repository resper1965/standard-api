/**
 * R2 Bucket Backup Script
 *
 * Lists and downloads all objects from a Cloudflare R2 bucket to a local directory.
 * Requires `wrangler` CLI to be authenticated.
 *
 * Usage:
 *   node scripts/backup-r2.mjs --bucket <bucket-name> [--output <dir>]
 *
 * Example:
 *   node scripts/backup-r2.mjs --bucket standard-documents-dev --output ./backups/r2
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const bucketIdx = args.indexOf("--bucket");
const outputIdx = args.indexOf("--output");

const bucket = bucketIdx >= 0 ? args[bucketIdx + 1] : undefined;
const outputDir = outputIdx >= 0 ? args[outputIdx + 1] : `./backups/r2/${new Date().toISOString().slice(0, 10)}`;

if (!bucket) {
  console.error("Usage: node scripts/backup-r2.mjs --bucket <bucket-name> [--output <dir>]");
  process.exit(1);
}

console.log(`🗂️  Backing up R2 bucket: ${bucket}`);
console.log(`📁 Output directory: ${outputDir}`);

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// List all objects
let objects;
try {
  const listOutput = execSync(`npx wrangler r2 object list ${bucket} --json`, {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large listings
  });
  objects = JSON.parse(listOutput);
} catch (error) {
  console.error("❌ Failed to list R2 objects:", error.message);
  process.exit(1);
}

if (!objects?.length) {
  console.log("ℹ️  Bucket is empty. Nothing to back up.");
  process.exit(0);
}

console.log(`📦 Found ${objects.length} objects to back up`);

let success = 0;
let failed = 0;

for (const obj of objects) {
  const key = obj.key || obj.Key;
  if (!key) continue;

  const localPath = join(outputDir, key.replace(/\//g, "_"));

  try {
    execSync(`npx wrangler r2 object get ${bucket}/${key} --file="${localPath}"`, {
      encoding: "utf-8",
      stdio: "pipe"
    });
    success++;
    if (success % 10 === 0) {
      console.log(`  ✅ Downloaded ${success}/${objects.length}...`);
    }
  } catch (err) {
    console.error(`  ❌ Failed: ${key} — ${err.message}`);
    failed++;
  }
}

// Write manifest
const manifest = {
  bucket,
  timestamp: new Date().toISOString(),
  total: objects.length,
  success,
  failed,
  objects: objects.map((o) => ({ key: o.key || o.Key, size: o.size || o.Size }))
};

writeFileSync(join(outputDir, "_manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`\n✅ Backup complete: ${success} succeeded, ${failed} failed`);
console.log(`📋 Manifest: ${join(outputDir, "_manifest.json")}`);
