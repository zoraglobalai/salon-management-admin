import {
  BarChart3,
  Users,
  Scissors,
  UserSquare2,
  Package,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportCard } from "../components/ReportCard";
import { fetchReportsSummary } from "../../../core/api";
import { useReport } from "../hooks/useReport";

export function ReportsLandingPage() {
  const { data: summary, loading, setFilters } = useReport(
    fetchReportsSummary,
    {
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      locationId: "all",
    },
    { refreshMs: 30000 },
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#111827]">Reports & Analytics</h1>
        <p className="text-sm text-[#6B7280]">Analyze your business performance and track growth.</p>
      </div>

      <FiltersBar
        onFilterChange={(f) =>
          setFilters({
            startDate: f.startDate ?? new Date().toISOString().split("T")[0],
            endDate: f.endDate ?? new Date().toISOString().split("T")[0],
            locationId: f.locationId,
          })
        }
        onExport={() => alert("Exporting data...")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={loading ? "..." : `\u20B9${Number(summary?.revenue || 0).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="in selected period"
          trend="neutral"
        />
        <SummaryCard
          title="Total Sales"
          value={loading ? "..." : (summary?.salesCount || 0).toString()}
          comparisonValue="--"
          comparisonLabel="in selected period"
          trend="neutral"
        />
        <SummaryCard
          title="Total Customers"
          value={loading ? "..." : (summary?.customerCount || 0).toString()}
          comparisonValue="--"
          comparisonLabel="new in period"
          trend="neutral"
        />
        <SummaryCard
          title="Avg Order Value"
          value={loading ? "..." : `\u20B9${Math.round(Number(summary?.revenue || 0) / Math.max(1, Number(summary?.salesCount || 0))).toLocaleString()}`}
          comparisonValue="--"
          comparisonLabel="per transaction"
          trend="neutral"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="col-span-1 rounded-[20px] bg-gradient-to-br from-[#8B5E3C] to-[#5A341F] p-5 text-white shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <TrendingUp className="text-[#D7B496]" />
            <h3 className="font-medium">Top Performance</h3>
          </div>
          <p className="mb-1 text-2xl font-semibold">Live Tracking</p>
          <p className="text-sm text-white/80">Monitor your growth in real-time</p>
        </div>
        <div className="col-span-1 rounded-[20px] border border-[#E8E1D8] bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <UserSquare2 className="text-[#8B5E3C]" />
            <h3 className="font-medium text-[#6B7280]">Staff Overview</h3>
          </div>
          <p className="mb-1 text-2xl font-semibold text-[#111827]">Productivity</p>
          <p className="text-sm text-[#6B7280]">Track performance across branches</p>
        </div>
        <div className="col-span-1 rounded-[20px] border border-rose-100 bg-rose-50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <AlertTriangle className="text-rose-500" />
            <h3 className="font-medium text-rose-700">Insights</h3>
          </div>
          <p className="mb-1 text-2xl font-semibold text-rose-900">Action Required</p>
          <p className="text-sm text-rose-700/80">Check detailed reports for alerts</p>
        </div>
      </div>

      <h2 className="pt-2 text-xl font-semibold text-[#111827]">Detailed Reports</h2>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          title="Sales Report"
          description="Track daily revenue, payment methods, and transaction history across all branches."
          icon={<BarChart3 />}
          to="/dashboard/reports/sales"
        />
        <ReportCard
          title="Customer Report"
          description="Analyze customer retention, new vs returning ratios, and top clients."
          icon={<Users />}
          to="/dashboard/reports/customers"
        />
        <ReportCard
          title="Service Report"
          description="View performance by service category to see what's driving revenue."
          icon={<Scissors />}
          to="/dashboard/reports/services"
        />
        <ReportCard
          title="Staff Report"
          description="Monitor staff productivity, commissions, and individual rankings."
          icon={<UserSquare2 />}
          to="/dashboard/reports/staff"
        />
        <ReportCard
          title="Inventory Report"
          description="Keep track of product sales, usage, and monitor low stock items."
          icon={<Package />}
          to="/dashboard/reports/inventory"
        />
      </div>
    </div>
  );
}
