import { query, withTransaction, type PoolClient } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

export type ExpenseStatus = "PAID" | "PENDING" | "CANCELLED";

export type ExpenseFilters = {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  expenseCategory?: string;
  subCategory?: string;
  paymentMethod?: string;
  vendorId?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type ExpenseInput = {
  expenseCategory: string;
  subCategory: string;
  amount: number;
  gstAmount?: number;
  paymentMethod: string;
  expenseDate: string;
  branchId?: string | null;
  vendorId?: string | null;
  purchaseId?: string | null;
  staffId?: string | null;
  notes?: string;
  invoiceFile?: string;
  status?: ExpenseStatus;
};

type PurchaseExpenseSyncInput = {
  tenantId: string;
  purchaseId: string;
  branchId: string;
  vendorId: string;
  expenseDate: string;
  paymentMethod: string;
  status: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  addedBy: string;
  notes?: string;
  existingExpenseId?: string | null;
};

function normalizeLocationId(locationId?: string | null) {
  if (!locationId || locationId === "all") return undefined;
  return locationId;
}

function ensureUser(user: AuthUserPayload) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);
  if (user.type !== "owner" && user.type !== "manager") {
    throw createError("Only owners and managers can manage expenses.", 403);
  }
}

async function resolveLocationId(user: AuthUserPayload, requestedLocationId?: string | null) {
  const normalizedLocationId = normalizeLocationId(requestedLocationId);
  if (user.type === "manager") {
    if (!user.branch_id) throw createError("Manager location is not configured.", 400);
    if (normalizedLocationId && normalizedLocationId !== user.branch_id) {
      throw createError("Cross-location access is not allowed.", 403);
    }
    return user.branch_id;
  }

  if (!normalizedLocationId) return null;

  const check = await query(
    `SELECT id FROM branches WHERE id = $1 AND tenant_id = $2`,
    [normalizedLocationId, user.tenant_id],
  );
  if (!check.rows[0]) throw createError("Selected branch does not belong to your business.", 403);
  return normalizedLocationId;
}

async function ensureCategoryExists(client: PoolClient, category: string, subCategory: string) {
  await client.query(
    `
      INSERT INTO expense_categories (category, sub_category, is_system)
      VALUES ($1, $2, false)
      ON CONFLICT DO NOTHING
    `,
    [category, subCategory],
  );
}

function normalizeExpenseInput(input: ExpenseInput) {
  const expenseCategory = String(input.expenseCategory || "").trim();
  const subCategory = String(input.subCategory || "").trim();
  const paymentMethod = String(input.paymentMethod || "").trim();
  const expenseDate = String(input.expenseDate || "").trim();
  const amount = Number(input.amount || 0);
  const gstAmount = Number(input.gstAmount || 0);
  const status = String(input.status || "PAID").trim().toUpperCase() as ExpenseStatus;

  if (!expenseCategory) throw createError("Expense category is required.", 400);
  if (!subCategory) throw createError("Expense sub category is required.", 400);
  if (!paymentMethod) throw createError("Payment method is required.", 400);
  if (!expenseDate) throw createError("Expense date is required.", 400);
  if (!Number.isFinite(amount) || amount < 0) throw createError("Expense amount must be a valid non-negative number.", 400);
  if (!Number.isFinite(gstAmount) || gstAmount < 0) throw createError("GST amount must be a valid non-negative number.", 400);
  if (!["PAID", "PENDING", "CANCELLED"].includes(status)) throw createError("Invalid expense status.", 400);

  return {
    expenseCategory,
    subCategory,
    paymentMethod,
    expenseDate,
    amount,
    gstAmount,
    totalAmount: amount + gstAmount,
    branchId: normalizeLocationId(input.branchId ?? undefined),
    vendorId: input.vendorId ? String(input.vendorId).trim() : null,
    purchaseId: input.purchaseId ? String(input.purchaseId).trim() : null,
    staffId: input.staffId ? String(input.staffId).trim() : null,
    notes: String(input.notes || "").trim(),
    invoiceFile: String(input.invoiceFile || "").trim(),
    status,
  };
}

