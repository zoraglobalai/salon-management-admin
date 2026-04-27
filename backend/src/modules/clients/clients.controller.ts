import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  updateClient,
  type ClientFilters,
} from "./clients.service";

export async function getClients(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });

    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;

    const filters: ClientFilters = {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      tag: typeof req.query.tag === "string" ? req.query.tag : undefined,
      hairType: typeof req.query.hairType === "string" ? req.query.hairType : undefined,
      lastVisit: typeof req.query.lastVisit === "string"
        ? (req.query.lastVisit as ClientFilters["lastVisit"])
        : undefined,
      problems: Array.isArray(req.query.problems)
        ? (req.query.problems as string[])
        : typeof req.query.problems === "string"
        ? [req.query.problems]
        : undefined,
      minVisits: req.query.minVisits !== undefined ? Number(req.query.minVisits) : undefined,
      maxVisits: req.query.maxVisits !== undefined ? Number(req.query.maxVisits) : undefined,
    };

    const clients = await listClients(req.user, locationId, filters);
    return res.status(200).json({ clients });
  } catch (err) {
    return next(err);
  }
}

export async function getClientById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const client = await getClient(req.user, req.params.id);
    return res.status(200).json({ client });
  } catch (err) {
    return next(err);
  }
}

export async function createClientHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const client = await createClient(req.user, req.body);
    return res.status(201).json({ client });
  } catch (err) {
    return next(err);
  }
}

export async function updateClientHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const client = await updateClient(req.user, req.params.id, req.body);
    return res.status(200).json({ client });
  } catch (err) {
    return next(err);
  }
}

export async function deleteClientHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    await deleteClient(req.user, req.params.id);
    return res.status(200).json({ success: true, message: "Client deleted." });
  } catch (err) {
    return next(err);
  }
}
