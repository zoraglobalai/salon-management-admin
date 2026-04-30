import { useState, useEffect } from "react";
import { Calendar, ChevronDown, Download } from "lucide-react";
import { cn } from "../../../shared/utils/cn";
import { fetchOwnerProfile } from "../../../core/api";

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

export function FiltersBar({ 
  onExport, 
  showBranchSelector = true, 
  showPaymentSelector = true,
  onFilterChange, 
  className 
}: FiltersBarProps) {
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
  const [dateRange, setDateRange] = useState<DateRange>("Today");
  const [locationId, setLocationId] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (canChooseBranch) {
      fetchOwnerProfile().then(res => {
        if (res.data?.locations) {
          setLocations(res.data.locations);
        }
      }).catch(console.error);
    }
  }, [canChooseBranch]);

  const handleFilterChange = (updates: any) => {
    const newFilters = {
      dateRange,
      locationId,
      paymentMethod,
      ...updates
    };
    
    // Calculate start/end dates based on range
    let startDate: string | undefined;
    let endDate: string | undefined = new Date().toISOString().split('T')[0];
    
    const today = new Date();
    if (newFilters.dateRange === "Today") {
      startDate = today.toISOString().split('T')[0];
    } else if (newFilters.dateRange === "Yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      startDate = yesterday.toISOString().split('T')[0];
      endDate = startDate;
    } else if (newFilters.dateRange === "Last 7 Days") {
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 7);
      startDate = last7.toISOString().split('T')[0];
    } else if (newFilters.dateRange === "This Month") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    } else if (newFilters.dateRange === "Last Month") {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
    }

    onFilterChange?.({
      ...newFilters,
      startDate,
      endDate
    });
  };

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-3 border border-[#E8E1D8] shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Selector */}
        <div className="relative">
          <select 
            value={dateRange}
            onChange={(e) => {
              const val = e.target.value as DateRange;
              setDateRange(val);
              handleFilterChange({ dateRange: val });
            }}
            className="appearance-none flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white pl-9 pr-8 py-2 text-sm font-medium text-[#4B5563] transition hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20"
          >
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
          </select>
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B5E3C]" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {canChooseBranch && (
          <div className="relative">
            <select 
              value={locationId}
              onChange={(e) => {
                const val = e.target.value;
                setLocationId(val);
                handleFilterChange({ locationId: val });
              }}
              className="appearance-none flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 pr-8 py-2 text-sm font-medium text-[#4B5563] transition hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20"
            >
              <option value="all">All Branches</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        )}

        {showBranchSelector && isManager && (
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2 text-sm font-medium text-[#4B5563]">
            {storedUser?.location ? `Branch: ${storedUser.location}` : "Assigned Branch"}
          </div>
        )}

        {showPaymentSelector && (
          <div className="relative">
            <select 
              value={paymentMethod}
              onChange={(e) => {
                const val = e.target.value;
                setPaymentMethod(val);
                handleFilterChange({ paymentMethod: val });
              }}
              className="appearance-none flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 pr-8 py-2 text-sm font-medium text-[#4B5563] transition hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20"
            >
              <option value="all">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        )}
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
