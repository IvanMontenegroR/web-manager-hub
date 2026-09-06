#!/bin/bash
# Doble clic en Mac. Nada de terminal: esto se para en la carpeta del runner, instala
# lo que falte la primera vez y abre la interfaz en el navegador.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Falta Node.js en esta computadora."
  echo "  Instalalo desde https://nodejs.org (la version LTS) y volve a hacer doble clic."
  echo ""
  read -r -p "  Enter para cerrar."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Primera vez: instalando (tarda unos segundos)…"
  npm install --silent || { echo "  No se pudo instalar."; read -r -p "  Enter para cerrar."; exit 1; }
fi

node src/cli.js ui
