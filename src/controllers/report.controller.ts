import createMdFileContent from "../services/createMdFileContent.ts";

import { getBlockById } from "../repositories/block.rep.ts";
import { getNotesByBlockId } from "../repositories/note.rep.ts";
import { getTasksByBlockId } from "../repositories/task.rep.ts";
import { getSubtasksByTaskId } from "../repositories/subtask.rep.ts";

import type { Subtask } from "../models/subtask.model.ts";

import type { Request, Response } from "express";

export class ReportController {
    async createReportByBlockId(req: Request, res: Response) {
        const { blockId } = req.params as { blockId: string };

        const blockNumId = parseInt(blockId);

        if (isNaN(blockNumId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const blocks = await getBlockById(blockNumId);

            if (blocks.length === 0) {
                return res.status(400).json({ error: `Блок с id=${blockNumId} не найден` });
            }

            const notes = await getNotesByBlockId(blockNumId);
            const tasks = await getTasksByBlockId(blockNumId);

            let subtasks: Subtask[][] = [];
            for (const task of tasks) {
                const taskSubtasks = await getSubtasksByTaskId(task.id);

                if (taskSubtasks.length > 0) {
                    subtasks.push(taskSubtasks);
                }
            }

            const fileContent = createMdFileContent(blocks, tasks, subtasks, notes);

            res.attachment('report.md');
            return res.status(200).send(fileContent);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при создании отчёта" });
        }
    }
}

export default new ReportController();
