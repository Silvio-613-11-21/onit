# ЛР4. Протокол испытаний CI/CD-пайплайна

**Проект:** ToDoList `onit` (CRUD + PostgreSQL + Drizzle ORM)
**Пайплайн:** GitLab CI/CD, `.gitlab-ci.yml`
**Этапы:** `check → test → build → deploy → smoke → cleanup`
**Стенд:** compose-проект `onit-stand`, порт 8090, volume `stand_postgres_data`

> Страницы с готовыми 10 сценариями в методичке не оказалось (в PDF «Лаб.раб 4»
> одна страница, а список заявлен «на следующей»). Сценарии ниже составлены
> по тексту задания: каждый пайплайн ломается **в своей, отдельной проверке**,
> чтобы было видно, какой именно этап блокирует выпуск.

---

## 1. Чем дополнены тесты (требование ЛР4)

| Требование | Где сделано |
|---|---|
| Не менее 3 интеграционных проверок API **и БД** | `tests/integration/db.test.ts` — 6 проверок |
| Один сквозной CRUD-сценарий для опубликованного образа | `tests/e2e/published.test.ts` — 9 шагов |
| Запуск автоматически в CI/CD | джобы `test:integration` и `smoke` |
| Ненулевой код возврата при сбое | `node --test` возвращает 1; проверено локально |
| Без `allow_failure: true` | в `.gitlab-ci.yml` нет ни одного `allow_failure` |
| JUnit и artifacts даже при неудаче | `artifacts: when: always` + `reports: junit` во всех тестовых джобах |
| Удаление временного окружения и тестовых данных | джоба `cleanup` (`ci/cleanup.sh`), `when: always` |
| Данные стенда сохраняются | volume `stand_postgres_data` нигде не удаляется |

### Проверки API + БД в `tests/integration/db.test.ts`

1. `POST /block/create` действительно пишет строку в таблицу `block`.
2. `id` выдаёт PostgreSQL (`generated always as identity`), а не приложение.
3. `PATCH /task/changestate` меняет boolean-колонку `state` в БД.
4. `DELETE /block/:id` каскадно вычищает `note`, `task`, `subtask`.
5. `DELETE /note/:id` обнуляет `note_id` у задачи (`onDelete: set null`).
6. `/health` и `/health/ready` отражают состояние приложения и БД.

### Сквозной CRUD в `tests/e2e/published.test.ts`

`/health` → `/health/ready` → **C**reate блока, заметки, задачи, подзадачи →
**R**ead каждой сущности по id → **U**pdate заголовка, описания, состояния →
отчёт `report.md` → **D**elete по отдельности → удаление блока и проверка,
что стенд вернулся к исходному состоянию → валидация ошибок (400, не 500).

Тест бьёт по `E2E_BASE_URL`, то есть по **опубликованному образу на стенде**,
и сам удаляет созданные данные.

---

## 2. Сводная таблица сценариев

| № | Сценарий | Ветка | Ожидаемый результат | Факт | Ссылка на пайплайн |
|---|---|---|---|---|---|
| С1 | Push в feature-ветку | `feature/*` | check + test зелёные; build/deploy/smoke **skipped** | | |
| С2 | Merge request | `feature/*` | ровно **один** пайплайн (merge request), дублей нет | | |
| С3 | Merge в основную ветку | `main` | полный пайплайн зелёный, образ в реестре, `/health` = 200 | | |
| С4 | Сбой unit-теста | `main` | падает `test:unit`; `build:image` не запускается | | |
| С5 | Сбой интеграционного теста API | `main` | падает `test:integration` (`api.test.ts`); `test:unit` зелёный | | |
| С6 | Сбой интеграционного теста БД | `main` | падает `test:integration` (`db.test.ts`); `api.test.ts` зелёный | | |
| С7 | Сбой проверки кода | `main` | падает `typecheck`; тесты не запускаются | | |
| С8 | Сбой сборки образа | `main` | падает `build:image`; образ не опубликован, deploy не запущен | | |
| С9 | Сбой публикации в реестр | `main` | `docker push` отклонён; deploy не запущен | | |
| С10 | Сбой smoke на опубликованном образе | `main` | `deploy` зелёный, `smoke` красный, пайплайн неуспешен | | |

