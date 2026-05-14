import { useEffect, useState, type FormEvent } from "react";
import { CircleHelp, Loader2, Phone, Send, X } from "lucide-react";
import {
  createOwnerSupportTicket,
  fetchOwnerSupportTickets,
  fetchSupportContact,
  type OwnerSupportTicket,
  type SupportContact,
} from "../../core/api";
import { useDashboardTheme } from "../theme/ThemeProvider";
import { cn } from "../utils/cn";

type SupportTicketDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
};

const ISSUE_OPTIONS = [
  "Payment issue",
  "Subscription issue",
  "Login issue",
  "Billing issue",
  "Technical issue",
  "Other",
];

const STATUS_STYLES: Record<OwnerSupportTicket["status"], { light: string; dark: string }> = {
  OPEN: {
    light: "bg-red-50 text-red-700 border-red-200",
    dark: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  IN_PROGRESS: {
    light: "bg-amber-50 text-amber-700 border-amber-200",
    dark: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  RESOLVED: {
    light: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dark: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  CLOSED: {
    light: "bg-slate-100 text-slate-700 border-slate-200",
    dark: "bg-white/5 text-[#7A7572] border-white/10",
  },
};

function formatStatus(status: OwnerSupportTicket["status"]) {
  return status.replace("_", " ");
}

export function SupportTicketDrawer({ isOpen, onClose, shopName }: SupportTicketDrawerProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [issue, setIssue] = useState(ISSUE_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [tickets, setTickets] = useState<OwnerSupportTicket[]>([]);
  const [contact, setContact] = useState<SupportContact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    Promise.all([fetchOwnerSupportTickets(), fetchSupportContact()])
      .then(([ticketResponse, contactResponse]) => {
        if (controller.signal.aborted) return;
        setTickets(ticketResponse.data);
        setContact(contactResponse.data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load helpdesk details.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!description.trim()) {
      setError("Please add a short description for the support team.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await createOwnerSupportTicket({
        issue,
        description: description.trim(),
      });

      setTickets((current) => [response.data, ...current]);
      setDescription("");
      setIssue(ISSUE_OPTIONS[0]);
      setSuccessMessage("Support ticket raised successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to raise support ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={cn(
        "fixed inset-0 z-[70] transition-colors duration-300",
        isDark ? "bg-black/60 backdrop-blur-sm" : "bg-[#1b1208]/30 backdrop-blur-[1px]"
      )} onClick={onClose} />

      <aside className={cn(
        "fixed inset-y-0 right-0 z-[80] flex w-full max-w-[460px] flex-col border-l transition-all duration-300",
        "bg-[#fffaf4] border-[#eadfce] shadow-[0_18px_60px_rgba(45,27,6,0.18)]",
        "dark:bg-[#151821] dark:border-[rgba(255,255,255,0.07)] dark:shadow-card-dark"
      )}>
        <div className={cn(
          "flex items-start justify-between border-b px-5 py-4 transition-colors",
          "border-[#eadfce] dark:border-[rgba(255,255,255,0.07)]"
        )}>
          <div>
            <div className={cn(
              "flex items-center gap-2 transition-colors",
              "text-[#6f5f4c] dark:text-[#C8BFB4]"
            )}>
              <CircleHelp size={18} />
              <span className="text-sm font-medium">Owner Helpdesk</span>
            </div>
            <h2 className={cn(
              "mt-2 text-xl font-semibold transition-colors",
              "text-[#241910] dark:text-[#F0EBE3]"
            )}>Raise a support ticket</h2>
            <p className={cn(
              "mt-1 text-sm transition-colors",
              "text-[#7a6a58] dark:text-[#7A7572]"
            )}>
              {shopName ? `${shopName} can reach support here.` : "Reach admin support from your dashboard."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-full border p-2 transition-all",
              "border-[#e6dac8] text-[#6f5f4c] hover:bg-white",
              "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#1C2030] dark:text-[#C8BFB4] dark:hover:bg-white/5 dark:hover:text-[#F0EBE3]"
            )}
            aria-label="Close helpdesk"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide">
          <div className={cn(
            "rounded-[24px] border p-4 shadow-sm transition-all",
            "border-[#eadfce] bg-white/90 shadow-[0_10px_24px_rgba(87,57,18,0.06)]",
            "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#1C2030]"
          )}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={cn(
                  "text-sm font-semibold transition-colors",
                  "text-[#241910] dark:text-[#F0EBE3]"
                )}>{contact?.name || "Support team"}</p>
                <p className={cn(
                  "mt-1 text-sm transition-colors",
                  "text-[#7a6a58] dark:text-[#7A7572]"
                )}>{contact?.phone || "Contact number unavailable"}</p>
              </div>
              {contact?.phone ? (
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-all",
                    "bg-[#241910] hover:bg-[#3a2919]",
                    "dark:bg-[#C9A96E] dark:text-[#0F1115] dark:hover:brightness-110"
                  )}
                >
                  <Phone size={15} />
                  Call
                </a>
              ) : null}
            </div>
          </div>

          <form onSubmit={handleSubmit} className={cn(
            "mt-5 rounded-[28px] border p-5 shadow-sm transition-all",
            "border-[#eadfce] bg-white shadow-[0_14px_36px_rgba(87,57,18,0.08)]",
            "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#1C2030]"
          )}>
            <div>
              <label className={cn(
                "mb-2 block text-sm font-semibold transition-colors",
                "text-[#241910] dark:text-[#F0EBE3]"
              )}>Ticket issue</label>
              <select
                value={issue}
                onChange={(event) => setIssue(event.target.value)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all",
                  "border-[#e8dcc8] bg-[#fffaf4] text-[#2d2117] focus:border-[#c89f62]",
                  "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#151821] dark:text-[#F0EBE3] dark:focus:border-[#C9A96E]"
                )}
              >
                {ISSUE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className={cn(
                "mb-2 block text-sm font-semibold transition-colors",
                "text-[#241910] dark:text-[#F0EBE3]"
              )}>Ticket description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell admin what happened and what help you need."
                rows={5}
                className={cn(
                  "w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition-all",
                  "border-[#e8dcc8] bg-[#fffaf4] text-[#2d2117] focus:border-[#c89f62]",
                  "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#151821] dark:text-[#F0EBE3] dark:focus:border-[#C9A96E]"
                )}
              />
            </div>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {successMessage ? <p className="mt-3 text-sm text-emerald-600">{successMessage}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all",
                "bg-[#241910] hover:bg-[#3a2919]",
                "dark:bg-[#C9A96E] dark:text-[#0F1115] dark:hover:brightness-110",
                "disabled:cursor-not-allowed disabled:opacity-70"
              )}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSubmitting ? "Submitting..." : "Raise ticket"}
            </button>
          </form>

          <div className={cn(
            "mt-5 rounded-[28px] border p-5 shadow-sm transition-all",
            "border-[#eadfce] bg-white shadow-[0_14px_36px_rgba(87,57,18,0.08)]",
            "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#1C2030]"
          )}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className={cn(
                  "text-base font-semibold transition-colors",
                  "text-[#241910] dark:text-[#F0EBE3]"
                )}>Your recent tickets</h3>
                <p className={cn(
                  "mt-1 text-sm transition-colors",
                  "text-[#7a6a58] dark:text-[#7A7572]"
                )}>Track the current support workflow from your dashboard.</p>
              </div>
            </div>

            {isLoading ? (
              <div className={cn(
                "flex items-center justify-center py-8 transition-colors",
                "text-[#7a6a58] dark:text-[#7A7572]"
              )}>
                <Loader2 size={18} className="animate-spin" />
                <span className="ml-2 text-sm">Loading support tickets...</span>
              </div>
            ) : tickets.length ? (
              <div className="mt-4 space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className={cn(
                    "rounded-[22px] border p-4 transition-all",
                    "border-[#efe4d5] bg-[#fffaf4]",
                    "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#151821]"
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={cn(
                          "text-sm font-semibold transition-colors",
                          "text-[#241910] dark:text-[#F0EBE3]"
                        )}>{ticket.issue}</p>
                        <p className={cn(
                          "mt-1 text-sm transition-colors",
                          "text-[#6f5f4c] dark:text-[#C8BFB4]"
                        )}>{ticket.description}</p>
                      </div>
                      <span className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-semibold transition-all",
                        isDark ? STATUS_STYLES[ticket.status].dark : STATUS_STYLES[ticket.status].light
                      )}>
                        {formatStatus(ticket.status)}
                      </span>
                    </div>
                    <div className={cn(
                      "mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs transition-colors",
                      "text-[#8a7865] dark:text-[#7A7572]"
                    )}>
                      <span>Raised {new Date(ticket.createdAt).toLocaleDateString("en-IN")}</span>
                      {ticket.resolution ? <span>{ticket.resolution}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn(
                "mt-4 rounded-[22px] border border-dashed px-4 py-6 text-sm transition-all",
                "border-[#eadfce] bg-[#fffaf4] text-[#7a6a58]",
                "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#151821] dark:text-[#7A7572]"
              )}>
                No support tickets yet.
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
