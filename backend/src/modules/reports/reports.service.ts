import { query } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

export type ReportFilters = {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
  interval?: string;
};

type SchemaColumnRow = {
  column_name: string;
};

type ScopeOptions = {
  alias: string;
  locationExpr?: string;
  dateExpr?: string;
  paymentExpr?: string;
};

function normalizeLocationId(locationId?: string | null) {
  const normalized = locationId?.trim();
  if (!normalized || normalized.toLowerCase() === "all") {
    return null;
  }
  return normalized;
}

function remapCombinedScope(whereClause: string, sharedParamCount: number, scopedParamOffset: number) {
  return whereClause.replace(/\$(\d+)/g, (_, num) => {
    const parameterIndex = Number(num);
    if (parameterIndex <= sharedParamCount) {
      return `$${parameterIndex}`;
    }
    return `$${parameterIndex + scopedParamOffset}`;
  });
}

function buildEntityScope(
  user: AuthUserPayload,
  filters: ReportFilters,
  alias: string,
  locationExpr?: string,
) {
  const values: Array<string | number | null> = [user.tenant_id];
  const conditions = [`${alias}.tenant_id = $1`];
  const selectedLocationId = user.type === "manager" ? user.branch_id : normalizeLocationId(filters.locationId);

  if (selectedLocationId && locationExpr) {
    conditions.push(`${locationExpr} = $${values.length + 1}`);
    values.push(selectedLocationId);
  }

  return {
    values,
    whereClause: conditions.join(" AND "),
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

function buildScopedFilters(
  user: AuthUserPayload,
  filters: ReportFilters,
  options: ScopeOptions,
) {
  const { alias, locationExpr, dateExpr, paymentExpr } = options;
  const values: Array<string | number | null> = [user.tenant_id];
  const conditions = [`${alias}.tenant_id = $1`];

  const selectedLocationId = user.type === "manager" ? user.branch_id : normalizeLocationId(filters.locationId);

  if (selectedLocationId && locationExpr) {
    conditions.push(`${locationExpr} = $${values.length + 1}`);
    values.push(selectedLocationId);
  }

  if (dateExpr && filters.startDate) {
    conditions.push(`DATE(${dateExpr}) >= $${values.length + 1}::date`);
    values.push(filters.startDate);
  }

  if (dateExpr && filters.endDate) {
    conditions.push(`DATE(${dateExpr}) <= $${values.length + 1}::date`);
    values.push(filters.endDate);
  }

  if (paymentExpr && filters.paymentMethod && filters.paymentMethod !== "all") {
    conditions.push(`${paymentExpr} = $${values.length + 1}`);
    values.push(filters.paymentMethod.toUpperCase());
  }

  return {
    values,
    whereClause: conditions.join(" AND "),
  };
}

export async function getSalesReport(user: AuthUserPayload, filters: ReportFilters) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const salesColumns = await getTableColumns("sales");
  const salesLocationExpr = salesColumns.has("location_id")
    ? (salesColumns.has("branch_id") ? "COALESCE(s.location_id, s.branch_id)" : "s.location_id")
    : "s.branch_id";
  const salesDateExpr = salesColumns.has("created_at")
    ? (salesColumns.has("sale_date") ? "COALESCE(s.created_at, s.sale_date)" : "s.created_at")
    : "s.sale_date";
  const salesAmountExpr = salesColumns.has("total_amount")
    ? (salesColumns.has("amount") ? "COALESCE(s.total_amount, s.amount, 0)" : "COALESCE(s.total_amount, 0)")
    : "COALESCE(s.amount, 0)";
  const salesDiscountExpr = salesColumns.has("discount") ? "COALESCE(s.discount, 0)" : "0";
  const salesStatusCondition = salesColumns.has("status") ? ` AND COALESCE(s.status, 'COMPLETED') = 'COMPLETED'` : "";

  const { whereClause, values } = buildScopedFilters(user, filters, {
    alias: "s",
    locationExpr: salesLocationExpr,
    dateExpr: salesDateExpr,
    paymentExpr: "s.payment_method",
  });

  const summaryResult = await query<{
    total_revenue: string;
    total_sales: string;
    total_discount: string;
    avg_order_value: string;
    total_services_sold: string;
    total_products_sold: string;
  }>(
    `SELECT 
        COALESCE(SUM(${salesAmountExpr}), 0) as total_revenue,
        COUNT(*)::int as total_sales,
        COALESCE(SUM(${salesDiscountExpr}), 0) as total_discount,
        COALESCE(AVG(${salesAmountExpr}), 0) as avg_order_value,
        (
          SELECT COUNT(*)::int 
          FROM sale_services ss
          JOIN sales s2 ON s2.id = ss.sale_id
          WHERE ${whereClause.replace(/\bs\./g, "s2.")}${salesStatusCondition.replace(/\bs\./g, "s2.")}
        ) as total_services_sold,
        (
          SELECT COALESCE(SUM(sp.quantity), 0)::int
          FROM sale_products sp
          JOIN sales s2 ON s2.id = sp.sale_id
          WHERE ${whereClause.replace(/\bs\./g, "s2.")}${salesStatusCondition.replace(/\bs\./g, "s2.")}
        ) as total_products_sold
     FROM sales s
     WHERE ${whereClause}${salesStatusCondition}`,
    values,
  );

  const interval = filters.interval || "daily";
  let dateTrunc: string;

  switch (interval.toLowerCase()) {
    case "weekly":
      dateTrunc = `date_trunc('week', ${salesDateExpr})`;
      break;
    case "monthly":
      dateTrunc = `date_trunc('month', ${salesDateExpr})`;
      break;
    default:
      dateTrunc = `DATE(${salesDateExpr})`;
      break;
  }

  const trendResult = await query<{ date: string; revenue: string; sales_count: string }>(
    `SELECT 
        ${dateTrunc} as date,
        COALESCE(SUM(${salesAmountExpr}), 0) as revenue,
        COUNT(*)::int as sales_count
     FROM sales s
     WHERE ${whereClause}${salesStatusCondition}
     GROUP BY date
     ORDER BY date ASC`,
    values,
  );

  const paymentSplitResult = await query<{ payment_method: string; count: string; amount: string }>(
    `SELECT 
        COALESCE(s.payment_method, 'UNKNOWN') as payment_method,
        COUNT(*)::int as count,
        COALESCE(SUM(${salesAmountExpr}), 0) as amount
     FROM sales s
     WHERE ${whereClause}${salesStatusCondition}
     GROUP BY s.payment_method`,
    values,
  );

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const offset = (page - 1) * limit;
  const listValues = [...values, limit, offset];

  const listResult = await query<any>(
    `SELECT
        s.id,
        ${salesDateExpr} as date,
        ${salesAmountExpr} as revenue,
        ${salesDiscountExpr} as discount,
        COALESCE(s.payment_method, 'UNKNOWN') as "paymentSplit",
        COALESCE(c.name, 'Walk-in customer') as "clientName",
        COALESCE(b.name, 'Unknown Branch') as "locationName",
        COALESCE((
          SELECT json_agg(json_build_object('name', ser.name, 'staff_name', st.name))
          FROM sale_services ss
          JOIN services ser ON ser.id = ss.service_id
          LEFT JOIN staff_members st ON st.id = ss.staff_id
          WHERE ss.sale_id = s.id
        ), '[]'::json) as services,
        COALESCE((
          SELECT json_agg(json_build_object('name', inv.name, 'quantity', sp.quantity))
          FROM sale_products sp
          JOIN inventory inv ON inv.id = sp.product_id
          WHERE sp.sale_id = s.id
        ), '[]'::json) as products
     FROM sales s
     LEFT JOIN clients c ON c.id = s.client_id
     LEFT JOIN branches b ON b.id = ${salesLocationExpr}
     WHERE ${whereClause}${salesStatusCondition}
     ORDER BY ${salesDateExpr} DESC
     LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    listValues,
  );

  const totalCountResult = await query<{ count: string }>(
    `SELECT COUNT(*)::int as count FROM sales s WHERE ${whereClause}${salesStatusCondition}`,
    values,
  );

  const totalCount = parseInt(totalCountResult.rows[0].count, 10);

  return {
    summary: summaryResult.rows[0],
    trends: trendResult.rows,
    paymentSplit: paymentSplitResult.rows,
    list: listResult.rows,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}


export async function getCustomerReport(user: AuthUserPayload, filters: ReportFilters) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const clientColumns = await getTableColumns("clients");
  const clientLocationExpr = clientColumns.has("location_id")
    ? (clientColumns.has("branch_id") ? "COALESCE(c.location_id, c.branch_id)" : "c.location_id")
    : "c.branch_id";
  const clientDateExpr = clientColumns.has("created_at")
    ? "c.created_at"
    : "COALESCE(c.last_visit_at, NOW())";

  const { whereClause, values } = buildScopedFilters(user, filters, {
    alias: "c",
    locationExpr: clientLocationExpr,
    dateExpr: clientDateExpr,
  });

  const [summary, customerList] = await Promise.all([
    query<any>(
      `SELECT 
          COUNT(*)::int as total_customers,
          COUNT(CASE WHEN c.total_visits > 1 THEN 1 END)::int as returning_customers,
          COALESCE(AVG(c.total_visits), 0) as avg_visits_per_customer
       FROM clients c
       WHERE ${whereClause}`,
      values,
    ),
    query<any>(
      `SELECT
          c.id,
          c.name,
          c.phone_number,
          c.total_visits,
          c.last_visit_at,
          c.created_at,
          COALESCE(b.name, 'Unknown Branch') as location_name
       FROM clients c
       LEFT JOIN branches b ON b.id = ${clientLocationExpr}
       WHERE ${whereClause}
       ORDER BY c.last_visit_at DESC NULLS LAST, c.created_at DESC
       LIMIT 100`,
      values,
    ),
  ]);

  return {
    summary: summary.rows[0],
    list: customerList.rows,
  };
}

export async function getStaffReport(user: AuthUserPayload, filters: ReportFilters) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const [salesColumns, staffColumns] = await Promise.all([
    getTableColumns("sales"),
    getTableColumns("staff_members"),
  ]);
  const salesLocationExpr = salesColumns.has("location_id")
    ? (salesColumns.has("branch_id") ? "COALESCE(s.location_id, s.branch_id)" : "s.location_id")
    : "s.branch_id";
  const salesDateExpr = salesColumns.has("created_at")
    ? (salesColumns.has("sale_date") ? "COALESCE(s.created_at, s.sale_date)" : "s.created_at")
    : "s.sale_date";
  const salesStatusCondition = salesColumns.has("status") ? ` AND COALESCE(s.status, 'COMPLETED') = 'COMPLETED'` : "";
  const staffLocationExpr = staffColumns.has("location_id")
    ? (staffColumns.has("branch_id") ? "COALESCE(sm.location_id, sm.branch_id)" : "sm.location_id")
    : "sm.branch_id";

  const salesScope = buildScopedFilters(user, filters, {
    alias: "s",
    locationExpr: salesLocationExpr,
    dateExpr: salesDateExpr,
  });
  const entityScope = buildEntityScope(user, filters, "sm", staffLocationExpr);
  const salesJoinPredicate = salesScope.whereClause.replace(/\bs\./g, "sales_filter.");
  const combinedValues = [...entityScope.values, ...salesScope.values.slice(1)];
  const salesParamOffset = entityScope.values.length - 1;
  const salesJoinScoped = remapCombinedScope(salesJoinPredicate, 1, salesParamOffset);

  const staffPerformance = await query<any>(
    `SELECT 
        sm.id as staff_id,
        sm.name as staff_name,
        COUNT(sales_filter.id)::int as services_count,
        COALESCE(SUM(CASE WHEN sales_filter.id IS NOT NULL THEN ss.price ELSE 0 END), 0) as revenue
     FROM staff_members sm
     LEFT JOIN sale_services ss ON ss.staff_id = sm.id
     LEFT JOIN sales sales_filter
       ON sales_filter.id = ss.sale_id
      AND ${salesJoinScoped}${salesStatusCondition.replace(/\bs\./g, "sales_filter.")}
     WHERE ${entityScope.whereClause}
     GROUP BY sm.id, sm.name
     ORDER BY revenue DESC, services_count DESC`,
    combinedValues,
  );

  return {
    staffPerformance: staffPerformance.rows,
  };
}

export async function getServiceReport(user: AuthUserPayload, filters: ReportFilters) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const [salesColumns, serviceColumns, inventoryColumns] = await Promise.all([
    getTableColumns("sales"),
    getTableColumns("services"),
    getTableColumns("inventory"),
  ]);
  const salesLocationExpr = salesColumns.has("location_id")
    ? (salesColumns.has("branch_id") ? "COALESCE(s.location_id, s.branch_id)" : "s.location_id")
    : "s.branch_id";
  const salesDateExpr = salesColumns.has("created_at")
    ? (salesColumns.has("sale_date") ? "COALESCE(s.created_at, s.sale_date)" : "s.created_at")
    : "s.sale_date";
  const salesStatusCondition = salesColumns.has("status") ? ` AND COALESCE(s.status, 'COMPLETED') = 'COMPLETED'` : "";
  const serviceLocationExpr = serviceColumns.has("location_id")
    ? (serviceColumns.has("branch_id") ? "COALESCE(ser.location_id, ser.branch_id)" : "ser.location_id")
    : "ser.branch_id";
  const inventoryNameExpr = inventoryColumns.has("name") ? "inv.name" : "inv.item_name";

  const salesScope = buildScopedFilters(user, filters, {
    alias: "s",
    locationExpr: salesLocationExpr,
    dateExpr: salesDateExpr,
  });
  const entityScope = buildEntityScope(user, filters, "ser", serviceLocationExpr);
  const salesJoinPredicate = salesScope.whereClause.replace(/\bs\./g, "sales_filter.");
  const combinedValues = [...entityScope.values, ...salesScope.values.slice(1)];
  const salesParamOffset = entityScope.values.length - 1;
  const salesJoinScoped = remapCombinedScope(salesJoinPredicate, 1, salesParamOffset);

  const servicePerformance = await query<any>(
    `WITH service_costs AS (
        SELECT 
          sc.service_id,
          json_agg(json_build_object(
            'name', ${inventoryNameExpr},
            'quantity', sc.consumption_quantity,
            'unit', sc.consumption_unit,
            'cost_per_unit', (inv.cost_price / NULLIF(inv.quantity, 0))
          )) as consumables,
          SUM(sc.consumption_quantity * (inv.cost_price / NULLIF(inv.quantity, 0))) as cost_per_booking
        FROM service_consumables sc
        JOIN inventory inv ON inv.id = sc.inventory_item_id
        GROUP BY sc.service_id
     )
     SELECT 
        ser.id as service_id,
        ser.name as service_name,
        COUNT(sales_filter.id)::int as usage_count,
        COALESCE(SUM(CASE WHEN sales_filter.id IS NOT NULL THEN ss.price ELSE 0 END), 0) as revenue,
        COALESCE(cost.consumables, '[]'::json) as consumables,
        COALESCE(cost.cost_per_booking, 0) as cost_per_booking,
        COALESCE(SUM(CASE WHEN sales_filter.id IS NOT NULL THEN cost.cost_per_booking ELSE 0 END), 0) as total_consumable_cost
     FROM services ser
     LEFT JOIN sale_services ss ON ss.service_id = ser.id
     LEFT JOIN sales sales_filter
       ON sales_filter.id = ss.sale_id
      AND ${salesJoinScoped}${salesStatusCondition.replace(/\bs\./g, "sales_filter.")}
     LEFT JOIN service_costs cost ON cost.service_id = ser.id
     WHERE ${entityScope.whereClause}
     GROUP BY ser.id, ser.name, cost.consumables, cost.cost_per_booking
     ORDER BY usage_count DESC, revenue DESC`,
    combinedValues,
  );

  const summaryResult = await query<any>(
    `SELECT 
        COALESCE(SUM(total_cost), 0) as total_consumable_cost,
        (SELECT name FROM inventory WHERE tenant_id = $1 AND stock < COALESCE(low_stock_threshold, 5) LIMIT 1) as low_stock_item,
        (SELECT COUNT(*) FROM inventory WHERE tenant_id = $1 AND stock < COALESCE(low_stock_threshold, 5))::int as low_stock_count
     FROM (
       SELECT 
         COUNT(sales_filter.id) * COALESCE(cost.cost_per_booking, 0) as total_cost
       FROM services ser
       LEFT JOIN sale_services ss ON ss.service_id = ser.id
       LEFT JOIN sales sales_filter
         ON sales_filter.id = ss.sale_id
        AND ${salesJoinScoped}${salesStatusCondition.replace(/\bs\./g, "sales_filter.")}
       LEFT JOIN (
         SELECT 
           sc.service_id,
           SUM(sc.consumption_quantity * (inv.cost_price / NULLIF(inv.quantity, 0))) as cost_per_booking
         FROM service_consumables sc
         JOIN inventory inv ON inv.id = sc.inventory_item_id
         GROUP BY sc.service_id
       ) cost ON cost.service_id = ser.id
       WHERE ${entityScope.whereClause}
       GROUP BY ser.id, cost.cost_per_booking
     ) sub`,
    combinedValues,
  );

  return {
    servicePerformance: servicePerformance.rows,
    summary: summaryResult.rows[0],
  };
}

export async function getInventoryReport(user: AuthUserPayload, filters: ReportFilters) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const [inventoryColumns, salesColumns] = await Promise.all([
    getTableColumns("inventory"),
    getTableColumns("sales"),
  ]);

  const inventoryLocationExpr = inventoryColumns.has("location_id")
    ? (inventoryColumns.has("branch_id") ? "COALESCE(i.location_id, i.branch_id)" : "i.location_id")
    : "i.branch_id";
  const inventoryNameExpr = inventoryColumns.has("name") ? "i.name" : "i.item_name";
  const inventoryCostExpr = inventoryColumns.has("cost_price") ? "COALESCE(i.cost_price, 0)" : "COALESCE(i.unit_cost, 0)";
  const inventoryReorderExpr = inventoryColumns.has("low_stock_threshold")
    ? "i.low_stock_threshold"
    : inventoryColumns.has("reorder_level")
      ? "i.reorder_level"
      : "5";

  const salesLocationExpr = salesColumns.has("location_id")
    ? (salesColumns.has("branch_id") ? "COALESCE(s.location_id, s.branch_id)" : "s.location_id")
    : "s.branch_id";
  const salesDateExpr = salesColumns.has("created_at")
    ? (salesColumns.has("sale_date") ? "COALESCE(s.created_at, s.sale_date)" : "s.created_at")
    : "s.sale_date";
  const salesStatusCondition = salesColumns.has("status") ? ` AND COALESCE(s.status, 'COMPLETED') = 'COMPLETED'` : "";

  // 1. Inventory Scope (Branch/Tenant)
  const selectedLocationId = user.type === "manager" ? user.branch_id : normalizeLocationId(filters.locationId);
  const values: any[] = [user.tenant_id];
  let invWhere = "i.tenant_id = $1";
  if (selectedLocationId) {
    values.push(selectedLocationId);
    invWhere += ` AND ${inventoryLocationExpr} = $2`;
  }

  // 2. Sales Scope (Dates)
  const salesDateValues: any[] = [];
  let salesDateWhere = "";
  if (filters.startDate) {
    values.push(filters.startDate);
    salesDateWhere += ` AND DATE(${salesDateExpr}) >= $${values.length}`;
  }
  if (filters.endDate) {
    values.push(filters.endDate);
    salesDateWhere += ` AND DATE(${salesDateExpr}) <= $${values.length}`;
  }

  const queryStr = `
    WITH filtered_inventory AS (
      SELECT 
        i.id,
        i.tenant_id,
        ${inventoryLocationExpr} as resolved_location_id,
        ${inventoryNameExpr} as name,
        i.sku,
        i.unit,
        COALESCE(i.stock, 0) as stock,
        COALESCE(i.quantity, 0) as unit_quantity,
        ${inventoryReorderExpr} as reorder_level,
        ${inventoryCostExpr} as unit_cost
      FROM inventory i
      WHERE ${invWhere}
    ),
    sales_movement AS (
      SELECT 
        sp.product_id,
        SUM(sp.quantity) as sold_qty,
        SUM(sp.quantity * sp.price) as revenue
      FROM sale_products sp
      JOIN sales s ON s.id = sp.sale_id
      WHERE s.tenant_id = $1 ${selectedLocationId ? `AND ${salesLocationExpr} = $2` : ""} ${salesDateWhere} ${salesStatusCondition}
      GROUP BY sp.product_id
    ),
    service_movement AS (
      SELECT 
        sc.inventory_item_id as product_id,
        SUM(sc.consumption_quantity) as consumed_qty,
        SUM(sc.consumption_quantity / NULLIF(COALESCE(inv_ref.quantity, 0), 0))::numeric as consumed_units
      FROM sale_services ss
      JOIN sales s ON s.id = ss.sale_id
      JOIN service_consumables sc ON sc.service_id = ss.service_id
      JOIN inventory inv_ref ON inv_ref.id = sc.inventory_item_id
      WHERE s.tenant_id = $1 ${selectedLocationId ? `AND ${salesLocationExpr} = $2` : ""} ${salesDateWhere} ${salesStatusCondition}
      GROUP BY sc.inventory_item_id
    )
    SELECT 
      fi.*,
      COALESCE(sm.sold_qty, 0) as sold,
      COALESCE(sm.revenue, 0) as revenue,
      COALESCE(cm.consumed_qty, 0) as consumed_vol,
      COALESCE(cm.consumed_units, 0) as consumed,
      (COALESCE(sm.sold_qty, 0) + COALESCE(cm.consumed_units, 0)) as total_out,
      (fi.stock * fi.unit_cost) as stock_value,
      COALESCE(b.name, 'Unknown Branch') as location_name
    FROM filtered_inventory fi
    LEFT JOIN sales_movement sm ON sm.product_id = fi.id
    LEFT JOIN service_movement cm ON cm.product_id = fi.id
    LEFT JOIN branches b ON b.id = fi.resolved_location_id
    ORDER BY total_out DESC, fi.stock ASC
  `;

  const inventoryStatus = await query<any>(queryStr, values);
  const rows = inventoryStatus.rows;

  // Summary Metrics
  const totalStockValue = rows.reduce((sum, r) => sum + Number(r.stock_value || 0), 0);
  const totalProductRevenue = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const lowStockCount = rows.filter(r => {
    const stock = Number(r.stock || 0);
    const reorder = Number(r.reorder_level || 0);
    return stock < reorder || (stock <= 5 && stock <= reorder);
  }).length;
  
  const today = new Date().toISOString().split('T')[0];
  const todaySales = await query<any>(
    `SELECT SUM(sp.quantity) as count 
     FROM sale_products sp 
     JOIN sales s ON s.id = sp.sale_id 
     WHERE s.tenant_id = $1 ${selectedLocationId ? `AND ${salesLocationExpr} = $2` : ""} AND DATE(${salesDateExpr}) = ${selectedLocationId ? '$3' : '$2'}${salesStatusCondition}`,
    selectedLocationId ? [user.tenant_id, selectedLocationId, today] : [user.tenant_id, today]
  );

  const topPerformer = rows.length > 0 ? rows[0] : null;

  return {
    inventoryStatus: rows,
    summary: {
      totalStockValue,
      totalProductRevenue,
      lowStockCount,
      productsSoldToday: Number(todaySales.rows[0]?.count || 0),
      fastMovingProduct: topPerformer && Number(topPerformer.total_out) > 0 ? topPerformer.name : "None"
    },
    insights: {
      topSelling: rows.filter(r => Number(r.sold || 0) > 0).sort((a, b) => Number(b.sold) - Number(a.sold)).slice(0, 5),
      lowStockAlerts: rows.filter(r => {
        const stock = Number(r.stock || 0);
        const reorder = Number(r.reorder_level || 0);
        return stock < reorder || (stock <= 5 && stock <= reorder);
      }).slice(0, 5),
      deadStock: rows.filter(r => Number(r.sold || 0) === 0).slice(0, 5),
      highConsumption: rows.filter(r => Number(r.consumed || 0) > 0).sort((a, b) => Number(b.consumed) - Number(a.consumed)).slice(0, 5)
    }
  };
}

export async function getReportsSummary(user: AuthUserPayload, filters: ReportFilters) {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const [salesColumns, clientColumns] = await Promise.all([
    getTableColumns("sales"),
    getTableColumns("clients"),
  ]);

  const salesLocationExpr = salesColumns.has("location_id")
    ? (salesColumns.has("branch_id") ? "COALESCE(s.location_id, s.branch_id)" : "s.location_id")
    : "s.branch_id";
  const salesDateExpr = salesColumns.has("created_at")
    ? (salesColumns.has("sale_date") ? "COALESCE(s.created_at, s.sale_date)" : "s.created_at")
    : "s.sale_date";
  const salesAmountExpr = salesColumns.has("total_amount")
    ? (salesColumns.has("amount") ? "COALESCE(s.total_amount, s.amount, 0)" : "COALESCE(s.total_amount, 0)")
    : "COALESCE(s.amount, 0)";
  const salesStatusCondition = salesColumns.has("status") ? ` AND COALESCE(s.status, 'COMPLETED') = 'COMPLETED'` : "";

  const clientLocationExpr = clientColumns.has("location_id")
    ? (clientColumns.has("branch_id") ? "COALESCE(c.location_id, c.branch_id)" : "c.location_id")
    : "c.branch_id";
  const clientDateExpr = clientColumns.has("created_at")
    ? "c.created_at"
    : "COALESCE(c.last_visit_at, NOW())";

  const salesScope = buildScopedFilters(user, filters, {
    alias: "s",
    locationExpr: salesLocationExpr,
    dateExpr: salesDateExpr,
  });
  const customerScope = buildScopedFilters(user, filters, {
    alias: "c",
    locationExpr: clientLocationExpr,
    dateExpr: clientDateExpr,
  });

  const [salesSummary, customerSummary] = await Promise.all([
    query<any>(
      `SELECT 
          COALESCE(SUM(${salesAmountExpr}), 0) as total_revenue,
          COUNT(*)::int as total_sales
       FROM sales s
       WHERE ${salesScope.whereClause}${salesStatusCondition}`,
      salesScope.values,
    ),
    query<any>(
      `SELECT COUNT(*)::int as total_customers
       FROM clients c
       WHERE ${customerScope.whereClause}`,
      customerScope.values,
    ),
  ]);

  return {
    revenue: salesSummary.rows[0].total_revenue || 0,
    salesCount: salesSummary.rows[0].total_sales || 0,
    customerCount: customerSummary.rows[0].total_customers || 0,
  };
}
