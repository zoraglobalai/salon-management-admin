import { Router } from "express";
import { authRouter } from "../modules/operator/auth/auth.routes";
import { dashboardRouter } from "../modules/operator/dashboard/dashboard.routes";
import { resourceRouter } from "../modules/operator/resources/resource.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ message: "Salon Growth Engine API is running" });
});

router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/", resourceRouter);

export default router;
