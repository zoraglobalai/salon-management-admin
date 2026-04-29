import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchStaffById, type StaffMember } from "../../../core/api";

function mask(value: string, show = 4) {
  if (!value) return "—";
  if (value.length <= show) return value;
  return "•".repeat(value.length - show) + value.slice(-show);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-4 pb-2 border-b border-[var(--line)]">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchStaffById(id)
      .then((r) => { setMember(r.staff); setError(null); })
      .catch((e: Error) => setError(e.message || "Failed to load staff details."))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--muted)]">
        Loading staff details…
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-red-600">{error || "Staff member not found."}</p>
        <button onClick={() => navigate(-1)} type="button"
          className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          ← Back
        </button>
      </div>
    );
  }

  const joiningDateFormatted = member.joiningDate
    ? new Date(member.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <button onClick={() => navigate(-1)} type="button"
          className="self-start text-sm font-semibold text-[var(--muted)] hover:text-gray-900 transition-colors">
          ← Back to Staff
        </button>
        <div className="flex-1 flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-[#744230] to-[#4e271b] flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold font-['Outfit'] text-gray-900">{member.name}</h2>
            <p className="text-sm text-[var(--muted)]">{member.role} · {member.locationName?.split("-")[0].trim()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Active</span>
        </div>
      </div>

      {/* Basic Info */}
      <Section title="Basic Information">
        <InfoRow label="Full Name" value={member.name} />
        <InfoRow label="Role" value={member.role} />
        <InfoRow label="Phone Number" value={member.phoneNumber} />
        <InfoRow label="Joining Date" value={joiningDateFormatted} />
        <InfoRow label="Location" value={member.locationName} />
      </Section>

      {/* Address */}
      {(member.state || member.city || member.addressLine) && (
        <Section title="Address">
          <InfoRow label="State" value={member.state} />
          <InfoRow label="City" value={member.city} />
          <div className="sm:col-span-2">
            <InfoRow label="Address Line" value={member.addressLine} />
          </div>
        </Section>
      )}

      {/* Bank Details — masked */}
      {(member.bankName || member.accountNumber || member.ifscCode) && (
        <Section title="Bank Details">
          <InfoRow label="Bank Name" value={member.bankName} />
          <InfoRow label="IFSC Code" value={member.ifscCode} />
          <div className="sm:col-span-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Account Number</span>
              <span className="text-sm font-medium text-gray-900 font-mono tracking-widest">
                {mask(member.accountNumber, 4)}
              </span>
            </div>
          </div>
        </Section>
      )}

      {/* ID Proof — masked */}
      {(member.idType || member.idNumber) && (
        <Section title="ID Proof">
          <InfoRow label="ID Type" value={member.idType} />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">ID Number</span>
            <span className="text-sm font-medium text-gray-900 font-mono tracking-widest">
              {mask(member.idNumber, 4)}
            </span>
          </div>
        </Section>
      )}

      {/* Notes */}
      {member.notes && (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3 pb-2 border-b border-[var(--line)]">
            Notes
          </h3>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{member.notes}</p>
        </div>
      )}
    </div>
  );
}
