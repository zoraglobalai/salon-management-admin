import { query } from "../../../database/pool";
import type { AuthUserPayload } from "../../../shared/types/auth";
import { buildTenantScope } from "../../../shared/utils/tenantScope";

function toNumber(value: unknown) {
  return Number(value || 0);
}

type MetricRow = Record<string, string | number | null>;

type BranchSummaryRow = {
  branchId: string;
  branchName: string;
  totalSales: string | number | null;
  revenue: string | number | null;
  clients: string | number | null;
  payments: string | number | null;
};

type TrendRow = {
  day: string;
  sales: string | number | null;
  revenue: string | number | null;
};

type TopServiceRow = {
  serviceName: string;
  salesCount: string | number | null;
  revenue: string | number | null;
};

type RecentSaleRow = {
  id: string;
  clientName: string | null;
  serviceName: string | null;
  totalAmount: string | number | null;
  paymentMethod: string | null;
  createdAt: string | null;
};

type PaymentMethodRow = {
  paymentMethod: string | null;
  amount: string | number | null;
  count: string | number | null;
};

type TodayStatusRow = {
  completed: string | number | null;
  pending: string | number | null;
  cancelled: string | number | null;
};

type SchemaColumnRow = {
  column_name: string;
};

type TrendRange = "7d" | "month" | "prev_month";

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

