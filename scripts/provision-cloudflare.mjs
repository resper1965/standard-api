import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const environment = process.argv[2] || "production";
const suffix = environment === "production" ? "prod" : "staging";

console.log(`Buscando provisionar infraestrutura Cloudflare para: ${environment} (${suffix})`);

const run = (cmd) => {
  console.log(`[EXEC] ${cmd}`);
  try {
    return execSync(cmd, { encoding: "utf8" });
  } catch (err) {
    console.warn(`[WARN] Falha ao executar: ${cmd} - Error: ${err.message}`);
    return err.stdout?.toString() || "";
  }
};

// 1. Queues
const queues = [
  `standard-document-ingestion-${suffix}`,
  `standard-kb-embedding-${suffix}`,
  `standard-report-export-${suffix}`,
  `standard-agent-task-${suffix}`
];
for (const q of queues) {
  run(`npx wrangler queues create ${q} || echo "Queue already exists"`);
}

// 2. Buckets
const buckets = [
  `standard-documents-${suffix}`,
  `standard-reports-${suffix}`,
  `standard-exports-${suffix}`
];
for (const b of buckets) {
  run(`npx wrangler r2 bucket create ${b} || echo "Bucket already exists"`);
}

// 3. KV Namespaces
const kvs = [
  { name: `standard-config-kv-${suffix}`, placeholderId: `replace-with-${environment}-config-kv-id` },
  { name: `standard-feature-flags-kv-${suffix}`, placeholderId: `replace-with-${environment}-feature-flags-kv-id` },
  { name: `standard-cache-kv-${suffix}`, placeholderId: `replace-with-${environment}-cache-kv-id` }
];

const tomlFile = path.join(process.cwd(), "infra/cloudflare/wrangler.api-gateway.toml");
let tomlContent = fs.readFileSync(tomlFile, "utf8");

for (const kv of kvs) {
  console.log(`Garantindo KV Namespace: ${kv.name}`);
  run(`npx wrangler kv namespace create ${kv.name} || echo "KV already exists"`);
}

const listOut = execSync(`npx wrangler kv namespace list`, { encoding: "utf8" });
const jsonStr = listOut.substring(listOut.indexOf('['), listOut.lastIndexOf(']') + 1);
const namespaces = jsonStr ? JSON.parse(jsonStr) : [];

for (const kv of kvs) {
  // Title for wrangler default is something like 'standard-api-standard-api-gateway-standard-config-kv-prod'
  // But we can match by checking if the title contains our requested KV name
  const exact = namespaces.find(n => n.title.includes(kv.name.replace(/-/g, '_')) || n.title.includes(kv.name));
  
  if (exact) {
    console.log(`[✔] Encontrado KV ${kv.name} -> ${exact.id}`);
    tomlContent = tomlContent.replace(kv.placeholderId, exact.id);
  } else {
    console.error(`[❌] Nao foi possivel localizar o ID do KV na lista: ${kv.name}`);
  }
}

fs.writeFileSync(tomlFile, tomlContent, "utf8");
console.log(`Atualização finalizada no arquivo: ${tomlFile}`);
console.log("");
console.log("Subida limpa executada com sucesso!");

