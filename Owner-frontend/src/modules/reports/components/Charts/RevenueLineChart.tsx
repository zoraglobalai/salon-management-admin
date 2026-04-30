import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface RevenueLineChartProps {
  data?: Array<{ date: string; revenue: string | number }>;
  interval?: "Daily" | "Weekly" | "Monthly";
}

export function RevenueLineChart({ data = [], interval = "Daily" }: RevenueLineChartProps) {
  const hasData = data.some((item) => Number(item.revenue) > 0);

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    if (interval === "Daily") {
      return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    }
    if (interval === "Weekly") {
      return `Week ${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
    }
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  };

  if (!hasData) {
    return (
      <div className="flex min-h-[320px] w-full items-center justify-center rounded-[22px] border border-dashed border-[#E8E1D8] bg-[#FCFAF7] px-6 text-center">
        <div className="max-w-[280px] space-y-2">
          <div className="text-sm font-semibold text-[#111827]">No revenue trend available</div>
          <p className="text-sm leading-6 text-[#6B7280]">
            Try a broader date range or wait for more sales to see how revenue changes over time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5E3C" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8B5E3C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
            dy={10}
            tickFormatter={formatXAxis}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
            tickFormatter={(value) => `\u20B9${(Number(value) / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value) => [`\u20B9${Number(value ?? 0).toLocaleString()}`, "Revenue"]}
            labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { dateStyle: "long" })}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#8B5E3C"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
