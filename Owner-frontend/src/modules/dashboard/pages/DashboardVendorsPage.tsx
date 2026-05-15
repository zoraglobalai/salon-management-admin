import { useEffect, useMemo, useState } from "react";
import { Edit3, MapPin, Plus, Search, Trash2, X } from "lucide-react";
import { createVendor, deleteVendor, fetchVendors, type VendorInput, type VendorRecord, updateVendor } from "../../../core/api";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };

const EMPTY_FORM: VendorInput = {
  vendorName: "",
  category: "",
  phone: "",
  email: "",
  address: "",
  gstNumber: "",
};

const VENDOR_NAME_REGEX = /^[A-Za-z ]+$/;
const GMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;

export function DashboardVendorsPage() {
  const { theme } = useDashboardTheme();
  const { toast, confirm } = useNotifications();
  const { filters, setFilters } = useGlobalFilters();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const { user } = useAuth();
  const isDark = theme === "dark";
  const isManager = user?.role === "MANAGER";
  const managerLocationLabel =
    (ownerLocations || []).find((location) => location.id === (user?.branchId || filters.locationId))?.city ||
    (ownerLocations || []).find((location) => location.id === (user?.branchId || filters.locationId))?.name ||
    "Assigned Branch";

  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorRecord | null>(null);
  const [form, setForm] = useState<VendorInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const loadVendors = () => {
    setIsLoading(true);
    fetchVendors({ search, status: "ALL" })
      .then((response) => {
        setVendors(response.vendors || []);
        setError(null);
      })
      .catch((err: Error) => setError(err.message || "Failed to load vendors."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filteredVendors = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter((vendor) =>
      [vendor.vendorName, vendor.category, vendor.phone, vendor.email, vendor.gstNumber, vendor.address].join(" ").toLowerCase().includes(q),
    );
  }, [vendors, search]);

  const openCreate = () => {
    setEditingVendor(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (vendor: VendorRecord) => {
    setEditingVendor(vendor);
    setForm({
      vendorName: vendor.vendorName,
      category: vendor.category,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      gstNumber: vendor.gstNumber,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingVendor(null);
    setForm(EMPTY_FORM);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedForm: VendorInput = {
      vendorName: (form.vendorName || "").trim(),
      category: (form.category || "").trim(),
      phone: (form.phone || "").replace(/\D/g, "").slice(0, 10),
      email: (form.email || "").trim().toLowerCase(),
      address: (form.address || "").trim(),
      gstNumber: (form.gstNumber || "").trim().toUpperCase(),
    };

    if (!normalizedForm.vendorName) {
      toast("Vendor name is required.", "error");
      return;
    }
    if (normalizedForm.vendorName.length > 40) {
      toast("Vendor name cannot exceed 40 characters.", "error");
      return;
    }
    if (!VENDOR_NAME_REGEX.test(normalizedForm.vendorName)) {
      toast("Vendor name should contain letters only (no numbers).", "error");
      return;
    }

    if ((normalizedForm.category || "").length > 30) {
      toast("Category cannot exceed 30 characters.", "error");
      return;
    }

    if (!normalizedForm.phone || normalizedForm.phone.length !== 10) {
      toast("Phone number must be exactly 10 digits.", "error");
      return;
    }

    if (!normalizedForm.email) {
      toast("Email is required.", "error");
      return;
    }
    if (!GMAIL_REGEX.test(normalizedForm.email)) {
      toast("Email must be a valid @gmail.com address.", "error");
      return;
    }

    if ((normalizedForm.gstNumber || "").length !== 15) {
      toast("GST number must be exactly 15 characters.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVendor) {
        const response = await updateVendor(editingVendor.id, normalizedForm);
        setVendors((current) => current.map((item) => (item.id === editingVendor.id ? response.vendor : item)));
      } else {
        const response = await createVendor(normalizedForm);
        setVendors((current) => [response.vendor, ...current]);
      }
      setError(null);
      closeModal();
      toast(editingVendor ? "Vendor updated." : "Vendor added.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save vendor.";
      setError(message);
      toast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = (vendor: VendorRecord) => {
    confirm({
      title: "Delete Vendor",
      message: `Delete ${vendor.vendorName}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteVendor(vendor.id);
          setVendors((current) => current.filter((item) => item.id !== vendor.id));
          toast("Vendor deleted.");
        } catch (err) {
          toast(err instanceof Error ? err.message : "Failed to delete vendor.", "error");
        }
      },
    });
  };

  return (
    <div className="flex min-h-0 flex-col gap-5 h-full">
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between transition-all ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
        <div>
          <h2 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Vendor Management</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isManager ? (
            <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-700"
            }`}>
              <MapPin size={15} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
              <span>{managerLocationLabel}</span>
            </div>
          ) : (
            <div className="relative">
              <MapPin size={15} className={`absolute left-3 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              <select
                value={filters.locationId}
                onChange={(event) => setFilters({ locationId: event.target.value })}
                className={`appearance-none rounded-xl border pl-9 pr-3 py-2.5 text-sm font-semibold outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-700"}`}
              >
                <option value="all">All Locations</option>
                {(ownerLocations || []).map((location) => (
                  <option key={location.id} value={location.id}>{location.city || location.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="button" onClick={openCreate} className={`flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 ${isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)]" : "bg-[#8B5E3C] hover:bg-[#744A2E]"}`}>
            <Plus size={16} />
            Add Vendor
          </button>
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className={`absolute left-3 top-3 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendor, category, phone, GST..." className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900"}`} />
        </div>
      </div>

      {error && <div className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)] text-[#F87171]" : "border-red-200 bg-red-50 text-red-700"}`}>{error}</div>}

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
        <div className="overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={isDark ? "bg-[#1C2030]" : "bg-gray-50/60"}>
                {["Vendor Name", "Phone", "Email", "GST Number", "Address", "Actions"].map((head) => (
                  <th key={head} className={`p-4 text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className={`p-8 text-center ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading vendors...</td></tr>}
              {!isLoading && filteredVendors.map((vendor) => (
                <tr key={vendor.id} className={`border-t ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
                  <td className={`p-4 font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{vendor.vendorName}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{vendor.phone}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{vendor.email || "-"}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{vendor.gstNumber || "-"}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{vendor.address || "-"}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(vendor)} className={`rounded-lg p-2 ${isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4]" : "bg-gray-100 text-gray-700"}`}><Edit3 size={14} /></button>
                      <button onClick={() => remove(vendor)} className={`rounded-lg p-2 ${isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171]" : "bg-red-50 text-red-600"}`}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredVendors.length === 0 && <tr><td colSpan={6} className={`p-10 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No vendors found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className={`w-full max-w-2xl rounded-[28px] border ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.08)]" : "bg-white border-[#E8E1D8]"}`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
              <h3 className={`text-xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{editingVendor ? "Edit Vendor" : "Add Vendor"}</h3>
              <button onClick={closeModal} className={isDark ? "text-[#7A7572]" : "text-gray-500"}><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Vendor Name</label>
                <input required maxLength={40} value={form.vendorName || ""} onChange={(event) => setForm((s) => ({ ...s, vendorName: event.target.value.replace(/[^A-Za-z ]/g, "").slice(0, 40) }))} placeholder="Enter Vendor Name" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Category</label>
                <input maxLength={30} value={form.category || ""} onChange={(event) => setForm((s) => ({ ...s, category: event.target.value.slice(0, 30) }))} placeholder="Enter Category" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Phone Number</label>
                <input required inputMode="numeric" maxLength={10} value={form.phone || ""} onChange={(event) => setForm((s) => ({ ...s, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="Enter Phone Number" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Email</label>
                <input required type="email" value={form.email || ""} onChange={(event) => setForm((s) => ({ ...s, email: event.target.value.trim() }))} placeholder="Enter Email Addresss" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>GST Number</label>
                <input maxLength={15} value={form.gstNumber || ""} onChange={(event) => setForm((s) => ({ ...s, gstNumber: event.target.value.toUpperCase().slice(0, 15) }))} placeholder="Enter GST Number" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div className="md:col-span-2">
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Address</label>
                <input value={form.address || ""} onChange={(event) => setForm((s) => ({ ...s, address: event.target.value }))} placeholder="Enter Address" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className={`rounded-full px-5 py-2 text-sm font-semibold ${isDark ? "bg-[rgba(255,255,255,0.08)] text-[#C8BFB4]" : "bg-gray-100 text-gray-700"}`}>Cancel</button>
                <button disabled={isSubmitting} type="submit" className={`rounded-full px-5 py-2 text-sm font-semibold text-white ${isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)]" : "bg-[#8B5E3C]"}`}>{isSubmitting ? "Saving..." : editingVendor ? "Update Vendor" : "Add Vendor"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
