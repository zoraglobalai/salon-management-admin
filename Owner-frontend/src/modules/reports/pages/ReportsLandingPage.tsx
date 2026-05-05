import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  Package,
  Scissors,
  TrendingUp,
  UserSquare2,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchInventoryReport,
  fetchReportsSummary,
  fetchSalesReport,
  fetchServiceReport,
  fetchStaffReport,
} from "../../../core/api";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportCard } from "../components/ReportCard";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";

type OverviewFilters = {
  startDate: string;
  endDate: string;
  locationId: string;
};

type OverviewSummary = {
  revenue: number;
  salesCount: number;
  customerCount: number;
};

type SalesTrendPoint = {
  date: string;
  revenue: string | number;
  sales_count: string | number;
};

type SalesOverview = {
  summary?: {
    total_revenue: string | number;
    total_sales: string | number;
    avg_order_value: string | number;
  };
  trends?: SalesTrendPoint[];
};

type StaffPerformance = {
  staff_id: string;
  staff_name: string;
  services_count: number | string;
  revenue: number | string;
};

type StaffOverview = {
  staffPerformance?: StaffPerformance[];
};

type ServicePerformance = {
  service_id: string;
  service_name: string;
  usage_count: number | string;
  revenue: number | string;
};

type ServiceOverview = {
  servicePerformance?: ServicePerformance[];
};

