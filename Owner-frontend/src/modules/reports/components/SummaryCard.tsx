import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";

interface SummaryCardProps {
  title: string;
  value: string;
  comparisonValue: string;
  comparisonLabel: string;
  trend: "up" | "down" | "neutral";
  icon?: ReactNode;
  className?: string;
}

export function SummaryCard({
  title,
  value,
  comparisonValue,
  comparisonLabel,
  trend,
  icon,
  className,
}: SummaryCardProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "group flex min-h-[152px] flex-col rounded-[20px] border p-5 transition-all duration-200",
        isDark
          ? "bg-[#151821] border-[rgba(255,255,255,0.07)] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_8px_28px_rgba(0,0,0,0.3)] hover:border-[rgba(201,169,110,0.2)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.5),0_16px_48px_rgba(0,0,0,0.36),0_0_0_1px_rgba(201,169,110,0.1)]"
          : "bg-white border-[#E8E1D8] shadow-sm hover:shadow-md",
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className={`text-[15px] font-medium leading-6 ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>
          {title}
        </h3>
        {icon && (
          <div
            className={`p-2 rounded-xl transition-colors ${
              isDark
                ? "bg-[rgba(201,169,110,0.12)] text-[#C9A96E] group-hover:bg-[rgba(201,169,110,0.18)]"
                : "bg-[#FAF7F3] text-[#8B5E3C] group-hover:bg-[#F8F0E9]"
            }`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className={`text-2xl font-semibold tracking-[-0.03em] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
          {value}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {trend === "up" && (
            <TrendingUp
              className={`w-4 h-4 ${isDark ? "text-[#4ADE80]" : "text-emerald-500"}`}
              strokeWidth={2.5}
            />
          )}
          {trend === "down" && (
            <TrendingDown
              className={`w-4 h-4 ${isDark ? "text-[#F87171]" : "text-rose-500"}`}
              strokeWidth={2.5}
            />
          )}

          <span
            className={cn(
              "font-medium",
              trend === "up" && (isDark ? "text-[#4ADE80]" : "text-emerald-600"),
              trend === "down" && (isDark ? "text-[#F87171]" : "text-rose-600"),
              trend === "neutral" && (isDark ? "text-[#C8BFB4]" : "text-gray-500")
            )}
          >
            {comparisonValue}
          </span>
          <span className={`ml-1 ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>
            {comparisonLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
