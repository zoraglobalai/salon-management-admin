import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useDashboardTheme } from "../theme/ThemeProvider";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

export function Toast({ id, message, type, onClose }: ToastProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle2 className="text-[#4ADE80]" size={18} />,
    error: <AlertCircle className="text-[#F87171]" size={18} />,
    info: <Info className="text-[#60A5FA]" size={18} />,
  };

  const bgStyles = {
    success: isDark ? "bg-[rgba(74,222,128,0.1)]" : "bg-[#F0FDF4]",
    error: isDark ? "bg-[rgba(248,113,113,0.1)]" : "bg-[#FEF2F2]",
    info: isDark ? "bg-[rgba(96,165,250,0.1)]" : "bg-[#EFF6FF]",
  };

  return (
    <div
      className={`pointer-events-auto mb-3 flex w-[320px] max-w-full items-start gap-3 rounded-[20px] border p-4 shadow-xl transition-all animate-in slide-in-from-right-full ${
        isDark 
          ? "bg-[#1C2030]/90 border-[rgba(255,255,255,0.08)] backdrop-blur-md" 
          : "bg-white/90 border-[#E8E1D8] backdrop-blur-md"
      }`}
    >
      <div className={`mt-0.5 rounded-full p-1.5 ${bgStyles[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-medium leading-relaxed ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
          {message}
        </p>
      </div>
      <button
        onClick={() => onClose(id)}
        className={`shrink-0 p-1 transition-colors ${
          isDark ? "text-[#7A7572] hover:text-[#F0EBE3]" : "text-[#6B7280] hover:text-[#111827]"
        }`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
