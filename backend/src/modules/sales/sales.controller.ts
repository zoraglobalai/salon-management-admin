import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import {
  createSaleDraft,
  finalizeSaleDraft,
  getSaleDetail,
  listSaleDrafts,
  listSales,
  updateSaleDraft,
} from "./sales.service";

export async function handleCreateSaleDraft(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const result = await createSaleDraft(req.user, req.body);
    return res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleUpdateSaleDraft(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const result = await updateSaleDraft(req.user, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function handleFinalizeSaleDraft(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const result = await finalizeSaleDraft(req.user, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function handleListSaleDrafts(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const sales = await listSaleDrafts(req.user, locationId);
    return res.status(200).json({ sales });
  } catch (err) { next(err); }
}

export async function handleListSales(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const sales = await listSales(req.user, locationId, {
      startDate: typeof req.query.startDate === "string" ? req.query.startDate : undefined,
      endDate: typeof req.query.endDate === "string" ? req.query.endDate : undefined,
      paymentMethod: typeof req.query.paymentMethod === "string" ? req.query.paymentMethod : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      sortBy: typeof req.query.sortBy === "string" ? req.query.sortBy : undefined,
      sortOrder: req.query.sortOrder === "asc" || req.query.sortOrder === "desc" ? req.query.sortOrder : undefined,
    });
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
