@echo off
title SofaBiwenger Stats - Servidor Local
echo =======================================================
echo   Iniciando SofaBiwenger Stats & Promedios en Vivo
echo =======================================================
echo.
cd /d "%~dp0"

echo Verificando dependencias...
if not exist node_modules (
    echo Instalando paquetes necesarios...
    call npm install
)

echo Abriendo la aplicacion en el navegador...
start http://localhost:3000

echo Iniciando servidor...
node server/index.js
pause
