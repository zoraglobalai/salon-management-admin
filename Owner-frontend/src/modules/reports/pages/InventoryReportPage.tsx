import { useState } from "react";
import { ArrowLeft, Package, AlertCircle, TrendingUp, Archive, ShoppingCart, BarChart3, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { fetchInventoryReport } from "../../../core/api";
import { useReport } from "../hooks/useReport";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { ExportModal } from "../components/ExportModal";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { cn } from "../../../shared/utils/cn";

type InventoryStatus = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  unit_quantity: number;
  reorder_level: number;
  unit_cost: number;
  sold: number;
  consumed: number;
  consumed_vol: number;
  total_out: number;
  stock_value: number;
  location_name: string;
  opening_stock: number;
  total_in: number;
};

export function InventoryReportPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();

  const columns: Column<InventoryStatus>[] = [
    {
      header: "Product Name",
      accessorKey: "name",
      sortable: true,
      cell: (item: InventoryStatus) => (
        <div className="flex flex-col">
          <span className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{item.name}</span>
          <span className={cn("text-xs", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>SKU: {item.sku || "N/A"}</span>
        </div>
      ),
    },
    {
      header: "Opening Stock",
      accessorKey: "opening_stock",
      align: "center" as const,
      sortable: true,
      cell: (item: InventoryStatus) => <span className={isDark ? "text-[#C8BFB4]" : ""}>{Number(item.opening_stock).toFixed(2).replace(/\.00$/, "")}</span>,
    },
    {
      header: "Total In",
      accessorKey: "total_in",
      align: "center" as const,
      sortable: true,
      cell: (item: InventoryStatus) => <span className={isDark ? "text-[#C8BFB4]" : ""}>{Number(item.total_in).toFixed(2).replace(/\.00$/, "")}</span>,
    },
    {
      header: "Retail Sales",
      accessorKey: "sold",
      align: "center" as const,
      sortable: true,
      cell: (item: InventoryStatus) => (
        <span className={cn("font-medium", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{Number(item.sold).toFixed(2).replace(/\.00$/, "")}</span>
      ),
    },
    {
      header: "Consumed",
      accessorKey: "consumed",
      align: "center" as const,
      sortable: true,
      cell: (item: InventoryStatus) => (
        <div className="flex flex-col items-center">
          <span className={cn("font-medium", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{Number(item.consumed).toFixed(2).replace(/\.00$/, "")}</span>
          {Number(item.consumed_vol) > 0 && (
            <span className={cn("text-[10px] italic", isDark ? "text-[#7A7572]" : "text-gray-400")}>
              ({Number(item.consumed_vol).toLocaleString()} {item.unit})
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Total Out",
      accessorKey: "total_out",
      align: "center" as const,
      sortable: true,
      cell: (item: InventoryStatus) => (
        <span className={cn("font-bold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{Number(item.total_out).toFixed(2).replace(/\.00$/, "")}</span>
      ),
    },
    {
      header: "Stock Value",
      accessorKey: "stock_value",
      align: "right" as const,
      sortable: true,
      cell: (item: InventoryStatus) => (
        <span className={cn("font-medium", isDark ? "text-[#C8BFB4]" : "text-gray-600")}>₹{Number(item.stock_value).toLocaleString()}</span>
      ),
    },
    {
      header: "Status",
      accessorKey: "stock",
      sortable: true,
      cell: (item: InventoryStatus) => {
        const stock = Number(item.stock);
        const reorder = Number(item.reorder_level);
        const isLow = stock < reorder || (stock <= 5 && stock <= reorder);
        const isOut = stock === 0;
        
        if (isOut) return (
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
            isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-100 text-rose-800 border-rose-200"
          )}>
            Out of Stock
          </span>
        );
        if (isLow) return (
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold animate-pulse border",
            isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-100 text-amber-800 border-amber-200"
          )}>
            Restock Needed
          </span>
        );
        return (
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
            isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-100 text-emerald-800 border-emerald-200"
          )}>
            In Stock
          </span>
        );
      }
    },
  ];
  const [showExportModal, setShowExportModal] = useState(false);
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
    <div className={cn("mx-auto flex w-full max-w-[1380px] flex-col gap-6 pb-8", isDark ? "text-[#C8BFB4]" : "text-gray-900")}>
      {/* Header */}
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
          <h1 className={cn("text-2xl font-bold tracking-[-0.03em] md:text-[2rem]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Inventory Report</h1>
          <p className={cn("text-sm md:text-[15px]", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Real-time stock analytics and movement insights.</p>
        </div>
      </div>

      <FiltersBar
        className="sticky top-0 z-10"
        showPaymentSelector={false}
        onFilterChange={(f) => setFilters({ ...filters, ...f, page: 1 })}
        onExport={() => {
          if (!inventoryStatus.length) return toast("No data to export", "error");
          setShowExportModal(true);
        }}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Inventory Report"
        onExport={(type) => {
          const formatData = inventoryStatus.map((item: InventoryStatus) => ({
            Product: item.name,
            SKU: item.sku,
            Branch: item.location_name,
            Stock: item.stock,
            Sold: item.sold,
            UnitCost: item.unit_cost,
            StockValue: item.stock_value,
          }));

          if (type === "excel") {
            exportToExcel(formatData, `Inventory_Report_${new Date().toISOString().split("T")[0]}`);
            toast("Exported as Excel");
          } else {
            exportToPDF(
              formatData,
              ["Product", "SKU", "Branch", "Stock", "Sold", "StockValue"],
              `Inventory_Report_${new Date().toISOString().split("T")[0]}`,
              "Inventory Movement Report",
            );
            toast("Exported as PDF");
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
          <div className={cn(
            "rounded-[24px] border p-6 shadow-sm transition-all duration-200",
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
          )}>
            <div className="mb-4 flex items-center gap-2">
              <div className={cn(
                "rounded-xl p-2",
                isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
              )}>
                <ShoppingCart size={20} />
              </div>
              <h3 className={cn("font-bold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Top Selling Products</h3>
            </div>
            <div className="space-y-4">
              {insights.topSelling.length > 0 ? insights.topSelling.map((item: any, i: number) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold",
                      isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]"
                    )}>
                      {i + 1}
                    </span>
                    <span className={cn("text-sm font-medium", isDark ? "text-[#F0EBE3]" : "text-[#374151]")}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F3F4F6]">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${Math.min(100, (item.sold / (insights.topSelling[0].sold || 1)) * 100)}%` }} 
                      />
                    </div>
                    <span className={cn("text-xs font-bold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>{item.sold} sold</span>
                  </div>
                </div>
              )) : <p className={cn("py-4 text-center text-sm", isDark ? "text-[#7A7572]" : "text-[#9CA3AF]")}>No retail sales data yet</p>}
            </div>
          </div>

          <div className={cn(
            "rounded-[24px] border p-6 shadow-sm transition-all duration-200",
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
          )}>
            <div className="mb-4 flex items-center gap-2">
              <div className={cn(
                "rounded-xl p-2",
                isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
              )}>
                <BarChart3 size={20} />
              </div>
              <h3 className={cn("font-bold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Revenue by Product</h3>
            </div>
            <div className="space-y-4">
              {insights.topSelling.length > 0 ? insights.topSelling.sort((a: any, b: any) => Number(b.revenue) - Number(a.revenue)).map((item: any, i: number) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold",
                      isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]"
                    )}>
                      {i + 1}
                    </span>
                    <span className={cn("text-sm font-medium", isDark ? "text-[#F0EBE3]" : "text-[#374151]")}>{item.name}</span>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-lg",
                    isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                  )}>
                    ₹{Number(item.revenue).toLocaleString()}
                  </span>
                </div>
              )) : <p className={cn("py-4 text-center text-sm", isDark ? "text-[#7A7572]" : "text-[#9CA3AF]")}>No revenue data yet</p>}
            </div>
          </div>
        </div>

        {/* Low Stock & Dead Stock */}
        <div className="grid gap-6">
          <div className={cn(
            "rounded-[24px] border p-6 shadow-sm transition-all duration-200",
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
          )}>
            <div className="mb-4 flex items-center gap-2">
              <div className={cn(
                "rounded-xl p-2",
                isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600"
              )}>
                <AlertCircle size={20} />
              </div>
              <h3 className={cn("font-bold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Low Stock Alerts</h3>
            </div>
            <div className="space-y-3">
              {insights.lowStockAlerts.length > 0 ? insights.lowStockAlerts.map((item: any) => (
                <div key={item.id} className={cn(
                  "flex items-center justify-between rounded-xl border p-3",
                  isDark ? "bg-rose-500/5 border-rose-500/10" : "bg-rose-50/30 border-rose-100"
                )}>
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-bold", isDark ? "text-rose-400" : "text-rose-900")}>{item.name}</span>
                    <span className={cn("text-xs", isDark ? "text-rose-400/80" : "text-rose-700")}>Only {item.stock} remaining (Reorder: {item.reorder_level})</span>
                  </div>
                  <ChevronRight size={16} className="text-rose-400" />
                </div>
              )) : <p className={cn("py-4 text-center text-sm", isDark ? "text-[#7A7572]" : "text-[#9CA3AF]")}>All stock levels healthy</p>}
            </div>
          </div>

          <div className={cn(
            "rounded-[24px] border p-6 shadow-sm transition-all duration-200",
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
          )}>
            <div className="mb-4 flex items-center gap-2">
              <div className={cn(
                "rounded-xl p-2",
                isDark ? "bg-white/10 text-[#7A7572]" : "bg-slate-50 text-slate-600"
              )}>
                <Archive size={20} />
              </div>
              <h3 className={cn("font-bold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Dead Stock (No sales)</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.deadStock.length > 0 ? insights.deadStock.map((item: any) => (
                <div key={item.id} className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium border",
                  isDark ? "bg-white/5 text-[#C8BFB4] border-white/10" : "bg-slate-50 text-slate-600 border-slate-100"
                )}>
                  {item.name}
                </div>
              )) : <p className={cn("w-full py-4 text-center text-sm", isDark ? "text-[#7A7572]" : "text-[#9CA3AF]")}>No dead stock detected</p>}
            </div>
            {insights.deadStock.length > 0 && (
              <p className={cn("mt-4 text-[11px] italic font-medium", isDark ? "text-[#7A7572]" : "text-slate-400")}>* Items with zero retail sales in the selected period.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className={cn(
        "rounded-[24px] border p-5 shadow-sm transition-all duration-200 md:p-6",
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      )}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className={cn("text-lg font-bold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Inventory Ledger</h3>
            <p className={cn("text-sm", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Complete breakdown of stock levels and turnover across branches.</p>
          </div>
          <div className="flex gap-2">
            <div className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold border",
              isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-100"
            )}>
              {loading ? "..." : `${inventoryStatus.length} Products`}
            </div>
            <div className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold border",
              isDark ? "bg-white/5 text-[#7A7572] border-white/10" : "bg-[#FAF7F3] text-[#6B7280] border-[#E8E1D8]"
            )}>
              {filters.locationId === "all" ? "All Branches" : "Filtered View"}
            </div>
          </div>
        </div>
        <ReportDataTable
          columns={columns}
          data={inventoryStatus}
          sortKey="total_out"
          sortDirection="desc"
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </div>
    </div>
  );
}
