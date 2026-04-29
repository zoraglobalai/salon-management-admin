import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  fetchServices, 
  fetchInventory, 
  fetchStaff, 
  fetchClients, 
  createSale,
  type ServiceItem, 
  type InventoryItem, 
  type StaffMember, 
  type ClientRecord,
  type SaleInput
} from "../../../core/api";
import { useAuth } from "../../auth/hooks/useAuth";
import { Search, UserPlus, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, CheckCircle } from "lucide-react";

export function DashboardSalesPOSPage() {
  const { user } = useAuth();
  const { ownerLocations } = useOutletContext<{ ownerLocations?: Array<{ id: string; name: string; city?: string }> }>() || {};

  // Master Data
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cart State
  const [selectedServices, setSelectedServices] = useState<Array<{ id: string; name: string; price: number; staffId: string }>>([]);
  const [selectedProducts, setSelectedProducts] = useState<Array<{ id: string; name: string; price: number; quantity: number; maxStock: number }>>([]);
  
  // Client State
  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [foundClient, setFoundClient] = useState<ClientRecord | null>(null);
  
  // Billing State
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [paidAmount, setPaidAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const isManager = user?.role === "MANAGER";
  const defaultLocationId = useMemo(() => {
    if (isManager) return user?.branchId || "";
    return ownerLocations?.[0]?.id || "";
  }, [isManager, ownerLocations, user?.branchId]);
  const [selectedLocationId, setSelectedLocationId] = useState("");

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
    Promise.all([
      fetchServices(selectedLocationId),
      fetchInventory(selectedLocationId),
      fetchStaff(selectedLocationId),
    ])
      .then(([s, i, st]) => {
        setServices(s.services);
        setProducts(i.items.filter(item => Number(item.stock) > 0));
        setStaff(st.staff);
      })
      .catch(() => {
        setServices([]);
        setProducts([]);
        setStaff([]);
      })
      .finally(() => setIsLoading(false));
  }, [selectedLocationId]);

  useEffect(() => {
    if (!selectedLocationId) {
      setFoundClient(null);
      setClientName("");
      return;
    }

    if (phone.length >= 10) {
      fetchClients(selectedLocationId, { search: phone })
        .then(r => {
          if (r.clients.length > 0) {
            setFoundClient(r.clients[0]);
            setClientName(r.clients[0].name);
          } else {
            setFoundClient(null);
            setClientName("");
          }
        });
    } else {
      setFoundClient(null);
      setClientName("");
    }
  }, [phone, selectedLocationId]);

  const subtotal = useMemo(() => {
    const sTotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const pTotal = selectedProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    return sTotal + pTotal;
  }, [selectedServices, selectedProducts]);

  const totalAmount = useMemo(() => {
    let disc = 0;
    if (discountType === 'percent') {
      disc = (subtotal * discount) / 100;
    } else {
      disc = discount;
    }
    const final = subtotal - disc;
    return Math.max(0, final);
  }, [subtotal, discount, discountType]);

  useEffect(() => {
    setPaidAmount(totalAmount);
  }, [totalAmount]);

  const handleAddService = (s: ServiceItem) => {
    setSelectedServices([...selectedServices, { id: s.id, name: s.name, price: s.price, staffId: "" }]);
  };

  const handleRemoveService = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  const handleAssignStaff = (index: number, staffId: string) => {
    const updated = [...selectedServices];
    updated[index].staffId = staffId;
    setSelectedServices(updated);
  };

  const handleAddProduct = (p: InventoryItem) => {
    const existing = selectedProducts.findIndex(item => item.id === p.id);
    if (existing !== -1) {
      handleUpdateProductQty(existing, 1);
    } else {
      setSelectedProducts([...selectedProducts, { 
        id: p.id, 
        name: p.name, 
        price: Number(p.costPrice), 
        quantity: 1, 
        maxStock: Number(p.stock) 
      }]);
    }
  };

  const handleUpdateProductQty = (index: number, delta: number) => {
    const updated = [...selectedProducts];
    const newQty = updated[index].quantity + delta;
    if (newQty > 0 && newQty <= updated[index].maxStock) {
      updated[index].quantity = newQty;
      setSelectedProducts(updated);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!phone || !clientName) return alert("Client details required");
    if (selectedServices.length === 0 && selectedProducts.length === 0) return alert("Select at least one item");
    if (selectedServices.some(s => !s.staffId)) return alert("Assign staff to all services");

    setIsSubmitting(true);
    try {
      const payload: SaleInput = {
        phoneNumber: phone,
        clientName: foundClient ? undefined : clientName,
        locationId: isManager ? user?.branchId : selectedLocationId,
        services: selectedServices.map(s => ({ serviceId: s.id, staffId: s.staffId })),
        products: selectedProducts.map(p => ({ productId: p.id, quantity: p.quantity })),
        discount,
        discountType,
        paymentMethod,
        paidAmount
      };
      await createSale(payload);
      setSuccess(true);
      // Reset form
      setTimeout(() => {
        setSuccess(false);
        setPhone("");
        setClientName("");
        setSelectedServices([]);
        setSelectedProducts([]);
        setDiscount(0);
      }, 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!defaultLocationId) {
    return <div className="p-8 text-center text-[var(--muted)]">No location is configured for sales.</div>;
  }

  if (isLoading) return <div className="p-8 text-center text-[var(--muted)]">Loading POS...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
      {/* Left Pane: Item Selection */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Client Section */}
        <div className="bg-white rounded-2xl border border-[var(--line)] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <UserPlus size={18} />
            </div>
            <h3 className="font-bold text-gray-900 font-['Outfit']">Client Details</h3>
          </div>
          {!isManager && ownerLocations && ownerLocations.length > 0 && (
            <div className="mb-4 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Location</label>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setFoundClient(null);
                  setClientName("");
                  setPhone("");
                  setSelectedServices([]);
                  setSelectedProducts([]);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--line)] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#744230]/20 outline-none transition-all text-sm font-medium"
              >
                {ownerLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.city || location.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Phone Number</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--line)] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#744230]/20 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Client Name</label>
              <input 
                type="text" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={!!foundClient}
                placeholder={foundClient ? "Auto-filled" : "Enter name for new client..."}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--line)] bg-gray-50 disabled:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-[#744230]/20 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Selection Area */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
            {/* Services List */}
            <div className="bg-white rounded-2xl border border-[var(--line)] flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[var(--line)] bg-gray-50/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Services</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {services.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => handleAddService(s)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-left transition-colors border border-transparent hover:border-[var(--line)]"
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-900">{s.name}</div>
                      <div className="text-[10px] text-[var(--muted)]">{s.duration} mins</div>
                    </div>
                    <div className="text-sm font-black text-[#744230]">₹{s.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Products List */}
            <div className="bg-white rounded-2xl border border-[var(--line)] flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[var(--line)] bg-gray-50/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Products</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {products.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handleAddProduct(p)}
                    disabled={Number(p.stock) <= 0}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-left transition-colors border border-transparent hover:border-[var(--line)] disabled:opacity-50"
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-900">{p.name}</div>
                      <div className={`text-[10px] font-bold ${Number(p.stock) < 5 ? 'text-red-500' : 'text-green-600'}`}>
                        Stock: {p.stock} units • Pack: {p.quantity} {p.unit}
                      </div>
                    </div>
                    <div className="text-sm font-black text-[#744230]">₹{p.costPrice}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane: Billing & Summary */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6 overflow-hidden">
        <div className="flex-1 bg-white rounded-2xl border border-[var(--line)] flex flex-col shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[var(--line)] bg-[#744230] text-white flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest">Billing Summary</h3>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase">Items: {selectedServices.length + selectedProducts.length}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Services in Cart */}
            {selectedServices.map((s, idx) => (
              <div key={`cart-s-${idx}`} className="bg-gray-50 rounded-xl p-3 border border-[var(--line)]">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-bold text-gray-900">{s.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">₹{s.price}</span>
                    <button onClick={() => handleRemoveService(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <select 
                  value={s.staffId}
                  onChange={(e) => handleAssignStaff(idx, e.target.value)}
                  className="w-full text-xs bg-white border border-[var(--line)] rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#744230]/10"
                >
                  <option value="">Select Staff</option>
                  {staff.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
              </div>
            ))}

            {/* Products in Cart */}
            {selectedProducts.map((p, idx) => (
              <div key={`cart-p-${idx}`} className="bg-gray-50 rounded-xl p-3 border border-[var(--line)]">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm font-bold text-gray-900">{p.name}</div>
                  <button onClick={() => handleRemoveProduct(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-[var(--line)] px-1">
                    <button onClick={() => handleUpdateProductQty(idx, -1)} className="p-1 hover:text-[#744230]"><Minus size={12} /></button>
                    <span className="text-xs font-bold min-w-[20px] text-center">{p.quantity}</span>
                    <button onClick={() => handleUpdateProductQty(idx, 1)} className="p-1 hover:text-[#744230]"><Plus size={12} /></button>
                  </div>
                  <span className="text-sm font-black text-gray-900">₹{p.price * p.quantity}</span>
                </div>
              </div>
            ))}

            {selectedServices.length === 0 && selectedProducts.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-[var(--muted)] gap-2 py-12">
                <Plus size={32} strokeWidth={1.5} />
                <p className="text-xs font-medium">Add services or products to begin</p>
              </div>
            )}
          </div>

          {/* Totals & Actions */}
          <div className="p-5 bg-gray-50 border-t border-[var(--line)] space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-[var(--muted)]">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 bg-white border border-[var(--line)] rounded-lg px-2 py-1">
                   <input 
                    type="number" 
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-16 bg-transparent outline-none text-xs font-bold"
                    placeholder="Disc"
                  />
                  <select 
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="bg-transparent text-[10px] font-bold outline-none border-l border-[var(--line)] pl-1"
                  >
                    <option value="flat">₹</option>
                    <option value="percent">%</option>
                  </select>
                </div>
                <span className="text-xs font-bold text-red-500">
                  - ₹{discountType === 'percent' ? (subtotal * discount / 100).toFixed(2) : discount}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--line)]">
                <span className="text-sm font-black text-gray-900">Total Amount</span>
                <span className="text-xl font-black text-[#744230]">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "CASH", icon: <Banknote size={16} />, label: "Cash" },
                { id: "UPI", icon: <Smartphone size={16} />, label: "UPI" },
                { id: "CARD", icon: <CreditCard size={16} />, label: "Card" }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                    paymentMethod === m.id 
                    ? 'border-[#744230] bg-[#744230]/5 text-[#744230]' 
                    : 'border-[var(--line)] bg-white text-[var(--muted)]'
                  }`}
                >
                  {m.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={isSubmitting || success}
              className={`w-full py-4 rounded-2xl font-black text-sm shadow-lg shadow-[#744230]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                success 
                ? 'bg-green-600 text-white' 
                : 'bg-[#744230] hover:bg-[#4e271b] text-white'
              }`}
            >
              {isSubmitting ? (
                "Processing..."
              ) : success ? (
                <><CheckCircle size={18} /> Sale Completed!</>
              ) : (
                "Generate Bill"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
