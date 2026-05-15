import { query, withTransaction, type PoolClient } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";
import { syncPurchaseExpense } from "../expenses/expenses.service";

type PurchaseItemInput = {
  productName: string;
  category?: string;
  unit: "ML" | "PCS" | "KG" | "Litre";
  costPrice: number;
  gst: number;
  gstType?: "AMOUNT" | "PERCENT";
  initialStock: number;
  initialQuantity: number;
  lowStockAlert: number;
  serviceStock: number;
  expiryDate?: string;
  batchNumber?: string;
};

type PurchaseInput = {
  vendorId: string;
  locationId?: string;
  purchaseDate: string;
  invoiceNumber?: string;
  paymentStatus: string;
  paymentMethod: string;
  notes?: string;
  items: PurchaseItemInput[];
};

type PurchaseRow = {
  id: string;
  vendor_id: string;
  vendor_name: string;
  location_id: string;
  location_name: string;
  purchase_date: string;
  invoice_number: string;
  payment_status: string;
  payment_method: string;
  total_amount: string | number;
  notes: string;
  created_at: string;
  products_bought?: string;
  total_stock?: string | number;
  per_product_cost?: string | number;
  per_product_gst?: string | number;
};

type PurchaseItemRow = {
  id: string;
  purchase_id: string;
  product_name: string;
  category: string;
  unit: string;
  cost_price: string | number;
  gst: string | number;
  gst_type: "AMOUNT" | "PERCENT";
  initial_stock: string | number;
  initial_quantity: string | number;
  low_stock_alert: string | number;
  service_stock: string | number;
  expiry_date: string | null;
  batch_number: string;
  created_at: string;
};

export type PurchaseRecord = {
  id: string;
  vendorId: string;
  vendorName: string;
  locationId: string;
  locationName: string;
  purchaseDate: string;
  invoiceNumber: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  notes: string;
  createdAt: string;
  productsBought?: string;
  totalStock?: number;
  perProductCost?: number;
  perProductGst?: number;
  items?: PurchaseItemRecord[];
};

export type PurchaseItemRecord = {
  id: string;
  purchaseId: string;
  productName: string;
  category: string;
  unit: string;
  costPrice: number;
  gst: number;
  gstType: "AMOUNT" | "PERCENT";
  initialStock: number;
  initialQuantity: number;
  lowStockAlert: number;
  serviceStock: number;
  expiryDate: string | null;
  batchNumber: string;
  createdAt: string;
};

const ALLOWED_UNITS = new Set(["ml", "pcs", "kg", "litre"]);

function mapPurchase(row: PurchaseRow): PurchaseRecord {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    locationId: row.location_id,
    locationName: row.location_name,
    purchaseDate: row.purchase_date,
    invoiceNumber: row.invoice_number,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    totalAmount: Number(row.total_amount),
    notes: row.notes,
    createdAt: row.created_at,
    productsBought: row.products_bought || "",
    totalStock: Number(row.total_stock || 0),
    perProductCost: Number(row.per_product_cost || 0),
    perProductGst: Number(row.per_product_gst || 0),
  };
}

function mapPurchaseItem(row: PurchaseItemRow): PurchaseItemRecord {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    productName: row.product_name,
    category: row.category,
    unit: row.unit,
    costPrice: Number(row.cost_price),
    gst: Number(row.gst),
    gstType: row.gst_type === "PERCENT" ? "PERCENT" : "AMOUNT",
    initialStock: Number(row.initial_stock),
    initialQuantity: Number(row.initial_quantity),
    lowStockAlert: Number(row.low_stock_alert),
    serviceStock: Number(row.service_stock),
    expiryDate: row.expiry_date,
    batchNumber: row.batch_number,
    createdAt: row.created_at,
  };
}

function ensureUser(user: AuthUserPayload) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);
  if (user.type !== "owner" && user.type !== "manager") {
    throw createError("Only owners and managers can manage purchases.", 403);
  }
}

