import { query, withTransaction } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

type SchemaColumnRow = {
  column_name: string;
};

type SchemaNullabilityRow = {
  is_nullable: "YES" | "NO";
};

let salesWorkflowSchemaReady: Promise<void> | null = null;

export type SaleServiceInput = {
  serviceId?: string;
  staffId?: string | null;
  comboServiceId?: string;
  services?: Array<{
    serviceId: string;
    staffId?: string | null;
  }>;
};

export type SaleProductInput = {
  productId: string;
  quantity: number;
};

export type SaleDraftInput = {
  phoneNumber: string;
  clientName?: string;
  locationId?: string;
  services: SaleServiceInput[];
  products: SaleProductInput[];
  discount: number;
  discountType: "flat" | "percent";
};

export type SaleCheckoutInput = SaleDraftInput & {
  paymentMethod: "CASH" | "UPI" | "CARD";
  paidAmount: number;
};

export type SaleFilters = {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type SaleRecord = {
  id: string;
  clientName: string;
  clientPhone: string;
  totalAmount: number;
  paymentMethod: string | null;
  createdAt: string;
  locationName: string;
  status: "DRAFT" | "COMPLETED";
  updatedAt: string | null;
};

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

async function isColumnNullable(tableName: string, columnName: string) {
  const result = await query<SchemaNullabilityRow>(
    `
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return result.rows[0]?.is_nullable === "YES";
}

async function ensureSalesWorkflowWritableSchema() {
  if (!salesWorkflowSchemaReady) {
    salesWorkflowSchemaReady = (async () => {
      const [salesColumns, saleServiceColumns, paymentMethodNullable, staffNullable] = await Promise.all([
        getTableColumns("sales"),
        getTableColumns("sale_services"),
        isColumnNullable("sales", "payment_method"),
        isColumnNullable("sale_services", "staff_id"),
      ]);

      if (!salesColumns.has("status") || !salesColumns.has("updated_at")) {
        await query(`
          ALTER TABLE "sales"
          ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'COMPLETED',
          ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        `);

        await query(`
          UPDATE "sales"
          SET "status" = COALESCE(NULLIF("status", ''), 'COMPLETED'),
              "updated_at" = COALESCE("updated_at", "created_at", NOW())
        `);

        await query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'sales_status_check'
            ) THEN
              ALTER TABLE "sales"
              ADD CONSTRAINT "sales_status_check"
              CHECK ("status" IN ('DRAFT', 'COMPLETED'));
            END IF;
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END
          $$;
        `);
      }

      if (salesColumns.has("payment_method") && !paymentMethodNullable) {
        await query(`
          ALTER TABLE "sales"
          ALTER COLUMN "payment_method" DROP NOT NULL
        `);
      }

      if (saleServiceColumns.has("staff_id") && !staffNullable) {
        await query(`
          ALTER TABLE "sale_services"
          ALTER COLUMN "staff_id" DROP NOT NULL
        `);
      }

      if (!saleServiceColumns.has("combo_service_id") || !saleServiceColumns.has("combo_service_name") || !saleServiceColumns.has("combo_total_price")) {
        await query(`
          ALTER TABLE "sale_services"
          ADD COLUMN IF NOT EXISTS "combo_service_id" uuid,
          ADD COLUMN IF NOT EXISTS "combo_service_name" text,
          ADD COLUMN IF NOT EXISTS "combo_total_price" numeric(12,2)
        `);
      }
    })().catch((error) => {
      salesWorkflowSchemaReady = null;
      throw error;
    });
  }

  await salesWorkflowSchemaReady;
}

function ensurePosAccess(user: AuthUserPayload) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const canAccessPOS = user.type === "manager" || (user.type === "owner" && !user.has_manager);
  if (!canAccessPOS) {
    throw createError("POS access denied. An owner with an assigned manager cannot create sales.", 403);
  }
}

function normalizeLocationId(user: AuthUserPayload, requestedLocationId?: string) {
  let locationId = user.branch_id;

  if (user.type === "owner") {
    if (!requestedLocationId) throw createError("locationId is required for owners.", 400);
    locationId = requestedLocationId;
  }

  if (!locationId) throw createError("Location not configured.", 400);
  return locationId;
}

