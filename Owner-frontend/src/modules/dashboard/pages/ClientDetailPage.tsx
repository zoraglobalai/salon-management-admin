import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchClientById, type CustomerDetailRecord } from "../../../core/api";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { ArrowLeft, Phone, MapPin, MessageSquare, History, Package, Scissors, CreditCard, Plus, ReceiptText } from "lucide-react";

const TAG_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50",
  REGULAR: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50",
  VIP: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function InfoRow({ label, value, isDark }: { label: string; value: string | number; isDark: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>{label}</span>
      <span className={`text-sm font-medium ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{value || "—"}</span>
    </div>
  );
}

function Card({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all ${
      isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
    }`}>
      <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 pb-3 border-b transition-all ${
        isDark ? "text-[#C9A96E] border-[rgba(255,255,255,0.05)]" : "text-[#8B5E3C] border-[#F2EDE7]"
      }`}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  const [client, setClient] = useState<CustomerDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchClientById(id)
      .then((r) => { setClient(r.client); setError(null); })
      .catch((e: Error) => setError(e.message || "Failed to load customer."))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading customer profile…</div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className={`text-sm ${isDark ? "text-[#F87171]" : "text-red-600"}`}>{error || "Customer not found."}</p>
        <button onClick={() => navigate(-1)} type="button"
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
            isDark ? "bg-[#1C2030] text-[#C8BFB4] hover:bg-[#252A3D]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}>
          <ArrowLeft size={16} />
          Back to List
        </button>
      </div>
    );
  }

  const followUpDue = client.nextFollowUpDate
    ? new Date(client.nextFollowUpDate) <= new Date()
    : false;

  const formatMoney = (value: number) => `Rs ${value.toLocaleString("en-IN")}`;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className={`rounded-[32px] border p-6 shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <button onClick={() => navigate(-1)} type="button"
          className={`mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors ${
            isDark ? "text-[#7A7572] hover:text-[#C9A96E]" : "text-gray-400 hover:text-[#8B5E3C]"
          }`}>
          <ArrowLeft size={14} />
          Back to Customers
        </button>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className={`h-24 w-24 shrink-0 rounded-3xl flex items-center justify-center text-3xl font-bold shadow-xl transform rotate-3 transition-all ${
            isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[linear-gradient(135deg,#8B5E3C,#4E2D1B)] text-white"
          }`}>
            <span className="-rotate-3">{client.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className={`text-3xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{client.name}</h2>
              <span className={`rounded-full border px-4 py-1 text-[10px] font-black uppercase tracking-tighter ${TAG_COLORS[client.tag] || "bg-gray-100 text-gray-600"}`}>
                {client.tag}
              </span>
              {followUpDue && client.nextFollowUpDate && (
                <span className={`rounded-full border px-4 py-1 text-[10px] font-black uppercase tracking-tighter ${
                  isDark ? "bg-[rgba(248,113,113,0.1)] text-[#F87171] border-[rgba(248,113,113,0.2)]" : "border-red-200 bg-red-50 text-red-600"
                }`}>
                  Follow-up Due
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-5">
              <div className="flex items-center gap-1.5">
                <Phone size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                <span className={`text-sm font-medium ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{client.phoneNumber}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                <span className={`text-sm font-medium ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{client.locationName}</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard/sales/pos/new")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                  isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[#8B5E3C] text-white"
                }`}
              >
                <Plus size={14} />
                New Sale
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/sales/history")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                  isDark ? "bg-[#1C2030] text-[#F0EBE3]" : "bg-[#F5EFE8] text-[#8B5E3C]"
                }`}
              >
                <ReceiptText size={14} />
                Sales History
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card title="Customer Profile" isDark={isDark}>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <InfoRow label="Full Name" value={client.name} isDark={isDark} />
            <InfoRow label="Phone" value={client.phoneNumber} isDark={isDark} />
            <InfoRow label="Hair Type" value={client.hairType} isDark={isDark} />
            <InfoRow label="Customer Tag" value={client.tag} isDark={isDark} />
            <InfoRow label="Location" value={client.locationName} isDark={isDark} />
            <InfoRow label="Member Since" value={fmtDate(client.createdAt)} isDark={isDark} />
          </div>
        </Card>

        {/* Insights */}
        <Card title="Visit Analytics" isDark={isDark}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`text-center p-4 rounded-2xl border transition-all ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-[#FBF9F6] border-[#E8E1D8]"
            }`}>
              <div className={`text-3xl font-black ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>{client.totalVisits}</div>
              <div className={`text-[9px] font-bold uppercase tracking-wider mt-2 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Visits</div>
            </div>
            <div className={`text-center p-4 rounded-2xl border transition-all ${
              isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-[#FBF9F6] border-[#E8E1D8]"
            }`}>
              <div className={`text-xs font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{fmtDate(client.lastVisitAt).split(" ").slice(0, 2).join(" ")}</div>
              <div className={`text-[9px] font-bold uppercase tracking-wider mt-2 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Last Visit</div>
            </div>
            <div className={`text-center p-4 rounded-2xl border transition-all ${
              followUpDue 
                ? (isDark ? "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)]" : "bg-red-50 border-red-200") 
                : (isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.05)]" : "bg-[#FBF9F6] border-[#E8E1D8]")
            }`}>
              <div className={`text-xs font-black ${followUpDue ? "text-red-500" : (isDark ? "text-[#F0EBE3]" : "text-gray-900")}`}>
                {client.nextFollowUpDate ? fmtDate(client.nextFollowUpDate).split(" ").slice(0, 2).join(" ") : "—"}
              </div>
              <div className={`text-[9px] font-bold uppercase tracking-wider mt-2 ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Follow-up</div>
            </div>
          </div>
        </Card>

        {/* Hair Problems */}
        {client.problems.length > 0 && (
          <Card title="Focus Areas & Concerns" isDark={isDark}>
            <div className="flex flex-wrap gap-2">
              {client.problems.map((p) => (
                <span key={p} className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
                  isDark ? "bg-[rgba(201,169,110,0.1)] border-[rgba(201,169,110,0.2)] text-[#E8C98A]" : "bg-orange-50 border-orange-100 text-orange-700"
                }`}>
                  {p}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Notes */}
        {client.notes && (
          <Card title="Consultation Notes" isDark={isDark}>
            <div className={`p-4 rounded-xl text-sm leading-relaxed whitespace-pre-line ${
              isDark ? "bg-[#1C2030] text-[#C8BFB4]" : "bg-gray-50 text-gray-700"
            }`}>
              <MessageSquare size={16} className={`inline-block mr-2 -mt-1 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              {client.notes}
            </div>
          </Card>
        )}
      </div>

      {/* Visit History */}
      <div className={`rounded-[32px] border p-6 transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h4 className={`text-sm font-black uppercase tracking-[0.24em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>Visit History</h4>
            {/* <p className={`mt-2 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
              Recent services and products purchased by this customer.
            </p> */}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isDark ? "bg-[#1C2030] text-[#C9A96E]" : "bg-[#f6eee6] text-[#8B5E3C]"}`}>
            <History size={22} />
          </div>
        </div>

        {client.recentVisits.length === 0 ? (
          <div className={`rounded-[28px] border border-dashed p-8 text-center transition-all ${
            isDark ? "bg-[#11141c] border-[rgba(255,255,255,0.08)]" : "bg-gray-50 border-[#E8E1D8]"
          }`}>
            <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${isDark ? "bg-[#1C2030] text-[#7A7572]" : "bg-white text-gray-300"}`}>
              <History size={24} />
            </div>
            <p className={`text-sm font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>No visit history yet</p>
            <p className={`mt-2 text-xs mx-auto max-w-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
              Visits will appear here after this customer completes services or product purchases.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {client.recentVisits.map((visit) => (
              <div
                key={visit.saleId}
                className={`rounded-[26px] border p-5 transition-all ${
                  isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.07)]" : "bg-[#fcfaf7] border-[#eee3d7]"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                        isDark ? "bg-[rgba(201,169,110,0.14)] text-[#E8C98A]" : "bg-[#f3e5d6] text-[#8B5E3C]"
                      }`}>
                        {new Date(visit.saleDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                        isDark ? "bg-[#151821] text-[#7A7572]" : "bg-white text-gray-500 border border-[#eadfd3]"
                      }`}>
                        {visit.paymentMethod}
                      </span>
                    </div>
                    <p className={`mt-3 text-lg font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{visit.locationName}</p>
                    <p className={`mt-1 text-sm ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                      Sale ID: {visit.saleId.slice(0, 8)} • Total {formatMoney(visit.totalAmount)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                    <div className={`rounded-2xl border p-3 text-center ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#151821]" : "border-[#eadfd3] bg-white"}`}>
                      <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${isDark ? "bg-[rgba(201,169,110,0.12)] text-[#C9A96E]" : "bg-[#f7eadc] text-[#8B5E3C]"}`}>
                        <Scissors size={16} />
                      </div>
                      <div className={`text-lg font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{visit.services.length}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Services</div>
                    </div>
                    <div className={`rounded-2xl border p-3 text-center ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#151821]" : "border-[#eadfd3] bg-white"}`}>
                      <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${isDark ? "bg-[rgba(201,169,110,0.12)] text-[#C9A96E]" : "bg-[#f7eadc] text-[#8B5E3C]"}`}>
                        <Package size={16} />
                      </div>
                      <div className={`text-lg font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{visit.products.length}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Products</div>
                    </div>
                    <div className={`rounded-2xl border p-3 text-center ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#151821]" : "border-[#eadfd3] bg-white"}`}>
                      <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${isDark ? "bg-[rgba(201,169,110,0.12)] text-[#C9A96E]" : "bg-[#f7eadc] text-[#8B5E3C]"}`}>
                        <CreditCard size={16} />
                      </div>
                      <div className={`text-sm font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{formatMoney(visit.totalAmount)}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Amount</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className={`rounded-2xl border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#151821]" : "border-[#eadfd3] bg-white"}`}>
                    <div className="mb-3 flex items-center gap-2">
                      <Scissors size={16} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                      <h5 className={`text-sm font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Services</h5>
                    </div>
                    {visit.services.length ? (
                      <div className="space-y-3">
                        {visit.services.map((service, index) => (
                          <div key={`${visit.saleId}-service-${index}`} className="flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-sm font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{service.serviceName}</p>
                              <p className={`text-xs ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                                {service.staffName ? `Handled by ${service.staffName}` : "Staff not assigned"}
                              </p>
                            </div>
                            <span className={`text-xs font-bold ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>{formatMoney(service.price)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>No services recorded for this visit.</p>
                    )}
                  </div>

                  <div className={`rounded-2xl border p-4 ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#151821]" : "border-[#eadfd3] bg-white"}`}>
                    <div className="mb-3 flex items-center gap-2">
                      <Package size={16} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
                      <h5 className={`text-sm font-bold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Products Purchased</h5>
                    </div>
                    {visit.products.length ? (
                      <div className="space-y-3">
                        {visit.products.map((product, index) => (
                          <div key={`${visit.saleId}-product-${index}`} className="flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-sm font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{product.productName}</p>
                              <p className={`text-xs ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>Qty {product.quantity}</p>
                            </div>
                            <span className={`text-xs font-bold ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>{formatMoney(product.price)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>No retail products purchased during this visit.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
  </div>
    </div>
  );
}
