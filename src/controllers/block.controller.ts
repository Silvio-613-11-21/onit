
//репы
import { createBlock } from "../repositories/block.rep.ts";
import { createBlockByCurrentDate } from "../repositories/block.rep.ts";
import { getAllBlock } from "../repositories/block.rep.ts";
import { getBlockById } from "../repositories/block.rep.ts";
import { deleteBlockById } from "../repositories/block.rep.ts";
import { patchBlockTitle } from "../repositories/block.rep.ts";
//



//из либы
import type { Request, Response } from "express";
//

export class BlockController {
    async create(req: Request, res: Response) {
        const { date, title } = req.body ?? {};

        try {
            await createBlock({ date, title });
            return res.status(200).send();
        } catch (e) {
            console.error('Ошибка при работе с бд:', e);
            return res.status(500).send();
        }
    }

    async createByCurrentDate(req: Request, res: Response) {
        const { title } = req.body ?? {};

        try {
            await createBlockByCurrentDate(title);
            return res.status(200).send();
        } catch (e) {
            console.error('Ошибка при работе с бд:', e);
            return res.status(500).send();
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const allBlock = await getAllBlock();
            return res.status(200).json(allBlock);
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
            const block = await getBlockById(numId);
            return res.status(200).json(block);
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при получении блока" });
        }
    }

    async deleteById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const numId = parseInt(id);

        if (isNaN(numId)) {
            return res.status(400).json({ error: "Некорректный ID" });
        }

        try {
            const isDeleted = await deleteBlockById(numId);

            if (isDeleted) {
                return res.status(200).json({ mess: `блок ${numId} был удалён` });
            } else {
                return res.status(400).json({ error: `Блок с id=${numId} не найден` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при удалении блока" });
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
            const isUpdated = await patchBlockTitle(numId, title);

            if (isUpdated) {
                return res.status(200).json({ mess: `блок ${numId} был изменён` });
            } else {
                return res.status(400).json({ error: `Блок с id=${numId} не найден` });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Ошибка при изминении блока" });
        }
    }

    
}

export default new BlockController();