import { useEffect, useState } from "react";
import { BadgeIndianRupee, Check, Crown, Loader2, MessageSquareMore, Wallet, X } from "lucide-react";
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
};

type PaymentMethod = "CARD" | "UPI" | "CASH";

const paymentMethods: Array<{ id: PaymentMethod; label: string }> = [
  { id: "CARD", label: "Card" },
  { id: "UPI", label: "UPI" },
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

export function SubscriptionPlansModal({ isOpen, onClose }: SubscriptionPlansModalProps) {
  const [overview, setOverview] = useState<OwnerSubscriptionOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    loadOverview()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load subscriptions."))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!selectedPlan) return;

    const stillAvailable = (overview?.plans || []).some((plan) => plan.id === selectedPlan.id);
    if (!stillAvailable) {
      setSelectedPlan(null);
    }
  }, [overview, selectedPlan]);

  if (!isOpen) return null;

  const currentLabel = overview?.currentSubscription
    ? formatPlanLabel(overview.currentSubscription.plan)
    : "Free Trial";

  const currentMeta = overview?.currentSubscription
    ? `Expires ${new Date(overview.currentSubscription.endDate).toLocaleDateString("en-IN")}`
    : overview?.currentTrial
      ? `Expires ${new Date(overview.currentTrial.endDate).toLocaleDateString("en-IN")}`
      : "No active plan";

  const handlePlanChoose = (plan: SubscriptionPlanOption) => {
    setSelectedPlan(plan);
    setError(null);
    setSuccess(null);
    setCustomMessage("");
  };

  const handleCheckout = async () => {
    if (!selectedPlan || selectedPlan.price === null) return;

    const chosenPlan = selectedPlan;
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await checkoutOwnerSubscription({
        plan: chosenPlan.id as "STANDARD" | "PRO",
        paymentMethod,
      });
      setOverview(response.data);
      setSuccess(`${chosenPlan.label} plan activated successfully.`);
      setSelectedPlan(null);
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

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-[var(--theme-border-strong)] bg-[var(--theme-surface-elevated)] p-6 shadow-[var(--theme-shadow-strong)]">
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
            <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_1fr_1fr_1fr]">
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
                  {overview?.currentSubscription ? (
                    <div className="rounded-[18px] bg-[var(--theme-card-soft)] px-4 py-3 text-sm text-[var(--theme-body)]">
                      Paid {formatMoney(overview.currentSubscription.amountPaid)} via {overview.currentSubscription.paymentMethod || "manual"}.
                    </div>
                  ) : null}
                </div>
              </div>

              {(overview?.plans || []).length ? (
                (overview?.plans || []).map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrent={overview?.currentSubscription?.plan === plan.id}
                    onChoose={handlePlanChoose}
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-[var(--theme-border-soft)] bg-[var(--theme-card)] p-5 xl:col-span-3">
                  <h3 className="text-[1.2rem] font-semibold text-[var(--theme-heading)]">No upgrades available right now</h3>
                  <p className="mt-3 text-sm text-[var(--theme-muted)]">
                    Your highest eligible plan is already active. More plan options will appear again after this subscription expires.
                  </p>
                </div>
              )}
            </div>

            {selectedPlan ? (
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
                ) : (
                  <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-[20px] border border-[var(--theme-border-soft)] bg-[var(--theme-card-soft)] p-4">
                      <div className="text-sm text-[var(--theme-muted)]">Selected plan</div>
                      <div className="mt-2 text-2xl font-semibold text-[var(--theme-heading)]">
                        {selectedPlan.label} {formatMoney(selectedPlan.price)}
                      </div>
                      <div className="mt-2 text-sm text-[var(--theme-muted)]">Valid for {selectedPlan.durationDays} days from the payment date.</div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--theme-heading)]">
                        <Wallet size={16} />
                        Payment method
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.id)}
                            className={`rounded-[18px] border px-4 py-3 text-sm font-semibold transition ${
                              paymentMethod === method.id
                                ? "border-[var(--theme-accent-strong)] bg-[var(--theme-card-soft)] text-[var(--theme-heading)]"
                                : "border-[var(--theme-border-soft)] bg-[var(--theme-card)] text-[var(--theme-muted)]"
                            }`}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void handleCheckout()}
                        className="mt-4 inline-flex items-center justify-center rounded-[16px] bg-[var(--theme-action-chip)] px-5 py-3 text-sm font-semibold text-[var(--theme-heading)] transition hover:opacity-90 disabled:opacity-60"
                      >
                        {isSubmitting ? "Processing payment..." : "Complete transaction"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {error ? <p className="mt-4 text-sm font-medium text-red-500">{error}</p> : null}
            {success ? <p className="mt-4 text-sm font-medium text-emerald-500">{success}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
