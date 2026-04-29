import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  createInventoryItem,
  deleteInventoryItem,
  fetchInventory,
  type InventoryItem,
  updateInventoryItem,
  moveStockToService,
} from "../../../core/api";

type LocationOption = { id: string; name: string; city?: string };
type InventoryOutletContext = {
  ownerLocations?: LocationOption[];
  refreshLowStockAlerts?: () => void;
};

type InventoryFormState = {
  name: string;
  costPrice: string;
  unit: "ml" | "L" | "pcs";
  quantity: string;
  stock: string;
  benefits: string;
  locationId: string;
};

const EMPTY_FORM: InventoryFormState = {
  name: "",
  costPrice: "",
  unit: "pcs",
  quantity: "",
  stock: "",
  benefits: "",
  locationId: "",
};

export function DashboardInventoryPage() {
  const { user } = useAuth();
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

  const isManager = user?.role === "MANAGER";
  const locationOptions = ownerLocations || [];
  const defaultLocationId = useMemo(() => {
    if (isManager) {
      return user?.branchId || "";
    }

    return locationOptions[0]?.id || "";
  }, [isManager, user?.branchId, locationOptions]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>(isManager ? defaultLocationId : "all");
  const lowStockItems = useMemo(
    () => items.filter((item) => item.stock < 5),
    [items],
  );

  useEffect(() => {
    if (isManager && defaultLocationId) {
      setSelectedLocationId(defaultLocationId);
    }
  }, [isManager, defaultLocationId]);

  const loadInventory = (locationId = selectedLocationId) => {
    setIsLoading(true);
    fetchInventory(isManager ? defaultLocationId : locationId === "all" ? undefined : locationId)
      .then((response) => {
        setItems(response.items);
        setError(null);
        if (response.items.some((item) => item.stock < 5)) {
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
    if (!isManager && selectedLocationId === "" && locationOptions.length) {
      setSelectedLocationId("all");
      return;
    }

    if (isManager && !defaultLocationId) {
      return;
    }

    loadInventory();
  }, [selectedLocationId, defaultLocationId, isManager, locationOptions.length]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      ...EMPTY_FORM,
      locationId: isManager ? defaultLocationId : selectedLocationId !== "all" ? selectedLocationId : defaultLocationId,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      costPrice: String(item.costPrice),
      unit: item.unit,
      quantity: String(item.quantity),
      stock: String(item.stock),
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
        benefits: form.benefits,
        locationId: isManager ? defaultLocationId : form.locationId,
      };

      if (editingItem) {
        const response = await updateInventoryItem(editingItem.id, payload);
        setItems((current) => current.map((item) => item.id === editingItem.id ? response.item : item));
      } else {
        const response = await createInventoryItem(payload);
        const createdItem = response.item;
        const shouldShowItem =
          isManager ||
          selectedLocationId === "all" ||
          selectedLocationId === createdItem.locationId;

        if (shouldShowItem) {
          setItems((current) => [createdItem, ...current]);
        }
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

  const handleDelete = async (item: InventoryItem) => {
    if (!window.confirm(`Delete ${item.name} from inventory?`)) {
      return;
    }

    try {
      await deleteInventoryItem(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setError(null);
      if (refreshLowStockAlerts) {
        refreshLowStockAlerts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete inventory item.");
    }
  };

  const openMoveStockModal = (item: InventoryItem) => {
    setMovingStockItem(item);
    setMoveQuantity("");
    setIsMoveStockModalOpen(true);
  };

  const handleMoveStock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!movingStockItem || !moveQuantity) return;
    
    setIsMovingStock(true);
    try {
      const response = await moveStockToService(movingStockItem.id, Number(moveQuantity));
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
    <div className="flex flex-col gap-5 h-full">
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit']">Inventory Management</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Track stock by location with strict branch-level access control.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {!isManager && (
            <select
              value={selectedLocationId}
              onChange={(event) => setSelectedLocationId(event.target.value)}
              className="rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#744230]"
            >
              <option value="all">All Locations</option>
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.city || location.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
          >
            + Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Low Stock Alerts</h3>
              <p className="mt-1 text-xs text-amber-700">
                These alerts stay active until the stock is filled above 5.
              </p>
            </div>
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
              {lowStockItems.length}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {lowStockItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 font-medium">
                {isManager ? `${item.name} is low` : `${item.locationName.split("-")[0].trim()} : ${item.name} is low`}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)] bg-gray-50/50">
                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Product</th>
                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Location</th>
                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Cost Price</th>
                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Quantity</th>
                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Stock</th>
                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Service Stock</th>
                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Benefits</th>
                <th className="p-4 text-right text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--muted)]">Loading inventory...</td>
                </tr>
              )}
              {!isLoading && items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--line)] last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-[var(--muted)]">{item.unit}</div>
                  </td>
                  <td className="p-4 text-sm text-[var(--muted)]">{item.locationName.split("-")[0].trim()}</td>
                  <td className="p-4 font-semibold">₹{item.costPrice.toFixed(2)}</td>
                  <td className="p-4 text-sm text-[var(--muted)]">{item.quantity} {item.unit}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.stock <= 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="rounded-full px-3 py-1 text-xs font-bold bg-blue-100 text-blue-700">
                      {item.serviceQuantity} {item.unit}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-[var(--muted)]">{item.benefits || "No benefits listed"}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openMoveStockModal(item)}
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                        title="Move to Service Stock"
                      >
                        Move
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--muted)]">No inventory items found for this location.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 p-4 md:hidden">
          {isLoading && <div className="p-8 text-center text-[var(--muted)]">Loading inventory...</div>}
          {!isLoading && items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--line)] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-sm text-[var(--muted)]">{item.locationName.split("-")[0].trim()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.stock <= 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  Stock {item.stock}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[var(--muted)]">
                <div>Cost: ₹{item.costPrice.toFixed(2)}</div>
                <div>Qty: {item.quantity} {item.unit}</div>
                <div>Srv. Stock: {item.serviceQuantity} {item.unit}</div>
                <div className="col-span-2">Benefits: {item.benefits || "No benefits listed"}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => openMoveStockModal(item)} className="flex-1 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600">
                  Move
                </button>
                <button type="button" onClick={() => openEditModal(item)} className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(item)} className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!isLoading && items.length === 0 && (
            <div className="p-8 text-center text-[var(--muted)]">No inventory items found for this location.</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-gray-50/50 px-6 py-5">
              <h2 className="text-xl font-bold font-['Outfit']">{editingItem ? "Edit Product" : "Add Product"}</h2>
              <button type="button" onClick={closeModal} className="p-2 text-xl leading-none text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 overflow-y-auto p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Product Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                />
              </div>
              {!isManager && (
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">Location</label>
                  <select
                    required
                    value={form.locationId}
                    onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                  >
                    <option value="" disabled>Select a location</option>
                    {locationOptions.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.city || location.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Cost Price</label>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.costPrice}
                  onChange={(event) => setForm((current) => ({ ...current, costPrice: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Unit</label>
                <select
                  value={form.unit}
                  onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value as InventoryFormState["unit"] }))}
                  className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                >
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Quantity</label>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Stock</label>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.stock}
                  onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Benefits</label>
                <textarea
                  rows={4}
                  value={form.benefits}
                  onChange={(event) => setForm((current) => ({ ...current, benefits: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                />
              </div>
              <div className="md:col-span-2 flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 md:flex-row md:justify-end">
                <button type="button" onClick={closeModal} className="rounded-full bg-gray-100 px-5 py-2.5 font-semibold text-gray-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : editingItem ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLowStockModalOpen && lowStockItems.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold font-['Outfit'] text-gray-900">Low Stock Notification</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Restock these items soon.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(false)}
                className="p-2 text-xl leading-none text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col gap-3 px-6 py-5">
              {lowStockItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {isManager ? `${item.name} is low` : `${item.locationName.split("-")[0].trim()} : ${item.name} is low`}
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-[var(--line)] px-6 py-4">
              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(false)}
                className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 font-semibold text-white shadow-md"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {isMoveStockModalOpen && movingStockItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold font-['Outfit'] text-gray-900">Move to Service Stock</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Move stock from Main to Service.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoveStockModalOpen(false)}
                className="p-2 text-xl leading-none text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleMoveStock} className="flex flex-col gap-4 px-6 py-5">
              <div className="text-sm">
                <p><strong>Item:</strong> {movingStockItem.name}</p>
                <p><strong>Current Main Stock:</strong> {movingStockItem.stock}</p>
                <p><strong>Current Service Stock:</strong> {movingStockItem.serviceQuantity}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">Quantity to Move</label>
                <input
                  required
                  min="0.01"
                  max={movingStockItem.stock}
                  step="0.01"
                  type="number"
                  value={moveQuantity}
                  onChange={(event) => setMoveQuantity(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                  placeholder="Enter quantity"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMoveStockModalOpen(false)}
                  className="rounded-full bg-gray-100 px-5 py-2.5 font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMovingStock}
                  className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 font-semibold text-white shadow-md disabled:opacity-60"
                >
                  {isMovingStock ? "Moving..." : "Move Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
