import { useEffect, useState } from "react";
import { Eye, MapPin, Pencil, Plus, X } from "lucide-react";
import { createPurchase, fetchInventory, fetchPurchaseById, fetchPurchases, fetchVendors, type InventoryItem, type PurchaseItemInput, type PurchaseRecord, type VendorRecord, updatePurchase } from "../../../core/api";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useOutletContext } from "react-router-dom";
import { useGlobalFilters } from "../../../shared/context/FilterContext";

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };

const EMPTY_ITEM: PurchaseItemInput = {
  productName: "",
  category: "",
  unit: "PCS",
  costPrice: 0,
  gst: 0,
  gstType: "AMOUNT",
  initialStock: 0,
  initialQuantity: 0,
  lowStockAlert: 5,
  serviceStock: 0,
  batchNumber: "",
};

const sanitizeDigitInput = (value: string, maxDigits: number) => value.replace(/\D/g, "").slice(0, maxDigits);
const parseDigitInput = (value: string, maxDigits: number) => {
  const sanitizedValue = sanitizeDigitInput(value, maxDigits);
  return sanitizedValue ? Number(sanitizedValue) : 0;
};
const normalizeWholeNumber = (value: number, maxDigits: number) => {
  const roundedValue = Math.max(0, Math.round(Number(value) || 0));
  return parseDigitInput(String(roundedValue), maxDigits);
};

