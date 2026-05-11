import { formatDistanceToNow } from "date-fns";
import { 
  TrendingUp, 
  Users, 
  Layers, 
  User, 
  MapPin, 
  Box, 
  CheckCheck,
  ChevronRight
} from "lucide-react";
import { type SalonNotification, markNotificationAsRead, markAllNotificationsAsRead } from "../../core/api";
import { useDashboardTheme } from "../theme/ThemeProvider";
import { useNavigate } from "react-router-dom";

interface NotificationFeedProps {
  notifications: SalonNotification[];
  onRefresh: () => void;
  onClose: () => void;
}

export function NotificationFeed({ notifications, onRefresh, onClose }: NotificationFeedProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "REVENUE":
        return { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
      case "STAFF":
        return { icon: Users, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" };
      case "SERVICE":
        return { icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
      case "CUSTOMER":
        return { icon: User, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" };
      case "BRANCH":
        return { icon: MapPin, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" };
      case "INVENTORY":
        return { icon: Box, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" };
      default:
        return { icon: Layers, color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20" };
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (item: SalonNotification) => {
    handleMarkAsRead(item.id);
    onClose();
    
    // Smart navigation based on type
    if (item.type === "TOP_BRANCH" || item.type === "BRANCH_REVENUE_UPDATE") {
      navigate("/dashboard/reports/sales");
    } else if (item.type === "TOP_PERFORMER") {
      navigate("/dashboard/reports/staff");
    } else if (item.type === "MOST_REQUESTED_SERVICE") {
      navigate("/dashboard/reports/services");
    } else if (item.type === "LOW_STOCK_WARNING" || item.type === "LOW_STOCK_SUMMARY") {
      navigate("/dashboard/inventory");
    } else {
      navigate("/dashboard/reports");
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`flex flex-col h-[500px] max-h-[80vh] w-full overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h3 className={`text-[1.1rem] font-bold tracking-tight ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
            Business Intelligence
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
            Live Salon activity feed
          </p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all ${
              isDark ? "bg-[rgba(201,169,110,0.1)] text-[#C9A96E] hover:bg-[rgba(201,169,110,0.15)]" : "bg-[#F8E8DA] text-[#8B5E3C] hover:bg-[#F0DBC8]"
            }`}
          >
            <CheckCheck size={14} />
            MARK ALL READ
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-2.5">
        {notifications.filter(n => !n.isRead).length > 0 ? (
          notifications.filter(n => !n.isRead).map((item) => {
            const styles = getCategoryStyles(item.category);
            const Icon = styles.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group relative w-full flex gap-3.5 p-4 rounded-[20px] text-left transition-all border ${
                  item.isRead 
                    ? (isDark ? "bg-[rgba(255,255,255,0.02)] border-transparent opacity-70" : "bg-gray-50/50 border-transparent opacity-70")
                    : (isDark ? "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] shadow-lg" : "bg-white border-[#E9E1D8] shadow-sm")
                } hover:border-[rgba(201,169,110,0.3)] hover:scale-[1.01]`}
              >
                {/* Category Icon */}
                <div className={`shrink-0 grid place-items-center h-10 w-10 rounded-[14px] ${styles.bg} ${styles.color}`}>
                  <Icon size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-[0.92rem] font-bold leading-tight ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
                      {item.title}
                    </h4>
                    {!item.isRead && (
                      <span className={`h-2 w-2 mt-1.5 rounded-full shrink-0 ${isDark ? "bg-[#C9A96E]" : "bg-[#8B5E3C]"}`} />
                    )}
                  </div>
                  <p className={`mt-1.5 text-xs leading-relaxed line-clamp-2 ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>
                    {item.message}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-[rgba(255,255,255,0.3)]" : "text-gray-400"}`}>
                      {(() => {
                        try {
                          const date = new Date(item.createdAt);
                          if (isNaN(date.getTime())) return "just now";
                          return formatDistanceToNow(date, { addSuffix: true });
                        } catch (e) {
                          return "just now";
                        }
                      })()}
                    </span>
                    <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-10">
            <div className={`h-16 w-16 rounded-full grid place-items-center mb-4 ${isDark ? "bg-[rgba(255,255,255,0.03)]" : "bg-gray-50"}`}>
              <Layers size={24} className={isDark ? "text-[#2A2D3A]" : "text-gray-200"} />
            </div>
            <h5 className={`text-[1rem] font-bold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
              No activity yet
            </h5>
            <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>
              No new business insights for this period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
