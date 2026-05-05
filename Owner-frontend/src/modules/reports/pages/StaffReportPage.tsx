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
};

const columns: Column<StaffPerformance>[] = [
  { header: "Staff Member", accessorKey: "staff_name", sortable: true },
  { header: "Services Count", accessorKey: "services_count", align: "center" as const, sortable: true },
  {
    header: "Revenue Generated",
    accessorKey: "revenue",
    align: "right" as const,
    sortable: true,
    cell: (item: StaffPerformance) => <span className="font-medium">{"\u20B9"}{Number(item.revenue).toLocaleString()}</span>,
  },
  {
    header: "Efficiency",
    cell: (item: StaffPerformance) => `\u20B9${Math.round(Number(item.revenue) / Math.max(1, Number(item.services_count))).toLocaleString()} / service`,
  },
];

export function StaffReportPage() {
  const { toast } = useNotifications();
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
    <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-6 pb-2">
      <div className="flex flex-wrap items-center gap-4 rounded-[28px] border border-[#E8E1D8] bg-[linear-gradient(180deg,#FFFDF9_0%,#FAF7F3_100%)] px-5 py-5 shadow-[0_16px_48px_rgba(94,72,52,0.08)] md:px-7">
        <Link
          to="/dashboard/reports"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D8] bg-white text-[#4B5563] transition hover:bg-[#FAF7F3] hover:text-[#111827]"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#111827] md:text-[2rem]">Staff Report</h1>
          <p className="text-sm text-[#6B7280] md:text-[15px]">Monitor staff productivity and performance.</p>
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
            Name: item.staff_name,
            Services: item.services_count,
            Revenue: item.revenue,
            Efficiency: Math.round(Number(item.revenue) / Math.max(1, Number(item.services_count))),
          }));

          if (type === "excel") {
            exportToExcel(formatData, `Staff_Performance_Report_${new Date().toISOString().split("T")[0]}`);
            toast("Exported as Excel");
          } else {
            exportToPDF(
              formatData,
              ["Name", "Services", "Revenue", "Efficiency"],
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

      <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[#111827]">Performance Breakdown</h3>
            <p className="text-sm text-[#6B7280]">Staff output, revenue contribution, and efficiency in one place.</p>
          </div>
          <div className="rounded-full bg-[#FAF7F3] px-3 py-1 text-sm font-medium text-[#6B7280]">
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
