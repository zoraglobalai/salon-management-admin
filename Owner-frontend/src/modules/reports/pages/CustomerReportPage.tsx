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

const columns: Column<CustomerRecord>[] = [
  { header: "Name", accessorKey: "name", sortable: true },
  { header: "Phone", accessorKey: "phone_number" },
  { header: "Branch", accessorKey: "location_name", sortable: true },
  { header: "Visits", accessorKey: "total_visits", align: "center" as const, sortable: true },
  {
    header: "Last Visit",
    accessorKey: "last_visit_at",
    cell: (item: CustomerRecord) => (item.last_visit_at ? new Date(item.last_visit_at).toLocaleDateString() : "N/A"),
  },
  {
    header: "Joined",
    accessorKey: "created_at",
    cell: (item: CustomerRecord) => new Date(item.created_at).toLocaleDateString(),
  },
];

export function CustomerReportPage() {
  const { toast } = useNotifications();
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
    <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-6 pb-2">
      <div className="flex flex-wrap items-center gap-4 rounded-[28px] border border-[#E8E1D8] bg-[linear-gradient(180deg,#FFFDF9_0%,#FAF7F3_100%)] px-5 py-5 shadow-[0_16px_48px_rgba(94,72,52,0.08)] md:px-7">
        <Link
          to="/dashboard/reports"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8E1D8] bg-white text-[#4B5563] transition hover:bg-[#FAF7F3] hover:text-[#111827]"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#111827] md:text-[2rem]">Customer Report</h1>
          <p className="text-sm text-[#6B7280] md:text-[15px]">Analyze customer retention and growth.</p>
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

      <div className="rounded-[24px] border border-[#E8E1D8] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[#111827]">Customer List</h3>
            <p className="text-sm text-[#6B7280]">Customer activity and retention details for the selected filters.</p>
          </div>
          <div className="rounded-full bg-[#FAF7F3] px-3 py-1 text-sm font-medium text-[#6B7280]">
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
