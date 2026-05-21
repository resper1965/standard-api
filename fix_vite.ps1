Write-Host "Iniciando correção forçada profunda do Frontend..." -ForegroundColor Cyan

cd apps\web

Write-Host "1. Destruindo links quebrados antigos (node_modules)..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
}
if (Test-Path ".vite-temp") {
    Remove-Item -Recurse -Force .vite-temp -ErrorAction SilentlyContinue
}

Write-Host "2. Reinstalando as dependências do zero..." -ForegroundColor Yellow
pnpm install

Write-Host "3. Preparando para rodar a aplicação..." -ForegroundColor Green
pnpm dev
