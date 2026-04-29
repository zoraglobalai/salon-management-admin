import { useState, useEffect } from "react";
import { fetchSales, fetchSaleById, type SaleRecord, type SaleDetail } from "../../../core/api";
import { Calendar, User, CreditCard, ChevronRight, X, Clock, MapPin, ReceiptText } from "lucide-react";

export function DashboardSalesHistoryPage() {
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
      alert("Failed to fetch sale details");
    } finally {
      setIsDetailLoading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-[var(--muted)]">Loading sales history...</div>;

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-120px)] relative">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm">
        <h2 className="text-xl font-black text-gray-900 font-['Outfit']">Sales History</h2>
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
          <Calendar size={14} />
          <span>Last 30 Days</span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-[var(--line)] shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-[var(--line)]">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Client</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Method</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{new Date(s.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-[var(--muted)]">{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                        <User size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{s.clientName}</div>
                        <div className="text-[10px] text-[var(--muted)]">{s.clientPhone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-[var(--muted)]">
                      <MapPin size={12} />
                      <span className="text-xs font-medium">{s.locationName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black text-gray-900 text-sm">₹{Number(s.totalAmount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      s.paymentMethod === 'CASH' ? 'bg-green-50 text-green-700 border-green-200' :
                      s.paymentMethod === 'UPI' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleViewDetail(s.id)}
                      className="p-2 rounded-lg hover:bg-gray-200 text-[var(--muted)] group-hover:text-[#744230] transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-[var(--muted)]">
                    <ReceiptText size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-medium">No sales recorded yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSaleId && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex justify-end transition-all">
          <div className="w-full max-w-md bg-white border-l border-[var(--line)] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-[var(--line)] flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#744230] flex items-center justify-center text-white shadow-lg shadow-[#744230]/20">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 font-['Outfit']">Sale Receipt</h3>
                  <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">ID: {selectedSaleId.slice(0, 8)}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSaleId(null)}
                className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-[var(--line)] transition-all"
              >
                <X size={20} className="text-[var(--muted)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--muted)]">
                  <Clock size={32} className="animate-spin" />
                  <p className="text-xs font-bold uppercase">Fetching details...</p>
                </div>
              ) : saleDetail && (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Client</label>
                        <div className="text-sm font-black text-gray-900">{saleDetail.clientName}</div>
                        <div className="text-xs font-medium text-[var(--muted)]">{saleDetail.clientPhone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-900">{new Date(saleDetail.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] font-medium text-[var(--muted)]">{new Date(saleDetail.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 py-3 border-y border-[var(--line)]">
                      <MapPin size={14} className="text-[#744230]" />
                      <span className="text-xs font-bold text-gray-700">{saleDetail.locationName}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Items & Services</h4>
                    <div className="space-y-3">
                      {saleDetail.services.map((s, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-bold text-gray-900">{s.service_name}</div>
                            <div className="text-[10px] font-medium text-[var(--muted)]">Provider: {s.staff_name}</div>
                          </div>
                          <span className="text-sm font-black text-gray-900">₹{s.price}</span>
                        </div>
                      ))}
                      {saleDetail.products.map((p, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-bold text-gray-900">{p.product_name}</div>
                            <div className="text-[10px] font-medium text-[var(--muted)]">Qty: {p.quantity}</div>
                          </div>
                          <span className="text-sm font-black text-gray-900">₹{p.price * p.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-[var(--line)]">
                    <div className="flex justify-between text-xs font-medium text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{saleDetail.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-red-500">
                      <span>Discount ({saleDetail.discountType})</span>
                      <span>- ₹{saleDetail.discount}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[var(--line)]">
                      <span className="text-sm font-black text-gray-900">Grand Total</span>
                      <span className="text-lg font-black text-[#744230]">₹{saleDetail.totalAmount}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-blue-600" />
                      <span className="text-xs font-bold text-blue-700">Paid via {saleDetail.paymentMethod}</span>
                    </div>
                    <div className="text-sm font-black text-blue-700">₹{saleDetail.paidAmount}</div>
                  </div>
                </>
              )}
            </div>
            
            <div className="p-6 border-t border-[var(--line)]">
              <button 
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition-colors flex items-center justify-center gap-2"
              >
                <ReceiptText size={18} /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
