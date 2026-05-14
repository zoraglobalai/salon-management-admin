import { useMemo, useState } from "react";
import { ArrowLeft, Building2, Download, Landmark, ReceiptText, Tags, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchExpenseReport, type ExpenseRecord, type ExpenseReportData } from "../../../core/api";
import { useReport } from "../hooks/useReport";
import { SummaryCard } from "../components/SummaryCard";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { ExportModal } from "../components/ExportModal";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { cn } from "../../../shared/utils/cn";
import { FiltersBar } from "../components/FiltersBar";

function formatCurrency(value: number | string) {
  return `\u20B9${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
}

type ExpenseReportFilters = {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  paymentMethod?: string;
  expenseCategory?: string;
  subCategory?: string;
  vendorId?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export function ExpenseReportPage() {
  const { theme } = useDashboardTheme();
  const { toast } = useNotifications();
  const isDark = theme === "dark";
  const [showExportModal, setShowExportModal] = useState(false);

  const { data, loading, filters, setFilters } = useReport<ExpenseReportData, ExpenseReportFilters>(
    fetchExpenseReport,
    {
      locationId: "all",
      paymentMethod: "all",
      expenseCategory: "all",
      subCategory: "all",
      vendorId: "all",
      status: "all",
      page: 1,
      limit: 10,
    },
    { refreshMs: 30000 },
  );

  const rows = data?.rows || [];
  const summary = data?.summary;
  const pagination = data?.pagination || { page: 1, totalPages: 1 };
  const categories = data?.filterMeta?.categories || [];
  const vendors = data?.filterMeta?.vendors || [];
  const categoryOptions = [...new Set(categories.map((item) => item.category))];

  const columns: Column<ExpenseRecord>[] = useMemo(() => [
    {
      header: "Expense ID",
      accessorKey: "id",
      cell: (item) => <span className={cn("font-mono text-xs", isDark ? "text-[#C8BFB4]" : "text-gray-600")}>{item.id.slice(0, 8)}</span>,
    },
    { header: "Expense Category", accessorKey: "sub_category" },
    { header: "Amount", accessorKey: "amount", align: "right" as const, cell: (item) => formatCurrency(item.amount) },
    { header: "Payment Method", accessorKey: "payment_method" },
    { header: "Expense Date", accessorKey: "expense_date", cell: (item) => new Date(item.expense_date).toLocaleDateString("en-GB") },
    { header: "Product Bought", accessorKey: "products_bought", cell: (item) => item.products_bought || "-" },
    { header: "Vendor", accessorKey: "vendor_name" },
    { header: "Staff", accessorKey: "staff_name" },
    { header: "Branch", accessorKey: "branch_name" },
  ], [isDark]);

  return (
    <div className={cn("mx-auto flex w-full max-w-[1500px] flex-col gap-6 pb-2", isDark ? "text-[#C8BFB4]" : "text-gray-900")}>
      <div className={cn("flex flex-wrap items-center gap-4 rounded-[28px] border px-5 py-5 md:px-7", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <Link to="/dashboard/reports" className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.07)] text-[#C8BFB4]" : "bg-white border-[#E8E1D8] text-[#4B5563]")}>
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className={cn("text-2xl font-bold tracking-[-0.03em] md:text-[2rem]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Expense Report</h1>
          <p className={cn("text-sm md:text-[15px]", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Weekly, monthly, and custom expense analytics from attendance salary, purchase cost, GST paid, and sales discounts.</p>
        </div>
      </div>

      <FiltersBar
        onExport={() => {
          if (!rows.length) return toast("No data to export", "error");
          setShowExportModal(true);
        }}
        onFilterChange={(next) => setFilters((current) => ({
          ...current,
          startDate: next.startDate,
          endDate: next.endDate,
          locationId: next.locationId,
          paymentMethod: next.paymentMethod,
          page: 1,
        }))}
      />

      <div className={cn("rounded-[24px] border p-3 md:p-4", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <select value={filters.expenseCategory || "all"} onChange={(event) => setFilters((current) => ({ ...current, expenseCategory: event.target.value, subCategory: "all", page: 1 }))} className={cn("w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4]" : "bg-gray-50 border-[#E8E1D8] text-gray-700")}>
            <option value="all">All Categories</option>
            {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={filters.vendorId || "all"} onChange={(event) => setFilters((current) => ({ ...current, vendorId: event.target.value, page: 1 }))} className={cn("w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4]" : "bg-gray-50 border-[#E8E1D8] text-gray-700")}>
            <option value="all">All Vendors</option>
            {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>)}
          </select>
          <select value={filters.status || "all"} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} className={cn("w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none", isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4]" : "bg-gray-50 border-[#E8E1D8] text-gray-700")}>
            <option value="all">All Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="PARTIAL">PARTIAL</option>
          </select>
          <button onClick={() => setFilters((current) => ({ ...current, expenseCategory: "all", subCategory: "all", vendorId: "all", status: "all", page: 1 }))} className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold", isDark ? "bg-[#1C2030] text-[#C8BFB4]" : "bg-[#FAF7F3] text-[#8B5E3C]")}>
            <Download size={14} className="opacity-0" />
            Reset Report Filters
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Weekly Expense" value={loading ? "..." : formatCurrency(summary?.total_weekly_expense || 0)} comparisonValue={loading ? "--" : formatCurrency(summary?.total_monthly_expense || 0)} comparisonLabel="monthly total" trend="neutral" icon={<Wallet size={20} />} />
        <SummaryCard title="Salary Expense Total" value={loading ? "..." : formatCurrency(summary?.salary_expense_total || 0)} comparisonValue={loading ? "--" : formatCurrency(summary?.purchase_expense_total || 0)} comparisonLabel="purchase total" trend="neutral" icon={<Landmark size={20} />} />
        <SummaryCard title="GST Paid Total" value={loading ? "..." : formatCurrency(summary?.gst_paid_total || 0)} comparisonValue={loading ? "--" : `${summary?.total_vendors_paid || 0}`} comparisonLabel="vendors paid" trend="neutral" icon={<ReceiptText size={20} />} />
        <SummaryCard title="Total Transactions" value={loading ? "..." : String(summary?.total_transactions || 0)} comparisonValue={loading ? "--" : summary?.highest_expense_category || "No Expenses"} comparisonLabel="highest category" trend="neutral" icon={<Tags size={20} />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Monthly Expense" value={loading ? "..." : formatCurrency(summary?.total_monthly_expense || 0)} comparisonValue={loading ? "--" : formatCurrency(summary?.total_weekly_expense || 0)} comparisonLabel="weekly view" trend="neutral" icon={<Wallet size={20} />} />
        <SummaryCard title="Purchase Expense Total" value={loading ? "..." : formatCurrency(summary?.purchase_expense_total || 0)} comparisonValue={loading ? "--" : formatCurrency(summary?.salary_expense_total || 0)} comparisonLabel="salary total" trend="neutral" icon={<Building2 size={20} />} />
        <SummaryCard title="Highest Expense Category" value={loading ? "..." : summary?.highest_expense_category || "No Expenses"} comparisonValue={loading ? "--" : `${summary?.total_vendors_paid || 0}`} comparisonLabel="vendors paid" trend="neutral" icon={<Tags size={20} />} />
        <SummaryCard title="Total Vendors Paid" value={loading ? "..." : String(summary?.total_vendors_paid || 0)} comparisonValue={loading ? "--" : `${summary?.total_transactions || 0}`} comparisonLabel="transactions tracked" trend="neutral" icon={<Building2 size={20} />} />
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Expense Report"
        onExport={(type) => {
          const exportRows = rows.map((row) => ({
            "Expense ID": row.id,
            "Expense Category": row.sub_category,
            Amount: formatCurrency(row.amount),
            "Payment Method": row.payment_method,
            "Expense Date": new Date(row.expense_date).toLocaleDateString("en-GB"),
            "Product Bought": row.products_bought || "-",
            Vendor: row.vendor_name,
            Staff: row.staff_name,
            Branch: row.branch_name,
          }));

          const headers = ["Expense ID", "Expense Category", "Amount", "Payment Method", "Expense Date", "Product Bought", "Vendor", "Staff", "Branch"];

          if (type === "excel") {
            exportToExcel(exportRows, `Expense_Report_${new Date().toISOString().split("T")[0]}`, headers);
            toast("Exported as Excel");
          } else {
            exportToPDF(exportRows, headers, `Expense_Report_${new Date().toISOString().split("T")[0]}`, "Expense Report");
            toast("Exported as PDF");
          }
        }}
      />

      <div className={cn("rounded-[24px] border p-5 md:p-6 overflow-hidden", isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Expense Ledger</h3>
            <p className={cn("text-sm", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Derived expense view across salary, purchase, GST, and sales discount transactions.</p>
          </div>
          <div className={cn("rounded-full px-3 py-1 text-sm font-medium", isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]")}>
            {loading ? "Loading..." : `${data?.pagination?.totalCount || rows.length} record${(data?.pagination?.totalCount || rows.length) === 1 ? "" : "s"}`}
          </div>
        </div>
        <div className="overflow-x-auto">
          <ReportDataTable columns={columns} data={rows} sortKey="expense_date" sortDirection="desc" page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />
        </div>
      </div>
    </div>
  );
}
