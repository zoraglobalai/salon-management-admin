import { query, withTransaction } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  state: string;
  city: string;
  addressLine: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  idType: string;
  idNumber: string;
  joiningDate: string | null;
  notes: string;
  locationId: string;
  locationName: string;
  createdAt: string;
};

type StaffRow = {
  id: string;
  name: string;
  role: string;
  phone_number: string;
  state: string;
  city: string;
  address_line: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  id_type: string;
  id_number: string;
  joining_date: string | null;
  notes: string;
  location_id: string;
  location_name: string;
  created_at: string;
};

export type StaffInput = {
  name: string;
  role: string;
  phoneNumber: string;
  state?: string;
  city?: string;
  addressLine?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  idType?: string;
  idNumber?: string;
  joiningDate?: string | null;
  notes?: string;
  locationId?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRow(row: StaffRow): StaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phoneNumber: row.phone_number,
    state: row.state,
    city: row.city,
    addressLine: row.address_line,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    ifscCode: row.ifsc_code,
    idType: row.id_type,
    idNumber: row.id_number,
    joiningDate: row.joining_date,
    notes: row.notes,
    locationId: row.location_id,
    locationName: row.location_name,
    createdAt: row.created_at,
  };
}

function str(v: unknown) {
  return String(v ?? "").trim();
}

function validateInput(input: StaffInput) {
  if (!str(input.name)) throw createError("Name is required.", 400);
  if (!str(input.role)) throw createError("Role is required.", 400);
  if (!str(input.phoneNumber)) throw createError("Phone number is required.", 400);
  return {
    name: str(input.name),
    role: str(input.role),
    phoneNumber: str(input.phoneNumber),
    state: str(input.state),
    city: str(input.city),
    addressLine: str(input.addressLine),
    bankName: str(input.bankName),
    accountNumber: str(input.accountNumber),
    ifscCode: str(input.ifscCode),
    idType: str(input.idType),
    idNumber: str(input.idNumber),
    joiningDate: input.joiningDate || null,
    notes: str(input.notes),
    locationId: input.locationId,
  };
}

async function resolveLocationId(user: AuthUserPayload, requestedLocationId?: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  if (user.type === "manager") {
    if (!user.branch_id) throw createError("Manager location not configured.", 400);
    if (requestedLocationId && requestedLocationId !== user.branch_id) {
      throw createError("Cross-location access not allowed.", 403);
    }
    return user.branch_id;
  }

  if (user.type !== "owner") throw createError("Access denied.", 403);
  if (!requestedLocationId) throw createError("locationId is required.", 400);

  const check = await query<{ id: string }>(
    `SELECT id FROM branches WHERE id = $1 AND "tenantId" = $2 LIMIT 1`,
    [requestedLocationId, user.tenant_id]
  );
  if (!check.rows[0]) throw createError("Location does not belong to your business.", 403);
  return requestedLocationId;
}

// ─── Service Functions ────────────────────────────────────────────────────────

