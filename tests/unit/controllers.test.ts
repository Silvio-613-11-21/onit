import { test } from 'node:test';
import assert from 'node:assert/strict';

import blockController from '../../src/controllers/block.controller.ts';
import noteController from '../../src/controllers/note.controller.ts';
import taskController from '../../src/controllers/task.controller.ts';
import subtaskController from '../../src/controllers/subtask.controller.ts';
import reportController from '../../src/controllers/report.controller.ts';

import type { Request, Response } from 'express';

function mockResponse() {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        status(code: number) {
            res.statusCode = code;
            return res;
        },
        json(payload: unknown) {
            res.body = payload;
            return res;
        },
        send(payload?: unknown) {
            res.body = payload;
            return res;
        },
    };

    return res;
}

function mockRequest(params: Record<string, string>) {
    return { params, body: {} } as unknown  as Request;
}

test('block getById на нечисловой id отвечает 400', async () => {
    const res = mockResponse();

    await blockController.getById(mockRequest({ id: 'abc' }), res as unknown as Response);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Некорректный ID" });
});

test('note getById на нечисловой id отвечает 400', async () => {
    const res = mockResponse();

    await noteController.getById(mockRequest({ id: 'abc' }), res as unknown as Response);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Некорректный ID" });
});

test('task getById на нечисловой id отвечает 400', async () => {
    const res = mockResponse();

    await taskController.getById(mockRequest({ id: 'abc' }), res as unknown as Response);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Некорректный ID" });
});

test('subtask getByTaskId на нечисловой id отвечает 400', async () => {
    const res = mockResponse();

    await subtaskController.getByTaskId(mockRequest({ taskId: 'abc' }), res as unknown as Response);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Некорректный ID" });
});

test('note getByBlockId на нечисловой id отвечает 400', async () => {
    const res = mockResponse();

    await noteController.getByBlockId(mockRequest({ blockId: 'abc' }), res as unknown as Response);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Некорректный ID" });
});

test('report на нечисловой blockId отвечает 400', async () => {
    const res = mockResponse();

    await reportController.createReportByBlockId(mockRequest({ blockId: 'abc' }), res as unknown as Response);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Некорректный ID" });
});
