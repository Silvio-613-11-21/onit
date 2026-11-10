import 'dotenv/config';
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { count, eq } from 'drizzle-orm';

import { applyMigrations, resetDatabase, closeDatabase } from '../helpers/testDb.ts';
import { startTestServer, request } from '../helpers/http.ts';

// Прямой доступ к БД: эти проверки сверяют то, что реально лежит в PostgreSQL,
// а не то, что вернул HTTP-ответ. Так находится рассинхрон API и хранилища.
import { db } from '../../src/database/db.ts';
import { block, note, task, subtask } from '../../src/database/schema.ts';

const { default: app } = await import('../../src/app.ts');

let server: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
    await applyMigrations();
    server = await startTestServer(app);
});

beforeEach(async () => {
    await resetDatabase();
});

after(async () => {
    await server?.close();
    await closeDatabase();
});

async function countRows(table: typeof block | typeof note | typeof task | typeof subtask) {
    const [row] = await db.select({ n: count() }).from(table);
    return Number(row.n);
}

async function createBlockThroughApi(title: string) {
    const created = await request(server.baseUrl, 'POST', '/block/create', { date: '2026-11-10', title });
    assert.equal(created.status, 200);

    const [row] = await db.select().from(block);
    assert.ok(row, 'после POST /block/create в таблице block должна появиться строка');
    return row;
}

test('POST /block/create действительно пишет строку в таблицу block', async () => {
    await request(server.baseUrl, 'POST', '/block/create', { date: '2026-11-10', title: 'Блок из API' });

    const rows = await db.select().from(block);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].date, '2026-11-10');
    assert.equal(rows[0].title, 'Блок из API');
    assert.equal(await countRows(block), 1);
});

test('id выдаёт PostgreSQL (generated always as identity), а не приложение', async () => {
    await request(server.baseUrl, 'POST', '/block/create', { date: '2026-11-10', title: 'Первый' });
    await request(server.baseUrl, 'POST', '/block/create', { date: '2026-11-11', title: 'Второй' });

    const rows = await db.select().from(block);
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0].id, rows[1].id);
    assert.ok(rows.every((r) => Number.isInteger(r.id) && r.id > 0));
});

test('PATCH /task/changestate меняет boolean-колонку state в БД', async () => {
    const blockRow = await createBlockThroughApi('День с задачей');
    await request(server.baseUrl, 'POST', '/task/create', { blockId: blockRow.id, title: 'Задача' });

    const [created] = await db.select().from(task);
    assert.equal(created.state, false, 'по умолчанию state должен быть false');
    assert.equal(created.blockId, blockRow.id);

    const patched = await request(server.baseUrl, 'PATCH', `/task/changestate/${created.id}`, { state: true });
    assert.equal(patched.status, 200);

    const [after] = await db.select().from(task).where(eq(task.id, created.id));
    assert.equal(after.state, true, 'после PATCH в БД должен лежать true, а не "true" и не false');
    assert.equal(typeof after.state, 'boolean');
});

test('DELETE /block/:id каскадно вычищает из БД заметки, задачи и подзадачи', async () => {
    const blockRow = await createBlockThroughApi('Каскадный день');

    await request(server.baseUrl, 'POST', '/note/create', { blockId: blockRow.id, title: 'Заметка' });
    await request(server.baseUrl, 'POST', '/task/create', { blockId: blockRow.id, title: 'Задача' });
    const [taskRow] = await db.select().from(task);
    await request(server.baseUrl, 'POST', '/subtask/create', { taskId: taskRow.id, title: 'Подзадача' });

    assert.equal(await countRows(note), 1);
    assert.equal(await countRows(task), 1);
    assert.equal(await countRows(subtask), 1);

    const deleted = await request(server.baseUrl, 'DELETE', `/block/${blockRow.id}`);
    assert.equal(deleted.status, 200);

    assert.equal(await countRows(block), 0, 'блок должен быть удалён');
    assert.equal(await countRows(note), 0, 'заметки должны удалиться каскадом (onDelete: cascade)');
    assert.equal(await countRows(task), 0, 'задачи должны удалиться каскадом (onDelete: cascade)');
    assert.equal(await countRows(subtask), 0, 'подзадачи должны удалиться каскадом через задачу');
});

test('DELETE /note/:id обнуляет note_id у задачи (onDelete: set null), а не удаляет задачу', async () => {
    const blockRow = await createBlockThroughApi('День со связью');

    await request(server.baseUrl, 'POST', '/note/create', { blockId: blockRow.id, title: 'Заметка' });
    const [noteRow] = await db.select().from(note);

    await request(server.baseUrl, 'POST', '/task/create', {
        blockId: blockRow.id,
        title: 'Задача со ссылкой на заметку',
        noteId: noteRow.id,
    });
    const [taskRow] = await db.select().from(task);
    assert.equal(taskRow.noteId, noteRow.id);

    const deleted = await request(server.baseUrl, 'DELETE', `/note/${noteRow.id}`);
    assert.equal(deleted.status, 200);

    assert.equal(await countRows(note), 0, 'заметка должна быть удалена');
    assert.equal(await countRows(task), 1, 'задача должна остаться');

    const [taskAfter] = await db.select().from(task).where(eq(task.id, taskRow.id));
    assert.equal(taskAfter.noteId, null, 'note_id должен стать NULL');

    const notesOfBlock = await db.select().from(note).where(eq(note.blockId, blockRow.id));
    assert.equal(notesOfBlock.length, 0);
});

test('здоровье приложения и БД видно через /health и /health/ready', async () => {
    const health = await request(server.baseUrl, 'GET', '/health');
    assert.equal(health.status, 200);
    assert.equal(health.json.status, 'ok');

    const ready = await request(server.baseUrl, 'GET', '/health/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.json.db, 'up');
});
