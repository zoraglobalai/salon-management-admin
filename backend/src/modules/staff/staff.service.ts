import { query, withTransaction } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StaffPayroll = {
  salaryType: "monthly" | "weekly";
  salaryAmount: number;
  paymentMethod: "Cash" | "Bank Transfer" | "UPI";
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  currentState: string;
  currentCity: string;
  currentAddressLine: string;
  state: string;
  city: string;
  addressLine: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  idType: string;
  idNumber: string;
  identificationDetails: Array<{
    idType: string;
    idNumber: string;
  }>;
  joiningDate: string | null;
  notes: string;
  locationId: string;
  locationName: string;
  payroll?: StaffPayroll;
  createdAt: string;
};

type StaffRow = {
  id: string;
  name: string;
  role: string;
  phone_number: string;
  current_state: string;
  current_city: string;
  current_address_line: string;
  state: string;
  city: string;
  address_line: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  id_type: string;
  id_number: string;
  identification_details: Array<{
    idType?: string;
    idNumber?: string;
  }> | null;
  joining_date: string | null;
  notes: string;
  location_id: string;
  location_name: string;
  salary_type?: "monthly" | "weekly";
  salary_amount?: string | number;
  payment_method?: "Cash" | "Bank Transfer" | "UPI";
  bank_name_p?: string;
  account_number_p?: string;
  ifsc_code_p?: string;
  upi_id_p?: string;
  created_at: string;
};

export type StaffInput = {
  name: string;
  role: string;
  phoneNumber: string;
  currentState?: string;
  currentCity?: string;
  currentAddressLine?: string;
  state?: string;
  city?: string;
  addressLine?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  idType?: string;
  idNumber?: string;
  identificationDetails?: Array<{
    idType?: string;
    idNumber?: string;
  }>;
  joiningDate?: string | null;
  notes?: string;
  locationId?: string;
  payroll?: StaffPayroll;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRow(row: StaffRow): StaffMember {
  const identificationDetails = Array.isArray(row.identification_details)
    ? row.identification_details
        .map((item) => ({
          idType: str(item?.idType),
          idNumber: str(item?.idNumber),
        }))
        .filter((item) => item.idType || item.idNumber)
    : [];
 
  const normalizedIdentificationDetails =
    identificationDetails.length > 0
      ? identificationDetails
      : row.id_type || row.id_number
        ? [{ idType: row.id_type, idNumber: row.id_number }]
        : [];
 
  const payroll: StaffPayroll | undefined = row.salary_type
    ? {
        salaryType: row.salary_type,
        salaryAmount: Number(row.salary_amount || 0),
        paymentMethod: row.payment_method || "Cash",
        bankName: str(row.bank_name_p || row.bank_name),
        accountNumber: str(row.account_number_p || row.account_number),
        ifscCode: str(row.ifsc_code_p || row.ifsc_code),
        upiId: str(row.upi_id_p),
      }
    : undefined;
 
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phoneNumber: row.phone_number,
    currentState: row.current_state,
    currentCity: row.current_city,
    currentAddressLine: row.current_address_line,
    state: row.state,
    city: row.city,
    addressLine: row.address_line,
    bankName: str(row.bank_name_p || row.bank_name),
    accountNumber: str(row.account_number_p || row.account_number),
    ifscCode: str(row.ifsc_code_p || row.ifsc_code),
    idType: row.id_type,
    idNumber: row.id_number,
    identificationDetails: normalizedIdentificationDetails,
    joiningDate: row.joining_date,
    notes: row.notes,
    locationId: row.location_id,
    locationName: row.location_name,
    payroll,
    createdAt: row.created_at,
  };
}