function normalizeDraftInput(input: SaleDraftInput) {
  const phoneNumber = String(input.phoneNumber || "").replace(/\D/g, "").trim();
  const clientName = String(input.clientName || "").trim();
  const services = (Array.isArray(input.services) ? input.services : []).map((item) => {
    const rawItem = item as SaleServiceInput & {
      kind?: string;
      combo_service_id?: string;
      combo_service_name?: string;
      service_id?: string;
      services?: Array<{
        serviceId?: string;
        service_id?: string;
        staffId?: string | null;
        staff_id?: string | null;
      }>;
    };

    const comboServiceId = String(rawItem.comboServiceId || rawItem.combo_service_id || "").trim();
    const nestedServices = Array.isArray(rawItem.services) ? rawItem.services : [];

    if (rawItem.kind === "combo" || comboServiceId || nestedServices.length > 0) {
      return {
        comboServiceId,
        services: nestedServices.map((service) => {
          const rawService = service as {
            serviceId?: string;
            service_id?: string;
            staffId?: string | null;
            staff_id?: string | null;
          };

          return {
            serviceId: String(rawService.serviceId || rawService.service_id || "").trim(),
            staffId: rawService.staffId ?? rawService.staff_id ?? null,
          };
        }),
      };
    }

    return {
      serviceId: String(rawItem.serviceId || rawItem.service_id || "").trim(),
      staffId: rawItem.staffId ?? null,
    };
  });
  const products = Array.isArray(input.products) ? input.products : [];
  const discount = Number(input.discount || 0);
  const discountType = input.discountType === "percent" ? "percent" : "flat";

  if (!phoneNumber || phoneNumber.length < 10) {
    throw createError("Valid client contact number is required.", 400);
  }

  if (!clientName && !phoneNumber) {
    throw createError("Client details are required.", 400);
  }

  if (services.length === 0 && products.length === 0) {
    throw createError("Add at least one service or inventory item.", 400);
  }

  if (discount < 0) {
    throw createError("Discount cannot be negative.", 400);
  }

  return {
    phoneNumber,
    clientName,
    locationId: input.locationId,
    services,
    products,
    discount,
    discountType,
  };
}

