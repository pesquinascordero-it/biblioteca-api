#!/bin/bash
# ============================================================
# deploy.sh — Actualiza la biblioteca en el servidor
# Uso (en el servidor):  bash /root/biblioteca-api/deploy.sh
# ============================================================

set -e   # si algún comando falla, el script se para y no sigue

PROJECT_DIR=/root/biblioteca-api   # dónde está el proyecto
WEB_DIR=/var/www/biblioteca        # dónde lee Caddy la página
SERVICE=biblioteca-api             # nombre del servicio de la API

echo "==> 1. Bajando los últimos cambios del repositorio..."
cd "$PROJECT_DIR"
git pull

echo "==> 2. Copiando la página a $WEB_DIR..."
mkdir -p "$WEB_DIR"
cp -r frontend/. "$WEB_DIR"/

echo "==> 3. Reiniciando la API..."
systemctl restart "$SERVICE"

echo "==> 4. Comprobando que la API responde..."
sleep 2
if curl -fs http://127.0.0.1:3001/books > /dev/null; then
  echo "✅ Despliegue completado: https://biblioteca.pabloesquinas.es"
else
  echo "❌ La API no responde. Mira el error con: journalctl -u $SERVICE -n 30"
  exit 1
fi