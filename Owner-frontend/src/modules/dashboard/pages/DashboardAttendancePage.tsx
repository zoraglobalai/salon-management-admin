import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths, 
  isToday,
  startOfToday
} from "date-fns";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  LayoutList, 
  X,
  MapPin,
  ChevronDown
} from "lucide-react";
import { 
  fetchMonthlyAttendance, 
  fetchHolidays,
  upsertAttendance, 
  type Holiday,
  type AttendanceStatus, 
  type MonthlyAttendanceData 
} from "../../../core/api";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";
import { StaffAttendanceCalendar } from "../components/StaffAttendanceCalendar";
import {
  APPOINTMENT_SETTINGS_UPDATED_EVENT,
  getHolidayDateSet,
  readAppointmentSettings,
} from "../../../shared/utils/appointmentSettings";

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; short: string; color: string; bg: string; darkBg: string; border: string; dot: string }> = {
  present: { label: "Present", short: "P", color: "text-green-600", bg: "bg-green-50", darkBg: "bg-green-500/10", border: "border-green-200", dot: "bg-green-500" },
  half_day: { label: "Half Day", short: "HD", color: "text-yellow-600", bg: "bg-yellow-50", darkBg: "bg-yellow-500/10", border: "border-yellow-200", dot: "bg-yellow-500" },
  paid_leave: { label: "Paid Leave", short: "PL", color: "text-blue-600", bg: "bg-blue-50", darkBg: "bg-blue-500/10", border: "border-blue-200", dot: "bg-blue-500" },
  lop: { label: "LOP", short: "LOP", color: "text-red-600", bg: "bg-red-50", darkBg: "bg-red-500/10", border: "border-red-200", dot: "bg-red-500" },
  week_off: { label: "Week Off", short: "WO", color: "text-gray-500", bg: "bg-gray-50", darkBg: "bg-gray-500/10", border: "border-gray-200", dot: "bg-gray-500" },
  holiday: { label: "Holiday", short: "H", color: "text-purple-600", bg: "bg-purple-50", darkBg: "bg-purple-500/10", border: "border-purple-200", dot: "bg-purple-500" },
};

const ATTENDANCE_ACTIONS: AttendanceStatus[] = ["present", "half_day", "paid_leave", "lop", "holiday"];