async function resolveClientId(
  db: { query: typeof query },
  user: AuthUserPayload,
  locationId: string,
  phoneNumber: string,
  clientName?: string,
) {
  const clientCheck = await db.query<{ id: string; name: string }>(
    `SELECT id, name
     FROM clients
     WHERE phone_number = $1 AND location_id = $2 AND tenant_id = $3
     LIMIT 1`,
    [phoneNumber, locationId, user.tenant_id],
  );

  if (clientCheck.rows[0]) {
    if (clientName && clientName !== clientCheck.rows[0].name) {
      await db.query(
        `UPDATE clients
         SET name = $1
         WHERE id = $2`,
        [clientName, clientCheck.rows[0].id],
      );
    }

    return clientCheck.rows[0].id;
  }

  if (!clientName) {
    throw createError("Client name is required for new clients.", 400);
  }

  const newClient = await db.query<{ id: string }>(
    `INSERT INTO clients (tenant_id, location_id, name, phone_number)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [user.tenant_id, locationId, clientName, phoneNumber],
  );

  return newClient.rows[0].id;
}

async function resolveDraftOwnership(
  db: { query: typeof query },
  user: AuthUserPayload,
  saleId: string,
  locationId: string,
) {
  const result = await db.query<{ id: string; status: "DRAFT" | "COMPLETED"; location_id: string }>(
    `SELECT id, status, location_id
     FROM sales
     WHERE id = $1 AND tenant_id = $2`,
    [saleId, user.tenant_id],
  );

  const draft = result.rows[0];
  if (!draft) throw createError("Sale draft not found.", 404);
  if (draft.status !== "DRAFT") throw createError("Only draft sales can be modified.", 400);
  if (user.type === "manager" && draft.location_id !== user.branch_id) {
    throw createError("Cross-location access not allowed.", 403);
  }
  if (draft.location_id !== locationId) {
    throw createError("Draft location cannot be changed.", 400);
  }
}

async function buildPricedDraft(
  db: { query: typeof query },
  locationId: string,
  input: ReturnType<typeof normalizeDraftInput>,
) {
  let subtotal = 0;
  const servicesToInsert: Array<{
    serviceId: string;
    staffId: string | null;
    price: number;
    comboServiceId?: string | null;
    comboServiceName?: string | null;
    comboTotalPrice?: number | null;
  }> = [];
  const productsToInsert: Array<{ productId: string; quantity: number; price: number }> = [];

  for (const item of input.services) {
    if (item.comboServiceId) {
      const comboServiceId = String(item.comboServiceId || "").trim();
      const comboMemberLines = Array.isArray(item.services) ? item.services : [];

      if (!comboServiceId || comboMemberLines.length === 0) {
        throw createError("Invalid combo service selected.", 400);
      }

      const comboResult = await db.query<{ id: string; name: string; price: string }>(
        `SELECT id, name, price
         FROM combo_services
         WHERE id = $1 AND location_id = $2
         LIMIT 1`,
        [comboServiceId, locationId],
      );

      if (!comboResult.rows[0]) {
        throw createError("Selected combo service not found for this location.", 404);
      }

      const comboServicesResult = await db.query<{ service_id: string }>(
        `SELECT service_id
         FROM combo_service_items
         WHERE combo_service_id = $1`,
        [comboServiceId],
      );

      const expectedServiceIds = comboServicesResult.rows.map((row) => row.service_id).sort();
      const selectedServiceIds = comboMemberLines.map((line) => String(line.serviceId || "").trim()).filter(Boolean).sort();

      if (expectedServiceIds.length === 0 || expectedServiceIds.length !== selectedServiceIds.length) {
        throw createError("Selected combo service is incomplete.", 400);
      }

      for (let index = 0; index < expectedServiceIds.length; index += 1) {
        if (expectedServiceIds[index] !== selectedServiceIds[index]) {
          throw createError("Selected combo service items do not match the saved combo.", 400);
        }
      }

      const comboTotalPrice = Number(comboResult.rows[0].price);
      subtotal += comboTotalPrice;
      const distributedBasePrice = Math.floor((comboTotalPrice / comboMemberLines.length) * 100) / 100;
      let allocatedPrice = 0;

      comboMemberLines.forEach((line, index) => {
        const serviceId = String(line.serviceId || "").trim();
        const isLastItem = index === comboMemberLines.length - 1;
        const price = isLastItem
          ? Number((comboTotalPrice - allocatedPrice).toFixed(2))
          : Number(distributedBasePrice.toFixed(2));

        allocatedPrice += price;
        servicesToInsert.push({
          serviceId,
          staffId: line.staffId ? String(line.staffId).trim() : null,
          price,
          comboServiceId,
          comboServiceName: comboResult.rows[0].name,
          comboTotalPrice,
        });
      });

      continue;
    }

    const serviceId = String(item.serviceId || "").trim();
    if (!serviceId) throw createError("Invalid service selected.", 400);

    const serviceResult = await db.query<{ price: string }>(
      `SELECT price
       FROM services
       WHERE id = $1 AND location_id = $2
       LIMIT 1`,
      [serviceId, locationId],
    );

    if (!serviceResult.rows[0]) throw createError("Selected service not found for this location.", 404);

    const price = Number(serviceResult.rows[0].price);
    subtotal += price;
    servicesToInsert.push({
      serviceId,
      staffId: item.staffId ? String(item.staffId).trim() : null,
      price,
      comboServiceId: null,
      comboServiceName: null,
      comboTotalPrice: null,
    });
  }

  for (const item of input.products) {
    const productId = String(item.productId || "").trim();
    const quantity = Number(item.quantity || 0);

    if (!productId || quantity <= 0) throw createError("Invalid inventory item selected.", 400);

    const productResult = await db.query<{ cost_price: string }>(
      `SELECT cost_price
       FROM inventory
       WHERE id = $1 AND location_id = $2
       LIMIT 1`,
      [productId, locationId],
    );

    if (!productResult.rows[0]) throw createError("Selected inventory item not found for this location.", 404);

    const price = Number(productResult.rows[0].cost_price);
    subtotal += price * quantity;
    productsToInsert.push({ productId, quantity, price });
  }

  const discountAmount =
    input.discountType === "percent" ? (subtotal * input.discount) / 100 : input.discount;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  return {
    subtotal,
    discountAmount,
    totalAmount,
    servicesToInsert,
    productsToInsert,
  };
}

async function replaceSaleItems(
  db: { query: typeof query },
  saleId: string,
  servicesToInsert: Array<{
    serviceId: string;
    staffId: string | null;
    price: number;
    comboServiceId?: string | null;
    comboServiceName?: string | null;
    comboTotalPrice?: number | null;
  }>,
  productsToInsert: Array<{ productId: string; quantity: number; price: number }>,
) {
  await db.query(`DELETE FROM sale_services WHERE sale_id = $1`, [saleId]);
  await db.query(`DELETE FROM sale_products WHERE sale_id = $1`, [saleId]);

  for (const service of servicesToInsert) {
    await db.query(
      `INSERT INTO sale_services (sale_id, service_id, staff_id, price, combo_service_id, combo_service_name, combo_total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [saleId, service.serviceId, service.staffId, service.price, service.comboServiceId || null, service.comboServiceName || null, service.comboTotalPrice ?? null],
    );
  }

  for (const product of productsToInsert) {
    await db.query(
      `INSERT INTO sale_products (sale_id, product_id, quantity, price)
       VALUES ($1, $2, $3, $4)`,
      [saleId, product.productId, product.quantity, product.price],
    );
  }
}

