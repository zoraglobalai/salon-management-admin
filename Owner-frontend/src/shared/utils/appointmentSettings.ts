import { format, parse } from "date-fns";
import type { Holiday, MonthlyAttendanceData } from "../../core/api";

export const APPOINTMENT_SETTINGS_UPDATED_EVENT = "appointment-settings-updated";

export const WORKING_HOUR_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WorkingHourDayKey = typeof WORKING_HOUR_DAYS[number];

export type WorkingDayHours = {
  enabled: boolean;
  start: string;
  end: string;
};

export type AppointmentSettings = {
  workingHours: Record<WorkingHourDayKey, WorkingDayHours>;
  weeklyHolidayDays: WorkingHourDayKey[];
};

export const DEFAULT_APPOINTMENT_SETTINGS: AppointmentSettings = {
  workingHours: {
    monday: { enabled: true, start: "09:00", end: "21:00" },
    tuesday: { enabled: true, start: "09:00", end: "21:00" },
    wednesday: { enabled: true, start: "09:00", end: "21:00" },
    thursday: { enabled: true, start: "09:00", end: "21:00" },
    friday: { enabled: true, start: "09:00", end: "21:00" },
    saturday: { enabled: true, start: "09:00", end: "21:00" },
    sunday: { enabled: true, start: "09:00", end: "21:00" },
  },
  weeklyHolidayDays: [],
};

function getStorageKey(branchId: string) {
  return `owner_appointment_settings_${branchId || "default"}`;
}

function cloneDefaultSettings(): AppointmentSettings {
  return {
    workingHours: Object.fromEntries(
      WORKING_HOUR_DAYS.map((day) => [day, { ...DEFAULT_APPOINTMENT_SETTINGS.workingHours[day] }])
    ) as AppointmentSettings["workingHours"],
    weeklyHolidayDays: [...DEFAULT_APPOINTMENT_SETTINGS.weeklyHolidayDays],
  };
}

export function readAppointmentSettings(branchId: string): AppointmentSettings {
  if (typeof window === "undefined") return cloneDefaultSettings();

  const saved = window.localStorage.getItem(getStorageKey(branchId));
  if (!saved) return cloneDefaultSettings();

  try {
    const parsed = JSON.parse(saved) as Partial<AppointmentSettings>;
    const next = cloneDefaultSettings();

    for (const day of WORKING_HOUR_DAYS) {
      const savedDay = parsed.workingHours?.[day];
      if (!savedDay) continue;
      next.workingHours[day] = {
        enabled: savedDay.enabled ?? next.workingHours[day].enabled,
        start: savedDay.start || next.workingHours[day].start,
        end: savedDay.end || next.workingHours[day].end,
      };
    }

    next.weeklyHolidayDays = Array.isArray(parsed.weeklyHolidayDays)
      ? parsed.weeklyHolidayDays.filter((day): day is WorkingHourDayKey => WORKING_HOUR_DAYS.includes(day as WorkingHourDayKey))
      : [];

    return next;
  } catch {
    return cloneDefaultSettings();
  }
}

export function saveAppointmentSettings(branchId: string, settings: AppointmentSettings) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(getStorageKey(branchId), JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(APPOINTMENT_SETTINGS_UPDATED_EVENT, { detail: { branchId } }));
}

export function getWorkingDayKey(dateValue: string | Date): WorkingHourDayKey {
  const date = typeof dateValue === "string" ? parse(dateValue, "yyyy-MM-dd", new Date()) : dateValue;
  return format(date, "EEEE").toLowerCase() as WorkingHourDayKey;
}

export function formatWorkingHoursLabel(day: WorkingDayHours) {
  if (!day.enabled) return "Closed";
  return `${formatTimeLabel(day.start)} - ${formatTimeLabel(day.end)}`;
}

export function formatTimeLabel(value: string) {
  try {
    return format(parse(value, "HH:mm", new Date()), "hh:mm a");
  } catch {
    return value;
  }
}

export function to12HourParts(value: string) {
  const [rawHour = "09", rawMinute = "00"] = value.split(":");
  const hour24 = Number(rawHour);
  const minute = rawMinute.padStart(2, "0");
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return {
    hour: String(hour12).padStart(2, "0"),
    minute,
    period,
  };
}

export function from12HourParts(hour: string, minute: string, period: "AM" | "PM") {
  let nextHour = Number(hour) % 12;
  if (period === "PM") nextHour += 12;
  return `${String(nextHour).padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function getAttendanceHolidayDates(
  attendance: MonthlyAttendanceData | null,
  month: number,
  year: number
) {
  if (!attendance || attendance.staff.length === 0) return [];

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
  const dateKeys = new Set<string>();

  for (const staffId of attendance.staff.map((member) => member.id)) {
    const records = attendance.attendance[staffId] || {};
    for (const [dateKey, status] of Object.entries(records)) {
      if (dateKey.startsWith(monthPrefix) && status === "holiday") {
        dateKeys.add(dateKey);
      }
    }
  }

  return [...dateKeys].filter((dateKey) =>
    attendance.staff.every((member) => attendance.attendance[member.id]?.[dateKey] === "holiday")
  ).sort();
}

export function getHolidayDateSet(
  holidays: Holiday[],
  attendanceHolidayDates: string[],
  year: number,
  month: number,
  weeklyHolidayDays: WorkingHourDayKey[] = []
) {
  const holidaySet = new Set(attendanceHolidayDates);
  for (const holiday of holidays) {
    holidaySet.add(holiday.holiday_date.slice(0, 10));
  }

  if (weeklyHolidayDays.length > 0) {
    const totalDays = new Date(year, month, 0).getDate();
    for (let day = 1; day <= totalDays; day += 1) {
      const dateValue = new Date(year, month - 1, day);
      const dayKey = getWorkingDayKey(dateValue);
      if (weeklyHolidayDays.includes(dayKey)) {
        holidaySet.add(format(dateValue, "yyyy-MM-dd"));
      }
    }
  }

  return holidaySet;
}