---

## 3. Карточки сценариев

### С1. Push в feature-ветку

**Цель:** убедиться, что публикация и deploy привязаны к основной ветке.

```bash
git checkout -b feature/scenario-1
git commit --allow-empty -m "ci(С1): проверка запуска пайплайна в ветке"
git push -u gitlab feature/scenario-1
```

**Ожидаем:** `typecheck`, `config:check`, `test:unit`, `test:integration` —
зелёные. `build:image`, `deploy:*`, `smoke`, `cleanup` — skipped.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

### С2. Merge request без дублирующих пайплайнов

**Цель:** проверить блок `workflow:rules`.

```bash
# в GitLab: Merge requests → New merge request
# source: feature/scenario-1   target: main
```

**Ожидаем:** создан **один** пайплайн с пометкой *merge request*.
Branch-пайплайн на тот же SHA не создаётся.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

### С3. Эталонный полный пайплайн

**Цель:** показать, что всё работает до внесения сбоев.

```bash
git checkout main && git merge feature/scenario-1 && git push gitlab main
```

**Ожидаем:** все этапы зелёные; в Container Registry появились теги
`<sha>` и `latest`; `curl http://localhost:8090/health` → `{"status":"ok",...}`.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

### С4. Сбой unit-теста

```bash
bash ci/break.sh s4
git add -A && git commit -m "test(ci): С4 — намеренный сбой unit-теста" && git push gitlab main
```

**Что сломано:** в `src/services/createMdFileContent.ts` отметка выполненной
задачи `- [x]` заменена на `- [X]`.

**Ожидаем:** `test:unit` красный (падают 2 теста), `test:integration` зелёный,
`build:image` не запускается, образа в реестре нет. Код возврата джобы — 1.
JUnit-отчёт сохранён в artifacts несмотря на провал.

**Проверено локально:** да — 14 тестов, 2 провала, код возврата 1;
интеграционные тесты при этом 10/10 зелёные.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

### С5. Сбой интеграционного теста API

```bash
bash ci/break.sh restore
bash ci/break.sh s5
git add -A && git commit -m "test(ci): С5 — намеренный сбой теста API" && git push gitlab main
```

**Что сломано:** в `src/controllers/report.controller.ts` имя файла отчёта
изменено с `report.md` на `report.txt` — заголовок `Content-Disposition`
перестаёт соответствовать контракту.

**Ожидаем:** `test:integration` красный ровно в одном тесте
(«отчёт по блоку отдаётся файлом report.md»), `test:unit` зелёный.

**Проверено локально:** да — 10 тестов, 1 провал (`api.test.ts`), код возврата 1.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

### С6. Сбой интеграционного теста БД

```bash
bash ci/break.sh restore
bash ci/break.sh s6
git add -A && git commit -m "test(ci): С6 — намеренный сбой теста БД" && git push gitlab main
```

**Что сломано:** `deleteNoteById` в `src/repositories/note.rep.ts` вместо
`DELETE` выполняет `UPDATE` — строка остаётся в таблице.

**Ожидаем:** `test:integration` красный в тесте
«DELETE /note/:id обнуляет note_id у задачи», остальные 9 зелёные.
Показательно: HTTP-ответ при этом остаётся 200, то есть ошибка видна
**только** при проверке самой базы.

**Проверено локально:** да — 10 тестов, 1 провал (`db.test.ts`), `tsc` проходит.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

### С7. Сбой проверки кода

```bash
bash ci/break.sh restore
bash ci/break.sh s7
git add -A && git commit -m "test(ci): С7 — намеренная ошибка типов" && git push gitlab main
```

**Что сломано:** в конец `src/controllers/block.controller.ts` добавлена строка
`const ciBreakTypeCheck: number = 'это строка, а не число';`

**Ожидаем:** `typecheck` красный с ошибкой TS2322 на первом же этапе,
тесты не запускаются вообще.

