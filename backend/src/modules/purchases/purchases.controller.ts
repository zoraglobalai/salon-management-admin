import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import { createPurchase, getPurchaseDetails, listPurchases, updatePurchase } from "./purchases.service";

export async function getPurchases(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const purchases = await listPurchases(req.user, locationId);
    return res.status(200).json({ purchases });
  } catch (error) {
    return next(error);
  }
}

export async function postPurchase(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const created = await createPurchase(req.user, req.body);
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
}

export async function getPurchase(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const purchase = await getPurchaseDetails(req.user, req.params.id);
    return res.status(200).json({ purchase });
  } catch (error) {
    return next(error);
  }
}

export async function putPurchase(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const updated = await updatePurchase(req.user, req.params.id, req.body);
    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}
