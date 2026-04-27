import { Router } from "express";
import { createInventory, getInventory, removeInventory, updateInventory, moveStock } from "./inventory.controller";
import { requireAuth } from "../../middleware/authMiddleware";

const inventoryRouter = Router();

inventoryRouter.get("/", requireAuth, getInventory);
inventoryRouter.post("/", requireAuth, createInventory);
inventoryRouter.put("/:id", requireAuth, updateInventory);
inventoryRouter.delete("/:id", requireAuth, removeInventory);
inventoryRouter.post("/:id/add-to-service-stock", requireAuth, moveStock);

export { inventoryRouter };
