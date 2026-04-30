import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import * as reportsController from "./reports.controller";

const router = Router();

router.get("/sales", authMiddleware, reportsController.handleGetSalesReport);
router.get("/customers", authMiddleware, reportsController.handleGetCustomerReport);
router.get("/staff", authMiddleware, reportsController.handleGetStaffReport);
router.get("/services", authMiddleware, reportsController.handleGetServiceReport);
router.get("/inventory", authMiddleware, reportsController.handleGetInventoryReport);
router.get("/summary", authMiddleware, reportsController.handleGetReportsSummary);

export default router;
