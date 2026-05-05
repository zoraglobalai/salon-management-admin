import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useDashboardTheme } from "../theme/ThemeProvider";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-md",
}: CustomModalProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0F1115]/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full ${maxWidth} overflow-hidden rounded-[32px] border shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95 ${
          isDark 
            ? "bg-[#151821] border-[rgba(255,255,255,0.08)]" 
            : "bg-white border-[#E8E1D8]"
        }`}
      >
        <div className="flex items-center justify-between p-6 pb-2">
          <h3 className={`text-xl font-bold tracking-tight ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`rounded-full p-2 transition-all ${
              isDark 
                ? "text-[#7A7572] hover:bg-white/5 hover:text-white" 
                : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 pt-2">
          {children}
        </div>

        {footer && (
          <div className={`flex items-center justify-end gap-3 p-6 pt-2`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