async function applyInventoryDeductions(
  db: { query: typeof query },
  locationId: string,
  servicesToInsert: Array<{
    serviceId: string;
    staffId: string | null;
    price: number;
    comboServiceId?: string | null;
    comboServiceName?: string | null;
    comboTotalPrice?: number | null;
  }>,
  productsToInsert: Array<{ productId: string; quantity: number; price: number }>,
) {
  for (const service of servicesToInsert) {
    if (!service.staffId) {
      throw createError("Assign staff for every service before checkout.", 400);
    }

    const mapping = await db.query<{ product_id: string; quantity_used: string }>(
      `SELECT product_id, quantity_used
       FROM service_products
       WHERE service_id = $1`,
      [service.serviceId],
    );

    for (const product of mapping.rows) {
      const used = Number(product.quantity_used);
      const stockCheck = await db.query<{ service_quantity: string }>(
        `SELECT service_quantity
         FROM inventory
         WHERE id = $1 AND location_id = $2
         FOR UPDATE`,
        [product.product_id, locationId],
      );

      if (!stockCheck.rows[0]) continue;
      if (Number(stockCheck.rows[0].service_quantity) < used) {
        throw createError("Insufficient service stock for one of the selected services.", 400);
      }

      await db.query(
        `UPDATE inventory
         SET service_quantity = service_quantity - $1
         WHERE id = $2`,
        [used, product.product_id],
      );
    }
  }

  for (const product of productsToInsert) {
    const stockResult = await db.query<{ quantity: string }>(
      `SELECT quantity
       FROM inventory
       WHERE id = $1 AND location_id = $2
       FOR UPDATE`,
      [product.productId, locationId],
    );

    if (!stockResult.rows[0]) {
      throw createError("Selected inventory item not found.", 404);
    }

    if (Number(stockResult.rows[0].quantity) < product.quantity) {
      throw createError("Insufficient retail stock for one of the selected inventory items.", 400);
    }

    await db.query(
      `UPDATE inventory
       SET quantity = quantity - $1
       WHERE id = $2`,
      [product.quantity, product.productId],
    );
  }
}

