import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  createService,
  deleteService,
  executeService,
  fetchInventory,
  fetchServices,
  type InventoryItem,
  type ServiceItem,
  type ServiceProduct,
  updateService,
} from "../../../core/api";

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
  const { ownerLocations } = useOutletContext<ServicesOutletContext>() || {};

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [executingServiceId, setExecutingServiceId] = useState<string | null>(null);

  const isManager = user?.role === "MANAGER";
  const locationOptions = ownerLocations || [];
  const defaultLocationId = useMemo(() => {
    if (isManager) return user?.branchId || "";
    return locationOptions[0]?.id || "";
  }, [isManager, user?.branchId, locationOptions]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    isManager ? defaultLocationId : "all"
  );

  useEffect(() => {
    if (isManager && defaultLocationId) {
      setSelectedLocationId(defaultLocationId);
    }
  }, [isManager, defaultLocationId]);

  const loadData = (locationId = selectedLocationId) => {
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
    if (!isManager && selectedLocationId === "" && locationOptions.length) {
      setSelectedLocationId("all");
      return;
    }
    if (isManager && !defaultLocationId) return;
    loadData();
  }, [selectedLocationId, defaultLocationId, isManager, locationOptions.length]);

  const openCreateModal = () => {
    setEditingService(null);
    setForm({
      ...EMPTY_FORM,
      locationId: isManager
        ? defaultLocationId
        : selectedLocationId !== "all"
        ? selectedLocationId
        : defaultLocationId,
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

  const handleDelete = async (service: ServiceItem) => {
    if (!window.confirm(`Delete "${service.name}"? This cannot be undone.`)) return;
    try {
      await deleteService(service.id);
      setError(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete service.");
    }
  };

  const handleExecute = async (service: ServiceItem) => {
    setExecutingServiceId(service.id);
    try {
      await executeService(service.id);
      setError(null);
      alert(`Successfully executed "${service.name}". Stock has been deducted.`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute service.");
    } finally {
      setExecutingServiceId(null);
    }
  };

  const availableInventory = isManager
    ? inventory
    : form.locationId
    ? inventory.filter((i) => i.locationId === form.locationId)
    : inventory;

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit']">Services Management</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage services and track product usage per service.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {!isManager && (
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#744230]"
            >
              <option value="all">All Locations</option>
              {locationOptions.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.city || loc.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
          >
            + Add Service
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading && (
          <div className="col-span-full p-8 text-center text-[var(--muted)]">
            Loading services...
          </div>
        )}
        {!isLoading && services.length === 0 && (
          <div className="col-span-full p-8 text-center text-[var(--muted)] border border-[var(--line)] rounded-2xl bg-white">
            No services found for this location.
          </div>
        )}
        {!isLoading &&
          services.map((service) => (
            <div
              key={service.id}
              className="flex flex-col rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold font-['Outfit'] text-gray-900 truncate">
                    {service.name}
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{service.duration} mins</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <div className="text-lg font-bold text-[#744230]">₹{service.price}</div>
                </div>
              </div>

              {service.benefits && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{service.benefits}</p>
              )}

              {/* Products Used */}
              <div className="mb-4 rounded-xl bg-gray-50 p-3 border border-gray-100 flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Products Used
                </h4>
                {service.products && service.products.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {service.products.map((product, idx) => (
                      <li
                        key={product.id || idx}
                        className="flex justify-between text-sm"
                      >
                        <span className="font-medium text-gray-700 truncate pr-2">
                          {product.productName}
                        </span>
                        <span className="text-gray-500 shrink-0">
                          {product.quantityUsed} {product.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-gray-400">No products assigned</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => openEditModal(service)}
                  className="flex-1 rounded-xl border border-[var(--line)] bg-white py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(service)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleExecute(service)}
                disabled={executingServiceId === service.id}
                className="mt-2 w-full rounded-xl bg-[#744230] py-3 text-sm font-bold text-white transition-colors hover:bg-[#4e271b] disabled:opacity-50"
              >
                {executingServiceId === service.id ? "Executing..." : "Execute Service"}
              </button>
            </div>
          ))}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-gray-50/50 px-6 py-5">
              <h2 className="text-xl font-bold font-['Outfit']">
                {editingService ? "Edit Service" : "Add New Service"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-xl leading-none text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto p-6 grid gap-4 md:grid-cols-2">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">
                    Service Name
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                    placeholder="e.g. Luxury Hair Spa"
                  />
                </div>

                {/* Location — owners only, locked when editing */}
                {!isManager && (
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-bold text-gray-700">
                      Location
                    </label>
                    <select
                      required
                      disabled={!!editingService}
                      value={form.locationId}
                      onChange={(e) =>
                        setForm({ ...form, locationId: e.target.value, products: [] })
                      }
                      className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230] disabled:opacity-60"
                    >
                      <option value="" disabled>
                        Select a location
                      </option>
                      {locationOptions.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.city || loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Price */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">
                    Price (₹)
                  </label>
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">
                    Duration (mins)
                  </label>
                  <input
                    required
                    min="1"
                    step="1"
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                  />
                </div>

                {/* Benefits */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">
                    Benefits / Description
                  </label>
                  <textarea
                    rows={2}
                    value={form.benefits}
                    onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                    className="w-full rounded-xl border border-[var(--line)] bg-gray-50/50 px-4 py-3 outline-none transition-colors focus:border-[#744230]"
                  />
                </div>

                {/* Products */}
                <div className="md:col-span-2 mt-2">
                  <div className="flex items-center justify-between mb-3 border-b border-[var(--line)] pb-2">
                    <label className="text-sm font-bold text-gray-700">Products Used</label>
                    <button
                      type="button"
                      onClick={handleAddProductRow}
                      className="text-xs font-bold text-[#744230] hover:text-[#4e271b]"
                    >
                      + Add Product
                    </button>
                  </div>

                  {form.products.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      No products added. Click "+ Add Product" to add ingredients.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {form.products.map((product, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-[var(--line)]"
                        >
                          <select
                            required
                            value={product.productId}
                            onChange={(e) =>
                              handleProductChange(index, "productId", e.target.value)
                            }
                            className="flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[#744230]"
                          >
                            <option value="" disabled>
                              Select Product
                            </option>
                            {availableInventory.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                          </select>

                          <input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Qty"
                            value={product.quantityUsed}
                            onChange={(e) =>
                              handleProductChange(index, "quantityUsed", e.target.value)
                            }
                            className="w-20 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[#744230]"
                          />

                          <span className="text-sm text-gray-500 w-8 shrink-0">
                            {product.unit}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveProductRow(index)}
                            className="text-red-400 hover:text-red-600 font-bold p-1"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {error && (
                    <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-[var(--line)] p-6 bg-gray-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full bg-gray-100 px-5 py-2.5 font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] px-5 py-2.5 font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingService
                    ? "Save Changes"
                    : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
