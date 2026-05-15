import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { X } from "lucide-react";
import { fetchStaffCalendar, type AttendanceStatus, type StaffCalendarData } from "../../../core/api";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";

interface Props {
  staffId: string;
  staffName: string;
  onClose: () => void;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "#10B981", // Green
  half_day: "#FBBF24", // Yellow
  paid_leave: "#3B82F6", // Blue
  lop: "#EF4444", // Red
  week_off: "#9CA3AF", // Gray
  holiday: "#8B5CF6", // Purple
};

export const StaffAttendanceCalendar: React.FC<Props> = ({ staffId, staffName, onClose }) => {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<StaffCalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStaffCalendar(staffId)
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [staffId]);

  const events = data?.events.map((e) => ({
    title: e.status.replace("_", " ").toUpperCase(),
    date: e.date,
    backgroundColor: STATUS_COLORS[e.status],
    borderColor: STATUS_COLORS[e.status],
    allDay: true,
  })) || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[32px] border shadow-2xl transition-all ${
        isDark ? "bg-[#0F1115] border-[rgba(255,255,255,0.1)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.05)]">
          <div>
            <h2 className={`text-xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
              {staffName}'s Attendance
            </h2>
            {/* <p className={`text-xs font-medium ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
              View and manage monthly attendance history
            </p> */}
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-all ${
            isDark ? "hover:bg-white/5 text-[#7A7572]" : "hover:bg-gray-100 text-gray-400"
          }`}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A96E]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <div className={`attendance-calendar ${isDark ? "dark-theme" : ""}`}>
                  <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    events={events}
                    headerToolbar={{
                      left: "prev next",
                      center: "title",
                      right: "",
                    }}
                    height="auto"
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                <div className={`p-5 rounded-3xl border ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.05)]" : "bg-[#FCFAF7] border-[#E8E1D8]"}`}>
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
                    Summary
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(STATUS_COLORS).map(([status, color]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className={`text-xs font-bold capitalize ${isDark ? "text-[#F0EBE3]" : "text-gray-700"}`}>
                            {status.replace("_", " ")}
                          </span>
                        </div>
                        <span className={`text-xs font-black ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
                          {data?.summary[status] || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .attendance-calendar .fc {
          --fc-border-color: ${isDark ? "rgba(255,255,255,0.05)" : "#F2EDE7"};
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: ${isDark ? "rgba(255,255,255,0.02)" : "#FCFAF7"};
          --fc-list-event-hover-bg-color: ${isDark ? "rgba(255,255,255,0.05)" : "#F9F7F4"};
        }
        .attendance-calendar .fc-theme-standard td, .attendance-calendar .fc-theme-standard th {
          border: 1px solid var(--fc-border-color);
        }
        .attendance-calendar .fc-col-header-cell {
          padding: 12px 0;
          background: ${isDark ? "rgba(255,255,255,0.02)" : "#F9F7F4"};
        }
        .attendance-calendar .fc-col-header-cell-cushion {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: ${isDark ? "#7A7572" : "#9CA3AF"};
          text-decoration: none !important;
        }
        .attendance-calendar .fc-daygrid-day-number {
          font-size: 11px;
          font-weight: 700;
          color: ${isDark ? "#F0EBE3" : "#4B5563"};
          padding: 8px !important;
          text-decoration: none !important;
        }
        .attendance-calendar .fc-toolbar-title {
          font-size: 16px !important;
          font-weight: 900 !important;
          font-family: 'Outfit', sans-serif !important;
          color: ${isDark ? "#F0EBE3" : "#111827"} !important;
        }
        .attendance-calendar .fc-button {
          background: ${isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"} !important;
          border: none !important;
          color: ${isDark ? "#F0EBE3" : "#374151"} !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          padding: 8px 16px !important;
          border-radius: 12px !important;
          transition: all 0.2s ease !important;
        }
        .attendance-calendar .fc-button-prev {
          margin-right: 8px !important;
        }
        .attendance-calendar .fc-button:hover {
          background: ${isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"} !important;
          transform: translateY(-1px);
        }
        .attendance-calendar .fc-button:active {
          transform: translateY(0px);
        }
        .attendance-calendar .fc-event {
          border-radius: 6px !important;
          padding: 2px 4px !important;
          font-size: 9px !important;
          font-weight: 800 !important;
          border: none !important;
        }
        .attendance-calendar .fc-day-today {
          background: ${isDark ? "rgba(201,169,110,0.05)" : "rgba(139,94,60,0.05)"} !important;
        }
      `}</style>
    </div>
  );
};
