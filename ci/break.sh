#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Внесение намеренного сбоя для ЛР4 (протокол испытаний пайплайна).
#
#  Сбой вносится ПО ОДНОМУ. Скрипт не даст сломать второе, пока не вернёте
#  рабочую конфигурацию:
#
#      bash ci/break.sh s5        # сломать интеграционный тест API
#      git add -A && git commit -m "ci(s5): намеренный сбой ..." && git push
#      ...смотрим упавший пайплайн, сохраняем ссылку и JUnit...
#      bash ci/break.sh restore   # вернуть рабочую конфигурацию
#
#  Сценарии:
#      s4  — падает UNIT-тест           (tests/unit/createMdFileContent.test.ts)
#      s5  — падает INTEGRATION-тест API(tests/integration/api.test.ts)
#      s6  — падает INTEGRATION-тест БД (tests/integration/db.test.ts)
#      s7  — падает проверка кода       (typecheck)
#      s8  — падает сборка образа       (build)
#      s9  — падает публикация образа   (push в Container Registry)
#      s10 — падает smoke/e2e на стенде (опубликованный образ не поднимается)
#      restore — вернуть всё как было
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCENARIO="${1:-}"

RESTORE_PATHS=(src Dockerfile .gitlab-ci.yml stand)

restore() {
    git checkout -- "${RESTORE_PATHS[@]}"
    echo "✓ Рабочая конфигурация восстановлена."
    git status --short
}

require_clean() {
    if ! git diff --quiet -- "${RESTORE_PATHS[@]}"; then
        echo "✗ В рабочей копии уже есть изменения. Сбои вносятся по одному."
        echo "  Сначала выполните:  bash ci/break.sh restore"
        exit 1
    fi
}

commit_hint() {
    cat <<EOF

──────────────────────────────────────────────────────────────
 Сбой внесён: $1
 Что сломано:  $2
 Где упадёт:   $3

 Дальше:
   git add -A
   git commit -m "test(ci): $1 — намеренный сбой ($2)"
   git push

 После того как пайплайн упадёт:
   • сохраните ссылку на пайплайн и снимок экрана;
   • скачайте JUnit-отчёт из artifacts упавшей джобы;
   • верните рабочую конфигурацию:  bash ci/break.sh restore
──────────────────────────────────────────────────────────────
EOF
}

require_clean

case "$SCENARIO" in
s4)
    sed -i "s/c += '- \[x\] '/c += '- [X] '/" src/services/createMdFileContent.ts
    commit_hint "С4" "отметка выполненной задачи в markdown (- [x] → - [X])" "этап test, джоба test:unit"
    ;;
s5)
    sed -i "s/res.attachment('report.md')/res.attachment('report.txt')/" src/controllers/report.controller.ts
    commit_hint "С5" "имя файла отчёта (report.md → report.txt)" "этап test, джоба test:integration (api.test.ts)"
    ;;
s6)
    sed -i "s/await db\.delete(note)\.where/await db.update(note).set({ title: 'CI-BREAK' }).where/" src/repositories/note.rep.ts
    commit_hint "С6" "удаление заметки не удаляет строку из БД" "этап test, джоба test:integration (db.test.ts)"
    ;;
s7)
    cat >> src/controllers/block.controller.ts <<'EOF'

// CI-BREAK (С7): намеренная ошибка типов для проверки этапа check
const ciBreakTypeCheck: number = 'это строка, а не число';
EOF
    commit_hint "С7" "ошибка типов TypeScript" "этап check, джоба typecheck"
    ;;
s8)
    sed -i 's|COPY package.json package-lock.json ./|COPY package.json ./|' Dockerfile
    commit_hint "С8" "в образ не копируется package-lock.json → npm ci падает" "этап build, джоба build:image"
    ;;
s9)
    sed -i 's|\$CI_REGISTRY_IMAGE|$CI_REGISTRY/broken-namespace-404|g' .gitlab-ci.yml
    commit_hint "С9" "образ тегируется несуществующим путём в реестре → push отклоняется" "этап build, джоба build:image (шаг docker push)"
    ;;
s10)
    sed -i 's|@db:5432|@db-wrong:5432|' stand/compose.stand.yaml
    commit_hint "С10" "стенд получает неверный адрес БД → /health/ready отдаёт 503" "этап smoke (deploy при этом проходит успешно)"
    ;;
restore)
    restore
    ;;
*)
    sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac

if [ "$SCENARIO" != "restore" ]; then
    echo
    echo "Изменённые файлы:"
    git diff --stat -- "${RESTORE_PATHS[@]}"
fi
