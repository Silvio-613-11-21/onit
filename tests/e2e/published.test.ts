import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { request } from '../helpers/http.ts';

// Сквозной (end-to-end) CRUD-сценарий.
//
// В отличие от tests/integration, здесь НЕ поднимается своё приложение и своя БД:
// тест бьёт по уже развёрнутому на стенде опубликованному Docker-образу.
// Адрес берётся из переменной E2E_BASE_URL, например http://host.docker.internal:8090
//
// Тест сам за собой убирает: всё созданное удаляется, поэтому данные стенда
// возвращаются к исходному состоянию.

const baseUrl = process.env.E2E_BASE_URL;

if (!baseUrl) {
    throw new Error('E2E_BASE_URL не задан. Пример: E2E_BASE_URL=http://localhost:8090 npm run test:e2e');
}

const MARKER = `e2e-${process.env.E2E_MARKER ?? Date.now()}`;

let blockId: number;
let noteId: number;
let taskId: number;
let subtaskId: number;
let initialBlockCount = 0;

before(async () => {
    const all = await request(baseUrl, 'GET', '/block/getall');
    assert.equal(all.status, 200, 'стенд должен отвечать на GET /block/getall');
    initialBlockCount = all.json.length;
});

after(async () => {
    // Если тест упал в середине, всё равно пытаемся вычистить за собой данные стенда.
    if (blockId) {
        await request(baseUrl, 'DELETE', `/block/${blockId}`).catch(() => {});
    }
});

test('стенд жив: /health отвечает 200 ok', async () => {
    const health = await request(baseUrl, 'GET', '/health');

    assert.equal(health.status, 200);
    assert.equal(health.json.status, 'ok');
    assert.equal(health.json.service, 'onit');
});

test('стенд готов к работе: /health/ready отвечает 200 и db: up', async () => {
    const ready = await request(baseUrl, 'GET', '/health/ready');

    assert.equal(ready.status, 200, `БД на стенде недоступна: ${ready.text}`);
    assert.equal(ready.json.db, 'up');
});

test('CREATE: блок, заметка, задача и подзадача создаются на опубликованном образе', async () => {
    const block = await request(baseUrl, 'POST', '/block/create', { date: '2026-11-10', title: MARKER });
    assert.equal(block.status, 200);

    const blocks = await request(baseUrl, 'GET', '/block/getall');
    const created = blocks.json.find((b: any) => b.title === MARKER);
    assert.ok(created, 'созданный блок должен читаться через GET /block/getall');
    blockId = created.id;

    const note = await request(baseUrl, 'POST', '/note/create', { blockId, title: `${MARKER}: заметка` });
    assert.equal(note.status, 200);
    const notes = await request(baseUrl, 'GET', `/note/getbyblockid/${blockId}`);
    assert.equal(notes.json.length, 1);
    noteId = notes.json[0].id;

    const task = await request(baseUrl, 'POST', '/task/create', {
        blockId,
        title: `${MARKER}: задача`,
        description: 'описание задачи',
        noteId,
    });
    assert.equal(task.status, 200);
    const tasks = await request(baseUrl, 'GET', `/task/getbyblockid/${blockId}`);
    assert.equal(tasks.json.length, 1);
    assert.equal(tasks.json[0].state, false, 'новая задача не выполнена');
    taskId = tasks.json[0].id;

    const subtask = await request(baseUrl, 'POST', '/subtask/create', { taskId, title: `${MARKER}: подзадача` });
    assert.equal(subtask.status, 200);
    const subtasks = await request(baseUrl, 'GET', `/subtask/getbytaskid/${taskId}`);
    assert.equal(subtasks.json.length, 1);
    subtaskId = subtasks.json[0].id;
});

test('READ: каждая сущность читается по своему id', async () => {
    const block = await request(baseUrl, 'GET', `/block/${blockId}`);
    assert.equal(block.status, 200);
    assert.equal(block.json[0].title, MARKER);

    const note = await request(baseUrl, 'GET', `/note/${noteId}`);
    assert.equal(note.status, 200);
    assert.equal(note.json[0].title, `${MARKER}: заметка`);

    const task = await request(baseUrl, 'GET', `/task/${taskId}`);
    assert.equal(task.status, 200);
    assert.equal(task.json[0].noteId, noteId);

    const subtask = await request(baseUrl, 'GET', `/subtask/${subtaskId}`);
    assert.equal(subtask.status, 200);
    assert.equal(subtask.json[0].taskId, taskId);
});

