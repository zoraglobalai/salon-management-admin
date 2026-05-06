import { query } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

export type InventoryRecord = {
  id: string;
  name: string;
  costPrice: number;
  unit: string;
  quantity: number;
  stock: number;
  serviceQuantity: number;
  benefits: string;
  locationId: string;
  locationName: string;
  createdAt: string;
};

type InventoryRow = {
  id: string;
  name: string;
  cost_price: string | number;
  unit: string;
  quantity: string | number;
  stock: string | number;
  service_quantity: string | number;
  benefits: string;
  location_id: string;
  location_name: string;
  created_at: string;
};

type InventoryInput = {
  name: string;
  costPrice: number;
  unit: string;
  quantity: number;
  stock: number;
  benefits: string;
  locationId?: string;
};

type SchemaColumnRow = {
  column_name: string;
};

const ALLOWED_UNITS = new Set(["ml", "L", "pcs"]);

function mapInventoryRow(row: InventoryRow): InventoryRecord {
  return {
    id: row.id,
    name: row.name,
    costPrice: Number(row.cost_price),
    unit: row.unit,
    quantity: Number(row.quantity),
    stock: Number(row.stock),
    serviceQuantity: Number(row.service_quantity),
    benefits: row.benefits,
    locationId: row.location_id,
    locationName: row.location_name,
    createdAt: row.created_at,
  };
}

function buildLegacySku(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${slug || "inventory-item"}-${Date.now()}`;
}

function normalizeInput(input: InventoryInput) {
  const unit = String(input.unit || "").trim();

  if (!input.name?.trim()) {
    throw createError("Product name is required.", 400);
  }

  if (!ALLOWED_UNITS.has(unit)) {
    throw createError("Unit must be one of ml, L, or pcs.", 400);
  }

  const costPrice = Number(input.costPrice);
  const quantity = Number(input.quantity);
  const stock = Number(input.stock);

  if ([costPrice, quantity, stock].some((value) => Number.isNaN(value) || value < 0)) {
    throw createError("Cost price, quantity, and stock must be non-negative numbers.", 400);
  }

  return {
    name: input.name.trim(),
    costPrice,
    unit,
    quantity,
    stock,
    benefits: String(input.benefits || "").trim(),
    locationId: input.locationId,
  };
}

async function getTableColumns(tableName: string) {
  const result = await query<SchemaColumnRow>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName],
  );

  return new Set(result.rows.map((row) => row.column_name));
}

function getInventorySql(columns: Set<string>, alias = "i") {
  const nameExpr = columns.has("name") ? `${alias}.name` : `${alias}.item_name`;
  const costExpr = columns.has("cost_price")
    ? `COALESCE(${alias}.cost_price, 0)`
    : columns.has("unit_cost")
      ? `COALESCE(${alias}.unit_cost, 0)`
      : "0";
  const unitExpr = columns.has("unit") ? `COALESCE(${alias}.unit, 'pcs')` : `'pcs'`;
  const quantityExpr = columns.has("quantity") ? `COALESCE(${alias}.quantity, 0)` : "0";
  const stockExpr = columns.has("stock")
    ? `COALESCE(${alias}.stock, 0)`
    : columns.has("reorder_level")
      ? `COALESCE(${alias}.reorder_level, 0)`
      : "0";
  const serviceQuantityExpr = columns.has("service_quantity") ? `COALESCE(${alias}.service_quantity, 0)` : "0";
  const benefitsExpr = columns.has("benefits") ? `COALESCE(${alias}.benefits, '')` : `''`;
  const locationExpr = columns.has("location_id")
    ? (columns.has("branch_id") ? `COALESCE(${alias}.location_id, ${alias}.branch_id)` : `${alias}.location_id`)
    : `${alias}.branch_id`;

  return {
    nameExpr,
    costExpr,
    unitExpr,
    quantityExpr,
    stockExpr,
    serviceQuantityExpr,
    benefitsExpr,
    locationExpr,
  };
}

async function getAccessibleLocationId(user: AuthUserPayload, requestedLocationId?: string) {
  if (!user.tenant_id) {
    throw createError("Tenant not found for current user.", 400);
  }

  if (user.type === "manager") {
    if (!user.branch_id) {
      throw createError("Manager location is not configured.", 400);
    }

    if (requestedLocationId && requestedLocationId !== user.branch_id) {
      throw createError("Cross-location access is not allowed.", 403);
    }

    return user.branch_id;
  }

  if (user.type !== "owner") {
    throw createError("Only owners and managers can access inventory.", 403);
  }

  if (!requestedLocationId) {
    throw createError("Location is required.", 400);
  }

  const branchCheck = await query<{ id: string }>(
    `SELECT id FROM branches WHERE id = $1 AND "tenantId" = $2 LIMIT 1`,
    [requestedLocationId, user.tenant_id],
  );

  if (!branchCheck.rows[0]) {
    throw createError("Selected location does not belong to your business.", 403);
  }

  return requestedLocationId;
}

async function getInventoryItemById(columns: Set<string>, inventoryId: string) {
  const sql = getInventorySql(columns, "inventory");
  const result = await query<InventoryRow>(
    `
      SELECT
        inventory.id,
        ${sql.nameExpr} AS name,
        ${sql.costExpr} AS cost_price,
        ${sql.unitExpr} AS unit,
        ${sql.quantityExpr} AS quantity,
        ${sql.stockExpr} AS stock,
        ${sql.serviceQuantityExpr} AS service_quantity,
        ${sql.benefitsExpr} AS benefits,
        ${sql.locationExpr} AS location_id,
        (
          SELECT name
          FROM branches
          WHERE id = ${sql.locationExpr}
        ) AS location_name,
        inventory.created_at
      FROM inventory
      WHERE inventory.id = $1
      LIMIT 1
    `,
    [inventoryId],
  );

  return result.rows[0] ?? null;
}

export async function listInventory(user: AuthUserPayload, locationId?: string) {
  if (!user.tenant_id) {
    throw createError("Tenant not found for current user.", 400);
  }

  const columns = await getTableColumns("inventory");
  const sql = getInventorySql(columns);
  const values: unknown[] = [user.tenant_id];
  const filters = ["i.tenant_id = $1"];

  if (user.type === "manager") {
    if (!user.branch_id) {
      throw createError("Manager location is not configured.", 400);
    }

    filters.push(`${sql.locationExpr} = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (user.type === "owner" && locationId) {
    const resolvedLocationId = await getAccessibleLocationId(user, locationId);
    filters.push(`${sql.locationExpr} = $${values.length + 1}`);
    values.push(resolvedLocationId);
  } else if (user.type !== "owner") {
    throw createError("Only owners and managers can access inventory.", 403);
  }

  const result = await query<InventoryRow>(
    `
      SELECT
        i.id,
        ${sql.nameExpr} AS name,
        ${sql.costExpr} AS cost_price,
        ${sql.unitExpr} AS unit,
        ${sql.quantityExpr} AS quantity,
        ${sql.stockExpr} AS stock,
        ${sql.serviceQuantityExpr} AS service_quantity,
        ${sql.benefitsExpr} AS benefits,
        ${sql.locationExpr} AS location_id,
        b.name AS location_name,
        i.created_at
      FROM inventory i
      INNER JOIN branches b ON b.id = ${sql.locationExpr}
      WHERE ${filters.join(" AND ")}
      ORDER BY i.created_at DESC
    `,
    values,
  );

  return result.rows.map(mapInventoryRow);
}

