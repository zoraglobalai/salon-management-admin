import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";

interface ReportCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
  className?: string;
  miniChart?: ReactNode;
}

export function ReportCard({
  title,
  description,
  icon,
  to,
  className,
  miniChart,
}: ReportCardProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "group flex flex-col rounded-[20px] border p-3.5 sm:p-5 transition-all duration-200",
        isDark
          ? "bg-[#151821] border-[rgba(255,255,255,0.07)] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_8px_28px_rgba(0,0,0,0.3)] hover:border-[rgba(201,169,110,0.25)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.5),0_16px_48px_rgba(0,0,0,0.36)]"
          : "bg-white border-[#E8E1D8] hover:border-[#D7B496] hover:shadow-[0_10px_30px_rgba(94,72,52,0.06)]",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div
          className={`flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-200 ${
            isDark
              ? "bg-[rgba(201,169,110,0.12)] text-[#C9A96E] group-hover:bg-[rgba(201,169,110,0.2)] group-hover:shadow-[0_0_0_1px_rgba(201,169,110,0.2)]"
              : "bg-[#FAF7F3] text-[#8B5E3C] group-hover:bg-[#F8F0E9] group-hover:text-[#6E432D]"
          }`}
        >
          {icon}
        </div>
      </div>

      <h3 className={`mb-1 text-[15px] sm:text-lg font-semibold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
        {title}
      </h3>
      <p className={`mb-3 sm:mb-5 text-[11px] sm:text-sm flex-1 line-clamp-2 ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>
        {description}
      </p>

      {miniChart && (
        <div className="mb-5 h-12 w-full opacity-60 transition-opacity group-hover:opacity-100">
          {miniChart}
        </div>
      )}

      <Link
        to={to}
        className={`inline-flex items-center justify-between rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-[12px] sm:text-sm font-medium transition-all duration-150 ${
          isDark
            ? "bg-[rgba(201,169,110,0.1)] text-[#C9A96E] hover:bg-[rgba(201,169,110,0.18)] hover:text-[#E8C98A]"
            : "bg-[#FAF7F3] text-[#4B5563] hover:bg-[#F0EBE5] hover:text-[#111827]"
        }`}
      >
        View
        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
      </Link>
    </div>
  );
}
