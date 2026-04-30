import { spawnSync } from "node:child_process";

const environment = process.argv[2];
const allowedEnvironments = new Set(["staging", "production"]);

if (!allowedEnvironments.has(environment)) {
  console.error("Uso: node scripts/deploy-cloudflare.mjs <staging|production>");
  process.exit(1);
}

const configs = [
  "infra/cloudflare/wrangler.workflows.toml",
  "infra/cloudflare/wrangler.api-gateway.toml",
  "infra/cloudflare/wrangler.ingestion-worker.toml",
  "infra/cloudflare/wrangler.kb-worker.toml",
  "infra/cloudflare/wrangler.reporting-worker.toml"
];

for (const config of configs) {
  const result = spawnSync("npx", ["--yes", "wrangler", "deploy", "-c", config, "-e", environment], {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
