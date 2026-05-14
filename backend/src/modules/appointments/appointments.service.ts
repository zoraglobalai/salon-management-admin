import { query } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";
import type { 
  CalendarAppointmentEvent,
  AppointmentInput, 
  AppointmentRow, 
  AppointmentStatus, 
  HolidayInput, 
  HolidayRow 
} from "./appointments.types";

function normalizeDateOnly(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") {
    return value.includes("T") ? value.slice(0, 10) : value;
  }
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const asString = String(value);
  return asString.includes("T") ? asString.slice(0, 10) : asString.slice(0, 10);
}

function normalizeTimeOnly(value: unknown) {
  if (!value) return "00:00:00";
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }
  const timeValue = typeof value === "string" ? value : String(value);
  const normalized = timeValue.includes("T") ? timeValue.split("T")[1] : timeValue;
  return normalized.length === 5 ? `${normalized}:00` : normalized.slice(0, 8);
}

function toCalendarEvent(row: AppointmentRow): CalendarAppointmentEvent {
  const appointmentDate = normalizeDateOnly(row.appointment_date);
  const startTime = normalizeTimeOnly(row.start_time);
  const endTime = normalizeTimeOnly(row.end_time);

  return {
    id: row.id,
    title: `${row.customer_name || "Walk-in Customer"} - ${row.service_name || "Service"}`,
    start: `${appointmentDate}T${startTime}`,
    end: `${appointmentDate}T${endTime}`,
    extendedProps: {
      ...row,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
    },
  };
}

export async function createAppointment(user: AuthUserPayload, input: AppointmentInput) {
  const branchId = user.type === 'manager' ? user.branch_id : input.branchId;
  
  if (!branchId) throw createError("Branch ID is required", 400);
  if (user.type === 'manager' && user.branch_id !== branchId) {
    throw createError("Unauthorized: Managers can only book for their own branch", 403);
  }

  // 1. Holiday Check
  const holidayCheck = await query(
    `SELECT id FROM salon_holidays 
     WHERE holiday_date = $1 
     AND (branch_id = $2 OR branch_id IS NULL)
     AND tenant_id = $3`,
    [input.appointmentDate, branchId, user.tenant_id]
  );
  if (holidayCheck.rows.length > 0) {
    throw createError("Salon is closed on the selected date", 400);
  }

  // 2. Staff Overlap Check
  const overlapCheck = await query(
    `SELECT id FROM appointments
     WHERE staff_id = $1
     AND appointment_date = $2
     AND status NOT IN ('cancelled', 'no_show')
     AND (start_time < $3 AND end_time > $4)
     AND tenant_id = $5`,
    [input.staffId, input.appointmentDate, input.endTime, input.startTime, user.tenant_id]
  );
  if (overlapCheck.rows.length > 0) {
    throw createError("Staff member already has an overlapping appointment", 409);
  }

  const result = await query(
    `INSERT INTO appointments (
      tenant_id, branch_id, customer_id, staff_id, service_id, 
      appointment_date, start_time, end_time, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      user.tenant_id, branchId, input.customerId || null, input.staffId, input.serviceId,
      input.appointmentDate, input.startTime, input.endTime, input.notes || "", user.id
    ]
  );

  return result.rows[0];
}

export async function getDailyAppointments(user: AuthUserPayload, date: string, branchId?: string) {
  const targetBranchId = user.type === 'manager' ? user.branch_id : (branchId === 'all' ? null : branchId);
  
  const result = await query<AppointmentRow>(
    `SELECT a.*, c.name as customer_name, s.name as staff_name, sv.name as service_name
     FROM appointments a
     LEFT JOIN clients c ON a.customer_id = c.id
     INNER JOIN staff_members s ON a.staff_id = s.id
     INNER JOIN services sv ON a.service_id = sv.id
     WHERE a.appointment_date = $1
     AND a.tenant_id = $2
     AND ($3::uuid IS NULL OR a.branch_id = $3)
     ORDER BY a.start_time ASC`,
    [date, user.tenant_id, targetBranchId]
  );

  return result.rows;
}

export async function getCalendarAppointments(user: AuthUserPayload, startDate: string, endDate: string, branchId?: string) {
  const targetBranchId = user.type === 'manager' ? user.branch_id : (branchId === 'all' ? null : branchId);

  const result = await query<AppointmentRow>(
    `SELECT a.*, c.name as customer_name, s.name as staff_name, sv.name as service_name
     FROM appointments a
     LEFT JOIN clients c ON a.customer_id = c.id
     INNER JOIN staff_members s ON a.staff_id = s.id
     INNER JOIN services sv ON a.service_id = sv.id
     WHERE a.appointment_date BETWEEN $1 AND $2
     AND a.tenant_id = $3
     AND ($4::uuid IS NULL OR a.branch_id = $4)
     ORDER BY a.appointment_date ASC, a.start_time ASC`,
    [startDate, endDate, user.tenant_id, targetBranchId]
  );

  return result.rows.map(toCalendarEvent);
}

export async function updateAppointment(user: AuthUserPayload, id: string, input: AppointmentInput) {
  // Permission Check
  const existing = await query(`SELECT branch_id FROM appointments WHERE id = $1 AND tenant_id = $2`, [id, user.tenant_id]);
  if (existing.rows.length === 0) throw createError("Appointment not found", 404);
  if (user.type === 'manager' && existing.rows[0].branch_id !== user.branch_id) {
    throw createError("Unauthorized", 403);
  }

  // Overlap check (excluding self)
  const overlapCheck = await query(
    `SELECT id FROM appointments
     WHERE staff_id = $1
     AND appointment_date = $2
     AND id != $3
     AND status NOT IN ('cancelled', 'no_show')
     AND (start_time < $4 AND end_time > $5)
     AND tenant_id = $6`,
    [input.staffId, input.appointmentDate, id, input.endTime, input.startTime, user.tenant_id]
  );
  if (overlapCheck.rows.length > 0) {
    throw createError("Staff member already has an overlapping appointment", 409);
  }

  const result = await query(
    `UPDATE appointments SET
      customer_id = $1, staff_id = $2, service_id = $3,
      appointment_date = $4, start_time = $5, end_time = $6,
      notes = $7, status = $8, updated_at = NOW()
    WHERE id = $9 AND tenant_id = $10
    RETURNING *`,
    [
      input.customerId || null, input.staffId, input.serviceId,
      input.appointmentDate, input.startTime, input.endTime,
      input.notes || "", input.status || 'booked', id, user.tenant_id
    ]
  );

  return result.rows[0];
}

export async function updateAppointmentStatus(user: AuthUserPayload, id: string, status: AppointmentStatus) {
  const result = await query(
    `UPDATE appointments SET status = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3
     AND ($4::uuid IS NULL OR branch_id = $4)
     RETURNING *`,
    [status, id, user.tenant_id, user.type === 'manager' ? user.branch_id : null]
  );

  if (result.rows.length === 0) throw createError("Appointment not found or unauthorized", 404);
  return result.rows[0];
}

export async function deleteAppointment(user: AuthUserPayload, id: string) {
  const result = await query(
    `DELETE FROM appointments 
     WHERE id = $1 AND tenant_id = $2
     AND ($3::uuid IS NULL OR branch_id = $3)
     RETURNING id`,
    [id, user.tenant_id, user.type === 'manager' ? user.branch_id : null]
  );

  if (result.rows.length === 0) throw createError("Appointment not found or unauthorized", 404);
  return { id };
}

export async function listHolidays(user: AuthUserPayload, branchId?: string) {
  const targetBranchId = user.type === 'manager' ? user.branch_id : (branchId === 'all' ? null : branchId);

  const result = await query<HolidayRow>(
    `SELECT * FROM salon_holidays 
     WHERE tenant_id = $1 
     AND ($2::uuid IS NULL OR branch_id = $2 OR branch_id IS NULL)
     ORDER BY holiday_date ASC`,
    [user.tenant_id, targetBranchId]
  );
  return result.rows;
}

export async function createHoliday(user: AuthUserPayload, input: HolidayInput) {
  const branchId = user.type === 'manager' ? user.branch_id : input.branchId;

  const result = await query(
    `INSERT INTO salon_holidays (tenant_id, branch_id, holiday_name, holiday_date, is_recurring)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user.tenant_id, branchId || null, input.holidayName, input.holidayDate, input.isRecurring || false]
  );
  return result.rows[0];
}

