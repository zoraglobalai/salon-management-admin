import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { City, State } from "country-state-city";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  createStaffMember,
  deleteStaffMember,
  fetchStaff,
  type StaffInput,
  type StaffMember,
  updateStaffMember,
} from "../../../core/api";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";
import { Plus, Search, MapPin, ChevronDown, Edit3, Trash2, X, User, Phone, Calendar, Banknote, Map, Shield } from "lucide-react";

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };
type IndiaStateOption = { name: string; isoCode: string };
type IndiaCityOption = { name: string };
type IdentificationFormItem = { idType: string; idNumber: string };

type FormState = {
  name: string; role: string; phoneNumber: string;
  currentState: string; currentCity: string; currentAddressLine: string;
  state: string; city: string; addressLine: string;
  sameAsCurrentAddress: boolean;
  bankName: string; accountNumber: string; ifscCode: string;
  salaryType: string; salaryAmount: string; paymentMethod: string; upiId: string;
  identificationDetails: IdentificationFormItem[];
  joiningDate: string; locationId: string;
};

const EMPTY: FormState = {
  name: "", role: "", phoneNumber: "",
  currentState: "", currentCity: "", currentAddressLine: "",
  state: "", city: "", addressLine: "",
  sameAsCurrentAddress: false,
  bankName: "", accountNumber: "", ifscCode: "",
  salaryType: "Monthly", salaryAmount: "", paymentMethod: "Cash", upiId: "",
  identificationDetails: [{ idType: "", idNumber: "" }],
  joiningDate: "", locationId: "",
};

const ROLE_OPTIONS = ["Hair Stylist", "Colorist", "Nail Technician", "Therapist", "Receptionist", "Trainee", "Other"];
const ID_TYPES = ["Aadhaar", "PAN", "Voter ID", "Passport", "Driving Licence"];

