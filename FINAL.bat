@echo off
chcp 65001 > nul
cd /d "C:\Users\resper\OneDrive\Área de Trabalho\aegis-api"

echo ========================================================
echo ⚙️ INICIANDO DIAGNOSTICO AUTONOMO - AGUARDE (PODE DEMORAR 30s)
echo ========================================================
echo.
node force.mjs > log_final.txt 2>&1

echo.
echo ========================================================
echo ✅ TUDO PRONTO! O LOG FOI SALVO PARA A I.A. LER.
echo ========================================================
echo PODE FECHAR ESTA JANELA E AVISAR NO CHAT "terminei"!
pause
