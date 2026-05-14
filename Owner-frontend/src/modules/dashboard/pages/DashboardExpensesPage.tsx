import { useEffect, useMemo, useState } from "react";
import { Landmark, MapPin, Plus, ReceiptText, Wallet, X } from "lucide-react";
import { createExpense, fetchExpenses, fetchStaff, fetchVendors, type ExpenseInput, type ExpenseRecord, type ExpenseReportData, type StaffMember, type VendorRecord } from "../../../core/api";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { useNotifications } from "../../../shared/components/NotificationProvider";
import { useGlobalFilters } from "../../../shared/context/FilterContext";
import { useAuth } from "../../auth/hooks/useAuth";
import { useOutletContext } from "react-router-dom";

type LocationOption = { id: string; name: string; city?: string };
type OutletContext = { ownerLocations?: LocationOption[] };

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK"];
const EXPENSE_STATUSES = ["PAID", "PENDING", "CANCELLED"] as const;

function formatCurrency(value: number) {
  return `\u20B9${Math.round(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB");
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStart() {
  const now = new Date();
  return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

const EMPTY_FORM: ExpenseInput = {
  expenseCategory: "Other Expenses",
  subCategory: "Miscellaneous",
  amount: 0,
  gstAmount: 0,
  paymentMethod: "CASH",
  expenseDate: formatDateInput(new Date()),
  branchId: null,
  vendorId: null,
  staffId: null,
  notes: "",
  status: "PAID",
};

export function DashboardExpensesPage() {
  const { theme } = useDashboardTheme();
  const { toast } = useNotifications();
  const { filters, setFilters } = useGlobalFilters();
  const { ownerLocations } = useOutletContext<OutletContext>() || {};
  const { user } = useAuth();
  const isDark = theme === "dark";
  const isManager = user?.role === "MANAGER";

  const [report, setReport] = useState<ExpenseReportData | null>(null);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseInput>({
    ...EMPTY_FORM,
    branchId: isManager ? user?.branchId || null : null,
  });
  const [localFilters, setLocalFilters] = useState({
    startDate: getMonthStart(),
    endDate: formatDateInput(new Date()),
    expenseCategory: "all",
    subCategory: "all",
    vendorId: "all",
    paymentMethod: "all",
    status: "all",
    page: 1,
    limit: 12,
  });

  const activeLocationId = isManager ? user?.branchId : filters.locationId === "all" ? undefined : filters.locationId;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [expenseRes, vendorRes, staffRes] = await Promise.all([
        fetchExpenses({
          ...localFilters,
          locationId: activeLocationId,
        }),
        fetchVendors({ status: "ACTIVE" }),
        fetchStaff(activeLocationId),
      ]);

      setReport(expenseRes.data);
      setVendors(vendorRes.vendors || []);
      setStaff(staffRes.staff || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeLocationId, localFilters.startDate, localFilters.endDate, localFilters.expenseCategory, localFilters.subCategory, localFilters.vendorId, localFilters.paymentMethod, localFilters.status, localFilters.page]);

  const summary = report?.summary;
  const rows = report?.rows || [];
  const pagination = report?.pagination || { page: 1, totalPages: 1 };
  const categories = report?.filterMeta?.categories || [];
  const categoryOptions = [...new Set(categories.map((item) => item.category))];
  const subCategoryOptions = categories
    .filter((item) => localFilters.expenseCategory === "all" || item.category === localFilters.expenseCategory)
    .map((item) => item.sub_category);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.category === form.expenseCategory && item.sub_category === form.subCategory),
    [categories, form.expenseCategory, form.subCategory],
  );

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      expenseCategory: categories[0]?.category || "Other Expenses",
      subCategory: categories[0]?.sub_category || "Miscellaneous",
      branchId: isManager ? user?.branchId || null : activeLocationId || null,
    });
    setIsModalOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Math.max(0, Number(form.amount || 0));
    const gstAmount = Math.max(0, Number(form.gstAmount || 0));

    if (!form.expenseCategory || !form.subCategory) {
      toast("Choose an expense category and sub-category.", "error");
      return;
    }

    if (!amount) {
      toast("Amount is required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await createExpense({
        ...form,
        amount,
        gstAmount,
        branchId: isManager ? user?.branchId || null : form.branchId || null,
      });
      toast("Expense added successfully.");
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save expense.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 h-full flex-col gap-5">
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
        <div>
          <h2 className={`text-2xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>Expense Management</h2>
          <p className={`mt-1 text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Track purchase, salary, GST, vendor, and manual business expenses in one place.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {!isManager && (
            <div className="relative">
              <MapPin size={15} className={`absolute left-3 top-3 ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`} />
              <select
                value={filters.locationId}
                onChange={(event) => setFilters({ locationId: event.target.value })}
                className={`appearance-none rounded-xl border pl-9 pr-3 py-2.5 text-sm font-semibold outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.1)] text-[#C8BFB4]" : "bg-gray-50/50 border-[#E8E1D8] text-gray-700"}`}
              >
                <option value="all">All Branches</option>
                {(ownerLocations || []).map((location) => (
                  <option key={location.id} value={location.id}>{location.city || location.name}</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={openCreate} className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white ${isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)]" : "bg-[#8B5E3C] hover:bg-[#744A2E]"}`}>
            <Plus size={16} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Weekly Expense</p>
            <Wallet size={18} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
          </div>
          <p className={`mt-3 text-2xl font-bold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>{isLoading ? "..." : formatCurrency(summary?.total_weekly_expense || 0)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Monthly Expense</p>
            <ReceiptText size={18} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
          </div>
          <p className={`mt-3 text-2xl font-bold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>{isLoading ? "..." : formatCurrency(summary?.total_monthly_expense || 0)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Purchase Expense</p>
            <Landmark size={18} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
          </div>
          <p className={`mt-3 text-2xl font-bold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>{isLoading ? "..." : formatCurrency(summary?.purchase_expense_total || 0)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>GST Paid</p>
            <Wallet size={18} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
          </div>
          <p className={`mt-3 text-2xl font-bold ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>{isLoading ? "..." : formatCurrency(summary?.gst_paid_total || 0)}</p>
        </div>
      </div>

      <div className={`flex flex-wrap items-end gap-3 rounded-2xl border p-4 ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
        <div className="min-w-[150px] flex-1">
          <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>From</label>
          <input type="date" value={localFilters.startDate} onChange={(event) => setLocalFilters((current) => ({ ...current, startDate: event.target.value, page: 1 }))} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
        </div>
        <div className="min-w-[150px] flex-1">
          <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>To</label>
          <input type="date" value={localFilters.endDate} onChange={(event) => setLocalFilters((current) => ({ ...current, endDate: event.target.value, page: 1 }))} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
        </div>
        <div className="min-w-[170px] flex-1">
          <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Category</label>
          <select value={localFilters.expenseCategory} onChange={(event) => setLocalFilters((current) => ({ ...current, expenseCategory: event.target.value, subCategory: "all", page: 1 }))} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
            <option value="all">All Categories</option>
            {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="min-w-[170px] flex-1">
          <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Sub Category</label>
          <select value={localFilters.subCategory} onChange={(event) => setLocalFilters((current) => ({ ...current, subCategory: event.target.value, page: 1 }))} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
            <option value="all">All Sub Categories</option>
            {[...new Set(subCategoryOptions)].map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="min-w-[160px] flex-1">
          <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Status</label>
          <select value={localFilters.status} onChange={(event) => setLocalFilters((current) => ({ ...current, status: event.target.value, page: 1 }))} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
            <option value="all">All Statuses</option>
            {EXPENSE_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </div>

      {error && <div className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)] text-[#F87171]" : "border-red-200 bg-red-50 text-red-700"}`}>{error}</div>}

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"}`}>
        <div className="overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={isDark ? "bg-[#1C2030]" : "bg-gray-50/60"}>
                {["Date", "Category", "Sub Category", "Amount", "GST", "Total", "Vendor", "Staff", "Branch", "Status"].map((head) => (
                  <th key={head} className={`p-4 text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={10} className={`p-8 text-center ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Loading expenses...</td></tr>}
              {!isLoading && rows.map((row: ExpenseRecord) => (
                <tr key={row.id} className={`border-t ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{formatDate(row.expense_date)}</td>
                  <td className={`p-4 font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{row.expense_category}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{row.sub_category}</td>
                  <td className={`p-4 text-sm font-semibold ${isDark ? "text-[#C8BFB4]" : "text-gray-700"}`}>{formatCurrency(Number(row.amount || 0))}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{formatCurrency(Number(row.gst_amount || 0))}</td>
                  <td className={`p-4 font-bold ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>{formatCurrency(Number(row.total_amount || 0))}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{row.vendor_name || "-"}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{row.staff_name || "-"}</td>
                  <td className={`p-4 text-sm ${isDark ? "text-[#C8BFB4]" : "text-gray-600"}`}>{row.branch_name || "-"}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "PAID" ? (isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700") : row.status === "PENDING" ? (isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-700") : (isDark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-700")}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && <tr><td colSpan={10} className={`p-10 text-center text-sm ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>No expenses found for the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className={`flex items-center justify-between border-t px-4 py-3 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
            <span className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => setLocalFilters((current) => ({ ...current, page: current.page - 1 }))} className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-40 ${isDark ? "bg-[#1C2030] text-[#C8BFB4]" : "bg-gray-100 text-gray-700"}`}>Prev</button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => setLocalFilters((current) => ({ ...current, page: current.page + 1 }))} className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-40 ${isDark ? "bg-[#1C2030] text-[#C8BFB4]" : "bg-gray-100 text-gray-700"}`}>Next</button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className={`w-full max-w-3xl rounded-[28px] border ${isDark ? "bg-[#151821] border-[rgba(255,255,255,0.08)]" : "bg-white border-[#E8E1D8]"}`}>
            <div className={`flex items-center justify-between border-b px-6 py-5 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"}`}>
              <h3 className={`text-xl font-bold font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Add Expense</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={18} className={isDark ? "text-[#7A7572]" : "text-gray-500"} /></button>
            </div>
            <form onSubmit={submit} className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Expense Category</label>
                <select value={form.expenseCategory} onChange={(event) => {
                  const nextCategory = event.target.value;
                  const nextSub = categories.find((item) => item.category === nextCategory)?.sub_category || "";
                  setForm((current) => ({ ...current, expenseCategory: nextCategory, subCategory: nextSub }));
                }} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                  {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Sub Category</label>
                <select value={form.subCategory} onChange={(event) => setForm((current) => ({ ...current, subCategory: event.target.value }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                  {categories.filter((item) => item.category === form.expenseCategory).map((option) => <option key={`${option.category}-${option.sub_category}`} value={option.sub_category}>{option.sub_category}</option>)}
                </select>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Amount</label>
                <input type="number" min={0} step="0.01" value={form.amount || ""} onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>GST Amount</label>
                <input type="number" min={0} step="0.01" value={form.gstAmount || ""} onChange={(event) => setForm((current) => ({ ...current, gstAmount: Number(event.target.value) }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Payment Method</label>
                <select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                  {PAYMENT_METHODS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Expense Date</label>
                <input type="date" value={form.expenseDate} onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              {!isManager && (
                <div>
                  <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Branch</label>
                  <select value={form.branchId || ""} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value || null }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                    <option value="">All Branches</option>
                    {(ownerLocations || []).map((location) => <option key={location.id} value={location.id}>{location.city || location.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Vendor</label>
                <select value={form.vendorId || ""} onChange={(event) => setForm((current) => ({ ...current, vendorId: event.target.value || null }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                  <option value="">Optional</option>
                  {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.vendorName}</option>)}
                </select>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Staff</label>
                <select value={form.staffId || ""} onChange={(event) => setForm((current) => ({ ...current, staffId: event.target.value || null }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                  <option value="">{selectedCategory?.category === "Staff Expenses" ? "Select Staff" : "Optional"}</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Status</label>
                <select value={form.status || "PAID"} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ExpenseInput["status"] }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`}>
                  {EXPENSE_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={`mb-1.5 block text-xs font-bold ${isDark ? "text-[#7A7572]" : "text-gray-600"}`}>Notes</label>
                <textarea value={form.notes || ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)] text-[#F0EBE3]" : "bg-gray-50/50 border-[#E8E1D8]"}`} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`rounded-full px-5 py-2 text-sm font-semibold ${isDark ? "bg-[rgba(255,255,255,0.08)] text-[#C8BFB4]" : "bg-gray-100 text-gray-700"}`}>Cancel</button>
                <button disabled={isSubmitting} type="submit" className={`rounded-full px-5 py-2 text-sm font-semibold text-white ${isDark ? "bg-[linear-gradient(135deg,#C9A96E_0%,#A67C3D_100%)]" : "bg-[#8B5E3C]"}`}>{isSubmitting ? "Saving..." : "Save Expense"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
