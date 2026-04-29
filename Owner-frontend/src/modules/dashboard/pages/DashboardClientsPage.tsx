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
  NEW: "bg-blue-100 text-blue-700",
  REGULAR: "bg-green-100 text-green-700",
  VIP: "bg-amber-100 text-amber-700",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function DashboardClientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};

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

  const handleDelete = async (client: ClientRecord) => {
    if (!window.confirm(`Delete ${client.name}?`)) return;
    try { await deleteClient(client.id); loadClients(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete."); }
  };

  const activeFilterCount = [filterTag, filterHair, filterLastVisit, ...filterProblems].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit']">Client CRM</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{clients.length} clients · manage profiles, visits & follow-ups.</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {!isManager && (
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#744230]">
              <option value="all">All Locations</option>
              {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.city || l.name}</option>)}
            </select>
          )}
          <button onClick={openCreate} type="button"
            className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5">
            + Add Client
          </button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--line)] bg-white text-sm outline-none focus:border-[#744230]" />
          </div>
          <button type="button" onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${showFilters ? "border-[#744230] bg-[#744230] text-white" : "border-[var(--line)] bg-white text-gray-700 hover:bg-gray-50"}`}>
            Filters {activeFilterCount > 0 && <span className="rounded-full bg-white/30 px-1.5 text-xs">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button type="button" onClick={() => { setFilterTag(""); setFilterHair(""); setFilterLastVisit(""); setFilterProblems([]); }}
              className="text-sm text-red-500 hover:text-red-700 font-medium">Clear filters</button>
          )}
        </div>

        {showFilters && (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Tag */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Tag</label>
              <div className="flex gap-2 flex-wrap">
                {TAGS.map((t) => (
                  <button key={t} type="button" onClick={() => setFilterTag(filterTag === t ? "" : t)}
                    className={`rounded-full px-3 py-1 text-xs font-bold border transition-colors ${filterTag === t ? "border-[#744230] bg-[#744230] text-white" : "border-[var(--line)] bg-gray-50 text-gray-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Type */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Hair Type</label>
              <div className="flex gap-2 flex-wrap">
                {HAIR_TYPES.map((h) => (
                  <button key={h} type="button" onClick={() => setFilterHair(filterHair === h ? "" : h)}
                    className={`rounded-full px-3 py-1 text-xs font-bold border transition-colors ${filterHair === h ? "border-[#744230] bg-[#744230] text-white" : "border-[var(--line)] bg-gray-50 text-gray-600"}`}>
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Last Visit */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Last Visit</label>
              <select value={filterLastVisit} onChange={(e) => setFilterLastVisit(e.target.value as ClientFilters["lastVisit"] | "")}
                className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#744230]">
                <option value="">Any time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="inactive">Inactive (60+ days)</option>
              </select>
            </div>

            {/* Problems */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Problems</label>
              <div className="flex gap-1.5 flex-wrap">
                {PROBLEM_OPTIONS.map((p) => (
                  <button key={p} type="button" onClick={() => setFilterProblems((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p])}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold border transition-colors ${filterProblems.includes(p) ? "border-[#744230] bg-[#744230] text-white" : "border-[var(--line)] bg-gray-50 text-gray-600"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)] bg-gray-50/50">
                {["Client", "Phone", "Tag", "Hair Type", "Visits", "Last Visit", "Actions"].map((h) => (
                  <th key={h} className={`p-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="p-8 text-center text-[var(--muted)]">Loading clients…</td></tr>
              )}
              {!isLoading && clients.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)] last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/clients/${c.id}`)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] flex items-center justify-center text-white text-sm font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{c.phoneNumber}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TAG_COLORS[c.tag] || "bg-gray-100 text-gray-600"}`}>{c.tag}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{c.hairType}</td>
                  <td className="p-4 text-sm text-gray-600">{c.totalVisits}</td>
                  <td className="p-4 text-sm text-[var(--muted)]">{fmtDate(c.lastVisitAt)}</td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} type="button"
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200">Edit</button>
                      <button onClick={() => handleDelete(c)} type="button"
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && clients.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-[var(--muted)]">No clients found. Try adjusting your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex flex-col gap-3 p-4">
          {isLoading && <div className="text-center py-8 text-[var(--muted)]">Loading…</div>}
          {!isLoading && clients.map((c) => (
            <div key={c.id} className="rounded-xl border border-[var(--line)] p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/dashboard/clients/${c.id}`)}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.phoneNumber}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TAG_COLORS[c.tag]}`}>{c.tag}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{c.hairType}</span>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(c)} type="button" className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">Edit</button>
                  <button onClick={() => handleDelete(c)} type="button" className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">Delete</button>
                </div>
              </div>
              <div className="mt-2 flex gap-3 text-xs text-[var(--muted)]">
                <span>{c.totalVisits} visits</span>
                <span>·</span>
                <span>Last: {fmtDate(c.lastVisitAt)}</span>
              </div>
            </div>
          ))}
          {!isLoading && clients.length === 0 && <div className="text-center py-8 text-[var(--muted)]">No clients found.</div>}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-gray-50/50 px-6 py-5">
              <h2 className="text-xl font-bold font-['Outfit']">{editingId ? "Edit Client" : "Add Client"}</h2>
              <button type="button" onClick={closeModal} className="p-2 text-xl leading-none text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto p-6 flex flex-col gap-5">

                {/* Basic */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Basic Info</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {!isManager && !editingId && (
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-bold text-gray-700">Location</label>
                        <select required name="locationId" value={form.locationId}
                          onChange={(e) => setForm((c) => ({ ...c, locationId: e.target.value }))}
                          className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]">
                          <option value="" disabled>Select location</option>
                          {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.city || l.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Full Name</label>
                      <input required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                        placeholder="Meena Kumari"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Phone Number</label>
                      <input required value={form.phoneNumber} onChange={(e) => setForm((c) => ({ ...c, phoneNumber: e.target.value }))}
                        placeholder="9876543210"
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Hair Type</label>
                      <select value={form.hairType} onChange={(e) => setForm((c) => ({ ...c, hairType: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]">
                        {HAIR_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Tag</label>
                      <select value={form.tag} onChange={(e) => setForm((c) => ({ ...c, tag: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]">
                        {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Next Follow-up Date</label>
                      <input type="date" value={form.nextFollowUpDate} onChange={(e) => setForm((c) => ({ ...c, nextFollowUpDate: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                    </div>
                  </div>
                </section>

                {/* Hair Problems */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Hair Problems</h3>
                  <div className="flex flex-wrap gap-2">
                    {PROBLEM_OPTIONS.map((p) => (
                      <button key={p} type="button" onClick={() => toggleProblem(p)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${form.problems.includes(p) ? "border-[#744230] bg-[#744230] text-white" : "border-[var(--line)] bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Notes */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Staff Notes</h3>
                  <textarea rows={3} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                    placeholder="Any remarks about this client's preferences or history…"
                    className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-[#744230]" />
                </section>

                {formError && <p className="text-sm text-red-600 font-medium">{formError}</p>}
              </div>

              <div className="border-t border-[var(--line)] p-5 bg-gray-50/50 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60">
                  {isSubmitting ? "Saving…" : editingId ? "Save Changes" : "Add Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
