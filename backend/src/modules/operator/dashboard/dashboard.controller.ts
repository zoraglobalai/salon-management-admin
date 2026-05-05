import type { NextFunction, Request, Response } from "express";
import { getDashboardMetrics, getDashboardSummary } from "./dashboard.service";
import { isAuthUserPayload } from "../../../middleware/authMiddleware";

export async function getRoleDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const metrics = await getDashboardMetrics(req.user);
    return res.json(metrics);
  } catch (error) {
    return next(error);
  }
}

export async function getRoleDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const trendRange = typeof req.query.trendRange === "string" ? req.query.trendRange : undefined;
    const summary = await getDashboardSummary(req.user, { date, branchId, trendRange });
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
}
