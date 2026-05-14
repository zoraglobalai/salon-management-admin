import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  ClockIcon,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { fetchAttendanceReport, fetchOwnerProfile } from "../../../core/api";
import { useReport } from "../hooks/useReport";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { ExportModal } from "../components/ExportModal";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { cn } from "../../../shared/utils/cn";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => CURRENT_YEAR - i);

type AttendanceRow = {
  staff_id: string;
  staff_name: string;
  branch_name: string;
  salary_type: string;
  salary_amount: number;
  present_days: number;
  half_days: number;
  leave_days: number;
  lop_days: number;
  week_off_days: number;
  holiday_days: number;
  per_day_salary: number;
  salary_deduction: number;
  final_salary: number;
};

function SalaryTypeBadge({ type, isDark }: { type: string; isDark: boolean }) {
  const normalized = type?.toLowerCase();
  const isMonthly = normalized === "monthly";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider border",
        isMonthly
          ? isDark
            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "bg-amber-50 text-amber-700 border-amber-200"
          : isDark
          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
          : "bg-blue-50 text-blue-700 border-blue-200"
      )}
    >
      {isMonthly ? "MONTHLY" : "WEEKLY"}
    </span>
  );
}

export function AttendanceReportPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();
  const [showExportModal, setShowExportModal] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  // Detect role from session
  const storedUser = (() => {
    try { return JSON.parse(sessionStorage.getItem("owner_user") || "null") as { role?: string } | null; }
    catch { return null; }
  })();
  const isOwner = storedUser?.role !== "MANAGER";

  // Fetch branches for owner
  useEffect(() => {
    if (!isOwner) return;
    fetchOwnerProfile()
      .then((res) => { if (res.data?.locations) setLocations(res.data.locations); })
      .catch(console.error);
  }, [isOwner]);

  const { startDate, endDate } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { startDate: fmt(start), endDate: fmt(end) };
  }, [selectedMonth, selectedYear]);

  const columns: Column<AttendanceRow>[] = [
    {
      header: "Staff Member",
      accessorKey: "staff_name",
      sortable: true,
      cell: (item) => (
        <div className="flex flex-col">
          <span className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>
            {item.staff_name}
          </span>
          <span className={cn("text-[11px]", isDark ? "text-[#7A7572]" : "text-gray-400")}>
            {item.branch_name}
          </span>
        </div>
      ),
    },
    {
      header: "Salary Type",
      accessorKey: "salary_type",
      cell: (item) => <SalaryTypeBadge type={item.salary_type} isDark={isDark} />,
    },
    {
      header: "Base Salary",
      accessorKey: "salary_amount",
      align: "right" as const,
      sortable: true,
      cell: (item) => (
        <span className={cn("font-medium tabular-nums", isDark ? "text-[#C8BFB4]" : "text-gray-700")}>
          ₹{Number(item.salary_amount).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Present",
      accessorKey: "present_days",
      align: "center" as const,
      sortable: true,
      cell: (item) => (
        <span className={cn("inline-flex items-center justify-center rounded-full w-8 h-8 text-sm font-bold",
          isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"
        )}>
          {item.present_days}
        </span>
      ),
    },
    {
      header: "Half Day",
      accessorKey: "half_days",
      align: "center" as const,
      sortable: true,
      cell: (item) => (
        <span className={cn("inline-flex items-center justify-center rounded-full w-8 h-8 text-sm font-bold",
          item.half_days > 0
            ? (isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700")
            : (isDark ? "text-[#4A4744]" : "text-gray-300")
        )}>
          {item.half_days}
        </span>
      ),
    },
    {
      header: "Leave",
      accessorKey: "leave_days",
      align: "center" as const,
      sortable: true,
      cell: (item) => (
        <span className={cn("inline-flex items-center justify-center rounded-full w-8 h-8 text-sm font-bold",
          item.leave_days > 0
            ? (isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-700")
            : (isDark ? "text-[#4A4744]" : "text-gray-300")
        )}>
          {item.leave_days}
        </span>
      ),
    },
    {
      header: "LOP",
      accessorKey: "lop_days",
      align: "center" as const,
      sortable: true,
      cell: (item) => (
        <span className={cn("inline-flex items-center justify-center rounded-full w-8 h-8 text-sm font-bold",
          item.lop_days > 0
            ? (isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-700")
            : (isDark ? "text-[#4A4744]" : "text-gray-300")
        )}>
          {item.lop_days}
        </span>
      ),
    },
    {
      header: "Deduction",
      accessorKey: "salary_deduction",
      align: "right" as const,
      sortable: true,
      cell: (item) => {
        const val = Number(item.salary_deduction);
        return (
          <span className={cn("font-medium tabular-nums text-sm",
            val > 0
              ? "text-rose-500"
              : (isDark ? "text-[#4A4744]" : "text-gray-300")
          )}>
            {val > 0 ? `-₹${val.toLocaleString("en-IN")}` : "—"}
          </span>
        );
      },
    },
    {
      header: "Final Salary",
      accessorKey: "final_salary",
      align: "right" as const,
      sortable: true,
      cell: (item) => (
        <span className={cn("font-bold tabular-nums", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>
          ₹{Number(item.final_salary).toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  const { data, loading, filters, setFilters } = useReport(
    fetchAttendanceReport,
    {
      startDate,
      endDate,
      locationId: "all",
      page: 1,
      limit: 10,
    },
    { refreshMs: 60000 },
  );

  // Sync month/year/branch changes into the report filters
  useMemo(() => {
    setFilters((prev: any) => ({ ...prev, startDate, endDate, locationId: selectedLocation, page: 1 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedLocation]);

  const list       = data?.list || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  const handleExport = (type: "excel" | "pdf") => {
    const exportData = list.map((item: AttendanceRow) => ({
      "Staff Name":      item.staff_name,
      "Branch":          item.branch_name,
      "Salary Type":     item.salary_type?.charAt(0).toUpperCase() + item.salary_type?.slice(1),
      "Base Salary":     Number(item.salary_amount),
      "Present Days":    item.present_days,
      "Half Days":       item.half_days,
      "Leave Days":      item.leave_days,
      "LOP Days":        item.lop_days,
      "Week Off":        item.week_off_days,
      "Holiday":         item.holiday_days,
      "Deduction (₹)":  Number(item.salary_deduction),
      "Final Salary (₹)": Number(item.final_salary),
    }));

    const columns = [
      "Staff Name", "Branch", "Salary Type", "Base Salary",
      "Present Days", "Half Days", "Leave Days", "LOP Days",
      "Week Off", "Holiday", "Deduction (₹)", "Final Salary (₹)",
    ];

    const fileName = `Attendance_Report_${new Date().toISOString().split("T")[0]}`;

    if (type === "excel") {
      exportToExcel(exportData, fileName, columns);
      toast("Exported as Excel");
    } else {
      exportToPDF(exportData, columns, fileName, "Attendance & Payroll Report");
      toast("Exported as PDF");
    }
  };

  return (
    <div className={cn("mx-auto flex w-full max-w-[1380px] flex-col gap-6 pb-2", isDark ? "text-[#C8BFB4]" : "text-gray-900")}>

      {/* ── Page Header ── */}
      <div className={cn(
        "flex flex-wrap items-center gap-4 rounded-[28px] border px-5 py-5 transition-all duration-200 md:px-7",
        isDark
          ? "bg-[#151821] border-[rgba(255,255,255,0.07)] shadow-card-dark"
          : "bg-[linear-gradient(180deg,#FFFDF9_0%,#FAF7F3_100%)] border-[#E8E1D8] shadow-[0_16px_48px_rgba(94,72,52,0.08)]"
      )}>
        <Link
          to="/dashboard/reports"
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-200",
            isDark
              ? "bg-[#1C2030] border-[rgba(255,255,255,0.07)] text-[#C8BFB4] hover:bg-white/5 hover:text-[#F0EBE3]"
              : "bg-white border-[#E8E1D8] text-[#4B5563] hover:bg-[#FAF7F3] hover:text-[#111827]"
          )}
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className={cn("text-2xl font-bold tracking-[-0.03em] md:text-[2rem]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>
            Attendance Report
          </h1>
          <p className={cn("text-sm md:text-[15px]", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>
            Staff attendance insights, payroll deductions, and leave visibility.
          </p>
        </div>
        {/* Live badge */}
        <div className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
          isDark ? "border-[rgba(255,255,255,0.07)] bg-[#1C2030] text-[#7A7572]" : "border-[#E8E1D8] bg-white text-[#6B7280]"
        )}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Data
        </div>
      </div>

      {/* ── Month / Year Filter ── */}
      <div className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all",
        isDark
          ? "bg-[#151821] border-[rgba(255,255,255,0.07)] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          : "bg-white border-[#E8E1D8] shadow-sm"
      )}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Month pills */}
          <div className="flex flex-wrap gap-1.5">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(i)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-all",
                  selectedMonth === i
                    ? isDark
                      ? "bg-[#C9A96E] text-[#0F1115]"
                      : "bg-[#111827] text-white"
                    : isDark
                      ? "text-[#7A7572] hover:bg-white/5 hover:text-[#C8BFB4]"
                      : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                )}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className={cn("h-5 w-px", isDark ? "bg-white/10" : "bg-gray-200")} />

          {/* Year select */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition focus:outline-none",
              isDark
                ? "border-[rgba(255,255,255,0.1)] bg-[#1C2030] text-[#C8BFB4] focus:border-[rgba(201,169,110,0.4)] [color-scheme:dark]"
                : "border-[#E5E7EB] bg-white text-[#374151] focus:ring-2 focus:ring-[#8B5E3C]/20 [color-scheme:light]"
            )}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Branch dropdown — owner only */}
          {isOwner && locations.length > 0 && (
            <>
              <div className={cn("h-5 w-px", isDark ? "bg-white/10" : "bg-gray-200")} />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition focus:outline-none",
                  isDark
                    ? "border-[rgba(255,255,255,0.1)] bg-[#1C2030] text-[#C8BFB4] focus:border-[rgba(201,169,110,0.4)] [color-scheme:dark]"
                    : "border-[#E5E7EB] bg-white text-[#374151] focus:ring-2 focus:ring-[#8B5E3C]/20 [color-scheme:light]"
                )}
              >
                <option value="all">All Branches</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Export button */}
        <button
          onClick={() => {
            if (!list.length) return toast("No data to export", "error");
            setShowExportModal(true);
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
            isDark
              ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] text-[#0F1115] shadow-[0_4px_20px_rgba(201,169,110,0.3)] hover:brightness-110"
              : "bg-[#111827] text-white hover:bg-[#374151]"
          )}
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* ── Export Modal ── */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Attendance Report"
        onExport={(type) => {
          handleExport(type);
          setShowExportModal(false);
        }}
      />


      {/* ── Data Table Section ── */}
      <div className={cn(
        "rounded-[24px] border p-5 shadow-sm transition-all duration-200 md:p-6",
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      )}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ClockIcon size={18} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
              <h3 className={cn("font-semibold text-[15px]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>
                Staff Attendance &amp; Payroll Breakdown
              </h3>
            </div>
            <p className={cn("mt-0.5 text-sm", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>
              Salary deductions calculated from LOP and Half Day records. All data sourced directly from attendance records.
            </p>
          </div>

          <div className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]"
          )}>
            {loading ? "Loading..." : `${pagination.totalCount} staff`}
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-4 text-[11px] font-medium">
          {[
            { label: "Present (P)", color: "bg-emerald-500" },
            { label: "Half Day (HD)", color: "bg-amber-400" },
            { label: "Paid Leave (PL)", color: "bg-blue-500" },
            { label: "LOP", color: "bg-rose-500" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", color)} />
              <span className={isDark ? "text-[#7A7572]" : "text-gray-500"}>{label}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <ReportDataTable
            columns={columns}
            data={list}
            sortKey="staff_name"
            sortDirection="asc"
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setFilters({ ...filters, page } as any)}
          />
        </div>
      </div>
    </div>
  );
}
