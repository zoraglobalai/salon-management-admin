import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { AssignManagerModal } from "../components/AssignManagerModal";
import { useAuth } from "../../auth/hooks/useAuth";
import { createOwnerManager, deleteOwnerManager, fetchOwnerManagers, resetOwnerManagerPassword, type OwnerManager } from "../../../core/api";

export function ManagerList() {
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
    
    // Update user state to reflect hasManager flag
    updateUser({ hasManager: true });
    
    if (refreshProfile) refreshProfile();
    navigate("/dashboard");
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this manager?")) return;
    await deleteOwnerManager(id);
    
    const updatedManagers = managers.filter((manager) => manager.id !== id);
    setManagers(updatedManagers);
    setError(null);
    
    // Update user state: set hasManager=false if no managers left
    if (updatedManagers.length === 0) {
      updateUser({ hasManager: false });
    }
    
    if (refreshProfile) refreshProfile();
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = window.prompt("Enter a new password for this manager (minimum 8 characters):");
    if (!newPassword) return;
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }
    
    try {
      await resetOwnerManagerPassword(id, newPassword);
      alert("Manager password reset successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to reset manager password.");
    }
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit']">Manager Management</h2>
          <p className="text-sm text-[var(--muted)] mt-1">Assign and manage location managers across your business.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            disabled={!canAssignMore}
            onClick={() => setIsModalOpen(true)}
            className={`px-5 py-2.5 rounded-full font-semibold shadow-md transition-transform ${
              canAssignMore 
                ? 'bg-gradient-to-br from-[#744230] to-[#4e271b] text-white hover:-translate-y-0.5' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            + Assign Manager
          </button>
          {!canAssignMore && (
            <span className="text-xs text-red-500 font-medium">Limit reached ({managers.length}/{maxManagers})</span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm flex-1 overflow-hidden flex flex-col">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)] bg-gray-50/50">
                <th className="p-4 font-semibold text-sm text-[var(--muted)] uppercase tracking-wider">Name</th>
                <th className="p-4 font-semibold text-sm text-[var(--muted)] uppercase tracking-wider">Email</th>
                <th className="p-4 font-semibold text-sm text-[var(--muted)] uppercase tracking-wider">Phone</th>
                <th className="p-4 font-semibold text-sm text-[var(--muted)] uppercase tracking-wider">Shop</th>
                <th className="p-4 font-semibold text-sm text-[var(--muted)] uppercase tracking-wider">Location</th>
                <th className="p-4 font-semibold text-sm text-[var(--muted)] uppercase tracking-wider">Status</th>
                <th className="p-4 font-semibold text-sm text-[var(--muted)] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--muted)]">
                    Loading managers...
                  </td>
                </tr>
              )}
              {managers.map((manager) => (
                <tr key={manager.id} className="border-b border-[var(--line)] last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-semibold">{manager.name}</td>
                  <td className="p-4 text-[var(--muted)] text-sm">{manager.email}</td>
                  <td className="p-4 text-[var(--muted)] text-sm">{manager.phone || "—"}</td>
                  <td className="p-4 text-[var(--muted)] text-sm">{manager.shopName || "—"}</td>
                  <td className="p-4">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                      {manager.location}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      manager.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {manager.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleResetPassword(manager.id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm px-3 py-1 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        Reset PW
                      </button>
                      <button 
                        onClick={() => handleRemove(manager.id)}
                        className="text-red-500 hover:text-red-700 font-semibold text-sm px-3 py-1 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && managers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--muted)]">
                    No managers assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-3 p-4 overflow-y-auto">
          {isLoading && (
            <div className="p-8 text-center text-[var(--muted)]">
              Loading managers...
            </div>
          )}
          {managers.map((manager) => (
            <div key={manager.id} className="bg-white border border-[var(--line)] p-4 rounded-xl shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{manager.name}</h3>
                  <p className="text-sm text-[var(--muted)]">{manager.email}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">{manager.phone || "No phone added"}</p>
                  <p className="text-xs text-[var(--muted)]">{manager.shopName || "No shop name added"}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  manager.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {manager.status}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  <span className="text-gray-400">📍</span>
                  {manager.location}
                </div>
                <button 
                  onClick={() => void handleRemove(manager.id)}
                  className="text-red-500 font-semibold text-sm bg-red-50 px-3 py-1.5 rounded-lg"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!isLoading && managers.length === 0 && (
            <div className="p-8 text-center text-[var(--muted)]">
              No managers assigned yet.
            </div>
          )}
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