**Проверено локально:** да —
`src/controllers/block.controller.ts(119,7): error TS2322: Type 'string' is not assignable to type 'number'`,
код возврата 1.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

### С8. Сбой сборки образа

```bash
bash ci/break.sh restore
bash ci/break.sh s8
git add -A && git commit -m "test(ci): С8 — намеренный сбой сборки образа" && git push gitlab main
```

**Что сломано:** из `Dockerfile` убрано копирование `package-lock.json`,
поэтому `npm ci` падает с «can only install with an existing package-lock.json».

**Ожидаем:** `build:image` красный на шаге сборки; теги в реестре не появились;
`deploy` и `smoke` не запускаются.

**Проверено локально:** нет — в песочнице нет Docker. Проверяется на реальном пайплайне.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

### С9. Сбой публикации в Container Registry

```bash
bash ci/break.sh restore
bash ci/break.sh s9
git add -A && git commit -m "test(ci): С9 — намеренный сбой публикации" && git push gitlab main
```

**Что сломано:** в `.gitlab-ci.yml` образ тегируется путём
`$CI_REGISTRY/broken-namespace-404` — такого проекта не существует.

**Ожидаем:** сборка проходит, а `docker push` падает с
`denied: requested access to the resource is denied`. Deploy не запускается.

**Проверено локально:** нет — нужен доступ к registry.gitlab.com.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

### С10. Сбой smoke-проверки на опубликованном образе

```bash
bash ci/break.sh restore
bash ci/break.sh s10
git add -A && git commit -m "test(ci): С10 — намеренный сбой на стенде" && git push gitlab main
```

**Что сломано:** в `stand/compose.stand.yaml` адрес БД в `DATABASE_URL`
заменён с `db` на `db-wrong`.

**Ожидаем:** `build:image` и `deploy` **зелёные** (образ собрался и контейнеры
поднялись), а `smoke` красный: `/health` отвечает 200, но `/health/ready`
отдаёт 503, CRUD не работает. Пайплайн в целом неуспешен.
Это главный сценарий: он показывает, зачем нужна smoke-проверка **после** deploy.

**Проверено локально:** да — приложение с неверным `DATABASE_URL` отвечает
`{"status":"ok"}` на `/health` и 503 на `/health/ready`; `ci/smoke.sh`
завершился с кодом 1, провалив 4 проверки. В логе приложения —
`getaddrinfo ENOTFOUND db-wrong`.

**Факт:** _заполни_
**Пайплайн:** _ссылка_

---

## 4. Дополнительный сценарий: воспроизводимость развёртывания

Не входит в 10 обязательных, но требуется ЛР3 («сохранение данных БД»).

```bash
curl -X POST http://localhost:8090/block/create \
  -H 'Content-Type: application/json' \
  -d '{"date":"2026-11-10","title":"проверка сохранности"}'

docker compose --project-directory ~/onit-stand down
docker compose --project-directory ~/onit-stand up -d

curl http://localhost:8090/block/getall
```

**Ожидаем:** запись на месте; контейнеры пересозданы, volume
`stand_postgres_data` не удалялся.

**Факт:** _заполни_

---

## 5. Восстановление рабочей конфигурации

```bash
bash ci/break.sh restore
git add -A
git commit -m "ci: восстановлена рабочая конфигурация"
git push gitlab main
```

После всех сценариев выполняется **финальный полный успешный пайплайн** —
это отдельное требование ЛР4. Ссылка: _заполни_

---

## 6. Выводы

_Заполняется после прогона всех сценариев. Формулировки, которые должны
подтвердиться фактами из таблицы выше:_

- порядок этапов соответствует `check → test → build → deploy → smoke → cleanup`;
- сбой любой обязательной проверки блокирует публикацию образа и deploy —
  ни в одном сценарии С4–С9 образ не попал в реестр и стенд не обновился;
- `allow_failure: true` не используется, код возврата при провале ненулевой;
- JUnit-отчёты сохраняются в artifacts и при неуспешном прогоне;
- smoke-проверка ловит проблему, которую не видят тесты (С10);
- развёртывание воспроизводимо: повторный deploy не теряет данные стенда.
