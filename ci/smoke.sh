#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Smoke-проверка развёрнутого на стенде опубликованного образа.
#
#  Проверяет, что после deploy:
#    1. приложение отвечает на /health
#    2. приложение видит БД (/health/ready)
#    3. API реально работает: создать → прочитать → удалить
#    4. Swagger UI отдаётся
#
#  Любая непройденная проверка — ненулевой код возврата, то есть пайплайн падает.
#  Отчёт пишется в smoke-report.txt и уезжает в artifacts.
#
#  Использование: bash ci/smoke.sh http://host.docker.internal:8090
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

BASE_URL="${1:-${SMOKE_BASE_URL:-http://localhost:8090}}"
RETRIES="${SMOKE_RETRIES:-30}"
SLEEP_SECONDS="${SMOKE_SLEEP:-2}"
REPORT="smoke-report.txt"
FAILED=0

: > "$REPORT"

log() {
    echo "$@" | tee -a "$REPORT"
}

check() {
    local description="$1" method="$2" path="$3" expected="$4" body="${5:-}"

    local code
    if [ -n "$body" ]; then
        code=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" \
            -H 'Content-Type: application/json' -d "$body" "$BASE_URL$path")
    else
        code=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$BASE_URL$path")
    fi

    if [ "$code" = "$expected" ]; then
        log "  OK    $description ($method $path -> $code)"
    else
        log "  FAIL  $description ($method $path -> $code, ожидалось $expected)"
        FAILED=$((FAILED + 1))
    fi
}

wait_for() {
    local path="$1" expected="$2" attempt=1 code

    log "Ждём появления $path (до $((RETRIES * SLEEP_SECONDS)) секунд)..."

    while [ "$attempt" -le "$RETRIES" ]; do
        code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE_URL$path" || echo 000)

        if [ "$code" = "$expected" ]; then
            log "  OK    $path ответил $expected с попытки $attempt"
            return 0
        fi

        sleep "$SLEEP_SECONDS"
        attempt=$((attempt + 1))
    done

    log "  FAIL  $path так и не ответил $expected (последний код: ${code:-000})"
    FAILED=$((FAILED + 1))
    return 1
}

log "═══════════════════════════════════════════════════════════"
log " SMOKE-ПРОВЕРКА СТЕНДА: $BASE_URL"
log " $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
log "═══════════════════════════════════════════════════════════"

# 1. Приложение поднялось и БД доступна
wait_for "/health" 200
wait_for "/health/ready" 200

# 2. Swagger UI отдаётся
check "Swagger UI доступен" GET "/api-docs/" 200

# 3. API работает: полный цикл create → read → delete
MARKER="smoke-$(date +%s)"

CREATE_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' \
    -d "{\"date\":\"2026-11-10\",\"title\":\"$MARKER\"}" \
    "$BASE_URL/block/create")

if [ "$CREATE_CODE" = "200" ]; then
    log "  OK    блок $MARKER создан (POST /block/create -> 200)"
else
    log "  FAIL  не удалось создать блок (POST /block/create -> $CREATE_CODE)"
    FAILED=$((FAILED + 1))
fi

BLOCK_ID=$(curl -s "$BASE_URL/block/getall" \
    | jq -r --arg t "$MARKER" '[.[] | select(.title == $t)][0].id // empty' 2>/dev/null)

if [ -n "${BLOCK_ID:-}" ]; then
    log "  OK    блок читается из БД, id=$BLOCK_ID"
    check "блок читается по id" GET "/block/$BLOCK_ID" 200
    check "блок удаляется" DELETE "/block/$BLOCK_ID" 200
else
    log "  FAIL  созданный блок не найден через GET /block/getall"
    FAILED=$((FAILED + 1))
fi

# 4. Ошибки обрабатываются, а не роняют приложение
check "некорректный id отдаёт 400" GET "/block/abc" 400
check "несуществующий блок отдаёт 400" DELETE "/block/99999999" 400
check "приложение живо после ошибок" GET "/health" 200

log "═══════════════════════════════════════════════════════════"
if [ "$FAILED" -eq 0 ]; then
    log " РЕЗУЛЬТАТ: все smoke-проверки пройдены"
    log "═══════════════════════════════════════════════════════════"
    exit 0
else
    log " РЕЗУЛЬТАТ: провалено проверок — $FAILED"
    log "═══════════════════════════════════════════════════════════"
    exit 1
fi
