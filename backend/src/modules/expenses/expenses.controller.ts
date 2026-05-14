import type { NextFunction, Request, Response } from "express";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import { createExpense, listExpenses } from "./expenses.service";

export async function getExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const data = await listExpenses(req.user, {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      locationId: req.query.locationId as string | undefined,
      expenseCategory: req.query.expenseCategory as string | undefined,
      subCategory: req.query.subCategory as string | undefined,
      paymentMethod: req.query.paymentMethod as string | undefined,
      vendorId: req.query.vendorId as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function postExpense(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isAuthUserPayload(req.user)) return res.status(401).json({ message: "Unauthorized" });
    const expense = await createExpense(req.user, req.body);
    return res.status(201).json({ success: true, data: expense });
  } catch (error) {
    return next(error);
  }
}