export async function listStaff(user: AuthUserPayload, locationId?: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const values: unknown[] = [user.tenant_id];
  const filters = ["sm.tenant_id = $1"];

  if (user.type === "manager") {
    if (!user.branch_id) throw createError("Manager location not configured.", 400);
    filters.push(`sm.location_id = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (user.type === "owner" && locationId) {
    const resolved = await resolveLocationId(user, locationId);
    filters.push(`sm.location_id = $${values.length + 1}`);
    values.push(resolved);
  } else if (user.type !== "owner") {
    throw createError("Access denied.", 403);
  }

  const result = await query<StaffRow>(
    `SELECT sm.id, sm.name, sm.role, sm.phone_number,
            sm.state, sm.city, sm.address_line,
            sm.bank_name, sm.account_number, sm.ifsc_code,
            sm.id_type, sm.id_number, sm.joining_date,
            sm.notes, sm.location_id, sm.created_at,
            b.name AS location_name
     FROM staff_members sm
     INNER JOIN branches b ON b.id = sm.location_id
     WHERE ${filters.join(" AND ")}
     ORDER BY sm.created_at DESC`,
    values
  );

  return result.rows.map(mapRow);
}

export async function getStaffMember(user: AuthUserPayload, staffId: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const result = await query<StaffRow>(
    `SELECT sm.id, sm.name, sm.role, sm.phone_number,
            sm.state, sm.city, sm.address_line,
            sm.bank_name, sm.account_number, sm.ifsc_code,
            sm.id_type, sm.id_number, sm.joining_date,
            sm.notes, sm.location_id, sm.created_at,
            b.name AS location_name
     FROM staff_members sm
     INNER JOIN branches b ON b.id = sm.location_id
     WHERE sm.id = $1
       AND sm.tenant_id = $2
       AND ($3::uuid IS NULL OR sm.location_id = $3)`,
    [staffId, user.tenant_id, user.type === "manager" ? user.branch_id : null]
  );

  if (!result.rows[0]) throw createError("Staff member not found.", 404);
  return mapRow(result.rows[0]);
}

export async function createStaffMember(user: AuthUserPayload, input: StaffInput) {
  const data = validateInput(input);
  const locationId = await resolveLocationId(user, data.locationId);

  const result = await query<StaffRow>(
    `INSERT INTO staff_members
       (tenant_id, location_id, name, role, phone_number,
        state, city, address_line,
        bank_name, account_number, ifsc_code,
        id_type, id_number, joining_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id, name, role, phone_number,
               state, city, address_line,
               bank_name, account_number, ifsc_code,
               id_type, id_number, joining_date,
               notes, location_id, created_at,
               (SELECT name FROM branches WHERE id = location_id) AS location_name`,
    [
      user.tenant_id, locationId, data.name, data.role, data.phoneNumber,
      data.state, data.city, data.addressLine,
      data.bankName, data.accountNumber, data.ifscCode,
      data.idType, data.idNumber, data.joiningDate, data.notes,
    ]
  );

  return mapRow(result.rows[0]);
}

export async function updateStaffMember(user: AuthUserPayload, staffId: string, input: StaffInput) {
  const data = validateInput(input);

  const result = await query<StaffRow>(
    `UPDATE staff_members
     SET name=$1, role=$2, phone_number=$3,
         state=$4, city=$5, address_line=$6,
         bank_name=$7, account_number=$8, ifsc_code=$9,
         id_type=$10, id_number=$11, joining_date=$12,
         notes=$13, updated_at=NOW()
     WHERE id=$14
       AND tenant_id=$15
       AND ($16::uuid IS NULL OR location_id=$16)
     RETURNING id, name, role, phone_number,
               state, city, address_line,
               bank_name, account_number, ifsc_code,
               id_type, id_number, joining_date,
               notes, location_id, created_at,
               (SELECT name FROM branches WHERE id = location_id) AS location_name`,
    [
      data.name, data.role, data.phoneNumber,
      data.state, data.city, data.addressLine,
      data.bankName, data.accountNumber, data.ifscCode,
      data.idType, data.idNumber, data.joiningDate,
      data.notes,
      staffId, user.tenant_id,
      user.type === "manager" ? user.branch_id : null,
    ]
  );

  if (!result.rows[0]) throw createError("Staff member not found.", 404);
  return mapRow(result.rows[0]);
}

export async function deleteStaffMember(user: AuthUserPayload, staffId: string) {
  const result = await query<{ id: string }>(
    `DELETE FROM staff_members
     WHERE id = $1
       AND tenant_id = $2
       AND ($3::uuid IS NULL OR location_id = $3)
     RETURNING id`,
    [staffId, user.tenant_id, user.type === "manager" ? user.branch_id : null]
  );

  if (!result.rows[0]) throw createError("Staff member not found.", 404);
}
