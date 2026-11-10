#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Помощник настройки стенда. Запускается ВРУЧНУЮ на той машине, где стоит
#  GitLab Runner (в нашем случае — в WSL2 Ubuntu):
#
#      bash ci/check-stand-ssh.sh
#
#  Скрипт проверяет три вещи и сам говорит, какие значения писать в
#  Settings → CI/CD → Variables:
#    1. работает ли docker
#    2. поднимается ли sshd и видно ли его ИЗ КОНТЕЙНЕРА (как в джобе CI)
#    3. будет ли стенд доступен для smoke-проверки
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

SSH_USER="${STAND_SSH_USER:-$USER}"
SSH_PORT="${STAND_SSH_PORT:-2222}"
SSH_KEY="${STAND_SSH_KEY_PATH:-$HOME/onit_stand_key}"
SMOKE_PORT="${STAND_APP_PORT:-8090}"

echo "═══════════════════════════════════════════════════════════"
echo " ПРОВЕРКА СТЕНДА"
echo "   пользователь : $SSH_USER"
echo "   порт ssh     : $SSH_PORT"
echo "   ключ         : $SSH_KEY"
echo "═══════════════════════════════════════════════════════════"

echo
echo "1. Docker"
if docker version --format '   docker {{.Server.Version}}' 2>/dev/null; then
    docker compose version 2>/dev/null || echo "   ✗ docker compose не найден"
else
    echo "   ✗ docker не отвечает. В Docker Desktop: Settings → Resources → WSL integration → включи свой дистрибутив."
    exit 1
fi

echo
echo "2. Локальный ssh-доступ к стенду"
if [ ! -f "$SSH_KEY" ]; then
    echo "   ✗ нет файла ключа $SSH_KEY"
    echo "     создай:  ssh-keygen -t ed25519 -C gitlab-ci-deploy -f $SSH_KEY -N \"\""
    exit 1
fi

if ssh -i "$SSH_KEY" -p "$SSH_PORT" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=5 "$SSH_USER@localhost" "echo '   ✓ sshd отвечает на localhost:$SSH_PORT'" 2>/dev/null; then
    :
else
    echo "   ✗ sshd не отвечает на localhost:$SSH_PORT"
    echo "     установи и запусти:"
    echo "       sudo apt update && sudo apt install -y openssh-server"
    echo "       sudo sed -i 's/^#\\?Port .*/Port $SSH_PORT/' /etc/ssh/sshd_config"
    echo "       sudo service ssh start"
    exit 1
fi

echo
echo "3. Тот же ssh, но ИЗ КОНТЕЙНЕРА (ровно так это делает джоба deploy)"

WSL_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
WORKING_HOST=""

for CANDIDATE in host.docker.internal "${WSL_IP:-}" 172.17.0.1; do
    [ -z "$CANDIDATE" ] && continue

    RESULT=$(docker run --rm \
        --add-host=host.docker.internal:host-gateway \
        -v "$SSH_KEY":/key:ro \
        alpine:3.20 sh -c "
            apk add --no-cache openssh-client >/dev/null 2>&1
            ssh -i /key -p $SSH_PORT -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
                -o ConnectTimeout=5 $SSH_USER@$CANDIDATE 'docker compose version' 2>/dev/null
        " 2>/dev/null)

    if [ -n "$RESULT" ]; then
        echo "   ✓ $CANDIDATE — работает ($RESULT)"
        WORKING_HOST="${WORKING_HOST:-$CANDIDATE}"
    else
        echo "   ✗ $CANDIDATE — недоступен из контейнера"
    fi
done

echo
if [ -z "$WORKING_HOST" ]; then
    echo "РЕЗУЛЬТАТ: ни один адрес не подошёл."
    echo "  Самый простой выход — переключить деплой на docker.sock без ssh:"
    echo "    Settings → CI/CD → Variables → DEPLOY_MODE = socket"
    exit 1
fi

cat <<EOF
═══════════════════════════════════════════════════════════
 РЕЗУЛЬТАТ: всё готово. Запиши в Settings → CI/CD → Variables:

   STAND_SSH_HOST  = $WORKING_HOST
   STAND_SSH_USER  = $SSH_USER
   STAND_SSH_PORT  = $SSH_PORT
   STAND_SSH_KEY   = $(cat "$SSH_KEY" | head -1)... (содержимое приватного ключа ЦЕЛИКОМ)
   SMOKE_BASE_URL  = http://host.docker.internal:$SMOKE_PORT
                     (если не заработает — http://$WORKING_HOST:$SMOKE_PORT)
═══════════════════════════════════════════════════════════
EOF