export async function createInventoryItem(user: AuthUserPayload, input: InventoryInput) {
  const normalized = normalizeInput(input);
  const locationId = await getAccessibleLocationId(user, normalized.locationId);
  const columns = await getTableColumns("inventory");
  const insertColumns: string[] = [];
  const insertValues: unknown[] = [];

  const pushValue = (column: string, value: unknown) => {
    insertColumns.push(column);
    insertValues.push(value);
  };

  pushValue("tenant_id", user.tenant_id);
  if (columns.has("branch_id")) pushValue("branch_id", locationId);
  if (columns.has("location_id")) pushValue("location_id", locationId);
  if (columns.has("user_id")) pushValue("user_id", user.user_id);
  if (columns.has("item_name")) pushValue("item_name", normalized.name);
  if (columns.has("name")) pushValue("name", normalized.name);
  if (columns.has("sku")) pushValue("sku", buildLegacySku(normalized.name));
  if (columns.has("reorder_level")) pushValue("reorder_level", normalized.stock);
  if (columns.has("unit_cost")) pushValue("unit_cost", normalized.costPrice);
  if (columns.has("cost_price")) pushValue("cost_price", normalized.costPrice);
  if (columns.has("unit")) pushValue("unit", normalized.unit);
  if (columns.has("quantity")) pushValue("quantity", normalized.quantity);
  if (columns.has("stock")) pushValue("stock", normalized.stock);
  if (columns.has("benefits")) pushValue("benefits", normalized.benefits);

  const result = await query<{ id: string }>(
    `
      INSERT INTO inventory (
        ${insertColumns.join(", ")}
      )
      VALUES (${insertValues.map((_, index) => `$${index + 1}`).join(", ")})
      RETURNING id
    `,
    insertValues,
  );

  const item = await getInventoryItemById(columns, result.rows[0].id);
  if (!item) {
    throw createError("Inventory item could not be loaded after creation.", 500);
  }

  return mapInventoryRow(item);
}

