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


