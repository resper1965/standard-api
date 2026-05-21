import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("==========================================");
console.log("🚀 MODO DEPLOY: AVALIAÇÃO DE PRODUÇÃO ATIVA");
console.log("==========================================");

const logPath = path.join(__dirname, 'deploy-log.txt');
let logData = "";

function run(command, cwdDir) {
    console.log(`\n> Executando: ${command}`);
    try {
        const output = execSync(command, { cwd: cwdDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        console.log(output);
        logData += `\n[SUCESSO] ${command}\n${output}\n`;
    } catch (e) {
        const err = `❌ FALHA FATAL: ${command}\nSTDOUT:\n${e.stdout}\nSTDERR:\n${e.stderr}\n`;
        console.error(err);
        logData += err;
        fs.writeFileSync(logPath, logData);
        process.exit(1);
    }
}

// 1. Simular e validar a esteira do Frontend (UI - Vite) localmente
console.log("\n[1/2] Verificando integridade e construindo a UI para Produção (Vite Build)...");
run("npx -y vite build", path.join(__dirname, 'apps', 'web'));

// 2. Acionar a implantação Cloudflare Backend (API Gateway)
console.log("\n[2/2] Realizando Deploy do Backend e Workflows Cloudflare Worker...");
run("node scripts/deploy-cloudflare.mjs production", __dirname);

console.log("\n✅ TUDO VERDE! Frontend compilado nativamente sem falhas. Backend implantado ativamente no Cloudflare.");
logData += "\nFINALIZADO COM SUCESSO.";
fs.writeFileSync(logPath, logData);
