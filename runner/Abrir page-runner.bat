@echo off
REM Doble clic en Windows. Nada de terminal: esto se para en la carpeta del runner,
REM instala lo que falte la primera vez y abre la interfaz en el navegador.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Falta Node.js en esta computadora.
  echo   Instalalo desde https://nodejs.org ^(la version LTS^) y volve a hacer doble clic.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo   Primera vez: instalando ^(tarda unos segundos^)...
  call npm install --silent
  if errorlevel 1 (
    echo   No se pudo instalar.
    pause
    exit /b 1
  )
)

node src/cli.js ui
pause
