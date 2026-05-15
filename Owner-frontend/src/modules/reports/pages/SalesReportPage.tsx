import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { fetchSalesReport } from "../../../core/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { useReport } from "../hooks/useReport";
import { ExportModal } from "../components/ExportModal";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { cn } from "../../../shared/utils/cn";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type SalesRecord = {
  id: string;
  date: string;
  clientName: string;
  locationName: string;
  revenue: number;
  discount: number;
  paymentSplit: string;
  services: Array<{ name: string; staff_name: string | null }>;
  products: Array<{ name: string; quantity: number }>;
};

// columns moved inside SalesReportPage to access theme state

export function SalesReportPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();

  const columns: Column<SalesRecord>[] = [
    {
      header: "Date",
      accessorKey: "date",
      sortable: true,
      cell: (item: SalesRecord) => (
        <div className="flex flex-col">
          <span className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>
            {new Date(item.date).toLocaleDateString()}
          </span>
          <span className={cn("text-[10px] uppercase", isDark ? "text-[#7A7572]" : "text-gray-400")}>
            {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      accessorKey: "clientName",
      cell: (item: SalesRecord) => (
        <span className={cn("font-medium", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>
          {item.clientName}
        </span>
      ),
    },
    {
      header: "Staff",
      accessorKey: "services",
      cell: (item: SalesRecord) => {
        const services = item.services || [];
        const staffNames = Array.from(new Set(services.map((s) => s.staff_name).filter(Boolean)));
        if (staffNames.length === 0) return <span className="text-gray-400 italic text-xs">No staff</span>;
        return (
          <div className="flex flex-wrap gap-2 max-w-[180px]">
            {staffNames.map((name, i) => (
              <span key={i} className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium border shadow-sm",
                isDark 
                  ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4] border-[rgba(255,255,255,0.1)]" 
                  : "bg-gray-50 text-gray-600 border-gray-100"
              )}>
                {name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: "Services",
      accessorKey: "services",
      cell: (item: SalesRecord) => {
        const displayLimit = 3;
        const services = item.services || [];
        return (
          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
            {services.slice(0, displayLimit).map((s, i) => (
              <span key={i} className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium border shadow-sm whitespace-nowrap",
                isDark 
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                  : "bg-blue-50 text-blue-700 border-blue-100"
              )}>
                {s.name}
              </span>
            ))}
            {services.length > displayLimit && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-help",
                  isDark ? "bg-white/10 text-[#C8BFB4]" : "bg-gray-100 text-gray-600"
                )}
                title={services.slice(displayLimit).map((s) => s.name).join(", ")}
              >
                +{services.length - displayLimit}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Products",
      accessorKey: "products",
      cell: (item: SalesRecord) => {
        const displayLimit = 2;
        const products = item.products || [];
        if (products.length === 0) return <span className="text-gray-400 text-xs">None</span>;
        return (
          <div className="flex flex-wrap gap-1.5 max-w-[220px]">
            {products.slice(0, displayLimit).map((p, i) => (
              <span key={i} className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium border shadow-sm whitespace-nowrap",
                isDark 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                  : "bg-amber-50 text-amber-700 border-amber-100"
              )}>
                {p.name} <span className="opacity-60 ml-0.5">x{p.quantity}</span>
              </span>
            ))}
            {products.length > displayLimit && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-help",
                  isDark ? "bg-white/10 text-[#C8BFB4]" : "bg-gray-100 text-gray-600"
                )}
                title={products.slice(displayLimit).map((p) => `${p.name} x${p.quantity}`).join(", ")}
              >
                +{products.length - displayLimit}
              </span>
            )}
          </div>
        );
      },
    },
    { header: "Branch", accessorKey: "locationName", cell: (item: SalesRecord) => <span className={cn("text-xs font-medium", isDark ? "text-[#C8BFB4]" : "text-gray-600")}>{item.locationName}</span> },
    {
      header: "Revenue",
      accessorKey: "revenue",
      sortable: true,
      align: "right" as const,
      cell: (item: SalesRecord) => <span className={cn("font-bold", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>{"\u20B9"}{Number(item.revenue).toLocaleString()}</span>,
    },
    {
      header: "Discount",
      accessorKey: "discount",
      align: "right" as const,
      cell: (item: SalesRecord) => <span className="text-rose-500 font-medium text-xs">{"\u20B9"}{Number(item.discount).toLocaleString()}</span>,
    },
    {
      header: "Payment",
      accessorKey: "paymentSplit",
      cell: (item: SalesRecord) => {
        const method = item.paymentSplit?.toUpperCase() || "UNKNOWN";
        let colorClass = isDark ? "bg-white/5 text-[#C8BFB4] border-white/10" : "bg-gray-100 text-gray-700 border-gray-200";
        if (method === "CASH") colorClass = isDark ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-700 border-green-200";
        if (method === "CARD") colorClass = isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200";
        if (method === "UPI") colorClass = isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200";

        return (
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border", colorClass)}>
            {method}
          </span>
        );
      },
    },
  ];
  const [showExportModal, setShowExportModal] = useState(false);
  const { data, loading, filters, setFilters } = useReport(
    fetchSalesReport,
    {
      startDate: formatLocalDate(new Date()),
      endDate: formatLocalDate(new Date()),
      locationId: "all",
      paymentMethod: "all",
      page: 1,
      limit: 10,
    },
    { refreshMs: 30000 },
  );

  const summary = data?.summary || {
    total_revenue: 0,
    total_sales: 0,
    total_discount: 0,
    avg_order_value: 0,
    total_services_sold: 0,
    total_products_sold: 0,
  };
  const list = data?.list || [];
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
          <h1 className={cn("text-2xl font-bold tracking-[-0.03em] md:text-[2rem]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Sales Analytics</h1>
          {/* <p className={cn("text-sm md:text-[15px]", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Advanced business intelligence for your salon's revenue and transactions.</p> */}
        </div>
      </div>

      <FiltersBar
        className="sticky top-0 z-10"
        onFilterChange={(f) =>
          setFilters({
            ...filters,
            startDate: f.startDate ?? filters.startDate,
            endDate: f.endDate ?? filters.endDate,
            locationId: f.locationId,
            paymentMethod: f.paymentMethod,
            page: 1,
          })
        }
        onExport={() => {
          if (!list.length) return toast("No data to export", "error");
          setShowExportModal(true);
        }}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Sales Report"
        onExport={(type) => {
          const formatData = list.map((item: SalesRecord) => ({
            Date: new Date(item.date).toLocaleString(),
            Customer: item.clientName,
            Staff: Array.from(new Set((item.services || []).map((s) => s.staff_name).filter(Boolean))).join(", "),
            Services: (item.services || []).map((s) => s.name).join(", "),
            Products: (item.products || []).map((p) => `${p.name} x${p.quantity}`).join(", "),
            Branch: item.locationName,
            Revenue: item.revenue,
            Discount: item.discount,
            Payment: item.paymentSplit,
          }));

          if (type === "excel") {
            exportToExcel(formatData, `Sales_Analytics_Report_${new Date().toISOString().split("T")[0]}`);
            toast("Exported as Excel");
          } else {
            exportToPDF(
              formatData,
              ["Date", "Customer", "Staff", "Services", "Products", "Branch", "Revenue", "Discount", "Payment"],
              `Sales_Analytics_Report_${new Date().toISOString().split("T")[0]}`,
              "Sales Analytics Report",
            );
            toast("Exported as PDF");
          }
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title="Total Revenue"
          value={loading ? "..." : `\u20B9${Number(summary.total_revenue || 0).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="revenue"
          trend="neutral"
        />
        <SummaryCard
          title="Transactions"
          value={loading ? "..." : (summary.total_sales || 0).toString()}
          comparisonValue="--"
          comparisonLabel="count"
          trend="neutral"
        />
        <SummaryCard
          title="Avg Order Value"
          value={loading ? "..." : `\u20B9${Math.round(Number(summary.avg_order_value || 0)).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="per bill"
          trend="neutral"
        />
        <SummaryCard
          title="Discounts"
          value={loading ? "..." : `\u20B9${Number(summary.total_discount || 0).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="total"
          trend="neutral"
        />
        <SummaryCard
          title="Services Sold"
          value={loading ? "..." : (summary.total_services_sold || 0).toString()}
          comparisonValue="--"
          comparisonLabel="units"
          trend="neutral"
        />
        <SummaryCard
          title="Products Sold"
          value={loading ? "..." : (summary.total_products_sold || 0).toString()}
          comparisonValue="--"
          comparisonLabel="units"
          trend="neutral"
        />
      </div>

      <div className={cn(
        "rounded-[24px] border p-5 shadow-sm md:p-6 overflow-hidden transition-all duration-200",
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      )}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Sales Transaction Ledger</h3>
            
          </div>
          <div className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]"
          )}>
            {loading ? "Loading..." : `${list.length} record${list.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <div className="overflow-x-auto">
          <ReportDataTable
            columns={columns}
            data={list}
            sortKey="date"
            sortDirection="desc"
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </div>
      </div>
    </div>
  );
}