export async function updateInventoryItem(user: AuthUserPayload, inventoryId: string, input: InventoryInput) {
  const normalized = normalizeInput(input);
  const locationId = await getAccessibleLocationId(user, normalized.locationId);
  const legacyReorderLevel = Math.max(Math.floor(normalized.stock), 0);
  const columns = await getTableColumns("inventory");
  const sql = getInventorySql(columns);

  const existing = await query<{ id: string }>(
    `
      SELECT id
      FROM inventory
      WHERE id = $1
        AND tenant_id = $2
        AND ($3::uuid IS NULL OR ${sql.locationExpr} = $3)
      LIMIT 1
    `,
    [inventoryId, user.tenant_id, user.type === "manager" ? user.branch_id : null],
  );

  if (!existing.rows[0]) {
    throw createError("Inventory item not found.", 404);
  }

  const updates: string[] = [];
  const values: unknown[] = [inventoryId, user.tenant_id];

  const pushUpdate = (column: string, value: unknown) => {
    updates.push(`${column} = $${values.length + 1}`);
    values.push(value);
  };

  if (columns.has("item_name")) pushUpdate("item_name", normalized.name);
  if (columns.has("unit_cost")) pushUpdate("unit_cost", normalized.costPrice);
  if (columns.has("reorder_level")) pushUpdate("reorder_level", legacyReorderLevel);
  if (columns.has("name")) pushUpdate("name", normalized.name);
  if (columns.has("cost_price")) pushUpdate("cost_price", normalized.costPrice);
  if (columns.has("unit")) pushUpdate("unit", normalized.unit);
  if (columns.has("quantity")) pushUpdate("quantity", normalized.quantity);
  if (columns.has("stock")) pushUpdate("stock", normalized.stock);
  if (columns.has("benefits")) pushUpdate("benefits", normalized.benefits);
  if (columns.has("location_id")) pushUpdate("location_id", locationId);
  if (columns.has("branch_id")) pushUpdate("branch_id", locationId);
  if (columns.has("user_id")) pushUpdate("user_id", user.user_id);

  if (updates.length === 0) {
    throw createError("Inventory schema does not support updates.", 500);
  }

  const result = await query<{ id: string }>(
    `
      UPDATE inventory
      SET ${updates.join(", ")}
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `,
    values,
  );

  const item = await getInventoryItemById(columns, result.rows[0].id);
  if (!item) {
    throw createError("Inventory item could not be loaded after update.", 500);
  }

  return mapInventoryRow(item);
}

export async function deleteInventoryItem(user: AuthUserPayload, inventoryId: string) {
  const columns = await getTableColumns("inventory");
  const sql = getInventorySql(columns);
  const result = await query<{ id: string }>(
    `
      DELETE FROM inventory
      WHERE id = $1
        AND tenant_id = $2
        AND ($3::uuid IS NULL OR ${sql.locationExpr} = $3)
      RETURNING id
    `,
    [inventoryId, user.tenant_id, user.type === "manager" ? user.branch_id : null],
  );

  if (!result.rows[0]) {
    throw createError("Inventory item not found.", 404);
  }
}

export async function moveStockToService(user: AuthUserPayload, inventoryId: string, quantityToMove: number) {
  if (quantityToMove <= 0) {
    throw createError("Quantity to move must be greater than 0.", 400);
  }

  const columns = await getTableColumns("inventory");
  const sql = getInventorySql(columns);
  const existing = await query<{ stock: string; quantity: string }>(
    `
      SELECT ${sql.stockExpr} AS stock, ${sql.quantityExpr} AS quantity
      FROM inventory
      WHERE id = $1
        AND tenant_id = $2
        AND ($3::uuid IS NULL OR ${sql.locationExpr} = $3)
      LIMIT 1
    `,
    [inventoryId, user.tenant_id, user.type === "manager" ? user.branch_id : null],
  );

  if (!existing.rows[0]) {
    throw createError("Inventory item not found.", 404);
  }

  const currentStock = Number(existing.rows[0].stock);
  if (currentStock < quantityToMove) {
    throw createError("Insufficient stock to move to service.", 400);
  }

  const perUnitVolume = Number(existing.rows[0].quantity) || 1;
  const volumeToAdd = quantityToMove * perUnitVolume;
  const mutations: string[] = [];

  if (columns.has("stock")) {
    mutations.push(`stock = COALESCE(stock, 0) - $4`);
  }
  if (columns.has("reorder_level")) {
    mutations.push(`reorder_level = COALESCE(reorder_level, 0) - $4`);
  }
  if (columns.has("service_quantity")) {
    mutations.push(`service_quantity = COALESCE(service_quantity, 0) + $5`);
  }

  if (mutations.length === 0) {
    throw createError("Inventory stock columns are not available in the current schema.", 500);
  }

  const result = await query<{ id: string }>(
    `
      UPDATE inventory
      SET ${mutations.join(", ")}
      WHERE id = $1
        AND tenant_id = $2
        AND ($3::uuid IS NULL OR ${sql.locationExpr} = $3)
      RETURNING id
    `,
    [inventoryId, user.tenant_id, user.type === "manager" ? user.branch_id : null, quantityToMove, volumeToAdd],
  );

  const item = await getInventoryItemById(columns, result.rows[0].id);
  if (!item) {
    throw createError("Inventory item could not be loaded after stock transfer.", 500);
  }

  return mapInventoryRow(item);
}
