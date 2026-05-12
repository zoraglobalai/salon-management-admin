import { useState } from "react";
import { ArrowLeft, Users, UserCheck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { fetchCustomerReport } from "../../../core/api";
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

type CustomerRecord = {
  id: string;
  name: string;
  phone_number: string;
  total_visits: number;
  last_visit_at: string;
  created_at: string;
  location_name: string;
};

// columns moved inside CustomerReportPage to access theme state

export function CustomerReportPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();

  const columns: Column<CustomerRecord>[] = [
    { 
      header: "Name", 
      accessorKey: "name", 
      sortable: true,
      cell: (item: CustomerRecord) => <span className={cn("font-medium", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>{item.name}</span>
    },
    { 
      header: "Phone", 
      accessorKey: "phone_number",
      cell: (item: CustomerRecord) => <span className={isDark ? "text-[#C8BFB4]" : "text-gray-600"}>{item.phone_number}</span>
    },
    { 
      header: "Branch", 
      accessorKey: "location_name", 
      sortable: true,
      cell: (item: CustomerRecord) => <span className={isDark ? "text-[#C8BFB4]" : "text-gray-600"}>{item.location_name}</span>
    },
    { 
      header: "Visits", 
      accessorKey: "total_visits", 
      align: "center" as const, 
      sortable: true,
      cell: (item: CustomerRecord) => <span className={cn("font-bold", isDark ? "text-[#F0EBE3]" : "text-gray-900")}>{item.total_visits}</span>
    },
    {
      header: "Last Visit",
      accessorKey: "last_visit_at",
      cell: (item: CustomerRecord) => (
        <span className={isDark ? "text-[#7A7572]" : "text-gray-500"}>
          {item.last_visit_at ? new Date(item.last_visit_at).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
    {
      header: "Joined",
      accessorKey: "created_at",
      cell: (item: CustomerRecord) => (
        <span className={isDark ? "text-[#7A7572]" : "text-gray-500"}>
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];
  const [showExportModal, setShowExportModal] = useState(false);

  const { data, loading, filters, setFilters } = useReport(
    fetchCustomerReport,
    {
      startDate: formatLocalDate(new Date()),
      endDate: formatLocalDate(new Date()),
      locationId: "all",
      page: 1,
      limit: 10,
    },
    { refreshMs: 30000 },
  );

  const summary = data?.summary || {};
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
          <h1 className={cn("text-2xl font-bold tracking-[-0.03em] md:text-[2rem]", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Customer Report</h1>
          <p className={cn("text-sm md:text-[15px]", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Analyze customer retention and growth.</p>
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
          if (!list.length) return toast("No data to export", "error");
          setShowExportModal(true);
        }}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Customer Report"
        onExport={(type) => {
          const formatData = list.map((item: CustomerRecord) => ({
            Name: item.name,
            Phone: item.phone_number,
            Branch: item.location_name,
            Visits: item.total_visits,
            LastVisit: item.last_visit_at ? new Date(item.last_visit_at).toLocaleDateString() : "N/A",
            Joined: new Date(item.created_at).toLocaleDateString(),
          }));

          if (type === "excel") {
            exportToExcel(formatData, `Customer_Report_${new Date().toISOString().split("T")[0]}`);
            toast("Exported as Excel");
          } else {
            exportToPDF(
              formatData,
              ["Name", "Phone", "Branch", "Visits", "LastVisit", "Joined"],
              `Customer_Report_${new Date().toISOString().split("T")[0]}`,
              "Customer Report",
            );
            toast("Exported as PDF");
          }
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Total Customers"
          value={loading ? "..." : (summary.total_customers || 0).toString()}
          comparisonValue="--"
          comparisonLabel="in selected period"
          trend="neutral"
          icon={<Users size={20} />}
        />
        <SummaryCard
          title="Returning Customers"
          value={loading ? "..." : (summary.returning_customers || 0).toString()}
          comparisonValue={
            loading || !summary.total_customers
              ? "--"
              : `${Math.round((Number(summary.returning_customers || 0) / Math.max(1, Number(summary.total_customers || 1))) * 100)}%`
          }
          comparisonLabel="retention rate"
          trend="up"
          icon={<UserCheck size={20} />}
        />
        <SummaryCard
          title="Avg Visits"
          value={loading ? "..." : Number(summary.avg_visits_per_customer || 0).toFixed(1)}
          comparisonValue="--"
          comparisonLabel="per customer"
          trend="neutral"
          icon={<UserPlus size={20} />}
        />
      </div>

      <div className={cn(
        "rounded-[24px] border p-5 shadow-sm transition-all duration-200 md:p-6",
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      )}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className={cn("font-semibold", isDark ? "text-[#F0EBE3]" : "text-[#111827]")}>Customer List</h3>
            <p className={cn("text-sm", isDark ? "text-[#7A7572]" : "text-[#6B7280]")}>Customer activity and retention details for the selected filters.</p>
          </div>
          <div className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            isDark ? "bg-white/5 text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]"
          )}>
            {loading ? "Loading..." : `${list.length} record${list.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <ReportDataTable
          columns={columns}
          data={list}
          sortKey="last_visit_at"
          sortDirection="desc"
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </div>
    </div>
  );
}