export async function createSaleDraft(user: AuthUserPayload, rawInput: SaleDraftInput) {
  ensurePosAccess(user);
  await ensureSalesWorkflowWritableSchema();
  const input = normalizeDraftInput(rawInput);
  const locationId = normalizeLocationId(user, input.locationId);

  return withTransaction(async (db) => {
    const clientId = await resolveClientId(db, user, locationId, input.phoneNumber, input.clientName);
    const pricedDraft = await buildPricedDraft(db, locationId, input);

    const saleResult = await db.query<{ id: string }>(
      `INSERT INTO sales
        (
          tenant_id,
          branch_id,
          location_id,
          client_id,
          user_id,
          amount,
          subtotal,
          discount,
          discount_type,
          total_amount,
          payment_method,
          paid_amount,
          sale_date,
          status,
          updated_at
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, 0, NOW(), 'DRAFT', NOW())
       RETURNING id`,
      [
        user.tenant_id,
        locationId,
        locationId,
        clientId,
        user.user_id,
        pricedDraft.totalAmount,
        pricedDraft.subtotal,
        input.discount,
        input.discountType,
        pricedDraft.totalAmount,
      ],
    );

    const saleId = saleResult.rows[0].id;
    await replaceSaleItems(db, saleId, pricedDraft.servicesToInsert, pricedDraft.productsToInsert);

    return {
      saleId,
      status: "DRAFT" as const,
      totalAmount: pricedDraft.totalAmount,
    };
  });
}

export async function updateSaleDraft(user: AuthUserPayload, saleId: string, rawInput: SaleDraftInput) {
  ensurePosAccess(user);
  await ensureSalesWorkflowWritableSchema();
  const input = normalizeDraftInput(rawInput);
  const locationId = normalizeLocationId(user, input.locationId);

  return withTransaction(async (db) => {
    await resolveDraftOwnership(db, user, saleId, locationId);

    const clientId = await resolveClientId(db, user, locationId, input.phoneNumber, input.clientName);
    const pricedDraft = await buildPricedDraft(db, locationId, input);

    await db.query(
      `UPDATE sales
       SET client_id = $1,
           amount = $2,
           subtotal = $3,
           discount = $4,
           discount_type = $5,
           total_amount = $6,
           payment_method = NULL,
           paid_amount = 0,
           updated_at = NOW()
       WHERE id = $7`,
      [
        clientId,
        pricedDraft.totalAmount,
        pricedDraft.subtotal,
        input.discount,
        input.discountType,
        pricedDraft.totalAmount,
        saleId,
      ],
    );

    await replaceSaleItems(db, saleId, pricedDraft.servicesToInsert, pricedDraft.productsToInsert);

    return {
      saleId,
      status: "DRAFT" as const,
      totalAmount: pricedDraft.totalAmount,
    };
  });
}

export async function finalizeSaleDraft(user: AuthUserPayload, saleId: string, rawInput: SaleCheckoutInput) {
  ensurePosAccess(user);
  await ensureSalesWorkflowWritableSchema();
  const input = normalizeDraftInput(rawInput);
  const locationId = normalizeLocationId(user, input.locationId);
  const paymentMethod = rawInput.paymentMethod;
  const paidAmount = Number(rawInput.paidAmount || 0);

  if (!["CASH", "UPI", "CARD"].includes(paymentMethod)) {
    throw createError("Valid payment method is required.", 400);
  }

  return withTransaction(async (db) => {
    await resolveDraftOwnership(db, user, saleId, locationId);

    const clientId = await resolveClientId(db, user, locationId, input.phoneNumber, input.clientName);
    const pricedDraft = await buildPricedDraft(db, locationId, input);

    if (paidAmount < 0) {
      throw createError("Paid amount cannot be negative.", 400);
    }

    await applyInventoryDeductions(db, locationId, pricedDraft.servicesToInsert, pricedDraft.productsToInsert);

    await db.query(
      `UPDATE sales
       SET client_id = $1,
           amount = $2,
           subtotal = $3,
           discount = $4,
           discount_type = $5,
           total_amount = $6,
           payment_method = $7,
           paid_amount = $8,
           status = 'COMPLETED',
           sale_date = NOW(),
           updated_at = NOW()
       WHERE id = $9`,
      [
        clientId,
        pricedDraft.totalAmount,
        pricedDraft.subtotal,
        input.discount,
        input.discountType,
        pricedDraft.totalAmount,
        paymentMethod,
        paidAmount || pricedDraft.totalAmount,
        saleId,
      ],
    );

    await replaceSaleItems(db, saleId, pricedDraft.servicesToInsert, pricedDraft.productsToInsert);

    await db.query(
      `UPDATE clients
       SET total_visits = total_visits + 1,
           last_visit_at = NOW()
       WHERE id = $1`,
      [clientId],
    );

    return {
      saleId,
      status: "COMPLETED" as const,
      totalAmount: pricedDraft.totalAmount,
    };
  });
}

