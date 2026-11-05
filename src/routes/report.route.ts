import { Router } from "express";
import reportController from "../controllers/report.controller.ts";

const router = Router();

router.get('/:blockId', reportController.createReportByBlockId);

export default router;
