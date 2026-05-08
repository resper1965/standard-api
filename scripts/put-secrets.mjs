import { spawnSync } from "node:child_process";

/**
 * Push secrets to Cloudflare Workers.
 * 
 * Usage:
 *   Ensure secrets are set as environment variables, then run:
 *   node scripts/put-secrets.mjs
 * 
 * Required env vars: DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

const secretKeys = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

const workers = [
  "standard-api-gateway",
];

let ok = 0;
let skipped = 0;

for (const worker of workers) {
  for (const key of secretKeys) {
    const value = process.env[key];
    if (!value) {
      console.warn(`⚠ Skipping ${key} — not set in environment`);
      skipped++;
      continue;
    }
    console.log(`Setting ${key} for worker "${worker}"...`);
    const result = spawnSync("npx", ["wrangler", "secret", "put", key, "--name", worker], {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
    });
    if (result.status === 0) ok++;
    else console.error(`✗ Failed to set ${key}`);
  }
}

console.log(`\nDone: ${ok} set, ${skipped} skipped.`);