async function resolveLocationId(user: AuthUserPayload, locationId?: string) {
  if (user.type === "manager") {
    if (!user.branch_id) throw createError("Manager location is not configured.", 400);
    if (locationId && locationId !== user.branch_id) throw createError("Cross-location access is not allowed.", 403);
    return user.branch_id;
  }

  if (!locationId) throw createError("Location is required.", 400);
  const branchCheck = await query<{ id: string }>(
    `SELECT id FROM branches WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [locationId, user.tenant_id],
  );
  if (!branchCheck.rows[0]) throw createError("Selected location does not belong to your business.", 403);
  return locationId;
}

function normalizeItem(item: PurchaseItemInput) {
  const productName = String(item.productName || "").trim();
  const unit = String(item.unit || "").trim().toLowerCase();
  const numericValues = {
    costPrice: Number(item.costPrice),
    gst: Number(item.gst),
    initialStock: Number(item.initialStock),
    initialQuantity: Number(item.initialQuantity),
    lowStockAlert: Number(item.lowStockAlert),
    serviceStock: Number(item.serviceStock),
  };

  if (!productName) throw createError("Product name is required in purchase items.", 400);
  if (!ALLOWED_UNITS.has(unit)) throw createError("Unit must be one of ML, PCS, KG, or Litre.", 400);
  if (Object.values(numericValues).some((value) => Number.isNaN(value) || value < 0)) {
    throw createError("Purchase item numeric fields must be non-negative numbers.", 400);
  }
  if (numericValues.serviceStock > numericValues.initialStock) {
    throw createError("Service stock cannot be greater than initial stock.", 400);
  }

  return {
    productName,
    category: String(item.category || "").trim(),
    unit,
    costPrice: numericValues.costPrice,
    gst: numericValues.gst,
    gstType: item.gstType === "PERCENT" ? "PERCENT" : "AMOUNT",
    initialStock: numericValues.initialStock,
    initialQuantity: numericValues.initialQuantity,
    lowStockAlert: numericValues.lowStockAlert,
    serviceStock: numericValues.serviceStock,
    expiryDate: item.expiryDate || null,
    batchNumber: String(item.batchNumber || "").trim(),
  };
}

function resolveGstAmount(item: { costPrice: number; gst: number; gstType: string }) {
  if (item.gstType === "PERCENT") {
    return (item.costPrice * item.gst) / 100;
  }
  return item.gst;
}

function normalizePayload(payload: PurchaseInput) {
  const vendorId = String(payload.vendorId || "").trim();
  const purchaseDate = String(payload.purchaseDate || "").trim();
  const paymentStatus = String(payload.paymentStatus || "").trim() || "PENDING";
  const paymentMethod = String(payload.paymentMethod || "").trim();
  const items = Array.isArray(payload.items) ? payload.items.map(normalizeItem) : [];

  if (!vendorId) throw createError("Vendor is required.", 400);
  if (!purchaseDate) throw createError("Purchase date is required.", 400);
  if (!items.length) throw createError("At least one purchase item is required.", 400);

  return {
    vendorId,
    locationId: payload.locationId,
    purchaseDate,
    invoiceNumber: String(payload.invoiceNumber || "").trim(),
    paymentStatus,
    paymentMethod,
    notes: String(payload.notes || "").trim(),
    items,
  };
}

async function validateVendor(client: PoolClient, tenantId: string, vendorId: string) {
  const vendor = await client.query<{ id: string }>(
    `SELECT id FROM vendors WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE' LIMIT 1`,
    [vendorId, tenantId],
  );
  if (!vendor.rows[0]) throw createError("Selected vendor not found or inactive.", 404);
}

