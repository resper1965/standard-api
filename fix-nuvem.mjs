import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== AJUSTANDO ROTAS DO GITHUB PARA O STANDARD-API ===");

try {
    console.log("1/4. Reconfigurando o Remote Origin oficial...");
    execSync("git remote set-url origin https://github.com/resper1965/standard-api.git", { cwd: __dirname, stdio: 'inherit' });

    console.log("2/4. Adicionando arquivos pendentes da migração...");
    execSync("git add .", { cwd: __dirname, stdio: 'inherit' });

    console.log("3/4. Limpando histórico...");
    try {
        execSync('git commit -m "fix(auth): corrigindo remote e integracao neon"', { cwd: __dirname });
    } catch (e) {
        // Ignora se não houver o que comitar
    }

    console.log("4/4. Empurrando código para a Produção oficial (standard-api)!");
    execSync("git push origin main -f", { cwd: __dirname, stdio: 'inherit' });

    console.log("✅ TUDO CERTO! O código subiu com sucesso pro github.com/resper1965/standard-api.");
    console.log("Agora é só esperar os servidores engolirem a compilação online!");
} catch (error) {
    console.error("❌ Ocorreu um erro no Git:", error.message);
}
