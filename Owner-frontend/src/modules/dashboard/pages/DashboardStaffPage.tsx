import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  createStaffMember,
  deleteStaffMember,
  fetchStaff,
  type StaffInput,
  type StaffMember,
  updateStaffMember,
} from "../../../core/api";

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };

type FormState = {
  name: string; role: string; phoneNumber: string;
  state: string; city: string; addressLine: string;
  bankName: string; accountNumber: string; ifscCode: string;
  idType: string; idNumber: string;
  joiningDate: string; notes: string; locationId: string;
};

const EMPTY: FormState = {
  name: "", role: "", phoneNumber: "",
  state: "", city: "", addressLine: "",
  bankName: "", accountNumber: "", ifscCode: "",
  idType: "", idNumber: "",
  joiningDate: "", notes: "", locationId: "",
};

const ROLE_OPTIONS = ["Hair Stylist", "Colorist", "Nail Technician", "Therapist", "Receptionist", "Trainee", "Manager", "Other"];
const ID_TYPES = ["Aadhaar", "PAN", "Voter ID", "Passport", "Driving Licence"];

export function DashboardStaffPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const isManager = user?.role === "MANAGER";
  const locationOptions = ownerLocations || [];
  const defaultLocationId = useMemo(() => {
    if (isManager) return user?.branchId || "";
    return locationOptions[0]?.id || "";
  }, [isManager, user?.branchId, locationOptions]);

  const [selectedLocation, setSelectedLocation] = useState(isManager ? defaultLocationId : "all");

  useEffect(() => {
    if (isManager && defaultLocationId) setSelectedLocation(defaultLocationId);
  }, [isManager, defaultLocationId]);

  const loadStaff = (locId = selectedLocation) => {
    setIsLoading(true);
    const apiLoc = isManager ? defaultLocationId : locId === "all" ? undefined : locId;
    fetchStaff(apiLoc)
      .then((r) => { setStaff(r.staff || []); setError(null); })
      .catch((e: Error) => setError(e.message || "Failed to load staff."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isManager && !defaultLocationId) return;
    if (!isManager && selectedLocation === "" && locationOptions.length) { setSelectedLocation("all"); return; }
    loadStaff();
  }, [selectedLocation, defaultLocationId, isManager, locationOptions.length]);

  const filtered = staff.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.phoneNumber.includes(q);
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY, locationId: isManager ? defaultLocationId : selectedLocation !== "all" ? selectedLocation : defaultLocationId });
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name, role: member.role, phoneNumber: member.phoneNumber,
      state: member.state, city: member.city, addressLine: member.addressLine,
      bankName: member.bankName, accountNumber: member.accountNumber, ifscCode: member.ifscCode,
      idType: member.idType, idNumber: member.idNumber,
      joiningDate: member.joiningDate?.split("T")[0] || "", notes: member.notes,
      locationId: member.locationId,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => { if (isSubmitting) return; setIsModalOpen(false); setEditingId(null); setForm(EMPTY); setError(null); };

  const f = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((c) => ({ ...c, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const payload: StaffInput = {
      name: form.name, role: form.role, phoneNumber: form.phoneNumber,
      state: form.state, city: form.city, addressLine: form.addressLine,
      bankName: form.bankName, accountNumber: form.accountNumber, ifscCode: form.ifscCode,
      idType: form.idType, idNumber: form.idNumber,
      joiningDate: form.joiningDate || null, notes: form.notes,
      locationId: isManager ? defaultLocationId : form.locationId,
    };
    try {
      if (editingId) { await updateStaffMember(editingId, payload); }
      else { await createStaffMember(payload); }
      closeModal(); loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (member: StaffMember) => {
    if (!window.confirm(`Delete ${member.name}?`)) return;
    try { await deleteStaffMember(member.id); loadStaff(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete."); }
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit']">Staff Management</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage your team across all locations.</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {!isManager && (
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#744230]">
              <option value="all">All Locations</option>
              {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.city || l.name}</option>)}
            </select>
          )}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, role…"
            className="rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-2.5 text-sm outline-none focus:border-[#744230] w-52" />
          <button onClick={openCreate} type="button"
            className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5">
            + Add Staff
          </button>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)] bg-gray-50/50">
                {["Name", "Role", "Phone", "Location", "Joining Date", "Actions"].map((h) => (
                  <th key={h} className={`p-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-8 text-center text-[var(--muted)]">Loading staff…</td></tr>
              )}
              {!isLoading && filtered.map((m) => (
                <tr key={m.id} className="border-b border-[var(--line)] last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/dashboard/staff/${m.id}`)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] flex items-center justify-center text-white text-sm font-bold">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-900">{m.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{m.role}</td>
                  <td className="p-4 text-sm text-gray-600">{m.phoneNumber}</td>
                  <td className="p-4 text-sm text-[var(--muted)]">{m.locationName?.split("-")[0].trim()}</td>
                  <td className="p-4 text-sm text-[var(--muted)]">{m.joiningDate ? new Date(m.joiningDate).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(m)} type="button"
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200">Edit</button>
                      <button onClick={() => handleDelete(m)} type="button"
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-[var(--muted)]">No staff found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3 p-4">
          {isLoading && <div className="text-center py-8 text-[var(--muted)]">Loading…</div>}
          {!isLoading && filtered.map((m) => (
            <div key={m.id} className="rounded-xl border border-[var(--line)] p-4 shadow-sm"
              onClick={() => navigate(`/dashboard/staff/${m.id}`)}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900">{m.name}</p>
                  <p className="text-sm text-[var(--muted)]">{m.role}</p>
                  <p className="text-sm text-gray-500">{m.phoneNumber}</p>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(m)} type="button" className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">Edit</button>
                  <button onClick={() => handleDelete(m)} type="button" className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && filtered.length === 0 && <div className="text-center py-8 text-[var(--muted)]">No staff found.</div>}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-gray-50/50 px-6 py-5">
              <h2 className="text-xl font-bold font-['Outfit']">{editingId ? "Edit Staff Member" : "Add Staff Member"}</h2>
              <button type="button" onClick={closeModal} className="p-2 text-xl leading-none text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto p-6 flex flex-col gap-6">

                {/* Basic Info */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Basic Info</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {!isManager && !editingId && (
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-bold text-gray-700">Location</label>
                        <select required name="locationId" value={form.locationId} onChange={f}
                          className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]">
                          <option value="" disabled>Select location</option>
                          {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.city || l.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Full Name</label>
                      <input required name="name" value={form.name} onChange={f} placeholder="Priya Sharma"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Role</label>
                      <select required name="role" value={form.role} onChange={f}
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]">
                        <option value="" disabled>Select role</option>
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Phone Number</label>
                      <input required name="phoneNumber" value={form.phoneNumber} onChange={f} placeholder="9876543210"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Joining Date</label>
                      <input type="date" name="joiningDate" value={form.joiningDate} onChange={f}
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                  </div>
                </section>

                {/* Address */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Address</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">State</label>
                      <input name="state" value={form.state} onChange={f} placeholder="Tamil Nadu"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">City</label>
                      <input name="city" value={form.city} onChange={f} placeholder="Chennai"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Address Line</label>
                      <input name="addressLine" value={form.addressLine} onChange={f} placeholder="12, Anna Nagar, Street 3"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                  </div>
                </section>

                {/* Bank Details */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Bank Details</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Bank Name</label>
                      <input name="bankName" value={form.bankName} onChange={f} placeholder="State Bank of India"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">IFSC Code</label>
                      <input name="ifscCode" value={form.ifscCode} onChange={f} placeholder="SBIN0001234"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Account Number</label>
                      <input name="accountNumber" value={form.accountNumber} onChange={f} placeholder="Account number"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                  </div>
                </section>

                {/* ID Proof */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">ID Proof</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">ID Type</label>
                      <select name="idType" value={form.idType} onChange={f}
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]">
                        <option value="">Select type</option>
                        {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">ID Number</label>
                      <input name="idNumber" value={form.idNumber} onChange={f} placeholder="XXXX XXXX XXXX"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                  </div>
                </section>

                {/* Notes */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Notes</h3>
                  <textarea name="notes" value={form.notes} onChange={f} rows={3}
                    placeholder="Any additional notes about this staff member…"
                    className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                </section>

                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              </div>

              <div className="border-t border-[var(--line)] p-5 bg-gray-50/50 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60">
                  {isSubmitting ? "Saving…" : editingId ? "Save Changes" : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