export async function listSaleDrafts(user: AuthUserPayload, locationId?: string) {
  ensurePosAccess(user);
  const salesColumns = await getTableColumns("sales");
  const statusExpr = salesColumns.has("status") ? `COALESCE(s.status, 'COMPLETED')` : `'COMPLETED'`;
  const updatedAtExpr = salesColumns.has("updated_at") ? `s.updated_at` : `s.created_at`;
  const locationExpr = salesColumns.has("location_id") ? `COALESCE(s.location_id, s.branch_id)` : `s.branch_id`;

  const values: unknown[] = [user.tenant_id];
  const conditions = [`s.tenant_id = $1`, `${statusExpr} = 'DRAFT'`];

  if (user.type === "manager") {
    conditions.push(`${locationExpr} = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (locationId && locationId !== "all") {
    conditions.push(`${locationExpr} = $${values.length + 1}`);
    values.push(locationId);
  }

  const result = await query<SaleRecord>(
    `SELECT
        s.id,
        c.name AS "clientName",
        c.phone_number AS "clientPhone",
        s.total_amount AS "totalAmount",
        s.payment_method AS "paymentMethod",
        s.created_at AS "createdAt",
        b.name AS "locationName",
        ${statusExpr} AS status,
        ${updatedAtExpr} AS "updatedAt"
     FROM sales s
     JOIN clients c ON c.id = s.client_id
     JOIN branches b ON b.id = ${locationExpr}
     WHERE ${conditions.join(" AND ")}
     ORDER BY COALESCE(${updatedAtExpr}, s.created_at) DESC`,
    values,
  );

  return result.rows;
}

export async function listSales(user: AuthUserPayload, locationId?: string, filters: SaleFilters = {}) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);
  const salesColumns = await getTableColumns("sales");
  const statusExpr = salesColumns.has("status") ? `COALESCE(s.status, 'COMPLETED')` : `'COMPLETED'`;
  const updatedAtExpr = salesColumns.has("updated_at") ? `s.updated_at` : `s.created_at`;
  const locationExpr = salesColumns.has("location_id") ? `COALESCE(s.location_id, s.branch_id)` : `s.branch_id`;

  const values: unknown[] = [user.tenant_id];
  const conditions = [`s.tenant_id = $1`, `${statusExpr} = 'COMPLETED'`];

  if (user.type === "manager") {
    conditions.push(`${locationExpr} = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (locationId && locationId !== "all") {
    conditions.push(`${locationExpr} = $${values.length + 1}`);
    values.push(locationId);
  }

  if (filters.startDate) {
    conditions.push(`DATE(COALESCE(s.sale_date, s.created_at)) >= $${values.length + 1}::date`);
    values.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`DATE(COALESCE(s.sale_date, s.created_at)) <= $${values.length + 1}::date`);
    values.push(filters.endDate);
  }

  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    conditions.push(`s.payment_method = $${values.length + 1}`);
    values.push(filters.paymentMethod);
  }

  if (filters.search) {
    conditions.push(`(c.name ILIKE $${values.length + 1} OR c.phone_number ILIKE $${values.length + 1})`);
    values.push(`%${filters.search.trim()}%`);
  }

  const sortByMap: Record<string, string> = {
    createdAt: `COALESCE(s.sale_date, s.created_at)`,
    clientName: `c.name`,
    totalAmount: `s.total_amount`,
  };
  const sortBy = sortByMap[filters.sortBy || "createdAt"] || sortByMap.createdAt;
  const sortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";

  const result = await query<SaleRecord>(
    `SELECT s.id,
            c.name as "clientName",
            c.phone_number as "clientPhone",
            s.total_amount as "totalAmount",
            s.payment_method as "paymentMethod",
            COALESCE(s.sale_date, s.created_at) as "createdAt",
            b.name as "locationName",
            ${statusExpr} as status,
            ${updatedAtExpr} as "updatedAt"
     FROM sales s
     JOIN clients c ON c.id = s.client_id
     JOIN branches b ON b.id = ${locationExpr}
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${sortBy} ${sortOrder}`,
    values,
  );

  return result.rows;
}

