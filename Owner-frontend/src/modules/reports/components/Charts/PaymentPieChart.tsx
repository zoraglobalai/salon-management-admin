import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#8B5E3C", "#D7B496", "#111827", "#9CA3AF"];

interface PaymentPieChartProps {
  data?: Array<{ payment_method: string; count: string; amount: string | number }>;
}

export function PaymentPieChart({ data = [] }: PaymentPieChartProps) {
  const chartData = data.map((item, index) => ({
    name: item.payment_method.charAt(0).toUpperCase() + item.payment_method.slice(1).toLowerCase(),
    value: Number(item.amount),
    color: COLORS[index % COLORS.length],
  }));
  const hasData = chartData.some((item) => item.value > 0);

  if (!hasData) {
    return (
      <div className="flex min-h-[340px] w-full items-center justify-center rounded-[22px] border border-dashed border-[#E8E1D8] bg-[#FCFAF7] px-6 text-center">
        <div className="max-w-[250px] space-y-2">
          <div className="text-sm font-semibold text-[#111827]">No payment data yet</div>
          <p className="text-sm leading-6 text-[#6B7280]">
            Payment method totals will appear here once transactions are available for the selected filters.
          </p>
        </div>
      </div>
    );
  }

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
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value) => [`\u20B9${Number(value ?? 0).toLocaleString()}`, "Amount"]}
          />
          <Legend
            verticalAlign="bottom"
            height={56}
            iconType="circle"
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => <span className="text-sm text-[#4B5563]">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
