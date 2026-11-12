# Первый пайплайн: пошагово

Это короткая практическая инструкция: от «у меня есть раннер» до «я вижу зелёный
пайплайн в GitLab». Общая теория и настройка стенда — в [`CI_GUIDE.md`](CI_GUIDE.md).

Все команды выполняются **внутри WSL (Ubuntu)**.

---

## Шаг 0. Забираем файлы с CI

Все файлы пайплайна лежат в ветке `arena/9826b93f-onit` твоего GitHub-репозитория
(коммит `a16caf9`). Забираем их:

```bash
cd ~/onit                    # твоя папка с проектом
git status                   # смотрим, нет ли незакоммиченного
git fetch origin             # тянем информацию о ветках с GitHub
git switch arena/9826b93f-onit
```

Если `git status` показал незакоммиченные изменения — сначала
`git stash`, потом `git switch`, потом `git stash pop`.

Проверяем, что файлы на месте:

```bash
ls .gitlab-ci.yml ci/ stand/
```

Должны увидеть `.gitlab-ci.yml`, семь скриптов в `ci/` и `stand/compose.stand.yaml`.

---

## Шаг 1. Проверяем, что раннер готов принять работу

Три быстрые проверки. Если хоть одна не проходит — пайплайн зависнет в *pending*.

### 1.1. Контейнер раннера жив

```bash
docker ps --filter name=gitlab-runner
```

Должна быть строка со статусом `Up`.

### 1.2. Раннер опрашивает GitLab

```bash
docker logs --tail 15 gitlab-runner
```

Ищем строку вроде:

```
Checking for jobs... nothing                       url=https://gitlab.com
```

Это значит, что связь есть. Если вместо этого ошибки `x509`, `timeout` или
`403 Forbidden` — проблема с сетью или токеном.

### 1.3. Раннеру проброшен docker.sock

```bash
grep -A4 '\[runners.docker\]' ~/gitlab-runner/config/config.toml
```

В выводе **обязательно** должна быть строка с сокетом:

```toml
  [runners.docker]
    volumes = ["/cache", "/var/run/docker.sock:/var/run/docker.sock"]
```

Если `/var/run/docker.sock` там нет — джобы `config:check`, `build:image`,
`deploy:stand:socket` и `cleanup` упадут с
`Cannot connect to the Docker daemon`. Лечится перерегистрацией:

```bash
docker run --rm -it \
  -v ~/gitlab-runner/config:/etc/gitlab-runner \
  gitlab/gitlab-runner:latest register \
  --non-interactive \
  --url "https://gitlab.com" \
  --token "glrt-ВСТАВЬ_СВОЙ_ТОКЕН" \
  --executor "docker" \
  --docker-image "node:24-alpine" \
  --docker-volumes "/var/run/docker.sock:/var/run/docker.sock" \
  --docker-volumes "/cache" \
  --description "onit-local-runner"
docker restart gitlab-runner
```

### 1.4. Раннер виден в GitLab

Project → **Settings → CI/CD → Runners**.

- Зелёный кружок напротив раннера.
- Раскрыть блок и убедиться, что **Run untagged jobs** включён.
  Если выключен — джобы никогда не подхватятся, потому что в `.gitlab-ci.yml`
  теги не заданы.

---

## Шаг 2. Подключаем GitLab как remote и пушим ветку

### 2.1. Проверяем remote

```bash
git remote -v
```

Возможны два варианта.

**А) GitLab уже подключён** (в списке есть строка `gitlab`) — переходи к шагу 2.2.

**Б) GitLab не подключён** — добавляем:

```bash
git remote add gitlab https://gitlab.com/Silvio-613-11-21/onit.git
```

Если GitLab-проект ещё не создан: gitlab.com → **New project → Create blank
project**, имя `onit`, видимость *Private*, галку
*Initialize repository with a README* **снять**.

### 2.2. Пушим в ОТДЕЛЬНУЮ ветку

Именно в отдельную, не в `main`. Причина: публикация образа и deploy разрешены
только из основной ветки, а для них нужны переменные CI/CD, которых у тебя пока
нет. На отдельной ветке отработают только проверки и тесты — это и есть
идеальный первый запуск.

```bash
git switch -c feature/first-pipeline
git push -u gitlab feature/first-pipeline
```

Когда git спросит логин и пароль:

- *Username*: `Silvio-613-11-21`
- *Password*: **Personal Access Token** (не пароль от сайта).
  Создать: аватарка → *Preferences → Access Tokens → Add new token*,
  scopes **read_repository** и **write_repository**.

**Всё. Пайплайн запустился сам** — push является триггером.

---

## Шаг 3. Смотрим на пайплайн

Project → **Build → Pipelines** (в старых версиях меню: *CI/CD → Pipelines*).

Сверху появится строка с номером пайплайна, например `#1`, веткой
`feature/first-pipeline` и статусом. Кликаем на номер.

### Что должно быть на экране

Пайплайн рисуется слева направо по этапам:

```
check                test                     build   deploy   smoke   cleanup
┌──────────────┐   ┌───────────────────┐
│ typecheck    │   │ test:unit         │      ⌀       ⌀        ⌀       ⌀
│ config:check │   │ test:integration  │   skipped  skipped  skipped  skipped
└──────────────┘   └───────────────────┘
```

