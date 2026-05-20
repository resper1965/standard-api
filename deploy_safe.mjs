import { execSync } from 'child_process';
import path from 'path';

// Use current working directory to avoid import.meta.url encoding issues on Windows
const root = process.cwd();

console.log("==========================================");
console.log("🚀 DEPLOY SEGURO: USANDO CAMINHOS RELATIVOS");
console.log("==========================================");

function run(command, subDir = "") {
    const targetCwd = subDir ? path.join(root, ...subDir.split('/')) : root;
    console.log(`\n> Executando: ${command}`);
    console.log(`> Em: ${targetCwd}`);
    
    try {
        execSync(command, { 
            cwd: targetCwd, 
            stdio: 'inherit',
            shell: true 
        });
    } catch (e) {
        console.error(`\n❌ FALHA NO COMANDO: ${command}`);
        process.exit(1);
    }
}

// 1. Vite Build
console.log("\n[1/2] Iniciando Build do Frontend...");
run("npx -y vite build", "apps/web");

// 2. Cloudflare Deploy
console.log("\n[2/2] Iniciando Deploy do Backend (Cloudflare)...");
run("node scripts/deploy-cloudflare.mjs production");

console.log("\n✅ DEPLOY FINALIZADO COM SUCESSO!");
