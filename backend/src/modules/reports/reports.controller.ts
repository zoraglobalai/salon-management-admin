import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import * as reportsService from "./reports.service";
import type { AttendanceReportFilters, ExpenseReportFilters } from "./reports.service";

export async function handleGetSalesReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      locationId: req.query.locationId as string,
      paymentMethod: req.query.paymentMethod as string,
      interval: req.query.interval as string || 'daily',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };
    const data = await reportsService.getSalesReport(req.user, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function handleGetCustomerReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      locationId: req.query.locationId as string,
    };
    const data = await reportsService.getCustomerReport(req.user, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function handleGetStaffReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      locationId: req.query.locationId as string,
    };
    const data = await reportsService.getStaffReport(req.user, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function handleGetServiceReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      locationId: req.query.locationId as string,
    };
    const data = await reportsService.getServiceReport(req.user, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function handleGetInventoryReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const filters = {
      locationId: req.query.locationId as string,
    };
    const data = await reportsService.getInventoryReport(req.user, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function handleGetReportsSummary(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      locationId: req.query.locationId as string,
    };
    const data = await reportsService.getReportsSummary(req.user, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function handleGetPurchaseReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      locationId: req.query.locationId as string,
      vendorId: req.query.vendorId as string,
      product: req.query.product as string,
      category: req.query.category as string,
      paymentStatus: req.query.paymentStatus as string,
      paymentMethod: req.query.paymentMethod as string,
      createdBy: req.query.createdBy as string,
    };
    const data = await reportsService.getPurchaseReport(req.user, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function handleGetAttendanceReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const filters: AttendanceReportFilters = {
      startDate:  req.query.startDate  as string | undefined,
      endDate:    req.query.endDate    as string | undefined,
      locationId: req.query.locationId as string | undefined,
      staffId:    req.query.staffId    as string | undefined,
      salaryType: req.query.salaryType as string | undefined,
      page:  req.query.page  ? parseInt(req.query.page  as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };
    const data = await reportsService.getAttendanceReport(req.user, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function handleGetExpenseReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const filters: ExpenseReportFilters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      locationId: req.query.locationId as string | undefined,
      expenseCategory: req.query.expenseCategory as string | undefined,
      subCategory: req.query.subCategory as string | undefined,
      paymentMethod: req.query.paymentMethod as string | undefined,
      vendorId: req.query.vendorId as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    };
    const data = await reportsService.getExpenseReport(req.user, filters);
    return res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

