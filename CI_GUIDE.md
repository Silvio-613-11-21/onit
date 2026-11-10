# CI/CD в GitLab: пошаговая инструкция (ЛР3 + ЛР4)

Инструкция написана под твою конфигурацию: **Windows + WSL2 Ubuntu**, Docker Desktop
уже установлен, **учебный стенд — твой же компьютер**.

Всё, что описано ниже, выполняется **внутри WSL (Ubuntu)**, а не в PowerShell —
кроме тех двух мест, где это оговорено отдельно.

---

## Оглавление

1. [Что в итоге получится](#часть-0-что-в-итоге-получится)
2. [Проверяем WSL2 и Docker](#часть-1-проверяем-wsl2-и-docker)
3. [Переносим проект на GitLab](#часть-2-переносим-проект-на-gitlab)
4. [Ставим GitLab Runner](#часть-3-ставим-gitlab-runner)
5. [SSH: sshd на стенде и ключи](#часть-4-ssh-sshd-на-стенде-и-ключи)
6. [Deploy token для Container Registry](#часть-5-deploy-token-для-container-registry)
7. [Переменные CI/CD](#часть-6-переменные-cicd)
8. [Первый пайплайн](#часть-7-первый-пайплайн)
9. [ЛР4: 10 сценариев](#часть-8-лр4-10-сценариев)
10. [Если что-то пошло не так](#часть-9-если-что-то-пошло-не-так)
11. [Что показать на защите](#часть-10-что-показать-на-защите)

---

## Часть 0. Что в итоге получится

```
        GitHub (зеркало)                      GitLab.com
   ┌──────────────────┐                 ┌──────────────────────┐
   │ Silvio-613-11-21 │   git push      │ Silvio-613-11-21/onit│
   │      /onit       │ ───────────────▶│  .gitlab-ci.yml      │
   └──────────────────┘                 └──────────┬───────────┘
                                                   │ запускает пайплайн
                                                   ▼
                       ┌──────────────────────────────────────────────┐
                       │  GitLab Runner (контейнер в Docker, WSL2)    │
                       │                                              │
                       │  check   → tsc + docker compose config       │
                       │  test    → unit + integration (временная БД) │
                       │  build   → docker build + push в Registry    │
                       │  deploy  → ssh → docker compose pull/up      │
                       │  smoke   → /health + сквозной CRUD (e2e)     │
                       │  cleanup → уборка                            │
                       └───────────────────┬──────────────────────────┘
                                           │ ssh -p 2222
                                           ▼
                       ┌──────────────────────────────────────────────┐
                       │  УЧЕБНЫЙ СТЕНД (тот же ПК, порт 8090)        │
                       │  compose-проект onit-stand                   │
                       │  backend (образ из Registry) + PostgreSQL    │
                       │  volume stand_postgres_data — данные живут   │
                       └──────────────────────────────────────────────┘
```

Ключевая идея ЛР3: на стенде **ничего не собирается**. Стенд делает
`docker compose pull` и запускает ровно тот образ, который CI опубликовал
в GitLab Container Registry.

---

## Часть 1. Проверяем WSL2 и Docker

### 1.1. В PowerShell

```powershell
wsl -l -v
```

Ожидаем примерно такое:

```
  NAME      STATE           VERSION
* Ubuntu    Running         2
```

Если дистрибутива нет — `wsl --install -d Ubuntu` и перезагрузка.

### 1.2. Заходим в WSL и проверяем Docker

Пуск → Ubuntu (или в PowerShell просто `wsl`). Дальше:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

Все три команды должны отработать без ошибок.

**Если `docker: command not found`** — Docker Desktop не пробросил docker в WSL:
Docker Desktop → шестерёнка Settings → **Resources → WSL integration** →
включить переключатель напротив **Ubuntu** → *Apply & restart*.

**Если `hello-world` не скачивается** (висит на `Pulling from library/hello-world`) —
Docker Hub недоступен или тормозит. Это лечится зеркалом реестра:
Docker Desktop → Settings → **Docker Engine**, добавить в JSON блок
`registry-mirrors` и *Apply & restart*:

```json
{
  "registry-mirrors": ["https://<адрес-доступного-тебе-зеркала>"]
}
```

Зеркала периодически умирают, поэтому конкретный адрес здесь не приводится —
возьми актуальный у одногруппников или в чате потока. Проверка:
`docker run --rm hello-world` должен пройти.

---

## Часть 2. Переносим проект на GitLab

### 2.1. Создаём проект

1. Зайди на <https://gitlab.com/Silvio-613-11-21>
2. **New project** → **Create blank project**
3. Заполни:
   - *Project name*: `onit`
   - *Project URL*: твой логин
   - *Visibility*: **Private**
   - **СНИМИ** галку *Initialize repository with a README* — иначе GitLab создаст
     свой коммит и push не пройдёт без merge.
4. **Create project**

Адрес проекта будет `https://gitlab.com/Silvio-613-11-21/onit.git`.

### 2.2. Создаём Personal Access Token (чтобы пушить)

Аватарка справа вверху → **Preferences** → **Access Tokens** → *Add new token*

- *Name*: `push-from-wsl`
- *Expiration*: любая дата
- *Scopes*: отметить **read_repository** и **write_repository**
- **Create personal access token**

Скопируй токен сразу — он показывается один раз. Это не пароль от сайта,
это отдельный ключ.

### 2.3. Пушим

В WSL:

```bash
cd ~/onit          # путь к твоей папке с проектом
git remote -v      # смотрим, что уже подключено
```

Если в списке уже есть `origin` на GitHub — добавляем GitLab вторым remote:

```bash
git remote add gitlab https://gitlab.com/Silvio-613-11-21/onit.git
git push -u gitlab main
```

Когда git спросит логин и пароль:

- *Username*: `Silvio-613-11-21`
- *Password*: **токен** из шага 2.2

Проверка: обнови страницу проекта на GitLab — там должны появиться все файлы.

### 2.4. Проверяем ветку по умолчанию

Project → **Settings → Repository → Branch defaults**.
*Default branch* должна быть `main`. Это важно: публикация образа и deploy
в `.gitlab-ci.yml` разрешены только из неё.

---

## Часть 3. Ставим GitLab Runner

Раннер — это программа, которая физически выполняет джобы. Так как аккаунт
не верифицирован по номеру телефона, **общие (shared) раннеры GitLab тебе
недоступны** — пайплайны на них просто не запустятся. Свой раннер решает
проблему полностью, верификация для него не нужна.

### 3.1. Запускаем раннер одной командой

```bash
mkdir -p ~/gitlab-runner/config

docker run -d --name gitlab-runner --restart always \
  -v ~/gitlab-runner/config:/etc/gitlab-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gitlab/gitlab-runner:latest
```

Проверка:

```bash
docker ps --filter name=gitlab-runner
```

Контейнер должен быть в статусе `Up`.

### 3.2. Создаём раннер в GitLab и получаем токен

Project → **Settings → CI/CD → Runners** → *New project runner*

- *Tags*: можно оставить пустыми
- **Run untagged jobs** — **ОБЯЗАТЕЛЬНО ВКЛЮЧИ**. Если не включить, джобы
  будут висеть в статусе *pending* вечно.
- *Description*: `onit-local-runner`
- **Create runner**

Скопируй токен — он начинается с `glrt-`.

### 3.3. Регистрируем раннер

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
```

Разбор двух важных строк:

- `--executor "docker"` — каждая джоба запускается в своём контейнере.
- `--docker-volumes "/var/run/docker.sock:/var/run/docker.sock"` — **без этого
  джобы `build:image` и `deploy:stand:socket` не смогут управлять докером.**
  Это самая частая причина ошибки `Cannot connect to the Docker daemon`.

### 3.4. Проверяем

```bash
cat ~/gitlab-runner/config/config.toml
docker logs --tail 20 gitlab-runner
```

В `config.toml` должны быть строки `executor = "docker"` и
`volumes = ["/cache", "/var/run/docker.sock:/var/run/docker.sock"]`.

В логах — `Configuration loaded` и `Checking for jobs...`.

В GitLab: Settings → CI/CD → Runners — раннер с зелёным кружком.

---

## Часть 4. SSH: sshd на стенде и ключи

Стендом будет этот же компьютер. Чтобы деплой шёл «по-взрослому» — по SSH
с приватным ключом, — нужен sshd внутри WSL.

> Если возиться с SSH не хочется, этот раздел можно пропустить и включить
> режим `DEPLOY_MODE = socket` (см. часть 6). Тогда деплой пойдёт напрямую
> через `docker.sock`. Всё остальное не изменится.

### 4.1. Ставим и настраиваем sshd

```bash
sudo apt update
sudo apt install -y openssh-server

sudo sed -i 's/^#\?Port .*/Port 2222/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PubkeyAuthentication .*/PubkeyAuthentication yes/' /etc/ssh/sshd_config

sudo mkdir -p /var/run/sshd
sudo service ssh start
sudo service ssh status
```

Порт **2222**, а не 22 — чтобы не конфликтовать с Windows.

### 4.2. Чтобы sshd поднимался сам после перезагрузки

```bash
sudo tee -a /etc/wsl.conf > /dev/null <<'EOF'
[boot]
systemd=true
EOF
```

Потом в **PowerShell**: `wsl --shutdown`. Снова зайди в WSL и выполни:

```bash
sudo systemctl enable --now ssh
systemctl is-active ssh
```

Должно напечатать `active`.

### 4.3. Создаём ключ и разрешаем вход по нему

```bash
ssh-keygen -t ed25519 -C "gitlab-ci-deploy" -f ~/onit_stand_key -N ""

mkdir -p ~/.ssh && chmod 700 ~/.ssh
cat ~/onit_stand_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Проверяем вход:

```bash
ssh -i ~/onit_stand_key -p 2222 $USER@localhost "echo ssh работает && docker compose version"
```

### 4.4. Проверяем доступ **из контейнера** (ровно так, как это делает CI)

```bash
bash ci/check-stand-ssh.sh
```

Скрипт сам переберёт `host.docker.internal`, IP твоего WSL и `172.17.0.1`,
и в конце напечатает готовые значения для переменных CI/CD. Перепиши их
в блокнот — они понадобятся в части 6.

Если ни один адрес не подошёл — не беда: ставь `DEPLOY_MODE = socket`.

---

## Часть 5. Deploy token для Container Registry

Раннер пушит образ, используя автоматически выдаваемые GitLab переменные
`CI_REGISTRY_USER` / `CI_REGISTRY_PASSWORD` — для них ничего делать не нужно.

А вот **стенду** нужно уметь этот образ *скачать*. Для стенда заведём
отдельный токен только на чтение:

1. Project → **Settings → Repository → Deploy tokens** → *Add new token*
2. *Name*: `stand-registry`
3. *Scopes*: отметить **только read_registry**
4. **Create deploy token**
5. Скопируй **Username** (выглядит как `gitlab+deploy-token-3`) и **Token**

---

## Часть 6. Переменные CI/CD

Project → **Settings → CI/CD → Variables** → *Add variable*.

Для всех переменных: *Type* = **Variable**, *Environment* = All.
Флажок **Masked** можно ставить для паролей и токенов.
Флажок **Protected** — **НЕ СТАВЬ** (иначе переменные не попадут в пайплайны
незащищённых веток, и сценарии ЛР4 не отработают).

| Переменная | Значение | Откуда взять |
|---|---|---|
| `DEPLOY_MODE` | `ssh` | или `socket`, если SSH не завёлся |
| `STAND_SSH_HOST` | `host.docker.internal` | из вывода `ci/check-stand-ssh.sh` |
| `STAND_SSH_USER` | твой пользователь | `echo $USER` в WSL |
| `STAND_SSH_PORT` | `2222` | как настроил в части 4 |
| `STAND_SSH_KEY` | содержимое приватного ключа | `cat ~/onit_stand_key` |
| `STAND_APP_PORT` | `8090` | порт стенда |
| `SMOKE_BASE_URL` | `http://host.docker.internal:8090` | |
| `STAND_POSTGRES_USER` | `onit` | придумай сам |
| `STAND_POSTGRES_PASSWORD` | длинный пароль | придумай сам |
| `STAND_POSTGRES_DB` | `onit` | придумай сам |
| `STAND_REGISTRY_USER` | `gitlab+deploy-token-N` | из части 5 |
| `STAND_REGISTRY_PASSWORD` | токен деплоя | из части 5 |

Ключ целиком копируется так:

```bash
cat ~/onit_stand_key
```

Выдели всё, начиная с `-----BEGIN OPENSSH PRIVATE KEY-----` и включая
последнюю строку `-----END OPENSSH PRIVATE KEY-----`.

**Секретов в репозитории быть не должно.** В `.gitlab-ci.yml` нет ни одного
пароля — только ссылки на переменные. Именно это и проверяет преподаватель.

---

## Часть 7. Первый пайплайн

### 7.1. Push в отдельную ветку

```bash
git checkout -b feature/cicd
git add -A
git commit -m "ci: GitLab CI/CD для ЛР3"
git push -u gitlab feature/cicd
```

Project → **Build → Pipelines**. Ожидаем:

| Джоба | Статус |
|---|---|
| `typecheck` | зелёная |
| `config:check` | зелёная |
| `test:unit` | зелёная |
| `test:integration` | зелёная |
| `build:image` | **skipped** (не основная ветка) |
| `deploy:stand:ssh` | **skipped** |
| `smoke` | **skipped** |
| `cleanup` | **skipped** |

### 7.2. Merge request — проверяем, что пайплайн один

**Merge requests → New merge request** → source `feature/cicd`, target `main`.

Пайплайн должен появиться **ровно один**, с пометкой *merge request*.
Отдельный branch-пайплайн на тот же коммит создаваться не должен —
это и есть требование «без дублирующих пайплайнов». Отвечает за него блок
`workflow:rules` в `.gitlab-ci.yml`.

### 7.3. Merge — полный пайплайн

Жмём **Merge**. Запускается полный конвейер:

```
check → test → build:image → deploy:stand:ssh → smoke → cleanup
```

Что смотреть:

- `build:image` — в конце `docker pull` стягивает образ обратно: значит он
  точно лежит в реестре.
- **Deploy → Container Registry** (слева в меню проекта) — там появятся теги
  `<короткий-sha>` и `latest`.
- `deploy:stand:ssh` — в логе видно `docker compose pull` и `up -d`.
- `smoke` — отчёт `smoke-report.txt` в артефактах.
- `cleanup` — показывает, что контейнеры стенда живы, а volume на месте.

### 7.4. Проверяем руками

В WSL:

```bash
curl http://localhost:8090/health
curl http://localhost:8090/health/ready
docker ps --filter label=com.docker.compose.project=onit-stand
docker volume ls --filter name=stand_postgres_data
```

И в браузере: <http://localhost:8090/api-docs>

### 7.5. Проверка сохранности данных (требование ЛР3)

```bash
# создаём запись
curl -X POST http://localhost:8090/block/create \
  -H 'Content-Type: application/json' \
  -d '{"date":"2026-11-10","title":"проверка сохранности"}'

docker compose --project-directory ~/onit-stand stop
docker compose --project-directory ~/onit-stand start

curl http://localhost:8090/block/getall
```

Запись должна остаться. Volume при этом **не удаляем**.

---

## Часть 8. ЛР4: 10 сценариев

Полный протокол — в файле **`LAB4_PROTOCOL.md`**. Механика такая:

```bash
# 1. вносим ОДИН сбой
bash ci/break.sh s5

# 2. коммитим и пушим
git add -A
git commit -m "test(ci): С5 — намеренный сбой (имя файла отчёта)"
git push gitlab main

# 3. смотрим упавший пайплайн, сохраняем ссылку и скачиваем JUnit из артефактов

# 4. возвращаем рабочую конфигурацию
bash ci/break.sh restore
git add -A
git commit -m "test(ci): восстановлена рабочая конфигурация после С5"
git push gitlab main
```

Скрипт `ci/break.sh` не даст внести второй сбой, пока не выполнишь `restore` —
ровно то, что требует задание («сбои вносить по одному»).

| Сценарий | Что ломаем | Где должно упасть |
|---|---|---|
| С1 | ничего | push в ветку: check+test, build/deploy skipped |
| С2 | ничего | merge request: ровно один пайплайн |
| С3 | ничего | merge в main: полный успешный пайплайн |
| С4 | `- [x]` → `- [X]` в markdown | `test:unit` |
| С5 | `report.md` → `report.txt` | `test:integration` (`api.test.ts`) |
| С6 | удаление заметки не удаляет строку | `test:integration` (`db.test.ts`) |
| С7 | ошибка типов TypeScript | `typecheck` |
| С8 | в образ не копируется `package-lock.json` | `build:image` |
| С9 | образ тегируется несуществующим путём | `build:image` (шаг `docker push`) |
| С10 | стенд получает неверный адрес БД | `smoke` (deploy при этом зелёный) |

---

## Часть 9. Если что-то пошло не так

| Симптом | Причина | Лечение |
|---|---|---|
| Пайплайн висит в *pending* | раннер не подхватывает джобы | Settings → CI/CD → Runners: раннер онлайн? Включён ли *Run untagged jobs*? |
| `Cannot connect to the Docker daemon` | не проброшен сокет | перерегистрируй раннер с `--docker-volumes "/var/run/docker.sock:/var/run/docker.sock"` |
| `Identity verification is required` | джоба попала на shared-раннер GitLab | Settings → CI/CD → Runners → *Disable shared runners* для проекта |
| `denied: requested access to the resource is denied` при `docker push` | нет прав в реестр | Settings → Packages and registries: реестр включён? |
| Стенд не скачал образ | нет deploy-токена | `STAND_REGISTRY_USER` / `STAND_REGISTRY_PASSWORD` + `read_registry` |
| `ssh: connect to host ... port 2222: Connection refused` | sshd не запущен или недоступен из контейнера | `sudo service ssh start`, затем `bash ci/check-stand-ssh.sh` |
| `Permission denied (publickey)` | ключ не добавлен или не тот | `cat ~/onit_stand_key.pub >> ~/.ssh/authorized_keys`; в `STAND_SSH_KEY` — **приватный** ключ целиком |
| `smoke` падает, `/health/ready` → 503 | приложение не видит БД | `docker compose --project-directory ~/onit-stand logs backend` |
| Порт 8090 занят | что-то уже слушает | поменяй `STAND_APP_PORT` и `SMOKE_BASE_URL` |
| `docker: not found` в джобе `config:check` | нужен образ с compose-плагином | в `.gitlab-ci.yml` замени `docker:27` на `docker:latest` |
| `npm ci` падает в джобе | нет сети до registry.npmjs.org | проверь `npm ping` из WSL |
| Пайплайн не создаётся вообще | ошибка в `.gitlab-ci.yml` | Build → Pipeline editor покажет причину |

Полезные команды:

```bash
docker logs --tail 50 gitlab-runner                  # что делает раннер
docker compose --project-directory ~/onit-stand ps    # состояние стенда
docker compose --project-directory ~/onit-stand logs backend
```

---

## Часть 10. Что показать на защите

**ЛР3**

1. `.gitlab-ci.yml`: этапы, `workflow:rules` (нет дублей), `rules` у
   `build:image` и `deploy:*` (только основная ветка), `artifacts:when: always`
   с JUnit-отчётами.
2. Settings → CI/CD → Variables — секреты лежат там, а не в коде.
3. Deploy → Container Registry — опубликованные теги.
4. Зелёный полный пайплайн: `check → test → build → deploy → smoke → cleanup`.
5. Стенд: `docker ps`, `curl /health`, Swagger UI на порту 8090.
6. Сохранность данных после `stop` / `start`.

**ЛР4**

1. `LAB4_PROTOCOL.md` с заполненной таблицей: ожидание / факт / ссылка на пайплайн.
2. Ссылки на упавшие пайплайны (С4–С10) и скачанные JUnit-отчёты.
3. Демонстрация вживую: `bash ci/break.sh s5` → push → упавший `test:integration`
   → `build:image` не запустился → `restore` → зелёный пайплайн.
4. Новые тесты: `tests/integration/db.test.ts` (6 проверок API+БД) и
   `tests/e2e/published.test.ts` (сквозной CRUD по опубликованному образу).
5. `ci/cleanup.sh` в логе пайплайна: временное окружение удалено, volume стенда цел.
