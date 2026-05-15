  import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchInventory,
  fetchSaleById,
  fetchStaff,
  fetchServices,
  finalizeSaleDraft,
  type InventoryItem,
  type SaleCheckoutInput,
  type ServiceItem,
  type StaffMember,
} from "../../../core/api";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { ArrowLeft, Banknote, ChevronDown, CreditCard, FileText, Info, Smartphone } from "lucide-react";

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

const paymentOptions = [
  { id: "CASH" as const, label: "Cash", icon: Banknote },
  { id: "CARD" as const, label: "Card", icon: CreditCard },
  { id: "UPI" as const, label: "UPI", icon: Smartphone },
];

function formatCurrency(value: number) {
  return `Rs.${Number(value || 0).toFixed(0)}`;
}

export function DashboardSalesPOSCheckoutPage() {
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId: string }>();
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { toast } = useNotifications();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedServices, setSelectedServices] = useState<DraftLineService[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<DraftLineProduct[]>([]);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountInput, setDiscountInput] = useState("");
  const [discountInputType, setDiscountInputType] = useState<"flat" | "percent">("flat");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [staffAssignmentError, setStaffAssignmentError] = useState(false);

  const serviceMap = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
  const productMap = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);

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

        const service = serviceMap.get(item.serviceId);
        return {
          index,
          ...item,
          serviceName: service?.name || item.serviceName || "Unknown service",
          price: Number(service?.price || 0),
        };
      }),
    [selectedServices, serviceMap],
  );

  const selectedProductRows = selectedProducts
    .map((item, index) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      return {
        index,
        ...item,
        name: product.name,
        price: Number(product.costPrice),
      };
    })
    .filter(Boolean) as Array<DraftLineProduct & { index: number; name: string; price: number }>;

  const subtotal = useMemo(() => {
    const serviceTotal = selectedServiceRows.reduce(
      (sum, item) => sum + (item.kind === "combo" ? Number(item.comboPrice || 0) : item.price),
      0,
    );
    const productTotal = selectedProductRows.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return serviceTotal + productTotal;
  }, [selectedProductRows, selectedServiceRows]);

  const discountAmount = useMemo(() => {
    const safeValue = Number(discountValue || 0);
    if (discountType === "percent") {
      return (subtotal * safeValue) / 100;
    }
    return safeValue;
  }, [discountType, discountValue, subtotal]);

  const totalAmount = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (!draftId) {
      navigate("/dashboard/sales/pos");
      return;
    }

    setIsLoading(true);
    fetchSaleById(draftId)
      .then(async (response) => {
        const sale = response.sale;
        const locationId = sale.locationId || sale.location_id || "";

        setPhone((sale.client_phone || sale.clientPhone || "").replace(/\D/g, "").slice(0, 10));
        setClientName(sale.client_name || sale.clientName || "");
        setSelectedLocationId(locationId);
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
        const fetchedDiscount = Number(sale.discount || 0);
        setDiscountValue(fetchedDiscount);
        const fetchedDiscountType = sale.discountType === "percent" ? "percent" : "flat";
        setDiscountType(fetchedDiscountType);
        if (fetchedDiscount > 0) {
          setDiscountInput(String(fetchedDiscount));
          setDiscountInputType(fetchedDiscountType);
        }
        setPaymentMethod((sale.paymentMethod as "CASH" | "UPI" | "CARD") || "CASH");

        const [servicesResponse, inventoryResponse, staffResponse] = await Promise.all([
          fetchServices(locationId),
          fetchInventory(locationId),
          fetchStaff(locationId),
        ]);

        setServices(servicesResponse.services || []);
        setProducts(inventoryResponse.items || []);
        setStaff(staffResponse.staff || []);
      })
      .catch((error: Error) => {
        toast(error.message || "Unable to load checkout", "error");
        navigate("/dashboard/sales/pos");
      })
      .finally(() => setIsLoading(false));
  }, [draftId, navigate, toast]);

  useEffect(() => {
    const hasMissingStaff = selectedServices.some((item) =>
      item.kind === "combo" ? item.services.some((service) => !service.staffId) : !item.staffId,
    );
    if (!hasMissingStaff && staffAssignmentError) {
      setStaffAssignmentError(false);
    }
  }, [selectedServices, staffAssignmentError]);

  async function handleGenerateSettlement() {
    if (!draftId) return;

    const hasMissingStaff = selectedServices.some((item) =>
      item.kind === "combo" ? item.services.some((service) => !service.staffId) : !item.staffId,
    );

    if (hasMissingStaff) {
      setStaffAssignmentError(true);
      return;
    }
    setStaffAssignmentError(false);

    setIsSaving(true);

    try {
      const payload: SaleCheckoutInput = {
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
        discount: Number(discountValue || 0),
        discountType,
        paymentMethod,
        paidAmount: totalAmount,
        ...(referenceNumber.trim() ? { referenceNumber: referenceNumber.trim() } : {}),
      } as any;

      await finalizeSaleDraft(draftId, payload);
      toast("Settlement generated and moved to sales history");
      navigate("/dashboard/sales/history");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to complete settlement", "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className={`flex h-96 items-center justify-center text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
        Loading checkout...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        className={`rounded-[32px] border p-6 shadow-sm ${
          isDark ? "border-[rgba(255,255,255,0.07)] bg-[#151821]" : "border-[#E8E1D8] bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <Link
            to={draftId ? `/dashboard/sales/pos/${draftId}/edit` : "/dashboard/sales/pos"}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
              isDark ? "bg-[#1C2030] text-[#F0EBE3]" : "bg-[#FBF9F6] text-[#8B5E3C]"
            }`}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className={`text-xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Checkout</h2>
            <p className={`text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
              Review amount here, assign staff, choose payment, and complete the sale.
            </p>
          </div>
        </div>
      </section>

      <section
        className={`rounded-[32px] border p-6 shadow-sm ${
          isDark ? "border-[rgba(255,255,255,0.07)] bg-[#151821]" : "border-[#E8E1D8] bg-white"
        }`}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"}`}>
            <FileText size={18} />
          </div>
          <div>
            <h3 className={`text-lg font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Invoice Review</h3>
            <p className={`text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>This is the only step where the amount is visible.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Client</div>
              <div className={`mt-2 text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{clientName}</div>
              <div className={`text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{phone}</div>
            </div>

            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <h4 className={`mb-3 text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Services</h4>
              <div className="space-y-3">
                {selectedServiceRows.length === 0 && <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>No services selected.</p>}
                {selectedServiceRows.map((item) => (
                  <div
                    key={`checkout-${item.kind === "combo" ? item.comboServiceId : item.serviceId}-${item.index}`}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                        {item.kind === "combo" ? `${item.comboName} (Combo)` : item.serviceName}
                      </span>
                      <span className={`text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>
                        {formatCurrency(item.kind === "combo" ? item.comboPrice : item.price)}
                      </span>
                    </div>

                    {item.kind === "combo" ? (
                      <div className="space-y-3">
                        <div className={`text-xs ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>
                          Includes: {item.services.map((service) => service.serviceName).join(", ")}
                        </div>
                        {item.services.map((service, serviceIndex) => (
                          <div key={`${service.serviceId}-${serviceIndex}`} className="space-y-1">
                            <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                              {service.serviceName}
                            </div>
                            <div className={`text-xs font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                              {staff.find((m) => m.id === service.staffId)?.name || "Staff not assigned"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-xs font-bold mt-1 ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                        {staff.find((m) => m.id === item.staffId)?.name || "Staff not assigned"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {staffAssignmentError && (
                <p className="mt-3 text-xs font-semibold text-red-500">
                  Assign staff for every selected service before checkout.
                </p>
              )}
            </div>

            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <h4 className={`mb-3 text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Inventory</h4>
              <div className="space-y-3">
                {selectedProductRows.length === 0 && <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>No inventory selected.</p>}
                {selectedProductRows.map((item) => (
                  <div key={`product-${item.productId}-${item.index}`} className="flex items-center justify-between gap-3">
                    <span className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{item.name} x {item.quantity}</span>
                    <span className={`text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>Subtotal</span>
                <span className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{formatCurrency(subtotal)}</span>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>Discount</span>
                  <span className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>- {formatCurrency(discountAmount)}</span>
                </div>
                <div className="mt-1">
                  <div className="flex gap-2">
                    <div className={`flex flex-1 items-center rounded-xl border ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#151821]" : "border-[#E8E1D8] bg-white"} overflow-hidden`}>
                      <div className={`relative border-r ${isDark ? "border-[rgba(255,255,255,0.08)]" : "border-[#E8E1D8]"}`}>
                        <select
                          value={discountInputType}
                          onChange={(e) => setDiscountInputType(e.target.value as "flat" | "percent")}
                          className={`appearance-none bg-transparent pl-3 pr-6 py-2.5 text-sm font-bold outline-none ${
                            isDark ? "text-[#C8BFB4] [color-scheme:dark]" : "text-gray-600 [color-scheme:light]"
                          }`}
                        >
                          <option value="flat">Rs.</option>
                          <option value="percent">%</option>
                        </select>
                        <ChevronDown size={14} className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 ${isDark ? "text-[#C8BFB4]" : "text-gray-500"}`} />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value.replace(/\D/g, ""))}
                        placeholder="Enter discount"
                        className={`w-full bg-transparent px-3 py-2.5 text-sm font-bold outline-none ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountValue(Number(discountInput));
                        setDiscountType(discountInputType);
                      }}
                      className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
                        isDark 
                          ? "bg-[#C9A96E] text-[#0F1115] hover:bg-[#B39359]" 
                          : "bg-[#C9A96E] text-white hover:bg-[#B39359]"
                      }`}
                    >
                      Apply
                    </button>
                  </div>
                  <p className={`mt-2 text-[10px] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Enter amount and click Apply</p>
                </div>
              </div>
              <div className={`mt-4 flex items-center justify-between border-t pt-4 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
                <span className={`text-xs font-black uppercase tracking-[0.25em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Total Amount</span>
                <span className={`text-3xl font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div>
              <h4 className={`mb-3 text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Payment</h4>
              <div className="grid grid-cols-3 gap-3">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = paymentMethod === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPaymentMethod(option.id)}
                      className={`rounded-[20px] border p-4 transition-all ${
                        isActive
                          ? isDark
                            ? "border-[#C9A96E] bg-[rgba(201,169,110,0.1)] text-[#E8C98A]"
                            : "border-[#8B5E3C] bg-[#FBF3EA] text-[#8B5E3C]"
                          : isDark
                            ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030] text-[#7A7572]"
                            : "border-[#E8E1D8] bg-white text-gray-500"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Icon size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{option.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {paymentMethod === "UPI" && (
              <div className={`mt-6 rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
                <h4 className={`mb-4 text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>UPI Payment</h4>
                <div className="space-y-4">
                  <div>
                    <label className={`mb-2 block text-xs font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>
                      UPI Reference Number <Info size={12} className="inline ml-1" />
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter UPI reference number"
                      className={`w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none ${
                        isDark
                          ? "border-[rgba(255,255,255,0.08)] bg-[#151821] text-[#F0EBE3] placeholder:text-gray-600"
                          : "border-[#E8E1D8] bg-white text-gray-900 placeholder:text-gray-400"
                      }`}
                    />
                    <p className={`mt-2 text-[10px] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                      Enter the UPI transaction reference number / UTR.
                    </p>
                  </div>
                  <div className={`flex items-center justify-between border-t pt-4 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
                    <span className={`text-sm font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Amount Payable</span>
                    <span className={`text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "CARD" && (
              <div className={`mt-6 rounded-[24px] border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
                <h4 className={`mb-4 text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Card Payment</h4>
                <div className="space-y-4">
                  <div>
                    <label className={`mb-2 block text-xs font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>
                      Card Reference Number / Transaction ID <Info size={12} className="inline ml-1" />
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter card reference number / transaction ID"
                      className={`w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none ${
                        isDark
                          ? "border-[rgba(255,255,255,0.08)] bg-[#151821] text-[#F0EBE3] placeholder:text-gray-600"
                          : "border-[#E8E1D8] bg-white text-gray-900 placeholder:text-gray-400"
                      }`}
                    />
                    <p className={`mt-2 text-[10px] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                      Enter the card transaction ID / approval code.
                    </p>
                  </div>
                  <div className={`flex items-center justify-between border-t pt-4 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
                    <span className={`text-sm font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Amount Payable</span>
                    <span className={`text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateSettlement}
              disabled={isSaving}
              className={`mt-2 w-full rounded-[24px] px-6 py-4 text-xs font-black uppercase tracking-[0.25em] ${
                isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[#8B5E3C] text-white"
              }`}
            >
              {isSaving ? "Completing..." : "Complete Sale"}
            </button>

            {(paymentMethod === "UPI" || paymentMethod === "CARD") && (
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("CASH");
                  setReferenceNumber("");
                }}
                className={`mt-4 flex items-center justify-center gap-2 text-xs font-bold w-full ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}
              >
                <ArrowLeft size={14} /> Back to Payment Methods
              </button>
            )}

          </div>
        </div>
      </section>
    </div>
  );
}
