import { useState } from "react";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col md:h-auto h-full max-h-[90vh]">
        <div className="px-6 py-5 border-b border-[var(--line)] flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold font-['Outfit']">Assign Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">Full Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Rahul Sharma"
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-gray-50/50 outline-none focus:border-[#744230] transition-colors"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">Email Address</label>
            <input
              required
              type="email"
              placeholder="manager@example.com"
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-gray-50/50 outline-none focus:border-[#744230] transition-colors"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">Temporary Password</label>
            <input
              required
              type="password"
              placeholder="Min. 8 characters"
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-gray-50/50 outline-none focus:border-[#744230] transition-colors"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <span className="text-xs text-[var(--muted)]">They will be prompted to change this upon first login.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-gray-700">Assign Location</label>
            <select
              required
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-gray-50/50 outline-none focus:border-[#744230] transition-colors cursor-pointer"
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              disabled={branches.length === 0 || isSubmitting}
            >
              <option value="" disabled>
                {branches.length === 0 ? "All branches already have managers" : "Select a location"}
              </option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.city || b.name}</option>
              ))}
            </select>
            {branches.length === 0 && (
              <span className="text-xs text-[var(--muted)]">No unassigned branch is available right now.</span>
            )}
          </div>

          <div className="mt-4 pt-5 border-t border-[var(--line)] flex justify-end gap-3 pb-2 md:pb-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors w-full md:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || branches.length === 0}
              className="px-5 py-2.5 rounded-full font-semibold text-white bg-gradient-to-br from-[#744230] to-[#4e271b] hover:-translate-y-0.5 transition-transform shadow-md w-full md:w-auto"
            >
              {isSubmitting ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
