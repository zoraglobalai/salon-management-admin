import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { deleteVendor, getVendors, postVendor, putVendor } from "./vendors.controller";

const vendorsRouter = Router();

vendorsRouter.get("/", requireAuth, getVendors);
vendorsRouter.post("/", requireAuth, postVendor);
vendorsRouter.put("/:id", requireAuth, putVendor);
vendorsRouter.delete("/:id", requireAuth, deleteVendor);

export { vendorsRouter };

