import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import {
  createComboService,
  createService,
  executeService,
  getServices,
  removeComboService,
  removeService,
  updateComboService,
  updateService,
} from "./services.controller";

const servicesRouter = Router();

servicesRouter.get("/", requireAuth, getServices);
servicesRouter.post("/", requireAuth, createService);
servicesRouter.post("/combos", requireAuth, createComboService);
servicesRouter.put("/:id", requireAuth, updateService);
servicesRouter.put("/combos/:id", requireAuth, updateComboService);
servicesRouter.delete("/:id", requireAuth, removeService);
servicesRouter.delete("/combos/:id", requireAuth, removeComboService);
servicesRouter.post("/use", requireAuth, executeService);

export { servicesRouter };
