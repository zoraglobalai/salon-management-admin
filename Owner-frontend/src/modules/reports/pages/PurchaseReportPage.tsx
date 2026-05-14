import { useMemo, useState } from "react";
import { ArrowLeft, Building2, CalendarDays, Download, Package, RotateCcw, ShoppingBag, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchPurchaseReport } from "../../../core/api";
import { useReport } from "../hooks/useReport";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { ExportModal } from "../components/ExportModal";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { cn } from "../../../shared/utils/cn";
import { useOutletContext } from "react-router-dom";
import { SummaryCard } from "../components/SummaryCard";

type PurchaseReportRow = {
  purchase_id: string;
  purchase_date: string;
  invoice_number: string;
  vendor_name: string;
  vendor_phone: string;
  product_name: string;
  category: string;
  unit: string;
  quantity_purchased: number | string;
  cost_price: number | string;
  total_product_cost: number | string;
  payment_status: string;
  payment_method: string;
  total_purchase_amount: number | string;
  stock_added_to_inventory: number | string;
  created_by: string;
  created_at: string;
  location_name: string;
};

type PurchaseReportData = {
  rows: PurchaseReportRow[];
  filterMeta: {
    vendors: Array<{ id: string; vendor_name: string }>;
    products: string[];
    categories: string[];
    paymentStatuses: string[];
    paymentMethods: string[];
  };
};

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
  return `\u20B9${Math.round(value || 0).toLocaleString("en-IN")}`;
}

