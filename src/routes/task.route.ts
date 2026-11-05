import { Router } from "express";
import taskController from "../controllers/task.controller.ts";

const router = Router();

router.post('/create', taskController.create);
router.get('/getall', taskController.getAll);
router.get('/getbyblockid/:blockId', taskController.getByBlockId);
router.get('/:id', taskController.getById);
router.delete('/:id', taskController.deleteById);
router.patch('/changetitle/:id', taskController.changeTitle);
router.patch('/changedescription/:id', taskController.changeDescription);
router.patch('/changestate/:id', taskController.changeState);

export default router;
