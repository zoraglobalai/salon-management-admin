import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboardTheme } from "../../../../shared/theme/ThemeProvider";

const LIGHT_COLORS = ["#8B5E3C", "#D7B496", "#111827", "#9CA3AF"];
const DARK_COLORS = ["#C9A96E", "#E8C98A", "#A67C3D", "#7A7572"];

interface PaymentPieChartProps {
  data?: Array<{ payment_method: string; count: string; amount: string | number }>;
}

export function PaymentPieChart({ data = [] }: PaymentPieChartProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const chartData = data.map((item, index) => ({
    name: item.payment_method.charAt(0).toUpperCase() + item.payment_method.slice(1).toLowerCase(),
    value: Number(item.amount),
    color: colors[index % colors.length],
  }));
  const hasData = chartData.some((item) => item.value > 0);

  if (!hasData) {
    return (
      <div
        className={`flex min-h-[340px] w-full items-center justify-center rounded-[22px] border border-dashed px-6 text-center transition-all ${
          isDark
            ? "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] text-[#7A7572]"
            : "border-[#E8E1D8] bg-[#FCFAF7] text-[#6B7280]"
        }`}
      >
        <div className="max-w-[250px] space-y-2">
          <div className={`text-sm font-semibold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
            No payment data yet
          </div>
          <p className="text-sm leading-6">
            Payment method totals will appear here once transactions are available for the selected filters.
          </p>
        </div>
      </div>
    );
  }

  const tooltipBg = isDark ? "#1C2030" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "none";
  const tooltipTextColor = isDark ? "#F0EBE3" : "#111827";
  const legendTextColor = isDark ? "#C8BFB4" : "#4B5563";

  return (
    <div className="h-[340px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="42%"
            innerRadius={72}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              borderRadius: "12px",
              border: tooltipBorder,
              boxShadow: isDark 
                ? "0 10px 30px rgba(0,0,0,0.5)" 
                : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              color: tooltipTextColor
            }}
            itemStyle={{ color: tooltipTextColor }}
            formatter={(value) => [`\u20B9${Number(value ?? 0).toLocaleString()}`, "Amount"]}
          />
          <Legend
            verticalAlign="bottom"
            height={56}
            iconType="circle"
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => <span className="text-sm" style={{ color: legendTextColor }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