test('UPDATE: заголовок блока, описание заметки, состояние и описание задачи меняются', async () => {
    const blockTitle = await request(baseUrl, 'PATCH', `/block/changetitle/${blockId}`, { title: `${MARKER} (изменён)` });
    assert.equal(blockTitle.status, 200);

    const noteDescription = await request(baseUrl, 'PATCH', `/note/changedescription/${noteId}`, { description: 'описание заметки' });
    assert.equal(noteDescription.status, 200);

    const taskState = await request(baseUrl, 'PATCH', `/task/changestate/${taskId}`, { state: true });
    assert.equal(taskState.status, 200);

    const taskDescription = await request(baseUrl, 'PATCH', `/task/changedescription/${taskId}`, { description: 'новое описание' });
    assert.equal(taskDescription.status, 200);

    const subtaskState = await request(baseUrl, 'PATCH', `/subtask/changestate/${subtaskId}`, { state: true });
    assert.equal(subtaskState.status, 200);

    const tasks = await request(baseUrl, 'GET', `/task/getbyblockid/${blockId}`);
    assert.equal(tasks.json[0].state, true);
    assert.equal(tasks.json[0].description, 'новое описание');

    const block = await request(baseUrl, 'GET', `/block/${blockId}`);
    assert.equal(block.json[0].title, `${MARKER} (изменён)`);
});

test('бизнес-правило: отчёт report.md собирается из задач и заметок блока', async () => {
    const report = await request(baseUrl, 'GET', `/report/${blockId}`);

    assert.equal(report.status, 200);
    assert.match(report.headers.get('content-type')!, /text\/markdown/);
    assert.match(report.headers.get('content-disposition')!, /attachment; filename=report.md/);
    assert.match(report.text, new RegExp(`# \\[2026-11-10\\] ${MARKER}`));
    assert.match(report.text, /## Tasks/);
    assert.match(report.text, /- \[x\] /);
    assert.match(report.text, new RegExp(`${MARKER}: задача`));
    assert.match(report.text, /## Notes/);
    assert.match(report.text, new RegExp(`${MARKER}: заметка`));
});

test('DELETE: подзадача, задача и заметка удаляются по отдельности', async () => {
    const delSubtask = await request(baseUrl, 'DELETE', `/subtask/${subtaskId}`);
    assert.equal(delSubtask.status, 200);
    const subtasks = await request(baseUrl, 'GET', `/subtask/getbytaskid/${taskId}`);
    assert.equal(subtasks.json.length, 0);

    const delTask = await request(baseUrl, 'DELETE', `/task/${taskId}`);
    assert.equal(delTask.status, 200);
    const tasks = await request(baseUrl, 'GET', `/task/getbyblockid/${blockId}`);
    assert.equal(tasks.json.length, 0);

    const delNote = await request(baseUrl, 'DELETE', `/note/${noteId}`);
    assert.equal(delNote.status, 200);
    const notes = await request(baseUrl, 'GET', `/note/getbyblockid/${blockId}`);
    assert.equal(notes.json.length, 0);
});

test('DELETE: блок удаляется, и стенд возвращается к исходному состоянию', async () => {
    const delBlock = await request(baseUrl, 'DELETE', `/block/${blockId}`);
    assert.equal(delBlock.status, 200);

    const gone = await request(baseUrl, 'GET', `/block/${blockId}`);
    assert.deepEqual(gone.json, []);

    const all = await request(baseUrl, 'GET', '/block/getall');
    assert.equal(all.json.length, initialBlockCount, 'после e2e на стенде не должно остаться лишних блоков');
    assert.ok(!all.json.some((b: any) => String(b.title).includes('e2e-')), 'данные стенда очищены от тестовых блоков');

    blockId = 0;
});

test('валидация: несуществующие и некорректные id отдают 400, а не 500', async () => {
    const badId = await request(baseUrl, 'GET', '/block/abc');
    assert.equal(badId.status, 400);

    const missingBlock = await request(baseUrl, 'DELETE', '/block/99999999');
    assert.equal(missingBlock.status, 400);

    const missingReport = await request(baseUrl, 'GET', '/report/99999999');
    assert.equal(missingReport.status, 400);

    const emptyTasks = await request(baseUrl, 'GET', '/task/getbyblockid/99999999');
    assert.equal(emptyTasks.status, 200);
    assert.deepEqual(emptyTasks.json, []);
});