async function upsertInventoryFromPurchase(
  client: PoolClient,
  user: AuthUserPayload,
  locationId: string,
  purchaseId: string,
  vendorId: string,
  purchaseDate: string,
  item: ReturnType<typeof normalizeItem>,
) {
  const mainStockDelta = Math.max(item.initialStock - item.serviceStock, 0);

  const existing = await client.query<{ id: string }>(
    `
      SELECT id
      FROM inventory
      WHERE tenant_id = $1
        AND location_id = $2
        AND LOWER(name) = LOWER($3)
        AND LOWER(unit) = LOWER($4)
      LIMIT 1
    `,
    [user.tenant_id, locationId, item.productName, item.unit],
  );

  if (existing.rows[0]) {
    await client.query(
      `
        UPDATE inventory
        SET
          stock = COALESCE(stock, 0) + $3,
          quantity = GREATEST(COALESCE(quantity, 0), $4),
          cost_price = $5,
          unit_cost = $5,
          low_stock_threshold = $6,
          service_quantity = COALESCE(service_quantity, 0) + $7,
          vendor_id = $8,
          last_purchase_id = $9,
          last_purchase_date = $10::timestamptz,
          product_category = $11
        WHERE id = $1 AND tenant_id = $2
      `,
      [
        existing.rows[0].id,
        user.tenant_id,
        mainStockDelta,
        item.initialQuantity,
        item.costPrice,
        item.lowStockAlert,
        item.serviceStock,
        vendorId,
        purchaseId,
        purchaseDate,
        item.category,
      ],
    );
    return;
  }

  await client.query(
    `
      INSERT INTO inventory (
        tenant_id,
        branch_id,
        location_id,
        user_id,
        item_name,
        name,
        sku,
        quantity,
        reorder_level,
        low_stock_threshold,
        unit_cost,
        cost_price,
        unit,
        stock,
        service_quantity,
        benefits,
        vendor_id,
        last_purchase_id,
        last_purchase_date,
        product_category
      )
      VALUES (
        $1,$2,$2,$3,$4,$4,
        CONCAT(LOWER(REPLACE($4, ' ', '-')), '-', EXTRACT(EPOCH FROM NOW())::bigint),
        $5,$6,$6,$7,$7,$8,$9,$10,'',$11,$12,$13::timestamptz,$14
      )
    `,
    [
      user.tenant_id,
      locationId,
      user.user_id,
      item.productName,
      item.initialQuantity,
      item.lowStockAlert,
      item.costPrice,
      item.unit,
      mainStockDelta,
      item.serviceStock,
      vendorId,
      purchaseId,
      purchaseDate,
      item.category,
    ],
  );
}

async function rollbackInventoryFromPurchaseItem(
  client: PoolClient,
  tenantId: string,
  locationId: string,
  item: PurchaseItemRecord,
) {
  const mainStockDelta = Math.max(Number(item.initialStock) - Number(item.serviceStock), 0);

  await client.query(
    `
      UPDATE inventory
      SET
        stock = GREATEST(COALESCE(stock, 0) - $3, 0),
        service_quantity = GREATEST(COALESCE(service_quantity, 0) - $4, 0)
      WHERE tenant_id = $1
        AND location_id = $2
        AND LOWER(name) = LOWER($5)
        AND LOWER(unit) = LOWER($6)
    `,
    [tenantId, locationId, mainStockDelta, item.serviceStock, item.productName, item.unit],
  );
}

