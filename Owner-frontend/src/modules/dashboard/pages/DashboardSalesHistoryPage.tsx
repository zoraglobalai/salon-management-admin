import { useState, useEffect } from "react";
import { fetchSales, fetchSaleById, type SaleRecord, type SaleDetail } from "../../../core/api";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { Calendar, User, CreditCard, X, MapPin, ReceiptText, Printer, ArrowRight, Wallet, Smartphone, Banknote } from "lucide-react";

export function DashboardSalesHistoryPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [saleDetail, setSaleDetail] = useState<SaleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    fetchSales()
      .then(r => setSales(r.sales))
      .finally(() => setIsLoading(false));
  }, []);

  const handleViewDetail = async (id: string) => {
    setSelectedSaleId(id);
    setIsDetailLoading(true);
    try {
      const r = await fetchSaleById(id);
      setSaleDetail(r.sale);
    } catch (err) {
      console.error("Failed to fetch sale details", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
        Synchronizing ledger history…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full relative">
      {/* Premium Header */}
      <div className={`flex items-center justify-between p-6 rounded-[32px] border shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div>
          <h2 className={`text-2xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Sales Archive</h2>
          <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
            Historical records of all settled transactions
          </p>
        </div>
        <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 border text-xs font-black uppercase tracking-widest ${
          isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-[#C8BFB4]" : "bg-gray-50 border-[#F2EDE7] text-gray-500"
        }`}>
          <Calendar size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
          <span>Last 30 Cycles</span>
        </div>
      </div>

      <div className={`flex-1 rounded-[32px] border shadow-sm overflow-hidden flex flex-col transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className={`border-b transition-all ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#F2EDE7]"}`}>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Timestamp</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Client Credentials</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Service Point</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Settlement</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Channel</th>
                <th className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {sales.map(s => (
                <tr key={s.id} className={`group transition-all ${isDark ? "hover:bg-[rgba(255,255,255,0.02)]" : "hover:bg-gray-50"}`}>
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
                    <button 
                      onClick={() => handleViewDetail(s.id)}
                      className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                        isDark ? "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[#7A7572] hover:border-[#C9A96E] hover:text-[#E8C98A]" : "bg-gray-50 border border-[#F2EDE7] text-gray-400 hover:border-[#8B5E3C] hover:text-[#8B5E3C]"
                      }`}
                    >
                      <ArrowRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center">
                    <div className={`inline-flex items-center justify-center h-20 w-20 rounded-[28px] mb-6 shadow-xl transform rotate-6 ${
                      isDark ? "bg-[#1C2030] text-[#7A7572]" : "bg-[#FBF9F6] text-gray-300"
                    }`}>
                      <ReceiptText size={40} />
                    </div>
                    <p className={`text-sm font-black uppercase tracking-[0.2em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>No archived settlements found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSaleId && (
        <div className="absolute inset-0 bg-[rgba(15,17,21,0.6)] backdrop-blur-sm z-[100] flex justify-end transition-all">
          <div className={`w-full max-w-md border-l shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
          }`}>
            <div className={`p-6 border-b flex justify-between items-center transition-all ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-[#F2EDE7]"
            }`}>
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform rotate-3 ${
                  isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[#8B5E3C] text-white"
                }`}>
                  <ReceiptText size={24} />
                </div>
                <div>
                  <h3 className={`text-xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Transaction Receipt</h3>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-0.5 ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>TXN-{selectedSaleId.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSaleId(null)}
                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                  isDark ? "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[#7A7572] hover:text-[#F87171]" : "bg-white border-[#F2EDE7] text-gray-400 hover:text-red-600"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-10">
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className={`h-10 w-10 border-4 rounded-full border-t-transparent animate-spin ${isDark ? "border-[#C9A96E]" : "border-[#8B5E3C]"}`} />
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Reconstructing ledger…</p>
                </div>
              ) : saleDetail && (
                <>
                  <div className="grid grid-cols-2 gap-6 pb-6 border-b border-[rgba(255,255,255,0.05)]">
                    <div className="space-y-1.5">
                      <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Client Entity</label>
                      <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{saleDetail.clientName}</div>
                      <div className={`text-[10px] font-bold tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{saleDetail.clientPhone}</div>
                    </div>
                    <div className="text-right space-y-1.5">
                      <label className={`text-[9px] font-black uppercase tracking-widest ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Cycle Timestamp</label>
                      <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{new Date(saleDetail.createdAt).toLocaleDateString()}</div>
                      <div className={`text-[10px] font-bold tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{new Date(saleDetail.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
                    isDark ? "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)]" : "bg-gray-50/50 border-[#F2EDE7]"
                  }`}>
                    <MapPin size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                    <span className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-[#C8BFB4]" : "text-gray-700"}`}>{saleDetail.locationName}</span>
                  </div>

                  <div className="space-y-6">
                    <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>Line Items</h4>
                    <div className="space-y-4">
                      {saleDetail.services.map((s, i) => (
                        <div key={i} className="flex justify-between items-start group">
                          <div className="space-y-1">
                            <div className={`text-sm font-black ${isDark ? "text-[#C8BFB4]" : "text-gray-800"}`}>{s.service_name}</div>
                            <div className="flex items-center gap-1.5">
                              <User size={10} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                              <div className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Lead: {s.staff_name}</div>
                            </div>
                          </div>
                          <span className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>₹{s.price}</span>
                        </div>
                      ))}
                      {saleDetail.products.map((p, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className={`text-sm font-black ${isDark ? "text-[#C8BFB4]" : "text-gray-800"}`}>{p.product_name}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Quantity: {p.quantity} Units</div>
                          </div>
                          <span className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>₹{p.price * p.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`space-y-4 p-6 rounded-[28px] border transition-all ${
                    isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)] shadow-xl" : "bg-gray-50 border-[#F2EDE7]"
                  }`}>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest opacity-60">
                      <span>Subtotal</span>
                      <span className={isDark ? "text-[#F0EBE3]" : "text-gray-900"}>₹{saleDetail.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-red-400">
                      <span>Reduction ({saleDetail.discountType})</span>
                      <span>- ₹{saleDetail.discount}</span>
                    </div>
                    <div className={`flex justify-between items-center pt-4 border-t ${isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2EDE7]"}`}>
                      <span className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>Final Amount</span>
                      <span className={`text-2xl font-black ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>₹{saleDetail.totalAmount}</span>
                    </div>
                  </div>

                  <div className={`flex justify-between items-center p-5 rounded-[28px] border transition-all ${
                    isDark ? "bg-[rgba(59,130,246,0.05)] border-[rgba(59,130,246,0.1)]" : "bg-blue-50/50 border-blue-100"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${isDark ? "bg-[rgba(59,130,246,0.1)] text-[#3B82F6]" : "bg-blue-100 text-blue-600"}`}>
                        <Wallet size={16} />
                      </div>
                      <div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#3B82F6]" : "text-blue-700"}`}>Settlement Channel</div>
                        <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{saleDetail.paymentMethod}</div>
                      </div>
                    </div>
                    <div className={`text-lg font-black ${isDark ? "text-[#3B82F6]" : "text-blue-700"}`}>₹{saleDetail.paidAmount}</div>
                  </div>
                </>
              )}
            </div>
            
            <div className={`p-6 border-t transition-all ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-gray-50 border-[#F2EDE7]"}`}>
              <button 
                onClick={() => window.print()}
                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3 ${
                  isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-gray-900 text-white"
                }`}
              >
                <Printer size={18} />
                Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
