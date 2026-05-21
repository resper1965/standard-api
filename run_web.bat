@echo off
echo Iniciando correcao e servidor Web fora do terminal corrompido do VSCode...
chcp 65001 > nul
cd /d "C:\Users\resper\OneDrive\Área de Trabalho\aegis-api\apps\web"
if exist "node_modules\" (
    echo Removendo node_modules velhos...
    rmdir /S /Q "node_modules"
)
if exist ".vite-temp\" (
    rmdir /S /Q ".vite-temp"
)
echo Reinstalando pacotes localmente...
call pnpm install
echo Subindo servidor Vite...
call pnpm dev
pause
