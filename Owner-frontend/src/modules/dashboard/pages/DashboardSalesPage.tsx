import { useEffect, useState } from "react";
import { fetchResource } from "../../../core/api";
import type { ResourceItem } from "../../../core/types";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { Search, Plus, Calendar, Filter, ChevronDown, Download, Info, MoreHorizontal, Receipt, Clock } from "lucide-react";

type SalesTab = "sales" | "drafts";
type SortOption = "newest" | "oldest" | "highest" | "lowest";

type SaleRecord = {
  id: string;
  saleDate: string;
  amount: number;
  paymentMethod: string;
  clientId: string | null;
  appointmentId: string | null;
};

type ClientRecord = {
  id: string;
  fullName: string;
};

type DraftRecord = {
  id: string;
  title: string;
  updatedAt: string;
  status: string;
};

function asString(value: ResourceItem[string]) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: ResourceItem[string]) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function normalizeSales(items: ResourceItem[]): SaleRecord[] {
  return items.map((item) => ({
    id: String(item.id),
    saleDate: asString(item.sale_date) || "",
    amount: asNumber(item.amount),
    paymentMethod: asString(item.payment_method) || "Other",
    clientId: asString(item.client_id),
    appointmentId: asString(item.appointment_id),
  }));
}

function normalizeClients(items: ResourceItem[]): ClientRecord[] {
  return items.map((item) => ({
    id: String(item.id),
    fullName: asString(item.full_name) || "Walk-in client",
  }));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString();
}

