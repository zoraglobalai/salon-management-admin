import { useEffect, useState } from "react";
import { BadgeIndianRupee, Check, ChevronDown, Crown, Loader2, MessageSquareMore, X } from "lucide-react";
import {
  checkoutOwnerSubscription,
  fetchOwnerSubscriptionOverview,
  requestCustomSubscription,
  type OwnerSubscriptionOverview,
  type SubscriptionPlanOption,
} from "../../core/api";

type SubscriptionPlansModalProps = {
  isOpen: boolean;
  onClose: () => void;
  branchCount?: number;
  ownerRole?: "OWNER" | "INDEPENDENT_OWNER" | "MANAGER" | "SUPER_ADMIN" | null;
};

type PaymentMethod = "CARD" | "UPI" | "NETBANKING" | "CASH";

const paymentMethods: Array<{ id: PaymentMethod; label: string }> = [
  { id: "CARD", label: "Card" },
  { id: "UPI", label: "UPI" },
  { id: "NETBANKING", label: "Netbanking" },
  { id: "CASH", label: "Cash" },
];

const planTone: Record<string, string> = {
  STANDARD: "border-[var(--theme-border-soft)] bg-[var(--theme-card)]",
  PRO: "border-[var(--theme-accent-strong)] bg-[var(--theme-toggle-active-bg)] shadow-[0_0_0_1px_var(--theme-accent-glow),0_18px_36px_rgba(0,0,0,0.22)]",
  CUSTOM: "border-[var(--theme-border-soft)] bg-[var(--theme-card)]",
};