export function DashboardStaffPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();
  const { toast, confirm } = useNotifications();
  const isDark = theme === "dark";
  const { ownerLocations } = useOutletContext<OutletContext>() || {};

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { filters: globalFilters, setFilters } = useGlobalFilters();
  const isManager = user?.role === "MANAGER";
  const locationOptions = ownerLocations || [];
  const indianStates = useMemo<IndiaStateOption[]>(
    () => State.getStatesOfCountry("IN").map((state) => ({ name: state.name, isoCode: state.isoCode })),
    []
  );
  const selectedCurrentState = useMemo(
    () => indianStates.find((state) => state.name === form.currentState) || null,
    [form.currentState, indianStates]
  );
  const selectedPermanentState = useMemo(
    () => indianStates.find((state) => state.name === form.state) || null,
    [form.state, indianStates]
  );
  const defaultLocationId = useMemo(() => {
    if (isManager) return user?.branchId || "";
    return locationOptions[0]?.id || "";
  }, [isManager, user?.branchId, locationOptions]);
  const availableCurrentCities = useMemo<IndiaCityOption[]>(
    () => (selectedCurrentState ? City.getCitiesOfState("IN", selectedCurrentState.isoCode).map((city) => ({ name: city.name })) : []),
    [selectedCurrentState]
  );
  const availablePermanentCities = useMemo<IndiaCityOption[]>(
    () => (selectedPermanentState ? City.getCitiesOfState("IN", selectedPermanentState.isoCode).map((city) => ({ name: city.name })) : []),
    [selectedPermanentState]
  );

  const loadStaff = (locId = globalFilters.locationId) => {
    setIsLoading(true);
    const apiLoc = isManager ? defaultLocationId : locId === "all" ? undefined : locId;
    fetchStaff(apiLoc)
      .then((r) => { setStaff(r.staff || []); setError(null); })
      .catch((e: Error) => setError(e.message || "Failed to load staff."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isManager && !defaultLocationId) return;
    loadStaff();
  }, [globalFilters.locationId, defaultLocationId, isManager, locationOptions.length]);

  const filtered = staff.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.phoneNumber.includes(q);
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY,
      locationId: isManager ? defaultLocationId : globalFilters.locationId !== "all" ? globalFilters.locationId : (locationOptions[0]?.id || ""),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    const identificationDetails =
      member.identificationDetails?.filter((item) => item.idType || item.idNumber).length
        ? member.identificationDetails.filter((item) => item.idType || item.idNumber)
        : member.idType || member.idNumber
          ? [{ idType: member.idType, idNumber: member.idNumber }]
          : [{ idType: "", idNumber: "" }];

    setEditingId(member.id);
    const sameAsCurrentAddress =
      member.currentState === member.state &&
      member.currentCity === member.city &&
      member.currentAddressLine === member.addressLine;

    setForm({
      name: member.name,
      role: member.role,
      phoneNumber: member.phoneNumber,
      currentState: member.currentState,
      currentCity: member.currentCity,
      currentAddressLine: member.currentAddressLine,
      state: member.state,
      city: member.city,
      addressLine: member.addressLine,
      sameAsCurrentAddress,
      bankName: member.payroll?.bankName || member.bankName,
      accountNumber: member.payroll?.accountNumber || member.accountNumber,
      ifscCode: member.payroll?.ifscCode || member.ifscCode,
      salaryType: member.payroll?.salaryType === "weekly" ? "Weekly" : "Monthly",
      salaryAmount: member.payroll?.salaryAmount?.toString() || "",
      paymentMethod: member.payroll?.paymentMethod || "Cash",
      upiId: member.payroll?.upiId || "",
      identificationDetails,
      joiningDate: member.joiningDate?.split("T")[0] || "",
      locationId: member.locationId,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  };

  const f = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => {
      if (e.target.name === "currentState") {
        const nextState = e.target.value;
        return {
          ...current,
          currentState: nextState,
          currentCity: "",
          ...(current.sameAsCurrentAddress ? { state: nextState, city: "" } : {}),
        };
      }

      if (e.target.name === "state") {
        return { ...current, state: e.target.value, city: "" };
      }

      return { ...current, [e.target.name]: e.target.value };
    });

  const updateCurrentAddressLine = (value: string) => {
    setForm((current) => ({
      ...current,
      currentAddressLine: value,
      ...(current.sameAsCurrentAddress ? { addressLine: value } : {}),
    }));
  };

  const updateCurrentCity = (value: string) => {
    setForm((current) => ({
      ...current,
      currentCity: value,
      ...(current.sameAsCurrentAddress ? { city: value } : {}),
    }));
  };

  const toggleSameAsCurrentAddress = (checked: boolean) => {
    setForm((current) => ({
      ...current,
      sameAsCurrentAddress: checked,
      ...(checked
        ? {
            state: current.currentState,
            city: current.currentCity,
            addressLine: current.currentAddressLine,
          }
        : {}),
    }));
  };

  const updateIdentification = (index: number, field: keyof IdentificationFormItem, value: string) => {
    setForm((current) => ({
      ...current,
      identificationDetails: current.identificationDetails.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addIdentification = () => {
    setForm((current) => ({
      ...current,
      identificationDetails: [...current.identificationDetails, { idType: "", idNumber: "" }],
    }));
  };

  const removeIdentification = (index: number) => {
    setForm((current) => ({
      ...current,
      identificationDetails:
        current.identificationDetails.length === 1
          ? [{ idType: "", idNumber: "" }]
          : current.identificationDetails.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const payload: StaffInput = {
      name: form.name,
      role: form.role,
      phoneNumber: form.phoneNumber,
      currentState: form.currentState,
      currentCity: form.currentCity,
      currentAddressLine: form.currentAddressLine,
      state: form.state,
      city: form.city,
      addressLine: form.addressLine,
      bankName: form.bankName,
      accountNumber: form.accountNumber,
      ifscCode: form.ifscCode,
      identificationDetails: form.identificationDetails,
      joiningDate: form.joiningDate || null,
      locationId: isManager ? defaultLocationId : form.locationId,
      payroll: {
        salaryType: form.salaryType.toLowerCase() as "monthly" | "weekly",
        salaryAmount: Number(form.salaryAmount || 0),
        paymentMethod: form.paymentMethod as "Cash" | "Bank Transfer" | "UPI",
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode,
        upiId: form.upiId,
      }
    };
    try {
      if (editingId) await updateStaffMember(editingId, payload);
      else await createStaffMember(payload);
      closeModal();
      loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (member: StaffMember) => {
    confirm({
      title: "Delete Staff Member",
      message: `Are you sure you want to delete ${member.name}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteStaffMember(member.id);
          loadStaff();
          toast("Staff member deleted.");
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to delete.";
          setError(errorMessage);
          toast(errorMessage, "error");
        }
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-col gap-5 h-full">
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div>
          <h2 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Staff Management</h2>
          {/* <p className={`mt-1 text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Manage your team across all locations.</p> */}
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {!isManager && (
            <div className="relative">
              <select value={globalFilters.locationId} onChange={(e) => setFilters({ locationId: e.target.value })}
                className={`appearance-none rounded-xl border px-10 py-2.5 text-sm font-semibold outline-none transition-all ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-700 focus:border-[#8B5E3C] [color-scheme:light]"
                }`}>
                <option value="all">All Locations</option>
                {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.city || l.name}</option>)}
              </select>
              <MapPin size={16} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              <ChevronDown size={16} className={`absolute right-3.5 top-3 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
            </div>
          )}
          <div className="relative">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team..."
              className={`rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none transition-all w-52 ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] placeholder:text-[#4A4744]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
              }`} />
            <Search size={16} className={`absolute left-3.5 top-3 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
          </div>
          <button onClick={openCreate} type="button"
            className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-all ${
              isDark
                ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)]"
                : "bg-[#8B5E3C] hover:bg-[#744A2E]"
            }`}>
            <Plus size={16} />
            Add Staff
          </button>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className={`rounded-2xl border px-4 py-3 text-sm transition-all ${
          isDark ? "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)] text-[#F87171]" : "border-red-200 bg-red-50 text-red-700"
        }`}>{error}</div>
      )}

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className={`border-b transition-all ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#E8E1D8]"
              }`}>
                {["Name", "Role", "Phone", "Location", "Joining Date", "Actions"].map((h) => (
                  <th key={h} className={`p-4 text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"} ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className={`p-8 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading staff profiles...</td></tr>
              )}
              {!isLoading && filtered.map((m) => (
                <tr key={m.id} className={`border-b transition-all last:border-0 cursor-pointer ${
                  isDark ? "border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]" : "border-[#E8E1D8] hover:bg-gray-50"
                }`} onClick={() => navigate(`/dashboard/staff/${m.id}`)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-black shadow-sm transform rotate-3 transition-transform group-hover:rotate-0 ${
                        isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[linear-gradient(135deg,#8B5E3C,#4E2D1B)] text-white"
                      }`}>
                        <span className="-rotate-3">{m.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className={`font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{m.name}</span>
                    </div>
                  </td>
                  <td className={`p-4 text-sm font-medium ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{m.role}</td>
                  <td className={`p-4 text-sm font-medium ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{m.phoneNumber}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{m.locationName?.split("-")[0].trim()}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{m.joiningDate ? new Date(m.joiningDate).toLocaleDateString("en-IN") : "-"}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(m)} type="button"
                        className={`p-2 rounded-lg transition-all ${
                          isDark ? "bg-[rgba(255,255,255,0.04)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.08)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(m)} type="button"
                        className={`p-2 rounded-lg transition-all ${
                          isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171] hover:bg-[rgba(248,113,113,0.2)]" : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className={`p-12 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No staff members matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4 md:hidden">
          {isLoading && <div className={`text-center py-8 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading...</div>}
          {!isLoading && filtered.map((m) => (
            <div key={m.id} className={`rounded-xl border p-4 shadow-sm transition-all ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)]" : "bg-white border-[#E8E1D8]"
            }`} onClick={() => navigate(`/dashboard/staff/${m.id}`)}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-black transform rotate-3 ${
                    isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[#8B5E3C] text-white"
                  }`}>
                    <span className="-rotate-3">{m.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className={`font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{m.name}</p>
                    <p className={`text-xs ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{m.role}</p>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(m)} type="button" className={`p-2 rounded-lg ${isDark ? "bg-[rgba(255,255,255,0.04)] text-[#C8BFB4]" : "bg-gray-100 text-gray-700"}`}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(m)} type="button" className={`p-2 rounded-lg ${isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171]" : "bg-red-50 text-red-600"}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && filtered.length === 0 && <div className={`text-center py-8 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No team members found.</div>}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className={`flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-[32px] border shadow-2xl transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)]" : "bg-white border-[#E8E1D8]"
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-[#E8E1D8]"
            }`}>
              <div>
                <h2 className={`text-xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                  {editingId ? "Update Staff Profile" : "Register New Staff"}
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Complete the details below for team records.</p>
              </div>
              <button type="button" onClick={closeModal} className={`p-2 rounded-full transition-all hover:bg-[rgba(255,255,255,0.05)] ${isDark ? "text-[#7A7572] hover:text-[#C8BFB4]" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto p-6 flex flex-col gap-8 scrollbar-elegant">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <User size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Basic Information</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {!isManager && !editingId && (
                      <div className="md:col-span-2">
                        <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Branch Location</label>
                        <div className="relative">
                          <select required name="locationId" value={form.locationId} onChange={f}
                            className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                            }`}>
                            <option value="" disabled>Select Branch</option>
                            {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.city || l.name}</option>)}
                          </select>
                          <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Full Name</label>
                      <input required name="name" value={form.name}
                        maxLength={35}
                        onKeyDown={(e) => {
                          if (e.key === " " && !form.name) e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^\s+/, "").replace(/[^a-zA-Z\s]/g, "").replace(/\s{2,}/g, " ").slice(0, 35);
                          setForm((c) => ({ ...c, name: val }));
                        }}
                        placeholder="Enter Staff Name"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                        }`} />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Staff Role</label>
                      <div className="relative">
                        <select required name="role" value={form.role} onChange={f}
                          className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                          }`}>
                          <option value="" disabled>Select Role</option>
                          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                      </div>
                    </div>
                    <div className="relative">
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Phone Number</label>
                      <div className="relative">
                        <input required name="phoneNumber" value={form.phoneNumber}
                          maxLength={10}
                          onKeyDown={(e) => {
                            if (e.key === " ") e.preventDefault();
                          }}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setForm((c) => ({ ...c, phoneNumber: val }));
                          }}
                          placeholder="Enter Phn No"
                          className={`w-full rounded-xl border pl-10 pr-4 py-3 text-sm outline-none transition-all ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                          }`} />
                        <Phone size={14} className={`absolute left-3.5 top-3.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
                      </div>
                    </div>
                    <div className="relative">
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Joining Date</label>
                      <div className="relative">
                        <input type="date" name="joiningDate" value={form.joiningDate} onChange={f}
                          className={`w-full rounded-xl border pl-10 pr-4 py-3 text-sm outline-none transition-all ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                          }`} />
                        <Calendar size={14} className={`absolute left-3.5 top-3.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Map size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Current Address</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>State</label>
                      <div className="relative">
                        <select
                          name="currentState"
                          value={form.currentState}
                          onChange={f}
                          className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                          }`}
                        >
                          <option value="">Select State</option>
                          {indianStates.map((state) => (
                            <option key={state.isoCode} value={state.name}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                      </div>
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>City</label>
                      <div className="relative">
                        <select
                          name="currentCity"
                          value={form.currentCity}
                          onChange={(e) => updateCurrentCity(e.target.value)}
                          disabled={!form.currentState}
                          className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                          }`}
                        >
                          <option value="">{form.currentState ? "Select City" : "Select State First"}</option>
                          {availableCurrentCities.map((city) => (
                            <option key={city.name} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Address Line</label>
                      <input
                        name="currentAddressLine"
                        value={form.currentAddressLine}
                        onChange={(e) => updateCurrentAddressLine(e.target.value)}
                        placeholder="Street, Flat/House No."
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                        }`}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Map size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                      <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Permanent Address</h3>
                    </div>
                    <label className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>
                      <input
                        type="checkbox"
                        checked={form.sameAsCurrentAddress}
                        onChange={(e) => toggleSameAsCurrentAddress(e.target.checked)}
                        className={`h-4 w-4 rounded border ${
                          isDark ? "border-[rgba(255,255,255,0.16)] bg-[#1C2030] text-[#C9A96E]" : "border-[#D8C7B7] text-[#8B5E3C]"
                        }`}
                      />
                      Same as current
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>State</label>
                      <div className="relative">
                        <select
                          name="state"
                          value={form.state}
                          onChange={f}
                          disabled={form.sameAsCurrentAddress}
                          className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                          }`}
                        >
                          <option value="">Select State</option>
                          {indianStates.map((state) => (
                            <option key={state.isoCode} value={state.name}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                      </div>
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>City</label>
                      <div className="relative">
                        <select
                          name="city"
                          value={form.city}
                          onChange={f}
                          disabled={form.sameAsCurrentAddress || !form.state}
                          className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                          }`}
                        >
                          <option value="">{form.state ? "Select City" : "Select State First"}</option>
                          {availablePermanentCities.map((city) => (
                            <option key={city.name} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Address Line</label>
                      <input
                        name="addressLine"
                        value={form.addressLine}
                        onChange={f}
                        disabled={form.sameAsCurrentAddress}
                        placeholder="Street, Flat/House No."
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                        }`}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Banknote size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Payroll Details</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Salary Type</label>
                      <div className="relative">
                        <select name="salaryType" value={form.salaryType} onChange={f}
                          className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                          }`}>
                          <option value="Monthly">Monthly</option>
                          <option value="Weekly">Weekly</option>
                        </select>
                        <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                      </div>
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Salary Amount</label>
                      <input type="text" inputMode="numeric" name="salaryAmount" value={form.salaryAmount} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setForm(c => ({ ...c, salaryAmount: val }));
                        }}
                        placeholder="Enter Amount"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                        }`} />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Payment Method</label>
                      <div className="relative">
                        <select name="paymentMethod" value={form.paymentMethod} onChange={f}
                          className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                          }`}>
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="UPI">UPI</option>
                        </select>
                        <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                      </div>
                    </div>

                    {form.paymentMethod === "Bank Transfer" && (
                      <>
                        <div>
                          <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Bank Name</label>
                          <input name="bankName" value={form.bankName} onChange={f} placeholder="Enter Bank Name"
                            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                            }`} />
                        </div>
                        <div>
                          <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>IFSC Code</label>
                          <input name="ifscCode" value={form.ifscCode} onChange={f} placeholder="Enter IFSC Code"
                            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                            }`} />
                        </div>
                        <div className="md:col-span-2">
                          <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Account Number</label>
                          <input name="accountNumber" value={form.accountNumber} onChange={f} placeholder="Standard Savings/Current No."
                            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                            }`} />
                        </div>
                      </>
                    )}

                    {form.paymentMethod === "UPI" && (
                      <div className="md:col-span-2">
                        <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>UPI ID</label>
                        <input name="upiId" value={form.upiId} onChange={f} placeholder="example@upi"
                          className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                          }`} />
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                      <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Identification</h3>
                    </div>
                    <button
                      type="button"
                      onClick={addIdentification}
                      className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        isDark ? "bg-[rgba(201,169,110,0.12)] text-[#E8C98A] hover:bg-[rgba(201,169,110,0.2)]" : "bg-[#F5EDE4] text-[#8B5E3C] hover:bg-[#EEDCC9]"
                      }`}
                    >
                      Add ID
                    </button>
                  </div>
                  <p className={`mb-4 text-xs font-medium ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>You can store multiple identification proofs for one staff member.</p>
                  <div className="flex flex-col gap-4">
                    {form.identificationDetails.map((item, index) => (
                      <div
                        key={`identification-${index}`}
                        className={`rounded-2xl border p-4 transition-all ${
                          isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030]" : "border-[#E8E1D8] bg-[#FCFAF7]"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className={`text-xs font-black uppercase tracking-[0.16em] ${isDark ? "text-[#C8BFB4]" : "text-[#6B7280]"}`}>
                            ID Proof {index + 1}
                          </p>
                          {form.identificationDetails.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeIdentification(index)}
                              className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                isDark ? "bg-[rgba(248,113,113,0.12)] text-[#FCA5A5] hover:bg-[rgba(248,113,113,0.2)]" : "bg-red-50 text-red-600 hover:bg-red-100"
                              }`}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>ID Type</label>
                            <div className="relative">
                              <select
                                value={item.idType}
                                onChange={(e) => updateIdentification(index, "idType", e.target.value)}
                                className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                                  isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-white border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                                }`}
                              >
                                <option value="">Select ID Type</option>
                                {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                            </div>
                          </div>
                          <div>
                            <label className={`mb-1.5 block text-[10px] font-bold uppercase ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>ID Number</label>
                            <input
                              value={item.idNumber}
                              onChange={(e) => updateIdentification(index, "idNumber", e.target.value)}
                              placeholder="XXXX XXXX XXXX"
                              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                                isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-white border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {error && <p className="text-xs font-bold text-red-500 bg-red-500/10 px-4 py-2 rounded-xl">{error}</p>}
              </div>

              <div className={`p-6 flex justify-end gap-3 transition-all ${
                isDark ? "bg-[#1C2030] border-t border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-t border-[#E8E1D8]"
              }`}>
                <button type="button" onClick={closeModal}
                  className={`rounded-full px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.1)]" : "bg-white border border-[#E8E1D8] text-gray-600 hover:bg-gray-100"
                  }`}>Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className={`rounded-full px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                    isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.15)] hover:bg-[#744A2E]"
                  }`}>
                  {isSubmitting ? "Syncing..." : editingId ? "Update Member" : "Finalize Staff Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
