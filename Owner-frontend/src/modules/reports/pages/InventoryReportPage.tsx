import { ArrowLeft, Package, AlertCircle, TrendingUp, Activity, Archive, ShoppingCart, BarChart3, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { fetchInventoryReport } from "../../../core/api";
import { useReport } from "../hooks/useReport";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { cn } from "../../../shared/utils/cn";

type InventoryStatus = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reorder_level: number;
  unit_cost: number;
  sold: number;
  consumed: number;
  total_out: number;
  stock_value: number;
  location_name: string;
};

const columns: Column<InventoryStatus>[] = [
  {
    header: "Product",
    accessorKey: "name",
    sortable: true,
    cell: (item: InventoryStatus) => (
      <div className="flex flex-col">
        <span className="font-semibold text-[#111827]">{item.name}</span>
        <span className="text-xs text-[#6B7280]">SKU: {item.sku || "N/A"}</span>
      </div>
    ),
  },
  { header: "Branch", accessorKey: "location_name", sortable: true },
  {
    header: "Current Stock",
    accessorKey: "stock",
    align: "center" as const,
    sortable: true,
    cell: (item: InventoryStatus) => {
      const stock = Number(item.stock);
      const reorder = Number(item.reorder_level);
      const isLow = stock < reorder || (stock <= 5 && stock <= reorder);
      return (
        <span className={cn(
          "font-bold",
          isLow ? "text-rose-600" : "text-emerald-600"
        )}>
          {Number(item.stock).toFixed(2).replace(/\.00$/, "")}
        </span>
      );
    },
  },
  {
    header: "Total Sold",
    accessorKey: "sold",
    align: "center" as const,
    sortable: true,
    cell: (item: InventoryStatus) => (
      <span className="font-medium text-[#111827]">{Number(item.sold).toFixed(2).replace(/\.00$/, "")}</span>
    ),
  },
  {
    header: "Status",
    accessorKey: "id",
    align: "center" as const,
    cell: (item: InventoryStatus) => {
      const stock = Number(item.stock);
      const reorder = Number(item.reorder_level);
      const isLow = stock < reorder || (stock <= 5 && stock <= reorder);
      const isOut = stock === 0;
      
      if (isOut) return <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">Out of Stock</span>;
      if (isLow) return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 font-bold animate-pulse">Restock Needed</span>;
      return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">In Stock</span>;
    }
  },
];