function buildExpenseWhereClause(
  user: AuthUserPayload,
  filters: ExpenseFilters,
  values: unknown[],
  alias = "e",
  includeDateFilter = true,
) {
  const clauses = [`${alias}.tenant_id = $1`];
  const selectedLocationId = user.type === "manager" ? user.branch_id : normalizeLocationId(filters.locationId);

  if (selectedLocationId) {
    values.push(selectedLocationId);
    clauses.push(`${alias}.branch_id = $${values.length}`);
  }
  if (includeDateFilter && filters.startDate) {
    values.push(filters.startDate);
    clauses.push(`${alias}.expense_date >= $${values.length}`);
  }
  if (includeDateFilter && filters.endDate) {
    values.push(filters.endDate);
    clauses.push(`${alias}.expense_date <= $${values.length}`);
  }
  if (filters.expenseCategory && filters.expenseCategory !== "all") {
    values.push(filters.expenseCategory);
    clauses.push(`${alias}.expense_category = $${values.length}`);
  }
  if (filters.subCategory && filters.subCategory !== "all") {
    values.push(filters.subCategory);
    clauses.push(`${alias}.sub_category = $${values.length}`);
  }
  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    values.push(filters.paymentMethod);
    clauses.push(`${alias}.payment_method = $${values.length}`);
  }
  if (filters.vendorId && filters.vendorId !== "all") {
    values.push(filters.vendorId);
    clauses.push(`${alias}.vendor_id = $${values.length}`);
  }
  if (filters.status && filters.status !== "all") {
    values.push(filters.status.toUpperCase());
    clauses.push(`${alias}.status = $${values.length}`);
  }

  return clauses.join(" AND ");
}

