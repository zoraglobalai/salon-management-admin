import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../../shared/utils/cn";

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
  return (
    <div className={cn("flex min-h-[152px] flex-col rounded-[20px] border border-[#E8E1D8] bg-white p-5 shadow-sm transition-all hover:shadow-md", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-medium leading-6 text-[#6B7280]">{title}</h3>
        {icon && <div className="text-[#8B5E3C] bg-[#FAF7F3] p-2 rounded-xl">{icon}</div>}
      </div>
      
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="text-2xl font-semibold tracking-[-0.03em] text-[#111827]">{value}</div>
        
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />}
          {trend === "down" && <TrendingDown className="w-4 h-4 text-rose-500" strokeWidth={2.5} />}
          
          <span
            className={cn(
              "font-medium",
              trend === "up" && "text-emerald-600",
              trend === "down" && "text-rose-600",
              trend === "neutral" && "text-gray-500"
            )}
          >
            {comparisonValue}
          </span>
          <span className="text-[#6B7280] ml-1">{comparisonLabel}</span>
        </div>
      </div>
    </div>
  );
}
