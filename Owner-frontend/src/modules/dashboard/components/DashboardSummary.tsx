import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  IndianRupee,
  MapPin,
  RotateCcw,
  Scissors,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { fetchDashboardSummary } from "../../../core/api";
import type { DashboardSummaryResponse } from "../../../core/types";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type OutletContext = {
  ownerLocations?: Array<{ id: string; name: string; city?: string }>;
};

type SummaryBranch = DashboardSummaryResponse["branches"][number];

type SummaryPaymentMethod = {
  paymentMethod: string;
  amount: number;
  count: number;
};

type TrendRange = "7d" | "month" | "prev_month";

function formatCurrency(value: number | undefined) {
  return `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactCurrency(value: number | undefined) {
  return `\u20B9${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function computeGrowth(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function normalizeSummary(summary: DashboardSummaryResponse | null): DashboardSummaryResponse | null {
  if (!summary) return null;

  return {
    ...summary,
    totals: {
      totalSales: summary.totals?.totalSales ?? 0,
      revenue: summary.totals?.revenue ?? 0,
      clients: summary.totals?.clients ?? 0,
      payments: summary.totals?.payments ?? 0,
      avgOrderValue: summary.totals?.avgOrderValue ?? 0,
    },
    today: {
      sales: summary.today?.sales ?? 0,
      revenue: summary.today?.revenue ?? 0,
      clients: summary.today?.clients ?? 0,
      payments: summary.today?.payments ?? 0,
    },
    yesterday: {
      sales: summary.yesterday?.sales ?? 0,
      revenue: summary.yesterday?.revenue ?? 0,
      clients: summary.yesterday?.clients ?? 0,
      avgOrderValue: summary.yesterday?.avgOrderValue ?? 0,
    },
    trend: summary.trend ?? [],
    topServices: summary.topServices ?? [],
    recentSales: summary.recentSales ?? [],
    paymentMethods: summary.paymentMethods ?? [],
    todayStatus: {
      completed: summary.todayStatus?.completed ?? 0,
      pending: summary.todayStatus?.pending ?? 0,
      cancelled: summary.todayStatus?.cancelled ?? 0,
    },
    branches: summary.branches ?? [],
  };
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getLocationLabel(location?: { name: string; city?: string }) {
  if (!location) return "All Branches";
  return location.name || location.city || "Branch";
}
function buildNotifications(input: {
  branchName: string;
  selectedDateLabel: string;
  todayStatus: DashboardSummaryResponse["todayStatus"];
  paymentTotal: number;
  topServiceName?: string;
}) {
  const items = [
    {
      id: "sales",
      title: `${input.todayStatus.completed} appointments completed`,
      description: `Performance summary for ${input.selectedDateLabel} at ${input.branchName}.`,
    },
    {
      id: "payments",
      title: `${formatCompactCurrency(input.paymentTotal)} collected`,
      description: "Payments are synced across the dashboard totals and reports.",
    },
  ];

  if (input.topServiceName) {
    items.push({
      id: "service",
      title: `${input.topServiceName} is leading today`,
      description: "Top services are ranked by completed sales for the selected date.",
    });
  }

  return items;
}


function DashboardCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  return (
    <section
      className={`rounded-[24px] border transition-all duration-200 ${
        isDark
          ? "border-[rgba(255,255,255,0.07)] bg-[#151821] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_8px_28px_rgba(0,0,0,0.3)]"
          : "border-[#efe4d9] bg-white shadow-[0_10px_30px_rgba(84,62,45,0.06)]"
      } ${className}`}
    >
      {children}
    </section>
  );
}

function ToolbarChip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`relative inline-flex h-10 items-center gap-2 rounded-[14px] border px-3.5 text-[13px] font-medium transition-all ${
        isDark
          ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#C8BFB4] shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          : "border-[#eadfd4] bg-white px-3.5 text-[13px] font-medium text-[#2b241e] shadow-[0_8px_20px_rgba(84,62,45,0.05)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function KpiCard(props: {
  title: string;
  value: string;
  growth: number;
  subtext: string;
  icon: React.ReactNode;
  iconBg: string;
  isDark?: boolean;
}) {
  return (
    <DashboardCard className="rounded-[18px] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] sm:text-[13px] font-medium leading-none ${props.isDark ? "text-[#7A7572]" : "text-[#685e56]"}`}>{props.title}</p>
          <h3 className={`mt-2.5 text-[1.25rem] sm:text-[1.7rem] font-semibold leading-none tracking-[-0.04em] ${props.isDark ? "text-[#F0EBE3]" : "text-[#1a1715]"}`}>{props.value}</h3>
          <p className={`mt-2 text-[10px] sm:text-[12px] truncate ${props.isDark ? "text-[#4A4744]" : "text-[#8a7e74]"}`}>{props.subtext}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:gap-3">
          <div
            className={`inline-flex items-center gap-1 text-[10px] sm:text-[12px] font-medium ${
              props.growth >= 0 
                ? (props.isDark ? "text-[#4ADE80]" : "text-[#30955a]") 
                : (props.isDark ? "text-[#F87171]" : "text-[#d14343]")
            }`}
          >
            <ArrowUpRight size={12} className={props.growth < 0 ? "rotate-90" : ""} />
            <span>{formatPercent(props.growth)}</span>
          </div>
          <div className={`grid h-8 w-8 sm:h-11 sm:w-11 place-items-center rounded-[12px] sm:rounded-[14px] ${props.iconBg}`}>{props.icon}</div>
        </div>
      </div>
    </DashboardCard>
  );
}

