import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchClientById, type ClientRecord } from "../../../core/api";

const TAG_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200",
  REGULAR: "bg-green-100 text-green-700 border-green-200",
  VIP: "bg-amber-100 text-amber-700 border-amber-200",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-4 pb-2 border-b border-[var(--line)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchClientById(id)
      .then((r) => { setClient(r.client); setError(null); })
      .catch((e: Error) => setError(e.message || "Failed to load client."))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--muted)]">Loading client profile…</div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-red-600">{error || "Client not found."}</p>
        <button onClick={() => navigate(-1)} type="button"
          className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">← Back</button>
      </div>
    );
  }

  const followUpDue = client.nextFollowUpDate
    ? new Date(client.nextFollowUpDate) <= new Date()
    : false;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <button onClick={() => navigate(-1)} type="button"
          className="mb-4 text-sm font-semibold text-[var(--muted)] hover:text-gray-900 transition-colors">
          ← Back to Clients
        </button>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold font-['Outfit'] text-gray-900">{client.name}</h2>
              <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${TAG_COLORS[client.tag] || "bg-gray-100 text-gray-600"}`}>
                {client.tag}
              </span>
              {followUpDue && client.nextFollowUpDate && (
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-0.5 text-xs font-bold text-red-600">
                  Follow-up Due
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">{client.phoneNumber} · {client.locationName}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Basic Info */}
        <Card title="Basic Information">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Full Name" value={client.name} />
            <InfoRow label="Phone" value={client.phoneNumber} />
            <InfoRow label="Hair Type" value={client.hairType} />
            <InfoRow label="Tag" value={client.tag} />
            <InfoRow label="Location" value={client.locationName} />
            <InfoRow label="Joined" value={fmtDate(client.createdAt)} />
          </div>
        </Card>

        {/* Insights */}
        <Card title="Visit Insights">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-xl bg-gray-50 border border-[var(--line)]">
              <div className="text-2xl font-bold text-[#744230]">{client.totalVisits}</div>
              <div className="text-xs text-[var(--muted)] mt-1">Total Visits</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-gray-50 border border-[var(--line)]">
              <div className="text-sm font-bold text-gray-900">{fmtDate(client.lastVisitAt)}</div>
              <div className="text-xs text-[var(--muted)] mt-1">Last Visit</div>
            </div>
            <div className={`text-center p-3 rounded-xl border ${followUpDue ? "bg-red-50 border-red-200" : "bg-gray-50 border-[var(--line)]"}`}>
              <div className={`text-sm font-bold ${followUpDue ? "text-red-600" : "text-gray-900"}`}>
                {fmtDate(client.nextFollowUpDate)}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">Follow-up</div>
            </div>
          </div>
        </Card>

        {/* Hair Problems */}
        {client.problems.length > 0 && (
          <Card title="Hair Problems">
            <div className="flex flex-wrap gap-2">
              {client.problems.map((p) => (
                <span key={p} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  {p}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Notes */}
        {client.notes && (
          <Card title="Staff Notes">
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{client.notes}</p>
          </Card>
        )}
      </div>

      {/* Future: History */}
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-gray-50 p-6 text-center">
        <p className="text-sm font-semibold text-[var(--muted)]">📋 Visit History</p>
        <p className="text-xs text-[var(--muted)] mt-1">Service and product purchase history will appear here once sales integration is complete.</p>
      </div>
    </div>
  );
}
