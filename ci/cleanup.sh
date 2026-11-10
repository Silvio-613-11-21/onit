#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Уборка после пайплайна. Запускается ВСЕГДА (when: always), даже если
#  проверки провалились.
#
#  Удаляет:
#    • тестовые данные, которые создали smoke- и e2e-проверки на стенде
#    • временное тестовое окружение (контейнеры/сети/volume проекта onit-tests)
#    • висячие (dangling) docker-образы
#
#  НЕ трогает:
#    • контейнеры и volume стенда (проект onit-stand) — данные стенда сохраняются
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://host.docker.internal:8090}"
STAND_PROJECT="${STAND_PROJECT:-onit-stand}"
TEST_PROJECT="${TEST_PROJECT:-onit-tests}"

echo "═══════════════════════════════════════════════════════════"
echo " УБОРКА ВРЕМЕННОГО ОКРУЖЕНИЯ"
echo "═══════════════════════════════════════════════════════════"

# ── 1. Тестовые данные на стенде ──────────────────────────────────────────────
echo "→ Удаляю тестовые блоки (smoke-*, e2e-*) со стенда: $BASE_URL"

BLOCKS_JSON="$(curl -s --max-time 10 "$BASE_URL/block/getall" 2>/dev/null)"

if [ -z "$BLOCKS_JSON" ]; then
    echo "  стенд не отвечает — тестовых данных убирать не нужно"
else
    TEST_IDS="$(echo "$BLOCKS_JSON" | jq -r '.[]? | select((.title | tostring) | test("^(e2e-|smoke-)")) | .id' 2>/dev/null)"

    if [ -z "$TEST_IDS" ]; then
        echo "  тестовых блоков нет — проверки убрали за собой сами"
    else
        for id in $TEST_IDS; do
            curl -s -o /dev/null --max-time 10 -X DELETE "$BASE_URL/block/$id" \
                && echo "  удалён тестовый блок id=$id"
        done
    fi

    LEFT="$(echo "$BLOCKS_JSON" | jq 'length' 2>/dev/null || echo '?')"
    echo "  блоков на стенде было: $LEFT"
fi

# ── 2. Временное тестовое окружение ───────────────────────────────────────────
# Интеграционные тесты в CI поднимают postgres:17-alpine как service-контейнер
# джобы — его уничтожает сам GitLab Runner вместе с джобой.
# Ниже убирается то, что относится к нашему тестовому compose-проекту onit-tests.
echo "→ Удаляю временное окружение тестов ($TEST_PROJECT)"

STOPPED_IDS="$(docker ps -aq --filter "status=exited" --filter "status=dead" --filter "name=$TEST_PROJECT" 2>/dev/null)"
if [ -n "$STOPPED_IDS" ]; then
    echo "$STOPPED_IDS" | xargs -r docker rm -f
else
    echo "  остановленных контейнеров $TEST_PROJECT нет"
fi

NET_IDS="$(docker network ls -q --filter "name=$TEST_PROJECT" 2>/dev/null)"
if [ -n "$NET_IDS" ]; then
    echo "$NET_IDS" | xargs -r docker network rm
else
    echo "  сетей $TEST_PROJECT нет"
fi

VOL_IDS="$(docker volume ls -q --filter "name=$TEST_PROJECT" 2>/dev/null)"
if [ -n "$VOL_IDS" ]; then
    echo "$VOL_IDS" | xargs -r docker volume rm
else
    echo "  volume $TEST_PROJECT нет"
fi

echo "→ Удаляю висячие образы"
docker image prune -f

# ── 3. Отчёт: стенд и его данные целы ─────────────────────────────────────────
echo "→ Стенд после уборки (проект $STAND_PROJECT)"
docker ps --filter "label=com.docker.compose.project=$STAND_PROJECT" \
    --format '  {{.Names}}  {{.Status}}  {{.Ports}}'

echo "→ Данные БД стенда сохранены:"
docker volume ls --filter "name=stand_postgres_data" --format '  {{.Name}}'

echo "→ Место на диске:"
docker system df | sed 's/^/  /'

echo "═══════════════════════════════════════════════════════════"
echo " УБОРКА ЗАВЕРШЕНА"
echo "═══════════════════════════════════════════════════════════"
