import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  createService,
  deleteService,
  fetchInventory,
  fetchServices,
  type InventoryItem,
  type ServiceItem,
  type ServiceProduct,
  updateService,
} from "../../../core/api";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";
import { Plus, Clock, Zap, MapPin, ChevronDown, Edit3, Trash2, X, Info } from "lucide-react";

type LocationOption = { id: string; name: string; city?: string };
type ServicesOutletContext = {
  ownerLocations?: LocationOption[];
};

type ProductRow = { productId: string; quantityUsed: string; unit: string };

type ServiceFormState = {
  name: string;
  price: string;
  duration: string;
  benefits: string;
  locationId: string;
  products: ProductRow[];
};

const EMPTY_FORM: ServiceFormState = {
  name: "",
  price: "",
  duration: "",
  benefits: "",
  locationId: "",
  products: [],
};

export function DashboardServicesPage() {
  const { user } = useAuth();
  const { theme } = useDashboardTheme();
  const { toast, confirm } = useNotifications();
  const isDark = theme === "dark";
  const { ownerLocations } = useOutletContext<ServicesOutletContext>() || {};

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);

  const { filters: globalFilters, setFilters } = useGlobalFilters();
  const isManager = user?.role === "MANAGER";
  const locationOptions = ownerLocations || [];
  const defaultLocationId = useMemo(() => {
    if (isManager) return user?.branchId || "";
    return locationOptions[0]?.id || "";
  }, [isManager, user?.branchId, locationOptions]);


  const loadData = (locationId = globalFilters.locationId) => {
    setIsLoading(true);
    const apiLocationId =
      isManager ? defaultLocationId : locationId === "all" ? undefined : locationId;

    Promise.all([fetchServices(apiLocationId), fetchInventory(apiLocationId)])
      .then(([servicesRes, inventoryRes]) => {
        setServices(servicesRes.services || []);
        setInventory(inventoryRes.items || []);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load data.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isManager && !defaultLocationId) return;
    loadData();
  }, [globalFilters.locationId, defaultLocationId, isManager, locationOptions.length]);

  const openCreateModal = () => {
    setEditingService(null);
    setForm({
      ...EMPTY_FORM,
      locationId: isManager
        ? defaultLocationId
        : globalFilters.locationId !== "all"
        ? globalFilters.locationId
        : (locationOptions[0]?.id || ""),
      products: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setForm({
      name: service.name,
      price: String(service.price),
      duration: String(service.duration),
      benefits: service.benefits || "",
      locationId: service.location_id,
      products: (service.products || []).map((p: ServiceProduct) => ({
        productId: p.productId,
        quantityUsed: String(p.quantityUsed),
        unit: p.unit,
      })),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingService(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleAddProductRow = () => {
    setForm((cur) => ({
      ...cur,
      products: [...cur.products, { productId: "", quantityUsed: "", unit: "ml" }],
    }));
  };

  const handleRemoveProductRow = (index: number) => {
    setForm((cur) => ({
      ...cur,
      products: cur.products.filter((_, i) => i !== index),
    }));
  };

  const handleProductChange = (
    index: number,
    field: keyof ProductRow,
    value: string
  ) => {
    setForm((cur) => {
      const newProducts = [...cur.products];
      newProducts[index] = { ...newProducts[index], [field]: value };
      if (field === "productId") {
        const item = inventory.find((i) => i.id === value);
        if (item) newProducts[index].unit = item.unit;
      }
      return { ...cur, products: newProducts };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (form.products.length === 0) {
      setError("Please add at least one product to the service.");
      return;
    }
    if (form.products.some((p) => !p.productId || !p.quantityUsed)) {
      setError("Please complete all product fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        duration: Number(form.duration),
        benefits: form.benefits,
        locationId: isManager ? defaultLocationId : form.locationId,
        products: form.products.map((p) => ({
          productId: p.productId,
          quantityUsed: Number(p.quantityUsed),
          unit: p.unit,
        })),
      };

      if (editingService) {
        await updateService(editingService.id, payload);
      } else {
        await createService(payload);
      }

      closeModal();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (service: ServiceItem) => {
    confirm({
      title: "Delete Service",
      message: `Are you sure you want to delete "${service.name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteService(service.id);
          setError(null);
          loadData();
          toast("Service deleted successfully.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to delete service.");
          toast("Failed to delete service.", "error");
        }
      }
    });
  };


  const availableInventory = isManager
    ? inventory
    : form.locationId
    ? inventory.filter((i) => i.locationId === form.locationId)
    : inventory;

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div>
          <h2 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Services Management</h2>
          <p className={`mt-1 text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>
            Manage services and track product usage per service.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {!isManager && (
            <div className="relative">
              <select
                value={globalFilters.locationId}
                onChange={(e) => setFilters({ locationId: e.target.value })}
                className={`appearance-none rounded-xl border px-10 py-2.5 text-sm font-semibold outline-none transition-all ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-700 focus:border-[#8B5E3C]"
                }`}
              >
                <option value="all">All Locations</option>
                {locationOptions.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.city || loc.name}
                  </option>
                ))}
              </select>
              <MapPin size={16} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              <ChevronDown size={16} className={`absolute right-3.5 top-3 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
            </div>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className={`flex items-center justify-center gap-2 rounded-full px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 ${
              isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] hover:bg-[#744A2E]"
            }`}
          >
            <Plus size={18} />
            Add Service
          </button>
        </div>
      </div>

      {error && (
        <div className={`rounded-2xl border px-4 py-3 text-sm transition-all ${
          isDark ? "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)] text-[#F87171]" : "border-red-200 bg-red-50 text-red-700"
        }`}>{error}</div>
      )}

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <div className={`col-span-full p-12 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
            Loading available services…
          </div>
        )}
        {!isLoading && services.length === 0 && (
          <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)] text-[#7A7572]" : "bg-gray-50 border-[#E8E1D8] text-gray-400"
          }`}>
            No services configured for this location.
          </div>
        )}
        {!isLoading &&
          services.map((service) => (
            <div
              key={service.id}
              className={`group flex flex-col rounded-[28px] border p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${
                isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)] hover:border-[rgba(201,169,110,0.3)]" : "bg-white border-[#E8E1D8] hover:border-[#8B5E3C]"
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xl font-black font-['Outfit'] truncate ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                    {service.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={12} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                      {service.duration} MINS
                    </span>
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <div className={`text-xl font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{service.price}</div>
                </div>
              </div>

              {service.benefits && (
                <p className={`text-sm mb-5 line-clamp-2 leading-relaxed ${isDark ? "text-[#C8BFB4]" : "text-gray-500"}`}>
                  {service.benefits}
                </p>
              )}

              {/* Products List */}
              <div className={`mb-6 rounded-2xl p-4 flex-1 transition-all ${
                isDark ? "bg-[#1C2030] border border-[rgba(255,255,255,0.03)]" : "bg-[#FBF9F6] border border-[#F2EDE7]"
              }`}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap size={12} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                  <h4 className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>
                    Components Used
                  </h4>
                </div>
                {service.products && service.products.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {service.products.map((product, idx) => (
                      <div key={product.id || idx} className="flex justify-between items-center text-xs">
                        <span className={`font-bold truncate pr-3 ${isDark ? "text-[#F0EBE3]" : "text-gray-700"}`}>
                          {product.productName}
                        </span>
                        <span className={`font-medium shrink-0 px-2 py-0.5 rounded-lg ${isDark ? "bg-[#151821] text-[#C9A96E]" : "bg-white text-gray-500"}`}>
                          {product.quantityUsed}{product.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className={`text-[10px] italic ${isDark ? "text-[#4A4744]" : "text-gray-300"}`}>No components assigned</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(service)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                      isDark ? "bg-[rgba(255,255,255,0.04)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.08)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Edit3 size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(service)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                      isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171] hover:bg-[rgba(248,113,113,0.2)]" : "bg-red-50 text-red-600 hover:bg-red-100"
                    }`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Create / Edit Modal */}
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
                  {editingService ? "Update Service" : "Register Service"}
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Define service parameters and component requirements.</p>
              </div>
              <button type="button" onClick={closeModal} className={`p-2 rounded-full transition-all hover:bg-[rgba(255,255,255,0.05)] ${isDark ? "text-[#7A7572] hover:text-[#C8BFB4]" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto p-6 grid gap-5 md:grid-cols-2 scrollbar-elegant">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Service Name
                  </label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Keratin Therapy"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] placeholder:text-[#4A4744] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`} />
                </div>

                {/* Location */}
                {!isManager && (
                  <div className="md:col-span-2">
                    <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                      Operational Branch
                    </label>
                    <div className="relative">
                      <select required disabled={!!editingService} value={form.locationId}
                        onChange={(e) => setForm({ ...form, locationId: e.target.value, products: [] })}
                        className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all disabled:opacity-50 ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                        }`}>
                        <option value="" disabled>Select Branch</option>
                        {locationOptions.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.city || loc.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                    </div>
                  </div>
                )}

                {/* Price & Duration */}
                <div>
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Service Rate (₹)
                  </label>
                  <input required min="0" step="0.01" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`} />
                </div>
                <div>
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Duration (MINS)
                  </label>
                  <input required min="1" step="1" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`} />
                </div>

                {/* Benefits */}
                <div className="md:col-span-2">
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Service Insights
                  </label>
                  <textarea rows={2} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                    placeholder="Highlight core benefits for clients…"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] placeholder:text-[#4A4744] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`} />
                </div>

                {/* Products */}
                <div className="md:col-span-2 mt-2">
                  <div className={`flex items-center justify-between mb-4 border-b pb-3 transition-all ${
                    isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"
                  }`}>
                    <label className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
                      Component Composition
                    </label>
                    <button type="button" onClick={handleAddProductRow}
                      className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${
                        isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A] hover:bg-[rgba(201,169,110,0.2)]" : "bg-[#FBF9F6] text-[#8B5E3C] hover:bg-[#F2EDE7]"
                      }`}>
                      <Plus size={10} />
                      Add Item
                    </button>
                  </div>

                  {form.products.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-gray-200"
                    }`}>
                      <Info size={24} className={isDark ? "text-[#4A4744]" : "text-gray-300"} />
                      <p className={`mt-3 text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No components added yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {form.products.map((product, index) => (
                        <div key={index} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-white border-[#E8E1D8]"
                        }`}>
                          <div className="flex-1 relative">
                            <select required value={product.productId} onChange={(e) => handleProductChange(index, "productId", e.target.value)}
                              className={`w-full appearance-none rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                                isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                              }`}>
                              <option value="" disabled>Item</option>
                              {availableInventory.map((item) => (
                                <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                              ))}
                            </select>
                            <ChevronDown size={14} className={`absolute right-3 top-2.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                          </div>

                          <input required type="number" min="0.01" step="0.01" placeholder="Qty" value={product.quantityUsed}
                            onChange={(e) => handleProductChange(index, "quantityUsed", e.target.value)}
                            className={`w-20 rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                              isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                            }`} />

                          <span className={`text-[10px] font-black uppercase tracking-widest w-8 shrink-0 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                            {product.unit}
                          </span>

                          <button type="button" onClick={() => handleRemoveProductRow(index)}
                            className={`p-1.5 rounded-lg transition-all ${isDark ? "text-[#F87171] hover:bg-red-500/10" : "text-red-400 hover:text-red-600 hover:bg-red-50"}`}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {error && <p className="mt-4 text-xs font-bold text-red-500 bg-red-500/10 px-4 py-2 rounded-xl">{error}</p>}
                </div>
              </div>

              <div className={`p-6 flex justify-end gap-3 transition-all ${
                isDark ? "bg-[#1C2030] border-t border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-t border-[#E8E1D8]"
              }`}>
                <button type="button" onClick={closeModal}
                  className={`rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                    isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.1)]" : "bg-white border border-[#E8E1D8] text-gray-600 hover:bg-gray-100"
                  }`}>Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className={`rounded-full px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                    isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.15)] hover:bg-[#744A2E]"
                  }`}>
                  {isSubmitting ? "Syncing…" : editingService ? "Update Record" : "Finalize Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
