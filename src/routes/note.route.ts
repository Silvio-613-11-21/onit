import { Router } from "express";
import noteController from "../controllers/note.controller.ts";

const router = Router();

router.post('/create', noteController.create);
router.get('/getall', noteController.getAll);
router.get('/getbyblockid/:blockId', noteController.getByBlockId);
router.get('/:id', noteController.getById);
router.delete('/:id', noteController.deleteById);
router.patch('/changetitle/:id', noteController.changeTitle);
router.patch('/changedescription/:id', noteController.changeDescription);

export default router;
