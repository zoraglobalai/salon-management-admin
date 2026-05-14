import { Fragment, useDeferredValue, useEffect, useMemo, useState, startTransition } from "react";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import {
  fetchProfitReport,
  type ProfitReportData,
  type ProfitReportStatus,
} from "../../../core/api";
import { useReport } from "../hooks/useReport";
import { ExportModal } from "../components/ExportModal";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { cn } from "../../../shared/utils/cn";
import { useAuth } from "../../auth/hooks/useAuth";

type ProfitReportFilters = {
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

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

function formatCurrency(value: number | string) {
  return `\u20B9${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
}

function formatMargin(value: number | string) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function titleCaseStatus(status: ProfitReportStatus) {
  if (status === "break_even") return "Break Even";
  return status === "profit" ? "Profit" : "Loss";
}

function statusClasses(status: ProfitReportStatus, isDark: boolean) {
  if (status === "profit") {
    return isDark
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "loss") {
    return isDark
      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
      : "border-rose-200 bg-rose-50 text-rose-700";
  }
  return isDark
    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function summaryTone(value: number, isDark: boolean) {
  if (value > 0) return isDark ? "text-emerald-300" : "text-emerald-700";
  if (value < 0) return isDark ? "text-rose-300" : "text-rose-700";
  return isDark ? "text-[#F0EBE3]" : "text-[#111827]";
}

const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function buildYearOptions(currentYear: number) {
  const startYear = 2022;
  const years = [];
  for (let y = startYear; y <= currentYear; y++) {
    years.push(y);
  }
  return years;
}

function ProfitTableSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <tbody className={cn(isDark ? "divide-y divide-white/5" : "divide-y divide-[#E8E1D8]")}>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index}>
          {Array.from({ length: 6 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-4 md:px-5">
              <div className={cn("h-4 animate-pulse rounded-full", isDark ? "bg-white/10" : "bg-[#F3EEE7]")} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function ProfitReportPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();
  const { user } = useAuth();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const [showExportModal, setShowExportModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);

  const initialRange = getMonthRange(currentMonth, currentYear);
  const { data, loading, filters, setFilters } = useReport<ProfitReportData, ProfitReportFilters>(
    fetchProfitReport,
    {
      ...initialRange,
      month: currentMonth,
      year: currentYear,
      locationId: "all",
      search: "",
      page: 1,
      limit: 10,
      sortKey: "period_date",
      sortDirection: "desc",
    },
    { refreshMs: 30000 },
  );

  useEffect(() => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        search: deferredSearch.trim(),
        page: 1,
      }));
    });
  }, [deferredSearch, setFilters]);

  const rows = data?.rows || [];
  const summary = data?.summary;
  const pagination = data?.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 };
  const yearOptions = useMemo(() => buildYearOptions(currentYear), [currentYear]);
  const branchOptions = data?.filterMeta?.branches || ownerLocations || [];
  const isManager = user?.role === "MANAGER";

  const applyMonthYear = (month: number, year: number) => {
    const range = getMonthRange(month, year);
    setFilters((current) => ({
      ...current,
      ...range,
      month,
      year,
      page: 1,
    }));
  };

  const tableHeaders = [
    { key: "period_date", label: "Period" },
    { key: "revenue", label: "Revenue", align: "right" as const },
    { key: "expenses", label: "Expenses", align: "right" as const },
    { key: "profit", label: "Net Profit", align: "right" as const },
    { key: "profit_margin", label: "Profit Margin %", align: "right" as const },
    { key: "status", label: "Status", align: "center" as const },
  ];

  const exportColumns = [
    "Period",
    "Revenue",
    "Expenses",
    "Net Profit",
    "Profit Margin %",
    "Status",
    "Service Sales",
    "Product Sales",
    "Other Revenue",
    "Salary Expense",
    "Purchase Expense",
    "Rent Expense",
    "Electricity Expense",
    "Maintenance Expense",
    "Miscellaneous Expense",
    "Applied Filters",
    "Summary Revenue",
    "Summary Expenses",
    "Summary Net Profit",
    "Summary Profit Margin",
  ];

  const handleExport = async (type: "excel" | "pdf") => {
    try {
      toast("Preparing export data...", "info");
      
      const allDataResponse = await fetchProfitReport({
        ...filters,
        page: 1,
        limit: 5000, 
      });

      const allRows = allDataResponse.data.rows;
      const summaryData = allDataResponse.data.summary;
      
      if (type === "excel") {
        const mappedRows = allRows.map((row, index) => ({
          Period: row.period,
          Revenue: formatCurrency(row.revenue),
          Expenses: formatCurrency(row.expenses),
          "Net Profit": formatCurrency(row.profit),
          "Profit Margin %": formatMargin(row.profit_margin),
          Status: titleCaseStatus(row.status),
          "Service Sales": formatCurrency(row.breakdown.services),
          "Product Sales": formatCurrency(row.breakdown.products),
          "Other Revenue": formatCurrency(row.breakdown.otherRevenue),
          "Salary Expense": formatCurrency(row.breakdown.salary),
          "Purchase Expense": formatCurrency(row.breakdown.purchase),
          "Rent Expense": formatCurrency(row.breakdown.rent),
          "Electricity Expense": formatCurrency(row.breakdown.electricity),
          "Maintenance Expense": formatCurrency(row.breakdown.maintenance),
          "Miscellaneous Expense": formatCurrency(row.breakdown.miscellaneous),
          "Applied Filters": index === 0
            ? `${filters.startDate || "-"} to ${filters.endDate || "-"}${filters.locationId && filters.locationId !== "all" ? ` | Branch ${filters.locationId}` : " | All Branches"}`
            : "",
          "Summary Revenue": index === 0 ? formatCurrency(summaryData?.totalRevenue || 0) : "",
          "Summary Expenses": index === 0 ? formatCurrency(summaryData?.totalExpenses || 0) : "",
          "Summary Net Profit": index === 0 ? formatCurrency(summaryData?.netProfit || 0) : "",
          "Summary Profit Margin": index === 0 ? formatMargin(summaryData?.profitMargin || 0) : "",
        }));

        exportToExcel(mappedRows, `Profit_Report_${new Date().toISOString().split("T")[0]}`, exportColumns);
        toast("Exported as Excel");
      } else {
        const pdfColumns = [
          "Period", "Revenue", "Expenses", "Net Profit", "Profit Margin %", "Status",
          "Service Sales", "Product Sales", "Other Revenue", "Salary Expense", 
          "Purchase Expense", "Rent Expense", "Electricity Expense", 
          "Maintenance Expense", "Miscellaneous Expense"
        ];

        const mappedRows = allRows.map(row => ({
          Period: row.period,
          Revenue: formatCurrency(row.revenue),
          Expenses: formatCurrency(row.expenses),
          "Net Profit": formatCurrency(row.profit),
          "Profit Margin %": formatMargin(row.profit_margin),
          Status: titleCaseStatus(row.status),
          "Service Sales": formatCurrency(row.breakdown.services),
          "Product Sales": formatCurrency(row.breakdown.products),
          "Other Revenue": formatCurrency(row.breakdown.otherRevenue),
          "Salary Expense": formatCurrency(row.breakdown.salary),
          "Purchase Expense": formatCurrency(row.breakdown.purchase),
          "Rent Expense": formatCurrency(row.breakdown.rent),
          "Electricity Expense": formatCurrency(row.breakdown.electricity),
          "Maintenance Expense": formatCurrency(row.breakdown.maintenance),
          "Miscellaneous Expense": formatCurrency(row.breakdown.miscellaneous),
        }));

        const meta = [
          `Report Period: ${filters.startDate || "-"} to ${filters.endDate || "-"}`,
          `Branch: ${filters.locationId && filters.locationId !== "all" ? `Branch ${filters.locationId}` : "All Branches"}`,
          `Summary: Total Revenue: ${formatCurrency(summaryData?.totalRevenue || 0)} | Total Expenses: ${formatCurrency(summaryData?.totalExpenses || 0)} | Net Profit: ${formatCurrency(summaryData?.netProfit || 0)} (${formatMargin(summaryData?.profitMargin || 0)})`
        ];

        exportToPDF(mappedRows, pdfColumns, `Profit_Report_${new Date().toISOString().split("T")[0]}`, "Profit Report", meta);
        toast("Exported as PDF");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast("Export failed", "error");
    }
  };

  return (
    <div className={cn("mx-auto flex w-full max-w-[1500px] flex-col gap-6 pb-2", isDark ? "text-[#C8BFB4]" : "text-gray-900")}>
      <div className={cn("flex flex-wrap items-center gap-4 rounded-[28px] border px-5 py-5 md:px-7", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <Link to="/dashboard/reports" className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.07)] text-[#C8BFB4]" : "bg-white border-[#E8E1D8] text-[#4B5563]")}>
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className={cn("text-2xl font-bold tracking-[-0.03em] md:text-[2rem]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Profit Report</h1>
          <p className={cn("text-sm md:text-[15px]", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Business growth visibility built from real sales and expense activity across the salon.</p>
        </div>
      </div>

      <div className={cn("rounded-[24px] border p-4 md:p-5", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <div className={cn("rounded-2xl border px-4 py-3", isDark ? "border-white/8 bg-[#1C2030]" : "border-[#E8E1D8] bg-[#FCFBF8]")}>
            <p className={cn("text-[11px] font-bold uppercase tracking-[0.2em]", isDark ? "text-[#7A7572]" : "text-[#9A8D80]")}>Total Revenue</p>
            <p className={cn("mt-2 text-xl font-bold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{loading ? "..." : formatCurrency(summary?.totalRevenue || 0)}</p>
          </div>
          <div className={cn("rounded-2xl border px-4 py-3", isDark ? "border-white/8 bg-[#1C2030]" : "border-[#E8E1D8] bg-[#FCFBF8]")}>
            <p className={cn("text-[11px] font-bold uppercase tracking-[0.2em]", isDark ? "text-[#7A7572]" : "text-[#9A8D80]")}>Total Expenses</p>
            <p className={cn("mt-2 text-xl font-bold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{loading ? "..." : formatCurrency(summary?.totalExpenses || 0)}</p>
          </div>
          <div className={cn("rounded-2xl border px-4 py-3", isDark ? "border-white/8 bg-[#1C2030]" : "border-[#E8E1D8] bg-[#FCFBF8]")}>
            <p className={cn("text-[11px] font-bold uppercase tracking-[0.2em]", isDark ? "text-[#7A7572]" : "text-[#9A8D80]")}>Net Profit</p>
            <p className={cn("mt-2 text-xl font-bold", summaryTone(Number(summary?.netProfit || 0), isDark))}>{loading ? "..." : formatCurrency(summary?.netProfit || 0)}</p>
          </div>
          <div className={cn("rounded-2xl border px-4 py-3", isDark ? "border-white/8 bg-[#1C2030]" : "border-[#E8E1D8] bg-[#FCFBF8]")}>
            <p className={cn("text-[11px] font-bold uppercase tracking-[0.2em]", isDark ? "text-[#7A7572]" : "text-[#9A8D80]")}>Profit Margin</p>
            <div className="mt-2 flex items-center gap-2">
              <p className={cn("text-xl font-bold", summaryTone(Number(summary?.netProfit || 0), isDark))}>{loading ? "..." : formatMargin(summary?.profitMargin || 0)}</p>
              {!loading && Number(summary?.netProfit || 0) >= 0 ? (
                <TrendingUp size={18} className={isDark ? "text-emerald-300" : "text-emerald-600"} />
              ) : (
                <TrendingDown size={18} className={isDark ? "text-rose-300" : "text-rose-600"} />
              )}
            </div>
          </div>
          <div className={cn("flex items-center justify-center rounded-2xl border px-4 py-3", isDark ? "border-white/8 bg-[#1C2030]" : "border-[#E8E1D8] bg-[#FCFBF8]")}>
            <span className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]", statusClasses(summary?.status || "break_even", isDark))}>
              {titleCaseStatus(summary?.status || "break_even")}
            </span>
          </div>
        </div>
      </div>

      <div className={cn("rounded-[24px] border p-4 md:p-5", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.1fr_0.8fr_1fr_1fr_1fr_auto]">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <select
                value={filters.month || currentMonth}
                onChange={(event) => applyMonthYear(Number(event.target.value), Number(filters.year || currentYear))}
                className={cn("w-full appearance-none rounded-xl border px-3 py-2.5 pr-9 text-sm font-semibold outline-none", isDark ? "border-white/10 bg-[#1C2030] text-[#C8BFB4]" : "border-[#E8E1D8] bg-[#FAF7F3] text-gray-700")}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className={cn("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2", isDark ? "text-[#7A7572]" : "text-gray-400")} />
            </div>
            <div className="relative">
              <select
                value={filters.year || currentYear}
                onChange={(event) => applyMonthYear(Number(filters.month || currentMonth), Number(event.target.value))}
                className={cn("w-full appearance-none rounded-xl border px-3 py-2.5 pr-9 text-sm font-semibold outline-none", isDark ? "border-white/10 bg-[#1C2030] text-[#C8BFB4]" : "border-[#E8E1D8] bg-[#FAF7F3] text-gray-700")}
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className={cn("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2", isDark ? "text-[#7A7572]" : "text-gray-400")} />
            </div>
          </div>

          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(event) => {
              const nextDate = event.target.value;
              const nextMonth = nextDate ? new Date(`${nextDate}T00:00:00`).getMonth() + 1 : filters.month;
              const nextYear = nextDate ? new Date(`${nextDate}T00:00:00`).getFullYear() : filters.year;
              setFilters((current) => ({
                ...current,
                startDate: nextDate,
                month: nextMonth,
                year: nextYear,
                page: 1,
              }));
            }}
            className={cn("w-full rounded-xl border px-3 py-2.5 text-sm font-medium outline-none", isDark ? "border-white/10 bg-[#1C2030] text-[#C8BFB4]" : "border-[#E8E1D8] bg-[#FAF7F3] text-gray-700")}
          />

          <input
            type="date"
            value={filters.endDate || ""}
            min={filters.startDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              setFilters((current) => ({
                ...current,
                endDate: nextDate,
                page: 1,
              }));
            }}
            className={cn("w-full rounded-xl border px-3 py-2.5 text-sm font-medium outline-none", isDark ? "border-white/10 bg-[#1C2030] text-[#C8BFB4]" : "border-[#E8E1D8] bg-[#FAF7F3] text-gray-700")}
          />

          {!isManager ? (
            <div className="relative">
              <select
                value={filters.locationId || "all"}
                onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value, page: 1 }))}
                className={cn("w-full appearance-none rounded-xl border px-3 py-2.5 pr-9 text-sm font-semibold outline-none", isDark ? "border-white/10 bg-[#1C2030] text-[#C8BFB4]" : "border-[#E8E1D8] bg-[#FAF7F3] text-gray-700")}
              >
                <option value="all">All Branches</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              <ChevronDown className={cn("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2", isDark ? "text-[#7A7572]" : "text-gray-400")} />
            </div>
          ) : (
            <div className={cn("flex items-center rounded-xl border px-3 py-2.5 text-sm font-semibold", isDark ? "border-white/10 bg-[#1C2030] text-[#C8BFB4]" : "border-[#E8E1D8] bg-[#FAF7F3] text-gray-700")}>
              Assigned Branch
            </div>
          )}

          <button
            onClick={() => {
              if (!rows.length) return toast("No data to export", "error");
              setShowExportModal(true);
            }}
            className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white", isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] text-[#111827]" : "bg-[#111827]")}
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Profit Report"
        onExport={handleExport}
      />

      <div className={cn("rounded-[24px] border p-5 md:p-6", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Profit Timeline</h3>
            <p className={cn("text-sm", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Revenue, expense impact, and profit health by period with expandable breakdown details.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-[260px]">
              <Search className={cn("pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", isDark ? "text-[#7A7572]" : "text-gray-400")} />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search period or status"
                className={cn("w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none", isDark ? "border-white/10 bg-[#1C2030] text-[#C8BFB4]" : "border-[#E8E1D8] bg-[#FAF7F3] text-gray-700")}
              />
            </div>
            <div className={cn("rounded-full px-3 py-1 text-sm font-medium", isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]")}>
              {loading ? "Loading..." : `${pagination.totalCount} period${pagination.totalCount === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>

        <div className={cn("overflow-hidden rounded-[20px] border", isDark ? "border-white/7" : "border-[#E8E1D8]")}>
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className={cn("sticky top-0 z-10 text-xs uppercase tracking-wider", isDark ? "bg-[#1C2030] text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]")}>
                <tr>
                  {tableHeaders.map((header) => {
                    const isActive = filters.sortKey === header.key;
                    const nextDirection = isActive && filters.sortDirection === "desc" ? "asc" : "desc";
                    return (
                      <th key={header.key} className={cn("px-4 py-4 font-semibold md:px-5", header.align === "right" ? "text-right" : header.align === "center" ? "text-center" : "text-left")}>
                        <button
                          onClick={() => setFilters((current) => ({ ...current, sortKey: header.key, sortDirection: nextDirection, page: 1 }))}
                          className={cn("inline-flex items-center gap-2", header.align === "right" ? "justify-end" : header.align === "center" ? "justify-center" : "justify-start")}
                        >
                          {header.label}
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isActive && filters.sortDirection === "asc" ? "rotate-180" : "")} />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {loading ? (
                <ProfitTableSkeleton isDark={isDark} />
              ) : rows.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className={cn("px-6 py-16 text-center", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", isDark ? "bg-white/5" : "bg-[#FAF7F3]")}>
                          <Wallet size={20} />
                        </div>
                        <p className="text-base font-semibold">No profit data found</p>
                        <p className="text-sm">Try adjusting the period or branch filters to see revenue and expense activity.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className={cn(isDark ? "divide-y divide-white/5 text-[#C8BFB4]" : "divide-y divide-[#E8E1D8] text-[#4B5563]")}>
                  {rows.map((row) => {
                    const isExpanded = expandedRow === row.period_date;
                    return (
                      <Fragment key={row.period_date}>
                        <tr
                          onClick={() => setExpandedRow((current) => current === row.period_date ? null : row.period_date)}
                          className={cn("cursor-pointer transition-colors", isDark ? "hover:bg-[rgba(255,255,255,0.03)]" : "hover:bg-[#FCFBF8]")}
                        >
                          <td className="px-4 py-4 md:px-5">
                            <div className="flex flex-col">
                              <span className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{row.period}</span>
                              <span className={cn("text-xs", isDark ? "text-[#7A7572]" : "text-[#9A8D80]")}>Click for breakdown</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-semibold md:px-5">{formatCurrency(row.revenue)}</td>
                          <td className="px-4 py-4 text-right font-semibold md:px-5">{formatCurrency(row.expenses)}</td>
                          <td className={cn("px-4 py-4 text-right font-bold md:px-5", summaryTone(row.profit, isDark))}>{formatCurrency(row.profit)}</td>
                          <td className={cn("px-4 py-4 text-right font-semibold md:px-5", summaryTone(row.profit, isDark))}>{formatMargin(row.profit_margin)}</td>
                          <td className="px-4 py-4 text-center md:px-5">
                            <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", statusClasses(row.status, isDark))}>
                              {titleCaseStatus(row.status)}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className={cn("px-4 pb-5 md:px-5", isDark ? "bg-[#131722]" : "bg-[#FFFEFC]")}>
                              <div className="grid gap-4 pt-2 lg:grid-cols-2">
                                <div className={cn("rounded-2xl border p-4", isDark ? "border-white/7 bg-[#1C2030]" : "border-[#E8E1D8] bg-white")}>
                                  <p className={cn("mb-3 text-xs font-bold uppercase tracking-[0.18em]", isDark ? "text-[#7A7572]" : "text-[#9A8D80]")}>Revenue Breakdown</p>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between"><span>Service Sales</span><strong>{formatCurrency(row.breakdown.services)}</strong></div>
                                    <div className="flex items-center justify-between"><span>Product Sales</span><strong>{formatCurrency(row.breakdown.products)}</strong></div>
                                    <div className="flex items-center justify-between"><span>Other Revenue Sources</span><strong>{formatCurrency(row.breakdown.otherRevenue)}</strong></div>
                                  </div>
                                </div>
                                <div className={cn("rounded-2xl border p-4", isDark ? "border-white/7 bg-[#1C2030]" : "border-[#E8E1D8] bg-white")}>
                                  <p className={cn("mb-3 text-xs font-bold uppercase tracking-[0.18em]", isDark ? "text-[#7A7572]" : "text-[#9A8D80]")}>Expense Breakdown</p>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between"><span>Salary</span><strong>{formatCurrency(row.breakdown.salary)}</strong></div>
                                    <div className="flex items-center justify-between"><span>Purchase</span><strong>{formatCurrency(row.breakdown.purchase)}</strong></div>
                                    <div className="flex items-center justify-between"><span>Rent</span><strong>{formatCurrency(row.breakdown.rent)}</strong></div>
                                    <div className="flex items-center justify-between"><span>Electricity</span><strong>{formatCurrency(row.breakdown.electricity)}</strong></div>
                                    <div className="flex items-center justify-between"><span>Maintenance</span><strong>{formatCurrency(row.breakdown.maintenance)}</strong></div>
                                    <div className="flex items-center justify-between"><span>Miscellaneous</span><strong>{formatCurrency(row.breakdown.miscellaneous)}</strong></div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className={cn("flex items-center justify-between border-t px-4 py-3 md:px-5", isDark ? "border-white/7 bg-[#1C2030]" : "border-[#E8E1D8] bg-[#FFFEFC]")}>
              <span className={cn("text-sm", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>
                Page <span className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{pagination.page}</span> of <span className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{pagination.totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, pagination.page - 1) }))}
                  disabled={pagination.page <= 1}
                  className={cn("rounded-lg border p-2 transition-all disabled:opacity-40", isDark ? "border-white/10 hover:bg-white/5" : "border-[#E5E7EB] hover:bg-[#FAF7F3]")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFilters((current) => ({ ...current, page: Math.min(pagination.totalPages, pagination.page + 1) }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className={cn("rounded-lg border p-2 transition-all disabled:opacity-40", isDark ? "border-white/10 hover:bg-white/5" : "border-[#E5E7EB] hover:bg-[#FAF7F3]")}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
