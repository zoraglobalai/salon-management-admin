import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { fetchSalesReport } from "../../../core/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { useReport } from "../hooks/useReport";

type SalesRecord = {
  id: string;
  date: string;
  clientName: string;
  locationName: string;
  revenue: number;
  discount: number;
  paymentSplit: string;
};

const columns: Column<SalesRecord>[] = [
  {
    header: "Date",
    accessorKey: "date",
    sortable: true,
    cell: (item: SalesRecord) => new Date(item.date).toLocaleDateString(),
  },
  { header: "Client", accessorKey: "clientName" },
  { header: "Location", accessorKey: "locationName" },
  {
    header: "Revenue",
    accessorKey: "revenue",
    sortable: true,
    align: "right" as const,
    cell: (item: SalesRecord) => <span className="font-medium">{"\u20B9"}{Number(item.revenue).toLocaleString()}</span>,
  },
  {
    header: "Discount",
    accessorKey: "discount",
    align: "right" as const,
    cell: (item: SalesRecord) => <span className="text-rose-500">{"\u20B9"}{Number(item.discount).toLocaleString()}</span>,
  },
  { header: "Payment", accessorKey: "paymentSplit" },
];

export function SalesReportPage() {
  const { data, loading, filters, setFilters } = useReport(
    fetchSalesReport,
    {
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
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
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#111827] md:text-[2rem]">Sales Report</h1>
          <p className="text-sm text-[#6B7280] md:text-[15px]">Detailed breakdown of your revenue and transactions.</p>
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
          if (!list.length) return alert("No data to export");
          const formatData = list.map((item: SalesRecord) => ({
            Date: new Date(item.date).toLocaleDateString(),
            Client: item.clientName,
            Location: item.locationName,
            Revenue: item.revenue,
            Discount: item.discount,
            Payment: item.paymentSplit,
          }));

          const choice = window.confirm("Export as Excel? (Cancel for PDF)");
          if (choice) {
            exportToExcel(formatData, `Sales_Report_${new Date().toISOString().split("T")[0]}`);
          } else {
            exportToPDF(
              formatData,
              ["Date", "Client", "Location", "Revenue", "Discount", "Payment"],
              `Sales_Report_${new Date().toISOString().split("T")[0]}`,
              "Sales Report",
            );
          }
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={loading ? "..." : `\u20B9${Number(summary.total_revenue || 0).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="in selected period"
          trend="neutral"
        />
        <SummaryCard
          title="Total Sales"
          value={loading ? "..." : (summary.total_sales || 0).toString()}
          comparisonValue="--"
          comparisonLabel="in selected period"
          trend="neutral"
        />
        <SummaryCard
          title="Avg Order Value"
          value={loading ? "..." : `\u20B9${Math.round(Number(summary.avg_order_value || 0)).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="per transaction"
          trend="neutral"
        />
        <SummaryCard
          title="Total Discounts"
          value={loading ? "..." : `\u20B9${Number(summary.total_discount || 0).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="in selected period"
          trend="neutral"
        />
      </div>

      <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[#111827]">Sales Data</h3>
            <p className="text-sm text-[#6B7280]">Transaction-level details for the selected filters.</p>
          </div>
          <div className="rounded-full bg-[#FAF7F3] px-3 py-1 text-sm font-medium text-[#6B7280]">
            {loading ? "Loading..." : `${list.length} record${list.length === 1 ? "" : "s"}`}
          </div>
        </div>
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
  );
}
