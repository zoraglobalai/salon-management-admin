import { useState, useEffect } from "react";
import { Calendar, ChevronDown, Download, RotateCcw } from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import { fetchOwnerProfile } from "../../../core/api";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";

export type DateRange = "Today" | "Yesterday" | "Last 7 Days" | "This Month" | "Last Month" | "Custom";

interface FiltersBarProps {
  onExport?: () => void;
  showBranchSelector?: boolean;
  showPaymentSelector?: boolean;
  onFilterChange?: (filters: {
    dateRange: DateRange;
    startDate?: string;
    endDate?: string;
    locationId: string;
    paymentMethod: string;
  }) => void;
  className?: string;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function FiltersBar({
  onExport,
  showBranchSelector = true,
  showPaymentSelector = true,
  onFilterChange,
  className,
}: FiltersBarProps) {
  const { theme } = useDashboardTheme();
  const { filters: globalFilters, setFilters, resetFilters } = useGlobalFilters();
  const isDark = theme === "dark";

  const storedUser = (() => {
    const raw = sessionStorage.getItem("owner_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { role?: string; branchId?: string; location?: string };
    } catch {
      return null;
    }
  })();

  const isManager = storedUser?.role === "MANAGER";
  const canChooseBranch = showBranchSelector && !isManager;
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (canChooseBranch) {
      fetchOwnerProfile()
        .then((res) => {
          if (res.data?.locations) {
            setLocations(res.data.locations);
          }
        })
        .catch(console.error);
    }
  }, [canChooseBranch]);

  const handleFilterChange = (updates: any) => {
    const combined = { 
      dateRangeType: globalFilters.dateRangeType, 
      locationId: globalFilters.locationId, 
      paymentMethod: globalFilters.paymentMethod, 
      ...updates 
    };

    let startDate = globalFilters.startDate;
    let endDate = globalFilters.endDate;

    const today = new Date();
    if (updates.dateRangeType === "Today") {
      startDate = formatLocalDate(today);
      endDate = startDate;
    } else if (updates.dateRangeType === "Yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      startDate = formatLocalDate(yesterday);
      endDate = startDate;
    } else if (updates.dateRangeType === "Last 7 Days") {
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 7);
      startDate = formatLocalDate(last7);
      endDate = formatLocalDate(today);
    } else if (updates.dateRangeType === "This Month") {
      startDate = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
      endDate = formatLocalDate(today);
    } else if (updates.dateRangeType === "Last Month") {
      startDate = formatLocalDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      endDate = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 0));
    }

    setFilters({ ...combined, startDate, endDate });
    onFilterChange?.({ 
      ...combined, 
      dateRange: combined.dateRangeType as DateRange, 
      startDate, 
      endDate 
    });
  };

  /* ── Shared class strings ── */
  const containerCls = isDark
    ? "bg-[#151821] border-[rgba(255,255,255,0.07)] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_8px_28px_rgba(0,0,0,0.28)]"
    : "bg-white border-[#E8E1D8] shadow-sm";

  const selectCls = isDark
    ? "appearance-none rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#1C2030] text-[#C8BFB4] transition focus:outline-none focus:border-[rgba(201,169,110,0.4)] focus:ring-2 focus:ring-[rgba(201,169,110,0.15)] hover:border-[rgba(255,255,255,0.18)]"
    : "appearance-none rounded-xl border border-[#E5E7EB] bg-white text-[#4B5563] transition hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20";

  const calendarIconCls = isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]";
  const chevronIconCls = isDark ? "text-[#7A7572]" : "text-gray-400";

  const staticBranchCls = isDark
    ? "rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#1C2030] px-3.5 py-2 text-sm font-medium text-[#C8BFB4]"
    : "rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2 text-sm font-medium text-[#4B5563]";

  const exportBtnCls = isDark
    ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] text-[#0F1115] shadow-[0_4px_20px_rgba(201,169,110,0.3)] hover:shadow-[0_4px_28px_rgba(201,169,110,0.45)] hover:brightness-110"
    : "bg-[#111827] text-white hover:bg-[#374151]";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl p-3 border transition-all",
        containerCls,
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range */}
        <div className="relative">
          <select
            value={globalFilters.dateRangeType}
            onChange={(e) => {
              handleFilterChange({ dateRangeType: e.target.value });
            }}
            className={`${selectCls} pl-9 pr-8 py-2 text-sm font-medium`}
          >
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
          </select>
          <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${calendarIconCls}`} />
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${chevronIconCls} pointer-events-none`} />
        </div>

        {/* Branch selector */}
        {canChooseBranch && (
          <div className="relative">
            <select
              value={globalFilters.locationId}
              onChange={(e) => {
                handleFilterChange({ locationId: e.target.value });
              }}
              className={`${selectCls} px-3.5 pr-8 py-2 text-sm font-medium`}
            >
              <option value="all">All Branches</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${chevronIconCls} pointer-events-none`} />
          </div>
        )}

        {/* Static branch for manager */}
        {showBranchSelector && isManager && (
          <div className={staticBranchCls}>
            {storedUser?.location ? `Branch: ${storedUser.location}` : "Assigned Branch"}
          </div>
        )}

        {/* Payment method */}
        {showPaymentSelector && (
          <div className="relative">
            <select
              value={globalFilters.paymentMethod}
              onChange={(e) => {
                handleFilterChange({ paymentMethod: e.target.value });
              }}
              className={`${selectCls} px-3.5 pr-8 py-2 text-sm font-medium`}
            >
              <option value="all">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${chevronIconCls} pointer-events-none`} />
          </div>
        )}

        {/* Reset button */}
        <button
          onClick={() => resetFilters()}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
            isDark ? "text-[#C9A96E] hover:bg-white/5" : "text-[#8B5E3C] hover:bg-gray-100"
          }`}
          title="Reset Filters"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {/* Export button */}
      {onExport && (
        <button
          onClick={onExport}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${exportBtnCls}`}
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      )}
    </div>
  );
}
