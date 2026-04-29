import { useEffect, useState } from "react";
import { fetchDashboardSummary } from "../../../core/api";
import type { DashboardSummaryResponse } from "../../../core/types";
import { MetricCard } from "../../../shared/components/MetricCard";
import { SectionCard } from "../../../shared/components/SectionCard";

function formatCurrency(value: number | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function DashboardStateCard({ message }: { message: string }) {
  return (
    <SectionCard title="Business Snapshot" hint="Auto-refresh every 5 seconds">
      <div className="dashboard-empty-card">{message}</div>
    </SectionCard>
  );
}

function normalizeSummary(summary: DashboardSummaryResponse | null): DashboardSummaryResponse | null {
  if (!summary) return null;

  return {
    ...summary,
    totals: {
      totalSales: summary?.totals?.totalSales ?? 0,
      revenue: summary?.totals?.revenue ?? 0,
      clients: summary?.totals?.clients ?? 0,
      payments: summary?.totals?.payments ?? 0,
    },
    today: {
      sales: summary?.today?.sales ?? 0,
      revenue: summary?.today?.revenue ?? 0,
      clients: summary?.today?.clients ?? 0,
      payments: summary?.today?.payments ?? 0,
    },
    trend: summary?.trend ?? [],
    topServices: summary?.topServices ?? [],
    recentSales: summary?.recentSales ?? [],
    branches: summary?.branches ?? [],
  };
}

export function DashboardSummary() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      try {
        const response = await fetchDashboardSummary();
        if (!mounted) return;
        setSummary(normalizeSummary(response));
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSummary();
    const intervalId = window.setInterval(() => {
      void loadSummary();
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const totals = summary?.totals;
  const today = summary?.today;
  const trend = summary?.trend ?? [];
  const topServices = summary?.topServices ?? [];
  const recentSales = summary?.recentSales ?? [];
  const branches = summary?.branches ?? [];
  const branchCount = summary?.branchCount ?? 0;
  const isManager = summary?.role === "manager";
  const showBranchComparison = summary?.role === "owner" && branchCount > 1;
  const managerBranch = branches?.[0];
  const maxTrendRevenue = Math.max(...trend.map((item) => item?.revenue ?? 0), 1);

  const cards = [
    { label: "Sales", value: `${totals?.totalSales ?? 0}` },
    { label: "Revenue", value: formatCurrency(totals?.revenue) },
    { label: "Clients", value: `${totals?.clients ?? 0}` },
  ];

  return (
    <div className="dashboard-summary-shell">
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {cards.map((card, index) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={index === 1 ? "accent" : "default"}
          />
        ))}
      </div>

      {isLoading ? <DashboardStateCard message="Loading live business metrics..." /> : null}
      {!isLoading && error ? <DashboardStateCard message={error} /> : null}

      {!isLoading && !error ? (
        <div className="dashboard-summary-grid">
          <SectionCard title="Today Activity" hint="What changed today">
            <div className="dashboard-mini-grid">
              <div className="dashboard-stat-tile">
                <span>Sales</span>
                <strong>{today?.sales ?? 0}</strong>
              </div>
              <div className="dashboard-stat-tile">
                <span>Revenue</span>
                <strong>{formatCurrency(today?.revenue)}</strong>
              </div>
              <div className="dashboard-stat-tile">
                <span>Clients</span>
                <strong>{today?.clients ?? 0}</strong>
              </div>
              <div className="dashboard-stat-tile">
                <span>Payments</span>
                <strong>{formatCurrency(today?.payments)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Sales Trend" hint="Last 7 days">
            <div className="dashboard-trend-chart">
              {trend?.map((point) => {
                const height = Math.max(14, Math.round(((point?.revenue ?? 0) / maxTrendRevenue) * 100));
                return (
                  <div key={point?.day} className="dashboard-trend-bar">
                    <span className="dashboard-trend-value">{formatCurrency(point?.revenue)}</span>
                    <div className="dashboard-trend-track">
                      <div className="dashboard-trend-fill" style={{ height: `${height}%` }} />
                    </div>
                    <strong>{point?.day ?? "--"}</strong>
                    <small>{point?.sales ?? 0} sales</small>
                  </div>
                );
              }) ?? null}
            </div>
          </SectionCard>

          <SectionCard title="Top Services" hint="Best performing services">
            <div className="dashboard-service-stack">
              {topServices?.length ? (
                topServices.map((service, index) => (
                  <div key={`${service?.serviceName}-${index}`} className="dashboard-service-row">
                    <div>
                      <strong>{service?.serviceName ?? "Unnamed service"}</strong>
                      <span>{service?.salesCount ?? 0} bookings</span>
                    </div>
                    <b>{formatCurrency(service?.revenue)}</b>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty-inline">No service sales yet.</div>
              )}
            </div>
          </SectionCard>

          {!showBranchComparison ? (
            <>
              {isManager && managerBranch ? (
                <SectionCard title="Your Branch" hint="Manager view">
                  <div className="dashboard-highlight-panel">
                    <h3>{managerBranch?.branchName ?? "Assigned branch"}</h3>
                    <div className="dashboard-highlight-metrics">
                      <div>
                        <span>Sales</span>
                        <strong>{managerBranch?.totalSales ?? 0}</strong>
                      </div>
                      <div>
                        <span>Revenue</span>
                        <strong>{formatCurrency(managerBranch?.revenue)}</strong>
                      </div>
                      <div>
                        <span>Clients</span>
                        <strong>{managerBranch?.clients ?? 0}</strong>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              <SectionCard title="Recent Sales" hint="Last 5 completed bills">
                <div className="dashboard-recent-stack">
                  {recentSales?.length ? (
                    recentSales.map((sale) => (
                      <div key={sale?.id} className="dashboard-recent-row">
                        <div>
                          <strong>{sale?.clientName ?? "Walk-in Client"}</strong>
                          <span>{sale?.paymentMethod ?? "Unknown"} • {formatTime(sale?.createdAt)}</span>
                        </div>
                        <b>{formatCurrency(sale?.totalAmount)}</b>
                      </div>
                    ))
                  ) : (
                    <div className="dashboard-empty-inline">No recent sales yet.</div>
                  )}
                </div>
              </SectionCard>
            </>
          ) : null}

          {showBranchComparison ? (
            <SectionCard title="Branch Comparison" hint="Multi-branch owner overview">
              <div className="dashboard-comparison-chart">
                {branches?.map((branch) => {
                  const width = Math.max(
                    12,
                    Math.round(((branch?.revenue ?? 0) / Math.max(...branches.map((item) => item?.revenue ?? 0), 1)) * 100),
                  );

                  return (
                    <div key={branch?.branchId} className="dashboard-comparison-row">
                      <div className="dashboard-comparison-head">
                        <div>
                          <strong>{branch?.branchName ?? "Branch"}</strong>
                          <span>{branch?.totalSales ?? 0} sales • {branch?.clients ?? 0} clients</span>
                        </div>
                        <b>{formatCurrency(branch?.revenue)}</b>
                      </div>
                      <div className="dashboard-comparison-track">
                        <div className="dashboard-comparison-fill" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                }) ?? null}
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
