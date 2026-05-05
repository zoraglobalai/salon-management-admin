import { useState } from "react";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { X, User, Mail, Lock, MapPin, ShieldCheck, Zap } from "lucide-react";

type AssignManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (manager: { name: string; email: string; password: string; branchId: string }) => Promise<void> | void;
  ownerLocations?: { id: string; name: string; city?: string }[];
  assignedBranchIds?: string[];
};

export function AssignManagerModal({
  isOpen,
  onClose,
  onAssign,
  ownerLocations,
  assignedBranchIds = [],
}: AssignManagerModalProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    branchId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const branches = (ownerLocations || []).filter((branch) => !assignedBranchIds.includes(branch.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAssign({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        branchId: formData.branchId,
      });
      setFormData({ name: "", email: "", password: "", branchId: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[rgba(15,17,21,0.8)] backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className={`relative w-full max-w-md rounded-[32px] border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        {/* Header */}
        <div className={`px-8 py-6 border-b flex justify-between items-center transition-all ${
          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#F2EDE7]"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"}`}>
              <ShieldCheck size={18} />
            </div>
            <h2 className={`text-xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Onboard Manager</h2>
          </div>
          <button 
            onClick={onClose} 
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
              isDark ? "text-[#4A4744] hover:text-[#F0EBE3] hover:bg-[rgba(255,255,255,0.05)]" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
          {/* Full Name */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Legal Identity</label>
            <div className="relative">
              <User size={16} className={`absolute left-4 top-3.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
              <input
                required
                type="text"
                placeholder="Full Name…"
                className={`w-full pl-11 pr-4 py-3 rounded-2xl border outline-none transition-all text-sm font-bold ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] placeholder:text-[#4A4744]" : "bg-gray-50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                }`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Primary Mail</label>
            <div className="relative">
              <Mail size={16} className={`absolute left-4 top-3.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
              <input
                required
                type="email"
                placeholder="manager@example.com"
                className={`w-full pl-11 pr-4 py-3 rounded-2xl border outline-none transition-all text-sm font-bold ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] placeholder:text-[#4A4744]" : "bg-gray-50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                }`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Initial Secret</label>
            <div className="relative">
              <Lock size={16} className={`absolute left-4 top-3.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
              <input
                required
                type="password"
                placeholder="Secure Cipher (8+ Char)"
                className={`w-full pl-11 pr-4 py-3 rounded-2xl border outline-none transition-all text-sm font-bold ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] placeholder:text-[#4A4744]" : "bg-gray-50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                }`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <p className={`text-[9px] font-bold tracking-wider leading-relaxed ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>
              User will be mandated to refresh credentials on inaugural session.
            </p>
          </div>

          {/* Branch Selection */}
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Jurisdiction</label>
            <div className="relative">
              <MapPin size={16} className={`absolute left-4 top-3.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
              <select
                required
                className={`w-full appearance-none pl-11 pr-4 py-3 rounded-2xl border outline-none transition-all text-sm font-bold ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                } disabled:opacity-50`}
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                disabled={branches.length === 0 || isSubmitting}
              >
                <option value="" disabled>
                  {branches.length === 0 ? "Quota Finalized" : "Select Terminal Point"}
                </option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.city || b.name}</option>
                ))}
              </select>
            </div>
            {branches.length === 0 && (
              <p className={`text-[9px] font-bold tracking-wider text-red-400`}>
                All active branches currently have authorized supervision.
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className={`mt-4 pt-8 border-t flex flex-col md:flex-row gap-4 ${isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2EDE7]"}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                isDark ? "bg-[rgba(255,255,255,0.03)] text-[#7A7572] border border-[rgba(255,255,255,0.06)] hover:text-[#F0EBE3]" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              Abort
            </button>
            <button
              type="submit"
              disabled={isSubmitting || branches.length === 0}
              className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                isDark 
                ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115] shadow-[#C9A96E]/20" 
                : "bg-gray-900 text-white shadow-gray-900/10 hover:-translate-y-1"
              } disabled:opacity-40 disabled:pointer-events-none`}
            >
              {isSubmitting ? "Syncing Directory…" : <><Zap size={14} /> Finalize Access</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
