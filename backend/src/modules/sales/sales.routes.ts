import { Router } from "express";
import {
  handleCreateSaleDraft,
  handleFinalizeSaleDraft,
  handleGetSaleDetail,
  handleListSaleDrafts,
  handleListSales,
  handleUpdateSaleDraft,
} from "./sales.controller";

const router = Router();

router.get("/drafts", handleListSaleDrafts);
router.post("/drafts", handleCreateSaleDraft);
router.put("/drafts/:id", handleUpdateSaleDraft);
router.post("/drafts/:id/checkout", handleFinalizeSaleDraft);
router.get("/", handleListSales);
router.get("/:id", handleGetSaleDetail);

export default router;
