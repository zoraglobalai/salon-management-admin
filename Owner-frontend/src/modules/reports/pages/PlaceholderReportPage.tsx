import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function PlaceholderReportPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          to="/dashboard/reports" 
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E1D8] bg-white text-[#4B5563] transition hover:bg-[#FAF7F3] hover:text-[#111827]"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">{title}</h1>
          <p className="text-sm text-[#6B7280]">This report is currently under construction.</p>
        </div>
      </div>
      
      <div className="flex h-64 items-center justify-center rounded-[20px] border border-dashed border-[#D7B496] bg-[#FAF7F3]">
        <p className="text-lg font-medium text-[#8B5E3C]">Coming Soon</p>
      </div>
    </div>
  );
}
