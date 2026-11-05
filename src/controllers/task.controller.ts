import { createTask } from "../repositories/task.rep.ts";
import { getAllTask } from "../repositories/task.rep.ts";
import { getTaskById } from "../repositories/task.rep.ts";
import { deleteTaskById } from "../repositories/task.rep.ts";
import { patchTaskTitle } from "../repositories/task.rep.ts";
import { patchTaskDescription } from "../repositories/task.rep.ts";
import { patchTaskState } from "../repositories/task.rep.ts";
import { getTasksByBlockId } from "../repositories/task.rep.ts";

import type { Request, Response } from "express";

export class TaskController {
    async create(req: Request, res: Response) {
        const { blockId, title, description, state, noteId } = req.body ?? {};

        try {
            await createTask({ blockId, title, description, state, noteId });
            return res.status(200).send();
        } catch (e) {
            console.error('Ошибка при работе с бд:', e);
            return res.status(500).send();
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const allTask = await getAllTask();
            return res.status(200).json(allTask);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при получении списка" });
        }
    }

    async getById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const numId = parseInt(id);

        if (isNaN(numId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const task = await getTaskById(numId);
            return res.status(200).json(task);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при получении задачи" });
        }
    }

    async deleteById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const numId = parseInt(id);

        if (isNaN(numId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const isDeleted = await deleteTaskById(numId);

            if (isDeleted) {
                return res.status(200).json({ mess: `задача ${numId} была удалена` });
            } else {
                return res.status(400).json({ error: `Задача с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при удалении задачи" });
        }
    }

    async changeTitle(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { title } = req.body as { title: string };
        const numId = parseInt(id);

        if (isNaN(numId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const isUpdated = await patchTaskTitle(numId, title);

            if (isUpdated) {
                return res.status(200).json({ mess: `задача ${numId} была изменена` });
            } else {
                return res.status(400).json({ error: `Задача с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при изменении задачи" });
        }
    }

    async changeDescription(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { description } = req.body as { description: string };
        const numId = parseInt(id);

        if (isNaN(numId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const isUpdated = await patchTaskDescription(numId, description);

            if (isUpdated) {
                return res.status(200).json({ mess: `задача ${numId} была изменена` });
            } else {
                return res.status(400).json({ error: `Задача с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при изменении задачи" });
        }
    }

    async changeState(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { state } = req.body as { state: boolean };
        const numId = parseInt(id);

        if (isNaN(numId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const isUpdated = await patchTaskState(numId, state);

            if (isUpdated) {
                return res.status(200).json({ mess: `задача ${numId} была изменена` });
            } else {
                return res.status(400).json({ error: `Задача с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при изменении задачи" });
        }
    }

    async getByBlockId(req: Request, res: Response) {
        const { blockId } = req.params as { blockId: string };
        const numBlockId = parseInt(blockId);

        if (isNaN(numBlockId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const tasks = await getTasksByBlockId(numBlockId);
            return res.status(200).json(tasks);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при получении задач" });
        }
    }
}

export default new TaskController();
