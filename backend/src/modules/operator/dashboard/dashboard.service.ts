import { query } from "../../../database/pool";
import type { AuthUserPayload } from "../../../shared/types/auth";
import { buildTenantScope } from "../../../shared/utils/tenantScope";

function toNumber(value: unknown) {
  return Number(value || 0);
}

type MetricRow = Record<string, string | number | null>;

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
