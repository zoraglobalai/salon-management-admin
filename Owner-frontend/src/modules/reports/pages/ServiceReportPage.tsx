import { useState } from "react";
import { ArrowLeft, Scissors, BarChart3, PieChart } from "lucide-react";
import { Link } from "react-router-dom";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { fetchServiceReport } from "../../../core/api";
import { useReport } from "../hooks/useReport";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { ExportModal } from "../components/ExportModal";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type ServicePerformance = {
  service_id: string;
  service_name: string;
  usage_count: number;
  revenue: number;
};

const columns: Column<ServicePerformance>[] = [
  { header: "Service Name", accessorKey: "service_name", sortable: true },
  { header: "Usage Count", accessorKey: "usage_count", align: "center" as const, sortable: true },
  {
    header: "Revenue Generated",
    accessorKey: "revenue",
    align: "right" as const,
    sortable: true,
    cell: (item: ServicePerformance) => <span className="font-medium">{"\u20B9"}{Number(item.revenue).toLocaleString()}</span>,
  },
  {
    header: "Avg Ticket Size",
    cell: (item: ServicePerformance) => `\u20B9${Math.round(Number(item.revenue) / Math.max(1, Number(item.usage_count))).toLocaleString()}`,
  },
];

export function ServiceReportPage() {
  const { toast } = useNotifications();
  const [showExportModal, setShowExportModal] = useState(false);

  const { data, loading, filters, setFilters } = useReport(
    fetchServiceReport,
    {
      startDate: formatLocalDate(new Date()),
      endDate: formatLocalDate(new Date()),
      locationId: "all",
      page: 1,
      limit: 10,
    },
    { refreshMs: 30000 },
  );

  const servicePerformance = data?.servicePerformance || [];
  const topService = servicePerformance[0];
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
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#111827] md:text-[2rem]">Service Report</h1>
          <p className="text-sm text-[#6B7280] md:text-[15px]">Analyze service performance and popularity.</p>
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
          if (!servicePerformance.length) return toast("No data to export", "error");
          setShowExportModal(true);
        }}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Service Report"
        onExport={(type) => {
          const formatData = servicePerformance.map((item: ServicePerformance) => ({
            Name: item.service_name,
            Usage: item.usage_count,
            Revenue: item.revenue,
            AvgTicket: Math.round(Number(item.revenue) / Math.max(1, Number(item.usage_count))),
          }));

          if (type === "excel") {
            exportToExcel(formatData, `Service_Performance_Report_${new Date().toISOString().split("T")[0]}`);
            toast("Exported as Excel");
          } else {
            exportToPDF(
              formatData,
              ["Name", "Usage", "Revenue", "AvgTicket"],
              `Service_Performance_Report_${new Date().toISOString().split("T")[0]}`,
              "Service Performance Report"
            );
            toast("Exported as PDF");
          }
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Most Popular"
          value={loading ? "..." : topService?.service_name || "N/A"}
          comparisonValue={loading ? "--" : `${topService?.usage_count || 0}`}
          comparisonLabel="bookings"
          trend="up"
          icon={<Scissors size={20} />}
        />
        <SummaryCard
          title="Top Revenue Source"
          value={loading ? "..." : topService?.service_name || "N/A"}
          comparisonValue={loading ? "--" : `\u20B9${Number(topService?.revenue || 0).toLocaleString()}`}
          comparisonLabel="total revenue"
          trend="up"
          icon={<BarChart3 size={20} />}
        />
        <SummaryCard
          title="Service Variety"
          value={loading ? "..." : servicePerformance.length.toString()}
          comparisonValue="--"
          comparisonLabel="configured services"
          trend="neutral"
          icon={<PieChart size={20} />}
        />
      </div>

      <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[#111827]">Service Performance</h3>
            <p className="text-sm text-[#6B7280]">Popularity, revenue, and ticket size for each service.</p>
          </div>
          <div className="rounded-full bg-[#FAF7F3] px-3 py-1 text-sm font-medium text-[#6B7280]">
            {loading ? "Loading..." : `${servicePerformance.length} record${servicePerformance.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <ReportDataTable
          columns={columns}
          data={servicePerformance}
          sortKey="usage_count"
          sortDirection="desc"
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </div>
    </div>
  );
}