export function InventoryReportPage() {
  const { data, loading, filters, setFilters } = useReport(
    fetchInventoryReport,
    { locationId: "all", page: 1, limit: 10 },
    { refreshMs: 30000 },
  );

  const inventoryStatus = data?.inventoryStatus || [];
  const summary = data?.summary || {
    totalStockValue: 0,
    totalProductRevenue: 0,
    lowStockCount: 0,
    productsSoldToday: 0,
    fastMovingProduct: "N/A"
  };
  const insights = data?.insights || {
    topSelling: [],
    lowStockAlerts: [],
    deadStock: [],
    highConsumption: []
  };
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 rounded-[28px] border border-[#E8E1D8] bg-[linear-gradient(180deg,#FFFDF9_0%,#FAF7F3_100%)] px-5 py-5 shadow-[0_16px_48px_rgba(94,72,52,0.08)] md:px-7">
        <Link
          to="/dashboard/reports"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D8] bg-white text-[#4B5563] transition hover:bg-[#FAF7F3] hover:text-[#111827]"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#111827] md:text-[2rem]">Inventory Report</h1>
          <p className="text-sm text-[#6B7280] md:text-[15px]">Real-time stock analytics and movement insights.</p>
        </div>
      </div>

      <FiltersBar
        className="sticky top-0 z-10"
        showPaymentSelector={false}
        onFilterChange={(f) => setFilters({ ...filters, ...f, page: 1 })}
        onExport={() => {
          if (!inventoryStatus.length) return alert("No data to export");
          const formatData = inventoryStatus.map((item: InventoryStatus) => ({
            Product: item.name,
            SKU: item.sku,
            Branch: item.location_name,
            Stock: item.stock,
            Sold: item.sold,
            UnitCost: item.unit_cost,
            StockValue: item.stock_value,
          }));

          const choice = window.confirm("Export as Excel? (Cancel for PDF)");
          if (choice) {
            exportToExcel(formatData, `Inventory_Report_${new Date().toISOString().split("T")[0]}`);
          } else {
            exportToPDF(
              formatData,
              ["Product", "SKU", "Branch", "Stock", "Sold", "StockValue"],
              `Inventory_Report_${new Date().toISOString().split("T")[0]}`,
              "Inventory Movement Report",
            );
          }
        }}
      />

      {/* KPI Section */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Stock Value"
          value={loading ? "..." : `\u20B9${Number(summary.totalStockValue).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="Estimated inventory worth"
          trend="neutral"
          icon={<Package size={20} className="text-blue-500" />}
        />
        <SummaryCard
          title="Product Revenue"
          value={loading ? "..." : `\u20B9${Number(summary.totalProductRevenue).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="Revenue from retail sales"
          trend="up"
          icon={<BarChart3 size={20} className="text-emerald-500" />}
        />
        <SummaryCard
          title="Low Stock Items"
          value={loading ? "..." : summary.lowStockCount.toString()}
          comparisonValue="--"
          comparisonLabel="Requires attention"
          trend={summary.lowStockCount > 0 ? "down" : "neutral"}
          icon={<AlertCircle size={20} className={summary.lowStockCount > 0 ? "text-rose-500" : "text-emerald-500"} />}
        />
        <SummaryCard
          title="Fast Moving Product"
          value={loading ? "..." : summary.fastMovingProduct}
          comparisonValue="--"
          comparisonLabel="Highest turnover item"
          trend="up"
          icon={<TrendingUp size={20} className="text-indigo-500" />}
        />
      </div>

      {/* Business Insights Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Selling & Revenue */}
        <div className="grid gap-6">
          <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <ShoppingCart size={20} />
              </div>
              <h3 className="font-bold text-[#111827]">Top Selling Products</h3>
            </div>
            <div className="space-y-4">
              {insights.topSelling.length > 0 ? insights.topSelling.map((item: any, i: number) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FAF7F3] text-xs font-bold text-[#6B7280]">{i + 1}</span>
                    <span className="text-sm font-medium text-[#374151]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F3F4F6]">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${Math.min(100, (item.sold / (insights.topSelling[0].sold || 1)) * 100)}%` }} 
                      />
                    </div>
                    <span className="text-xs font-bold text-[#111827]">{item.sold} sold</span>
                  </div>
                </div>
              )) : <p className="py-4 text-center text-sm text-[#9CA3AF]">No retail sales data yet</p>}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                <BarChart3 size={20} />
              </div>
              <h3 className="font-bold text-[#111827]">Revenue by Product</h3>
            </div>
            <div className="space-y-4">
              {insights.topSelling.length > 0 ? insights.topSelling.sort((a: any, b: any) => Number(b.revenue) - Number(a.revenue)).map((item: any, i: number) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FAF7F3] text-xs font-bold text-[#6B7280]">{i + 1}</span>
                    <span className="text-sm font-medium text-[#374151]">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">₹{Number(item.revenue).toLocaleString()}</span>
                </div>
              )) : <p className="py-4 text-center text-sm text-[#9CA3AF]">No revenue data yet</p>}
            </div>
          </div>
        </div>

        {/* Low Stock & Dead Stock */}
        <div className="grid gap-6">
          <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <AlertCircle size={20} />
              </div>
              <h3 className="font-bold text-[#111827]">Low Stock Alerts</h3>
            </div>
            <div className="space-y-3">
              {insights.lowStockAlerts.length > 0 ? insights.lowStockAlerts.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/30 p-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-rose-900">{item.name}</span>
                    <span className="text-xs text-rose-700">Only {item.stock} remaining (Reorder: {item.reorder_level})</span>
                  </div>
                  <ChevronRight size={16} className="text-rose-400" />
                </div>
              )) : <p className="py-4 text-center text-sm text-[#9CA3AF]">All stock levels healthy</p>}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-slate-50 p-2 text-slate-600">
                <Archive size={20} />
              </div>
              <h3 className="font-bold text-[#111827]">Dead Stock (No sales)</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.deadStock.length > 0 ? insights.deadStock.map((item: any) => (
                <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-100">
                  {item.name}
                </div>
              )) : <p className="w-full py-4 text-center text-sm text-[#9CA3AF]">No dead stock detected</p>}
            </div>
            {insights.deadStock.length > 0 && (
              <p className="mt-4 text-[11px] text-slate-400 italic font-medium">* Items with zero retail sales in the selected period.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#111827]">Inventory Ledger</h3>
            <p className="text-sm text-[#6B7280]">Complete breakdown of stock levels and turnover across branches.</p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-100">
              {loading ? "..." : `${inventoryStatus.length} Products`}
            </div>
            <div className="rounded-full bg-[#FAF7F3] px-4 py-1.5 text-xs font-bold text-[#6B7280] border border-[#E8E1D8]">
              {filters.locationId === "all" ? "All Branches" : "Filtered View"}
            </div>
          </div>
        </div>
        <ReportDataTable
          columns={columns}
          data={inventoryStatus}
          sortKey="sold"
          sortDirection="desc"
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </div>
    </div>
  );
}
