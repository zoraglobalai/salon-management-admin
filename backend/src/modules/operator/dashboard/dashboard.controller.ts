import type { NextFunction, Request, Response } from "express";
import { getDashboardMetrics } from "./dashboard.service";
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
