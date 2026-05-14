import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { fetchSaleDrafts, type SaleRecord } from "../../../core/api";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useAuth } from "../../auth/hooks/useAuth";
import { MapPin, Plus, Receipt, UserPlus } from "lucide-react";

type LocationOption = { id: string; name: string; city?: string };

export function DashboardSalesPOSPage() {
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  const { ownerLocations } = useOutletContext<{ ownerLocations?: LocationOption[] }>() || {};

  const isManager = user?.role === "MANAGER";
  const locations = ownerLocations || [];
  const defaultLocationId = useMemo(() => {
    if (isManager) return user?.branchId || "";
    return locations[0]?.id || "";
  }, [isManager, locations, user?.branchId]);

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [drafts, setDrafts] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    fetchSaleDrafts(selectedLocationId)
      .then((response) => setDrafts(response.sales || []))
      .catch((error: Error) => {
        console.error("Failed to load sales drafts", error);
        setDrafts([]);
      })
      .finally(() => setIsLoading(false));
  }, [selectedLocationId]);

  if (!defaultLocationId) {
    return (
      <div className={`flex h-96 items-center justify-center text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
        Configuration Error: no active location found.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex h-96 items-center justify-center text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
        Loading sales workflow...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        className={`rounded-[32px] border p-6 shadow-sm transition-all ${
          isDark ? "border-[rgba(255,255,255,0.07)] bg-[#151821]" : "border-[#E8E1D8] bg-white"
        }`}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"
              }`}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className={`text-xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Sales Workflow</h2>
              <p className={`mt-1 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>
                Start a new sale on a dedicated page, save it as a draft, and finish payment only at checkout.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {!isManager && locations.length > 1 && (
              <div className="relative min-w-[220px]">
                <select
                  value={selectedLocationId}
                  onChange={(event) => setSelectedLocationId(event.target.value)}
                  className={`w-full appearance-none rounded-2xl border px-4 py-3 pr-10 text-sm font-bold outline-none ${
                    isDark
                      ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#F0EBE3] [color-scheme:dark]"
                      : "border-[#E8E1D8] bg-gray-50 text-gray-900 [color-scheme:light]"
                  }`}
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.city || location.name}
                    </option>
                  ))}
                </select>
                <MapPin size={14} className={`pointer-events-none absolute right-4 top-4 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate("/dashboard/sales/pos/new")}
              className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
                isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[#8B5E3C] text-white"
              }`}
            >
              <Plus size={16} />
              New Sale
            </button>
          </div>
        </div>
      </section>

      <section
        className={`rounded-[32px] border p-6 shadow-sm transition-all ${
          isDark ? "border-[rgba(255,255,255,0.07)] bg-[#151821]" : "border-[#E8E1D8] bg-white"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Saved Drafts</h3>
            <p className={`text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
              Continue from where you stopped, then move the sale to checkout when ready.
            </p>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
            {drafts.length} Active
          </span>
        </div>

        {drafts.length === 0 ? (
          <div className={`rounded-[24px] border px-6 py-10 text-center ${isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"}`}>
            <Receipt size={28} className={`mx-auto mb-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
            <p className={`text-sm font-bold ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>No saved sales drafts yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {drafts.map((draft) => (
              <article
                key={draft.id}
                onClick={() => navigate(`/dashboard/sales/pos/${draft.id}/edit`)}
                className={`rounded-[24px] border p-4 ${
                  isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF8]"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF3EA] text-[#8B5E3C]"
                  }`}>
                    Draft
                  </span>
                  <span className={`text-[10px] font-bold ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                    {new Date(draft.updatedAt || draft.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className={`text-base font-black ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{draft.clientName}</div>
                <div className={`mt-1 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{draft.clientPhone}</div>
                <div className={`mt-3 text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                  Ready to continue
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/dashboard/sales/pos/${draft.id}/edit`);
                    }}
                    className={`flex-1 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] ${
                      isDark ? "bg-[#151821] text-[#F0EBE3]" : "bg-white text-gray-800"
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/dashboard/sales/pos/${draft.id}/checkout`);
                    }}
                    className={`flex-1 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] ${
                      isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[#8B5E3C] text-white"
                    }`}
                  >
                    Checkout
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
