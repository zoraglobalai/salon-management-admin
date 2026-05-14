import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import { createVendor, listVendors, removeVendor, updateVendor } from "./vendors.service";

export async function getVendors(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const vendors = await listVendors(req.user, search, status);
    return res.status(200).json({ vendors });
  } catch (error) {
    return next(error);
  }
}

export async function postVendor(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const vendor = await createVendor(req.user, req.body);
    return res.status(201).json({ vendor });
  } catch (error) {
    return next(error);
  }
}

export async function putVendor(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const vendor = await updateVendor(req.user, req.params.id, req.body);
    return res.status(200).json({ vendor });
  } catch (error) {
    return next(error);
  }
}

export async function deleteVendor(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    await removeVendor(req.user, req.params.id);
    return res.status(200).json({ success: true, message: "Vendor deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

