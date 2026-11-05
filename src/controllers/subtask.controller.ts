import { createSubtask } from "../repositories/subtask.rep.ts";
import { getAllSubtask } from "../repositories/subtask.rep.ts";
import { getSubtaskById } from "../repositories/subtask.rep.ts";
import { deleteSubtaskById } from "../repositories/subtask.rep.ts";
import { patchSubtaskTitle } from "../repositories/subtask.rep.ts";
import { patchSubtaskDescription } from "../repositories/subtask.rep.ts";
import { patchSubtaskState } from "../repositories/subtask.rep.ts";
import { getSubtasksByTaskId } from "../repositories/subtask.rep.ts";

import type { Request, Response } from "express";

export class SubtaskController {
    async create(req: Request, res: Response) {
        const { taskId, title, description, state } = req.body ?? {};

        try {
            await createSubtask({ taskId, title, description, state });
            return res.status(200).send();
        } catch (e) {
            console.error('Ошибка при работе с бд:', e);
            return res.status(500).send();
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const allSubtask = await getAllSubtask();
            return res.status(200).json(allSubtask);
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
            const subtask = await getSubtaskById(numId);
            return res.status(200).json(subtask);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при получении подзадачи" });
        }
    }

    async deleteById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const numId = parseInt(id);

        if (isNaN(numId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const isDeleted = await deleteSubtaskById(numId);

            if (isDeleted) {
                return res.status(200).json({ mess: `подзадача ${numId} была удалена` });
            } else {
                return res.status(400).json({ error: `Подзадача с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при удалении подзадачи" });
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
            const isUpdated = await patchSubtaskTitle(numId, title);

            if (isUpdated) {
                return res.status(200).json({ mess: `подзадача ${numId} была изменена` });
            } else {
                return res.status(400).json({ error: `Подзадача с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при изменении подзадачи" });
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
            const isUpdated = await patchSubtaskDescription(numId, description);

            if (isUpdated) {
                return res.status(200).json({ mess: `подзадача ${numId} была изменена` });
            } else {
                return res.status(400).json({ error: `Подзадача с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при изменении подзадачи" });
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
            const isUpdated = await patchSubtaskState(numId, state);

            if (isUpdated) {
                return res.status(200).json({ mess: `подзадача ${numId} была изменена` });
            } else {
                return res.status(400).json({ error: `Подзадача с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при изменении подзадачи" });
        }
    }

    async getByTaskId(req: Request, res: Response) {
        const { taskId } = req.params as { taskId: string };
        const numTaskId = parseInt(taskId);

        if (isNaN(numTaskId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const subtasks = await getSubtasksByTaskId(numTaskId);
            return res.status(200).json(subtasks);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при получении подзадач" });
        }
    }
}

export default new SubtaskController();
