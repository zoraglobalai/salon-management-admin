import type { Request, Response } from "express";
import * as appointmentService from "./appointments.service";
import { createError } from "../../middleware/errorHandler";
import { isAuthUserPayload } from "../../middleware/authMiddleware";
import type { AuthUserPayload } from "../../shared/types/auth";

function getAuthUser(req: Request): AuthUserPayload {
  if (!isAuthUserPayload(req.user)) {
    throw createError("Unauthorized: Operator access required.", 401);
  }
  return req.user;
}

export async function createAppointment(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const result = await appointmentService.createAppointment(user, req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getDailyAppointments(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const { date, branchId } = req.query;
    const result = await appointmentService.getDailyAppointments(user, String(date), branchId ? String(branchId) : undefined);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getCalendarAppointments(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const { startDate, endDate, branchId } = req.query;
    const result = await appointmentService.getCalendarAppointments(user, String(startDate), String(endDate), branchId ? String(branchId) : undefined);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function updateAppointment(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const { id } = req.params;
    const result = await appointmentService.updateAppointment(user, id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function updateAppointmentStatus(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const { id } = req.params;
    const { status } = req.body;
    const result = await appointmentService.updateAppointmentStatus(user, id, status);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function deleteAppointment(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const { id } = req.params;
    const result = await appointmentService.deleteAppointment(user, id);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function listHolidays(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const { branchId } = req.query;
    const result = await appointmentService.listHolidays(user, branchId ? String(branchId) : undefined);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function createHoliday(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const result = await appointmentService.createHoliday(user, req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function deleteHoliday(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const { id } = req.params;
    const result = await appointmentService.deleteHoliday(user, id);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getBusySlots(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const { staffId, date } = req.query;
    if (!staffId || !date) throw createError("Staff ID and Date are required", 400);
    const result = await appointmentService.getBusySlots(user, String(staffId), String(date));
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function triggerAutoExpire(req: Request, res: Response) {
  try {
    const result = await appointmentService.autoExpireAppointments();
    res.json({ success: true, expiredCount: result.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function getStaffAttendanceStatus(req: Request, res: Response) {
  try {
    const user = getAuthUser(req);
    const { staffId, date } = req.query;
    if (!staffId || !date) throw createError("Staff ID and Date are required", 400);
    const result = await appointmentService.getStaffAttendanceStatus(user, String(staffId), String(date));
    res.json({ status: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