export async function createPurchase(user: AuthUserPayload, payload: PurchaseInput) {
  ensureUser(user);
  const data = normalizePayload(payload);
  const locationId = await resolveLocationId(user, data.locationId);
  const totalAmount = data.items.reduce((sum, item) => sum + (item.costPrice + resolveGstAmount(item)) * item.initialStock, 0);

  return withTransaction(async (client) => {
    await validateVendor(client, user.tenant_id as string, data.vendorId);
    const purchaseResult = await client.query<{ id: string }>(
      `
        INSERT INTO purchases (
          tenant_id, location_id, vendor_id, purchase_date, invoice_number, payment_status, payment_method, total_amount, notes, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id
      `,
      [user.tenant_id, locationId, data.vendorId, data.purchaseDate, data.invoiceNumber, data.paymentStatus, data.paymentMethod, totalAmount, data.notes, user.full_name || user.email || user.user_id],
    );
    const purchaseId = purchaseResult.rows[0].id;

    for (const item of data.items) {
      await client.query(
        `
          INSERT INTO purchase_items (
            purchase_id, product_name, category, unit, cost_price, gst, gst_type, initial_stock, initial_quantity, low_stock_alert, service_stock, expiry_date, batch_number
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        `,
        [
          purchaseId,
          item.productName,
          item.category,
          item.unit,
          item.costPrice,
          item.gst,
          item.gstType,
          item.initialStock,
          item.initialQuantity,
          item.lowStockAlert,
          item.serviceStock,
          item.expiryDate,
          item.batchNumber,
        ],
      );

      await upsertInventoryFromPurchase(client, user, locationId, purchaseId, data.vendorId, data.purchaseDate, item);
    }

    const totalGstAmount = data.items.reduce((sum, item) => sum + resolveGstAmount(item) * item.initialStock, 0);
    await syncPurchaseExpense(client, {
      tenantId: user.tenant_id as string,
      purchaseId,
      branchId: locationId,
      vendorId: data.vendorId,
      expenseDate: data.purchaseDate,
      paymentMethod: data.paymentMethod,
      status: data.paymentStatus,
      amount: totalAmount - totalGstAmount,
      gstAmount: totalGstAmount,
      totalAmount,
      addedBy: user.full_name || user.email || user.user_id,
      notes: data.notes,
    });

    const purchase = await client.query<PurchaseRow>(
      `
        SELECT
          p.id, p.vendor_id, v.vendor_name, p.location_id, b.name as location_name, p.purchase_date, p.invoice_number,
          p.payment_status, p.payment_method, p.total_amount, p.notes, p.created_at
        FROM purchases p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN branches b ON b.id = p.location_id
        WHERE p.id = $1
      `,
      [purchaseId],
    );

    const items = await client.query<PurchaseItemRow>(
      `
        SELECT id, purchase_id, product_name, category, unit, cost_price, gst, gst_type, initial_stock, initial_quantity, low_stock_alert, service_stock, expiry_date, batch_number, created_at
        FROM purchase_items
        WHERE purchase_id = $1
        ORDER BY created_at ASC
      `,
      [purchaseId],
    );

    return { purchase: mapPurchase(purchase.rows[0]), items: items.rows.map(mapPurchaseItem) };
  });
}

export async function listPurchases(user: AuthUserPayload, locationId?: string) {
  ensureUser(user);
  const values: unknown[] = [user.tenant_id];
  const filters = ["p.tenant_id = $1"];

  if (user.type === "manager") {
    if (!user.branch_id) throw createError("Manager location is not configured.", 400);
    values.push(user.branch_id);
    filters.push(`p.location_id = $${values.length}`);
  } else if (locationId) {
    const resolved = await resolveLocationId(user, locationId);
    values.push(resolved);
    filters.push(`p.location_id = $${values.length}`);
  }

  const result = await query<PurchaseRow>(
    `
      SELECT
        p.id, p.vendor_id, v.vendor_name, p.location_id, b.name as location_name, p.purchase_date, p.invoice_number,
        p.payment_status, p.payment_method, p.total_amount, p.notes, p.created_at,
        COALESCE((
          SELECT string_agg(pi.product_name, ', ' ORDER BY pi.created_at)
          FROM purchase_items pi
          WHERE pi.purchase_id = p.id
        ), '') AS products_bought,
        COALESCE((
          SELECT SUM(pi.initial_stock)
          FROM purchase_items pi
          WHERE pi.purchase_id = p.id
        ), 0) AS total_stock,
        CASE
          WHEN COALESCE((
            SELECT SUM(pi.initial_stock)
            FROM purchase_items pi
            WHERE pi.purchase_id = p.id
          ), 0) > 0
          THEN COALESCE((
            SELECT SUM(pi.cost_price * pi.initial_stock)
            FROM purchase_items pi
            WHERE pi.purchase_id = p.id
          ), 0) / COALESCE((
            SELECT SUM(pi.initial_stock)
            FROM purchase_items pi
            WHERE pi.purchase_id = p.id
          ), 1)
          ELSE 0
        END AS per_product_cost,
        CASE
          WHEN COALESCE((
            SELECT SUM(pi.initial_stock)
            FROM purchase_items pi
            WHERE pi.purchase_id = p.id
          ), 0) > 0
            THEN COALESCE((
            SELECT SUM((CASE WHEN pi.gst_type = 'PERCENT' THEN (pi.cost_price * pi.gst / 100) ELSE pi.gst END) * pi.initial_stock)
            FROM purchase_items pi
            WHERE pi.purchase_id = p.id
          ), 0) / COALESCE((
            SELECT SUM(pi.initial_stock)
            FROM purchase_items pi
            WHERE pi.purchase_id = p.id
          ), 1)
          ELSE 0
        END AS per_product_gst
      FROM purchases p
      JOIN vendors v ON v.id = p.vendor_id
      JOIN branches b ON b.id = p.location_id
      WHERE ${filters.join(" AND ")}
      ORDER BY p.created_at DESC
    `,
    values,
  );

  return result.rows.map(mapPurchase);
}

