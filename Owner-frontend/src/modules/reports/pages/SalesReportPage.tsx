import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { FiltersBar } from "../components/FiltersBar";
import { SummaryCard } from "../components/SummaryCard";
import { RevenueLineChart } from "../components/Charts/RevenueLineChart";
import { PaymentPieChart } from "../components/Charts/PaymentPieChart";
import { ReportDataTable, type Column } from "../components/Tables/ReportDataTable";

type SalesRecord = {
  id: string;
  date: string;
  salesCount: number;
  revenue: number;
  discount: number;
  paymentSplit: string;
  aov: number;
};

const salesData: SalesRecord[] = [
  { id: "1", date: "2026-04-28", salesCount: 45, revenue: 15000, discount: 500, paymentSplit: "Cash/UPI", aov: 333 },
  { id: "2", date: "2026-04-27", salesCount: 52, revenue: 18000, discount: 200, paymentSplit: "Card", aov: 346 },
  { id: "3", date: "2026-04-26", salesCount: 38, revenue: 12500, discount: 0, paymentSplit: "UPI", aov: 328 },
  { id: "4", date: "2026-04-25", salesCount: 61, revenue: 22000, discount: 1000, paymentSplit: "Cash/Card", aov: 360 },
];

const columns: Column<SalesRecord>[] = [
  { header: "Date", accessorKey: "date", sortable: true },
  { header: "Sales Count", accessorKey: "salesCount", sortable: true, align: "center" as const },
  { 
    header: "Revenue", 
    accessorKey: "revenue", 
    sortable: true, 
    align: "right" as const,
    cell: (item: SalesRecord) => <span className="font-medium">₹{item.revenue.toLocaleString()}</span>
  },
  { 
    header: "Discount", 
    accessorKey: "discount", 
    align: "right" as const,
    cell: (item: SalesRecord) => <span className="text-rose-500">₹{item.discount.toLocaleString()}</span>
  },
  { header: "Payment Split", accessorKey: "paymentSplit" },
  { 
    header: "Avg Order Value", 
    accessorKey: "aov", 
    align: "right" as const,
    cell: (item: SalesRecord) => `₹${item.aov.toLocaleString()}`
  },
];

export function SalesReportPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to="/dashboard/reports" 
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E1D8] bg-white text-[#4B5563] transition hover:bg-[#FAF7F3] hover:text-[#111827]"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Sales Report</h1>
          <p className="text-sm text-[#6B7280]">Detailed breakdown of your revenue and transactions.</p>
        </div>
      </div>

      <FiltersBar onExport={() => alert("Downloading CSV...")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value="₹67,500"
          comparisonValue="12.5%"
          comparisonLabel="vs last period"
          trend="up"
        />
        <SummaryCard
          title="Total Sales"
          value="196"
          comparisonValue="5.2%"
          comparisonLabel="vs last period"
          trend="up"
        />
        <SummaryCard
          title="Avg Order Value"
          value="₹344"
          comparisonValue="1.4%"
          comparisonLabel="vs last period"
          trend="up"
        />
        <SummaryCard
          title="Total Discounts"
          value="₹1,700"
          comparisonValue="4.0%"
          comparisonLabel="vs last period"
          trend="down"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[20px] border border-[#E8E1D8] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-[#111827]">Revenue Trend</h3>
            <div className="flex gap-1 rounded-lg bg-[#FAF7F3] p-1">
              <button className="rounded-md bg-white px-3 py-1 text-xs font-medium text-[#111827] shadow-sm">Daily</button>
              <button className="rounded-md px-3 py-1 text-xs font-medium text-[#6B7280] hover:text-[#111827]">Weekly</button>
              <button className="rounded-md px-3 py-1 text-xs font-medium text-[#6B7280] hover:text-[#111827]">Monthly</button>
            </div>
          </div>
          <RevenueLineChart />
        </div>
        
        <div className="rounded-[20px] border border-[#E8E1D8] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-[#111827]">Payment Methods</h3>
          <PaymentPieChart />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-[#111827]">Sales Data</h3>
        <ReportDataTable 
          columns={columns} 
          data={salesData} 
          sortKey="date" 
          sortDirection="desc"
          page={1}
          totalPages={3}
        />
      </div>
    </div>
  );
}
