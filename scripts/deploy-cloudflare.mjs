import { spawn } from "node:child_process";

const environment = process.argv[2];
const allowedEnvironments = new Set(["staging", "production"]);

if (!allowedEnvironments.has(environment)) {
  console.error("Uso: node scripts/deploy-cloudflare.mjs <staging|production>");
  process.exit(1);
}

const configs = [
  "infra/cloudflare/wrangler.workflows.toml",
  "infra/cloudflare/wrangler.api-gateway.toml",
  "infra/cloudflare/wrangler.queues-worker.toml",
  "infra/cloudflare/wrangler.ingestion-worker.toml",
  "infra/cloudflare/wrangler.kb-worker.toml",
  "infra/cloudflare/wrangler.reporting-worker.toml",
  "workers/smoke-tester/wrangler.toml"
];

console.log(`\n🚀 Iniciando deploy paralelo de ${configs.length} workers para ${environment}...`);

const deploy = (config) => {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", "wrangler", "deploy", "-c", config, "-e", environment], {
      shell: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ [Sucesso] Deployed: ${config}`);
        resolve({ config, status: 0 });
      } else {
        console.error(`❌ [Falha] Deploying: ${config} failed with code ${code}.\nErrors:\n${stderr || stdout}`);
        reject(new Error(`Failed to deploy ${config}`));
      }
    });
  });
};

try {
  await Promise.all(configs.map(config => deploy(config)));
  console.log(`\n✨ Deploy paralelo para ${environment} concluído com sucesso!`);
} catch (err) {
  console.error(`\n❌ Falha no deploy paralelo:`, err.message);
  process.exit(1);
}

