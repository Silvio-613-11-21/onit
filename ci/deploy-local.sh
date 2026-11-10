#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Deploy на стенд БЕЗ SSH — напрямую через docker.sock раннера.
#
#  Это запасной режим (DEPLOY_MODE=socket). Он нужен, когда стендом служит
#  тот же компьютер, на котором работает GitLab Runner, и поднимать sshd не хочется.
#  Смысл тот же: на стенд приходит compose-файл, тянется ОПУБЛИКОВАННЫЙ образ,
#  данные БД живут в именованном volume.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${APP_IMAGE:?APP_IMAGE не задан}"
: "${STAND_REGISTRY_USER:?STAND_REGISTRY_USER не задан в CI/CD Variables (deploy-токен)}"
: "${STAND_REGISTRY_PASSWORD:?STAND_REGISTRY_PASSWORD не задан в CI/CD Variables (deploy-токен)}"

STAND_APP_PORT="${STAND_APP_PORT:-8090}"
CI_REGISTRY="${CI_REGISTRY:-registry.gitlab.com}"
STAND_POSTGRES_USER="${STAND_POSTGRES_USER:-onit}"
STAND_POSTGRES_PASSWORD="${STAND_POSTGRES_PASSWORD:?STAND_POSTGRES_PASSWORD не задан в CI/CD Variables}"
STAND_POSTGRES_DB="${STAND_POSTGRES_DB:-onit}"

RUN_DIR="stand-run"

echo "═══════════════════════════════════════════════════════════"
echo " DEPLOY НА СТЕНД (режим socket), каталог $RUN_DIR"
echo " ОБРАЗ: $APP_IMAGE"
echo "═══════════════════════════════════════════════════════════"

mkdir -p "$RUN_DIR"
cp stand/compose.stand.yaml "$RUN_DIR/compose.yaml"

cat > "$RUN_DIR/.env" <<EOF
# Сгенерировано CI/CD $(date -u '+%Y-%m-%d %H:%M:%S UTC'), коммит ${CI_COMMIT_SHORT_SHA:-local}
APP_IMAGE=${APP_IMAGE}
STAND_APP_PORT=${STAND_APP_PORT}
POSTGRES_USER=${STAND_POSTGRES_USER}
POSTGRES_PASSWORD=${STAND_POSTGRES_PASSWORD}
POSTGRES_DB=${STAND_POSTGRES_DB}
CI_REGISTRY=${CI_REGISTRY}
CI_REGISTRY_USER=${STAND_REGISTRY_USER}
CI_REGISTRY_PASSWORD=${STAND_REGISTRY_PASSWORD}
EOF
chmod 600 "$RUN_DIR/.env"

COMPOSE=(docker compose --project-directory "$RUN_DIR" --env-file "$RUN_DIR/.env" -f "$RUN_DIR/compose.yaml")

echo "→ Проверяю доступ к docker"
docker version --format '  docker {{.Server.Version}}'
docker compose version --prefix '  '

echo "→ Тяну опубликованный образ (без сборки на стенде)"
"${COMPOSE[@]}" pull

echo "→ Поднимаю стенд"
"${COMPOSE[@]}" up -d

echo "→ Состояние стенда после deploy"
"${COMPOSE[@]}" ps

echo "→ Данные БД стенда (volume не удаляется)"
docker volume ls --filter name=stand_postgres_data

echo "═══════════════════════════════════════════════════════════"
echo " DEPLOY ЗАВЕРШЁН. Стенд должен быть доступен на порту $STAND_APP_PORT"
echo "═══════════════════════════════════════════════════════════"
