import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  HandCoins,
  IndianRupee,
  MapPin,
  Scissors,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { fetchDashboardSummary } from "../../../core/api";
import type { DashboardSummaryResponse } from "../../../core/types";
import { useAuth } from "../../auth/hooks/useAuth";

type OutletContext = {
  ownerLocations?: Array<{ id: string; name: string; city?: string }>;
};

type SummaryBranch = DashboardSummaryResponse["branches"][number];

type SummaryPaymentMethod = {
  paymentMethod: string;
  amount: number;
  count: number;
};

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
  return (
    <section
      className={`rounded-[22px] border border-[#EEE6DD] bg-white shadow-[0_8px_28px_rgba(84,62,45,0.05)] ${className}`}
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
  return (
    <div
      className={`inline-flex h-10 items-center gap-2 rounded-[14px] border border-[#E9E1D8] bg-white px-3.5 text-[13px] font-medium text-[#1F2937] shadow-[0_6px_18px_rgba(84,62,45,0.04)] ${className}`}
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
}) {
  return (
    <DashboardCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-[#655F58]">{props.title}</p>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#17181F]">{props.value}</h3>
            <p className="text-[13px] text-[#7C7B87]">{props.subtext}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-4">
          <div
            className={`inline-flex items-center gap-1 text-[13px] font-medium ${
              props.growth >= 0 ? "text-[#2E9D57]" : "text-[#D14343]"
            }`}
          >
            <ArrowUpRight size={14} className={props.growth < 0 ? "rotate-90" : ""} />
            <span>{formatPercent(props.growth)}</span>
          </div>
          <div className={`grid h-12 w-12 place-items-center rounded-[16px] ${props.iconBg}`}>{props.icon}</div>
        </div>
      </div>
    </DashboardCard>
  );
}

function LineAreaChart({ trend }: { trend: DashboardSummaryResponse["trend"] }) {
  const points = Array.isArray(trend) ? trend : [];
  const revenues = points.map((item) => item.revenue || 0);
  const maxRevenue = Math.max(...revenues, 1);
  const minRevenue = Math.min(...revenues, 0);
  const range = Math.max(maxRevenue - minRevenue, maxRevenue * 0.45, 1);
  const totalRevenue = points.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const yLabels = [0, 1, 2, 3].map((step) => {
    const value = Math.round((maxRevenue / 1000) * step);
    return `\u20B9${value}K`;
  });

  const chartPoints = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * 100;
    const normalized = ((point.revenue || 0) - minRevenue) / range;
    const y = 86 - normalized * 58;
    return { x, y, day: point.day };
  });

  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const area = chartPoints.length ? `0,100 ${polyline} 100,100` : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#17181F]">Revenue Overview</h3>
          <p className="mt-3 text-[18px] font-semibold text-[#17181F]">{formatCurrency(totalRevenue)}</p>
          <p className="mt-0.5 text-[13px] text-[#7C7B87]">Total Revenue</p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-between gap-3 rounded-[12px] border border-[#E9E1D8] bg-[#FBF9F6] px-4 text-[13px] text-[#2A2A32]"
        >
          <span>Last 7 Days</span>
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[40px_minmax(0,1fr)]">
        <div className="hidden justify-between py-2 text-[12px] font-medium text-[#8B8791] md:flex md:flex-col">
          {yLabels
            .slice()
            .reverse()
            .map((label) => (
              <span key={label}>{label}</span>
            ))}
        </div>
        <div className="relative h-[190px] overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_center,rgba(224,182,145,0.18),transparent_62%),linear-gradient(180deg,rgba(255,248,242,0.95),rgba(255,255,255,0.3))]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#D8A57E" stopOpacity="0.36" />
                <stop offset="100%" stopColor="#D8A57E" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            {[18, 38, 58, 78].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#EDE2D8" strokeWidth="0.5" />
            ))}
            {area ? <path d={`M ${area}`} fill="url(#revenueArea)" /> : null}
            {polyline ? (
              <polyline
                fill="none"
                stroke="#8B4E24"
                strokeWidth="0.85"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={polyline}
              />
            ) : null}
            {chartPoints.map((point) => (
              <g key={point.day}>
                <circle cx={point.x} cy={point.y} r="1.15" fill="#8B4E24" />
                <circle cx={point.x} cy={point.y} r="2" fill="#8B4E24" fillOpacity="0.15" />
              </g>
            ))}
          </svg>
          <div className="absolute inset-x-3 bottom-2 flex items-end justify-between text-[11px] font-medium text-[#8B8791]">
            {points.map((point) => (
              <span key={point.day} className="min-w-0 text-center">
                {point.day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 160,
  innerClassName = "",
}: {
  segments: Array<{ value: number; color: string }>;
  centerValue: string;
  centerLabel: string;
  size?: number;
  innerClassName?: string;
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
        background: `conic-gradient(${gradient || "#E5E7EB 0 100%"})`,
      }}
    >
      <div
        className={`grid h-[68%] w-[68%] place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_rgba(229,231,235,0.8)] ${innerClassName}`}
      >
        <div>
          <p className="text-[20px] font-semibold leading-none tracking-[-0.03em] text-[#17181F]">{centerValue}</p>
          <p className="mt-1 text-[11px] text-[#7C7B87]">{centerLabel}</p>
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
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const locations = Array.isArray(ownerLocations) ? ownerLocations : [];
  const isManager = user?.role === "MANAGER";
  const defaultBranchId = isManager ? user?.branchId || "all" : "all";
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isManager) {
      setSelectedBranchId(user?.branchId || "all");
    }
  }, [isManager, user?.branchId]);

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
          date: selectedDate,
          branchId: isManager ? user?.branchId : selectedBranchId !== "all" ? selectedBranchId : undefined,
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
  }, [isManager, selectedBranchId, selectedDate, user?.branchId]);

  const totals = summary?.totals;
  const yesterday = summary?.yesterday;
  const trend = Array.isArray(summary?.trend) ? summary?.trend : [];
  const topServices = Array.isArray(summary?.topServices) ? summary?.topServices : [];
  const recentSales = Array.isArray(summary?.recentSales) ? summary?.recentSales : [];
  const branches = Array.isArray(summary?.branches) ? summary?.branches : [];

  const selectedLocation = locations.find((location) => location.id === selectedBranchId);
  const fallbackBranch = branches[0];
  const resolvedBranchName =
    (isManager ? user?.location : getLocationLabel(selectedLocation)) ||
    user?.location ||
    fallbackBranch?.branchName ||
    getLocationLabel(locations[0]) ||
    "All Branches";
  const ownerHasMultipleBranches = !isManager && locations.length > 1;
  const subtitleBranchText = ownerHasMultipleBranches && selectedBranchId === "all" ? "Branches" : resolvedBranchName;

  const revenueGrowth = computeGrowth(totals?.revenue ?? 0, yesterday?.revenue ?? 0);
  const salesGrowth = computeGrowth(totals?.totalSales ?? 0, yesterday?.sales ?? 0);
  const clientsGrowth = computeGrowth(totals?.clients ?? 0, yesterday?.clients ?? 0);
  const aovGrowth = computeGrowth(totals?.avgOrderValue ?? 0, yesterday?.avgOrderValue ?? 0);

  const paymentPalette: Record<string, string> = {
    CASH: "#6976E9",
    UPI: "#F39A4A",
    CARD: "#62BC7F",
    WALLET: "#B495ED",
    UNKNOWN: "#94A3B8",
  };
  const canonicalPaymentMethods = ["CASH", "UPI", "CARD", "WALLET"];
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
  const branchCardPalette = ["#B36B3A", "#53BF7F", "#7B4FFF", "#F58A29"];
  const branchIconPalette = ["#F4D8C8", "#DDF5E5", "#E4E8FF", "#FFEBC4"];
  const branchCards: SummaryBranch[] = branches.length
    ? branches
    : [
        {
          branchId: selectedBranchId === "all" ? "summary-branch" : selectedBranchId,
          branchName: resolvedBranchName,
          revenue: totals?.revenue ?? 0,
          totalSales: totals?.totalSales ?? 0,
          clients: totals?.clients ?? 0,
          payments: totals?.payments ?? 0,
        },
      ];
  const topBranchId = branchCards.reduce((best, current) => {
    if (!best || current.revenue > best.revenue) return current;
    return best;
  }, branchCards[0])?.branchId;

  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
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

  if (isLoading) {
    return (
      <div className="rounded-[22px] border border-[#E9E1D8] bg-white p-5 text-sm text-[#6B7280] shadow-sm">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[22px] border border-[#E9E1D8] bg-white p-5 text-sm text-[#B91C1C] shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-[#17181F] sm:text-[2rem]">
            Welcome back, {user?.name || "Owner"} <span className="text-[0.9em]">👋</span>
          </h1>
          <p className="mt-1 text-[15px] text-[#7C7B87]">
            Here&apos;s what&apos;s happening at {subtitleBranchText} today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isManager ? (
            <label className="relative">
              <ToolbarChip className="pr-9">
                <MapPin size={15} className="text-[#5A5049]" />
                <select
                  value={selectedBranchId}
                  onChange={(event) => setSelectedBranchId(event.target.value)}
                  className="appearance-none bg-transparent pr-1 text-[14px] outline-none"
                  aria-label="Select branch"
                >
                  <option value="all">All Branches</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {getLocationLabel(location)}
                    </option>
                  ))}
                </select>
              </ToolbarChip>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3 text-[#5A5049]" />
            </label>
          ) : (
            <ToolbarChip>
              <MapPin size={15} className="text-[#5A5049]" />
              <span>{resolvedBranchName}</span>
            </ToolbarChip>
          )}

          <label className="relative">
            <ToolbarChip className="pr-9">
              <CalendarDays size={15} className="text-[#5A5049]" />
              <input
                type="date"
                value={selectedDate}
                max={getTodayDate()}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="bg-transparent text-[14px] outline-none"
                aria-label="Select dashboard date"
              />
            </ToolbarChip>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3 text-[#5A5049]" />
          </label>

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setShowNotifications((value) => !value)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#E9E1D8] bg-white text-[#1F2937] shadow-[0_6px_18px_rgba(84,62,45,0.04)]"
              aria-label="Open notifications"
              aria-expanded={showNotifications}
            >
              <Bell size={16} />
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#FF3B30]" />
            </button>

            {showNotifications ? (
              <div className="absolute right-0 top-14 z-20 w-[320px] max-w-[calc(100vw-2rem)] rounded-[22px] border border-[#E9E1D8] bg-white p-3 shadow-[0_18px_40px_rgba(60,42,28,0.16)]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#111827]">Notifications</p>
                  <span className="rounded-full bg-[#F8E8DA] px-2.5 py-1 text-xs font-medium text-[#8B5E3C]">
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
                      className="w-full rounded-[16px] border border-transparent bg-[#FAF8F5] px-4 py-3 text-left transition hover:border-[#EAD7C5] hover:bg-[#F6EFE8]"
                    >
                      <p className="text-sm font-medium text-[#111827]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(totals?.revenue)}
          growth={revenueGrowth}
          subtext={`vs ${formatCurrency(yesterday?.revenue)} yesterday`}
          icon={<ArrowUpRight size={20} className="text-[#C96B36]" />}
          iconBg="bg-[#FCEBDD]"
        />
        <KpiCard
          title="Total Sales"
          value={`${totals?.totalSales ?? 0}`}
          growth={salesGrowth}
          subtext={`vs ${yesterday?.sales ?? 0} yesterday`}
          icon={<ShoppingBag size={20} className="text-[#23A55A]" />}
          iconBg="bg-[#E8F8EC]"
        />
        <KpiCard
          title="Total Clients"
          value={`${totals?.clients ?? 0}`}
          growth={clientsGrowth}
          subtext={`vs ${yesterday?.clients ?? 0} yesterday`}
          icon={<Users size={20} className="text-[#4566FF]" />}
          iconBg="bg-[#EEF2FF]"
        />
        <KpiCard
          title="Avg. Order Value"
          value={formatCurrency(totals?.avgOrderValue)}
          growth={aovGrowth}
          subtext={`vs ${formatCurrency(yesterday?.avgOrderValue)} yesterday`}
          icon={<IndianRupee size={20} className="text-[#F3A308]" />}
          iconBg="bg-[#FFF2C9]"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <DashboardCard className="p-4">
          <LineAreaChart trend={trend} />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <DashboardCard className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#17181F]">Top Services</h3>
            <button
              type="button"
              onClick={() => navigate("/dashboard/services")}
              className="rounded-[10px] bg-[#F7F3EF] px-3 py-1.5 text-[12px] font-medium text-[#33313B]"
            >
              View all
            </button>
          </div>
          <div className="space-y-1">
            {topServices.length ? (
              topServices.slice(0, 5).map((service, index) => (
                <div
                  key={`${service.serviceName}-${index}`}
                  className="grid grid-cols-[18px_32px_minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b border-[#F2ECE6] py-2 last:border-b-0 last:pb-0 first:pt-0"
                >
                  <span className="text-[18px] font-semibold text-[#17181F]">{index + 1}</span>
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[#F7EDE4] text-[#8B5E3C]">
                    <Scissors size={13} />
                  </div>
                  <span className="truncate text-[14px] font-medium text-[#27272F]">{service.serviceName}</span>
                  <span className="text-[14px] text-[#35343D]">{service.salesCount}</span>
                  <span className="text-[14px] font-semibold text-[#17181F]">{formatCompactCurrency(service.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#6B7280]">No service data is available for the selected date.</p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#17181F]">Recent Sales</h3>
            <button
              type="button"
              onClick={() => navigate("/dashboard/sales/history")}
              className="rounded-[10px] bg-[#F7F3EF] px-3 py-1.5 text-[12px] font-medium text-[#33313B]"
            >
              View all
            </button>
          </div>
          <div className="space-y-1">
            {recentSales.length ? (
              recentSales.slice(0, 5).map((sale, index) => (
                <div
                  key={sale.id}
                  className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[#F2ECE6] py-2 last:border-b-0 last:pb-0 first:pt-0"
                >
                  <div
                    className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold text-white"
                    style={{ background: ["#7C5CFA", "#6771E6", "#5CA1E3", "#F0643D", "#F18C2E"][index % 5] }}
                  >
                    {initials(sale.clientName)}
                  </div>
                  <div className="min-w-0">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                      <p className="truncate text-[14px] font-medium text-[#17181F]">{sale.clientName}</p>
                      <p className="truncate text-[13px] text-[#9A98A3]">{sale.serviceName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-[#17181F]">{formatCompactCurrency(sale.totalAmount)}</p>
                    <p className="text-[11px] text-[#9A98A3]">{formatTime(sale.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#6B7280]">No sales have been recorded for the selected date.</p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#17181F]">Payment Methods</h3>
            <button
              type="button"
              onClick={() => navigate("/dashboard/reports")}
              className="rounded-[10px] bg-[#F7F3EF] px-3 py-1.5 text-[12px] font-medium text-[#33313B]"
            >
              View all
            </button>
          </div>
          <div className="flex flex-col items-center gap-4 xl:flex-row xl:items-center xl:justify-between">
            <DonutChart
              size={138}
              centerValue={formatCurrency(paymentTotal)}
              centerLabel="Total"
              innerClassName="bg-white"
              segments={paymentMethods.map((item) => ({
                value: item.amount,
                color: paymentPalette[item.paymentMethod] || paymentPalette.UNKNOWN,
              }))}
            />
            <div className="w-full max-w-[250px] space-y-4">
              {paymentMethods.map((method) => {
                const percent = paymentTotal ? (method.amount / paymentTotal) * 100 : 0;
                return (
                  <div key={method.paymentMethod} className="grid grid-cols-[14px_1fr_auto_auto] items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: paymentPalette[method.paymentMethod] || paymentPalette.UNKNOWN }}
                    />
                    <span className="text-[14px] font-medium text-[#27272F]">{method.paymentMethod}</span>
                    <span className="text-[14px] font-semibold text-[#17181F]">{formatCompactCurrency(method.amount)}</span>
                    <span className="text-[14px] text-[#6D6C78]">{percent.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </DashboardCard>
      </div>

      {!isManager ? (
        <DashboardCard className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#17181F]">Branch Overview</h3>
              <button
                type="button"
                onClick={() => navigate("/dashboard/reports")}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[#F7F3EF] px-3 py-1.5 text-[12px] font-medium text-[#33313B]"
              >
                <FileText size={14} />
                View Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {branchCards.map((branch, index) => {
              const isTopBranch = branch.branchId === topBranchId;
              const isSelectedBranch = selectedBranchId !== "all" && branch.branchId === selectedBranchId;
              const accentColor = branchCardPalette[index % branchCardPalette.length];
              const topRevenueValue = Math.max(...branchCards.map((item) => item.revenue || 0), 0);
              const branchShare = totals?.revenue ? ((branch.revenue || 0) / totals.revenue) * 100 : 0;
              const performanceLabel = getBranchPerformanceLabel(branch, topRevenueValue);

              return (
                <div
                  key={branch.branchId}
                  className={`rounded-[18px] border p-3.5 transition ${
                    isTopBranch
                      ? "border-[#D9A985] bg-[#FFF9F4] shadow-[0_10px_24px_rgba(139,94,60,0.1)]"
                      : "border-[#EEE6DD] bg-white shadow-[0_6px_18px_rgba(84,62,45,0.04)]"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="grid h-9 w-9 place-items-center rounded-xl"
                        style={{ backgroundColor: branchIconPalette[index % branchIconPalette.length], color: accentColor }}
                      >
                        <HandCoins size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[18px] font-medium tracking-[-0.02em] text-[#17181F]">{branch.branchName}</p>
                        <p className="mt-0.5 text-[12px] font-medium text-[#8A7E74]">{performanceLabel}</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isTopBranch ? (
                        <span className="rounded-[10px] bg-[#F8E8DA] px-3 py-1.5 text-[12px] font-medium text-[#8B5E3C]">
                          Top Branch
                        </span>
                      ) : isSelectedBranch ? (
                        <span className="rounded-[10px] bg-[#EEF2FF] px-3 py-1.5 text-[12px] font-medium text-[#4F6BFF]">
                          Selected
                        </span>
                      ) : (
                        <span className="rounded-[10px] bg-[#F7F3EF] px-3 py-1.5 text-[12px] font-medium text-[#7C7B87]">
                          Branch {index + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 rounded-[14px] bg-[#FBF8F4] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#9A8F86]">Contribution</p>
                        <p className="mt-1 text-[16px] font-semibold text-[#17181F]">{branchShare.toFixed(1)}%</p>
                      </div>
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-[#EFE5DB]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(branchShare, branch.revenue > 0 ? 8 : 0)}%`, backgroundColor: accentColor }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[12px] bg-white/80">
                      <p className="text-[16px] font-semibold text-[#17181F]">{formatCompactCurrency(branch.revenue)}</p>
                      <p className="mt-1 text-[12px] text-[#7C7B87]">Revenue</p>
                    </div>
                    <div className="rounded-[12px] bg-white/80">
                      <p className="text-[16px] font-semibold text-[#17181F]">{branch.totalSales}</p>
                      <p className="mt-1 text-[12px] text-[#7C7B87]">Sales</p>
                    </div>
                    <div className="rounded-[12px] bg-white/80">
                      <p className="text-[16px] font-semibold text-[#17181F]">{branch.clients}</p>
                      <p className="mt-1 text-[12px] text-[#7C7B87]">Clients</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
