import { useState } from "react";
import { Calendar, ChevronDown, Download } from "lucide-react";
import { cn } from "../../../shared/utils/cn";

interface FiltersBarProps {
  onExport?: () => void;
  showBranchSelector?: boolean;
  className?: string;
}

export function FiltersBar({ onExport, showBranchSelector = true, className }: FiltersBarProps) {
  const [dateRange] = useState("Today");
  
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-3 border border-[#E8E1D8] shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Selector Placeholder */}
        <button className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#4B5563] transition hover:bg-[#F9FAFB]">
          <Calendar className="h-4 w-4 text-[#8B5E3C]" />
          {dateRange}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        {showBranchSelector && (
          <button className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#4B5563] transition hover:bg-[#F9FAFB]">
            All Branches
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        )}

        <button className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#4B5563] transition hover:bg-[#F9FAFB]">
          All Payment Methods
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <button
        onClick={onExport}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#374151]"
      >
        <Download className="h-4 w-4" />
        Export
      </button>
    </div>
  );
}