export async function getSaleDetail(user: AuthUserPayload, saleId: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);
  const saleColumns = await getTableColumns("sales");
  const saleStatusExpr = saleColumns.has("status") ? `COALESCE(s.status, 'COMPLETED')` : `'COMPLETED'`;
  const saleUpdatedAtExpr = saleColumns.has("updated_at") ? `s.updated_at` : `s.created_at`;
  const saleLocationExpr = saleColumns.has("location_id") ? `COALESCE(s.location_id, s.branch_id)` : `s.branch_id`;
  const salePaymentExpr = saleColumns.has("payment_method") ? `s.payment_method` : `NULL`;
  const saleSubtotalExpr = saleColumns.has("subtotal") ? `s.subtotal` : `COALESCE(s.amount, s.total_amount, 0)`;
  const saleDiscountExpr = saleColumns.has("discount") ? `s.discount` : `0`;
  const saleDiscountTypeExpr = saleColumns.has("discount_type") ? `s.discount_type` : `'flat'`;
  const salePaidAmountExpr = saleColumns.has("paid_amount") ? `s.paid_amount` : `COALESCE(s.amount, s.total_amount, 0)`;

  const sale = await query<any>(
    `SELECT s.id,
            c.name as "clientName",
            c.name as client_name,
            c.phone_number as "clientPhone",
            c.phone_number as client_phone,
            s.total_amount as "totalAmount",
            ${salePaymentExpr} as "paymentMethod",
            COALESCE(s.sale_date, s.created_at) as "createdAt",
            b.name as "locationName",
            ${saleStatusExpr} as status,
            ${saleUpdatedAtExpr} as "updatedAt",
            ${saleSubtotalExpr} as subtotal,
            ${saleDiscountExpr} as discount,
            ${saleDiscountTypeExpr} as "discountType",
            ${saleDiscountTypeExpr} as discount_type,
            ${salePaidAmountExpr} as "paidAmount",
            ${salePaidAmountExpr} as paid_amount,
            ${saleLocationExpr} as "locationId",
            ${saleLocationExpr} as location_id
     FROM sales s
     JOIN clients c ON c.id = s.client_id
     JOIN branches b ON b.id = ${saleLocationExpr}
     WHERE s.id = $1 AND s.tenant_id = $2`,
    [saleId, user.tenant_id],
  );
  if (!sale.rows[0]) throw createError("Sale not found.", 404);

  if (user.type === "manager" && sale.rows[0].location_id !== user.branch_id) {
    throw createError("Cross-location access not allowed.", 403);
  }

  const services = await query<any>(
    `SELECT ss.*,
            ser.name as service_name,
            st.name as staff_name
     FROM sale_services ss
     JOIN services ser ON ser.id = ss.service_id
     LEFT JOIN staff_members st ON st.id = ss.staff_id
     WHERE ss.sale_id = $1`,
    [saleId],
  );

  const products = await query<any>(
    `SELECT sp.*,
            inv.name as product_name
     FROM sale_products sp
     JOIN inventory inv ON inv.id = sp.product_id
     WHERE sp.sale_id = $1`,
    [saleId],
  );

  return {
    ...sale.rows[0],
    services: services.rows,
    products: products.rows,
  };
}
