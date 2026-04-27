import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import {
  createStaffMember,
  deleteStaffMember,
  getStaffMember,
  listStaff,
  updateStaffMember,
} from "./staff.service";

export async function getStaff(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const staff = await listStaff(req.user, locationId);
    return res.status(200).json({ staff });
  } catch (err) { return next(err); }
}

export async function getStaffById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const member = await getStaffMember(req.user, req.params.id);
    return res.status(200).json({ staff: member });
  } catch (err) { return next(err); }
}

export async function createStaff(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const member = await createStaffMember(req.user, req.body);
    return res.status(201).json({ staff: member });
  } catch (err) { return next(err); }
}

export async function updateStaff(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const member = await updateStaffMember(req.user, req.params.id, req.body);
    return res.status(200).json({ staff: member });
  } catch (err) { return next(err); }
}

export async function removeStaff(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    await deleteStaffMember(req.user, req.params.id);
    return res.status(200).json({ success: true, message: "Staff member deleted." });
  } catch (err) { return next(err); }
}