function formatPlanLabel(plan?: string | null) {
  if (!plan) return "Free Trial";
  if (plan === "BASIC") return "Standard";
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

function formatMoney(value?: string | number | null) {
  const amount = typeof value === "string" ? Number(value) : Number(value || 0);
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function toMoney(value: number) {
  return Math.max(0, Number(value.toFixed(2)));
}

const upiAppLogoMap: Record<"GPay" | "PhonePe" | "Paytm", string> = {
  GPay:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect rx='18' width='64' height='64' fill='white'/><circle cx='24' cy='32' r='12' fill='%234285F4'/><circle cx='34' cy='32' r='12' fill='%2334A853' fill-opacity='0.88'/><text x='32' y='54' text-anchor='middle' font-size='10' fill='%23111827' font-family='Arial'>GPay</text></svg>",
  PhonePe:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect rx='18' width='64' height='64' fill='white'/><circle cx='32' cy='28' r='14' fill='%236B21A8'/><text x='32' y='33' text-anchor='middle' font-size='12' fill='white' font-family='Arial' font-weight='700'>P</text><text x='32' y='54' text-anchor='middle' font-size='9' fill='%23111827' font-family='Arial'>PhonePe</text></svg>",
  Paytm:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect rx='18' width='64' height='64' fill='white'/><rect x='16' y='16' width='32' height='24' rx='8' fill='%230EA5E9'/><text x='32' y='32' text-anchor='middle' font-size='11' fill='white' font-family='Arial' font-weight='700'>T</text><text x='32' y='54' text-anchor='middle' font-size='10' fill='%23111827' font-family='Arial'>Paytm</text></svg>",
};

function diffInDays(startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function PlanCard({
  plan,
  isCurrent,
  onChoose,
}: {
  plan: SubscriptionPlanOption;
  isCurrent: boolean;
  onChoose: (plan: SubscriptionPlanOption) => void;
}) {
  return (
    <div className={`rounded-[26px] border p-5 ${planTone[plan.id] || planTone.STANDARD}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[var(--theme-heading)]">
            {plan.id === "PRO" ? <Crown size={18} /> : plan.id === "CUSTOM" ? <MessageSquareMore size={18} /> : <BadgeIndianRupee size={18} />}
            <strong className="text-[1.35rem] font-semibold">{plan.label}</strong>
          </div>
          <div className="mt-3 text-[var(--theme-heading)]">
            {plan.price === null ? (
              <span className="text-3xl font-semibold">Contact us</span>
            ) : (
              <>
                <span className="text-4xl font-semibold">{formatMoney(plan.price)}</span>
                <span className="ml-1 text-sm text-[var(--theme-muted)]">/ month</span>
              </>
            )}
          </div>
        </div>
        {isCurrent ? (
          <span className="rounded-full bg-[var(--theme-card-soft)] px-3 py-1 text-xs font-semibold text-[var(--theme-heading)]">
            Current
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-start gap-2 text-sm text-[var(--theme-body)]">
            <Check size={15} className="mt-0.5 text-[var(--theme-accent)]" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChoose(plan)}
        className="mt-5 inline-flex w-full items-center justify-center rounded-[16px] bg-[var(--theme-action-chip)] px-4 py-3 text-sm font-semibold text-[var(--theme-heading)] transition hover:opacity-90"
      >
        {plan.price === null ? "Contact Team" : `Choose ${plan.label}`}
      </button>
    </div>
  );
}

export function SubscriptionPlansModal({ isOpen, onClose, branchCount = 1, ownerRole = null }: SubscriptionPlansModalProps) {
  const [overview, setOverview] = useState<OwnerSubscriptionOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [isPaymentStepOpen, setIsPaymentStepOpen] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<"GPay" | "PhonePe" | "Paytm">("GPay");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [netbankRef, setNetbankRef] = useState("");

  const loadOverview = async () => {
    const response = await fetchOwnerSubscriptionOverview();
    setOverview(response.data);
    return response.data;
  };

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setSelectedPlan(null);
    setIsPaymentStepOpen(false);

    loadOverview()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load subscriptions."))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!selectedPlan) return;

    const canSeeStandard = ownerRole === "INDEPENDENT_OWNER" || branchCount <= 1;
    const visiblePlans = (overview?.plans || []).filter((plan) => canSeeStandard || plan.id !== "STANDARD");
    const stillAvailable = visiblePlans.some((plan) => plan.id === selectedPlan.id);
    if (!stillAvailable) {
      setSelectedPlan(null);
    }
  }, [branchCount, overview, ownerRole, selectedPlan]);

  if (!isOpen) return null;

  const currentLabel = overview?.currentSubscription
    ? formatPlanLabel(overview.currentSubscription.plan)
    : "Free Trial";

  const currentMeta = overview?.currentSubscription
    ? `Expires ${new Date(overview.currentSubscription.endDate).toLocaleDateString("en-IN")}`
    : overview?.currentTrial
      ? `Expires ${new Date(overview.currentTrial.endDate).toLocaleDateString("en-IN")}`
      : "No active plan";
  const canSeeStandard = ownerRole === "INDEPENDENT_OWNER" || branchCount <= 1;
  const visiblePlans = (overview?.plans || []).filter((plan) => canSeeStandard || plan.id !== "STANDARD");
  const planGridClass = visiblePlans.length <= 2
    ? "xl:grid-cols-[1.05fr_320px_320px]"
    : "xl:grid-cols-[1.05fr_1fr_1fr_1fr]";

  const handlePlanChoose = (plan: SubscriptionPlanOption) => {
    if (plan.price !== null) {
      setSelectedPlan(plan);
      setError(null);
      setSuccess(null);
      setShowPriceBreakdown(false);
      setPaymentMethod("UPI");
      setSelectedUpiApp("GPay");
      setCardNumber("");
      setCardHolder("");
      setCardExpiry("");
      setCardCvv("");
      setBankName("");
      setAccountHolder("");
      setNetbankRef("");
      setIsPaymentStepOpen(true);
      return;
    }

    setSelectedPlan(plan);
    setError(null);
    setSuccess(null);
    setCustomMessage("");
    setShowPriceBreakdown(false);
  };

  const handleCheckout = async () => {
    if (!selectedPlan || selectedPlan.price === null) return;

    const chosenPlan = selectedPlan;
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const apiPaymentMethod = paymentMethod === "NETBANKING" ? "CASH" : paymentMethod;

    try {
      const response = await checkoutOwnerSubscription({
        plan: chosenPlan.id as "STANDARD" | "PRO",
        paymentMethod: apiPaymentMethod,
        quotedFinalAmount: selectedPlanPayable,
        quotedRemainingCredit: selectedPlanCredit,
      });
      setOverview(response.data);
      setSuccess("Payment successful.");
      setIsPaymentStepOpen(true);
      window.setTimeout(() => {
        setSuccess(`${chosenPlan.label} plan activated successfully.`);
        setSelectedPlan(null);
        setIsPaymentStepOpen(false);
      }, 3000);
    } catch (err) {
      try {
        const refreshedOverview = await loadOverview();
        const activatedPlan = refreshedOverview.currentSubscription?.plan === chosenPlan.id;
        const isActive = refreshedOverview.currentSubscription?.status === "ACTIVE";

        if (activatedPlan && isActive) {
          setSuccess(`${chosenPlan.label} plan activated successfully.`);
          setSelectedPlan(null);
        } else {
          throw err;
        }
      } catch {
        setError(err instanceof Error ? err.message : "Unable to complete payment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomRequest = async () => {
    if (!customMessage.trim()) {
      setError("Please describe your custom plan requirements.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await requestCustomSubscription(customMessage.trim());
      setSuccess(`Custom plan request sent. Contact ${response.data.supportContact.name} at ${response.data.supportContact.phone}.`);
      setCustomMessage("");
      setSelectedPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send custom plan request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlanBasePrice = selectedPlan?.price ?? 0;
  const currentSub = overview?.currentSubscription;
  const totalPlanDays = currentSub
    ? Math.max(1, diffInDays(new Date(currentSub.startDate), new Date(currentSub.endDate)))
    : 0;
  const remainingDays = currentSub ? diffInDays(new Date(), new Date(currentSub.endDate)) : 0;
  const currentPlanPaid = Number(currentSub?.amountPaid || 0);
  const dailyPrice = totalPlanDays > 0 ? currentPlanPaid / totalPlanDays : 0;
  const selectedPlanCredit = currentSub ? toMoney(remainingDays * dailyPrice) : 0;
  const selectedPlanPayable = toMoney(Math.max(0, selectedPlanBasePrice - selectedPlanCredit));
  const hasDiscount = selectedPlanPayable < selectedPlanBasePrice;
  const isUpiActive = paymentMethod === "UPI";
  const canPay = true;

  const formatCardInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 19);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiryInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-[30px] border border-[var(--theme-border-strong)] bg-[var(--theme-surface-elevated)] p-6 shadow-[var(--theme-shadow-strong)]">

        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-[var(--theme-border-strong)] p-2 text-[var(--theme-muted)] transition hover:bg-[var(--theme-card-soft)]"
          aria-label="Close subscriptions"
        >
          <X size={18} />
        </button>

        <div className="pr-10">
          <h2 className="font-['Outfit'] text-3xl font-semibold text-[var(--theme-heading)]">Upgrade Plans & Subscriptions</h2>
          <p className="mt-2 text-sm text-[var(--theme-muted)]">Choose a plan, pick a payment method, and activate the subscription for this business.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--theme-muted)]">
            <Loader2 size={18} className="animate-spin" />
            <span className="ml-2">Loading subscription plans...</span>
          </div>
        ) : (
          <>
            <div className={`mt-6 grid gap-5 ${planGridClass}`}>
              <div className="rounded-[24px] border border-[var(--theme-border-soft)] bg-[var(--theme-card)] p-5">
                <h3 className="text-[1.3rem] font-semibold text-[var(--theme-heading)]">Your Current Subscription</h3>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--theme-muted)]">Business</span>
                    <strong className="text-right text-[var(--theme-heading)]">{overview?.businessName || "Business Overview"}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--theme-muted)]">Current Plan</span>
                    <strong className="text-[var(--theme-heading)]">{currentLabel}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--theme-muted)]">Status</span>
                    <strong className="text-[var(--theme-heading)]">{overview?.currentSubscription?.status || overview?.tenantStatus || "TRIAL"}</strong>
                  </div>
                  {overview?.currentSubscription ? (
                    <>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-[var(--theme-muted)]">Start Date</span>
                        <strong className="text-[var(--theme-heading)]">
                          {new Date(overview.currentSubscription.startDate).toLocaleDateString("en-IN")}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-[var(--theme-muted)]">End Date</span>
                        <strong className="text-[var(--theme-heading)]">
                          {new Date(overview.currentSubscription.endDate).toLocaleDateString("en-IN")}
                        </strong>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm text-[var(--theme-muted)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>{currentMeta}</span>
                  </div>
                  {!overview?.currentSubscription && overview?.currentTrial ? (
                    <div className="rounded-[18px] bg-[var(--theme-card-soft)] px-4 py-3 text-sm text-[var(--theme-body)]">
                      Your free trial runs for {overview.trialPeriodDays} days from the activation date.
                    </div>
                  ) : null}
                  {overview?.currentSubscription ? (
                    <div className="rounded-[18px] bg-[var(--theme-card-soft)] px-4 py-3 text-sm text-[var(--theme-body)]">
                      Paid {formatMoney(overview.currentSubscription.amountPaid)} via {overview.currentSubscription.paymentMethod || "manual"}.
                    </div>
                  ) : null}
                </div>
              </div>

              {visiblePlans.length ? (
                visiblePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrent={overview?.currentSubscription?.plan === plan.id}
                    onChoose={handlePlanChoose}
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-[var(--theme-border-soft)] bg-[var(--theme-card)] p-5 xl:col-span-2">
                  <h3 className="text-[1.2rem] font-semibold text-[var(--theme-heading)]">No upgrades available right now</h3>
                  <p className="mt-3 text-sm text-[var(--theme-muted)]">
                    Your highest eligible plan is already active. More plan options will appear again after this subscription expires.
                  </p>
                </div>
              )}
            </div>

            {selectedPlan && selectedPlan.price === null ? (
              <div className="mt-6 rounded-[26px] border border-[var(--theme-border-soft)] bg-[var(--theme-card)] p-5">
                <h3 className="text-[1.3rem] font-semibold text-[var(--theme-heading)]">
                  {selectedPlan.price === null ? "Contact our team" : `Complete ${selectedPlan.label} payment`}
                </h3>

                {selectedPlan.price === null ? (
                  <div className="mt-4">
                    <p className="text-sm text-[var(--theme-muted)]">
                      Custom plans are handled directly by Super Admin. Share your branch and plan needs, and we will connect you with the team.
                    </p>
                    <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-4">
                        <textarea
                          value={customMessage}
                          onChange={(event) => setCustomMessage(event.target.value)}
                          rows={4}
                          placeholder="Describe branch count, business needs, and the custom support you need..."
                          className="w-full rounded-[18px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] px-4 py-3 text-sm text-[var(--theme-body)] outline-none"
                        />
                      </div>
                      <div className="rounded-[20px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] p-4">
                        <div className="text-sm text-[var(--theme-muted)]">Super Admin contact</div>
                        <div className="mt-2 text-lg font-semibold text-[var(--theme-heading)]">
                          {overview?.supportContact.name || "Super Admin"}
                        </div>
                        <div className="mt-1 text-sm text-[var(--theme-body)]">{overview?.supportContact.phone || "Contact number unavailable"}</div>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void handleCustomRequest()}
                          className="mt-4 inline-flex items-center justify-center rounded-[16px] bg-[var(--theme-action-chip)] px-5 py-3 text-sm font-semibold text-[var(--theme-heading)] transition hover:opacity-90 disabled:opacity-60"
                        >
                          {isSubmitting ? "Sending request..." : "Send request"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="mt-4 text-sm font-medium text-red-500">{error}</p> : null}
            {success ? <p className="mt-4 text-sm font-medium text-emerald-500">{success}</p> : null}
          </>
        )}
      </div>

      {isPaymentStepOpen && selectedPlan && selectedPlan.price !== null ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-3">
          <div className="h-[84vh] w-full max-w-[1140px] overflow-hidden rounded-[24px] border border-[var(--theme-border-soft)] bg-[var(--theme-surface-elevated)] p-3 md:p-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPaymentStepOpen(false)}
                className="rounded-[10px] border border-[var(--theme-border-soft)] px-3 py-1.5 text-sm text-[var(--theme-heading)]"
              >
                Back
              </button>
              <h3 className="text-[2rem] font-semibold text-[var(--theme-heading)]">Select Payment Method</h3>
              <div className="text-sm font-semibold text-emerald-600">100% Secure Payments</div>
            </div>

            <div className="grid h-[calc(100%-3.5rem)] gap-3 overflow-hidden lg:grid-cols-[0.95fr_0.75fr_1.15fr]">
              <div className="rounded-[16px] border border-[var(--theme-border-soft)] bg-[var(--theme-card)] p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-muted)]">Order Summary</div>
                <div className={`mt-2 rounded-[12px] px-3 py-2 text-[var(--theme-heading)] ${isUpiActive ? "bg-[var(--theme-card-soft)]" : "bg-[var(--theme-action-chip)]"}`}>
                  <button
                    type="button"
                    onClick={() => setShowPriceBreakdown((prev) => !prev)}
                    className="flex w-full items-center justify-between"
                  >
                    <div className="text-left">
                      <div className="text-[1.6rem] font-semibold leading-none">{formatMoney(selectedPlanPayable)}</div>
                      <div className="mt-1 text-xs text-[var(--theme-heading)]/75">Amount to pay</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasDiscount ? <span className="text-xs text-[var(--theme-heading)]/60 line-through">{formatMoney(selectedPlanBasePrice)}</span> : null}
                      <ChevronDown size={18} className={`transition ${showPriceBreakdown ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {showPriceBreakdown ? (
                    <div className="mt-3 space-y-1 border-t border-[var(--theme-heading)]/15 pt-2 text-xs text-[var(--theme-heading)]/85">
                      <div className="flex items-center justify-between"><span>Plan price</span><span>{formatMoney(selectedPlanBasePrice)}</span></div>
                      <div className="flex items-center justify-between"><span>Remaining days</span><span>{remainingDays} days</span></div>
                      <div className="flex items-center justify-between"><span>Credit applied</span><span>- {formatMoney(selectedPlanCredit)}</span></div>
                      <div className="flex items-center justify-between border-t border-[var(--theme-heading)]/15 pt-1 font-semibold text-[var(--theme-heading)]"><span>Final payable</span><span>{formatMoney(selectedPlanPayable)}</span></div>
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 text-sm text-[var(--theme-muted)]">{selectedPlan.label} / month</div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-muted)]">Recommended</div>
                    <div className="space-y-1.5">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`w-full rounded-[10px] border px-3 py-2 text-left text-sm font-semibold transition ${
                        paymentMethod === method.id ? "border-[var(--theme-accent-strong)] bg-[var(--theme-card-soft)] text-[var(--theme-heading)]" : "border-[var(--theme-border-soft)] text-[var(--theme-muted)]"
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[16px] border border-[var(--theme-border-soft)] bg-[var(--theme-card)] p-3">
                <h4 className="text-[2.6rem] font-semibold text-[var(--theme-heading)]">{paymentMethod === "UPI" ? "Pay via UPI" : paymentMethod === "CARD" ? "Pay with Card" : paymentMethod === "NETBANKING" ? "Pay via Netbanking" : "Pay with Cash"}</h4>
                <p className="mt-1 text-sm text-[var(--theme-muted)]">{paymentMethod === "UPI" ? "Select an app or scan QR to complete payment." : "Complete your payment securely."}</p>

                {paymentMethod === "UPI" ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(["GPay", "PhonePe", "Paytm"] as const).map((app) => (
                        <button
                          key={app}
                          type="button"
                          onClick={() => setSelectedUpiApp(app)}
                          className={`rounded-[10px] border px-2 py-2 text-sm font-semibold ${selectedUpiApp === app ? "border-[var(--theme-accent-strong)] bg-[var(--theme-card-soft)] text-[var(--theme-heading)]" : "border-[var(--theme-border-soft)] text-[var(--theme-muted)]"}`}
                        >
                          <img src={upiAppLogoMap[app]} alt={app} className="mx-auto mb-1 h-7 w-7 rounded-full object-cover" />
                          {app}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-[12px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] p-2.5">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-muted)]">Sample QR Code</div>
                      <div className="mx-auto grid h-36 w-36 grid-cols-12 grid-rows-12 gap-1 rounded-[10px] bg-white p-2">
                        {Array.from({ length: 144 }).map((_, idx) => {
                          const fill = (idx * 7 + Math.floor(idx / 3)) % 5 === 0 || idx % 11 === 0 || idx % 13 === 0;
                          return <span key={idx} className={fill ? "rounded-[2px] bg-[var(--theme-heading)]" : "rounded-[2px] bg-transparent"} />;
                        })}
                      </div>
                    </div>
                  </div>
                ) : paymentMethod === "CARD" ? (
                  <div className="mt-3 grid gap-2">
                    <input value={cardNumber} onChange={(e) => setCardNumber(formatCardInput(e.target.value))} placeholder="Card number" className="rounded-[10px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] px-3 py-2 text-sm outline-none" />
                    <input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder="Card holder name" className="rounded-[10px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] px-3 py-2 text-sm outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))} placeholder="MM/YY" className="rounded-[10px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] px-3 py-2 text-sm outline-none" />
                      <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="CVV" className="rounded-[10px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] px-3 py-2 text-sm outline-none" />
                    </div>
                  </div>
                ) : paymentMethod === "NETBANKING" ? (
                  <div className="mt-3 grid gap-2.5">
                    <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" className="rounded-[10px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] px-3 py-2 text-sm outline-none" />
                    <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Account holder name" className="rounded-[10px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] px-3 py-2 text-sm outline-none" />
                    <input value={netbankRef} onChange={(e) => setNetbankRef(e.target.value.toUpperCase())} placeholder="Transaction reference / UTR" className="rounded-[10px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] px-3 py-2 text-sm outline-none" />
                  </div>
                ) : (
                  <div className="mt-3 rounded-[10px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] px-3 py-3 text-sm text-[var(--theme-muted)]">
                    Cash payment selected. Click the button below to confirm collection.
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSubmitting || !canPay}
                  onClick={() => void handleCheckout()}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-[12px] bg-[var(--theme-action-chip)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-heading)] transition hover:opacity-90 disabled:opacity-60"
                >
                  {isSubmitting ? "Processing payment..." : paymentMethod === "UPI" ? `Pay with ${selectedUpiApp}` : paymentMethod === "CARD" ? "Pay with Card" : paymentMethod === "NETBANKING" ? "Pay with Netbanking" : "Confirm Cash Payment"}
                </button>
              </div>
            </div>

            {success === "Payment successful." ? (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-[20px] border border-[var(--theme-border-soft)] bg-[var(--theme-surface-elevated)] p-6 text-center">
                  <div className="text-2xl font-semibold text-emerald-600">Payment Successful</div>
                  <p className="mt-2 text-sm text-[var(--theme-muted)]">Redirecting to upgrade plans...</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
