import { test } from 'node:test';
import assert from 'node:assert/strict';

import createMdFileContent from '../../src/services/createMdFileContent.ts';
import type { Block } from '../../src/models/block.model.ts';
import type { Task } from '../../src/models/task.model.ts';
import type { Subtask } from '../../src/models/subtask.model.ts';
import type { Note } from '../../src/models/note.model.ts';

const block: Block = { id: 1, date: '2026-10-27', title: 'Сегодня' };
const emptyBlock: Block = { id: 1, date: '2026-10-27', title: null };
const task: Task = { id: 1, blockId: 1, title: 'Задача A', description: null, state: false, noteId: null };
const doneTask: Task = { id: 2, blockId: 1, title: 'Задача B', description: null, state: true, noteId: null };
const note: Note = { id: 1, blockId: 1, title: 'Заметка', description: null };

test('заголовок блока содержит дату и название', () => {
    const content = createMdFileContent([block], [], [], []);

    assert.equal(content.split('\n')[0], '# [2026-10-27] Сегодня');
});

test('если у блока нет названия, в заголовке остаётся только дата', () => {
    const content = createMdFileContent([emptyBlock], [], [], []);

    assert.equal(content.split('\n')[0], '# [2026-10-27]');
});

test('невыполненная задача помечается как - [ ], выполненная как - [x]', () => {
    const content = createMdFileContent([block], [task, doneTask], [], []);

    assert.match(content, /- \[ \] Задача A/);
    assert.match(content, /- \[x\] Задача B/);
});

test('задача с заметкой оборачивается в ссылку на эту заметку', () => {
    const taskWithNote: Task = { ...task, noteId: 1 };

    const content = createMdFileContent([block], [taskWithNote], [], []);

    assert.match(content, /<a id="1">Задача A<\/a>/);
});

test('подзадачи попадают под свою задачу', () => {
    const subtasks: Subtask[][] = [
        [{ id: 1, taskId: 1, title: 'Подзадача A1', description: null, state: false }],
        [{ id: 2, taskId: 2, title: 'Подзадача B1', description: null, state: true }],
    ];

    const content = createMdFileContent([block], [task, doneTask], subtasks, []);

    assert.match(content, /- \[ \] Задача A\n\t- \[ \] Подзадача A1\n/);
    assert.match(content, /- \[x\] Задача B\n\t- \[x\] Подзадача B1\n/);
});

test('описание задачи выводится под задачей', () => {
    const taskWithDescription: Task = { ...task, description: 'описание задачи' };

    const content = createMdFileContent([block], [taskWithDescription], [], []);

    assert.match(content, /Задача A\n\tописание задачи\n/);
});

test('заметки выводятся в разделе Notes', () => {
    const noteWithDescription: Note = { ...note, description: 'описание заметки' };

    const content = createMdFileContent([block], [], [], [noteWithDescription]);

    assert.match(content, /## Notes \n/);
    assert.match(content, /- <span id = "1" >Заметка<\/span>\nописание заметки\n/);
});

test('без задач и заметок остаются только заголовки разделов', () => {
    const content = createMdFileContent([block], [], [], []);

    assert.match(content, /## Tasks \n/);
    assert.match(content, /## Notes \n/);
});
