import { useState } from "react";
import { ArrowLeft, Scissors, BarChart3, PieChart, FlaskConical, TrendingUp } from "lucide-react";
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

type Consumable = {
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
};

type ServicePerformance = {
  service_id: string;
  service_name: string;
  usage_count: number;
  revenue: number;
  consumables: Consumable[];
  cost_per_booking: number;
  total_consumable_cost: number;
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
    header: "Avg Revenue",
    cell: (item: ServicePerformance) => `\u20B9${Math.round(Number(item.revenue) / Math.max(1, Number(item.usage_count))).toLocaleString()}`,
  },
  {
    header: "Consumables Used",
    cell: (item: ServicePerformance) => {
      const displayLimit = 1;
      const consumables = item.consumables || [];
      if (consumables.length === 0) return <span className="text-gray-400 text-xs italic">None</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-[150px] whitespace-normal">
          {consumables.slice(0, displayLimit).map((c, i) => (
            <span key={i} className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-100">
              {c.name} {c.quantity}{c.unit}
            </span>
          ))}
          {consumables.length > displayLimit && (
            <span
              className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500 cursor-help"
              title={consumables.slice(displayLimit).map((c) => `${c.name} (${c.quantity}${c.unit})`).join(", ")}
            >
              +{consumables.length - displayLimit}
            </span>
          )}
        </div>
      );
    },
  },
  {
    header: "Total Consumption",
    cell: (item: ServicePerformance) => {
      const consumables = item.consumables || [];
      if (consumables.length === 0) return <span className="text-gray-400 text-xs">-</span>;
      return (
        <div className="flex flex-col gap-0.5 text-[11px] text-gray-600 max-w-[120px] whitespace-normal">
          {consumables.slice(0, 2).map((c, i) => (
            <span key={i}>
              {Math.round(c.quantity * item.usage_count).toLocaleString()}{c.unit} {c.name}
            </span>
          ))}
          {consumables.length > 2 && <span className="text-[10px] text-gray-400 italic">+{consumables.length - 2} more</span>}
        </div>
      );
    },
  },
  {
    header: "Consumable Cost",
    accessorKey: "total_consumable_cost",
    align: "right" as const,
    sortable: true,
    cell: (item: ServicePerformance) => <span className="text-gray-600">{"\u20B9"}{Math.round(Number(item.total_consumable_cost || 0)).toLocaleString()}</span>,
  },
  {
    header: "Est. Profit",
    align: "right" as const,
    cell: (item: ServicePerformance) => {
      const profit = Number(item.revenue) - Number(item.total_consumable_cost || 0);
      return (
        <span className={`font-semibold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {"\u20B9"}{Math.round(profit).toLocaleString()}
        </span>
      );
    },
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
  const summary = data?.summary || { total_consumable_cost: 0, low_stock_count: 0, low_stock_item: "None" };
  const topService = servicePerformance[0];
  const mostProfitable = [...servicePerformance].sort((a, b) => {
    const profitA = Number(a.revenue) - Number(a.total_consumable_cost || 0);
    const profitB = Number(b.revenue) - Number(b.total_consumable_cost || 0);
    return profitB - profitA;
  })[0];
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
        title="Service Intelligence Report"
        onExport={(type) => {
          const formatData = servicePerformance.map((item: ServicePerformance) => {
            const consumablesText = (item.consumables || []).map((c) => `${c.name} (${c.quantity}${c.unit})`).join(", ");
            const totalConsumptionText = (item.consumables || []).map((c) => `${Math.round(c.quantity * item.usage_count).toLocaleString()}${c.unit} ${c.name}`).join(", ");
            const profit = Number(item.revenue) - Number(item.total_consumable_cost || 0);
            
            return {
              "Service Name": item.service_name,
              "Usage Count": item.usage_count,
              "Revenue Generated": Number(item.revenue),
              "Avg Revenue": Math.round(Number(item.revenue) / Math.max(1, Number(item.usage_count))),
              "Consumables / Service": consumablesText || "None",
              "Total Consumption": totalConsumptionText || "-",
              "Total Consumable Cost": Math.round(Number(item.total_consumable_cost || 0)),
              "Estimated Profit": Math.round(profit),
            };
          });

          if (type === "excel") {
            exportToExcel(formatData, `Service_Intelligence_Report_${new Date().toISOString().split("T")[0]}`);
            toast("Exported as Excel");
          } else {
            exportToPDF(
              formatData,
              ["Service Name", "Usage Count", "Revenue Generated", "Avg Revenue", "Consumables / Service", "Total Consumption", "Total Consumable Cost", "Estimated Profit"],
              `Service_Intelligence_Report_${new Date().toISOString().split("T")[0]}`,
              "Service Intelligence Report"
            );
            toast("Exported as PDF");
          }
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <SummaryCard
          title="Most Popular"
          value={loading ? "..." : topService?.service_name || "N/A"}
          comparisonValue={loading ? "--" : `${topService?.usage_count || 0}`}
          comparisonLabel="bookings"
          trend="up"
          icon={<Scissors size={20} />}
        />
        <SummaryCard
          title="Most Profitable"
          value={loading ? "..." : mostProfitable?.service_name || "N/A"}
          comparisonValue={loading ? "--" : `\u20B9${Math.round(Number(mostProfitable?.revenue || 0) - Number(mostProfitable?.total_consumable_cost || 0)).toLocaleString()}`}
          comparisonLabel="estimated profit"
          trend="up"
          icon={<TrendingUp size={20} />}
        />
        <SummaryCard
          title="Total Consumable Cost"
          value={loading ? "..." : `\u20B9${Math.round(Number(summary.total_consumable_cost)).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="inventory spend"
          trend="neutral"
          icon={<FlaskConical size={20} />}
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
