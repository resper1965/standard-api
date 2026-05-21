import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🛠️  Iniciando script Node puro para ignorar os bugs do terminal PowerShell...");

const webNodeModules = path.join(__dirname, 'apps', 'web', 'node_modules');
const viteTemp = path.join(webNodeModules, '.vite-temp');

if (fs.existsSync(viteTemp)) {
    console.log("🧹 Apagando .vite-temp...");
    fs.rmSync(viteTemp, { recursive: true, force: true });
}

if (fs.existsSync(webNodeModules)) {
    console.log("🧹 Apagando apps/web/node_modules...");
    fs.rmSync(webNodeModules, { recursive: true, force: true });
}

console.log("📦 Instalando dependências...");
try {
    execSync("pnpm install", { stdio: 'inherit', cwd: __dirname });
} catch (e) {
    console.error("Falha silenciosa no pnpm install ignorada");
}

console.log("🚀 Iniciando Vite (Web)... Isso vai ficar executando!");
try {
    execSync("npx vite", { stdio: 'inherit', cwd: path.join(__dirname, 'apps', 'web') });
} catch (e) {
    console.error("Servidor finalizado.");
}
