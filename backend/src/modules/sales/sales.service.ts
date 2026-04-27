import { query, withTransaction } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SaleServiceInput = {
  serviceId: string;
  staffId: string;
};

export type SaleProductInput = {
  productId: string;
  quantity: number;
};

export type SaleInput = {
  phoneNumber: string;
  clientName?: string; // For new clients
  locationId?: string; // Required for owners
  services: SaleServiceInput[];
  products: SaleProductInput[];
  discount: number;
  discountType: 'flat' | 'percent';
  paymentMethod: 'CASH' | 'UPI' | 'CARD';
  paidAmount: number;
};

export type SaleRecord = {
  id: string;
  clientName: string;
  clientPhone: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  locationName: string;
};

// ─── Service Functions ────────────────────────────────────────────────────────

export async function createSale(user: AuthUserPayload, input: SaleInput) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  // 1. Resolve Location
  let locationId = user.branch_id;
  if (user.type === "owner") {
    if (!input.locationId) throw createError("locationId is required for owners.", 400);
    locationId = input.locationId;
  }
  if (!locationId) throw createError("Location not configured.", 400);

  return withTransaction(async (db) => {
    // 2. Handle Client
    let clientId: string;
    const clientCheck = await db.query<{ id: string }>(
      `SELECT id FROM clients WHERE phone_number = $1 AND location_id = $2 AND tenant_id = $3 LIMIT 1`,
      [input.phoneNumber, locationId, user.tenant_id]
    );

    if (clientCheck.rows[0]) {
      clientId = clientCheck.rows[0].id;
    } else {
      if (!input.clientName) throw createError("Client name is required for new clients.", 400);
      const newClient = await db.query<{ id: string }>(
        `INSERT INTO clients (tenant_id, location_id, name, phone_number) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [user.tenant_id, locationId, input.clientName, input.phoneNumber]
      );
      clientId = newClient.rows[0].id;
    }

    // 3. Process Services & Fetch Prices
    let subtotal = 0;
    const servicesToInsert: { serviceId: string; staffId: string; price: number }[] = [];

    for (const s of input.services) {
      const sData = await db.query<{ price: string }>(
        `SELECT price FROM services WHERE id = $1 AND location_id = $2 LIMIT 1`,
        [s.serviceId, locationId]
      );
      if (!sData.rows[0]) throw createError(`Service ${s.serviceId} not found at this location.`, 404);
      
      const price = Number(sData.rows[0].price);
      subtotal += price;
      servicesToInsert.push({ serviceId: s.serviceId, staffId: s.staffId, price });

      // 3a. Deduct Service Inventory (Volumetric)
      const mapping = await db.query<{ product_id: string; quantity_used: string }>(
        `SELECT product_id, quantity_used FROM service_products WHERE service_id = $1`,
        [s.serviceId]
      );

      for (const map of mapping.rows) {
        const used = Number(map.quantity_used);
        const invCheck = await db.query<{ service_quantity: string }>(
          `SELECT service_quantity FROM inventory WHERE id = $1 FOR UPDATE`,
          [map.product_id]
        );
        if (!invCheck.rows[0]) continue;
        
        const currentStock = Number(invCheck.rows[0].service_quantity);
        if (currentStock < used) {
          throw createError(`Insufficient volumetric stock for product used in service.`, 400);
        }

        await db.query(
          `UPDATE inventory SET service_quantity = service_quantity - $1 WHERE id = $2`,
          [used, map.product_id]
        );
      }
    }

    // 4. Process Products & Fetch Prices
    const productsToInsert: { productId: string; quantity: number; price: number }[] = [];
    for (const p of input.products) {
      const pData = await db.query<{ cost_price: string; quantity: string }>(
        `SELECT cost_price, quantity FROM inventory WHERE id = $1 AND location_id = $2 FOR UPDATE`,
        [p.productId, locationId]
      );
      if (!pData.rows[0]) throw createError(`Product ${p.productId} not found.`, 404);
      
      const price = Number(pData.rows[0].cost_price); // Assuming selling price is same or we should have a retail_price column. Let's use cost_price as baseline or assume it's selling price in this context.
      const currentStock = Number(pData.rows[0].quantity);
      
      if (currentStock < p.quantity) {
        throw createError(`Insufficient retail stock for product.`, 400);
      }

      subtotal += (price * p.quantity);
      productsToInsert.push({ productId: p.productId, quantity: p.quantity, price });

      // Deduct Retail Stock
      await db.query(
        `UPDATE inventory SET quantity = quantity - $1 WHERE id = $2`,
        [p.quantity, p.productId]
      );
    }

    // 5. Calculate Final Amount
    let discountAmount = 0;
    if (input.discountType === 'percent') {
      discountAmount = (subtotal * input.discount) / 100;
    } else {
      discountAmount = input.discount;
    }
    const totalAmount = Math.max(0, subtotal - discountAmount);

    // 6. Create Sale Record
    const saleResult = await db.query<{ id: string }>(
      `INSERT INTO sales 
        (tenant_id, location_id, client_id, subtotal, discount, discount_type, total_amount, payment_method, paid_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [user.tenant_id, locationId, clientId, subtotal, input.discount, input.discountType, totalAmount, input.paymentMethod, input.paidAmount]
    );
    const saleId = saleResult.rows[0].id;

    // 7. Insert Sub-records
    for (const s of servicesToInsert) {
      await db.query(
        `INSERT INTO sale_services (sale_id, service_id, staff_id, price) VALUES ($1, $2, $3, $4)`,
        [saleId, s.serviceId, s.staffId, s.price]
      );
    }
    for (const p of productsToInsert) {
      await db.query(
        `INSERT INTO sale_products (sale_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)`,
        [saleId, p.productId, p.quantity, p.price]
      );
    }

    // 8. Update Client Insights
    await db.query(
      `UPDATE clients SET total_visits = total_visits + 1, last_visit_at = NOW() WHERE id = $1`,
      [clientId]
    );

    return { saleId, totalAmount };
  });
}

export async function listSales(user: AuthUserPayload, locationId?: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const values: unknown[] = [user.tenant_id];
  const conditions = ["s.tenant_id = $1"];

  if (user.type === "manager") {
    conditions.push(`s.location_id = $${values.length + 1}`);
    values.push(user.branch_id);
  } else if (user.type === "owner" && locationId && locationId !== "all") {
    conditions.push(`s.location_id = $${values.length + 1}`);
    values.push(locationId);
  }

  const result = await query<SaleRecord>(
    `SELECT s.id, c.name as "clientName", c.phone_number as "clientPhone", 
            s.total_amount as "totalAmount", s.payment_method as "paymentMethod", 
            s.created_at as "createdAt", b.name as "locationName"
     FROM sales s
     JOIN clients c ON c.id = s.client_id
     JOIN branches b ON b.id = s.location_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.created_at DESC`,
    values
  );

  return result.rows;
}

export async function getSaleDetail(user: AuthUserPayload, saleId: string) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const sale = await query<any>(
    `SELECT s.*, c.name as client_name, c.phone_number as client_phone
     FROM sales s
     JOIN clients c ON c.id = s.client_id
     WHERE s.id = $1 AND s.tenant_id = $2`,
    [saleId, user.tenant_id]
  );
  if (!sale.rows[0]) throw createError("Sale not found.", 404);

  const services = await query<any>(
    `SELECT ss.*, ser.name as service_name, st.name as staff_name
     FROM sale_services ss
     JOIN services ser ON ser.id = ss.service_id
     JOIN staff_members st ON st.id = ss.staff_id
     WHERE ss.sale_id = $1`,
    [saleId]
  );

  const products = await query<any>(
    `SELECT sp.*, inv.name as product_name
     FROM sale_products sp
     JOIN inventory inv ON inv.id = sp.product_id
     WHERE sp.sale_id = $1`,
    [saleId]
  );

  return {
    ...sale.rows[0],
    services: services.rows,
    products: products.rows
  };
}