| Джоба | Этап | Что делает | Статус |
|---|---|---|---|
| `typecheck` | check | `tsc --noEmit` | должен быть зелёным |
| `config:check` | check | валидность трёх compose-файлов | зелёным |
| `test:unit` | test | 14 unit-тестов | зелёным |
| `test:integration` | test | 10 интеграционных + своя `postgres:17-alpine` | зелёным |
| `build:image` | build | сборка и публикация образа | **skipped** |
| `deploy:stand:ssh` | deploy | деплой на стенд | **skipped** |
| `deploy:stand:socket` | deploy | запасной деплой | **skipped** |
| `smoke` | smoke | `/health` + сквозной CRUD | **skipped** |
| `cleanup` | cleanup | уборка | **skipped** |

`skipped` здесь — **правильно**. Это доказательство того, что публикация
и развёртывание привязаны к основной ветке (одно из требований ЛР3).

Ни одна из этих четырёх джоб **не требует переменных CI/CD** — все нужные
значения зашиты в самом `.gitlab-ci.yml` (например, адрес тестовой БД).

Сколько это длится: первый запуск 3–6 минут, потому что раннер скачивает
образы `node:24-alpine`, `docker:27`, `alpine:3.20` и `postgres:17-alpine`.
Повторные запуски — около минуты.

---

## Шаг 4. Читаем лог джобы

Клик по любой джобе открывает её лог. На что смотреть в `test:integration`:

```
$ node ci/wait-for-db.mjs "$TEST_DATABASE_URL"
[wait-for-db] БД готова за 1843 мс: postgresql://test_user:***@test-db:5432/onit_test
$ npm run test:integration:ci
...
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

Строка `БД готова` означает, что сервис-контейнер с PostgreSQL поднялся
и скрипт `ci/wait-for-db.mjs` его дождался.

В `config:check`:

```
$ docker compose -f compose.yaml config --quiet
$ docker compose -f compose.tests.yaml config --quiet
$ APP_IMAGE="..." docker compose --env-file stand/.env.stand.example -f stand/compose.stand.yaml config --quiet
$ echo "Все compose-файлы валидны"
Все compose-файлы валидны
```

Тихий вывод `config --quiet` — это хорошо: значит ошибок нет.

---

## Шаг 5. Скачиваем JUnit-отчёт

У каждой тестовой джобы справа сверху есть кнопка **Download artifacts**
(или *Job artifacts → Download*).

Внутри архива:

```
reports/unit.junit.xml           14 testcase
reports/integration.junit.xml    10 testcase
```

GitLab сам парсит эти файлы и рисует их на вкладке пайплайна в блоке
**Tests** — со списком тестов и временем выполнения. Это то, что требует ЛР3
(«сохранять отчёты JUnit как artifacts»).

Отчёты сохраняются с флагом `when: always`, то есть **даже если тесты упали**.

---

## Шаг 6. Если что-то пошло не так

### Пайплайн висит в `pending` и не начинается

Раннер не берёт работу. По порядку:

1. Settings → CI/CD → Runners: раннер **зелёный**?
2. **Run untagged jobs** включён?
3. `docker logs --tail 15 gitlab-runner` — есть `Checking for jobs...`?
4. Settings → CI/CD → Runners: если включены **shared runners**, выключи их —
   без верификации аккаунта они не работают и только мешают.

### `Cannot connect to the Docker daemon`

Раннеру не проброшен сокет. Смотри шаг 1.3.

### `npm ci` падает или висит

Нет связи с `registry.npmjs.org`. Проверь из WSL: `npm ping`.

### Образ `node:24-alpine` или `docker:27` не скачивается

Docker Hub недоступен или упираешься в лимит. Проверь:
`docker pull node:24-alpine`. Если не тянется — настрой зеркало реестра
(Docker Desktop → Settings → Docker Engine → `registry-mirrors`).

Если не находится именно тег `docker:27` — замени в `.gitlab-ci.yml` все
`image: docker:27` на `image: docker:latest`.

### Джоба упала, хочется перезапустить без нового коммита

На странице пайплайна: кнопка **Retry** (перезапустить упавшие джобы)
или **Run pipeline** справа вверху на странице *Build → Pipelines*
(создаст новый пайплайн на той же ветке).

### Как отменить зависший пайплайн

Кнопка **Cancel** на странице пайплайна.

---

## Шаг 7. Что дальше

Когда четыре джобы станут зелёными:

1. Создай **merge request**: *Merge requests → New merge request*,
   `feature/first-pipeline` → `main`. Пайплайн должен остаться **один** —
   это проверка требования «без дублирующих пайплайнов» (сценарий С2).
2. Заполни переменные CI/CD (таблица в [`CI_GUIDE.md`](CI_GUIDE.md), часть 6) —
   без них `deploy` и `smoke` не отработают.
3. Жми **Merge** — запустится полный пайплайн со сборкой образа, публикацией
   в Container Registry, деплоем на стенд и smoke-проверкой.
4. Дальше — 10 сценариев из [`LAB4_PROTOCOL.md`](LAB4_PROTOCOL.md).

---

## Быстрая шпаргалка

```bash
# забрать файлы CI
git fetch origin && git switch arena/9826b93f-onit

# проверить раннер
docker ps --filter name=gitlab-runner
docker logs --tail 15 gitlab-runner
grep -A4 '\[runners.docker\]' ~/gitlab-runner/config/config.toml

# запустить первый пайплайн
git switch -c feature/first-pipeline
git push -u gitlab feature/first-pipeline

# перезапустить раннер, если он задумался
docker restart gitlab-runner
```
