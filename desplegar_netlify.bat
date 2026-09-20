@echo off
title Desplegar en Netlify - SofaBiwenger Stats
echo =======================================================
echo   Despliegue de SofaBiwenger Stats a Netlify
echo =======================================================
echo.
cd /d "%~dp0"

echo 1. Verificando configuracion de Netlify...
if not exist "netlify.toml" (
    echo Error: No se encontro netlify.toml
    pause
    exit /b 1
)

echo 2. Iniciando despliegue con Netlify CLI...
echo Si es tu primera vez, Netlify abrira tu navegador para iniciar sesion.
echo.
call npx netlify deploy --prod

echo.
echo =======================================================
echo Proceso de despliegue finalizado.
echo =======================================================
pause