function LineAreaChart({
  trend,
  trendRange,
  onTrendRangeChange,
  isDark,
}: {
  trend: DashboardSummaryResponse["trend"];
  trendRange: TrendRange;
  onTrendRangeChange: (value: TrendRange) => void;
  isDark: boolean;
}) {
  const points = Array.isArray(trend) ? trend : [];
  const totalRevenue = points.reduce((sum, item) => sum + (item.revenue || 0), 0);

  // Custom formatting for currency values in axis
  const formatYAxis = (value: number) => {
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  const chartColor = isDark ? "#C9A96E" : "#8B4E24";
  const gridColor = isDark ? "rgba(255,255,255,0.04)" : "#EFE1D5";
  const labelColor = isDark ? "#7A7572" : "#8A7E74";

  return (
    <div className="h-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={`text-[1.5rem] font-semibold tracking-[-0.04em] ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>Revenue Overview</h3>
          <p className={`mt-3 text-[2rem] font-semibold leading-none tracking-[-0.04em] ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>
            {formatCurrency(totalRevenue)}
          </p>
          <p className={`mt-2 text-[13px] ${isDark ? "text-[#7A7572]" : "text-[#8a7e74]"}`}>Total Revenue</p>
        </div>
        <label className="relative">
          <select
            value={trendRange}
            onChange={(event) => onTrendRangeChange(event.target.value as TrendRange)}
            className={`inline-flex h-9 appearance-none items-center justify-between rounded-[12px] border px-4 pr-10 text-[13px] outline-none transition-all ${
              isDark
                ? "border-[rgba(255,255,255,0.1)] bg-[#1C2030] text-[#C8BFB4] focus:border-[#C9A96E] [color-scheme:dark]"
                : "border-[#eadfd4] bg-[#fbf7f3] text-[#2A2A32] [color-scheme:light]"
            }`}
            aria-label="Select revenue chart range"
          >
            <option value="7d">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="prev_month">Previous Month</option>
          </select>
          <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-2.5 ${isDark ? "text-[#C9A96E]" : "text-[#5A5049]"}`} />
        </label>
      </div>

      <div className={`h-[240px] w-full rounded-[20px] transition-all p-2 ${
        isDark
          ? "bg-[#0F1115]"
          : "bg-white"
      }`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke={gridColor} 
            />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: labelColor, fontSize: 11, fontWeight: 500 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: labelColor, fontSize: 11, fontWeight: 500 }}
              tickFormatter={formatYAxis}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? "#1C2030" : "#FFF", 
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "#EADFD4",
                borderRadius: "12px",
                fontSize: "12px",
                color: isDark ? "#F0EBE3" : "#17181F"
              }}
              formatter={(value: any) => [formatCurrency(Number(value || 0)), "Revenue"]}
              labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={chartColor}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 168,
  innerClassName = "",
  isDark,
}: {
  segments: Array<{ value: number; color: string }>;
  centerValue: string;
  centerLabel: string;
  size?: number;
  innerClassName?: string;
  isDark: boolean;
}) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const total = safeSegments.reduce((sum, segment) => sum + segment.value, 0);
  let current = 0;
  const gradient = safeSegments
    .map((segment) => {
      const start = total ? (current / total) * 100 : 0;
      current += segment.value;
      const end = total ? (current / total) * 100 : start;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div
      className="relative grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${gradient || (isDark ? "rgba(255,255,255,0.05)" : "#E5E7EB")})`,
      }}
    >
      <div
        className={`grid h-[68%] w-[68%] place-items-center rounded-full text-center transition-all ${
          isDark 
            ? "bg-[#1C2030] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" 
            : "bg-white shadow-[inset_0_0_0_1px_rgba(229,231,235,0.8)]"
        } ${innerClassName}`}
      >
        <div>
          <p className={`text-[20px] font-semibold leading-none tracking-[-0.03em] ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>{centerValue}</p>
          <p className={`mt-1 text-[12px] ${isDark ? "text-[#7A7572]" : "text-[#7C7B87]"}`}>{centerLabel}</p>
        </div>
      </div>
    </div>
  );
}

function getBranchPerformanceLabel(branch: SummaryBranch, topRevenue: number) {
  if (topRevenue <= 0) return "No sales yet";
  if (branch.revenue >= topRevenue) return "Top performing";
  if (branch.revenue > 0) return `${Math.round((branch.revenue / topRevenue) * 100)}% of top branch`;
  return "No sales yet";
}

export function DashboardSummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const locations = Array.isArray(ownerLocations) ? ownerLocations : [];
  const { filters: globalFilters, setFilters, resetFilters } = useGlobalFilters();
  const isManager = user?.role === "MANAGER";
  const [trendRange, setTrendRange] = useState<TrendRange>("7d");
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      try {
        if (mounted) {
          setError(null);
        }

        const response = await fetchDashboardSummary({
          date: globalFilters.startDate,
          branchId: isManager ? user?.branchId : globalFilters.locationId !== "all" ? globalFilters.locationId : undefined,
          trendRange,
        });

        if (!mounted) return;
        setSummary(normalizeSummary(response));
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
    const intervalId = window.setInterval(() => void loadSummary(), 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [isManager, globalFilters.locationId, globalFilters.startDate, trendRange, user?.branchId]);

  const totals = summary?.totals;
  const yesterday = summary?.yesterday;
  const trend = Array.isArray(summary?.trend) ? summary?.trend : [];
  const topServices = Array.isArray(summary?.topServices) ? summary?.topServices : [];
  const recentSales = Array.isArray(summary?.recentSales) ? summary?.recentSales : [];
  const branches = Array.isArray(summary?.branches) ? summary?.branches : [];

  const selectedLocation = locations.find((location) => location.id === globalFilters.locationId);
  const fallbackBranch = branches[0];
  const resolvedBranchName =
    (isManager ? user?.location : getLocationLabel(selectedLocation)) ||
    user?.location ||
    fallbackBranch?.branchName ||
    getLocationLabel(locations[0]) ||
    "All Branches";
  const ownerHasMultipleBranches = !isManager && locations.length > 1;
  const subtitleBranchText = ownerHasMultipleBranches && globalFilters.locationId === "all" ? "all locations" : resolvedBranchName;

  const revenueGrowth = computeGrowth(totals?.revenue ?? 0, yesterday?.revenue ?? 0);
  const salesGrowth = computeGrowth(totals?.totalSales ?? 0, yesterday?.sales ?? 0);
  const clientsGrowth = computeGrowth(totals?.clients ?? 0, yesterday?.clients ?? 0);
  const aovGrowth = computeGrowth(totals?.avgOrderValue ?? 0, yesterday?.avgOrderValue ?? 0);

  const paymentPalette: Record<string, string> = {
    CASH: isDark ? "#818CF8" : "#6976E9",
    UPI: isDark ? "#FBBF24" : "#F39A4A",
    CARD: isDark ? "#34D399" : "#62BC7F",
    UNKNOWN: "#94A3B8",
  };
  const canonicalPaymentMethods = ["CASH", "UPI", "CARD"];
  const paymentMap = new Map<string, SummaryPaymentMethod>();

  (summary?.paymentMethods ?? []).forEach((method) => {
    const key = (method.paymentMethod || "UNKNOWN").toUpperCase();
    const existing = paymentMap.get(key);
    paymentMap.set(key, {
      paymentMethod: key,
      amount: (existing?.amount ?? 0) + Number(method.amount || 0),
      count: (existing?.count ?? 0) + Number(method.count || 0),
    });
  });

  canonicalPaymentMethods.forEach((method) => {
    if (!paymentMap.has(method)) {
      paymentMap.set(method, {
        paymentMethod: method,
        amount: 0,
        count: 0,
      });
    }
  });

  const paymentMethods = canonicalPaymentMethods
    .map((method) => paymentMap.get(method))
    .filter((method): method is SummaryPaymentMethod => Boolean(method));

  const paymentTotal = paymentMethods.reduce((sum, method) => sum + method.amount, 0);
  const visibleBranchCards = branches.length ? branches.slice(0, 4) : [];
  const topRevenueValue = Math.max(...visibleBranchCards.map((item) => item.revenue || 0), 0);
  const topBranchId = visibleBranchCards.reduce((best, current) => {
    if (!best || current.revenue > best.revenue) return current;
    return best;
  }, visibleBranchCards[0])?.branchId;

  const selectedDateLabel = new Date(`${globalFilters.startDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const notifications = buildNotifications({
    branchName: subtitleBranchText,
    selectedDateLabel,
    todayStatus: summary?.todayStatus ?? { completed: 0, pending: 0, cancelled: 0 },
    paymentTotal,
    topServiceName: topServices[0]?.serviceName,
  });
  const openServiceReport = () => navigate("/dashboard/reports/services");
  const openSalesReport = () => navigate("/dashboard/reports/sales");

  if (isLoading) {
    return (
      <div className={`rounded-[24px] border p-5 text-sm transition-all ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#151821] text-[#7A7572]" : "border-[#efe4d9] bg-white text-[#6B7280] shadow-sm"}`}>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-[24px] border p-5 text-sm transition-all ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#151821] text-[#F87171]" : "border-[#efe4d9] bg-white text-[#B91C1C] shadow-sm"}`}>
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 xl:gap-3">
      <div className="shrink-0 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className={`text-[2rem] font-semibold tracking-[-0.05em] xl:text-[2.2rem] ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>
            Welcome back, {user?.name || "Owner"}
          </h1>
          <p className={`mt-1 text-[15px] ${isDark ? "text-[#7A7572]" : "text-[#7C7B87]"}`}>Here&apos;s what&apos;s happening at {subtitleBranchText} today.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isManager ? (
            <label className="relative cursor-pointer group">
              <ToolbarChip className="pr-9">
                <MapPin size={15} className={isDark ? "text-[#C9A96E]" : "text-[#5A5049]"} />
                <span className="text-[14px]">
                  {globalFilters.locationId === "all" ? "All Branches" : getLocationLabel(selectedLocation)}
                </span>
                <select
                  value={globalFilters.locationId}
                  onChange={(event) => setFilters({ locationId: event.target.value })}
                  className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 ${isDark ? "[color-scheme:dark]" : "[color-scheme:light]"}`}
                  aria-label="Select branch"
                >
                  <option value="all">All Branches</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {getLocationLabel(location)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className={`absolute right-3 top-3 transition-transform group-hover:translate-y-0.5 ${isDark ? "text-[#C9A96E]" : "text-[#5A5049]"}`} />
              </ToolbarChip>
            </label>
          ) : (
            <ToolbarChip>
              <MapPin size={15} className={isDark ? "text-[#C9A96E]" : "text-[#5A5049]"} />
              <span>{resolvedBranchName}</span>
            </ToolbarChip>
          )}

          <label className="relative">
            <ToolbarChip className="pr-4">
              <CalendarDays size={15} className={isDark ? "text-[#C9A96E]" : "text-[#5A5049]"} />
              <input
                type="date"
                value={globalFilters.startDate}
                max={getTodayDate()}
                onChange={(event) => setFilters({ startDate: event.target.value, endDate: event.target.value, dateRangeType: "Custom" })}
                className="bg-transparent text-[14px] outline-none"
                aria-label="Select dashboard date"
              />
            </ToolbarChip>
          </label>

          <button
            onClick={() => resetFilters()}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              isDark ? "text-[#C9A96E] hover:bg-white/5" : "text-[#8B5E3C] hover:bg-gray-100"
            }`}
            title="Reset Filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setShowNotifications((value) => !value)}
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-[14px] border transition-all ${
                isDark
                  ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#F0EBE3] shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                  : "border-[#eadfd4] bg-white text-[#1F2937] shadow-[0_8px_20px_rgba(84,62,45,0.05)]"
              }`}
              aria-label="Open notifications"
              aria-expanded={showNotifications}
            >
              <Bell size={16} />
              <span className={`absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full ${isDark ? "bg-[#F87171]" : "bg-[#FF3B30]"}`} />
            </button>

            {showNotifications ? (
              <div className={`absolute right-0 top-14 z-20 w-[320px] max-w-[calc(100vw-2rem)] rounded-[22px] border p-3 shadow-[0_24px_60px_rgba(0,0,0,0.5)] ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)]" : "bg-white border-[#E9E1D8]"
              }`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Notifications</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    isDark ? "bg-[rgba(201,169,110,0.14)] text-[#E8C98A]" : "bg-[#F8E8DA] text-[#8B5E3C]"
                  }`}>
                    {notifications.length} new
                  </span>
                </div>
                <div className="space-y-2">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        navigate("/dashboard/reports");
                      }}
                      className={`w-full rounded-[16px] border border-transparent px-4 py-3 text-left transition-all ${
                        isDark 
                          ? "bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.08)]" 
                          : "bg-[#FAF8F5] hover:border-[#EAD7C5] hover:bg-[#F6EFE8]"
                      }`}
                    >
                      <p className={`text-sm font-medium ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>{item.title}</p>
                      <p className={`mt-1 text-xs ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(totals?.revenue)}
          growth={revenueGrowth}
          subtext={`vs ${formatCurrency(yesterday?.revenue)} yesterday`}
          icon={<ArrowUpRight size={20} className={isDark ? "text-[#C9A96E]" : "text-[#C96B36]"} />}
          iconBg={isDark ? "bg-[rgba(201,169,110,0.12)]" : "bg-[#FCEBDD]"}
          isDark={isDark}
        />
        <KpiCard
          title="Total Sales"
          value={`${totals?.totalSales ?? 0}`}
          growth={salesGrowth}
          subtext={`vs ${yesterday?.sales ?? 0} yesterday`}
          icon={<ShoppingBag size={20} className={isDark ? "text-[#4ADE80]" : "text-[#23A55A]"} />}
          iconBg={isDark ? "bg-[rgba(74,222,128,0.1)]" : "bg-[#E8F8EC]"}
          isDark={isDark}
        />
        <KpiCard
          title="Total Clients"
          value={`${totals?.clients ?? 0}`}
          growth={clientsGrowth}
          subtext={`vs ${yesterday?.clients ?? 0} yesterday`}
          icon={<Users size={20} className={isDark ? "text-[#818CF8]" : "text-[#4566FF]"} />}
          iconBg={isDark ? "bg-[rgba(129,140,248,0.1)]" : "bg-[#EEF2FF]"}
          isDark={isDark}
        />
        <KpiCard
          title="Avg. Order Value"
          value={formatCurrency(totals?.avgOrderValue)}
          growth={aovGrowth}
          subtext={`vs ${formatCurrency(yesterday?.avgOrderValue)} yesterday`}
          icon={<IndianRupee size={20} className={isDark ? "text-[#FBBF24]" : "text-[#F3A308]"} />}
          iconBg={isDark ? "bg-[rgba(251,191,36,0.1)]" : "bg-[#FFF2C9]"}
          isDark={isDark}
        />
      </div>

      <div className="shrink-0">
        <DashboardCard className="p-5">
          <LineAreaChart trend={trend} trendRange={trendRange} onTrendRangeChange={setTrendRange} isDark={isDark} />
        </DashboardCard>
      </div>

      <div className="shrink-0 grid grid-cols-1 gap-3 xl:grid-cols-2 xl:items-stretch">
        <DashboardCard className="shrink-0 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className={`text-[1.45rem] font-semibold tracking-[-0.04em] ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>Top Services</h3>
            <button
              type="button"
              onClick={openServiceReport}
              className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                isDark ? "bg-[#1C2030] text-[#E8C98A] hover:bg-[#222637]" : "bg-[#F7F3EF] text-[#33313B] hover:bg-[#F0EBE5]"
              }`}
            >
              View all
            </button>
          </div>
          <div className="space-y-0.5">
            {topServices.length ? (
              topServices.slice(0, 5).map((service, index) => (
                <div
                  key={`${service.serviceName}-${index}`}
                  className={`grid grid-cols-[18px_34px_minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b py-2.5 last:border-b-0 last:pb-0 first:pt-0 ${
                    isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2ECE6]"
                  }`}
                >
                  <span className={`text-[18px] font-semibold ${isDark ? "text-[#C9A96E]" : "text-[#17181F]"}`}>{index + 1}</span>
                  <div className={`grid h-8 w-8 place-items-center rounded-full ${isDark ? "bg-[rgba(201,169,110,0.14)] text-[#E8C98A]" : "bg-[#F7EDE4] text-[#8B5E3C]"}`}>
                    <Scissors size={13} />
                  </div>
                  <span className={`truncate text-[14px] font-medium ${isDark ? "text-[#C8BFB4]" : "text-[#27272F]"}`}>{service.serviceName}</span>
                  <span className={`text-[14px] ${isDark ? "text-[#7A7572]" : "text-[#35343D]"}`}>{service.salesCount}</span>
                  <span className={`text-[14px] font-semibold ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>{formatCompactCurrency(service.revenue)}</span>
                </div>
              ))
            ) : (
              <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>No service data is available for the selected date.</p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className={`text-[1.45rem] font-semibold tracking-[-0.04em] ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>Recent Sales</h3>
            <button
              type="button"
              onClick={openSalesReport}
              className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                isDark ? "bg-[#1C2030] text-[#E8C98A] hover:bg-[#222637]" : "bg-[#F7F3EF] text-[#33313B] hover:bg-[#F0EBE5]"
              }`}
            >
              View all
            </button>
          </div>
          <div className="space-y-0.5">
            {recentSales.length ? (
              recentSales.slice(0, 5).map((sale, index) => (
                <div
                  key={sale.id}
                  className={`grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2.5 border-b py-2.5 last:border-b-0 last:pb-0 first:pt-0 ${
                    isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2ECE6]"
                  }`}
                >
                  <div
                    className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold text-white shadow-sm"
                    style={{ background: ["#7C5CFA", "#6771E6", "#5CA1E3", "#F0643D", "#F18C2E"][index % 5] }}
                  >
                    {initials(sale.clientName)}
                  </div>
                  <div className="min-w-0">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                      <p className={`truncate text-[14px] font-medium ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>{sale.clientName}</p>
                      <p className={`truncate text-[13px] ${isDark ? "text-[#7A7572]" : "text-[#9A98A3]"}`}>{sale.serviceName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[14px] font-semibold ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>{formatCompactCurrency(sale.totalAmount)}</p>
                    <p className={`text-[11px] ${isDark ? "text-[#4A4744]" : "text-[#9A98A3]"}`}>{formatTime(sale.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>No sales have been recorded for the selected date.</p>
            )}
          </div>
        </DashboardCard>
      </div>

      <div className="shrink-0 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <DashboardCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className={`text-[1.45rem] font-semibold tracking-[-0.04em] ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>Payment Overview</h3>
            <button
              type="button"
              onClick={openSalesReport}
              className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                isDark ? "bg-[#1C2030] text-[#E8C98A] hover:bg-[#222637]" : "bg-[#F7F3EF] text-[#33313B] hover:bg-[#F0EBE5]"
              }`}
            >
              View all
            </button>
          </div>
          <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="shrink-0">
              <DonutChart
                size={168}
                centerValue={formatCurrency(paymentTotal)}
                centerLabel="Total"
                segments={paymentMethods.map((m) => ({ value: m.amount, color: paymentPalette[m.paymentMethod] || "#94A3B8" }))}
                isDark={isDark}
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 w-full max-w-[200px]">
              {paymentMethods.map((m) => (
                <div key={m.paymentMethod} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: paymentPalette[m.paymentMethod] }} />
                    <span className={`truncate text-[13px] font-medium ${isDark ? "text-[#C8BFB4]" : "text-[#4B5563]"}`}>{m.paymentMethod}</span>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13px] font-bold ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>
                      {Math.round((m.amount / (paymentTotal || 1)) * 100)}%
                    </p>
                    <p className={`text-[11px] ${isDark ? "text-[#7A7572]" : "text-[#9A98A3]"}`}>{formatCompactCurrency(m.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className={`text-[1.45rem] font-semibold tracking-[-0.04em] ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>Branch Performance</h3>
            <p className={`text-[13px] ${isDark ? "text-[#7A7572]" : "text-[#8a7e74]"}`}>Comparing active locations</p>
          </div>
          <div className="space-y-4">
            {visibleBranchCards.length ? (
              visibleBranchCards.map((branch) => (
                <div key={branch.branchId} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-8 w-8 place-items-center rounded-lg text-[13px] font-bold ${
                        branch.branchId === topBranchId 
                          ? (isDark ? "bg-[rgba(201,169,110,0.2)] text-[#C9A96E]" : "bg-[#FCEBDD] text-[#C96B36]")
                          : (isDark ? "bg-[rgba(255,255,255,0.05)] text-[#7A7572]" : "bg-[#F7F3EF] text-[#6B7280]")
                      }`}>
                        {initials(branch.branchName)}
                      </div>
                      <span className={`text-[14px] font-medium ${isDark ? "text-[#C8BFB4]" : "text-[#27272F]"}`}>{branch.branchName}</span>
                    </div>
                    <span className={`text-[14px] font-semibold ${isDark ? "text-[#F0EBE3]" : "text-[#17181F]"}`}>{formatCompactCurrency(branch.revenue)}</span>
                  </div>
                  <div className={`relative h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-[rgba(255,255,255,0.05)]" : "bg-[#F2ECE6]"}`}>
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                        isDark ? "bg-gradient-to-r from-[#C9A96E] to-[#E8C98A]" : "bg-gradient-to-r from-[#8B5E3C] to-[#D7B496]"
                      }`}
                      style={{ width: `${Math.min((branch.revenue / (topRevenueValue || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <p className={`text-[11px] ${isDark ? "text-[#4A4744]" : "text-[#9A98A3]"}`}>{getBranchPerformanceLabel(branch, topRevenueValue)}</p>
                </div>
              ))
            ) : (
              <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>No branch data is available for the selected date.</p>
            )}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

