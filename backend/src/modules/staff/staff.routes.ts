import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import {
  createStaff,
  getStaff,
  getStaffById,
  removeStaff,
  updateStaff,
} from "./staff.controller";

const staffRouter = Router();

staffRouter.get("/", requireAuth, getStaff);
staffRouter.post("/", requireAuth, createStaff);
staffRouter.get("/:id", requireAuth, getStaffById);
staffRouter.put("/:id", requireAuth, updateStaff);
staffRouter.delete("/:id", requireAuth, removeStaff);

export { staffRouter };