export function PurchaseReportPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const [showExportModal, setShowExportModal] = useState(false);
  const [rangePreset, setRangePreset] = useState<"today" | "yesterday" | "last7Days" | "lastMonth" | "custom">("last7Days");

  const getTodayRange = () => {
    const today = formatDateForInput(new Date());
    return { startDate: today, endDate: today };
  };

  const getYesterdayRange = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const yesterday = formatDateForInput(date);
    return { startDate: yesterday, endDate: yesterday };
  };

  const getLastMonthRange = () => {
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfLastMonth = new Date(firstDayOfCurrentMonth.getTime() - 24 * 60 * 60 * 1000);
    const firstDayOfLastMonth = new Date(lastDayOfLastMonth.getFullYear(), lastDayOfLastMonth.getMonth(), 1);

    return {
      startDate: formatDateForInput(firstDayOfLastMonth),
      endDate: formatDateForInput(lastDayOfLastMonth),
    };
  };

  const getLast7DaysRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return {
      startDate: formatDateForInput(start),
      endDate: formatDateForInput(end),
    };
  };

  const { data, loading, filters, setFilters } = useReport<PurchaseReportData, any>(
    fetchPurchaseReport,
    {
      ...getLast7DaysRange(),
      locationId: "all",
    },
    { refreshMs: 30000 },
  );

  const rows = data?.rows || [];
  const purchaseSummary = useMemo(() => {
    const uniquePurchases = new Set<string>();
    const uniqueVendors = new Set<string>();
    const uniqueProducts = new Set<string>();

    let totalPurchaseSpend = 0;
    let totalEstimatedGst = 0;

    rows.forEach((row) => {
      if (row.purchase_id) uniquePurchases.add(row.purchase_id);
      if (row.vendor_name) uniqueVendors.add(row.vendor_name.trim().toLowerCase());
      if (row.product_name) uniqueProducts.add(row.product_name.trim().toLowerCase());

      const totalAmount = Number(row.total_purchase_amount || 0);
      const totalProductCost = Number(row.total_product_cost || 0);
      totalPurchaseSpend += totalAmount;
      totalEstimatedGst += Math.max(0, totalAmount - totalProductCost);
    });

    return {
      totalPurchaseSpend,
      totalEstimatedGst,
      uniquePurchaseCount: uniquePurchases.size,
      uniqueVendorCount: uniqueVendors.size,
      uniqueProductCount: uniqueProducts.size,
    };
  }, [rows]);

  const columns: Column<PurchaseReportRow>[] = useMemo(() => [
    { header: "Purchase ID", accessorKey: "purchase_id", cell: (item) => <span className={cn("font-mono text-xs", isDark ? "text-[#C8BFB4]" : "text-gray-600")}>{item.purchase_id.slice(0, 8)}</span> },
    { header: "Purchase Date", accessorKey: "purchase_date", cell: (item) => <span className={cn("font-medium", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>{new Date(item.purchase_date).toLocaleDateString("en-GB")}</span> },
    { header: "Invoice", accessorKey: "invoice_number" },
    { header: "Vendor", accessorKey: "vendor_name" },
    { header: "Vendor Phone", accessorKey: "vendor_phone" },
    { header: "Product", accessorKey: "product_name" },
    { header: "Category", accessorKey: "category", cell: (item) => item.category || "-" },
    { header: "Unit", accessorKey: "unit" },
    { header: "Qty Purchased", accessorKey: "quantity_purchased", align: "right" as const },
    { header: "Cost Price", accessorKey: "cost_price", align: "right" as const, cell: (item) => `Rs ${Number(item.cost_price).toFixed(2)}` },
    { header: "Total Product Cost", accessorKey: "total_product_cost", align: "right" as const, cell: (item) => `Rs ${Number(item.total_product_cost).toFixed(2)}` },
    { header: "Payment Status", accessorKey: "payment_status" },
    { header: "Payment Method", accessorKey: "payment_method" },
    { header: "Total Purchase Amount", accessorKey: "total_purchase_amount", align: "right" as const, cell: (item) => `Rs ${Number(item.total_purchase_amount).toFixed(2)}` },
    { header: "Stock Added", accessorKey: "stock_added_to_inventory", align: "right" as const },
    { header: "Created By", accessorKey: "created_by" },
    { header: "Created At", accessorKey: "created_at", cell: (item) => new Date(item.created_at).toLocaleString("en-GB") },
    { header: "Branch", accessorKey: "location_name" },
  ], [isDark]);

  return (
    <div className={cn("mx-auto flex w-full max-w-[1500px] flex-col gap-6 pb-2", isDark ? "text-[#C8BFB4]" : "text-gray-900")}>
      <div className={cn("flex flex-wrap items-center gap-4 rounded-[28px] border px-5 py-5 md:px-7", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <Link to="/dashboard/reports" className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.07)] text-[#C8BFB4]" : "bg-white border-[#E8E1D8] text-[#4B5563]")}>
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className={cn("text-2xl font-bold tracking-[-0.03em] md:text-[2rem]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Purchase Report</h1>
          <p className={cn("text-sm md:text-[15px]", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>End-to-end purchase details from vendor to inventory updates.</p>
        </div>
      </div>

      <div className={cn("rounded-[24px] border p-3 md:p-4", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <div className="relative lg:col-span-2">
            <CalendarDays size={15} className={cn("absolute left-3 top-3", isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]")} />
            <select
              value={rangePreset}
              onChange={(e) => {
                const preset = e.target.value as "today" | "yesterday" | "last7Days" | "lastMonth" | "custom";
                setRangePreset(preset);
                if (preset === "custom") return;
                if (preset === "today") {
                  setFilters({ ...filters, ...getTodayRange() });
                  return;
                }
                if (preset === "yesterday") {
                  setFilters({ ...filters, ...getYesterdayRange() });
                  return;
                }
                if (preset === "last7Days") {
                  setFilters({ ...filters, ...getLast7DaysRange() });
                  return;
                }
                setFilters({ ...filters, ...getLastMonthRange() });
              }}
              className={cn("w-full appearance-none rounded-xl border pl-9 pr-3 py-2.5 text-sm font-semibold outline-none", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4]" : "bg-gray-50 border-[#E8E1D8] text-gray-700")}
            >
              <option value="last7Days">Last 7 Days</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <label className="flex min-w-0 flex-col items-center gap-1 lg:col-span-2">
            <span className={cn("text-xs font-semibold uppercase text-center", isDark ? "text-[#7A7572]" : "text-gray-500")}>From</span>
            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => {
                setRangePreset("custom");
                setFilters({ ...filters, startDate: e.target.value });
              }}
              className={cn("w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)]" : "bg-gray-50 border-[#E8E1D8]")}
            />
          </label>
          <label className="flex min-w-0 flex-col items-center gap-1 lg:col-span-2">
            <span className={cn("text-xs font-semibold uppercase text-center", isDark ? "text-[#7A7572]" : "text-gray-500")}>To</span>
            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => {
                setRangePreset("custom");
                setFilters({ ...filters, endDate: e.target.value });
              }}
              className={cn("w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)]" : "bg-gray-50 border-[#E8E1D8]")}
            />
          </label>
          <select
            value={filters.locationId || "all"}
            onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
            className={cn("w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none lg:col-span-2", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4]" : "bg-gray-50 border-[#E8E1D8] text-gray-700")}
          >
            <option value="all">All Branches</option>
            {(ownerLocations || []).map((location) => (
              <option key={location.id} value={location.id}>{location.city || location.name}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setRangePreset("today");
              setFilters({ ...filters, ...getTodayRange(), locationId: "all" });
            }}
            className={cn("inline-flex w-full items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-xs font-semibold sm:w-auto lg:col-span-1", isDark ? "text-[#C8BFB4]" : "text-[#8B5E3C]")}
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            onClick={() => { if (!rows.length) return toast("No data to export", "error"); setShowExportModal(true); }}
            className={cn("inline-flex w-full min-w-[140px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white sm:w-auto lg:col-span-2", isDark ? "bg-[#0F172A]" : "bg-[#0F172A]")}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Purchase Spend"
          value={loading ? "..." : formatCurrency(purchaseSummary.totalPurchaseSpend)}
          comparisonValue={loading ? "--" : `${purchaseSummary.uniquePurchaseCount}`}
          comparisonLabel="purchase records"
          trend="neutral"
          icon={<ShoppingBag size={20} />}
        />
        <SummaryCard
          title="Vendor Partners"
          value={loading ? "..." : purchaseSummary.uniqueVendorCount.toString()}
          comparisonValue={loading ? "--" : `${purchaseSummary.uniqueProductCount}`}
          comparisonLabel="products covered"
          trend="neutral"
          icon={<Building2 size={20} />}
        />
        <SummaryCard
          title="Products Purchased"
          value={loading ? "..." : purchaseSummary.uniqueProductCount.toString()}
          comparisonValue={loading ? "--" : `${rows.length}`}
          comparisonLabel="ledger rows"
          trend="neutral"
          icon={<Package size={20} />}
        />
        <SummaryCard
          title="Estimated GST"
          value={loading ? "..." : formatCurrency(purchaseSummary.totalEstimatedGst)}
          comparisonValue={loading ? "--" : formatCurrency(purchaseSummary.uniquePurchaseCount ? purchaseSummary.totalEstimatedGst / purchaseSummary.uniquePurchaseCount : 0)}
          comparisonLabel="avg GST per purchase"
          trend="neutral"
          icon={<Wallet size={20} />}
        />
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Purchase Report"
        onExport={(type) => {
          const exportRows = rows.map((row) => ({
            "Purchase ID": row.purchase_id,
            "Purchase Date": new Date(row.purchase_date).toLocaleDateString("en-GB"),
            "Invoice Number": row.invoice_number,
            "Vendor Name": row.vendor_name,
            "Vendor Phone": row.vendor_phone,
            "Product Name": row.product_name,
            Category: row.category,
            Unit: row.unit,
            "Quantity Purchased": row.quantity_purchased,
            "Cost Price": row.cost_price,
            "Total Product Cost": row.total_product_cost,
            "Payment Status": row.payment_status,
            "Payment Method": row.payment_method,
            "Total Purchase Amount": row.total_purchase_amount,
            "Stock Added to Inventory": row.stock_added_to_inventory,
            "Created By": row.created_by,
            "Created At": new Date(row.created_at).toLocaleString("en-GB"),
            Branch: row.location_name,
          }));

          if (type === "excel") {
            exportToExcel(
              exportRows,
              `Purchase_Report_${new Date().toISOString().split("T")[0]}`,
              ["Purchase ID", "Purchase Date", "Invoice Number", "Vendor Name", "Vendor Phone", "Product Name", "Category", "Unit", "Quantity Purchased", "Cost Price", "Total Product Cost", "Payment Status", "Payment Method", "Total Purchase Amount", "Stock Added to Inventory", "Created By", "Created At", "Branch"],
            );
            toast("Exported as Excel");
          } else {
            exportToPDF(
              exportRows,
              ["Purchase ID", "Purchase Date", "Invoice Number", "Vendor Name", "Vendor Phone", "Product Name", "Category", "Unit", "Quantity Purchased", "Cost Price", "Total Product Cost", "Payment Status", "Payment Method", "Total Purchase Amount", "Stock Added to Inventory", "Created By", "Created At", "Branch"],
              `Purchase_Report_${new Date().toISOString().split("T")[0]}`,
              "Purchase Report",
            );
            toast("Exported as PDF");
          }
        }}
      />

      <div className={cn("rounded-[24px] border p-5 md:p-6 overflow-hidden", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Purchase Ledger</h3>
          <div className={cn("rounded-full px-3 py-1 text-sm font-medium", isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]")}>
            {loading ? "Loading..." : `${rows.length} row${rows.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <div className="overflow-x-auto">
          <ReportDataTable columns={columns} data={rows} sortKey="purchase_date" sortDirection="desc" />
        </div>
      </div>
    </div>
  );
}
