import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  createClient,
  deleteClient,
  fetchClients,
  updateClient,
  type ClientFilters,
  type ClientInput,
  type ClientRecord,
} from "../../../core/api";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { Search, Filter, Plus, X, MapPin, ChevronDown, Trash2, Edit3 } from "lucide-react";

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };

type FormState = {
  name: string; phoneNumber: string; hairType: string; tag: string;
  notes: string; preferredStaffId: string; nextFollowUpDate: string;
  problems: string[]; locationId: string;
};

const EMPTY_FORM: FormState = {
  name: "", phoneNumber: "", hairType: "Normal", tag: "NEW",
  notes: "", preferredStaffId: "", nextFollowUpDate: "",
  problems: [], locationId: "",
};

const HAIR_TYPES = ["Normal", "Dry", "Oily"];
const TAGS = ["NEW", "REGULAR", "VIP"];
const PROBLEM_OPTIONS = [
  "Hair Fall", "Dandruff", "Split Ends", "Frizzy Hair", "Scalp Itch",
  "Oily Scalp", "Dry Scalp", "Color Damage", "Thinning Hair", "Breakage",
];

const TAG_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  REGULAR: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  VIP: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function DashboardClientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const { theme } = useDashboardTheme();
  const { toast, confirm } = useNotifications();
  const isDark = theme === "dark";

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterHair, setFilterHair] = useState("");
  const [filterLastVisit, setFilterLastVisit] = useState<ClientFilters["lastVisit"] | "">("");
  const [filterProblems, setFilterProblems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

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

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadClients = () => {
    setIsLoading(true);
    const locId = isManager ? defaultLocationId : selectedLocation;
    const filters: ClientFilters = {};
    if (debouncedSearch) filters.search = debouncedSearch;
    if (filterTag) filters.tag = filterTag;
    if (filterHair) filters.hairType = filterHair;
    if (filterLastVisit) filters.lastVisit = filterLastVisit as ClientFilters["lastVisit"];
    if (filterProblems.length) filters.problems = filterProblems;

    fetchClients(locId === "all" ? undefined : locId, filters)
      .then((r) => { setClients(r.clients || []); setError(null); })
      .catch((e: Error) => setError(e.message || "Failed to load clients."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isManager && !defaultLocationId) return;
    if (!isManager && !selectedLocation) return;
    loadClients();
  }, [selectedLocation, defaultLocationId, isManager, debouncedSearch, filterTag, filterHair, filterLastVisit, filterProblems.join(",")]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      locationId: isManager ? defaultLocationId : selectedLocation !== "all" ? selectedLocation : defaultLocationId,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (client: ClientRecord) => {
    setEditingId(client.id);
    setForm({
      name: client.name, phoneNumber: client.phoneNumber,
      hairType: client.hairType, tag: client.tag,
      notes: client.notes,
      preferredStaffId: client.preferredStaffId || "",
      nextFollowUpDate: client.nextFollowUpDate?.split("T")[0] || "",
      problems: client.problems || [],
      locationId: client.locationId,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => { if (isSubmitting) return; setIsModalOpen(false); setEditingId(null); setFormError(null); };

  const toggleProblem = (p: string) =>
    setForm((c) => ({ ...c, problems: c.problems.includes(p) ? c.problems.filter((x) => x !== p) : [...c.problems, p] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    const payload: ClientInput = {
      name: form.name, phoneNumber: form.phoneNumber,
      hairType: form.hairType, tag: form.tag, notes: form.notes,
      preferredStaffId: form.preferredStaffId || null,
      nextFollowUpDate: form.nextFollowUpDate || null,
      problems: form.problems,
      locationId: isManager ? defaultLocationId : form.locationId,
    };
    try {
      if (editingId) { await updateClient(editingId, payload); }
      else { await createClient(payload); }
      closeModal();
      loadClients();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save client.");
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = (client: ClientRecord) => {
    confirm({
      title: "Delete Client",
      message: `Are you sure you want to delete ${client.name}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteClient(client.id);
          loadClients();
          toast("Client deleted successfully.");
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to delete.";
          setError(errorMessage);
          toast(errorMessage, "error");
        }
      }
    });
  };

  const activeFilterCount = [filterTag, filterHair, filterLastVisit, ...filterProblems].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div>
          <h2 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Client CRM</h2>
          <p className={`mt-1 text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>{clients.length} clients · manage profiles, visits & follow-ups.</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {!isManager && (
            <div className="relative">
              <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}
                className={`appearance-none rounded-xl border px-10 py-2.5 text-sm font-semibold outline-none transition-all ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-700 focus:border-[#8B5E3C]"
                }`}>
                <option value="all">All Locations</option>
                {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.city || l.name}</option>)}
              </select>
              <MapPin size={16} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              <ChevronDown size={16} className={`absolute right-3.5 top-3 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
            </div>
          )}
          <button onClick={openCreate} type="button"
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 ${
              isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] hover:bg-[#744A2E]"
            }`}>
            <Plus size={18} />
            Add Client
          </button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-white border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
              }`} />
          </div>
          <button type="button" onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
              showFilters 
                ? (isDark ? "border-[#C9A96E] bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "border-[#8B5E3C] bg-[#8B5E3C] text-white") 
                : (isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.04)]" : "border-[#E8E1D8] bg-white text-gray-700 hover:bg-gray-50")
            }`}>
            <Filter size={16} />
            Filters {activeFilterCount > 0 && <span className={`rounded-full px-1.5 text-xs ${isDark ? "bg-[#C9A96E] text-[#0F1115]" : "bg-white/30"}`}>{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button type="button" onClick={() => { setFilterTag(""); setFilterHair(""); setFilterLastVisit(""); setFilterProblems([]); }}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">Clear filters</button>
          )}
        </div>

        {showFilters && (
          <div className={`rounded-2xl border p-4 shadow-sm grid gap-4 md:grid-cols-2 lg:grid-cols-4 transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
          }`}>
            {/* Tag */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Tag</label>
              <div className="flex gap-2 flex-wrap">
                {TAGS.map((t) => (
                  <button key={t} type="button" onClick={() => setFilterTag(filterTag === t ? "" : t)}
                    className={`rounded-full px-3 py-1 text-xs font-bold border transition-all ${
                      filterTag === t 
                        ? (isDark ? "border-[#C9A96E] bg-[#C9A96E] text-[#0F1115]" : "border-[#8B5E3C] bg-[#8B5E3C] text-white") 
                        : (isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#7A7572] hover:text-[#C8BFB4]" : "border-[#E8E1D8] bg-gray-50 text-gray-600 hover:bg-gray-100")
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Type */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Hair Type</label>
              <div className="flex gap-2 flex-wrap">
                {HAIR_TYPES.map((h) => (
                  <button key={h} type="button" onClick={() => setFilterHair(filterHair === h ? "" : h)}
                    className={`rounded-full px-3 py-1 text-xs font-bold border transition-all ${
                      filterHair === h 
                        ? (isDark ? "border-[#C9A96E] bg-[#C9A96E] text-[#0F1115]" : "border-[#8B5E3C] bg-[#8B5E3C] text-white") 
                        : (isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#7A7572] hover:text-[#C8BFB4]" : "border-[#E8E1D8] bg-gray-50 text-gray-600 hover:bg-gray-100")
                    }`}>
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Last Visit */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Last Visit</label>
              <div className="relative">
                <select value={filterLastVisit} onChange={(e) => setFilterLastVisit(e.target.value as ClientFilters["lastVisit"] | "")}
                  className={`w-full appearance-none rounded-xl border px-3 py-2 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-700 focus:border-[#8B5E3C]"
                  }`}>
                  <option value="">Any time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="inactive">Inactive (60+ days)</option>
                </select>
                <ChevronDown size={14} className={`absolute right-3 top-3 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              </div>
            </div>

            {/* Problems */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Problems</label>
              <div className="flex gap-1.5 flex-wrap">
                {PROBLEM_OPTIONS.slice(0, 4).map((p) => (
                  <button key={p} type="button" onClick={() => setFilterProblems((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p])}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-all ${
                      filterProblems.includes(p) 
                        ? (isDark ? "border-[#C9A96E] bg-[#C9A96E] text-[#0F1115]" : "border-[#8B5E3C] bg-[#8B5E3C] text-white") 
                        : (isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#7A7572] hover:text-[#C8BFB4]" : "border-[#E8E1D8] bg-gray-50 text-gray-600 hover:bg-gray-100")
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className={`rounded-2xl border px-4 py-3 text-sm transition-all ${
          isDark ? "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)] text-[#F87171]" : "border-red-200 bg-red-50 text-red-700"
        }`}>{error}</div>
      )}

      {/* Table */}
      <div className={`flex-1 overflow-hidden rounded-2xl border shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className={`border-b transition-all ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#E8E1D8]"
              }`}>
                {["Client", "Phone", "Tag", "Hair Type", "Visits", "Last Visit", "Actions"].map((h) => (
                  <th key={h} className={`p-4 text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"} ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className={`p-8 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading clients…</td></tr>
              )}
              {!isLoading && clients.map((c) => (
                <tr key={c.id} className={`border-b cursor-pointer transition-all last:border-0 ${
                  isDark ? "border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.03)]" : "border-[#E8E1D8] hover:bg-gray-50"
                }`}
                  onClick={() => navigate(`/dashboard/clients/${c.id}`)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                        isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[linear-gradient(135deg,#8B5E3C,#4E2D1B)] text-white"
                      }`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{c.name}</span>
                    </div>
                  </td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{c.phoneNumber}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-tight ${TAG_COLORS[c.tag] || "bg-gray-100 text-gray-600"}`}>{c.tag}</span>
                  </td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{c.hairType}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{c.totalVisits}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{fmtDate(c.lastVisitAt)}</td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} type="button"
                        className={`p-2 rounded-lg transition-all ${
                          isDark ? "bg-[rgba(255,255,255,0.04)] text-[#C9A96E] hover:bg-[rgba(255,255,255,0.08)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`} aria-label="Edit client">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(c)} type="button"
                        className={`p-2 rounded-lg transition-all ${
                          isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171] hover:bg-[rgba(248,113,113,0.2)]" : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`} aria-label="Delete client">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && clients.length === 0 && (
                <tr><td colSpan={7} className={`p-12 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No clients found. Try adjusting your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex flex-col gap-3 p-4">
          {isLoading && <div className={`text-center py-8 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading…</div>}
          {!isLoading && clients.map((c) => (
            <div key={c.id} className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)]" : "bg-white border-[#E8E1D8] hover:shadow-md"
            }`}
              onClick={() => navigate(`/dashboard/clients/${c.id}`)}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-base font-bold ${
                    isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[linear-gradient(135deg,#8B5E3C,#4E2D1B)] text-white"
                  }`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{c.name}</p>
                    <p className={`text-xs ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{c.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(c)} type="button" className={`p-2 rounded-lg ${isDark ? "bg-[#151821] text-[#C9A96E]" : "bg-gray-100 text-gray-700"}`}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(c)} type="button" className={`p-2 rounded-lg ${isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171]" : "bg-red-50 text-red-600"}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TAG_COLORS[c.tag]}`}>{c.tag}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isDark ? "bg-[#151821] text-[#7A7572]" : "bg-gray-100 text-gray-600"}`}>{c.hairType}</span>
              </div>
              <div className={`mt-3 flex gap-3 text-[11px] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>
                <span>{c.totalVisits} visits</span>
                <span>·</span>
                <span>Last: {fmtDate(c.lastVisitAt)}</span>
              </div>
            </div>
          ))}
          {!isLoading && clients.length === 0 && <div className={`text-center py-8 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No clients found.</div>}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className={`flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-[28px] border shadow-2xl transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)]" : "bg-white border-[#E8E1D8]"
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-[#E8E1D8]"
            }`}>
              <h2 className={`text-xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>{editingId ? "Edit Client" : "Add Client"}</h2>
              <button type="button" onClick={closeModal} className={`p-2 rounded-full transition-all hover:bg-[rgba(255,255,255,0.05)] ${isDark ? "text-[#7A7572] hover:text-[#C8BFB4]" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto p-6 flex flex-col gap-6 scrollbar-elegant">

                {/* Basic */}
                <section>
                  <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Basic Profile</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {!isManager && !editingId && (
                      <div className="md:col-span-2">
                        <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Service Location</label>
                        <div className="relative">
                          <select required name="locationId" value={form.locationId}
                            onChange={(e) => setForm((c) => ({ ...c, locationId: e.target.value }))}
                            className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                            }`}>
                            <option value="" disabled>Select location</option>
                            {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.city || l.name}</option>)}
                          </select>
                          <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Full Name</label>
                      <input required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                        placeholder="Meena Kumari"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] placeholder:text-[#4A4744] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                        }`} />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Phone Number</label>
                      <input required value={form.phoneNumber} onChange={(e) => setForm((c) => ({ ...c, phoneNumber: e.target.value }))}
                        placeholder="9876543210"
                        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] placeholder:text-[#4A4744] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                        }`} />
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Hair Type</label>
                      <div className="relative">
                        <select value={form.hairType} onChange={(e) => setForm((c) => ({ ...c, hairType: e.target.value }))}
                          className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                          }`}>
                          {HAIR_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                      </div>
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Client Segment (Tag)</label>
                      <div className="relative">
                        <select value={form.tag} onChange={(e) => setForm((c) => ({ ...c, tag: e.target.value }))}
                          className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                            isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                          }`}>
                          {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Hair Problems */}
                <section>
                  <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Focus Areas (Problems)</h3>
                  <div className="flex flex-wrap gap-2">
                    {PROBLEM_OPTIONS.map((p) => (
                      <button key={p} type="button" onClick={() => toggleProblem(p)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold border transition-all ${
                          form.problems.includes(p) 
                            ? (isDark ? "border-[#C9A96E] bg-[#C9A96E] text-[#0F1115]" : "border-[#8B5E3C] bg-[#8B5E3C] text-white") 
                            : (isDark ? "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.08)]" : "border-[#E8E1D8] bg-gray-50 text-gray-700 hover:bg-gray-100")
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Notes */}
                <section>
                  <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Consultation Notes</h3>
                  <textarea rows={3} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                    placeholder="Any remarks about this client's preferences or history…"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] placeholder:text-[#4A4744] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`} />
                </section>

                {formError && <p className="text-sm text-red-500 font-semibold">{formError}</p>}
              </div>

              <div className={`border-t p-5 flex justify-end gap-3 ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-[#E8E1D8]"
              }`}>
                <button type="button" onClick={closeModal} className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                  isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.1)]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                    isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.15)] hover:bg-[#744A2E]"
                  }`}>
                  {isSubmitting ? "Saving…" : editingId ? "Update Client" : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