export async function syncPurchaseExpense(client: PoolClient, payload: PurchaseExpenseSyncInput) {
  const subCategory = "Product Purchase Amount";
  const category = "Purchase Expenses";
  const normalizedStatus = payload.status === "PAID" ? "PAID" : payload.status === "PENDING" ? "PENDING" : "PAID";

  await ensureCategoryExists(client, category, subCategory);

  let expenseId = payload.existingExpenseId || null;
  if (expenseId) {
    await client.query(
      `
        UPDATE expenses
        SET expense_category = $2,
            sub_category = $3,
            amount = $4,
            gst_amount = $5,
            total_amount = $6,
            payment_method = $7,
            expense_date = $8,
            branch_id = $9,
            vendor_id = $10,
            purchase_id = $11,
            added_by = $12,
            notes = $13,
            status = $14,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        expenseId,
        category,
        subCategory,
        payload.amount,
        payload.gstAmount,
        payload.totalAmount,
        payload.paymentMethod,
        payload.expenseDate,
        payload.branchId,
        payload.vendorId,
        payload.purchaseId,
        payload.addedBy,
        payload.notes || "",
        normalizedStatus,
      ],
    );
  } else {
    const inserted = await client.query<{ id: string }>(
      `
        INSERT INTO expenses (
          tenant_id, expense_category, sub_category, amount, gst_amount, total_amount, payment_method,
          expense_date, branch_id, vendor_id, purchase_id, added_by, notes, status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id
      `,
      [
        payload.tenantId,
        category,
        subCategory,
        payload.amount,
        payload.gstAmount,
        payload.totalAmount,
        payload.paymentMethod,
        payload.expenseDate,
        payload.branchId,
        payload.vendorId,
        payload.purchaseId,
        payload.addedBy,
        payload.notes || "",
        normalizedStatus,
      ],
    );
    expenseId = inserted.rows[0].id;
  }

  await client.query(
    `UPDATE purchases SET expense_id = $2, updated_at = NOW() WHERE id = $1`,
    [payload.purchaseId, expenseId],
  );

  return expenseId;
}

export async function createExpense(user: AuthUserPayload, input: ExpenseInput) {
  ensureUser(user);
  const data = normalizeExpenseInput(input);
  const branchId = await resolveLocationId(user, data.branchId);

  return withTransaction(async (client) => {
    await ensureCategoryExists(client, data.expenseCategory, data.subCategory);

    const inserted = await client.query<any>(
      `
        INSERT INTO expenses (
          tenant_id, expense_category, sub_category, amount, gst_amount, total_amount, payment_method,
          expense_date, branch_id, vendor_id, purchase_id, staff_id, added_by, notes, invoice_file, status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING *
      `,
      [
        user.tenant_id,
        data.expenseCategory,
        data.subCategory,
        data.amount,
        data.gstAmount,
        data.totalAmount,
        data.paymentMethod,
        data.expenseDate,
        branchId,
        data.vendorId,
        data.purchaseId,
        data.staffId,
        user.full_name || user.email || user.user_id,
        data.notes,
        data.invoiceFile,
        data.status,
      ],
    );

    const created = inserted.rows[0];

    if (data.purchaseId) {
      await client.query(`UPDATE purchases SET expense_id = $2, updated_at = NOW() WHERE id = $1`, [data.purchaseId, created.id]);
    }
    if (data.staffId) {
      await client.query(`UPDATE staff_payroll SET last_expense_id = $2, updated_at = NOW() WHERE staff_id = $1`, [data.staffId, created.id]);
    }

    return created;
  });
}

export async function listExpenses(user: AuthUserPayload, filters: ExpenseFilters) {
  ensureUser(user);

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.max(1, Math.min(100, Number(filters.limit || 10)));
  const offset = (page - 1) * limit;

  const rowValues: unknown[] = [user.tenant_id];
  const whereClause = buildExpenseWhereClause(user, filters, rowValues);

  rowValues.push(limit, offset);

  const rowsResult = await query<any>(
    `
      SELECT
        e.id,
        e.expense_category,
        e.sub_category,
        e.amount,
        e.gst_amount,
        e.total_amount,
        e.payment_method,
        e.expense_date,
        e.branch_id,
        e.vendor_id,
        e.purchase_id,
        e.staff_id,
        e.added_by,
        e.notes,
        e.invoice_file,
        e.status,
        e.created_at,
        e.updated_at,
        COALESCE(b.name, 'All Branches') AS branch_name,
        COALESCE(v.vendor_name, '-') AS vendor_name,
        COALESCE(sm.name, '-') AS staff_name,
        p.invoice_number AS purchase_invoice
      FROM expenses e
      LEFT JOIN branches b ON b.id = e.branch_id
      LEFT JOIN vendors v ON v.id = e.vendor_id
      LEFT JOIN staff_members sm ON sm.id = e.staff_id
      LEFT JOIN purchases p ON p.id = e.purchase_id
      WHERE ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT $${rowValues.length - 1}
      OFFSET $${rowValues.length}
    `,
    rowValues,
  );

  const countValues: unknown[] = [user.tenant_id];
  const countWhereClause = buildExpenseWhereClause(user, filters, countValues);
  const countResult = await query<{ total_count: string }>(
    `SELECT COUNT(*)::int AS total_count FROM expenses e WHERE ${countWhereClause}`,
    countValues,
  );

  const summaryRowsResult = await query<any>(
    `
      SELECT total_amount, gst_amount, expense_category, vendor_id, expense_date
      FROM expenses e
      WHERE ${countWhereClause}
    `,
    countValues,
  );

  const filterMetaResult = await query<any>(
    `
      SELECT
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', v.id, 'vendor_name', v.vendor_name))
          FILTER (WHERE v.id IS NOT NULL),
          '[]'::json
        ) AS vendors,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name))
          FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) AS branches,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('category', ec.category, 'sub_category', ec.sub_category))
          FILTER (WHERE ec.category IS NOT NULL),
          '[]'::json
        ) AS categories
      FROM expense_categories ec
      LEFT JOIN vendors v ON v.tenant_id = $1
      LEFT JOIN branches b ON b.tenant_id = $1
    `,
    [user.tenant_id],
  );

  const totalCount = Number(countResult.rows[0]?.total_count || 0);
  const today = new Date();
  const weeklyStart = new Date(today);
  weeklyStart.setDate(today.getDate() - 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const categoryTotals = new Map<string, number>();
  const vendorSet = new Set<string>();
  let totalWeeklyExpense = 0;
  let totalMonthlyExpense = 0;
  let salaryExpenseTotal = 0;
  let purchaseExpenseTotal = 0;
  let gstPaidTotal = 0;

  summaryRowsResult.rows.forEach((row) => {
    const totalAmount = Number(row.total_amount || 0);
    const gstAmount = Number(row.gst_amount || 0);
    const category = String(row.expense_category || "");
    const expenseDate = new Date(row.expense_date);

    categoryTotals.set(category, (categoryTotals.get(category) || 0) + totalAmount);
    if (row.vendor_id) vendorSet.add(String(row.vendor_id));

    if (String(category).toLowerCase() === "staff expenses") salaryExpenseTotal += totalAmount;
    if (String(category).toLowerCase() === "purchase expenses") purchaseExpenseTotal += totalAmount;
    gstPaidTotal += gstAmount;

    if (!Number.isNaN(expenseDate.getTime())) {
      if (expenseDate >= weeklyStart && expenseDate <= today) totalWeeklyExpense += totalAmount;
      if (expenseDate >= monthStart && expenseDate <= today) totalMonthlyExpense += totalAmount;
    }
  });

  const highestExpenseCategory =
    [...categoryTotals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "No Expenses";

  return {
    rows: rowsResult.rows,
    summary: {
      total_weekly_expense: totalWeeklyExpense,
      total_monthly_expense: totalMonthlyExpense,
      salary_expense_total: salaryExpenseTotal,
      purchase_expense_total: purchaseExpenseTotal,
      gst_paid_total: gstPaidTotal,
      highest_expense_category: highestExpenseCategory,
      total_vendors_paid: vendorSet.size,
      total_transactions: totalCount,
    },
    filterMeta: filterMetaResult.rows[0] || { vendors: [], branches: [], categories: [] },
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
  };
}