export function DashboardAttendancePage() {
  const { user } = useAuth();
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const { filters: globalFilters, setFilters } = useGlobalFilters();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [data, setData] = useState<MonthlyAttendanceData | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weeklyHolidayDays, setWeeklyHolidayDays] = useState(() => readAppointmentSettings("").weeklyHolidayDays);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [activeCell, setActiveCell] = useState<{ staffId: string, dateKey: string, staffName: string } | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const isManager = user?.role === "MANAGER";
  const locationOptions = ownerLocations || [];
  const activeBranchId = isManager ? (user?.branchId || "") : (globalFilters.locationId === "all" ? (locationOptions[0]?.id || "") : globalFilters.locationId);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  const loadAttendance = () => {
    if (!activeBranchId) return;
    setIsLoading(true);
    fetchMonthlyAttendance(currentDate.getMonth() + 1, currentDate.getFullYear(), activeBranchId)
      .then(setData)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAttendance();
  }, [currentDate, activeBranchId]);

  useEffect(() => {
    if (!activeBranchId) {
      setHolidays([]);
      return;
    }

    fetchHolidays(activeBranchId)
      .then(setHolidays)
      .catch((error) => console.error("Failed to load holidays", error));
  }, [activeBranchId]);

  useEffect(() => {
    const syncHolidayRules = () => {
      setWeeklyHolidayDays(readAppointmentSettings(activeBranchId).weeklyHolidayDays);
    };

    syncHolidayRules();
    window.addEventListener(APPOINTMENT_SETTINGS_UPDATED_EVENT, syncHolidayRules as EventListener);
    return () => window.removeEventListener(APPOINTMENT_SETTINGS_UPDATED_EVENT, syncHolidayRules as EventListener);
  }, [activeBranchId]);

  const attendanceHolidayDates = useMemo(() => {
    if (!data || data.staff.length === 0) return [];

    const monthPrefix = format(currentDate, "yyyy-MM");
    const dateKeys = new Set<string>();

    for (const staff of data.staff) {
      const records = data.attendance[staff.id] || {};
      for (const [dateKey, status] of Object.entries(records)) {
        if (dateKey.startsWith(monthPrefix) && status === "holiday") {
          dateKeys.add(dateKey);
        }
      }
    }

    return [...dateKeys].filter((dateKey) =>
      data.staff.every((staff) => data.attendance[staff.id]?.[dateKey] === "holiday")
    );
  }, [currentDate, data]);

  const holidayDateSet = useMemo(
    () => getHolidayDateSet(
      holidays,
      attendanceHolidayDates,
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      weeklyHolidayDays
    ),
    [attendanceHolidayDates, currentDate, holidays, weeklyHolidayDays]
  );

  const filteredStaff = useMemo(() => {
    if (!data) return [];
    return data.staff.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const handleCellClick = (e: React.MouseEvent, staffId: string, dateKey: string, staffName: string) => {
    e.stopPropagation();

    if (holidayDateSet.has(dateKey)) {
      toast("This day is a holiday by default, so attendance cannot be marked.", "error");
      return;
    }
    
    // Logic: Prevent marking for future dates
    const today = format(startOfToday(), "yyyy-MM-dd");
    if (dateKey > today) {
      toast("Cannot mark attendance for future dates.", "error");
      return;
    }

    const target = e.currentTarget as HTMLElement;
    const isOpen = activeCell?.staffId === staffId && activeCell?.dateKey === dateKey;

    if (isOpen) {
      setActiveCell(null);
    } else {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const cellLeft = target.offsetLeft;
        const cellWidth = target.offsetWidth;
        const containerWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;

        const threshold = 180;
        const visibleRightEdge = scrollLeft + containerWidth;
        const cellRightEdge = cellLeft + cellWidth;

        if (cellRightEdge + threshold > visibleRightEdge) {
          const targetScroll = cellRightEdge + threshold - containerWidth;
          container.scrollTo({ left: targetScroll, behavior: 'smooth' });
        }
      }
      setActiveCell({ staffId, dateKey, staffName });
    }
  };

  const handleStatusChange = async (status: AttendanceStatus) => {
    if (!activeCell) return;
    try {
      await upsertAttendance({
        employeeId: activeCell.staffId,
        branchId: activeBranchId,
        attendanceDate: activeCell.dateKey,
        status
      });
      
      setData(prev => {
        if (!prev) return prev;
      const newAttendance = { ...prev.attendance };
        if (!newAttendance[activeCell.staffId]) newAttendance[activeCell.staffId] = {};
        newAttendance[activeCell.staffId][activeCell.dateKey] = status;
        return { ...prev, attendance: newAttendance };
      });
      setActiveCell(null);
    } catch (e: any) {
      toast(e.message || "Failed to update attendance.", "error");
    }
  };

  useEffect(() => {
    if (activeCell && holidayDateSet.has(activeCell.dateKey)) {
      setActiveCell(null);
    }
  }, [activeCell, holidayDateSet]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  useEffect(() => {
    const handleClose = () => setActiveCell(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  return (
    <div className="flex flex-col gap-6 py-2 h-full">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[40px] border shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div>
          <h1 className={`text-3xl font-black font-['Outfit'] tracking-tight ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Attendance</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
              {format(currentDate, "MMMM yyyy")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {!isManager && (
            <div className="relative">
              <select 
                value={globalFilters.locationId} 
                onChange={(e) => setFilters({ locationId: e.target.value })}
                className={`appearance-none rounded-xl border pl-10 pr-10 py-3 text-sm font-semibold outline-none transition-all w-48 ${
                  isDark 
                    ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)] text-[#C8BFB4] focus:border-[#C9A96E] [color-scheme:dark]" 
                    : "bg-gray-50/50 border-[#F2EDE7] text-gray-700 focus:border-[#8B5E3C] [color-scheme:light]"
                }`}
              >
                <option value="all">All Locations</option>
                {locationOptions.map((l) => (
                  <option key={l.id} value={l.id}>{l.city || l.name}</option>
                ))}
              </select>
              <MapPin size={16} className={`absolute left-3.5 top-3.5 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              <ChevronDown size={16} className={`absolute right-3.5 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
            </div>
          )}

          <div className={`flex items-center rounded-2xl border px-4 py-3 ${
            isDark ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-[#F2EDE7]"
          }`}>
            <Search size={18} className="text-gray-400 mr-3" />
            <input 
              type="text" 
              placeholder="Search staff members..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-48 font-medium"
            />
          </div>

          <div className={`flex items-center rounded-2xl border overflow-hidden ${isDark ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-[#F2EDE7]"}`}>
            <button onClick={prevMonth} className="p-3 hover:bg-black/5 transition-all"><ChevronLeft size={20} /></button>
            <div className="px-4 text-[11px] font-black uppercase tracking-widest w-28 text-center border-x border-[rgba(0,0,0,0.05)]">
              {format(currentDate, "MMM yy")}
            </div>
            <button onClick={nextMonth} className="p-3 hover:bg-black/5 transition-all"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className={`flex-1 flex flex-col rounded-[40px] border shadow-xl overflow-hidden transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A96E]"></div>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse table-fixed">
              <thead className="sticky top-0 z-40">
                <tr className={`${isDark ? "bg-[#1C2030]" : "bg-[#F9F7F4]"} border-b ${isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2EDE7]"}`}>
                  <th className={`sticky left-0 z-50 p-6 text-left text-[11px] font-black uppercase tracking-[0.2em] w-[240px] border-r ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#7A7572]" : "bg-[#F9F7F4] border-[#F2EDE7] text-gray-500"
                  }`}>
                    Staff Member
                  </th>
                  {daysInMonth.map(day => (
                    <th key={day.toISOString()} className={`p-4 text-center w-[60px] ${
                      isToday(day) ? (isDark ? "bg-[#C9A96E]/15" : "bg-[#8B5E3C]/10") : ""
                    }`}>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[9px] font-black uppercase tracking-tighter ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                          {format(day, "EEE")}
                        </span>
                        <span className={`text-[15px] font-black ${isToday(day) ? (isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]") : (isDark ? "text-[#F0EBE3]" : "text-gray-900")}`}>
                          {format(day, "dd")}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className={`border-b group transition-colors ${
                    isDark ? "border-[rgba(255,255,255,0.05)] hover:bg-white/[0.02]" : "border-[#F2EDE7] hover:bg-gray-50/50"
                  }`}>
                    <td className={`sticky left-0 z-30 p-6 border-r transition-colors shadow-2xl ${
                      isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] group-hover:bg-[#1C2030]" : "bg-white border-[#F2EDE7] group-hover:bg-gray-50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-black shadow-inner ${
                            isDark ? "bg-[rgba(255,255,255,0.03)] text-[#C8BFB4]" : "bg-[#FCFAF7] text-gray-700"
                          }`}>
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-sm font-black tracking-tight ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{staff.name}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-[#8B5E3C]"}`}>{staff.role}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedStaffId(staff.id);
                            setSelectedStaffName(staff.name);
                          }}
                          className={`group/btn h-8 w-8 flex items-center justify-center rounded-xl transition-all ${
                            isDark ? "bg-[rgba(255,255,255,0.03)] hover:bg-[#C9A96E] text-[#C9A96E] hover:text-[#0F1115]" : "bg-[#FCFAF7] hover:bg-[#8B5E3C] text-[#8B5E3C] hover:text-white"
                          }`}
                          title="View Full History"
                        >
                          <LayoutList size={16} className="transition-transform group-hover/btn:scale-110" />
                        </button>
                      </div>
                    </td>
                    {daysInMonth.map((day, dayIndex) => {
                      const dateKey = format(day, "yyyy-MM-dd");
                      const isHoliday = holidayDateSet.has(dateKey);
                      const status = isHoliday ? "holiday" : data?.attendance[staff.id]?.[dateKey];
                      const config = status ? STATUS_CONFIG[status as AttendanceStatus] : null;
                      const isActive = activeCell?.staffId === staff.id && activeCell?.dateKey === dateKey;
                      const isFuture = dateKey > format(startOfToday(), "yyyy-MM-dd");
                      const isDisabled = isFuture || isHoliday;
                      const openToLeft = dayIndex >= daysInMonth.length - 2;

                      return (
                        <td
                          key={dateKey}
                          className={`relative p-2 text-center align-middle ${
                            isActive ? "z-[90]" : "z-0"
                          } ${isToday(day) ? (isDark ? "bg-[#C9A96E]/5" : "bg-[#8B5E3C]/5") : ""}`}
                        >
                          <div className="relative flex justify-center items-center h-12 w-12 mx-auto">
                            <button 
                              onClick={(e) => handleCellClick(e, staff.id, dateKey, staff.name)}
                              disabled={isDisabled}
                              className={`h-11 w-11 rounded-[14px] flex items-center justify-center text-[11px] font-black uppercase transition-all border-2
                                ${status 
                                  ? `${isDark ? config?.darkBg : config?.bg} ${config?.color} ${config?.border}` 
                                  : `${isDark ? "bg-[#0F1115] border-[rgba(255,255,255,0.03)]" : "bg-white border-[#F2EDE7]"} text-gray-300 ${!isDisabled && "hover:border-[#C9A96E]/50"}`
                                }
                                ${isActive ? "ring-4 ring-[#C9A96E]/40 scale-110 z-20 shadow-lg border-[#C9A96E]" : "shadow-sm"}
                                ${!isDisabled && !isActive && "hover:scale-105"}
                                ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                                ${isFuture ? "opacity-20" : ""}
                              `}
                              title={isHoliday ? "Holiday" : isFuture ? "Future date" : "Mark attendance"}
                            >
                              {status ? config?.short : "-"}
                            </button>

                            {isActive && !isDisabled ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute top-0 z-[80] w-[138px] rounded-[20px] border p-2 shadow-[0_18px_45px_rgba(0,0,0,0.24)] ${
                                  openToLeft ? "right-[calc(100%+12px)]" : "left-[calc(100%+12px)]"
                                } ${
                                  isDark
                                    ? "border-[rgba(255,255,255,0.12)] bg-[#1C2030]/95 backdrop-blur-xl"
                                    : "border-[#E8E1D8] bg-white/95 backdrop-blur-xl"
                                }`}
                              >
                                <div className="mb-2 flex items-start justify-between gap-2 px-1">
                                  <div>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
                                      {format(day, "dd MMM")}
                                    </p>
                                    <p className={`max-w-[88px] truncate text-[10px] font-semibold leading-tight ${isDark ? "text-[#C8BFB4]" : "text-[#5B6472]"}`}>
                                      {staff.name}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setActiveCell(null)}
                                    className={`rounded-full p-1 transition-all ${isDark ? "text-[#7A7572] hover:bg-white/5" : "text-gray-400 hover:bg-gray-100"}`}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>

                                <div className="space-y-1.5">
                                  {ATTENDANCE_ACTIONS.map((key) => {
                                    const cfg = STATUS_CONFIG[key];
                                    const isSelected = data?.attendance[staff.id]?.[dateKey] === key;

                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleStatusChange(key)}
                                        className={`flex w-full items-center justify-center rounded-[13px] border px-2.5 py-2 text-center transition-all ${
                                          isSelected
                                            ? `${isDark ? "border-[#C9A96E] bg-[#C9A96E] text-[#0F1115]" : "border-[#8B5E3C] bg-[#8B5E3C] text-white"} shadow-sm`
                                            : `${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#151821] text-[#C8BFB4] hover:border-[#C9A96E]/45" : "border-[#F2EDE7] bg-[#FFFCF8] text-[#5B6472] hover:border-[#D3B08A]"}`
                                        }`}
                                      >
                                        <span className="text-[10px] font-bold leading-tight">
                                          {cfg.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className={`p-6 border-t flex flex-wrap items-center justify-center gap-8 ${
          isDark ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)]" : "bg-[#FCFAF7] border-[#F2EDE7]"
        }`}>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${config.bg} border border-current ${config.color} shadow-sm`} />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                {config.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Calendar Modal */}
      {selectedStaffId && (
        <StaffAttendanceCalendar 
          staffId={selectedStaffId} 
          staffName={selectedStaffName} 
          onClose={() => setSelectedStaffId(null)} 
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDark ? "rgba(255,255,255,0.02)" : "#F9F7F4"};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? "rgba(201,169,110,0.2)" : "#E8E1D8"};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "rgba(201,169,110,0.4)" : "#D8C9B8"};
        }
      `}</style>
    </div>
  );
}