export function DashboardPurchasePage() {
  const { user } = useAuth();
  const { theme } = useDashboardTheme();
  const { toast } = useNotifications();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const { filters, setFilters } = useGlobalFilters();
  const isDark = theme === "dark";
  const isManager = user?.role === "MANAGER";

  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    vendorId: "",
    locationId: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    invoiceNumber: "",
    paymentStatus: "PENDING",
    paymentMethod: "CASH",
    notes: "",
    items: [{ ...EMPTY_ITEM }],
  });

  const asInputValue = (value: number) => (value === 0 ? "" : String(value));
  const updateDigitItem = (index: number, field: keyof PurchaseItemInput, maxDigits: number, value: string) => {
    updateItem(index, { [field]: parseDigitInput(value, maxDigits) } as Partial<PurchaseItemInput>);
  };
  const vendorCategoryOptions = vendors
    .flatMap((vendor) =>
      (vendor.category || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    )
    .filter((entry, index, arr) => arr.indexOf(entry) === index);
  const activeLocationId = isManager ? user?.branchId : (filters.locationId === "all" ? undefined : filters.locationId);
  const productSuggestions = inventory
    .map((item) => item.name?.trim())
    .filter((name): name is string => Boolean(name))
    .filter((name, index, arr) => arr.findIndex((entry) => entry.toLowerCase() === name.toLowerCase()) === index);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      fetchPurchases(activeLocationId),
      fetchVendors({ status: "ACTIVE" }),
      fetchInventory(activeLocationId),
    ])
      .then(([purchaseRes, vendorRes, inventoryRes]) => {
        setPurchases(purchaseRes.purchases || []);
        setVendors(vendorRes.vendors || []);
        setInventory(inventoryRes.items || []);
        setError(null);
      })
      .catch((err: Error) => setError(err.message || "Failed to load purchases."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [filters.locationId, user?.branchId, isManager]);

  const openCreate = () => {
    setEditingPurchaseId(null);
    setForm({
      vendorId: "",
      locationId: isManager ? user?.branchId || "" : filters.locationId !== "all" ? filters.locationId : ownerLocations?.[0]?.id || "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      invoiceNumber: "",
      paymentStatus: "PENDING",
      paymentMethod: "CASH",
      notes: "",
      items: [{ ...EMPTY_ITEM }],
    });
    setIsModalOpen(true);
  };

  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, { ...EMPTY_ITEM }] }));
  const removeItem = (index: number) => setForm((current) => ({ ...current, items: current.items.filter((_, idx) => idx !== index) }));

  const updateItem = (index: number, patch: Partial<PurchaseItemInput>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedInvoiceNumber = sanitizeDigitInput(form.invoiceNumber, 15);
    const normalizedItems = form.items.map((item) => ({
      ...item,
      costPrice: normalizeWholeNumber(item.costPrice, 5),
      gst: normalizeWholeNumber(item.gst, 3),
      initialStock: normalizeWholeNumber(item.initialStock, 5),
      initialQuantity: normalizeWholeNumber(item.initialQuantity, 5),
      serviceStock: normalizeWholeNumber(item.serviceStock, 5),
    }));

    if (form.invoiceNumber !== normalizedInvoiceNumber) {
      toast("Invoice number must contain numbers only and can be up to 15 digits.", "error");
      return;
    }

    setForm((current) => ({
      ...current,
      invoiceNumber: normalizedInvoiceNumber,
      items: normalizedItems,
    }));

    setIsSubmitting(true);
    try {
      const payload = {
        vendorId: form.vendorId,
        locationId: isManager ? user?.branchId || "" : form.locationId,
        purchaseDate: form.purchaseDate,
        invoiceNumber: normalizedInvoiceNumber,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        items: normalizedItems,
      };
      if (editingPurchaseId) {
        await updatePurchase(editingPurchaseId, payload);
        toast("Purchase updated and inventory synced.");
      } else {
        await createPurchase(payload);
        toast("Purchase created and inventory updated.");
      }
      setIsModalOpen(false);
      setEditingPurchaseId(null);
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create purchase.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewDetails = async (purchaseId: string) => {
    try {
      const response = await fetchPurchaseById(purchaseId);
      setSelectedPurchase(response.purchase);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to load purchase details.", "error");
    }
  };

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-GB");
  };

  const openEdit = async (purchaseId: string) => {
    try {
      const response = await fetchPurchaseById(purchaseId);
      const purchase = response.purchase;
      setEditingPurchaseId(purchaseId);
      setForm({
        vendorId: purchase.vendorId,
        locationId: purchase.locationId,
        purchaseDate: purchase.purchaseDate,
        invoiceNumber: sanitizeDigitInput(purchase.invoiceNumber || "", 15),
        paymentStatus: purchase.paymentStatus,
        paymentMethod: purchase.paymentMethod,
        notes: purchase.notes || "",
        items: (purchase.items || []).map((item) => ({
          productName: item.productName,
          category: item.category,
          unit: item.unit.toUpperCase() as PurchaseItemInput["unit"],
          costPrice: normalizeWholeNumber(item.costPrice, 5),
          gst: normalizeWholeNumber(item.gst || 0, 3),
          gstType: item.gstType === "PERCENT" ? "PERCENT" : "AMOUNT",
          initialStock: normalizeWholeNumber(item.initialStock, 5),
          initialQuantity: normalizeWholeNumber(item.initialQuantity, 5),
          lowStockAlert: item.lowStockAlert,
          serviceStock: normalizeWholeNumber(item.serviceStock, 5),
          expiryDate: item.expiryDate || undefined,
          batchNumber: item.batchNumber || "",
        })),
      });
      setIsModalOpen(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to load purchase for edit.", "error");
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-5 h-full">
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
        <div>
          <h2 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Purchase Management</h2>
          <p className={`mt-1 text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Add purchases from vendors and auto-update inventory stock.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {!isManager && (
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
          <button onClick={openCreate} className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white ${isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)]" : "bg-[#8B5E3C] hover:bg-[#744A2E]"}`}>
            <Plus size={16} />
            Add Purchase
          </button>
        </div>
      </div>

      {error && <div className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)] text-[#F87171]" : "border-red-200 bg-red-50 text-red-700"}`}>{error}</div>}

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
        <div className="overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={isDark ? "bg-[#1C2030]" : "bg-gray-50/60"}>
                {["Date", "Vendor", "Invoice", "Payment", "Products Bought", "Stock", "Per Product Cost", "GST", "Total", "Location", "Actions"].map((head) => (
                  <th key={head} className={`p-4 text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={11} className={`p-8 text-center ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading purchases...</td></tr>}
              {!isLoading && purchases.map((purchase) => (
                <tr key={purchase.id} className={`border-t ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{formatDate(purchase.purchaseDate)}</td>
                  <td className={`p-4 font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{purchase.vendorName}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{purchase.invoiceNumber || "-"}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{purchase.paymentStatus} / {purchase.paymentMethod}</td>
                  <td className={`p-4 text-sm max-w-[280px] truncate ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`} title={purchase.productsBought || "-"}>
                    {purchase.productsBought || "-"}
                  </td>
                  <td className={`p-4 text-sm font-semibold ${isDark ? "text-[#C8BFB4]" : "text-gray-700"}`}>{Number(purchase.totalStock || 0).toFixed(2).replace(/\.00$/, "")}</td>
                  <td className={`p-4 text-sm font-semibold ${isDark ? "text-[#C8BFB4]" : "text-gray-700"}`}>Rs {Number(purchase.perProductCost || 0).toFixed(2)}</td>
                  <td className={`p-4 text-sm font-semibold ${isDark ? "text-[#C8BFB4]" : "text-gray-700"}`}>Rs {Number(purchase.perProductGst || 0).toFixed(2)}</td>
                  <td className={`p-4 font-bold ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>Rs {purchase.totalAmount.toFixed(2)}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{purchase.locationName}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => viewDetails(purchase.id)} className={`rounded-lg p-2 ${isDark ? "bg-[rgba(201,169,110,0.1)] text-[#C9A96E]" : "bg-blue-50 text-blue-700"}`}>
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(purchase.id)} className={`rounded-lg p-2 ${isDark ? "bg-[rgba(255,255,255,0.08)] text-[#C8BFB4]" : "bg-gray-100 text-gray-700"}`}>
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && purchases.length === 0 && <tr><td colSpan={11} className={`p-10 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No purchases yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className={`w-full max-w-5xl max-h-[92vh] overflow-y-auto scrollbar-hide rounded-[28px] border ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.08)]" : "bg-white border-[#E8E1D8]"}`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
              <h3 className={`text-xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{editingPurchaseId ? "Edit Purchase" : "Add Purchase"}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={18} className={isDark ? "text-[#7A7572]" : "text-gray-500"} /></button>
            </div>
            <form onSubmit={submit} className="grid gap-4 p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Vendor</label>
                  <select
                    required
                    value={form.vendorId}
                    onChange={(event) => {
                      const nextVendorId = event.target.value;
                      setForm((current) => ({
                        ...current,
                        vendorId: nextVendorId,
                        items: current.items.map((item) => ({
                          ...item,
                          category: vendorCategoryOptions.includes(item.category || "") ? item.category : (vendorCategoryOptions[0] || ""),
                        })),
                      }));
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.vendorName}</option>)}
                  </select>
                </div>
                {!isManager && (
                  <div>
                    <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Location</label>
                    <select required value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                      <option value="">Select Location</option>
                      {(ownerLocations || []).map((location) => <option key={location.id} value={location.id}>{location.city || location.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Purchase Date</label>
                  <input required type="date" value={form.purchaseDate} onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Invoice Number</label>
                  <input inputMode="numeric" maxLength={15} value={form.invoiceNumber} onChange={(event) => setForm((current) => ({ ...current, invoiceNumber: sanitizeDigitInput(event.target.value, 15) }))} placeholder="Enter Invoice Number" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Payment Status</label>
                  <select value={form.paymentStatus} onChange={(event) => setForm((current) => ({ ...current, paymentStatus: event.target.value }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                  </select>
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Payment Method</label>
                  <select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                    <option value="BANK">BANK</option>
                  </select>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030]" : "border-[#E8E1D8] bg-[#FBF9F6]"}`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className={`text-sm font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Purchase Items</p>
                  <button type="button" onClick={addItem} className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-[rgba(201,169,110,0.15)] text-[#E8C98A]" : "bg-[#F5EDE4] text-[#8B5E3C]"}`}>+ Add Item</button>
                </div>
                <div className="grid gap-3">
                  {form.items.map((item, index) => (
                    <div key={index} className={`rounded-xl border p-3 ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#151821]" : "border-[#E8E1D8] bg-white"}`}>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Product Name</label>
                          <input
                            required
                            list={`purchase-product-suggestions-${index}`}
                            value={item.productName}
                            onChange={(event) => {
                              const nextName = event.target.value;
                              const matchedInventory = inventory.find((inv) => inv.name.toLowerCase() === nextName.toLowerCase());
                              updateItem(index, {
                                productName: nextName,
                                unit: matchedInventory ? matchedInventory.unit.toUpperCase() as PurchaseItemInput["unit"] : item.unit,
                              });
                            }}
                            placeholder="Enter Product"
                            className={`w-full rounded-lg border px-3 py-2 text-xs ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`}
                          />
                          <datalist id={`purchase-product-suggestions-${index}`}>
                            {productSuggestions.map((name) => (
                              <option key={name} value={name} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Product Category</label>
                          <select
                            value={item.category || ""}
                            onChange={(event) => updateItem(index, { category: event.target.value })}
                            className={`w-full rounded-lg border px-3 py-2 text-xs ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`}
                          >
                            <option value="">{vendorCategoryOptions.length ? "Select Category" : "No Vendor Category Added"}</option>
                            {vendorCategoryOptions.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Product Unit</label>
                          <select value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value as PurchaseItemInput["unit"] })} className={`w-full rounded-lg border px-3 py-2 text-xs ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`}>
                            <option value="PCS">PCS</option><option value="ML">ML</option><option value="KG">KG</option><option value="Litre">Litre</option>
                          </select>
                        </div>
                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Cost Price</label>
                          <input type="text" inputMode="numeric" maxLength={5} value={asInputValue(item.costPrice)} onChange={(event) => updateDigitItem(index, "costPrice", 5, event.target.value)} placeholder="Enter Cost" className={`w-full rounded-lg border px-3 py-2 text-xs ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`} />
                        </div>
                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>GST</label>
                          <div className="grid grid-cols-[1fr_88px] gap-2">
                            <input type="text" inputMode="numeric" maxLength={3} value={asInputValue(item.gst)} onChange={(event) => updateDigitItem(index, "gst", 3, event.target.value)} placeholder="Enter GST" className={`w-full rounded-lg border px-3 py-2 text-xs ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`} />
                            <select
                              value={item.gstType || "AMOUNT"}
                              onChange={(event) => updateItem(index, { gstType: event.target.value as "AMOUNT" | "PERCENT" })}
                              className={`rounded-lg border px-2 py-2 text-xs font-semibold ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`}
                            >
                              <option value="AMOUNT">Rs</option>
                              <option value="PERCENT">%</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Initial Quantity</label>
                          <input type="text" inputMode="numeric" maxLength={5} value={asInputValue(item.initialQuantity)} onChange={(event) => updateDigitItem(index, "initialQuantity", 5, event.target.value)} placeholder="Enter Qty/Unit" className={`w-full rounded-lg border px-3 py-2 text-xs ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`} />
                        </div>
                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Initial Stock</label>
                          <input type="text" inputMode="numeric" maxLength={5} value={asInputValue(item.initialStock)} onChange={(event) => updateDigitItem(index, "initialStock", 5, event.target.value)} placeholder="Enter Stock" className={`w-full rounded-lg border px-3 py-2 text-xs ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`} />
                        </div>
                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Low Stock Alert</label>
                          <input type="number" min={0} step="0.01" value={asInputValue(item.lowStockAlert)} onChange={(event) => updateItem(index, { lowStockAlert: Number(event.target.value) })} placeholder="Enter Low Alert" className={`w-full rounded-lg border px-3 py-2 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`} />
                        </div>
                        <div>
                          <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Service Stock</label>
                          <div className="flex items-center gap-2">
                            <input type="text" inputMode="numeric" maxLength={5} value={asInputValue(item.serviceStock)} onChange={(event) => updateDigitItem(index, "serviceStock", 5, event.target.value)} placeholder="Enter Svc Stock" className={`w-full rounded-lg border px-3 py-2 text-xs ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-white border-[#E8E1D8]"}`} />
                            {form.items.length > 1 && <button type="button" onClick={() => removeItem(index)} className={`rounded-lg p-2 ${isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171]" : "bg-red-50 text-red-600"}`}><X size={12} /></button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Notes</label>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" rows={3} className={`w-full rounded-xl border px-4 py-3 text-sm ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingPurchaseId(null); }} className={`rounded-full px-5 py-2 text-sm font-semibold ${isDark ? "bg-[rgba(255,255,255,0.08)] text-[#C8BFB4]" : "bg-gray-100 text-gray-700"}`}>Cancel</button>
                <button disabled={isSubmitting} type="submit" className={`rounded-full px-5 py-2 text-sm font-semibold text-white ${isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)]" : "bg-[#8B5E3C]"}`}>{isSubmitting ? "Saving..." : editingPurchaseId ? "Update Purchase" : "Save Purchase"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPurchase && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[24px] border ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.08)]" : "bg-white border-[#E8E1D8]"}`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Purchase Details</h3>
                <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{selectedPurchase.vendorName} | {selectedPurchase.purchaseDate}</p>
              </div>
              <button onClick={() => setSelectedPurchase(null)}><X size={18} className={isDark ? "text-[#7A7572]" : "text-gray-500"} /></button>
            </div>
            <div className="p-6">
              <div className="grid gap-3 md:grid-cols-3">
                <div className={`rounded-xl border p-3 ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030]" : "border-[#E8E1D8] bg-gray-50/50"}`}><p className="text-xs opacity-70">Invoice</p><p className="font-semibold">{selectedPurchase.invoiceNumber || "-"}</p></div>
                <div className={`rounded-xl border p-3 ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030]" : "border-[#E8E1D8] bg-gray-50/50"}`}><p className="text-xs opacity-70">Payment</p><p className="font-semibold">{selectedPurchase.paymentStatus} / {selectedPurchase.paymentMethod}</p></div>
                <div className={`rounded-xl border p-3 ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030]" : "border-[#E8E1D8] bg-gray-50/50"}`}><p className="text-xs opacity-70">Total</p><p className="font-semibold">Rs {selectedPurchase.totalAmount.toFixed(2)}</p></div>
              </div>
              <div className="mt-5 space-y-2">
                {(selectedPurchase.items || []).map((item) => (
                  <div key={item.id} className={`rounded-xl border p-3 ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030]" : "border-[#E8E1D8] bg-gray-50/50"}`}>
                    <p className={`font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{item.productName}</p>
                    <p className={`text-xs ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{item.category || "-"} | {item.initialStock} {item.unit} | Cost Rs {item.costPrice}</p>
                  </div>
                ))}
                {(selectedPurchase.items || []).length === 0 && <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>No items.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
