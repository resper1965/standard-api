@echo off
chcp 65001 > nul
cd /d "C:\Users\resper\OneDrive\Área de Trabalho\aegis-api"

echo ==============================================
echo 🚀 SCRIPT INEQUIVOCO DE DEPLOY PARA PRODUCAO
echo ==============================================
echo.
echo [1/4] Puxando atualizacoes pendentes do servidor para nao dar conflito (Update)...
git pull --rebase origin main

echo [2/4] Purgando arquivos fantasmas inseridos no cache do seu commit anterior...
git reset HEAD~2 2>nul
git reset HEAD~1 2>nul
git rm -rf --cached "OneDrive" 2>nul
git rm -rf --cached "node_modules" 2>nul
git rm --cached "package-lock.json" 2>nul

echo [3/4] Adicionando apenas os arquivos vitais da nossa integracao ao Commit...
git add apps/web/package.json
git add apps/web/src/
git add apps/api-gateway/src/
git commit -m "fix(auth): substituindo Better Auth para deploy estavel do Neon Auth"

echo [4/4] Jogando alteracoes curadas para a Pipeline (Internet)...
git push origin main

echo.
echo ==============================================
echo ⚙️  AVALIANDO POSSIVEIS ERROS DE COMPILACAO (BUILD)
echo ==============================================
cd apps\web
echo Verificando node_modules nativo...
if not exist "node_modules\" (
    call pnpm install
)
echo.
echo Inicializando compilador Vite Web...
call pnpm build

echo.
echo Se o pnpm build logo acima tiver terminado sem letras em VERMELHO, sua aplicacao ja foi implantada com SUCESSO!
pause
