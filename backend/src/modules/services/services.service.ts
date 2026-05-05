import { query, withTransaction } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

export type ServiceProductInput = {
  productId: string;
  quantityUsed: number;
  unit: string;
};

export type ServiceInput = {
  name: string;
  price: number;
  duration: number;
  benefits: string;
  locationId?: string;
  products: ServiceProductInput[];
};

export type ServiceProductRow = {
  id: string;
  service_id: string;
  product_id: string;
  quantity_used: string | number;
  unit: string;
  product_name?: string;
  product_stock?: number;
};

export type ServiceRow = {
  id: string;
  name: string;
  price: string | number;
  duration: number;
  benefits: string;
  location_id: string;
  created_at: string;
  updated_at: string;
  products?: ServiceProductRow[];
};

type SchemaColumnRow = {
  column_name: string;
};

function normalizeInput(input: ServiceInput) {
  if (!input.name?.trim()) {
    throw createError("Service name is required.", 400);
  }

  const price = Number(input.price);
  const duration = Number(input.duration);

  if (Number.isNaN(price) || price < 0) {
    throw createError("Price must be a non-negative number.", 400);
  }

  if (Number.isNaN(duration) || duration <= 0) {
    throw createError("Duration must be a positive number.", 400);
  }



  return {
    name: input.name.trim(),
    price,
    duration,
    benefits: String(input.benefits || "").trim(),
    locationId: input.locationId,
    products: input.products.map((p) => {
      const quantityUsed = Number(p.quantityUsed);
      if (Number.isNaN(quantityUsed) || quantityUsed <= 0) {
        throw createError("Quantity used must be a positive number.", 400);
      }
      return {
        productId: p.productId,
        quantityUsed,
        unit: p.unit || "pcs",
      };
    }),
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

function getServiceSql(columns: Set<string>, alias = "s") {
  const locationExpr = columns.has("location_id")
    ? (columns.has("branch_id") ? `COALESCE(${alias}.location_id, ${alias}.branch_id)` : `${alias}.location_id`)
    : `${alias}.branch_id`;
  const durationExpr = columns.has("duration")
    ? `COALESCE(${alias}.duration, 0)`
    : columns.has("duration_minutes")
      ? `COALESCE(${alias}.duration_minutes, 0)`
      : "0";
  const benefitsExpr = columns.has("benefits")
    ? `COALESCE(${alias}.benefits, '')`
    : columns.has("category")
      ? `COALESCE(${alias}.category, '')`
      : `''`;
  const updatedAtExpr = columns.has("updated_at") ? `${alias}.updated_at` : `${alias}.created_at`;

  return {
    locationExpr,
    durationExpr,
    benefitsExpr,
    updatedAtExpr,
  };
}

function getInventorySql(columns: Set<string>, alias = "i") {
  const nameExpr = columns.has("name") ? `${alias}.name` : `${alias}.item_name`;
  const locationExpr = columns.has("location_id")
    ? (columns.has("branch_id") ? `COALESCE(${alias}.location_id, ${alias}.branch_id)` : `${alias}.location_id`)
    : `${alias}.branch_id`;
  const serviceQuantityExpr = columns.has("service_quantity") ? `COALESCE(${alias}.service_quantity, 0)` : "0";

  return {
    nameExpr,
    locationExpr,
    serviceQuantityExpr,
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
    throw createError("Only owners and managers can access services.", 403);
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

async function getServiceById(serviceId: string, serviceColumns: Set<string>) {
  const sql = getServiceSql(serviceColumns, "services");
  const result = await query<ServiceRow>(
    `
      SELECT
        services.id,
        services.name,
        services.price,
        ${sql.durationExpr} AS duration,
        ${sql.benefitsExpr} AS benefits,
        ${sql.locationExpr} AS location_id,
        services.created_at,
        ${sql.updatedAtExpr} AS updated_at
      FROM services
      WHERE services.id = $1
      LIMIT 1
    `,
    [serviceId],
  );

  return result.rows[0] ?? null;
}

async function validateInventoryProducts(
  user: AuthUserPayload,
  locationId: string,
  productIds: string[],
  inventoryColumns: Set<string>,
) {
  const inventorySql = getInventorySql(inventoryColumns);
  const inventoryCheck = await query<{ id: string }>(
    `
      SELECT id
      FROM inventory
      WHERE id = ANY($1::uuid[])
        AND tenant_id = $2
        AND ${inventorySql.locationExpr} = $3
    `,
    [productIds, user.tenant_id, locationId],
  );

  if (inventoryCheck.rows.length !== productIds.length) {
    throw createError("One or more products are invalid or do not belong to the selected location.", 400);
  }
}

export async function listServices(user: AuthUserPayload, locationId?: string) {
  if (!user.tenant_id) {
    throw createError("Tenant not found for current user.", 400);
  }

  const [serviceColumns, inventoryColumns] = await Promise.all([
    getTableColumns("services"),
    getTableColumns("inventory"),
  ]);
  const serviceSql = getServiceSql(serviceColumns);
  const inventorySql = getInventorySql(inventoryColumns);
  const values: unknown[] = [user.tenant_id];
  const filters = ["s.tenant_id = $1"];

  if (user.type === "manager") {
    if (!user.branch_id) {
      throw createError("Manager location is not configured.", 400);
    }
    filters.push(`${serviceSql.locationExpr} = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (user.type === "owner" && locationId) {
    const resolvedLocationId = await getAccessibleLocationId(user, locationId);
    filters.push(`${serviceSql.locationExpr} = $${values.length + 1}`);
    values.push(resolvedLocationId);
  } else if (user.type !== "owner") {
    throw createError("Only owners and managers can access services.", 403);
  }

  const servicesResult = await query<ServiceRow>(
    `
      SELECT
        s.id,
        s.name,
        s.price,
        ${serviceSql.durationExpr} AS duration,
        ${serviceSql.benefitsExpr} AS benefits,
        ${serviceSql.locationExpr} AS location_id,
        s.created_at,
        ${serviceSql.updatedAtExpr} AS updated_at
      FROM services s
      WHERE ${filters.join(" AND ")}
      ORDER BY s.created_at DESC
    `,
    values,
  );

  const services = servicesResult.rows;
  if (services.length === 0) return [];

  const serviceIds = services.map((s) => s.id);
  const productsResult = await query<ServiceProductRow>(
    `
      SELECT
        sp.id,
        sp.service_id,
        sp.product_id,
        sp.quantity_used,
        sp.unit,
        ${inventorySql.nameExpr} AS product_name,
        ${inventorySql.serviceQuantityExpr} AS product_stock
      FROM service_products sp
      INNER JOIN inventory i ON i.id = sp.product_id
      WHERE sp.service_id = ANY($1::uuid[])
    `,
    [serviceIds],
  );

  const productsByService = productsResult.rows.reduce((acc, product) => {
    if (!acc[product.service_id]) acc[product.service_id] = [];
    acc[product.service_id].push(product);
    return acc;
  }, {} as Record<string, ServiceProductRow[]>);

  return services.map((service) => ({
    ...service,
    price: Number(service.price),
    products: (productsByService[service.id] || []).map((product) => ({
      id: product.id,
      productId: product.product_id,
      quantityUsed: Number(product.quantity_used),
      unit: product.unit,
      productName: product.product_name || "Unknown Product",
      productStock: Number(product.product_stock ?? 0),
    })),
  }));
}

export async function createServiceItem(user: AuthUserPayload, input: ServiceInput) {
  const normalized = normalizeInput(input);
  const locationId = await getAccessibleLocationId(user, normalized.locationId);
  const productIds = normalized.products.map((product) => product.productId);

  if (new Set(productIds).size !== productIds.length) {
    throw createError("Duplicate product entries are not allowed.", 400);
  }

  const [serviceColumns, inventoryColumns] = await Promise.all([
    getTableColumns("services"),
    getTableColumns("inventory"),
  ]);
  await validateInventoryProducts(user, locationId, productIds, inventoryColumns);

  return withTransaction(async (client) => {
    const insertColumns: string[] = [];
    const insertValues: unknown[] = [];

    const pushValue = (column: string, value: unknown) => {
      insertColumns.push(column);
      insertValues.push(value);
    };

    pushValue("tenant_id", user.tenant_id);
    if (serviceColumns.has("location_id")) pushValue("location_id", locationId);
    if (serviceColumns.has("branch_id")) pushValue("branch_id", locationId);
    if (serviceColumns.has("user_id")) pushValue("user_id", user.user_id);
    pushValue("name", normalized.name);
    pushValue("price", normalized.price);
    if (serviceColumns.has("duration")) pushValue("duration", normalized.duration);
    if (serviceColumns.has("duration_minutes")) pushValue("duration_minutes", normalized.duration);
    if (serviceColumns.has("benefits")) pushValue("benefits", normalized.benefits);
    if (serviceColumns.has("category")) pushValue("category", normalized.benefits || "General");

    const serviceResult = await client.query<{ id: string }>(
      `
        INSERT INTO services (
          ${insertColumns.join(", ")}
        )
        VALUES (${insertValues.map((_, index) => `$${index + 1}`).join(", ")})
        RETURNING id
      `,
      insertValues,
    );

    const serviceId = serviceResult.rows[0].id;

    for (const product of normalized.products) {
      await client.query(
        `
          INSERT INTO service_products (service_id, product_id, quantity_used, unit)
          VALUES ($1, $2, $3, $4)
        `,
        [serviceId, product.productId, product.quantityUsed, product.unit],
      );
    }

    const service = await getServiceById(serviceId, serviceColumns);
    if (!service) {
      throw createError("Service could not be loaded after creation.", 500);
    }

    return { ...service, price: Number(service.price), products: [] };
  });
}

export async function executeServiceUsage(user: AuthUserPayload, serviceId: string) {
  if (!user.tenant_id) {
    throw createError("Tenant not found for current user.", 400);
  }

  const [serviceColumns, inventoryColumns] = await Promise.all([
    getTableColumns("services"),
    getTableColumns("inventory"),
  ]);
  const serviceSql = getServiceSql(serviceColumns);
  const inventorySql = getInventorySql(inventoryColumns);

  return withTransaction(async (client) => {
    const serviceResult = await client.query<{ id: string; location_id: string }>(
      `
        SELECT id, ${serviceSql.locationExpr} AS location_id
        FROM services
        WHERE id = $1
          AND tenant_id = $2
          AND ($3::uuid IS NULL OR ${serviceSql.locationExpr} = $3)
      `,
      [serviceId, user.tenant_id, user.type === "manager" ? user.branch_id : null],
    );

    if (serviceResult.rows.length === 0) {
      throw createError("Service not found.", 404);
    }

    const locationId = serviceResult.rows[0].location_id;

    const productsResult = await client.query<{ product_id: string; quantity_used: string; name: string }>(
      `
        SELECT sp.product_id, sp.quantity_used, ${inventorySql.nameExpr} AS name
        FROM service_products sp
        JOIN inventory i ON i.id = sp.product_id
        WHERE sp.service_id = $1
      `,
      [serviceId],
    );

    if (productsResult.rows.length === 0) {
      return { success: true, message: "Service executed. No stock to deduct." };
    }

    for (const product of productsResult.rows) {
      const quantityUsed = Number(product.quantity_used);
      const setClause = inventoryColumns.has("service_quantity")
        ? "service_quantity = COALESCE(service_quantity, 0) - $1"
        : "quantity = COALESCE(quantity, 0) - $1";
      const stockExpr = inventoryColumns.has("service_quantity")
        ? "COALESCE(service_quantity, 0)"
        : "COALESCE(quantity, 0)";

      const updateResult = await client.query(
        `
          UPDATE inventory
          SET ${setClause}
          WHERE id = $2
            AND ${inventorySql.locationExpr} = $3
            AND ${stockExpr} >= $1
          RETURNING id
        `,
        [quantityUsed, product.product_id, locationId],
      );

      if (updateResult.rows.length === 0) {
        throw createError(`Insufficient service stock for product: ${product.name}`, 400);
      }
    }

    return { success: true, message: "Service executed and stock deducted successfully." };
  });
}

export async function deleteServiceItem(user: AuthUserPayload, serviceId: string) {
  const serviceColumns = await getTableColumns("services");
  const serviceSql = getServiceSql(serviceColumns);
  const result = await query<{ id: string }>(
    `
      DELETE FROM services
      WHERE id = $1
        AND tenant_id = $2
        AND ($3::uuid IS NULL OR ${serviceSql.locationExpr} = $3)
      RETURNING id
    `,
    [serviceId, user.tenant_id, user.type === "manager" ? user.branch_id : null],
  );

  if (!result.rows[0]) {
    throw createError("Service not found.", 404);
  }
}

export async function updateServiceItem(user: AuthUserPayload, serviceId: string, input: ServiceInput) {
  const normalized = normalizeInput(input);
  const locationId = await getAccessibleLocationId(user, normalized.locationId);
  const productIds = normalized.products.map((product) => product.productId);

  if (new Set(productIds).size !== productIds.length) {
    throw createError("Duplicate product entries are not allowed.", 400);
  }

  const [serviceColumns, inventoryColumns] = await Promise.all([
    getTableColumns("services"),
    getTableColumns("inventory"),
  ]);
  const serviceSql = getServiceSql(serviceColumns);
  await validateInventoryProducts(user, locationId, productIds, inventoryColumns);

  return withTransaction(async (client) => {
    const updates: string[] = [];
    const values: unknown[] = [];

    const pushUpdate = (column: string, value: unknown) => {
      updates.push(`${column} = $${values.length + 1}`);
      values.push(value);
    };

    pushUpdate("name", normalized.name);
    pushUpdate("price", normalized.price);
    if (serviceColumns.has("duration")) pushUpdate("duration", normalized.duration);
    if (serviceColumns.has("duration_minutes")) pushUpdate("duration_minutes", normalized.duration);
    if (serviceColumns.has("benefits")) pushUpdate("benefits", normalized.benefits);
    if (serviceColumns.has("category")) pushUpdate("category", normalized.benefits || "General");
    if (serviceColumns.has("location_id")) pushUpdate("location_id", locationId);
    if (serviceColumns.has("branch_id")) pushUpdate("branch_id", locationId);
    if (serviceColumns.has("updated_at")) updates.push("updated_at = NOW()");

    const whereStart = values.length + 1;
    values.push(serviceId, user.tenant_id, user.type === "manager" ? user.branch_id : null);

    const serviceResult = await client.query<{ id: string }>(
      `
        UPDATE services
        SET ${updates.join(", ")}
        WHERE id = $${whereStart}
          AND tenant_id = $${whereStart + 1}
          AND ($${whereStart + 2}::uuid IS NULL OR ${serviceSql.locationExpr} = $${whereStart + 2})
        RETURNING id
      `,
      values,
    );

    if (serviceResult.rows.length === 0) {
      throw createError("Service not found.", 404);
    }

    const updatedServiceId = serviceResult.rows[0].id;

    await client.query(`DELETE FROM service_products WHERE service_id = $1`, [updatedServiceId]);

    for (const product of normalized.products) {
      await client.query(
        `
          INSERT INTO service_products (service_id, product_id, quantity_used, unit)
          VALUES ($1, $2, $3, $4)
        `,
        [updatedServiceId, product.productId, product.quantityUsed, product.unit],
      );
    }

    const service = await getServiceById(updatedServiceId, serviceColumns);
    if (!service) {
      throw createError("Service could not be loaded after update.", 500);
    }

    return { ...service, price: Number(service.price), products: [] };
  });
}
