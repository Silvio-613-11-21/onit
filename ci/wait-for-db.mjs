// Ждёт, пока тестовая PostgreSQL примет подключения.
// В CI сервис postgres:17-alpine поднимается параллельно с джобой,
// поэтому без такого ожидания первый же запрос уходит в пустоту.
//
// Использование: node ci/wait-for-db.mjs "postgresql://user:pass@host:5432/db"

import pg from 'pg';

const url = process.argv[2] ?? process.env.TEST_DATABASE_URL;

if (!url) {
    console.error('[wait-for-db] не передан URL базы данных');
    process.exit(2);
}

const safeUrl = url.replace(/:[^:@/]*@/, ':***@');
const timeoutMs = Number(process.env.WAIT_FOR_DB_TIMEOUT ?? 60_000);
const startedAt = Date.now();

for (;;) {
    const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 3000 });

    try {
        await client.connect();
        await client.query('select 1');
        await client.end();

        console.log(`[wait-for-db] БД готова за ${Date.now() - startedAt} мс: ${safeUrl}`);
        process.exit(0);
    } catch (error) {
        try {
            await client.end();
        } catch {
            // соединение и так не установлено
        }

        if (Date.now() - startedAt > timeoutMs) {
            console.error(`[wait-for-db] БД не ответила за ${timeoutMs} мс: ${safeUrl}`);
            console.error(`[wait-for-db] последняя ошибка: ${error?.message ?? error}`);
            process.exit(1);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}
