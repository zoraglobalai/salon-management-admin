import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { AssignManagerModal } from "../components/AssignManagerModal";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { createOwnerManager, deleteOwnerManager, fetchOwnerManagers, resetOwnerManagerPassword, type OwnerManager } from "../../../core/api";
import { UserPlus, Shield, Mail, Phone, MapPin, Trash2, Key, Users } from "lucide-react";

export function ManagerList() {
  const { theme } = useDashboardTheme();
  const { toast, confirm, prompt } = useNotifications();
  const isDark = theme === "dark";
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { ownerLocations, refreshProfile } = useOutletContext<{ ownerLocations?: { id: string; name: string; city?: string }[], refreshProfile?: () => void }>() || {};
  const [managers, setManagers] = useState<OwnerManager[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxManagers = ownerLocations ? ownerLocations.length : (user?.numberOfBranches || 1);
  const canAssignMore = managers.length < maxManagers;
  const assignedBranchIds = managers.map((manager) => manager.branchId).filter(Boolean) as string[];

  useEffect(() => {
    let isMounted = true;

    fetchOwnerManagers()
      .then((response) => {
        if (!isMounted) return;
        setManagers(response.data);
        setError(null);
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load managers.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAssignManager = async (newManager: { name: string; email: string; password: string; branchId: string }) => {
    const response = await createOwnerManager(newManager);
    setManagers((current) => [...current, response.data]);
    setError(null);
    setIsModalOpen(false);
    
    updateUser({ hasManager: true });
    
    if (refreshProfile) refreshProfile();
    navigate("/dashboard");
  };

  const handleRemove = async (id: string) => {
    confirm({
      title: "Remove Manager",
      message: "Are you sure you want to remove this manager? This action cannot be undone.",
      onConfirm: async () => {
        await deleteOwnerManager(id);
        
        const updatedManagers = managers.filter((manager) => manager.id !== id);
        setManagers(updatedManagers);
        setError(null);
        
        if (updatedManagers.length === 0) {
          updateUser({ hasManager: false });
        }
        
        if (refreshProfile) refreshProfile();
        toast("Manager removed successfully.");
      }
    });
  };

  const handleResetPassword = (id: string) => {
    prompt({
      title: "Reset Password",
      message: "Enter a new password for this manager (minimum 8 characters):",
      placeholder: "New password",
      onSubmit: async (newPassword) => {
        if (newPassword.length < 8) {
          toast("Password must be at least 8 characters long.", "error");
          return;
        }
        
        try {
          await resetOwnerManagerPassword(id, newPassword);
          toast("Manager password reset successfully.");
        } catch (err: any) {
          toast(err.message || "Failed to reset manager password.", "error");
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Premium Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-[32px] border shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div>
          <h2 className={`text-2xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Personnel Oversight</h2>
          <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
            Manage branch supervisors and access controls
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
          <button
            disabled={!canAssignMore}
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
              canAssignMore 
                ? (isDark ? 'bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115] shadow-[#C9A96E]/20' : 'bg-gray-900 text-white shadow-gray-900/10 hover:-translate-y-0.5') 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50 shadow-none'
            }`}
          >
            <UserPlus size={16} />
            Assign Manager
          </button>
          {!canAssignMore && (
            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#F87171]" : "text-red-500"}`}>
              Quota Finalized ({managers.length}/{maxManagers})
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={`rounded-2xl border p-4 text-sm font-bold flex items-center gap-3 ${
          isDark ? "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)] text-[#F87171]" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <Trash2 size={16} />
          {error}
        </div>
      )}

      <div className={`flex-1 rounded-[32px] border shadow-sm overflow-hidden flex flex-col transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-auto h-full scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b transition-all ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#F2EDE7]"}`}>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Account Lead</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Credentials</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Terminal</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Status</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className={`flex flex-col items-center gap-4 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                      <div className="h-8 w-8 border-4 rounded-full border-t-transparent animate-spin border-current" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Querying personnel data…</span>
                    </div>
                  </td>
                </tr>
              ) : managers.map((manager) => (
                <tr key={manager.id} className={`group transition-all ${isDark ? "hover:bg-[rgba(255,255,255,0.02)]" : "hover:bg-gray-50"}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-[14px] flex items-center justify-center text-lg font-black ${
                        isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"
                      }`}>
                        {manager.name.charAt(0)}
                      </div>
                      <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{manager.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <div className={`flex items-center gap-2 text-xs font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-700"}`}>
                        <Mail size={12} className="opacity-40" />
                        {manager.email}
                      </div>
                      <div className={`flex items-center gap-2 text-[10px] font-black tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>
                        <Phone size={10} className="opacity-40" />
                        {manager.phone || "UNSPECIFIED"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
                        {manager.shopName || "Salon Unit"}
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                        <MapPin size={10} />
                        {manager.location}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      manager.status === 'ACTIVE' 
                        ? (isDark ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.2)]' : 'bg-green-50 text-green-700 border-green-200') 
                        : (isDark ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border-[rgba(245,158,11,0.2)]' : 'bg-yellow-50 text-yellow-700 border-yellow-200')
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${manager.status === 'ACTIVE' ? 'bg-current animate-pulse' : 'bg-current'}`} />
                      {manager.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-3 transition-all">
                      <button 
                        onClick={() => handleResetPassword(manager.id)}
                        title="Reset Credentials"
                        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                          isDark ? "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[#7A7572] hover:border-[#C9A96E] hover:text-[#E8C98A]" : "bg-gray-50 border border-[#F2EDE7] text-gray-400 hover:border-blue-400 hover:text-blue-600"
                        }`}
                      >
                        <Key size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemove(manager.id)}
                        title="Revoke Access"
                        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                          isDark ? "bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.1)] text-[#7A7572] hover:bg-[#F87171] hover:text-white" : "bg-red-50 border border-red-100 text-red-400 hover:bg-red-500 hover:text-white"
                        }`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && managers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-32 text-center">
                    <div className={`inline-flex items-center justify-center h-20 w-20 rounded-[28px] mb-6 shadow-xl transform rotate-6 ${
                      isDark ? "bg-[#1C2030] text-[#7A7572]" : "bg-[#FBF9F6] text-gray-300"
                    }`}>
                      <Users size={40} />
                    </div>
                    <p className={`text-sm font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>No branch leads assigned</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-4 p-4 overflow-y-auto scrollbar-hide">
          {managers.map((manager) => (
            <div key={manager.id} className={`rounded-3xl border p-5 shadow-sm transition-all ${
              isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center text-lg font-black ${
                    isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"
                  }`}>
                    {manager.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{manager.name}</h3>
                    <p className={`text-[10px] font-bold ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>{manager.email}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  manager.status === 'ACTIVE' 
                    ? (isDark ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.2)]' : 'bg-green-50 text-green-700 border-green-200') 
                    : (isDark ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border-[rgba(245,158,11,0.2)]' : 'bg-yellow-50 text-yellow-700 border-yellow-200')
                }`}>
                  {manager.status}
                </span>
              </div>
              <div className={`grid grid-cols-2 gap-4 py-4 border-y ${isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2EDE7]"}`}>
                <div className="space-y-1">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Point</label>
                  <div className={`text-xs font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-700"}`}>{manager.location}</div>
                </div>
                <div className="space-y-1">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Channel</label>
                  <div className={`text-xs font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-700"}`}>{manager.phone || "—"}</div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  onClick={() => handleResetPassword(manager.id)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDark ? "bg-[rgba(255,255,255,0.03)] text-[#C8BFB4] border border-[rgba(255,255,255,0.06)]" : "bg-gray-50 text-gray-700"
                  }`}
                >
                  Reset PW
                </button>
                <button 
                  onClick={() => void handleRemove(manager.id)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171] border border-[rgba(248,113,113,0.1)]" : "bg-red-50 text-red-600"
                  }`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AssignManagerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAssign={handleAssignManager} 
        ownerLocations={ownerLocations}
        assignedBranchIds={assignedBranchIds}
      />
    </div>
  );
}
