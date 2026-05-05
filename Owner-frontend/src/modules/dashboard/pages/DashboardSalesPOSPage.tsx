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
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { Search, UserPlus, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, Package, Scissors, MapPin, ChevronDown, Receipt, ShoppingCart, User } from "lucide-react";

export function DashboardSalesPOSPage() {
  const { theme } = useDashboardTheme();
  const { toast } = useNotifications();
  const isDark = theme === "dark";
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
    if (!phone || !clientName) return toast("Client details required", "error");
    if (selectedServices.length === 0 && selectedProducts.length === 0) return toast("Select at least one item", "error");
    if (selectedServices.some(s => !s.staffId)) return toast("Assign staff to all services", "error");

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
      toast("Sale recorded successfully!");
      // Reset form
      setPhone("");
      setClientName("");
      setSelectedServices([]);
      setSelectedProducts([]);
      setDiscount(0);
      setPaidAmount(0);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!defaultLocationId) {
    return (
      <div className={`flex items-center justify-center h-96 text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
        Configuration Error: No active location found.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
        Booting POS interface…
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Pane: Item Selection */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Client Section */}
        <div className={`rounded-[32px] border p-6 shadow-sm transition-all ${
          isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
              isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"
            }`}>
              <UserPlus size={18} />
            </div>
            <h3 className={`text-lg font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Client Credentials</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {!isManager && ownerLocations && ownerLocations.length > 1 && (
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Terminal Point</label>
                <div className="relative">
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
                    className={`w-full appearance-none px-4 py-3 rounded-2xl border outline-none transition-all text-sm font-bold ${
                      isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4] focus:border-[#C9A96E]" : "bg-gray-50 border-[#E8E1D8] text-gray-700 focus:border-[#8B5E3C]"
                    }`}
                  >
                    {ownerLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.city || location.name}
                      </option>
                    ))}
                  </select>
                  <MapPin size={14} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Contact String</label>
              <div className="relative">
                <Search className={`absolute left-4 top-3.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} size={16} />
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number…"
                  className={`w-full pl-11 pr-4 py-3 rounded-2xl border outline-none transition-all text-sm font-bold ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] placeholder:text-[#4A4744]" : "bg-gray-50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
                  }`}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Entity Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  disabled={!!foundClient}
                  placeholder={foundClient ? "Synchronized" : "Legal name…"}
                  className={`w-full px-4 py-3 rounded-2xl border outline-none transition-all text-sm font-bold ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] placeholder:text-[#4A4744] disabled:opacity-50" : "bg-gray-50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C] disabled:bg-gray-100"
                  }`}
                />
                <User size={16} className={`absolute right-4 top-3.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Selection Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Services List */}
          <div className={`rounded-[32px] border flex flex-col overflow-hidden shadow-sm transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
          }`}>
            <div className={`p-5 border-b flex items-center gap-2 ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#F2EDE7]"}`}>
              <Scissors size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
              <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Service Catalog</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {services.map(s => (
                <button 
                  key={s.id}
                  onClick={() => handleAddService(s)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
                    isDark ? "bg-[rgba(255,255,255,0.02)] border-transparent hover:border-[#C9A96E] hover:bg-[rgba(201,169,110,0.05)]" : "bg-white border-transparent hover:border-[#8B5E3C] hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{s.name}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>{s.duration} MINS</div>
                  </div>
                  <div className={`text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{s.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Products List */}
          <div className={`rounded-[32px] border flex flex-col overflow-hidden shadow-sm transition-all ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
          }`}>
            <div className={`p-5 border-b flex items-center gap-2 ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#F2EDE7]"}`}>
              <Package size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
              <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Retail Inventory</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {products.map(p => (
                <button 
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  disabled={Number(p.stock) <= 0}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
                    isDark ? "bg-[rgba(255,255,255,0.02)] border-transparent hover:border-[#C9A96E] hover:bg-[rgba(201,169,110,0.05)]" : "bg-white border-transparent hover:border-[#8B5E3C] hover:bg-gray-50"
                  } disabled:opacity-40`}
                >
                  <div className="text-left">
                    <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{p.name}</div>
                    <div className={`text-[9px] font-black uppercase tracking-widest mt-1 px-2 py-0.5 rounded-lg inline-block ${
                      Number(p.stock) < 5 ? (isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171]" : "bg-red-50 text-red-600") : (isDark ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]" : "bg-green-50 text-green-600")
                    }`}>
                      Stock: {p.stock}
                    </div>
                  </div>
                  <div className={`text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{p.costPrice}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane: Billing & Summary */}
      <div className="w-full lg:w-[450px] flex flex-col gap-6 h-full min-h-0">
        <div className={`flex-1 rounded-[32px] border flex flex-col shadow-xl overflow-hidden transition-all ${
          isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
        }`}>
          <div className={`p-6 border-b flex justify-between items-center transition-all ${
            isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)]" : "bg-[#8B5E3C]"
          }`}>
            <div className="flex items-center gap-3 text-white">
              <ShoppingCart size={20} className="font-black" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em]">Active Checkout</h3>
            </div>
            <span className="text-[10px] font-black bg-white/20 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              {selectedServices.length + selectedProducts.length} Items
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Services in Cart */}
            {selectedServices.map((s, idx) => (
              <div key={`cart-s-${idx}`} className={`group rounded-[24px] border p-4 transition-all ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-[#F2EDE7]"
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{s.name}</div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{s.price}</span>
                    <button onClick={() => handleRemoveService(idx)} className={`transition-colors ${isDark ? "text-[#4A4744] hover:text-[#F87171]" : "text-gray-300 hover:text-red-600"}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <select 
                    value={s.staffId}
                    onChange={(e) => handleAssignStaff(idx, e.target.value)}
                    className={`w-full appearance-none text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border outline-none transition-all ${
                      isDark ? "bg-[#151821] border-[rgba(255,255,255,0.05)] text-[#C8BFB4] focus:border-[#C9A96E]" : "bg-white border-[#E8E1D8] text-gray-700"
                    }`}
                  >
                    <option value="">Assign Specialist</option>
                    {staff.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                  <ChevronDown size={14} className={`absolute right-3 top-2.5 pointer-events-none opacity-50 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                </div>
              </div>
            ))}

            {/* Products in Cart */}
            {selectedProducts.map((p, idx) => (
              <div key={`cart-p-${idx}`} className={`rounded-[24px] border p-4 transition-all ${
                isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-[#F2EDE7]"
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{p.name}</div>
                  <button onClick={() => handleRemoveProduct(idx)} className={`transition-colors ${isDark ? "text-[#4A4744] hover:text-[#F87171]" : "text-gray-300 hover:text-red-600"}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className={`flex items-center gap-4 rounded-xl px-3 py-1.5 border ${
                    isDark ? "bg-[#151821] border-[rgba(255,255,255,0.05)]" : "bg-white border-[#E8E1D8]"
                  }`}>
                    <button onClick={() => handleUpdateProductQty(idx, -1)} className={`transition-colors ${isDark ? "text-[#C9A96E] hover:text-[#E8C98A]" : "text-[#8B5E3C] hover:text-gray-900"}`}><Minus size={14} /></button>
                    <span className={`text-xs font-black min-w-[24px] text-center ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{p.quantity}</span>
                    <button onClick={() => handleUpdateProductQty(idx, 1)} className={`transition-colors ${isDark ? "text-[#C9A96E] hover:text-[#E8C98A]" : "text-[#8B5E3C] hover:text-gray-900"}`}><Plus size={14} /></button>
                  </div>
                  <span className={`text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{p.price * p.quantity}</span>
                </div>
              </div>
            ))}

            {selectedServices.length === 0 && selectedProducts.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                <Receipt size={48} strokeWidth={1} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Cart is Vacant</p>
              </div>
            )}
          </div>

          {/* Totals & Actions */}
          <div className={`p-6 border-t space-y-6 transition-all ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-[#F2EDE7]"}`}>
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                <span>Gross Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all ${
                  isDark ? "bg-[#151821] border-[rgba(255,255,255,0.05)]" : "bg-white border-[#E8E1D8]"
                }`}>
                   <input 
                    type="number" 
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className={`w-14 bg-transparent outline-none text-xs font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}
                    placeholder="0"
                  />
                  <select 
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className={`bg-transparent text-[10px] font-black uppercase outline-none border-l pl-2 ${isDark ? "border-[rgba(255,255,255,0.1)] text-[#C9A96E]" : "border-gray-200 text-[#8B5E3C]"}`}
                  >
                    <option value="flat">₹</option>
                    <option value="percent">%</option>
                  </select>
                </div>
                <span className="text-xs font-black text-red-400">
                  - ₹{discountType === 'percent' ? (subtotal * discount / 100).toFixed(2) : discount}
                </span>
              </div>
              <div className={`flex justify-between items-center pt-4 border-t ${isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2EDE7]"}`}>
                <span className={`text-xs font-black uppercase tracking-[0.3em] ${isDark ? "text-[#F0EBE3]" : "text-gray-600"}`}>Settlement Amount</span>
                <span className={`text-3xl font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{totalAmount.toFixed(0)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "CASH", icon: <Banknote size={18} />, label: "Cash" },
                { id: "UPI", icon: <Smartphone size={18} />, label: "UPI" },
                { id: "CARD", icon: <CreditCard size={18} />, label: "Card" }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-[20px] border transition-all ${
                    paymentMethod === m.id 
                    ? (isDark ? 'border-[#C9A96E] bg-[rgba(201,169,110,0.1)] text-[#E8C98A] shadow-lg' : 'border-[#8B5E3C] bg-[#8B5E3C]/5 text-[#8B5E3C]') 
                    : (isDark ? 'border-[rgba(255,255,255,0.05)] bg-[#151821] text-[#4A4744] hover:text-[#7A7572]' : 'border-[#E8E1D8] bg-white text-gray-400')
                  }`}
                >
                  {m.icon}
                  <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                isDark 
                ? 'bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115] shadow-[#C9A96E]/20' 
                : 'bg-[#8B5E3C] hover:bg-[#744A2E] text-white shadow-[#8B5E3C]/20'
              }`}
            >
              {isSubmitting ? (
                "Processing Settlement…"
              ) : (
                <><CreditCard size={20} /> Generate Settlement</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