function str(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeLocationId(locationId?: string) {
  const normalized = str(locationId);
  if (!normalized || normalized.toLowerCase() === "all") {
    return undefined;
  }
  return normalized;
}

function validateInput(input: StaffInput) {
  if (!str(input.name)) throw createError("Name is required.", 400);
  if (!str(input.role)) throw createError("Role is required.", 400);
  if (!str(input.phoneNumber)) throw createError("Phone number is required.", 400);
  
  if (input.payroll) {
    if (!input.payroll.salaryType) throw createError("Salary type is required.", 400);
    if (typeof input.payroll.salaryAmount !== "number" || input.payroll.salaryAmount < 0) {
      throw createError("Positive salary amount is required.", 400);
    }
    if (input.payroll.paymentMethod === "Bank Transfer") {
      if (!str(input.payroll.bankName)) throw createError("Bank name is required for bank transfer.", 400);
      if (!str(input.payroll.accountNumber)) throw createError("Account number is required for bank transfer.", 400);
      if (!str(input.payroll.ifscCode)) throw createError("IFSC code is required for bank transfer.", 400);
    }
    if (input.payroll.paymentMethod === "UPI") {
      if (!str(input.payroll.upiId)) throw createError("UPI ID is required for UPI payments.", 400);
    }
  }

  const identificationDetails = Array.isArray(input.identificationDetails)
    ? input.identificationDetails
        .map((item) => ({
          idType: str(item?.idType),
          idNumber: str(item?.idNumber),
        }))
        .filter((item) => item.idType || item.idNumber)
    : [];

  const normalizedIdType = identificationDetails[0]?.idType || str(input.idType);
  const normalizedIdNumber = identificationDetails[0]?.idNumber || str(input.idNumber);

  return {
    name: str(input.name),
    role: str(input.role),
    phoneNumber: str(input.phoneNumber),
    currentState: str(input.currentState) || str(input.state),
    currentCity: str(input.currentCity) || str(input.city),
    currentAddressLine: str(input.currentAddressLine) || str(input.addressLine),
    state: str(input.state),
    city: str(input.city),
    addressLine: str(input.addressLine),
    bankName: str(input.bankName),
    accountNumber: str(input.accountNumber),
    ifscCode: str(input.ifscCode),
    idType: normalizedIdType,
    idNumber: normalizedIdNumber,
    identificationDetails,
    joiningDate: input.joiningDate || null,
    notes: str(input.notes),
    locationId: input.locationId,
    payroll: input.payroll,
  };
}

async function resolveLocationId(user: AuthUserPayload, requestedLocationId?: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);
  const normalizedLocationId = normalizeLocationId(requestedLocationId);

  if (user.type === "manager") {
    if (!user.branch_id) throw createError("Manager location not configured.", 400);
    if (normalizedLocationId && normalizedLocationId !== user.branch_id) {
      throw createError("Cross-location access not allowed.", 403);
    }
    return user.branch_id;
  }

  if (user.type !== "owner") throw createError("Access denied.", 403);
  if (!normalizedLocationId) throw createError("locationId is required.", 400);

  const check = await query<{ id: string }>(
    `SELECT id FROM branches WHERE id = $1 AND "tenantId" = $2 LIMIT 1`,
    [normalizedLocationId, user.tenant_id]
  );
  if (!check.rows[0]) throw createError("Location does not belong to your business.", 403);
  return normalizedLocationId;
}

// ─── Service Functions ────────────────────────────────────────────────────────