type InventoryOverview = {
  summary?: {
    lowStockCount: number | string;
    fastMovingProduct: string;
    totalProductRevenue: number | string;
    productsSoldToday: number | string;
  };
  insights?: {
    lowStockAlerts?: Array<{ name: string; stock: number | string }>;
  };
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number | string | undefined) {
  return `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function growthFromValues(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function buildSuggestion(input: {
  revenueGrowth: number;
  lowStockCount: number;
  activeStaffCount: number;
  topServiceName: string;
}) {
  if (input.lowStockCount > 0) {
    return `Restock flagged items before ${input.topServiceName} demand slips.`;
  }

  if (input.revenueGrowth < 0) {
    return `Revenue softened this period. Push ${input.topServiceName} bundles or reactivate recent clients.`;
  }

  if (input.activeStaffCount <= 1) {
    return "Team activity is concentrated. Rebalance bookings to reduce dependency on one staff member.";
  }

  return `Momentum is healthy. Double down on ${input.topServiceName} and protect your best-performing slots.`;
}


export function ReportsLandingPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [filters, setFilters] = useState<OverviewFilters>({
    startDate: formatLocalDate(new Date()),
    endDate: formatLocalDate(new Date()),
    locationId: "all",
  });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [salesData, setSalesData] = useState<SalesOverview | null>(null);
  const [staffData, setStaffData] = useState<StaffOverview | null>(null);
  const [serviceData, setServiceData] = useState<ServiceOverview | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryOverview | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadOverview = async (showLoader = true) => {
      if (showLoader && mounted) {
        setLoading(true);
      }

      try {
        const [summaryRes, salesRes, staffRes, serviceRes, inventoryRes] = await Promise.all([
          fetchReportsSummary(filters),
          fetchSalesReport({ ...filters, paymentMethod: "all", page: 1, limit: 20, interval: "daily" }),
          fetchStaffReport(filters),
          fetchServiceReport(filters),
          fetchInventoryReport({ locationId: filters.locationId }),
        ]);

        if (!mounted) return;

        setSummary(summaryRes.data);
        setSalesData(salesRes.data);
        setStaffData(staffRes.data);
        setServiceData(serviceRes.data);
        setInventoryData(inventoryRes.data);
      } catch (error) {
        console.error("Failed to load reports overview:", error);
      } finally {
        if (showLoader && mounted) {
          setLoading(false);
        }
      }
    };

    void loadOverview();
    const timer = window.setInterval(() => {
      void loadOverview(false);
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [filters]);

  const staffPerformance = staffData?.staffPerformance ?? [];
  const servicePerformance = serviceData?.servicePerformance ?? [];
  const salesTrends = salesData?.trends ?? [];

  const topStaff = staffPerformance[0];
  const activeStaff = staffPerformance.filter(
    (item) => Number(item.services_count || 0) > 0 || Number(item.revenue || 0) > 0,
  );
  const activeStaffCount = activeStaff.length;
  const totalStaffCount = staffPerformance.length;
  const topService = servicePerformance[0];
  const lowStockCount = Number(inventoryData?.summary?.lowStockCount || 0);

  const currentTrendPoint = salesTrends[salesTrends.length - 1];
  const previousTrendPoint = salesTrends[salesTrends.length - 2];
  const revenueGrowth = growthFromValues(
    Number(currentTrendPoint?.revenue || summary?.revenue || 0),
    Number(previousTrendPoint?.revenue || 0),
  );
  const averageTicket = Number(salesData?.summary?.avg_order_value || 0);
  const bookingTrend = growthFromValues(
    Number(currentTrendPoint?.sales_count || 0),
    Number(previousTrendPoint?.sales_count || 0),
  );
  const suggestion = buildSuggestion({
    revenueGrowth,
    lowStockCount,
    activeStaffCount,
    topServiceName: topService?.service_name || "your top service",
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className={`text-2xl font-bold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Reports & Analytics</h1>
        <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Analyze your business performance and track growth.</p>
      </div>

      <FiltersBar
        onFilterChange={(f) =>
          setFilters({
            startDate: f.startDate ?? formatLocalDate(new Date()),
            endDate: f.endDate ?? formatLocalDate(new Date()),
            locationId: f.locationId,
          })
        }
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={loading ? "..." : formatCurrency(summary?.revenue)}
          comparisonValue={loading ? "--" : `${summary?.salesCount || 0}`}
          comparisonLabel="sales in selected period"
          trend={revenueGrowth >= 0 ? "up" : "down"}
        />
        <SummaryCard
          title="Total Sales"
          value={loading ? "..." : (summary?.salesCount || 0).toString()}
          comparisonValue={loading ? "--" : formatPercent(bookingTrend)}
          comparisonLabel="vs previous trend point"
          trend={bookingTrend >= 0 ? "up" : "down"}
        />
        <SummaryCard
          title="Total Customers"
          value={loading ? "..." : (summary?.customerCount || 0).toString()}
          comparisonValue={loading ? "--" : `${activeStaffCount}/${Math.max(totalStaffCount, 1)} staff active`}
          comparisonLabel="team coverage"
          trend="neutral"
        />
        <SummaryCard
          title="Avg Order Value"
          value={loading ? "..." : formatCurrency(averageTicket)}
          comparisonValue={loading ? "--" : topService?.service_name || "No top service yet"}
          comparisonLabel="current top driver"
          trend="neutral"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className={`flex flex-col justify-between rounded-[22px] p-5 text-white shadow-xl transition-all ${
          isDark 
            ? "bg-[linear-gradient(135deg,#A67C3D_0%,#4E2D1B_100%)]" 
            : "bg-[linear-gradient(135deg,#8B5E3C_0%,#4E2D1B_100%)]"
        }`}>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                <TrendingUp size={20} className="text-white" />
              </div>
              <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Top Performer</h3>
            </div>
            <h2 className="text-[2.2rem] font-bold leading-tight tracking-tight">
              {loading ? "..." : topStaff?.staff_name || topService?.service_name || "No performer yet"}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/80">
              {topStaff 
                ? `Generated ${formatCurrency(topStaff.revenue)} across ${topStaff.services_count} services this period.` 
                : "Waiting for more activity data."}
            </p>
          </div>

          <div className="mt-8">
            <div className="mb-4 h-px w-full bg-white/10" />
            <Link
              to="/dashboard/reports/staff"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 transition hover:text-white"
            >
              <span>View leaderboard</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <div className={`flex flex-col justify-between rounded-[22px] border p-5 transition-all ${
          isDark 
            ? "bg-[#151821] border-[rgba(255,255,255,0.07)] shadow-lg" 
            : "bg-white border-[#E8E1D8] shadow-sm"
        }`}>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? "bg-[#1C2030] text-[#C9A96E]" : "bg-[#FAF7F3] text-[#8B5E3C]"}`}>
                <UserSquare2 size={20} />
              </div>
              <h3 className={`text-sm font-medium uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-[#9A8D80]"}`}>Team Productivity</h3>
            </div>
            <h2 className={`text-[2.2rem] font-bold leading-tight tracking-tight ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
              {loading ? "..." : `${totalStaffCount ? Math.round((activeStaffCount / totalStaffCount) * 100) : 0}% Utilization`}
            </h2>
            <p className={`mt-3 text-[15px] leading-relaxed ${isDark ? "text-[#C8BFB4]" : "text-[#4B5563]"}`}>
              {loading ? "..." : `${activeStaffCount} out of ${totalStaffCount} staff members are actively handling services today.`}
            </p>
          </div>

          <div className={`mt-8 rounded-[18px] p-4 ${isDark ? "bg-[#1C2030]" : "bg-[#FAF7F3]"}`}>
            <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${isDark ? "text-[#4A4744]" : "text-[#9A8D80]"}`}>Recommendation</p>
            <p className={`mt-2 text-[13px] leading-relaxed ${isDark ? "text-[#C8BFB4]" : "text-[#4B5563]"}`}>
              Redistribute walk-ins to underbooked staff to maximize throughput.
            </p>
          </div>
        </div>

        <div className={`flex flex-col justify-between rounded-[22px] border p-5 transition-all ${
          isDark 
            ? "bg-[#151821] border-[rgba(255,255,255,0.07)] shadow-lg" 
            : "bg-[#FFFDFB] border-[#F1D8CC] shadow-sm"
        }`}>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? "bg-[#1C2030] text-[#FBBF24]" : "bg-[#FEF9F0] text-[#D97706]"}`}>
                <BarChart3 size={20} />
              </div>
              <h3 className={`text-sm font-medium uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-[#9A8D80]"}`}>Business Health</h3>
            </div>
            <h2 className={`text-[2.2rem] font-bold leading-tight tracking-tight ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
              {loading ? "..." : revenueGrowth >= 0 ? "Revenue is trending up" : "Revenue needs focus"}
            </h2>
            <p className={`mt-3 text-[15px] leading-relaxed ${isDark ? "text-[#C8BFB4]" : "text-[#4B5563]"}`}>
              {loading ? "..." : `Your revenue ${revenueGrowth >= 0 ? "grew" : "dipped"} by ${Math.abs(revenueGrowth).toFixed(1)}% compared to the previous period.`}
            </p>
          </div>

          <div className="mt-8">
            <div className={`rounded-[18px] border p-4 transition-all ${isDark ? "bg-[#1C2030] border-white/5" : "bg-white border-[#F1D8CC]"}`}>
              <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${isDark ? "text-[#4A4744]" : "text-[#9A8D80]"}`}>Strategy</p>
              <p className={`mt-2 text-[13px] leading-relaxed ${isDark ? "text-[#C8BFB4]" : "text-[#4B5563]"}`}>
                {loading ? "..." : suggestion}
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Link
                to="/dashboard/reports/sales"
                className={`flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
                  isDark ? "bg-[#C9A96E] text-[#0F1115]" : "bg-[#8B5E3C] text-white"
                }`}
              >
                Deep Dive
              </Link>
              <Link
                to="/dashboard/reports/inventory"
                className={`flex-1 rounded-xl border py-2.5 text-center text-sm font-semibold transition-all ${
                  isDark ? "border-white/10 text-white/70" : "border-[#E6D6C8] text-[#8B5E3C]"
                }`}
              >
                Stock Alerts
              </Link>
            </div>
          </div>
        </div>
      </div>

      <h2 className={`pt-2 text-xl font-semibold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Detailed Reports</h2>

      <div className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-3">
        <ReportCard
          title="Sales Report"
          description="Track daily revenue, payment methods, and transaction history across all branches."
          icon={<BarChart3 />}
          to="/dashboard/reports/sales"
        />
        <ReportCard
          title="Customer Report"
          description="Analyze customer retention, new vs returning ratios, and top clients."
          icon={<Users />}
          to="/dashboard/reports/customers"
        />
        <ReportCard
          title="Service Report"
          description="View performance by service category to see what's driving revenue."
          icon={<Scissors />}
          to="/dashboard/reports/services"
        />
        <ReportCard
          title="Staff Report"
          description="Monitor staff productivity, commissions, and individual rankings."
          icon={<UserSquare2 />}
          to="/dashboard/reports/staff"
        />
        <ReportCard
          title="Inventory Report"
          description="Keep track of product sales, usage, and monitor low stock items."
          icon={<Package />}
          to="/dashboard/reports/inventory"
        />
      </div>
    </div>
  );
}

