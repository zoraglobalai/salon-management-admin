import { query } from "../../database/pool";
import { createError } from "../../middleware/errorHandler";
import type { AuthUserPayload } from "../../shared/types/auth";

export type ProfitReportFilters = {
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
  locationId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
};

export type ProfitReportStatus = "profit" | "loss" | "break_even";

export type ProfitBreakdown = {
  services: number;
  products: number;
  otherRevenue: number;
  salary: number;
  purchase: number;
  rent: number;
  electricity: number;
  maintenance: number;
  miscellaneous: number;
};

export type ProfitReportRow = {
  period: string;
  period_date: string;
  revenue: number;
  expenses: number;
  profit: number;
  profit_margin: number;
  status: ProfitReportStatus;
  breakdown: ProfitBreakdown;
};

type ProfitSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  status: ProfitReportStatus;
  breakdownTotals: ProfitBreakdown;
};

type ProfitReportResult = {
  summary: ProfitSummary;
  rows: ProfitReportRow[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  filterMeta: {
    branches: Array<{ id: string; name: string }>;
  };
  insights: string[];
  appliedFilters: {
    startDate: string;
    endDate: string;
    month: number;
    year: number;
    locationId: string | null;
  };
};

type RevenueRow = {
  period_date: string;
  services_revenue: string | number;
  products_revenue: string | number;
};

type DailySalaryRow = {
  period_date: string;
  salary_expense: string | number;
};

type PurchaseExpenseRow = {
  period_date: string;
  purchase_expense: string | number;
};

type ManualExpenseRow = {
  period_date: string;
  rent_expense: string | number;
  electricity_expense: string | number;
  maintenance_expense: string | number;
  miscellaneous_expense: string | number;
};

type TopServiceRow = {
  service_name: string;
  revenue: string | number;
};

type SchemaColumnRow = {
  column_name: string;
};

function normalizeLocationId(locationId?: string | null) {
  const normalized = locationId?.trim();
  if (!normalized || normalized.toLowerCase() === "all") {
    return null;
  }
  return normalized;
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPeriodLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatus(profit: number): ProfitReportStatus {
  if (profit > 0) return "profit";
  if (profit < 0) return "loss";
  return "break_even";
}

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end),
  };
}

function enumerateDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    dates.push(formatDateOnly(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function shiftDate(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return formatDateOnly(next);
}

function resolveDateRange(filters: ProfitReportFilters) {
  if (filters.startDate && filters.endDate) {
    const start = new Date(`${filters.startDate}T00:00:00`);
    const end = new Date(`${filters.endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw createError("Invalid date range supplied.", 400);
    }
    return {
      startDate: filters.startDate,
      endDate: filters.endDate,
      month: start.getMonth() + 1,
      year: start.getFullYear(),
    };
  }

  const today = new Date();
  const year = Number(filters.year || today.getFullYear());
  const month = Number(filters.month || today.getMonth() + 1);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw createError("Invalid month/year supplied.", 400);
  }
  return { ...getMonthRange(year, month), month, year };
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

function buildSalesScope(user: AuthUserPayload, selectedLocationId: string | null, startDate: string, endDate: string) {
  return async () => {
    const salesColumns = await getTableColumns("sales");
    const salesLocationExpr = salesColumns.has("location_id")
      ? (salesColumns.has("branch_id") ? "COALESCE(s.location_id, s.branch_id)" : "s.location_id")
      : "s.branch_id";
    const salesDateExpr = salesColumns.has("created_at")
      ? (salesColumns.has("sale_date") ? "COALESCE(s.created_at, s.sale_date)" : "s.created_at")
      : "s.sale_date";
    const salesStatusCondition = salesColumns.has("status")
      ? ` AND COALESCE(s.status, 'COMPLETED') = 'COMPLETED'`
      : "";

    const values: Array<string | null> = [user.tenant_id];
    let whereClause = "s.tenant_id = $1";
    if (selectedLocationId) {
      values.push(selectedLocationId);
      whereClause += ` AND ${salesLocationExpr} = $${values.length}`;
    }
    values.push(startDate);
    whereClause += ` AND DATE(${salesDateExpr}) >= $${values.length}::date`;
    values.push(endDate);
    whereClause += ` AND DATE(${salesDateExpr}) <= $${values.length}::date`;

    return {
      salesLocationExpr,
      salesDateExpr,
      salesStatusCondition,
      values,
      whereClause,
    };
  };
}

async function getRevenueByDay(
  user: AuthUserPayload,
  selectedLocationId: string | null,
  startDate: string,
  endDate: string,
) {
  const { values, whereClause, salesDateExpr, salesStatusCondition } = await buildSalesScope(
    user,
    selectedLocationId,
    startDate,
    endDate,
  )();

  return query<RevenueRow>(
    `WITH service_totals AS (
       SELECT sale_id, SUM(COALESCE(combo_total_price, price, 0)) AS service_revenue
       FROM sale_services
       GROUP BY sale_id
     ),
     product_totals AS (
       SELECT sale_id, SUM(COALESCE(price, 0) * COALESCE(quantity, 0)) AS product_revenue
       FROM sale_products
       GROUP BY sale_id
     )
     SELECT
       DATE(${salesDateExpr})::text AS period_date,
       COALESCE(SUM(COALESCE(st.service_revenue, 0)), 0) AS services_revenue,
       COALESCE(SUM(COALESCE(pt.product_revenue, 0)), 0) AS products_revenue
     FROM sales s
     LEFT JOIN service_totals st ON st.sale_id = s.id
     LEFT JOIN product_totals pt ON pt.sale_id = s.id
     WHERE ${whereClause}${salesStatusCondition}
     GROUP BY 1
     ORDER BY 1 ASC`,
    values,
  );
}

async function getDailySalaryExpense(
  user: AuthUserPayload,
  selectedLocationId: string | null,
  startDate: string,
  endDate: string,
) {
  const values: Array<string | null> = [user.tenant_id];
  const conditions = [
    "sm.tenant_id = $1",
    "a.employee_id = sm.id",
    "a.attendance_date >= $2::date",
    "a.attendance_date <= $3::date",
  ];
  values.push(startDate);
  values.push(endDate);

  if (selectedLocationId) {
    values.push(selectedLocationId);
    conditions.push(`sm.location_id = $${values.length}`);
  }

  return query<DailySalaryRow>(
    `SELECT
       a.attendance_date::date::text AS period_date,
       COALESCE(SUM(
         (
           CASE
             WHEN LOWER(COALESCE(sp.salary_type, 'monthly')) = 'weekly'
               THEN COALESCE(sp.salary_amount, 0) / 7.0
             ELSE COALESCE(sp.salary_amount, 0) / EXTRACT(DAY FROM (date_trunc('month', a.attendance_date::date) + interval '1 month - 1 day'))::numeric
           END
         ) *
         CASE
           WHEN a.status = 'half_day' THEN 0.5
           WHEN a.status = 'lop' THEN 0
           WHEN a.status IN ('present', 'paid_leave', 'week_off', 'holiday') THEN 1
           ELSE 0
         END
       ), 0) AS salary_expense
     FROM attendance a
     JOIN staff_members sm ON ${conditions.join(" AND ")}
     LEFT JOIN staff_payroll sp ON sp.staff_id = sm.id
     GROUP BY 1
     ORDER BY 1 ASC`,
    values,
  );
}

async function getPurchaseExpenseByDay(
  user: AuthUserPayload,
  selectedLocationId: string | null,
  startDate: string,
  endDate: string,
) {
  const values: Array<string | null> = [user.tenant_id, startDate, endDate];
  const conditions = [
    "p.tenant_id = $1",
    "p.purchase_date >= $2::date",
    "p.purchase_date <= $3::date",
    "COALESCE(p.payment_status, 'PAID') <> 'CANCELLED'",
  ];

  if (selectedLocationId) {
    values.push(selectedLocationId);
    conditions.push(`p.location_id = $${values.length}`);
  }

  return query<PurchaseExpenseRow>(
    `SELECT
       p.purchase_date::date::text AS period_date,
       COALESCE(SUM(
         (COALESCE(pi.cost_price, 0) * COALESCE(pi.initial_stock, 0)) +
         (
           CASE
             WHEN COALESCE(pi.gst_type, 'PERCENT') = 'PERCENT'
               THEN (COALESCE(pi.cost_price, 0) * COALESCE(pi.gst, 0) / 100.0) * COALESCE(pi.initial_stock, 0)
             ELSE COALESCE(pi.gst, 0) * COALESCE(pi.initial_stock, 0)
           END
         )
       ), 0) AS purchase_expense
     FROM purchases p
     JOIN purchase_items pi ON pi.purchase_id = p.id
     WHERE ${conditions.join(" AND ")}
     GROUP BY 1
     ORDER BY 1 ASC`,
    values,
  );
}

async function getManualExpenseByDay(
  user: AuthUserPayload,
  selectedLocationId: string | null,
  startDate: string,
  endDate: string,
) {
  const values: Array<string | null> = [user.tenant_id, startDate, endDate];
  const conditions = [
    "e.tenant_id = $1",
    "e.expense_date >= $2::date",
    "e.expense_date <= $3::date",
    "COALESCE(e.status, 'PAID') <> 'CANCELLED'",
    "e.purchase_id IS NULL",
  ];

  if (selectedLocationId) {
    values.push(selectedLocationId);
    conditions.push(`e.branch_id = $${values.length}`);
  }

  return query<ManualExpenseRow>(
    `SELECT
       e.expense_date::date::text AS period_date,
       COALESCE(SUM(CASE
         WHEN LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%rent%'
           OR LOWER(COALESCE(e.expense_category, '')) LIKE '%rent%'
         THEN COALESCE(e.total_amount, e.amount, 0)
         ELSE 0
       END), 0) AS rent_expense,
       COALESCE(SUM(CASE
         WHEN LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%electric%'
           OR LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%power%'
           OR LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%utility%'
         THEN COALESCE(e.total_amount, e.amount, 0)
         ELSE 0
       END), 0) AS electricity_expense,
       COALESCE(SUM(CASE
         WHEN LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%maint%'
         THEN COALESCE(e.total_amount, e.amount, 0)
         ELSE 0
       END), 0) AS maintenance_expense,
       COALESCE(SUM(CASE
         WHEN LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%rent%'
           OR LOWER(COALESCE(e.expense_category, '')) LIKE '%rent%'
           OR LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%electric%'
           OR LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%power%'
           OR LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%utility%'
           OR LOWER(COALESCE(e.sub_category, e.expense_category, '')) LIKE '%maint%'
           OR LOWER(COALESCE(e.expense_category, '')) = 'staff expenses'
           OR LOWER(COALESCE(e.expense_category, '')) = 'purchase expenses'
         THEN 0
         ELSE COALESCE(e.total_amount, e.amount, 0)
       END), 0) AS miscellaneous_expense
     FROM expenses e
     WHERE ${conditions.join(" AND ")}
     GROUP BY 1
     ORDER BY 1 ASC`,
    values,
  );
}

async function getTopRevenueService(
  user: AuthUserPayload,
  selectedLocationId: string | null,
  startDate: string,
  endDate: string,
) {
  const { values, whereClause, salesStatusCondition } = await buildSalesScope(
    user,
    selectedLocationId,
    startDate,
    endDate,
  )();

  const result = await query<TopServiceRow>(
    `SELECT
       COALESCE(ser.name, 'Unknown Service') AS service_name,
       COALESCE(SUM(COALESCE(ss.combo_total_price, ss.price, 0)), 0) AS revenue
     FROM sale_services ss
     JOIN sales s ON s.id = ss.sale_id
     LEFT JOIN services ser ON ser.id = ss.service_id
     WHERE ${whereClause}${salesStatusCondition}
     GROUP BY ser.name
     ORDER BY revenue DESC, service_name ASC
     LIMIT 1`,
    values,
  );

  return result.rows[0] || null;
}

async function getBranchOptions(tenantId: string) {
  const result = await query<{ id: string; name: string }>(
    `SELECT id, name FROM branches WHERE tenant_id = $1 ORDER BY name ASC`,
    [tenantId],
  );
  return result.rows;
}

function emptyBreakdown(): ProfitBreakdown {
  return {
    services: 0,
    products: 0,
    otherRevenue: 0,
    salary: 0,
    purchase: 0,
    rent: 0,
    electricity: 0,
    maintenance: 0,
    miscellaneous: 0,
  };
}

function getPreviousRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  return {
    startDate: shiftDate(startDate, -days),
    endDate: shiftDate(startDate, -1),
  };
}

function buildInsights(
  current: ProfitSummary,
  previous: ProfitSummary,
  topService: TopServiceRow | null,
): string[] {
  const insights: string[] = [];
  const revenueDelta = current.totalRevenue - previous.totalRevenue;
  const expenseDelta = current.totalExpenses - previous.totalExpenses;
  const profitDelta = current.netProfit - previous.netProfit;

  const revenuePct = previous.totalRevenue > 0 ? (revenueDelta / previous.totalRevenue) * 100 : 0;
  const expensePct = previous.totalExpenses > 0 ? (expenseDelta / previous.totalExpenses) * 100 : 0;

  if (current.totalRevenue > 0 || previous.totalRevenue > 0) {
    insights.push(
      `Revenue ${revenueDelta >= 0 ? "increased" : "decreased"} by ${Math.abs(revenuePct).toFixed(1)}% compared to the previous period.`,
    );
  }

  if (current.totalExpenses > 0 || previous.totalExpenses > 0) {
    insights.push(
      `Expenses ${expenseDelta >= 0 ? "increased" : "decreased"} by ${Math.abs(expensePct).toFixed(1)}% compared to the previous period.`,
    );
  }

  const expensePairs: Array<[string, number]> = [
    ["Salary", current.breakdownTotals.salary],
    ["Purchase", current.breakdownTotals.purchase],
    ["Rent", current.breakdownTotals.rent],
    ["Electricity", current.breakdownTotals.electricity],
    ["Maintenance", current.breakdownTotals.maintenance],
    ["Miscellaneous", current.breakdownTotals.miscellaneous],
  ];
  const topExpense = expensePairs.sort((a, b) => b[1] - a[1])[0];
  if (topExpense && current.totalExpenses > 0) {
    insights.push(
      `${topExpense[0]} expenses contribute ${((topExpense[1] / current.totalExpenses) * 100).toFixed(1)}% of total expenses.`,
    );
  }

  if (topService && Number(topService.revenue || 0) > 0) {
    insights.push(
      `${topService.service_name} generated the highest service revenue at ₹${Math.round(Number(topService.revenue || 0)).toLocaleString("en-IN")}.`,
    );
  }

  insights.push(
    `Net profit ${profitDelta >= 0 ? "improved" : "declined"} by ₹${Math.abs(Math.round(profitDelta)).toLocaleString("en-IN")} over the previous period.`,
  );

  return insights;
}

async function buildRangeSummary(
  user: AuthUserPayload,
  selectedLocationId: string | null,
  startDate: string,
  endDate: string,
) {
  const [revenueRows, salaryRows, purchaseRows, manualRows] = await Promise.all([
    getRevenueByDay(user, selectedLocationId, startDate, endDate),
    getDailySalaryExpense(user, selectedLocationId, startDate, endDate),
    getPurchaseExpenseByDay(user, selectedLocationId, startDate, endDate),
    getManualExpenseByDay(user, selectedLocationId, startDate, endDate),
  ]);

  const totals = emptyBreakdown();

  revenueRows.rows.forEach((row) => {
    totals.services += Number(row.services_revenue || 0);
    totals.products += Number(row.products_revenue || 0);
  });
  salaryRows.rows.forEach((row) => {
    totals.salary += Number(row.salary_expense || 0);
  });
  purchaseRows.rows.forEach((row) => {
    totals.purchase += Number(row.purchase_expense || 0);
  });
  manualRows.rows.forEach((row) => {
    totals.rent += Number(row.rent_expense || 0);
    totals.electricity += Number(row.electricity_expense || 0);
    totals.maintenance += Number(row.maintenance_expense || 0);
    totals.miscellaneous += Number(row.miscellaneous_expense || 0);
  });

  const totalRevenue = totals.services + totals.products + totals.otherRevenue;
  const totalExpenses =
    totals.salary +
    totals.purchase +
    totals.rent +
    totals.electricity +
    totals.maintenance +
    totals.miscellaneous;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? roundToTwo((netProfit / totalRevenue) * 100) : 0;

  return {
    totalRevenue: roundToTwo(totalRevenue),
    totalExpenses: roundToTwo(totalExpenses),
    netProfit: roundToTwo(netProfit),
    profitMargin,
    status: getStatus(netProfit),
    breakdownTotals: {
      ...totals,
      services: roundToTwo(totals.services),
      products: roundToTwo(totals.products),
      otherRevenue: roundToTwo(totals.otherRevenue),
      salary: roundToTwo(totals.salary),
      purchase: roundToTwo(totals.purchase),
      rent: roundToTwo(totals.rent),
      electricity: roundToTwo(totals.electricity),
      maintenance: roundToTwo(totals.maintenance),
      miscellaneous: roundToTwo(totals.miscellaneous),
    },
  };
}

export async function getProfitReportRepository(
  user: AuthUserPayload,
  filters: ProfitReportFilters,
): Promise<ProfitReportResult> {
  if (!user.tenant_id) throw createError("Tenant not found.", 400);

  const selectedLocationId = user.type === "manager" ? user.branch_id : normalizeLocationId(filters.locationId);
  const { startDate, endDate, month, year } = resolveDateRange(filters);

  const [revenueRows, salaryRows, purchaseRows, manualRows, branches, topService] = await Promise.all([
    getRevenueByDay(user, selectedLocationId, startDate, endDate),
    getDailySalaryExpense(user, selectedLocationId, startDate, endDate),
    getPurchaseExpenseByDay(user, selectedLocationId, startDate, endDate),
    getManualExpenseByDay(user, selectedLocationId, startDate, endDate),
    getBranchOptions(user.tenant_id),
    getTopRevenueService(user, selectedLocationId, startDate, endDate),
  ]);

  const rowMap = new Map<string, ProfitReportRow>();
  enumerateDates(startDate, endDate).forEach((date) => {
    rowMap.set(date, {
      period: formatPeriodLabel(date),
      period_date: date,
      revenue: 0,
      expenses: 0,
      profit: 0,
      profit_margin: 0,
      status: "break_even",
      breakdown: emptyBreakdown(),
    });
  });

  revenueRows.rows.forEach((row) => {
    const current = rowMap.get(row.period_date);
    if (!current) return;
    current.breakdown.services = roundToTwo(Number(row.services_revenue || 0));
    current.breakdown.products = roundToTwo(Number(row.products_revenue || 0));
  });

  salaryRows.rows.forEach((row) => {
    const current = rowMap.get(row.period_date);
    if (!current) return;
    current.breakdown.salary = roundToTwo(Number(row.salary_expense || 0));
  });

  purchaseRows.rows.forEach((row) => {
    const current = rowMap.get(row.period_date);
    if (!current) return;
    current.breakdown.purchase = roundToTwo(Number(row.purchase_expense || 0));
  });

  manualRows.rows.forEach((row) => {
    const current = rowMap.get(row.period_date);
    if (!current) return;
    current.breakdown.rent = roundToTwo(Number(row.rent_expense || 0));
    current.breakdown.electricity = roundToTwo(Number(row.electricity_expense || 0));
    current.breakdown.maintenance = roundToTwo(Number(row.maintenance_expense || 0));
    current.breakdown.miscellaneous = roundToTwo(Number(row.miscellaneous_expense || 0));
  });

  const allRows = [...rowMap.values()].map((row) => {
    const revenue = row.breakdown.services + row.breakdown.products + row.breakdown.otherRevenue;
    const expenses =
      row.breakdown.salary +
      row.breakdown.purchase +
      row.breakdown.rent +
      row.breakdown.electricity +
      row.breakdown.maintenance +
      row.breakdown.miscellaneous;
    const profit = revenue - expenses;
    return {
      ...row,
      revenue: roundToTwo(revenue),
      expenses: roundToTwo(expenses),
      profit: roundToTwo(profit),
      profit_margin: revenue > 0 ? roundToTwo((profit / revenue) * 100) : 0,
      status: getStatus(profit),
    };
  });

  const summary = allRows.reduce<ProfitSummary>(
    (acc, row) => {
      acc.totalRevenue += row.revenue;
      acc.totalExpenses += row.expenses;
      acc.netProfit += row.profit;
      acc.breakdownTotals.services += row.breakdown.services;
      acc.breakdownTotals.products += row.breakdown.products;
      acc.breakdownTotals.otherRevenue += row.breakdown.otherRevenue;
      acc.breakdownTotals.salary += row.breakdown.salary;
      acc.breakdownTotals.purchase += row.breakdown.purchase;
      acc.breakdownTotals.rent += row.breakdown.rent;
      acc.breakdownTotals.electricity += row.breakdown.electricity;
      acc.breakdownTotals.maintenance += row.breakdown.maintenance;
      acc.breakdownTotals.miscellaneous += row.breakdown.miscellaneous;
      return acc;
    },
    {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      profitMargin: 0,
      status: "break_even",
      breakdownTotals: emptyBreakdown(),
    },
  );

  summary.totalRevenue = roundToTwo(summary.totalRevenue);
  summary.totalExpenses = roundToTwo(summary.totalExpenses);
  summary.netProfit = roundToTwo(summary.netProfit);
  summary.profitMargin = summary.totalRevenue > 0 ? roundToTwo((summary.netProfit / summary.totalRevenue) * 100) : 0;
  summary.status = getStatus(summary.netProfit);
  Object.keys(summary.breakdownTotals).forEach((key) => {
    summary.breakdownTotals[key as keyof ProfitBreakdown] = roundToTwo(
      summary.breakdownTotals[key as keyof ProfitBreakdown],
    );
  });

  const previousRange = getPreviousRange(startDate, endDate);
  const previousSummary = await buildRangeSummary(user, selectedLocationId, previousRange.startDate, previousRange.endDate);
  const insights = buildInsights(summary, previousSummary, topService);

  const searchTerm = String(filters.search || "").trim().toLowerCase();
  const searchedRows = searchTerm
    ? allRows.filter((row) =>
        row.period.toLowerCase().includes(searchTerm) ||
        row.status.replace("_", " ").toLowerCase().includes(searchTerm),
      )
    : allRows;

  const sortableRows = [...searchedRows];
  const sortKey = String(filters.sortKey || "period_date");
  const sortDirection = filters.sortDirection === "asc" ? "asc" : "desc";
  sortableRows.sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const valueA = a[sortKey as keyof ProfitReportRow];
    const valueB = b[sortKey as keyof ProfitReportRow];

    if (typeof valueA === "number" && typeof valueB === "number") {
      return (valueA - valueB) * direction;
    }
    return String(valueA).localeCompare(String(valueB)) * direction;
  });

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.max(1, Math.min(100, Number(filters.limit || 10)));
  const totalCount = sortableRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const startIndex = (page - 1) * limit;
  const rows = sortableRows.slice(startIndex, startIndex + limit);

  return {
    summary,
    rows,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
    filterMeta: {
      branches,
    },
    insights,
    appliedFilters: {
      startDate,
      endDate,
      month,
      year,
      locationId: selectedLocationId,
    },
  };
}
