import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import {
  createService,
  executeService,
  getServices,
  removeService,
  updateService,
} from "./services.controller";

const servicesRouter = Router();

servicesRouter.get("/", requireAuth, getServices);
servicesRouter.post("/", requireAuth, createService);
servicesRouter.put("/:id", requireAuth, updateService);
servicesRouter.delete("/:id", requireAuth, removeService);
servicesRouter.post("/use", requireAuth, executeService);

export { servicesRouter };
