import { query } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

export type AttendanceStatus = "present" | "half_day" | "paid_leave" | "lop" | "week_off" | "holiday";

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  branchId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  markedBy: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyAttendanceMatrix = {
  staff: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  attendance: Record<string, Record<string, AttendanceStatus>>; // staffId -> date -> status
};

export async function upsertAttendance(user: AuthUserPayload, input: {
  employeeId: string;
  branchId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks?: string;
}) {
  // Permission check: Manager can only mark for their branch
  if (user.type === "manager" && user.branch_id !== input.branchId) {
    throw createError("Unauthorized: Managers can only mark attendance for their own branch.", 403);
  }

  const result = await query(
    `INSERT INTO attendance (employee_id, branch_id, attendance_date, status, marked_by, remarks)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
       status = EXCLUDED.status,
       marked_by = EXCLUDED.marked_by,
       remarks = EXCLUDED.remarks,
       updated_at = NOW()
     RETURNING *`,
    [input.employeeId, input.branchId, input.attendanceDate, input.status, user.id, input.remarks || ""]
  );

  return result.rows[0];
}

export async function getMonthlyAttendance(user: AuthUserPayload, month: number, year: number, branchId?: string) {
  const targetBranchId = user.type === "manager" ? user.branch_id : (branchId === "all" ? null : branchId);
  
  if (!targetBranchId && user.type !== "owner") {
    throw createError("Branch ID is required.", 400);
  }

  // Fetch all staff for the branch
  const staffResult = await query(
    `SELECT id, name, role FROM staff_members 
     WHERE tenant_id = $1 AND ($2::uuid IS NULL OR location_id = $2)
     ORDER BY name ASC`,
    [user.tenant_id, targetBranchId]
  );

  // Fetch attendance for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const attendanceResult = await query(
    `SELECT employee_id, attendance_date, status FROM attendance
     WHERE attendance_date BETWEEN $1 AND $2
       AND branch_id IN (SELECT id FROM branches WHERE tenant_id = $3 AND ($4::uuid IS NULL OR id = $4))`,
    [startDate, endDate, user.tenant_id, targetBranchId]
  );

  const matrix: MonthlyAttendanceMatrix = {
    staff: staffResult.rows as MonthlyAttendanceMatrix["staff"],
    attendance: {}
  };

  attendanceResult.rows.forEach(row => {
    // Format date as YYYY-MM-DD
    const d = new Date(row.attendance_date);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (!matrix.attendance[row.employee_id]) {
      matrix.attendance[row.employee_id] = {};
    }
    matrix.attendance[row.employee_id][date] = row.status;
  });

  return matrix;
}

export async function getStaffCalendar(user: AuthUserPayload, employeeId: string) {
  // Permission check: Manager can only view staff in their branch
  if (user.type === "manager") {
    const staffCheck = await query(
      `SELECT location_id FROM staff_members WHERE id = $1 AND tenant_id = $2`,
      [employeeId, user.tenant_id]
    );
    if (!staffCheck.rows[0] || staffCheck.rows[0].location_id !== user.branch_id) {
      throw createError("Unauthorized: Managers can only view attendance for staff in their branch.", 403);
    }
  }

  const result = await query(
    `SELECT id, attendance_date as date, status FROM attendance
     WHERE employee_id = $1
     ORDER BY attendance_date ASC`,
    [employeeId]
  );

  // Calculate summary
  const summary = result.rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    events: result.rows.map(r => ({
      ...r,
      date: new Date(r.date).toISOString().split('T')[0]
    })),
    summary
  };
}

export async function bulkMarkPresent(user: AuthUserPayload, branchId: string, date: string) {
  if (user.type === "manager" && user.branch_id !== branchId) {
    throw createError("Unauthorized branch.", 403);
  }

  // Get all staff in branch
  const staff = await query(
    `SELECT id FROM staff_members WHERE location_id = $1 AND tenant_id = $2`,
    [branchId, user.tenant_id]
  );

  if (staff.rows.length === 0) return { count: 0 };

  const values: any[] = [];
  const placeholders = staff.rows.map((s, i) => {
    const base = i * 5;
    values.push(s.id, branchId, date, 'present', user.id);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  }).join(",");

  await query(
    `INSERT INTO attendance (employee_id, branch_id, attendance_date, status, marked_by)
     VALUES ${placeholders}
     ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
       status = EXCLUDED.status,
       marked_by = EXCLUDED.marked_by,
       updated_at = NOW()`,
    values
  );

  return { count: staff.rows.length };
}

export async function deleteAttendance(user: AuthUserPayload, input: {
  employeeId: string;
  attendanceDate: string;
}) {
  // Permission check: Manager can only delete for staff in their branch
  if (user.type === "manager") {
    const staffCheck = await query(
      `SELECT location_id FROM staff_members WHERE id = $1 AND tenant_id = $2`,
      [input.employeeId, user.tenant_id]
    );
    if (!staffCheck.rows[0] || staffCheck.rows[0].location_id !== user.branch_id) {
      throw createError("Unauthorized: Managers can only delete attendance for staff in their branch.", 403);
    }
  }

  const result = await query(
    `DELETE FROM attendance 
     WHERE employee_id = $1 AND attendance_date = $2
     RETURNING *`,
    [input.employeeId, input.attendanceDate]
  );

  return result.rows[0];
}