export async function getPurchaseDetails(user: AuthUserPayload, purchaseId: string) {
  ensureUser(user);
  const purchase = await query<PurchaseRow>(
    `
      SELECT
        p.id, p.vendor_id, v.vendor_name, p.location_id, b.name as location_name, p.purchase_date, p.invoice_number,
        p.payment_status, p.payment_method, p.total_amount, p.notes, p.created_at,
        COALESCE((
          SELECT string_agg(pi.product_name, ', ' ORDER BY pi.created_at)
          FROM purchase_items pi
          WHERE pi.purchase_id = p.id
        ), '') AS products_bought
      FROM purchases p
      JOIN vendors v ON v.id = p.vendor_id
      JOIN branches b ON b.id = p.location_id
      WHERE p.id = $1 AND p.tenant_id = $2 AND ($3::uuid IS NULL OR p.location_id = $3)
      LIMIT 1
    `,
    [purchaseId, user.tenant_id, user.type === "manager" ? user.branch_id : null],
  );
  if (!purchase.rows[0]) throw createError("Purchase not found.", 404);

  const items = await query<PurchaseItemRow>(
    `
      SELECT id, purchase_id, product_name, category, unit, cost_price, gst, gst_type, initial_stock, initial_quantity, low_stock_alert, service_stock, expiry_date, batch_number, created_at
      FROM purchase_items
      WHERE purchase_id = $1
      ORDER BY created_at ASC
    `,
    [purchaseId],
  );

  return { ...mapPurchase(purchase.rows[0]), items: items.rows.map(mapPurchaseItem) };
}

