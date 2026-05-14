import { useState } from "react";
import { ArrowLeft, Scissors, PieChart, FlaskConical, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { fetchServiceReport } from "../../../core/api";
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

export function ServiceReportPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();

  const columns: Column<ServicePerformance>[] = [
    {
      header: "Service Name",
      accessorKey: "service_name",
      sortable: true,
      cell: (item: ServicePerformance) => (
        <div className="flex flex-col">
          <span className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>
            {item.service_name}
          </span>
        </div>
      ),
    },
    {
      header: "Usage Count",
      accessorKey: "usage_count",
      align: "center" as const,
      sortable: true,
      cell: (item: ServicePerformance) => (
        <span className={cn("font-bold", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>
          {Number(item.usage_count).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Revenue Generated",
      accessorKey: "revenue",
      align: "right" as const,
      sortable: true,
      cell: (item: ServicePerformance) => <span className={cn("font-medium", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>{"\u20B9"}{Number(item.revenue).toLocaleString()}</span>,
    },
    {
      header: "Avg Revenue",
      cell: (item: ServicePerformance) => (
        <span className={isDark ? "text-[#7A7572]" : "text-gray-500"}>
          ₹{Math.round(Number(item.revenue) / Math.max(1, Number(item.usage_count))).toLocaleString()}
        </span>
      ),
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
              <span key={i} className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-medium border",
                isDark 
                  ? "bg-[rgba(255,255,255,0.05)] text-dk-body border-[rgba(255,255,255,0.1)]" 
                  : "bg-gray-50 text-gray-600 border-gray-100"
              )}>
                {c.name} {c.quantity}{c.unit}
              </span>
            ))}
            {consumables.length > displayLimit && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-medium cursor-help",
                  isDark ? "bg-[rgba(255,255,255,0.1)] text-dk-body" : "bg-gray-100 text-gray-500"
                )}
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
          <div className={cn("flex flex-col gap-0.5 text-[11px] max-w-[120px] whitespace-normal", isDark ? "text-dk-body" : "text-gray-600")}>
            {consumables.slice(0, 2).map((c, i) => (
              <span key={i}>
                {Math.round(c.quantity * item.usage_count).toLocaleString()}{c.unit} {c.name}
              </span>
            ))}
            {consumables.length > 2 && <span className={cn("text-[10px] italic", isDark ? "text-dk-muted" : "text-gray-400")}>+{consumables.length - 2} more</span>}
          </div>
        );
      },
    },
    {
      header: "Consumable Cost",
      accessorKey: "total_consumable_cost",
      align: "right" as const,
      sortable: true,
      cell: (item: ServicePerformance) => <span className={isDark ? "text-dk-body" : "text-gray-600"}>{"\u20B9"}{Math.round(Number(item.total_consumable_cost || 0)).toLocaleString()}</span>,
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
          <h1 className={cn("text-2xl font-bold tracking-[-0.03em] md:text-[2rem]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Service Analytics</h1>
          {/* <p className={cn("text-sm md:text-[15px]", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Deep dive into your most popular treatments and revenue drivers.</p> */}
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

      <div className={cn(
        "rounded-[24px] border p-5 shadow-sm md:p-6 overflow-hidden transition-all duration-200",
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      )}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Service Performance Table</h3>
            <p className={cn("text-sm", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Compare different services based on volume, value, and resource usage.</p>
          </div>
          <div className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]"
          )}>
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
