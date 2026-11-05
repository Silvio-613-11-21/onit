import { Router } from "express";
import blockController from "../controllers/block.controller.ts";

const router = Router();

router.post('/create', blockController.create);
router.post('/createByCurrentDate', blockController.createByCurrentDate);
router.get('/getall', blockController.getAll);
router.get('/:id', blockController.getById);
router.delete('/:id', blockController.deleteById);
router.patch('/changetitle/:id', blockController.changeTitle);

export default router;