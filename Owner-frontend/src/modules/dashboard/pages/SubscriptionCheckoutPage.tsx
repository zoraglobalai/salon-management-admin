import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, Landmark, ShieldCheck, Smartphone } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { checkoutOwnerSubscription, fetchOwnerSubscriptionOverview, type OwnerSubscriptionOverview, type SubscriptionPlanOption } from "../../../core/api";

type Method = "UPI" | "CARD" | "NETBANKING";

function formatMoney(value?: string | number | null) {
  const amount = typeof value === "string" ? Number(value) : Number(value || 0);
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function toMoney(value: number) {
  return Math.max(0, Number(value.toFixed(2)));
}

function diffInDays(startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function SubscriptionCheckoutPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planId = (params.get("planId") || "PRO").toUpperCase();

  const [overview, setOverview] = useState<OwnerSubscriptionOverview | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Method>("UPI");
  const [selectedUpiApp, setSelectedUpiApp] = useState<"GPay" | "PhonePe" | "Paytm">("GPay");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchOwnerSubscriptionOverview()
      .then((res) => setOverview(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load checkout details."));
  }, []);

  const selectedPlan = useMemo<SubscriptionPlanOption | null>(() => {
    const plans = overview?.plans || [];
    return plans.find((p) => p.id === planId) || plans.find((p) => p.price !== null) || null;
  }, [overview, planId]);

  const currentSub = overview?.currentSubscription;
  const totalPlanDays = currentSub ? Math.max(1, diffInDays(new Date(currentSub.startDate), new Date(currentSub.endDate))) : 0;
  const remainingDays = currentSub ? diffInDays(new Date(), new Date(currentSub.endDate)) : 0;
  const currentPlanPaid = Number(currentSub?.amountPaid || 0);
  const dailyPrice = totalPlanDays > 0 ? currentPlanPaid / totalPlanDays : 0;
  const basePrice = selectedPlan?.price ?? 0;
  const credit = currentSub ? toMoney(remainingDays * dailyPrice) : 0;
  const finalPayable = toMoney(Math.max(0, basePrice - credit));

  const methodToPaymentApi = selectedMethod === "UPI" ? "UPI" : selectedMethod === "CARD" ? "CARD" : "CASH";

  const handlePay = async () => {
    if (!selectedPlan || selectedPlan.price === null) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await checkoutOwnerSubscription({
        plan: selectedPlan.id as "STANDARD" | "PRO",
        paymentMethod: methodToPaymentApi,
        quotedFinalAmount: finalPayable,
        quotedRemainingCredit: credit,
      });
      setShowSuccess(true);
      window.setTimeout(() => {
        navigate("/dashboard?openSubscription=1", { replace: true });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl rounded-[26px] border border-[var(--theme-border-soft)] bg-[var(--theme-card)] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/dashboard?openSubscription=1")}
          className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--theme-border-soft)] px-3 py-2 text-sm text-[var(--theme-heading)]"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h2 className="text-2xl font-semibold text-[var(--theme-heading)]">Select Payment Method</h2>
        <div className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
          <ShieldCheck size={16} />
          100% Secure Payments
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr_1.2fr]">
        <div className="rounded-[18px] bg-[var(--theme-toggle-active-bg)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-muted)]">Order Summary</div>
          <div className="mt-2 rounded-[14px] bg-[var(--theme-action-chip)] px-3 py-2 text-[var(--theme-heading)]">
            <button type="button" onClick={() => setShowBreakdown((prev) => !prev)} className="flex w-full items-center justify-between">
              <div className="text-left">
                <div className="text-[2rem] font-semibold leading-none">{formatMoney(finalPayable)}</div>
                <div className="mt-1 text-xs text-[var(--theme-heading)]/75">Amount to pay</div>
              </div>
              <div className="text-xs text-[var(--theme-heading)]/60 line-through">{formatMoney(basePrice)}</div>
            </button>
            {showBreakdown ? (
              <div className="mt-3 space-y-1 border-t border-[var(--theme-heading)]/15 pt-2 text-xs text-[var(--theme-heading)]/85">
                <div className="flex items-center justify-between"><span>Plan price</span><span>{formatMoney(basePrice)}</span></div>
                <div className="flex items-center justify-between"><span>Remaining days</span><span>{remainingDays} days</span></div>
                <div className="flex items-center justify-between"><span>Credit applied</span><span>- {formatMoney(credit)}</span></div>
                <div className="flex items-center justify-between border-t border-[var(--theme-heading)]/15 pt-1 font-semibold text-[var(--theme-heading)]"><span>Final payable</span><span>{formatMoney(finalPayable)}</span></div>
              </div>
            ) : null}
          </div>
          <div className="mt-2 text-sm text-[var(--theme-muted)]">{selectedPlan?.label || "Plan"} / month</div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-muted)]">Recommended</div>
          <div className="space-y-2">
            <button type="button" onClick={() => setSelectedMethod("UPI")} className={`w-full rounded-[14px] border px-4 py-3 text-left text-sm font-semibold ${selectedMethod === "UPI" ? "border-[var(--theme-accent-strong)] bg-[var(--theme-card-soft)] text-[var(--theme-heading)]" : "border-[var(--theme-border-soft)] text-[var(--theme-muted)]"}`}><Smartphone size={15} className="mr-2 inline" />UPI</button>
            <button type="button" onClick={() => setSelectedMethod("CARD")} className={`w-full rounded-[14px] border px-4 py-3 text-left text-sm font-semibold ${selectedMethod === "CARD" ? "border-[var(--theme-accent-strong)] bg-[var(--theme-card-soft)] text-[var(--theme-heading)]" : "border-[var(--theme-border-soft)] text-[var(--theme-muted)]"}`}><CreditCard size={15} className="mr-2 inline" />Cards</button>
            <button type="button" onClick={() => setSelectedMethod("NETBANKING")} className={`w-full rounded-[14px] border px-4 py-3 text-left text-sm font-semibold ${selectedMethod === "NETBANKING" ? "border-[var(--theme-accent-strong)] bg-[var(--theme-card-soft)] text-[var(--theme-heading)]" : "border-[var(--theme-border-soft)] text-[var(--theme-muted)]"}`}><Landmark size={15} className="mr-2 inline" />Netbanking</button>
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--theme-border-soft)] bg-[var(--theme-card)] p-4">
          <h3 className="text-2xl font-semibold text-[var(--theme-heading)]">
            {selectedMethod === "UPI" ? "Pay via UPI" : selectedMethod === "CARD" ? "Pay with Card" : "Pay via Netbanking"}
          </h3>
          <p className="mt-1 text-sm text-[var(--theme-muted)]">
            {selectedMethod === "UPI" ? "Select an app to complete payment." : selectedMethod === "CARD" ? "Complete payment using your card." : "Choose your bank and proceed securely."}
          </p>

          {selectedMethod === "UPI" ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["GPay", "PhonePe", "Paytm"] as const).map((app) => (
                <button key={app} type="button" onClick={() => setSelectedUpiApp(app)} className={`rounded-[12px] border px-3 py-3 text-xs font-semibold ${selectedUpiApp === app ? "border-[var(--theme-accent-strong)] bg-[var(--theme-card-soft)] text-[var(--theme-heading)]" : "border-[var(--theme-border-soft)] text-[var(--theme-muted)]"}`}>{app}</button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            disabled={isSubmitting || !selectedPlan}
            onClick={() => void handlePay()}
            className="mt-5 inline-flex w-full items-center justify-center rounded-[14px] bg-[var(--theme-action-chip)] px-5 py-3 text-sm font-semibold text-[var(--theme-heading)] transition hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Processing payment..." : selectedMethod === "UPI" ? `Pay with ${selectedUpiApp}` : selectedMethod === "CARD" ? "Pay with Card" : "Pay with Netbanking"}
          </button>
          {error ? <p className="mt-3 text-sm font-medium text-red-500">{error}</p> : null}
        </div>
      </div>

      {showSuccess ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-[22px] border border-[var(--theme-border-soft)] bg-[var(--theme-surface-elevated)] p-6 text-center shadow-[var(--theme-shadow-strong)]">
            <CheckCircle2 size={46} className="mx-auto text-emerald-500" />
            <h3 className="mt-3 text-2xl font-semibold text-[var(--theme-heading)]">Payment Successful</h3>
            <p className="mt-2 text-sm text-[var(--theme-muted)]">Your plan has been activated. Redirecting to Upgrade Plans...</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

