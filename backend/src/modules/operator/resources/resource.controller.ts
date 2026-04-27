import type { NextFunction, Request, Response } from "express";
import { createResourceItem, listResources } from "./resource.service";
import { isAuthUserPayload } from "../../../middleware/authMiddleware";

export async function listResource(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const resourceName = Array.isArray(req.params.resource) ? req.params.resource[0] : req.params.resource;

    if (!resourceName) {
      return res.status(400).json({ message: "Resource is required" });
    }

    const result = await listResources(resourceName, req.user);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
}

export async function createResource(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const resourceName = Array.isArray(req.params.resource) ? req.params.resource[0] : req.params.resource;

    if (!resourceName) {
      return res.status(400).json({ message: "Resource is required" });
    }

    const result = await createResourceItem(resourceName, req.body as Record<string, unknown>, req.user);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
}
