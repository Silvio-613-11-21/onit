## Привет Mr.Яскевич =\)

тема: ToDoList с уклоном в ежедневник и одной классной фитчей <br/>
(других идей у меня для вас нет, да и собственно говоря вы большего не достойны=\))


Установить зависимости 
```
  npm i 
```

Миграция бд 
```
  npx drizzle-kit generate
  npx drizzle-kit migrate
```
или
```
  npx drizzle-kit push
```

Запуск
```
  npm run start
```


Перейдите сюда:
[swagger ui](http://127.0.0.1:8080/api-docs)

<!-- ## Сущности <br/>

- block <br/>
| id | date | title?(optional) | 
    
- task <br/>
| id | blockId(foreign key) | title | description?(optional) |  state(boolean) | noteId?(optional foreign key) |

- subtask <br/>
| id | taskId(foreign key) | title | description?(optional) | state(boolean) |  

- note <br/>
| id | blockId(foreign key) | title | description?(optional) |  -->



## Тесты

Все тесты
```
  npm test
```

Только unit-тесты 
```
  npm run test:unit
```

Только интеграционные 
```
  npm run test:integration
```

Сквозной CRUD по развёрнутому приложению (ЛР4). Требует запущенного стенда:
```
  E2E_BASE_URL=http://localhost:8090 npm run test:e2e
```

Проверка типов:
```
  npm run typecheck
```

Варианты `*:ci` дополнительно пишут JUnit-отчёт в `reports/`.

## Доакер 

## Запуск через Docker

Требуется Docker Desktop.

Сборка и запуск (приложение + PostgreSQL, миграции применяются автоматически):

```powershell
docker compose up --build
```

Swagger UI: http://localhost:8080/api-docs

Остановка (данные БД сохраняются в volume):

```powershell
docker compose down
```

Полный сброс вместе с данными БД:

```powershell
docker compose down -v
```

Проверка: создать запись через API → `docker compose down` →
`docker compose up` → запись по-прежнему доступна через `GET /block/getall`.

Тесты:



Для запуска всех unit- и интеграционных тестов в Docker:

```powershell
docker compose -f compose.tests.yaml up --build --exit-code-from backend
```

Команда возвращает код завершения тестов. Тестовая БД запускается отдельно
от основной, не публикует порт и хранит данные только до остановки контейнера.
Интеграционные тесты удаляют и создают её схемы заново; данные основной БД
не затрагиваются. Для удаления тестовых контейнеров и сети выполните:

```powershell
docker compose -f compose.tests.yaml down
```



## CI/CD (ЛР3 и ЛР4)

Пайплайн описан в [`.gitlab-ci.yml`](.gitlab-ci.yml):

| Этап | Джобы | Что делают |
|---|---|---|
| `check` | `typecheck`, `config:check` | `tsc --noEmit`, валидность всех compose-файлов |
| `test` | `test:unit`, `test:integration` | тесты ЛР1 + проверки API и БД; интеграционные — с отдельной `postgres:17-alpine` |
| `build` | `build:image` | сборка и публикация в GitLab Container Registry (только основная ветка) |
| `deploy` | `deploy:stand:ssh` / `deploy:stand:socket` | развёртывание опубликованного образа на стенде через Docker Compose |
| `smoke` | `smoke` | `/health`, `/health/ready`, CRUD и сквозной e2e-сценарий по опубликованному образу |
| `cleanup` | `cleanup` | удаление временного окружения и тестовых данных; данные стенда сохраняются |

Особенности:

- Пайплайн создаётся и на push, и на merge request, но **без дублей** (`workflow:rules`).
- Публикация и deploy — **только из основной ветки** (`rules` у соответствующих джоб).
- Ошибка любой обязательной проверки блокирует публикацию и deploy;
  `allow_failure: true` не используется нигде.
- JUnit-отчёты и диагностика сохраняются в artifacts с `when: always`,
  то есть и при упавших тестах.
- Секреты хранятся только в Settings → CI/CD → Variables.

Документация:

- [`CI_GUIDE.md`](CI_GUIDE.md) — пошаговая настройка GitLab, Runner, SSH-ключей,
  стенда и переменных CI/CD.
- [`LAB4_PROTOCOL.md`](LAB4_PROTOCOL.md) — протокол испытаний пайплайна на
  10 сценариях (успешных и намеренно неуспешных).

Служебные скрипты:

| Скрипт | Назначение |
|---|---|
| `ci/wait-for-db.mjs` | ждёт готовности тестовой БД перед интеграционными тестами |
| `ci/smoke.sh` | smoke-проверка стенда после deploy |
| `ci/deploy-ssh.sh` | деплой на стенд по SSH |
| `ci/deploy-local.sh` | деплой через `docker.sock` (режим `DEPLOY_MODE=socket`) |
| `ci/cleanup.sh` | уборка временного окружения и тестовых данных |
| `ci/break.sh` | внесение/откат намеренного сбоя для ЛР4 |
| `ci/check-stand-ssh.sh` | проверка доступности стенда (запускается вручную) |

Стенд описан в `stand/compose.stand.yaml`: в нём нет секции `build`, поэтому
на стенде всегда запускается именно опубликованный образ.
