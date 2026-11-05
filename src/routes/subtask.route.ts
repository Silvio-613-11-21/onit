import { Router } from "express";
import subtaskController from "../controllers/subtask.controller.ts";

const router = Router();

router.post('/create', subtaskController.create);
router.get('/getall', subtaskController.getAll);
router.get('/getbytaskid/:taskId', subtaskController.getByTaskId);
router.get('/:id', subtaskController.getById);
router.delete('/:id', subtaskController.deleteById);
router.patch('/changetitle/:id', subtaskController.changeTitle);
router.patch('/changedescription/:id', subtaskController.changeDescription);
router.patch('/changestate/:id', subtaskController.changeState);

export default router;
