import { pool, query, withTransaction } from "../../database/pool";
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
    products: input.products.map(p => {
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
    [requestedLocationId, user.tenant_id]
  );

  if (!branchCheck.rows[0]) {
    throw createError("Selected location does not belong to your business.", 403);
  }

  return requestedLocationId;
}

export async function listServices(user: AuthUserPayload, locationId?: string) {
  if (!user.tenant_id) {
    throw createError("Tenant not found for current user.", 400);
  }

  const values: unknown[] = [user.tenant_id];
  const filters = ["s.tenant_id = $1"];

  if (user.type === "manager") {
    if (!user.branch_id) {
      throw createError("Manager location is not configured.", 400);
    }
    filters.push(`s.location_id = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (user.type === "owner" && locationId) {
    const resolvedLocationId = await getAccessibleLocationId(user, locationId);
    filters.push(`s.location_id = $${values.length + 1}`);
    values.push(resolvedLocationId);
  } else if (user.type !== "owner") {
    throw createError("Only owners and managers can access services.", 403);
  }

  const servicesResult = await query<ServiceRow>(
    `
      SELECT
        s.id, s.name, s.price, s.duration, s.benefits, s.location_id, s.created_at, s.updated_at
      FROM services s
      WHERE ${filters.join(" AND ")}
      ORDER BY s.created_at DESC
    `,
    values
  );

  const services = servicesResult.rows;
  if (services.length === 0) return [];

  const serviceIds = services.map(s => s.id);
  const productsResult = await query<ServiceProductRow>(
    `
      SELECT
        sp.id, sp.service_id, sp.product_id, sp.quantity_used, sp.unit,
        COALESCE(i.name, i.item_name) AS product_name,
        COALESCE(i.service_quantity, 0) AS product_stock
      FROM service_products sp
      INNER JOIN inventory i ON i.id = sp.product_id
      WHERE sp.service_id = ANY($1::uuid[])
    `,
    [serviceIds]
  );

  const productsByService = productsResult.rows.reduce((acc, p) => {
    if (!acc[p.service_id]) acc[p.service_id] = [];
    acc[p.service_id].push(p);
    return acc;
  }, {} as Record<string, ServiceProductRow[]>);

  return services.map(s => ({
    ...s,
    price: Number(s.price),
    products: (productsByService[s.id] || []).map(p => ({
      id: p.id,
      productId: p.product_id,
      quantityUsed: Number(p.quantity_used),
      unit: p.unit,
      productName: p.product_name || "Unknown Product",
      productStock: Number(p.product_stock ?? 0),
    })),
  }));
}

export async function createServiceItem(user: AuthUserPayload, input: ServiceInput) {
  const normalized = normalizeInput(input);
  const locationId = await getAccessibleLocationId(user, normalized.locationId);

  // Validate all products exist and belong to the same location
  const productIds = normalized.products.map(p => p.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw createError("Duplicate product entries are not allowed.", 400);
  }

  const inventoryCheck = await query<{ id: string }>(
    `
      SELECT id FROM inventory 
      WHERE id = ANY($1::uuid[]) 
        AND tenant_id = $2 
        AND location_id = $3
    `,
    [productIds, user.tenant_id, locationId]
  );

  if (inventoryCheck.rows.length !== productIds.length) {
    throw createError("One or more products are invalid or do not belong to the selected location.", 400);
  }

  return withTransaction(async (client) => {
    const serviceResult = await client.query<ServiceRow>(
      `
        INSERT INTO services (
          tenant_id, location_id, name, price, duration, benefits
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, price, duration, benefits, location_id, created_at, updated_at
      `,
      [user.tenant_id, locationId, normalized.name, normalized.price, normalized.duration, normalized.benefits]
    );

    const service = serviceResult.rows[0];

    const productsToInsert = normalized.products.map(p => [
      service.id,
      p.productId,
      p.quantityUsed,
      p.unit
    ]);

    for (const p of productsToInsert) {
      await client.query(
        `
          INSERT INTO service_products (service_id, product_id, quantity_used, unit)
          VALUES ($1, $2, $3, $4)
        `,
        p
      );
    }

    return { ...service, price: Number(service.price) };
  });
}

export async function executeServiceUsage(user: AuthUserPayload, serviceId: string) {
  if (!user.tenant_id) {
    throw createError("Tenant not found for current user.", 400);
  }

  return withTransaction(async (client) => {
    // 1. Fetch service to ensure it exists and we have access
    const serviceResult = await client.query<{ id: string, location_id: string }>(
      `
        SELECT id, location_id FROM services
        WHERE id = $1 AND tenant_id = $2 AND ($3::uuid IS NULL OR location_id = $3)
      `,
      [serviceId, user.tenant_id, user.type === "manager" ? user.branch_id : null]
    );

    if (serviceResult.rows.length === 0) {
      throw createError("Service not found.", 404);
    }

    const locationId = serviceResult.rows[0].location_id;

    // 2. Fetch required products for the service
    const productsResult = await client.query<{ product_id: string, quantity_used: string, name: string }>(
      `
        SELECT sp.product_id, sp.quantity_used, COALESCE(i.name, i.item_name) AS name
        FROM service_products sp
        JOIN inventory i ON i.id = sp.product_id
        WHERE sp.service_id = $1
      `,
      [serviceId]
    );

    if (productsResult.rows.length === 0) {
      return { success: true, message: "Service executed. No stock to deduct." };
    }

    // 3. For each product, check and deduct service_quantity
    for (const product of productsResult.rows) {
      const quantityUsed = Number(product.quantity_used);
      
      const updateResult = await client.query(
        `
          UPDATE inventory
          SET service_quantity = service_quantity - $1
          WHERE id = $2 AND location_id = $3 AND service_quantity >= $1
          RETURNING id
        `,
        [quantityUsed, product.product_id, locationId]
      );

      if (updateResult.rows.length === 0) {
        throw createError(`Insufficient service stock for product: ${product.name}`, 400);
      }
    }

    return { success: true, message: "Service executed and stock deducted successfully." };
  });
}

export async function deleteServiceItem(user: AuthUserPayload, serviceId: string) {
  const result = await query<{ id: string }>(
    `
      DELETE FROM services
      WHERE id = $1
        AND tenant_id = $2
        AND ($3::uuid IS NULL OR location_id = $3)
      RETURNING id
    `,
    [serviceId, user.tenant_id, user.type === "manager" ? user.branch_id : null]
  );

  if (!result.rows[0]) {
    throw createError("Service not found.", 404);
  }
}

export async function updateServiceItem(user: AuthUserPayload, serviceId: string, input: ServiceInput) {
  const normalized = normalizeInput(input);
  const locationId = await getAccessibleLocationId(user, normalized.locationId);

  const productIds = normalized.products.map(p => p.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw createError("Duplicate product entries are not allowed.", 400);
  }

  const inventoryCheck = await query<{ id: string }>(
    `
      SELECT id FROM inventory 
      WHERE id = ANY($1::uuid[]) 
        AND tenant_id = $2 
        AND location_id = $3
    `,
    [productIds, user.tenant_id, locationId]
  );

  if (inventoryCheck.rows.length !== productIds.length) {
    throw createError("One or more products are invalid or do not belong to the selected location.", 400);
  }

  return withTransaction(async (client) => {
    const serviceResult = await client.query<ServiceRow>(
      `
        UPDATE services
        SET name = $1, price = $2, duration = $3, benefits = $4, location_id = $5, updated_at = NOW()
        WHERE id = $6 AND tenant_id = $7 AND ($8::uuid IS NULL OR location_id = $8)
        RETURNING id, name, price, duration, benefits, location_id, created_at, updated_at
      `,
      [
        normalized.name, normalized.price, normalized.duration, normalized.benefits, locationId,
        serviceId, user.tenant_id, user.type === "manager" ? user.branch_id : null
      ]
    );

    if (serviceResult.rows.length === 0) {
      throw createError("Service not found.", 404);
    }

    const service = serviceResult.rows[0];

    await client.query(`DELETE FROM service_products WHERE service_id = $1`, [service.id]);

    const productsToInsert = normalized.products.map(p => [
      service.id, p.productId, p.quantityUsed, p.unit
    ]);

    for (const p of productsToInsert) {
      await client.query(
        `
          INSERT INTO service_products (service_id, product_id, quantity_used, unit)
          VALUES ($1, $2, $3, $4)
        `,
        p
      );
    }

    return { ...service, price: Number(service.price) };
  });
}
