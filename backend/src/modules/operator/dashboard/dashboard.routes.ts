import { Router } from "express";
import { getRoleDashboard, getRoleDashboardSummary } from "./dashboard.controller";
import { UserMode } from "../../../entities/platform/User";
import { allowMode, requireAuth } from "../../../middleware/authMiddleware";

const dashboardRouter = Router();

dashboardRouter.get("/", requireAuth, allowMode([UserMode.OPERATOR, UserMode.MONITOR]), getRoleDashboard);
dashboardRouter.get("/summary", requireAuth, allowMode([UserMode.OPERATOR, UserMode.MONITOR]), getRoleDashboardSummary);

export { dashboardRouter };
