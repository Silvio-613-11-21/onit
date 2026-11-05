import { createNote } from "../repositories/note.rep.ts";
import { getAllNote } from "../repositories/note.rep.ts";
import { getNoteById } from "../repositories/note.rep.ts";
import { deleteNoteById } from "../repositories/note.rep.ts";
import { patchNoteTitle } from "../repositories/note.rep.ts";
import { patchNoteDescription } from "../repositories/note.rep.ts";
import { getNotesByBlockId } from "../repositories/note.rep.ts";

import type { Request, Response } from "express";

export class NoteController {
    async create(req: Request, res: Response) {
        const { blockId, title, description } = req.body ?? {};

        try {
            await createNote({ blockId, title, description });
            return res.status(200).send();
        } catch (e) {
            console.error('Ошибка при работе с бд:', e);
            return res.status(500).send();
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const allNote = await getAllNote();
            return res.status(200).json(allNote);
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
            const note = await getNoteById(numId);
            return res.status(200).json(note);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при получении заметки" });
        }
    }

    async deleteById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const numId = parseInt(id);

        if (isNaN(numId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const isDeleted = await deleteNoteById(numId);

            if (isDeleted) {
                return res.status(200).json({ mess: `заметка ${numId} была удалена` });
            } else {
                return res.status(400).json({ error: `Заметка с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при удалении заметки" });
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
            const isUpdated = await patchNoteTitle(numId, title);

            if (isUpdated) {
                return res.status(200).json({ mess: `заметка ${numId} была изменена` });
            } else {
                return res.status(400).json({ error: `Заметка с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при изменении заметки" });
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
            const isUpdated = await patchNoteDescription(numId, description);

            if (isUpdated) {
                return res.status(200).json({ mess: `заметка ${numId} была изменена` });
            } else {
                return res.status(400).json({ error: `Заметка с id=${numId} не найдена` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при изменении заметки" });
        }
    }

    async getByBlockId(req: Request, res: Response) {
        const { blockId } = req.params as { blockId: string };
        const numBlockId = parseInt(blockId);

        if (isNaN(numBlockId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const notes = await getNotesByBlockId(numBlockId);
            return res.status(200).json(notes);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при получении заметок" });
        }
    }
}

export default new NoteController();
