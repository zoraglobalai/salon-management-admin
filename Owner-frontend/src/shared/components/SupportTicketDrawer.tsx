import { useEffect, useState, type FormEvent } from "react";
import { CircleHelp, Loader2, Phone, Send, X } from "lucide-react";
import {
  createOwnerSupportTicket,
  fetchOwnerSupportTickets,
  fetchSupportContact,
  type OwnerSupportTicket,
  type SupportContact,
} from "../../core/api";

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

const STATUS_STYLES: Record<OwnerSupportTicket["status"], string> = {
  OPEN: "bg-red-50 text-red-700 border-red-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatStatus(status: OwnerSupportTicket["status"]) {
  return status.replace("_", " ");
}

export function SupportTicketDrawer({ isOpen, onClose, shopName }: SupportTicketDrawerProps) {
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
      <div className="fixed inset-0 z-[70] bg-[#1b1208]/30 backdrop-blur-[1px]" onClick={onClose} />

      <aside className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[460px] flex-col border-l border-[#eadfce] bg-[#fffaf4] shadow-[0_18px_60px_rgba(45,27,6,0.18)]">
        <div className="flex items-start justify-between border-b border-[#eadfce] px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[#6f5f4c]">
              <CircleHelp size={18} />
              <span className="text-sm font-medium">Owner Helpdesk</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-[#241910]">Raise a support ticket</h2>
            <p className="mt-1 text-sm text-[#7a6a58]">
              {shopName ? `${shopName} can reach support here.` : "Reach admin support from your dashboard."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e6dac8] p-2 text-[#6f5f4c] transition hover:bg-white"
            aria-label="Close helpdesk"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="rounded-[24px] border border-[#eadfce] bg-white/90 p-4 shadow-[0_10px_24px_rgba(87,57,18,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#241910]">{contact?.name || "Support team"}</p>
                <p className="mt-1 text-sm text-[#7a6a58]">{contact?.phone || "Contact number unavailable"}</p>
              </div>
              {contact?.phone ? (
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#241910] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3a2919]"
                >
                  <Phone size={15} />
                  Call
                </a>
              ) : null}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-[0_14px_36px_rgba(87,57,18,0.08)]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#241910]">Ticket issue</label>
              <select
                value={issue}
                onChange={(event) => setIssue(event.target.value)}
                className="w-full rounded-2xl border border-[#e8dcc8] bg-[#fffaf4] px-4 py-3 text-sm text-[#2d2117] outline-none transition focus:border-[#c89f62]"
              >
                {ISSUE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-[#241910]">Ticket description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell admin what happened and what help you need."
                rows={5}
                className="w-full resize-none rounded-2xl border border-[#e8dcc8] bg-[#fffaf4] px-4 py-3 text-sm text-[#2d2117] outline-none transition focus:border-[#c89f62]"
              />
            </div>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {successMessage ? <p className="mt-3 text-sm text-emerald-600">{successMessage}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#241910] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3a2919] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSubmitting ? "Submitting..." : "Raise ticket"}
            </button>
          </form>

          <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-[0_14px_36px_rgba(87,57,18,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#241910]">Your recent tickets</h3>
                <p className="mt-1 text-sm text-[#7a6a58]">Track the current support workflow from your dashboard.</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-[#7a6a58]">
                <Loader2 size={18} className="animate-spin" />
                <span className="ml-2 text-sm">Loading support tickets...</span>
              </div>
            ) : tickets.length ? (
              <div className="mt-4 space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-[22px] border border-[#efe4d5] bg-[#fffaf4] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#241910]">{ticket.issue}</p>
                        <p className="mt-1 text-sm text-[#6f5f4c]">{ticket.description}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_STYLES[ticket.status]}`}>
                        {formatStatus(ticket.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8a7865]">
                      <span>Raised {new Date(ticket.createdAt).toLocaleDateString("en-IN")}</span>
                      {ticket.resolution ? <span>{ticket.resolution}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-dashed border-[#eadfce] bg-[#fffaf4] px-4 py-6 text-sm text-[#7a6a58]">
                No support tickets yet.
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
