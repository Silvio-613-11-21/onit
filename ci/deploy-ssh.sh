#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Deploy на учебный стенд по SSH.
#
#  Что делает:
#    1. кладёт на стенд compose-файл и .env (секреты приходят из CI/CD Variables)
#    2. логинится в GitLab Container Registry deploy-токеном
#    3. docker compose pull  — тянет ИМЕННО ОПУБЛИКОВАННЫЙ образ, ничего не собирая
#    4. docker compose up -d — поднимает стенд (миграции запускаются внутри образа)
#
#  Данные БД стенда лежат в именованном volume и переживают пересоздание контейнеров.
#
#  Требуемые переменные (Settings → CI/CD → Variables):
#    STAND_SSH_HOST, STAND_SSH_USER, STAND_SSH_KEY,
#    STAND_REGISTRY_USER, STAND_REGISTRY_PASSWORD
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${STAND_SSH_HOST:?STAND_SSH_HOST не задан в CI/CD Variables}"
: "${STAND_SSH_USER:?STAND_SSH_USER не задан в CI/CD Variables}"
: "${STAND_REGISTRY_USER:?STAND_REGISTRY_USER не задан в CI/CD Variables (deploy-токен)}"
: "${STAND_REGISTRY_PASSWORD:?STAND_REGISTRY_PASSWORD не задан в CI/CD Variables (deploy-токен)}"
: "${APP_IMAGE:?APP_IMAGE не задан}"

STAND_SSH_PORT="${STAND_SSH_PORT:-22}"
STAND_DIR="${STAND_DIR:-onit-stand}"
STAND_APP_PORT="${STAND_APP_PORT:-8090}"
CI_REGISTRY="${CI_REGISTRY:-registry.gitlab.com}"
STAND_POSTGRES_USER="${STAND_POSTGRES_USER:-onit}"
STAND_POSTGRES_PASSWORD="${STAND_POSTGRES_PASSWORD:?STAND_POSTGRES_PASSWORD не задан в CI/CD Variables}"
STAND_POSTGRES_DB="${STAND_POSTGRES_DB:-onit}"

SSH_KEY="${HOME}/.ssh/stand_key"

if [ ! -f "$SSH_KEY" ]; then
    echo "ОШИБКА: нет файла ключа $SSH_KEY."
    echo "Ключ должен положить before_script джобы deploy:stand:ssh из переменной STAND_SSH_KEY."
    exit 1
fi

SSH_OPTS=(-i "$SSH_KEY"
    -p "$STAND_SSH_PORT"
    -o StrictHostKeyChecking=accept-new
    -o BatchMode=yes
    -o ConnectTimeout=15)

SSH_TARGET="${STAND_SSH_USER}@${STAND_SSH_HOST}"

remote() {
    ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "$@"
}

echo "═══════════════════════════════════════════════════════════"
echo " DEPLOY НА СТЕНД: $SSH_TARGET:$STAND_SSH_PORT, каталог ~/$STAND_DIR"
echo " ОБРАЗ: $APP_IMAGE"
echo "═══════════════════════════════════════════════════════════"

echo "→ Проверяю SSH-доступ"
remote "echo '   ssh ok: '\$(hostname) && docker version --format '   docker {{.Server.Version}}' && docker compose version"

echo "→ Готовлю файлы на стенде"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

cp stand/compose.stand.yaml "$STAGING/compose.yaml"

cat > "$STAGING/env.stand" <<EOF
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

remote "mkdir -p '$STAND_DIR'"
scp "${SSH_OPTS[@]}" "$STAGING/compose.yaml" "$STAGING/env.stand" "${SSH_TARGET}:${STAND_DIR}/"
remote "cd '$STAND_DIR' && mv -f env.stand .env && chmod 600 .env"

echo "→ Логинюсь в $CI_REGISTRY на стенде"
remote "echo '$STAND_REGISTRY_PASSWORD' | docker login -u '$STAND_REGISTRY_USER' --password-stdin '$CI_REGISTRY'"

echo "→ Тяну опубликованный образ (без сборки на стенде)"
remote "cd '$STAND_DIR' && docker compose pull"

echo "→ Поднимаю стенд"
remote "cd '$STAND_DIR' && docker compose up -d"

echo "→ Состояние стенда после deploy"
remote "cd '$STAND_DIR' && docker compose ps"

echo "→ Данные БД стенда (volume не удаляется)"
remote "docker volume ls --filter name=stand_postgres_data"

echo "═══════════════════════════════════════════════════════════"
echo " DEPLOY ЗАВЕРШЁН. Стенд должен быть доступен на порту $STAND_APP_PORT"
echo "═══════════════════════════════════════════════════════════"
