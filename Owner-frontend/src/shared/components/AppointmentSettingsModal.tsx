import { useEffect, useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { CalendarDays, Clock3, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  createHoliday,
  deleteHoliday,
  fetchHolidays,
  fetchMonthlyAttendance,
  type Holiday,
  type MonthlyAttendanceData,
} from "../../core/api";
import { useDashboardTheme } from "../theme/ThemeProvider";
import {
  DEFAULT_APPOINTMENT_SETTINGS,
  WORKING_HOUR_DAYS,
  formatWorkingHoursLabel,
  getAttendanceHolidayDates,
  getWorkingDayKey,
  readAppointmentSettings,
  saveAppointmentSettings,
  to12HourParts,
  from12HourParts,
  type AppointmentSettings,
  type WorkingHourDayKey,
} from "../utils/appointmentSettings";

type AppointmentSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activeBranchId: string;
  branchLabel: string;
};

type SettingsTab = "working-hours" | "holiday-settings";

const DAY_LABELS: Record<WorkingHourDayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "15", "30", "45"];
const PERIOD_OPTIONS: Array<"AM" | "PM"> = ["AM", "PM"];

function getTodayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

function TimeField({
  label,
  value,
  disabled,
  isDark,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  isDark: boolean;
  onChange: (nextValue: string) => void;
}) {
  const parts = to12HourParts(value);
  const fieldCls = isDark
    ? "border-[rgba(255,255,255,0.08)] bg-[#10151D] text-[#F0EBE3]"
    : "border-[#E8DDD1] bg-[#FFFCF8] text-[#1F2937]";

  return (
    <div className="grid gap-2">
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#8F8A84]" : "text-[#8A7A6D]"}`}>
        {label}
      </span>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_84px] gap-2">
        <select
          value={parts.hour}
          disabled={disabled}
          onChange={(event) => onChange(from12HourParts(event.target.value, parts.minute, parts.period))}
          className={`min-w-0 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition disabled:opacity-50 ${fieldCls}`}
        >
          {HOUR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={parts.minute}
          disabled={disabled}
          onChange={(event) => onChange(from12HourParts(parts.hour, event.target.value, parts.period))}
          className={`min-w-0 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition disabled:opacity-50 ${fieldCls}`}
        >
          {MINUTE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={parts.period}
          disabled={disabled}
          onChange={(event) => onChange(from12HourParts(parts.hour, parts.minute, event.target.value as "AM" | "PM"))}
          className={`min-w-0 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition disabled:opacity-50 ${fieldCls}`}
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function AppointmentSettingsModal({
  isOpen,
  onClose,
  activeBranchId,
  branchLabel,
}: AppointmentSettingsModalProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<SettingsTab>("working-hours");
  const [settings, setSettings] = useState<AppointmentSettings>(DEFAULT_APPOINTMENT_SETTINGS);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [attendanceData, setAttendanceData] = useState<MonthlyAttendanceData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [isSavingHolidays, setIsSavingHolidays] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isCreatingHoliday, setIsCreatingHoliday] = useState(false);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    holidayName: "",
    holidayDate: getTodayKey(),
    isRecurring: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    setSettings(readAppointmentSettings(activeBranchId));
    setActiveTab("working-hours");
  }, [isOpen, activeBranchId]);

  useEffect(() => {
    if (!isOpen || !activeBranchId) return;

    let isMounted = true;
    setIsLoadingData(true);

    Promise.all([
      fetchHolidays(activeBranchId),
      fetchMonthlyAttendance(selectedMonth.getMonth() + 1, selectedMonth.getFullYear(), activeBranchId),
    ])
      .then(([holidayResponse, monthlyAttendance]) => {
        if (!isMounted) return;
        setHolidays(holidayResponse);
        setAttendanceData(monthlyAttendance);
      })
      .catch((error) => {
        console.error("Failed to load appointment settings data", error);
      })
      .finally(() => {
        if (isMounted) setIsLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeBranchId, selectedMonth]);

  const attendanceHolidayDates = useMemo(
    () => getAttendanceHolidayDates(attendanceData, selectedMonth.getMonth() + 1, selectedMonth.getFullYear()),
    [attendanceData, selectedMonth]
  );

  const manualHolidayKeys = useMemo(
    () => new Set(holidays.map((holiday) => holiday.holiday_date.slice(0, 10))),
    [holidays]
  );

  const attendanceOnlyHolidayDates = attendanceHolidayDates.filter((dateKey) => !manualHolidayKeys.has(dateKey));

  const handleSaveHours = () => {
    setIsSavingHours(true);
    saveAppointmentSettings(activeBranchId, settings);
    window.setTimeout(() => setIsSavingHours(false), 400);
  };

  const handleSaveHolidayRules = () => {
    setIsSavingHolidays(true);
    saveAppointmentSettings(activeBranchId, settings);
    window.setTimeout(() => setIsSavingHolidays(false), 400);
  };

  const handleAddHoliday = async () => {
    if (!activeBranchId || !holidayForm.holidayName.trim() || !holidayForm.holidayDate) return;

    setIsCreatingHoliday(true);
    try {
      const created = await createHoliday({
        branchId: activeBranchId,
        holidayName: holidayForm.holidayName.trim(),
        holidayDate: holidayForm.holidayDate,
        isRecurring: holidayForm.isRecurring,
      });
      setHolidays((prev) => [...prev, created].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)));
      setHolidayForm({ holidayName: "", holidayDate: getTodayKey(), isRecurring: false });
    } catch (error) {
      console.error("Failed to create holiday", error);
    } finally {
      setIsCreatingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    setDeletingHolidayId(holidayId);
    try {
      await deleteHoliday(holidayId);
      setHolidays((prev) => prev.filter((holiday) => holiday.id !== holidayId));
    } catch (error) {
      console.error("Failed to delete holiday", error);
    } finally {
      setDeletingHolidayId(null);
    }
  };

  const contentBg = isDark
    ? "border-[rgba(255,255,255,0.06)] bg-[#10151D]"
    : "border-[#EEE3D7] bg-[#FFFCF8]";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div
        className={`relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border ${
          isDark
            ? "border-[rgba(255,255,255,0.08)] bg-[#141923] text-[#F0EBE3]"
            : "border-[#E8E1D8] bg-white text-[#1F2937]"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-5 top-5 z-10 rounded-full border p-2 transition ${
            isDark
              ? "border-[rgba(255,255,255,0.1)] text-[#C8BFB4] hover:bg-white/5"
              : "border-[#E8E1D8] text-[#6B7280] hover:bg-[#F8F3ED]"
          }`}
          aria-label="Close settings"
        >
          <X size={18} />
        </button>

        <div
          className={`border-b px-6 py-6 ${
            isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1A2130]" : "border-[#F1E7DB] bg-[#FCF9F5]"
          }`}
        >
          <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
            Settings
          </p>
          <h2 className="mt-2 font-['Outfit'] text-[2rem] font-black">Appointment Availability</h2>
          <p className={`mt-2 max-w-2xl text-sm ${isDark ? "text-[#A9A095]" : "text-[#6B7280]"}`}>
            Settings for {branchLabel}. Weekly holidays and single-date holidays are blocked by default in attendance and appointments.
          </p>

          <div className={`mt-5 inline-flex rounded-2xl border p-1 ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#121821]" : "border-[#E8DDD1] bg-white"}`}>
            {[
              { id: "working-hours" as const, label: "Working Hours", icon: Clock3 },
              { id: "holiday-settings" as const, label: "Holiday Settings", icon: CalendarDays },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-black transition ${
                    isActive
                      ? (isDark ? "bg-[#C9A96E] text-[#10151D]" : "bg-[#8B5E3C] text-white")
                      : (isDark ? "text-[#C8BFB4] hover:bg-white/5" : "text-[#5B6472] hover:bg-[#F8F3ED]")
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {activeTab === "working-hours" ? (
            <div className={`rounded-[24px] border p-5 ${contentBg}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock3 size={16} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                    <h3 className="text-lg font-black">Working Hours</h3>
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? "text-[#8F8A84]" : "text-[#6B7280]"}`}>
                    Customers will only see available booking slots inside these hours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveHours}
                  className={`rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition ${
                    isDark ? "bg-[#C9A96E] text-[#11151D]" : "bg-[#8B5E3C] text-white"
                  }`}
                >
                  {isSavingHours ? "Saved" : "Save Hours"}
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {WORKING_HOUR_DAYS.map((dayKey) => {
                  const day = settings.workingHours[dayKey];
                  return (
                    <div
                      key={dayKey}
                      className={`rounded-[20px] border p-4 ${
                        isDark ? "border-[rgba(255,255,255,0.05)] bg-[#171C26]" : "border-[#F1E7DB] bg-white"
                      }`}
                    >
                      <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_120px] xl:items-center">
                        <div>
                          <p className="text-base font-black">{DAY_LABELS[dayKey]}</p>
                          <p className={`mt-1 text-xs ${isDark ? "text-[#8F8A84]" : "text-[#8A7A6D]"}`}>
                            {formatWorkingHoursLabel(day)}
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <TimeField
                            label="Start"
                            value={day.start}
                            disabled={!day.enabled}
                            isDark={isDark}
                            onChange={(nextValue) =>
                              setSettings((prev) => ({
                                ...prev,
                                workingHours: {
                                  ...prev.workingHours,
                                  [dayKey]: { ...prev.workingHours[dayKey], start: nextValue },
                                },
                              }))
                            }
                          />
                          <TimeField
                            label="End"
                            value={day.end}
                            disabled={!day.enabled}
                            isDark={isDark}
                            onChange={(nextValue) =>
                              setSettings((prev) => ({
                                ...prev,
                                workingHours: {
                                  ...prev.workingHours,
                                  [dayKey]: { ...prev.workingHours[dayKey], end: nextValue },
                                },
                              }))
                            }
                          />
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm font-semibold xl:justify-end">
                          <input
                            type="checkbox"
                            checked={day.enabled}
                            onChange={(event) =>
                              setSettings((prev) => ({
                                ...prev,
                                workingHours: {
                                  ...prev.workingHours,
                                  [dayKey]: { ...prev.workingHours[dayKey], enabled: event.target.checked },
                                },
                              }))
                            }
                            className="h-4 w-4 rounded border-[#D7C6B5]"
                          />
                          Open
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <div className={`rounded-[24px] border p-5 ${contentBg}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                      <h3 className="text-lg font-black">Holiday Settings</h3>
                    </div>
                    {/* <p className={`mt-1 text-sm ${isDark ? "text-[#8F8A84]" : "text-[#6B7280]"}`}>
                      Add single dates or mark a weekday like Tuesday to apply as a holiday across the whole month.
                    </p> */}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveHolidayRules}
                    className={`rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition ${
                      isDark ? "bg-[#C9A96E] text-[#11151D]" : "bg-[#8B5E3C] text-white"
                    }`}
                  >
                    {isSavingHolidays ? "Saved" : "Save Rules"}
                  </button>
                </div>

                <div className="mt-5">
                  <h4 className="text-sm font-black">Weekly Holiday Rule</h4>
                  {/* <p className={`mt-1 text-sm ${isDark ? "text-[#8F8A84]" : "text-[#6B7280]"}`}>
                    Any selected weekday is treated as a holiday for every matching day in the month.
                  </p> */}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {WORKING_HOUR_DAYS.map((dayKey) => {
                      const checked = settings.weeklyHolidayDays.includes(dayKey);
                      return (
                        <label
                          key={dayKey}
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                            checked
                              ? (isDark ? "border-[#C9A96E] bg-[#C9A96E]/10 text-[#F0EBE3]" : "border-[#8B5E3C] bg-[#8B5E3C]/5 text-[#1F2937]")
                              : (isDark ? "border-[rgba(255,255,255,0.06)] bg-[#171C26] text-[#C8BFB4]" : "border-[#F1E7DB] bg-white text-[#4B5563]")
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setSettings((prev) => ({
                                ...prev,
                                weeklyHolidayDays: event.target.checked
                                  ? [...prev.weeklyHolidayDays, dayKey]
                                  : prev.weeklyHolidayDays.filter((item) => item !== dayKey),
                              }))
                            }
                            className="h-4 w-4 rounded border-[#D7C6B5]"
                          />
                          {DAY_LABELS[dayKey]}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-black">Single Date Holiday</h4>
                  <div className="mt-4 grid gap-3">
                    <input
                      type="text"
                      placeholder="Holiday name"
                      value={holidayForm.holidayName}
                      onChange={(event) => setHolidayForm((prev) => ({ ...prev, holidayName: event.target.value }))}
                      className={`rounded-xl border px-4 py-3 text-sm outline-none transition ${
                        isDark
                          ? "border-[rgba(255,255,255,0.08)] bg-[#171C26] text-[#F0EBE3]"
                          : "border-[#E8DDD1] bg-white text-[#1F2937]"
                      }`}
                    />
                    <input
                      type="date"
                      value={holidayForm.holidayDate}
                      onChange={(event) => setHolidayForm((prev) => ({ ...prev, holidayDate: event.target.value }))}
                      className={`rounded-xl border px-4 py-3 text-sm outline-none transition ${
                        isDark
                          ? "border-[rgba(255,255,255,0.08)] bg-[#171C26] text-[#F0EBE3] [color-scheme:dark]"
                          : "border-[#E8DDD1] bg-white text-[#1F2937] [color-scheme:light]"
                      }`}
                    />
                    <label className={`inline-flex items-center gap-2 text-sm ${isDark ? "text-[#C8BFB4]" : "text-[#4B5563]"}`}>
                      <input
                        type="checkbox"
                        checked={holidayForm.isRecurring}
                        onChange={(event) => setHolidayForm((prev) => ({ ...prev, isRecurring: event.target.checked }))}
                        className="h-4 w-4 rounded border-[#D7C6B5]"
                      />
                      Repeat every year for this date
                    </label>
                    <button
                      type="button"
                      onClick={handleAddHoliday}
                      disabled={isCreatingHoliday || !holidayForm.holidayName.trim() || !holidayForm.holidayDate}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition disabled:opacity-50 ${
                        isDark ? "bg-[#C9A96E] text-[#11151D]" : "bg-[#8B5E3C] text-white"
                      }`}
                    >
                      <Plus size={14} />
                      {isCreatingHoliday ? "Adding..." : "Add Holiday"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className={`rounded-[24px] border p-5 ${contentBg}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-black">Saved Holidays</h4>
                    <span className={`text-xs ${isDark ? "text-[#8F8A84]" : "text-[#8A7A6D]"}`}>{holidays.length} total</span>
                  </div>

                  {holidays.length === 0 ? (
                    <div className={`mt-4 rounded-2xl border border-dashed px-4 py-5 text-sm ${isDark ? "border-[rgba(255,255,255,0.08)] text-[#8F8A84]" : "border-[#E8DDD1] text-[#8A7A6D]"}`}>
                      No manual holidays added yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {holidays
                        .slice()
                        .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
                        .map((holiday) => (
                          <div
                            key={holiday.id}
                            className={`flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 ${
                              isDark ? "border-[rgba(255,255,255,0.05)] bg-[#171C26]" : "border-[#F1E7DB] bg-white"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-bold">{holiday.holiday_name}</p>
                              <p className={`mt-1 text-xs ${isDark ? "text-[#8F8A84]" : "text-[#8A7A6D]"}`}>
                                {format(parse(holiday.holiday_date.slice(0, 10), "yyyy-MM-dd", new Date()), "MMMM d, yyyy")}
                                {holiday.is_recurring ? " • Recurring" : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(holiday.id)}
                              disabled={deletingHolidayId === holiday.id}
                              className="rounded-xl p-2 text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                              aria-label={`Delete ${holiday.holiday_name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className={`rounded-[24px] border p-5 ${contentBg}`}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                    <h3 className="text-lg font-black">Attendance Holidays</h3>
                  </div>
                  <p className={`mt-1 text-sm ${isDark ? "text-[#8F8A84]" : "text-[#6B7280]"}`}>
                    Any day where every staff member is marked as holiday in attendance is treated as a booking holiday automatically.
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="month"
                      value={format(selectedMonth, "yyyy-MM")}
                      onChange={(event) => {
                        const [year, month] = event.target.value.split("-").map(Number);
                        setSelectedMonth(new Date(year, month - 1, 1));
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm outline-none transition ${
                        isDark
                          ? "border-[rgba(255,255,255,0.08)] bg-[#171C26] text-[#F0EBE3] [color-scheme:dark]"
                          : "border-[#E8DDD1] bg-white text-[#1F2937] [color-scheme:light]"
                      }`}
                    />
                    {isLoadingData ? <span className={`text-xs ${isDark ? "text-[#8F8A84]" : "text-[#8A7A6D]"}`}>Loading...</span> : null}
                  </div>

                  {attendanceOnlyHolidayDates.length === 0 ? (
                    <div className={`mt-4 rounded-2xl border border-dashed px-4 py-5 text-sm ${isDark ? "border-[rgba(255,255,255,0.08)] text-[#8F8A84]" : "border-[#E8DDD1] text-[#8A7A6D]"}`}>
                      No full-day attendance holidays detected for this month.
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {attendanceOnlyHolidayDates.map((dateKey) => (
                        <span
                          key={dateKey}
                          className={`rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${
                            isDark ? "bg-[#2A203A] text-[#D3B7FF]" : "bg-[#F3E8FF] text-[#7C3AED]"
                          }`}
                        >
                          {format(parse(dateKey, "yyyy-MM-dd", new Date()), "MMM d")}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${isDark ? "bg-[#171C26] text-[#C8BFB4]" : "bg-white text-[#5B6472]"}`}>
                    Today&apos;s availability:
                    <span className="ml-2 font-bold">
                      {formatWorkingHoursLabel(settings.workingHours[getWorkingDayKey(new Date())])}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