export async function deleteHoliday(user: AuthUserPayload, id: string) {
  const result = await query(
    `DELETE FROM salon_holidays 
     WHERE id = $1 AND tenant_id = $2
     AND ($3::uuid IS NULL OR branch_id = $3)
     RETURNING id`,
    [id, user.tenant_id, user.type === 'manager' ? user.branch_id : null]
  );
  if (result.rows.length === 0) throw createError("Holiday not found or unauthorized", 404);
  return { id };
}

export async function getBusySlots(user: AuthUserPayload, staffId: string, date: string) {
  const result = await query(
    `SELECT start_time, end_time FROM appointments
     WHERE staff_id = $1
     AND appointment_date = $2
     AND status NOT IN ('cancelled', 'no_show')
     AND tenant_id = $3`,
    [staffId, date, user.tenant_id]
  );
  return result.rows;
}

export async function autoExpireAppointments() {
  const currentTime = new Date();
  const timeStr = currentTime.toTimeString().slice(0, 5); // HH:mm
  const dateStr = currentTime.toISOString().split('T')[0]; // yyyy-mm-dd

  // Find appointments that have ended but are still 'booked' or 'confirmed'
  const result = await query(
    `UPDATE appointments 
     SET status = 'cancelled', updated_at = NOW()
     WHERE (appointment_date < $1 OR (appointment_date = $1 AND end_time < $2))
     AND status IN ('booked', 'confirmed')
     RETURNING id, customer_id, appointment_date, start_time`,
    [dateStr, timeStr]
  );

  if (result.rows.length > 0) {
    console.log(`[Auto-Expire] Cancelled ${result.rows.length} expired appointments.`);
  }

  return result.rows;
}
