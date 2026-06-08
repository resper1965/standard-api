import { spawnSync } from "node:child_process";
import fs from "node:fs";

const org = "bekaa-tecnologia-ltda";
const project = "standard";
const token = process.env.SENTRY_AUTH_TOKEN;

if (!token) {
  console.error("SENTRY_AUTH_TOKEN is required to upload sourcemaps.");
  process.exit(0); // non-fatal
}

console.log(`\n🚀 Uploading sourcemaps to Sentry (${org}/${project})...`);

const injectResult = spawnSync("npx", ["sentry-cli", "sourcemaps", "inject", ".wrangler/dist"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, SENTRY_ORG: org, SENTRY_PROJECT: project }
});

if (injectResult.status !== 0) {
  console.error("Failed to inject debug IDs for sourcemaps.");
} else {
  const uploadResult = spawnSync("npx", ["sentry-cli", "sourcemaps", "upload", ".wrangler/dist", "--org", org, "--project", project], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, SENTRY_ORG: org, SENTRY_PROJECT: project }
  });
  
  if (uploadResult.status !== 0) {
    console.error("Failed to upload sourcemaps.");
  } else {
    console.log("✅ Sourcemaps uploaded successfully!");
  }
}
