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

const columns: Column<SalesRecord>[] = [
  {
    header: "Date",
    accessorKey: "date",
    sortable: true,
    cell: (item: SalesRecord) => (
      <div className="flex flex-col">
        <span className="font-semibold text-gray-900">{new Date(item.date).toLocaleDateString()}</span>
        <span className="text-[10px] uppercase text-gray-400">{new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    ),
  },
  {
    header: "Customer",
    accessorKey: "clientName",
    cell: (item: SalesRecord) => (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{item.clientName}</span>
      </div>
    ),
  },
  {
    header: "Staff",
    accessorKey: "services",
    cell: (item: SalesRecord) => {
      const services = item.services || [];
      const staffNames = Array.from(new Set(services.map((s) => s.staff_name).filter(Boolean)));
      if (staffNames.length === 0) return <span className="text-gray-400 italic text-xs whitespace-normal">No staff</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-[150px] whitespace-normal">
          {staffNames.map((name, i) => (
            <span key={i} className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-100">
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
      const displayLimit = 2;
      const services = item.services || [];
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px] whitespace-normal">
          {services.slice(0, displayLimit).map((s, i) => (
            <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100">
              {s.name}
            </span>
          ))}
          {services.length > displayLimit && (
            <span
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 cursor-help"
              title={services.slice(displayLimit).map((s) => s.name).join(", ")}
            >
              +{services.length - displayLimit} more
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
      const displayLimit = 1;
      const products = item.products || [];
      if (products.length === 0) return <span className="text-gray-400 text-xs whitespace-normal">None</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-[150px] whitespace-normal">
          {products.slice(0, displayLimit).map((p, i) => (
            <span key={i} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">
              {p.name} x{p.quantity}
            </span>
          ))}
          {products.length > displayLimit && (
            <span
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 cursor-help"
              title={products.slice(displayLimit).map((p) => `${p.name} x${p.quantity}`).join(", ")}
            >
              +{products.length - displayLimit} more
            </span>
          )}
        </div>
      );
    },
  },
  { header: "Branch", accessorKey: "locationName", cell: (item: SalesRecord) => <span className="text-xs font-medium text-gray-600">{item.locationName}</span> },
  {
    header: "Revenue",
    accessorKey: "revenue",
    sortable: true,
    align: "right" as const,
    cell: (item: SalesRecord) => <span className="font-bold text-gray-900">{"\u20B9"}{Number(item.revenue).toLocaleString()}</span>,
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
      let colorClass = "bg-gray-100 text-gray-700 border-gray-200";
      if (method === "CASH") colorClass = "bg-green-50 text-green-700 border-green-200";
      if (method === "CARD") colorClass = "bg-blue-50 text-blue-700 border-blue-200";
      if (method === "UPI") colorClass = "bg-purple-50 text-purple-700 border-purple-200";

      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${colorClass}`}>
          {method}
        </span>
      );
    },
  },
];

export function SalesReportPage() {
  const { toast } = useNotifications();
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
    <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-6 pb-2">
      <div className="flex flex-wrap items-center gap-4 rounded-[28px] border border-[#E8E1D8] bg-[linear-gradient(180deg,#FFFDF9_0%,#FAF7F3_100%)] px-5 py-5 shadow-[0_16px_48px_rgba(94,72,52,0.08)] md:px-7">
        <Link
          to="/dashboard/reports"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D8] bg-white text-[#4B5563] transition hover:bg-[#FAF7F3] hover:text-[#111827]"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#111827] md:text-[2rem]">Sales Analytics</h1>
          <p className="text-sm text-[#6B7280] md:text-[15px]">Advanced business intelligence for your salon's revenue and transactions.</p>
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

      <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-5 shadow-sm md:p-6 overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[#111827]">Sales Transaction Ledger</h3>
            <p className="text-sm text-[#6B7280]">Detailed transactional insights including staff and itemized breakdowns.</p>
          </div>
          <div className="rounded-full bg-[#FAF7F3] px-3 py-1 text-sm font-medium text-[#6B7280]">
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
