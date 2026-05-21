import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.join(__dirname, 'apps', 'web');
const webModules = path.join(webDir, 'node_modules');

console.log("======================================");
console.log("🔥 CURA DE DEPENDÊNCIAS DEFINITIVA V2 🔥");
console.log("======================================");

if (fs.existsSync(webModules)) {
    console.log("Apagando cache fantasma...");
    fs.rmSync(webModules, { recursive: true, force: true });
}

console.log("Forçando download de devDependencies (ignorando NODE_ENV=production global)...");
const env = { ...process.env, NODE_ENV: 'development' };
execSync("pnpm install --force --prod=false", { cwd: webDir, stdio: 'inherit', env });

console.log("\nCompilando...");
try {
    execSync("pnpm build", { cwd: webDir, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
    console.log("✅ DEU CERTO! Sem erros de Vite! O frontend da Vercel vai voar!");
} catch (e) {
    console.error("❌ ERRO.");
}
