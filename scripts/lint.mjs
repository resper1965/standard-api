import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", ".wrangler", "node_modules", "dist", "coverage"]);
const scannedExtensions = new Set([".env.example", ".json", ".jsonc", ".md", ".mjs", ".sql", ".toml", ".ts", ".tsx", ".yml", ".yaml"]);

const secretPatterns = [
  /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /sk-[A-Za-z0-9_-]{32,}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /gh[pousr]_[A-Za-z0-9_]{30,}/,
  /CLOUDFLARE_API_TOKEN\s*=\s*["']?[A-Za-z0-9][A-Za-z0-9_-]{19,}/,
  /R2_SECRET_ACCESS_KEY\s*=\s*["']?[A-Za-z0-9][A-Za-z0-9/+=_-]{19,}/
];

function shouldScan(filePath) {
  if (filePath.endsWith(".env.example")) return true;
  const index = filePath.lastIndexOf(".");
  return index >= 0 && scannedExtensions.has(filePath.slice(index));
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await collectFiles(join(directory, entry.name)));
      }
      continue;
    }

    const filePath = join(directory, entry.name);
    if (shouldScan(filePath)) files.push(filePath);
  }

  return files;
}

const findings = [];
for (const file of await collectFiles(root)) {
  const content = await readFile(file, "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) {
      findings.push(relative(root, file));
      break;
    }
  }
}

if (findings.length > 0) {
  console.error("Possíveis secrets encontrados:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Lint básico passou: nenhum secret óbvio encontrado em arquivos versionáveis.");