export function DashboardSalesPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<SalesTab>("sales");
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [todayOnly, setTodayOnly] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [status, setStatus] = useState("Loading transactions...");

  const drafts: DraftRecord[] = [
    {
      id: "draft-1",
      title: "Color package - waiting for payment",
      updatedAt: new Date().toISOString(),
      status: "Draft",
    },
    {
      id: "draft-2",
      title: "Product bundle checkout",
      updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      status: "Draft",
    },
  ];

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchResource("sales"), fetchResource("clients")])
      .then(([salesResponse, clientsResponse]) => {
        if (!isMounted) {
          return;
        }

        const normalizedSales = normalizeSales(salesResponse.items);
        setSales(normalizedSales);
        setClients(normalizeClients(clientsResponse.items));
        setStatus(normalizedSales.length ? "" : "No records found");
      })
      .catch((error: Error) => {
        if (isMounted) {
          setStatus(error.message || "Unable to load ledger");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const clientMap = new Map(clients.map((client) => [client.id, client.fullName]));
  const paymentMethods = Array.from(new Set(sales.map((sale) => sale.paymentMethod))).sort();

  const filteredSales = sales
    .map((sale) => ({
      ...sale,
      clientName: sale.clientId ? clientMap.get(sale.clientId) || "Walk-in client" : "Walk-in client",
    }))
    .filter((sale) => {
      if (todayOnly && !isToday(sale.saleDate)) {
        return false;
      }

      if (paymentFilter !== "all" && sale.paymentMethod !== paymentFilter) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const query = searchTerm.trim().toLowerCase();
      return [sale.id, sale.clientName, sale.paymentMethod, formatCurrency(sale.amount)]
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort((left, right) => {
      if (sortBy === "oldest") {
        return left.saleDate.localeCompare(right.saleDate);
      }

      if (sortBy === "highest") {
        return right.amount - left.amount;
      }

      if (sortBy === "lowest") {
        return left.amount - right.amount;
      }

      return right.saleDate.localeCompare(left.saleDate);
    });

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className={`flex flex-col gap-4 rounded-3xl border p-6 shadow-sm md:flex-row md:items-center md:justify-between transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div>
          <h2 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Financial Ledger</h2>
          <p className={`mt-1 text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>
            Comprehensive history of salon transactions and settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
            isDark ? "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.08)]" : "bg-gray-50 border border-[#E8E1D8] text-gray-700 hover:bg-gray-100"
          }`} type="button">
            <Download size={14} />
            Export
          </button>
          <button className={`flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 ${
            isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] hover:bg-[#744A2E]"
          }`} type="button">
            <Plus size={16} />
            New Transaction
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl w-fit transition-all bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
        <button
          className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "sales" 
              ? (isDark ? "bg-[#1C2030] text-[#E8C98A] shadow-md" : "bg-white text-[#8B5E3C] shadow-sm")
              : (isDark ? "text-[#4A4744] hover:text-[#7A7572]" : "text-gray-400 hover:text-gray-600")
          }`}
          type="button"
          onClick={() => setActiveTab("sales")}
        >
          <Receipt size={14} />
          Settled
        </button>
        <button
          className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "drafts" 
              ? (isDark ? "bg-[#1C2030] text-[#E8C98A] shadow-md" : "bg-white text-[#8B5E3C] shadow-sm")
              : (isDark ? "text-[#4A4744] hover:text-[#7A7572]" : "text-gray-400 hover:text-gray-600")
          }`}
          type="button"
          onClick={() => setActiveTab("drafts")}
        >
          <Clock size={14} />
          Pending
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by ID, client or amount…"
            className={`w-full rounded-2xl border pl-12 pr-4 py-3 text-sm outline-none transition-all ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#F0EBE3] focus:border-[#C9A96E] placeholder:text-[#4A4744]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-900 focus:border-[#8B5E3C]"
            }`}
          />
          <Search size={18} className={`absolute left-4 top-3.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`} />
        </div>

        <button
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all border ${
            todayOnly 
              ? (isDark ? "bg-[rgba(201,169,110,0.1)] border-[#C9A96E] text-[#E8C98A]" : "bg-[#FBF9F6] border-[#8B5E3C] text-[#8B5E3C]")
              : (isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)] text-[#7A7572]" : "bg-white border-[#E8E1D8] text-gray-500")
          }`}
          type="button"
          onClick={() => setTodayOnly((current) => !current)}
        >
          <Calendar size={16} />
          Today Only
        </button>

        <div className="relative">
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}
            className={`appearance-none rounded-2xl border pl-10 pr-10 py-3 text-sm font-bold outline-none transition-all ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4] focus:border-[#C9A96E]" : "bg-white border-[#E8E1D8] text-gray-700 focus:border-[#8B5E3C]"
            }`}>
            <option value="all">All Channels</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          <Filter size={16} className={`absolute left-4 top-4 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
          <ChevronDown size={14} className={`absolute right-4 top-4.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
        </div>

        <div className="relative">
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}
            className={`appearance-none rounded-2xl border pl-5 pr-10 py-3 text-sm font-bold outline-none transition-all ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4] focus:border-[#C9A96E]" : "bg-white border-[#E8E1D8] text-gray-700 focus:border-[#8B5E3C]"
            }`}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Value: High to Low</option>
            <option value="lowest">Value: Low to High</option>
          </select>
          <ChevronDown size={14} className={`absolute right-4 top-4.5 pointer-events-none ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 rounded-3xl border shadow-sm overflow-hidden transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        {activeTab === "sales" ? (
          <div className="h-full flex flex-col">
            {filteredSales.length ? (
              <>
                <div className={`px-6 py-4 flex items-center justify-between border-b ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#F2EDE7]"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{filteredSales.length} Transactions</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg ${isDark ? "bg-[#151821] text-[#7A7572]" : "bg-white text-gray-400"}`}>
                      {todayOnly ? "Today's Cycle" : "Full Period"}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className={`border-b ${isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2EDE7]"}`}>
                        <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Timestamp & ID</th>
                        <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Client</th>
                        <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Payment</th>
                        <th className={`p-4 text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Context</th>
                        <th className={`p-4 text-[10px] font-black uppercase tracking-widest text-right ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className={`transition-all ${isDark ? "hover:bg-[rgba(255,255,255,0.02)]" : "hover:bg-gray-50"}`}>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className={`text-sm font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{formatDateTime(sale.saleDate)}</span>
                              <span className={`text-[10px] font-mono tracking-widest mt-0.5 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>TXN-{sale.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                          </td>
                          <td className={`p-4 text-sm font-medium ${isDark ? "text-[#C8BFB4]" : "text-gray-700"}`}>{sale.clientName}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-gray-100 text-gray-600"
                            }`}>
                              {sale.paymentMethod}
                            </span>
                          </td>
                          <td className={`p-4 text-xs ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                            {sale.appointmentId ? (
                              <div className="flex items-center gap-1.5">
                                <Calendar size={12} className="opacity-50" />
                                <span>APPT-{sale.appointmentId.slice(0, 6).toUpperCase()}</span>
                              </div>
                            ) : "Direct POS"}
                          </td>
                          <td className={`p-4 text-right text-sm font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>
                            {formatCurrency(sale.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className={`h-20 w-20 rounded-[28px] flex items-center justify-center mb-6 shadow-lg transform rotate-6 transition-transform hover:rotate-0 ${
                  isDark ? "bg-[#1C2030] text-[#C9A96E]" : "bg-[#FBF9F6] text-[#8B5E3C]"
                }`}>
                  <MoreHorizontal size={32} />
                </div>
                <h3 className={`text-xl font-bold font-['Outfit'] mb-2 ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{status || "No Transactions Found"}</h3>
                <p className={`text-sm max-w-xs leading-relaxed ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                  {status && status !== "No records found"
                    ? "We encountered an issue while fetching the ledger details."
                    : todayOnly
                      ? "The financial ledger is empty for the current date."
                      : "Adjust your filters to locate historical transaction records."}
                </p>
                <button className={`mt-8 flex items-center gap-2 rounded-full px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 ${
                  isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)] shadow-[0_8px_20px_rgba(201,169,110,0.15)]" : "bg-[#8B5E3C] hover:bg-[#744A2E]"
                }`} type="button">
                  <Plus size={16} />
                  Initiate Sale
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{drafts.length} Pending Checkouts</span>
                <Info size={12} className={isDark ? "text-[#7A7572]" : "text-gray-400"} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drafts.map((draft) => (
                <article key={draft.id} className={`group flex flex-col rounded-[28px] border p-6 transition-all hover:shadow-xl hover:-translate-y-1 ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.06)] hover:border-[rgba(201,169,110,0.3)]" : "bg-white border-[#E8E1D8] hover:border-[#8B5E3C]"
                }`}>
                  <span className={`w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 ${
                    isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-gray-100 text-gray-500"
                  }`}>
                    {draft.status}
                  </span>
                  <h3 className={`text-lg font-black font-['Outfit'] mb-2 leading-tight ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{draft.title}</h3>
                  <div className="flex items-center gap-2 mb-6 text-[10px] font-bold uppercase tracking-widest opacity-60">
                    <Clock size={12} />
                    <span>{formatDateTime(draft.updatedAt)}</span>
                  </div>
                  <button className={`mt-auto w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDark ? "bg-[rgba(255,255,255,0.03)] text-[#C8BFB4] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.06)]" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`} type="button">
                    Continue Checkout
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
