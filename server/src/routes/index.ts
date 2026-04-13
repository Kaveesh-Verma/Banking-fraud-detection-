import { Router } from "express";
import healthRouter from "./health.js";
import locationRouter from "./location.js";
import sessionsRouter from "./sessions.js";
import riskRouter from "./risk.js";
import adminRouter from "./admin.js";

const router = Router();
router.use(healthRouter);
router.use(locationRouter);
router.use(sessionsRouter);
router.use(riskRouter);
router.use(adminRouter);

export default router;
