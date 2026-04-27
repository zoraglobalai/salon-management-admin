import { Router } from "express";
import { createResource, listResource } from "./resource.controller";
import type { Request, Response, NextFunction } from "express";
import { allowMode, requireAuth } from "../../../middleware/authMiddleware";
import { UserMode } from "../../../entities/platform/User";

const resourceRouter = Router();

const resourceModeMap = {
  services: [UserMode.OPERATOR],
  inventory: [UserMode.OPERATOR],
  clients: [UserMode.OPERATOR],
} satisfies Partial<Record<string, UserMode[]>>;

type ModeProtectedResource = keyof typeof resourceModeMap;

function isModeProtectedResource(resource: string | string[] | undefined): resource is ModeProtectedResource {
  return typeof resource === "string" && resource in resourceModeMap;
}

function allowResourceMode(req: Request, res: Response, next: NextFunction) {
  const { resource } = req.params;

  if (!isModeProtectedResource(resource)) {
    return next();
  }

  const allowedModes = resourceModeMap[resource];
  return allowMode(allowedModes)(req, res, next);
}

resourceRouter.get("/:resource", requireAuth, allowResourceMode, listResource);
resourceRouter.post("/:resource", requireAuth, allowResourceMode, createResource);

export { resourceRouter };
