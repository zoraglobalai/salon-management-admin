import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import {
  createComboServiceItem,
  createServiceItem,
  deleteComboServiceItem,
  deleteServiceItem,
  executeServiceUsage,
  listServices,
  updateComboServiceItem,
  updateServiceItem,
} from "./services.service";

export async function getServices(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const data = await listServices(req.user, locationId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

export async function createService(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const service = await createServiceItem(req.user, req.body);
    return res.status(201).json({ service });
  } catch (error) {
    return next(error);
  }
}

export async function createComboService(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const comboService = await createComboServiceItem(req.user, req.body);
    return res.status(201).json({ comboService });
  } catch (error) {
    return next(error);
  }
}

export async function updateService(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const service = await updateServiceItem(req.user, req.params.id, req.body);
    return res.status(200).json({ service });
  } catch (error) {
    return next(error);
  }
}

export async function updateComboService(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const comboService = await updateComboServiceItem(req.user, req.params.id, req.body);
    return res.status(200).json({ comboService });
  } catch (error) {
    return next(error);
  }
}

export async function removeService(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await deleteServiceItem(req.user, req.params.id);
    return res.status(200).json({ success: true, message: "Service deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

export async function removeComboService(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await deleteComboServiceItem(req.user, req.params.id);
    return res.status(200).json({ success: true, message: "Combo service deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

export async function executeService(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { serviceId } = req.body;
    if (!serviceId) {
      return res.status(400).json({ message: "Service ID is required." });
    }

    const result = await executeServiceUsage(req.user, serviceId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