export async function getDashboardMetrics(user: AuthUserPayload) {
  if (user.type === "admin") {
    const [platformStats, revenueStats, ticketStats] = await Promise.all([
      query<MetricRow>("SELECT COUNT(*)::int AS tenants, COUNT(*) FILTER (WHERE subscription_status = 'trial')::int AS trials FROM tenants"),
      query<MetricRow>("SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(*)::int AS sales_count FROM sales"),
      query<MetricRow>("SELECT COUNT(*) FILTER (WHERE status = 'open')::int AS open_tickets FROM support_tickets"),
    ]);

    return {
      metrics: {
        tenants: Number(platformStats.rows[0].tenants || 0),
        trials: Number(platformStats.rows[0].trials || 0),
        revenue: toNumber(revenueStats.rows[0].revenue),
        salesCount: Number(revenueStats.rows[0].sales_count || 0),
        openTickets: Number(ticketStats.rows[0].open_tickets || 0),
      },
    };
  }

  const scope = buildTenantScope(user);
  const where = scope.filters.length ? `WHERE ${scope.filters.join(" AND ")}` : "";

  const [salesStats, appointmentStats, clientStats, inventoryStats] = await Promise.all([
    query<MetricRow>(`SELECT COALESCE(SUM(amount), 0) AS revenue, COUNT(*)::int AS sales_count FROM sales ${where}`, scope.values),
    query<MetricRow>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled, COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_show
       FROM appointments ${where}`,
      scope.values,
    ),
    query<MetricRow>(
      `SELECT COUNT(*)::int AS clients, COUNT(*) FILTER (WHERE total_visits > 1)::int AS repeat_clients,
        COUNT(*) FILTER (WHERE last_visit_at < NOW() - INTERVAL '45 days' OR last_visit_at IS NULL)::int AS missed_clients
       FROM clients ${where}`,
      scope.values,
    ),
    query<MetricRow>(`SELECT COUNT(*) FILTER (WHERE quantity <= reorder_level)::int AS low_stock_items FROM inventory ${where}`, scope.values),
  ]);

  return {
    metrics: {
      revenue: toNumber(salesStats.rows[0].revenue),
      salesCount: Number(salesStats.rows[0].sales_count || 0),
      appointments: Number(appointmentStats.rows[0].total || 0),
      scheduledAppointments: Number(appointmentStats.rows[0].scheduled || 0),
      noShows: Number(appointmentStats.rows[0].no_show || 0),
      clients: Number(clientStats.rows[0].clients || 0),
      repeatClients: Number(clientStats.rows[0].repeat_clients || 0),
      missedClients: Number(clientStats.rows[0].missed_clients || 0),
      lowStockItems: Number(inventoryStats.rows[0].low_stock_items || 0),
    },
  };
}

export async function getDashboardSummary(
  user: AuthUserPayload,
  filters: { date?: string; branchId?: string; trendRange?: string } = {},
) {
  if (!user.tenant_id) {
    return {
      role: user.type,
      branchCount: 0,
      totals: {
        totalSales: 0,
        revenue: 0,
        clients: 0,
        payments: 0,
        avgOrderValue: 0,
      },
      today: {
        sales: 0,
        revenue: 0,
        clients: 0,
        payments: 0,
      },
      yesterday: {
        sales: 0,
        revenue: 0,
        clients: 0,
        avgOrderValue: 0,
      },
      trend: [],
      topServices: [],
      recentSales: [],
      paymentMethods: [],
      todayStatus: {
        completed: 0,
        pending: 0,
        cancelled: 0,
      },
      branches: [],
    };
  }

  const selectedBranchId = user.type === "manager" ? user.branch_id : filters.branchId?.trim() || null;
  const targetDate =
    filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)
      ? filters.date
      : new Date().toISOString().slice(0, 10);
  const selectedTrendRange: TrendRange =
    filters.trendRange === "month" || filters.trendRange === "prev_month" ? filters.trendRange : "7d";

  const [branchColumns, salesColumns, appointmentColumns] = await Promise.all([
    getTableColumns("branches"),
    getTableColumns("sales"),
    getTableColumns("appointments"),
  ]);

  const branchTenantColumn = branchColumns.has("tenantId") ? `b."tenantId"` : "b.tenant_id";
  const salesLocationExpr = salesColumns.has("location_id")
    ? (salesColumns.has("branch_id") ? "COALESCE(s.location_id, s.branch_id)" : "s.location_id")
    : "s.branch_id";
  const salesDateExpr = salesColumns.has("created_at")
    ? (salesColumns.has("sale_date") ? "COALESCE(s.created_at, s.sale_date)" : "s.created_at")
    : "s.sale_date";
  const salesAmountExpr = salesColumns.has("total_amount")
    ? (salesColumns.has("amount") ? "COALESCE(s.total_amount, s.amount, 0)" : "COALESCE(s.total_amount, 0)")
    : "COALESCE(s.amount, 0)";
  const salesPaidExpr = salesColumns.has("paid_amount")
    ? `${salesColumns.has("total_amount") ? "COALESCE(s.paid_amount, s.total_amount" : "COALESCE(s.paid_amount"}${
        salesColumns.has("amount") ? ", s.amount, 0)" : ", 0)"
      }`
    : salesAmountExpr;
  const appointmentLocationExpr = appointmentColumns.has("location_id")
    ? (appointmentColumns.has("branch_id") ? "COALESCE(a.location_id, a.branch_id)" : "a.location_id")
    : "a.branch_id";
  const appointmentDateExpr = appointmentColumns.has("appointment_at")
    ? "a.appointment_at"
    : "a.created_at";

  const values: Array<string | null> = [user.tenant_id];
  let branchParam = "";

  if (selectedBranchId) {
    values.push(selectedBranchId);
    branchParam = `$${values.length}`;
  }

  values.push(targetDate);
  const dateParam = `$${values.length}`;
  values.push(selectedTrendRange);
  const trendRangeParam = `$${values.length}`;

  const branchScope = selectedBranchId ? `AND b.id = ${branchParam}` : "";
  const salesScopeCondition = selectedBranchId ? `AND ${salesLocationExpr} = ${branchParam}` : "";
  const serviceScopeCondition = selectedBranchId ? `AND ${salesLocationExpr} = ${branchParam}` : "";
  const appointmentScopeCondition = selectedBranchId ? `AND ${appointmentLocationExpr} = ${branchParam}` : "";
  const branchCountValues = selectedBranchId ? values.slice(0, 2) : values.slice(0, 1);
  const summaryValues = values.slice(0, -1);

  const [branchCountResult, totalsResult, branchRowsResult, todayResult, trendResult, topServicesResult, recentSalesResult, yesterdaySalesResult, paymentMethodsResult, todayStatusResult] = await Promise.all([
    query<MetricRow>(
      `SELECT COUNT(*)::int AS branch_count FROM branches b WHERE ${branchTenantColumn} = $1 ${branchScope}`,
      branchCountValues,
    ),
    query<MetricRow>(
      `
        SELECT
          COALESCE(SUM(branch_metrics.total_sales), 0)::int AS total_sales,
          COALESCE(SUM(branch_metrics.revenue), 0) AS revenue,
          COALESCE(SUM(branch_metrics.clients), 0)::int AS clients,
          COALESCE(SUM(branch_metrics.payments), 0) AS payments
        FROM branches b
        LEFT JOIN LATERAL (
          SELECT
            (
              SELECT COUNT(*)::int
              FROM sales s
              WHERE s.tenant_id = $1
                AND ${salesLocationExpr} = b.id
                AND DATE(${salesDateExpr}) = ${dateParam}::date
            ) AS total_sales,
            (
              SELECT COALESCE(SUM(${salesAmountExpr}), 0)
              FROM sales s
              WHERE s.tenant_id = $1
                AND ${salesLocationExpr} = b.id
                AND DATE(${salesDateExpr}) = ${dateParam}::date
            ) AS revenue,
            (
              SELECT COUNT(DISTINCT s.client_id)::int
              FROM sales s
              WHERE s.tenant_id = $1
                AND ${salesLocationExpr} = b.id
                AND DATE(${salesDateExpr}) = ${dateParam}::date
            ) AS clients,
            (
              SELECT COALESCE(SUM(${salesPaidExpr}), 0)
              FROM sales s
              WHERE s.tenant_id = $1
                AND ${salesLocationExpr} = b.id
                AND DATE(${salesDateExpr}) = ${dateParam}::date
            ) AS payments
        ) branch_metrics ON TRUE
        WHERE ${branchTenantColumn} = $1 ${branchScope}
      `,
      summaryValues,
    ),
    query<BranchSummaryRow>(
      `
        SELECT
          b.id AS "branchId",
          b.name AS "branchName",
          branch_metrics.total_sales AS "totalSales",
          branch_metrics.revenue AS revenue,
          branch_metrics.clients AS clients,
          branch_metrics.payments AS payments
        FROM branches b
        LEFT JOIN LATERAL (
          SELECT
            (
              SELECT COUNT(*)::int
              FROM sales s
              WHERE s.tenant_id = $1
                AND ${salesLocationExpr} = b.id
                AND DATE(${salesDateExpr}) = ${dateParam}::date
            ) AS total_sales,
            (
              SELECT COALESCE(SUM(${salesAmountExpr}), 0)
              FROM sales s
              WHERE s.tenant_id = $1
                AND ${salesLocationExpr} = b.id
                AND DATE(${salesDateExpr}) = ${dateParam}::date
            ) AS revenue,
            (
              SELECT COUNT(DISTINCT s.client_id)::int
              FROM sales s
              WHERE s.tenant_id = $1
                AND ${salesLocationExpr} = b.id
                AND DATE(${salesDateExpr}) = ${dateParam}::date
            ) AS clients,
            (
              SELECT COALESCE(SUM(${salesPaidExpr}), 0)
              FROM sales s
              WHERE s.tenant_id = $1
                AND ${salesLocationExpr} = b.id
                AND DATE(${salesDateExpr}) = ${dateParam}::date
            ) AS payments
        ) branch_metrics ON TRUE
        WHERE ${branchTenantColumn} = $1 ${branchScope}
        ORDER BY b.name ASC
      `,
      summaryValues,
    ),
    query<MetricRow>(
      `
        SELECT
          COUNT(*)::int AS today_sales,
          COALESCE(SUM(${salesAmountExpr}), 0) AS today_revenue,
          COUNT(DISTINCT s.client_id)::int AS today_clients,
          COALESCE(SUM(${salesPaidExpr}), 0) AS today_payments
        FROM sales s
        WHERE s.tenant_id = $1
          AND DATE(${salesDateExpr}) = ${dateParam}::date
          ${salesScopeCondition}
      `,
      summaryValues,
    ),
    query<TrendRow>(
      `
        WITH trend_window AS (
          SELECT
            CASE
              WHEN ${trendRangeParam} = 'month' THEN DATE_TRUNC('month', ${dateParam}::date)::date
              WHEN ${trendRangeParam} = 'prev_month' THEN (DATE_TRUNC('month', ${dateParam}::date) - INTERVAL '1 month')::date
              ELSE (${dateParam}::date - INTERVAL '6 days')::date
            END AS start_date,
            CASE
              WHEN ${trendRangeParam} = 'month' THEN LEAST(
                ${dateParam}::date,
                (DATE_TRUNC('month', ${dateParam}::date) + INTERVAL '1 month' - INTERVAL '1 day')::date
              )
              WHEN ${trendRangeParam} = 'prev_month' THEN (DATE_TRUNC('month', ${dateParam}::date) - INTERVAL '1 day')::date
              ELSE ${dateParam}::date
            END AS end_date
        )
        SELECT
          TO_CHAR(day_bucket.day, 'DD Mon') AS day,
          COALESCE(COUNT(s.id), 0)::int AS sales,
          COALESCE(SUM(${salesAmountExpr}), 0) AS revenue
        FROM trend_window
        CROSS JOIN generate_series(trend_window.start_date, trend_window.end_date, INTERVAL '1 day') AS day_bucket(day)
        LEFT JOIN sales s
          ON DATE(${salesDateExpr}) = DATE(day_bucket.day)
         AND s.tenant_id = $1
         ${salesScopeCondition}
        GROUP BY day_bucket.day
        ORDER BY day_bucket.day ASC
      `,
      values,
    ),
    query<TopServiceRow>(
      `
        SELECT
          ser.name AS "serviceName",
          COUNT(ss.id)::int AS "salesCount",
          COALESCE(SUM(COALESCE(ss.price, 0)), 0) AS revenue
        FROM sale_services ss
        INNER JOIN sales s ON s.id = ss.sale_id
        INNER JOIN services ser ON ser.id = ss.service_id
        WHERE s.tenant_id = $1
          AND DATE(${salesDateExpr}) = ${dateParam}::date
          ${serviceScopeCondition}
        GROUP BY ser.id, ser.name
        ORDER BY "salesCount" DESC, revenue DESC, ser.name ASC
        LIMIT 5
      `,
      summaryValues,
    ),
    query<RecentSaleRow>(
      `
        SELECT
          s.id,
          c.name AS "clientName",
          (
            SELECT ser.name
            FROM sale_services ss
            INNER JOIN services ser ON ser.id = ss.service_id
            WHERE ss.sale_id = s.id
            ORDER BY ss.id ASC
            LIMIT 1
          ) AS "serviceName",
          ${salesAmountExpr} AS "totalAmount",
          s.payment_method AS "paymentMethod",
          ${salesDateExpr}::text AS "createdAt"
        FROM sales s
        LEFT JOIN clients c ON c.id = s.client_id
        WHERE s.tenant_id = $1
          AND DATE(${salesDateExpr}) = ${dateParam}::date
          ${salesScopeCondition}
        ORDER BY ${salesDateExpr} DESC
        LIMIT 5
      `,
      summaryValues,
    ),
    query<MetricRow>(
      `
        SELECT
          COUNT(*)::int AS yesterday_sales,
          COALESCE(SUM(${salesAmountExpr}), 0) AS yesterday_revenue,
          COUNT(DISTINCT s.client_id)::int AS yesterday_clients
        FROM sales s
        WHERE s.tenant_id = $1
          AND DATE(${salesDateExpr}) = ${dateParam}::date - INTERVAL '1 day'
          ${salesScopeCondition}
      `,
      summaryValues,
    ),
    query<PaymentMethodRow>(
      `
        SELECT
          s.payment_method AS "paymentMethod",
          COALESCE(SUM(${salesPaidExpr}), 0) AS amount,
          COUNT(*)::int AS count
        FROM sales s
        WHERE s.tenant_id = $1
          AND DATE(${salesDateExpr}) = ${dateParam}::date
          ${salesScopeCondition}
        GROUP BY s.payment_method
        ORDER BY amount DESC
      `,
      summaryValues,
    ),
    query<TodayStatusRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE a.status = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE a.status = 'scheduled')::int AS pending,
          COUNT(*) FILTER (WHERE a.status = 'cancelled' OR a.status = 'no_show')::int AS cancelled
        FROM appointments a
        WHERE a.tenant_id = $1
          AND DATE(${appointmentDateExpr}) = ${dateParam}::date
          ${appointmentScopeCondition}
      `,
      summaryValues,
    ),
  ]);

  const branchCount = Number(branchCountResult.rows[0]?.branch_count || 0);
  const totalRevenue = toNumber(totalsResult.rows[0]?.revenue);
  const totalSales = Number(totalsResult.rows[0]?.total_sales || 0);
  const todaySales = Number(todayResult.rows[0]?.today_sales || 0);
  const todayRevenue = toNumber(todayResult.rows[0]?.today_revenue);
  const todayClients = Number(todayResult.rows[0]?.today_clients || 0);
  const yesterdayRevenue = toNumber(yesterdaySalesResult.rows[0]?.yesterday_revenue);
  const yesterdaySales = Number(yesterdaySalesResult.rows[0]?.yesterday_sales || 0);
  const yesterdayClients = Number(yesterdaySalesResult.rows[0]?.yesterday_clients || 0);

  return {
    role: user.type,
    branchCount,
    totals: {
      totalSales,
      revenue: totalRevenue,
      clients: Number(totalsResult.rows[0]?.clients || 0),
      payments: toNumber(totalsResult.rows[0]?.payments),
      avgOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
    },
    today: {
      sales: todaySales,
      revenue: todayRevenue,
      clients: todayClients,
      payments: toNumber(todayResult.rows[0]?.today_payments),
    },
    yesterday: {
      sales: yesterdaySales,
      revenue: yesterdayRevenue,
      clients: yesterdayClients,
      avgOrderValue: yesterdaySales > 0 ? yesterdayRevenue / yesterdaySales : 0,
    },
    trend: trendResult.rows.map((row) => ({
      day: row.day,
      sales: Number(row.sales || 0),
      revenue: toNumber(row.revenue),
    })),
    topServices: topServicesResult.rows.map((row) => ({
      serviceName: row.serviceName,
      salesCount: Number(row.salesCount || 0),
      revenue: toNumber(row.revenue),
    })),
    recentSales: recentSalesResult.rows.map((row) => ({
      id: row.id,
      clientName: row.clientName || "Walk-in Client",
      serviceName: row.serviceName || "Service",
      totalAmount: toNumber(row.totalAmount),
      paymentMethod: row.paymentMethod || "Unknown",
      createdAt: row.createdAt,
    })),
    paymentMethods: paymentMethodsResult.rows.map((row) => ({
      paymentMethod: row.paymentMethod || "Unknown",
      amount: toNumber(row.amount),
      count: Number(row.count || 0),
    })),
    todayStatus: {
      completed: Number(todayStatusResult.rows[0]?.completed || 0),
      pending: Number(todayStatusResult.rows[0]?.pending || 0),
      cancelled: Number(todayStatusResult.rows[0]?.cancelled || 0),
    },
    branches: branchRowsResult.rows.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      totalSales: Number(row.totalSales || 0),
      revenue: toNumber(row.revenue),
      clients: Number(row.clients || 0),
      payments: toNumber(row.payments),
    })),
  };
}