export async function listStaff(user: AuthUserPayload, locationId?: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);
  const normalizedLocationId = normalizeLocationId(locationId);

  const values: unknown[] = [user.tenant_id];
  const filters = [
    "sm.tenant_id = $1",
    "COALESCE(LOWER(TRIM(sm.role)), '') <> 'manager'",
  ];

  if (user.type === "manager") {
    if (!user.branch_id) throw createError("Manager location not configured.", 400);
    filters.push(`sm.location_id = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (user.type === "owner" && normalizedLocationId) {
    const resolved = await resolveLocationId(user, normalizedLocationId);
    filters.push(`sm.location_id = $${values.length + 1}`);
    values.push(resolved);
  } else if (user.type !== "owner") {
    throw createError("Access denied.", 403);
  }

  const result = await query<StaffRow>(
    `SELECT sm.id, sm.name, sm.role, sm.phone_number,
            sm.current_state, sm.current_city, sm.current_address_line,
            sm.state, sm.city, sm.address_line,
            sm.bank_name, sm.account_number, sm.ifsc_code,
            sm.id_type, sm.id_number, sm.identification_details, sm.joining_date,
            sm.notes, sm.location_id, sm.created_at,
            b.name AS location_name,
            sp.salary_type, sp.salary_amount, sp.payment_method,
            sp.bank_name AS bank_name_p, sp.account_number AS account_number_p,
            sp.ifsc_code AS ifsc_code_p, sp.upi_id AS upi_id_p
     FROM staff_members sm
     INNER JOIN branches b ON b.id = sm.location_id
     LEFT JOIN staff_payroll sp ON sp.staff_id = sm.id
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
            sm.current_state, sm.current_city, sm.current_address_line,
            sm.state, sm.city, sm.address_line,
            sm.bank_name, sm.account_number, sm.ifsc_code,
            sm.id_type, sm.id_number, sm.identification_details, sm.joining_date,
            sm.notes, sm.location_id, sm.created_at,
            b.name AS location_name,
            sp.salary_type, sp.salary_amount, sp.payment_method,
            sp.bank_name AS bank_name_p, sp.account_number AS account_number_p,
            sp.ifsc_code AS ifsc_code_p, sp.upi_id AS upi_id_p
     FROM staff_members sm
     INNER JOIN branches b ON b.id = sm.location_id
     LEFT JOIN staff_payroll sp ON sp.staff_id = sm.id
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

  return withTransaction(async (client) => {
    const result = await client.query<StaffRow>(
      `INSERT INTO staff_members
         (tenant_id, location_id, name, role, phone_number,
          current_state, current_city, current_address_line,
          state, city, address_line,
          bank_name, account_number, ifsc_code,
          id_type, id_number, identification_details, joining_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19)
       RETURNING id, name, role, phone_number,
                 current_state, current_city, current_address_line,
                 state, city, address_line,
                 bank_name, account_number, ifsc_code,
                 id_type, id_number, identification_details, joining_date,
                 notes, location_id, created_at,
                 (SELECT name FROM branches WHERE id = location_id) AS location_name`,
      [
        user.tenant_id, locationId, data.name, data.role, data.phoneNumber,
        data.currentState, data.currentCity, data.currentAddressLine,
        data.state, data.city, data.addressLine,
        data.bankName, data.accountNumber, data.ifscCode,
        data.idType, data.idNumber, JSON.stringify(data.identificationDetails), data.joiningDate, data.notes,
      ]
    );

    const staff = result.rows[0];

    if (data.payroll) {
      await client.query(
        `INSERT INTO staff_payroll
           (staff_id, salary_type, salary_amount, payment_method, bank_name, account_number, ifsc_code, upi_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          staff.id, data.payroll.salaryType, data.payroll.salaryAmount, data.payroll.paymentMethod,
          data.payroll.bankName, data.payroll.accountNumber, data.payroll.ifscCode, data.payroll.upiId
        ]
      );
    }

    // Fetch full data with payroll for response
    const fullResult = await client.query<StaffRow>(
      `SELECT sm.*, b.name AS location_name,
              sp.salary_type, sp.salary_amount, sp.payment_method,
              sp.bank_name AS bank_name_p, sp.account_number AS account_number_p,
              sp.ifsc_code AS ifsc_code_p, sp.upi_id AS upi_id_p
       FROM staff_members sm
       INNER JOIN branches b ON b.id = sm.location_id
       LEFT JOIN staff_payroll sp ON sp.staff_id = sm.id
       WHERE sm.id = $1`,
      [staff.id]
    );

    return mapRow(fullResult.rows[0]);
  });
}

export async function updateStaffMember(user: AuthUserPayload, staffId: string, input: StaffInput) {
  const data = validateInput(input);

  return withTransaction(async (client) => {
    const result = await client.query<StaffRow>(
      `UPDATE staff_members
       SET name=$1, role=$2, phone_number=$3,
           current_state=$4, current_city=$5, current_address_line=$6,
           state=$7, city=$8, address_line=$9,
           bank_name=$10, account_number=$11, ifsc_code=$12,
           id_type=$13, id_number=$14, identification_details=$15::jsonb, joining_date=$16,
           notes=$17, updated_at=NOW()
       WHERE id=$18
         AND tenant_id=$19
         AND ($20::uuid IS NULL OR location_id=$20)
       RETURNING id`,
      [
        data.name, data.role, data.phoneNumber,
        data.currentState, data.currentCity, data.currentAddressLine,
        data.state, data.city, data.addressLine,
        data.bankName, data.accountNumber, data.ifscCode,
        data.idType, data.idNumber, JSON.stringify(data.identificationDetails), data.joiningDate,
        data.notes,
        staffId, user.tenant_id,
        user.type === "manager" ? user.branch_id : null,
      ]
    );

    if (!result.rows[0]) throw createError("Staff member not found.", 404);

    if (data.payroll) {
      // Use UPSERT logic for payroll based on staff_id
      await client.query(
        `INSERT INTO staff_payroll
           (staff_id, salary_type, salary_amount, payment_method, bank_name, account_number, ifsc_code, upi_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (staff_id) DO UPDATE SET
           salary_type = EXCLUDED.salary_type,
           salary_amount = EXCLUDED.salary_amount,
           payment_method = EXCLUDED.payment_method,
           bank_name = EXCLUDED.bank_name,
           account_number = EXCLUDED.account_number,
           ifsc_code = EXCLUDED.ifsc_code,
           upi_id = EXCLUDED.upi_id,
           updated_at = NOW()`,
        [
          staffId, data.payroll.salaryType, data.payroll.salaryAmount, data.payroll.paymentMethod,
          data.payroll.bankName, data.payroll.accountNumber, data.payroll.ifscCode, data.payroll.upiId
        ]
      );
    }

    // Fetch full data for response
    const fullResult = await client.query<StaffRow>(
      `SELECT sm.*, b.name AS location_name,
              sp.salary_type, sp.salary_amount, sp.payment_method,
              sp.bank_name AS bank_name_p, sp.account_number AS account_number_p,
              sp.ifsc_code AS ifsc_code_p, sp.upi_id AS upi_id_p
       FROM staff_members sm
       INNER JOIN branches b ON b.id = sm.location_id
       LEFT JOIN staff_payroll sp ON sp.staff_id = sm.id
       WHERE sm.id = $1`,
      [staffId]
    );

    return mapRow(fullResult.rows[0]);
  });
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
