import 'dotenv/config';
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { applyMigrations, resetDatabase, closeDatabase } from '../helpers/testDb.ts';
import { startTestServer, request } from '../helpers/http.ts';

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

async function createBlock(title: string) {
    await request(server.baseUrl, 'POST', '/block/create', { date: '2026-10-27', title });
    const blocks = await request(server.baseUrl, 'GET', '/block/getall');
    return blocks.json[0];
}

test('блок создаётся и читается через API', async () => {
    const created = await request(server.baseUrl, 'POST', '/block/create', { date: '2026-10-27', title: 'Понедельник' });
    assert.equal(created.status, 200);

    const all = await request(server.baseUrl, 'GET', '/block/getall');
    assert.equal(all.status, 200);
    assert.equal(all.json.length, 1);
    assert.equal(all.json[0].title, 'Понедельник');
    assert.equal(all.json[0].date, '2026-10-27');

    const byId = await request(server.baseUrl, 'GET', `/block/${all.json[0].id}`);
    assert.equal(byId.status, 200);
    assert.equal(byId.json[0].title, 'Понедельник');
});

test('заметки, задачи и подзадачи находятся по своим родителям и меняются через PATCH', async () => {
    const block = await createBlock('День');

    await request(server.baseUrl, 'POST', '/note/create', { blockId: block.id, title: 'Заметка 1' });
    await request(server.baseUrl, 'POST', '/task/create', { blockId: block.id, title: 'Задача 1', noteId: 1 });

    const tasks = await request(server.baseUrl, 'GET', `/task/getbyblockid/${block.id}`);
    assert.equal(tasks.status, 200);
    assert.equal(tasks.json.length, 1);
    assert.equal(tasks.json[0].state, false);

    await request(server.baseUrl, 'POST', '/subtask/create', { taskId: tasks.json[0].id, title: 'Подзадача 1' });

    const subtasks = await request(server.baseUrl, 'GET', `/subtask/getbytaskid/${tasks.json[0].id}`);
    assert.equal(subtasks.status, 200);
    assert.equal(subtasks.json.length, 1);
    assert.equal(subtasks.json[0].title, 'Подзадача 1');

    const notes = await request(server.baseUrl, 'GET', `/note/getbyblockid/${block.id}`);
    assert.equal(notes.status, 200);
    assert.equal(notes.json.length, 1);

    const changedState = await request(server.baseUrl, 'PATCH', `/task/changestate/${tasks.json[0].id}`, { state: true });
    assert.equal(changedState.status, 200);

    const changedDescription = await request(server.baseUrl, 'PATCH', `/task/changedescription/${tasks.json[0].id}`, { description: 'новое описание' });
    assert.equal(changedDescription.status, 200);

    const changedNote = await request(server.baseUrl, 'PATCH', `/note/changedescription/${notes.json[0].id}`, { description: 'описание заметки' });
    assert.equal(changedNote.status, 200);

    const tasksAfter = await request(server.baseUrl, 'GET', `/task/getbyblockid/${block.id}`);
    assert.equal(tasksAfter.json[0].state, true);
    assert.equal(tasksAfter.json[0].description, 'новое описание');

    const deleted = await request(server.baseUrl, 'DELETE', `/subtask/${subtasks.json[0].id}`);
    assert.equal(deleted.status, 200);

    const subtasksAfter = await request(server.baseUrl, 'GET', `/subtask/getbytaskid/${tasks.json[0].id}`);
    assert.equal(subtasksAfter.json.length, 0);
});

test('отчёт по блоку отдаётся файлом report.md с задачами и заметками', async () => {
    const block = await createBlock('Отчётный день');

    await request(server.baseUrl, 'POST', '/note/create', { blockId: block.id, title: 'Заметка для отчёта' });
    await request(server.baseUrl, 'POST', '/task/create', { blockId: block.id, title: 'Задача для отчёта' });

    const report = await request(server.baseUrl, 'GET', `/report/${block.id}`);

    assert.equal(report.status, 200);
    
    assert.match(report.headers.get('content-type')!, /text\/markdown/);
    assert.match(report.headers.get('content-disposition')!, /attachment; filename=report.md/);
    assert.match(report.text, /# \[2026-10-27\] Отчётный день/);
    assert.match(report.text, /## Tasks/);
    assert.match(report.text, /Задача для отчёта/);
    assert.match(report.text, /## Notes/);
    assert.match(report.text, /Заметка для отчёта/);
});

test('на некорректный id и несуществующий блок API отвечает 400', async () => {
    const badId = await request(server.baseUrl, 'GET', '/block/abc');
    assert.equal(badId.status, 400);

    const missingDelete = await request(server.baseUrl, 'DELETE', '/block/999999');
    assert.equal(missingDelete.status, 400);

    const missingReport = await request(server.baseUrl, 'GET', '/report/999999');
    assert.equal(missingReport.status, 400);

    const missingBlockTasks = await request(server.baseUrl, 'GET', '/task/getbyblockid/999999');
    assert.equal(missingBlockTasks.status, 200);
    assert.deepEqual(missingBlockTasks.json, []);
});
