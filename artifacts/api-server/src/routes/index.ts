import { Router, type IRouter } from "express";
import healthRouter from "./health";
import incidentsRouter from "./incidents";
import resourcesRouter from "./resources";
import dashboardRouter from "./dashboard";
import activityRouter from "./activity";

const router: IRouter = Router();

router.use(healthRouter);
router.use(incidentsRouter);
router.use(resourcesRouter);
router.use(dashboardRouter);
router.use(activityRouter);

export default router;
