import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  createComboService,
  createService,
  deleteComboService,
  deleteService,
  fetchInventory,
  fetchServices,
  type ComboServiceItem,
  type InventoryItem,
  type ServiceItem,
  type ServiceProduct,
  updateComboService,
  updateService,
} from "../../../core/api";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";
import { Plus, Clock, Zap, MapPin, ChevronDown, Edit3, Trash2, X, Info, Layers3 } from "lucide-react";

type LocationOption = { id: string; name: string; city?: string };
type ServicesOutletContext = {
  ownerLocations?: LocationOption[];
};

type ProductRow = { productId: string; quantityUsed: string; unit: string };
type ComboServiceRow = { serviceId: string };

type ServiceFormState = {
  name: string;
  price: string;
  duration: string;
  locationId: string;
  products: ProductRow[];
};

type ComboFormState = {
  name: string;
  price: string;
  duration: string;
  locationId: string;
  services: ComboServiceRow[];
};

const EMPTY_SERVICE_FORM: ServiceFormState = {
  name: "",
  price: "",
  duration: "",
  locationId: "",
  products: [],
};

const EMPTY_COMBO_FORM: ComboFormState = {
  name: "",
  price: "",
  duration: "",
  locationId: "",
  services: [],
};

function SectionHeader({
  title,
  description,
  isDark,
}: {
  title: string;
  description: string;
  isDark: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 className={`text-lg font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{title}</h3>
        <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{description}</p>
      </div>
    </div>
  );
}

export function DashboardServicesPage() {
  const { user } = useAuth();
  const { theme } = useDashboardTheme();
  const { toast, confirm } = useNotifications();
  const isDark = theme === "dark";
  const { ownerLocations } = useOutletContext<ServicesOutletContext>() || {};

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [comboServices, setComboServices] = useState<ComboServiceItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editingComboService, setEditingComboService] = useState<ComboServiceItem | null>(null);

  const [serviceForm, setServiceForm] = useState<ServiceFormState>(EMPTY_SERVICE_FORM);
  const [comboForm, setComboForm] = useState<ComboFormState>(EMPTY_COMBO_FORM);

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
        setComboServices(servicesRes.comboServices || []);
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

  const currentLocationId = isManager
    ? defaultLocationId
    : globalFilters.locationId !== "all"
      ? globalFilters.locationId
      : (locationOptions[0]?.id || "");

  const openCreateServiceModal = () => {
    setEditingService(null);
    setServiceForm({
      ...EMPTY_SERVICE_FORM,
      locationId: currentLocationId,
      products: [],
    });
    setError(null);
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (service: ServiceItem) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      price: String(service.price),
      duration: String(service.duration),
      locationId: service.location_id,
      products: (service.products || []).map((p: ServiceProduct) => ({
        productId: p.productId,
        quantityUsed: String(p.quantityUsed),
        unit: p.unit,
      })),
    });
    setError(null);
    setIsServiceModalOpen(true);
  };

  const openCreateComboModal = () => {
    setEditingComboService(null);
    setComboForm({
      ...EMPTY_COMBO_FORM,
      locationId: currentLocationId,
      services: [],
    });
    setError(null);
    setIsComboModalOpen(true);
  };

  const openEditComboModal = (combo: ComboServiceItem) => {
    setEditingComboService(combo);
    setComboForm({
      name: combo.name,
      price: String(combo.price),
      duration: String(combo.duration),
      locationId: combo.location_id,
      services: combo.services.map((service) => ({ serviceId: service.serviceId })),
    });
    setError(null);
    setIsComboModalOpen(true);
  };

  const closeServiceModal = () => {
    if (isSubmitting) return;
    setIsServiceModalOpen(false);
    setEditingService(null);
    setServiceForm(EMPTY_SERVICE_FORM);
    setError(null);
  };

  const closeComboModal = () => {
    if (isSubmitting) return;
    setIsComboModalOpen(false);
    setEditingComboService(null);
    setComboForm(EMPTY_COMBO_FORM);
    setError(null);
  };

  const handleAddProductRow = () => {
    setServiceForm((cur) => ({
      ...cur,
      products: [...cur.products, { productId: "", quantityUsed: "", unit: "ml" }],
    }));
  };

  const handleRemoveProductRow = (index: number) => {
    setServiceForm((cur) => ({
      ...cur,
      products: cur.products.filter((_, i) => i !== index),
    }));
  };

  const handleProductChange = (index: number, field: keyof ProductRow, value: string) => {
    setServiceForm((cur) => {
      const newProducts = [...cur.products];
      newProducts[index] = { ...newProducts[index], [field]: value };
      if (field === "productId") {
        const item = inventory.find((i) => i.id === value);
        if (item) newProducts[index].unit = item.unit;
      }
      return { ...cur, products: newProducts };
    });
  };

  const handleAddComboServiceRow = () => {
    setComboForm((cur) => ({
      ...cur,
      services: [...cur.services, { serviceId: "" }],
    }));
  };

  const handleRemoveComboServiceRow = (index: number) => {
    setComboForm((cur) => ({
      ...cur,
      services: cur.services.filter((_, i) => i !== index),
    }));
  };

  const handleComboServiceChange = (index: number, value: string) => {
    setComboForm((cur) => {
      const newServices = [...cur.services];
      newServices[index] = { serviceId: value };
      return { ...cur, services: newServices };
    });
  };

  const availableInventory = isManager
    ? inventory
    : serviceForm.locationId
      ? inventory.filter((i) => i.locationId === serviceForm.locationId)
      : inventory;

  const selectedProductIds = serviceForm.products.map((product) => product.productId).filter(Boolean);
  const getAvailableOptionsForRow = (rowIndex: number) => {
    const currentRowProductId = serviceForm.products[rowIndex]?.productId;
    return availableInventory.filter((item) => {
      if (item.id === currentRowProductId) return true;
      return !selectedProductIds.includes(item.id);
    });
  };
  const canAddMoreProducts = availableInventory.length > selectedProductIds.length;

  const availableServicesForCombo = isManager
    ? services
    : comboForm.locationId
      ? services.filter((service) => service.location_id === comboForm.locationId)
      : services;

  const selectedComboServiceIds = comboForm.services.map((service) => service.serviceId).filter(Boolean);
  const getComboOptionsForRow = (rowIndex: number) => {
    const currentRowServiceId = comboForm.services[rowIndex]?.serviceId;
    return availableServicesForCombo.filter((service) => {
      if (service.id === currentRowServiceId) return true;
      return !selectedComboServiceIds.includes(service.id);
    });
  };
  const canAddMoreComboServices = availableServicesForCombo.length > selectedComboServiceIds.length;

  const getDecimalInputValue = (value: string) =>
    value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

  const getIntegerInputValue = (value: string) => value.replace(/\D/g, "");

  const handleSubmitService = async (event: React.FormEvent) => {
    event.preventDefault();

    if (serviceForm.products.length > 0 && serviceForm.products.some((p) => !p.productId || !p.quantityUsed)) {
      setError("Please complete all product fields or remove empty rows.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: serviceForm.name,
        price: Number(serviceForm.price),
        duration: Number(serviceForm.duration),
        benefits: "",
        locationId: isManager ? defaultLocationId : serviceForm.locationId,
        products: serviceForm.products.map((p) => ({
          productId: p.productId,
          quantityUsed: Number(p.quantityUsed),
          unit: p.unit,
        })),
      };

      if (editingService) await updateService(editingService.id, payload);
      else await createService(payload);

      closeServiceModal();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCombo = async (event: React.FormEvent) => {
    event.preventDefault();

    if (comboForm.services.length === 0 || comboForm.services.some((service) => !service.serviceId)) {
      setError("Please add at least one service to the combo.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: comboForm.name,
        price: Number(comboForm.price),
        duration: Number(comboForm.duration),
        locationId: isManager ? defaultLocationId : comboForm.locationId,
        serviceIds: comboForm.services.map((service) => service.serviceId),
      };

      if (editingComboService) await updateComboService(editingComboService.id, payload);
      else await createComboService(payload);

      closeComboModal();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save combo service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = (service: ServiceItem) => {
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
      },
    });
  };

  const handleDeleteComboService = (comboService: ComboServiceItem) => {
    confirm({
      title: "Delete Combo Service",
      message: `Are you sure you want to delete "${comboService.name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteComboService(comboService.id);
          setError(null);
          loadData();
          toast("Combo service deleted successfully.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to delete combo service.");
          toast("Failed to delete combo service.", "error");
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div>
          <h2 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Services Management</h2>
          <p className={`mt-1 text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>
            Manage standalone services and curated combo packages.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {!isManager && (
            <div className="relative">
              <select
                value={globalFilters.locationId}
                onChange={(e) => setFilters({ locationId: e.target.value })}
                className={`appearance-none rounded-xl border px-10 py-2.5 text-sm font-semibold outline-none transition-all ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-700 focus:border-[#8B5E3C] [color-scheme:light]"
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
            onClick={openCreateComboModal}
            className={`flex items-center justify-center gap-2 rounded-full px-6 py-2.5 font-semibold transition-all hover:-translate-y-0.5 ${
              isDark ? "bg-[rgba(201,169,110,0.12)] text-[#E8C98A] border border-[rgba(201,169,110,0.2)]" : "bg-[#F5EDE4] text-[#8B5E3C] border border-[#E8D4C1] hover:bg-[#EEDCC9]"
            }`}
          >
            <Layers3 size={18} />
            Add Combo Service
          </button>
          <button
            type="button"
            onClick={openCreateServiceModal}
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

      <section>
        <SectionHeader
          title="Services"
          description="Standalone services with product usage tracking."
          isDark={isDark}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && (
            <div className={`col-span-full p-12 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
              Loading available services...
            </div>
          )}
          {!isLoading && services.length === 0 && (
            <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed transition-all ${
              isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)] text-[#7A7572]" : "bg-gray-50 border-[#E8E1D8] text-gray-400"
            }`}>
              No standalone services configured for this location.
            </div>
          )}
          {!isLoading && services.map((service) => (
            <div
              key={service.id}
              className={`group flex flex-col rounded-[28px] border p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${
                isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)] hover:border-[rgba(201,169,110,0.3)]" : "bg-white border-[#E8E1D8] hover:border-[#8B5E3C]"
              }`}
            >
              <div className="mb-4 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xl font-black font-['Outfit'] truncate ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                    {service.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock size={12} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                      {service.duration} MINS
                    </span>
                  </div>
                </div>
                <div className={`ml-3 shrink-0 text-xl font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{service.price}</div>
              </div>

              <div className={`mb-6 rounded-2xl p-4 flex-1 transition-all ${
                isDark ? "bg-[#1C2030] border border-[rgba(255,255,255,0.03)]" : "bg-[#FBF9F6] border border-[#F2EDE7]"
              }`}>
                <div className="mb-3 flex items-center gap-1.5">
                  <Zap size={12} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                  <h4 className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>
                    Components Used
                  </h4>
                </div>
                {service.products && service.products.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {service.products.map((product, idx) => (
                      <div key={product.id || idx} className="flex items-center justify-between text-xs">
                        <span className={`font-bold truncate pr-3 ${isDark ? "text-[#F0EBE3]" : "text-gray-700"}`}>
                          {product.productName}
                        </span>
                        <span className={`font-medium shrink-0 rounded-lg px-2 py-0.5 ${isDark ? "bg-[#151821] text-[#C9A96E]" : "bg-white text-gray-500"}`}>
                          {product.quantityUsed}{product.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className={`text-[10px] italic ${isDark ? "text-[#4A4744]" : "text-gray-300"}`}>No components assigned</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditServiceModal(service)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDark ? "bg-[rgba(255,255,255,0.04)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.08)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Edit3 size={12} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteService(service)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171] hover:bg-[rgba(248,113,113,0.2)]" : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Combo Services"
          description="Packages built from your existing services."
          isDark={isDark}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!isLoading && comboServices.length === 0 && (
            <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed transition-all ${
              isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)] text-[#7A7572]" : "bg-gray-50 border-[#E8E1D8] text-gray-400"
            }`}>
              No combo services configured for this location.
            </div>
          )}
          {!isLoading && comboServices.map((combo) => (
            <div
              key={combo.id}
              className={`group flex flex-col rounded-[28px] border p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${
                isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)] hover:border-[rgba(201,169,110,0.3)]" : "bg-white border-[#E8E1D8] hover:border-[#8B5E3C]"
              }`}
            >
              <div className="mb-4 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xl font-black font-['Outfit'] truncate ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                    {combo.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock size={12} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                      {combo.duration} MINS
                    </span>
                  </div>
                </div>
                <div className={`ml-3 shrink-0 text-xl font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{combo.price}</div>
              </div>

              <div className={`mb-6 rounded-2xl p-4 flex-1 transition-all ${
                isDark ? "bg-[#1C2030] border border-[rgba(255,255,255,0.03)]" : "bg-[#FBF9F6] border border-[#F2EDE7]"
              }`}>
                <div className="mb-3 flex items-center gap-1.5">
                  <Layers3 size={12} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                  <h4 className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>
                    Included Services
                  </h4>
                </div>
                {combo.services.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {combo.services.map((service) => (
                      <div key={service.serviceId} className="flex items-center justify-between text-xs">
                        <span className={`font-bold truncate pr-3 ${isDark ? "text-[#F0EBE3]" : "text-gray-700"}`}>
                          {service.serviceName}
                        </span>
                        <span className={`font-medium shrink-0 rounded-lg px-2 py-0.5 ${isDark ? "bg-[#151821] text-[#C9A96E]" : "bg-white text-gray-500"}`}>
                          {service.duration}m
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className={`text-[10px] italic ${isDark ? "text-[#4A4744]" : "text-gray-300"}`}>No services included</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditComboModal(combo)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDark ? "bg-[rgba(255,255,255,0.04)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.08)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Edit3 size={12} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteComboService(combo)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171] hover:bg-[rgba(248,113,113,0.2)]" : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isServiceModalOpen && (
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
              <button type="button" onClick={closeServiceModal} className={`p-2 rounded-full transition-all hover:bg-[rgba(255,255,255,0.05)] ${isDark ? "text-[#7A7572] hover:text-[#C8BFB4]" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitService} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto p-6 grid gap-5 md:grid-cols-2 scrollbar-elegant">
                <div className="md:col-span-2">
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Service Name
                  </label>
                  <input
                    required
                    value={serviceForm.name}
                    onKeyDown={(e) => {
                      if (e.key === " " && !serviceForm.name) e.preventDefault();
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
                      setServiceForm({ ...serviceForm, name: val });
                    }}
                    placeholder="Enter service"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] placeholder:text-[#4A4744] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`}
                  />
                </div>

                {!isManager && (
                  <div className="md:col-span-2">
                    <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                      Operational Branch
                    </label>
                    <div className="relative">
                      <select
                        required
                        disabled={!!editingService}
                        value={serviceForm.locationId}
                        onChange={(e) => setServiceForm({ ...serviceForm, locationId: e.target.value, products: [] })}
                        className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all disabled:opacity-50 ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                        }`}
                      >
                        <option value="" disabled>Select Branch</option>
                        {locationOptions.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.city || loc.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                    </div>
                  </div>
                )}

                <div>
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Service Rate (₹)
                  </label>
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: getDecimalInputValue(e.target.value) })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Duration (MINS)
                  </label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: getIntegerInputValue(e.target.value) })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`}
                  />
                </div>

                <div className="md:col-span-2 mt-2">
                  <div className={`flex items-center justify-between mb-4 border-b pb-3 transition-all ${
                    isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"
                  }`}>
                    <label className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
                      Component Composition
                    </label>
                    <button
                      type="button"
                      onClick={handleAddProductRow}
                      disabled={!canAddMoreProducts}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${
                        isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A] hover:bg-[rgba(201,169,110,0.2)] disabled:opacity-40 disabled:hover:bg-[rgba(201,169,110,0.1)]" : "bg-[#FBF9F6] text-[#8B5E3C] hover:bg-[#F2EDE7] disabled:opacity-40 disabled:hover:bg-[#FBF9F6]"
                      }`}
                    >
                      <Plus size={10} />
                      Add Item
                    </button>
                  </div>

                  {serviceForm.products.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-gray-200"
                    }`}>
                      <Info size={24} className={isDark ? "text-[#4A4744]" : "text-gray-300"} />
                      <p className={`mt-3 text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No components added yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {serviceForm.products.map((product, index) => (
                        <div key={index} className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-white border-[#E8E1D8]"
                        }`}>
                          <div className="relative flex-1">
                            <select
                              required
                              value={product.productId}
                              onChange={(e) => handleProductChange(index, "productId", e.target.value)}
                              className={`w-full appearance-none rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                                isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                              }`}
                            >
                              <option value="" disabled>Item</option>
                              {getAvailableOptionsForRow(index).map((item) => (
                                <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                              ))}
                            </select>
                            <ChevronDown size={14} className={`absolute right-3 top-2.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                          </div>

                          <input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Qty"
                            value={product.quantityUsed}
                            onChange={(e) => handleProductChange(index, "quantityUsed", e.target.value)}
                            className={`w-20 rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                              isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                            }`}
                          />

                          <span className={`w-8 shrink-0 text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                            {product.unit}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveProductRow(index)}
                            className={`rounded-lg p-1.5 transition-all ${isDark ? "text-[#F87171] hover:bg-red-500/10" : "text-red-400 hover:text-red-600 hover:bg-red-50"}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex justify-end gap-3 p-6 transition-all ${
                isDark ? "bg-[#1C2030] border-t border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-t border-[#E8E1D8]"
              }`}>
                <button type="button" onClick={closeServiceModal} className={`rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                  isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.1)]" : "bg-white border border-[#E8E1D8] text-gray-600 hover:bg-gray-100"
                }`}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`rounded-full px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                  isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.15)] hover:bg-[#744A2E]"
                }`}>
                  {isSubmitting ? "Syncing..." : editingService ? "Update Service" : "Finalize Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isComboModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className={`flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-[32px] border shadow-2xl transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)]" : "bg-white border-[#E8E1D8]"
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-[#E8E1D8]"
            }`}>
              <div>
                <h2 className={`text-xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                  {editingComboService ? "Update Combo Service" : "Register Combo Service"}
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Bundle your existing services into one combo package.</p>
              </div>
              <button type="button" onClick={closeComboModal} className={`p-2 rounded-full transition-all hover:bg-[rgba(255,255,255,0.05)] ${isDark ? "text-[#7A7572] hover:text-[#C8BFB4]" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitCombo} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto p-6 grid gap-5 md:grid-cols-2 scrollbar-elegant">
                <div className="md:col-span-2">
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Combo Service Name
                  </label>
                  <input
                    required
                    value={comboForm.name}
                    onKeyDown={(e) => {
                      if (e.key === " " && !comboForm.name) e.preventDefault();
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
                      setComboForm({ ...comboForm, name: val });
                    }}
                    placeholder="Enter combo name"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] placeholder:text-[#4A4744] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`}
                  />
                </div>

                {!isManager && (
                  <div className="md:col-span-2">
                    <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                      Operational Branch
                    </label>
                    <div className="relative">
                      <select
                        required
                        disabled={!!editingComboService}
                        value={comboForm.locationId}
                        onChange={(e) => setComboForm({ ...comboForm, locationId: e.target.value, services: [] })}
                        className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all disabled:opacity-50 ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                        }`}
                      >
                        <option value="" disabled>Select Branch</option>
                        {locationOptions.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.city || loc.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                    </div>
                  </div>
                )}

                <div>
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Combo Price (₹)
                  </label>
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    value={comboForm.price}
                    onChange={(e) => setComboForm({ ...comboForm, price: getDecimalInputValue(e.target.value) })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`}
                  />
                </div>
                <div>
                  <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    Combo Duration (MINS)
                  </label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={comboForm.duration}
                    onChange={(e) => setComboForm({ ...comboForm, duration: getIntegerInputValue(e.target.value) })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`}
                  />
                </div>

                <div className="md:col-span-2 mt-2">
                  <div className={`flex items-center justify-between mb-4 border-b pb-3 transition-all ${
                    isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"
                  }`}>
                    <label className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
                      Services For Combo
                    </label>
                    <button
                      type="button"
                      onClick={handleAddComboServiceRow}
                      disabled={!canAddMoreComboServices}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${
                        isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A] hover:bg-[rgba(201,169,110,0.2)] disabled:opacity-40 disabled:hover:bg-[rgba(201,169,110,0.1)]" : "bg-[#FBF9F6] text-[#8B5E3C] hover:bg-[#F2EDE7] disabled:opacity-40 disabled:hover:bg-[#FBF9F6]"
                      }`}
                    >
                      <Plus size={10} />
                      Add Service
                    </button>
                  </div>

                  {comboForm.services.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-gray-200"
                    }`}>
                      <Layers3 size={24} className={isDark ? "text-[#4A4744]" : "text-gray-300"} />
                      <p className={`mt-3 text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No services added to this combo yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {comboForm.services.map((service, index) => (
                        <div key={index} className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                          isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-white border-[#E8E1D8]"
                        }`}>
                          <div className="relative flex-1">
                            <select
                              required
                              value={service.serviceId}
                              onChange={(e) => handleComboServiceChange(index, e.target.value)}
                              className={`w-full appearance-none rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                                isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                              }`}
                            >
                              <option value="" disabled>Select service</option>
                              {getComboOptionsForRow(index).map((comboOption) => (
                                <option key={comboOption.id} value={comboOption.id}>
                                  {comboOption.name} (₹{comboOption.price}, {comboOption.duration}m)
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className={`absolute right-3 top-2.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveComboServiceRow(index)}
                            className={`rounded-lg p-1.5 transition-all ${isDark ? "text-[#F87171] hover:bg-red-500/10" : "text-red-400 hover:text-red-600 hover:bg-red-50"}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex justify-end gap-3 p-6 transition-all ${
                isDark ? "bg-[#1C2030] border-t border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-t border-[#E8E1D8]"
              }`}>
                <button type="button" onClick={closeComboModal} className={`rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                  isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.1)]" : "bg-white border border-[#E8E1D8] text-gray-600 hover:bg-gray-100"
                }`}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`rounded-full px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                  isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.15)] hover:bg-[#744A2E]"
                }`}>
                  {isSubmitting ? "Syncing..." : editingComboService ? "Update Combo" : "Finalize Combo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
