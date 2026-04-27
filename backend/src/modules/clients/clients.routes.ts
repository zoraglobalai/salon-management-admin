import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import {
  createClientHandler,
  deleteClientHandler,
  getClientById,
  getClients,
  updateClientHandler,
} from "./clients.controller";

const clientsRouter = Router();

clientsRouter.get("/", requireAuth, getClients);
clientsRouter.post("/", requireAuth, createClientHandler);
clientsRouter.get("/:id", requireAuth, getClientById);
clientsRouter.put("/:id", requireAuth, updateClientHandler);
clientsRouter.delete("/:id", requireAuth, deleteClientHandler);

export { clientsRouter };
