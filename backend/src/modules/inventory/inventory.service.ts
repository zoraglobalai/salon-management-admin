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

export async function listInventory(user: AuthUserPayload, locationId?: string) {
  if (!user.tenant_id) {
    throw createError("Tenant not found for current user.", 400);
  }

  const values: unknown[] = [user.tenant_id];
  const filters = ["i.tenant_id = $1"];

  if (user.type === "manager") {
    if (!user.branch_id) {
      throw createError("Manager location is not configured.", 400);
    }

    filters.push(`i.location_id = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (user.type === "owner" && locationId) {
    const resolvedLocationId = await getAccessibleLocationId(user, locationId);
    filters.push(`i.location_id = $${values.length + 1}`);
    values.push(resolvedLocationId);
  } else if (user.type !== "owner") {
    throw createError("Only owners and managers can access inventory.", 403);
  }

  const result = await query<InventoryRow>(
    `
      SELECT
        i.id,
        COALESCE(i.name, i.item_name) AS name,
        COALESCE(i.cost_price, i.unit_cost, 0) AS cost_price,
        COALESCE(i.unit, 'pcs') AS unit,
        i.quantity,
        COALESCE(i.stock, i.reorder_level, 0) AS stock,
        COALESCE(i.service_quantity, 0) AS service_quantity,
        COALESCE(i.benefits, '') AS benefits,
        COALESCE(i.location_id, i.branch_id) AS location_id,
        b.name AS location_name,
        i.created_at
      FROM inventory i
      INNER JOIN branches b ON b.id = COALESCE(i.location_id, i.branch_id)
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

  const result = await query<InventoryRow>(
    `
      INSERT INTO inventory (
        tenant_id,
        branch_id,
        user_id,
        item_name,
        sku,
        reorder_level,
        unit_cost,
        name,
        cost_price,
        unit,
        quantity,
        stock,
        benefits,
        location_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING
        id,
        COALESCE(name, item_name) AS name,
        COALESCE(cost_price, unit_cost, 0) AS cost_price,
        COALESCE(unit, 'pcs') AS unit,
        quantity,
        COALESCE(stock, reorder_level, 0) AS stock,
        COALESCE(service_quantity, 0) AS service_quantity,
        COALESCE(benefits, '') AS benefits,
        COALESCE(location_id, branch_id) AS location_id,
        created_at,
        (
          SELECT name
          FROM branches
          WHERE id = COALESCE(inventory.location_id, inventory.branch_id)
        ) AS location_name
    `,
    [
      user.tenant_id,
      locationId,
      user.user_id,
      normalized.name,
      buildLegacySku(normalized.name),
      normalized.stock,
      normalized.costPrice,
      normalized.name,
      normalized.costPrice,
      normalized.unit,
      normalized.quantity,
      normalized.stock,
      normalized.benefits,
      locationId,
    ],
  );

  return mapInventoryRow(result.rows[0]);
}

export async function updateInventoryItem(user: AuthUserPayload, inventoryId: string, input: InventoryInput) {
  const normalized = normalizeInput(input);
  const locationId = await getAccessibleLocationId(user, normalized.locationId);
  const legacyReorderLevel = Math.max(Math.floor(normalized.stock), 0);

  const existing = await query<{ id: string }>(
    `
      SELECT id
      FROM inventory
      WHERE id = $1
        AND tenant_id = $2
        AND ($3::uuid IS NULL OR location_id = $3)
      LIMIT 1
    `,
    [inventoryId, user.tenant_id, user.type === "manager" ? user.branch_id : null],
  );

  if (!existing.rows[0]) {
    throw createError("Inventory item not found.", 404);
  }

  const result = await query<InventoryRow>(
    `
      UPDATE inventory
      SET
        item_name = $3,
        unit_cost = $4,
        reorder_level = $7,
        name = $3,
        cost_price = $4,
        unit = $5,
        quantity = $6,
        stock = $8,
        benefits = $9,
        location_id = $10,
        branch_id = $10,
        user_id = $11
      WHERE id = $1 AND tenant_id = $2
      RETURNING
        id,
        COALESCE(name, item_name) AS name,
        COALESCE(cost_price, unit_cost, 0) AS cost_price,
        COALESCE(unit, 'pcs') AS unit,
        quantity,
        COALESCE(stock, reorder_level, 0) AS stock,
        COALESCE(service_quantity, 0) AS service_quantity,
        COALESCE(benefits, '') AS benefits,
        COALESCE(location_id, branch_id) AS location_id,
        created_at,
        (
          SELECT name
          FROM branches
          WHERE id = COALESCE(inventory.location_id, inventory.branch_id)
        ) AS location_name
    `,
    [
      inventoryId,
      user.tenant_id,
      normalized.name,
      normalized.costPrice,
      normalized.unit,
      normalized.quantity,
      legacyReorderLevel,
      normalized.stock,
      normalized.benefits,
      locationId,
      user.user_id,
    ],
  );

  return mapInventoryRow(result.rows[0]);
}

export async function deleteInventoryItem(user: AuthUserPayload, inventoryId: string) {
  const result = await query<{ id: string }>(
    `
      DELETE FROM inventory
      WHERE id = $1
        AND tenant_id = $2
        AND ($3::uuid IS NULL OR location_id = $3)
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

  const existing = await query<{ stock: string; quantity: string }>(
    `
      SELECT stock, quantity
      FROM inventory
      WHERE id = $1
        AND tenant_id = $2
        AND ($3::uuid IS NULL OR location_id = $3)
      LIMIT 1
    `,
    [inventoryId, user.tenant_id, user.type === "manager" ? user.branch_id : null]
  );

  if (!existing.rows[0]) {
    throw createError("Inventory item not found.", 404);
  }

  const currentStock = Number(existing.rows[0].stock);
  if (currentStock < quantityToMove) {
    throw createError("Insufficient stock to move to service.", 400);
  }

  // Compute the actual volume to add: e.g. 3 bottles × 500 ml = 1500 ml
  const perUnitVolume = Number(existing.rows[0].quantity) || 1;
  const volumeToAdd = quantityToMove * perUnitVolume;

  const result = await query<InventoryRow>(
    `
      UPDATE inventory
      SET
        stock = stock - $4,
        reorder_level = reorder_level - $4,
        service_quantity = COALESCE(service_quantity, 0) + $5
      WHERE id = $1 AND tenant_id = $2 AND ($3::uuid IS NULL OR location_id = $3)
      RETURNING
        id,
        COALESCE(name, item_name) AS name,
        COALESCE(cost_price, unit_cost, 0) AS cost_price,
        COALESCE(unit, 'pcs') AS unit,
        quantity,
        COALESCE(stock, reorder_level, 0) AS stock,
        COALESCE(service_quantity, 0) AS service_quantity,
        COALESCE(benefits, '') AS benefits,
        COALESCE(location_id, branch_id) AS location_id,
        created_at,
        (
          SELECT name
          FROM branches
          WHERE id = COALESCE(inventory.location_id, inventory.branch_id)
        ) AS location_name
    `,
    [inventoryId, user.tenant_id, user.type === "manager" ? user.branch_id : null, quantityToMove, volumeToAdd]
  );

  return mapInventoryRow(result.rows[0]);
}
