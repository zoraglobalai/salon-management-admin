import { query } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

type VendorStatus = "ACTIVE" | "INACTIVE";

type VendorRow = {
  id: string;
  vendor_name: string;
  company_name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
  status: VendorStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type VendorRecord = {
  id: string;
  vendorName: string;
  companyName: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  status: VendorStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type VendorInput = {
  vendorName: string;
  companyName?: string;
  category?: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  status?: VendorStatus;
  notes?: string;
};

function mapVendor(row: VendorRow): VendorRecord {
  return {
    id: row.id,
    vendorName: row.vendor_name,
    companyName: row.company_name,
    category: row.category,
    phone: row.phone,
    email: row.email,
    address: row.address,
    gstNumber: row.gst_number,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ensureUser(user: AuthUserPayload) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);
  if (user.type !== "owner" && user.type !== "manager") {
    throw createError("Only owners and managers can manage vendors.", 403);
  }
}

function normalizeVendorInput(input: VendorInput) {
  const vendorName = String(input.vendorName || "").trim();
  const phone = String(input.phone || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const status = input.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9+\-()\s]{7,20}$/;

  if (!vendorName) throw createError("Vendor name is required.", 400);
  if (!phoneRegex.test(phone)) throw createError("Phone number is invalid.", 400);
  if (email && !emailRegex.test(email)) throw createError("Email is invalid.", 400);

  return {
    vendorName,
    companyName: String(input.companyName || "").trim(),
    category: String(input.category || "").trim(),
    phone,
    email,
    address: String(input.address || "").trim(),
    gstNumber: String(input.gstNumber || "").trim(),
    status,
    notes: String(input.notes || "").trim(),
  };
}

export async function listVendors(user: AuthUserPayload, search?: string, status?: string) {
  ensureUser(user);
  const values: unknown[] = [user.tenant_id];
  const filters = ["tenant_id = $1"];

  if (status === "ACTIVE" || status === "INACTIVE") {
    values.push(status);
    filters.push(`status = $${values.length}`);
  }

  const searchValue = String(search || "").trim();
  if (searchValue) {
    values.push(`%${searchValue.toLowerCase()}%`);
    filters.push(`(
      LOWER(vendor_name) LIKE $${values.length}
      OR LOWER(company_name) LIKE $${values.length}
      OR LOWER(phone) LIKE $${values.length}
      OR LOWER(email) LIKE $${values.length}
      OR LOWER(category) LIKE $${values.length}
    )`);
  }

  const result = await query<VendorRow>(
    `
      SELECT id, vendor_name, company_name, category, phone, email, address, gst_number, status, notes, created_at, updated_at
      FROM vendors
      WHERE ${filters.join(" AND ")}
      ORDER BY created_at DESC
    `,
    values,
  );

  return result.rows.map(mapVendor);
}

export async function createVendor(user: AuthUserPayload, input: VendorInput) {
  ensureUser(user);
  const data = normalizeVendorInput(input);
  const result = await query<VendorRow>(
    `
      INSERT INTO vendors (
        tenant_id, vendor_name, company_name, category, phone, email, address, gst_number, status, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, vendor_name, company_name, category, phone, email, address, gst_number, status, notes, created_at, updated_at
    `,
    [user.tenant_id, data.vendorName, data.companyName, data.category, data.phone, data.email, data.address, data.gstNumber, data.status, data.notes],
  );

  return mapVendor(result.rows[0]);
}

export async function updateVendor(user: AuthUserPayload, vendorId: string, input: VendorInput) {
  ensureUser(user);
  const data = normalizeVendorInput(input);
  const result = await query<VendorRow>(
    `
      UPDATE vendors
      SET
        vendor_name = $3,
        company_name = $4,
        category = $5,
        phone = $6,
        email = $7,
        address = $8,
        gst_number = $9,
        status = $10,
        notes = $11,
        updated_at = now()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, vendor_name, company_name, category, phone, email, address, gst_number, status, notes, created_at, updated_at
    `,
    [vendorId, user.tenant_id, data.vendorName, data.companyName, data.category, data.phone, data.email, data.address, data.gstNumber, data.status, data.notes],
  );

  if (!result.rows[0]) throw createError("Vendor not found.", 404);
  return mapVendor(result.rows[0]);
}

export async function removeVendor(user: AuthUserPayload, vendorId: string) {
  ensureUser(user);
  const hasPurchases = await query<{ id: string }>(
    `SELECT id FROM purchases WHERE vendor_id = $1 AND tenant_id = $2 LIMIT 1`,
    [vendorId, user.tenant_id],
  );
  if (hasPurchases.rows[0]) {
    throw createError("Vendor cannot be deleted because purchase history exists.", 400);
  }

  const result = await query<{ id: string }>(
    `DELETE FROM vendors WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [vendorId, user.tenant_id],
  );
  if (!result.rows[0]) throw createError("Vendor not found.", 404);
}

