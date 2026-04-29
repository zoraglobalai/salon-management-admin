import { 
  BarChart3, 
  Users, 
  Scissors, 
  UserSquare2, 
  Package, 
  Wallet,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { ReportCard } from "../components/ReportCard";

export function ReportsLandingPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#111827]">Reports & Analytics</h1>
        <p className="text-sm text-[#6B7280]">Analyze your business performance and track growth.</p>
      </div>

      <FiltersBar onExport={() => alert("Exporting data...")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          title="Total Revenue"
          value="₹1,24,500"
          comparisonValue="12.5%"
          comparisonLabel="vs yesterday"
          trend="up"
        />
        <SummaryCard
          title="Total Sales"
          value="142"
          comparisonValue="5.2%"
          comparisonLabel="vs yesterday"
          trend="up"
        />
        <SummaryCard
          title="Total Customers"
          value="128"
          comparisonValue="2.1%"
          comparisonLabel="vs yesterday"
          trend="down"
        />
        <SummaryCard
          title="Avg Order Value"
          value="₹876"
          comparisonValue="8.4%"
          comparisonLabel="vs yesterday"
          trend="up"
        />
        <SummaryCard
          title="Net Profit"
          value="₹45,200"
          comparisonValue="15.0%"
          comparisonLabel="vs yesterday"
          trend="up"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="col-span-1 rounded-[20px] bg-gradient-to-br from-[#8B5E3C] to-[#5A341F] p-5 text-white shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-[#D7B496]" />
            <h3 className="font-medium">Top Performance</h3>
          </div>
          <p className="text-2xl font-semibold mb-1">Hair Coloring</p>
          <p className="text-sm text-white/80">Generated ₹45,000 this week (↑ 24%)</p>
        </div>
        <div className="col-span-1 rounded-[20px] bg-white border border-[#E8E1D8] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <UserSquare2 className="text-[#8B5E3C]" />
            <h3 className="font-medium text-[#6B7280]">Top Stylist</h3>
          </div>
          <p className="text-2xl font-semibold text-[#111827] mb-1">Sarah Jenkins</p>
          <p className="text-sm text-[#6B7280]">Completed 42 appointments</p>
        </div>
        <div className="col-span-1 rounded-[20px] bg-rose-50 border border-rose-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-rose-500" />
            <h3 className="font-medium text-rose-700">Low Stock Alerts</h3>
          </div>
          <p className="text-2xl font-semibold text-rose-900 mb-1">4 Items</p>
          <p className="text-sm text-rose-700/80">Requires immediate restock</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-[#111827] pt-2">Detailed Reports</h2>
      
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
        <ReportCard
          title="Profit & Loss"
          description="Comprehensive overview of total revenue against expenses to calculate net profit."
          icon={<Wallet />}
          to="/dashboard/reports/profit-loss"
        />
      </div>
    </div>
  );
}