export async function updatePurchase(user: AuthUserPayload, purchaseId: string, payload: PurchaseInput) {
  ensureUser(user);
  const data = normalizePayload(payload);
  const locationId = await resolveLocationId(user, data.locationId);
  const totalAmount = data.items.reduce((sum, item) => sum + (item.costPrice + resolveGstAmount(item)) * item.initialStock, 0);

  return withTransaction(async (client) => {
    const existingPurchase = await client.query<{ id: string; location_id: string; expense_id?: string | null }>(
      `
        SELECT id, location_id, expense_id
        FROM purchases
        WHERE id = $1
          AND tenant_id = $2
          AND ($3::uuid IS NULL OR location_id = $3)
        LIMIT 1
      `,
      [purchaseId, user.tenant_id, user.type === "manager" ? user.branch_id : null],
    );
    if (!existingPurchase.rows[0]) throw createError("Purchase not found.", 404);
    const existingExpenseId = existingPurchase.rows[0].expense_id || null;

    await validateVendor(client, user.tenant_id as string, data.vendorId);

    const previousItems = await client.query<PurchaseItemRow>(
      `
        SELECT id, purchase_id, product_name, category, unit, cost_price, gst, gst_type, initial_stock, initial_quantity, low_stock_alert, service_stock, expiry_date, batch_number, created_at
        FROM purchase_items
        WHERE purchase_id = $1
      `,
      [purchaseId],
    );

    for (const row of previousItems.rows) {
      await rollbackInventoryFromPurchaseItem(client, user.tenant_id as string, existingPurchase.rows[0].location_id, mapPurchaseItem(row));
    }

    await client.query(
      `
        UPDATE purchases
        SET
          vendor_id = $3,
          location_id = $4,
          purchase_date = $5,
          invoice_number = $6,
          payment_status = $7,
          payment_method = $8,
          total_amount = $9,
          notes = $10,
          updated_at = now()
        WHERE id = $1 AND tenant_id = $2
      `,
      [purchaseId, user.tenant_id, data.vendorId, locationId, data.purchaseDate, data.invoiceNumber, data.paymentStatus, data.paymentMethod, totalAmount, data.notes],
    );

    await client.query(`DELETE FROM purchase_items WHERE purchase_id = $1`, [purchaseId]);

    for (const item of data.items) {
      await client.query(
        `
          INSERT INTO purchase_items (
            purchase_id, product_name, category, unit, cost_price, gst, gst_type, initial_stock, initial_quantity, low_stock_alert, service_stock, expiry_date, batch_number
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        `,
        [
          purchaseId,
          item.productName,
          item.category,
          item.unit,
          item.costPrice,
          item.gst,
          item.gstType,
          item.initialStock,
          item.initialQuantity,
          item.lowStockAlert,
          item.serviceStock,
          item.expiryDate,
          item.batchNumber,
        ],
      );
      await upsertInventoryFromPurchase(client, user, locationId, purchaseId, data.vendorId, data.purchaseDate, item);
    }

    const totalGstAmount = data.items.reduce((sum, item) => sum + resolveGstAmount(item) * item.initialStock, 0);
    await syncPurchaseExpense(client, {
      tenantId: user.tenant_id as string,
      purchaseId,
      branchId: locationId,
      vendorId: data.vendorId,
      expenseDate: data.purchaseDate,
      paymentMethod: data.paymentMethod,
      status: data.paymentStatus,
      amount: totalAmount - totalGstAmount,
      gstAmount: totalGstAmount,
      totalAmount,
      addedBy: user.full_name || user.email || user.user_id,
      notes: data.notes,
      existingExpenseId,
    });

    const purchase = await client.query<PurchaseRow>(
      `
        SELECT
          p.id, p.vendor_id, v.vendor_name, p.location_id, b.name as location_name, p.purchase_date, p.invoice_number,
          p.payment_status, p.payment_method, p.total_amount, p.notes, p.created_at,
          COALESCE((
            SELECT string_agg(pi.product_name, ', ' ORDER BY pi.created_at)
            FROM purchase_items pi
            WHERE pi.purchase_id = p.id
          ), '') AS products_bought,
          COALESCE((
            SELECT SUM(pi.initial_stock)
            FROM purchase_items pi
            WHERE pi.purchase_id = p.id
          ), 0) AS total_stock,
          CASE
            WHEN COALESCE((
              SELECT SUM(pi.initial_stock)
              FROM purchase_items pi
              WHERE pi.purchase_id = p.id
            ), 0) > 0
            THEN COALESCE((
              SELECT SUM(pi.cost_price * pi.initial_stock)
              FROM purchase_items pi
              WHERE pi.purchase_id = p.id
            ), 0) / COALESCE((
              SELECT SUM(pi.initial_stock)
              FROM purchase_items pi
              WHERE pi.purchase_id = p.id
            ), 1)
            ELSE 0
          END AS per_product_cost,
          CASE
            WHEN COALESCE((
              SELECT SUM(pi.initial_stock)
              FROM purchase_items pi
              WHERE pi.purchase_id = p.id
            ), 0) > 0
            THEN COALESCE((
              SELECT SUM((CASE WHEN pi.gst_type = 'PERCENT' THEN (pi.cost_price * pi.gst / 100) ELSE pi.gst END) * pi.initial_stock)
              FROM purchase_items pi
              WHERE pi.purchase_id = p.id
            ), 0) / COALESCE((
              SELECT SUM(pi.initial_stock)
              FROM purchase_items pi
              WHERE pi.purchase_id = p.id
            ), 1)
            ELSE 0
          END AS per_product_gst
        FROM purchases p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN branches b ON b.id = p.location_id
        WHERE p.id = $1
      `,
      [purchaseId],
    );

    const items = await client.query<PurchaseItemRow>(
      `
        SELECT id, purchase_id, product_name, category, unit, cost_price, gst, gst_type, initial_stock, initial_quantity, low_stock_alert, service_stock, expiry_date, batch_number, created_at
        FROM purchase_items
        WHERE purchase_id = $1
        ORDER BY created_at ASC
      `,
      [purchaseId],
    );

    return { purchase: mapPurchase(purchase.rows[0]), items: items.rows.map(mapPurchaseItem) };
  });
}
