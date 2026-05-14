import { Request, Response } from "express";
import * as attendanceService from "./attendance.service";
import { createError } from "../../middleware/errorHandler";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import type { AuthUserPayload } from "../../shared/types/auth";

function getAuthUser(req: Request): AuthUserPayload {
  if (!isAuthUserPayload(req.user)) {
    throw createError("Unauthorized: Operator access required.", 401);
  }
  return req.user;
}

export async function upsertAttendance(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const record = await attendanceService.upsertAttendance(user, req.body);
    res.json({ success: true, record });
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

export async function getMonthlyAttendance(req: Request, res: Response) {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);
    const branchId = req.query.branchId as string;

    if (isNaN(month) || isNaN(year)) {
      throw createError("Invalid month or year.", 400);
    }

    const data = await attendanceService.getMonthlyAttendance(getAuthUser(req), month, year, branchId);
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

export async function getStaffCalendar(req: Request, res: Response) {
  try {
    const { employeeId } = req.params;
    const data = await attendanceService.getStaffCalendar(getAuthUser(req), employeeId);
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

export async function bulkMarkPresent(req: Request, res: Response) {
  try {
    const { branchId, date } = req.body;
    if (!branchId || !date) {
      throw createError("Branch ID and Date are required.", 400);
    }
    const result = await attendanceService.bulkMarkPresent(getAuthUser(req), branchId, date);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { employeeId, attendanceDate } = req.query;
    
    if (!employeeId || !attendanceDate) {
      return res.status(400).json({ message: "employeeId and attendanceDate are required." });
    }

    const result = await attendanceService.deleteAttendance(user, {
      employeeId: employeeId as string,
      attendanceDate: attendanceDate as string
    });
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
};
