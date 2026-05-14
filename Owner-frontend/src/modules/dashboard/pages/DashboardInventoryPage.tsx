import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  deleteInventoryItem,
  fetchInventory,
  type InventoryItem,
  updateInventoryItem,
  moveStockToService,
} from "../../../core/api";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";
import { Package, MapPin, ChevronDown, MoveHorizontal, Edit3, Trash2, AlertTriangle, X, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

type LocationOption = { id: string; name: string; city?: string };
type InventoryOutletContext = {
  ownerLocations?: LocationOption[];
  refreshLowStockAlerts?: () => void;
};

type InventoryFormState = {
  name: string;
  costPrice: string;
  unit: "ml" | "pcs";
  quantity: string;
  stock: string;
  lowStockThreshold: string;
  benefits: string;
  locationId: string;
};

const EMPTY_FORM: InventoryFormState = {
  name: "",
  costPrice: "",
  unit: "pcs",
  quantity: "",
  stock: "",
  lowStockThreshold: "5",
  benefits: "",
  locationId: "",
};

export function DashboardInventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useDashboardTheme();
  const { toast, confirm } = useNotifications();
  const isDark = theme === "dark";
  const { ownerLocations, refreshLowStockAlerts } = useOutletContext<InventoryOutletContext>() || {};
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<InventoryFormState>(EMPTY_FORM);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  
  const [isMoveStockModalOpen, setIsMoveStockModalOpen] = useState(false);
  const [movingStockItem, setMovingStockItem] = useState<InventoryItem | null>(null);
  const [moveQuantity, setMoveQuantity] = useState("");
  const [isMovingStock, setIsMovingStock] = useState(false);

  const { filters: globalFilters, setFilters } = useGlobalFilters();
  const isManager = user?.role === "MANAGER";
  const locationOptions = ownerLocations || [];
  const lowStockItems = useMemo(
    () => items.filter((item) => item.stock <= item.lowStockThreshold),
    [items],
  );

  const getDecimalInputValue = (value: string) =>
    value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  const formatWholeNumber = (value: number) => Math.round(Number(value) || 0).toLocaleString();


  const loadInventory = (locationId = globalFilters.locationId) => {
    setIsLoading(true);
    fetchInventory(isManager ? user?.branchId : locationId === "all" ? undefined : locationId)
      .then((response) => {
        setItems(response.items);
        setError(null);
        if (response.items.some((item) => item.stock <= item.lowStockThreshold)) {
          setIsLowStockModalOpen(true);
        }
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load inventory.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isManager && !user?.branchId) {
      return;
    }
    loadInventory();
  }, [globalFilters.locationId, user?.branchId, isManager]);

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      costPrice: String(item.costPrice),
      unit: item.unit,
      quantity: String(item.quantity),
      stock: String(item.stock),
      lowStockThreshold: String(item.lowStockThreshold),
      benefits: item.benefits,
      locationId: item.locationId,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name,
        costPrice: Number(form.costPrice),
        unit: form.unit,
        quantity: Number(form.quantity),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        benefits: form.benefits,
        locationId: isManager ? user?.branchId || "" : form.locationId,
      };

      if (editingItem) {
        const response = await updateInventoryItem(editingItem.id, payload);
        setItems((current) => current.map((item) => item.id === editingItem.id ? response.item : item));
      } else {
        throw new Error("Manual product creation is disabled. Add products from Purchase.");
      }

      setError(null);
      if (refreshLowStockAlerts) {
        refreshLowStockAlerts();
      }
      closeModal();
      loadInventory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save inventory item.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (item: InventoryItem) => {
    confirm({
      title: "Delete Item",
      message: `Are you sure you want to delete ${item.name} from inventory? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteInventoryItem(item.id);
          setItems((current) => current.filter((entry) => entry.id !== item.id));
          setError(null);
          if (refreshLowStockAlerts) refreshLowStockAlerts();
          toast("Item deleted from inventory.");
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to delete item.";
          setError(errorMessage);
          toast(errorMessage, "error");
        }
      }
    });
  };

  const openMoveStockModal = (item: InventoryItem) => {
    setMovingStockItem(item);
    setMoveQuantity("");
    setIsMoveStockModalOpen(true);
  };

  const handleMoveStock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!movingStockItem || !moveQuantity) return;

    const quantity = Number(moveQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast("Enter a valid quantity to move.", "error");
      return;
    }

    if (quantity > Number(movingStockItem.stock)) {
      toast(`Quantity cannot exceed ${movingStockItem.stock}.`, "error");
      return;
    }
    
    setIsMovingStock(true);
    try {
      const response = await moveStockToService(movingStockItem.id, quantity);
      setItems((current) => current.map((item) => item.id === movingStockItem.id ? response.item : item));
      setError(null);
      setIsMoveStockModalOpen(false);
      setMovingStockItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move stock.");
    } finally {
      setIsMovingStock(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-5 h-full">
      {/* Header Section */}
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div>
          <h2 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Inventory Management</h2>
          <p className={`mt-1 text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Track stock by location with strict branch-level access control.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {!isManager && (
            <div className="relative">
              <select
                value={globalFilters.locationId}
                onChange={(event) => setFilters({ locationId: event.target.value })}
                className={`appearance-none rounded-xl border px-10 py-2.5 text-sm font-semibold outline-none transition-all ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-700 focus:border-[#8B5E3C] [color-scheme:light]"
                }`}
              >
                <option value="all">All Locations</option>
                {locationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.city || location.name}
                  </option>
                ))}
              </select>
              <MapPin size={16} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              <ChevronDown size={16} className={`absolute right-3.5 top-3 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate("/dashboard/purchase")}
            className={`flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 ${
              isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] hover:bg-[#744A2E]"
            }`}
          >
            <ShoppingBag size={16} />
            View Purchase History
          </button>
        </div>
      </div>

      {error && (
        <div className={`rounded-2xl border px-4 py-3 text-sm transition-all ${
          isDark ? "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)] text-[#F87171]" : "border-red-200 bg-red-50 text-red-700"
        }`}>{error}</div>
      )}

      {/* Low Stock Banner */}
      {lowStockItems.length > 0 && (
        <div className={`rounded-2xl border p-4 shadow-sm transition-all ${
          isDark ? "bg-[#1E1B15] border-[rgba(251,191,36,0.2)]" : "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? "bg-amber-500/10 text-amber-500" : "bg-amber-100 text-amber-600"}`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className={`font-bold ${isDark ? "text-amber-500" : "text-amber-900"}`}>Low Stock Alerts</h3>
                <p className={`mt-0.5 text-xs ${isDark ? "text-amber-500/70" : "text-amber-700"}`}>
                  Each product now uses its own configured low stock alert level.
                </p>
              </div>
            </div>
            <span className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-black shadow-sm ${
              isDark ? "bg-amber-500 text-black" : "bg-red-500 text-white"
            }`}>
              {lowStockItems.length}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {lowStockItems.slice(0, 3).map((item) => (
              <div key={item.id} className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${
                isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)] text-[#C8BFB4]" : "bg-white/80 border-amber-200 text-amber-900"
              }`}>
                {isManager ? item.name : `${item.locationName.split("-")[0].trim()} : ${item.name}`}
              </div>
            ))}
            {lowStockItems.length > 3 && (
              <button onClick={() => setIsLowStockModalOpen(true)} className={`text-[11px] font-bold underline px-1 ${isDark ? "text-amber-500" : "text-amber-700"}`}>
                +{lowStockItems.length - 3} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Inventory Table */}
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className={`border-b transition-all ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#E8E1D8]"
              }`}>
                {["Product", "Vendor", "Location", "Cost Price", "Quantity", "Stock", "Low Stock Alert", "Service Stock", "Last Purchase Date", "Actions"].map((h) => (
                  <th key={h} className={`p-4 text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"} ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} className={`p-8 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading inventory...</td></tr>
              )}
              {!isLoading && items.map((item) => (
                <tr key={item.id} className={`border-b transition-all last:border-0 ${
                  isDark ? "border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]" : "border-[#E8E1D8] hover:bg-gray-50"
                }`}>
                  <td className="p-4">
                    <div className={`font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{item.name}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>{item.unit}</div>
                  </td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{item.vendorName || "-"}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{item.locationName.split("-")[0].trim()}</td>
                  <td className={`p-4 font-bold ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{item.costPrice.toLocaleString()}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{item.quantity} {item.unit}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      item.stock <= item.lowStockThreshold 
                        ? (isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700") 
                        : (isDark ? "bg-green-500/10 text-green-400" : "bg-green-100 text-green-700")
                    }`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className={`p-4 text-sm font-semibold ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{item.lowStockThreshold}</td>
                  <td className="p-4">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      isDark ? "bg-[#1C2030] text-[#C9A96E]" : "bg-blue-100 text-blue-700"
                    }`}>
                      {formatWholeNumber(item.serviceQuantity)} {item.unit}
                    </span>
                  </td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toLocaleDateString() : "-"}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openMoveStockModal(item)} type="button"
                        className={`p-2 rounded-lg transition-all ${
                          isDark ? "bg-[rgba(201,169,110,0.1)] text-[#C9A96E] hover:bg-[rgba(201,169,110,0.2)]" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        }`} title="Move to Service Stock">
                        <MoveHorizontal size={14} />
                      </button>
                      <button onClick={() => openEditModal(item)} type="button"
                        className={`p-2 rounded-lg transition-all ${
                          isDark ? "bg-[rgba(255,255,255,0.04)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.08)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(item)} type="button"
                        className={`p-2 rounded-lg transition-all ${
                          isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171] hover:bg-[rgba(248,113,113,0.2)]" : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={10} className={`p-12 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No inventory items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4 md:hidden">
          {isLoading && <div className={`text-center py-8 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading…</div>}
          {!isLoading && items.map((item) => (
            <div key={item.id} className={`rounded-xl border p-4 shadow-sm transition-all ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)]" : "bg-white border-[#E8E1D8]"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${isDark ? "bg-[#151821] text-[#C9A96E]" : "bg-gray-100 text-[#8B5E3C]"}`}>
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{item.name}</h3>
                    <p className={`text-xs ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{item.locationName.split("-")[0].trim()}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  item.stock <= item.lowStockThreshold 
                    ? (isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700") 
                    : (isDark ? "bg-green-500/10 text-green-400" : "bg-green-100 text-green-700")
                }`}>
                  STK: {item.stock}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Cost Price</span>
                  <span className={`text-sm font-bold ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{item.costPrice}</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Low Stock Alert</span>
                  <span className={`text-sm font-bold ${isDark ? "text-[#FCA5A5]" : "text-red-600"}`}>{item.lowStockThreshold}</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Service Stock</span>
                  <span className={`text-sm font-bold ${isDark ? "text-[#C9A96E]" : "text-blue-600"}`}>{formatWholeNumber(item.serviceQuantity)} {item.unit}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openMoveStockModal(item)} className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
                  isDark ? "bg-[rgba(201,169,110,0.1)] text-[#C9A96E]" : "bg-blue-50 text-blue-600"
                }`}>Move</button>
                <button onClick={() => openEditModal(item)} className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
                  isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4]" : "bg-gray-100 text-gray-700"
                }`}>Edit</button>
                <button onClick={() => handleDelete(item)} className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
                  isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171]" : "bg-red-50 text-red-600"
                }`}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className={`flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border shadow-2xl transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)]" : "bg-white border-[#E8E1D8]"
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-[#E8E1D8]"
            }`}>
              <h2 className={`text-xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>{editingItem ? "Edit Product" : "Add Product"}</h2>
              <button type="button" onClick={closeModal} className={`p-2 rounded-full transition-all hover:bg-[rgba(255,255,255,0.05)] ${isDark ? "text-[#7A7572] hover:text-[#C8BFB4]" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-5 overflow-y-auto p-6 md:grid-cols-2 scrollbar-elegant">
              <div className="md:col-span-2">
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Product Name</label>
                <input required value={form.name} 
                  onKeyDown={(e) => {
                    if (e.key === " " && !form.name) e.preventDefault();
                  }}
                  onChange={(event) => {
                    const val = event.target.value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
                    setForm((current) => ({ ...current, name: val }));
                  }}
                  placeholder="Enter Product Name"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] placeholder:text-[#4A4744] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                  }`} />
              </div>
              {!isManager && (
                <div className="md:col-span-2">
                  <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Location</label>
                  <div className="relative">
                    <select required value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}
                      className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                        isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] [color-scheme:light]"
                      }`}>
                      <option value="" disabled>Select a location</option>
                      {locationOptions.map((location) => (
                        <option key={location.id} value={location.id}>{location.city || location.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                  </div>
                </div>
              )}
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Cost Price (₹)</label>
                <input required type="text" inputMode="decimal" value={form.costPrice} onChange={(event) => setForm((current) => ({ ...current, costPrice: getDecimalInputValue(event.target.value) }))}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                  }`} />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Unit Type</label>
                <div className="relative">
                  <select value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value as InventoryFormState["unit"] }))}
                    className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] [color-scheme:dark]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`}>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                  </select>
                  <ChevronDown size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                </div>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Initial Quantity</label>
                <input required type="text" inputMode="decimal" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: getDecimalInputValue(event.target.value) }))}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                  }`} />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Initial Stock</label>
                <input required type="text" inputMode="decimal" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: getDecimalInputValue(event.target.value) }))}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                  }`} />
              </div>
              <div className="md:col-span-2">
                <div className={`rounded-2xl border p-4 transition-all ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-[#FBF9F6] border-[#E8E1D8]"
                }`}>
                  <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Low Stock Alert</label>
                  <p className={`mb-3 text-[11px] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Set the stock level at which this product should appear in low stock alerts.</p>
                  <input required type="text" inputMode="decimal" value={form.lowStockThreshold} onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: getDecimalInputValue(event.target.value) }))}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-white border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                    }`} />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Key Benefits / Description</label>
                <textarea rows={3} value={form.benefits} 
                  onKeyDown={(e) => {
                    if (e.key === " " && !form.benefits) e.preventDefault();
                  }}
                  onChange={(event) => {
                    const val = event.target.value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
                    setForm((current) => ({ ...current, benefits: val }));
                  }}
                  placeholder="Highlight key ingredients or usage benefits…"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] placeholder:text-[#4A4744] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                  }`} />
              </div>
              <div className={`md:col-span-2 flex flex-col-reverse gap-3 border-t pt-5 md:flex-row md:justify-end ${
                isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"
              }`}>
                <button type="button" onClick={closeModal} className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                  isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.1)]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                    isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.15)] hover:bg-[#744A2E]"
                  }`}>
                  {isSubmitting ? "Saving…" : editingItem ? "Update Product" : "Add to Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Low Stock Modal */}
      {isLowStockModalOpen && lowStockItems.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
          <div className={`w-full max-w-xl rounded-[3px] border shadow-2xl transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)]" : "bg-white border-[#E8E1D8]"
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-[#E8E1D8]"
            }`}>
              <div>
                <h2 className={`text-xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Low Stock Alert</h2>
                <p className={`mt-0.5 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Please review and restock these items.</p>
              </div>
              <button type="button" onClick={() => setIsLowStockModalOpen(false)} className={`p-2 rounded-full transition-all hover:bg-[rgba(255,255,255,0.05)] ${isDark ? "text-[#7A7572] hover:text-[#C8BFB4]" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4 px-6 py-8 max-h-[50vh] overflow-y-auto scrollbar-hide">
              {lowStockItems.map((item) => (
                <div key={item.id} className={`group relative flex items-center justify-between p-5 rounded-[24px] border transition-all duration-300 ${
                  isDark 
                    ? "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] hover:bg-[rgba(248,113,113,0.04)] hover:border-[rgba(248,113,113,0.2)]" 
                    : "bg-white border-[#F3EEE7] hover:bg-red-50/30 hover:border-red-100 shadow-sm hover:shadow-md"
                }`}>
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`relative shrink-0 flex items-center justify-center h-12 w-12 rounded-[18px] transition-transform group-hover:scale-110 ${
                      isDark ? "bg-red-500/10 text-red-400" : "bg-red-100 text-red-600"
                    }`}>
                      <Package size={22} />
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse border-2 border-white dark:border-[#151821]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-[1.05rem] font-bold tracking-tight truncate ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin size={12} className={isDark ? "text-red-400/50" : "text-red-400/70"} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.1em] truncate ${isDark ? "text-red-400/60" : "text-red-500/60"}`}>
                          {item.locationName.split("-")[0].trim()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="shrink-0 ml-4">
                    <div className={`inline-flex flex-col items-center justify-center min-w-[58px] p-2 rounded-2xl border ${
                      isDark 
                        ? "bg-[#1C2030] border-[rgba(248,113,113,0.2)]" 
                        : "bg-white border-red-100 shadow-sm"
                    }`}>
                      <span className={`text-[1.2rem] font-black leading-none ${isDark ? "text-red-400" : "text-red-700"}`}>
                        {item.stock}
                      </span>
                      <span className={`text-[9px] font-bold uppercase mt-1 opacity-60 ${isDark ? "text-red-400" : "text-red-700"}`}>
                        LEFT
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className={`flex justify-end border-t p-5 ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-[#E8E1D8]"
            }`}>
              <button type="button" onClick={() => setIsLowStockModalOpen(false)}
                className={`rounded-full px-8 py-2.5 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 ${
                  isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.15)]"
                }`}>
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Stock Modal */}
      {isMoveStockModalOpen && movingStockItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
          <div className={`w-full max-w-lg overflow-hidden rounded-[30px] border shadow-2xl transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.1)]" : "bg-white border-[#E8E1D8]"
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)]" : "bg-gray-50/50 border-[#E8E1D8]"
            }`}>
              <div>
                <h2 className={`text-xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Move Stock</h2>
                <p className={`mt-0.5 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Main Stock → Service Use</p>
              </div>
              <button type="button" onClick={() => setIsMoveStockModalOpen(false)} className={`p-2 rounded-full transition-all hover:bg-[rgba(255,255,255,0.05)] ${isDark ? "text-[#7A7572] hover:text-[#C8BFB4]" : "text-gray-400 hover:text-gray-600"}`}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleMoveStock} className="flex flex-col gap-6 p-6">
              <div className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-[#FBF9F6] border-[#E8E1D8]"
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Current Stock</span>
                  <span className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{movingStockItem.stock}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Service Stock</span>
                  <span className={`text-sm font-black ${isDark ? "text-[#C9A96E]" : "text-blue-600"}`}>{formatWholeNumber(movingStockItem.serviceQuantity)} {movingStockItem.unit} </span>
                </div>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Quantity to Move</label>
                <input required type="text" inputMode="decimal" value={moveQuantity} onChange={(event) => {
                  const nextValue = event.target.value
                    .replace(/[^0-9.]/g, "")
                    .replace(/(\..*)\./g, "$1");
                  setMoveQuantity(nextValue);
                }}
                  placeholder={`Max ${movingStockItem.stock}`}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                  }`} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsMoveStockModalOpen(false)}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                    isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.1)]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>Cancel</button>
                <button type="submit" disabled={isMovingStock}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                    isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.15)] hover:bg-[#744A2E]"
                  }`}>
                  {isMovingStock ? "Processing..." : "Transfer Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
