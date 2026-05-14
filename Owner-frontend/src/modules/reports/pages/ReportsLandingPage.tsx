import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  MapPin,
  Package,
  Scissors,
  Sparkles,
  TrendingUp,
  Trophy,
  UserSquare2,
  Users,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  fetchReportsSummary,
  fetchSalesReport,
  fetchServiceReport,
  fetchStaffReport,
} from "../../../core/api";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportCard } from "../components/ReportCard";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";


type OverviewSummary = {
  revenue: number;
  salesCount: number;
  customerCount: number;
  insights?: {
    topPerformer?: { name: string; revenue: number | string; services_count: number | string };
    topBranch?: { name: string; revenue: number | string };
    mostProfitableService?: { name: string; profit: number | string };
    mostRequestedService?: { name: string; bookings_count: number | string };
    highestRevenueDay?: { day_name: string; day_revenue: number | string };
  };
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


export function ReportsLandingPage() {
  const { theme } = useDashboardTheme();
  const { filters: globalFilters } = useGlobalFilters();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [salesData, setSalesData] = useState<SalesOverview | null>(null);
  const [staffData, setStaffData] = useState<StaffOverview | null>(null);
  const [serviceData, setServiceData] = useState<ServiceOverview | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    const loadOverview = async (showLoader = true) => {
      if (showLoader && mounted) {
        setLoading(true);
      }

      try {
        const fetchParams = {
          startDate: globalFilters.startDate,
          endDate: globalFilters.endDate,
          locationId: globalFilters.locationId === "all" ? undefined : globalFilters.locationId
        };
        const [summaryRes, salesRes, staffRes, serviceRes] = await Promise.all([
          fetchReportsSummary(fetchParams),
          fetchSalesReport({ ...fetchParams, paymentMethod: globalFilters.paymentMethod, page: 1, limit: 20, interval: "daily" }),
          fetchStaffReport(fetchParams),
          fetchServiceReport(fetchParams),
        ]);

        if (!mounted) return;

        setSummary(summaryRes.data);
        setSalesData(salesRes.data);
        setStaffData(staffRes.data);
        setServiceData(serviceRes.data);
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
  }, [globalFilters.locationId, globalFilters.startDate, globalFilters.endDate, globalFilters.paymentMethod]);

  const staffPerformance = staffData?.staffPerformance ?? [];
  const servicePerformance = serviceData?.servicePerformance ?? [];
  const salesTrends = salesData?.trends ?? [];

  const activeStaff = staffPerformance.filter(
    (item) => Number(item.services_count || 0) > 0 || Number(item.revenue || 0) > 0,
  );
  const activeStaffCount = activeStaff.length;
  const totalStaffCount = staffPerformance.length;
  const topService = servicePerformance[0];

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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Reports & Analytics</h1>
        <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Analyze your business performance and track growth.</p>
      </div>

      <FiltersBar />

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

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Insight Card 1: Top Performer (Common) */}
        <InsightCard
          isDark={isDark}
          loading={loading}
          icon={<Trophy className="text-orange-400" size={18} />}
          title="Top Performer"
          primaryValue={summary?.insights?.topPerformer?.name || "No Data"}
          secondaryValue={
            summary?.insights?.topPerformer
              ? `${formatCurrency(summary.insights.topPerformer.revenue)} • ${summary.insights.topPerformer.services_count} services`
              : "No activity recorded"
          }
          footer="Staff performance visibility"
          link="/dashboard/reports/staff"
        />

        {/* Insight Card 2: Top Branch (Owner) or Most Requested (Manager) */}
        {user?.role === "OWNER" || user?.role === "INDEPENDENT_OWNER" ? (
          <InsightCard
            isDark={isDark}
            loading={loading}
            icon={<MapPin className="text-blue-400" size={18} />}
            title="Top Branch"
            primaryValue={summary?.insights?.topBranch?.name || "No Data"}
            secondaryValue={
              summary?.insights?.topBranch
                ? `${formatCurrency(summary.insights.topBranch.revenue)} generated this period`
                : "Awaiting multi-branch data"
            }
            footer="Branch growth visibility"
            link="/dashboard/reports/sales"
          />
        ) : (
          <InsightCard
            isDark={isDark}
            loading={loading}
            icon={<Sparkles className="text-purple-400" size={18} />}
            title="Most Requested Service"
            primaryValue={summary?.insights?.mostRequestedService?.name || "No Data"}
            secondaryValue={
              summary?.insights?.mostRequestedService
                ? `${summary.insights.mostRequestedService.bookings_count} bookings completed`
                : "Service demand visibility"
            }
            footer="Staffing optimization insight"
            link="/dashboard/reports/services"
          />
        )}

        {/* Insight Card 3: Profitable Service (Owner) or Peak Day (Manager) */}
        {user?.role === "OWNER" || user?.role === "INDEPENDENT_OWNER" ? (
          <InsightCard
            isDark={isDark}
            loading={loading}
            icon={<TrendingUp className="text-emerald-400" size={18} />}
            title="Most Profitable Service"
            primaryValue={summary?.insights?.mostProfitableService?.name || "No Data"}
            secondaryValue={
              summary?.insights?.mostProfitableService
                ? `${formatCurrency(summary.insights.mostProfitableService.profit)} net profit`
                : "Profitability visibility"
            }
            footer="Business strategy insight"
            link="/dashboard/reports/services"
          />
        ) : (
          <InsightCard
            isDark={isDark}
            loading={loading}
            icon={<CalendarDays className="text-indigo-400" size={18} />}
            title="Highest Revenue Day"
            primaryValue={summary?.insights?.highestRevenueDay?.day_name || "No Data"}
            secondaryValue={
              summary?.insights?.highestRevenueDay
                ? `${formatCurrency(summary.insights.highestRevenueDay.day_revenue)} generated`
                : "Peak business visibility"
            }
            footer="Operational optimization"
            link="/dashboard/reports/sales"
          />
        )}
      </div>

      <h2 className={`pt-2 text-xl font-semibold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Detailed Reports</h2>

      <div className="grid gap-3 sm:gap-5 grid-cols-2 lg:grid-cols-3">
        <ReportCard
          title="Billing Report"
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
        <ReportCard
          title="Purchase Report"
          description="Track vendor purchases, product-level costs, stock additions, and payment status."
          icon={<ShoppingBag />}
          to="/dashboard/reports/purchases"
        />
      </div>
    </div>
  );
}
function InsightCard({
  isDark,
  loading,
  icon,
  title,
  primaryValue,
  secondaryValue,
  footer,
  link,
}: {
  isDark: boolean;
  loading: boolean;
  icon: React.ReactNode;
  title: string;
  primaryValue: string;
  secondaryValue: string;
  footer: string;
  link: string;
}) {
  return (
    <div
      className={`group flex flex-col justify-between overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${
        isDark
          ? "bg-[#151821] border-white/5 shadow-2xl"
          : "bg-white border-[#F0EBE3] shadow-sm"
      }`}
    >
      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                isDark ? "bg-white/5" : "bg-[#FAF7F3]"
              }`}
            >
              {icon}
            </div>
            <span
              className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
                isDark ? "text-[#7A7572]" : "text-[#9A8D80]"
              }`}
            >
              {title}
            </span>
          </div>
          <Link
            to={link}
            className={`opacity-0 transition-all group-hover:opacity-100 ${
              isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"
            }`}
          >
            <ChevronRight size={18} />
          </Link>
        </div>

        <div className="space-y-1.5">
          <div
            className={`truncate text-2xl font-bold tracking-tight ${
              isDark ? "text-[#F0EBE3]" : "text-[#111827]"
            }`}
          >
            {loading ? <div className="h-8 w-24 animate-pulse rounded bg-gray-200/20" /> : primaryValue}
          </div>
          <div
            className={`text-sm font-medium ${
              isDark ? "text-[#A69F97]" : "text-[#6B7280]"
            }`}
          >
            {loading ? <div className="mt-2 h-4 w-40 animate-pulse rounded bg-gray-200/20" /> : secondaryValue}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-5 border-t border-dashed border-white/5">
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-semibold uppercase tracking-widest ${
              isDark ? "text-[#4A4744]" : "text-[#B5A99D]"
            }`}
          >
            {footer}
          </span>
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              isDark ? "bg-[#C9A96E]/50" : "bg-[#8B5E3C]/30"
            }`}
          />
        </div>
      </div>

      {/* Decorative gradient background elements */}
      <div
        className={`absolute -right-8 -top-8 h-32 w-32 rounded-full blur-[60px] transition-opacity duration-500 group-hover:opacity-40 ${
          isDark ? "bg-[#C9A96E]/10" : "bg-[#8B5E3C]/5"
        }`}
      />
    </div>
  );
}
