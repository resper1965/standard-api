import { execSync, spawnSync } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("");
console.log("=================================================");
console.log("🌩️ WRANGLER DEPLOY: ROTA DIRETA DA PRODUÇÃO 🌩️");
console.log("=================================================");

try {
    // 1. Deploy dos 5 Workers de Backend (API Gateway, etc)
    console.log("\n[1/2] Implantando os Servidores de Backend no Cloudflare...");
    execSync("node scripts/deploy-cloudflare.mjs production", { cwd: __dirname, stdio: 'inherit' });
    console.log("✅ Backend implantado com sucesso!");

    // 2. Build do Frontend
    const webDir = path.join(__dirname, 'apps', 'web');
    console.log("\n[2/2] Compilando e Enviando o Frontend para o Cloudflare Pages...");
    
    // Força o NODE_ENV para que o processo ocorra em modo Produção
    execSync("pnpm build", { cwd: webDir, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
    
    // Dispara o deploy iterativo do wrangler para o web/dist (abrirá opções se o projeto for inédito)
    // Use shell: true only on Windows where `npx` requires cmd.exe to resolve
    spawnSync("npx", ["wrangler", "pages", "deploy", "dist"], { cwd: webDir, stdio: 'inherit', shell: process.platform === 'win32' });

    console.log("\n✅ OPERAÇÃO CONCLUÍDA! Todo o código foi arremessado à força pela CLI do Wrangler!");
} catch (error) {
    console.error("\n❌ PROCESSO INTERROMPIDO:", error.message);
}
