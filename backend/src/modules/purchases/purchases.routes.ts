import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { getPurchase, getPurchases, postPurchase, putPurchase } from "./purchases.controller";

const purchasesRouter = Router();

purchasesRouter.get("/", requireAuth, getPurchases);
purchasesRouter.get("/:id", requireAuth, getPurchase);
purchasesRouter.post("/", requireAuth, postPurchase);
purchasesRouter.put("/:id", requireAuth, putPurchase);
purchasesRouter.patch("/:id", requireAuth, putPurchase);
purchasesRouter.post("/:id", requireAuth, putPurchase);

export { purchasesRouter };
