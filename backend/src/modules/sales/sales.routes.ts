import { Router } from "express";
import { handleCreateSale, handleListSales, handleGetSaleDetail } from "./sales.controller";

const router = Router();

router.post("/", handleCreateSale);
router.get("/", handleListSales);
router.get("/:id", handleGetSaleDetail);

export default router;
