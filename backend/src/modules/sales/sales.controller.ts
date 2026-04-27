import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import { createSale, listSales, getSaleDetail } from "./sales.service";

export async function handleCreateSale(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const result = await createSale(req.user, req.body);
    return res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleListSales(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const sales = await listSales(req.user, locationId);
    return res.status(200).json({ sales });
  } catch (err) { next(err); }
}

export async function handleGetSaleDetail(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const sale = await getSaleDetail(req.user, req.params.id);
    return res.status(200).json({ sale });
  } catch (err) { next(err); }
}
