import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  format, 
  startOfToday,
  startOfMonth,
  endOfMonth,
  addMinutes,
  parse,
  subDays,
  isBefore,
  isWithinInterval
} from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  CalendarDays,
  Clock,
  Search,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  User,
  Scissors
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import {
  fetchDailyAppointments, 
  fetchCalendarAppointments,
  createAppointment, 
  fetchHolidays,
  fetchMonthlyAttendance,
  updateAppointment,
  updateAppointmentStatus, 
  deleteAppointment,
  fetchStaff,
  fetchServices,
  fetchClients,
  fetchBusySlots,
  type Appointment,
  type AppointmentCalendarEvent,
  type AppointmentInput,
  type AppointmentStatus,
  type Holiday,
  type MonthlyAttendanceData,
  type StaffMember
} from "../../../core/api";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";
import {
  APPOINTMENT_SETTINGS_UPDATED_EVENT,
  formatWorkingHoursLabel,
  getAttendanceHolidayDates,
  getHolidayDateSet,
  getWorkingDayKey,
  readAppointmentSettings,
} from "../../../shared/utils/appointmentSettings";

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };

const formatTime = (time: string) => {
  if (!time) return "";
  try {
    const parsed = parse(time, time.length === 8 ? "HH:mm:ss" : "HH:mm", new Date());
    return format(parsed, "hh:mm a");
  } catch {
    return time;
  }
};

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string; border: string }> = {
  booked: { label: "Booked", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  confirmed: { label: "Confirmed", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
  completed: { label: "Completed", color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
  no_show: { label: "No Show", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-100" },
};

const CALENDAR_STATUS_STYLES: Record<AppointmentStatus, { dot: string; badge: string }> = {
  booked: { dot: "bg-[#F59E0B]", badge: "bg-[#FFF1D6] text-[#B76A00]" },
  confirmed: { dot: "bg-[#7CC84A]", badge: "bg-[#EEF9E5] text-[#4D8E22]" },
  completed: { dot: "bg-[#4C9CFF]", badge: "bg-[#EAF4FF] text-[#1F70C9]" },
  cancelled: { dot: "bg-[#EF4444]", badge: "bg-[#FFE7E7] text-[#C53030]" },
  no_show: { dot: "bg-[#B05BCE]", badge: "bg-[#F6EAFE] text-[#8A2BB6]" },
};

const normalizeDateOnly = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") {
    return value.includes("T") ? value.slice(0, 10) : value;
  }
  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd");
  }
  const asString = String(value);
  return asString.includes("T") ? asString.slice(0, 10) : asString.slice(0, 10);
};

const normalizeTimeOnly = (value: unknown) => {
  if (!value) return "00:00:00";
  if (value instanceof Date) {
    return format(value, "HH:mm:ss");
  }
  const timeValue = typeof value === "string" ? value : String(value);
  const normalized = timeValue.includes("T") ? timeValue.split("T")[1] : timeValue;
  return normalized.length === 5 ? `${normalized}:00` : normalized.slice(0, 8);
};

const buildCalendarEvent = (appointment: Appointment): AppointmentCalendarEvent => {
  const appointmentDate = normalizeDateOnly(appointment.appointment_date);
  const startTime = normalizeTimeOnly(appointment.start_time);
  const endTime = normalizeTimeOnly(appointment.end_time);

  return {
    id: appointment.id,
    title: `${appointment.customer_name || "Walk-in Customer"} - ${appointment.service_name || "Service"}`,
    start: `${appointmentDate}T${startTime}`,
    end: `${appointmentDate}T${endTime}`,
    extendedProps: {
      ...appointment,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
    },
  };
};

const toNormalizedCalendarEvent = (input: AppointmentCalendarEvent | Appointment): AppointmentCalendarEvent => {
  if ("extendedProps" in input) {
    const appointment = input.extendedProps;
    return {
      ...input,
      start: input.start || `${normalizeDateOnly(appointment.appointment_date)}T${normalizeTimeOnly(appointment.start_time)}`,
      end: input.end || `${normalizeDateOnly(appointment.appointment_date)}T${normalizeTimeOnly(appointment.end_time)}`,
      extendedProps: {
        ...appointment,
        appointment_date: normalizeDateOnly(appointment.appointment_date),
        start_time: normalizeTimeOnly(appointment.start_time),
        end_time: normalizeTimeOnly(appointment.end_time),
      },
    };
  }

  return buildCalendarEvent({
    ...input,
    appointment_date: normalizeDateOnly(input.appointment_date),
    start_time: normalizeTimeOnly(input.start_time),
    end_time: normalizeTimeOnly(input.end_time),
  });
};

export function DashboardCalendarPage() {
  const { user } = useAuth();
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast, confirm } = useNotifications();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const { filters: globalFilters, setFilters } = useGlobalFilters();

  // State
  const [view, setView] = useState<"timeline" | "calendar" | "list">("timeline");
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<AppointmentCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState("all");
  const [calendarRange, setCalendarRange] = useState(() => ({
    startDate: format(startOfMonth(startOfToday()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(startOfToday()), "yyyy-MM-dd"),
  }));

  // Form/Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(true);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [attendanceData, setAttendanceData] = useState<MonthlyAttendanceData | null>(null);
  const [workingHours, setWorkingHours] = useState(() => readAppointmentSettings("").workingHours);

  const isManager = user?.role === "MANAGER";
  const locationOptions = ownerLocations || [];
  const activeBranchId = isManager ? (user?.branchId || "") : (globalFilters.locationId === "all" ? (locationOptions[0]?.id || "") : globalFilters.locationId);

  // Load Data
  const loadAppointments = async () => {
    if (!activeBranchId) {
      setAppointments([]);
      setCalendarEvents([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      if (view === "calendar") {
        const data = await fetchCalendarAppointments(calendarRange.startDate, calendarRange.endDate, activeBranchId);
        const normalizedEvents = data.map((event) => toNormalizedCalendarEvent(event));
        setCalendarEvents(normalizedEvents);
        setAppointments(normalizedEvents.map((event) => event.extendedProps));
      } else {
        const data = await fetchDailyAppointments(format(currentDate, "yyyy-MM-dd"), activeBranchId);
        setAppointments(data);
        setCalendarEvents(data.map(buildCalendarEvent));
      }
    } catch (err: any) {
      setAppointments([]);
      setCalendarEvents([]);
      setLoadError(err?.message || "Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const loadResources = async () => {
    if (!activeBranchId) return;
    try {
      const [staffRes, servicesRes, clientsRes] = await Promise.all([
        fetchStaff(activeBranchId),
        fetchServices(activeBranchId),
        fetchClients(activeBranchId)
      ]);
      setStaffMembers(staffRes.staff || []);
      setServices(servicesRes.services || []);
      setClients(clientsRes.clients || []);
    } catch (err) {
      console.error("Failed to load resources", err);
    }
  };

  useEffect(() => {
    if (view === "calendar") return;
    loadAppointments();
  }, [view, currentDate, activeBranchId]);

  useEffect(() => {
    if (view !== "calendar") return;
    loadAppointments();
  }, [view, activeBranchId, calendarRange.startDate, calendarRange.endDate]);

  useEffect(() => {
    loadResources();
  }, [activeBranchId]);

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
    if (!activeBranchId) {
      setAttendanceData(null);
      return;
    }

    fetchMonthlyAttendance(currentDate.getMonth() + 1, currentDate.getFullYear(), activeBranchId)
      .then(setAttendanceData)
      .catch((error) => console.error("Failed to load attendance holidays", error));
  }, [activeBranchId, currentDate]);

  useEffect(() => {
    const syncWorkingHours = () => {
      setWorkingHours(readAppointmentSettings(activeBranchId).workingHours);
    };

    syncWorkingHours();
    window.addEventListener(APPOINTMENT_SETTINGS_UPDATED_EVENT, syncWorkingHours as EventListener);
    return () => window.removeEventListener(APPOINTMENT_SETTINGS_UPDATED_EVENT, syncWorkingHours as EventListener);
  }, [activeBranchId]);

  // Handlers
  const handleAddAppointment = (date?: Date) => {
    if (date) setCurrentDate(date);
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
  };

  const handleViewDetail = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsDetailModalOpen(true);
    setIsDayPanelOpen(true);
  };

  const handleDeleteAppointment = (id: string) => {
    confirm({
      title: "Delete Appointment",
      message: "Are you sure you want to delete this appointment?",
      onConfirm: async () => {
        try {
          await deleteAppointment(id);
          setAppointments(prev => prev.filter(a => a.id !== id));
          setCalendarEvents(prev => prev.filter(event => event.id !== id));
          toast("Appointment deleted");
        } catch (err) {
          toast("Failed to delete appointment", "error");
        }
      }
    });
  };

  const handleStatusUpdate = async (id: string, status: AppointmentStatus) => {
    try {
      await updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      setCalendarEvents(prev =>
        prev.map((event) =>
          event.id === id
            ? {
                ...event,
                extendedProps: {
                  ...event.extendedProps,
                  status,
                },
              }
            : event
        )
      );
      setSelectedAppointment(prev => (
        prev && prev.id === id
          ? { ...prev, status }
          : prev
      ));
      toast(`Status updated to ${status}`);
    } catch (err) {
      toast("Failed to update status", "error");
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const parsed = parse(timeStr, "HH:mm:ss", new Date());
      if (isNaN(parsed.getTime())) {
        // Try without seconds
        const parsedShort = parse(timeStr, "HH:mm", new Date());
        return format(parsedShort, "hh:mm a");
      }
      return format(parsed, "hh:mm a");
    } catch (e) {
      return timeStr;
    }
  };

  const isOngoing = (startTime: string, endTime: string, date: string) => {
    const now = new Date();
    if (format(now, "yyyy-MM-dd") !== date) return false;
    try {
      const start = parse(startTime, "HH:mm:ss", now);
      const end = parse(endTime, "HH:mm:ss", now);
      return isWithinInterval(now, { start, end });
    } catch {
      try {
        const start = parse(startTime, "HH:mm", now);
        const end = parse(endTime, "HH:mm", now);
        return isWithinInterval(now, { start, end });
      } catch {
        return false;
      }
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const matchesSearch = 
        (a.customer_name?.toLowerCase().includes(search.toLowerCase())) ||
        (a.staff_name?.toLowerCase().includes(search.toLowerCase())) ||
        (a.service_name?.toLowerCase().includes(search.toLowerCase()));
      const matchesStaff = staffFilter === "all" || a.staff_id === staffFilter;
      return matchesSearch && matchesStaff;
    });
  }, [appointments, search, staffFilter]);

  const filteredCalendarEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      const appointment = event.extendedProps;
      const searchTerm = search.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        appointment.customer_name?.toLowerCase().includes(searchTerm) ||
        appointment.staff_name?.toLowerCase().includes(searchTerm) ||
        appointment.service_name?.toLowerCase().includes(searchTerm);
      const matchesStaff = staffFilter === "all" || appointment.staff_id === staffFilter;
      return matchesSearch && matchesStaff;
    });
  }, [calendarEvents, search, staffFilter]);

  const calendarAppointmentsByDate = useMemo(() => {
    return filteredCalendarEvents.reduce<Record<string, Appointment[]>>((acc, event) => {
      const appointment = event.extendedProps;
      const dateKey = normalizeDateOnly(appointment.appointment_date);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(appointment);
      return acc;
    }, {});
  }, [filteredCalendarEvents]);

  const selectedDateKey = format(currentDate, "yyyy-MM-dd");
  const attendanceHolidayDates = useMemo(
    () => getAttendanceHolidayDates(attendanceData, currentDate.getMonth() + 1, currentDate.getFullYear()),
    [attendanceData, currentDate]
  );
  const holidayDateSet = useMemo(
    () => getHolidayDateSet(
      holidays,
      attendanceHolidayDates,
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      readAppointmentSettings(activeBranchId).weeklyHolidayDays
    ),
    [activeBranchId, currentDate, holidays, attendanceHolidayDates]
  );
  const selectedDayWorkingHours = workingHours[getWorkingDayKey(selectedDateKey)];
  const selectedDateAvailability = holidayDateSet.has(selectedDateKey)
    ? "Holiday"
    : formatWorkingHoursLabel(selectedDayWorkingHours);
  const selectedDateAppointments = useMemo(() => {
    return [...(calendarAppointmentsByDate[selectedDateKey] || [])].sort((a, b) =>
      `${normalizeDateOnly(a.appointment_date)}T${normalizeTimeOnly(a.start_time)}`.localeCompare(
        `${normalizeDateOnly(b.appointment_date)}T${normalizeTimeOnly(b.start_time)}`
      )
    );
  }, [calendarAppointmentsByDate, selectedDateKey]);
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, index) => currentYear - 10 + index);
  }, []);

  const syncCalendarMonth = (nextDate: Date) => {
    setCurrentDate(nextDate);
    setCalendarRange({
      startDate: format(startOfMonth(nextDate), "yyyy-MM-dd"),
      endDate: format(endOfMonth(nextDate), "yyyy-MM-dd"),
    });
  };

  const shiftCalendarMonth = (direction: -1 | 1) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + direction);
    syncCalendarMonth(nextDate);
  };

  const handleCalendarYearChange = (year: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setFullYear(year);
    syncCalendarMonth(nextDate);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      {/* Header Bar */}
      <div className={`flex flex-col gap-4 rounded-[24px] border p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="min-w-0 xl:flex-1">
          <h2 className={`truncate text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
              {format(currentDate, "MMMM d, yyyy")}
          </h2>
          <p className={`mt-1 truncate text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>
              Appointment Schedule
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:max-w-[68%] xl:flex-nowrap xl:justify-end">
          {!isManager && (
            <div className="relative shrink-0">
              <select 
                value={globalFilters.locationId} 
                onChange={(e) => setFilters({ locationId: e.target.value })}
                className={`appearance-none rounded-xl border pl-10 pr-10 py-2.5 text-sm font-semibold outline-none transition-all w-36 ${
                  isDark 
                    ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)] text-[#C8BFB4] focus:border-[#C9A96E] [color-scheme:dark]" 
                    : "bg-gray-50/50 border-[#F2EDE7] text-gray-700 focus:border-[#8B5E3C] [color-scheme:light]"
                }`}
              >
                <option value="all">Location</option>
                {locationOptions.map((l) => (
                  <option key={l.id} value={l.id}>{l.city || l.name}</option>
                ))}
              </select>
              <MapPin size={15} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              <ChevronDown size={15} className={`absolute right-3.5 top-3 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
            </div>
          )}

          <div className="relative shrink-0">
            <select 
              value={staffFilter} 
              onChange={(e) => setStaffFilter(e.target.value)}
              className={`appearance-none rounded-xl border pl-10 pr-10 py-2.5 text-sm font-semibold outline-none transition-all w-40 ${
                isDark 
                  ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)] text-[#C8BFB4] focus:border-[#C9A96E] [color-scheme:dark]" 
                  : "bg-gray-50/50 border-[#F2EDE7] text-gray-700 focus:border-[#8B5E3C] [color-scheme:light]"
              }`}
            >
              <option value="all">All Staff</option>
              {staffMembers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <User size={15} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
            <ChevronDown size={15} className={`absolute right-3.5 top-3 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
          </div>

          {/* Date Picker */}
          <div className="relative flex shrink-0 items-center">
            <input 
              type="date"
              value={format(currentDate, "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) {
                  const nextDate = parse(e.target.value, "yyyy-MM-dd", new Date());
                  setCurrentDate(nextDate);
                  if (view === "calendar") {
                    setCalendarRange({
                      startDate: format(startOfMonth(nextDate), "yyyy-MM-dd"),
                      endDate: format(endOfMonth(nextDate), "yyyy-MM-dd"),
                    });
                  }
                }
              }}
              className={`pl-10 pr-4 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all cursor-pointer ${
                isDark ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50 border-[#F2EDE7] text-gray-900 focus:border-[#8B5E3C]"
              }`}
            />
            <CalendarIcon size={16} className={`absolute left-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
          </div>

          {/* View Toggles */}
          <div className={`flex shrink-0 items-center rounded-xl border p-1 ${isDark ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-[#F2EDE7]"}`}>
            {[
              { id: "timeline", icon: Clock },
              { id: "calendar", icon: CalendarDays }
            ].map(v => (
              <button 
                key={v.id}
                onClick={() => {
                  const nextView = v.id as "timeline" | "calendar";
                  setView(nextView);
                  if (nextView === "calendar") {
                    setCalendarRange({
                      startDate: format(startOfMonth(currentDate), "yyyy-MM-dd"),
                      endDate: format(endOfMonth(currentDate), "yyyy-MM-dd"),
                    });
                  }
                }}
                className={`p-2 rounded-lg transition-all ${
                  view === v.id
                    ? (isDark ? "bg-[#C9A96E] text-[#0F1115]" : "bg-[#8B5E3C] text-white")
                    : (isDark ? "text-[#7A7572] hover:bg-white/5" : "text-gray-500 hover:bg-white shadow-sm")
                }`}
              >
                <v.icon size={18} />
              </button>
            ))}
          </div>

          <button 
            onClick={() => handleAddAppointment()}
            className={`flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 ${
              isDark 
                ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" 
                : "bg-[#8B5E3C] hover:bg-[#744A2E]"
            }`}
          >
            <Plus size={18} />
            Add New
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 min-h-0 overflow-hidden rounded-[24px] border shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#C9A96E]"></div>
              <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                Syncing Schedule...
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            {view === "timeline" && (
              <div className="p-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className={`border-b text-left ${isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2EDE7]"}`}>
                      <th className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Time</th>
                      <th className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Customer</th>
                      <th className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Service</th>
                      <th className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Staff</th>
                      <th className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Status</th>
                      <th className="pb-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <CalendarIcon size={40} className={isDark ? "text-[#1C2030]" : "text-gray-100"} />
                            <p className={`text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                              No appointments scheduled for this day.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((appt) => {
                        const ongoing = isOngoing(appt.start_time, appt.end_time, appt.appointment_date);
                        return (
                          <tr 
                            key={appt.id} 
                            onClick={() => handleViewDetail(appt)}
                            className={`group border-b last:border-0 transition-all cursor-pointer ${
                              isDark ? "border-[rgba(255,255,255,0.04)] hover:bg-white/5" : "border-[#F2EDE7] hover:bg-gray-50/80"
                            } ${ongoing ? (isDark ? "bg-[#C9A96E]/5" : "bg-[#8B5E3C]/5") : ""}`}
                          >
                            <td className="py-5">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className={ongoing ? "text-green-500 animate-pulse" : (isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]")} />
                                <span className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                                  {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                                </span>
                                {ongoing && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded-md bg-green-500 text-[8px] font-black text-white animate-pulse">LIVE</span>
                                )}
                              </div>
                            </td>
                          <td className="py-5">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black ${isDark ? "bg-[#1C2030] text-[#C9A96E]" : "bg-gray-100 text-[#8B5E3C]"}`}>
                                {appt.customer_name?.charAt(0) || "W"}
                              </div>
                              <span className={`text-sm font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                                {appt.customer_name || "Walk-in Customer"}
                              </span>
                            </div>
                          </td>
                          <td className="py-5">
                            <div className="flex items-center gap-2">
                              <Scissors size={14} className={isDark ? "text-[#7A7572]" : "text-gray-400"} />
                              <span className={`text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>
                                {appt.service_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-5">
                            <div className="flex items-center gap-2">
                              <User size={14} className={isDark ? "text-[#7A7572]" : "text-gray-400"} />
                              <span className={`text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>
                                {appt.staff_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-5">
                            <select
                              value={appt.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleStatusUpdate(appt.id, e.target.value as any)}
                              className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border border-current cursor-pointer outline-none bg-transparent ${
                                appt.status === 'booked' ? 'text-blue-500' :
                                appt.status === 'confirmed' ? 'text-green-500' :
                                appt.status === 'completed' ? 'text-purple-500' :
                                appt.status === 'cancelled' ? 'text-red-500' :
                                'text-gray-500'
                              }`}
                            >
                              <option value="booked">Booked</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="no_show">No Show</option>
                            </select>
                          </td>
                          <td className="py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditAppointment(appt); }}
                                className={`p-2 rounded-lg transition-all ${
                                  isDark
                                    ? "text-[#C9A96E] hover:bg-[#C9A96E]/10"
                                    : "text-[#8B5E3C] hover:bg-[#8B5E3C]/10"
                                }`}
                                aria-label="Edit appointment"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(appt.id); }}
                                className="p-2 rounded-lg text-red-500 transition-all hover:bg-red-500/10"
                                aria-label="Delete appointment"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                </table>
              </div>
            )}

      {view === "calendar" && (
              <div className={`p-6 calendar-view ${isDark ? "dark-calendar" : ""}`}>
                {loadError && (
                  <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                    isDark
                      ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#C8BFB4]"
                      : "border-[#F2EDE7] bg-[#FCFAF7] text-gray-600"
                  }`}>
                    {loadError}
                  </div>
                )}
                <div className={`grid gap-4 ${isDayPanelOpen ? "xl:grid-cols-[minmax(0,1fr)_270px]" : "grid-cols-1"}`}>
                  <div className={`overflow-hidden rounded-[28px] border ${
                    isDark
                      ? "border-[rgba(255,255,255,0.08)] bg-[#12161F]"
                      : "border-[#EDE3D7] bg-[#FFFEFC]"
                  }`}>
                    <div className={`flex flex-col gap-2.5 border-b px-4 py-3 ${
                      isDark ? "border-[rgba(255,255,255,0.08)]" : "border-[#F1E7DB]"
                    }`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${
                            isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"
                          }`}>
                            Calendar
                          </p>
                          <h3 className={`mt-1 font-['Outfit'] text-[1.45rem] font-black ${
                            isDark ? "text-[#F0EBE3]" : "text-[#1F2937]"
                          }`}>
                            {format(currentDate, "MMMM yyyy")}
                          </h3>
                        </div>

                        <div className="flex flex-col gap-2 lg:items-end">
                          <div className={`flex h-[38px] w-full items-center rounded-xl border px-3 lg:w-[220px] ${
                            isDark ? "border-[rgba(255,255,255,0.08)] bg-[#171C26]" : "border-[#EADFD3] bg-[#FFFCF8]"
                          }`}>
                            <Search size={14} className={isDark ? "text-[#7A7572]" : "text-gray-400"} />
                            <input
                              type="text"
                              placeholder="Search appointments..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className={`ml-2 w-full bg-transparent text-sm outline-none ${
                                isDark ? "text-[#F0EBE3] placeholder:text-[#7A7572]" : "text-[#2F3A4B] placeholder:text-gray-400"
                              }`}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className={`flex items-center rounded-2xl border p-1 ${
                              isDark ? "border-[rgba(255,255,255,0.08)] bg-[#171C26]" : "border-[#EADFD3] bg-[#FFFCF8]"
                            }`}>
                              <button
                                type="button"
                                onClick={() => shiftCalendarMonth(-1)}
                                className={`rounded-xl p-1.5 transition-all ${
                                  isDark ? "text-[#C8BFB4] hover:bg-white/5" : "text-[#7C5D4A] hover:bg-[#F6EFE6]"
                                }`}
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => shiftCalendarMonth(1)}
                                className={`rounded-xl p-1.5 transition-all ${
                                  isDark ? "text-[#C8BFB4] hover:bg-white/5" : "text-[#7C5D4A] hover:bg-[#F6EFE6]"
                                }`}
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>

                            <div className="relative">
                              <select
                                value={currentDate.getFullYear()}
                                onChange={(e) => handleCalendarYearChange(Number(e.target.value))}
                                className={`appearance-none rounded-2xl border px-3.5 py-1.5 pr-9 text-sm font-bold outline-none transition-all ${
                                  isDark
                                    ? "border-[rgba(255,255,255,0.08)] bg-[#171C26] text-[#F0EBE3] [color-scheme:dark]"
                                    : "border-[#EADFD3] bg-[#FFFCF8] text-[#5B6472] [color-scheme:light]"
                                }`}
                              >
                                {yearOptions.map((year) => (
                                  <option key={year} value={year}>{year}</option>
                                ))}
                              </select>
                              <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
                                isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"
                              }`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <FullCalendar
                      plugins={[dayGridPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      initialDate={format(currentDate, "yyyy-MM-dd")}
                      headerToolbar={false}
                      fixedWeekCount={false}
                      showNonCurrentDates
                      key={`${format(currentDate, "yyyy-MM-dd")}-${calendarRange.startDate}-${calendarRange.endDate}`}
                      datesSet={(info) => {
                        const nextStartDate = format(info.start, "yyyy-MM-dd");
                        const nextEndDate = format(subDays(info.end, 1), "yyyy-MM-dd");

                        setCalendarRange((prev) => (
                          prev.startDate === nextStartDate && prev.endDate === nextEndDate
                            ? prev
                            : { startDate: nextStartDate, endDate: nextEndDate }
                        ));
                      }}
                      dateClick={(info) => {
                        setCurrentDate(parse(info.dateStr, "yyyy-MM-dd", new Date()));
                        setIsDayPanelOpen(true);
                      }}
                      moreLinkClick={(info) => {
                        setCurrentDate(info.date);
                        setIsDayPanelOpen(true);
                        return "none";
                      }}
                      moreLinkContent={(info) => (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isDark ? "bg-[#1A1F2A] text-[#E8CC9B]" : "bg-[#F8EFE3] text-[#8B5E3C]"
                        }`}>
                          +{info.num} more
                        </span>
                      )}
                      events={filteredCalendarEvents.map((event) => ({
                        ...event,
                        backgroundColor: "transparent",
                        borderColor: "transparent",
                      }))}
                      eventClick={(info) => {
                        const appointment = info.event.extendedProps as Appointment;
                        setCurrentDate(parse(normalizeDateOnly(appointment.appointment_date), "yyyy-MM-dd", new Date()));
                        setIsDayPanelOpen(true);
                      }}
                      eventDisplay="block"
                      displayEventTime={false}
                      dayMaxEvents={3}
                      dayCellClassNames={(info) =>
                        format(info.date, "yyyy-MM-dd") === selectedDateKey
                          ? ["groomvy-selected-day"]
                          : []
                      }
                      eventContent={(eventInfo) => {
                        const appt = eventInfo.event.extendedProps as Appointment;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentDate(parse(normalizeDateOnly(appt.appointment_date), "yyyy-MM-dd", new Date()));
                              setIsDayPanelOpen(true);
                            }}
                            className={`flex w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 text-left transition-all ${
                              isDark ? "bg-[#1A1F2A] hover:bg-[#202634]" : "bg-[#FBF2E6] hover:bg-[#F6E7D4]"
                            }`}
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${CALENDAR_STATUS_STYLES[appt.status]?.dot || CALENDAR_STATUS_STYLES.booked.dot}`} />
                            <span className={`truncate text-[10px] font-semibold ${
                              isDark ? "text-[#F0EBE3]" : "text-[#55433A]"
                            }`}>
                              {formatTime(appt.start_time)}
                            </span>
                          </button>
                        );
                      }}
                      height="auto"
                    />
                  </div>

                  {isDayPanelOpen && (
                    <div className={`flex min-h-[430px] max-h-[580px] flex-col rounded-[28px] border p-4 ${
                      isDark
                        ? "border-[rgba(255,255,255,0.08)] bg-[#12161F]"
                        : "border-[#EDE3D7] bg-[#FFFEFC]"
                    }`}>
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className={`font-['Outfit'] text-[1.45rem] font-black leading-tight ${
                            isDark ? "text-[#F0EBE3]" : "text-[#1F2937]"
                          }`}>
                            {format(currentDate, "EEE, MMM d, yyyy")}
                          </h3>
                          <p className={`mt-2 text-sm ${
                            isDark ? "text-[#C8BFB4]" : "text-[#5B6472]"
                          }`}>
                            {selectedDateAppointments.length} Appointment{selectedDateAppointments.length === 1 ? "" : "s"}
                          </p>
                          <p className={`mt-1 text-xs font-semibold ${
                            holidayDateSet.has(selectedDateKey)
                              ? "text-[#C53030]"
                              : (isDark ? "text-[#E8CC9B]" : "text-[#8B5E3C]")
                          }`}>
                            {holidayDateSet.has(selectedDateKey) ? "Holiday" : `Working hours: ${selectedDateAvailability}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDayPanelOpen(false)}
                          className={`rounded-full p-2 transition-colors ${
                            isDark ? "text-[#C8BFB4] hover:bg-white/5" : "text-[#7C5D4A] hover:bg-[#F6EFE6]"
                          }`}
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {selectedDateAppointments.length === 0 ? (
                          <div className={`flex h-full min-h-[240px] items-center justify-center rounded-[24px] border border-dashed text-center ${
                            isDark
                              ? "border-[rgba(255,255,255,0.08)] text-[#8F8A84]"
                              : "border-[#EADFD3] text-[#8A7A6D]"
                          }`}>
                            <div className="px-6">
                              <p className="text-sm font-semibold">No appointments on this day</p>
                              <p className="mt-1 text-xs">
                                {holidayDateSet.has(selectedDateKey)
                                  ? "This date is marked as a holiday."
                                  : `Availability: ${selectedDateAvailability}. Pick another date or create a new booking.`}
                              </p>
                            </div>
                          </div>
                        ) : (
                          selectedDateAppointments.map((appointment) => {
                            const isLive = isOngoing(appointment.start_time, appointment.end_time, appointment.appointment_date);
                            return (
                              <button
                                key={appointment.id}
                                type="button"
                                onClick={() => handleViewDetail(appointment)}
                                className={`w-full rounded-[20px] border p-3.5 text-left transition-all ${
                                  isDark
                                    ? "border-[rgba(255,255,255,0.08)] bg-[#171C26] hover:border-[rgba(201,169,110,0.4)]"
                                    : "border-[#EEE5DA] bg-white hover:border-[#DAB89A]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className={`flex items-center gap-2 text-[13px] font-medium ${
                                    isDark ? "text-[#D6CEC5]" : "text-[#5B6472]"
                                  }`}>
                                    <span className={`h-2.5 w-2.5 rounded-full ${CALENDAR_STATUS_STYLES[appointment.status]?.dot || CALENDAR_STATUS_STYLES.booked.dot}`} />
                                    <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                                  </div>
                                  <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
                                    isLive
                                      ? "bg-[#FFF1D6] text-[#B76A00]"
                                      : CALENDAR_STATUS_STYLES[appointment.status]?.badge || CALENDAR_STATUS_STYLES.booked.badge
                                  }`}>
                                    {isLive ? "Live" : appointment.status.replace("_", " ")}
                                  </span>
                                </div>
                                <p className={`mt-3 text-[1.15rem] font-black leading-tight ${
                                  isDark ? "text-[#F0EBE3]" : "text-[#1F2937]"
                                }`}>
                                  {appointment.service_name || "Service"}
                                </p>
                                <p className={`mt-2 text-sm ${
                                  isDark ? "text-[#C8BFB4]" : "text-[#5B6472]"
                                }`}>
                                  {appointment.customer_name || "Walk-in Customer"}
                                </p>
                                <p className={`mt-1 text-xs ${
                                  isDark ? "text-[#938C86]" : "text-[#8A7A6D]"
                                }`}>
                                  {appointment.staff_name || "Unassigned staff"}
                                </p>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setView("timeline")}
                        className={`mt-4 flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition-all ${
                          isDark
                            ? "border-[rgba(201,169,110,0.35)] text-[#E8CC9B] hover:bg-[rgba(201,169,110,0.08)]"
                            : "border-[#D9C2A9] text-[#8B5E3C] hover:bg-[#FBF4EC]"
                        }`}
                      >
                        <CalendarIcon size={16} />
                        View Day Schedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === "list" && (
              <div className="p-6">
                {/* Similar to timeline but maybe with more summary/history feel */}
                <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50"}`}>
                  <p className="text-sm font-medium text-gray-500">List view is optimized for search and filtering over larger ranges.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Appointment Modal */}
      {isModalOpen && (
        <AppointmentFormModal 
          onClose={() => setIsModalOpen(false)}
          appointment={selectedAppointment}
          activeBranchId={activeBranchId}
          staffMembers={staffMembers}
          services={services}
          clients={clients}
          holidays={holidays}
          onSuccess={() => {
            setIsModalOpen(false);
            loadAppointments();
          }}
          isDark={isDark}
        />
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedAppointment && (
        <AppointmentDetailModal 
          appointment={selectedAppointment}
          onClose={() => setIsDetailModalOpen(false)}
          onStatusUpdate={handleStatusUpdate}
          isDark={isDark}
        />
      )}

      <style>{`
        .calendar-view .fc {
          --fc-border-color: ${isDark ? "rgba(255,255,255,0.06)" : "#F1E7DB"};
          --fc-page-bg-color: transparent;
          padding: 0.45rem 0.55rem 0.65rem;
        }
        .calendar-view .fc-scrollgrid,
        .calendar-view .fc-theme-standard td,
        .calendar-view .fc-theme-standard th {
          border-color: ${isDark ? "rgba(255,255,255,0.06)" : "#F1E7DB"} !important;
        }
        .calendar-view .fc-col-header-cell {
          background: transparent;
        }
        .calendar-view .fc-col-header-cell-cushion {
          padding: 0.45rem 0 !important;
          font-size: 0.76rem;
          font-weight: 700;
          color: ${isDark ? "#DDD3C8" : "#5B6472"};
          text-decoration: none !important;
        }
        .calendar-view .fc-header-toolbar {
          display: none !important;
        }
        .calendar-view .fc-daygrid-day-frame {
          min-height: 74px;
          padding: 0.18rem;
        }
        .calendar-view .fc-daygrid-day-number {
          font-size: 0.78rem;
          font-weight: 700;
          color: ${isDark ? "#F0EBE3" : "#2F3A4B"};
          text-decoration: none !important;
          padding: 0.14rem 0.24rem 0 0 !important;
        }
        .calendar-view .fc-day-today {
          background: ${isDark ? "rgba(201,169,110,0.08)" : "#FFF8ED"} !important;
        }
        .calendar-view .groomvy-selected-day {
          background: ${isDark ? "rgba(201,169,110,0.14)" : "#FFF5DC"} !important;
        }
        .calendar-view .fc-h-event {
          background: transparent !important;
          border: none !important;
        }
        .calendar-view .fc-daygrid-event {
          margin: 0.12rem 0 0 !important;
        }
        .calendar-view .fc-daygrid-more-link {
          margin: 0.16rem 0 0 !important;
          color: ${isDark ? "#C9A96E" : "#8B5E3C"} !important;
          font-size: 0.58rem;
          font-weight: 700;
          text-decoration: none !important;
        }
        .calendar-view .fc-daygrid-more-link:hover {
          text-decoration: none !important;
        }
        .calendar-view .fc-daygrid-day-events {
          margin-top: 0.58rem !important;
        }
        .calendar-view .fc-day-other .fc-daygrid-day-number {
          opacity: 0.45;
        }
        .calendar-view .fc-scrollgrid {
          border-radius: 1.35rem;
          overflow: hidden;
        }
        .calendar-view .fc-daygrid-day-top {
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}

// Separate component for the Modal to keep the main page clean
function AppointmentFormModal({ 
  onClose, appointment, activeBranchId, staffMembers, services, clients, holidays, onSuccess, isDark 
}: any) {
  const { toast } = useNotifications();
  const isEditing = Boolean(appointment?.id);
  const [busySlots, setBusySlots] = useState<{start_time: string, end_time: string}[]>([]);
  const [attendanceData, setAttendanceData] = useState<MonthlyAttendanceData | null>(null);
  const [workingHours, setWorkingHours] = useState(() => readAppointmentSettings(activeBranchId).workingHours);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AppointmentInput>({
    customerId: appointment?.customer_id || "",
    branchId: activeBranchId,
    staffId: appointment?.staff_id || "",
    serviceId: appointment?.service_id || "",
    appointmentDate: appointment?.appointment_date || format(new Date(), "yyyy-MM-dd"),
    startTime: appointment?.start_time ? appointment.start_time.slice(0, 5) : "",
    endTime: appointment?.end_time ? appointment.end_time.slice(0, 5) : "",
    notes: appointment?.notes || "",
    status: appointment?.status || "booked"
  });

  useEffect(() => {
    setWorkingHours(readAppointmentSettings(activeBranchId).workingHours);

    const syncWorkingHours = () => {
      setWorkingHours(readAppointmentSettings(activeBranchId).workingHours);
    };

    window.addEventListener(APPOINTMENT_SETTINGS_UPDATED_EVENT, syncWorkingHours as EventListener);
    return () => window.removeEventListener(APPOINTMENT_SETTINGS_UPDATED_EVENT, syncWorkingHours as EventListener);
  }, [activeBranchId]);

  useEffect(() => {
    if (!activeBranchId || !formData.appointmentDate) {
      setAttendanceData(null);
      return;
    }

    const selectedDate = parse(formData.appointmentDate, "yyyy-MM-dd", new Date());
    fetchMonthlyAttendance(selectedDate.getMonth() + 1, selectedDate.getFullYear(), activeBranchId)
      .then(setAttendanceData)
      .catch((error) => console.error("Failed to load attendance holidays", error));
  }, [activeBranchId, formData.appointmentDate]);

  // Fetch busy slots
  useEffect(() => {
    if (formData.staffId && formData.appointmentDate) {
      fetchBusySlots(formData.staffId, formData.appointmentDate)
        .then(res => setBusySlots(res))
        .catch(console.error);
    }
  }, [formData.staffId, formData.appointmentDate]);

  const selectedDate = useMemo(
    () => parse(formData.appointmentDate, "yyyy-MM-dd", new Date()),
    [formData.appointmentDate]
  );
  const attendanceHolidayDates = useMemo(
    () => getAttendanceHolidayDates(attendanceData, selectedDate.getMonth() + 1, selectedDate.getFullYear()),
    [attendanceData, selectedDate]
  );
  const holidayDateSet = useMemo(
    () => getHolidayDateSet(
      holidays || [],
      attendanceHolidayDates,
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      readAppointmentSettings(activeBranchId).weeklyHolidayDays
    ),
    [activeBranchId, holidays, attendanceHolidayDates, selectedDate]
  );
  const selectedDayHours = workingHours[getWorkingDayKey(formData.appointmentDate)];
  const isHolidayDate = holidayDateSet.has(formData.appointmentDate);

  // Generate available slots within saved working hours
  const availableSlots = useMemo(() => {
    if (!selectedDayHours?.enabled || isHolidayDate) return [];

    const service = services.find((item: any) => item.id === formData.serviceId);
    const serviceDuration = Number(service?.duration || 15);
    const slots: string[] = [];
    let current = parse(selectedDayHours.start, "HH:mm", new Date());
    const dayEnd = parse(selectedDayHours.end, "HH:mm", new Date());
    const now = new Date();
    const isToday = formData.appointmentDate === format(now, "yyyy-MM-dd");

    while (current < dayEnd) {
      const slotEnd = addMinutes(current, serviceDuration);
      if (slotEnd > dayEnd) break;

      const timeStr = format(current, "HH:mm");
      if (isToday && isBefore(current, now)) {
        current = addMinutes(current, 15);
        continue;
      }

      const isBusy = busySlots.some((busy) => {
        const busyStart = parse(busy.start_time.slice(0, 5), "HH:mm", new Date());
        const busyEnd = parse(busy.end_time.slice(0, 5), "HH:mm", new Date());
        return current < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        slots.push(timeStr);
      }

      current = addMinutes(current, 15);
    }

    return slots;
  }, [busySlots, formData.appointmentDate, formData.serviceId, isHolidayDate, selectedDayHours, services]);

  // Auto-calculate end time
  useEffect(() => {
    if (formData.serviceId && formData.startTime) {
      const service = services.find((s: any) => s.id === formData.serviceId);
      if (service) {
        const start = parse(formData.startTime, "HH:mm", new Date());
        const end = addMinutes(start, service.duration);
        setFormData(prev => ({ ...prev, endTime: format(end, "HH:mm") }));
      }
    }
  }, [formData.serviceId, formData.startTime, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHolidayDate) {
      toast("This date is marked as a holiday.", "error");
      return;
    }
    if (!selectedDayHours?.enabled) {
      toast("This day is closed in working hours settings.", "error");
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      toast("Please select a time slot", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      if (appointment?.id) {
        await updateAppointment(appointment.id, formData);
        toast("Appointment updated successfully");
      } else {
        await createAppointment(formData);
        toast("Appointment booked successfully");
      }
      onSuccess();
    } catch (err: any) {
      toast(err.message || "Something went wrong", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className={`flex w-full max-w-xl flex-col overflow-hidden rounded-[32px] border shadow-2xl transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className={`flex items-center justify-between border-b px-6 py-5 ${
          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50 border-[#F2EDE7]"
        }`}>
          <div>
            <h2 className={`text-xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
              {isEditing ? "Edit Booking" : "New Booking"}
            </h2>
            <p className={`text-xs font-bold uppercase tracking-widest mt-0.5 ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
              {isEditing ? "Update customer schedule" : "Add customer to schedule"}
            </p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-all hover:bg-white/5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[70vh] scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Customer Select */}
            <div className="md:col-span-2">
              <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Customer</label>
              <div className="relative">
                <select 
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                  className={`w-full appearance-none rounded-xl border px-10 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50 border-[#F2EDE7] text-gray-900 focus:border-[#8B5E3C]"
                  }`}
                >
                  <option value="">Select Customer</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phoneNumber}</option>
                  ))}
                </select>
                <User size={16} className={`absolute left-3.5 top-3.5 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              </div>
            </div>

            {/* Service Select */}
            <div className="md:col-span-2">
              <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Service</label>
              <div className="relative">
                <select 
                  required
                  value={formData.serviceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value }))}
                  className={`w-full appearance-none rounded-xl border px-10 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50 border-[#F2EDE7] text-gray-900 focus:border-[#8B5E3C]"
                  }`}
                >
                  <option value="">Select Service</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.duration} mins)</option>
                  ))}
                </select>
                <Scissors size={16} className={`absolute left-3.5 top-3.5 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              </div>
            </div>

            {/* Staff Select */}
            <div className="md:col-span-2">
              <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Staff Member</label>
              <div className="relative">
                <select 
                  required
                  value={formData.staffId}
                  onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                  className={`w-full appearance-none rounded-xl border px-10 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50 border-[#F2EDE7] text-gray-900 focus:border-[#8B5E3C]"
                  }`}
                >
                  <option value="">Select Staff</option>
                  {staffMembers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} - {s.role}</option>
                  ))}
                </select>
                <User size={16} className={`absolute left-3.5 top-3.5 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Date</label>
              <div className="relative">
                <input 
                  type="date"
                  required
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                  className={`w-full rounded-xl border px-10 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50 border-[#F2EDE7] text-gray-900 focus:border-[#8B5E3C]"
                  }`}
                />
                <CalendarIcon size={16} className={`absolute left-3.5 top-3.5 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              </div>
            </div>

            {/* Smart Time Slot Picker */}
            <div className="md:col-span-2">
              <label className={`mb-3 block text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                Available Start Times {formData.endTime && `(End: ${formatTime(formData.endTime)})`}
              </label>

              <div className={`mb-3 rounded-xl px-4 py-3 text-xs font-semibold ${
                isHolidayDate
                  ? "bg-red-500/10 text-red-500"
                  : selectedDayHours?.enabled
                    ? (isDark ? "bg-white/5 text-[#C8BFB4]" : "bg-[#F8F3ED] text-[#5B6472]")
                    : "bg-yellow-500/10 text-yellow-700"
              }`}>
                {isHolidayDate
                  ? "Holiday: bookings are blocked for this date."
                  : selectedDayHours?.enabled
                    ? `Working hours: ${formatWorkingHoursLabel(selectedDayHours)}`
                    : "This day is closed in settings."}
              </div>
              
              {!formData.staffId || !formData.serviceId ? (
                <div className={`p-4 rounded-xl text-center text-xs font-bold ${isDark ? "bg-white/5 text-[#7A7572]" : "bg-gray-50 text-gray-400"}`}>
                  Please select staff and service to see available slots
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar scrollbar-hide">
                  {availableSlots.length > 0 ? (
                    availableSlots.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, startTime: time }))}
                        className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all border ${
                          formData.startTime === time
                            ? (isDark ? "bg-[#C9A96E] border-[#C9A96E] text-[#151821]" : "bg-[#8B5E3C] border-[#8B5E3C] text-white")
                            : (isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)] text-[#7A7572] hover:border-[#C9A96E]/30" : "bg-white border-[#F2EDE7] text-gray-500 hover:border-[#8B5E3C]/30")
                        }`}
                      >
                        {formatTime(time)}
                      </button>
                    ))
                  ) : (
                    <div className="w-full p-4 rounded-xl text-center text-xs font-bold text-red-400 bg-red-400/5">
                      {isHolidayDate
                        ? "This date is a holiday."
                        : !selectedDayHours?.enabled
                          ? "This day is closed in settings."
                          : "No available slots for this date/staff"}
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* Notes */}
            <div className="md:col-span-2">
              <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Notes</label>
              <textarea 
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special requests or instructions..."
                rows={3}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all resize-none ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50 border-[#F2EDE7] text-gray-900 focus:border-[#8B5E3C]"
                }`}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button 
              type="button" 
              onClick={onClose}
              className={`flex-1 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                isDark ? "bg-white/5 text-[#7A7572] hover:bg-white/10" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`flex-[2] px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${
                isDark 
                  ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.2)]" 
                  : "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.2)]"
              }`}
            >
              {isSubmitting ? "Processing..." : isEditing ? "Save Changes" : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AppointmentDetailModal({ appointment, onClose, onStatusUpdate, isDark }: any) {
  if (!appointment) return null;
  
  const [isUpdating, setIsUpdating] = useState(false);
  const normalizedAppointmentDate = normalizeDateOnly(appointment.appointment_date);
  const statusConfig = STATUS_CONFIG[appointment.status as AppointmentStatus] || STATUS_CONFIG.booked;

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    setIsUpdating(true);
    try {
      await onStatusUpdate(appointment.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTimeLocal = (time: string) => {
    if (!time) return "";
    try {
      const parsed = parse(time, time.length === 8 ? "HH:mm:ss" : "HH:mm", new Date());
      return format(parsed, "hh:mm a");
    } catch {
      return time;
    }
  };

  const formattedAppointmentDate = (() => {
    if (!normalizedAppointmentDate) return "Unknown date";
    try {
      return format(parse(normalizedAppointmentDate, "yyyy-MM-dd", new Date()), "MMMM d, yyyy");
    } catch {
      return normalizedAppointmentDate;
    }
  })();
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className={`flex w-full max-w-md flex-col overflow-hidden rounded-[32px] border shadow-2xl transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8] text-gray-900"
      }`}>
        <div className={`flex items-center justify-between border-b px-6 py-5 ${
          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50 border-[#F2EDE7]"
        }`}>
          <div>
            <h2 className="text-xl font-black font-['Outfit']">Booking Info</h2>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
              Scheduled for {formattedAppointmentDate}
            </p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-all hover:bg-white/5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm ${isDark ? "bg-[#1C2030] text-[#C9A96E]" : "bg-[#FCFAF7] text-[#8B5E3C]"}`}>
              {appointment.customer_name?.charAt(0) || "W"}
            </div>
            <div>
              <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 block ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Customer</label>
              <p className="text-base font-black">{appointment.customer_name || "Walk-in Customer"}</p>
              {appointment.customer_phone && <p className={`text-xs font-bold mt-0.5 ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{appointment.customer_phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${isDark ? "bg-white/5 text-[#C9A96E]" : "bg-gray-50 text-[#8B5E3C]"}`}>
                <Scissors size={18} />
              </div>
              <div>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 block ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Service</label>
                <p className="text-sm font-bold">{appointment.service_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${isDark ? "bg-white/5 text-[#C9A96E]" : "bg-gray-50 text-[#8B5E3C]"}`}>
                <User size={18} />
              </div>
              <div>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 block ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Staff</label>
                <p className="text-sm font-bold">{appointment.staff_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${isDark ? "bg-white/5 text-[#C9A96E]" : "bg-gray-50 text-[#8B5E3C]"}`}>
                <Clock size={18} />
              </div>
              <div>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 block ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Time Slot</label>
                <p className="text-sm font-bold">{formatTimeLocal(appointment.start_time)} - {formatTimeLocal(appointment.end_time)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${isDark ? "bg-white/5 text-[#C9A96E]" : "bg-gray-50 text-[#8B5E3C]"}`}>
                <div className={`h-3 w-3 rounded-full ${statusConfig.bg}`} />
              </div>
              <div>
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 block ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Current Status</label>
                <p className={`text-sm font-bold capitalize ${statusConfig.color}`}>
                  {statusConfig.label}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Update Status</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  disabled={isUpdating || appointment.status === key}
                  onClick={() => handleStatusChange(key as AppointmentStatus)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                    appointment.status === key
                      ? `${config.bg} ${config.color} ${config.border} opacity-50`
                      : (isDark ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)] text-[#7A7572] hover:border-[#C9A96E]/50" : "bg-white border-[#F2EDE7] text-gray-500 hover:border-[#8B5E3C]/50")
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {appointment.notes && (
            <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#0F1115] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-[#F2EDE7]"}`}>
              <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 block ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Notes</label>
              <p className={`text-sm italic ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>"{appointment.notes}"</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[rgba(255,255,255,0.05)] flex justify-end">
          <button 
            onClick={onClose}
            className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
              isDark ? "bg-white/5 hover:bg-white/10 text-[#F0EBE3]" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
