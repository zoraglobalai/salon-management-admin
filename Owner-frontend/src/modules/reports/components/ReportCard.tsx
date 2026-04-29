import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "../../../shared/utils/cn";

interface ReportCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
  className?: string;
  // A simple placeholder for the mini-chart
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
  return (
    <div className={cn("group flex flex-col rounded-[20px] border border-[#E8E1D8] bg-white p-5 transition-all hover:border-[#D7B496] hover:shadow-[0_10px_30px_rgba(94,72,52,0.06)]", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF7F3] text-[#8B5E3C] transition-colors group-hover:bg-[#F8F0E9] group-hover:text-[#6E432D]">
          {icon}
        </div>
      </div>
      
      <h3 className="mb-1 text-lg font-semibold text-[#111827]">{title}</h3>
      <p className="mb-5 text-sm text-[#6B7280] flex-1">{description}</p>
      
      {miniChart && (
        <div className="mb-5 h-12 w-full opacity-60 transition-opacity group-hover:opacity-100">
          {miniChart}
        </div>
      )}
      
      <Link
        to={to}
        className="inline-flex items-center justify-between rounded-xl bg-[#FAF7F3] px-4 py-2.5 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F0EBE5] hover:text-[#111827]"
      >
        View Report
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
