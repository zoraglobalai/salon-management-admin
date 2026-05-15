import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  type ComboServiceItem,
  createSaleDraft,
  fetchClients,
  fetchInventory,
  fetchSaleById,
  fetchStaff,
  fetchServices,
  updateSaleDraft,
  type ClientRecord,
  type InventoryItem,
  type SaleDraftInput,
  type ServiceItem,
  type StaffMember,
} from "../../../core/api";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useAuth } from "../../auth/hooks/useAuth";
import { ArrowLeft, ChevronDown, MapPin, Package, Receipt, Save, Scissors, Search, User } from "lucide-react";

type LocationOption = { id: string; name: string; city?: string };

type DraftSingleService = {
  kind: "service";
  serviceId: string;
  serviceName?: string;
  staffId: string;
};

type DraftComboService = {
  kind: "combo";
  comboServiceId: string;
  comboName: string;
  comboPrice: number;
  services: Array<{
    serviceId: string;
    serviceName: string;
    staffId: string;
  }>;
};

type DraftLineService = DraftSingleService | DraftComboService;

type DraftLineProduct = {
  productId: string;
  quantity: number;
};

export function DashboardSalesPOSEditPage() {
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId: string }>();
  const isEditing = Boolean(draftId);
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();
  const { user } = useAuth();
  const { ownerLocations } = useOutletContext<{ ownerLocations?: LocationOption[] }>() || {};

  const isManager = user?.role === "MANAGER";
  const locations = ownerLocations || [];
  const defaultLocationId = useMemo(() => {
    if (isManager) return user?.branchId || "";
    return locations[0]?.id || "";
  }, [isManager, locations, user?.branchId]);

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [comboServices, setComboServices] = useState<ComboServiceItem[]>([]);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId || null);

  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [foundClient, setFoundClient] = useState<ClientRecord | null>(null);
  const [suggestions, setSuggestions] = useState<ClientRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedServices, setSelectedServices] = useState<DraftLineService[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<DraftLineProduct[]>([]);

  const serviceMap = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
  const productMap = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);
  const selectedServiceIds = useMemo(
    () =>
      new Set(
        selectedServices.flatMap((item) =>
          item.kind === "combo" ? item.services.map((service) => service.serviceId) : [item.serviceId],
        ),
      ),
    [selectedServices],
  );
  const selectedProductIds = useMemo(() => new Set(selectedProducts.map((item) => item.productId)), [selectedProducts]);
  const availableServices = useMemo(
    () => services.filter((service) => !selectedServiceIds.has(service.id)),
    [selectedServiceIds, services],
  );
  const availableComboServices = useMemo(
    () =>
      comboServices.filter((combo) =>
        combo.services.every((service) => !selectedServiceIds.has(service.serviceId)),
      ),
    [comboServices, selectedServiceIds],
  );
  const availableProducts = useMemo(
    () => products.filter((product) => !selectedProductIds.has(product.id)),
    [products, selectedProductIds],
  );

  const selectedServiceRows = useMemo(
    () =>
      selectedServices.map((item, index) => {
        if (item.kind === "combo") {
          return {
            index,
            ...item,
            services: item.services.map((service) => ({
              ...service,
              serviceName: serviceMap.get(service.serviceId)?.name || service.serviceName,
            })),
          };
        }

        return {
          index,
          ...item,
          serviceName: serviceMap.get(item.serviceId)?.name || item.serviceName || "Unknown service",
        };
      }),
    [selectedServices, serviceMap],
  );

  const selectedProductRows = selectedProducts
    .map((item, index) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      return { index, ...item, name: product.name };
    })
    .filter(Boolean) as Array<DraftLineProduct & { index: number; name: string }>;

  useEffect(() => {
    if (!defaultLocationId) {
      setIsLoading(false);
      return;
    }

    setSelectedLocationId((current) => current || defaultLocationId);
  }, [defaultLocationId]);

  useEffect(() => {
    if (!selectedLocationId) return;

    setIsLoading(true);
    Promise.all([fetchServices(selectedLocationId), fetchInventory(selectedLocationId), fetchStaff(selectedLocationId)])
      .then(([servicesResponse, inventoryResponse, staffResponse]) => {
        setServices(servicesResponse.services || []);
        setComboServices(servicesResponse.comboServices || []);
        setProducts(inventoryResponse.items || []);
        setStaff(staffResponse.staff || []);
      })
      .catch((error: Error) => toast(error.message || "Unable to load sale setup", "error"))
      .finally(() => setIsLoading(false));
  }, [selectedLocationId, toast]);

  useEffect(() => {
    if (!selectedLocationId) return;

    const searchTerm = phone.trim() || clientName.trim();
    if (searchTerm.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      fetchClients(selectedLocationId, { search: searchTerm })
        .then((response) => {
          const matches = response.clients || [];
          setSuggestions(matches);

          const normalizedPhone = phone.replace(/\D/g, "");
          const exactPhoneMatch = normalizedPhone
            ? matches.find((client) => (client.phoneNumber || "").replace(/\D/g, "") === normalizedPhone)
            : null;

          if (exactPhoneMatch) {
            setFoundClient(exactPhoneMatch);
            setClientName(exactPhoneMatch.name);
            setShowSuggestions(false);
            return;
          }

          setShowSuggestions(matches.length > 0);
        })
        .catch(() => {
          setSuggestions([]);
          setShowSuggestions(false);
        });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [clientName, phone, selectedLocationId]);

  useEffect(() => {
    if (!draftId) return;

    setIsLoading(true);
    fetchSaleById(draftId)
      .then((response) => {
        const sale = response.sale;
        const saleLocationId = sale.locationId || sale.location_id || defaultLocationId;

        setActiveDraftId(draftId);
        setSelectedLocationId(saleLocationId || "");
        setPhone((sale.client_phone || sale.clientPhone || "").replace(/\D/g, "").slice(0, 10));
        setClientName(sale.client_name || sale.clientName || "");
        setFoundClient(null);
        const groupedComboServices = new Map<string, DraftComboService>();
        const nextSelectedServices: DraftLineService[] = [];

        (sale.services || []).forEach((item) => {
          const serviceId = String(item.service_id || item.id);
          const serviceName = item.service_name || "Unknown service";
          const comboServiceId = item.combo_service_id || "";
          const comboServiceName = item.combo_service_name || "";
          const comboTotalPrice = Number(item.combo_total_price || 0);

          if (comboServiceId) {
            const existingCombo = groupedComboServices.get(comboServiceId);
            const comboService = existingCombo || {
              kind: "combo" as const,
              comboServiceId,
              comboName: comboServiceName || "Combo",
              comboPrice: comboTotalPrice,
              services: [],
            };

            comboService.services.push({
              serviceId,
              serviceName,
              staffId: item.staff_id || "",
            });

            if (!existingCombo) {
              groupedComboServices.set(comboServiceId, comboService);
              nextSelectedServices.push(comboService);
            }
            return;
          }

          nextSelectedServices.push({
            kind: "service",
            serviceId,
            serviceName,
            staffId: item.staff_id || "",
          });
        });

        setSelectedServices(nextSelectedServices);
        setSelectedProducts(
          (sale.products || []).map((item) => ({
            productId: String(item.product_id || item.id),
            quantity: Number(item.quantity || 1),
          })),
        );
      })
      .catch((error: Error) => {
        toast(error.message || "Unable to load draft", "error");
        navigate("/dashboard/sales/pos");
      })
      .finally(() => setIsLoading(false));
  }, [defaultLocationId, draftId, navigate, toast]);

  function validateClient() {
    if (!phone || phone.length < 10) {
      toast("Enter a valid client contact number", "error");
      return false;
    }

    if (!clientName.trim()) {
      toast("Enter the client name", "error");
      return false;
    }

    if (selectedServices.length === 0 && selectedProducts.length === 0) {
      toast("Add at least one service or inventory item", "error");
      return false;
    }

    return true;
  }

  function selectClient(client: ClientRecord) {
    setFoundClient(client);
    setPhone((client.phoneNumber || "").replace(/\D/g, "").slice(0, 10));
    setClientName(client.name);
    setShowSuggestions(false);
  }

  function handleAddService(serviceId: string) {
    if (!serviceId) return;
    if (serviceId.startsWith("combo:")) {
      const comboId = serviceId.replace("combo:", "");
      const combo = comboServices.find((item) => item.id === comboId);
      if (!combo) return;

      setSelectedServices((current) => [
        ...current,
        {
          kind: "combo",
          comboServiceId: combo.id,
          comboName: combo.name,
          comboPrice: Number(combo.price || 0),
          services: combo.services.map((service) => ({
            serviceId: service.serviceId,
            serviceName: service.serviceName,
            staffId: "",
          })),
        },
      ]);
      return;
    }

    const service = serviceMap.get(serviceId);
    setSelectedServices((current) => [
      ...current,
      { kind: "service", serviceId, serviceName: service?.name, staffId: "" },
    ]);
  }

  function handleAddProduct(productId: string) {
    if (!productId) return;

    setSelectedProducts((current) => {
      const existingIndex = current.findIndex((item) => item.productId === productId);
      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { productId, quantity: 1 }];
    });
  }

  const draftPayload: SaleDraftInput = useMemo(
    () => ({
      phoneNumber: phone,
      clientName: clientName.trim(),
      locationId: selectedLocationId,
      services: selectedServices.map((item) =>
        item.kind === "combo"
          ? {
              comboServiceId: item.comboServiceId,
              services: item.services.map((service) => ({
                serviceId: service.serviceId,
                staffId: service.staffId || undefined,
              })),
            }
          : {
              serviceId: item.serviceId,
              staffId: item.staffId || undefined,
            },
      ),
      products: selectedProducts.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      discount: 0,
      discountType: "flat",
    }),
    [clientName, phone, selectedLocationId, selectedProducts, selectedServices],
  );

  async function persistDraft() {
    if (!validateClient()) return null;

    if (activeDraftId) {
      await updateSaleDraft(activeDraftId, draftPayload);
      return activeDraftId;
    }

    const response = await createSaleDraft(draftPayload);
    setActiveDraftId(response.saleId);
    return response.saleId;
  }

  async function handleSaveDraft() {
    setIsSaving(true);

    try {
      await persistDraft();
      toast(activeDraftId ? "Sale draft updated" : "Sale draft saved");
      navigate("/dashboard/sales/pos");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save draft", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoveToCheckout() {
    setIsSaving(true);

    try {
      const savedDraftId = await persistDraft();
      if (!savedDraftId) return;
      toast("Draft saved. Continue in checkout.");
      navigate(`/dashboard/sales/pos/${savedDraftId}/checkout`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to continue to checkout", "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (!defaultLocationId) {
    return (
      <div className={`flex h-96 items-center justify-center text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
        Configuration Error: no active location found.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex h-96 items-center justify-center text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
        Loading sale editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        className={`rounded-[32px] border p-6 shadow-sm transition-all ${
          isDark ? "border-[rgba(255,255,255,0.07)] bg-[#151821]" : "border-[#E8E1D8] bg-white"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/sales/pos"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                isDark ? "bg-[#1C2030] text-[#F0EBE3]" : "bg-[#FBF9F6] text-[#8B5E3C]"
              }`}
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h2 className={`text-xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                {isEditing ? "Edit Sale Draft" : "New Sale"}
              </h2>
              {/* <p className={`text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                Choose saved services and inventory here. Prices stay hidden until the checkout page.
              </p> */}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {!isManager && locations.length > 1 && (
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Branch</label>
              <div className="relative">
                <select
                  value={selectedLocationId}
                  onChange={(event) => setSelectedLocationId(event.target.value)}
                  disabled={isEditing}
                  className={`w-full appearance-none rounded-2xl border px-4 py-3 pr-10 text-sm font-bold outline-none disabled:opacity-60 ${
                    isDark
                      ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#F0EBE3] [color-scheme:dark]"
                      : "border-[#E8E1D8] bg-gray-50 text-gray-900 [color-scheme:light]"
                  }`}
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.city || location.name}
                    </option>
                  ))}
                </select>
                <MapPin size={14} className={`pointer-events-none absolute right-4 top-4 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Contact Number</label>
            <div className="relative">
              <Search size={16} className={`absolute left-4 top-4 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
              <input
                type="text"
                value={phone}
                maxLength={10}
                onChange={(event) => {
                  setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                  setFoundClient(null);
                }}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Enter phone number"
                className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm font-bold outline-none ${
                  isDark
                    ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#F0EBE3] placeholder:text-[#4A4744]"
                    : "border-[#E8E1D8] bg-gray-50 text-gray-900"
                }`}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className={`absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border shadow-2xl ${
                    isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030]" : "border-[#E8E1D8] bg-white"
                  }`}
                >
                  {suggestions.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => selectClient(client)}
                      className={`w-full border-b px-4 py-3 text-left last:border-b-0 ${
                        isDark
                          ? "border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.04)]"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{client.name}</div>
                      <div className={`text-[10px] font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{client.phoneNumber}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Client Name</label>
            <div className="relative">
              <input
                type="text"
                value={clientName}
                onChange={(event) => {
                  setClientName(event.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 35));
                  setFoundClient(null);
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                disabled={!!foundClient}
                placeholder="Enter client name"
                className={`w-full rounded-2xl border px-4 py-3 pr-10 text-sm font-bold outline-none ${
                  isDark
                    ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#F0EBE3] disabled:opacity-60"
                    : "border-[#E8E1D8] bg-gray-50 text-gray-900 disabled:bg-gray-100"
                }`}
              />
              <User size={16} className={`pointer-events-none absolute right-4 top-4 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <article
          className={`rounded-[32px] border p-6 shadow-sm ${
            isDark ? "border-[rgba(255,255,255,0.07)] bg-[#151821]" : "border-[#E8E1D8] bg-white"
          }`}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"}`}>
              <Scissors size={18} />
            </div>
            <div>
              <h3 className={`text-lg font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Build Sale</h3>
              {/* <p className={`text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Add service lines and inventory lines from saved master data.</p> */}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Choose Service</label>
              <select
                defaultValue=""
                onChange={(event) => {
                  handleAddService(event.target.value);
                  event.target.value = "";
                }}
                className={`w-full appearance-none rounded-2xl border px-4 py-3 text-sm font-bold ${
                  isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#F0EBE3] [color-scheme:dark]" : "border-[#E8E1D8] bg-gray-50 text-gray-900 [color-scheme:light]"
                }`}
              >
                <option value="">Choose a service</option>
                {availableServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
                {availableComboServices.map((combo) => (
                  <option key={`combo-${combo.id}`} value={`combo:${combo.id}`}>
                    {combo.name} (Combo)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Choose Inventory</label>
              <select
                defaultValue=""
                onChange={(event) => {
                  handleAddProduct(event.target.value);
                  event.target.value = "";
                }}
                className={`w-full appearance-none rounded-2xl border px-4 py-3 text-sm font-bold ${
                  isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#F0EBE3] [color-scheme:dark]" : "border-[#E8E1D8] bg-gray-50 text-gray-900 [color-scheme:light]"
                }`}
              >
                <option value="">Choose inventory</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Selected Services</h4>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{selectedServices.length}</span>
              </div>
              <div className="space-y-3">
                {selectedServiceRows.length === 0 && <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>No services added yet.</p>}
                {selectedServiceRows.map((item) => (
                  <div
                    key={`${item.kind === "combo" ? item.comboServiceId : item.serviceId}-${item.index}`}
                    className={`rounded-2xl border p-3 ${isDark ? "border-[rgba(255,255,255,0.05)] bg-[#151821]" : "border-white bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 w-full">
                        {item.kind === "combo" ? (
                          <div className="space-y-3 w-full pr-4">
                            <div className="space-y-1">
                              <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{item.comboName} (Combo)</div>
                              <div className={`text-[11px] font-bold ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Combo price Rs.{Number(item.comboPrice || 0).toFixed(0)}</div>
                            </div>
                            <div className="space-y-3 border-t pt-3 mt-2 border-dashed border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)]">
                              {item.services.map((service, serviceIndex) => (
                                <div key={`${service.serviceId}-${serviceIndex}`} className="space-y-2">
                                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                                    {service.serviceName}
                                  </div>
                                  <div className="relative w-fit mt-1">
                                    <select
                                      value={service.staffId}
                                      onChange={(event) =>
                                        setSelectedServices((current) =>
                                          current.map((row, index) =>
                                            index !== item.index || row.kind !== "combo"
                                              ? row
                                              : {
                                                  ...row,
                                                  services: row.services.map((serviceRow, rowIndex) =>
                                                    rowIndex === serviceIndex ? { ...serviceRow, staffId: event.target.value } : serviceRow,
                                                  ),
                                                },
                                          ),
                                        )
                                      }
                                      className={`appearance-none rounded-xl border px-3 py-1.5 pr-8 text-xs font-bold outline-none min-w-[120px] ${
                                        isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#F0EBE3] [color-scheme:dark]" : "border-[#E8E1D8] bg-transparent text-gray-900 [color-scheme:light]"
                                      }`}
                                    >
                                      <option value="">Assign staff</option>
                                      {staff.map((member) => (
                                        <option key={member.id} value={member.id}>
                                          {member.name}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown size={14} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 w-full pr-4">
                            <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{item.serviceName}</div>
                            <div className="relative w-fit">
                              <select
                                value={item.staffId}
                                onChange={(event) =>
                                  setSelectedServices((current) =>
                                    current.map((row, index) =>
                                      index === item.index && row.kind === "service" ? { ...row, staffId: event.target.value } : row,
                                    ),
                                  )
                                }
                                className={`appearance-none rounded-xl border px-3 py-1.5 pr-8 text-xs font-bold outline-none min-w-[120px] ${
                                  isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#F0EBE3] [color-scheme:dark]" : "border-[#E8E1D8] bg-transparent text-gray-900 [color-scheme:light]"
                                }`}
                              >
                                <option value="">Assign staff</option>
                                {staff.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedServices((current) => current.filter((_, index) => index !== item.index))}
                        className={`text-[10px] pt-1 font-black uppercase tracking-widest flex-shrink-0 ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Selected Inventory</h4>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{selectedProductRows.length}</span>
              </div>
              <div className="space-y-3">
                {selectedProductRows.length === 0 && <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>No inventory added yet.</p>}
                {selectedProductRows.map((item) => (
                  <div key={`${item.productId}-${item.index}`} className={`rounded-2xl border p-3 ${isDark ? "border-[rgba(255,255,255,0.05)] bg-[#151821]" : "border-white bg-white"}`}>
                    <div className="space-y-3">
                      <div>
                        <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{item.name}</div>
                        <div className={`text-xs ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Quantity: {item.quantity}</div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProducts((current) =>
                              current
                                .map((row, index) => (index === item.index ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row))
                                .filter((_, index) => index !== item.index || item.quantity > 1),
                            )
                          }
                          className={`rounded-xl px-3 py-1 text-sm font-black ${isDark ? "bg-[#1C2030] text-[#F0EBE3]" : "bg-gray-100 text-gray-800"}`}
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProducts((current) =>
                              current.map((row, index) => (index === item.index ? { ...row, quantity: row.quantity + 1 } : row)),
                            )
                          }
                          className={`rounded-xl px-3 py-1 text-sm font-black ${isDark ? "bg-[#1C2030] text-[#F0EBE3]" : "bg-gray-100 text-gray-800"}`}
                        >
                          +
                        </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedProducts((current) => current.filter((_, index) => index !== item.index))}
                          className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`mt-6 border-t pt-6 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#F2EDE7]"}`}>
            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Pricing</div>
              <div className={`mt-2 text-sm font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>
                Combo package price is shown on its card. Final bill is shown at checkout.
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[24px] px-6 py-4 text-xs font-black uppercase tracking-[0.25em] ${
                isDark ? "bg-[#1C2030] text-[#F0EBE3]" : "bg-[#F5EFE8] text-[#8B5E3C]"
              }`}
            >
              <Save size={16} />
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={handleMoveToCheckout}
              disabled={isSaving}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[24px] px-6 py-4 text-xs font-black uppercase tracking-[0.25em] ${
                isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[#8B5E3C] text-white"
              }`}
            >
              <Receipt size={16} />
              Checkout
            </button>
          </div>
        </article>

        <article
          className={`rounded-[32px] border p-6 shadow-sm ${
            isDark ? "border-[rgba(255,255,255,0.07)] bg-[#151821]" : "border-[#E8E1D8] bg-white"
          }`}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"}`}>
              <Package size={18} />
            </div>
            <div>
              <h3 className={`text-lg font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Workflow Summary</h3>
              {/* <p className={`text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Keep selection simple here, then review money and payment later.</p> */}
            </div>
          </div>

          <div className="space-y-4">
            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Client</div>
              <div className={`mt-2 text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{clientName || "No client selected"}</div>
              <div className={`text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{phone || "No phone number"}</div>
            </div>

            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>Services selected</span>
                <span className={`text-lg font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>{selectedServices.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-sm font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>Inventory selected</span>
                <span className={`text-lg font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>{selectedProductRows.length}</span>
              </div>
            </div>

            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Next Step</div>
              <p className={`mt-2 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>
                Checkout is where staff assignment, total amount, and payment method are confirmed.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
