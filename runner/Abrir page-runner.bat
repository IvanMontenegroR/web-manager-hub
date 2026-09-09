@echo off
REM Doble clic en Windows. Nada de terminal: esto se para en la carpeta del runner,
REM instala lo que falte la primera vez y abre la interfaz en el navegador.
cd /d "%~dp0"

REM En una maquina corporativa muchas veces no se puede INSTALAR Node (pide admin), pero
REM si se puede descomprimir el zip oficial en una carpeta propia. Si hay un `node\`
REM al lado de este archivo, se usa ese: asi no hay que tocar el PATH de Windows ni
REM pedirle nada a nadie. Si no lo hay, se usa el Node que este instalado.
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Falta Node.js en esta computadora.
  echo.
  echo   Si no lo podes instalar ^(hace falta admin^), usa la version PORTABLE:
  echo     1. Baja https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip
  echo     2. Descomprimilo y copia lo de adentro a una carpeta `node` ACA AL LADO,
  echo        de forma que quede  %~dp0node\node.exe
  echo     3. Volve a hacer doble clic en este archivo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo   Primera vez: instalando ^(tarda unos segundos^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo   No se pudo instalar. Casi siempre es el proxy de la empresa cortando npm.
    echo   Probá configurandolo ^(cambia el host y el puerto por los tuyos^):
    echo     npm config set proxy http://proxy.empresa:8080
    echo     npm config set https-proxy http://proxy.empresa:8080
    echo.
    pause
    exit /b 1
  )
)

node src/cli.js ui
pause
