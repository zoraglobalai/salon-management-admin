import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import {
  deleteInventoryItem,
  listInventory,
  updateInventoryItem,
  moveStockToService,
} from "./inventory.service";

export async function getInventory(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const items = await listInventory(req.user, locationId);
    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

export async function createInventory(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.status(403).json({
      success: false,
      message: "Manual product creation is disabled. Add products through Purchase instead.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateInventory(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const item = await updateInventoryItem(req.user, req.params.id, req.body);
    return res.status(200).json({ item });
  } catch (error) {
    return next(error);
  }
}

export async function removeInventory(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await deleteInventoryItem(req.user, req.params.id);
    return res.status(200).json({ success: true, message: "Inventory item deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

export async function moveStock(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { quantity } = req.body;
    const quantityNum = Number(quantity);

    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({ message: "Invalid quantity provided." });
    }

    const item = await moveStockToService(req.user, req.params.id, quantityNum);
    return res.status(200).json({ item, message: "Stock moved to service successfully." });
  } catch (error) {
    return next(error);
  }
}
