import { useState } from "react";
import { ArrowLeft, UserSquare2, Award, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { fetchStaffReport } from "../../../core/api";
import { useReport } from "../hooks/useReport";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { ExportModal } from "../components/ExportModal";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { cn } from "../../../shared/utils/cn";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type StaffPerformance = {
  staff_id: string;
  staff_name: string;
  services_count: number;
  revenue: number;
  total_clients_served: number;
  avg_bill_value: number;
};

// columns moved inside StaffReportPage to access theme state

export function StaffReportPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();

  const columns: Column<StaffPerformance>[] = [
    { 
      header: "Staff Member", 
      accessorKey: "staff_name", 
      sortable: true,
      cell: (item: StaffPerformance) => <span className={isDark ? "text-[#F0EBE3]" : "text-gray-900"}>{item.staff_name}</span>
    },
    { 
      header: "Services Count", 
      accessorKey: "services_count", 
      align: "center" as const, 
      sortable: true,
      cell: (item: StaffPerformance) => <span className={isDark ? "text-[#C8BFB4]" : ""}>{Number(item.services_count).toLocaleString()}</span>
    },
    {
      header: "Revenue Generated",
      accessorKey: "revenue",
      align: "right" as const,
      sortable: true,
      cell: (item: StaffPerformance) => <span className={cn("font-medium", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>{"\u20B9"}{Number(item.revenue).toLocaleString()}</span>,
    },
    {
      header: "Total Clients Served",
      accessorKey: "total_clients_served",
      align: "center" as const,
      sortable: true,
      cell: (item: StaffPerformance) => <span className={isDark ? "text-[#C8BFB4]" : "text-gray-600"}>{Number(item.total_clients_served).toLocaleString()}</span>,
    },
    {
      header: "Avg Bill Value",
      accessorKey: "avg_bill_value",
      align: "right" as const,
      sortable: true,
      cell: (item: StaffPerformance) => <span className={isDark ? "text-[#7A7572]" : "text-gray-500"}>{"\u20B9"}{Math.round(Number(item.avg_bill_value || 0)).toLocaleString()}</span>,
    },
  ];
  const [showExportModal, setShowExportModal] = useState(false);

  const { data, loading, filters, setFilters } = useReport(
    fetchStaffReport,
    {
      startDate: formatLocalDate(new Date()),
      endDate: formatLocalDate(new Date()),
      locationId: "all",
      page: 1,
      limit: 10,
    },
    { refreshMs: 30000 },
  );

  const staffPerformance = data?.staffPerformance || [];
  const topStaff = staffPerformance[0];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className={cn("mx-auto flex w-full max-w-[1380px] flex-col gap-6 pb-2", isDark ? "text-[#C8BFB4]" : "text-gray-900")}>
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
          <h1 className={cn("text-2xl font-bold tracking-[-0.03em] md:text-[2rem]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Staff Report</h1>
          <p className={cn("text-sm md:text-[15px]", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Monitor staff productivity and performance.</p>
        </div>
      </div>

      <FiltersBar
        className="sticky top-0 z-10"
        showPaymentSelector={false}
        onFilterChange={(f) =>
          setFilters({
            ...filters,
            startDate: f.startDate ?? filters.startDate,
            endDate: f.endDate ?? filters.endDate,
            locationId: f.locationId,
            page: 1,
          })
        }
        onExport={() => {
          if (!staffPerformance.length) return toast("No data to export", "error");
          setShowExportModal(true);
        }}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Staff Report"
        onExport={(type) => {
          const formatData = staffPerformance.map((item: StaffPerformance) => ({
            "Staff Member": item.staff_name,
            "Services Count": Number(item.services_count),
            "Revenue Generated": `\u20B9${Number(item.revenue).toLocaleString()}`,
            "Total Clients Served": Number(item.total_clients_served),
            "Avg Bill Value": `\u20B9${Math.round(Number(item.avg_bill_value || 0)).toLocaleString()}`,
          }));

          if (type === "excel") {
            exportToExcel(formatData, `Staff_Performance_Report_${new Date().toISOString().split("T")[0]}`);
            toast("Exported as Excel");
          } else {
            exportToPDF(
              formatData,
              ["Staff Member", "Services Count", "Revenue Generated", "Total Clients Served", "Avg Bill Value"],
              `Staff_Performance_Report_${new Date().toISOString().split("T")[0]}`,
              "Staff Performance Report"
            );
            toast("Exported as PDF");
          }
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Active Staff"
          value={loading ? "..." : staffPerformance.length.toString()}
          comparisonValue="--"
          comparisonLabel="in selected scope"
          trend="neutral"
          icon={<Briefcase size={20} />}
        />
        <SummaryCard
          title="Top Performer"
          value={loading ? "..." : topStaff?.staff_name || "N/A"}
          comparisonValue={loading ? "--" : `\u20B9${Number(topStaff?.revenue || 0).toLocaleString()}`}
          comparisonLabel="revenue generated"
          trend="up"
          icon={<Award size={20} />}
        />
        <SummaryCard
          title="Avg Revenue/Staff"
          value={
            loading
              ? "..."
              : `\u20B9${Math.round(
                  staffPerformance.reduce((acc: number, staff: StaffPerformance) => acc + Number(staff.revenue), 0) /
                    Math.max(1, staffPerformance.length),
                ).toLocaleString()}`
          }
          comparisonValue="--"
          comparisonLabel="per period"
          trend="neutral"
          icon={<UserSquare2 size={20} />}
        />
      </div>

      <div className={cn(
        "rounded-[24px] border p-5 shadow-sm transition-all duration-200 md:p-6",
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      )}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Performance Breakdown</h3>
            <p className={cn("text-sm", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Staff output, revenue contribution, client coverage, and bill value in one place.</p>
          </div>
          <div className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]"
          )}>
            {loading ? "Loading..." : `${staffPerformance.length} record${staffPerformance.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <ReportDataTable
          columns={columns}
          data={staffPerformance}
          sortKey="revenue"
          sortDirection="desc"
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </div>
    </div>
  );
}
