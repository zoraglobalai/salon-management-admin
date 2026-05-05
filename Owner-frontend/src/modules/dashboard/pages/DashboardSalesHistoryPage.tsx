import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { 
  fetchSales, 
  fetchStaff, 
  fetchServices, 
  type SaleRecord, 
  type SaleFilters, 
  type StaffMember, 
  type ServiceItem 
} from "../../../core/api";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { 
  User, 
  CreditCard, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  ReceiptText, 
  Printer, 
  Wallet, 
  Smartphone, 
  Banknote, 
  RefreshCw,
  Plus
} from "lucide-react";

type LocationOption = { id: string; name: string; city?: string };
type SalesOutletContext = {
  ownerLocations?: LocationOption[];
};

export function DashboardSalesHistoryPage() {
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";
  const { ownerLocations } = useOutletContext<SalesOutletContext>() || {};
  const locations = ownerLocations || [];

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Filter States
  const [selectedLocationId, setSelectedLocationId] = useState<string>(isManager ? user?.branchId || "" : "all");
  const [filters, setFilters] = useState<SaleFilters>({
    search: "",
    startDate: "",
    endDate: "",
    paymentMethod: "all",
    staffId: "all",
    serviceId: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  useEffect(() => {
    // Initial data fetch
    Promise.all([
      fetchStaff(),
      fetchServices()
    ]).then(([staffRes, servicesRes]) => {
      setStaffMembers(staffRes.staff || []);
      setServices(servicesRes.services || []);
    });
  }, []);

  const loadSales = () => {
    setIsLoading(true);
    fetchSales(selectedLocationId === "all" ? undefined : selectedLocationId, filters)
      .then(r => setSales(r.sales || []))
      .catch(err => console.error("Failed to fetch sales", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSales();
    }, 400); // Debounce search
    return () => clearTimeout(timer);
  }, [selectedLocationId, filters]);

  const toggleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc"
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      startDate: "",
      endDate: "",
      paymentMethod: "all",
      staffId: "all",
      serviceId: "all",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    setSelectedLocationId(isManager ? user?.branchId || "" : "all");
  };

  const getSortIcon = (field: string) => {
    if (filters.sortBy !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return filters.sortOrder === "desc" ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-screen">
      {/* Header & Main Search */}
      <div className={`flex flex-col gap-6 p-6 rounded-[32px] border shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-2xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Sales Archive</h2>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
              Historical records of all settled transactions
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-80">
              <input 
                type="text" 
                placeholder="Search Client Name or Phone..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className={`w-full h-11 pl-11 pr-4 rounded-2xl border text-sm font-medium outline-none transition-all ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50 border-[#F2EDE7] text-gray-900 focus:border-[#8B5E3C]"
                }`}
              />
              <Search size={18} className={`absolute left-4 top-3.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
            </div>
            
            <button 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`h-11 px-4 rounded-2xl flex items-center gap-2 border text-xs font-black uppercase tracking-widest transition-all ${
                isFiltersOpen 
                  ? (isDark ? "bg-[rgba(201,169,110,0.1)] border-[#C9A96E] text-[#E8C98A]" : "bg-[#FBF9F6] border-[#8B5E3C] text-[#8B5E3C]")
                  : (isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[#C8BFB4]" : "bg-white border-[#F2EDE7] text-gray-500")
              }`}
            >
              <Filter size={16} />
              <span>Filters</span>
            </button>
            
            <button 
              onClick={loadSales}
              className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all ${
                isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[#7A7572] hover:text-[#C9A96E]" : "bg-white border-[#F2EDE7] text-gray-400 hover:text-[#8B5E3C]"
              }`}
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {isFiltersOpen && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t ${isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2EDE7]"}`}>
            <div className="space-y-1.5">
              <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Branch Location</label>
              <div className="relative">
                <select 
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  disabled={isManager}
                  className={`w-full h-10 pl-10 pr-10 rounded-xl border appearance-none text-xs font-bold outline-none transition-all disabled:opacity-50 ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50 border-[#F2EDE7] text-gray-900"
                  }`}
                >
                  <option value="all">All Locations</option>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.city || loc.name}</option>)}
                </select>
                <MapPin size={14} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                <ChevronDown size={14} className="absolute right-3.5 top-3 opacity-30" />
              </div>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Date Range</label>
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className={`flex-1 h-10 px-3 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50 border-[#F2EDE7] text-gray-900 focus:border-[#8B5E3C]"
                  }`}
                />
                <span className={`text-[10px] font-black uppercase opacity-40 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>to</span>
                <input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className={`flex-1 h-10 px-3 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3] focus:border-[#C9A96E]" : "bg-gray-50 border-[#F2EDE7] text-gray-900 focus:border-[#8B5E3C]"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Payment Channel</label>
              <div className="relative">
                <select 
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className={`w-full h-10 pl-10 pr-10 rounded-xl border appearance-none text-xs font-bold outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50 border-[#F2EDE7] text-gray-900"
                  }`}
                >
                  <option value="all">All Channels</option>
                  <option value="CASH">Cash Settlement</option>
                  <option value="UPI">UPI / Digital</option>
                  <option value="CARD">Credit / Debit Card</option>
                </select>
                <Wallet size={14} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                <ChevronDown size={14} className="absolute right-3.5 top-3 opacity-30" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Lead Staff</label>
              <div className="relative">
                <select 
                  value={filters.staffId}
                  onChange={(e) => setFilters(prev => ({ ...prev, staffId: e.target.value }))}
                  className={`w-full h-10 pl-10 pr-10 rounded-xl border appearance-none text-xs font-bold outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50 border-[#F2EDE7] text-gray-900"
                  }`}
                >
                  <option value="all">All Personnel</option>
                  {staffMembers.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
                <User size={14} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                <ChevronDown size={14} className="absolute right-3.5 top-3 opacity-30" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Service Point</label>
              <div className="relative">
                <select 
                  value={filters.serviceId}
                  onChange={(e) => setFilters(prev => ({ ...prev, serviceId: e.target.value }))}
                  className={`w-full h-10 pl-10 pr-10 rounded-xl border appearance-none text-xs font-bold outline-none transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50 border-[#F2EDE7] text-gray-900"
                  }`}
                >
                  <option value="all">All Services</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Banknote size={14} className={`absolute left-3.5 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
                <ChevronDown size={14} className="absolute right-3.5 top-3 opacity-30" />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button 
                onClick={handleResetFilters}
                className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  isDark ? "bg-[rgba(248,113,113,0.05)] text-[#F87171] hover:bg-[rgba(248,113,113,0.1)]" : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`flex-1 rounded-[32px] border shadow-sm overflow-hidden flex flex-col transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className={`border-b transition-all ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#F2EDE7]"}`}>
                <th 
                  className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer group ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}
                  onClick={() => toggleSort("createdAt")}
                >
                  <div className="flex items-center gap-2">
                    Timestamp {getSortIcon("createdAt")}
                  </div>
                </th>
                <th 
                  className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer group ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}
                  onClick={() => toggleSort("clientName")}
                >
                  <div className="flex items-center gap-2">
                    Client Credentials {getSortIcon("clientName")}
                  </div>
                </th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Service Point</th>
                <th 
                  className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer group ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}
                  onClick={() => toggleSort("totalAmount")}
                >
                  <div className="flex items-center gap-2">
                    Settlement {getSortIcon("totalAmount")}
                  </div>
                </th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Channel</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className={`h-10 w-10 border-4 rounded-full border-t-transparent animate-spin ${isDark ? "border-[#C9A96E]" : "border-[#8B5E3C]"}`} />
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Synchronizing ledger history…</p>
                    </div>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center">
                    <div className={`inline-flex items-center justify-center h-20 w-20 rounded-[28px] mb-6 shadow-xl transform rotate-6 ${
                      isDark ? "bg-[#1C2030] text-[#7A7572]" : "bg-[#FBF9F6] text-gray-300"
                    }`}>
                      <ReceiptText size={40} />
                    </div>
                    <h3 className={`text-xl font-black font-['Outfit'] mb-2 ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>No Transaction Records</h3>
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-8 ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>The current filter parameters yielded zero matches.</p>
                    
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={handleResetFilters}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          isDark ? "bg-[rgba(255,255,255,0.03)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.08)]" : "bg-white border border-[#F2EDE7] text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Reset All Filters
                      </button>
                      <button 
                        onClick={() => navigate("/dashboard/sales")}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 ${
                          isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-gray-900 text-white"
                        }`}
                      >
                        <Plus size={14} className="inline mr-2" />
                        Initiate New Sale
                      </button>
                    </div>
                  </td>
                </tr>
              ) : sales.map(s => (
                <>
                  <tr 
                    key={s.id}
                    className={`group transition-all cursor-pointer ${
                      expandedRowId === s.id 
                        ? (isDark ? "bg-[rgba(201,169,110,0.05)]" : "bg-[#FBF9F6]")
                        : (isDark ? "hover:bg-[rgba(255,255,255,0.02)]" : "hover:bg-gray-50")
                    }`}
                    onClick={() => setExpandedRowId(expandedRowId === s.id ? null : s.id)}
                  >
                    <td className="px-6 py-5">
                      <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{new Date(s.createdAt).toLocaleDateString()}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                        {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                          isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"
                        }`}>
                          <User size={16} />
                        </div>
                        <div>
                          <div className={`text-sm font-black ${isDark ? "text-[#C8BFB4]" : "text-gray-800"}`}>{s.clientName}</div>
                          <div className={`text-[10px] font-bold tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>{s.clientPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                        <span className={`text-xs font-black uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>{s.locationName}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-5 text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{Number(s.totalAmount).toLocaleString()}</td>
                    <td className="px-6 py-5">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        s.paymentMethod === 'CASH' 
                          ? (isDark ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.2)]' : 'bg-green-50 text-green-700 border-green-200') :
                        s.paymentMethod === 'UPI' 
                          ? (isDark ? 'bg-[rgba(59,130,246,0.1)] text-[#3B82F6] border-[rgba(59,130,246,0.2)]' : 'bg-blue-50 text-blue-700 border-blue-200') :
                          (isDark ? 'bg-[rgba(168,85,247,0.1)] text-[#A855F7] border-[rgba(168,85,247,0.2)]' : 'bg-purple-50 text-purple-700 border-purple-200')
                      }`}>
                        {s.paymentMethod === 'CASH' ? <Banknote size={10} /> : s.paymentMethod === 'UPI' ? <Smartphone size={10} /> : <CreditCard size={10} />}
                        {s.paymentMethod}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ml-auto ${
                        expandedRowId === s.id 
                          ? (isDark ? "bg-[#C9A96E] text-[#0F1115]" : "bg-[#8B5E3C] text-white")
                          : (isDark ? "bg-[rgba(255,255,255,0.03)] text-[#7A7572]" : "bg-gray-50 text-gray-400")
                      }`}>
                        {expandedRowId === s.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </td>
                  </tr>
                  
                  {expandedRowId === s.id && (
                    <tr key={`${s.id}-expanded`} className={isDark ? "bg-[rgba(201,169,110,0.02)]" : "bg-[#FCFAF8]"}>
                      <td colSpan={6} className="px-12 py-8 border-b border-[rgba(201,169,110,0.1)]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="space-y-6">
                            <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Transaction Breakdown</h4>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className={`text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Transaction ID</span>
                                <span className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{s.id.slice(0, 8)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Settlement Channel</span>
                                <span className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{s.paymentMethod}</span>
                              </div>

                            </div>
                          </div>

                          <div className="md:col-span-2 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Itemized Receipt</h4>
                              <button 
                                onClick={(e) => { e.stopPropagation(); window.print(); }}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                                  isDark ? "bg-[rgba(255,255,255,0.03)] text-[#C8BFB4] hover:bg-[rgba(201,169,110,0.1)]" : "bg-white border-[#F2EDE7] text-gray-500 hover:bg-gray-50"
                                }`}
                              >
                                <Printer size={14} />
                                Print Invoice
                              </button>
                            </div>
                            
                            {/* <div className={`p-6 rounded-3xl border ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-white border-[#F2EDE7]"}`}>
                               <p className={`text-center text-[10px] font-bold italic ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>
                                 Inline expansion provides a quick snapshot. For full ledger reconstruction, line-item details, and modifications, please refer to the POS module or generate a detailed PDF invoice.
                               </p>
                            </div> */}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
