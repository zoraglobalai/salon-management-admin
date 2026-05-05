import { FileText, Table } from "lucide-react";
import { CustomModal } from "../../../shared/components/CustomModal";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (type: "excel" | "pdf") => void;
  title: string;
}

export function ExportModal({ isOpen, onClose, onExport, title }: ExportModalProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title="Export Report" maxWidth="max-w-sm">
      <div className="space-y-5 py-2">
        <div className={`rounded-2xl p-4 ${isDark ? "bg-[#1C2030]/50" : "bg-[#FAF7F3]"}`}>
          <p className={`text-sm leading-relaxed ${isDark ? "text-[#C8BFB4]" : "text-[#4B5563]"}`}>
            Choose a format to export the <span className="font-semibold">{title}</span>. All current filters will be applied.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              onExport("excel");
              onClose();
            }}
            className={`group flex flex-col items-center gap-3 rounded-[24px] border p-6 transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDark 
                ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] hover:border-[#10B981]/50 hover:bg-[#1C2030]/80" 
                : "bg-white border-[#E8E1D8] hover:border-[#10B981]/30 hover:bg-[#F0FDF4] shadow-sm"
            }`}
          >
            <div className={`grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:scale-110 ${
              isDark ? "bg-[#064E3B] text-[#10B981]" : "bg-[#DCFCE7] text-[#059669]"
            }`}>
              <Table size={28} />
            </div>
            <div className="text-center">
              <span className={`block text-[15px] font-bold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Excel</span>
              <span className={`text-[11px] font-medium uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-[#9A8D80]"}`}>.xlsx format</span>
            </div>
          </button>

          <button
            onClick={() => {
              onExport("pdf");
              onClose();
            }}
            className={`group flex flex-col items-center gap-3 rounded-[24px] border p-6 transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDark 
                ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] hover:border-[#F43F5E]/50 hover:bg-[#1C2030]/80" 
                : "bg-white border-[#E8E1D8] hover:border-[#F43F5E]/20 hover:bg-[#FFF1F2] shadow-sm"
            }`}
          >
            <div className={`grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:scale-110 ${
              isDark ? "bg-[#451225] text-[#FB7185]" : "bg-[#FFE4E6] text-[#E11D48]"
            }`}>
              <FileText size={28} />
            </div>
            <div className="text-center">
              <span className={`block text-[15px] font-bold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>PDF</span>
              <span className={`text-[11px] font-medium uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-[#9A8D80]"}`}>.pdf format</span>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
            isDark ? "text-[#7A7572] hover:bg-white/5" : "text-[#6B7280] hover:bg-[#F3F4F6]"
          }`}
        >
          Cancel
        </button>
      </div>
    </CustomModal>
  );
}
